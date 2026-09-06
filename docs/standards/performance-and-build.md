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
  Service Worker は使わない（Issue #28）。オフライン対応の要件は無い。
- 旧 `sw.js` は `['/', '/index.html']` を cache-first で precache しており、`CACHE_NAME` を
  手で上げない限り再訪問ユーザの `/` が初回訪問時の版で永久に凍結していた。
- **`public/sw.js` を削除してはいけない。** 現在の中身は旧登録を解除するためだけの
  トゥームストーン（自己解除スクリプト）である。仕様の Update algorithm ではスクリプト取得が
  404 で失敗しても既存の登録は解除されないため
  （[w3c/ServiceWorker#204](https://github.com/w3c/ServiceWorker/issues/204)）、
  ファイルを消すと旧SWを持つ再訪問ユーザは解除経路を永久に失う。
- **`clients.claim()` を足してはいけない。** これが再読み込みループを防ぐ唯一の安全弁。
  `unregister()` 済みの登録は新規ナビゲーションを制御しないため `navigate()` 後のページは
  未制御になり、そこで `register()` が走って再度 activate しても
  `matchAll({type:'window'})` が空配列を返して `navigate()` は呼ばれない。
- **`fetch` ハンドラを足してはいけない。** リスナが無ければリクエストはブラウザ既定の経路へ流れる。
  素通しハンドラは毎回SWを起動し、ナビゲーションの `redirect: 'manual'` で例外経路を作り、
  `logo.mp4` / `logo.webm` の Range リクエストを壊しうる。
- **`public/_headers` の `/sw.js` ルールを弱めてはいけない。** 長期キャッシュされると解除コードが
  届かず旧SWが延命する。`/*.js` のような広いルールを足すときも巻き込まないこと。
- `public/sw.js` はビルドされず `public/` からそのまま配信される。構文エラーは install の失敗
  ＝旧SWの生存を意味するため、ES2015 の範囲だけで書く（`async`/`await`・optional catch binding は不可）。
- **削除を検討してよい条件（AND）**: ①デプロイから12か月以上経過 ②`/sw.js` へのリクエストが
  3か月以上連続でゼロ（`register()` を消した後このURLを叩く主体は「まだ旧登録を持つブラウザの
  更新チェック」しか無く、直接の観測信号になる）③削除PRに Issue #28 を明記。
  既定は「恒久的に残す」。残存コストは約6KBのファイル1つで、登録を持たないユーザは
  `/sw.js` を1バイトも取得しない。
- 将来 SW を再導入する場合は削除せず**同じURLで中身を差し替える**。新SWは旧キャッシュ名
  （`manapuraza-v1` / `v2`）を `activate` で掃除する責務を引き継ぐこと。

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
