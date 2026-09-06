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
| `views/CreativeDetail.vue` | `v-if` / `v-else-if` / `v-else` の**3分岐すべて**がルート `<main>`（#25） |

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
`AnimeShow animation works` のように単語が繋がって読み上げられる。ASCII空白では代替にならない:

- Vue の `whitespace: 'condense'` が改行を含む空白のみのテキストノードを削除する
- Prettier が `<span>` を別行に整形した時点で、その空白ノードが改行を含むようになる

つまり ASCII空白は「書いた直後は動くが、次に整形した誰かが黙って壊す」。実体参照で確定させること。

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

## 開発時のチェックリスト

### 新規コンポーネント作成時

- [ ] インタラクティブ要素に可視テキストがあるか（無い場合に限り `aria-label`）
- [ ] 可視テキストを `aria-label` で上書きしていないか（WCAG 2.5.3。補足は `.sr-only` で後置）
- [ ] キーボードのみで操作可能か（Tab, Enter, Space, Escape, Arrow keys）
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

最終更新日: 2026-09-06（ランドマーク構造 / Label in Name の節を追加）
