/**
 * LLM Task Type Definitions for DSL v4
 *
 * 3段階LLM呼び出しのタスク設定型定義。
 * タスク別モデル切り替えとプロンプト管理に使用。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @see specs/discussions/DSLv4_review_minutes.md トピック4
 * @since DSL v4.0
 */

import type { DICT, SVAL } from './ors.types';

// =============================================================================
// LLM Task Types
// =============================================================================

/**
 * LLMタスク種別
 *
 * DSL v4の3段階LLM呼び出し + 追加タスク
 * DSL v5: Plan統合生成タスク追加
 */
export type LLMTaskType =
  | 'capture_diagnosis'      // Captureフェーズ診断（ボトルネック判定）
  | 'widget_selection'       // 第1段階: Widget選定（4ステージ一括）
  | 'ors_generation'         // 第2段階: ORS + DpG生成
  | 'uispec_generation'      // 第3段階: UISpec生成
  | 'summary_generation'     // まとめ生成（Breakdownフェーズ）
  // DSL v5: Plan統合生成
  | 'plan_ors_generation'    // Plan統合ORS生成（3セクション分を1回で）
  | 'plan_uispec_generation'; // Plan統合UISpec生成（3セクション分を1回で）

/**
 * LLMタスク分類
 *
 * - general: 汎用タスク（判断・分析・文章生成）
 * - structured: 構造化タスク（JSON出力）
 */
export type LLMTaskCategory = 'general' | 'structured';

/**
 * タスク種別とカテゴリの対応
 */
export const LLM_TASK_CATEGORIES: Record<LLMTaskType, LLMTaskCategory> = {
  capture_diagnosis: 'general',
  widget_selection: 'general',
  ors_generation: 'structured',
  uispec_generation: 'structured',
  summary_generation: 'general',
  // DSL v5: Plan統合生成
  plan_ors_generation: 'structured',
  plan_uispec_generation: 'structured',
};

// =============================================================================
// Model Configuration
// =============================================================================

/**
 * LLMプロバイダー
 */
export type LLMProvider = 'gemini' | 'openai' | 'anthropic';

/**
 * モデル設定
 */
export interface ModelConfig {
  /** プロバイダー */
  provider: LLMProvider;
  /** モデルID */
  modelId: string;
  /** 温度（0.0-1.0） */
  temperature: number;
  /** 最大トークン数 */
  maxTokens?: number;
  /** Top-P */
  topP?: number;
  /** Top-K */
  topK?: number;
}

/**
 * デフォルトのモデル設定
 */
export const DEFAULT_MODEL_CONFIGS: Record<LLMTaskCategory, ModelConfig> = {
  general: {
    provider: 'gemini',
    modelId: 'gemini-2.5-flash-lite',
    temperature: 0.7,
    maxTokens: 4096,
  },
  structured: {
    provider: 'gemini',
    modelId: 'gemini-2.5-flash-lite',
    temperature: 0.3,
    maxTokens: 8192,
  },
};

// =============================================================================
// JSON Schema (出力スキーマ)
// =============================================================================

/**
 * JSON Schema（簡易版）
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

// =============================================================================
// LLM Task Configuration
// =============================================================================

/**
 * LLMタスク設定
 *
 * 各タスクの実行設定を定義
 */
export interface LLMTaskConfig {
  /** タスク種別 */
  taskType: LLMTaskType;

  /** モデル設定 */
  model: ModelConfig;

  /** プロンプトテンプレートID（prompts/v4/内のファイル名） */
  promptTemplateId: string;

  /** 出力スキーマ（構造化タスクの場合） */
  outputSchema?: JSONSchema;

  /** 最大リトライ回数 */
  maxRetries: number;

  /** タイムアウト（ミリ秒） */
  timeout: number;

  /** 説明（デバッグ用） */
  description?: string;
}

/**
 * LLMタスク設定マップ
 */
export type LLMTaskConfigMap = Record<LLMTaskType, LLMTaskConfig>;

// =============================================================================
// 実験パターン
// =============================================================================

/**
 * 実験パターン設定
 *
 * 汎用タスクと構造化タスクで異なるモデルを使用する実験用
 */
export interface ExperimentPattern {
  /** パターンID */
  id: string;
  /** パターン名 */
  name: string;
  /** 説明 */
  description: string;
  /** 汎用タスク用モデル */
  generalTaskModel: ModelConfig;
  /** 構造化タスク用モデル */
  structuredTaskModel: ModelConfig;
}

/**
 * 実験パターンの例
 *
 * | パターン | 汎用タスク(1,2,5) | 構造化タスク(3,4) | 目的 |
 * |---------|------------------|------------------|------|
 * | A | GPT-5 | GPT-5 | ベースライン |
 * | B | GPT-5-mini | GPT-5-mini | 低コスト全体 |
 * | C | GPT-5 | GPT-5-Codex | 構造化特化の効果検証 |
 * | D | GPT-5 | GPT-5-mini | 構造化タスクのコスト削減可能性 |
 */
export const EXPERIMENT_PATTERNS: ExperimentPattern[] = [
  {
    id: 'baseline',
    name: 'ベースライン',
    description: '全タスクで同一モデルを使用',
    generalTaskModel: {
      provider: 'gemini',
      modelId: 'gemini-2.5-flash-lite',
      temperature: 0.7,
    },
    structuredTaskModel: {
      provider: 'gemini',
      modelId: 'gemini-2.5-flash-lite',
      temperature: 0.3,
    },
  },
  {
    id: 'low-cost',
    name: '低コスト',
    description: '全タスクで低コストモデルを使用',
    generalTaskModel: {
      provider: 'gemini',
      modelId: 'gemini-2.0-flash',
      temperature: 0.7,
    },
    structuredTaskModel: {
      provider: 'gemini',
      modelId: 'gemini-2.0-flash',
      temperature: 0.3,
    },
  },
];

// =============================================================================
// LLM呼び出し結果
// =============================================================================

/**
 * LLM呼び出しメトリクス
 */
export interface LLMCallMetrics {
  /** タスク種別 */
  taskType: LLMTaskType;
  /** 使用モデル */
  modelId: string;
  /** 入力トークン数 */
  inputTokens?: number;
  /** 出力トークン数 */
  outputTokens?: number;
  /** レイテンシ（ミリ秒） */
  latencyMs: number;
  /** リトライ回数 */
  retryCount: number;
  /** 成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  errorMessage?: string;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * LLM呼び出し結果
 */
export interface LLMCallResult<T = unknown> {
  /** 成功フラグ */
  success: boolean;
  /** 結果データ（成功時） */
  data?: T;
  /** 生のLLM出力 */
  rawOutput?: string;
  /** 使用されたプロンプト（デバッグ・記録用） */
  prompt?: string;
  /** エラー情報（失敗時） */
  error?: {
    type: 'timeout' | 'parse_error' | 'validation_error' | 'api_error' | 'unknown';
    message: string;
    details?: DICT<SVAL>;
  };
  /** メトリクス */
  metrics: LLMCallMetrics;
}

// =============================================================================
// デフォルトタスク設定
// =============================================================================

/**
 * デフォルトのLLMタスク設定
 */
export const DEFAULT_LLM_TASK_CONFIGS: LLMTaskConfigMap = {
  capture_diagnosis: {
    taskType: 'capture_diagnosis',
    model: DEFAULT_MODEL_CONFIGS.general,
    promptTemplateId: 'capture-diagnosis',
    maxRetries: 2,
    timeout: 30000,
    description: 'ユーザーの悩みからボトルネック種別を診断',
  },
  widget_selection: {
    taskType: 'widget_selection',
    model: DEFAULT_MODEL_CONFIGS.general,
    promptTemplateId: 'widget-selection',
    // outputSchema を定義することで generateJSON が使用される
    outputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        stages: { type: 'object' },
        rationale: { type: 'string' },
        flowDescription: { type: 'string' },
        totalEstimatedDuration: { type: 'number' },
        metadata: { type: 'object' },
      },
      required: ['version', 'stages'],
    },
    maxRetries: 2,
    timeout: 45000,
    description: '4ステージ分のWidget選定を一括実行',
  },
  ors_generation: {
    taskType: 'ors_generation',
    model: DEFAULT_MODEL_CONFIGS.structured,
    promptTemplateId: 'ors-generation',
    maxRetries: 3,
    timeout: 60000,
    description: 'ORS + DependencyGraphを生成',
  },
  uispec_generation: {
    taskType: 'uispec_generation',
    model: DEFAULT_MODEL_CONFIGS.structured,
    promptTemplateId: 'uispec-generation',
    maxRetries: 3,
    timeout: 60000,
    description: 'UISpec + ReactiveBindingを生成',
  },
  summary_generation: {
    taskType: 'summary_generation',
    model: DEFAULT_MODEL_CONFIGS.general,
    promptTemplateId: 'summary-generation',
    maxRetries: 2,
    timeout: 30000,
    description: 'Breakdownフェーズのまとめを生成',
  },
  // DSL v5: Plan統合生成
  plan_ors_generation: {
    taskType: 'plan_ors_generation',
    model: DEFAULT_MODEL_CONFIGS.structured,
    promptTemplateId: 'plan-ors-generation',
    maxRetries: 3,
    timeout: 90000, // 3セクション分なので長めに設定
    description: 'Plan統合ORS生成（diverge/organize/converge 3セクション分）',
  },
  plan_uispec_generation: {
    taskType: 'plan_uispec_generation',
    model: DEFAULT_MODEL_CONFIGS.structured,
    promptTemplateId: 'plan-uispec-generation',
    maxRetries: 3,
    timeout: 90000, // 3セクション分なので長めに設定
    description: 'Plan統合UISpec生成（diverge/organize/converge 3セクション分）',
  },
};

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * タスク種別からカテゴリを取得
 */
export function getTaskCategory(taskType: LLMTaskType): LLMTaskCategory {
  return LLM_TASK_CATEGORIES[taskType];
}

/**
 * タスク種別からデフォルトモデル設定を取得
 */
export function getDefaultModelConfig(taskType: LLMTaskType): ModelConfig {
  const category = getTaskCategory(taskType);
  return DEFAULT_MODEL_CONFIGS[category];
}

/**
 * 実験パターンからタスク設定マップを生成
 */
export function createTaskConfigsFromPattern(pattern: ExperimentPattern): LLMTaskConfigMap {
  const configs = { ...DEFAULT_LLM_TASK_CONFIGS };

  for (const taskType of Object.keys(configs) as LLMTaskType[]) {
    const category = getTaskCategory(taskType);
    const model = category === 'general' ? pattern.generalTaskModel : pattern.structuredTaskModel;
    configs[taskType] = {
      ...configs[taskType],
      model,
    };
  }

  return configs;
}

// =============================================================================
// 型ガード
// =============================================================================

/**
 * LLMTaskTypeの型ガード
 */
export function isLLMTaskType(value: unknown): value is LLMTaskType {
  const validTypes: LLMTaskType[] = [
    'capture_diagnosis',
    'widget_selection',
    'ors_generation',
    'uispec_generation',
    'summary_generation',
    // DSL v5
    'plan_ors_generation',
    'plan_uispec_generation',
  ];
  return typeof value === 'string' && validTypes.includes(value as LLMTaskType);
}

/**
 * LLMProviderの型ガード
 */
export function isLLMProvider(value: unknown): value is LLMProvider {
  return value === 'gemini' || value === 'openai' || value === 'anthropic';
}

/**
 * ModelConfigの型ガード
 */
export function isModelConfig(value: unknown): value is ModelConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isLLMProvider(v.provider) &&
    typeof v.modelId === 'string' &&
    typeof v.temperature === 'number'
  );
}

/**
 * LLMTaskConfigの型ガード
 */
export function isLLMTaskConfig(value: unknown): value is LLMTaskConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isLLMTaskType(v.taskType) &&
    isModelConfig(v.model) &&
    typeof v.promptTemplateId === 'string' &&
    typeof v.maxRetries === 'number' &&
    typeof v.timeout === 'number'
  );
}

/**
 * LLMCallResultの型ガード
 */
export function isLLMCallResult(value: unknown): value is LLMCallResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.success === 'boolean' &&
    typeof v.metrics === 'object'
  );
}
