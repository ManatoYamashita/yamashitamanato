# SSG（vite-ssg）実装ガイドライン

本プロジェクトは `vite-ssg` で静的4ルートと全作品詳細ページをビルド時に
プリレンダリングします。SPAとして書かれたコードをそのままプリレンダすると
「クライアントでは正しいが、生成HTMLだけが壊れる」不具合が起きます。
本ドキュメントはその発生源と検証手順をまとめたものです。

最終更新日: 2026-09-06

## 構成

| 項目 | 値 |
| --- | --- |
| エントリ | `src/main.ts`（`ViteSSG` ファクトリ形式） |
| ルート定義 | `src/router/routes.ts`（SSR/クライアント共有） |
| クライアント副作用 | `src/router/index.ts` の `setupClientRouterEffects(router)` |
| 対象ルート制御 | `vite.config.ts` の `ssgOptions.includedRoutes` |
| 生成物 | `dist/index.html` `about.html` `creatives.html` `contact.html` |
| 対象外 | `/creatives/:category/:id`、`/404`、`/underconstraction`（CSRフォールバック） |

## 落とし穴 1: head ライブラリの既定値がテンプレートを上書きする

`vite-ssg` は SSR 時に `@unhead/vue/server` の `createHead()` を
**`disableDefaults` なしで**呼びます（`vite-ssg/dist/index.mjs`）。
unhead 側の既定 init（`unhead/dist/server.mjs`）は次を注入します。

```js
htmlAttrs: { lang: 'en' },
meta: [
  { charset: 'utf-8' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1' },
]
```

これらは `index.html` に書いた `<html lang="ja">` や
`viewport-fit=cover` 付きの viewport を**静かに置き換えます**。
`vite-ssg` は head のオプションを外部へ公開していないため、
アプリ側の `useHead` で宣言し直すのが唯一の対処です。

```ts
// src/App.vue
useHead({
  htmlAttrs: { lang: computed(() => locale.value) },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
  ],
});
```

### ルール

- `<html lang>` は `document.documentElement.lang` への直接代入で管理しない。
  SSR段階では `document` が存在せず、生成HTMLに反映されない。
  `useHead({ htmlAttrs })` なら SSR/クライアント双方に同じ値が適用される。
- `index.html` の head に置いた値のうち、`useHead` が扱う種類のタグ
  （`title` / `meta` / `link` / `htmlAttrs` / `bodyAttrs`）は
  **プリレンダ後に残っている保証がない**。生成HTMLで必ず突合する。
- `viewport-fit=cover` を落とすと `env(safe-area-inset-*)` が 0 になる。
  本プロジェクトは `src/App.vue` と `src/components/Menu.vue` で使用中。

## 落とし穴 2: `onMounted` で補正される初期値が生成HTMLへ焼き込まれる

プリレンダ段階では `onMounted` が走りません。`ref` の初期値がそのまま
HTMLへ出力され、**JS未実行のクライアントではその状態が固定されます**。

過去に踏んだ実例:

| 状態 | 誤った初期値 | 生成HTMLで起きたこと |
| --- | --- | --- |
| `isHomePage`（App.vue） | `ref(true)` | 非ホーム3ページが「ホーム扱い」でレンダされ、本文が `visibility:hidden` のコンテナに入り、ホームの `sr-only` H1 が混入 |
| `showSplash`（useIntroAnimation） | `ref(true)` | 非ホーム3ページに全画面オーバーレイ（`position:fixed` / `z-index:9999`）が残り、JS無効時に本文が覆い隠される |

### ルール

- 「マウント後に正しくなる」状態は、**setup 内で同期的に決定できる値へ置き換える**。
  ルート由来なら `useRoute()` は SSR 段階でも解決済みなので `route.name` から初期化できる。

  ```ts
  const isHomePage = ref<boolean>(route.name === 'home');   // NG: ref(true)
  const showSplash = ref(options.isHomePage.value);          // NG: ref(true)
  ```

- 新しく `ref(true)` / `ref(false)` を書くときは
  「この初期値がHTMLに焼き込まれても正しいか」を必ず自問する。

## 動的ルートのプリレンダリング

### ルート列挙

`ssgOptions.includedRoutes` は async にできる。ビルド開始時に microCMS から全作品を取得し、
`/creatives/{majorCategory.id}/{id}` を静的4ルートへ足す。

認証情報が無い環境（フォーク、シークレット未設定のCI）では**静的4ページのみへ縮退し、
ビルドは継続する**。詳細ページはSPAフォールバックで従来どおり描画されるため、
プリレンダの失敗をビルド失敗に昇格させない。

### プリレンダ段階のデータ供給

`onMounted` は走らないため、`renderToString` の前にストアを充填しておく必要がある。
`src/main.ts` の `ViteSSG` セットアップ関数の `!isClient` 分岐で1回だけ取得し、
モジュールスコープの Promise で全ページのレンダリングに使い回す
（vite-ssg はサーバエントリを一度だけ読み込み、ルートごとに `createApp` を呼ぶ）。

### __INITIAL_STATE__ の受け渡し

vite-ssg はハイドレーションしない（後述）ため、状態を渡さないとクライアントの再描画で
「本文 → 空表示 → 本文」のちらつきが出る。詳細ページでは一瞬 `.not-found` が出る。

vite-ssg は `onSSRAppRendered` のコールバックを実行した**後**に
`transformState(initialState)` を呼ぶ。`initialState` は同一オブジェクト参照が
`context` → `route.meta.state` → シリアライズ対象と引き回されるため、
コールバック内で**in-place に変異させる**とルートごとの状態を載せられる。

```ts
onSSRAppRendered(() => {
  Object.assign(initialState, getPrerenderState(router.currentRoute.value.path));
});
```

載せる量はルートごとに絞る。全作品を素のまま載せると 156KB になる。

| ルート | 載せるもの | 実測 |
| --- | --- | ---: |
| `/creatives/:category/:id` | 該当1件のみ（全フィールド） | 1.5〜9KB |
| `/creatives` | 全件から `detail`/`detailEn` と参照展開されたメタを落とした軽量投影 | 約35KB（gzip 約8KB） |
| その他 | 空 | 18B |

### APIキーをクライアントバンドルへ混入させない

環境変数は `MICROCMS_API_ENDPOINT` / `MICROCMS_API_KEY` のみを使う。
**`VITE_` プレフィックスは付けない**（Vite がクライアントバンドルへインライン展開するため）。

プリレンダ用の直接アクセスは `src/composables/microcmsServer.ts` に隔離し、
`import.meta.env.SSR` が真の分岐からのみ動的 import する。Vite はクライアントビルドで
この定数を `false` へ静的置換するため、分岐ごと除去されチャンクも生成されない。

```bash
npm run build
# いずれも 0 であること
grep -rl -- "$(sed -n 's/^MICROCMS_API_KEY=//p' .env)" dist/ | wc -l
grep -rl -- "$(sed -n 's/^MICROCMS_API_ENDPOINT=//p' .env)" dist/ | wc -l
```

## 落とし穴 3: SSR段階のブラウザAPI参照

`document` / `window` / `localStorage` / `navigator` は SSR 段階に存在しません。

- クライアント専用の副作用は `ViteSSG` 第3引数の `isClient` ガード内に置く
  （プログレスバー、コンポーネントプリロード、Service Worker、MetaBall、英語辞書の遅延ロード）。
- 共通ロジック内で参照する場合は `typeof window === 'undefined'` で早期 return する
  （`src/composables/useCreativesAPI.ts` のキャッシュ関数が該当）。
- データ取得は各ビューの `onMounted` からのみ発火させる。setup で `await` すると
  `<Suspense>` 経由で SSR 段階の fetch が走り、ビルドが外部APIへ依存する。

## ハイドレーションは行われない

`ViteSSG` は `options.hydration` を指定しない限り、クライアントで
`createSSRApp` ではなく `createApp` を使います。Vue の `createApp().mount()` は
`container.textContent = ''` してから全再描画するため、
**プリレンダHTMLはクライアント側で破棄されます**。

- ハイドレーション不整合は発生しない（フォールバックで Home のHTMLが配信されても壊れない）。
- 逆に言うと、プリレンダHTMLの価値は
  **クローラとJS未実行環境に対してのみ**。この2者を基準に成否を判定する。

## 検証手順

生成HTMLはローカルビルドで確認できます。ブラウザでの目視だけでは
クライアント側で補正されてしまい、上記の欠陥が見えません。

```bash
npm run build

for f in index about creatives contact; do
  echo "### dist/$f.html"
  grep -m1 -o '<html[^>]*>' dist/$f.html
  grep -o '<meta name="viewport"[^>]*>' dist/$f.html
  grep -c 'splash-overlay"' dist/$f.html
  grep -m1 -o '<title>[^<]*</title>' dist/$f.html
  grep -m1 -o '<link rel="canonical"[^>]*>' dist/$f.html
done
```

Deploy Preview と本番の head を全件突合すると、
「PRで消えたタグ」と「PRで増えたタグ」を機械的に洗い出せます。

```bash
curl -sSL https://www.yamashitamana.to/about -o /tmp/prod.html
curl -sSL https://deploy-preview-<PR>--yamashitamanato.netlify.app/about -o /tmp/preview.html
# head 内の meta/link/title/script/style を抽出して差集合を取る
```

### チェックリスト

- [ ] 全ページ `<html lang="ja">`
- [ ] viewport に `viewport-fit=cover` が残っている（重複タグなし）
- [ ] `canonical` / `og:url` / `description` がページ固有値
- [ ] 全画面オーバーレイ（`.splash-overlay`）はホームのみ
- [ ] `.app.glass` が非ホームで `opacity:1` / `visibility:visible`
- [ ] 本文テキスト（H1/H2/段落）がHTMLに含まれる
- [ ] 詳細ページ数がmicroCMSの作品数と一致し、`.not-found` を含むページがゼロ
- [ ] APIキー・エンドポイントの実値が `dist/` に出現しない
- [ ] `vue-tsc --noEmit` と `eslint` が exit 0

> 注: `.github/workflows/feature-ci.yml` の lint / format ステップは `|| true` で
> 結果を握り潰しています。**CIが緑でも lint が通ったことにはならない**ため、
> ローカルで明示的に実行すること。

## 既知の制約

- **ビルド後に追加・更新された作品はプリレンダされない。** microCMS で公開しても、
  再ビルドするまで詳細ページはSPAフォールバック（`index.html`）で配信される。
  内容はクライアント取得で正しく表示されるが、初期HTMLには含まれない。
  公開後は Netlify の再デプロイが必要（将来は microCMS Webhook での自動再ビルドを検討）。
- 作品が0件のカテゴリ（現在は design）は、プリレンダHTMLに skeleton が残る。
  クライアント側では取得完了後に消える。
- hreflang は ja/en/x-default がすべて `/` を指したまま（Issue #7）。
- 存在しないパスが 200 を返す（Issue #8）。

## 関連ドキュメント

- [デプロイ手順](../ops/deployment-checklist.md)
- [パッケージマネージャ運用ポリシー](../ops/package-manager-policy.md)
- [アクセシビリティ](./accessibility.md)
