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
| `hasSettled`（Creatives.vue） | `ref(false)` | 作品0件のカテゴリ（design）が skeleton のまま焼き込まれ、空状態の文言が初期HTMLから消えた（Issue #38） |

### ルール

- 「マウント後に正しくなる」状態は、**setup 内で同期的に決定できる値へ置き換える**。
  ルート由来なら `useRoute()` は SSR 段階でも解決済みなので `route.name` から初期化できる。

  ```ts
  const isHomePage = ref<boolean>(route.name === 'home');   // NG: ref(true)
  const showSplash = ref(options.isHomePage.value);          // NG: ref(true)
  ```

- **`ref(false)` も等しく危険。** 「まだ分からない」を意味する初期値は、
  SSR段階では必ずその側へ倒れる。`ref(true)` だけを警戒対象にするのは片手落ち。

- **「未決着 / データあり / データ無し確定」の3分岐を書くとき、3つ目の条件を
  ビューのライフサイクルから導いてはならない。** 「取得が終わった」はSSRでは表現できないが、
  「**ストアが完全な集合を保持していると確定している**」ならSSRでも真になりうる。
  `src/main.ts` はプリレンダのレンダリング前に `fetchCreatives()` を await 済みで、
  クライアントでもマウント前に `__INITIAL_STATE__` でストアを充填するためである。

  ```ts
  // NG: ビュー由来の1変数だけで3分岐を決める
  const hasSettled = ref(false);

  // OK: ビュー由来の決着フラグとストア由来の完全性を合成する
  const loadSettled = ref(false);
  const showSkeleton = (items) => items.length === 0 && !hasAllCreatives.value && !loadSettled.value;
  const showEmpty = (items) => items.length === 0 && hasAllCreatives.value;
  ```

  初期値のスナップショット（`ref(hasAllCreatives.value)`）で済ませない。
  setup 後に真になる情報を取り込めないうえ、`onMounted` の取得処理が
  それを偽へ打ち消して skeleton が一瞬巻き戻る、という二次的な問題が出る。

  **例外: プリレンダ状態が対象データを必ず含むビューはこのルールの対象外。**
  `CreativeDetail.vue` は `hasSettled = ref(false)` を今も使っているが、これは違反ではない。
  詳細ページの `__INITIAL_STATE__` には該当作品が必ず1件入るため、SSR段階の分岐は
  `!hasSettled && (!creative || creativesArePartial)` の第2項が偽になり、skeleton へ倒れない。
  ここを「ルール違反」として `hasAllCreatives` 由来へ書き換えると、軽量投影から遷移した
  直後に skeleton を出す `partial` の仕様が壊れ、本文が `description` で代用される。
  判定軸は「ビュー由来かストア由来か」ではなく、
  **そのルートのプリレンダ状態だけで3つ目の分岐を確定できるか**である。

- **エラー状態は空状態の代理にならない。** 「エラーでないなら空」（`v-else-if="!loadError"`）は、
  プリレンダ済みの全件を保持したまま再取得だけ失敗したケースを取りこぼし、
  0件カテゴリが h2 と説明段落だけの無言セクションになる。

- 同じ分岐が複数箇所にある場合、条件式は **1つの関数へ集約する**。
  `Creatives.vue` の分岐は5カテゴリに複製されており、
  0件カテゴリでしか露見しない欠陥を長期間見落とす原因になった。

- 新しく `ref(true)` / `ref(false)` を書くときは
  「この初期値がHTMLに焼き込まれても正しいか」を必ず自問する。

## 動的ルートのプリレンダリング

### ルート列挙

`ssgOptions.includedRoutes` は async にできる。ビルド開始時に microCMS から全作品を取得し、
`/creatives/{majorCategory.id}/{id}` を静的4ルートへ足す。

取得は `scripts/lib/microcms.ts` が `totalCount` に達するまでページングする。
1リクエスト上限は100件なので、作品が100件を超えたときに列挙とsitemapが黙って
欠けないようにするため。クライアント側 `fetchCreatives()` も同じくページングする
（片方だけ打ち切ると、プリレンダ済みの詳細ページがクライアント再描画で消える）。

`isValidCategory` を通らない `majorCategory.id` は列挙から除外する。
`src/router/routes.ts` の `beforeEnter` が未知カテゴリを `/404` へ流すため、
列挙すると vite-ssg がその遷移結果をレンダリングし、**404 の本文を持つHTMLが
実URLに 200 で配信される**。除外時は警告を出すので、CMSに大カテゴリを追加したら
`src/types/creatives.ts` の `CreativeCategory` も更新する。

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

載せる状態には**独立した2軸のフラグ**を添える。どちらか一方では、受け取った側が
「本文を持たない」と「件数がそろっていない」を区別できない。

| フラグ | 軸 | 立つルート | 受け取った側の用途 |
| --- | --- | --- | --- |
| `partial` | フィールド | `/creatives` | 詳細ページが本文を `description` で代用しないよう skeleton を出す |
| `all` | 件数 | `/creatives` | 一覧が0件カテゴリの空状態を skeleton と区別する |

詳細ページの状態は該当1件のみ・全フィールドなので、どちらのフラグも立てない。

**`all` は必ずストアの実値を載せる。「`/creatives` だから `true`」と定数で書いてはならない。**
認証情報が無い縮退ビルドでは `creatives` が空のまま `partial: true` だけが付くため、
定数の `true` は「取得できなかった」を「0件だった」としてクライアントへ誤って伝え、
全カテゴリに虚偽の空状態文言を出す。`all` の値は
「このHTMLに空状態の文言を焼き込んだか」と1対1に対応させること。
`src/main.ts` 側も、作品が0件でフラグだけが立つ状態を落とさないよう
`prerendered.all === true || embedded.length > 0` で受ける。

載せる量はルートごとに絞る。全作品を素のまま載せると 156KB になる。

| ルート | 載せるもの | 実測 |
| --- | --- | ---: |
| `/creatives/:category/:id` | 該当1件のみ（全フィールド） | 1.5〜9KB |
| `/creatives` | 全件から `detail`/`detailEn` と参照展開されたメタを落とした軽量投影 | 約35KB（gzip 約8KB） |
| その他 | 空 | 18B |

### 縮退の判定点は1か所に集約する

プリレンダの成否は**ルート列挙**（`vite.config.ts`）と**データ供給**（`src/main.ts`）という
独立した2経路に分かれる。両方が個別に fail-soft すると「片方だけ成功」という中間状態が生まれ、
ビルドは成功のまま壊れた成果物が配信される。

実際に片方だけ失敗させたときの出力:

| 項目 | 結果 |
| --- | --- |
| ビルド | `Build finished.` exit 0 |
| `<title>` / `og:title` | `Not Found \| yamashitamana.to` |
| `description` | `作品が見つかりません` |
| `canonical` | 本番URLのまま |
| `<h1>` | 無し（skeleton のみ） |
| `.not-found` を含むページ | **0件** |

最後の行が重要で、`hasSettled` は `.not-found` ブロックの描画を抑えるが `useHead` は素通しになる。
つまり**クラス名の検索では検出できない**。

そこで判定を次の1か所へ集約する。

- 認証情報が**無い** → 静的4ページへ縮退（フォーク、シークレット未設定のCI）。正常な経路。
- 認証情報が**ある** → `includedRoutes` の取得失敗はそのまま throw してビルドを落とす。
- 詳細ルートを1件でも列挙した場合 → `onPageRendered` で各ページの `initialState.creatives` を
  検査し、`/creatives` と詳細ページが空なら記録。`onFinished` でまとめて throw する。
- 同じ `onPageRendered` で、`/creatives` のHTMLに `skeleton-card` が残っていないかも検査する。
  一覧の skeleton は「取得が決着していない」の意味であり、データ供給が成功しているのに
  残っているなら分岐の欠陥（Issue #38）。0件カテゴリでしか露見せず生成HTMLの目視では
  見落とすため、ゲートで固定する。縮退ビルドでは skeleton が出るのが正しいので、
  `enumeratedDetailRoutes === 0` の早期 return より後ろに置く。

`onPageRendered` は `triggerOnSSRAppRendered` の**後**に呼ばれるため、
`appCtx.initialState` は `onSSRAppRendered` で載せた後の値になっている。
`onFinished` は `build()` から `await` されるので、ここで throw すればプロセスが非0で終わる。

新しく fail-soft な `catch` を足すときは、**その失敗が下流のどのゲートで検出されるか**を
必ずコメントに書く。書けないなら、その `catch` は握り潰しである。

### APIキーをクライアントバンドルへ混入させない

環境変数は `MICROCMS_API_ENDPOINT` / `MICROCMS_API_KEY` のみを使う。
**`VITE_` プレフィックスは付けない**（Vite がクライアントバンドルへインライン展開するため）。

プリレンダ用の直接アクセスは `src/composables/microcmsServer.ts` に隔離し、
`import.meta.env.SSR` が真の分岐からのみ動的 import する。Vite はクライアントビルドで
この定数を `false` へ静的置換するため、分岐ごと除去されチャンクも生成されない。

空文字を `grep` へ渡すと全ファイルに一致してしまうため、値の存在を先に確かめる。

```bash
npm run build
for name in MICROCMS_API_KEY MICROCMS_API_ENDPOINT; do
  value=$(sed -n "s/^${name}=//p" .env)
  if [ -z "$value" ]; then echo "SKIP $name (not set in .env)"; continue; fi
  echo "$name: $(grep -rl -F -- "$value" dist/ | wc -l)"   # 0 であること
done
```

値を持たない環境でも構造だけは検査できる。こちらは認証情報が不要で、かつより強い。

```bash
ls dist/assets/ | grep -i microcms          # 何も出ないこと
grep -rl "process\.env\." dist/assets/*.js  # 何も出ないこと
```

## 落とし穴 3: SSR段階のブラウザAPI参照

`document` / `window` / `localStorage` / `navigator` は SSR 段階に存在しません。

- クライアント専用の副作用は `ViteSSG` 第3引数の `isClient` ガード内に置く
  （プログレスバー、コンポーネントプリロード、MetaBall、英語辞書の遅延ロード）。
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

## 一意なDOM IDは `useId()` で採る

`aria-controls` / `aria-describedby` / `<label for>` などで一意なIDが必要なとき、
モジュールレベルのカウンタ（`let n = 0; const id = ++n`）を使わないこと。

vite-ssg は**全ページを1つのNodeプロセスで順に描画する**ため、モジュール変数は
ページをまたいで生き続ける。24ページ目のコンポーネントには連番の後半が振られ、
静的HTMLに `menu-47` のような値が焼き込まれる。ページ単位では整合するので
壊れはしないが、値が不安定で差分レビューもしづらい。

```ts
import { useId } from 'vue';

const menuId = useId(); // ページごとに振り直される。SSR/クライアント間でも一致
```

`useId()`（Vue 3.5+）はコンポーネントツリー上の位置から採番するため、
ページごとに `v-0` から振り直される。現状この構成はハイドレーションしないが、
将来 `options.hydration` を有効化しても、そのまま安全に使える。

同じコンポーネントが同一ページに複数マウントされる場合（`LanguageDropdown` は
`App.vue` のホーム用と `Menu.vue` の desktop / mobile で最大3つ）でも、
ID は各インスタンスで異なる。

```bash
# 生成HTMLで aria-controls と参照先 id が一致し、ページ内で重複しないことを確認する
npm run build
grep -o 'aria-controls="[^"]*"' dist/index.html | sort | uniq -c
grep -o '<ul id="[^"]*" class="lang-dropdown-menu"' dist/index.html
```

## 検証手順

生成HTMLはローカルビルドで確認できます。ブラウザでの目視だけでは
クライアント側で補正されてしまい、上記の欠陥が見えません。

> 注: `ssgOptions.formatting: 'minify'` により生成HTMLは1行になる。
> `grep -c` は**行数**を返すため出現回数の検証には使えない（常に0か1）。
> 回数を数えるときは必ず `grep -o PATTERN FILE | wc -l` を使う。

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
- [ ] 作品0件のカテゴリ数と空状態の文言の数が一致する
      （`grep -o 'section-empty' dist/creatives.html | wc -l`）
- [ ] プリレンダHTMLに skeleton が残っていない
      （`grep -o 'skeleton-card' dist/creatives.html | wc -l` が0。
      詳細ページも `grep -o 'skeleton' dist/creatives/*/*.html | wc -l` が0）
- [ ] 詳細ページ数がmicroCMSの作品数と一致する
- [ ] 詳細ページの `<title>` と `<h1>` が作品固有値になっている
      （`.not-found` の有無では検出できない。`grep -rl "<title>Not Found" dist/` が空であること）
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
- プリレンダされた `/creatives` の状態は `detail`/`detailEn` を落とした投影のため、
  そこから詳細ページへ遷移した直後は本文を持たない。`partial` フラグで区別し、
  `fetchCreatives()` が決着するまで詳細ページは skeleton を出す。
- **ビルド時に0件だったカテゴリへ作品を追加すると、再ビルドまでは空状態の文言が
  「嘘」になる。** `all` フラグはビルド時点の実値なので、追加後の初回描画は
  クライアント取得が決着するまで `creatives.common.categoryEmpty` を表示し続ける。
  これは skeleton を出し続ける旧挙動（Issue #38）との意図的なトレードオフで、
  JS未実行のクローラへ正しい状態を渡すことを優先した結果である。
  窓は取得1往復ぶんで、上の「ビルド後の追加はプリレンダされない」と同じ根で、
  microCMS Webhook による自動再ビルド（Issue #29）が入れば併せて解消する。
- hreflang は ja/en/x-default がすべて `/` を指したまま（Issue #7）。
- 存在しないパスが 200 を返す（Issue #8）。

## 関連ドキュメント

- [デプロイ手順](../ops/deployment-checklist.md)
- [パッケージマネージャ運用ポリシー](../ops/package-manager-policy.md)
- [アクセシビリティ](./accessibility.md)
