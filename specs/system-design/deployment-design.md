# デプロイメント設計書

**Version**: 1.0
**最終更新**: 2025-11-28

---

## 1. 概要

「頭の棚卸しノート」アプリの本番環境構成とデプロイメント設計。

### 1.1 環境構成

| 環境 | 用途 | URL |
|------|------|-----|
| 開発 | ローカル開発 | http://localhost:5173 |
| 本番 | VPS運用 | https://sotuken.nafell.dev |

### 1.2 技術スタック

| コンポーネント | 技術 |
|--------------|------|
| コンテナ | Docker + docker-compose |
| リバースプロキシ | Nginx (Host) |
| SSL | Let's Encrypt (Certbot) |
| CI/CD | GitHub Actions |
| VPS | Ubuntu 22.04 |

---

## 2. 本番環境アーキテクチャ

### 2.1 システム構成

```
┌─────────────────────────────────────────────────────────────────┐
│                    VPS (Ubuntu 22.04)                          │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Host OS                                │  │
│  │                                                          │  │
│  │   ┌────────────────────────────────────────────────┐     │  │
│  │   │              Nginx (Host)                      │     │  │
│  │   │  :80  → HTTPS redirect                        │     │  │
│  │   │  :443 → SSL termination                       │     │  │
│  │   └──────────┬─────────────────────┬──────────────┘     │  │
│  │              │                     │                     │  │
│  │   ┌──────────┼─────────────────────┼──────────────┐     │  │
│  │   │          │     Docker          │              │     │  │
│  │   │          ▼                     ▼              │     │  │
│  │   │   ┌────────────┐       ┌────────────┐        │     │  │
│  │   │   │  Backend   │       │  Frontend  │        │     │  │
│  │   │   │  Bun/Hono  │       │  Nginx     │        │     │  │
│  │   │   │  :8080     │       │  :8081     │        │     │  │
│  │   │   └──────┬─────┘       └────────────┘        │     │  │
│  │   │          │                                    │     │  │
│  │   │          ▼                                    │     │  │
│  │   │   ┌────────────┐                             │     │  │
│  │   │   │ PostgreSQL │                             │     │  │
│  │   │   │  :5433     │                             │     │  │
│  │   │   └────────────┘                             │     │  │
│  │   └───────────────────────────────────────────────┘     │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 ポートマッピング

| サービス | 開発環境 | 本番(Host) | 本番(Container) |
|----------|----------|------------|-----------------|
| Frontend | 5173 | 8081 | 80 |
| Backend | 3000 | 8080 | 3000 |
| PostgreSQL | 5432 | 5433 | 5432 |
| Nginx (HTTPS) | - | 443 | - |

### 2.3 URLルーティング

```
https://sotuken.nafell.dev/
├── /           → Frontend (React PWA)
├── /api/*      → Backend (Bun/Hono)
└── /health     → Backend health check
```

---

## 3. Docker構成

### 3.1 ファイル構成

```
sotuken/
├── docker/
│   ├── backend.Dockerfile    # Backend用
│   ├── frontend.Dockerfile   # Frontend用
│   └── nginx/
│       └── frontend.conf     # コンテナ内Nginx
├── deploy/
│   └── nginx/
│       └── sotuken.conf      # ホストNginx設定
├── docker-compose.yml        # 本番構成
└── .env                      # 環境変数（gitignore）
```

### 3.2 docker-compose.yml

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    ports:
      - "8080:3000"
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - CORS_ORIGINS=${CORS_ORIGINS}
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL}
    ports:
      - "8081:80"

  postgres:
    image: postgres:15-alpine
    ports:
      - "5433:5432"
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3.3 Backend Dockerfile

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY server/package.json server/bun.lockb ./
RUN bun install

COPY server/ .

RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
```

### 3.4 Frontend Dockerfile

```dockerfile
FROM node:20 AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY concern-app/package.json concern-app/bun.lockb ./
RUN npm install

COPY concern-app/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

---

## 4. Nginx設定

### 4.1 ホストNginx（SSL終端）

```nginx
# /etc/nginx/sites-available/sotuken.conf

server {
    listen 80;
    server_name sotuken.nafell.dev;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sotuken.nafell.dev;

    ssl_certificate /etc/letsencrypt/live/sotuken.nafell.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sotuken.nafell.dev/privkey.pem;

    # API
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8080/health;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:8081/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.2 コンテナ内Nginx（SPA対応）

```nginx
# docker/nginx/frontend.conf

server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 5. CI/CD パイプライン

### 5.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - name: Install & Test
        run: |
          cd server && bun install && bun test
          cd ../concern-app && bun install && bun run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            cd /opt/sotuken-prod
            git pull origin main
            docker compose down
            docker compose build --no-cache
            docker compose up -d
            sleep 10
            curl -f http://localhost:8080/health || exit 1
```

### 5.2 デプロイフロー

```
Push to main
     │
     ▼
┌─────────────┐
│    Test     │  ← Bun test + Build check
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │  ← SSH to VPS
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  git pull   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│docker build │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ docker up   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Health check │
└─────────────┘
```

---

## 6. 環境変数

### 6.1 本番環境変数（.env）

```env
# Database
DB_USER=sotuken_prod
DB_PASSWORD=<secure-password>
DB_NAME=sotuken_production

# API
GEMINI_API_KEY=<api-key>
CORS_ORIGINS=https://sotuken.nafell.dev

# Frontend
VITE_API_URL=https://sotuken.nafell.dev/api
```

### 6.2 GitHub Secrets

| Secret | 説明 |
|--------|------|
| SSH_HOST | VPS IP/ドメイン |
| SSH_USER | SSHユーザー名 |
| SSH_PRIVATE_KEY | SSH秘密鍵 |
| SSH_PORT | SSHポート（30722） |
| DB_USER | DBユーザー |
| DB_PASSWORD | DBパスワード |
| DB_NAME | DB名 |
| GEMINI_API_KEY | Gemini APIキー |
| CORS_ORIGINS | CORS許可オリジン |
| VITE_API_URL | フロントエンドAPI URL |

---

## 7. 運用手順

### 7.1 手動デプロイ

```bash
# VPSにSSH接続
ssh -p 30722 tk220307@<vps-ip>

# デプロイディレクトリへ移動
cd /opt/sotuken-prod

# 最新コード取得
git pull origin main

# 再ビルド・再起動
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 7.2 ログ確認

```bash
# 全サービスのログ
docker compose logs -f

# 特定サービス
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### 7.3 データベース操作

```bash
# PostgreSQLに接続
docker compose exec postgres psql -U sotuken_prod -d sotuken_production

# マイグレーション実行
docker compose exec backend bun run db:migrate
```

### 7.4 SSL証明書更新

```bash
# 証明書更新（certbot）
sudo certbot renew

# Nginx再読み込み
sudo systemctl reload nginx
```

---

## 8. セキュリティ

### 8.1 実施済み対策

| 対策 | 内容 |
|------|------|
| SSH | 公開鍵認証、ポート変更（30722） |
| SSL | Let's Encrypt HTTPS必須 |
| DB | Dockerネットワーク内のみアクセス |
| Secrets | GitHub Secrets管理 |
| CORS | 本番ドメインのみ許可 |

### 8.2 推奨追加対策

- [ ] ファイアウォール設定（ufw）
- [ ] fail2banによる不正アクセス防止
- [ ] 定期的なセキュリティアップデート

---

## 9. 監視・アラート

### 9.1 ヘルスチェック

```bash
# エンドポイント
GET /health

# 期待レスポンス
{ "status": "ok", "timestamp": "..." }
```

### 9.2 将来拡張

- Prometheus + Grafana監視
- Discord/Slack通知
- ログ集約（Loki等）

---

## 10. 関連ファイル

| ファイル | 説明 |
|---------|------|
| `docker-compose.yml` | 本番Docker構成 |
| `docker/backend.Dockerfile` | Backend Dockerfile |
| `docker/frontend.Dockerfile` | Frontend Dockerfile |
| `deploy/nginx/sotuken.conf` | ホストNginx設定 |
| `.github/workflows/deploy.yml` | GitHub Actions |
| `specs/project/phase5/ci-cd-design.md` | CI/CD設計詳細 |
| `specs/project/vps-setup-log.md` | VPSセットアップログ |
