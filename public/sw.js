// Tombstone Service Worker — 自己解除専用（Issue #28）
//
// 【このファイルを「削除」で済ませてはいけない理由】
// Service Worker 仕様の Update algorithm では、スクリプト取得が 404 等で失敗した場合
// 「更新の失敗」として扱われ、既存の登録はそのまま残る（unregister されない）。
// 404/410 で解除する案は w3c/ServiceWorker#204 で提案されたが、2017年に却下・クローズ済み。
//   https://github.com/w3c/ServiceWorker/issues/204
// つまり public/sw.js を消すと、旧 cache-first Service Worker を持つ再訪問ユーザは
// それを永久に掴んだままになり、/ が初回訪問時の版で凍結し続ける。
// そこで同じURL(/sw.js)・同じスコープのまま、中身を「自分を消すコード」へ差し替える。
//
// 【削除の可否】
// 既定は恒久保持。削除は「まだ旧登録を持つブラウザを切り捨てる」という
// 意図的なリスク受容であり、条件の充足では正当化できない。
// 理由と判断材料は docs/standards/performance-and-build.md の
// 「Service Worker（撤去済み）」を参照すること。
//
// 【構文について】
// このファイルはビルドされず public/ からそのまま配信される。構文エラーは
// install の失敗＝旧SWの生存を意味するため、Service Worker をサポートする
// 最古のブラウザでも確実に解釈できる ES2015 の範囲だけで書く。
// （async/await・オプショナル catch binding は使わない）
// CI の "Verify Service Worker tombstone" が構文と下記の不変条件を検査している。

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
    // 解除を最初に行う。仕様は activate について
    // 「activation handler は非本質的な作業（後片付け）を担うよう設計し、
    //   すべて完走しなくても正しく機能するようにせよ」と注記している。
    // キャッシュ削除が失敗・ハングしても解除だけは必ず完了させるための順序。
    self.registration
      .unregister()
      .then(() =>
        caches
          .keys()
          .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
          // 後片付けの失敗はここで握り潰す。解除は既に済んでおり、
          // 登録が消えた以上、残存キャッシュを読む主体は居ない。
          .catch(() => undefined)
      )
      // 仕様上 unregister() は登録マップから即座に削除するため、これ以降に発生する
      // ナビゲーションはどのSWにも制御されない。一方、既に開いているページは
      // unload まで本SWの制御下に残る（Try Clear Registration は、その登録を使用中の
      // クライアントが居る間と activate の waitUntil が未解決の間は保留される）。
      // よって matchAll はそれらを返し、navigate() の対象になる。
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((windowClients) =>
        Promise.all(
          windowClients.map((client) =>
            // 既に開かれているタブを再読み込みし、その訪問中に新しいHTMLを届ける。
            // この activate を起こしたページビュー自体は、旧SWの cache-first が返した
            // 古いHTMLで描画されている。SPAなので以降の画面遷移ではドキュメントを
            // 取り直さず、reload しない限り訪問が終わるまで古いままになる。
            //
            // 既知の縮退が2つある。どちらも「その訪問1回限り」で、次の
            // ドキュメント読み込みで自然解消する。
            //  1. Safari 11.1〜15 は navigate() が存在するが常に NotSupportedError を
            //     投げる（実装は Safari 16 から）。同期 throw も拾えるよう Promise でくるむ。
            //  2. client.url は仕様上そのクライアントの creation URL であり、
            //     SPA のクライアント遷移では更新されない。着地後に画面遷移していた
            //     タブは着地URLへ引き戻される。activate は文書ナビゲーション契機の
            //     soft update で起きるため発火窓は狭いが、ゼロではない。
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
// 【再読み込みループを防いでいるもの】
// ループが成立するには「navigate() 後のページが再び旧JSを実行して register('/sw.js') を
// 呼び、新しい登録が activate して再び navigate() する」ことが繰り返される必要がある。
// これを断っているのは次の2つ。
//   1. src/main.ts から register('/sw.js') を削除したこと。再読み込み後に配信される
//      新しいバンドルは登録を行わないので、連鎖はそこで必ず終わる。CI の
//      "Verify Service Worker tombstone" が src/ への register 復活を検出する。
//   2. Activate 手順が付け替えるのは「その登録を使用中のクライアント」だけであること。
//      旧登録の worker に制御されているクライアントは、新しい登録の matchAll には現れない。
//
// clients.claim() をここに足しても意味は無い。claim() は各クライアントの creation URL で
// Match Service Worker Registration を引くが、unregister() 済みの登録はマップから
// 消えているため必ず null になり、どのクライアントも掴めない（＝完全な no-op）。
// unregister() より前に置けば claim() は成立するが、それでも上の 1 により
// 余分な再読み込みが1回増えるだけでループにはならない。いずれにせよ不要。
//
// なお claim() は本来の目的にも不要である。skipWaiting() 経由の activate では、
// 仕様の Activate 手順が activate イベントの発火より前に
// 「その登録を使用中の各クライアントの active worker を新しい worker へ差し替える」ため、
// 旧SWに制御されていたタブは claim() なしで本SWの制御下に入り、matchAll に現れる。
