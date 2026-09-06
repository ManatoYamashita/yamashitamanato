# ドキュメント索引と運用ルール

## 運用原則
- `docs/` は知見とルールの唯一のソース・オブ・トゥルースです。
- 直下に置けるファイルは本索引 `docs/index.md` のみ。他のドキュメントは必ずサブディレクトリに配置します。
- サブディレクトリは必要最小限に留め、命名は `kebab-case` に統一します。
- 追加・更新時は本索引を必ず更新し、重複やリンク切れをチェックします。
- 機密情報（PII 等）は保存禁止。コミット時は `DOC:` プレフィックスを推奨します。

## ディレクトリ構成（最小セット）
- `standards/`: コーディング規約・設計/実装ガイドラインなど共通ルール。
- `ops/`: 運用・手順書やチェックリスト。
- `analytics/`: アクセス解析・トラッキング設定ガイド。
- `dev/`: 開発環境構築と移行記録。

## ドキュメント一覧

### TypeScript移行
- dev/typescript-migration.md — TypeScript完全移行の全工程記録（Phase 1-4、Strictモード有効化、型エラーゼロ達成）。
- standards/typescript-coding-standards.md — TypeScript Strictモードのコーディング規約（型定義、null安全、best practices）。

### Standards（コーディング規約・ガイドライン）
- standards/architecture.md — エントリ/初期化/責務分離とフォールバック方針。
- standards/frontend-guidelines.md — Vue SFC規約、ルーティング、i18n、新規ページ追加の手順。
- standards/design-system.md — カラー/フォント/背景/モーション/コンポーネントなどのデザインシステム全体。
- standards/performance-and-build.md — 遅延/分割、アセット方針、Three.js、ビルド設定。
- standards/security-and-seo.md — セキュリティ、アクセシビリティ、SEO/アナリティクス。
- standards/accessibility.md — WCAG 2.1 AA準拠ガイドライン（ランドマーク構造とビューのルート要素ルール、Label in Name（可視テキストとアクセシブル名の一致）、focus-visible、reduced-motion、ARIA、キーボード操作）。
- standards/ssg-guidelines.md — vite-ssg プリレンダの実装ガイドライン（head既定値の上書き、onMounted依存の初期値、SSRガード、動的ルートの列挙とビルド時データ取得、`__INITIAL_STATE__` の受け渡し、縮退判定の集約とビルドゲート、APIキー非混入の検証、生成HTMLの検証手順）。
- standards/coding-standards.md — コーディングスタイルとレビュー/コミットの基本。

### Ops（運用・手順書）
- ops/microcms-setup.md — microCMS初期セットアップガイド（アカウント作成、API設定、環境変数の命名規約と`VITE_`禁止理由、初期データ登録）。
- ops/creatives-guide.md — microCMSでのポートフォリオ作品管理手順（categories/creatives API、データフロー、詳細ページルーティング `/creatives/:category/:id`）。
- ops/deployment-checklist.md — デプロイ前後の確認項目とトラブルシュート。Netlify CLIローカルデプロイ手順を含む。
- ops/branch.md — ブランチ戦略、GitHub Actions CI/CD、コミットメッセージ規約。
- ops/nodejs-version-management.md — Node.js バージョン管理ガイド（アップデート手順、セキュリティパッチ適用、トラブルシューティング）。
- ops/package-manager-policy.md — パッケージマネージャ運用ポリシー（npm統一、ロックファイル混在によるNetlify install失敗の原因と切り分け手順）。

### Dev（開発環境）
- dev/devcontainer-setup.md — Devcontainer 環境構築ガイド（VS Code + Docker、Node.js 22.13.1、Vue 3 + Vite 対応）。
- dev/docker-performance.md — Docker パフォーマンス最適化（Named Volume による高速化、CHOKIDAR_USEPOLLING 設定）。

### Analytics（アクセス解析）
- analytics/ga4-setup.md — Google Analytics 4 (GA4) の完全セットアップガイド（GTM経由、サブドメイン対応）。
- analytics/ga4-vue-integration.md — Vue.js 3 × GA4 統合実装ガイド（Composable、イベント送信パターン）。

## 更新手順（PDCA）
1. PLAN: 既存の配置と命名を本索引で確認し、追加箇所を決める。
2. DO: 対応するサブディレクトリに Markdown を作成・更新し、本索引へ追記。
3. CHECK: リンク・命名・重複・文責の整合を確認。
4. ACTION: 改善点を洗い出し、必要ならルールやテンプレートを強化する。

---

最終更新日: 2026-09-06（規約類を standards/ へ集約し、索引のリンク切れを解消。frontend-guidelines にルーティング詳細・i18n 初期化設定・新規ページ追加チェックを統合。アクセシビリティガイドラインに Label in Name の節を追加。branch.md の CI トリガー記述を実態へ同期）
