# Phase 3: レンダラー改修 完了報告

**Date**: 2025-12-02
**Status**: Complete

---

## 概要

DSL v4対応のレンダラーシステムを実装。UIRendererV4、DataBindingProcessor、ReactiveBindingEngineV4を含む。

---

## 完了タスク

### TASK-3.1: UIRendererV4実装

**ファイル**: `concern-app/src/services/ui-generation/UIRendererV4.tsx`

- DSL v4 UISpec対応のレンダラーコンポーネント
- DataBindingProcessorとの統合
- Widget出力コールバック（onWidgetUpdate, onWidgetComplete）
- ポート変更コールバック（onPortChange）
- ORS更新コールバック（onORSUpdate）
- v4 WidgetSpec → v3 WidgetSpecObject変換
- v4 WidgetMetadata → v3 WidgetMetadata変換

### TASK-3.2: DataBindingProcessor実装

**ファイル**: `concern-app/src/services/ui/DataBindingProcessor.ts`

- DataBindingProcessor クラス
  - ORS-Widget間のデータバインディング処理
  - 初期値取得（getInitialValue）
  - 値更新（updateValue）
  - PNTR参照解決（resolvePNTR）
- ランタイム値キャッシュ
- 変換関数サポート（toWidget, toORS）
- 循環参照検出

### TASK-3.3: ReactiveBindingEngineV4実装

**ファイル**: `concern-app/src/services/ui/ReactiveBindingEngineV4.ts`

- ReactiveBindingEngineV4 クラス
  - Widget間リアクティブバインディング
  - WidgetPortPath形式（widgetId.portId）
  - UpdateMode対応（realtime, debounced, on_confirm）
  - 伝播深度制限（無限ループ防止）
- 関係仕様適用（passthrough, javascript, transform, llm）
- 確認待ちバインディング管理
- 伝播イベントコールバック
- バリデーションエラーコールバック

---

## ファイル一覧

### 新規ファイル

```
concern-app/src/services/ui/
├── DataBindingProcessor.ts       # ORS-Widget データバインディング
└── ReactiveBindingEngineV4.ts    # Widget間リアクティブバインディング

concern-app/src/services/ui-generation/
└── UIRendererV4.tsx              # DSL v4対応レンダラー
```

---

## アーキテクチャ

### データフロー

```
ORS (データモデル)
    │
    ├─ DataBindingProcessor
    │       │
    │       ├─ getInitialValue() → Widget初期値
    │       │
    │       └─ updateValue() ← Widget出力
    │
UISpec (UI定義)
    │
    ├─ UIRendererV4
    │       │
    │       ├─ renderWidget() → Widgetコンポーネント
    │       │
    │       └─ handleWidgetUpdate() → onWidgetUpdate, onORSUpdate
    │
ReactiveBindingSpec (Widget間連携)
    │
    └─ ReactiveBindingEngineV4
            │
            ├─ updatePort() → 伝播処理
            │
            └─ onPropagate() → ポート更新通知
```

### UpdateMode処理

| Mode | 説明 | 処理 |
|------|------|------|
| realtime | 即時更新 | 値変更時に即座に伝播 |
| debounced | 遅延更新 | 指定時間後に伝播（デフォルト300ms） |
| on_confirm | 確認後更新 | confirmBinding()呼び出しで伝播 |

### 関係仕様（WidgetRelationshipSpec）

| Type | 説明 | 実装 |
|------|------|------|
| passthrough | 値をそのまま伝播 | `return sourceValue` |
| javascript | JS式で変換 | `new Function('source', 'target', expr)` |
| transform | 変換式適用 | `new Function('source', expr)` |
| llm | LLM処理（非同期） | 別サービスに委譲（未実装） |

### v4 → v3 型変換

UIRendererV4では、既存のWidgetコンポーネント群との互換性のため、v4型をv3型に変換：

```typescript
// WidgetSpec変換
const v3Spec: WidgetSpecObject = {
  id: spec.id,
  component: spec.component as string as WidgetComponentType,
  layout: spec.layout === 'auto' ? undefined : spec.layout,
  props: spec.props,
  metadata: {
    timing: spec.metadata?.complexity ?? 0.5,
    versatility: 0.5,
    bottleneck: spec.metadata?.suitableFor ?? ['thought'],
  },
};

// LayoutType変換（'auto' → undefined）
```

---

## コールバック仕様

### UIRendererV4Props

```typescript
interface UIRendererV4Props {
  uiSpec: UISpec;
  ors: ORS;
  onWidgetUpdate?: (widgetId: string, outputs: WidgetOutputs) => void;
  onWidgetComplete?: (widgetId: string) => void;
  onPortChange?: (portPath: string, value: unknown) => void;
  onORSUpdate?: (entityAttribute: string, value: unknown) => void;
  debug?: boolean;
}
```

### ReactiveBindingEngineV4 Callbacks

```typescript
// 伝播イベント
type PropagationCallbackV4 = (events: PropagationEventV4[]) => void;

// バリデーションエラー
type ValidationErrorCallbackV4 = (portPath: WidgetPortPath, error: string) => void;
```

---

## 設定オプション

### DataBindingProcessorConfig

```typescript
interface DataBindingProcessorConfig {
  debug?: boolean;  // デバッグログ出力
}
```

### EngineConfigV4

```typescript
interface EngineConfigV4 {
  defaultDebounceMs: number;      // デフォルト: 300
  maxPropagationDepth: number;    // デフォルト: 10
  complexityThreshold: number;    // デフォルト: 0.5
  debug: boolean;                 // デフォルト: false
}
```

---

## 次のステップ

Phase 4: UI・フロー改修
- TASK-4.1: ステージ遷移UIの実装
- TASK-4.2: 4ステージフロー対応
- TASK-4.3: まとめステージ実装
- TASK-4.4: 既存フローとの統合

---

## 変更履歴

| Date | Changes |
|------|---------|
| 2025-12-02 | Phase 3完了 |
