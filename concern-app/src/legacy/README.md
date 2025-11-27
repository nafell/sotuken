# Legacy Code

このディレクトリには、現行版（Full-Flow PoC）以前のコードを格納しています。
実験データの再現性維持のため、動作可能な状態を保っています。

## アーカイブ日
2025-11-28

## 現行版
**Full-Flow Demo** (`/dev-demo/full-flow` → `../pages/dev-demo/FullFlowDemoPage.tsx`)

## ディレクトリ構造

```
legacy/
├── README.md              # 本ファイル
├── navigators/            # 旧ナビゲーター
│   ├── DynamicUINavigator.tsx   # 動的UI版（Phase 2）
│   └── StaticUINavigator.tsx    # 固定UI版（Phase 2）
├── screens/               # 旧スクリーン
│   ├── DynamicThoughtScreen.tsx    # 動的思考整理 V1
│   └── DynamicThoughtScreenV2.tsx  # 動的思考整理 V2
└── ui-generation/         # 旧UIレンダラー
    ├── UIRenderer.tsx     # V1
    └── UIRendererV2.tsx   # V2
```

## アクセス方法

旧版は `/legacy/*` ルートでアクセス可能です：

```
/legacy/           → HomeScreen（旧ホーム）
/legacy/concern/*  → 関心事フロー
/legacy/tasks/*    → タスク管理
/legacy/settings   → 設定
```

## 注意事項

1. **新規開発には使用しない**: 新機能は現行版に追加してください
2. **変更は最小限に**: 実験再現性のため、コードの変更は避けてください
3. **削除禁止**: 研究完了まで削除しないでください

## 変遷

```
Phase 0-1: 固定UIフロー
    ↓
Phase 1C: DynamicThoughtScreen（V1）
    ↓
Phase 2: 実験条件別ルーティング（DynamicUI/StaticUI Navigator）
    ↓
Phase 3: DynamicThoughtScreenV2（UISpec v2.0）
    ↓
Phase 4: Full-Flow Demo（DSLv3、現行版）
```

## 関連ドキュメント

- 旧DSL仕様: `specs/dsl-design/archive/`
- Phase 2設計: `specs/project/phase2/`
- Phase 3設計: `specs/project/phase3/`
