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
      return;
    }

    // API呼び出しパラメータ
    const params: Record<string, string | number> = {
      limit: 100, // 作品数に応じて調整
      depth: 2, // カテゴリ参照を含める
    };

    // カテゴリフィルタリング
    if (categoryFilter) {
      params.filters = `majorCategory[equals]${categoryFilter}`;
    }

    // API呼び出し
    const response = await fetchMicroCMS<MicroCMSListResponse<CreativeData>>('creatives', params);

    creatives.value = response.contents;
    setCachedData(cacheKey, response.contents);
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
export function getPrerenderState(routePath: string): { creatives: CreativeData[] } {
  const detailMatch = /^\/creatives\/[^/]+\/([^/?#]+)/.exec(routePath);
  if (detailMatch) {
    const target = creatives.value.find((creative) => creative.id === detailMatch[1]);
    return { creatives: target ? [target] : [] };
  }

  if (routePath === '/creatives') {
    return { creatives: creatives.value.map(slimForList) };
  }

  return { creatives: [] };
}

/**
 * プリレンダHTMLに埋め込まれた状態、または LocalStorage キャッシュでストアを初期化する。
 * マウント前に呼ぶことで、初回描画が空リストになるのを防ぐ。
 */
export function hydrateCreatives(data: CreativeData[]): void {
  if (data.length > 0) {
    creatives.value = data;
  }
}

/** LocalStorage キャッシュから同期的にストアを温める（再訪時のちらつき防止）。 */
export function hydrateCreativesFromCache(): void {
  const cached = getCachedData<CreativeData[]>(CACHE_KEYS.CREATIVES);
  if (cached && cached.length > 0) {
    creatives.value = cached;
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
 * microCMS Image API を使用して最適化された画像URLを生成
 * @param url - オリジナルの画像URL
 * @param width - 幅（px）
 * @returns 最適化された画像URL
 */
export function getOptimizedImageUrl(url: string, width: number): string {
  if (!url) return '';

  // microCMSの画像URLかチェック
  if (!url.includes('images.microcms-assets.io')) {
    return url;
  }

  // URLにクエリパラメータを追加
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&fm=webp&q=80`;
}
