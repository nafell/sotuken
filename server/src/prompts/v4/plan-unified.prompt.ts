/**
 * Plan Unified Prompt Templates (DSL v5.0)
 *
 * Planフェーズ全体（diverge/organize/converge）を1回のLLM呼び出しで生成するプロンプト
 * BLUF（Bottom Line Up Front）原則に基づき、重要な要件を冒頭に配置
 *
 * @see specs/dsl-design/v5/DSL-Spec-v5.0.md
 * @since DSL v5.0
 */

// =============================================================================
// Plan統合ORS生成プロンプト
// =============================================================================

export const PLAN_ORS_GENERATION_PROMPT = `
# Role
You are a data structure generator for a thought-organization app.
Generate an ORS (Object-Relational Schema) defining data flow across 3 sections.

# CRITICAL: DependencyGraph is MANDATORY
You MUST define dependencies between sections:
- diverge_data.output → organize_data.input
- organize_data.output → converge_data.input

# Input

## User Concern
{{concernText}}

## Bottleneck Type
{{bottleneckType}}

## Selected Widgets

### Diverge Section
{{divergeWidgets}}

### Organize Section
{{organizeWidgets}}

### Converge Section
{{convergeWidgets}}

## Widget Port Information
{{widgetPortInfo}}

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
    "concernText": "{{concernText}}",
    "bottleneckType": "{{bottleneckType}}",
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
  "metadata": { "generatedAt": ${Date.now()}, "sessionId": "{{sessionId}}" }
}
`;

// =============================================================================
// Plan統合UISpec生成プロンプト（BLUF原則で再構築）
// =============================================================================

export const PLAN_UISPEC_GENERATION_PROMPT = `
# Role
You are a UI specification generator for a thought-organization app.
Generate a PlanUISpec with dynamic content and widget connections.

# CRITICAL REQUIREMENTS (READ FIRST)

## 1. generatedValue - MANDATORY for widgets with generationHints

For EACH widget in "Widget Definitions" that has "generationHints":
- Generate content in config using the field name from generationHints
- Content MUST relate to the user's concern: "{{concernText}}"
- Mark ALL items with isGenerated: true

CHECKLIST (verify before output):
{{generatedValueChecklist}}

Example for brainstorm_cards:
"config": {
  "sampleCards": {
    "items": [
      { "id": "sample_1", "text": "Specific idea related to {{concernText}}", "isGenerated": true },
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

## 2. ReactiveBindings - MANDATORY when enableReactivity={{enableReactivity}}

Define widget-to-widget connections across sections:

REQUIRED CONNECTIONS:
{{w2wrHints}}

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
{{concernText}}

## Selected Widgets by Section

### Diverge Section
{{divergeSelection}}
Purpose: {{divergePurpose}}
Target: {{divergeTarget}}
Ports:
{{divergePortInfo}}

### Organize Section
{{organizeSelection}}
Purpose: {{organizePurpose}}
Target: {{organizeTarget}}
Ports:
{{organizePortInfo}}

### Converge Section
{{convergeSelection}}
Purpose: {{convergePurpose}}
Target: {{convergeTarget}}
Ports:
{{convergePortInfo}}

## Widget Definitions (with generationHints - IMPORTANT)
{{widgetDefinitions}}

## ORS Data Structure
{{ors}}

# Output JSON Structure

Generate valid JSON with:
- version: "5.0"
- sessionId: "{{sessionId}}"
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
`;

export default {
  PLAN_ORS_GENERATION_PROMPT,
  PLAN_UISPEC_GENERATION_PROMPT,
};
