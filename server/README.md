# Server

Bun + Hono によるバックエンドサーバー。

## 機能

- RESTful API（UI生成、イベント収集）
- Gemini 2.5 mini連携（UISpec生成）
- SQLite + Drizzle ORM
- メトリクスロギング

## 開発コマンド

```bash
bun install        # 依存関係インストール
bun run dev        # 開発サーバー（watchモード）
bun run start      # 本番サーバー
bun run build      # ビルド
bun run test       # テスト実行
```

## データベース

```bash
bun run db:generate  # マイグレーション生成
bun run db:migrate   # マイグレーション実行
bun run db:push      # スキーマ反映
bun run db:studio    # Drizzle Studio起動
bun run db:reset     # DB初期化
```

## 主要エンドポイント

| パス | メソッド | 説明 |
|------|---------|------|
| `/api/config` | GET | 設定取得 |
| `/api/ui/v3/generate` | POST | UISpec v3生成 |
| `/api/events/batch` | POST | イベント送信 |
| `/health` | GET | ヘルスチェック |

## 環境変数

```env
GEMINI_API_KEY=your_api_key
DATABASE_URL=./data/database.sqlite
PORT=3000
```

## ディレクトリ構成

```
server/
├── src/
│   ├── routes/         # APIルート
│   ├── services/       # ビジネスロジック
│   ├── database/       # DB設定・スキーマ
│   ├── definitions/    # Widget定義
│   └── types/          # 型定義
├── test/               # テスト
└── data/               # SQLiteデータ
```
