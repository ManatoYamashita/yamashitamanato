/**
 * microCMS API integration composable
 *
 * Provides centralized data fetching, caching, and transformation
 * for creative portfolio items from microCMS headless CMS.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { CategoryData, CreativeData, MicroCMSListResponse, CMSCreative } from '@/types';

// Netlify Functionsプロキシエンドポイント
const PROXY_ENDPOINT = '/.netlify/functions/microcms-proxy';

// キャッシュ有効期限（30分）
const CACHE_DURATION = 30 * 60 * 1000;

// microCMS list API の1リクエストあたり上限
const PAGE_SIZE = 100;

// ページングの安全弁。1万件を超える運用は想定していない。
const MAX_PAGES = 100;

// キャッシュキー定義
const CACHE_KEYS = {
  CATEGORIES: 'microcms_categories',
  CREATIVES: 'microcms_creatives',
  TIMESTAMP: '_timestamp',
} as const;

// State（シングルトンパターン）
const creatives = ref<CreativeData[]>([]);
const categories = ref<CategoryData[]>([]);
const isLoading = ref(false);
const error = ref<Error | null>(null);

// ストアの状態は「フィールド」と「件数」という独立した2軸で表す。
// プリレンダされた `/creatives` は軽量投影かつ全件なので、両方が真になる。

// フィールド軸。ストアの中身が一覧向けの軽量投影（detail/detailEn を落としたもの）かどうか。
// プリレンダされた `/creatives` から詳細ページへ遷移した直後だけ真になり、
// `fetchCreatives()` が全フィールドで置き換えた時点で偽へ戻る。
const creativesArePartial = ref(false);

// 件数軸。ストアが一覧の全件を保持しているか。詳細ページのプリレンダ状態は
// 該当1件しか持たないため偽のまま。ビューが「まだ取得していない」と
// 「取得した結果0件」を区別するための唯一の同期的シグナルであり、これが無いと
// 作品0件のカテゴリが skeleton のまま静的HTMLへ焼き込まれる（Issue #38）。
const hasAllCreatives = ref(false);

/**
 * microCMS API共通クライアント（Netlify Functions プロキシ経由）
 */
async function fetchMicroCMS<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T> {
  // SSG/SSRプリレンダ段階では Netlify Functions が起動していないため、microCMS へ直接
  // アクセスする。Vite はクライアントビルドで `import.meta.env.SSR` を false へ静的置換
  // するため、この分岐と APIキーを参照するモジュールはクライアントバンドルに含まれない。
  if (import.meta.env.SSR) {
    const { fetchMicroCMSDirect } = await import('./microcmsServer');
    return fetchMicroCMSDirect<T>(endpoint, params);
  }

  // クライアントは Netlify Function プロキシを経由（APIキーをブラウザへ露出させない）
  const url = new URL(PROXY_ENDPOINT, window.location.origin);
  url.searchParams.append('endpoint', endpoint);

  // クエリパラメータを追加
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Proxy API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * LocalStorageキャッシュ管理
 */
function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(key);
    const timestamp = localStorage.getItem(`${key}${CACHE_KEYS.TIMESTAMP}`);

    if (!cached || !timestamp) {
      return null;
    }

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > CACHE_DURATION) {
      // キャッシュ有効期限切れ
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}${CACHE_KEYS.TIMESTAMP}`);
      return null;
    }

    return JSON.parse(cached) as T;
  } catch (err) {
    console.error('Cache read error:', err);
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}${CACHE_KEYS.TIMESTAMP}`, Date.now().toString());
  } catch (err) {
    console.error('Cache write error:', err);
  }
}

/**
 * データ変換アダプター: CreativeData → CMSCreative
 */
function adaptCreativeData(data: CreativeData, locale: 'ja' | 'en'): CMSCreative {
  // 多言語フィールドの選択
  const title = locale === 'ja' ? data.title : data.titleEn || data.title;
  const description =
    locale === 'ja' ? data.description || '' : data.descriptionEn || data.description || '';

  // 小カテゴリをタグに変換
  const tags =
    data.minorCategory?.map((cat) => (locale === 'ja' ? cat.name : cat.nameEn || cat.name)) || [];

  // detailオブジェクトの構築
  // richEditorV2のHTMLをMarkdownとして扱う（必要に応じてHTML→Markdown変換処理追加）
  const detail =
    data.detail || data.images
      ? {
          images: data.images?.map((img) => img.url) || [data.thumbnail.url],
          descriptionMarkdown:
            locale === 'ja'
              ? data.detail || data.description || ''
              : data.detailEn || data.descriptionEn || data.description || '',
          youtube: data.youtubeUrl
            ? {
                mobile: data.youtubeUrl, // 単一URLを両方に設定
                desktop: data.youtubeUrl,
              }
            : undefined,
          productionYear: data.year,
          // credits と cta は detail（richEditorV2）内で管理
          credits: undefined,
          cta: undefined,
        }
      : undefined;

  return {
    id: data.id, // microCMS自動生成IDを使用
    title,
    description,
    url: data.url || '',
    thumbnail: data.thumbnail.url,
    tags,
    detail,
    _isCMS: true,
  } as CMSCreative;
}

/**
 * カテゴリ一覧を取得
 */
async function fetchCategories(): Promise<void> {
  try {
    isLoading.value = true;
    error.value = null;

    // キャッシュ確認
    const cached = getCachedData<CategoryData[]>(CACHE_KEYS.CATEGORIES);
    if (cached) {
      categories.value = cached;
      return;
    }

    // API呼び出し
    const response = await fetchMicroCMS<MicroCMSListResponse<CategoryData>>('categories', {
      limit: 100, // カテゴリ数は少ないため全件取得
    });

    categories.value = response.contents;
    setCachedData(CACHE_KEYS.CATEGORIES, response.contents);
  } catch (err) {
    error.value = err instanceof Error ? err : new Error('Failed to fetch categories');
    throw error.value;
  } finally {
    isLoading.value = false;
  }
}

/**
 * 作品一覧を取得
 */
async function fetchCreatives(categoryFilter?: string): Promise<void> {
  try {
    isLoading.value = true;
    error.value = null;

    // キャッシュ確認
    const cacheKey = categoryFilter
      ? `${CACHE_KEYS.CREATIVES}_${categoryFilter}`
      : CACHE_KEYS.CREATIVES;
    const cached = getCachedData<CreativeData[]>(cacheKey);
    if (cached) {
      creatives.value = cached;
      creativesArePartial.value = false;
      hasAllCreatives.value = !categoryFilter;
      return;
    }

    // 作品数が PAGE_SIZE を超えても欠落しないよう totalCount までページングする。
    // ビルド時のルート列挙（scripts/lib/microcms.ts）も同じ件数を前提にしているため、
    // ここで打ち切るとプリレンダ済み詳細ページがクライアント再描画で消える。
    const collected: CreativeData[] = [];
    let totalCount = Number.POSITIVE_INFINITY;

    for (let page = 0; page < MAX_PAGES && collected.length < totalCount; page += 1) {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: collected.length,
        depth: 2, // カテゴリ参照を含める
      };

      // カテゴリフィルタリング
      if (categoryFilter) {
        params.filters = `majorCategory[equals]${categoryFilter}`;
      }

      const response = await fetchMicroCMS<MicroCMSListResponse<CreativeData>>('creatives', params);
      totalCount = response.totalCount;

      // 進捗しない応答での無限ループを防ぐ。
      if (response.contents.length === 0) break;

      collected.push(...response.contents);
    }

    creatives.value = collected;
    creativesArePartial.value = false;
    hasAllCreatives.value = !categoryFilter;
    setCachedData(cacheKey, collected);
  } catch (err) {
    error.value = err instanceof Error ? err : new Error('Failed to fetch creatives');
    throw error.value;
  } finally {
    isLoading.value = false;
  }
}

/**
 * 一覧ページ向けの軽量投影
 *
 * `__INITIAL_STATE__` に全作品を素のまま載せると 156KB になる。一覧描画に不要な
 * 詳細本文（detail/detailEn）と、参照展開で肥大するカテゴリ・画像のメタデータを落として
 * 約 40KB（gzip 約 8KB）に収める。型は `CreativeData` のまま保つ。
 */
function slimCategory(category: CategoryData): CategoryData {
  return {
    id: category.id,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    name: category.name,
    nameEn: category.nameEn,
    type: category.type,
  };
}

function slimForList(creative: CreativeData): CreativeData {
  const { detail: _detail, detailEn: _detailEn, ...rest } = creative;
  return {
    ...rest,
    thumbnail: { url: creative.thumbnail.url },
    majorCategory: slimCategory(creative.majorCategory),
    minorCategory: creative.minorCategory?.map(slimCategory),
    images: creative.images?.map((image) => ({ url: image.url })),
  };
}

/**
 * プリレンダしたHTMLへ埋め込む状態を、ルートごとに最小限で組み立てる。
 *
 * vite-ssg はハイドレーションせずクライアントで全再描画するため、状態を渡さないと
 * 「本文 → 空表示 → 本文」のちらつきが出る。全ページに全件を載せると肥大するので、
 * 詳細ページは該当1件のみ、一覧ページは軽量投影した全件を渡す。
 */
export function getPrerenderState(routePath: string): {
  creatives: CreativeData[];
  partial?: boolean;
  all?: boolean;
} {
  const detailMatch = /^\/creatives\/[^/]+\/([^/?#]+)/.exec(routePath);
  if (detailMatch) {
    const target = creatives.value.find((creative) => creative.id === detailMatch[1]);
    return { creatives: target ? [target] : [] };
  }

  if (routePath === '/creatives') {
    // partial: 投影であることを明示する。受け取った側が詳細ページで本文を代用しないための印。
    // all: 件数としては全件そろっている印。0件カテゴリの空状態を skeleton と区別するために使う。
    //
    // all を定数 true にしてはならない。認証情報が無い縮退ビルド（vite.config.ts の
    // includedRoutes 参照）では取得が失敗して creatives が空のまま partial だけが付くため、
    // 定数だと「取得できなかった」を「0件だった」としてクライアントへ誤って伝え、
    // 全カテゴリに虚偽の空状態文言が出る。実値を載せることで
    // 「このHTMLに空状態文言を焼き込んだか」と1対1に対応させる。
    return {
      creatives: creatives.value.map(slimForList),
      partial: true,
      all: hasAllCreatives.value,
    };
  }

  return { creatives: [] };
}

/**
 * プリレンダHTMLに埋め込まれた状態、または LocalStorage キャッシュでストアを初期化する。
 * マウント前に呼ぶことで、初回描画が空リストになるのを防ぐ。
 */
export function hydrateCreatives(
  data: CreativeData[],
  options: { partial?: boolean; all?: boolean } = {}
): void {
  // 全件が0件でも「一覧として全件そろっている」は成立するため、
  // ストアを空で潰さないための data.length ガードより前に反映する。
  hasAllCreatives.value = options.all === true;
  if (data.length > 0) {
    creatives.value = data;
    creativesArePartial.value = options.partial === true;
  }
}

/** LocalStorage キャッシュから同期的にストアを温める（再訪時のちらつき防止）。 */
export function hydrateCreativesFromCache(): void {
  const cached = getCachedData<CreativeData[]>(CACHE_KEYS.CREATIVES);
  if (cached && cached.length > 0) {
    creatives.value = cached;
    creativesArePartial.value = false;
    hasAllCreatives.value = true;
  }
}

/**
 * useCreativesAPI Composable
 */
export function useCreativesAPI() {
  /**
   * カテゴリ別の作品一覧を取得（ロケール対応）
   */
  const getCreativesByCategory = (
    category: string,
    locale: 'ja' | 'en'
  ): ComputedRef<CMSCreative[]> => {
    return computed(() => {
      return creatives.value
        .filter((creative) => {
          const majorCategoryType = creative.majorCategory.type;
          // typeは配列なので、'major'を含むかチェック
          // カテゴリIDで比較（name/nameEnではなくIDを使用）
          return majorCategoryType.includes('major') && creative.majorCategory.id === category;
        })
        .map((creative) => adaptCreativeData(creative, locale));
    });
  };

  /**
   * IDから作品を取得（ロケール対応）
   */
  const getCreativeById = (id: string, locale: 'ja' | 'en'): ComputedRef<CMSCreative | null> => {
    return computed(() => {
      const creative = creatives.value.find((c) => c.id === id);
      return creative ? adaptCreativeData(creative, locale) : null;
    });
  };

  /**
   * 大カテゴリ一覧を取得
   */
  const getMajorCategories: ComputedRef<CategoryData[]> = computed(() => {
    return categories.value.filter((cat) => cat.type.includes('major'));
  });

  /**
   * 小カテゴリ一覧を取得
   * NOTE: 実際のスキーマではparentCategoryが削除されたため、フラット構造で全小カテゴリを返す
   */
  const getMinorCategories = (): ComputedRef<CategoryData[]> => {
    return computed(() => {
      return categories.value.filter((cat) => cat.type.includes('minor'));
    });
  };

  return {
    // State
    creatives: creatives as Ref<CreativeData[]>,
    categories: categories as Ref<CategoryData[]>,
    isLoading: isLoading as Ref<boolean>,
    creativesArePartial: creativesArePartial as Ref<boolean>,
    hasAllCreatives: hasAllCreatives as Ref<boolean>,
    error: error as Ref<Error | null>,

    // Actions
    fetchCategories,
    fetchCreatives,

    // Getters
    getCreativesByCategory,
    getCreativeById,
    getMajorCategories,
    getMinorCategories,
  };
}

/**
 * srcset の候補幅（px）。
 * 一覧カード（最大 316px）、イラスト枠（最大 988px）、詳細ギャラリー（最大 678px）を
 * DPR 1〜3 で過不足なく覆えるよう、隣り合う候補の比が 1.2〜1.33 倍に収まる刻みにしている。
 * 刻みが粗いと、表示幅を少し超えただけで倍近い画素数の候補が選ばれる。
 */
export const MICROCMS_SRCSET_WIDTHS: readonly number[] = [
  320, 400, 480, 640, 800, 1000, 1280, 1600, 2000,
];

export interface OptimizedImageOptions {
  /**
   * 指定すると、高さが 幅 / cropAspect を超える部分だけを中央で切り落として返す
   * （fit=crop + max-h）。原画がそれより横長なら切り抜かない。
   * `object-fit: cover` で常にこの縦横比以上に横長な枠へ切り抜いて表示する画像専用。
   * 枠より縦長な原画は cover でも上下が切り落とされ、その位置（中央）は imgix の fit=crop と
   * 一致するため、見た目を変えずに「表示されない上下の画素」を配信しなくて済む。
   * 横方向は切らない。枠の実際の縦横比は枠線ぶん cropAspect よりわずかに横長で、
   * 横長の原画を cropAspect で切ると cover の表示範囲より狭くなってしまうため。
   */
  cropAspect?: number;
}

/**
 * microCMS Image API を使用して最適化された画像URLを生成
 * @param url - オリジナルの画像URL
 * @param width - 幅（px）
 * @param options - トリミング指定
 * @returns 最適化された画像URL
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  options: OptimizedImageOptions = {}
): string {
  if (!url) return '';

  // microCMSの画像URLかチェック
  if (!url.includes('images.microcms-assets.io')) {
    return url;
  }

  // トリミングしない場合は fit=max で原寸を超える拡大を止める。
  // 拡大しても画質は上がらず、転送量だけが増えるため。
  const { cropAspect } = options;
  const fit = cropAspect ? `max-h=${Math.ceil(width / cropAspect)}&fit=crop` : 'fit=max';

  // URLにクエリパラメータを追加
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&${fit}&fm=webp&q=80`;
}

export interface MicroCMSSrcsetOptions extends OptimizedImageOptions {
  /**
   * 候補幅の上限（px）。これを超える候補は srcset に含めない。
   * 高 DPR の端末で必要以上に大きい候補が選ばれるのを止めたいとき（アニメーション WebP など、
   * 幅に対して転送量が極端に大きい画像）に使う。
   */
  maxWidth?: number;
}

/**
 * microCMS 画像の srcset（w 記述子）を生成する。microCMS 以外のURLでは空文字を返す。
 * どの候補が選ばれるかは呼び出し側の `sizes` で決まるため、必ず実際のレイアウト幅に
 * 合わせた `sizes` と組み合わせること（docs/standards/performance-and-build.md）。
 */
export function getMicroCMSSrcset(url: string, options: MicroCMSSrcsetOptions = {}): string {
  if (!url || !url.includes('images.microcms-assets.io')) {
    return '';
  }
  const { maxWidth = Infinity, ...imageOptions } = options;
  return MICROCMS_SRCSET_WIDTHS.filter((width) => width <= maxWidth)
    .map((width) => `${getOptimizedImageUrl(url, width, imageOptions)} ${width}w`)
    .join(', ');
}
