# Concern App

React + TypeScript + Vite によるPWAフロントエンド。

## 機能

- Full-Flow Demo（capture → plan → breakdown）
- DSL v3 Reactive Widgets（12種）
- メトリクス収集・表示
- オフライン対応（IndexedDB）

## 開発コマンド

```bash
bun install        # 依存関係インストール
bun run dev        # 開発サーバー
bun run build      # ビルド
bun run lint       # ESLint実行
bun run test       # Vitestテスト
bun run test:e2e   # Playwrightテスト
```

## ルーティング

| パス | コンポーネント | 説明 |
|------|--------------|------|
| `/` | FullFlowDemoPage | 現行メイン |
| `/dev-demo/*` | 各種デモ | 開発用 |
| `/legacy/*` | DynamicUI/StaticUI | 旧実験用 |
| `/admin/*` | 管理画面 | 管理者用 |

## ディレクトリ構成

```
concern-app/src/
├── pages/              # ページコンポーネント
├── components/
│   ├── demo/full-flow/ # Full-Flowコンポーネント
│   ├── widgets/v3/     # Reactive Widgets（12種）
│   └── ui/             # 共通UI
├── services/           # APIサービス等
├── hooks/              # カスタムフック
├── types/              # 型定義
├── store/              # Jotai状態管理
└── legacy/             # 旧コード（Phase 1-3）
```

## Widget v3一覧

| カテゴリ | Widget |
|---------|--------|
| Diverge | emotion_palette, brainstorm_cards, question_card_chain |
| Organize | card_sorting, dependency_mapping, swot_analysis, mind_map |
| Converge | matrix_placement, priority_slider_grid, tradeoff_balance, timeline_slider |
| Summary | structured_summary |
