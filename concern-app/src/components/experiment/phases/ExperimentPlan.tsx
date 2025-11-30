import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService, type UISpecV3GenerationResponse } from '../../../services/api/ApiService';
import UIRendererV3 from '../../../services/ui-generation/UIRendererV3';
import { PLAN_STAGE_CONFIGS } from '../types';
import type { PlanStage, StageResult, WidgetResultData } from '../types';

interface ExperimentPlanProps {
    sessionId: string;
    concernText: string;
    currentStage: PlanStage;
    stageResults: Partial<Record<PlanStage, StageResult>>;
    bottleneckType?: string;
    onStageResult: (stage: PlanStage, result: Partial<StageResult>, generationId?: string, renderDuration?: number) => void;
    onWidgetUpdate: (stage: PlanStage, widgetResult: WidgetResultData) => void;
    onNextStage: () => void;
    onPrevStage: () => void;
    canGoNext: boolean;
    canGoPrev: boolean;
    mode: 'user' | 'expert' | 'technical';
}

type StageStatus = 'idle' | 'generating' | 'ready' | 'complete' | 'error';

const STAGE_ORDER: PlanStage[] = ['diverge', 'organize', 'converge', 'summary'];

export function ExperimentPlan({
    sessionId,
    concernText,
    currentStage,
    stageResults,
    bottleneckType,
    onStageResult,
    onWidgetUpdate,
    onNextStage,
    onPrevStage,
    canGoNext: _canGoNext,
    canGoPrev,
    mode
}: ExperimentPlanProps) {
    const [status, setStatus] = useState<StageStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [currentResponse, setCurrentResponse] = useState<UISpecV3GenerationResponse | null>(null);
    const [renderStartTime, setRenderStartTime] = useState<number>(0);

    // Technicalモードの自動進行用
    const autoProceedRef = useRef(false);

    const currentStageIndex = STAGE_ORDER.indexOf(currentStage);
    const existingResult = stageResults[currentStage];
    const stageConfig = PLAN_STAGE_CONFIGS.find(c => c.stage === currentStage);

    // ステージ変更時にリセット
    useEffect(() => {
        if (existingResult?.uiSpec || existingResult?.textSummary) {
            setCurrentResponse({
                success: true,
                uiSpec: existingResult.uiSpec,
                textSummary: existingResult.textSummary,
                mode: existingResult.mode,
                generationId: existingResult.generationId,
            });
            setStatus('ready');
        } else {
            setStatus('idle');
            setCurrentResponse(null);
            // Technicalモードなら自動生成開始
            if (mode === 'technical' && !autoProceedRef.current) {
                autoProceedRef.current = true;
                setTimeout(() => handleGenerate(), 500);
            }
        }
        setError(null);
        setRenderStartTime(0);
    }, [currentStage, existingResult, mode]);

    // レンダリング完了検知とメトリクス保存
    useEffect(() => {
        if (status === 'ready' && renderStartTime > 0 && currentResponse) {
            const endTime = performance.now();
            const duration = Math.round(endTime - renderStartTime);
            console.log(`🎨 Render duration for ${currentStage}: ${duration}ms`);

            // 結果を保存 (レンダリング時間含む)
            onStageResult(
                currentStage,
                {
                    stage: currentStage,
                    mode: currentResponse.mode || 'widget',
                    uiSpec: currentResponse.uiSpec,
                    textSummary: currentResponse.textSummary,
                    widgetResults: [],
                    generationId: currentResponse.generationId, // サーバーから返却されたID
                    renderDuration: duration
                },
                currentResponse.generationId,
                duration
            );

            setRenderStartTime(0); // リセット

            // Technicalモードなら自動で次へ (少し待ってから)
            if (mode === 'technical') {
                setTimeout(() => {
                    autoProceedRef.current = false; // 次のステージ用にリセット
                    onNextStage();
                }, 2000);
            }
        }
    }, [status, renderStartTime, currentResponse, currentStage, onStageResult, mode, onNextStage]);

    const handleGenerate = useCallback(async () => {
        setStatus('generating');
        setError(null);

        try {
            // 前ステージの結果をコンテキストとして収集
            const previousResults: Record<string, any> = {};
            STAGE_ORDER.slice(0, currentStageIndex).forEach((stage) => {
                if (stageResults[stage]) {
                    previousResults[stage] = {
                        widgetResults: stageResults[stage]?.widgetResults,
                        textSummary: stageResults[stage]?.textSummary,
                    };
                }
            });

            const response = await apiService.generateUIV3(
                concernText,
                currentStage,
                sessionId,
                undefined,
                {
                    restrictToImplementedWidgets: true,
                    previousStageResults: Object.keys(previousResults).length > 0 ? previousResults : undefined,
                    bottleneckType,
                }
            );

            if (!response.success) {
                setError(response.error?.message || 'Generation failed');
                setStatus('error');
                return;
            }

            // レンダリング開始時刻を記録してState更新 -> Re-render -> useEffect発火
            setRenderStartTime(performance.now());
            setCurrentResponse(response);
            setStatus('ready');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('error');
        }
    }, [currentStage, currentStageIndex, sessionId, concernText, stageResults, bottleneckType]);

    // Widget更新ハンドラ
    const handleWidgetUpdate = useCallback(
        (widgetId: string, data: any) => {
            const widgetResult: WidgetResultData = {
                widgetId,
                component: currentResponse?.uiSpec?.widgets?.find((w: any) => w.id === widgetId)?.component || 'unknown',
                data,
                timestamp: new Date().toISOString(),
            };
            onWidgetUpdate(currentStage, widgetResult);
        },
        [currentStage, currentResponse, onWidgetUpdate]
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                            {currentStageIndex + 1}
                        </span>
                        {stageConfig?.title}
                    </h2>
                    <p className="text-sm text-gray-500 ml-10">{stageConfig?.description}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onPrevStage}
                        disabled={!canGoPrev}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                        戻る
                    </button>
                    <button
                        onClick={onNextStage}
                        disabled={status !== 'ready'}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        次へ
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {status === 'idle' && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <p className="mb-4">このステージのUIを生成します</p>
                        <button
                            onClick={handleGenerate}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
                        >
                            UIを生成する
                        </button>
                    </div>
                )}

                {status === 'generating' && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p>AIが思考中...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center justify-center h-full text-red-500">
                        <p className="mb-4">エラーが発生しました</p>
                        <p className="text-sm mb-4">{error}</p>
                        <button
                            onClick={handleGenerate}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            再試行
                        </button>
                    </div>
                )}

                {status === 'ready' && currentResponse && (
                    <div className="max-w-4xl mx-auto">
                        {currentResponse.mode === 'text' ? (
                            <div className="bg-white p-6 rounded-xl shadow-sm prose max-w-none">
                                <div dangerouslySetInnerHTML={{ __html: currentResponse.textSummary?.replace(/\n/g, '<br/>') || '' }} />
                            </div>
                        ) : (
                            <UIRendererV3
                                uiSpec={currentResponse.uiSpec}
                                onWidgetUpdate={handleWidgetUpdate}
                                onWidgetAction={() => { }}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
