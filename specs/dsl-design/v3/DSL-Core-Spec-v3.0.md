# DSL Core Specification v3.0
## 基盤言語仕様

**Version**: 3.0
**Date**: 2025-11-14
**Status**: Draft
**Purpose**: 思考整理アプリケーションのための基盤DSL言語仕様

---

## 1. 概要

本仕様書は、思考整理アプリケーションで使用するDSL（Domain Specific Language）の基盤的な言語仕様を定義する。この基盤仕様はすべてのフェーズ（Capture、Plan、Breakdown）で共通して使用される。

### 1.1 設計原則

- **シンプルさ**: 思考整理に必要な最小限の構造のみを定義
- **拡張性**: フェーズごとの要求仕様で拡張可能な設計
- **型安全性**: 明確な型定義によるデータ整合性の保証

### 1.2 層構造での位置づけ

```
Layer 1: 基盤言語仕様（本書）← 現在の文書
  ├── Layer 2: フェーズ別要求仕様
  └── Layer 3: 実装例とパターン
```

---

## 2. 基本型定義

### 2.1 プリミティブ型

#### SVAL (Scalar Value)
単一の値を表現する型。

```typescript
type SVAL = string | number | boolean | null;
```

**使用例**:
```json
{
  "name": "心配事のタイトル",     // string
  "priority": 5,                  // number
  "isResolved": false,            // boolean
  "deadline": null                // null
}
```

#### ARRY (Array)
同一型の値の配列。

```typescript
type ARRY<T> = T[];
```

**使用例**:
```json
{
  "options": ["選択肢1", "選択肢2", "選択肢3"],
  "scores": [0.8, 0.6, 0.9, 0.7]
}
```

#### PNTR (Pointer)
他のEntityやAttributeへの参照。依存関係を表現。

```typescript
type PNTR = {
  ref: string;      // 参照先のID
  type: "entity" | "attribute";
};
```

**使用例**:
```json
{
  "ref": "concern_001",
  "type": "entity"
}
```

#### DICT (Dictionary)
キー・バリューペアのコレクション。メタデータに使用。

```typescript
type DICT<T> = {
  [key: string]: T;
};
```

**使用例**:
```json
{
  "metadata": {
    "createdAt": "2025-11-14",
    "phase": "capture",
    "version": "3.0"
  }
}
```

---

## 3. 構造定義

### 3.1 Entity（エンティティ）

データの基本単位。UIコンポーネントや情報の塊を表現。

```typescript
interface Entity {
  id: string;                    // 一意識別子
  type: string;                  // エンティティタイプ
  attributes: Attribute[];       // 属性リスト
  metadata?: DICT<SVAL>;        // メタデータ（オプション）
}
```

### 3.2 Attribute（属性）

エンティティの特性を定義。

```typescript
interface Attribute {
  name: string;                  // 属性名
  value: SVAL | ARRY<SVAL> | PNTR | DICT<SVAL>;
  type: "sval" | "arry" | "pntr" | "dict";
  constraints?: Constraint[];    // 制約（オプション）
}
```

### 3.3 Constraint（制約）

属性値の妥当性を定義。

```typescript
interface Constraint {
  type: "required" | "min" | "max" | "pattern" | "enum";
  value: any;
  message?: string;             // エラーメッセージ
}
```

---

## 4. 依存関係

### 4.1 Dependency（依存）

エンティティや属性間の関係を定義。

```typescript
interface Dependency {
  source: PNTR;                  // 依存元
  target: PNTR;                  // 依存先
  type: DependencyType;          // 依存タイプ
  condition?: Condition;         // 発火条件（オプション）
}
```

### 4.2 DependencyType（依存タイプ）

```typescript
enum DependencyType {
  UPDATE = "update",             // 値の更新
  VISIBILITY = "visibility",     // 表示/非表示
  VALIDATION = "validation",     // 検証
  CALCULATION = "calculation"    // 計算
}
```

### 4.3 Condition（条件）

```typescript
interface Condition {
  expression: string;            // 条件式
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "contains";
  value: any;
}
```

---

## 5. データスキーマ

### 5.1 DataSchema

データ構造全体を定義。

```typescript
interface DataSchema {
  version: string;               // スキーマバージョン
  phase: "capture" | "plan" | "breakdown";
  entities: Entity[];            // エンティティリスト
  dependencies?: Dependency[];   // 依存関係（オプション）
  metadata?: DICT<SVAL>;        // メタデータ
}
```

---

## 6. UIスペック連携

### 6.1 UISpec

UIコンポーネントの仕様を定義。

```typescript
interface UISpec {
  version: string;
  phase: "capture" | "plan" | "breakdown";
  components: UIComponent[];
  layout?: Layout;
  theme?: Theme;
}
```

### 6.2 UIComponent

```typescript
interface UIComponent {
  id: string;
  type: string;                  // "text-input" | "radio" | "select" | ...
  dataBinding: PNTR;            // データスキーマへの参照
  props?: DICT<any>;            // UIコンポーネント固有のプロパティ
  visibility?: Condition;        // 表示条件
}
```

---

## 7. 構文ルール

### 7.1 識別子（ID）の命名規則

- 英数字とアンダースコア（_）のみ使用可能
- 数字で始まってはいけない
- 大文字小文字を区別する
- 推奨フォーマット: `{phase}_{type}_{sequence}`
  - 例: `capture_concern_001`, `plan_option_003`

### 7.2 参照パスの記法

```
entity.attribute
entity[index].attribute
```

**例**:
- `concern_001.title` - エンティティの属性を参照
- `options[0].value` - 配列要素の属性を参照

### 7.3 条件式の記法

```
{source} {operator} {value}
```

**例**:
- `priority > 3`
- `status eq "completed"`
- `tags contains "urgent"`

---

## 8. エラーハンドリング

### 8.1 エラータイプ

```typescript
enum ErrorType {
  SYNTAX_ERROR = "syntax_error",           // 構文エラー
  TYPE_ERROR = "type_error",               // 型不一致
  REFERENCE_ERROR = "reference_error",     // 参照エラー
  CONSTRAINT_ERROR = "constraint_error",   // 制約違反
  DEPENDENCY_ERROR = "dependency_error"    // 依存関係エラー
}
```

### 8.2 エラーレスポンス

```typescript
interface ErrorResponse {
  type: ErrorType;
  message: string;
  location?: {
    entity?: string;
    attribute?: string;
    line?: number;
  };
  suggestion?: string;           // 修正提案
}
```

---

## 9. バージョニング

### 9.1 セマンティックバージョニング

- **Major**: 後方互換性のない変更
- **Minor**: 後方互換性のある機能追加
- **Patch**: バグ修正

### 9.2 マイグレーション

旧バージョンからの移行は、各フェーズの要求仕様書で定義される。

---

## 10. 拡張ポイント

以下の要素は、Layer 2（フェーズ別要求仕様）で拡張される：

1. **UIコンポーネントタイプ**: 各フェーズで利用可能なコンポーネント
2. **制約タイプ**: フェーズ特有の検証ルール
3. **メタデータ**: フェーズ固有の追加情報
4. **依存関係パターン**: フェーズ特有の相互作用

---

## 付録A: 最小限の実装例

```json
{
  "version": "3.0",
  "phase": "capture",
  "entities": [
    {
      "id": "concern_001",
      "type": "concern",
      "attributes": [
        {
          "name": "title",
          "value": "転職すべきか悩んでいる",
          "type": "sval",
          "constraints": [
            {
              "type": "required",
              "value": true,
              "message": "タイトルは必須です"
            }
          ]
        },
        {
          "name": "category",
          "value": "career",
          "type": "sval"
        }
      ]
    }
  ]
}
```

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| 3.0 | 2025-11-14 | 初版作成（3層構造の基盤層として） |

---

## 次のステップ

この基盤仕様を元に、以下の要求仕様書を参照してください：

- [Capture Requirements v3.0](./capture-requirements-v3.0.md)
- [Plan Requirements v3.0](./plan-requirements-v3.0.md)
- [Breakdown Requirements v3.0](./breakdown-requirements-v3.0.md)