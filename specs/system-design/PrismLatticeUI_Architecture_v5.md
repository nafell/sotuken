# Architecture Specification: Mental Inventory Note (Prism Lattice UI)

**Version**: 1.0
**Date**: 2025-12-15
**Status**: Draft

---

## 1. System Overview

"Mental Inventory Note" is a CBT-based thought organization application that utilizes a dynamic UI generation system called **Prism Lattice UI**. This system interprets user concerns and context to generate tailored user interfaces on the fly.

### 1.1 Core Architecture (3-Layer Model)

The system is built upon a 3-layer architecture that separates static definition, dynamic data structure, and UI specification.

1.  **Layer 3: Widget Definitions (Static)**
    -   **Role**: The "Genetic Code" of the UI. Predefined, reusable components (13 presets).
    -   **Content**: Metadata (complexity, timing, bottleneck), Input/Output Ports, Schema.
    -   **Location**: `server/src/definitions/widgets.ts`
    -   **Key Concept**: "Hardened DSL" - The LLM selects from these rigid definitions rather than hallucinating new UI components.

2.  **Layer 1: Object-Relational Schema (ORS) (Dynamic Data)**
    -   **Role**: The "Skeleton" of the application session. Defines the data entities and potential dependencies.
    -   **Content**: Entities (concern, section_data), Attributes (SVAL, ARRY, DICT), Dependency Graph.
    -   **Evolution**: In v5, a single `PlanORS` covers all 3 sections (diverge, organize, converge).

3.  **Layer 2: UI Specification (UISpec) (Dynamic Presentation)**
    -   **Role**: The "Skin" of the application. Maps ORS data to specific Widgets and defines reactive behaviors.
    -   **Content**: Widget instances, DataBindings (ORS ↔ Widget), ReactiveBindings (Widget ↔ Widget).
    -   **Evolution**: In v5, `PlanUISpec` defines the layout and bindings for the unified Plan page.

---

## 2. Core Pipeline (3-Stage LLM Pipeline)

The generation process is a linear pipeline powered by `LLMOrchestrator` and specific services for each stage.

### Stage 1: Widget Selection
-   **Service**: `WidgetSelectionService.ts`
-   **Input**: User Concern Text, Bottleneck Type (e.g., "decision", "emotion").
-   **Logic**:
    1.  Retrieves all `WidgetDefinition`s (Layer 3).
    2.  Prompts LLM to select 1-3 widgets for each of the 4 stages (diverge, organize, converge, summary).
    3.  Validates "Complexity" score (must be <= 0.8 per stage).
-   **Output**: `WidgetSelectionResult` (JSON).

### Stage 2: Plan ORS Generation (v5 Extension)
-   **Service**: `ORSGeneratorService.ts`
-   **Input**: Concern Text, Widget Selection Result.
-   **Logic**:
    1.  Aggregates I/O port info from selected widgets.
    2.  Prompts LLM (`plan-unified.prompt.ts`) to generate a **unified data schema** for all 3 sections.
    3.  Mandates creation of a `DependencyGraph` linking section outputs (e.g., `diverge_data.output` → `organize_data.input`).
-   **Output**: `PlanORS` (JSON).

### Stage 3: Plan UISpec Generation (v5 Extension)
-   **Service**: `UISpecGeneratorV4.ts`
-   **Input**: PlanORS, Widget Selection Result.
-   **Logic**:
    1.  **GeneratedValue**: Prompts LLM to fill "empty" widgets with context-aware content (e.g., sample brainstorm cards) using a **Checklist** approach.
    2.  **DataBinding**: Maps Widget Ports to ORS Attributes.
    3.  **ReactiveBinding (W2WR)**: Defines peer-to-peer connections between widgets across sections using specific "Heuristics" provided in the prompt.
-   **Output**: `PlanUISpec` (JSON).

---

## 3. Reactivity System (W2WR: Widget-to-Widget Reactivity)

The core innovation "W2WR" allows widgets to communicate directly on the client side without server roundtrips, governed by the `ReactiveBindingEngine`.

### 3.1 ReactiveBindingEngineV4
-   **Location**: `concern-app/src/services/ui/ReactiveBindingEngineV4.ts`
-   **Role**: A framework-agnostic engine that manages the dependency graph of widgets.
-   **Key Features**:
    -   **Port Value Cache**: Maintains the latest state of all ports (`widgetId.portId`).
    -   **Propagation**: When a port updates, it finds all downstream bindings and executes them.
    -   **Update Modes**:
        -   `realtime`: Synchronous execution (for low complexity widgets).
        -   `debounced`: Delays execution (default 300ms) to prevent UI jitter.
        -   `on_confirm`: Queues execution until user explicit approval (for high-risk changes).

### 3.2 Relationships
The engine supports multiple relationship types for data transformation:
-   `passthrough`: Direct copy (`target = source`).
-   `javascript`: Client-side execution of logic (`target = fn(source)`).
    -   *Security Note*: Executed via `new Function()`. confined to simple data transformations.
-   `transform`: Predefined transformation helper functions.

---

## 4. Frontend Architecture

### 4.1 UIRendererV4
-   **Location**: `concern-app/src/services/ui-generation/UIRendererV4.tsx`
-   **Role**: The React component that orchestrates the entire dynamic view.
-   **Responsibilities**:
    1.  **Instantiation**: Creates `DataBindingProcessor` (for ORS sync) and `ReactiveBindingEngineV4` (for W2WR).
    2.  **Initialization**: Hydrates the Engine with initial values from ORS.
    3.  **Event Loop**:
        -   Listens to `onPropagate` from Engine → Updates React State (`portValues`).
        -   Listens to Widget `onChange` → Calls Engine `updatePort`.
    4.  **Component Mapping**: Renders specific React components (e.g., `BrainstormCards`) based on `widgetId`.

### 4.2 State Management
-   **Widget Internal State**: Managed partially by Jotai Atoms (`store/widgetAtoms.ts`) and local React state.
-   **Cross-Widget State**: Purely managed by `ReactiveBindingEngineV4`'s internal Map and pushed to components via props (`initialPortValues`).

---

## 5. Prompt Engineering Strategy

The system relies on specific prompting techniques to ensure reliability ("LLM-Hardened").

1.  **BLUF (Bottom Line Up Front)**:
    -   Prompts verify critical constraints (like "DependencyGraph is MANDATORY") at the very top.
2.  **Constraint Checklists**:
    -   `UISpecGeneratorV4` generates a text-based checklist of "Required Generated Values" and injects it into the prompt.
    -   The LLM is instructed to "verify against the checklist" before generating JSON.
3.  **Explicit Port Information**:
    -   Instead of letting LLM guess, the prompts receive a flattened, schema-defined list of all available Ports (IN/OUT) and their data types.

---

## 6. Implementation Gaps & Clarifications for Thesis

Based on the code analysis, here are specific clarifications for the thesis:

-   **"Atom" vs Engine**: The thesis references "Atom-based reactivity". In implementation, while Jotai is available, the *W2WR* logic is centralized in the `ReactiveBindingEngineV4` class, which essentially acts as a "Super Atom" or a signal manager. It's more accurate to describe it as an "Event-driven Propagation Engine" that syncs with the React/Jotai state tree.
-   **Deterministic Behavior**: The deterministic nature comes from the fixed `WidgetDefinition` ports and the rigid `JSON` structure enforced by TypeScript interfaces, not necessarily the LLM's internal reasoning. The **pipeline** forces determinism by narrowing the search space at each stage.
-   **GeneratedValue**: This is a Stage 3 (UISpec) responsibility. It is *not* just a placeholder; the system actively prompts for "context-aware" samples (e.g., "Generate 3 sample brainstorm cards about 'changing jobs'").
