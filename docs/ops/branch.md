# Branch Strategy & CI/CD Workflow

本プロジェクトのブランチ運用戦略とGitHub Actionsによる自動化ワークフローを定義します。

## ブランチ戦略

### 基本方針

- **main ブランチへの直接 push は禁止**
- すべての作業は専用のフィーチャーブランチで実施
- GitHub Actions による自動 PR 作成を活用
- PR マージ後に main ブランチを更新

### ブランチ命名規則

#### Feature ブランチ

```
feature/<feature-name>
```

**例:**
- `feature/add-gtm` - Google Tag Manager 追加
- `feature/quality-tools` - ESLint + Prettier 導入
- `feature/seo-optimization` - SEO 最適化

**命名ルール:**
- すべて小文字
- 複数単語はハイフン区切り（kebab-case）
- 簡潔で目的が明確な名前
- 英語推奨（日本語ローマ字可）

#### その他のブランチ（必要に応じて）

```
bugfix/<bug-description>    # バグ修正
hotfix/<urgent-fix>          # 緊急修正
docs/<doc-update>            # ドキュメント更新のみ
refactor/<refactor-target>   # リファクタリング
```

### ブランチのライフサイクル

1. **作成**: main から最新の状態で派生
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```

2. **作業**: コミットを積み重ねる
   ```bash
   git add .
   git commit -m "PREFIX: Commit message"
   git push origin feature/your-feature
   ```

3. **PR 作成**: GitHub Actions が自動実行（後述）

4. **レビュー & マージ**: PR を確認後、main へマージ

5. **削除**: マージ後は不要なブランチを削除
   ```bash
   git branch -d feature/your-feature
   git push origin --delete feature/your-feature
   ```

## GitHub Actions ワークフロー

### Feature Branch CI/CD

**ファイル:** `.github/workflows/feature-ci.yml`

**トリガー条件:**
```yaml
on:
  push:
    branches:
      - 'feature/**'
```

**ワークフロー概要:**

#### 1. Quality Check Job

feature ブランチへの push 時に自動実行される品質チェック：

- **ESLint チェック**
  ```bash
  npm run lint:check
  ```
  - Vue.js コンポーネント検証
  - JavaScript コード規約検証
  - 未使用変数・コンポーネント検出

- **Prettier フォーマットチェック**
  ```bash
  npm run format:check
  ```
  - コードフォーマット規約準拠確認
  - インデント、改行、引用符などの統一性検証

- **ビルドチェック**
  ```bash
  npm run build
  ```
  - Vite ビルド成功確認
  - dist/ ディレクトリ生成検証
  - ビルドサイズ計測

#### 2. Create Pull Request Job

品質チェック成功時に自動実行される PR 作成：

**実行条件:**
```yaml
needs: quality-check
if: success()
```

**PR 作成内容:**
- **タイトル:** `🚀 [<feature-name>] Auto-generated PR`
- **本文:**
  - 品質チェック結果サマリー
  - 最近のコミットリスト（最大10件）
  - CI/CD 実行情報
- **ベースブランチ:** main
- **ヘッドブランチ:** feature/<feature-name>

**重複 PR 防止:**
- 既存 PR の存在確認
- 同一ブランチの PR が存在する場合はスキップ

### 必要な Repository 設定

GitHub Actions が PR を作成するには、以下の設定が必要：

1. リポジトリ設定ページへアクセス:
   ```
   https://github.com/<owner>/<repo>/settings/actions
   ```

2. 「Workflow permissions」セクションで以下を有効化:
   - [x] **Allow GitHub Actions to create and approve pull requests**

3. Permissions 設定（既に設定済み）:
   ```yaml
   permissions:
     contents: write
     pull-requests: write
   ```

### ワークフロー実行環境

- **OS:** ubuntu-latest
- **Node.js:** 22.13.1
- **パッケージマネージャー:** npm
- **キャッシュ戦略:** npm キャッシュ利用

## Commit Message 規約

### 基本フォーマット

```
<PREFIX>: <commit message>
```

**重要:** PREFIX の後には必ずコロンとスペースを入れる

### PREFIX 一覧

| PREFIX | 用途 | 例 |
|--------|------|-----|
| `FEATURE` | 新機能追加 | `FEATURE: Google Tag Managerの設定を追加` |
| `FIX` | バグ修正 | `FIX: ロゴ画像の読み込みエラーを修正` |
| `REFACTOR` | リファクタリング | `REFACTOR: MetaBall コンポーネントの最適化` |
| `STYLE` | スタイル変更（CSS/UI） | `STYLE: モバイル表示のメニュー位置を調整` |
| `DOC` | ドキュメント更新 | `DOC: README に SEO 設定を追記` |
| `TEST` | テスト追加・修正 | `TEST: ESLint 設定のテストを追加` |
| `CHORE` | ビルド・設定変更 | `CHORE: Vite の設定を更新` |
| `PERF` | パフォーマンス改善 | `PERF: 画像の遅延読み込みを実装` |
| `CI` | CI/CD 設定変更 | `CI: GitHub Actions のワークフローを追加` |
| `SEO` | SEO 対策 | `SEO: sitemap.xml に hreflang を追加` |

### 英語コミットメッセージ（推奨）

プロジェクトの国際性を考慮し、英語でのコミットメッセージも推奨：

```
FEATURE: Add Google Tag Manager integration
FIX: Resolve logo image loading error
STYLE: Adjust mobile menu positioning
DOC: Update README with SEO configuration
```

### コミットメッセージのベストプラクティス

1. **簡潔で明確に**: 50文字以内が理想
2. **動詞から始める**: 「追加」「修正」「更新」など
3. **現在形を使用**: 「追加した」ではなく「追加」
4. **具体的に**: 「バグ修正」ではなく「ロゴ読み込みエラーを修正」
5. **1コミット1機能**: 複数の変更は分割する

**良い例:**
```
FEATURE: Google Tag Managerの設定を追加
SEO: sitemap.xml に Contact ページを追加
STYLE: デスクトップナビゲーションのロゴサイズを調整
```

**悪い例:**
```
update  # PREFIX なし、内容不明
FIX:バグ修正  # スペースなし、具体性なし
いろいろ変更  # PREFIX なし、曖昧
```

### マルチライン コミットメッセージ

複雑な変更の場合、本文を追加可能：

```bash
git commit -m "FEATURE: 品質ツール導入" -m "
- ESLint 9.x with Flat Config
- Prettier with Vue.js support
- GitHub Actions CI/CD workflow
"
```

## 運用フロー例

### 典型的な開発フロー

1. **新機能開発の開始**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/new-animation
   ```

2. **実装とコミット**
   ```bash
   # ファイル編集...
   git add .
   git commit -m "FEATURE: 新しいアニメーション効果を追加"
   git push origin feature/new-animation
   ```

3. **GitHub Actions 自動実行**
   - Lint チェック実行
   - Format チェック実行
   - Build チェック実行
   - 成功時に自動 PR 作成

4. **PR レビュー & マージ**
   - GitHub UI で PR を確認
   - 必要に応じてコードレビュー
   - Merge pull request ボタンをクリック

5. **ローカル更新**
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/new-animation
   ```

### 緊急修正（Hotfix）フロー

本番環境の緊急バグ修正時：

1. **Hotfix ブランチ作成**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug
   ```

2. **修正とテスト**
   ```bash
   # バグ修正...
   git add .
   git commit -m "FIX: 本番環境でのクリティカルなバグを緊急修正"
   git push origin hotfix/critical-bug
   ```

3. **手動 PR 作成（緊急時）**
   ```bash
   gh pr create --base main --head hotfix/critical-bug \
     --title "🚨 [HOTFIX] Critical bug fix" \
     --body "緊急修正: 本番環境でのクリティカルなバグ"
   ```

4. **即座にマージ & デプロイ**

## トラブルシューティング

### PR が自動作成されない

**原因 1:** Repository 設定で GitHub Actions の PR 作成が許可されていない

**解決策:**
```
Settings > Actions > General > Workflow permissions
→ "Allow GitHub Actions to create and approve pull requests" を有効化
```

**原因 2:** 既に同じブランチの PR が存在する

**解決策:**
- GitHub UI で既存 PR を確認
- 必要に応じて既存 PR を使用

**原因 3:** 品質チェックが失敗している

**解決策:**
```bash
# ローカルで品質チェック実行
npm run lint:check
npm run format:check
npm run build

# エラーを修正後、再度 push
git add .
git commit -m "FIX: Lint エラーを修正"
git push origin feature/your-feature
```

### ブランチ名の競合

**エラー例:**
```
'refs/heads/feature' exists; cannot create 'refs/heads/feature/add-gtm'
```

**原因:** Git のブランチ名前空間の競合（`feature` と `feature/xxx` は共存不可）

**解決策:**
```bash
# リモートの競合ブランチを削除
git push origin --delete feature

# または、ローカルブランチ名を変更
git branch -m feature/add-gtm feature-add-gtm
git push origin feature-add-gtm
```

## 関連ドキュメント

- **デプロイチェックリスト:** `docs/ops/deployment-checklist.md`
- **コーディング規約:** `docs/standards/coding-standards.md`
- **ESLint 設定:** `eslint.config.js`
- **Prettier 設定:** `.prettierrc`
- **GitHub Actions ワークフロー:** `.github/workflows/feature-ci.yml`

## セキュリティアップデートのコミット規約

### セキュリティ修正のPREFIX

Node.jsや依存関係のセキュリティアップデートには `FIX` プレフィックスを使用します：

```
FIX: Node.js 22.22.0にアップデートしてセキュリティ脆弱性8件を修正
```

### コミットメッセージの詳細例

```bash
git commit -m "FIX: Node.js 22.22.0にアップデートしてセキュリティ脆弱性8件を修正" -m "
- CVE-2025-55131: Buffer/Uint8Array 非ゼロクリア（高）
- CVE-2025-55130: ファイルシステム権限回避（高）
- CVE-2025-59465: HTTP/2 マルフォームドヘッダー（高）
- その他5件の中度・低度の脆弱性を修正

更新ファイル:
- .github/workflows/feature-ci.yml (node-version: 22.22.0)
- netlify.toml (NODE_VERSION = 22.22.0)
- .nvmrc (新規作成: 22.22.0)
- package.json (enginesフィールド追加: node >=22.22.0)

検証済み:
- TypeScript型チェック（ゼロエラー）
- ESLint/Prettierチェック（ゼロエラー）
- ビルド成功（開発/プロダクション両環境）
- Netlify Functions動作確認（該当する場合）

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
"
```

### セキュリティアップデートの特徴

- **詳細な脆弱性リスト**: CVE番号と深刻度を明記
- **更新ファイルの網羅**: すべての関連ファイルをリスト化
- **検証結果の記録**: 実施した検証項目を明記
- **Co-Authored-By**: Claude Codeによる支援を明示

### 関連ドキュメント

セキュリティアップデートの詳細な手順は `docs/ops/nodejs-version-management.md` を参照してください。

## 更新履歴

- 2026-01-19: セキュリティアップデートのコミット規約を追加
- 2026-11-24: 初版作成（feature/quality-tools ブランチでの運用実績を反映）
