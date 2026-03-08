import { createApp } from 'vue';
import App from '@/App.vue';
import router from '@/router';
import { createHead } from '@vueuse/head';
import type { Locale } from '@/types';
import '@/assets/main.css';
// MetaBallは初期描画のクリティカルパス外なので、アイドル時に遅延読み込みする

// Vue-i18n最適化版を使用（Tree shaking最適化）
const setupI18n = async () => {
  // 標準版を使用（message-compiler含む、但し遅延読み込みで最適化）
  const { createI18n } = await import('vue-i18n');

  // 初期は日本語のみ読み込み、英語はアイドル時に遅延読み込み
  const ja = await import('/locales/ja.json');

  const i18n = createI18n({
    legacy: false, // Vue2の互換性を無効化（軽量化）
    locale: 'ja' as Locale,
    fallbackLocale: 'en' as Locale,
    globalInjection: true, // $t関数エラー修正のため有効化に復元
    silentTranslationWarn: true, // 警告メッセージを削減
    silentFallbackWarn: true,
    warnHtmlMessage: false, // HTML警告無効化（軽量化）
    escapeParameter: false, // エスケープ処理無効化（軽量化）
    messages: {
      ja: ja.default,
    },
  });

  // アイドル時に英語辞書を読み込み、フォールバックを有効化
  const schedule = window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 1));
  schedule(async () => {
    const en = await import('/locales/en.json');
    i18n.global.setLocaleMessage('en' as Locale, en.default);
  });

  return i18n;
};

const app = createApp(App);
const head = createHead();

app.use(router);
app.use(head);
// metaballのルーター適用は遅延読み込み時に設定する

// i18nを遅延読み込み（$t関数エラー修正版）
setupI18n().then((i18n) => {
  // provide/injectパターンを削除し、通常の使用方法に復元
  app.use(i18n);

  app.mount('#app');

  // 画面の初期描画完了後に背景の重いthree.jsを読み込む
  const schedule = window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 1));

  schedule(async () => {
    const conn = (navigator as unknown as Record<string, unknown>).connection as { effectiveType?: string } | undefined;
    if (conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) return;

    const { default: MetaBall } = await import('@/components/MetaBall.vue');
    const metaball = createApp(MetaBall);
    metaball.use(router);
    metaball.use(i18n);
    metaball.use(head);
    metaball.mount('#back');
  });
});

// Service Worker登録（本番環境のみ）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: Error) => {
      console.error('SW registration failed:', error);
    });
  });
}
