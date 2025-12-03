/**
 * useStageNavigation テスト
 *
 * DSL v4 ナビゲーションフックの単体テスト
 *
 * @since DSL v4.0
 */

import { describe, expect, test } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStageNavigation } from '../useStageNavigation';

describe('useStageNavigation', () => {
  describe('初期状態', () => {
    test('初期ステージがdivergeになる', () => {
      const { result } = renderHook(() => useStageNavigation());

      expect(result.current.currentStage).toBe('diverge');
      expect(result.current.currentStageIndex).toBe(0);
      expect(result.current.totalStages).toBe(4);
    });

    test('カスタム初期ステージを設定できる', () => {
      const { result } = renderHook(() =>
        useStageNavigation({ initialStage: 'organize' })
      );

      expect(result.current.currentStage).toBe('organize');
      expect(result.current.currentStageIndex).toBe(1);
    });

    test('初期状態でcanGoNextがtrue、canGoPrevがfalse', () => {
      const { result } = renderHook(() => useStageNavigation());

      expect(result.current.canGoNext).toBe(true);
      expect(result.current.canGoPrev).toBe(false);
    });
  });

  describe('goToNextStage', () => {
    test('次のステージに進める', () => {
      const { result } = renderHook(() => useStageNavigation());

      act(() => {
        result.current.goToNextStage();
      });

      expect(result.current.currentStage).toBe('organize');
      expect(result.current.currentStageIndex).toBe(1);
    });

    test('履歴に結果が保存される', () => {
      const { result } = renderHook(() => useStageNavigation());

      // Widget結果を追加
      act(() => {
        result.current.addWidgetResult({
          widgetId: 'test-widget',
          component: 'emotion_palette',
          data: { test: 'data' },
          timestamp: new Date().toISOString(),
        });
      });

      // 別のactで次のステージに進む
      act(() => {
        result.current.goToNextStage();
      });

      expect(result.current.stageHistory).toHaveLength(1);
      expect(result.current.stageHistory[0].stage).toBe('diverge');
      expect(result.current.stageHistory[0].widgetResults).toHaveLength(1);
    });

    test('最終ステージではcanGoNextがfalse', () => {
      const { result } = renderHook(() =>
        useStageNavigation({ initialStage: 'summary' })
      );

      expect(result.current.canGoNext).toBe(false);
    });
  });

  describe('goToPreviousStage', () => {
    test('前のステージに戻れる', () => {
      const { result } = renderHook(() => useStageNavigation());

      act(() => {
        result.current.goToNextStage();
      });

      expect(result.current.currentStage).toBe('organize');

      act(() => {
        result.current.goToPreviousStage();
      });

      expect(result.current.currentStage).toBe('diverge');
    });

    test('戻り時に後続ステージの履歴が削除される', () => {
      const { result } = renderHook(() => useStageNavigation());

      // diverge → organize → converge と進める
      act(() => {
        result.current.goToNextStage();
      });
      act(() => {
        result.current.goToNextStage();
      });

      expect(result.current.stageHistory).toHaveLength(2);

      // organizeに戻る
      act(() => {
        result.current.goToPreviousStage();
      });

      // divergeの履歴のみ残る
      expect(result.current.stageHistory).toHaveLength(1);
      expect(result.current.currentStage).toBe('organize');
    });

    test('allowGoBack=falseでは戻れない', () => {
      const { result } = renderHook(() =>
        useStageNavigation({ allowGoBack: false })
      );

      act(() => {
        result.current.goToNextStage();
      });

      expect(result.current.canGoPrev).toBe(false);

      act(() => {
        result.current.goToPreviousStage();
      });

      // 変化しない
      expect(result.current.currentStage).toBe('organize');
    });
  });

  describe('skipCurrentStage', () => {
    test('現在のステージをスキップできる', () => {
      const { result } = renderHook(() => useStageNavigation());

      act(() => {
        result.current.skipCurrentStage();
      });

      expect(result.current.currentStage).toBe('organize');
      expect(result.current.stageHistory[0].skipped).toBe(true);
    });

    test('allowSkip=falseではスキップできない', () => {
      const { result } = renderHook(() =>
        useStageNavigation({ allowSkip: false })
      );

      act(() => {
        result.current.skipCurrentStage();
      });

      // 変化しない
      expect(result.current.currentStage).toBe('diverge');
    });
  });

  describe('goToStage', () => {
    test('過去のステージにジャンプできる', () => {
      const { result } = renderHook(() => useStageNavigation());

      // convergeまで進む
      act(() => {
        result.current.goToNextStage();
      });
      act(() => {
        result.current.goToNextStage();
      });

      expect(result.current.currentStage).toBe('converge');

      // divergeにジャンプ
      act(() => {
        result.current.goToStage('diverge');
      });

      expect(result.current.currentStage).toBe('diverge');
      expect(result.current.stageHistory).toHaveLength(0);
    });

    test('未来のステージにはジャンプできない', () => {
      const { result } = renderHook(() => useStageNavigation());

      act(() => {
        result.current.goToStage('converge');
      });

      // 変化しない
      expect(result.current.currentStage).toBe('diverge');
    });
  });

  describe('Widget結果管理', () => {
    test('Widget結果を追加できる', () => {
      const { result } = renderHook(() => useStageNavigation());

      act(() => {
        result.current.addWidgetResult({
          widgetId: 'widget-1',
          component: 'emotion_palette',
          data: { emotions: ['happy'] },
          timestamp: new Date().toISOString(),
        });
      });

      const currentResult = result.current.getCurrentStageResult();
      expect(currentResult?.widgetResults).toHaveLength(1);
      expect(currentResult?.widgetResults[0].widgetId).toBe('widget-1');
    });

    test('同じWidgetの結果は更新される', () => {
      const { result } = renderHook(() => useStageNavigation());

      act(() => {
        result.current.addWidgetResult({
          widgetId: 'widget-1',
          component: 'emotion_palette',
          data: { emotions: ['happy'] },
          timestamp: new Date().toISOString(),
        });
      });

      act(() => {
        result.current.addWidgetResult({
          widgetId: 'widget-1',
          component: 'emotion_palette',
          data: { emotions: ['sad'] },
          timestamp: new Date().toISOString(),
        });
      });

      const currentResult = result.current.getCurrentStageResult();
      expect(currentResult?.widgetResults).toHaveLength(1);
      expect((currentResult?.widgetResults[0].data as any).emotions).toEqual(['sad']);
    });
  });

  describe('テキストサマリー', () => {
    test('テキストサマリーを設定できる', () => {
      const { result } = renderHook(() => useStageNavigation());

      act(() => {
        result.current.setTextSummary('テストサマリー');
      });

      const currentResult = result.current.getCurrentStageResult();
      expect(currentResult?.textSummary).toBe('テストサマリー');
    });
  });

  describe('リセット', () => {
    test('初期状態にリセットできる', () => {
      const { result } = renderHook(() => useStageNavigation());

      act(() => {
        result.current.goToNextStage();
        result.current.goToNextStage();
        result.current.addWidgetResult({
          widgetId: 'widget-1',
          component: 'emotion_palette',
          data: {},
          timestamp: new Date().toISOString(),
        });
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.currentStage).toBe('diverge');
      expect(result.current.stageHistory).toHaveLength(0);
    });
  });

  describe('コールバック', () => {
    test('onStageChangeが呼ばれる', () => {
      let calledWith: { stage: string; direction: string } | null = null;

      const { result } = renderHook(() =>
        useStageNavigation({
          onStageChange: (stage, direction) => {
            calledWith = { stage, direction };
          },
        })
      );

      act(() => {
        result.current.goToNextStage();
      });

      expect(calledWith).toEqual({ stage: 'organize', direction: 'next' });
    });

    test('onCompleteが呼ばれる', () => {
      let completedHistory: any[] | null = null;

      const { result } = renderHook(() =>
        useStageNavigation({
          initialStage: 'summary',
          onComplete: (history) => {
            completedHistory = history;
          },
        })
      );

      act(() => {
        result.current.goToNextStage();
      });

      expect(completedHistory).not.toBeNull();
      expect(completedHistory).toHaveLength(1);
    });
  });
});
