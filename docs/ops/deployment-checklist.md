# デプロイメント チェックリスト

## 開発環境とプロダクション環境の統一性確保

### 🔍 事前チェック項目

#### 1. **CSS読み込み統一性**
- [ ] `src/main.js`のloadMainCSS関数で環境分岐が正しく動作する
- [ ] 開発環境: `/src/assets/main.css` の動的読み込み
- [ ] プロダクション環境: 静的インポートによる確実な読み込み
- [ ] フォールバック機能が適切に設定されている

#### 2. **Console ログ設定**
- [ ] 重要なエラーログ（console.error）はプロダクションでも残る
- [ ] デバッグログ（console.debug, console.trace）は削除される
- [ ] MetaBall関連の初期化ログが適切に出力される

#### 3. **Three.js モジュール統一性**
- [ ] MarchingCubes の動的インポートにエラーハンドリング実装済み
- [ ] OrbitControls の条件付き読み込みが環境に関わらず安定動作
- [ ] 環境変数（DEV/PROD）に基づく適切なログ出力

#### 4. **ビルド設定確認**
- [ ] `vite.config.js` の terserOptions が適切に設定されている
- [ ] chunk分割設定（vendor, vendor_three, etc）が正しく動作
- [ ] sourcemap生成が有効になっている

### 🧪 テスト実行

#### 両環境での動作確認
```bash
# 開発環境
npm run dev
# http://localhost:5173/ でアクセス

# プロダクション環境
npm run build
npm run preview
# http://localhost:4173/ でアクセス
```

#### 必須チェック項目
- [ ] MetaBallアニメーションが両環境で正常動作
- [ ] ウィンドウリサイズ時の球形保持が正常動作
- [ ] CSS スタイルが両環境で同等に適用される
- [ ] コンソールログで初期化プロセスが確認できる
- [ ] エラーが発生していない

### 🚀 デプロイメント実行

#### Netlify による自動デプロイ
- [ ] mainブランチへのプッシュが完了
- [ ] Netlify の Deploys 画面でビルドが `Published` になっている

> FTP デプロイ（`.github/workflows/deploy.yml`）は `895f3d0` で削除済み。現在の GitHub Actions は
> `feature-ci.yml`（lint / format / build の品質チェックと feature ブランチの自動PR作成）だけで、
> main へのプッシュでは走らない。本番デプロイは Netlify の Git 連携ビルドが担う。

#### 本番反映の確認（必須）

**マージ成功・CI緑・本番反映は、三つとも独立した事象である。**
GitHub 側の情報だけで本番反映を判断してはならない。

- [ ] Netlify ダッシュボードの **Published SHA** が、マージしたコミットに追いついている
      （<https://app.netlify.com/projects/yamashitamanato/deploys> の「Published main@xxxxxxx」）
- [ ] 本番HTMLに今回の変更のマーカーが現れている

```bash
# 例: Issue #38 の修正（0件カテゴリの空状態）が本番へ出たかの確認
curl -sSL https://www.yamashitamana.to/creatives -o /tmp/prod.html
grep -o 'section-empty' /tmp/prod.html | wc -l   # 1 なら反映済み
grep -o 'skeleton-card' /tmp/prod.html | wc -l   # 0 なら反映済み
```

**`gh api repos/.../commits/<sha>/status` では本番を追えない。**
Netlify の Deploy notifications は GitHub commit status を出せるが、
イベントの選択肢が Deploy Preview 系（`deploy_building` / `deploy_created` /
`deploy_failed`）と Deploy request 系しかなく、**本番デプロイのイベントが存在しない**。
実際、本番へ公開成功したコミットでも `statuses` は 0 件だった（2026-09-06 実測）。

#### 本番環境での最終確認
- [ ] デプロイされたサイトでMetaBallが正常動作
- [ ] 全ページでレイアウトが正しく表示される
- [ ] 両言語（日本語・英語）での動作確認
- [ ] レスポンシブデザインの動作確認

#### Netlify のプラン上限による本番デプロイ停止

Free プランは **月 300 クレジット**。使い切ると Netlify は
**公開中のサイトを生かしたまま、本番デプロイだけを停止**する。
このとき本番デプロイは `Skipped` になり、ビルド失敗とは区別される。

**Deploy Preview は Free プランでも無制限**のため、
**PR のチェックは全部緑のまま本番だけが止まる**。この非対称性が原因で、
2026-09-06 には本番が **7マージ分**遅れていることに長時間気づけなかった。

- 兆候: チーム画面の赤帯「running on operational credits」、
  デプロイ一覧の `Production: main@xxxxxxx` `Skipped`
- 確認先: <https://app.netlify.com/teams/yamashitamanato/billing/general>
  （Credits available と請求期間）
- 復旧: 次の請求サイクルまで待つ、またはプランのアップグレード
- 回避: マージが集中する時期は事前に残クレジットを確認する

### 🔧 トラブルシューティング

#### CSS読み込み問題
```javascript
// プロダクション環境でCSS読み込み失敗時のフォールバック
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.fontFamily = 'system-ui, sans-serif';
```

#### Three.jsモジュール読み込み問題
```javascript
// MarchingCubes読み込み失敗時
console.error('MetaBall: Failed to load MarchingCubes:', error);
throw new Error('MetaBall initialization failed: MarchingCubes module unavailable');
```

### 📋 今回の修正内容（v2.0.0）

1. **CSS動的読み込みの環境対応**
   - `import.meta.env.DEV/PROD` による条件分岐実装
   - プロダクション環境での静的インポート採用

2. **Console ログ設定改善**
   - `drop_console: false` に変更
   - 重要ログの保持、詳細ログのみ削除

3. **Three.js初期化の環境統一**
   - エラーハンドリング強化
   - 環境情報を含むログ出力

4. **テスト環境整備**
   - 開発・プロダクション両環境での並行テスト実行可能

### 📊 パフォーマンス指標

#### ビルド結果目標値
- [ ] Total JS bundle size < 800KB (gzipped)
- [ ] CSS bundle size < 20KB (gzipped)  
- [ ] Three.js chunk < 120KB (gzipped)
- [ ] 初期描画時間 < 2秒

---

## 開発者向け追加情報

### 環境変数確認コマンド
```javascript
console.log('Environment:', import.meta.env.MODE);
console.log('DEV:', import.meta.env.DEV);
console.log('PROD:', import.meta.env.PROD);
```

### デバッグ時の有用なブラウザ設定
- デベロッパーツールでソースマップを有効化
- ネットワークタブでチャンク読み込み順序を確認
- コンソールで初期化ログを監視

---

## セキュリティチェック

### Node.jsバージョン確認
- [ ] 最新のセキュリティパッチが適用されているか確認
- [ ] .nvmrc, package.json, .github/workflows/feature-ci.yml, netlify.toml が統一されているか
- [ ] Node.jsセキュリティアドバイザリを確認: https://nodejs.org/en/blog/vulnerability/

### 依存関係の脆弱性スキャン
```bash
npm audit
# 期待結果: 0 vulnerabilities
```

**高リスク脆弱性が検出された場合**:
1. `npm audit fix` で自動修正可能か確認
2. Breaking changesが必要な場合は `npm audit fix --force` を慎重に実行
3. 修正後、必ずビルドとテストを実行
4. `docs/ops/nodejs-version-management.md` を参照してNode.jsアップデートを検討

### セキュリティヘッダー確認
- [ ] Netlify環境でセキュリティヘッダーが適切に設定されている
- [ ] CORS設定が適切（Netlify Functions使用時）
- [ ] 環境変数が正しく設定され、クライアントに露出していない

---

## Netlify CLI ローカルデプロイ

### サイト情報
| 項目 | 値 |
|---|---|
| サイト名 | `yamashitamanato` |
| サイトID | `728803e2-8b38-4852-a604-0946f2488645` |
| Admin URL | https://app.netlify.com/projects/yamashitamanato |
| サイトURL | https://www.yamashitamana.to |
| アカウントslug | `yamashitamanato` |
| チーム名 | yamashitamana.to |

### 認証

```bash
# ログイン状態の確認
npx netlify status

# 未認証の場合（ブラウザでOAuth認証）
npx netlify login

# API Key認証（ブラウザが使えない場合）
export NETLIFY_AUTH_TOKEN=your_token_here
# トークン生成: https://app.netlify.com/user/applications#personal-access-tokens
```

### サイトリンク

```bash
# 既存サイトにリンク
npx netlify link --name yamashitamanato

# リンク解除
npx netlify unlink

# リンク状態確認
npx netlify status
```

### デプロイ手順

```bash
# 1. プレビューデプロイ（テスト用、一意のURLが発行される）
npx netlify deploy

# 2. 本番デプロイ（www.yamashitamana.to に反映）
npx netlify deploy --prod
```

### netlify.toml 設定概要
- ビルドコマンド: `npm run build`
- 公開ディレクトリ: `dist`
- Node.js: `22.22.0`
- SPAフォールバック: `/creatives/* → /index.html (200)`（ビルド後に microCMS へ追加された作品向け。プリレンダ済みの作品は静的ファイルが優先される）
- 未定義パス: `/* → /404.html (404)`（以前は全パスが index.html を 200 で返し、任意のURLでホームの複製が配信されていた。Issue #8）
- リダイレクト: `manapuraza.com` → `www.yamashitamana.to` (301)

### LobeHub Skills（エージェント用）
Netlifyデプロイスキルが `.agents/skills/openai-skills-netlify-deploy/` にインストール済み。
エージェントからのデプロイ自動化に使用可能。

### トラブルシューティング

**対話式コマンドがエージェント環境で動かない場合:**
- `npx netlify sites:create` → `--account-slug yamashitamanato` フラグを付与
- `npx netlify api listAccountsForUser` でアカウントslugを確認可能

**ネットワークエラーでデプロイ失敗:**
- サンドボックス環境の場合、`sandbox_permissions=require_escalated` で再実行
