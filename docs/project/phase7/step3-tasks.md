# Phase 7 Step 3: Content Generation Enhancements (Tasks)

**Goal**: Implement context-aware content generation using UI Atoms and updated DSL structure.

## 1. DSL & Backend Types
- [ ] **Update `WidgetDefinition` Type**
    -   Modify `server/src/types/WidgetDefinition.ts` to add `uiComponent` to `ReactivePortDefinition`.
    -   `git commit -m "feat(dsl): add uiComponent to ReactivePortDefinition"`
- [ ] **Update Widget Definitions**
    -   Update `server/src/definitions/widgets.ts` to use `uiComponent` for:
        -   `brainstorm_cards` (cards)
        -   `swot_analysis` (items)
        -   `priority_slider_grid` (items)
        -   `matrix_placement` (items)
    -   `git commit -m "feat(dsl): update widget definitions with uiComponent specs"`

## 2. Generator Logic
- [ ] **Update Prompt Generator**
    -   Modify `server/src/generators/WidgetDefinitionGenerator.ts` to generate prompts including `generationSpec`.
    -   `git commit -m "feat(generator): include generationSpec in widget definition prompt"`
- [ ] **Update UISpec Generator**
    -   Modify `server/src/services/UISpecGeneratorV3.ts` to instruct LLM to output samples to `config`.
    -   `git commit -m "feat(generator): update system prompt to target config for generated content"`

## 3. Frontend Core (Renderer)
- [ ] **Update `ui-spec.types.ts`**
    -   Ensure `WidgetSpec` interface supports the new `config` structure (if strict typing is needed).
    -   `git commit -m "feat(frontend): update WidgetSpec type for config support"`
- [ ] **Update `UIRendererV3`**
    -   Verify `config` is correctly passed to widgets.
    -   Implement display of `config.description` (e.g., as a help icon or header text).
    -   `git commit -m "feat(renderer): enhance UIRendererV3 to display context description"`

## 4. Widget Implementation (Iterative)
- [ ] **Refactor `BrainstormCards`**
    -   Implement logic to read `config.cards.samples`.
    -   Display samples as suggestions.
    -   `git commit -m "feat(widget): implement sample display in BrainstormCards"`
- [ ] **Refactor `EmotionPalette`**
    -   Ensure it uses `config.prompt` / `config.description` if available.
    -   `git commit -m "feat(widget): update EmotionPalette to use dynamic config"`
- [ ] **Refactor `SwotAnalysis`**
    -   Implement sample display for each quadrant.
    -   `git commit -m "feat(widget): implement sample display in SwotAnalysis"`
- [ ] **Refactor `PrioritySliderGrid`**
    -   Implement sample display for items.
    -   `git commit -m "feat(widget): implement sample display in PrioritySliderGrid"`

## 5. Documentation
- [ ] **Update DSL Specifications**
    -   Update `specs/dsl-design/v3/widget-definition-spec.md` to reflect `uiComponent`.
    -   Update `specs/dsl-design/v3/DSL-Core-Spec-v3.0.md` if necessary.
    -   `git commit -m "docs: update DSL specifications for v3.1 changes"`
