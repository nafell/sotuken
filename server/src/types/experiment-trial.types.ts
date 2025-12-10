/**
 * Layer1/Layer4 自動評価実験 型定義
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

// ========================================
// モデル構成
// ========================================

/** モデル構成ID */
export type ModelConfigId = 'A' | 'B' | 'C' | 'D' | 'E';

/** モデル構成定義 */
export interface ModelConfiguration {
  id: ModelConfigId;
  name: string;
  /** [Stage1, Stage2, Stage3] のモデルID */
  stages: [string, string, string];
}

/** 全モデル構成 */
export const MODEL_CONFIGURATIONS: Record<ModelConfigId, ModelConfiguration> = {
  'A': { id: 'A', name: 'All-5-Chat', stages: ['gpt-5-chat', 'gpt-5-chat', 'gpt-5-chat'] },
  'B': { id: 'B', name: 'All-5-mini', stages: ['gpt-5-mini', 'gpt-5-mini', 'gpt-5-mini'] },
  'C': { id: 'C', name: 'Hybrid-5Chat/4.1', stages: ['gpt-5-chat', 'gpt-4.1', 'gpt-4.1'] },
  'D': { id: 'D', name: 'Hybrid-5Chat/5mini', stages: ['gpt-5-chat', 'gpt-5-mini', 'gpt-5-mini'] },
  'E': { id: 'E', name: 'Router-based', stages: ['model-router', 'model-router', 'model-router'] },
} as const;

// ========================================
// 試行ログエントリ（設計書7章スキーマ）
// ========================================

/**
 * 試行ログエントリ
 * 設計書7章のJSONスキーマに完全対応
 */
export interface TrialLogEntry {
  experiment_id: string;
  model_config: string;
  model_router_selection: string[] | null;
  stage: number; // 1, 2, 3
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;

  dsl_errors: string[] | null;
  render_errors: string[] | null;
  w2wr_errors: string[] | null;
  react_component_errors: string[] | null;
  jotai_atom_errors: string[] | null;
  type_error_count: number;
  reference_error_count: number;
  cycle_detected: boolean;
  regenerated: boolean;
  runtime_error: boolean;

  timestamp: string; // ISO 8601
}

// ========================================
// バッチ実行
// ========================================

/** バッチ実行ステータス */
export type BatchStatus = 'queued' | 'running' | 'completed' | 'failed' | 'stopped';

/** バッチ実行設定 */
export interface BatchExecutionConfig {
  experimentId: string;
  modelConfigs: ModelConfigId[];
  inputCorpusId: string;
  parallelism: number;
  headlessMode: boolean;
  /** 実行する入力データの最大件数 */
  maxTrials?: number;
}

/** 並列実行中のタスク情報 */
export interface RunningTask {
  workerId: number;
  modelConfig: ModelConfigId;
  inputId: string;
  stage: number;
  startedAt: string; // ISO 8601
}

/** バッチ実行進捗 */
export interface BatchProgress {
  batchId: string;
  status: BatchStatus;
  totalTrials: number;
  completedTrials: number;
  failedTrials: number;
  /** ステージ単位の進捗（試行×3） */
  totalStages: number;
  completedStages: number;
  /** 並列実行中の全タスク */
  runningTasks: RunningTask[];
  elapsedMs?: number;
  // 後方互換性のために残す（deprecated）
  currentModelConfig?: ModelConfigId;
  currentInputIndex?: number;
  currentStage?: number;
  currentInputId?: string;
}

// ========================================
// 入力コーパス
// ========================================

/** 入力データ1件 */
export interface ExperimentInput {
  inputId: string;
  concernText: string;
  contextFactors: {
    category: string;
    urgency: string;
    emotionalState: string;
    timeAvailable: string;
    [key: string]: unknown;
  };
}

/** 入力コーパス */
export interface InputCorpus {
  corpusId: string;
  description: string;
  inputs: ExperimentInput[];
}

// ========================================
// Layer1 指標（構造健全性）
// ========================================

/**
 * Layer1 評価指標
 * - VR: DSL妥当率
 * - TCR: 型整合率
 * - RRR: 参照整合率
 * - CDR: 循環依存率
 * - RGR: 再生成率
 * - W2WR_SR: W2WR DSL生成成功率
 * - RC_SR: Reactコンポーネント変換成功率
 * - JA_SR: Jotai atom変換成功率
 */
export interface Layer1Metrics {
  /** DSL妥当率: dsl_errors=null && render_errors=null の割合 */
  VR: number;
  /** 型整合率: type_error_count=0 の割合 */
  TCR: number;
  /** 参照整合率: reference_error_count=0 の割合 */
  RRR: number;
  /** 循環依存率: cycle_detected=true の割合 */
  CDR: number;
  /** 再生成率: regenerated=true の割合 */
  RGR: number;
  /** W2WR DSL生成成功率: w2wr_errors=null の割合 */
  W2WR_SR: number;
  /** Reactコンポーネント変換成功率: react_component_errors=null の割合 */
  RC_SR: number;
  /** Jotai atom変換成功率: jotai_atom_errors=null の割合 */
  JA_SR: number;
}

// ========================================
// Layer4 指標（実用性）
// ========================================

/**
 * Layer4 評価指標
 * - LAT: 平均レイテンシ (ms)
 * - COST: 推定APIコスト (JPY)
 * - FR: 異常終了率
 */
export interface Layer4Metrics {
  /** 平均レイテンシ (ms) */
  LAT: number;
  /** 推定APIコスト (JPY) */
  COST: number;
  /** 異常終了率: runtime_error=true の割合 */
  FR: number;
}

// ========================================
// モデル別統計結果
// ========================================

/** モデル構成別の統計結果 */
export interface ModelStatistics {
  modelConfig: string;
  trialCount: number;
  layer1: Layer1Metrics;
  layer4: Layer4Metrics;
}

/** バッチ実行結果サマリー */
export interface BatchResultsSummary {
  batchId: string;
  experimentId: string;
  totalTrials: number;
  completedTrials: number;
  failedTrials: number;

  /** モデル構成別統計 */
  byModel: ModelStatistics[];

  /** 全体統計 */
  overall: {
    layer1: Layer1Metrics;
    layer4: Layer4Metrics;
  };

  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
}

// ========================================
// DSLエラータイプ
// ========================================

/** DSLエラータイプ一覧 */
export const DSL_ERROR_TYPES = [
  'JSON_PARSE_ERROR',
  'ZOD_SCHEMA_MISMATCH',
  'UNKNOWN_WIDGET',
  'UNKNOWN_ENTITY',
  'UNKNOWN_ATTRIBUTE',
  'INVALID_PATH',
  'CIRCULAR_DEPENDENCY',
  'REFERENCE_ERROR',
  'DUPLICATE_ID',
  'MISSING_REQUIRED_FIELD',
  'INVALID_BINDING',
  'TYPE_MISMATCH',
  'COMPLEXITY_VIOLATION',
  'INVALID_VERSION',
  'NO_WIDGETS',
  'DUPLICATE_WIDGET',
  'SELF_REFERENCE',
  'INVALID_RELATIONSHIP',
  'INVALID_UISPEC',
  'INVALID_UISPEC_STRUCTURE',
] as const;

export type DSLErrorType = typeof DSL_ERROR_TYPES[number];

/** レンダーエラータイプ一覧 */
export const RENDER_ERROR_TYPES = [
  'ATOM_CREATION_FAILED',
  'BINDING_RESOLUTION_FAILED',
  'CYCLIC_DEPENDENCY',
  'WIDGET_NOT_FOUND',
  'PORT_NOT_FOUND',
  'INVALID_TRANSFORM',
  'RUNTIME_EXCEPTION',
] as const;

export type RenderErrorType = typeof RENDER_ERROR_TYPES[number];

// ========================================
// W2WR/React/Jotaiエラータイプ
// ========================================

/** W2WRエラータイプ一覧（バックエンド検出） */
export const W2WR_ERROR_TYPES = [
  'CIRCULAR_DEPENDENCY',
  'SELF_REFERENCE',
  'INVALID_BINDING',
  'UNKNOWN_SOURCE_WIDGET',
  'UNKNOWN_TARGET_WIDGET',
] as const;

export type W2WRErrorType = typeof W2WR_ERROR_TYPES[number];

/** Reactコンポーネントエラータイプ一覧（フロントエンド検出） */
export const REACT_COMPONENT_ERROR_TYPES = [
  'UNKNOWN_WIDGET',
  'INVALID_PROPS',
  'RENDER_EXCEPTION',
] as const;

export type ReactComponentErrorType = typeof REACT_COMPONENT_ERROR_TYPES[number];

/** Jotai atomエラータイプ一覧（フロントエンド検出） */
export const JOTAI_ATOM_ERROR_TYPES = [
  'ATOM_CREATION_FAILED',
  'MISSING_WIDGET_ID',
  'DUPLICATE_ATOM',
] as const;

export type JotaiAtomErrorType = typeof JOTAI_ATOM_ERROR_TYPES[number];

// ========================================
// API リクエスト/レスポンス型
// ========================================

/** バッチ開始リクエスト */
export interface StartBatchRequest {
  experimentId: string;
  modelConfigs: ModelConfigId[];
  inputCorpusId: string;
  parallelism?: number;
  headlessMode?: boolean;
}

/** バッチ開始レスポンス */
export interface StartBatchResponse {
  batchId: string;
  totalTrials: number;
  status: BatchStatus;
}

/** バッチステータスレスポンス */
export interface BatchStatusResponse {
  batchId: string;
  experimentId: string;
  status: BatchStatus;
  progress: BatchProgress;
  errors?: string[];
}

/** バッチ結果レスポンス */
export interface BatchResultsResponse {
  batchId: string;
  status: BatchStatus;
  summary: BatchResultsSummary;
  downloadUrls?: {
    rawLogs: string;
    aggregated: string;
    statistics: string;
  };
}

/** render-feedback リクエスト */
export interface RenderFeedbackRequest {
  stage: number;
  renderErrors: string[] | null;
  typeErrorCount: number;
  referenceErrorCount: number;
  cycleDetected: boolean;
  renderDuration: number;
}

// ========================================
// APIコスト計算用定数
// ========================================

/** トークン単価 (USD per 1K tokens) - 2025年12月時点の概算 */
export const TOKEN_PRICES = {
  'gpt-5-chat': { input: 0.015, output: 0.060 },
  'gpt-5-mini': { input: 0.0015, output: 0.006 },
  'gpt-4.1': { input: 0.010, output: 0.030 },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
  'model-router': { input: 0.010, output: 0.030 }, // 保守的にgpt-4.1相当で計算
} as const;

/** USD to JPY レート */
export const USD_TO_JPY = 150;
