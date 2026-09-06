# パッケージマネージャ運用ポリシー

本プロジェクトのパッケージマネージャは **npm に統一** します。
コミットしてよいロックファイルは `package-lock.json` のみです。

最終更新日: 2026-06-27

## 背景 — 複数ロックファイル混在による Netlify ビルド失敗

2026/06、PR #16（vite-ssg 導入）で Netlify Deploy Preview が
ブランチの全コミットで失敗し続けた。

```
Failed during stage 'Install dependencies':
dependency_installation script returned non-zero exit code: 1
```

### 原因

リポジトリに `package-lock.json` と `pnpm-lock.yaml` が **同時に存在** していた。

- CI（GitHub Actions `feature-ci.yml`）は `npm ci` を使用
- 開発者もローカルでは npm を使用（`package-lock.json` のみ更新）
- `pnpm-lock.yaml` は古いコミット以降メンテナンスされず放置
- **Netlify はロックファイルの存在からパッケージマネージャを自動判定する**ため、
  `pnpm-lock.yaml` を検出して pnpm を選択していた
- Netlify のような CI 環境では pnpm の `--frozen-lockfile` が既定で有効

`package.json` に `vite-ssg` を追加した時点で、stale な `pnpm-lock.yaml` の
specifier と乖離が発生し、install が失敗した。

```
ERR_PNPM_OUTDATED_LOCKFILE
Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date
with package.json
```

### 失敗が「このブランチだけ」だった理由

`pnpm-lock.yaml` は依存を **追加しない限り** package.json と一致し続ける。
main や他ブランチは依存を追加していなかったため成功し、
依存を追加した本ブランチのみが失敗した。
そのため「SSG 実装のバグ」に見えるが、実際は install 段階の設定問題だった。

### 対処

1. `pnpm-lock.yaml` を削除
2. `.gitignore` に `pnpm-lock.yaml` / `yarn.lock` / `bun.lockb` を追加して再発防止

## ルール

- 依存の追加・更新は必ず `npm install` で行い、`package-lock.json` をコミットする
- `pnpm install` / `yarn install` を実行した場合、生成されたロックファイルを
  **絶対にコミットしない**（`.gitignore` 済みだが手動 `-f` add に注意）
- Node バージョンは `.nvmrc` と `netlify.toml` の `NODE_VERSION` を一致させる
  （詳細は [nodejs-version-management.md](./nodejs-version-management.md)）

## 切り分け手順（Netlify の install が失敗したとき）

Netlify のビルドログは Web UI からしか読めないことが多いため、
API でエラー要約だけ取得すると早い。

```bash
# 失敗したデプロイのエラー要約を取得（TOKEN は Netlify CLI の認証情報）
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.netlify.com/api/v1/sites/<SITE_ID>/deploys?per_page=5" \
  | jq -r '.[] | "\(.branch) \(.state) \(.error_message)"'
```

`Install dependencies` で落ちている場合、まずロックファイルの混在を疑う。

```bash
ls package-lock.json pnpm-lock.yaml yarn.lock bun.lockb 2>/dev/null
```

ローカルでの再現（Netlify と同じ frozen-lockfile 挙動）:

```bash
npx pnpm@9 install --frozen-lockfile
```

## 関連ドキュメント

- [デプロイ手順](./deployment-checklist.md)
- [Node.js バージョン管理](./nodejs-version-management.md)
- [ブランチ戦略](./branch.md)
