/**
 * ReactiveBindingEngineV4 テスト
 *
 * DSL v4 リアクティブバインディングエンジンの単体テスト
 *
 * @since DSL v4.0
 */

import { describe, expect, test, beforeEach, vi } from 'vitest';
import {
  ReactiveBindingEngineV4,
  createReactiveBindingEngineV4,
  type PropagationEventV4,
} from '../ReactiveBindingEngineV4';
import type { ReactiveBindingSpec, ReactiveBinding } from '../../../types/v4/reactive-binding.types';

describe('ReactiveBindingEngineV4', () => {
  let engine: ReactiveBindingEngineV4;

  describe('基本機能', () => {
    beforeEach(() => {
      const spec: ReactiveBindingSpec = {
        bindings: [],
      };
      engine = createReactiveBindingEngineV4(spec);
    });

    test('Portを初期化できる', () => {
      engine.initPort('widget1.output', 'initial value');

      expect(engine.getPortValue('widget1.output')).toBe('initial value');
    });

    test('Portを更新できる', () => {
      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'updated');

      expect(engine.getPortValue('widget1.output')).toBe('updated');
    });

    test('Widget別のPort値を取得できる', () => {
      engine.initPort('widget1.output1', 'value1');
      engine.initPort('widget1.output2', 'value2');
      engine.initPort('widget2.output1', 'value3');

      const widget1Ports = engine.getWidgetPortValues('widget1');
      expect(widget1Ports.get('output1')).toBe('value1');
      expect(widget1Ports.get('output2')).toBe('value2');
      expect(widget1Ports.size).toBe(2);
    });
  });

  describe('Passthroughバインディング', () => {
    beforeEach(() => {
      const spec: ReactiveBindingSpec = {
        bindings: [
          {
            id: 'binding-1',
            source: 'widget1.output',
            target: 'widget2.input',
            mechanism: 'update',
            relationship: { type: 'passthrough' },
            updateMode: 'realtime',
          },
        ],
      };
      engine = createReactiveBindingEngineV4(spec);
    });

    test('値が伝播する', () => {
      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'new value');

      expect(engine.getPortValue('widget2.input')).toBe('new value');
    });

    test('伝播コールバックが呼ばれる', () => {
      const callback = vi.fn();
      engine.setOnPropagate(callback);

      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'new value');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            bindingId: 'binding-1',
            source: 'widget1.output',
            target: 'widget2.input',
            value: 'new value',
          }),
        ])
      );
    });
  });

  describe('JavaScriptバインディング', () => {
    beforeEach(() => {
      const spec: ReactiveBindingSpec = {
        bindings: [
          {
            id: 'binding-js',
            source: 'widget1.output',
            target: 'widget2.input',
            mechanism: 'update',
            relationship: {
              type: 'javascript',
              javascript: 'source * 2',
            },
            updateMode: 'realtime',
          },
        ],
      };
      engine = createReactiveBindingEngineV4(spec);
    });

    test('JavaScript式で変換される', () => {
      engine.initPort('widget1.output', 5);
      engine.updatePort('widget1.output', 10);

      expect(engine.getPortValue('widget2.input')).toBe(20);
    });
  });

  describe('Transformバインディング', () => {
    beforeEach(() => {
      const spec: ReactiveBindingSpec = {
        bindings: [
          {
            id: 'binding-transform',
            source: 'widget1.output',
            target: 'widget2.input',
            mechanism: 'update',
            relationship: {
              type: 'transform',
              transform: 'source.toUpperCase()',
            },
            updateMode: 'realtime',
          },
        ],
      };
      engine = createReactiveBindingEngineV4(spec);
    });

    test('Transform式で変換される', () => {
      engine.initPort('widget1.output', 'hello');
      engine.updatePort('widget1.output', 'world');

      expect(engine.getPortValue('widget2.input')).toBe('WORLD');
    });
  });

  describe('Validateバインディング', () => {
    beforeEach(() => {
      const spec: ReactiveBindingSpec = {
        bindings: [
          {
            id: 'binding-validate',
            source: 'widget1.output',
            target: 'widget2.input',
            mechanism: 'validate',
            relationship: {
              type: 'javascript',
              javascript: 'source > 0',
            },
            updateMode: 'realtime',
          },
        ],
      };
      engine = createReactiveBindingEngineV4(spec);
    });

    test('バリデーション失敗時にコールバックが呼ばれる', () => {
      const errorCallback = vi.fn();
      engine.setOnValidationError(errorCallback);

      engine.initPort('widget1.output', 0);
      engine.updatePort('widget1.output', -1);

      expect(errorCallback).toHaveBeenCalledWith(
        'widget2.input',
        expect.stringContaining('Validation failed')
      );
    });
  });

  describe('Debouncedバインディング', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      const spec: ReactiveBindingSpec = {
        bindings: [
          {
            id: 'binding-debounced',
            source: 'widget1.output',
            target: 'widget2.input',
            mechanism: 'update',
            relationship: { type: 'passthrough' },
            updateMode: 'debounced',
            debounceMs: 100,
          },
        ],
      };
      engine = createReactiveBindingEngineV4(spec);
    });

    test('Debounce時間後に伝播する', () => {
      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'value1');

      // 即座には伝播しない
      expect(engine.getPortValue('widget2.input')).toBeUndefined();

      // 100ms後に伝播
      vi.advanceTimersByTime(100);
      expect(engine.getPortValue('widget2.input')).toBe('value1');
    });

    test('連続更新ではDebounceされる', () => {
      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'value1');

      vi.advanceTimersByTime(50);
      engine.updatePort('widget1.output', 'value2');

      vi.advanceTimersByTime(50);
      expect(engine.getPortValue('widget2.input')).toBeUndefined();

      vi.advanceTimersByTime(50);
      expect(engine.getPortValue('widget2.input')).toBe('value2');
    });
  });

  describe('On_confirmバインディング', () => {
    beforeEach(() => {
      const spec: ReactiveBindingSpec = {
        bindings: [
          {
            id: 'binding-confirm',
            source: 'widget1.output',
            target: 'widget2.input',
            mechanism: 'update',
            relationship: { type: 'passthrough' },
            updateMode: 'on_confirm',
          },
        ],
      };
      engine = createReactiveBindingEngineV4(spec);
    });

    test('confirmBindingまで伝播しない', () => {
      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'new value');

      expect(engine.getPortValue('widget2.input')).toBeUndefined();
    });

    test('confirmBindingで伝播する', () => {
      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'new value');
      engine.confirmBinding('binding-confirm');

      expect(engine.getPortValue('widget2.input')).toBe('new value');
    });

    test('confirmAllBindingsで全て伝播する', () => {
      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'new value');
      engine.confirmAllBindings();

      expect(engine.getPortValue('widget2.input')).toBe('new value');
    });

    test('cancelBindingでキャンセルできる', () => {
      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'new value');
      engine.cancelBinding('binding-confirm');

      expect(engine.getPendingConfirmBindings()).not.toContain('binding-confirm');
    });
  });

  describe('チェーン伝播', () => {
    beforeEach(() => {
      const spec: ReactiveBindingSpec = {
        bindings: [
          {
            id: 'binding-1',
            source: 'widget1.output',
            target: 'widget2.input',
            mechanism: 'update',
            relationship: { type: 'passthrough' },
            updateMode: 'realtime',
          },
          {
            id: 'binding-2',
            source: 'widget2.input',
            target: 'widget3.input',
            mechanism: 'update',
            relationship: { type: 'passthrough' },
            updateMode: 'realtime',
          },
        ],
      };
      engine = createReactiveBindingEngineV4(spec);
    });

    test('チェーンで伝播する', () => {
      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'new value');

      expect(engine.getPortValue('widget2.input')).toBe('new value');
      expect(engine.getPortValue('widget3.input')).toBe('new value');
    });
  });

  describe('無限ループ防止', () => {
    beforeEach(() => {
      // 循環参照を持つバインディング
      const spec: ReactiveBindingSpec = {
        bindings: [
          {
            id: 'binding-1',
            source: 'widget1.output',
            target: 'widget2.input',
            mechanism: 'update',
            relationship: { type: 'passthrough' },
            updateMode: 'realtime',
          },
          {
            id: 'binding-2',
            source: 'widget2.input',
            target: 'widget1.output',
            mechanism: 'update',
            relationship: { type: 'passthrough' },
            updateMode: 'realtime',
          },
        ],
      };
      engine = createReactiveBindingEngineV4(spec, { maxPropagationDepth: 5 });
    });

    test('最大伝播深度で停止する', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      engine.initPort('widget1.output', 'initial');
      engine.updatePort('widget1.output', 'trigger');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max propagation depth exceeded')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('破棄', () => {
    test('dispose後は操作が無効', () => {
      const spec: ReactiveBindingSpec = { bindings: [] };
      engine = createReactiveBindingEngineV4(spec);

      engine.initPort('widget1.output', 'value');
      engine.dispose();

      engine.updatePort('widget1.output', 'new value');
      expect(engine.getPortValue('widget1.output')).toBeUndefined();
    });
  });
});
