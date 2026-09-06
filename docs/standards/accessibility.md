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
| `CreativesHero.vue` | フィルターボタンに `role="toolbar"`, `aria-label`, `aria-pressed` |
| `MetaBall.vue` | canvas に `aria-hidden="true"` |
| `Sns.vue` | 外部リンクに `target="_blank"`, `rel="noopener noreferrer"`, aria-labelに「新しいタブで開きます」追記 |
| `LanguageDropdown.vue` | WAI-ARIA Menu Buttonパターン: `role="menu"`, `role="menuitem"`, ArrowUp/Down/Escape/Home/End キーボード操作 |
| `App.vue` | ホームページに `<h1 class="sr-only">` 追加 |
| `Btn.vue` | ツールチップに `id` + ボタンに `aria-describedby` 接続 |
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

## 開発時のチェックリスト

### 新規コンポーネント作成時

- [ ] インタラクティブ要素に適切な `aria-label` または可視テキストがあるか
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
- [ ] `aria-label` に「新しいタブで開きます」を追記

### フォーム・ボタン

- [ ] ボタンに `aria-label` または可視テキスト
- [ ] トグルボタンに `aria-pressed` または `aria-expanded`
- [ ] ドロップダウン/メニューに `role="menu"` + `role="menuitem"`

### 見出し階層

- [ ] 各ページに `<h1>` が1つ存在
- [ ] 見出しレベルが順番通り（h1 → h2 → h3、レベルスキップなし）

## i18nキー（アクセシビリティ関連）

```
common.opensInNewTab     — 外部リンクの補足テキスト
home.title               — ホームページのh1テキスト
creatives.filters.*      — カテゴリフィルターのaria-label
creatives.dcChanAlt      — DC-chan画像のaltテキスト
navbar.selectLanguage    — 言語切替のaria-label
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

最終更新日: 2026-09-06（ランドマーク構造の節を追加）
