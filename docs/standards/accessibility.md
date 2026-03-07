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

## 開発時のチェックリスト

### 新規コンポーネント作成時

- [ ] インタラクティブ要素に適切な `aria-label` または可視テキストがあるか
- [ ] キーボードのみで操作可能か（Tab, Enter, Space, Escape, Arrow keys）
- [ ] `:focus-visible` スタイルが適用されるか（グローバルスタイルでカバー）
- [ ] 装飾的な画像には `aria-hidden="true"` または空 `alt=""` を設定
- [ ] 意味のある画像には説明的な `alt` テキストを設定
- [ ] 画像に `width`/`height` 属性を設定（CLS防止）

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

最終更新日: 2026-03-07
