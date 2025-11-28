# WidgetDefinition 仕様

**Version**: 3.0
**最終更新**: 2025-11-28

---

## 1. 概要

WidgetDefinitionはReactive Widgetのメタデータとポート定義を管理するシステムです。

### 1.1 用途

- LLMプロンプト生成時のWidget情報提供
- DependencyGraph検証（ポート互換性チェック）
- フロントエンドでのWidget描画情報

---

## 2. 型定義

### 2.1 WidgetDefinition

```typescript
interface WidgetDefinition {
  id: string;                    // Widget ID（システム全体で一意）
  name: string;                  // 表示名
  description: string;           // 説明（LLMプロンプト用）
  stage: WidgetStage;            // 対応ステージ
  ports: {
    inputs: ReactivePortDefinition[];
    outputs: ReactivePortDefinition[];
  };
  configSchema?: Record<string, unknown>;  // 設定スキーマ
  metadata: WidgetMetadata;
}
```

### 2.2 ReactivePortDefinition

```typescript
interface ReactivePortDefinition {
  id: string;                    // ポートID
  direction: 'in' | 'out';       // ポート方向
  dataType: PortDataType;        // データ型
  description: string;           // 説明
  defaultValue?: unknown;        // デフォルト値
  constraints?: PortConstraint[];// 値の制約
  required?: boolean;            // 必須フラグ
}
```

### 2.3 PortDataType

```typescript
type PortDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'number[]'
  | 'object'
  | 'object[]';
```

### 2.4 PortConstraint

```typescript
// 数値範囲制約
interface RangeConstraint {
  type: 'range';
  min?: number;
  max?: number;
}

// 列挙値制約
interface EnumConstraint {
  type: 'enum';
  values: (string | number)[];
}

// 配列制約
interface ArrayConstraint {
  type: 'array';
  minLength?: number;
  maxLength?: number;
  itemType?: PortDataType;
}

// パターン制約
interface PatternConstraint {
  type: 'pattern';
  regex: string;
}
```

### 2.5 WidgetMetadata

```typescript
interface WidgetMetadata {
  timing: number;       // タイミング適性 (0.0-1.0)
  versatility: number;  // 汎用性 (0.0-1.0)
  bottleneck: string[]; // 解消可能なボトルネック
}
```

---

## 3. WidgetStage

| ステージ | 説明 |
|---------|------|
| diverge | 発散フェーズ（アイデア展開） |
| organize | 整理フェーズ（構造化） |
| converge | 収束フェーズ（優先順位付け） |
| summary | まとめフェーズ（結論出力） |

---

## 4. 予約Port

### 4.1 定義

```typescript
const RESERVED_PORTS = {
  ERROR: '_error',
  COMPLETED: '_completed',
};
```

### 4.2 ErrorPortValue

```typescript
interface ErrorPortValue {
  hasError: boolean;      // エラーの有無
  messages: string[];     // エラーメッセージ配列
}
```

### 4.3 CompletedPortValue

```typescript
interface CompletedPortValue {
  isCompleted: boolean;          // 完了フラグ
  requiredFields?: string[];     // 未入力必須フィールド
}
```

---

## 5. ポートキー

### 5.1 形式

```
{widgetId}.{portId}
```

例: `tradeoff_balance.balance`, `widget_1._completed`

### 5.2 ユーティリティ関数

```typescript
// パース
function parsePortKey(portKey: string): { widgetId: string; portId: string }

// 生成
function createPortKey(widgetId: string, portId: string): PortKey

// 予約Port判定
function isReservedPort(portId: string): boolean
```

---

## 6. Widget定義例

### 6.1 TradeoffBalance

```typescript
const TradeoffBalanceDefinition: WidgetDefinition = {
  id: 'tradeoff_balance',
  name: 'トレードオフ天秤',
  description: '複数の選択肢を重み付けし、バランスを視覚的に表示。',
  stage: 'converge',
  ports: {
    inputs: [
      {
        id: 'items',
        direction: 'in',
        dataType: 'object[]',
        description: '比較対象の項目リスト',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'balance',
        direction: 'out',
        dataType: 'number',
        description: 'バランススコア（-100〜100）',
        constraints: [{ type: 'range', min: -100, max: 100 }],
      },
      {
        id: 'direction',
        direction: 'out',
        dataType: 'string',
        description: '天秤の傾き方向',
        constraints: [{ type: 'enum', values: ['left', 'right', 'balanced'] }],
      },
    ],
  },
  metadata: {
    timing: 0.6,
    versatility: 0.7,
    bottleneck: ['comparison', 'decision', 'tradeoff'],
  },
};
```

---

## 7. レジストリ

### 7.1 WidgetDefinitionRegistry

```typescript
type WidgetDefinitionRegistry = Record<string, WidgetDefinition>;
```

### 7.2 使用例

```typescript
const registry: WidgetDefinitionRegistry = {
  tradeoff_balance: TradeoffBalanceDefinition,
  dependency_mapping: DependencyMappingDefinition,
  // ...
};

// Widget取得
const definition = registry['tradeoff_balance'];
```

---

## 8. LLMプロンプト生成

### 8.1 WidgetDefinitionGenerator

Widget定義からLLM向けの説明テキストを生成。

```typescript
class WidgetDefinitionGenerator {
  generateWidgetDescription(definition: WidgetDefinition): string;
  generatePortsDescription(ports: WidgetDefinition['ports']): string;
  generateConstraintsDescription(constraints: PortConstraint[]): string;
}
```

### 8.2 出力例

```
Widget: トレードオフ天秤 (tradeoff_balance)
Stage: converge
Description: 複数の選択肢を重み付けし、バランスを視覚的に表示。

Input Ports:
- items (object[]): 比較対象の項目リスト [optional]

Output Ports:
- balance (number): バランススコア（-100〜100） [range: -100~100]
- direction (string): 天秤の傾き方向 [enum: left, right, balanced]
```

---

## 9. 関連ファイル

| ファイル | 説明 |
|---------|------|
| `server/src/types/WidgetDefinition.ts` | 型定義 |
| `server/src/definitions/widgets.ts` | Widget定義 |
| `server/src/generators/WidgetDefinitionGenerator.ts` | プロンプト生成 |
