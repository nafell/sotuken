/**
 * ExperimentPlanUnified.tsx
 * DSL v5 Plan統合フェーズ用コンポーネント
 *
 * diverge/organize/convergeの3セクションを1ページに統合表示。
 * PlanUISpecを受け取り、UIRendererV4でレンダリング。
 *
 * @since DSL v5.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService, type PlanGenerationResponse } from '../../../services/api/ApiService';
import { UIRendererV4 } from '../../../services/ui-generation/UIRendererV4';
import type { StageResult, WidgetResultData, ExperimentError } from '../types';
import type { ORS, PlanORS } from '../../../types/v4/ors.types';
import type { PlanUISpec, normalizeToUISpec } from '../../../types/v4/ui-spec.types';
import { flattenPlanUISpecToUISpec } from '../../../types/v4/ui-spec.types';

interface ExperimentPlanUnifiedProps {
    sessionId: string;
    concernText: string;
    bottleneckType?: string;
    onPlanResult: (result: PlanUnifiedResult, generationId?: string, renderDuration?: number) => void;
    onWidgetUpdate: (widgetId: string, widgetResult: WidgetResultData) => void;
    onComplete: () => void;
    onBack: () => void;
    mode: 'user' | 'expert' | 'technical';
}

/**
 * Plan統合結果
 */
export interface PlanUnifiedResult {
    planUiSpec: PlanUISpec;
    planOrs: PlanORS;
    widgetResults: WidgetResultData[];
    generationId?: string;
    renderDuration?: number;
    errors?: ExperimentError[];
}

type PlanStatus = 'idle' | 'generating' | 'ready' | 'error';

export function ExperimentPlanUnified({
    sessionId,
    concernText,
    bottleneckType,
    onPlanResult,
    onWidgetUpdate,
    onComplete,
    onBack,
    mode
}: ExperimentPlanUnifiedProps) {
    const [status, setStatus] = useState<PlanStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [currentResponse, setCurrentResponse] = useState<PlanGenerationResponse | null>(null);
    const [renderStartTime, setRenderStartTime] = useState<number>(0);
    const [planErrors, setPlanErrors] = useState<ExperimentError[]>([]);
    const notifiedErrorsRef = useRef<Set<string>>(new Set());
    const hasGeneratedRef = useRef(false);

    // Plan生成
    const handleGenerate = useCallback(async () => {
        if (hasGeneratedRef.current) return;
        hasGeneratedRef.current = true;

        setStatus('generating');
        setError(null);

        try {
            console.log('🎨 Generating unified plan...');

            const response = await apiService.generatePlanUI(
                concernText,
                sessionId,
                {
                    bottleneckType,
                    enableReactivity: true,
                }
            );

            if (!response.success) {
                setError(response.error?.message || 'Plan generation failed');
                setStatus('error');
                hasGeneratedRef.current = false;
                return;
            }

            console.log('✅ Plan generation complete');
            setRenderStartTime(performance.now());
            setCurrentResponse(response);
            setStatus('ready');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('error');
            hasGeneratedRef.current = false;
        }
    }, [sessionId, concernText, bottleneckType]);

    // 初回マウント時に自動生成
    useEffect(() => {
        if (status === 'idle' && !hasGeneratedRef.current) {
            setTimeout(() => handleGenerate(), 300);
        }
    }, [status, handleGenerate]);

    // レンダリング完了検知とメトリクス保存
    useEffect(() => {
        if (status === 'ready' && renderStartTime > 0 && currentResponse) {
            const endTime = performance.now();
            const duration = Math.round(endTime - renderStartTime);
            console.log(`🎨 Plan render duration: ${duration}ms`);

            // 結果を保存
            onPlanResult(
                {
                    planUiSpec: currentResponse.planUiSpec,
                    planOrs: currentResponse.planOrs,
                    widgetResults: [],
                    generationId: currentResponse.generationId,
                    renderDuration: duration,
                    errors: planErrors.length > 0 ? planErrors : undefined,
                },
                currentResponse.generationId,
                duration
            );

            setRenderStartTime(0);

            // Technicalモードなら自動で次へ
            if (mode === 'technical') {
                setTimeout(() => {
                    onComplete();
                }, 2000);
            }
        }
    }, [status, renderStartTime, currentResponse, onPlanResult, mode, onComplete, planErrors]);

    // Widget更新ハンドラ
    const handleWidgetUpdate = useCallback(
        (widgetId: string, data: unknown) => {
            const widgetResult: WidgetResultData = {
                widgetId,
                component: 'unknown', // PlanUISpecからは取得が複雑なため
                data: data as Record<string, unknown>,
                timestamp: new Date().toISOString(),
            };
            onWidgetUpdate(widgetId, widgetResult);
        },
        [onWidgetUpdate]
    );

    // PlanUISpecをUISpec形式に変換
    const normalizedUISpec = currentResponse?.planUiSpec
        ? flattenPlanUISpecToUISpec(currentResponse.planUiSpec)
        : null;

    // PlanORSをORS形式に変換（UIRendererV4用）
    const normalizedORS: ORS | null = currentResponse?.planOrs
        ? {
            version: '4.0',
            entities: currentResponse.planOrs.entities,
            dependencyGraph: currentResponse.planOrs.dependencyGraph,
            metadata: {
                generatedAt: currentResponse.planOrs.metadata.generatedAt,
                llmModel: currentResponse.planOrs.metadata.llmModel,
                sessionId: currentResponse.planOrs.metadata.sessionId,
                stage: 'diverge', // 便宜上
            },
        }
        : null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                            Plan
                        </span>
                        思考整理
                    </h2>
                    <p className="text-sm text-gray-500 ml-10">
                        発散・整理・収束の3ステップで思考を整理します
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        戻る
                    </button>
                    <button
                        onClick={onComplete}
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
                        <p>AIがプランを作成中...</p>
                        <p className="text-xs mt-2">発散・整理・収束の3セクションを生成しています</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center justify-center h-full text-red-500">
                        <p className="mb-4">エラーが発生しました</p>
                        <p className="text-sm mb-4">{error}</p>
                        <button
                            onClick={() => {
                                hasGeneratedRef.current = false;
                                handleGenerate();
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            再試行
                        </button>
                    </div>
                )}

                {status === 'ready' && normalizedUISpec && normalizedORS && (
                    <div className="max-w-4xl mx-auto">
                        {/* Section Headers */}
                        {currentResponse?.planUiSpec?.sections && (
                            <div className="mb-6 flex gap-4 justify-center">
                                {(['diverge', 'organize', 'converge'] as const).map((section, index) => {
                                    const sectionData = currentResponse.planUiSpec?.sections?.[section];
                                    return (
                                        <div
                                            key={section}
                                            className="flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm"
                                        >
                                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            <span className="text-sm font-medium">
                                                {sectionData?.header?.title || section}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <UIRendererV4
                            uiSpec={normalizedUISpec}
                            ors={normalizedORS}
                            onWidgetUpdate={handleWidgetUpdate}
                            onWidgetComplete={() => { }}
                            onUnknownWidget={(widgetId, componentName) => {
                                const errorKey = `unknown_widget:${widgetId}`;
                                if (notifiedErrorsRef.current.has(errorKey)) {
                                    return;
                                }
                                notifiedErrorsRef.current.add(errorKey);

                                const errorEntry: ExperimentError = {
                                    type: 'unknown_widget',
                                    message: `Unknown widget: ${componentName}`,
                                    stage: 'plan',
                                    timestamp: Date.now(),
                                    recoverable: true,
                                    details: { widgetId, componentName },
                                };
                                setPlanErrors(prev => [...prev, errorEntry]);
                                console.warn(`Unknown Widget detected: ${componentName} (ID: ${widgetId}) in plan phase`);
                            }}
                            contextSummary={concernText ? `Your Concern: ${concernText}` : undefined}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
