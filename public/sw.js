// Tombstone Service Worker — 自己解除専用（Issue #28）
//
// 【このファイルを「削除」で済ませてはいけない理由】
// Service Worker 仕様の Update algorithm では、スクリプト取得が 404 等で失敗した場合
// 「更新の失敗」として扱われ、既存の登録はそのまま残る（unregister されない）。
//   https://github.com/w3c/ServiceWorker/issues/204
// つまり public/sw.js を消すと、旧 cache-first Service Worker を持つ再訪問ユーザは
// それを永久に掴んだままになり、/ が初回訪問時の版で凍結し続ける。
// そこで同じURL(/sw.js)・同じスコープのまま、中身を「自分を消すコード」へ差し替える。
//
// 【このファイルを消してよい条件】
// docs/standards/performance-and-build.md の「Service Worker（撤去済み）」を参照。
// 目安は「本番アクセスログで /sw.js へのリクエストが3か月以上ゼロ」。
// それまでは配信し続ける必要がある。削除は旧SWの解除経路を断つことと同義。
//
// 【構文について】
// このファイルはビルドされず public/ からそのまま配信される。構文エラーは
// install の失敗＝旧SWの生存を意味するため、Service Worker をサポートする
// 最古のブラウザでも確実に解釈できる ES2015 の範囲だけで書く。
// （async/await・オプショナル catch binding は使わない）

self.addEventListener('install', () => {
  // precache しないので待つべき非同期処理が無く、event.waitUntil は不要。
  // skipWaiting() は必須。これが無いと、旧SWを掴んだタブが全て閉じられるまで
  // 本SWは waiting に留まり、解除がユーザのタブ運用に依存してしまう。
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // activate ハンドラが同期的に return した時点でブラウザはSWを停止してよい。
  // 解除完了まで一続きの非同期処理なので、全体を waitUntil で繋いで生存させる。
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      // キャッシュ削除に失敗しても unregister は必ず実行する。
      // 登録が残ることのほうが害が大きく、登録さえ消えれば
      // 残存キャッシュを読む主体は居なくなる。
      .catch(() => undefined)
      // 仕様上 unregister() は登録マップから即座に削除するため、この解決以降に
      // 発生するナビゲーションはどのSWにも制御されない。既に開いているページは
      // unload まで本SWの制御下に残るが、fetch ハンドラが無いので通信には介入しない。
      // ここは catch しない。解除に失敗したまま navigate() すると、下記のループ防止の
      // 前提（再読み込み後のページが未制御になること）が崩れるため。
      .then(() => self.registration.unregister())
      // 既に開かれているタブを再読み込みし、その訪問中に新しいHTMLを届ける。
      // この activate を起こしたページビュー自体は、旧SWの cache-first が返した
      // 古いHTMLで描画されている。SPAなので以降の画面遷移ではドキュメントを
      // 取り直さず、reload しない限り訪問が終わるまで古いままになる。
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((windowClients) =>
        Promise.all(
          windowClients.map((client) =>
            // Safari 11.1〜15 は navigate() が存在するが常に NotSupportedError を投げる
            // （実装は Safari 16 から）。同期 throw も拾えるよう Promise でくるむ。
            // 失敗しても解除とキャッシュ削除は完了しており、次のドキュメント読み込みから
            // 新しいHTMLになる。
            new Promise((resolve) => resolve(client.navigate(client.url))).catch(() => undefined)
          )
        )
      )
  );
});

// 【fetch ハンドラを置かない】
// 仕様上、fetch イベントリスナが登録されていなければリクエストはブラウザ既定の経路
// （ネットワーク／HTTPキャッシュ）に流れる。それが目的の挙動そのもの。
// 逆に `event.respondWith(fetch(event.request))` のような素通しハンドラは有害:
//   - 全リクエストでSWの起動を強制し、レイテンシだけ増える
//   - ナビゲーションリクエストは redirect: 'manual' のため、素通しの fetch 応答を
//     respondWith へ渡すと例外になる経路がある
//   - Range リクエストを壊しうる（public/logo.mp4, public/logo.webm）
//
// 【clients.claim() を呼ばない — これが再読み込みループの安全弁】
// ループが成立するには「navigate() 後のページが再び旧JSを実行して register('/sw.js') を
// 呼び、新しい登録が activate して再び navigate() する」ことが必要。
// 本ファイルは claim() を呼ばず、matchAll も既定の includeUncontrolled: false のまま使う。
// unregister() 済みの登録は新規ナビゲーションを制御しないので、再読み込み後のページは
// 「未制御のクライアント」になる。そこで register() が走って本ファイルがもう一度
// install/activate しても、その登録が制御しているクライアントは0件、
// matchAll は空配列を返し navigate() は一度も呼ばれない。ループは構造的に成立しない。
//
// なお claim() は不要でもある。skipWaiting() 経由の activate では、仕様の Activate 手順が
// 「その登録を使っている各クライアントの active service worker を新しい worker へ
// 差し替える」ため、旧SWに制御されていたタブは claim() なしで本SWの制御下に入り、
// matchAll に現れる。
