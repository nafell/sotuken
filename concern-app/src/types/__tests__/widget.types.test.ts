/**
 * widget.types.test.ts
 *
 * BaseWidgetPropsの型チェックテスト
 */

import { describe, expect, test } from 'vitest';
import type {
  BaseWidgetProps,
  WidgetSpecObject,
  PortChangeCallback,
  PortValueGetter,
} from '../widget.types';

describe('Widget Types', () => {
  // ダミーのWidgetSpecObject
  const mockSpec: WidgetSpecObject = {
    id: 'test-widget',
    component: 'brainstorm_cards',
    position: 0,
    config: {},
    metadata: {
      timing: 0.5,
      versatility: 0.5,
      bottleneck: [],
    },
  };

  test('BaseWidgetPropsが後方互換性を維持', () => {
    // 既存のpropsのみでも型エラーにならない
    const legacyProps: BaseWidgetProps = {
      spec: mockSpec,
      onUpdate: (id, data) => {
        console.log(id, data);
      },
      onComplete: (id) => {
        console.log(id);
      },
    };
    expect(legacyProps).toBeDefined();
    expect(legacyProps.spec.id).toBe('test-widget');
  });

  test('BaseWidgetPropsが新しいreactiveプロパティを持てる', () => {
    const reactiveProps: BaseWidgetProps = {
      spec: mockSpec,
      onPortChange: (widgetId, portId, value) => {
        console.log(widgetId, portId, value);
      },
      getPortValue: (_portKey) => null,
      initialPortValues: { balance: 0 },
    };

    expect(reactiveProps.onPortChange).toBeDefined();
    expect(reactiveProps.getPortValue).toBeDefined();
    expect(reactiveProps.initialPortValues).toBeDefined();
  });

  test('既存と新規のpropsを同時に使用できる', () => {
    const fullProps: BaseWidgetProps = {
      spec: mockSpec,
      // 既存
      onComplete: (_id) => { },
      onUpdate: (_id, _data) => { },
      // 新規
      onPortChange: (_widgetId, _portId, _value) => { },
      getPortValue: (_portKey) => undefined,
      initialPortValues: { _completed: { isCompleted: false } },
    };

    expect(fullProps.onComplete).toBeDefined();
    expect(fullProps.onPortChange).toBeDefined();
  });

  test('全てのpropsがオプショナル（specを除く）', () => {
    const minimalProps: BaseWidgetProps = {
      spec: mockSpec,
    };
    expect(minimalProps.onComplete).toBeUndefined();
    expect(minimalProps.onUpdate).toBeUndefined();
    expect(minimalProps.onPortChange).toBeUndefined();
    expect(minimalProps.getPortValue).toBeUndefined();
    expect(minimalProps.initialPortValues).toBeUndefined();
  });
});

describe('PortChangeCallback', () => {
  test('正しい引数で呼び出せる', () => {
    const callback: PortChangeCallback = (widgetId, portId, value) => {
      expect(widgetId).toBe('test');
      expect(portId).toBe('balance');
      expect(value).toBe(0.5);
    };

    callback('test', 'balance', 0.5);
  });

  test('様々な型の値を渡せる', () => {
    const values: unknown[] = [];
    const callback: PortChangeCallback = (_widgetId, _portId, value) => {
      values.push(value);
    };

    callback('w1', 'a', 'string');
    callback('w1', 'b', 123);
    callback('w1', 'c', true);
    callback('w1', 'd', { foo: 'bar' });
    callback('w1', 'e', [1, 2, 3]);

    expect(values).toHaveLength(5);
  });
});

describe('PortValueGetter', () => {
  test('ポートキーから値を取得できる', () => {
    const values: Record<string, unknown> = {
      'widget1.balance': 0.5,
      'widget2.direction': 'left',
    };

    const getter: PortValueGetter = (portKey) => values[portKey];

    expect(getter('widget1.balance')).toBe(0.5);
    expect(getter('widget2.direction')).toBe('left');
    expect(getter('nonexistent.port')).toBeUndefined();
  });
});
