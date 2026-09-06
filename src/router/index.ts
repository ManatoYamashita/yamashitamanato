import type { Router, RouteLocationNormalized } from 'vue-router';

export { routes } from './routes';

/**
 * クライアント側のナビゲーション視覚フィードバック/エラーハンドリングをルーターに登録。
 * SSR段階では `document`/`window` が存在しないため呼ばれない。
 */
export function setupClientRouterEffects(router: Router): void {
  // 初期化時にコンポーネントをプリロード（遅延軽減）
  const schedule = window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 100));
  schedule(() => {
    // vue-router はlazy componentを内部で解決するため、
    // routes配列内のimport関数を触るだけでプリロード効果が得られる
    router.getRoutes().forEach((route) => {
      const comp = route.components?.default;
      if (typeof comp === 'function') {
        (comp as () => Promise<unknown>)().catch(() => {
          /* プリロード失敗は無視 */
        });
      }
    });
  });

  router.beforeEach((to: RouteLocationNormalized) => {
    if (to.name !== 'home') {
      document.body.style.cursor = 'wait';
      document.body.classList.add('navigation-loading');

      const progressBar = document.getElementById('navigation-progress');
      const progressFill = progressBar?.querySelector<HTMLElement>('.progress-fill');
      if (progressBar && progressFill) {
        progressBar.style.display = 'block';
        progressFill.style.width = '25%';

        setTimeout(() => {
          if (progressFill.style.width === '25%') {
            progressFill.style.width = '60%';
          }
        }, 100);

        setTimeout(() => {
          if (progressFill.style.width === '60%') {
            progressFill.style.width = '85%';
          }
        }, 200);
      }
    }
  });

  router.afterEach((to: RouteLocationNormalized) => {
    if (to.name !== 'home') {
      setTimeout(() => {
        const progressBar = document.getElementById('navigation-progress');
        const progressFill = progressBar?.querySelector<HTMLElement>('.progress-fill');
        if (progressBar && progressFill) {
          progressFill.style.width = '100%';
          setTimeout(() => {
            progressBar.style.display = 'none';
            progressFill.style.width = '0%';
          }, 200);
        }

        document.body.style.cursor = '';
        document.body.classList.remove('navigation-loading');
      }, 100);
    }
  });

  router.onError((error: Error) => {
    const progressBar = document.getElementById('navigation-progress');
    if (progressBar) {
      progressBar.style.display = 'none';
      const progressFill = progressBar.querySelector<HTMLElement>('.progress-fill');
      if (progressFill) {
        progressFill.style.width = '0%';
      }
    }

    document.body.style.cursor = '';
    document.body.classList.remove('navigation-loading');

    if (
      error.message.includes('nextSibling') ||
      error.message.includes('Cannot read properties of null')
    ) {
      window.location.href = '/';
    }
  });
}
