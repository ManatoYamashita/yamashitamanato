# Node.js バージョン管理ガイド

## 現在のNode.jsバージョン

- **バージョン**: 22.22.0
- **更新日**: 2026-01-19
- **更新理由**: セキュリティ脆弱性8件の修正

## バージョン管理ファイル

本プロジェクトでは、以下の4つのファイルでNode.jsバージョンを統一管理しています：

### 1. `.nvmrc`
**用途**: ローカル開発環境のNode.jsバージョン指定

```
22.22.0
```

**使用方法**:
```bash
nvm use  # .nvmrcファイルから自動的にバージョンを読み込む
```

### 2. `package.json` (engines)
**用途**: Node.jsとnpmの最低要件を明示

```json
"engines": {
  "node": ">=22.22.0",
  "npm": ">=10.0.0"
}
```

**効果**: `npm install` 実行時に互換性チェックが行われ、バージョン不足時に警告が表示されます。

### 3. `.github/workflows/feature-ci.yml`
**用途**: GitHub Actions CI/CD環境のNode.jsバージョン指定

```yaml
- name: Set up Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '22.22.0'
    cache: 'npm'
```

### 4. `netlify.toml`
**用途**: Netlifyビルド環境のNode.jsバージョン指定

```toml
[build.environment]
  NODE_VERSION = "22.22.0"
```

## Node.jsアップデート手順

### 前提条件
- nvmまたはnodenvがインストール済み
- mainブランチが最新状態
- GitHubとNetlifyへのアクセス権限

### Phase 1: ブランチ作成とファイル更新

```bash
# 1. mainブランチから最新を取得
git checkout main
git pull origin main

# 2. featureブランチを作成
git checkout -b feature/update-nodejs-X-X-X

# 3. 4つのファイルを同時に更新
# - .github/workflows/feature-ci.yml (node-version: 'X.X.X')
# - netlify.toml (NODE_VERSION = "X.X.X")
# - .nvmrc (X.X.X)
# - package.json (engines.node: ">=X.X.X")
```

### Phase 2: ローカル検証（8ステップ）

```bash
# Step 1: Node.jsバージョン切り替え
nvm install X.X.X
nvm use X.X.X
node -v  # vX.X.X を確認

# Step 2: 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install

# Step 3: TypeScript型チェック
npm run typecheck
# 期待結果: Found 0 errors.

# Step 4: Lintチェック
npm run lint:check
# 期待結果: ゼロエラー

# Step 5: Formatチェック
npm run format:check
# 期待結果: すべてのファイルがフォーマット済み

# Step 6: 開発サーバー起動確認
npm run dev
# http://localhost:5173/ でアクセス、動作確認

# Step 7: プロダクションビルド
npm run build
# dist/ ディレクトリ生成、ビルドサイズ確認

# Step 8: プレビュー確認
npm run preview
# http://localhost:4173/ でアクセス、動作確認
```

### Phase 3: Netlify Functions検証（該当する場合）

```bash
# Netlify Dev環境テスト
npm run dev:netlify

# APIエンドポイントテスト
curl -X GET "http://localhost:8888/.netlify/functions/microcms-proxy?endpoint=categories"
```

**検証ポイント**:
- `fetch` API正常動作（Node.js 18.x+で標準サポート）
- `process.env`から環境変数が正しく読み込まれる
- CORSヘッダー正しく設定

### Phase 4: コミット & Push

```bash
git add .
git commit -m "FIX: Node.js X.X.Xにアップデートしてセキュリティ脆弱性N件を修正" -m "
- CVE-XXXX-XXXXX: 脆弱性の説明（深刻度）
- その他の脆弱性リスト

更新ファイル:
- .github/workflows/feature-ci.yml (node-version: X.X.X)
- netlify.toml (NODE_VERSION = X.X.X)
- .nvmrc (新規作成または更新: X.X.X)
- package.json (enginesフィールド追加/更新: node >=X.X.X)

検証済み:
- TypeScript型チェック（ゼロエラー）
- ESLint/Prettierチェック（ゼロエラー）
- ビルド成功（開発/プロダクション両環境）
- Netlify Functions動作確認（該当する場合）

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
"
git push origin feature/update-nodejs-X-X-X
```

### Phase 5: CI/CD検証

GitHub Actionsが自動実行されるので、以下を確認：
```bash
# ワークフロー実行状態の確認
gh run list --branch feature/update-nodejs-X-X-X --limit 1

# 詳細ログの確認（失敗時）
gh run view <RUN_ID> --log-failed
```

### Phase 6: PR作成とNetlify Deploy Preview検証

```bash
# PRを手動作成（GitHub Actions権限不足時）
gh pr create --title "🚀 Node.js X.X.X セキュリティアップデート" \
  --body "..." --base main --head feature/update-nodejs-X-X-X
```

**Netlify Deploy Preview確認項目**:
- [ ] NetlifyビルドログでNode.js X.X.Xが使用されている
- [ ] ビルド成功（エラーなし）
- [ ] Deploy Preview URLでサイト正常表示
- [ ] Netlify Functions正常動作（該当する場合）

### Phase 7: PRマージ

GitHub UIでPRを確認し、"Merge pull request"をクリック

## 検証項目チェックリスト

### ローカル環境
- [ ] Node.jsバージョン切り替え成功（`node -v`）
- [ ] 依存関係インストール成功（`npm install`）
- [ ] TypeScript型チェック（`npm run typecheck`）
- [ ] Lintチェック（`npm run lint:check`）
- [ ] Formatチェック（`npm run format:check`）
- [ ] 開発サーバー起動確認（`npm run dev`）
- [ ] プロダクションビルド確認（`npm run build`）
- [ ] プレビュー確認（`npm run preview`）

### Netlify Functions（該当する場合）
- [ ] Netlify Dev環境起動成功
- [ ] APIエンドポイント正常レスポンス
- [ ] fetch API正常動作
- [ ] 環境変数読み込み確認

### CI/CD
- [ ] GitHub Actions実行成功
- [ ] ESLintチェック成功
- [ ] Prettierチェック成功
- [ ] ビルド成功

### Netlify Deploy Preview
- [ ] ビルドログでNode.jsバージョン確認
- [ ] ビルド成功
- [ ] サイト正常表示
- [ ] Netlify Functions正常動作（該当する場合）

### 本番環境（PRマージ後）
- [ ] 本番サイト正常動作
- [ ] セキュリティスキャン（`npm audit`）でゼロ脆弱性確認

## トラブルシューティング

### 互換性問題が発生した場合

#### ロールバック手順（ローカル環境）
```bash
nvm use 22.13.1  # 前のバージョンに戻す
rm -rf node_modules package-lock.json
npm install
```

#### ロールバック手順（GitHub Actions）
```bash
git checkout main -- .github/workflows/feature-ci.yml
git commit -m "REVERT: Node.js 22.13.1に戻す（緊急ロールバック）"
git push origin feature/update-nodejs-X-X-X
```

#### ロールバック手順（Netlify）
```bash
git checkout main -- netlify.toml
git commit -m "REVERT: Netlify Node.js 22.13.1に戻す（緊急ロールバック）"
git push origin feature/update-nodejs-X-X-X
```

#### 完全ロールバック
```bash
git checkout main
git branch -D feature/update-nodejs-X-X-X
git push origin --delete feature/update-nodejs-X-X-X
```

### Netlify Functionsの問題

#### fetch APIの動作確認
Node.js 18.x以降では`fetch` APIが標準サポートされていますが、問題が発生した場合：

```bash
# Netlify Functionsのビルドログを確認
netlify functions:list
netlify functions:serve  # ローカルテスト
```

#### process.envの読み込み確認
```javascript
// netlify/functions/your-function.ts
console.log('Environment variables:', {
  API_ENDPOINT: process.env.API_ENDPOINT ? 'Set' : 'Missing',
  API_KEY: process.env.API_KEY ? 'Set' : 'Missing',
});
```

#### esbuild bundlerのログ確認
Netlifyダッシュボード → Functions → Deploy log でesbuildのエラーメッセージを確認

### Netlifyビルド環境のキャッシュ問題

`NODE_VERSION`変更後は自動的に新しい環境を構築しますが、問題が発生した場合：

```
Netlifyダッシュボード → Site settings → Build & deploy → Build settings
→ "Clear cache and deploy site" をクリック
```

### GitHub Actionsのキャッシュ問題

通常、`setup-node@v3`はバージョン別にキャッシュを管理しますが、問題が発生した場合：

```
GitHub → Settings → Actions → Caches
→ 該当するキャッシュを削除
```

## セキュリティアップデートのベストプラクティス

### 定期的な確認
- Node.jsセキュリティアドバイザリを月次で確認: https://nodejs.org/en/blog/vulnerability/
- `npm audit`を定期実行してパッケージの脆弱性をチェック

### アップデート優先度
- **深刻度 高**: 即座にアップデート（緊急リリース）
- **深刻度 中**: 1週間以内にアップデート
- **深刻度 低**: 次回定期リリース時にアップデート

### 影響範囲の把握
- サーバーサイド処理（Netlify Functions）への影響を優先確認
- フロントエンドビルドプロセスへの影響を二次確認
- 依存パッケージの互換性を三次確認

## 関連リソース

- **Node.jsセキュリティアドバイザリ**: https://nodejs.org/en/blog/vulnerability/
- **Node.jsリリーススケジュール**: https://github.com/nodejs/release#release-schedule
- **Netlifyドキュメント**: https://docs.netlify.com/configure-builds/manage-dependencies/
- **GitHub Actions setup-node**: https://github.com/actions/setup-node

## 更新履歴

- 2026-01-19: 初版作成（Node.js 22.22.0アップデート時に作成）
