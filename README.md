# 頭の棚卸しノート

CBT（認知行動療法）に基づく関心事外在化支援アプリの研究プロジェクト。
LLM（Gemini 2.5 mini）による動的UI生成でユーザーの思考整理を支援します。

## 技術スタック

- **Frontend**: React + TypeScript + Vite (PWA)
- **Backend**: Bun + Hono + Drizzle ORM + PostgreSQL
- **LLM**: Google Gemini 2.5 mini
- **DSL**: DSL v3（OODM + DpG + Reactive Widgets）

## ディレクトリ構成

```
sotuken/
├── concern-app/          # React PWAフロントエンド
├── server/               # Bun/Honoバックエンド
├── specs/                # 仕様ドキュメント
│   ├── dsl-design/       # DSL仕様（v3が現行）
│   ├── project/          # フェーズ別ドキュメント
│   └── ...
├── tests/                # 統合テスト
└── config/               # 設定ファイル
```

## 開発コマンド

### フルスタック起動
```bash
./tmux-fullstack.sh
```

### フロントエンド
```bash
cd concern-app
bun run dev      # 開発サーバー
bun run build    # ビルド
```

### バックエンド
```bash
cd server
bun run dev      # 開発サーバー
bun run db:migrate  # DBマイグレーション
```

### テスト
```bash
node tests/run_all_tests.js
```

## 主要ルート

| パス | 説明 |
|------|------|
| `/` | Full-Flow Demo（現行メイン） |
| `/dev-demo/*` | 開発用デモ |
| `/legacy/*` | 旧実験用（Phase 1-3） |

## ドキュメント

- [Full-Flow設計](specs/project/phase4/full-flow-design.md)
- [DSL v3仕様](specs/dsl-design/v3/)
- [API仕様](specs/api-schema/)

## 研究情報

- 匿名クラウド + サーバサイド推論
- 再現性のための決定論モード/seed対応
- メトリクス収集・エクスポート機能
