/**
 * useFullFlowState
 * Phase 4: Full-flow demo state management hook
 *
 * capture -> plan (4 stages) -> breakdown フローの状態管理
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  FullFlowState,
  Phase,
  PlanStage,
  StageResult,
  GeneratedTask,
  WidgetResultData,
} from '../components/demo/full-flow/types';
import type { BottleneckAnalysis } from '../types/BottleneckTypes';
import { fullFlowMetricsService } from '../services/FullFlowMetricsService';

const PLAN_STAGE_ORDER: PlanStage[] = ['diverge', 'organize', 'converge', 'summary'];

function generateSessionId(): string {
  return `fullflow_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

function createInitialState(): FullFlowState {
  return {
    sessionId: generateSessionId(),
    phase: 'capture',
    planStage: null,
    concernText: '',
    bottleneckAnalysis: null,
    diagnosticResponses: {},
    planStageResults: {},
    breakdownTasks: [],
    startedAt: new Date().toISOString(),
  };
}

export interface UseFullFlowStateReturn {
  // State
  state: FullFlowState;

  // Capture actions
  setConcernText: (text: string) => void;
  setBottleneckAnalysis: (analysis: BottleneckAnalysis) => void;
  setDiagnosticResponses: (responses: Record<string, any>) => void;

  // Plan actions
  setPlanStageResult: (stage: PlanStage, result: Partial<StageResult>) => void;
  addWidgetResult: (stage: PlanStage, widgetResult: WidgetResultData) => void;

  // Breakdown actions
  setBreakdownTasks: (tasks: GeneratedTask[]) => void;

  // Navigation
  goToPhase: (phase: Phase) => void;
  goToPlanStage: (stage: PlanStage) => void;
  goToNextPlanStage: () => boolean;
  goToPrevPlanStage: () => boolean;
  completeCurrentPhase: () => void;

  // Computed
  currentPlanStageIndex: number;
  canGoToNextPlanStage: boolean;
  canGoToPrevPlanStage: boolean;
  isComplete: boolean;
  progress: {
    phase: Phase;
    stageIndex: number;
    totalStages: number;
    percentage: number;
  };

  // Reset
  resetFlow: () => void;
}

export function useFullFlowState(): UseFullFlowStateReturn {
  const [state, setState] = useState<FullFlowState>(createInitialState);

  // Capture actions
  const setConcernText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, concernText: text }));
  }, []);

  const setBottleneckAnalysis = useCallback((analysis: BottleneckAnalysis) => {
    setState((prev) => ({ ...prev, bottleneckAnalysis: analysis }));
  }, []);

  const setDiagnosticResponses = useCallback((responses: Record<string, any>) => {
    setState((prev) => ({ ...prev, diagnosticResponses: responses }));
  }, []);

  // Plan actions
  const setPlanStageResult = useCallback((stage: PlanStage, result: Partial<StageResult>) => {
    setState((prev) => ({
      ...prev,
      planStageResults: {
        ...prev.planStageResults,
        [stage]: {
          ...prev.planStageResults[stage],
          ...result,
          stage,
        },
      },
    }));
  }, []);

  const addWidgetResult = useCallback((stage: PlanStage, widgetResult: WidgetResultData) => {
    setState((prev) => {
      const existingResult = prev.planStageResults[stage];
      const existingWidgetResults = existingResult?.widgetResults || [];

      // 同じwidgetIdの結果があれば更新、なければ追加
      const updatedWidgetResults = existingWidgetResults.some(
        (r) => r.widgetId === widgetResult.widgetId
      )
        ? existingWidgetResults.map((r) =>
            r.widgetId === widgetResult.widgetId ? widgetResult : r
          )
        : [...existingWidgetResults, widgetResult];

      return {
        ...prev,
        planStageResults: {
          ...prev.planStageResults,
          [stage]: {
            ...existingResult,
            stage,
            widgetResults: updatedWidgetResults,
          },
        },
      };
    });
  }, []);

  // Breakdown actions
  const setBreakdownTasks = useCallback((tasks: GeneratedTask[]) => {
    setState((prev) => ({ ...prev, breakdownTasks: tasks }));
  }, []);

  // Navigation
  const goToPhase = useCallback((phase: Phase) => {
    setState((prev) => {
      const newState = { ...prev, phase };

      // Planフェーズに入る場合、最初のステージに設定
      if (phase === 'plan' && prev.phase !== 'plan') {
        newState.planStage = 'diverge';
      }

      // Planフェーズを離れる場合、planStageをnullに
      if (phase !== 'plan') {
        newState.planStage = null;
      }

      // Complete時にタイムスタンプ設定
      if (phase === 'complete') {
        newState.completedAt = new Date().toISOString();
      }

      return newState;
    });
  }, []);

  const goToPlanStage = useCallback((stage: PlanStage) => {
    setState((prev) => ({
      ...prev,
      phase: 'plan',
      planStage: stage,
    }));
  }, []);

  const goToNextPlanStage = useCallback((): boolean => {
    let moved = false;

    setState((prev) => {
      if (prev.phase !== 'plan' || !prev.planStage) return prev;

      const currentIndex = PLAN_STAGE_ORDER.indexOf(prev.planStage);

      if (currentIndex < PLAN_STAGE_ORDER.length - 1) {
        // 次のステージへ
        moved = true;
        return {
          ...prev,
          planStage: PLAN_STAGE_ORDER[currentIndex + 1],
        };
      } else {
        // 最後のステージ（summary）完了 → breakdownへ
        moved = true;
        return {
          ...prev,
          phase: 'breakdown',
          planStage: null,
        };
      }
    });

    return moved;
  }, []);

  const goToPrevPlanStage = useCallback((): boolean => {
    let moved = false;

    setState((prev) => {
      if (prev.phase !== 'plan' || !prev.planStage) return prev;

      const currentIndex = PLAN_STAGE_ORDER.indexOf(prev.planStage);

      if (currentIndex > 0) {
        moved = true;
        return {
          ...prev,
          planStage: PLAN_STAGE_ORDER[currentIndex - 1],
        };
      }

      return prev;
    });

    return moved;
  }, []);

  const completeCurrentPhase = useCallback(() => {
    setState((prev) => {
      switch (prev.phase) {
        case 'capture':
          return { ...prev, phase: 'plan', planStage: 'diverge' };
        case 'plan':
          return { ...prev, phase: 'breakdown', planStage: null };
        case 'breakdown':
          return { ...prev, phase: 'complete', completedAt: new Date().toISOString() };
        default:
          return prev;
      }
    });
  }, []);

  // Computed values
  const currentPlanStageIndex = useMemo(() => {
    if (!state.planStage) return -1;
    return PLAN_STAGE_ORDER.indexOf(state.planStage);
  }, [state.planStage]);

  const canGoToNextPlanStage = useMemo(() => {
    return state.phase === 'plan' && currentPlanStageIndex < PLAN_STAGE_ORDER.length - 1;
  }, [state.phase, currentPlanStageIndex]);

  const canGoToPrevPlanStage = useMemo(() => {
    return state.phase === 'plan' && currentPlanStageIndex > 0;
  }, [state.phase, currentPlanStageIndex]);

  const isComplete = useMemo(() => state.phase === 'complete', [state.phase]);

  const progress = useMemo(() => {
    // 全体の進捗: capture(0-25%), plan(25-75%), breakdown(75-100%), complete(100%)
    let percentage = 0;

    if (state.phase === 'capture') {
      percentage = state.concernText ? 12.5 : 0;
      if (state.bottleneckAnalysis) percentage = 25;
    } else if (state.phase === 'plan') {
      const stageProgress = (currentPlanStageIndex + 1) / PLAN_STAGE_ORDER.length;
      percentage = 25 + stageProgress * 50;
    } else if (state.phase === 'breakdown') {
      percentage = state.breakdownTasks.length > 0 ? 100 : 75;
    } else if (state.phase === 'complete') {
      percentage = 100;
    }

    return {
      phase: state.phase,
      stageIndex: currentPlanStageIndex,
      totalStages: PLAN_STAGE_ORDER.length,
      percentage,
    };
  }, [state.phase, state.concernText, state.bottleneckAnalysis, currentPlanStageIndex, state.breakdownTasks]);

  // Reset
  const resetFlow = useCallback(() => {
    const newState = createInitialState();
    setState(newState);
    fullFlowMetricsService.reset();
  }, []);

  return {
    state,
    setConcernText,
    setBottleneckAnalysis,
    setDiagnosticResponses,
    setPlanStageResult,
    addWidgetResult,
    setBreakdownTasks,
    goToPhase,
    goToPlanStage,
    goToNextPlanStage,
    goToPrevPlanStage,
    completeCurrentPhase,
    currentPlanStageIndex,
    canGoToNextPlanStage,
    canGoToPrevPlanStage,
    isComplete,
    progress,
    resetFlow,
  };
}
