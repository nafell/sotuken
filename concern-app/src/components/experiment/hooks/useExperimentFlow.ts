import { useState, useCallback, useEffect } from 'react';
import { experimentApi, ExperimentSession } from '../services/ExperimentApiService';
import { ConcernAnalyzer } from '../services/ConcernAnalyzer';
import { DiagnosticQuestionService } from '../services/DiagnosticQuestionService';

export type FlowPhase = 'capture' | 'plan' | 'breakdown' | 'complete';

export interface ExperimentFlowState {
    currentPhase: FlowPhase;
    concernText: string;
    bottleneckType: string | null;
    planStageResults: Record<string, any>;
    breakdownTasks: any[];
    isProcessing: boolean;
    error: string | null;
}

export interface UseExperimentFlowProps {
    sessionId: string;
    mode: 'user' | 'expert' | 'technical';
    initialContext?: {
        concernText?: string;
        bottleneckType?: string;
    };
    onComplete?: () => void;
}

export function useExperimentFlow({
    sessionId,
    mode,
    initialContext,
    onComplete
}: UseExperimentFlowProps) {
    const [state, setState] = useState<ExperimentFlowState>({
        currentPhase: 'capture',
        concernText: initialContext?.concernText || '',
        bottleneckType: initialContext?.bottleneckType || null,
        planStageResults: {},
        breakdownTasks: [],
        isProcessing: false,
        error: null
    });

    // 初期化: Expert/TechnicalモードでコンテキストがあればPlanフェーズから開始
    useEffect(() => {
        if (initialContext?.concernText && state.currentPhase === 'capture') {
            console.log('🚀 Skipping Capture phase due to initial context');
            setState(prev => ({
                ...prev,
                currentPhase: 'plan'
            }));
        }
    }, [initialContext, state.currentPhase]);

    // Captureフェーズ完了処理
    const handleCaptureComplete = useCallback(async (text: string, bottleneck: string) => {
        setState(prev => ({ ...prev, isProcessing: true, error: null }));
        try {
            // セッション更新
            await experimentApi.updateSession(sessionId, {
                concernText: text,
                // bottleneckTypeはDBスキーマにない場合はcontextFactorsに入れるなどの対応が必要だが
                // ここでは簡易的にログ出力のみとする（必要ならDBスキーマ追加）
            });

            setState(prev => ({
                ...prev,
                concernText: text,
                bottleneckType: bottleneck,
                currentPhase: 'plan',
                isProcessing: false
            }));
        } catch (error) {
            console.error('Failed to complete capture phase:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to save capture results',
                isProcessing: false
            }));
        }
    }, [sessionId]);

    // Planフェーズ: 各ステージ完了時の処理
    const handlePlanStageComplete = useCallback(async (
        stage: string,
        result: any,
        generationId?: string,
        renderDuration?: number
    ) => {
        console.log(`✅ Plan stage complete: ${stage}`, { generationId, renderDuration });

        // レンダリング時間の保存 (generationIdがある場合)
        if (generationId && renderDuration !== undefined) {
            try {
                await experimentApi.updateGeneration(generationId, { renderDuration });
            } catch (e) {
                console.error('Failed to save render duration:', e);
                // エラーでもフローは止めない
            }
        }

        setState(prev => ({
            ...prev,
            planStageResults: {
                ...prev.planStageResults,
                [stage]: result
            }
        }));
    }, []);

    // Planフェーズ完了処理
    const handlePlanComplete = useCallback(async () => {
        setState(prev => ({ ...prev, currentPhase: 'breakdown' }));
    }, []);

    // Breakdownフェーズ完了処理
    const handleBreakdownComplete = useCallback(async (tasks: any[]) => {
        setState(prev => ({ ...prev, isProcessing: true }));
        try {
            // 最終結果保存（必要に応じて）
            // await experimentApi.updateSession(sessionId, { status: 'completed' });

            setState(prev => ({
                ...prev,
                breakdownTasks: tasks,
                currentPhase: 'complete',
                isProcessing: false
            }));

            if (onComplete) {
                onComplete();
            }
        } catch (error) {
            console.error('Failed to complete breakdown phase:', error);
            setState(prev => ({ ...prev, isProcessing: false }));
        }
    }, [sessionId, onComplete]);

    return {
        state,
        actions: {
            handleCaptureComplete,
            handlePlanStageComplete,
            handlePlanComplete,
            handleBreakdownComplete
        }
    };
}
