import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService, type StageExecutionResponse } from '../../../services/api/ApiService';
import { UIRendererV4 } from '../../../services/ui-generation/UIRendererV4';
import { PLAN_STAGE_CONFIGS } from '../types';
import type { PlanStage, StageResult, WidgetResultData, ExperimentError } from '../types';
import type { ORS } from '../../../types/v4/ors.types';
import type { SkippedStages } from '../../../types/v4/widget-selection.types';

interface ExperimentPlanProps {
    sessionId: string;
    concernText: string;
    currentStage: PlanStage;
    stageResults: Partial<Record<PlanStage, StageResult>>;
    bottleneckType?: string;
    /** スキップ予定のステージ */
    skippedStages?: SkippedStages;
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
    skippedStages,
    onStageResult,
    onWidgetUpdate,
    onNextStage,
    onPrevStage,
    canGoPrev,
    mode
}: ExperimentPlanProps) {
    const [status, setStatus] = useState<StageStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [currentResponse, setCurrentResponse] = useState<StageExecutionResponse | null>(null);
    const [currentORS, setCurrentORS] = useState<ORS | null>(null);
    const [renderStartTime, setRenderStartTime] = useState<number>(0);
    // ステージ中のエラーを収集（Unknown Widget等）
    const [stageErrors, setStageErrors] = useState<ExperimentError[]>([]);
    // レンダリング中のエラー通知済みIDを追跡（重複通知防止）
    const notifiedErrorsRef = useRef<Set<string>>(new Set());

    // 生成済みステージを追跡（2重生成防止）
    const generatedStagesRef = useRef<Set<PlanStage>>(new Set());

    const currentStageIndex = STAGE_ORDER.indexOf(currentStage);
    const existingResult = stageResults[currentStage];
    const stageConfig = PLAN_STAGE_CONFIGS.find(c => c.stage === currentStage);

    const handleGenerate = useCallback(async () => {
        // スキップ対象のステージかチェック
        if (skippedStages?.[currentStage]) {
            console.log(`⏭️ Skipping stage: ${currentStage}`);

            // スキップ結果を生成
            const skipResult: Partial<StageResult> = {
                stage: currentStage,
                skipped: true,
                mode: 'widget',
                widgetResults: [],
            };

            // 結果を通知
            onStageResult(currentStage, skipResult, undefined, 0);

            // 少し待ってから次のステージへ自動進行
            setTimeout(() => {
                onNextStage();
            }, 300);
            return;
        }

        setStatus('generating');
        setError(null);

        try {
            // 前ステージの結果をコンテキストとして収集
            const previousResults: Record<string, unknown> = {};
            STAGE_ORDER.slice(0, currentStageIndex).forEach((stage) => {
                if (stageResults[stage]) {
                    previousResults[stage] = {
                        widgetResults: stageResults[stage]?.widgetResults,
                        textSummary: stageResults[stage]?.textSummary,
                    };
                }
            });

            // ステージ実行専用API呼び出し（ORS + UISpec生成のみ、Widget選定はキャッシュ済み）
            const response = await apiService.generateStageUI(
                concernText,
                currentStage,
                sessionId,
                {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    previousStageResults: Object.keys(previousResults).length > 0 ? previousResults as Record<string, any> : undefined,
                    bottleneckType,
                    enableReactivity: true,
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
            setCurrentORS(response.ors);
            setStatus('ready');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('error');
        }
    }, [currentStage, currentStageIndex, sessionId, concernText, stageResults, bottleneckType, skippedStages, onStageResult, onNextStage]);

    // ステージ変更時にリセット＆自動生成開始
    useEffect(() => {
        if (existingResult?.uiSpec || existingResult?.textSummary) {
            // 既存結果がある場合は復元
            setCurrentResponse({
                success: true,
                uiSpec: existingResult.uiSpec,
                ors: existingResult.ors,
                mode: 'widget',
                generationId: existingResult.generationId,
            });
            setCurrentORS(existingResult.ors as unknown as ORS || null);
            setStatus('ready');
        } else if (!generatedStagesRef.current.has(currentStage)) {
            // このステージがまだ生成されていない場合のみ生成
            setStatus('idle');
            setCurrentResponse(null);
            setCurrentORS(null);
            generatedStagesRef.current.add(currentStage);
            setTimeout(() => handleGenerate(), 300);
        }
        setError(null);
        setRenderStartTime(0);
        // ステージ変更時にエラーと通知済みIDをリセット
        setStageErrors([]);
        notifiedErrorsRef.current.clear();
        // クリーンアップは不要（フラグをリセットしない）
    }, [currentStage, existingResult, handleGenerate]);

    // レンダリング完了検知とメトリクス保存
    useEffect(() => {
        if (status === 'ready' && renderStartTime > 0 && currentResponse) {
            const endTime = performance.now();
            const duration = Math.round(endTime - renderStartTime);
            console.log(`🎨 Render duration for ${currentStage}: ${duration}ms`);

            // 結果を保存 (レンダリング時間 + エラー含む)
            onStageResult(
                currentStage,
                {
                    stage: currentStage,
                    mode: 'widget',
                    uiSpec: currentResponse.uiSpec,
                    ors: currentResponse.ors, // V4で追加
                    widgetResults: [],
                    generationId: currentResponse.generationId, // サーバーから返却されたID
                    renderDuration: duration,
                    errors: stageErrors.length > 0 ? stageErrors : undefined,
                },
                currentResponse.generationId,
                duration
            );

            setRenderStartTime(0); // リセット

            // Technicalモードなら自動で次へ (少し待ってから)
            if (mode === 'technical') {
                setTimeout(() => {
                    onNextStage();
                }, 2000);
            }
        }
    }, [status, renderStartTime, currentResponse, currentStage, onStageResult, mode, onNextStage, stageErrors]);

    // ... (rest of the file)

    // Widget更新ハンドラ
    const handleWidgetUpdate = useCallback(
        (widgetId: string, data: unknown) => {
            const widgetResult: WidgetResultData = {
                widgetId,
                component: currentResponse?.uiSpec?.widgets?.find((w: { id: string; component: string }) => w.id === widgetId)?.component || 'unknown',
                data: data as Record<string, unknown>,
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p>準備中...</p>
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

                {status === 'ready' && currentResponse && currentORS && (
                    <div className="max-w-4xl mx-auto">
                        <UIRendererV4
                            uiSpec={currentResponse.uiSpec}
                            ors={currentORS}
                            onWidgetUpdate={handleWidgetUpdate}
                            onWidgetComplete={() => { }}
                            onUnknownWidget={(widgetId, componentName) => {
                                // 重複通知を防ぐ
                                const errorKey = `unknown_widget:${widgetId}`;
                                if (notifiedErrorsRef.current.has(errorKey)) {
                                    return;
                                }
                                notifiedErrorsRef.current.add(errorKey);

                                const errorEntry: ExperimentError = {
                                    type: 'unknown_widget',
                                    message: `Unknown widget: ${componentName}`,
                                    stage: currentStage,
                                    timestamp: Date.now(),
                                    recoverable: true, // Unknown Widgetは継続可能
                                    details: { widgetId, componentName },
                                };
                                setStageErrors(prev => [...prev, errorEntry]);
                                console.warn(`Unknown Widget detected: ${componentName} (ID: ${widgetId}) in stage: ${currentStage}`);
                            }}
                            contextSummary={concernText ? `Your Concern: ${concernText}` : undefined}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
