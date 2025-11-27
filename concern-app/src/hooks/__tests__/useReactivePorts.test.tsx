/**
 * useReactivePorts.test.tsx
 *
 * useReactivePortsフックの単体テスト
 */

import { describe, expect, test, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReactivePorts } from '../useReactivePorts';

describe('useReactivePorts', () => {
  describe('emitPort', () => {
    test('emitPortでonPortChangeが呼ばれる', () => {
      const onPortChange = vi.fn();
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          onPortChange,
        })
      );

      act(() => {
        result.current.emitPort('balance', 0.5);
      });

      expect(onPortChange).toHaveBeenCalledWith('test-widget', 'balance', 0.5);
    });

    test('onPortChangeがない場合もエラーにならない', () => {
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
        })
      );

      expect(() => {
        act(() => {
          result.current.emitPort('balance', 0.5);
        });
      }).not.toThrow();
    });

    test('複数のポートに出力できる', () => {
      const onPortChange = vi.fn();
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          onPortChange,
        })
      );

      act(() => {
        result.current.emitPort('balance', 0.5);
        result.current.emitPort('direction', 'left');
      });

      expect(onPortChange).toHaveBeenCalledTimes(2);
      expect(onPortChange).toHaveBeenCalledWith('test-widget', 'balance', 0.5);
      expect(onPortChange).toHaveBeenCalledWith('test-widget', 'direction', 'left');
    });
  });

  describe('setCompleted', () => {
    test('setCompletedで_completedポートに出力される', () => {
      const onPortChange = vi.fn();
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          onPortChange,
        })
      );

      act(() => {
        result.current.setCompleted(true);
      });

      expect(onPortChange).toHaveBeenCalledWith(
        'test-widget',
        '_completed',
        expect.objectContaining({ isCompleted: true })
      );
    });

    test('setCompleted(false)で未完了状態になる', () => {
      const onPortChange = vi.fn();
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          onPortChange,
        })
      );

      act(() => {
        result.current.setCompleted(false, ['項目A', '項目B']);
      });

      expect(onPortChange).toHaveBeenCalledWith(
        'test-widget',
        '_completed',
        expect.objectContaining({
          isCompleted: false,
          requiredFields: ['項目A', '項目B'],
        })
      );
    });

    test('completedStateが更新される', () => {
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
        })
      );

      expect(result.current.completedState.isCompleted).toBe(false);

      act(() => {
        result.current.setCompleted(true);
      });

      expect(result.current.completedState.isCompleted).toBe(true);
    });
  });

  describe('setError', () => {
    test('setErrorで_errorポートに出力される', () => {
      const onPortChange = vi.fn();
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          onPortChange,
        })
      );

      act(() => {
        result.current.setError(true, ['エラーメッセージ']);
      });

      expect(onPortChange).toHaveBeenCalledWith(
        'test-widget',
        '_error',
        expect.objectContaining({
          hasError: true,
          messages: ['エラーメッセージ'],
        })
      );
    });

    test('setError(false)でエラー解除', () => {
      const onPortChange = vi.fn();
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          onPortChange,
        })
      );

      act(() => {
        result.current.setError(false);
      });

      expect(onPortChange).toHaveBeenCalledWith(
        'test-widget',
        '_error',
        expect.objectContaining({
          hasError: false,
          messages: [],
        })
      );
    });

    test('errorStateが更新される', () => {
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
        })
      );

      expect(result.current.errorState.hasError).toBe(false);

      act(() => {
        result.current.setError(true, ['テストエラー']);
      });

      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.messages).toContain('テストエラー');
    });
  });

  describe('initialPortValues', () => {
    test('initialPortValuesで初期状態が設定される', () => {
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          initialPortValues: {
            _completed: { isCompleted: true },
          },
        })
      );

      expect(result.current.completedState.isCompleted).toBe(true);
    });

    test('initialPortValuesでエラー状態が設定される', () => {
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          initialPortValues: {
            _error: { hasError: true, messages: ['初期エラー'] },
          },
        })
      );

      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.messages).toContain('初期エラー');
    });

    test('不正な初期値は無視される', () => {
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          initialPortValues: {
            _completed: 'invalid', // 不正な値
          },
        })
      );

      expect(result.current.completedState.isCompleted).toBe(false);
    });
  });

  describe('readPort', () => {
    test('readPortでgetPortValueが呼ばれる', () => {
      const getPortValue = vi.fn().mockReturnValue(42);
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
          getPortValue,
        })
      );

      const value = result.current.readPort('other.output');

      expect(getPortValue).toHaveBeenCalledWith('other.output');
      expect(value).toBe(42);
    });

    test('getPortValueがない場合はundefinedを返す', () => {
      const { result } = renderHook(() =>
        useReactivePorts({
          widgetId: 'test-widget',
        })
      );

      const value = result.current.readPort('other.output');

      expect(value).toBeUndefined();
    });
  });

  describe('widgetIdの変更', () => {
    test('widgetIdが変わるとemitPortが新しいIDで呼ばれる', () => {
      const onPortChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ widgetId }) =>
          useReactivePorts({
            widgetId,
            onPortChange,
          }),
        { initialProps: { widgetId: 'widget-1' } }
      );

      act(() => {
        result.current.emitPort('test', 1);
      });
      expect(onPortChange).toHaveBeenLastCalledWith('widget-1', 'test', 1);

      rerender({ widgetId: 'widget-2' });

      act(() => {
        result.current.emitPort('test', 2);
      });
      expect(onPortChange).toHaveBeenLastCalledWith('widget-2', 'test', 2);
    });
  });
});
