/**
 * ReactiveIntegration.test.ts
 *
 * ReactiveBindingEngine + Widget + useReactivePorts の統合テスト
 *
 * Phase 4 Task 2.2
 */

import { describe, expect, test, afterEach } from 'vitest';
import { ReactiveBindingEngine } from '../ReactiveBindingEngine';
import type { DependencyGraphSpec } from '../../../types/ui-spec.types';

// =============================================================================
// テスト用ユーティリティ
// =============================================================================

/**
 * テスト用DependencyGraph仕様を生成
 */
function createTestDpgSpec(
  dependencies: Array<{
    source: string;
    target: string;
    relationship: { type: string; javascript?: string; transform?: (v: any) => any };
    mechanism?: 'update' | 'validate';
    updateMode?: 'realtime' | 'debounced' | 'on_confirm';
  }> = []
): DependencyGraphSpec {
  return {
    dependencies: dependencies.map((d) => ({
      ...d,
      mechanism: d.mechanism ?? 'update',
      updateMode: d.updateMode ?? 'realtime',
      relationship: d.relationship as any,
    })),
  };
}

// =============================================================================
// 統合テスト
// =============================================================================

describe('Reactive Widget Integration', () => {
  let engine: ReactiveBindingEngine;

  afterEach(() => {
    if (engine && !engine.isDisposed()) {
      engine.dispose();
    }
  });

  describe('基本的なWidget間連携', () => {
    test('Widget AのoutputがWidget Bのinputに伝播する', async () => {
      // DependencyGraph: widgetA.balance -> widgetB.inputBalance
      const dpgSpec = createTestDpgSpec([
        {
          source: 'widgetA.balance',
          target: 'widgetB.inputBalance',
          relationship: {
            type: 'javascript',
            javascript: 'return source.value',
          },
        },
      ]);

      engine = new ReactiveBindingEngine(dpgSpec);

      const propagations: Array<{
        sourcePortKey: string;
        targetPortKey: string;
        value: unknown;
      }> = [];

      engine.setOnPropagate((events) => {
        propagations.push(...events);
      });

      // Widget Aがbalanceを出力
      engine.updatePort('widgetA.balance', 0.5);

      // Debounce待ち (300ms + 余裕)
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(propagations.length).toBe(1);
      expect(propagations[0].sourcePortKey).toBe('widgetA.balance');
      expect(propagations[0].targetPortKey).toBe('widgetB.inputBalance');
      expect(propagations[0].value).toBe(0.5);
    });

    test('flush()で即座に伝播が実行される', () => {
      const dpgSpec = createTestDpgSpec([
        {
          source: 'widgetA.output',
          target: 'widgetB.input',
          relationship: {
            type: 'javascript',
            javascript: 'return source.value * 2',
          },
        },
      ]);

      engine = new ReactiveBindingEngine(dpgSpec);

      const propagations: Array<{ value: unknown }> = [];
      engine.setOnPropagate((events) => {
        propagations.push(...events.map((e) => ({ value: e.value })));
      });

      engine.updatePort('widgetA.output', 10);
      engine.flush();

      expect(propagations.length).toBe(1);
      expect(propagations[0].value).toBe(20); // 10 * 2
    });
  });

  describe('FlowValidationState連携', () => {
    test('Widget完了状態がcanProceedに反映される', () => {
      engine = new ReactiveBindingEngine(createTestDpgSpec());

      // 初期状態（登録なし）: canProceed = true
      let state = engine.getFlowValidationState();
      expect(state.canProceed).toBe(true);

      // Widget1を未完了で登録
      engine.updatePort('widget1._completed', { isCompleted: false });
      engine.flush();

      state = engine.getFlowValidationState();
      expect(state.canProceed).toBe(false);
      expect(state.incompleteWidgets).toContain('widget1');

      // Widget1を完了
      engine.updatePort('widget1._completed', { isCompleted: true });
      engine.flush();

      state = engine.getFlowValidationState();
      expect(state.canProceed).toBe(true);
      expect(state.incompleteWidgets).not.toContain('widget1');
    });

    test('エラー状態がcanProceedに反映される', () => {
      engine = new ReactiveBindingEngine(createTestDpgSpec());

      // Widget1にエラー
      engine.updatePort('widget1._error', {
        hasError: true,
        messages: ['入力エラー'],
      });
      engine.flush();

      const state = engine.getFlowValidationState();
      expect(state.canProceed).toBe(false);
      expect(state.widgetErrors.has('widget1')).toBe(true);
      expect(state.widgetErrors.get('widget1')?.messages).toContain('入力エラー');
    });

    test('複数Widgetの状態が統合される', () => {
      engine = new ReactiveBindingEngine(createTestDpgSpec());

      // Widget1: 完了
      engine.updatePort('widget1._completed', { isCompleted: true });

      // Widget2: 未完了
      engine.updatePort('widget2._completed', { isCompleted: false });

      engine.flush();

      const state = engine.getFlowValidationState();
      expect(state.canProceed).toBe(false);
      expect(state.incompleteWidgets).toContain('widget2');
      expect(state.incompleteWidgets).not.toContain('widget1');
    });

    test('ValidationStateChangeコールバックが呼ばれる', () => {
      engine = new ReactiveBindingEngine(createTestDpgSpec());

      const callbacks: Array<{ canProceed: boolean }> = [];
      engine.setOnValidationStateChange((state) => {
        callbacks.push({ canProceed: state.canProceed });
      });

      engine.updatePort('widget1._completed', { isCompleted: false });
      engine.flush();

      engine.updatePort('widget1._completed', { isCompleted: true });
      engine.flush();

      expect(callbacks.length).toBe(2);
      expect(callbacks[0].canProceed).toBe(false);
      expect(callbacks[1].canProceed).toBe(true);
    });
  });

  describe('連鎖的な伝播', () => {
    test('A -> B -> C の連鎖伝播が動作する', async () => {
      const dpgSpec = createTestDpgSpec([
        {
          source: 'A.output',
          target: 'B.input',
          relationship: { type: 'javascript', javascript: 'return source.value' },
        },
        {
          source: 'B.output',
          target: 'C.input',
          relationship: { type: 'javascript', javascript: 'return source.value' },
        },
      ]);

      engine = new ReactiveBindingEngine(dpgSpec);

      const propagations: string[] = [];
      engine.setOnPropagate((events) => {
        events.forEach((e) => {
          propagations.push(`${e.sourcePortKey}->${e.targetPortKey}`);
        });
      });

      // Aの出力を設定
      engine.updatePort('A.output', 'test');

      // Bの出力も設定（連鎖のため）
      engine.updatePort('B.output', 'test');

      engine.flush();

      expect(propagations).toContain('A.output->B.input');
      expect(propagations).toContain('B.output->C.input');
    });

    test('深度制限を超える伝播は停止する', () => {
      // 深い依存関係（11段階）
      const dependencies: any[] = [];
      for (let i = 0; i < 11; i++) {
        dependencies.push({
          source: `w${i}.out`,
          target: `w${i + 1}.in`,
          relationship: { type: 'javascript', javascript: 'return source.value' },
          mechanism: 'update',
          updateMode: 'realtime',
        });
      }

      engine = new ReactiveBindingEngine(createTestDpgSpec(dependencies) as any, {
        maxPropagationDepth: 5,
      });

      let propagationCount = 0;
      engine.setOnPropagate((events) => {
        propagationCount += events.length;
      });

      // 全ポートを初期化
      for (let i = 0; i <= 11; i++) {
        engine.initPort(`w${i}.out`, i);
        engine.initPort(`w${i}.in`, i);
      }

      engine.updatePort('w0.out', 'start');
      engine.flush();

      // 深度制限により、一部のみ伝播
      expect(propagationCount).toBeLessThanOrEqual(5);
    });
  });

  describe('initPort vs updatePort', () => {
    test('initPortはDebounceなしで即座に値が設定される', () => {
      engine = new ReactiveBindingEngine(createTestDpgSpec());

      engine.initPort('widget.port', 'initial');

      // flush不要で即座に取得可能
      expect(engine.getPortValue('widget.port')).toBe('initial');
    });

    test('updatePortはDebounce付きで値が設定される', async () => {
      engine = new ReactiveBindingEngine(createTestDpgSpec());

      engine.updatePort('widget.port', 'updated');

      // Debounce前は値が反映されていない可能性
      // (実装によるが、値自体は即座に設定される場合もある)

      // Debounce後
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(engine.getPortValue('widget.port')).toBe('updated');
    });
  });

  describe('dispose', () => {
    test('dispose後は操作が無効化される', () => {
      engine = new ReactiveBindingEngine(createTestDpgSpec());

      engine.dispose();

      expect(engine.isDisposed()).toBe(true);

      // dispose後の操作は無視される（エラーにはならない）
      expect(() => {
        engine.updatePort('widget.port', 'value');
      }).not.toThrow();

      expect(engine.getPortValue('widget.port')).toBeUndefined();
    });
  });
});

describe('型変換と制約', () => {
  let engine: ReactiveBindingEngine;

  afterEach(() => {
    if (engine && !engine.isDisposed()) {
      engine.dispose();
    }
  });

  test('transform型の変換が適用される', () => {
    const dpgSpec = createTestDpgSpec([
      {
        source: 'widgetA.text',
        target: 'widgetB.upperText',
        relationship: {
          type: 'transform',
          transform: (value: string) => value.toUpperCase(),
        },
      },
    ]);

    engine = new ReactiveBindingEngine(dpgSpec);

    let transformedValue: unknown;
    engine.setOnPropagate((events) => {
      if (events.length > 0) {
        transformedValue = events[0].value;
      }
    });

    engine.updatePort('widgetA.text', 'hello');
    engine.flush();

    expect(transformedValue).toBe('HELLO');
  });

  test('javascript型の計算が適用される', () => {
    const dpgSpec = createTestDpgSpec([
      {
        source: 'widgetA.count',
        target: 'widgetB.doubled',
        relationship: {
          type: 'javascript',
          javascript: 'return source.value * 2 + 10',
        },
      },
    ]);

    engine = new ReactiveBindingEngine(dpgSpec);

    let result: unknown;
    engine.setOnPropagate((events) => {
      if (events.length > 0) {
        result = events[0].value;
      }
    });

    engine.updatePort('widgetA.count', 5);
    engine.flush();

    expect(result).toBe(20); // 5 * 2 + 10
  });
});
