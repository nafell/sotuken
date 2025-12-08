# DSL Specification v4.0

**Version**: 4.0
**Date**: 2025-12-02
**Status**: Draft
**Based on**: [Jelly Framework](https://arxiv.org/html/2503.04084v1), [DSLv4_review_minutes.md](../../discussions/DSLv4_review_minutes.md)

---

## 目次

1. [概要](#1-概要)
2. [アーキテクチャ](#2-アーキテクチャ)
3. [Layer 1: ORS + DpG（Task-Driven Data Model層）](#3-layer-1-ors--dpgtask-driven-data-model層)
4. [Layer 2: UISpec + ReactiveBinding（UI仕様層）](#4-layer-2-uispec--reactivebindingui仕様層)
5. [Layer 3: Widget Definitions（Widget定義層）](#5-layer-3-widget-definitionswidget定義層)
6. [LLM呼び出し構成](#6-llm呼び出し構成)
7. [アプリケーションフロー](#7-アプリケーションフロー)
8. [型システム](#8-型システム)
9. [generatedValue（将来拡張）](#9-generatedvalue将来拡張)
10. [Jellyとの対応関係](#10-jellyとの対応関係)
11. [付録A: 用語対応表（v3→v4）](#11-付録a-用語対応表v3v4)

---

## 1. 概要

### 1.1 目的

DSL v4は、CBTベースの思考整理アプリケーションにおいて、LLMが動的にUI構造を生成するためのドメイン固有言語仕様である。

### 1.2 設計原則

1. **Jelly準拠**: 3層DSL構造、3段階LLM呼び出しを踏襲
2. **責務分離**: Task-Driven Data Model（ORS+DpG）とUI仕様（UISpec+ReactiveBinding）を明確に分離
3. **型安全性**: 層ごとに適切な型系統を使用
4. **拡張性**: Widget追加、generatedValue等の将来拡張に対応

### 1.3 v3からの主要変更点

| 観点 | v3 | v4 |
|------|-----|-----|
| LLM呼び出し | 1段階 | 3段階 |
| データモデル | OODM（形骸化） | ORS（活用強化） |
| DpG | UISpec内 | TDDM層に移動 |
| ReactiveBinding | DpGと混在 | UISpec層に分離 |
| Widget選定 | ステージ固定 | 動的選定 |
| complexity | なし | 新規追加 |

**用語変更**: v3までの「OODM」はv4で「ORS」に変更。詳細は[付録A](#11-付録a-用語対応表v3v4)を参照。

---

## 2. アーキテクチャ

### 2.1 3層構造

```
┌─────────────────────────────────────────────────────────────────┐
│                    DSL Definition（静的定義）                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Widget Definitions                                    │
│    - 13種プリセットWidgetのメタデータ・ポート定義                  │
│    - complexity, timing, versatility, bottleneck                │
└─────────────────────────────────────────────────────────────────┘
                              ↓ LLMプロンプトに含める
┌─────────────────────────────────────────────────────────────────┐
│                    DSL Instance（動的生成）                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: ORS + DpG（Task-Driven Data Model層）                  │
│    - Entity/Attributeによるデータ構造定義（ORS）                   │
│    - DependencyGraphによるデータ間依存関係                        │
│    - 抽象型（SVAL/ARRY/PNTR/DICT）を使用                         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: UISpec + ReactiveBinding（UI仕様層）                   │
│    - WidgetSpec配列によるUI構成                                  │
│    - ReactiveBindingによるWidget間連携                           │
│    - 具体型（string/object[]等）を使用                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 データフロー

```
【第1段階】Widget選定
    入力: ConcernText, BottleneckType, Widget Definitions
    出力: WidgetSelectionResult（4ステージ分）
              ↓
【第2段階】ORS + DpG生成
    入力: ConcernText, SelectedWidgets, PreviousStageResult
    出力: ORS Instance（Entity, Attribute, DependencyGraph）
              ↓
【第3段階】UISpec生成
    入力: ORS Instance, SelectedWidgets
    出力: UISpec Instance（WidgetSpec, ReactiveBinding）
              ↓
【レンダリング】
    UIRendererがUISpec Instanceを解釈してReact UIを生成
```

---

## 3. Layer 1: ORS + DpG（Task-Driven Data Model層）

### 3.1 ORS（Object-Relational Schema）

ユーザーの悩みに関するデータ構造を定義する。Jelly Framework の ORS に対応。

```typescript
interface ORS {
  version: string;                    // "4.0"
  entities: Entity[];                 // エンティティ配列
  dependencyGraph: DependencyGraph;   // データ間依存関係
  metadata?: DICT<SVAL>;
}
```

### 3.2 Entity

データの基本単位。

```typescript
interface Entity {
  id: string;                         // 一意識別子（例: "brainstorm_data"）
  type: string;                       // エンティティタイプ
  attributes: Attribute[];            // 属性リスト
  metadata?: DICT<SVAL>;
}
```

### 3.3 Attribute

エンティティの属性を定義。**抽象型**を使用する。

```typescript
interface Attribute {
  name: string;                       // 属性名
  structuralType: StructuralType;     // 構造的性質（抽象型）
  valueType?: ConcreteType;           // 値の具体型（SVALの場合）
  itemType?: StructuralType;          // 要素の構造型（ARRY/DICTの場合）
  itemValueType?: ConcreteType;       // 要素の具体型
  ref?: string;                       // 参照先（PNTRの場合）
  schema?: Record<string, any>;       // 複合型のスキーマ
  constraints?: Constraint[];
  generation?: GenerationSpec;        // generatedValue用（将来拡張）
}

type StructuralType = 'SVAL' | 'ARRY' | 'PNTR' | 'DICT';
type ConcreteType = 'string' | 'number' | 'boolean' | 'date' | 'object';
```

### 3.4 DependencyGraph

データ間の依存関係を定義。

```typescript
interface DependencyGraph {
  dependencies: DataDependency[];
  metadata?: {
    version: string;
    generatedAt: number;
  };
}

interface DataDependency {
  id: string;                         // 依存関係ID
  source: string;                     // "entityId.attributeName"
  target: string;                     // "entityId.attributeName"
  mechanism: DependencyMechanism;
  relationship: RelationshipSpec;
}

type DependencyMechanism = 'validate' | 'update';

interface RelationshipSpec {
  type: 'javascript' | 'transform' | 'llm';
  javascript?: string;                // JavaScriptコード
  transform?: TransformFunction;      // 組み込み変換関数
  llmPrompt?: string;                 // LLMプロンプト
}
```

### 3.5 ORS Instance例

```json
{
  "version": "4.0",
  "entities": [
    {
      "id": "brainstorm_data",
      "type": "idea_collection",
      "attributes": [
        {
          "name": "ideas",
          "structuralType": "ARRY",
          "itemType": "DICT",
          "schema": {
            "id": "string",
            "text": "string",
            "color": "string"
          }
        }
      ]
    },
    {
      "id": "sorting_data",
      "type": "categorized_ideas",
      "attributes": [
        {
          "name": "source_ideas",
          "structuralType": "PNTR",
          "ref": "brainstorm_data.ideas"
        },
        {
          "name": "categories",
          "structuralType": "DICT",
          "itemType": "ARRY",
          "itemValueType": "string"
        }
      ]
    }
  ],
  "dependencyGraph": {
    "dependencies": [
      {
        "id": "dep_001",
        "source": "brainstorm_data.ideas",
        "target": "sorting_data.source_ideas",
        "mechanism": "update",
        "relationship": {
          "type": "javascript",
          "javascript": "return source;"
        }
      }
    ]
  }
}
```

---

## 4. Layer 2: UISpec + ReactiveBinding（UI仕様層）

### 4.1 UISpec

LLMが生成する画面全体のUI仕様。

```typescript
interface UISpec {
  sessionId: string;
  stage: StageType;
  widgets: WidgetSpec[];              // Widget仕様配列
  reactiveBindings: ReactiveBindingSpec;  // Widget間連携
  layout: ScreenLayout;
  metadata: UISpecMetadata;
}

type StageType = 'diverge' | 'organize' | 'converge' | 'summary';
```

### 4.2 WidgetSpec

個別Widgetの仕様。**具体型**を使用する。

```typescript
interface WidgetSpec {
  id: string;                         // Widget ID
  component: WidgetComponentType;     // プリセットWidgetのID
  position: number;                   // 表示順序
  layout?: LayoutType;
  config: WidgetConfig;               // Widget固有の設定
  dataBindings: DataBindingSpec[];    // ORSへのバインディング
  metadata: WidgetSpecMetadata;
}

interface DataBindingSpec {
  portId: string;                     // Widget Port ID
  entityAttribute: string;            // "entityId.attributeName"
  direction: 'in' | 'out' | 'inout';
}

interface WidgetSpecMetadata {
  purpose: string;                    // このWidgetの使用目的
  description?: string;
}
```

### 4.3 ReactiveBindingSpec

Widget間のUI連携を定義。

```typescript
interface ReactiveBindingSpec {
  bindings: ReactiveBinding[];
  metadata?: {
    version: string;
    generatedAt: number;
  };
}

interface ReactiveBinding {
  id: string;
  source: string;                     // "widgetId.portId"
  target: string;                     // "widgetId.portId"
  mechanism: 'validate' | 'update';
  relationship: RelationshipSpec;
  updateMode: UpdateMode;
  complexityCheck?: boolean;          // complexity閾値チェック済みフラグ
}

type UpdateMode = 'realtime' | 'debounced' | 'on_confirm';
```

### 4.4 UISpec Instance例

```json
{
  "sessionId": "session_001",
  "stage": "organize",
  "widgets": [
    {
      "id": "stage_summary_1",
      "component": "stage_summary",
      "position": 0,
      "config": {
        "previousStages": []
      },
      "dataBindings": [],
      "metadata": {
        "purpose": "前ステージの振り返り"
      }
    },
    {
      "id": "brainstorm_1",
      "component": "brainstorm_cards",
      "position": 1,
      "config": {
        "prompt": "転職に関するアイデアを書き出してください"
      },
      "dataBindings": [
        {
          "portId": "cards",
          "entityAttribute": "brainstorm_data.ideas",
          "direction": "out"
        }
      ],
      "metadata": {
        "purpose": "転職に関する選択肢や考えを発散させる"
      }
    },
    {
      "id": "card_sorting_1",
      "component": "card_sorting",
      "position": 2,
      "config": {
        "categories": ["メリット", "デメリット", "検討事項"]
      },
      "dataBindings": [
        {
          "portId": "inputCards",
          "entityAttribute": "sorting_data.source_ideas",
          "direction": "in"
        },
        {
          "portId": "categories",
          "entityAttribute": "sorting_data.categories",
          "direction": "out"
        }
      ],
      "metadata": {
        "purpose": "アイデアをカテゴリ別に整理する"
      }
    }
  ],
  "reactiveBindings": {
    "bindings": [
      {
        "id": "rb_001",
        "source": "brainstorm_1.cards",
        "target": "card_sorting_1.inputCards",
        "mechanism": "update",
        "relationship": {
          "type": "javascript",
          "javascript": "return source;"
        },
        "updateMode": "debounced"
      }
    ]
  },
  "layout": {
    "type": "sequential"
  },
  "metadata": {
    "generatedAt": 1733140800000,
    "llmModel": "gpt-5-codex",
    "version": "4.0"
  }
}
```

---

## 5. Layer 3: Widget Definitions（Widget定義層）

### 5.1 WidgetDefinition

プリセットWidgetの静的定義。

```typescript
interface WidgetDefinition {
  id: string;                         // Widget ID
  name: string;                       // 表示名
  description: string;                // 説明（LLMプロンプト用）
  stage: WidgetStage[];               // 対応ステージ（複数可）
  ports: {
    inputs: PortDefinition[];
    outputs: PortDefinition[];
  };
  configSchema?: JSONSchema;
  metadata: WidgetDefinitionMetadata;
  summarizationPrompt: string;        // 操作内容言語化プロンプト【新規】
}

interface WidgetDefinitionMetadata {
  timing: number;                     // 0.0-1.0
  versatility: number;                // 0.0-1.0
  complexity: number;                 // 0.0-1.0【新規】
  bottleneck: string[];
}

interface PortDefinition {
  id: string;
  direction: 'in' | 'out';
  dataType: ConcreteType | ConcreteType[];  // 具体型
  description: string;
  defaultValue?: unknown;
  constraints?: PortConstraint[];
  required?: boolean;
}
```

### 5.2 Widget一覧（13種）

| ID | 名称 | ステージ | complexity | timing | versatility |
|----|------|---------|------------|--------|-------------|
| `stage_summary` | ステージサマリー | all | 0.1 | - | 1.0 |
| `emotion_palette` | 感情パレット | diverge | 0.3 | 0.15 | 0.6 |
| `brainstorm_cards` | ブレインストームカード | diverge | 0.2 | 0.1 | 0.95 |
| `question_card_chain` | 質問カードチェーン | diverge | 0.5 | 0.2 | 0.8 |
| `card_sorting` | カードソート | organize | 0.4 | 0.35 | 0.85 |
| `dependency_mapping` | 依存関係マップ | organize | 0.8 | 0.4 | 0.8 |
| `swot_analysis` | SWOT分析 | organize | 0.5 | 0.3 | 0.9 |
| `mind_map` | マインドマップ | organize | 0.7 | 0.2 | 0.9 |
| `matrix_placement` | マトリクス配置 | converge | 0.5 | 0.5 | 0.85 |
| `tradeoff_balance` | トレードオフ天秤 | converge | 0.6 | 0.6 | 0.7 |
| `priority_slider_grid` | 優先度スライダー | converge | 0.4 | 0.7 | 0.75 |
| `timeline_slider` | タイムラインスライダー | converge | 0.5 | 0.5 | 0.7 |
| `structured_summary` | 構造化サマリー | summary | 0.3 | 0.9 | 0.6 |

**注**: complexity値は暫定値。実験・評価により調整予定。

### 5.3 complexity閾値ルール

```typescript
const COMPLEXITY_RULES = {
  // ReactiveBindingのtargetにできるcomplexityの上限
  maxTargetComplexity: 0.7,

  // 1ステージ内のWidget組み合わせ制限
  maxStageComplexitySum: 1.5,

  // 高complexity Widgetの最大数（1ステージあたり）
  maxHighComplexityWidgets: 1,  // complexity > 0.6
};
```

### 5.4 summarizationPrompt例

```typescript
const SUMMARIZATION_PROMPTS: Record<string, string> = {
  emotion_palette: `
    選択された感情を「{emotion}({intensity}%)」形式でリスト化してください。
    強度が高い順に並べてください。
  `,
  brainstorm_cards: `
    作成されたカードの内容を箇条書きで列挙してください。
    カードの色情報は省略してください。
  `,
  card_sorting: `
    カテゴリごとに分類されたカードを以下の形式で出力してください：
    【{category}】: {items}
  `,
  // ... 他のWidget
};
```

---

## 6. LLM呼び出し構成

### 6.1 3段階構成

```
┌─────────────────────────────────────────────────────────────────┐
│ 【第1段階】Widget選定                                            │
│   タスク分類: 汎用タスク                                          │
│   入力:                                                          │
│     - ConcernText（ユーザーの悩み）                               │
│     - BottleneckType（診断されたボトルネック）                     │
│     - Widget Definitions（13種全て）                             │
│   出力: WidgetSelectionResult                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 【第2段階】ORS + DpG生成                                         │
│   タスク分類: 構造化タスク                                        │
│   入力:                                                          │
│     - ConcernText                                                │
│     - SelectedWidgets（第1段階の出力から該当ステージ分）           │
│     - PreviousStageResult（前ステージのユーザー操作結果）          │
│   出力: ORS Instance                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 【第3段階】UISpec生成                                            │
│   タスク分類: 構造化タスク                                        │
│   入力:                                                          │
│     - ORS Instance（第2段階の出力）                              │
│     - SelectedWidgets                                            │
│   出力: UISpec Instance                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 WidgetSelectionResult

```typescript
interface WidgetSelectionResult {
  stages: {
    diverge: StageSelection;
    organize: StageSelection;
    converge: StageSelection;
    summary: StageSelection;
  };
  rationale: string;                  // 全体の選定理由
  metadata: {
    generatedAt: number;
    llmModel: string;
    bottleneckType: string;
  };
}

interface StageSelection {
  widgets: SelectedWidget[];
  purpose: string;                    // このステージの分析目的
  target: string;                     // 分析対象
}

interface SelectedWidget {
  widgetId: WidgetComponentType;
  purpose: string;                    // このWidgetの使用目的
  order: number;                      // ステージ内での表示順序
  suggestedConfig?: Record<string, any>;  // 推奨設定
}
```

### 6.3 タスク別モデル設定

```typescript
interface LLMTaskConfig {
  taskType: LLMTaskType;
  model: ModelConfig;
  promptTemplate: string;
  outputSchema?: JSONSchema;
  maxRetries: number;
  timeout: number;
}

type LLMTaskType =
  | 'capture_diagnosis'    // Captureフェーズ診断
  | 'widget_selection'     // Widget選定
  | 'ors_generation'       // ORS生成
  | 'uispec_generation'    // UISpec生成
  | 'summary_generation';  // まとめ生成

// 実験パターン設定例
const EXPERIMENT_PATTERNS = {
  A: {  // ベースライン
    capture_diagnosis: 'gpt-5',
    widget_selection: 'gpt-5',
    ors_generation: 'gpt-5',
    uispec_generation: 'gpt-5',
    summary_generation: 'gpt-5',
  },
  B: {  // 低コスト全体
    capture_diagnosis: 'gpt-5-mini',
    widget_selection: 'gpt-5-mini',
    ors_generation: 'gpt-5-mini',
    uispec_generation: 'gpt-5-mini',
    summary_generation: 'gpt-5-mini',
  },
  C: {  // 構造化特化
    capture_diagnosis: 'gpt-5',
    widget_selection: 'gpt-5',
    ors_generation: 'gpt-5-codex',
    uispec_generation: 'gpt-5-codex',
    summary_generation: 'gpt-5',
  },
  D: {  // 構造化タスクコスト削減
    capture_diagnosis: 'gpt-5',
    widget_selection: 'gpt-5',
    ors_generation: 'gpt-5-mini',
    uispec_generation: 'gpt-5-mini',
    summary_generation: 'gpt-5',
  },
};
```

---

## 7. アプリケーションフロー

### 7.1 全体フロー

```
┌─────────────────────────────────────────────────────────────────┐
│ Captureフェーズ                                                  │
│   ユーザー: 悩みを入力                                           │
│   LLM: ボトルネック診断（タスク1）                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 計画提示                                                         │
│   LLM: 4ステージWidget選定（タスク2）                            │
│   UI: 計画提示画面を表示                                         │
│   ユーザー: 「この計画で始める」をクリック                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Planフェーズ                                                     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ diverge（探索・発散）                                    │   │
│   │   1. stage_summary表示（初回は空）                       │   │
│   │   2. LLM: ORS+DpG生成（タスク3）                        │   │
│   │   3. LLM: UISpec生成（タスク4）                         │   │
│   │   4. UI: Widgetレンダリング                             │   │
│   │   5. ユーザー: 操作                                      │   │
│   │   6. [次へ] or [スキップ]                               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ organize（評価・整理）                                   │   │
│   │   1. stage_summary表示（divergeの要約）                  │   │
│   │   2-6. 同上                                             │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ converge（決定・収束）                                   │   │
│   │   1. stage_summary表示（diverge+organizeの要約）         │   │
│   │   2-6. 同上                                             │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ summary（まとめ確認）                                    │   │
│   │   1. stage_summary表示（全ステージの要約）               │   │
│   │   2-6. 同上                                             │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Breakdownフェーズ                                                │
│   LLM: まとめ生成（タスク5）                                     │
│   UI: 結果表示                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 ナビゲーション

| 操作 | 挙動 |
|------|------|
| **次へ** | 現在のステージを完了し、次のステージへ進む |
| **スキップ** | 現在のWidgetを空欄のまま次へ進む |
| **戻る** | 前のステージに戻る。UI・操作内容は保持。戻った先より後のステージのデータは破棄 |

### 7.3 stage_summary Widget

```typescript
interface StageSummaryConfig {
  previousStages: StageSummaryItem[];
}

interface StageSummaryItem {
  stageId: StageType;
  stageName: string;                  // 「探索・発散」等
  widgets: WidgetSummaryItem[];
  skipped: boolean;
}

interface WidgetSummaryItem {
  widgetId: string;
  widgetType: WidgetComponentType;
  widgetName: string;
  summary: string;                    // LLMが生成した操作内容の要約
  skipped: boolean;
}
```

---

## 8. 型システム

### 8.1 抽象型（ORS層 / TDDM層）

```typescript
// 構造的性質を表す型
type SVAL = string | number | boolean | null;
type ARRY<T> = T[];
type PNTR = { ref: string };          // entityId.attributeName への参照
type DICT<T> = { [key: string]: T };
```

### 8.2 具体型（UISpec層）

```typescript
// Portで扱うデータ型
type PortDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'number[]'
  | 'object'
  | 'object[]';
```

### 8.3 型の使い分け

| 層 | 使用する型 | 理由 |
|----|-----------|------|
| ORS（TDDM層） | 抽象型 | データの構造的性質を表現。PNTRで参照関係を明示 |
| UISpec | 具体型 | レンダラーが直接扱える形式 |

### 8.4 PNTR活用例

```json
// ORS内でのPNTR使用
{
  "entities": [
    {
      "id": "brainstorm_data",
      "attributes": [
        { "name": "ideas", "structuralType": "ARRY", "itemType": "DICT" }
      ]
    },
    {
      "id": "sorting_data",
      "attributes": [
        {
          "name": "source_ideas",
          "structuralType": "PNTR",
          "ref": "brainstorm_data.ideas"
        }
      ]
    }
  ]
}
```

---

## 9. generatedValue

### 9.1 概要

generatedValueは、LLMがUISpec生成時（第3段階）にWidget内のコンテンツを動的に生成する仕組み。Cold Start Problem（空のWidgetから始める認知負荷）を解決し、ユーザーの思考を促すきっかけを提供する。

### 9.2 分類

| 分類 | 説明 | 例 | 実装状況 |
|------|------|-----|----------|
| A. ラベル・説明文 | UIの「枠」を埋めるもの | 感情ラベル、象限説明文 | v4.1予定 |
| B. サンプルデータ | ユーザー入力の叩き台 | 初期カード、サンプル項目 | v4.1実装 |

### 9.3 型定義

```typescript
/**
 * 生成されたサンプルアイテム
 */
interface GeneratedSampleItem {
  id: string;
  text: string;
  color?: string;
  isGenerated: true;  // 生成コンテンツを識別するマーカー
  [key: string]: unknown;
}

/**
 * 生成コンテンツのコンテナ
 */
interface GeneratedContentContainer<T = GeneratedSampleItem> {
  items: T[];
  isGenerated: true;  // コンテナレベルのマーカー
}

/**
 * Widget定義に追加する生成ヒント
 */
interface WidgetGenerationHints {
  labels?: {
    field: string;              // 配置先のconfigフィールド名
    instruction: string;        // LLMへの生成指示
    count?: number;             // 生成数
    schema: Record<string, string>;  // アイテムのスキーマ
  };
  samples?: {
    field: string;              // 配置先のconfigフィールド名
    instruction: string;        // LLMへの生成指示
    count: { min: number; max: number };  // 生成数の範囲
    schema: Record<string, string>;  // アイテムのスキーマ
  };
}
```

### 9.4 UISpec.config内での使用

generatedValueはWidgetSpec.config内に配置される。

```json
{
  "id": "brainstorm_0",
  "component": "brainstorm_cards",
  "position": 0,
  "config": {
    "title": "転職について考えてみましょう",
    "sampleCards": {
      "items": [
        { "id": "sample_1", "text": "現職で得られるスキル", "isGenerated": true },
        { "id": "sample_2", "text": "転職先に求める条件", "isGenerated": true }
      ],
      "isGenerated": true
    }
  }
}
```

### 9.5 Widget定義でのgenerationHints

```typescript
// BrainstormCardsの例
{
  id: 'brainstorm_cards',
  // ...他のフィールド
  generationHints: {
    samples: {
      field: 'sampleCards',
      instruction: 'ユーザーの悩みに関連するアイデアの種となるカードを2-3個生成',
      count: { min: 2, max: 3 },
      schema: { id: 'string', text: 'string', color: 'string (optional)' },
    },
  },
}
```

### 9.6 フロントエンドでの表示

- `isGenerated: true`のアイテムは視覚的に区別（✨AI提案バッジ等）
- ユーザーは「使う」「却下」を選択可能
- 採用されたサンプルはユーザー入力として扱われる（isGeneratedマーカーは除去）

### 9.7 設計原則

1. **追加LLM呼び出しなし**: UISpec生成時に同時生成（3段階構成を維持）
2. **後方互換性**: generationHintsがないWidgetは従来通り動作
3. **明示的マーキング**: 生成コンテンツは`isGenerated: true`で識別
4. **編集可能性**: 生成コンテンツはユーザーが自由に編集・削除可能

---

## 10. Jellyとの対応関係

### 10.1 用語対応

| Jelly | 本システム（v4） | 備考 |
|-------|-----------------|------|
| ORS (Object-Relational Schema) | ORS | Jelly用語を採用 |
| Task-Driven Data Model (TDDM) | TDDM層 | ORS+DpGを含む層の名称 |
| DpG (Dependency Graph) | DependencyGraph | 同一概念 |
| UI Specification | UISpec | 同一概念 |
| - | ReactiveBinding | オリジナル拡張 |
| - | WidgetDefinition | オリジナル拡張 |

### 10.2 構造対応

| Jelly | 本システム（v4） |
|-------|-----------------|
| Task | - （悩み全体に対応） |
| Entity | Entity |
| Attribute | Attribute |
| SVAL/ARRY/PNTR/DICT | SVAL/ARRY/PNTR/DICT |
| function/render/editable | Widget Port direction (in/out/inout) |

### 10.3 オリジナル拡張

| 拡張 | 説明 |
|------|------|
| Widget単位UI | Jellyは最小単位UIだが、本システムはWidget（複合UI）を基本単位 |
| ReactiveBinding | Widget-to-Widget Reactivity（Jellyにはない概念） |
| complexity | Widget認知負荷の数値化 |
| stage_summary | ステージ間データ引き継ぎWidget |
| generatedValue | LLM生成コンテンツの仕組み |
| WidgetSelectionResult | 4ステージ一括Widget選定 |

---

## 11. 付録A: 用語対応表（v3→v4）

### 11.1 用語変更の背景

v3までの「OODM」という呼称は、データモデル層（Layer 1全体）とInstance DSLにおけるデータ構造定義（Entity/Attribute）の両方を指す用語として混在していた。v4ではJelly Framework の用語体系を採用し、以下のように整理した。

### 11.2 用語対応表

| v3の呼称 | v4の呼称 | 説明 |
|----------|----------|------|
| OODM（Object-Oriented Data Model） | **ORS**（Object-Relational Schema） | Instance DSLにおけるデータ構造定義（Entity, Attribute）。LLMが生成する動的なデータスキーマ。 |
| OODM層 / データモデル層 | **TDDM層**（Task-Driven Data Model層） | Layer 1全体の呼称。ORS（データ構造）とDpG（依存関係）を含む。 |
| DataSchemaDSL | ORS | v2以前からの用語。データスキーマ定義を指す。 |

### 11.3 型名・インターフェース名の変更

| v3の型名 | v4の型名 | 備考 |
|----------|----------|------|
| `interface OODM` | `interface ORS` | メイン型定義 |
| `oodm_generation` | `ors_generation` | LLMタスクタイプ |
| `OODMGeneratorService` | `ORSGeneratorService` | サービスクラス名 |

### 11.4 Jelly Framework との対応

本システムではJelly Framework（[arXiv:2503.04084](https://arxiv.org/html/2503.04084v1)）の用語体系を基本としつつ、以下のオリジナル拡張を行っている：

| 概念 | Jelly | 本システム |
|------|-------|-----------|
| データ構造定義 | ORS | ORS（同一） |
| データモデル層 | Task-Driven Data Model | TDDM層（略称採用） |
| Widget間連携 | なし | ReactiveBinding |
| Widget認知負荷 | なし | complexity |
| 動的ラベル/サンプル | なし | generatedValue |

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 2025-12-02 | 初版作成 |
| 4.0.1 | 2025-12-02 | OODM→ORS/TDDM用語変更、付録A追加 |
| 4.1 | 2025-12-08 | generatedValue正式仕様化（Section 9更新） |
