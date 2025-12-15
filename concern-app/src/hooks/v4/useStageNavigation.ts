/**
 * useStageNavigation.ts
 * DSL v4 4ステージナビゲーションフック
 *
 * TASK-4.4: ナビゲーション機能実装
 *
 * @since DSL v4.0
 */

import { useState, useCallback, useMemo } from 'react';
import type { StageType } from '../../types/v4/ors.types';
import { STAGE_ORDER, getNextStage, getPreviousStage, getStageIndex } from '../../types/v4/widget-selection.types';

// =============================================================================
// Types
// =============================================================================

/**
 * Widget結果データ
 */
export interface WidgetResultData {
  widgetId: string;
  component: string;
  data: unknown;
  timestamp: string;
}

/**
 * ステージ結果
 */
export interface StageResult {
  /** ステージ種別 */
  stage: StageType;
  /** スキップフラグ */
  skipped?: boolean;
  /** Widget結果 */
  widgetResults: WidgetResultData[];
  /** テキストサマリー */
  textSummary?: string;
  /** 開始日時 */
  startedAt: string;
  /** 完了日時 */
  completedAt?: string;
}

/**
 * ナビゲーション状態
 */
export interface StageNavigationState {
  /** 現在のステージ */
  currentStage: StageType;
  /** ステージ履歴 */
  stageHistory: StageResult[];
  /** 現在のステージインデックス */
  currentStageIndex: number;
  /** 全ステージ数 */
  totalStages: number;
  /** 次へ進めるか */
  canGoNext: boolean;
  /** 前へ戻れるか */
  canGoPrev: boolean;
  /** 完了状態か */
  isComplete: boolean;
}

/**
 * ナビゲーションアクション
 */
export interface StageNavigationActions {
  /** 次のステージへ進む */
  goToNextStage: (currentStageResult?: Partial<StageResult>) => void;
  /** 前のステージへ戻る */
  goToPreviousStage: () => void;
  /** 現在のステージをスキップ */
  skipCurrentStage: () => void;
  /** 指定ステージへ移動 */
  goToStage: (stage: StageType) => void;
  /** Widget結果を追加 */
  addWidgetResult: (widgetResult: WidgetResultData) => void;
  /** テキストサマリーを設定 */
  setTextSummary: (summary: string) => void;
  /** 現在のステージの結果を取得 */
  getCurrentStageResult: () => StageResult | undefined;
  /** ナビゲーションをリセット */
  reset: () => void;
}

/**
 * useStageNavigationの戻り値
 */
export type UseStageNavigationReturn = StageNavigationState & StageNavigationActions;

/**
 * useStageNavigationのオプション
 */
export interface UseStageNavigationOptions {
  /** 初期ステージ */
  initialStage?: StageType;
  /** ステージ変更時のコールバック */
  onStageChange?: (stage: StageType, direction: 'next' | 'prev' | 'skip' | 'jump') => void;
  /** 完了時のコールバック */
  onComplete?: (history: StageResult[]) => void;
  /** スキップ許可 */
  allowSkip?: boolean;
  /** 戻り許可 */
  allowGoBack?: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useStageNavigation
 *
 * 4ステージナビゲーションを管理するカスタムフック
 */
export function useStageNavigation(options: UseStageNavigationOptions = {}): UseStageNavigationReturn {
  const {
    initialStage = 'diverge',
    onStageChange,
    onComplete,
    allowSkip = true,
    allowGoBack = true,
  } = options;

  // 状態
  const [currentStage, setCurrentStage] = useState<StageType>(initialStage);
  const [stageHistory, setStageHistory] = useState<StageResult[]>([]);
  const [currentStageData, setCurrentStageData] = useState<Partial<StageResult>>({
    stage: initialStage,
    widgetResults: [],
    startedAt: new Date().toISOString(),
  });

  // 計算値
  const currentStageIndex = useMemo(() => getStageIndex(currentStage), [currentStage]);
  const totalStages = STAGE_ORDER.length;
  const canGoNext = currentStageIndex < totalStages - 1;
  const canGoPrev = allowGoBack && currentStageIndex > 0;
  const isComplete = currentStageIndex === totalStages - 1 && !!currentStageData.completedAt;

  // 次のステージへ進む
  const goToNextStage = useCallback(
    (currentStageResult?: Partial<StageResult>) => {
      const nextStage = getNextStage(currentStage);

      // 現在のステージ結果を履歴に保存
      const resultToSave: StageResult = {
        stage: currentStage,
        skipped: false,
        widgetResults: currentStageData.widgetResults || [],
        textSummary: currentStageResult?.textSummary || currentStageData.textSummary,
        startedAt: currentStageData.startedAt || new Date().toISOString(),
        completedAt: new Date().toISOString(),
        ...currentStageResult,
      };

      setStageHistory((prev) => {
        // 同じステージの履歴があれば上書き
        const existingIndex = prev.findIndex((h) => h.stage === currentStage);
        if (existingIndex >= 0) {
          const newHistory = [...prev];
          newHistory[existingIndex] = resultToSave;
          return newHistory;
        }
        return [...prev, resultToSave];
      });

      if (nextStage) {
        setCurrentStage(nextStage);
        setCurrentStageData({
          stage: nextStage,
          widgetResults: [],
          startedAt: new Date().toISOString(),
        });
        onStageChange?.(nextStage, 'next');
      } else {
        // 最終ステージ完了
        onComplete?.([...stageHistory, resultToSave]);
      }
    },
    [currentStage, currentStageData, stageHistory, onStageChange, onComplete]
  );

  // 前のステージへ戻る
  const goToPreviousStage = useCallback(() => {
    if (!allowGoBack) return;

    const prevStage = getPreviousStage(currentStage);
    if (!prevStage) return;

    // 現在のステージ以降の履歴を削除
    setStageHistory((prev) => prev.filter((h) => getStageIndex(h.stage) < getStageIndex(currentStage)));

    setCurrentStage(prevStage);

    // 前のステージの結果を復元
    const prevHistory = stageHistory.find((h) => h.stage === prevStage);
    if (prevHistory) {
      setCurrentStageData({
        stage: prevStage,
        widgetResults: prevHistory.widgetResults,
        textSummary: prevHistory.textSummary,
        startedAt: prevHistory.startedAt,
      });
    } else {
      setCurrentStageData({
        stage: prevStage,
        widgetResults: [],
        startedAt: new Date().toISOString(),
      });
    }

    onStageChange?.(prevStage, 'prev');
  }, [allowGoBack, currentStage, stageHistory, onStageChange]);

  // 現在のステージをスキップ
  const skipCurrentStage = useCallback(() => {
    if (!allowSkip) return;

    const nextStage = getNextStage(currentStage);

    // スキップとして履歴に保存
    const skipResult: StageResult = {
      stage: currentStage,
      skipped: true,
      widgetResults: [],
      startedAt: currentStageData.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    setStageHistory((prev) => {
      const existingIndex = prev.findIndex((h) => h.stage === currentStage);
      if (existingIndex >= 0) {
        const newHistory = [...prev];
        newHistory[existingIndex] = skipResult;
        return newHistory;
      }
      return [...prev, skipResult];
    });

    if (nextStage) {
      setCurrentStage(nextStage);
      setCurrentStageData({
        stage: nextStage,
        widgetResults: [],
        startedAt: new Date().toISOString(),
      });
      onStageChange?.(nextStage, 'skip');
    } else {
      onComplete?.([...stageHistory, skipResult]);
    }
  }, [allowSkip, currentStage, currentStageData, stageHistory, onStageChange, onComplete]);

  // 指定ステージへ移動（戻る場合のみ）
  const goToStage = useCallback(
    (stage: StageType) => {
      const targetIndex = getStageIndex(stage);
      const currentIndex = getStageIndex(currentStage);

      // 未来のステージへは移動不可
      if (targetIndex > currentIndex) return;

      if (targetIndex === currentIndex) return;

      // 対象ステージ以降の履歴を削除
      setStageHistory((prev) => prev.filter((h) => getStageIndex(h.stage) < targetIndex));

      setCurrentStage(stage);

      // 対象ステージの結果を復元
      const targetHistory = stageHistory.find((h) => h.stage === stage);
      if (targetHistory) {
        setCurrentStageData({
          stage,
          widgetResults: targetHistory.widgetResults,
          textSummary: targetHistory.textSummary,
          startedAt: targetHistory.startedAt,
        });
      } else {
        setCurrentStageData({
          stage,
          widgetResults: [],
          startedAt: new Date().toISOString(),
        });
      }

      onStageChange?.(stage, 'jump');
    },
    [currentStage, stageHistory, onStageChange]
  );

  // Widget結果を追加
  const addWidgetResult = useCallback((widgetResult: WidgetResultData) => {
    setCurrentStageData((prev) => {
      const existingResults = prev.widgetResults || [];
      // 同じWidgetの結果があれば更新、なければ追加
      const existingIndex = existingResults.findIndex((r) => r.widgetId === widgetResult.widgetId);
      if (existingIndex >= 0) {
        const newResults = [...existingResults];
        newResults[existingIndex] = widgetResult;
        return { ...prev, widgetResults: newResults };
      }
      return { ...prev, widgetResults: [...existingResults, widgetResult] };
    });
  }, []);

  // テキストサマリーを設定
  const setTextSummary = useCallback((summary: string) => {
    setCurrentStageData((prev) => ({ ...prev, textSummary: summary }));
  }, []);

  // 現在のステージの結果を取得
  const getCurrentStageResult = useCallback((): StageResult | undefined => {
    if (!currentStageData.widgetResults?.length && !currentStageData.textSummary) {
      return undefined;
    }
    return {
      stage: currentStage,
      skipped: false,
      widgetResults: currentStageData.widgetResults || [],
      textSummary: currentStageData.textSummary,
      startedAt: currentStageData.startedAt || new Date().toISOString(),
    };
  }, [currentStage, currentStageData]);

  // リセット
  const reset = useCallback(() => {
    setCurrentStage(initialStage);
    setStageHistory([]);
    setCurrentStageData({
      stage: initialStage,
      widgetResults: [],
      startedAt: new Date().toISOString(),
    });
  }, [initialStage]);

  return {
    // State
    currentStage,
    stageHistory,
    currentStageIndex,
    totalStages,
    canGoNext,
    canGoPrev,
    isComplete,
    // Actions
    goToNextStage,
    goToPreviousStage,
    skipCurrentStage,
    goToStage,
    addWidgetResult,
    setTextSummary,
    getCurrentStageResult,
    reset,
  };
}

export default useStageNavigation;
