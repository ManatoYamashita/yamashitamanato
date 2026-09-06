# アクセシビリティガイドライン（WCAG 2.1 AA準拠）

## 概要

本プロジェクトはWCAG 2.1 AAレベルに準拠します。以下のガイドラインに沿って開発を行ってください。

## 実装済み対応

### グローバル基盤

| 項目 | 実装ファイル | 説明 |
|---|---|---|
| `<html lang>` 動的更新 | `src/App.vue` | `locale` watchで `document.documentElement.lang` を同期 |
| `:focus-visible` スタイル | `src/assets/main.css` | 全インタラクティブ要素に黄色アウトライン（2px solid #f0d300） |
| `prefers-reduced-motion` | `src/assets/main.css` + GSAP composables | CSS: 全アニメーション/トランジション無効化、GSAP: 各composableでランタイムチェック |
| `.sr-only` ユーティリティ | `src/assets/main.css` | スクリーンリーダー専用の非表示テキスト |

### コンポーネント別対応

| コンポーネント | 対応内容 |
|---|---|
| `CreativesHero.vue` | フィルターボタンに `aria-pressed` + `.sr-only` の補足テキスト（可視「Anime」等の略語を補う）。ラッパーの `role="toolbar"` にのみ `aria-label` |
| `MetaBall.vue` | canvas に `aria-hidden="true"` |
| `Sns.vue` | 外部リンクに `target="_blank"`, `rel="noopener noreferrer"`。アイコンのみで可視テキストが無いため `aria-label` に「新しいタブで開きます」追記 |
| `LanguageDropdown.vue` | WAI-ARIA Menu Buttonパターン: `role="menu"`, `role="menuitem"`, ArrowUp/Down/Escape/Home/End キーボード操作。トグルは可視「日本語」+ `.sr-only` の `descriptionLabel` |
| `App.vue` | ホームページに `<h1 class="sr-only">` 追加 |
| `Btn.vue` | ツールチップに `id` + ボタンに `aria-describedby` 接続。ツールチップは `aria-hidden="true"`（`opacity:0` では名前計算から外れないため）。アクセシブル名は可視 `text` のみ |
| `Menu.vue` | ロゴリンクに `.sr-only` の遷移先ラベル（ロゴ画像の読み込み失敗時も可視テキストと整合） |
| `Creatives.vue` | DC-chan画像に説明的 `alt` テキスト + `width`/`height`/`aspect-ratio` でCLS対策 |
| `CreativeDetail.vue` | 取得失敗を「作品が見つかりません」と分離し、再読み込みボタンと一覧への復帰導線を提示（#26）。下記「非同期エラーの伝え方」を参照 |

## ランドマーク構造

WCAG 2.1 の 1.3.1（情報及び関係性）と 2.4.1（ブロックスキップ）に対応するため、全ルートで banner / main / contentinfo がそれぞれ1つずつ公開される構造を維持します。PR #24（#20 / #21 / #22）で確立し、#25 で作品詳細ページの取りこぼしを補修しました。

### 現在の構造

| ランドマーク | 実体 | 備考 |
|---|---|---|
| banner | `src/App.vue:15` の `<header id="navbar">` | 中身は `Menu.vue`。内部の `nav` には `aria-label` を必須とする |
| main | 各ビューのルート要素 | 下表参照 |
| contentinfo | `index.html:288` の `<footer>` | `#app` の外に静的配置 |

マウント点は **`<div id="app">`**（`index.html:286`）。ここを `<main>` に戻すと各ビューの `<main>` と入れ子になり、`header#navbar` も main の内側に入って banner として公開されなくなります（#22）。戻さないこと。

### ビューごとの main

| ビュー | main の所在 |
|---|---|
| `views/About.vue` / `Contact.vue` / `Creatives.vue` / `404.vue` / `UnderConstraction.vue` | 各ファイルのルート要素 |
| `views/Home.vue` | ルートは `display:none` の空 `div`。main は `src/App.vue:39` の `<main class="home-main">` が担う |
| `views/CreativeDetail.vue` | skeleton / 本文 / 取得失敗 / 見つからない の**4分岐すべて**がルート `<main>`（#25 / #26） |

### 新規ビュー追加時のルール

- ビューのルート要素は `<main>` にする（`<div>` で始めない）。
- ルートが `v-if` / `v-else-if` / `v-else` で分岐する場合、**全分岐のルートを `<main>` にする**。排他的で同時にDOMへ出るのは1つだけなので、main は1つに保たれる。
- **外側に `<main>` ラッパを足してはいけない。** 理由は2つあり、どちらも実害が出る:
  - `src/App.vue:76` の `<component :is="Component" id="scrollable-aria" />` は属性フォールスルーでビューのルート要素に `id` を付与している。`src/App.vue:309` の `#scrollable-aria { pointer-events: all }` が `src/assets/main.css:41` の `#app { pointer-events: none }` を打ち消しているため、ラッパを1段挟んで id がラッパへ移ると**ビュー内の全操作がクリック不能になる**。
  - `min-height: 100%` を使うビュー（`views/CreativeDetail.vue:557`）は、包含ブロックが `.app.glass`（`src/App.vue:280`、`max-height: 82vh` + `overflow-y: auto`）から高さ auto のラッパへ移り、高さが `0` に潰れる。
- 上記フォールスルーはビュー側が書いた `id` を上書きする。`views/About.vue:139` の `id="about"` は実際のDOMには出力されないため、CSSセレクタやページ内アンカーの参照先にしないこと。
- `aria-current="page"` を `RouterLink` に明示指定しない。パス一致時に Vue Router が自動付与するため、明示すると全ルートで「現在のページ」を宣言してしまう（#21）。

### 検証

```bash
npm run build

# 各プリレンダHTMLに main がちょうど1つ（すべて 1 であること）
grep -c '<main' dist/index.html dist/about.html dist/creatives.html dist/contact.html dist/creatives/*/*.html

# マウント点が div のままであること（0件であること）
grep -c 'main id="app"' dist/creatives/*/*.html | awk -F: '{s+=$2} END {print s}'

# main に id="scrollable-aria" が乗っていること
grep -oh '<main[^>]*>' dist/creatives/*/*.html | sort -u
```

ブラウザ（`npm run preview`）では、DevTools の Accessibility ツリーに banner / main / contentinfo が1つずつ出ること、CTA・戻るリンクがクリックとフォーカスを受け付けること（`pointer-events` の維持）を確認します。

## WCAG 2.5.3 Label in Name（可視ラベルとアクセシブル名）

**可視テキストを持つ要素に、それを置き換える `aria-label` を付けてはいけない。**

`aria-label` は要素のアクセシブル名を*上書き*する。可視テキストが名前に含まれなくなると、音声コントロール利用者が画面に見えている語を発話しても操作できない（WCAG 2.5.3 レベルA 違反 / Lighthouse `label-content-name-mismatch`）。

### アンチパターン

```vue
<!-- NG: 可視「Anime」がアクセシブル名から消える -->
<button :aria-label="$t('creatives.filters.animation')">
  <span>Anime</span>
</button>
<!-- 可視テキスト   : Anime -->
<!-- アクセシブル名 : アニメーション作品を表示  ← 一致しない -->
```

### 推奨パターン

説明を補いたい場合は `.sr-only` を可視テキストの**後ろ**に置き、アクセシブル名を「可視テキスト + 説明」にする。

```vue
<!-- OK: 可視テキストが名前の先頭に来る -->
<button>
  <span>Anime</span>
  <span class="sr-only">&nbsp;{{ $t('creatives.filters.animation') }}</span>
</button>
<!-- 可視テキスト   : Anime -->
<!-- アクセシブル名 : Anime アニメーション作品を表示 -->
```

**先頭の `&nbsp;` は必須。** アクセシブル名はインライン要素の子を区切り無しで連結するため、これが無いと
`AnimeShow animation works` のように単語が繋がって読み上げられる。ASCII空白では代替にならない。
消える理由は空白を置く位置によって異なる:

- **`<span>` の内側先頭（上の推奨パターンの位置）: 1行で書いても必ず消える。**
  Vue のテンプレートコンパイラは、要素の最初または最後の子である「空白のみのテキストノード」を
  改行の有無に関わらず削除する。整形前から機能しない
- **`<span>` 同士の間: 改行が入った瞬間に消える。**
  `whitespace: 'condense'` が「要素間にあり改行を含む空白のみのテキストノード」を削除するため、
  Prettier が `<span>` を別行へ折り返した時点で黙って壊れる

どちらの位置でも ASCII空白は当てにならない。実体参照で確定させること。

挙動は次のコマンドで再現できる。`&nbsp;` のときだけ描画関数に `" "`（U+00A0）が残る。

```bash
node -e 'console.log(require("@vue/compiler-dom").compile(process.argv[1]).code)' \
  '<button><span>Anime</span><span class="sr-only">&nbsp;{{ l }}</span></button>'
```

静的HTML（`index.html`）など `.sr-only` が使いにくい箇所では、`aria-label` の値を**可視テキストで始まる**形にする。

```html
<a href="https://bento.me/ym" aria-label="山下マナト（山下真和都）の各種SNSへ">山下マナト</a>
```

### `aria-label` を使ってよいケース

- アイコンのみ / 画像のみで**可視テキストが無い**要素（`Sns.vue` のSNSアイコン、`Menu.vue` のハンバーガー、`AboutHero.vue` の外部リンクアイコン）
- `<nav>`, `role="toolbar"` など **name from content 非対応**のコンテナ（`CreativesHero.vue` のフィルターラッパー、`Menu.vue` の各 `<nav>`）

### 見落としやすい落とし穴

- **prop 経由の間接的な `aria-label`**: `Btn.vue` はかつて `alt` prop を無条件に `aria-label` へ流しており、可視テキスト（`text` prop）と乖離していた。ラベル文字列を2箇所で持つ設計にしない
- **`opacity: 0` は隠しきれない**: `opacity` で隠した要素はアクセシビリティツリーに残り、name from content に混入する。名前から外すには `aria-hidden="true"` / `display:none` / `visibility:hidden` が必要（`aria-describedby` で直接参照された要素は `aria-hidden` でも説明として読まれる）
- **条件付きで現れる可視テキスト**: 画像のフォールバック表示など、通常は画像だけの要素が条件次第でテキストを出す場合、そのときだけ違反になる
- **監査範囲の穴**: Lighthouse は指定URLしか見ない。動的ルート（`/creatives/:category/:id`）は個別に監査する

## 非同期エラーの伝え方

取得失敗の表示は、多くの場合 skeleton と**差し替わる形で DOM に挿入される**。
挿入と同時にテキストが入るライブリージョンは読み上げが実装依存になるため、
`role="alert"` を貼るだけでは伝わったことにならない。`CreativeDetail.vue` の
取得失敗表示（#26）で確立した構成を標準とする。

### 1. 初回の失敗は見出しへフォーカスを移す

```ts
watch(loadError, async (failed) => {
  if (!failed || creative.value) return;
  await nextTick();
  errorHeading.value?.focus();   // <h1 tabindex="-1">
});
```

遷移直後のフォーカスは body にあり、奪う対象が無い。見出しが読み上げられ、
同時に再読み込みボタンの直前へフォーカスが着く。

### 2. ライブリージョンは「挿入してから」更新する

同じ文言で再び失敗してもテキストが変わらないため、`role="alert"` では**無音になる**。
`.sr-only` の `role="status"` を置き、空 → 本文 と更新して差分を作る。

ただし領域そのものが分岐と同時に挿入される場合、**挿入と同じ tick でテキストを入れると
差分にならない**。`Creatives.vue` のように領域を分岐の外へ常設できるならそれが最善で、
`CreativeDetail.vue` のように `id="scrollable-aria"` のフォールスルーが単一ルートを
要求して常設できない場合は、分岐が確定した後（`await nextTick()` の後）に本文を入れる。

```ts
} finally {
  hasSettled.value = true;      // ここで分岐が確定する
  isReloading.value = false;
}

await nextTick();               // 領域が DOM に入るのを待つ

if (failed && (recovering || creative.value)) {
  retryStatus.value = t('creatives.common.loadError');
}
```

条件が `recovering || creative.value` なのは、`1.` の見出しフォーカスが働く経路
（本文が無く、初回に失敗した場合）だけは見出し自身が同じ文言を読み上げるため、
二重に伝えないという意味である。

### 3. 再試行が成功したときもフォーカスと結果を引き継ぐ

成功すると押されたボタンは DOM から消える。放置するとブラウザがフォーカスを body へ
落とし、**位置と「成功した」という結果の両方が失われる**。失敗側だけ手当てして
成功側を忘れやすい。本文の見出し（`tabindex="-1"`）へ移し、見出しの読み上げで
結果を伝える。

```ts
if (recovering) {
  contentHeading.value?.focus();
}
```

`recovering` は `load()` 冒頭で退避した `loadError.value`。初回の読み込み成功では
偽なので、フォーカスを奪わない。

### 4. 実行中のボタンを `disabled` にしない

フォーカス中の要素を `disabled` にすると、ブラウザはフォーカスを body へ落とす。
`aria-disabled="true"` と、ハンドラ冒頭の早期 return で多重実行を防ぐ。

```ts
const load = async (): Promise<void> => {
  if (isReloading.value) return;
  // ...
};
```

### 5. 「見つからない」と「読み込めなかった」を混ぜない

`v-else` ひとつで両方を受けると、通信エラーでも「見つかりません」と表示され、
ユーザは誤った原因を伝えられる。分岐・文言・`useHead` のメタ（title / description /
OGP）すべてで区別する。エラー状態のフラグは**成功時にだけ**倒す。冒頭でクリアすると
再取得の往復の間だけ「見つかりません」へ落ちる。

## 開発時のチェックリスト

### 新規コンポーネント作成時

- [ ] インタラクティブ要素に可視テキストがあるか（無い場合に限り `aria-label`）
- [ ] 可視テキストを `aria-label` で上書きしていないか（WCAG 2.5.3。補足は `.sr-only` で後置）
- [ ] キーボードのみで操作可能か（Tab, Enter, Space, Escape, Arrow keys）
- [ ] インタラクティブ要素を入れ子にしていないか（`<button>` の中の `<a>` など。Tabが2回止まり、ロールも不正になる。ボタン見た目のリンクは `<a>` に class を当てる）
- [ ] `outline: none` を書いていないか。**scoped CSS では詳細度がグローバルの `:focus-visible` を上回り、フォーカスの輪郭が消える**（`a.goback[data-v-x]` = 0,2,1 > `:focus-visible` = 0,1,0）
- [ ] `:focus-visible` スタイルが適用されるか（グローバルスタイルでカバー）
- [ ] 装飾的な画像には `aria-hidden="true"` または空 `alt=""` を設定
- [ ] 意味のある画像には説明的な `alt` テキストを設定
- [ ] 画像に `width`/`height` 属性を設定（CLS防止）
- [ ] 新規ビューの場合、ルート要素が `<main>` か（分岐する場合は全分岐）

### アニメーション追加時

- [ ] `prefers-reduced-motion` を考慮（CSSまたはJSでチェック）
- [ ] GSAP使用時: `window.matchMedia('(prefers-reduced-motion: reduce)').matches` でスキップまたは `duration: 0`

### 外部リンク

- [ ] `target="_blank"` + `rel="noopener noreferrer"` を追加
- [ ] 可視テキストが無い（アイコンのみ）リンク: `aria-label` に「新しいタブで開きます」を追記
- [ ] 可視テキストがあるリンク: `aria-label` を使わず `<span class="sr-only">` で追記

### フォーム・ボタン

- [ ] ボタンに可視テキスト（アイコンのみの場合に限り `aria-label`）
- [ ] トグルボタンに `aria-pressed` または `aria-expanded`
- [ ] ドロップダウン/メニューに `role="menu"` + `role="menuitem"`
- [ ] 処理中のボタンは `disabled` ではなく `aria-disabled` + ハンドラのガード
- [ ] 消えるボタンを押した結果は、フォーカスの引き継ぎ先を決めてから実装する

### 見出し階層

- [ ] 各ページに `<h1>` が1つ存在
- [ ] 見出しレベルが順番通り（h1 → h2 → h3、レベルスキップなし）

## i18nキー（アクセシビリティ関連）

```
common.opensInNewTab     — 外部リンクの補足テキスト
home.title               — ホームページのh1テキスト
creatives.filters.toolbar — カテゴリフィルターtoolbarのaria-label（コンテナのため可）
creatives.filters.*       — カテゴリフィルターの.sr-only補足テキスト
creatives.dcChanAlt       — DC-chan画像のaltテキスト
navbar.selectLanguage     — 言語切替トグルの.sr-only補足テキスト
navbar.menu.home          — ロゴリンクの.sr-only補足テキスト（メニュー項目と共用）
```

## reduced-motion対応コンポーネント一覧

| ファイル | 対応方法 |
|---|---|
| `src/assets/main.css` | CSS `@media (prefers-reduced-motion: reduce)` でグローバル無効化 |
| `src/composables/useIntroAnimation.ts` | `prefersReducedMotion()` チェックでアニメーションスキップ |
| `src/composables/useMobileMenuAnimation.ts` | `prefersReducedMotion()` チェックで `duration: 0` |
| `src/components/CreativesHero.vue` | onMounted内で早期リターン |
| `src/components/Sns.vue` | onMounted内で早期リターン |
| `src/components/Menu.vue` | CSS `@media (prefers-reduced-motion: reduce)` でローカル無効化 |

---

最終更新日: 2026-09-06（ランドマーク構造 / Label in Name / 非同期エラーの伝え方の節を追加、`&nbsp;` 必須の理由を実測どおりに訂正、入れ子インタラクティブと `outline: none` をチェックリストへ追加）
