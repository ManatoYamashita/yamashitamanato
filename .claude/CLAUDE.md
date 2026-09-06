# CLAUDE.md（docs 連携・運用ルール）

本プロジェクトにおける知見・ルールは `docs/` を唯一のソース・オブ・トゥルース（SoT）とします。エージェントや開発者が得た知見は、適切な `docs/` 配下の Markdown に追記、または新規作成します。索引 `docs/index.md` は、ファイルを追加・削除・移動したときと、守備範囲が変わって説明文が実態と合わなくなったときに改訂します。
`docs/` 直下に配置できるファイルは `index.md` のみとし、その他のドキュメントはサブディレクトリに整理します。サブディレクトリは必要最小限に抑え、命名は `kebab-case` で統一してください。

## 基本方針
- ルール/知見は `docs/` に集約。
- 索引 `docs/index.md` の改訂はファイルの増減・移動と守備範囲の変化のときのみ。中身の修正だけなら不要。
- `最終更新日` は `YYYY-MM-DD` の日付のみ。変更内容を書き足さない（履歴は `git log` が持つ）。
- ドキュメントコミットは `DOC:` プレフィックス。
- 機密情報（PII等）は `docs/` に保存しない。

## 運用フロー（PDCA）
1. PLAN: `docs/index.md` で既存配置と命名を確認。
2. DO: 該当 `docs/` ファイルを更新 or 新規作成。必要に応じてカテゴリディレクトリ追加。
3. CHECK: リンク切れ/重複/命名不整合が無いか確認。
4. ACTION: 運用改善点や不足ルールをドキュメント化。

## 命名・配置ガイド
- ファイル名は `kebab-case.md`、目的が明確な名前。
- 1ファイルが 300 行超 or 技術領域が分岐 → 分割/ディレクトリ化。
- 用途とサブディレクトリの対応（代表例）：
  - 規約・ガイドライン → `docs/standards/coding-standards.md`
  - 運用・手順書・CI → `docs/ops/branch.md`
  - 開発環境・移行記録 → `docs/dev/typescript-migration.md`
  - アクセス解析 → `docs/analytics/ga4-setup.md`

## 索引（参照）
- ドキュメントのエンドポイント: `docs/index.md`
- アーキテクチャ: `docs/standards/architecture.md`
- フロントエンド実装: `docs/standards/frontend-guidelines.md`
- デザインシステム: `docs/standards/design-system.md`
- パフォーマンス/ビルド: `docs/standards/performance-and-build.md`
- セキュリティ/アクセシビリティ/SEO: `docs/standards/security-and-seo.md`
- コーディング規約: `docs/standards/coding-standards.md`
- デプロイ手順: `docs/ops/deployment-checklist.md`
- Creatives データ管理: `docs/ops/creatives-guide.md`

最終更新日: 2026-09-06
