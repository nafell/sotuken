export type PlanStage = 'diverge' | 'organize' | 'converge' | 'summary';

export interface WidgetResultData {
    widgetId: string;
    component: string;
    data: any;
    timestamp: string;
}

export interface StageResult {
    stage: PlanStage;
    mode: 'widget' | 'text';
    uiSpec?: any;
    textSummary?: string;
    widgetResults: WidgetResultData[];
    generationId?: string;
    renderDuration?: number;
}

export const PLAN_STAGE_CONFIGS = [
    { stage: 'diverge', title: '発散', description: 'アイデアを広げる' },
    { stage: 'organize', title: '整理', description: '構造化する' },
    { stage: 'converge', title: '収束', description: '優先順位をつける' },
    { stage: 'summary', title: 'まとめ', description: 'ネクストアクション' },
] as const;
