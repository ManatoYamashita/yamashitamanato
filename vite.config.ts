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

const ssgOptions = {
  script: 'async' as const,
  formatting: 'minify' as const,
  async includedRoutes(paths: string[]): Promise<string[]> {
    const staticRoutes = paths.filter((p) => STATIC_ROUTES.includes(p));

    // 認証情報が無い環境（フォーク、CI のシークレット未設定など）では静的ページのみを
    // 生成してビルドを継続する。詳細ページはSPAフォールバックで従来どおり描画される。
    if (!hasMicroCMSConfig()) {
      console.warn(
        '[ssg] microCMS credentials not found. Prerendering static routes only.'
      );
      return staticRoutes;
    }

    try {
      const creatives = await fetchAllCreatives();
      const detailRoutes = creatives.map(creativeDetailPath);
      console.log(
        `[ssg] Prerendering ${staticRoutes.length} static + ${detailRoutes.length} creative detail routes.`
      );
      return [...staticRoutes, ...detailRoutes];
    } catch (err) {
      // 取得失敗でビルド全体を落とさない。静的ページのSSGは維持する。
      console.warn(
        `[ssg] Failed to fetch creatives (${err instanceof Error ? err.message : String(err)}). Prerendering static routes only.`
      );
      return staticRoutes;
    }
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
