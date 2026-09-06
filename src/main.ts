import { ViteSSG } from 'vite-ssg';
import App from '@/App.vue';
import { routes } from '@/router/routes';
import { setupClientRouterEffects } from '@/router';
import {
  getPrerenderState,
  hydrateCreatives,
  hydrateCreativesFromCache,
  useCreativesAPI,
} from '@/composables/useCreativesAPI';
import type { CreativeData, Locale } from '@/types';
import '@/assets/main.css';

/**
 * プリレンダ時の作品データ取得は全ルートで1回だけ行う。
 * vite-ssg はサーバエントリを一度だけ読み込み、ルートごとに createApp を呼ぶため、
 * モジュールスコープのこのPromiseが全ページのレンダリングで共有される。
 */
let prerenderCreativesPromise: Promise<void> | null = null;

function loadCreativesForPrerender(): Promise<void> {
  if (!prerenderCreativesPromise) {
    prerenderCreativesPromise = useCreativesAPI()
      .fetchCreatives()
      .catch((err: unknown) => {
        // ここでは落とさない。認証情報が無い環境では取得失敗が正常な縮退経路であり、
        // 「詳細ルートを列挙したのにデータが無い」という異常だけを切り分ける必要がある。
        // その判定は vite.config.ts の onPageRendered / onFinished が一括で行い、
        // 該当ページがあればビルドを失敗させる。
        console.warn(
          `[ssg] Failed to load creatives for prerendering: ${err instanceof Error ? err.message : String(err)}`
        );
      });
  }
  return prerenderCreativesPromise;
}

export const createApp = ViteSSG(
  App,
  {
    routes,
    scrollBehavior(_to, _from, savedPosition) {
      if (savedPosition) {
        return savedPosition;
      }
      return { top: 0 };
    },
  },
  async ({ app, router, isClient, initialState, onSSRAppRendered }) => {
    const { createI18n } = await import('vue-i18n');
    const ja = await import('/locales/ja.json');

    const i18n = createI18n({
      legacy: false,
      locale: 'ja' as Locale,
      fallbackLocale: 'en' as Locale,
      globalInjection: true,
      silentTranslationWarn: true,
      silentFallbackWarn: true,
      warnHtmlMessage: false,
      escapeParameter: false,
      messages: {
        ja: ja.default,
      },
    });

    app.use(i18n);

    if (!isClient) {
      // プリレンダ段階では onMounted が走らないため、レンダリング前にストアを充填する。
      await loadCreativesForPrerender();

      // レンダリング後に、そのルートが必要とする分だけを __INITIAL_STATE__ へ載せる。
      // vite-ssg は onSSRAppRendered の後に transformState(initialState) を呼ぶため、
      // 同一参照へのin-place変異がシリアライズ結果に反映される。
      onSSRAppRendered(() => {
        Object.assign(initialState, getPrerenderState(router.currentRoute.value.path));
      });
    }

    if (isClient) {
      // プリレンダHTMLに埋め込まれた作品データでストアを初期化する。
      // クライアントは createApp で全再描画するため、これが無いと
      // 「本文 → 空表示 → 本文」のちらつきが出る。
      // `/creatives` に載る作品データは detail/detailEn を落とした投影のため、
      // partial を引き継いで詳細ページが本文を description で代用しないようにする。
      // all は「件数として全件そろっている」印で、一覧側が0件カテゴリの空状態を
      // skeleton と区別するために使う。
      const prerendered = initialState as {
        creatives?: CreativeData[];
        partial?: boolean;
        all?: boolean;
      };
      const embedded = prerendered.creatives;
      // all だけが立って作品が0件の状態（microCMS が全件0件）でもフラグは引き継ぐ。
      // ここで落とすと、SSRが空状態を出したページをクライアントが skeleton へ戻してしまう。
      if (prerendered.all === true || (embedded && embedded.length > 0)) {
        hydrateCreatives(embedded ?? [], {
          partial: prerendered.partial === true,
          all: prerendered.all === true,
        });
      } else {
        // プリレンダ対象外のルートは LocalStorage キャッシュで温める（再訪時のみ有効）。
        hydrateCreativesFromCache();
      }

      setupClientRouterEffects(router);

      // 英語辞書を遅延ロード
      const schedule =
        window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 1));
      schedule(async () => {
        const en = await import('/locales/en.json');
        i18n.global.setLocaleMessage('en' as Locale, en.default);
      });

      // MetaBall (Three.js) をアイドル時に遅延マウント
      schedule(async () => {
        const conn = (navigator as unknown as Record<string, unknown>).connection as
          | { effectiveType?: string }
          | undefined;
        if (conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) return;

        const [{ createApp: createMetaBallApp }, { default: MetaBall }] = await Promise.all([
          import('vue'),
          import('@/components/MetaBall.vue'),
        ]);

        // MetaBall は useHead を使わないため head プラグインは不要。
        const metaball = createMetaBallApp(MetaBall);
        metaball.use(router);
        metaball.use(i18n);
        metaball.mount('#back');
      });
    }
  }
);
