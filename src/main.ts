import { ViteSSG } from 'vite-ssg';
import App from '@/App.vue';
import { routes } from '@/router/routes';
import { setupClientRouterEffects } from '@/router';
import type { Locale } from '@/types';
import '@/assets/main.css';

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
  async ({ app, router, isClient }) => {
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

    if (isClient) {
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

        const [{ createApp: createMetaBallApp }, { default: MetaBall }, { createHead }] =
          await Promise.all([
            import('vue'),
            import('@/components/MetaBall.vue'),
            import('@vueuse/head'),
          ]);

        const metaball = createMetaBallApp(MetaBall);
        metaball.use(router);
        metaball.use(i18n);
        metaball.use(createHead());
        metaball.mount('#back');
      });

      // Service Worker登録（本番のみ）
      if ('serviceWorker' in navigator && import.meta.env.PROD) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch((error: Error) => {
            console.error('SW registration failed:', error);
          });
        });
      }
    }
  }
);
