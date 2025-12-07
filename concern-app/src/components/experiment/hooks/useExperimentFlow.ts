import { useState, useCallback, useEffect, useRef } from 'react';
import { experimentApi } from '../../../services/ExperimentApiService';
import type { Task, ExperimentError } from '../types';
import type { WidgetSelectionResult } from '../../../types/v4/widget-selection.types';

export type FlowPhase = 'capture' | 'plan-preview' | 'plan' | 'breakdown' | 'complete';

export interface ExperimentFlowState {
    currentPhase: FlowPhase;
    concernText: string;
    bottleneckType: string | null;
    widgetSelectionResult: WidgetSelectionResult | null;
    planStageResults: Record<string, unknown>;
    breakdownTasks: Task[];
    experimentErrors: ExperimentError[]; // 全ステージのエラーを集約
    isProcessing: boolean;
    error: string | null;
}

export interface UseExperimentFlowProps {
    sessionId: string;
    // 'mode' is not used in this hook, so it's removed.
    initialContext?: {
        concernText?: string;
        bottleneckType?: string;
    };
    onComplete?: () => void;
}

export function useExperimentFlow({
    sessionId,
    // 'mode' is not used in this hook, so it's removed from destructuring.
    initialContext,
    onComplete
}: UseExperimentFlowProps) {
    const [state, setState] = useState<ExperimentFlowState>({
        currentPhase: 'capture',
        concernText: initialContext?.concernText || '',
        bottleneckType: initialContext?.bottleneckType || null,
        widgetSelectionResult: null,
        planStageResults: {},
        breakdownTasks: [],
        experimentErrors: [],
        isProcessing: false,
        error: null
    });

    // エラーをセッションに保存済みかどうか追跡
    const errorsSavedRef = useRef(false);

    // 初期化: Expert/TechnicalモードでコンテキストがあればPlanPreviewフェーズから開始
    useEffect(() => {
        if (initialContext?.concernText && state.currentPhase === 'capture') {
            console.log('🚀 Skipping Capture phase due to initial context');
            setState(prev => ({
                ...prev,
                currentPhase: 'plan-preview'
            }));
        }
    }, [initialContext, state.currentPhase]);

    // Captureフェーズ完了処理 → PlanPreviewフェーズへ
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
                currentPhase: 'plan-preview', // Changed: 直接PlanではなくPlanPreviewへ
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

    // PlanPreview: Widget選定結果をセットしてPlanフェーズへ進む
    const handlePlanPreviewConfirm = useCallback((widgetSelectionResult: WidgetSelectionResult) => {
        console.log('✅ Plan Preview confirmed, proceeding to Plan phase');
        setState(prev => ({
            ...prev,
            widgetSelectionResult,
            currentPhase: 'plan'
        }));
    }, []);

    // PlanPreview: キャンセルしてCaptureフェーズへ戻る
    const handlePlanPreviewCancel = useCallback(() => {
        console.log('⬅️ Plan Preview cancelled, returning to Capture phase');
        setState(prev => ({
            ...prev,
            currentPhase: 'capture'
        }));
    }, []);

    // Planフェーズ: 各ステージ完了時の処理
    const handlePlanStageComplete = useCallback(async (
        stage: string,
        result: Record<string, unknown>,
        generationId?: string,
        renderDuration?: number
    ) => {
        console.log(`✅ Plan stage complete: ${stage}`, { generationId, renderDuration });

        // ステージのエラーをresultから抽出して集約
        const stageErrors = (result.errors as ExperimentError[] | undefined) || [];

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
            },
            experimentErrors: [...prev.experimentErrors, ...stageErrors]
        }));
    }, []);

    // Planフェーズ完了処理
    const handlePlanComplete = useCallback(async () => {
        setState(prev => ({ ...prev, currentPhase: 'breakdown' }));
    }, []);

    // Breakdownフェーズ完了処理
    const handleBreakdownComplete = useCallback(async (tasks: Task[]) => {
        setState(prev => ({ ...prev, isProcessing: true }));
        try {
            // generationsからメトリクスを集計
            let totalTokens = 0;
            let totalLatencyMs = 0;
            try {
                const generations = await experimentApi.getGenerations(sessionId);
                totalTokens = generations.reduce((sum, g) => sum + (g.promptTokens || 0) + (g.responseTokens || 0), 0);
                totalLatencyMs = generations.reduce((sum, g) => sum + (g.generateDuration || 0), 0);
            } catch (e) {
                console.warn('Failed to aggregate generation metrics:', e);
            }

            // 実験エラーがある場合はcontextFactorsに保存
            // まず既存のcontextFactorsを取得
            let contextFactorsUpdate: Record<string, unknown> | undefined;
            if (state.experimentErrors.length > 0 && !errorsSavedRef.current) {
                try {
                    const session = await experimentApi.getSession(sessionId);
                    const existingContextFactors = session.contextFactors || {};
                    contextFactorsUpdate = {
                        ...existingContextFactors,
                        experimentErrors: state.experimentErrors
                    };
                    console.log(`Saving ${state.experimentErrors.length} experiment errors to session`);
                } catch (e) {
                    console.warn('Failed to get existing session context:', e);
                    // 既存データ取得失敗時は新規で保存
                    contextFactorsUpdate = { experimentErrors: state.experimentErrors };
                }
                errorsSavedRef.current = true;
            }

            // 最終結果保存: generationSuccess, completedAt, メトリクスを設定
            await experimentApi.updateSession(sessionId, {
                generationSuccess: true,
                completedAt: new Date().toISOString(),
                totalTokens: totalTokens || undefined,
                totalLatencyMs: totalLatencyMs || undefined,
                ...(contextFactorsUpdate ? { contextFactors: contextFactorsUpdate } : {})
            });

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
    }, [sessionId, onComplete, state.experimentErrors]);

    return {
        state,
        actions: {
            handleCaptureComplete,
            handlePlanPreviewConfirm,
            handlePlanPreviewCancel,
            handlePlanStageComplete,
            handlePlanComplete,
            handleBreakdownComplete
        }
    };
}
