import { useState, useCallback, useEffect } from 'react';
import { useExperimentFlow } from './hooks/useExperimentFlow';
import { ExperimentCapture } from './phases/ExperimentCapture';
import { ExperimentPlanUnified, type PlanUnifiedResult } from './phases/ExperimentPlanUnified';
import { ExperimentBreakdown } from './phases/ExperimentBreakdown';
import { PlanPreview } from '../v4/PlanPreview';
import { apiService } from '../../services/api/ApiService';
import { createEmptyWidgetSelectionResult, type WidgetSelectionResult, type SkippedStages } from '../../types/v4/widget-selection.types';

interface ExperimentExecutorProps {
    sessionId: string;
    mode: 'user' | 'expert' | 'technical';
    initialContext?: {
        concernText?: string;
        bottleneckType?: string;
    };
    onComplete: () => void;
    /** モックWidget選定を使用するかどうか */
    useMockWidgetSelection?: boolean;
    /** テストケースID（モックモード時必須） */
    caseId?: string;
    /** LLMプロバイダー（gemini または azure） */
    provider?: 'gemini' | 'azure';
    /** 使用するモデルID */
    modelId?: string;
}

export function ExperimentExecutor({
    sessionId,
    mode,
    initialContext,
    onComplete,
    useMockWidgetSelection,
    caseId,
    provider,
    modelId
}: ExperimentExecutorProps) {
    const { state, actions } = useExperimentFlow({
        sessionId,
        initialContext,
        onComplete
    });

    // PlanPreviewフェーズ用の状態
    const [planPreviewLoading, setPlanPreviewLoading] = useState(false);
    const [widgetSelectionResult, setWidgetSelectionResult] = useState<WidgetSelectionResult | null>(null);

    // PlanPreviewフェーズに入ったらWidget選定APIを呼び出す
    // 新しいWidget選定専用API（/generate-v4-widgets）を使用
    useEffect(() => {
        if (state.currentPhase === 'plan-preview' && !widgetSelectionResult && !planPreviewLoading) {
            const fetchWidgetSelection = async () => {
                setPlanPreviewLoading(true);
                try {
                    console.log('🔍 Fetching widget selection (Widget選定専用API)...');
                    console.log(`🧪 Mock mode: ${useMockWidgetSelection}, caseId: ${caseId || 'N/A'}`);
                    console.log(`🤖 Provider: ${provider || 'default'}, Model: ${modelId || 'default'}`);
                    // Widget選定専用APIを呼び出す（ORS/UISpec生成は行わない）
                    const response = await apiService.generateWidgetSelection(
                        state.concernText,
                        sessionId,
                        {
                            bottleneckType: state.bottleneckType || 'thought',
                            useMockWidgetSelection,
                            caseId,
                            provider,
                            modelId
                        }
                    );

                    if (response.success && response.widgetSelectionResult) {
                        console.log('✅ Widget selection result received (専用API)');
                        setWidgetSelectionResult(response.widgetSelectionResult);
                    } else {
                        console.error('❌ Failed to get widget selection result:', response.error);
                        // エラーでもplanフェーズへ進む（Widgetは表示されないがフローは止めない）
                        const emptyResult = createEmptyWidgetSelectionResult(
                            state.bottleneckType || 'thought',
                            'error'
                        );
                        emptyResult.rationale = 'エラーが発生しました';
                        actions.handlePlanPreviewConfirm(emptyResult);
                    }
                } catch (error) {
                    console.error('❌ Widget selection API error:', error);
                    // エラーでもplanフェーズへ進む
                    const emptyResult = createEmptyWidgetSelectionResult(
                        state.bottleneckType || 'thought',
                        'error'
                    );
                    emptyResult.rationale = 'エラーが発生しました';
                    actions.handlePlanPreviewConfirm(emptyResult);
                } finally {
                    setPlanPreviewLoading(false);
                }
            };

            fetchWidgetSelection();
        }
    }, [state.currentPhase, state.concernText, state.bottleneckType, sessionId, widgetSelectionResult, planPreviewLoading, actions, useMockWidgetSelection, caseId, provider, modelId]);

    // Plan統合フェーズの結果ハンドラ
    const handlePlanUnifiedResult = useCallback((
        result: PlanUnifiedResult,
        generationId?: string,
        renderDuration?: number
    ) => {
        // フックのhandlePlanStageCompleteを使用してPlan統合結果を保存
        actions.handlePlanStageComplete('plan', {
            planUiSpec: result.planUiSpec,
            planOrs: result.planOrs,
            widgetResults: result.widgetResults,
            errors: result.errors,
        }, generationId, renderDuration);
    }, [actions]);

    // PlanPreviewの確認ボタンハンドラ
    const handlePlanPreviewConfirm = useCallback((skippedStages: SkippedStages) => {
        if (widgetSelectionResult) {
            actions.handlePlanPreviewConfirm(widgetSelectionResult, skippedStages);
        }
    }, [widgetSelectionResult, actions]);

    // 現在のフェーズに応じたコンポーネント表示
    const renderPhase = () => {
        switch (state.currentPhase) {
            case 'capture':
                return (
                    <ExperimentCapture
                        mode={mode}
                        initialText={state.concernText}
                        onComplete={actions.handleCaptureComplete}
                    />
                );

            case 'plan-preview':
                return (
                    <div className="flex flex-col h-full overflow-y-auto">
                        {planPreviewLoading || !widgetSelectionResult ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                <p>プランを作成中...</p>
                            </div>
                        ) : (
                            <PlanPreview
                                selectionResult={widgetSelectionResult}
                                concernText={state.concernText}
                                onConfirm={handlePlanPreviewConfirm}
                                onCancel={actions.handlePlanPreviewCancel}
                                isLoading={false}
                                showDetails={true}
                                hideSkipControls={true}
                            />
                        )}
                    </div>
                );

            case 'plan':
                return (
                    <ExperimentPlanUnified
                        sessionId={sessionId}
                        concernText={state.concernText}
                        bottleneckType={state.bottleneckType || undefined}
                        onPlanResult={handlePlanUnifiedResult}
                        onWidgetUpdate={(widgetId, result) => {
                            console.log('Widget update:', widgetId, result);
                        }}
                        onComplete={actions.handlePlanComplete}
                        onBack={actions.handlePlanPreviewCancel}
                        mode={mode}
                        provider={provider}
                        modelId={modelId}
                    />
                );

            case 'breakdown':
                return (
                    <ExperimentBreakdown
                        sessionId={sessionId}
                        mode={mode}
                        concernText={state.concernText}
                        planStageResults={state.planStageResults}
                        onComplete={actions.handleBreakdownComplete}
                    />
                );

            case 'complete':
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        <h2 className="text-2xl font-bold mb-4">実験完了</h2>
                        <p className="text-gray-600 mb-8">ご協力ありがとうございました。</p>
                        <button
                            onClick={onComplete}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            ダッシュボードへ戻る
                        </button>
                    </div>
                );

            default:
                return <div>Unknown phase</div>;
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header: Mode & Phase Indicator */}
            <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase
            ${mode === 'technical' ? 'bg-purple-500' :
                            mode === 'expert' ? 'bg-yellow-500 text-black' : 'bg-green-500'}`}>
                        {mode} Mode
                    </span>
                    <h1 className="text-lg font-bold">実験セッション: {sessionId.slice(0, 8)}...</h1>
                </div>
                <div className="flex gap-2 text-sm">
                    <span className={state.currentPhase === 'capture' ? 'font-bold text-blue-400' : 'text-gray-400'}>Capture</span>
                    <span className="text-gray-600">&gt;</span>
                    <span className={state.currentPhase === 'plan-preview' ? 'font-bold text-blue-400' : 'text-gray-400'}>Preview</span>
                    <span className="text-gray-600">&gt;</span>
                    <span className={state.currentPhase === 'plan' ? 'font-bold text-blue-400' : 'text-gray-400'}>Plan</span>
                    <span className="text-gray-600">&gt;</span>
                    <span className={state.currentPhase === 'breakdown' ? 'font-bold text-blue-400' : 'text-gray-400'}>Breakdown</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden bg-gray-50">
                {state.isProcessing && (
                    <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                )}
                {renderPhase()}
            </div>
        </div>
    );
}
