import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import * as dotenv from 'dotenv'
import {
  creativeDetailPath,
  fetchAllCreatives,
  hasMicroCMSConfig,
} from './scripts/lib/microcms'

// Netlify のビルド環境では process.env に注入済みだが、ローカルビルドでは .env から読む。
dotenv.config()

// vite-ssg 設定
// 静的ルート（Home/About/Creatives/Contact）に加え、microCMS の全作品について
// 動的ルート `/creatives/:category/:id` をビルド時に列挙してプリレンダリングする。
// 404 キャッチオールと /underconstraction は引き続きCSRフォールバック扱い。
const STATIC_ROUTES = ['/', '/about', '/creatives', '/contact'];

// 作品データを必要とするルート。`/creatives/:category/:id` と一覧ページ。
const DETAIL_ROUTE_PATTERN = /^\/creatives\/[^/]+\/[^/]+$/;

// プリレンダの成否は、ルート列挙とデータ供給という2つの独立した経路に分かれる。
// 片方だけ成功した状態を「成功」として配信しないよう、判定はこの1か所へ集約する。
// - 認証情報が無い    → 静的4ページへ縮退（フォークやシークレット未設定のCI）
// - 認証情報がある     → 取得失敗・データ欠落はビルド失敗
let enumeratedDetailRoutes = 0;
const routesMissingData: string[] = [];

/** vite-ssg が onPageRendered へ渡すコンテキストのうち、本設定が参照する部分。 */
interface RenderedPageContext {
  initialState?: { creatives?: unknown };
}

const ssgOptions = {
  script: 'async' as const,
  formatting: 'minify' as const,
  async includedRoutes(paths: string[]): Promise<string[]> {
    const staticRoutes = paths.filter((p) => STATIC_ROUTES.includes(p));

    // 認証情報が無い環境（フォーク、CI のシークレット未設定など）では静的ページのみを
    // 生成してビルドを継続する。詳細ページはSPAフォールバックで従来どおり描画される。
    if (!hasMicroCMSConfig()) {
      console.warn('[ssg] microCMS credentials not found. Prerendering static routes only.');
      return staticRoutes;
    }

    // 認証情報がある環境での取得失敗は縮退させない。静的4ページだけの成果物を
    // 「成功」として配信すると、詳細ページ20件の消失に誰も気づけないため。
    const creatives = await fetchAllCreatives();
    const detailRoutes = creatives.map(creativeDetailPath);
    enumeratedDetailRoutes = detailRoutes.length;
    console.log(
      `[ssg] Prerendering ${staticRoutes.length} static + ${detailRoutes.length} creative detail routes.`
    );
    return [...staticRoutes, ...detailRoutes];
  },

  // レンダリング結果を1ページずつ検証する。`__INITIAL_STATE__` が空のまま出力された
  // 詳細ページは `<title>Not Found</title>` になるが `.not-found` は含まないため、
  // 生成HTMLの目視やクラス名検索では検出できない。
  onPageRendered(route: string, html: string, appCtx: RenderedPageContext): string {
    if (enumeratedDetailRoutes === 0) return html;
    if (!DETAIL_ROUTE_PATTERN.test(route) && route !== '/creatives') return html;

    const embedded = appCtx?.initialState?.creatives;
    if (!Array.isArray(embedded) || embedded.length === 0) {
      routesMissingData.push(route);
    }
    return html;
  },

  onFinished(): void {
    if (routesMissingData.length === 0) return;

    const sample = routesMissingData.slice(0, 5).join(', ');
    const rest = routesMissingData.length > 5 ? ` (+${routesMissingData.length - 5} more)` : '';
    throw new Error(
      `[ssg] ${routesMissingData.length} route(s) were prerendered without creative data: ${sample}${rest}. ` +
        'These pages ship as <title>Not Found</title> at HTTP 200. ' +
        'Check that MICROCMS_API_ENDPOINT / MICROCMS_API_KEY are readable from the build scope and that microCMS responded.'
    );
  },
};

// vite-ssg は Vite の UserConfig を型拡張しないため、ssgOptions を正規プロパティとして
// 認識させるためにモジュール拡張する（@ts-expect-error の脆い抑止を避ける）。
declare module 'vite' {
  interface UserConfig {
    ssgOptions?: typeof ssgOptions;
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  ssgOptions,
  plugins: [
    vue(),
    visualizer(),
  ],
  define: {
    __VUE_I18N_FULL_INSTALL__: false,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  build: {
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // コンソール完全削除を無効化
        drop_debugger: true, // debugger文は削除
        pure_funcs: ['console.debug', 'console.trace', 'console.log'], // 詳細ログ+console.log削除
        dead_code: true,
        unused: true,
      },
      mangle: {
        safari10: true,
      },
      format: {
        // 重要ログのコメント保持
        comments: /^!|@preserve|@license|@cc_on|MetaBall:/i,
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // ベンダーライブラリ分割
          if (id.includes('node_modules/vue') ||
              id.includes('node_modules/vue-router') ||
              id.includes('node_modules/vue-i18n')) {
            return 'vendor';
          }
          if (id.includes('node_modules/three')) {
            return 'vendor_three';
          }
          if (id.includes('node_modules/gsap')) {
            return 'vendor_gsap';
          }
          if (id.includes('@fortawesome')) {
            return 'vendor_fontawesome';
          }
        }
      },
    },
  },
  server: {
    historyApiFallback: true,
  },
  assetsInclude: ["robots.txt"],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    }
  }
})
