/**
 * DSL v4 Services Index
 *
 * 3段階LLM呼び出しサービスのエクスポート
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

// =============================================================================
// LLM Orchestrator
// =============================================================================
export {
  LLMOrchestrator,
  createLLMOrchestrator,
  createLLMOrchestratorWithDefaultPrompts,
  type LLMOrchestratorConfig,
  type LLMServiceInterface,
  type PromptTemplateManager,
  InMemoryPromptTemplateManager,
} from './LLMOrchestrator';

// =============================================================================
// Stage 1: Widget Selection
// =============================================================================
export {
  WidgetSelectionService,
  createWidgetSelectionService,
  type WidgetSelectionInput,
  type WidgetSelectionServiceConfig,
} from './WidgetSelectionService';

// =============================================================================
// Stage 2: ORS Generation
// =============================================================================
export {
  ORSGeneratorService,
  createORSGeneratorService,
  type ORSGeneratorInput,
  type ORSGeneratorServiceConfig,
  type StageResult,
} from './ORSGeneratorService';

// =============================================================================
// Stage 3: UISpec Generation
// =============================================================================
export {
  UISpecGeneratorV4,
  createUISpecGeneratorV4,
  type UISpecGeneratorInput,
  type UISpecGeneratorServiceConfig,
} from './UISpecGeneratorV4';

// =============================================================================
// Validation
// =============================================================================
export {
  ValidationService,
  createValidationService,
  type ValidationServiceConfig,
  type ValidationResult,
  type ValidationError,
  type ValidationSeverity,
} from './ValidationService';

// =============================================================================
// Widget Summarization
// =============================================================================
export {
  WidgetSummarizationService,
  createWidgetSummarizationService,
  type WidgetState,
  type WidgetSummary,
  type BatchSummarizationInput,
  type BatchSummarizationResult,
} from './WidgetSummarizationService';
