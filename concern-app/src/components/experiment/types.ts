export type PlanStage = 'diverge' | 'organize' | 'converge' | 'summary';

export interface WidgetResultData {
    widgetId: string;
    component: string;
    data: Record<string, unknown>;
    timestamp: string;
}

/**
 * 実験中に発生するエラーの種別
 * - unknown_widget: 存在しないWidgetが選定された（継続可能）
 * - ors_parse_error: ORS DSLのパースエラー（継続可能）
 * - uispec_parse_error: UISpec DSLのパースエラー（継続可能）
 * - llm_api_error: LLM API呼び出しエラー（継続可能、リトライ後）
 * - widget_selection_failed: Widget選定自体が失敗（継続不可）
 * - validation_error: バリデーションエラー（継続可能）
 */
export type ExperimentErrorType =
    | 'unknown_widget'
    | 'ors_parse_error'
    | 'uispec_parse_error'
    | 'llm_api_error'
    | 'widget_selection_failed'
    | 'validation_error';

/**
 * 実験中に発生したエラーの記録
 */
export interface ExperimentError {
    type: ExperimentErrorType;
    message: string;
    stage?: PlanStage;
    timestamp: number;
    recoverable: boolean; // true: 実験継続可能, false: 実験終了が必要
    details?: Record<string, unknown>; // エラー詳細（widgetId, componentNameなど）
}

// 後方互換性のためのエイリアス
export type UnknownWidgetError = ExperimentError;

export interface StageResult {
    stage: PlanStage;
    mode: 'widget' | 'text';
    uiSpec?: Record<string, unknown>;
    ors?: Record<string, unknown>; // V4で追加: ORS（Object Representation Schema）
    textSummary?: string;
    widgetResults: WidgetResultData[];
    generationId?: string;
    renderDuration?: number;
    errors?: ExperimentError[]; // ステージ中に発生したエラー
}

export const PLAN_STAGE_CONFIGS = [
    { stage: 'diverge', title: '発散', description: 'アイデアを広げる' },
    { stage: 'organize', title: '整理', description: '構造化する' },
    { stage: 'converge', title: '収束', description: '優先順位をつける' },
    { stage: 'summary', title: 'まとめ', description: 'ネクストアクション' },
] as const;

export interface Task {
    title: string;
    description: string;
    estimatedMin: number;
    difficulty: string;
    importance?: number;
    urgency?: number;
}
