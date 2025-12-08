# DSL Specification v5.0

**Version**: 5.0
**Date**: 2025-12-08
**Status**: Draft
**Based on**: [DSL Spec v4.0](../v4/DSL-Spec-v4.0.md), [W2WRテストケース設計](../../discussions/DSLv3_expert_cases.md)

---

## 目次

1. [概要](#1-概要)
2. [アーキテクチャ](#2-アーキテクチャ)
3. [Layer 1: ORS + DpG（TDDM層）- v5拡張](#3-layer-1-ors--dpgtddm層---v5拡張)
4. [Layer 2: UISpec + ReactiveBinding（UI仕様層）- v5拡張](#4-layer-2-uispec--reactivebindingui仕様層---v5拡張)
5. [LLM呼び出し構成 - v5拡張](#5-llm呼び出し構成---v5拡張)
6. [アプリケーションフロー - v5拡張](#6-アプリケーションフロー---v5拡張)
7. [W2WRテストケース対応](#7-w2wrテストケース対応)
8. [v4との互換性](#8-v4との互換性)
9. [付録A: v4→v5変更サマリー](#9-付録a-v4v5変更サマリー)

---

## 1. 概要

### 1.1 目的

DSL v5は、planフェーズの1ページ化によりWidget-to-Widget Reactivity（W2WR）を同一ページ内でリアルタイムに動作させるための仕様拡張である。

### 1.2 設計原則

1. **W2WR検証優先**: 6ケースのW2WRパターンを同一ページ内で検証可能にする
2. **Jelly準拠維持**: 3層DSL構造、3段階LLM呼び出しの基本構造は継承
3. **最小限の変更**: v4からの差分を最小化し、summaryステージは維持

### 1.3 v4からの主要変更点

| 観点 | v4 | v5 |
|------|-----|-----|
| Planフェーズ構造 | 4ステージ別ページ | 3セクション統合1ページ + summaryページ |
| StageType | `diverge \| organize \| converge \| summary` | `plan \| summary` を追加 |
| UISpec構造 | `widgets: WidgetSpec[]` | plan時は`sections: SectionMap` |
| W2WR動作範囲 | 同一ステージ内のみ | planページ全体（セクション横断） |
| LLM呼び出し | ステージごとにORS+UISpec生成 | plan全体で1回のORS+UISpec生成 |

---

## 2. アーキテクチャ

### 2.1 3層構造（v4継承）

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
│  Layer 1: ORS + DpG（TDDM層）                                    │
│    - Plan統合ORS: 3セクション分のEntity/Attribute               │【v5拡張】
│    - DependencyGraph: セクション横断データ依存                   │【v5拡張】
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: UISpec + ReactiveBinding（UI仕様層）                   │
│    - PlanUISpec: sections構造                                   │【v5新規】
│    - ReactiveBinding: セクション横断W2WR                        │【v5拡張】
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 データフロー（v5）

```
【第1段階】Widget選定（v4と同一）
    入力: ConcernText, BottleneckType, Widget Definitions
    出力: WidgetSelectionResult（4ステージ分）
              ↓
【第2段階】Plan統合ORS生成 ★v5変更
    入力: ConcernText, WidgetSelectionResult（diverge/organize/converge分）
    出力: Plan統合ORS（3セクション分のEntity + セクション横断DpG）
              ↓
【第3段階】Plan統合UISpec生成 ★v5変更
    入力: Plan統合ORS, WidgetSelectionResult
    出力: PlanUISpec（3セクション + セクション横断ReactiveBinding）
              ↓
【レンダリング】
    UIRendererがPlanUISpecを解釈して3セクションUIを生成
    ReactiveBindingEngineがセクション横断W2WRを処理
              ↓
【Summaryフェーズ】（v4と同一）
    入力: ConcernText, Planフェーズの結果
    出力: Summary用ORS + UISpec
```

---

## 3. Layer 1: ORS + DpG（TDDM層）- v5拡張

### 3.1 Plan統合ORS

v5では、planフェーズ全体のORSを1回のLLM呼び出しで生成する。

```typescript
interface PlanORS extends ORS {
  version: "5.0";
  planMetadata: {
    concernText: string;
    bottleneckType: string;
    sections: ['diverge', 'organize', 'converge'];
  };
  entities: Entity[];                    // 3セクション分のEntity
  dependencyGraph: DependencyGraph;      // セクション横断依存
}
```

### 3.2 Plan統合ORSのEntity構成

```json
{
  "version": "5.0",
  "planMetadata": {
    "concernText": "転職活動中。候補企業をリストアップしたが、分類して整理したい",
    "bottleneckType": "unorganized_info",
    "sections": ["diverge", "organize", "converge"]
  },
  "entities": [
    {
      "id": "diverge_data",
      "type": "section_data",
      "attributes": [
        {
          "name": "brainstorm_output",
          "structuralType": "ARRY",
          "itemType": "DICT",
          "schema": { "id": "string", "text": "string", "color": "string" }
        }
      ]
    },
    {
      "id": "organize_data",
      "type": "section_data",
      "attributes": [
        {
          "name": "sorting_input",
          "structuralType": "PNTR",
          "ref": "diverge_data.brainstorm_output"
        },
        {
          "name": "categories",
          "structuralType": "DICT",
          "itemType": "ARRY"
        }
      ]
    },
    {
      "id": "converge_data",
      "type": "section_data",
      "attributes": [
        {
          "name": "priority_items",
          "structuralType": "ARRY",
          "itemType": "DICT",
          "schema": { "id": "string", "label": "string", "priority": "number" }
        }
      ]
    }
  ],
  "dependencyGraph": {
    "dependencies": [
      {
        "id": "dep_001",
        "source": "diverge_data.brainstorm_output",
        "target": "organize_data.sorting_input",
        "mechanism": "update",
        "relationship": { "type": "javascript", "javascript": "return source;" }
      },
      {
        "id": "dep_002",
        "source": "organize_data.categories",
        "target": "converge_data.priority_items",
        "mechanism": "update",
        "relationship": {
          "type": "javascript",
          "javascript": "return Object.values(source).flat().map(item => ({id: item.id, label: item.text, priority: 50}));"
        }
      }
    ]
  }
}
```

---

## 4. Layer 2: UISpec + ReactiveBinding（UI仕様層）- v5拡張

### 4.1 StageType拡張

```typescript
// v4
type StageType = 'diverge' | 'organize' | 'converge' | 'summary';

// v5（拡張）
type StageTypeV5 = 'plan' | 'summary';      // 新規追加
type StageType = 'diverge' | 'organize' | 'converge' | 'summary' | 'plan';
```

### 4.2 PlanUISpec（新規）

planフェーズ用の統合UISpec構造。

```typescript
interface PlanUISpec {
  version: string;                         // "5.0"
  sessionId: string;
  stage: 'plan';                           // 固定値
  sections: {
    diverge: SectionSpec;
    organize: SectionSpec;
    converge: SectionSpec;
  };
  reactiveBindings: ReactiveBindingSpec;   // セクション横断W2WR
  layout: PlanLayout;
  metadata: UISpecMetadata;
}

interface SectionSpec {
  widgets: WidgetSpec[];                   // v4と同じWidgetSpec
  header: {
    title: string;                         // "発散", "整理", "収束"
    description: string;                   // "アイデアを広げる" 等
  };
}

interface PlanLayout {
  type: 'sectioned';
  sectionGap: number;                      // px単位
  sectionOrder: ['diverge', 'organize', 'converge'];
}
```

### 4.3 PlanUISpec Instance例

```json
{
  "version": "5.0",
  "sessionId": "session_001",
  "stage": "plan",
  "sections": {
    "diverge": {
      "header": {
        "title": "発散",
        "description": "候補企業をカードとして書き出す"
      },
      "widgets": [
        {
          "id": "brainstorm_cards_0",
          "component": "brainstorm_cards",
          "position": 0,
          "config": {
            "title": "転職候補企業",
            "prompt": "検討中の企業を書き出してください",
            "sampleCards": {
              "items": [
                { "id": "sample_1", "text": "A社 - IT大手", "isGenerated": true },
                { "id": "sample_2", "text": "B社 - スタートアップ", "isGenerated": true }
              ],
              "isGenerated": true
            }
          },
          "dataBindings": [
            {
              "portId": "cards",
              "entityAttribute": "diverge_data.brainstorm_output",
              "direction": "out"
            }
          ],
          "metadata": {
            "purpose": "転職候補企業をカードとして可視化"
          }
        }
      ]
    },
    "organize": {
      "header": {
        "title": "整理",
        "description": "企業を業界・条件別に分類"
      },
      "widgets": [
        {
          "id": "card_sorting_0",
          "component": "card_sorting",
          "position": 0,
          "config": {
            "categories": ["IT業界", "製造業", "サービス業", "その他"]
          },
          "dataBindings": [
            {
              "portId": "cards",
              "entityAttribute": "organize_data.sorting_input",
              "direction": "in"
            },
            {
              "portId": "categories",
              "entityAttribute": "organize_data.categories",
              "direction": "out"
            }
          ],
          "metadata": {
            "purpose": "企業を業界別にカテゴリ分け"
          }
        }
      ]
    },
    "converge": {
      "header": {
        "title": "収束",
        "description": "分類結果をもとに優先度を設定"
      },
      "widgets": [
        {
          "id": "priority_slider_grid_0",
          "component": "priority_slider_grid",
          "position": 0,
          "config": {
            "title": "企業優先度評価"
          },
          "dataBindings": [
            {
              "portId": "items",
              "entityAttribute": "converge_data.priority_items",
              "direction": "inout"
            }
          ],
          "metadata": {
            "purpose": "企業の優先順位を決定"
          }
        }
      ]
    }
  },
  "reactiveBindings": {
    "bindings": [
      {
        "id": "rb_001",
        "source": "brainstorm_cards_0.cards",
        "target": "card_sorting_0.cards",
        "mechanism": "update",
        "relationship": {
          "type": "passthrough"
        },
        "updateMode": "realtime"
      },
      {
        "id": "rb_002",
        "source": "card_sorting_0.categories",
        "target": "priority_slider_grid_0.items",
        "mechanism": "update",
        "relationship": {
          "type": "javascript",
          "javascript": "Object.values(source).flat().map(item => ({id: item.id, label: item.text, priority: 50}))"
        },
        "updateMode": "debounced",
        "debounceMs": 300
      }
    ]
  },
  "layout": {
    "type": "sectioned",
    "sectionGap": 24,
    "sectionOrder": ["diverge", "organize", "converge"]
  },
  "metadata": {
    "generatedAt": 1733644800000,
    "llmModel": "gemini-2.5-flash-lite",
    "version": "5.0"
  }
}
```

### 4.4 ReactiveBinding Relationship Types

v5で使用するRelationship Types:

```typescript
type RelationshipSpec =
  | { type: 'passthrough' }                    // データをそのまま渡す
  | { type: 'javascript'; javascript: string } // JavaScriptで変換
  | { type: 'transform'; transform: TransformFunction }  // 組み込み変換
  | { type: 'llm'; llmPrompt: string };        // LLMで変換（将来拡張）

type UpdateMode = 'realtime' | 'debounced' | 'on_confirm';
```

---

## 5. LLM呼び出し構成 - v5拡張

### 5.1 3段階構成（v5版）

```
┌─────────────────────────────────────────────────────────────────┐
│ 【第1段階】Widget選定（v4と同一）                                 │
│   入力: ConcernText, BottleneckType, Widget Definitions          │
│   出力: WidgetSelectionResult（4ステージ分）                      │
│   ※ summary分も含む                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 【第2段階】Plan統合ORS生成 ★v5変更                               │
│   入力:                                                          │
│     - ConcernText                                                │
│     - WidgetSelectionResult.stages.diverge                       │
│     - WidgetSelectionResult.stages.organize                      │
│     - WidgetSelectionResult.stages.converge                      │
│   出力: Plan統合ORS                                              │
│     - 3セクション分のEntity                                       │
│     - セクション横断DependencyGraph                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 【第3段階】Plan統合UISpec生成 ★v5変更                            │
│   入力:                                                          │
│     - Plan統合ORS                                                │
│     - WidgetSelectionResult                                      │
│     - enableReactivity: boolean                                  │
│   出力: PlanUISpec                                               │
│     - 3セクション（diverge/organize/converge）                    │
│     - セクション横断ReactiveBindings                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 【Summaryフェーズ】（v4と同一）                                    │
│   Planフェーズ完了後に実行                                        │
│   入力: ConcernText, Planフェーズ結果                            │
│   出力: Summary用ORS + UISpec                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 プロンプト設計方針

#### Plan統合ORS生成プロンプト

```markdown
## タスク
以下のユーザーの悩みに対して、3セクション（発散/整理/収束）分のデータ構造を
1つのORSとして生成してください。

## 入力
- 悩み: {{concernText}}
- ボトルネック: {{bottleneckType}}
- 発散Widget: {{divergeWidgets}}
- 整理Widget: {{organizeWidgets}}
- 収束Widget: {{convergeWidgets}}

## 出力形式
{
  "version": "5.0",
  "planMetadata": { ... },
  "entities": [
    // diverge_data, organize_data, converge_data
    // 各Widget用のdata entity
  ],
  "dependencyGraph": {
    "dependencies": [
      // セクション間のデータ依存関係
    ]
  }
}

## 制約
1. エンティティIDはセクション名_dataまたはwidget名_dataの形式
2. セクション間のデータ継承はPNTRで表現
3. DependencyGraphはセクション間の依存のみ（セクション内はW2WRで処理）
```

#### Plan統合UISpec生成プロンプト

```markdown
## タスク
以下のORSに基づいて、3セクション統合のPlanUISpecを生成してください。

## 入力
- ORS: {{ors}}
- 発散Widget選定: {{divergeSelection}}
- 整理Widget選定: {{organizeSelection}}
- 収束Widget選定: {{convergeSelection}}
- Reactivity有効: {{enableReactivity}}

## 出力形式
{
  "version": "5.0",
  "sessionId": "{{sessionId}}",
  "stage": "plan",
  "sections": {
    "diverge": { "header": {...}, "widgets": [...] },
    "organize": { "header": {...}, "widgets": [...] },
    "converge": { "header": {...}, "widgets": [...] }
  },
  "reactiveBindings": {
    "bindings": [
      // セクション横断W2WR
    ]
  },
  "layout": { "type": "sectioned", "sectionGap": 24 },
  "metadata": { ... }
}

## ReactiveBinding生成ルール
1. enableReactivity=trueの場合のみ生成
2. diverge→organize、organize→convergeの連携を優先
3. updateMode:
   - 低complexity Widget間: "realtime"
   - 中complexity Widget間: "debounced" (debounceMs: 300)
4. relationship.type:
   - 同一データ構造: "passthrough"
   - データ変換必要: "javascript"
```

---

## 6. アプリケーションフロー - v5拡張

### 6.1 全体フロー（v5版）

```
┌─────────────────────────────────────────────────────────────────┐
│ Captureフェーズ（v4と同一）                                       │
│   ユーザー: 悩みを入力                                           │
│   LLM: ボトルネック診断                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 計画提示（v4と同一）                                              │
│   LLM: 4ステージWidget選定                                       │
│   UI: 計画提示画面（skip選択UIは非表示）                         │
│   ユーザー: 「この計画で始める」                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Planフェーズ（1ページ）★v5変更                                   │
│                                                                 │
│   1. LLM: Plan統合ORS生成                                       │
│   2. LLM: Plan統合UISpec生成                                    │
│   3. UI: 3セクションレンダリング                                │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ ■ 発散 (Diverge)                                        │   │
│   │   説明文...                                              │   │
│   │ ┌─────────────────────────────────────────────────────┐ │   │
│   │ │ brainstorm_cards                                    │ │   │
│   │ └─────────────────────────────────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────────┘   │
│                    ↓ W2WR (realtime/debounced)                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ ■ 整理 (Organize)                                       │   │
│   │   説明文...                                              │   │
│   │ ┌─────────────────────────────────────────────────────┐ │   │
│   │ │ card_sorting                                        │ │   │
│   │ └─────────────────────────────────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────────┘   │
│                    ↓ W2WR (realtime/debounced)                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ ■ 収束 (Converge)                                       │   │
│   │   説明文...                                              │   │
│   │ ┌─────────────────────────────────────────────────────┐ │   │
│   │ │ priority_slider_grid                                │ │   │
│   │ └─────────────────────────────────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   4. ユーザー: Widget操作（W2WRがリアルタイム動作）             │
│   5. [次へ（まとめ）] ボタン                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Summaryフェーズ（別ページ）- v4と同一                            │
│   1. LLM: Summary用ORS生成                                      │
│   2. LLM: Summary用UISpec生成                                   │
│   3. UI: structured_summary Widget表示                          │
│   4. [完了] ボタン                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Breakdownフェーズ（v4と同一）                                     │
│   結果表示                                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 ナビゲーション（v5版）

| 操作 | Planフェーズ | Summaryフェーズ |
|------|-------------|----------------|
| **次へ** | Summaryフェーズへ遷移 | Breakdownフェーズへ遷移 |
| **戻る** | - | Planフェーズへ戻る（UI・操作内容保持） |

※ v5ではPlanフェーズ内のステージ間移動は不要（1ページのため）

---

## 7. W2WRテストケース対応

### 7.1 対応テストケース

[W2WRテストケース設計](../../discussions/DSLv3_expert_cases.md)の6ケースに対応:

| Case | 悩み | Widgets | W2WR |
|------|------|---------|------|
| 1 | 副業を始めたい | brainstorm → card_sorting → matrix | なし |
| 2 | 転職候補企業整理 | brainstorm → card_sorting → priority | passthrough |
| 3 | 仕事ストレス整理 | emotion → card_sorting → priority | javascript |
| 4 | 人生の選択肢整理 | mind_map → matrix → priority | javascript + debounced |
| 5 | 引越し先検討 | brainstorm → card_sorting → tradeoff | javascript（organize→converge） |
| 6 | プロジェクトタスク | brainstorm → timeline → priority | javascript |

### 7.2 W2WRパターン網羅

| パターン | Case | 実装方法 |
|---------|------|---------|
| W2WRなし | 1 | `reactiveBindings.bindings = []` |
| passthrough | 2 | `relationship: { type: "passthrough" }` |
| javascript (simple) | 3 | `relationship: { type: "javascript", javascript: "..." }` |
| javascript (debounced) | 4 | `updateMode: "debounced", debounceMs: 300` |
| javascript (complex) | 5, 6 | 複雑なデータ変換JavaScript |

### 7.3 期待されるReactiveBinding例

#### Case 2: Passthrough

```json
{
  "source": "brainstorm_cards_0.cards",
  "target": "card_sorting_0.cards",
  "relationship": { "type": "passthrough" },
  "updateMode": "realtime"
}
```

#### Case 3: JavaScript Transform

```json
{
  "source": "emotion_palette_0.selectedEmotions",
  "target": "priority_slider_grid_0.items",
  "relationship": {
    "type": "javascript",
    "javascript": "source.map(e => ({id: e.emotion, label: e.emotion, priority: e.intensity}))"
  },
  "updateMode": "realtime"
}
```

#### Case 4: Debounced

```json
{
  "source": "mind_map_0.nodes",
  "target": "matrix_placement_0.items",
  "relationship": {
    "type": "javascript",
    "javascript": "source.map(n => ({id: n.id, text: n.label, x: 50, y: 50}))"
  },
  "updateMode": "debounced",
  "debounceMs": 300
}
```

---

## 8. v4との互換性

### 8.1 維持される機能

| 機能 | 状態 |
|------|------|
| Widget Definitions（13種） | 維持 |
| WidgetSelectionResult構造 | 維持 |
| Summary用ORS/UISpec生成 | 維持 |
| generatedValue仕組み | 維持 |
| complexity閾値ルール | 維持 |

### 8.2 非互換性

| 観点 | 詳細 |
|------|------|
| 旧セッションデータ | stage='diverge'/'organize'/'converge'のデータは閲覧不可 |
| ステージskip機能 | 1ページ統合によりUI上は使用不可（API仕様は残す） |
| ステージ間ナビゲーション | Planフェーズ内の「戻る」は不要 |

### 8.3 APIエンドポイント

| エンドポイント | v5での扱い |
|---------------|-----------|
| `POST /v1/ui/generate-v4-widgets` | 維持（Widget選定） |
| `POST /v1/ui/generate-v4-stage` | 維持（Summary用） |
| `POST /v1/ui/generate-v4-plan` | **新規追加**（Plan統合生成） |

---

## 9. 付録A: v4→v5変更サマリー

### 9.1 型定義の変更

| 型 | v4 | v5 |
|----|-----|-----|
| StageType | `'diverge' \| 'organize' \| 'converge' \| 'summary'` | `+ 'plan'` |
| UISpec | `{ stage, widgets, ... }` | `+ PlanUISpec { stage: 'plan', sections, ... }` |
| ORS | `{ entities, dependencyGraph }` | `+ planMetadata` |

### 9.2 APIの変更

| 変更種別 | エンドポイント | 説明 |
|---------|---------------|------|
| 新規追加 | `POST /v1/ui/generate-v4-plan` | Plan統合ORS+UISpec生成 |
| 維持 | `POST /v1/ui/generate-v4-widgets` | Widget選定（変更なし） |
| 維持 | `POST /v1/ui/generate-v4-stage` | Summary用（変更なし） |

### 9.3 フロントエンドの変更

| コンポーネント | 変更内容 |
|--------------|---------|
| ExperimentExecutor | PLAN_STAGES = ['plan', 'summary'] |
| ExperimentPlan | 3セクション表示、新API呼び出し |
| UIRendererV4 | renderMode='sectioned' 追加 |
| PlanPreview | skip UI非表示 |
| SessionDetail | stage='plan' 対応 |
| ReplayView | stage='plan' 対応 |

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| 5.0 | 2025-12-08 | 初版作成 |
