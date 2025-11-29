# Phase 5: CI/CD パイプラインと本番環境設計

## 1. 概要

本ドキュメントは「頭の棚卸しノート」アプリのCI/CDパイプラインと本番環境の設計を定義する。

### 1.1 目的
- GitHub Actionsによる自動デプロイの実現
- Dockerによる本番環境の構築
- 開発環境と本番環境の分離

### 1.2 要件
| 項目 | 要件 |
|------|------|
| CI/CDツール | GitHub Actions |
| デプロイトリガー | mainブランチへのpush |
| コンテナ化 | Docker + docker-compose |
| リバースプロキシ | Nginx |
| SSL | Let's Encrypt (既存ドメイン使用) |
| データベース | Docker内PostgreSQL |

---

## 2. アーキテクチャ

### 2.1 システム構成図

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    VPS (Ubuntu 22.04)               │
                    │                                                     │
  Internet          │   ┌─────────────────────────────────────────────┐   │
     │              │   │              Host OS                        │   │
     │              │   │                                             │   │
     ▼              │   │   ┌─────────────────────────────────────┐   │   │
┌─────────┐         │   │   │          Nginx (Host)               │   │   │
│ Browser │◄────────┼───┼───┤  :80 (HTTP→HTTPS redirect)          │   │   │
└─────────┘         │   │   │  :443 (SSL termination)             │   │   │
                    │   │   └──────────┬──────────────┬───────────┘   │   │
                    │   │              │              │               │   │
                    │   │   ┌──────────┼──────────────┼───────────┐   │   │
                    │   │   │          │   Docker     │           │   │   │
                    │   │   │          ▼              ▼           │   │   │
                    │   │   │   ┌───────────┐  ┌────────────┐     │   │   │
                    │   │   │   │ Backend   │  │ Frontend   │     │   │   │
                    │   │   │   │ :8080→3000│  │ :8081→80   │     │   │   │
                    │   │   │   └─────┬─────┘  └────────────┘     │   │   │
                    │   │   │         │                           │   │   │
                    │   │   │         ▼                           │   │   │
                    │   │   │   ┌───────────┐                     │   │   │
                    │   │   │   │ PostgreSQL│                     │   │   │
                    │   │   │   │ :5433→5432│                     │   │   │
                    │   │   │   └───────────┘                     │   │   │
                    │   │   └─────────────────────────────────────┘   │   │
                    │   │                                             │   │
                    │   │   Development (Host): :3000, :5173, :5432   │   │
                    │   └─────────────────────────────────────────────┘   │
                    └─────────────────────────────────────────────────────┘
```

### 2.2 ポートマッピング

| サービス | 開発環境 | 本番環境(Host) | 本番環境(Container) |
|----------|----------|----------------|---------------------|
| Frontend | 5173 | 8081 | 80 |
| Backend | 3000 | 8080 | 3000 |
| PostgreSQL | 5432 | 5433 | 5432 |
| Nginx (SSL) | - | 443 | - |

---

## 3. CI/CDパイプライン

### 3.1 ワークフロー概要

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Push    │───▶│  Test    │───▶│  Build   │───▶│  Deploy  │
│  (main)  │    │  (Bun)   │    │ (Docker) │    │  (SSH)   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 3.2 GitHub Actions Workflow

**トリガー**: `main`ブランチへのpush、または手動実行

**ジョブ**:
1. **test**: Bunでテスト実行、型チェック
2. **deploy**: SSH経由でVPSに接続し、docker compose up

### 3.3 デプロイフロー

1. GitHub ActionsがSSHでVPSに接続
2. `/opt/sotuken-prod`でgit pull
3. `.env`ファイルをGitHub Secretsから生成
4. `docker compose build --no-cache`
5. `docker compose up -d`
6. ヘルスチェック実行

---

## 4. ファイル構成

### 4.1 新規作成ファイル

```
sotuken/
├── docker/
│   ├── backend.Dockerfile      # Backend用Dockerfile
│   ├── frontend.Dockerfile     # Frontend用Dockerfile
│   └── nginx/
│       └── frontend.conf       # コンテナ内Nginx設定
├── deploy/
│   └── nginx/
│       └── sotuken.conf        # ホストNginxリバースプロキシ
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions
├── docker-compose.yml          # 本番環境構成
├── .env.production.example     # 環境変数テンプレート
└── concern-app/
    └── .env.development        # 開発用環境変数
```

### 4.2 修正ファイル

| ファイル | 修正内容 |
|----------|----------|
| `concern-app/src/services/api/ApiService.ts` | APIエンドポイント環境変数化 |
| `server/src/index.ts` | CORS設定環境変数化 |
| `.gitignore` | `.env`ファイル除外追加 |

---

## 5. 環境変数

### 5.1 本番環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| DB_USER | DBユーザー名 | sotuken_prod |
| DB_PASSWORD | DBパスワード | (強力なパスワード) |
| DB_NAME | DB名 | sotuken_production |
| GEMINI_API_KEY | Gemini APIキー | AIzaSy... |
| CORS_ORIGINS | 許可オリジン | https://domain.com |
| VITE_API_URL | フロントエンドAPI URL | https://domain.com/api |

### 5.2 GitHub Secrets

| Secret名 | 説明 |
|----------|------|
| SSH_HOST | VPSのIPまたはドメイン |
| SSH_USER | SSHユーザー名 |
| SSH_PRIVATE_KEY | SSH秘密鍵 |
| SSH_PORT | SSHポート |
| DB_USER, DB_PASSWORD, DB_NAME | DB接続情報 |
| GEMINI_API_KEY | APIキー |
| CORS_ORIGINS | CORS許可オリジン |
| VITE_API_URL | フロントエンドAPI URL |

---

## 6. セキュリティ考慮事項

1. **SSH**: 公開鍵認証のみ、パスワード認証無効化推奨
2. **Database**: Dockerネットワーク内のみアクセス可能
3. **Secrets**: すべての機密情報はGitHub Secretsで管理
4. **SSL**: Let's EncryptでHTTPS必須
5. **CORS**: 本番ドメインのみ許可

---

## 7. 初期セットアップ手順

### 7.1 サーバー側

1. Docker/Docker Composeインストール
2. Nginx + Certbotインストール
3. `/opt/sotuken-prod`にリポジトリクローン
4. `.env`ファイル設定
5. SSL証明書取得（certbot）
6. Nginx設定シンボリックリンク作成
7. `docker compose up -d --build`
8. DBマイグレーション実行

### 7.2 GitHub側

1. Repository Secretsに環境変数設定
2. デプロイ用SSHキーペア作成・登録

---

## 8. 運用

### 8.1 デプロイ

- mainブランチへpushで自動デプロイ
- 手動デプロイ: GitHub Actions → Run workflow

### 8.2 ログ確認

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### 8.3 再起動

```bash
cd /opt/sotuken-prod
docker compose restart
```

### 8.4 完全リビルド

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```
