/**
 * SSG/SSRプリレンダ段階の microCMS 直接アクセス
 *
 * クライアントは Netlify Functions プロキシ（`/.netlify/functions/microcms-proxy`）経由で
 * アクセスするため、APIキーはブラウザへ渡らない。プリレンダ段階では Functions が起動して
 * いないため、このモジュールが Node の環境変数を使って microCMS を直接呼ぶ。
 *
 * 本モジュールは `import.meta.env.SSR` が真の分岐からのみ動的 import される。Vite は
 * クライアントビルドで `import.meta.env.SSR` を `false` へ静的置換するため、この分岐ごと
 * 除去され、APIキーの参照もクライアントバンドルへ含まれない。
 * （検証手順は docs/standards/ssg-guidelines.md を参照）
 */

// tsconfig の `types` は vite/client のみを含むため Node の型は参照できない。
// グローバル宣言を増やさずに process.env へアクセスする。
function serverEnv(): Record<string, string | undefined> {
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env ?? {};
}

/** microCMS APIベースURLを正規化（`/api/v1` を保証）。 */
function normalizeEndpoint(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return base.includes('/api/v1') ? base : `${base}/api/v1`;
}

/**
 * microCMS へ直接リクエストする。認証情報が無い環境では例外を投げるため、
 * 呼び出し側はプリレンダを静的ページのみへ縮退させること。
 */
export async function fetchMicroCMSDirect<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T> {
  const env = serverEnv();
  const apiEndpoint = env.MICROCMS_API_ENDPOINT;
  const apiKey = env.MICROCMS_API_KEY;

  if (!apiEndpoint || !apiKey) {
    throw new Error('microCMS credentials are not configured for prerendering');
  }

  const url = new URL(`${normalizeEndpoint(apiEndpoint)}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    headers: { 'X-MICROCMS-API-KEY': apiKey },
  });

  if (!response.ok) {
    throw new Error(`microCMS API Error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}
