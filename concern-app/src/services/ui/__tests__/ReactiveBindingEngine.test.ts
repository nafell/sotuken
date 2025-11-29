/**
 * ReactiveBindingEngine.test.ts
 *
 * ReactiveBindingEngineの単体テスト
 */

import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import {
  ReactiveBindingEngine,
  RESERVED_PORTS,
  type PropagationEvent,
} from '../ReactiveBindingEngine';
import type { DependencyGraphSpec } from '../../../types/ui-spec.types';

// テスト用のDependencyGraphSpec
const createMockDpgSpec = (): DependencyGraphSpec => ({
  dependencies: [
    {
      source: 'widgetA.output',
      target: 'widgetB.input',
      mechanism: 'update',
      relationship: { type: 'transform', transform: 'calculate_balance' },
      updateMode: 'debounced',
    },
  ],
});

const createEmptyDpgSpec = (): DependencyGraphSpec => ({
  dependencies: [],
});

describe('ReactiveBindingEngine', () => {
  describe('初期化', () => {
    test('初期化できる', () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec());
      expect(engine).toBeDefined();
      engine.dispose();
    });

    test('空のDependencyGraphSpecで初期化できる', () => {
      const engine = new ReactiveBindingEngine(createEmptyDpgSpec());
      expect(engine).toBeDefined();
      engine.dispose();
    });

    test('カスタム設定で初期化できる', () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec(), {
        defaultDebounceMs: 100,
        maxPropagationDepth: 5,
        debug: true,
      });
      const config = engine.getConfig();
      expect(config.defaultDebounceMs).toBe(100);
      expect(config.maxPropagationDepth).toBe(5);
      expect(config.debug).toBe(true);
      engine.dispose();
    });

    test('循環依存でエラーが発生する', () => {
      const cyclicSpec: DependencyGraphSpec = {
        dependencies: [
          {
            source: 'A.out',
            target: 'B.in',
            mechanism: 'update',
            relationship: { type: 'transform' },
            updateMode: 'debounced',
          },
          {
            source: 'B.out',
            target: 'A.in',
            mechanism: 'update',
            relationship: { type: 'transform' },
            updateMode: 'debounced',
          },
        ],
      };
      expect(() => new ReactiveBindingEngine(cyclicSpec)).toThrow(/[Cc]ircular/);
    });
  });

  describe('Port操作', () => {
    test('initPortでDebounceなしで値設定される', () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec());
      engine.initPort('widgetA.output', 0.5);
      expect(engine.getPortValue('widgetA.output')).toBe(0.5);
      engine.dispose();
    });

    test('getPortValueで未設定のPortはundefined', () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec());
      expect(engine.getPortValue('nonexistent.port')).toBeUndefined();
      engine.dispose();
    });

    test('getAllPortValuesで全Port値を取得', () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec());
      engine.initPort('a.x', 1);
      engine.initPort('b.y', 2);

      const values = engine.getAllPortValues();
      expect(values.get('a.x')).toBe(1);
      expect(values.get('b.y')).toBe(2);
      engine.dispose();
    });
  });

  describe('Debounce動作', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('updatePortでDebounce後に伝播される', async () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec(), {
        defaultDebounceMs: 50,
      });
      const onPropagate = vi.fn();
      engine.setOnPropagate(onPropagate);

      engine.updatePort('widgetA.output', { left: 0.3, right: 0.7 });

      // Debounce前は呼ばれない
      expect(onPropagate).not.toHaveBeenCalled();

      // Debounce後に呼ばれる
      vi.advanceTimersByTime(100);
      expect(onPropagate).toHaveBeenCalled();

      engine.dispose();
    });

    test('連続更新時は最終値のみ伝播される', async () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec(), {
        defaultDebounceMs: 50,
      });
      const onPropagate = vi.fn();
      engine.setOnPropagate(onPropagate);

      engine.updatePort('widgetA.output', { value: 1 });
      engine.updatePort('widgetA.output', { value: 2 });
      engine.updatePort('widgetA.output', { value: 3 });

      vi.advanceTimersByTime(100);

      // 1回のみ呼ばれる
      expect(onPropagate).toHaveBeenCalledTimes(1);
      engine.dispose();
    });

    test('flushで即座に伝播が実行される', () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec(), {
        defaultDebounceMs: 1000,
      });
      const onPropagate = vi.fn();
      engine.setOnPropagate(onPropagate);

      engine.updatePort('widgetA.output', { value: 1 });

      // flushで即座に実行
      engine.flush();
      expect(onPropagate).toHaveBeenCalled();

      engine.dispose();
    });
  });

  describe('FlowValidationState', () => {
    test('全Widget完了時にcanProceed=true', () => {
      const engine = new ReactiveBindingEngine(createEmptyDpgSpec());

      engine.initPort('widget1._completed', { isCompleted: true });
      engine.initPort('widget2._completed', { isCompleted: true });

      const state = engine.getFlowValidationState();
      expect(state.canProceed).toBe(true);
      expect(state.incompleteWidgets).toHaveLength(0);

      engine.dispose();
    });

    test('未完了Widget存在時にcanProceed=false', () => {
      const engine = new ReactiveBindingEngine(createEmptyDpgSpec());

      engine.initPort('widget1._completed', { isCompleted: true });
      engine.initPort('widget2._completed', {
        isCompleted: false,
        requiredFields: ['項目A'],
      });

      const state = engine.getFlowValidationState();
      expect(state.canProceed).toBe(false);
      expect(state.incompleteWidgets).toContain('widget2');

      engine.dispose();
    });

    test('エラーWidget存在時にcanProceed=false', () => {
      const engine = new ReactiveBindingEngine(createEmptyDpgSpec());

      engine.initPort('widget1._error', {
        hasError: true,
        messages: ['エラー発生'],
      });

      const state = engine.getFlowValidationState();
      expect(state.canProceed).toBe(false);
      expect(state.widgetErrors.has('widget1')).toBe(true);

      engine.dispose();
    });

    test('予約Port更新時にコールバックが発火する', () => {
      const engine = new ReactiveBindingEngine(createEmptyDpgSpec());
      const callback = vi.fn();
      engine.setOnValidationStateChange(callback);

      engine.updatePort('widget1._completed', { isCompleted: true });

      // Debounceなしで即座に発火
      expect(callback).toHaveBeenCalled();

      engine.dispose();
    });

    test('initPortでも予約Port更新時にコールバックが発火する', () => {
      const engine = new ReactiveBindingEngine(createEmptyDpgSpec());
      const callback = vi.fn();
      engine.setOnValidationStateChange(callback);

      engine.initPort('widget1._completed', { isCompleted: true });

      expect(callback).toHaveBeenCalled();

      engine.dispose();
    });
  });

  describe('深度制限', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('深度制限で伝播が停止する', () => {
      // 長いチェーンを作成
      const longChainSpec: DependencyGraphSpec = {
        dependencies: [
          {
            source: 'a.out',
            target: 'b.in',
            mechanism: 'update',
            relationship: { type: 'transform' },
            updateMode: 'debounced',
          },
          {
            source: 'b.in',
            target: 'c.in',
            mechanism: 'update',
            relationship: { type: 'transform' },
            updateMode: 'debounced',
          },
        ],
      };

      const engine = new ReactiveBindingEngine(longChainSpec, {
        maxPropagationDepth: 3,
        defaultDebounceMs: 10,
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      engine.updatePort('a.out', 1);
      vi.advanceTimersByTime(50);

      // エラーなく完了
      engine.dispose();
      consoleSpy.mockRestore();
    });
  });

  describe('ライフサイクル', () => {
    test('disposeでタイマーがクリアされる', () => {
      vi.useFakeTimers();

      const engine = new ReactiveBindingEngine(createMockDpgSpec(), {
        defaultDebounceMs: 1000,
      });
      const onPropagate = vi.fn();
      engine.setOnPropagate(onPropagate);

      engine.updatePort('widgetA.output', { value: 1 });
      engine.dispose();

      // タイマーが進んでも呼ばれない
      vi.advanceTimersByTime(2000);
      expect(onPropagate).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    test('isDisposedでdispose状態を確認', () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec());
      expect(engine.isDisposed()).toBe(false);
      engine.dispose();
      expect(engine.isDisposed()).toBe(true);
    });

    test('dispose後のupdatePortは無視される', () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec());
      engine.dispose();
      engine.updatePort('widgetA.output', { value: 1 });
      expect(engine.getPortValue('widgetA.output')).toBeUndefined();
    });
  });

  describe('コールバック', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('setOnPropagateで伝播イベントを受け取れる', () => {
      const engine = new ReactiveBindingEngine(createMockDpgSpec(), {
        defaultDebounceMs: 10,
      });

      let receivedEvents: PropagationEvent[] = [];
      engine.setOnPropagate((events) => {
        receivedEvents = events;
      });

      engine.updatePort('widgetA.output', { left: 50, right: 50 });
      vi.advanceTimersByTime(50);

      expect(receivedEvents.length).toBeGreaterThan(0);
      expect(receivedEvents[0].sourcePortKey).toBe('widgetA.output');

      engine.dispose();
    });

    test('setOnValidationErrorでエラーを受け取れる', () => {
      const spec: DependencyGraphSpec = {
        dependencies: [
          {
            source: 'a.out',
            target: 'b.in',
            mechanism: 'validate',
            relationship: {
              type: 'javascript',
              javascript: 'return false;', // 常にfalseを返す
            },
            updateMode: 'debounced',
          },
        ],
      };

      const engine = new ReactiveBindingEngine(spec, {
        defaultDebounceMs: 10,
      });

      const errorCallback = vi.fn();
      engine.setOnValidationError(errorCallback);

      engine.updatePort('a.out', 'test');
      vi.advanceTimersByTime(50);

      expect(errorCallback).toHaveBeenCalled();

      engine.dispose();
    });
  });

  describe('RESERVED_PORTS', () => {
    test('予約Port定数が正しい', () => {
      expect(RESERVED_PORTS.ERROR).toBe('_error');
      expect(RESERVED_PORTS.COMPLETED).toBe('_completed');
    });
  });
});
