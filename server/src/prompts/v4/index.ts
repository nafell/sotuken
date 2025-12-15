/**
 * DSL v4 Prompt Templates Index
 *
 * 3段階LLM呼び出しのプロンプトテンプレート
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

export { CAPTURE_DIAGNOSIS_PROMPT } from './capture-diagnosis.prompt';
export { WIDGET_SELECTION_PROMPT } from './widget-selection.prompt';
export { ORS_GENERATION_PROMPT } from './ors-generation.prompt';
export { UISPEC_GENERATION_PROMPT } from './uispec-generation.prompt';
export { SUMMARY_GENERATION_PROMPT } from './summary-generation.prompt';

/**
 * プロンプトテンプレートマップ
 */
export const PROMPT_TEMPLATES = {
  'capture-diagnosis': () => import('./capture-diagnosis.prompt').then((m) => m.CAPTURE_DIAGNOSIS_PROMPT),
  'widget-selection': () => import('./widget-selection.prompt').then((m) => m.WIDGET_SELECTION_PROMPT),
  'ors-generation': () => import('./ors-generation.prompt').then((m) => m.ORS_GENERATION_PROMPT),
  'uispec-generation': () => import('./uispec-generation.prompt').then((m) => m.UISPEC_GENERATION_PROMPT),
  'summary-generation': () => import('./summary-generation.prompt').then((m) => m.SUMMARY_GENERATION_PROMPT),
} as const;

export type PromptTemplateId = keyof typeof PROMPT_TEMPLATES;
