# 開発環境セットアップガイド

このドキュメントでは、「頭の棚卸しノート」プロジェクトの開発環境構築手順を説明します。

## 前提条件

### 必須

| ソフトウェア | バージョン | 用途 |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop) | 最新 | PostgreSQL |
| [mise](https://mise.jdx.dev) | 最新 | ランタイム管理（推奨） |

### Windows の場合

**WSL2 が必須です。** 以下の手順でセットアップしてください：

1. PowerShell (管理者) で WSL2 を有効化:
   ```powershell
   wsl --install
   ```
2. Ubuntu をインストール（Microsoft Store から）
3. Docker Desktop で「Use the WSL 2 based engine」を有効化
4. WSL2 内でプロジェクトをクローン

以降の作業は全て **WSL2 内の Linux 環境** で行います。

### mise のインストール

```bash
# Linux / macOS / WSL2
curl https://mise.run | sh

# シェルに統合（bashの場合）
echo 'eval "$(mise activate bash)"' >> ~/.bashrc
source ~/.bashrc

# zsh の場合
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc
```

## クイックスタート

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd sotuken

# 2. セットアップスクリプトを実行
./scripts/setup.sh
```

これで以下が自動的に行われます：
- Bun / Node.js のインストール（mise経由）
- 環境変数ファイルの作成
- npm パッケージのインストール
- PostgreSQL の起動
- データベースマイグレーション
- Git hooks の設定

## 手動セットアップ

自動セットアップがうまくいかない場合は、以下の手順を手動で実行してください。

### 1. ランタイムのインストール

```bash
# mise を使用する場合
mise install

# mise を使用しない場合
# Bun: https://bun.sh
# Node.js: https://nodejs.org
```

### 2. 環境変数の設定

```bash
# プロジェクトルート
cp .env.development.example .env.development

# server/.env.local を作成
cat > server/.env.local << 'EOF'
DATABASE_URL=postgresql://sotuken:sotuken_dev@localhost:5432/sotuken_dev
EOF
```

`.env.development` を編集して、GEMINI_API_KEY を設定してください：
- API キーの取得: https://aistudio.google.com/app/apikey

### 3. 依存関係のインストール

```bash
cd server && bun install
cd ../concern-app && bun install
```

### 4. PostgreSQL の起動

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 5. データベースマイグレーション

```bash
cd server && bun run db:migrate
```

### 6. Git hooks の設定

```bash
git config core.hooksPath .githooks
```

## 日常の開発

### 開発サーバーの起動

```bash
# PostgreSQL を起動（未起動の場合）
docker compose -f docker-compose.dev.yml up -d

# バックエンド（ターミナル1）
cd server && bun run dev

# フロントエンド（ターミナル2）
cd concern-app && bun run dev
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:8000

### git pull 後の作業

`post-merge` hook により、スキーマ変更時は自動で通知されます。
通知が表示されたら以下を実行してください：

```bash
# マイグレーション
cd server && bun run db:migrate

# パッケージ更新
cd server && bun install
cd concern-app && bun install
```

### データベース操作

```bash
cd server

# マイグレーション実行
bun run db:migrate

# スキーマ変更後のマイグレーション生成
bun run db:generate

# Drizzle Studio（DB GUI）
bun run db:studio
```

### テスト

```bash
# バックエンドテスト
cd server && bun test

# フロントエンドテスト
cd concern-app && bun run test

# E2E テスト
cd concern-app && bun run test:e2e
```

## トラブルシューティング

### PostgreSQL に接続できない

```bash
# コンテナの状態確認
docker compose -f docker-compose.dev.yml ps

# ログ確認
docker compose -f docker-compose.dev.yml logs postgres

# 再起動
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

### ポートが既に使用されている

```bash
# 使用中のポートを確認
lsof -i :5432  # PostgreSQL
lsof -i :8000  # バックエンド
lsof -i :5173  # フロントエンド
```

`.env.development` で `DB_PORT` を変更するか、競合するプロセスを停止してください。

### マイグレーションエラー

```bash
# データベースをリセット（開発環境のみ）
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
cd server && bun run db:migrate
```

### mise が認識されない

シェル設定ファイルに以下が追加されているか確認：

```bash
# ~/.bashrc または ~/.zshrc
eval "$(mise activate bash)"  # または zsh
```

## プロジェクト構成

```
sotuken/
├── concern-app/          # フロントエンド (React + Vite)
├── server/               # バックエンド (Bun + Hono)
├── docker-compose.dev.yml    # 開発用 PostgreSQL
├── docker-compose.yml        # 本番用（参考）
├── .mise.toml               # ランタイムバージョン定義
├── .env.development.example  # 環境変数テンプレート
├── scripts/
│   └── setup.sh             # セットアップスクリプト
└── .githooks/
    └── post-merge           # git pull 後の自動通知
```
