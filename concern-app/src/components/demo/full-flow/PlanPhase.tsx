/**
 * PlanPhase - 4ステージプランニングUI
 *
 * Phase 4 Full-Flow: diverge -> organize -> converge -> summary
 */

import { useState, useCallback, useEffect } from 'react';
import { apiService, type UISpecV3GenerationResponse } from '../../../services/api/ApiService';
import UIRendererV3 from '../../../services/ui-generation/UIRendererV3';
import { fullFlowMetricsService } from '../../../services/FullFlowMetricsService';
import type { PlanStage, StageResult, WidgetResultData } from './types';
import { PLAN_STAGE_CONFIGS as STAGE_CONFIGS } from './types';

interface PlanPhaseProps {
  sessionId: string;
  concernText: string;
  currentStage: PlanStage;
  stageResults: Partial<Record<PlanStage, StageResult>>;
  bottleneckType?: string;
  onStageResult: (stage: PlanStage, result: Partial<StageResult>) => void;
  onWidgetUpdate: (stage: PlanStage, widgetResult: WidgetResultData) => void;
  onNextStage: () => void;
  onPrevStage: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

type StageStatus = 'idle' | 'generating' | 'ready' | 'complete' | 'error';

const STAGE_ORDER: PlanStage[] = ['diverge', 'organize', 'converge', 'summary'];

export function PlanPhase({
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
}: PlanPhaseProps) {
  const [status, setStatus] = useState<StageStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<UISpecV3GenerationResponse | null>(null);
  const [completedWidgets, setCompletedWidgets] = useState<Set<string>>(new Set());

  const stageConfig = STAGE_CONFIGS.find((c) => c.stage === currentStage);
  const currentStageIndex = STAGE_ORDER.indexOf(currentStage);
  const existingResult = stageResults[currentStage];

  // ステージ変更時にリセット
  useEffect(() => {
    if (existingResult?.uiSpec || existingResult?.textSummary) {
      // 既存の結果がある場合は表示
      setCurrentResponse({
        success: true,
        uiSpec: existingResult.uiSpec,
        textSummary: existingResult.textSummary,
        mode: existingResult.mode,
      });
      setStatus('ready');
    } else {
      setStatus('idle');
      setCurrentResponse(null);
    }
    setCompletedWidgets(new Set());
    setError(null);
  }, [currentStage, existingResult]);

  // UI生成
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

      // メトリクス記録
      if (response.generation) {
        fullFlowMetricsService.addFromApiResponse('plan', `generate-${currentStage}`, response, currentStage);
      }

      if (!response.success) {
        setError(response.error?.message || 'Generation failed');
        setStatus('error');
        return;
      }

      setCurrentResponse(response);
      setStatus('ready');

      // 結果を保存
      onStageResult(currentStage, {
        stage: currentStage,
        mode: response.mode || 'widget',
        uiSpec: response.uiSpec,
        textSummary: response.textSummary,
        widgetResults: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }, [currentStage, currentStageIndex, sessionId, concernText, stageResults, bottleneckType, onStageResult]);

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

  // Widget完了ハンドラ
  const handleWidgetComplete = useCallback((widgetId: string) => {
    setCompletedWidgets((prev) => new Set([...prev, widgetId]));
  }, []);

  // 次へ進むことができるか
  const canProceed =
    status === 'ready' &&
    (currentResponse?.mode === 'text' ||
      (currentResponse?.uiSpec?.widgets?.length || 0) ===
        completedWidgets.size + (existingResult?.widgetResults?.length || 0));

  return (
    <div data-testid="plan-phase-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ステージナビゲーション */}
      <div
        data-testid="plan-stage-indicator"
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {STAGE_ORDER.map((stage, index) => {
            const isActive = stage === currentStage;
            const isCompleted = stageResults[stage]?.completedAt;
            const isFuture = index > currentStageIndex;

            return (
              <div
                key={stage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <div
                  data-testid={`plan-stage-${stage}`}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: isActive
                      ? '#3b82f6'
                      : isCompleted
                      ? '#22c55e'
                      : '#334155',
                    borderRadius: '0.5rem',
                    color: isActive || isCompleted ? 'white' : '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 'bold' : 'normal',
                    opacity: isFuture ? 0.5 : 1,
                  }}
                >
                  {stage}
                </div>
                {index < STAGE_ORDER.length - 1 && (
                  <span style={{ color: '#475569' }}>→</span>
                )}
              </div>
            );
          })}
        </div>
        {stageConfig && (
          <p
            style={{
              margin: '0.75rem 0 0 0',
              color: '#94a3b8',
              fontSize: '0.75rem',
              textAlign: 'center',
            }}
          >
            {stageConfig.description}
            {stageConfig.mode === 'widget' && (
              <span style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>
                [Widget: {stageConfig.availableWidgets.join(', ')}]
              </span>
            )}
            {stageConfig.mode === 'text' && (
              <span style={{ color: '#f59e0b', marginLeft: '0.5rem' }}>[Text Mode]</span>
            )}
          </p>
        )}
      </div>

      {/* メインコンテンツ */}
      <div
        data-testid="plan-main-content"
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          minHeight: '300px',
        }}
      >
        {/* 初期状態 */}
        {status === 'idle' && (
          <div data-testid="plan-idle-state" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
              {currentStage} ステージのUIを生成します
            </p>
            <button
              data-testid="plan-generate-btn"
              onClick={handleGenerate}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              UI生成
            </button>
          </div>
        )}

        {/* 生成中 */}
        {status === 'generating' && (
          <div data-testid="plan-generating-indicator" style={{ textAlign: 'center', padding: '2rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #334155',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <p style={{ color: '#94a3b8' }}>
              {stageConfig?.mode === 'text' ? 'テキストサマリー生成中...' : 'Widget UI生成中...'}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* エラー */}
        {status === 'error' && (
          <div data-testid="plan-error-state" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
            <button
              data-testid="plan-retry-btn"
              onClick={handleGenerate}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#475569',
                border: 'none',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              再試行
            </button>
          </div>
        )}

        {/* Widget表示 */}
        {status === 'ready' && currentResponse?.mode === 'widget' && currentResponse.uiSpec && (
          <div data-testid="plan-widget-container">
            <UIRendererV3
              uiSpec={currentResponse.uiSpec}
              onWidgetUpdate={handleWidgetUpdate}
              onWidgetComplete={handleWidgetComplete}
            />
          </div>
        )}

        {/* テキスト表示 */}
        {status === 'ready' && currentResponse?.mode === 'text' && currentResponse.textSummary && (
          <div
            data-testid="plan-text-summary"
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '0.5rem',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: '#f59e0b', fontSize: '0.875rem' }}>
              {currentStage} - テキストサマリー
            </h3>
            <div
              style={{
                color: '#e2e8f0',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}
            >
              {currentResponse.textSummary}
            </div>
          </div>
        )}
      </div>

      {/* ナビゲーションボタン */}
      <div
        data-testid="plan-navigation"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          data-testid="plan-prev-btn"
          onClick={onPrevStage}
          disabled={!canGoPrev}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: canGoPrev ? '#475569' : '#1e293b',
            border: 'none',
            borderRadius: '0.5rem',
            color: canGoPrev ? 'white' : '#475569',
            cursor: canGoPrev ? 'pointer' : 'not-allowed',
          }}
        >
          戻る
        </button>
        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
          Stage {currentStageIndex + 1} / {STAGE_ORDER.length}
        </span>
        <button
          data-testid="plan-next-btn"
          onClick={() => {
            onStageResult(currentStage, {
              ...existingResult,
              completedAt: new Date().toISOString(),
            });
            onNextStage();
          }}
          disabled={!canProceed}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: canProceed ? '#10b981' : '#1e293b',
            border: 'none',
            borderRadius: '0.5rem',
            color: canProceed ? 'white' : '#475569',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          {currentStageIndex === STAGE_ORDER.length - 1 ? 'Plan完了' : '次のステージ'}
        </button>
      </div>
    </div>
  );
}
