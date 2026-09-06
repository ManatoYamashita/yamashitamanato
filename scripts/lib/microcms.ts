/**
 * ビルド時 microCMS クライアント
 *
 * `vite.config.ts`（SSGルート列挙）と `scripts/generate-sitemap.ts`（sitemap生成）から
 * 共有する。いずれも Node 実行時のみ読み込まれ、クライアントバンドルには含まれない。
 *
 * 環境変数は `MICROCMS_API_ENDPOINT` / `MICROCMS_API_KEY` のみを参照する。
 * `VITE_` プレフィックス付きの変数は Vite がクライアントバンドルへインライン展開するため、
 * APIキーの受け渡しには使用しない（`docs/ops/microcms-setup.md` 参照）。
 */

import { isValidCategory } from '../../src/types/creatives';

/** microCMS list API の1リクエストあたり上限。 */
const PAGE_SIZE = 100;

/** ページングの安全弁。1万件を超える運用は想定していない。 */
const MAX_PAGES = 100;

export interface MicroCMSMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface BuildCategoryData extends MicroCMSMeta {
  name: string;
  nameEn?: string;
  type?: string[];
}

export interface BuildCreativeData extends MicroCMSMeta {
  majorCategory: BuildCategoryData;
  title: string;
  thumbnail: { url: string; width?: number; height?: number };
}

interface MicroCMSListResponse<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}

// 環境変数は毎回 process.env から読む。ESM の import は呼び出し側の本文より先に
// 評価されるため、モジュールトップレベルで束縛すると呼び出し側の dotenv.config() が
// 間に合わず undefined になる。
function readConfig(): { endpoint: string; key: string } | null {
  const endpoint = process.env.MICROCMS_API_ENDPOINT;
  const key = process.env.MICROCMS_API_KEY;
  if (!endpoint || !key) return null;
  return { endpoint, key };
}

/** APIキーとエンドポイントが揃っているか。揃わない場合は呼び出し側で縮退する。 */
export function hasMicroCMSConfig(): boolean {
  return readConfig() !== null;
}

/** microCMS APIベースURLを正規化（`/api/v1` を保証）。 */
export function normalizeEndpoint(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return base.includes('/api/v1') ? base : `${base}/api/v1`;
}

/**
 * ルーターが受理できる作品だけを残す。
 *
 * `src/router/routes.ts` の `beforeEnter` は `isValidCategory` を通らないカテゴリを
 * `/404` へ流す。列挙してしまうと vite-ssg がその遷移結果をレンダリングし、
 * 404 の本文を持つHTMLが実URLに 200 で配信される。sitemap も同じ理由で除外する。
 */
function filterRoutable(creatives: BuildCreativeData[]): BuildCreativeData[] {
  return creatives.filter((creative) => {
    const categoryId = creative.majorCategory?.id;
    if (categoryId && isValidCategory(categoryId)) return true;
    console.warn(
      `[microcms] Skipped "${creative.id}": majorCategory "${categoryId}" is not routable. ` +
        'Add it to CreativeCategory in src/types/creatives.ts to prerender this work.'
    );
    return false;
  });
}

/**
 * 全作品を取得する。`depth=1` で majorCategory の参照のみ展開する
 * （ルート列挙とsitemapに必要なのはカテゴリIDと作品IDのみ）。
 *
 * `totalCount` に達するまでページングするため、作品数が `PAGE_SIZE` を超えても
 * 詳細ルートとsitemapのエントリが欠落しない。戻り値はルーティング可能なものだけ。
 */
export async function fetchAllCreatives(): Promise<BuildCreativeData[]> {
  const config = readConfig();
  if (!config) {
    throw new Error('microCMS credentials are not configured');
  }

  const baseUrl = normalizeEndpoint(config.endpoint);
  const collected: BuildCreativeData[] = [];
  let totalCount = Number.POSITIVE_INFINITY;

  for (let page = 0; page < MAX_PAGES && collected.length < totalCount; page += 1) {
    const url = `${baseUrl}/creatives?limit=${PAGE_SIZE}&offset=${collected.length}&depth=1`;
    const response = await fetch(url, {
      headers: { 'X-MICROCMS-API-KEY': config.key },
    });

    if (!response.ok) {
      throw new Error(`microCMS API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as MicroCMSListResponse<BuildCreativeData>;
    totalCount = data.totalCount;

    // offset が totalCount を超えるなど、進捗しない応答での無限ループを防ぐ。
    if (data.contents.length === 0) break;

    collected.push(...data.contents);
  }

  if (collected.length < totalCount) {
    throw new Error(
      `microCMS returned ${collected.length} of ${totalCount} creatives after ${MAX_PAGES} pages`
    );
  }

  return filterRoutable(collected);
}

/**
 * 作品詳細ページのルートパスを組み立てる。
 * `src/router/routes.ts` の `/creatives/:category/:id` と対応する。
 */
export function creativeDetailPath(creative: BuildCreativeData): string {
  return `/creatives/${creative.majorCategory.id}/${creative.id}`;
}
