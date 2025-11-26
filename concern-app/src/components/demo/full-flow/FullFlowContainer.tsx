/**
 * FullFlowContainer - Full-Flowデモのメインコンテナ
 *
 * Phase 4 Full-Flow: capture -> plan(4 stages) -> breakdown
 */

import { useCallback } from 'react';
import { useFullFlowState } from '../../../hooks/useFullFlowState';
import { CapturePhase } from './CapturePhase';
import { PlanPhase } from './PlanPhase';
import { BreakdownPhase } from './BreakdownPhase';
import type { BottleneckAnalysis } from '../../../types/BottleneckTypes';

interface FullFlowContainerProps {
  onPhaseChange?: (phase: string, stage?: string) => void;
}

export function FullFlowContainer({ onPhaseChange }: FullFlowContainerProps) {
  const {
    state,
    setConcernText,
    setBottleneckAnalysis,
    setDiagnosticResponses,
    setPlanStageResult,
    addWidgetResult,
    setBreakdownTasks,
    goToPhase,
    goToNextPlanStage,
    goToPrevPlanStage,
    progress,
    resetFlow,
    canGoToNextPlanStage,
    canGoToPrevPlanStage,
  } = useFullFlowState();

  // Capture完了ハンドラ
  const handleCaptureComplete = useCallback(
    (analysis: BottleneckAnalysis, responses: Record<string, any>) => {
      setBottleneckAnalysis(analysis);
      setDiagnosticResponses(responses);
      goToPhase('plan');
      onPhaseChange?.('plan', 'diverge');
    },
    [setBottleneckAnalysis, setDiagnosticResponses, goToPhase, onPhaseChange]
  );

  // Plan次へハンドラ
  const handlePlanNext = useCallback(() => {
    const moved = goToNextPlanStage();
    if (moved) {
      // phase変更を通知
      if (state.phase === 'plan' && state.planStage) {
        const stages = ['diverge', 'organize', 'converge', 'summary'];
        const currentIdx = stages.indexOf(state.planStage);
        if (currentIdx < stages.length - 1) {
          onPhaseChange?.('plan', stages[currentIdx + 1]);
        } else {
          onPhaseChange?.('breakdown');
        }
      }
    }
  }, [goToNextPlanStage, state.phase, state.planStage, onPhaseChange]);

  // Breakdown完了ハンドラ
  const handleBreakdownComplete = useCallback(() => {
    goToPhase('complete');
    onPhaseChange?.('complete');
  }, [goToPhase, onPhaseChange]);

  // リセットハンドラ
  const handleReset = useCallback(() => {
    resetFlow();
    onPhaseChange?.('capture');
  }, [resetFlow, onPhaseChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* プログレスバー */}
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '0.75rem',
          padding: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <PhaseIndicator
              label="Capture"
              active={state.phase === 'capture'}
              completed={state.phase !== 'capture'}
            />
            <span style={{ color: '#475569' }}>→</span>
            <PhaseIndicator
              label="Plan"
              active={state.phase === 'plan'}
              completed={state.phase === 'breakdown' || state.phase === 'complete'}
              subLabel={state.planStage || undefined}
            />
            <span style={{ color: '#475569' }}>→</span>
            <PhaseIndicator
              label="Breakdown"
              active={state.phase === 'breakdown'}
              completed={state.phase === 'complete'}
            />
          </div>
          <button
            onClick={handleReset}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: '0.25rem',
              color: '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
        {/* 進捗バー */}
        <div
          style={{
            height: '4px',
            backgroundColor: '#1e293b',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress.percentage}%`,
              backgroundColor: state.phase === 'complete' ? '#22c55e' : '#3b82f6',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.25rem',
          }}
        >
          <span style={{ color: '#64748b', fontSize: '0.625rem' }}>
            Session: {state.sessionId.slice(-12)}
          </span>
          <span style={{ color: '#64748b', fontSize: '0.625rem' }}>
            {progress.percentage.toFixed(0)}% Complete
          </span>
        </div>
      </div>

      {/* フェーズコンテンツ */}
      {state.phase === 'capture' && (
        <CapturePhase
          concernText={state.concernText}
          onConcernTextChange={setConcernText}
          onComplete={handleCaptureComplete}
        />
      )}

      {state.phase === 'plan' && state.planStage && (
        <PlanPhase
          sessionId={state.sessionId}
          concernText={state.concernText}
          currentStage={state.planStage}
          stageResults={state.planStageResults}
          bottleneckType={state.bottleneckAnalysis?.primaryType}
          onStageResult={setPlanStageResult}
          onWidgetUpdate={addWidgetResult}
          onNextStage={handlePlanNext}
          onPrevStage={goToPrevPlanStage}
          canGoNext={canGoToNextPlanStage || state.planStage === 'summary'}
          canGoPrev={canGoToPrevPlanStage}
        />
      )}

      {state.phase === 'breakdown' && (
        <BreakdownPhase
          sessionId={state.sessionId}
          concernText={state.concernText}
          planResults={state.planStageResults}
          tasks={state.breakdownTasks}
          onTasksGenerated={setBreakdownTasks}
          onComplete={handleBreakdownComplete}
        />
      )}

      {state.phase === 'complete' && (
        <div
          style={{
            backgroundColor: '#14532d',
            borderRadius: '0.75rem',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <span style={{ color: 'white', fontSize: '3rem' }}>✓</span>
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#22c55e', fontSize: '1.5rem' }}>
            Full-Flow Complete!
          </h2>
          <p style={{ color: '#86efac', margin: '0 0 1.5rem 0' }}>
            capture → plan(4 stages) → breakdown すべて完了
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <InfoChip label="関心事" value={`${state.concernText.slice(0, 20)}...`} />
            <InfoChip label="ボトルネック" value={state.bottleneckAnalysis?.primaryType || '-'} />
            <InfoChip
              label="Planステージ"
              value={`${Object.keys(state.planStageResults).length}/4`}
            />
            <InfoChip label="タスク" value={`${state.breakdownTasks.length}個`} />
          </div>
          <button
            onClick={handleReset}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 2rem',
              backgroundColor: '#22c55e',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            新しいフローを開始
          </button>
        </div>
      )}
    </div>
  );
}

interface PhaseIndicatorProps {
  label: string;
  active: boolean;
  completed: boolean;
  subLabel?: string;
}

function PhaseIndicator({ label, active, completed, subLabel }: PhaseIndicatorProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.75rem',
        backgroundColor: active ? '#3b82f6' : completed ? '#22c55e' : '#1e293b',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        color: active || completed ? 'white' : '#64748b',
        fontWeight: active ? 'bold' : 'normal',
      }}
    >
      {label}
      {subLabel && (
        <span
          style={{
            fontSize: '0.625rem',
            opacity: 0.8,
          }}
        >
          ({subLabel})
        </span>
      )}
    </div>
  );
}

interface InfoChipProps {
  label: string;
  value: string;
}

function InfoChip({ label, value }: InfoChipProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.5rem',
        backgroundColor: '#0f172a',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
      }}
    >
      <span style={{ color: '#64748b' }}>{label}:</span>
      <span style={{ color: '#86efac' }}>{value}</span>
    </div>
  );
}
