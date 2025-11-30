# 本番環境ポート変更およびデプロイ設定レポート

## 概要
本番環境（Docker/Kubernetes）におけるバックエンドAPIのポート番号を、開発環境との競合を避けるために `3000` から `8000` に変更しました。
本ドキュメントは、その変更に伴う検証結果と、デプロイ時に必要な設定変更手順をまとめたものです。

## 1. 検証結果

以下の設定ファイルにおいて、ポート `8000` への変更が正しく適用されていることを確認しました。

*   **Dockerfile (`docker/backend.Dockerfile`)**: `EXPOSE 8000` およびヘルスチェックURLが `http://localhost:8000/health` に設定されています。
*   **Docker Compose (`docker-compose.yml`)**: Backendサービスのポートマッピングが `"8000:8000"` に設定されています。
*   **CI/CD (`.github/workflows/deploy.yml`)**: デプロイ後のヘルスチェックが `http://localhost:8000/health` に対して行われます。

## 2. アーキテクチャ構成

本番環境（VPS）は以下の構成で動作しています。

1.  **Host Nginx (VPS)**:
    *   SSL終端 (`https://sotuken.nafell.dev`) を担当。
    *   `/` へのアクセスを Frontendコンテナ (`localhost:8081`) へ転送。
    *   `/api/` へのアクセスを Backendコンテナ (`localhost:8000`) へ転送。
2.  **Docker Containers**:
    *   Frontend: Nginx (Port 80 -> Host 8081)
    *   Backend: Bun Server (Port 8000 -> Host 8000)

## 3. 必要な設定変更

### 3.1 GitHub Repository Secrets
`VITE_API_URL` および `CORS_ORIGINS` は、**外部公開URL（ドメイン）** を指定するため、今回のポート変更による**変更は不要**です。

| Secret Name | 設定値 | 備考 |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://sotuken.nafell.dev/api` | フロントエンドビルド時に埋め込まれるAPIのベースURL |
| `CORS_ORIGINS` | `https://sotuken.nafell.dev` | CORS許可オリジン |

### 3.2 VPS Host Nginx 設定 (必須)
バックエンドコンテナのポート変更に伴い、VPS上のNginx設定ファイル（`/etc/nginx/sites-available/sotuken.nafell.dev` 等）の修正が必要です。

**変更内容**:
`/api/` および `/health` ロケーションの `proxy_pass` 先を `8080` から `8000` に変更します。

```nginx
server {
    # ...
    
    # API requests to Backend container
    location /api/ {
        # proxy_pass http://127.0.0.1:8080/;  <-- 旧設定
        proxy_pass http://127.0.0.1:8000/;    <-- 新設定
        # ...
    }

    # Health check endpoint
    location /health {
        # proxy_pass http://127.0.0.1:8080/health; <-- 旧設定
        proxy_pass http://127.0.0.1:8000/health;   <-- 新設定
        # ...
    }
}
```

**適用コマンド**:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. 補足事項
*   ドキュメントやテストコードの一部に `localhost:3000` の記述が残っていますが、これらはレガシーコードまたは開発環境向けのものであり、本番デプロイには影響しません。
