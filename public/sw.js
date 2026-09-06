// Service Worker - Cache Strategy
const CACHE_NAME = 'manapuraza-v2';
const STATIC_CACHE = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  // 待機せず即座に次のバージョンへ進む。
  // これが無いと、旧Service Workerを掴んだタブが全て閉じられるまで新版は waiting のままで、
  // cache-first で保持している / が古い版のまま配信され続ける。
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache-first strategy for static assets
      if (response) {
        return response;
      }

      // Network-first for HTML/API
      return fetch(event.request).then((fetchResponse) => {
        // アセットファイルのみキャッシュに保存
        if (event.request.url.includes('/assets/')) {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return fetchResponse;
      });
    })
  );
});

// 古いキャッシュのクリーンアップと、既存タブの制御引き取り
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      // 有効化と同時に、既に開かれているタブの制御を引き取る。
      // skipWaiting と対で使わないと、現行タブは次の遷移まで旧版のまま残る。
      .then(() => self.clients.claim())
  );
});
