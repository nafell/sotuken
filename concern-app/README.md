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
```

## テスト

**重要**: `bun test`ではなく`bun run test`を使用（Vitestを実行するため）

### コマンド

```bash
bun run test           # 全Vitestテスト実行（617テスト）
bun run test:watch     # ウォッチモード
bun run test:coverage  # カバレッジレポート
bun run test:e2e       # Playwright E2Eテスト
```

### テスト構成

| カテゴリ | ファイル数 | テスト数 | 説明 |
|---------|-----------|---------|------|
| Widget Controller | 12 | 374 | 各Widgetのロジック層テスト |
| Widget Integration | 1 | 27 | コンポーネント統合テスト |
| Services | 4 | 52+ | サービス層テスト |
| Types | 3 | 30 | 型定義テスト |
| Store | 1 | 15 | 状態管理テスト |
| Widget E2E | 13 | - | Playwright E2Eテスト |

### 特定テストの実行

```bash
# Widget Controllerのみ
bun run test src/components/widgets/v3/*/__tests__/*Controller.test.ts

# 統合テストのみ
bun run test src/components/widgets/v3/__tests__/integration.test.tsx

# 特定Widgetのみ
bun run test src/components/widgets/v3/EmotionPalette/
```

### ドキュメント

- `specs/testing/test-strategy-v3.md` - テスト戦略
- `specs/testing/test-improvement-report.md` - 改善作業報告書

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
