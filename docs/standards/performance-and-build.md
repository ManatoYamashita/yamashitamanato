# パフォーマンス最適化とビルド

## 遅延と分割
- `MetaBall.vue` は `requestIdleCallback` で遅延ロードし、専用マウント（`#back`）。
- 英語ロケールはアイドル時に遅延追加。
- ルート/ページは動的 import でチャンク化。

## アセットと画像
- 画像は WebP を基本。大サイズはサムネイルを別用意（例: `assets/creatives-thumb/`）。
- ロゴは low→high の段階的切替。`<link rel=\"preload\" as=\"image\" fetchpriority=\"high\">` で LCP を最適化。
- 参照は `new URL('@/assets/foo.webp', import.meta.url).href` を使用。命名は用途別ディレクトリ + ハイフン区切り。
- `public/favicon.ico` と `public/ogp.webp` はキャッシュ更新時にバージョン付けを検討。

## Three.js / MetaBall
- 動的 import 失敗時は `console.error` に詳細を残し、他 UI を阻害しない。
- Three.js は `vendor_three` チャンクへ分割。OrbitControls 等は必要時のみ読み込み。

## Service Worker（撤去済み）
- 配信キャッシュは **Netlify CDN + `public/_headers` + Vite のハッシュ付きファイル名**で完結する。
  Service Worker は使わない（Issue #28 / PR #73、初回デプロイ 2026-09-07）。オフライン対応の要件は無い。
- 旧 `sw.js` は `['/', '/index.html']` を cache-first で precache しており、`CACHE_NAME` を
  手で上げない限り再訪問ユーザの `/` が初回訪問時の版で永久に凍結していた。
  なお旧 SW は precache 済みの `/` をオフラインでも返していた。これは要件ではなく凍結バグの
  副作用であり、撤去によって失われる唯一の挙動でもある。

### 触ってはいけないもの
CI の `Verify Service Worker tombstone`（`.github/workflows/feature-ci.yml`）が
下の1〜3を機械的に検査する。`public/sw.js` は ESLint（`ignores` に `public/**`）にも
Prettier（`src/**` 限定）にもかからないため、このゲートが唯一の防波堤である。

1. **`src/` と `index.html` に `serviceWorker.register` を復活させない。** これが中核の不変条件。
   register が戻ると、登録を持たないブラウザにも「起動直後に自分を消すだけの SW」を
   新規配布してしまう。「旧登録を持つブラウザにだけ効く」性質は register を消して初めて得られる。
   再読み込みループを断っているのもこれ（新しいバンドルが登録しないので連鎖が必ず終わる）。
2. **`public/sw.js` を削除しない。** 中身は旧登録を解除するためだけのトゥームストーン。
   仕様の Update algorithm ではスクリプト取得が 404 で失敗しても既存の登録は解除されない
   （404/410 で解除する案は [w3c/ServiceWorker#204](https://github.com/w3c/ServiceWorker/issues/204)
   で提案され 2017 年に却下・クローズ済み）。消すと旧 SW を持つ再訪問ユーザは解除経路を永久に失う。
3. **`fetch` ハンドラを足さない。** リスナが無ければリクエストはブラウザ既定の経路へ流れる。
   素通しハンドラは毎回 SW を起動し、ナビゲーションの `redirect: 'manual'` で例外経路を作り、
   `logo.mp4` / `logo.webm` の Range リクエストを壊しうる。
4. **`activate` は `unregister()` を先に、キャッシュ掃除を後に。** 仕様は「activation handler は
   非本質的な作業（後片付け）を担うよう設計し、すべて完走しなくても正しく機能させよ」と注記している。
   逆順にすると Cache Storage がハングした場合に解除まで到達せず、旧 SW が残る。
5. **ES2015 の範囲だけで書く。** ビルドされず `public/` からそのまま配信されるため、
   構文エラーは install の失敗＝旧 SW の生存を意味する（`async`/`await`・optional catch binding は不可）。

`clients.claim()` は**不要**（禁止ではない）。`unregister()` の後に置いても、claim は各クライアントの
creation URL で Match Service Worker Registration を引き、消えた登録には必ず null が返るため
完全な no-op になる。前に置けば成立するが、上の 1 がある限り余分な再読み込みが1回増えるだけ。
本来の目的にも不要で、`skipWaiting()` 経由の Activate 手順が activate イベント発火より前に
「その登録を使用中のクライアントの active worker」を差し替えるため、claim なしで matchAll に現れる。

### 既知の縮退（いずれもその訪問1回限り）
- **`client.url` は creation URL**。SPA のクライアント遷移では更新されないため、着地後に画面遷移
  していたタブは着地 URL へ引き戻される。Chromium は現在 document URL を返すが仕様違反として
  修正予定なので、**Chrome 単独の実機検証では検出できない**。
- **Safari 15 以前は `navigate()` が常に `NotSupportedError`**（実装は Safari 16 から）。自動リロードが
  起きないため、旧 SW が日和見的にキャッシュしていた旧ハッシュ資産が消えた状態で古い HTML が残り、
  未ロードのルートチャンクの動的 import がその訪問中は失敗しうる。次のドキュメント読み込みで解消。
- 解除が走った訪問では、旧 HTML の描画 → 強制リロードで**スプラッシュとロゴアニメが2回再生される**。

### `public/_headers` の `/sw.js` ルール
長期キャッシュされると解除コードが届かず旧 SW が延命するため、`max-age=0, must-revalidate` を明示する。
ただし**今日の挙動は Netlify の既定値と同値で、実効差はない**。将来 `/*.js` のような広いルールを
追加する場合、Netlify はクロスルールの優先順位を公式に規定していないため、
**明示ルールが勝つとは限らない**。実際にヘッダを計測して確認すること。

### 削除の可否
**既定は恒久保持。** 削除は「まだ旧登録を持つブラウザを切り捨てる」という意図的なリスク受容であり、
条件の充足では正当化できない。残存を観測で否定する手段が存在しないため。

- トゥームストーンは**初回の再訪で自己解除する**ので、旧登録を持つブラウザが `/sw.js` を叩くのは
  生涯 1 回。「一定期間リクエストがゼロ」は「旧登録持ちがその期間来なかった」ことしか意味せず、
  長期休眠ブラウザの残存を否定できない。
- クローラ・脆弱性スキャナ・uptime チェッカは `/sw.js` を既知パスとして定型的に叩くため、
  仮にログがあっても更新チェックと区別できない。
- そもそも Netlify Free プランに生アクセスログは無い（Analytics は有料アドオン）。導入済みの GA4 は
  ページビュー計測であり、SW のスクリプト取得は原理的に捕捉できない。

残存コストは約 6KB のファイル 1 つ。参照する `register()` が無いため、通常の閲覧では取得されない。
削除する場合は削除 PR に Issue #28 と本節へのリンクを残すこと。

### 再導入する場合
削除せず**同じ URL で中身を差し替える**。新 SW は旧キャッシュ名（`manapuraza-v1` / `v2`）を
`activate` で掃除する責務を引き継ぐこと。CI ゲートの更新も同時に行う。

## ログと圧縮
- 本番でも `console.error` は保持。`console.debug`/`console.trace` は Terser で除去。
- 例: `pure_funcs: ['console.debug','console.trace']`, `format.comments` で `MetaBall:` を保持。

## ビルド（Vite/Rollup/Terser）
- `minify: 'terser'`, `sourcemap: true`。
- 手動チャンク例: `vendor`（vue系）, `vendor_three`, `vendor_fontawesome`, `vendor_gsap`。
- `define` で i18n フラグを最小化。`server.historyApiFallback: true`。
- 解析: `npm run analyze` で可視化。Node 20.19+ / 22.12+ を推奨。

## 計測目標（参考）
- JS 合計 < 800KB (gzip)、初期描画 < 2s。
- 高優先画像に preload を付与し LCP を安定させる。***

---

最終更新日: 2026-09-07
