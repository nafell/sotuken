/**
 * useFlowValidation.test.tsx
 *
 * useFlowValidationフックの単体テスト
 */

import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useFlowValidation,
  useCanProceed,
  useWidgetErrors,
  useIncompleteWidgets,
} from '../useFlowValidation';
import { ReactiveBindingEngine } from '../../services/ui/ReactiveBindingEngine';
import type { DependencyGraphSpec } from '../../types/ui-spec.types';

// テスト用のDependencyGraphSpec
const createEmptyDpgSpec = (): DependencyGraphSpec => ({
  dependencies: [],
});

describe('useFlowValidation', () => {
  let engine: ReactiveBindingEngine;

  beforeEach(() => {
    engine = new ReactiveBindingEngine(createEmptyDpgSpec());
  });

  afterEach(() => {
    engine.dispose();
  });

  describe('基本動作', () => {
    test('engineがnullの場合はデフォルト値を返す', () => {
      const { result } = renderHook(() => useFlowValidation(null));

      expect(result.current.canProceed).toBe(false);
      expect(result.current.incompleteWidgets).toHaveLength(0);
      expect(result.current.widgetErrors.size).toBe(0);
    });

    test('engineの初期状態が反映される', () => {
      engine.initPort('w1._completed', { isCompleted: true });

      const { result } = renderHook(() => useFlowValidation(engine));

      expect(result.current.canProceed).toBe(true);
    });
  });

  describe('状態変更の反映', () => {
    test('完了状態の変更が反映される', async () => {
      const { result } = renderHook(() => useFlowValidation(engine));

      // 初期状態
      expect(result.current.canProceed).toBe(true); // 未登録なのでtrue

      // 未完了Widgetを追加
      act(() => {
        engine.updatePort('w1._completed', { isCompleted: false });
      });

      await waitFor(() => {
        expect(result.current.canProceed).toBe(false);
        expect(result.current.incompleteWidgets).toContain('w1');
      });
    });

    test('エラー状態の変更が反映される', async () => {
      const { result } = renderHook(() => useFlowValidation(engine));

      act(() => {
        engine.updatePort('w1._error', {
          hasError: true,
          messages: ['エラー発生'],
        });
      });

      await waitFor(() => {
        expect(result.current.canProceed).toBe(false);
        expect(result.current.widgetErrors.has('w1')).toBe(true);
      });
    });

    test('完了→未完了→完了の変更が正しく反映される', async () => {
      const { result } = renderHook(() => useFlowValidation(engine));

      // 完了
      act(() => {
        engine.updatePort('w1._completed', { isCompleted: true });
      });
      await waitFor(() => {
        expect(result.current.canProceed).toBe(true);
      });

      // 未完了
      act(() => {
        engine.updatePort('w1._completed', { isCompleted: false });
      });
      await waitFor(() => {
        expect(result.current.canProceed).toBe(false);
      });

      // 再び完了
      act(() => {
        engine.updatePort('w1._completed', { isCompleted: true });
      });
      await waitFor(() => {
        expect(result.current.canProceed).toBe(true);
      });
    });
  });

  describe('engineの切り替え', () => {
    test('engineがnullに変わるとデフォルト状態に戻る', async () => {
      engine.initPort('w1._completed', { isCompleted: true });

      const { result, rerender } = renderHook(
        ({ e }) => useFlowValidation(e),
        { initialProps: { e: engine as ReactiveBindingEngine | null } }
      );

      expect(result.current.canProceed).toBe(true);

      rerender({ e: null });

      expect(result.current.canProceed).toBe(false);
    });
  });
});

describe('useCanProceed', () => {
  test('canProceedのみを返す', () => {
    const engine = new ReactiveBindingEngine(createEmptyDpgSpec());
    engine.initPort('w1._completed', { isCompleted: true });

    const { result } = renderHook(() => useCanProceed(engine));

    expect(result.current).toBe(true);

    engine.dispose();
  });

  test('engineがnullの場合はfalse', () => {
    const { result } = renderHook(() => useCanProceed(null));

    expect(result.current).toBe(false);
  });
});

describe('useWidgetErrors', () => {
  test('特定Widgetのエラーメッセージを返す', async () => {
    const engine = new ReactiveBindingEngine(createEmptyDpgSpec());
    engine.initPort('w1._error', {
      hasError: true,
      messages: ['エラー1', 'エラー2'],
    });

    const { result } = renderHook(() => useWidgetErrors(engine, 'w1'));

    expect(result.current).toContain('エラー1');
    expect(result.current).toContain('エラー2');

    engine.dispose();
  });

  test('エラーがないWidgetは空配列を返す', () => {
    const engine = new ReactiveBindingEngine(createEmptyDpgSpec());

    const { result } = renderHook(() => useWidgetErrors(engine, 'w1'));

    expect(result.current).toEqual([]);

    engine.dispose();
  });
});

describe('useIncompleteWidgets', () => {
  test('未完了Widgetリストを返す', () => {
    const engine = new ReactiveBindingEngine(createEmptyDpgSpec());
    engine.initPort('w1._completed', { isCompleted: false });
    engine.initPort('w2._completed', { isCompleted: true });
    engine.initPort('w3._completed', { isCompleted: false });

    const { result } = renderHook(() => useIncompleteWidgets(engine));

    expect(result.current).toContain('w1');
    expect(result.current).toContain('w3');
    expect(result.current).not.toContain('w2');

    engine.dispose();
  });

  test('全Widget完了時は空配列を返す', () => {
    const engine = new ReactiveBindingEngine(createEmptyDpgSpec());
    engine.initPort('w1._completed', { isCompleted: true });

    const { result } = renderHook(() => useIncompleteWidgets(engine));

    expect(result.current).toEqual([]);

    engine.dispose();
  });
});
