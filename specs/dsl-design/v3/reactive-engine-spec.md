# ReactiveBindingEngine 詳細仕様

**Version**: 3.0
**最終更新**: 2025-11-28

---

## 1. 概要

ReactiveBindingEngineはWidget間のリアクティブなデータ連携を管理するエンジンです。

### 1.1 主要機能

- Debounce付きのPort値伝播
- 循環依存の検出・防止
- FlowValidationState（完了状態追跡）
- Transform関数の実行

### 1.2 コンポーネント構成

```
ReactiveBindingEngine
├── DependencyGraph      # 依存関係グラフ管理
└── DependencyExecutor   # 変換・実行エンジン
```

---

## 2. アーキテクチャ

### 2.1 クラス構成

```
concern-app/src/services/ui/
├── ReactiveBindingEngine.ts  # メインエンジン
├── DependencyGraph.ts        # グラフ構造管理
└── DependencyExecutor.ts     # 変換実行
```

### 2.2 データフロー

```
Widget A (source)
    │
    ▼ updatePort()
ReactiveBindingEngine
    │
    ├── Debounce (300ms default)
    │
    ▼ executePropagation()
DependencyGraph.getDependencies()
    │
    ▼
DependencyExecutor.execute()
    │
    ▼ transform/validate
Widget B (target)
    │
    ▼ 連鎖伝播（必要な場合）
Widget C ...
```

---

## 3. API仕様

### 3.1 コンストラクタ

```typescript
constructor(spec: DependencyGraphSpec, config?: Partial<EngineConfig>)
```

**パラメータ**:
- `spec`: 依存関係グラフの仕様
- `config`: オプション設定

**例外**:
- 循環依存検出時に `Error` をスロー

### 3.2 Port操作

#### initPort
```typescript
initPort(portKey: string, value: unknown): void
```
Debounceなしで即座にPort値を設定。初期化時に使用。

#### updatePort
```typescript
updatePort(portKey: string, value: unknown): void
```
Debounce付きでPort値を更新。通常の値変更に使用。

#### getPortValue
```typescript
getPortValue(portKey: string): unknown
```
Port値を取得。

#### getAllPortValues
```typescript
getAllPortValues(): Map<string, unknown>
```
全Port値のコピーを取得。

### 3.3 コールバック設定

#### setOnPropagate
```typescript
setOnPropagate(callback: PropagationCallback): void
```
伝播発生時のコールバックを設定。

#### setOnValidationError
```typescript
setOnValidationError(callback: ValidationErrorCallback): void
```
バリデーションエラー時のコールバックを設定。

#### setOnValidationStateChange
```typescript
setOnValidationStateChange(callback: (state: FlowValidationState) => void): void
```
バリデーション状態変更時のコールバックを設定。

### 3.4 FlowValidation

#### getFlowValidationState
```typescript
getFlowValidationState(): FlowValidationState
```
現在のフローバリデーション状態を取得。

### 3.5 ライフサイクル

#### flush
```typescript
flush(): void
```
全てのDebounceタイマーを即座に実行。

#### dispose
```typescript
dispose(): void
```
エンジンを破棄し、リソースを解放。

---

## 4. 設定

### 4.1 EngineConfig

```typescript
interface EngineConfig {
  defaultDebounceMs: number;    // デフォルト: 300
  maxPropagationDepth: number;  // デフォルト: 10
  debug: boolean;               // デフォルト: false
}
```

| 設定 | デフォルト | 説明 |
|------|-----------|------|
| defaultDebounceMs | 300 | Debounce時間（ミリ秒） |
| maxPropagationDepth | 10 | 最大伝播深度（無限ループ防止） |
| debug | false | デバッグログ出力 |

---

## 5. 型定義

### 5.1 PropagationEvent

```typescript
interface PropagationEvent {
  sourcePortKey: string;   // ソースポートキー
  targetPortKey: string;   // ターゲットポートキー
  value: unknown;          // 伝播後の値
  timestamp: number;       // タイムスタンプ
}
```

### 5.2 FlowValidationState

```typescript
interface FlowValidationState {
  canProceed: boolean;                      // 次へ進めるか
  widgetErrors: Map<string, ErrorPortValue>; // Widget別エラー
  incompleteWidgets: string[];              // 未完了Widget
}
```

### 5.3 ErrorPortValue / CompletedPortValue

```typescript
interface ErrorPortValue {
  hasError: boolean;
  messages: string[];
}

interface CompletedPortValue {
  isCompleted: boolean;
  requiredFields?: string[];
}
```

---

## 6. 予約Port

### 6.1 定数

```typescript
const RESERVED_PORTS = {
  ERROR: '_error',
  COMPLETED: '_completed',
};
```

### 6.2 動作

| Port | 用途 | Debounce | 伝播 |
|------|------|----------|------|
| `_error` | エラー状態 | なし | なし |
| `_completed` | 完了状態 | なし | なし |

予約Portは即座にバリデーション状態を更新し、他Widgetへの伝播は行わない。

---

## 7. DependencyGraph

### 7.1 機能

- 依存関係の追加・削除
- 循環依存の検出（DFSアルゴリズム）
- トポロジカルソート
- 依存関係の取得

### 7.2 主要メソッド

```typescript
addDependency(spec: DependencySpec): void
removeDependency(source: string, target: string): boolean
getDependencies(sourcePortKey: string): DependencySpec[]
detectCycle(): boolean
getTopologicalOrder(): string[]
```

---

## 8. DependencyExecutor

### 8.1 機能

- 依存関係の実行（update/validate）
- JavaScript式の安全な評価
- 組み込み変換関数の実行

### 8.2 変換タイプ

| タイプ | 説明 |
|--------|------|
| `passthrough` | 値をそのまま伝播 |
| `javascript` | JavaScript式で変換 |
| `transform` | 組み込み変換関数 |

### 8.3 組み込み変換関数

| 関数名 | 説明 |
|--------|------|
| `calculate_balance` | 天秤バランス計算 |
| `extract_rankings` | ランキング抽出 |
| `summarize_matrix` | マトリックス要約 |

---

## 9. 使用例

### 9.1 基本的な使用

```typescript
const spec: DependencyGraphSpec = {
  dependencies: [
    {
      source: 'widgetA.output',
      target: 'widgetB.input',
      mechanism: 'update',
      relationship: { type: 'passthrough' },
    },
  ],
};

const engine = new ReactiveBindingEngine(spec);

// 伝播コールバック設定
engine.setOnPropagate((events) => {
  console.log('Propagated:', events);
});

// Port初期化
engine.initPort('widgetA.output', 'initial');

// Port更新（Debounce付き）
engine.updatePort('widgetA.output', 'updated');
```

### 9.2 FlowValidation

```typescript
engine.setOnValidationStateChange((state) => {
  if (state.canProceed) {
    enableNextButton();
  } else {
    disableNextButton();
  }
});

// Widget完了を通知
engine.updatePort('widgetA._completed', { isCompleted: true });
```

---

## 10. 関連ファイル

| ファイル | 説明 |
|---------|------|
| `concern-app/src/services/ui/ReactiveBindingEngine.ts` | メインエンジン |
| `concern-app/src/services/ui/DependencyGraph.ts` | グラフ管理 |
| `concern-app/src/services/ui/DependencyExecutor.ts` | 実行エンジン |
| `concern-app/src/types/ui-spec.types.ts` | 型定義 |
| `concern-app/src/types/dependency.types.ts` | 依存関係型定義 |
| `concern-app/src/hooks/useFlowValidation.ts` | Reactフック |
| `concern-app/src/hooks/useReactivePorts.ts` | Reactフック |
