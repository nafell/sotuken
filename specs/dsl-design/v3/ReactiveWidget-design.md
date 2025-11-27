# ReactiveWidget 設計仕様書

> Phase 4 - Day 3-4 Task 2.2 準備
>
> 作成日: 2025-01-27
> バージョン: 1.0

## 1. 概要

### 1.1 目的

Widget間のリアクティブなデータ連携を実現し、以下を達成する：

- **研究評価用基盤**: LLMが生成したDependencyGraph定義の正確性を検証
- **ユーザー体験向上**: 操作結果の即座な可視化
- **認知負荷軽減**: 手動での情報転記が不要

### 1.2 対象Widgetパターン

| Widget | 入力 | 出力 | 動作 |
|--------|------|------|------|
| TradeoffBalance | 重み付けリスト | バランス値 | スライダー調整→天秤が即座に傾く |
| DependencyMapping | ノード接続 | クリティカルパス | 接続変更→パス自動ハイライト |
| SWOTAnalysis | SWOT配置 | 不足情報リスト | 配置変更→不足リスト自動生成 |

### 1.3 設計方針

- **React非依存のコアロジック**: フレームワーク変更に対応可能
- **片方向データフロー**: 循環依存を構造的に防止
- **Debounceによる最適化**: 連続操作時の無駄な更新を抑制
- **型安全性**: TypeScriptによる厳密な型定義

---

## 2. アーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Layer                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Widget A     │    │ Widget B     │    │ Widget C     │      │
│  │ useReactive  │    │ useReactive  │    │ useReactive  │      │
│  │ Ports()      │    │ Ports()      │    │ Ports()      │      │
│  └──────┬───────┘    └──────▲───────┘    └──────▲───────┘      │
│         │ emitPort          │                   │               │
└─────────┼───────────────────┼───────────────────┼───────────────┘
          │                   │                   │
          ▼                   │                   │
┌─────────────────────────────────────────────────────────────────┐
│                    React Adapter Layer                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ WidgetFlow                                              │    │
│  │ - handlePortChange → Engine.updatePort()                │    │
│  │ - useFlowValidation() → canProceed                      │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │                   ▲
          ▼                   │
┌─────────────────────────────────────────────────────────────────┐
│                 Pure Logic Layer (React非依存)                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ReactiveBindingEngine                                   │    │
│  │ - DependencyGraph (トポロジー管理)                       │    │
│  │ - DependencyExecutor (Transform実行)                    │    │
│  │ - Debounce制御 (300ms)                                  │    │
│  │ - ループ検出 (深度制限: 10)                              │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 層の責務

| 層 | 責務 | 主要コンポーネント |
|----|------|-------------------|
| **React Layer** | UI描画、ユーザー操作 | Widget Components |
| **React Adapter** | React↔Engine接続 | WidgetFlow, useReactivePorts, useFlowValidation |
| **Pure Logic** | データフロー制御 | ReactiveBindingEngine, DependencyGraph, DependencyExecutor |

---

## 3. 型定義

### 3.1 WidgetDefinition (server/src/types/WidgetDefinition.ts)

```typescript
// Port データ型
export type PortDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'number[]'
  | 'object'
  | 'object[]';

// Port 方向（片方向のみ）
export type PortDirection = 'in' | 'out';

// Port 制約
export type PortConstraint =
  | { type: 'range'; min?: number; max?: number }
  | { type: 'enum'; values: (string | number)[] }
  | { type: 'array'; minLength?: number; maxLength?: number; itemType?: PortDataType }
  | { type: 'pattern'; regex: string };

// Reactive Port 定義
export interface ReactivePortDefinition {
  id: string;
  direction: PortDirection;
  dataType: PortDataType;
  description: string;
  defaultValue?: any;
  constraints?: PortConstraint[];
  required?: boolean;
}

// Widget 定義
export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  stage: 'diverge' | 'organize' | 'converge' | 'summary';
  ports: {
    inputs: ReactivePortDefinition[];
    outputs: ReactivePortDefinition[];
  };
  configSchema?: Record<string, any>; // JSON Schema
  metadata: {
    timing: number;      // 0.0-1.0
    versatility: number; // 0.0-1.0
    bottleneck: string[];
  };
}
```

### 3.2 予約Port

```typescript
// 全Widgetに共通の特殊Port
export const RESERVED_PORTS = {
  ERROR: '_error',
  COMPLETED: '_completed',
} as const;

// エラーPort値
export interface ErrorPortValue {
  hasError: boolean;
  messages: string[];
}

// 完了Port値
export interface CompletedPortValue {
  isCompleted: boolean;
  requiredFields?: string[];
}
```

### 3.3 BaseWidgetProps (concern-app/src/types/widget.types.ts)

```typescript
export type PortChangeCallback = (
  widgetId: string,
  portId: string,
  value: any
) => void;

export type PortValueGetter = (portKey: string) => any;

export interface BaseWidgetProps {
  spec: WidgetSpecObject;

  // 既存（後方互換）
  onComplete?: (widgetId: string) => void;
  onUpdate?: (widgetId: string, data: any) => void;

  // 新規（Reactive対応）
  onPortChange?: PortChangeCallback;
  getPortValue?: PortValueGetter;
  initialPortValues?: Record<string, any>;
}
```

---

## 4. コンポーネント設計

### 4.1 ReactiveBindingEngine

**ファイル**: `concern-app/src/services/ui/ReactiveBindingEngine.ts`

```typescript
export interface EngineConfig {
  defaultDebounceMs: number;      // デフォルト: 300
  maxPropagationDepth: number;    // デフォルト: 10
  debug: boolean;
}

export class ReactiveBindingEngine {
  // コンストラクタ
  constructor(spec: DependencyGraphSpec, config?: Partial<EngineConfig>);

  // Port操作
  initPort(portKey: string, value: any): void;      // 初期化（Debounceなし）
  updatePort(portKey: string, value: any): void;    // 更新（Debounceあり）
  getPortValue(portKey: string): any;

  // コールバック設定
  setOnPropagate(callback: PropagationCallback): void;
  setOnValidationError(callback: ValidationCallback): void;
  setOnValidationStateChange(callback: (state: FlowValidationState) => void): void;

  // バリデーション状態
  getFlowValidationState(): FlowValidationState;

  // ライフサイクル
  dispose(): void;
}
```

### 4.2 useReactivePorts Hook

**ファイル**: `concern-app/src/hooks/useReactivePorts.ts`

```typescript
interface UseReactivePortsReturn {
  emitPort: (portId: string, value: any) => void;
  readPort: (portKey: string) => any;
  setError: (hasError: boolean, messages?: string[]) => void;
  setCompleted: (isCompleted: boolean, requiredFields?: string[]) => void;
  errorState: ErrorPortValue;
  completedState: CompletedPortValue;
}

export function useReactivePorts(options: {
  widgetId: string;
  onPortChange?: PortChangeCallback;
  getPortValue?: PortValueGetter;
  initialPortValues?: Record<string, any>;
}): UseReactivePortsReturn;
```

### 4.3 useFlowValidation Hook

**ファイル**: `concern-app/src/hooks/useFlowValidation.ts`

```typescript
export interface FlowValidationState {
  canProceed: boolean;
  widgetErrors: Map<string, ErrorPortValue>;
  incompleteWidgets: string[];
}

export function useFlowValidation(
  engine: ReactiveBindingEngine | null
): FlowValidationState;
```

### 4.4 WidgetDefinitionGenerator

**ファイル**: `server/src/services/WidgetDefinitionGenerator.ts`

```typescript
export class WidgetDefinitionGenerator {
  constructor(registry: WidgetDefinitionRegistry);

  // プロンプト生成（2バージョン）
  generateWidgetPromptSectionSimple(widgetIds: string[]): string;  // Widget選定用
  generateWidgetPromptSectionFull(widgetIds: string[]): string;    // UI生成用
  generateDependencyPromptSection(widgetIds: string[]): string;

  // 検証
  validateDependencyGraph(
    dpg: DependencyGraphSpec,
    widgetIds: string[]
  ): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];   // 型不整合はエラー
  warnings: string[];
}
```

---

## 5. データフロー

### 5.1 伝播シーケンス

```
[T0] User操作 (Widget A スライダー)
     │
     ├── Widget A 即座に再描画（React state）
     │
     └── emitPort('balance', 0.3)
              │
              ▼
         Engine.updatePort('A.balance', 0.3)
              │
              ├── portValues['A.balance'] = 0.3 （即座にキャッシュ）
              │
              └── Debounceタイマー開始 (300ms)

[T1] 300ms経過
     │
     └── executePropagation()
              │
              ├── DependencyGraph.getDependencies('A.balance')
              │
              ├── DependencyExecutor.execute(dep, 0.3)
              │   └── Transform実行
              │
              ├── portValues['B.input'] = result
              │
              └── onPropagate callback → React setState
                       │
                       ▼
                  Widget B 再描画
```

### 5.2 連続操作時の最適化

```
[T0] emitPort('balance', 0.3) → タイマー開始
[T1] emitPort('balance', 0.5) → タイマーリセット、値上書き
[T2] emitPort('balance', 0.7) → タイマーリセット、値上書き
[T3] 300ms経過 → 0.7のみ伝播（中間値スキップ）
```

---

## 6. バリデーション

### 6.1 静的検証（生成時）

| チェック項目 | 厳格度 | 説明 |
|-------------|--------|------|
| Port存在確認 | Error | source/targetが定義済みPortか |
| 方向チェック | Error | sourceはout、targetはin |
| 型互換性 | Error | データ型が互換性あるか |
| 循環依存 | Error | DependencyGraphで検出 |

### 6.2 動的検証（実行時）

| チェック項目 | 対応 |
|-------------|------|
| Transform失敗 | validation_errorとして通知 |
| ループ検出 | 深度10で強制停止 + 警告 |
| 不整合状態 | _errorポートに反映 |

### 6.3 フロー全体検証

```typescript
// NavigationFooterでの使用
const { canProceed, incompleteWidgets } = useFlowValidation(engine);

<button disabled={!canProceed}>次へ</button>
```

---

## 7. Widget実装例

### 7.1 TradeoffBalance（Reactive対応版）

```typescript
export const TradeoffBalance: React.FC<BaseWidgetProps> = ({
  spec,
  onUpdate,
  onPortChange,
  getPortValue,
  initialPortValues,
}) => {
  const { emitPort, setCompleted, errorState } = useReactivePorts({
    widgetId: spec.id,
    onPortChange,
    getPortValue,
    initialPortValues,
  });

  // 重み変更時
  const handleWeightChange = useCallback((itemId: string, weight: number) => {
    controllerRef.current.setItemWeight(itemId, weight);

    // 後方互換
    if (onUpdate) {
      onUpdate(spec.id, controllerRef.current.getResult(spec.id).data);
    }

    // Reactive Port出力
    emitPort('balance', controllerRef.current.getBalanceValue());
    emitPort('direction', controllerRef.current.getBalanceDirection());
  }, [onUpdate, spec.id, emitPort]);

  // 完了状態の自動更新
  useEffect(() => {
    const canComplete = leftItems.length > 0 && rightItems.length > 0;
    setCompleted(canComplete, canComplete ? [] : ['両側に項目が必要']);
  }, [leftItems.length, rightItems.length, setCompleted]);

  return (
    <div>
      {errorState.hasError && (
        <div className="error-banner">
          {errorState.messages.join(', ')}
        </div>
      )}
      {/* ... UI ... */}
    </div>
  );
};
```

---

## 8. Widget定義例

### 8.1 TradeoffBalance

```typescript
export const TradeoffBalanceDefinition: WidgetDefinition = {
  id: 'tradeoff_balance',
  name: 'トレードオフ天秤',
  description: '複数の選択肢を重み付けし、バランスを視覚的に表示',
  stage: 'converge',
  ports: {
    inputs: [
      {
        id: 'weights',
        direction: 'in',
        dataType: 'number[]',
        description: '各項目の重み値配列',
        constraints: [
          { type: 'array', minLength: 2 },
          { type: 'range', min: 0, max: 1 }
        ],
        required: false
      },
      {
        id: 'items',
        direction: 'in',
        dataType: 'object[]',
        description: '比較対象の項目リスト {id, label, side}',
        required: true
      }
    ],
    outputs: [
      {
        id: 'balance',
        direction: 'out',
        dataType: 'number',
        description: 'バランススコア (-1.0〜1.0)',
        constraints: [{ type: 'range', min: -1, max: 1 }]
      },
      {
        id: 'direction',
        direction: 'out',
        dataType: 'string',
        description: '天秤の傾き方向',
        constraints: [{ type: 'enum', values: ['left', 'right', 'balanced'] }]
      }
    ]
  },
  metadata: {
    timing: 0.6,
    versatility: 0.7,
    bottleneck: ['comparison', 'decision']
  }
};
```

---

## 9. ファイル配置

```
server/
├── src/
│   ├── types/
│   │   └── WidgetDefinition.ts          # Widget定義型
│   ├── definitions/
│   │   └── widgets.ts                    # 全Widget定義
│   └── services/
│       └── WidgetDefinitionGenerator.ts  # プロンプト生成

concern-app/
├── src/
│   ├── types/
│   │   └── widget.types.ts               # BaseWidgetProps拡張
│   ├── hooks/
│   │   ├── useReactivePorts.ts           # Widget用Hook
│   │   └── useFlowValidation.ts          # バリデーションHook
│   └── services/
│       └── ui/
│           └── ReactiveBindingEngine.ts  # コアエンジン
```

---

## 10. 将来拡張

| 項目 | 現状 | 将来 |
|------|------|------|
| updateMode | debouncedのみ | realtime追加 |
| Transform | 同期実行 | Web Worker非同期化 |
| エラー通知 | インライン | トースト/モーダル |
| LLM Transform | 未実装 | 非同期API連携 |

---

## 11. 参照ドキュメント

- [DSL-Core-Spec-v3.0.md](./DSL-Core-Spec-v3.0.md)
- [plan-requirements-v3.0.md](./plan-requirements-v3.0.md)
- [phase4_detailed_tasks_rev2.md](../../project/phase4/phase4_detailed_tasks_rev2.md)
