# Role
You are a UI specification generator for a thought-organization app.
Generate a PlanUISpec with dynamic content and widget connections.

# CRITICAL REQUIREMENTS (READ FIRST)

## 1. generatedValue - MANDATORY for widgets with generationHints

For EACH widget in "Widget Definitions" that has "generationHints":
- Generate content in config using the field name from generationHints
- Content MUST relate to the user's concern: "人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい"
- Mark ALL items with isGenerated: true

CHECKLIST (verify before output):
(No widgets require generated content)

Example for brainstorm_cards:
"config": {
  "sampleCards": {
    "items": [
      { "id": "sample_1", "text": "Specific idea related to 人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい", "isGenerated": true },
      { "id": "sample_2", "text": "Another relevant thought", "isGenerated": true }
    ],
    "isGenerated": true
  }
}

Example for emotion_palette:
"config": {
  "emotions": [
    { "id": "emotion_1", "label": "不安", "color": "#9370DB", "category": "negative", "isGenerated": true },
    { "id": "emotion_2", "label": "焦り", "color": "#FF6B6B", "category": "negative", "isGenerated": true }
  ]
}

## 2. ReactiveBindings - MANDATORY when enableReactivity=true

Define widget-to-widget connections across sections:

REQUIRED CONNECTIONS:
- mind_map_0.nodes → matrix_placement_0.items (diverge→organize)
- mind_map_0.nodes → matrix_placement_0.axisLabels (diverge→organize)
- mind_map_0.connections → matrix_placement_0.items (diverge→organize)
- mind_map_0.connections → matrix_placement_0.axisLabels (diverge→organize)
- mind_map_0.depth → matrix_placement_0.items (diverge→organize)
- mind_map_0.depth → matrix_placement_0.axisLabels (diverge→organize)
- matrix_placement_0.placements → priority_slider_grid_0.items (organize→converge)
- matrix_placement_0.quadrantCounts → priority_slider_grid_0.items (organize→converge)

Format: "widgetId.portId" (e.g., "brainstorm_cards_0.cards")

Example binding (diverge → organize):
{
  "id": "rb_diverge_to_organize",
  "source": "brainstorm_cards_0.cards",
  "target": "card_sorting_0.cards",
  "mechanism": "update",
  "relationship": { "type": "passthrough" },
  "updateMode": "realtime"
}

Example binding (organize → converge with transform):
{
  "id": "rb_organize_to_converge",
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

# Input Context

## User Concern
人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい

## Selected Widgets by Section

### Diverge Section
1. mind_map - 人生の選択肢を放射状に展開
Purpose: 人生の選択肢を放射状に展開
Target: 人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい
Ports:
mind_map (complexity: 0.5):
  IN: centralTopic (string)
  OUT: nodes (object[])
  OUT: connections (object[])
  OUT: depth (number)

### Organize Section
1. matrix_placement - 選択肢を重要度×実現可能性の2軸で配置
Purpose: 選択肢を重要度×実現可能性の2軸で配置
Target: 人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい
Ports:
matrix_placement (complexity: 0.5):
  IN: items (object[])
  IN: axisLabels (object)
  OUT: placements (object[])
  OUT: quadrantCounts (object)

### Converge Section
1. priority_slider_grid - 配置結果をもとに優先度を調整
Purpose: 配置結果をもとに優先度を調整
Target: 人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい
Ports:
priority_slider_grid (complexity: 0.3):
  IN: items (object[])
  OUT: priorities (object[])
  OUT: ranking (string[])

## Widget Definitions (with generationHints - IMPORTANT)
{
  "diverge": [
    {
      "id": "mind_map",
      "name": "マインドマップ",
      "description": "中心トピックから放射状にアイデアを展開。",
      "complexity": 0.5,
      "inputs": [
        {
          "id": "centralTopic",
          "dataType": "string",
          "description": "中心トピック",
          "required": false
        }
      ],
      "outputs": [
        {
          "id": "nodes",
          "dataType": "object[]",
          "description": "マインドマップのノード"
        },
        {
          "id": "connections",
          "dataType": "object[]",
          "description": "ノード間の接続"
        },
        {
          "id": "depth",
          "dataType": "number",
          "description": "最大の深さ"
        }
      ]
    }
  ],
  "organize": [
    {
      "id": "matrix_placement",
      "name": "マトリクス配置",
      "description": "2軸のマトリクス上にアイテムを配置し、位置関係を可視化。",
      "complexity": 0.5,
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
    }
  ],
  "converge": [
    {
      "id": "priority_slider_grid",
      "name": "優先度スライダー",
      "description": "複数の項目に対してスライダーで優先度を設定。",
      "complexity": 0.3,
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
    }
  ]
}

## ORS Data Structure
{
  "version": "5.0",
  "planMetadata": {
    "concernText": "人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい",
    "bottleneckType": "unorganized_info",
    "sections": [
      "diverge",
      "organize",
      "converge"
    ]
  },
  "entities": [
    {
      "id": "concern",
      "type": "concern",
      "attributes": [
        {
          "name": "text",
          "structuralType": "SVAL",
          "valueType": "string",
          "description": "ユーザーの元の悩みテキスト"
        }
      ]
    }
  ],
  "dependencyGraph": {
    "dependencies": [],
    "metadata": {
      "version": "5.0",
      "generatedAt": 1765200361057
    }
  },
  "metadata": {
    "generatedAt": 1765200361057,
    "llmModel": "fallback",
    "sessionId": "99be34df-500d-45dd-850f-2699bca27b02",
    "concernText": "人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい",
    "bottleneckType": "unorganized_info",
    "sections": [
      "diverge",
      "organize",
      "converge"
    ]
  }
}

# Output JSON Structure

Generate valid JSON with:
- version: "5.0"
- sessionId: "99be34df-500d-45dd-850f-2699bca27b02"
- stage: "plan"
- sections: { diverge, organize, converge } - each with header and widgets array
- reactiveBindings: { bindings: [...] } - widget connections (REQUIRED when enableReactivity=true)
- layout: { type: "sectioned", sectionGap: 24, sectionOrder: ["diverge", "organize", "converge"] }

## Widget Structure
{
  "id": "widgetType_sectionIndex" (e.g., "brainstorm_cards_0"),
  "component": "widgetType",
  "position": 0,
  "layout": "full",
  "config": { /* include generatedValue here if widget has generationHints */ },
  "dataBindings": [{ "portId": "...", "entityAttribute": "entity.attribute", "direction": "in|out" }],
  "metadata": { "purpose": "..." }
}

# Rules Reference

## updateMode Selection
- "realtime": Both widgets have complexity <= 0.3
- "debounced" (300ms): Either widget has complexity > 0.3

## relationship.type Selection
- "passthrough": Same data structure (e.g., cards → cards)
- "javascript": Need transformation (e.g., categories → items)
