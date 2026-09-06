# セキュリティ・アクセシビリティ・SEO

## セキュリティ
- 依存は定期的に minor/patch を更新し、重大脆弱性は優先修正。
- 本番では CSP を推奨（`default-src 'self'` を基本に最小許可）。
- 不要スクリプトを削減し、遅延読み込みで攻撃面を縮小。

## アクセシビリティ
- 画像には必ず `alt`。ナビゲーション要素に適切な `aria-*`。
- コントラストと可読性を確保し、フォーカス可視性を維持。
- i18n と組み合わせてテキストを直書きせず、`locales/` を経由する。

## SEO
- `index.html` に SEO メタ、OG/Twitter カード、JSON-LD を配置。
- `public/robots.txt` と `public/sitemap.xml` を提供。

## アナリティクス
- Google Analytics などはユーザー操作後やアイドル時に超遅延ロード。
- 送信はビーコン/匿名化/最小設定とし、同意フローを尊重。

## ローカライゼーションと SEO
- ルーティングは単一ロケール（`ja` 既定、`en` はクライアント追加）。多言語 URL は現状なしのため `hreflang` は不要。
- **`hreflang` は宣言しない**（Issue #7）。日本語と英語は同一URLで、クライアント側の `vue-i18n` が
  切り替える。言語ごとの代替URLが存在しないため、宣言すると `ja` / `en` / `x-default` の3つすべてが
  同一URLを指し、Search Console の国際化ターゲティングで警告になる。
  - 出力しない箇所: `index.html` の `<link rel="alternate" hreflang>`（テンプレートなので全プリレンダページへ波及する）、
    `scripts/generate-sitemap.ts` の `xhtml:link`（および `xmlns:xhtml` 名前空間）
  - 言語シグナルは `<html lang>` と `og:locale` / `og:locale:alternate` が担う
  - 将来 `/ja/` `/en/` でURLを分離する場合は、canonical・sitemap・内部リンク・SSGルート列挙を
    同時に更新したうえで再導入する
- `index.html` へコメントを書くときは、それが**生成される全ページのHTMLへ焼き込まれる**ことに注意する。
  判断の根拠は本ドキュメントなど、配信物に載らない場所へ置く。***
