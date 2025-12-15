
# Role
You are a data structure generator for a thought-organization app.
Generate an ORS (Object-Relational Schema) defining data flow across 3 sections.

# CRITICAL: DependencyGraph is MANDATORY
You MUST define dependencies between sections:
- diverge_data.output → organize_data.input
- organize_data.output → converge_data.input

# Input

## User Concern
副業を始めたいが、何から手をつければいいか分からない。アイデアはいくつかあるが整理できていない

## Bottleneck Type
information

## Selected Widgets

### Diverge Section
1. brainstorm_cards - 副業のアイデアをまず量として出し、散在する考えをカードとして可視化するため
2. question_card_chain - 各アイデアについて深掘りするための質問を連鎖的に実施し、実現可能性や関心度を明らかにするため

### Organize Section
1. card_sorting - ブレインストームで出したカードをテーマや実現性で分類し、グルーピングするため
2. matrix_placement - 重要な比較軸（例: 手間 vs 収益性、短期性 vs 長期性）でアイデアを視覚的に比較し優先領域を検出するため

### Converge Section
1. priority_slider_grid - 整理された候補に対して優先度を数値でつけ、実行順やフォーカスを決めるため
2. tradeoff_balance - 上位候補間でのトレードオフ（時間投入 vs 期待収益など）を可視化し、最終意思決定を支援するため

## Widget Port Information
[
  {
    "widgetId": "brainstorm_cards",
    "purpose": "副業のアイデアをまず量として出し、散在する考えをカードとして可視化するため",
    "inputs": [],
    "outputs": [
      {
        "id": "cards",
        "dataType": "object[]",
        "description": "カードリスト {id: string, text: string, color?: string}"
      },
      {
        "id": "cardCount",
        "dataType": "number",
        "description": "カードの総数"
      }
    ]
  },
  {
    "widgetId": "question_card_chain",
    "purpose": "各アイデアについて深掘りするための質問を連鎖的に実施し、実現可能性や関心度を明らかにするため",
    "inputs": [
      {
        "id": "questions",
        "dataType": "string[]",
        "description": "提示する質問リスト",
        "required": false
      }
    ],
    "outputs": [
      {
        "id": "answers",
        "dataType": "object[]",
        "description": "回答リスト {questionId: string, answer: string}"
      },
      {
        "id": "completedCount",
        "dataType": "number",
        "description": "回答済みの質問数"
      }
    ]
  },
  {
    "widgetId": "card_sorting",
    "purpose": "ブレインストームで出したカードをテーマや実現性で分類し、グルーピングするため",
    "inputs": [
      {
        "id": "cards",
        "dataType": "object[]",
        "description": "ソートするカードリスト",
        "required": false
      }
    ],
    "outputs": [
      {
        "id": "categories",
        "dataType": "object",
        "description": "カテゴリごとのカード配置"
      },
      {
        "id": "uncategorized",
        "dataType": "object[]",
        "description": "未分類のカード"
      }
    ]
  },
  {
    "widgetId": "matrix_placement",
    "purpose": "重要な比較軸（例: 手間 vs 収益性、短期性 vs 長期性）でアイデアを視覚的に比較し優先領域を検出するため",
    "inputs": [
      {
        "id": "items",
        "dataType": "object[]",
        "description": "配置するアイテムリスト",
        "required": false
      },
      {
        "id": "axisLabels",
        "dataType": "object",
        "description": "軸のラベル {xAxis: {low: string, high: string}, yAxis: {low: string, high: string}}",
        "required": false
      }
    ],
    "outputs": [
      {
        "id": "placements",
        "dataType": "object[]",
        "description": "アイテムの配置情報 {id: string, x: number, y: number}"
      },
      {
        "id": "quadrantCounts",
        "dataType": "object",
        "description": "各象限のアイテム数"
      }
    ]
  },
  {
    "widgetId": "priority_slider_grid",
    "purpose": "整理された候補に対して優先度を数値でつけ、実行順やフォーカスを決めるため",
    "inputs": [
      {
        "id": "items",
        "dataType": "object[]",
        "description": "優先度を設定する項目リスト",
        "required": false
      }
    ],
    "outputs": [
      {
        "id": "priorities",
        "dataType": "object[]",
        "description": "優先度情報 {id: string, label: string, priority: number}"
      },
      {
        "id": "ranking",
        "dataType": "string[]",
        "description": "優先度順のID配列"
      }
    ]
  },
  {
    "widgetId": "tradeoff_balance",
    "purpose": "上位候補間でのトレードオフ（時間投入 vs 期待収益など）を可視化し、最終意思決定を支援するため",
    "inputs": [
      {
        "id": "items",
        "dataType": "object[]",
        "description": "比較対象の項目リスト {text: string, side: \"left\"|\"right\", weight?: number}",
        "required": false
      }
    ],
    "outputs": [
      {
        "id": "balance",
        "dataType": "number",
        "description": "バランススコア（-100〜100）"
      },
      {
        "id": "direction",
        "dataType": "string",
        "description": "天秤の傾き方向"
      },
      {
        "id": "recommendation",
        "dataType": "string",
        "description": "判断の推奨テキスト"
      }
    ]
  }
]

# Output JSON Structure

Generate valid JSON with this structure:
- version: "5.0"
- planMetadata: { concernText, bottleneckType, sections }
- entities: Array of Entity objects
- dependencyGraph: { dependencies: Array of Dependency objects }

## Entity Structure
- id: string (e.g., "diverge_data", "organize_data", "converge_data")
- type: string ("concern" | "section_data")
- attributes: Array of Attribute objects

## Attribute Types (structuralType)
- SVAL: Scalar value (string, number, boolean)
- ARRY: Array
- PNTR: Pointer to another entity.attribute (use "ref" field)
- DICT: Dictionary/Object

## Dependency Structure (REQUIRED)
{
  "id": "dep_diverge_to_organize",
  "source": "diverge_data.output",
  "target": "organize_data.input",
  "mechanism": "update",
  "relationship": { "type": "passthrough" }
}

# Minimal Example
{
  "version": "5.0",
  "planMetadata": {
    "concernText": "副業を始めたいが、何から手をつければいいか分からない。アイデアはいくつかあるが整理できていない",
    "bottleneckType": "information",
    "sections": ["diverge", "organize", "converge"]
  },
  "entities": [
    { "id": "concern", "type": "concern", "attributes": [{ "name": "text", "structuralType": "SVAL", "valueType": "string" }] },
    { "id": "diverge_data", "type": "section_data", "attributes": [{ "name": "output", "structuralType": "ARRY", "itemType": "DICT" }] },
    { "id": "organize_data", "type": "section_data", "attributes": [
      { "name": "input", "structuralType": "PNTR", "ref": "diverge_data.output" },
      { "name": "output", "structuralType": "DICT", "itemType": "ARRY" }
    ]},
    { "id": "converge_data", "type": "section_data", "attributes": [
      { "name": "input", "structuralType": "PNTR", "ref": "organize_data.output" },
      { "name": "output", "structuralType": "ARRY", "itemType": "DICT" }
    ]}
  ],
  "dependencyGraph": {
    "dependencies": [
      { "id": "dep_diverge_to_organize", "source": "diverge_data.output", "target": "organize_data.input", "mechanism": "update", "relationship": { "type": "passthrough" } },
      { "id": "dep_organize_to_converge", "source": "organize_data.output", "target": "converge_data.input", "mechanism": "update", "relationship": { "type": "javascript", "javascript": "Object.values(source).flat()" } }
    ],
    "metadata": { "version": "5.0" }
  },
  "metadata": { "generatedAt": 1765427126417, "sessionId": "batch-6fa5db64-77c6-45d7-b3f8-2cf32525d8a2-1" }
}
