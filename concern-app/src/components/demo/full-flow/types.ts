/**
 * Full-Flow Demo Types
 * Phase 4: capture -> plan (4 stages) -> breakdown フロー用型定義
 */

import type { BottleneckAnalysis, BottleneckType } from '../../../types/BottleneckTypes';

// Phase types
export type Phase = 'capture' | 'plan' | 'breakdown' | 'complete';
export type PlanStage = 'diverge' | 'organize' | 'converge' | 'summary';

// Stage execution mode
export type StageMode = 'widget' | 'text';

// Plan stage configuration
export interface PlanStageConfig {
  stage: PlanStage;
  mode: StageMode;
  availableWidgets: string[];
  description: string;
}

export const PLAN_STAGE_CONFIGS: PlanStageConfig[] = [
  {
    stage: 'diverge',
    mode: 'widget',
    availableWidgets: ['emotion_palette', 'brainstorm_cards', 'question_card_chain'],
    description: '発散フェーズ - アイデアを広げ、感情を表現する',
  },
  {
    stage: 'organize',
    mode: 'widget',
    availableWidgets: ['card_sorting', 'dependency_mapping', 'swot_analysis', 'mind_map'],
    description: '整理フェーズ - 情報を構造化し、関係性を明確にする',
  },
  {
    stage: 'converge',
    mode: 'widget',
    availableWidgets: ['matrix_placement', 'priority_slider_grid', 'tradeoff_balance', 'timeline_slider'],
    description: '収束フェーズ - 優先順位をつけ、決断に向かう',
  },
  {
    stage: 'summary',
    mode: 'widget',
    availableWidgets: ['structured_summary'],
    description: 'まとめフェーズ - 結論を構造化して出力する',
  },
];

// Widget result data
export interface WidgetResultData {
  widgetId: string;
  component: string;
  data: any;
  timestamp: string;
}

// Stage result
export interface StageResult {
  stage: PlanStage;
  mode: StageMode;
  uiSpec?: any;
  widgetResults: WidgetResultData[];
  textSummary?: string;
  completedAt?: string;
}

// Task status
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

// Task from breakdown
export interface GeneratedTask {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  source: string; // e.g., 'diverge', 'converge', 'default'
  estimatedMinutes?: number;
}

// Full flow state
export interface FullFlowState {
  // Session
  sessionId: string;

  // Current position
  phase: Phase;
  planStage: PlanStage | null;

  // Capture data
  concernText: string;
  bottleneckAnalysis: BottleneckAnalysis | null;
  diagnosticResponses: Record<string, any>;

  // Plan data (per stage)
  planStageResults: Partial<Record<PlanStage, StageResult>>;

  // Breakdown data
  breakdownTasks: GeneratedTask[];

  // Timestamps
  startedAt: string;
  completedAt?: string;
}

// Stage metrics
export interface StageMetrics {
  id: string;
  phase: Phase;
  stage?: PlanStage;
  operation: string;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
  processingTimeMs: number;
  model: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

// Cumulative metrics
export interface CumulativeMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalPromptTokens: number;
  totalResponseTokens: number;
  totalTokens: number;
  totalTimeMs: number;
  avgTimePerCall: number;
}

// Metrics export format
export interface MetricsExport {
  sessionId: string;
  concernText: string;
  entries: StageMetrics[];
  cumulative: CumulativeMetrics;
  exportedAt: string;
}

// Phase descriptions for UI
export const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  capture: '関心事の入力と診断',
  plan: '計画の策定（4ステージ）',
  breakdown: 'タスク分解',
  complete: '完了',
};

// Bottleneck to recommended widgets mapping
export const BOTTLENECK_WIDGET_RECOMMENDATIONS: Record<BottleneckType, string[]> = {
  tooManyOptions: ['matrix_placement', 'priority_slider_grid', 'card_sorting', 'tradeoff_balance'],
  emotionalBlock: ['emotion_palette', 'brainstorm_cards', 'question_card_chain'],
  noStartingPoint: ['brainstorm_cards', 'question_card_chain', 'mind_map'],
  entangledProblems: ['brainstorm_cards', 'matrix_placement', 'dependency_mapping', 'swot_analysis'],
  lackOfInformation: ['brainstorm_cards', 'question_card_chain', 'mind_map'],
  fearOfDecision: ['emotion_palette', 'matrix_placement', 'tradeoff_balance', 'timeline_slider'],
  fixedPerspective: ['brainstorm_cards', 'swot_analysis', 'mind_map'],
  noPrioritization: ['priority_slider_grid', 'matrix_placement', 'card_sorting', 'timeline_slider'],
};
