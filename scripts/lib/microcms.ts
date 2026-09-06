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
 * 全作品を取得する。`depth=1` で majorCategory の参照のみ展開する
 * （ルート列挙とsitemapに必要なのはカテゴリIDと作品IDのみ）。
 */
export async function fetchAllCreatives(): Promise<BuildCreativeData[]> {
  const config = readConfig();
  if (!config) {
    throw new Error('microCMS credentials are not configured');
  }

  const baseUrl = normalizeEndpoint(config.endpoint);
  const response = await fetch(`${baseUrl}/creatives?limit=100&depth=1`, {
    headers: { 'X-MICROCMS-API-KEY': config.key },
  });

  if (!response.ok) {
    throw new Error(`microCMS API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as MicroCMSListResponse<BuildCreativeData>;
  return data.contents;
}

/**
 * 作品詳細ページのルートパスを組み立てる。
 * `src/router/routes.ts` の `/creatives/:category/:id` と対応する。
 */
export function creativeDetailPath(creative: BuildCreativeData): string {
  return `/creatives/${creative.majorCategory.id}/${creative.id}`;
}
