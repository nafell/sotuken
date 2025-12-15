# Phase 7 Step 3: Content Generation Enhancements (Design)

**Date**: 2025-12-01
**Status**: Draft
**Related Discussion**: `specs/discussions/v3.1-content-generation-enhancement.md`

## 1. Overview

The goal of this step is to improve the relevance and context-awareness of LLM-generated content within UI widgets. We introduce **UI Atoms (UIComponents)** to standardize how generated content (like sample items) is defined, generated, and rendered.

## 2. Architecture Changes

### 2.1 UI Atoms (UIComponents)

We adopt the `UIComponent` concept from `DSL-Core-Spec-v3.0` to define reusable UI elements that can be bound to Widget Ports.

**New Atom: `editable-list`**
-   **Purpose**: Allows users to view generated sample items and add/edit them as their own input.
-   **Props (Static/Generated)**:
    -   `samples`: Array of generated sample items.
    -   `itemSchema`: Schema defining the structure of items (for validation and form generation).
-   **Data Binding**: Binds to a Widget Port (array type).

### 2.2 Widget Definition (`widgets.ts`)

We extend `ReactivePortDefinition` to include a `uiComponent` binding. This separates the *data flow* (Port) from the *UI representation* (Atom).

```typescript
// server/src/types/WidgetDefinition.ts

interface ReactivePortDefinition {
  // ... existing fields
  
  /** UI Component Binding */
  uiComponent?: {
    type: "editable-list"; // Corresponds to UI Atom type
    
    /** Generation Specification for LLM */
    generationSpec?: {
      instruction: string; // e.g. "Generate ideas for..."
      count: number;       // e.g. 3
      itemStructure: {     // Structure of the generated items
        [field: string]: {
          type: "generatedValue";
          dataType: string;
          instruction: string;
        };
      };
    };
  };
}
```

### 2.3 UI Spec (`ui-spec.types.ts`)

We clarify the separation between **Static Configuration (Generated Content)** and **Dynamic State (User Input)**.

-   **`config`**: Holds generated content (samples, prompts, descriptions). This is static for the session/stage.
-   **`inputs`**: Holds the current reactive state (user inputs).

```typescript
// concern-app/src/types/ui-spec.types.ts

interface WidgetSpec {
  // ...
  
  /** Generated Static Content (passed as props to Atoms) */
  config: {
    [portId: string]: {
      samples?: any[]; // Generated samples for the port
    };
    description?: string; // Context-aware description
    prompt?: string;      // Context-aware prompt
    // ... other static config
  };

  /** Reactive State */
  inputs: {
    [portId: string]: {
      value: any[]; // User input values
    };
  };
}
```

## 3. Pipeline Changes

### 3.1 Generator (Backend)

The `UISpecGenerator` and `WidgetDefinitionGenerator` need to be updated to:
1.  **Prompting**: Include `uiComponent.generationSpec` in the prompt to the LLM.
2.  **Parsing**: Instruct the LLM to output generated samples into `config.{portId}.samples`.

**Prompt Strategy**:
"For ports with `uiComponent.generationSpec`, generate `count` items following the `itemStructure` and place them in `config.{portId}.samples`."

### 3.2 Renderer (Frontend)

The `UIRendererV3` and individual Widgets need to be updated to utilize the `config` field.

1.  **`UIRendererV3`**:
    -   Pass `widgetSpec.config` to the Widget Component.
    -   Render `widgetSpec.config.description` if present (as a tooltip or helper text).

2.  **Widget Implementation (e.g., `BrainstormCards`)**:
    -   Read `samples` from `props.spec.config.cards.samples`.
    -   Display these samples as "Suggestions" or "Ghost Items".
    -   Allow users to click a sample to copy it into `props.spec.inputs.cards.value`.

## 4. Affected Components

| Component | Change |
| :--- | :--- |
| `WidgetDefinition.ts` | Add `uiComponent` to `ReactivePortDefinition`. |
| `widgets.ts` | Update definitions (Brainstorm, SWOT, etc.) to use `uiComponent`. |
| `WidgetDefinitionGenerator.ts` | Update prompt generation to include `generationSpec`. |
| `UISpecGeneratorV3.ts` | Update prompt to request output in `config`. |
| `UIRendererV3.tsx` | Ensure `config` is passed and `description` is used. |
| `BrainstormCards.tsx` | Implement `EditableList` logic (show samples). |
| `EmotionPalette.tsx` | Use `config.prompt` / `config.description`. |
| `SwotAnalysis.tsx` | Implement `EditableList` logic for quadrants. |
| `PrioritySliderGrid.tsx` | Implement `EditableList` logic for items. |
