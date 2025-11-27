/**
 * WidgetDefinition型テスト
 *
 * @module WidgetDefinition.test
 */

import { describe, expect, test } from 'bun:test';
import {
  type ReactivePortDefinition,
  type WidgetDefinition,
  type PortConstraint,
  type ErrorPortValue,
  type CompletedPortValue,
  RESERVED_PORTS,
  parsePortKey,
  createPortKey,
  isReservedPort,
  isErrorPortValue,
  isCompletedPortValue,
  DEFAULT_ERROR_PORT_VALUE,
  DEFAULT_COMPLETED_PORT_VALUE,
} from '../WidgetDefinition';

describe('WidgetDefinition Types', () => {
  test('ReactivePortDefinition型が正しく定義される', () => {
    const port: ReactivePortDefinition = {
      id: 'balance',
      direction: 'out',
      dataType: 'number',
      description: 'バランス値',
      constraints: [{ type: 'range', min: -1, max: 1 }],
    };

    expect(port.id).toBe('balance');
    expect(port.direction).toBe('out');
    expect(port.dataType).toBe('number');
    expect(port.constraints).toHaveLength(1);
  });

  test('WidgetDefinition型が正しく定義される', () => {
    const def: WidgetDefinition = {
      id: 'tradeoff_balance',
      name: 'トレードオフ天秤',
      description: '複数の選択肢を重み付けし、バランスを視覚的に表示',
      stage: 'converge',
      ports: {
        inputs: [],
        outputs: [
          {
            id: 'balance',
            direction: 'out',
            dataType: 'number',
            description: 'バランススコア',
          },
        ],
      },
      metadata: {
        timing: 0.6,
        versatility: 0.7,
        bottleneck: ['comparison', 'decision'],
      },
    };

    expect(def.id).toBe('tradeoff_balance');
    expect(def.stage).toBe('converge');
    expect(def.ports.outputs).toHaveLength(1);
    expect(def.metadata.timing).toBe(0.6);
  });

  test('全ステージ型が有効', () => {
    const stages: WidgetDefinition['stage'][] = ['diverge', 'organize', 'converge', 'summary'];

    stages.forEach((stage) => {
      const def: WidgetDefinition = {
        id: `test_${stage}`,
        name: 'テスト',
        description: 'テスト用Widget',
        stage,
        ports: { inputs: [], outputs: [] },
        metadata: { timing: 0.5, versatility: 0.5, bottleneck: [] },
      };
      expect(def.stage).toBe(stage);
    });
  });

  test('全PortDataTypeが有効', () => {
    const dataTypes: ReactivePortDefinition['dataType'][] = [
      'string',
      'number',
      'boolean',
      'string[]',
      'number[]',
      'object',
      'object[]',
    ];

    dataTypes.forEach((dataType) => {
      const port: ReactivePortDefinition = {
        id: 'test',
        direction: 'out',
        dataType,
        description: 'テスト',
      };
      expect(port.dataType).toBe(dataType);
    });
  });

  test('全PortConstraint型が有効', () => {
    const constraints: PortConstraint[] = [
      { type: 'range', min: 0, max: 100 },
      { type: 'enum', values: ['a', 'b', 'c'] },
      { type: 'array', minLength: 1, maxLength: 10 },
      { type: 'pattern', regex: '^[a-z]+$' },
    ];

    constraints.forEach((constraint) => {
      expect(constraint.type).toBeDefined();
    });
  });
});

describe('RESERVED_PORTS', () => {
  test('予約PortIDが定義されている', () => {
    expect(RESERVED_PORTS.ERROR).toBe('_error');
    expect(RESERVED_PORTS.COMPLETED).toBe('_completed');
  });
});

describe('Port Key Utilities', () => {
  test('parsePortKeyで正しくパースされる', () => {
    const result = parsePortKey('widgetA.balance');
    expect(result.widgetId).toBe('widgetA');
    expect(result.portId).toBe('balance');
  });

  test('parsePortKeyで不正な形式はエラー', () => {
    expect(() => parsePortKey('invalid')).toThrow();
    expect(() => parsePortKey('')).toThrow();
  });

  test('createPortKeyで正しく生成される', () => {
    const key = createPortKey('widgetA', 'balance');
    expect(key).toBe('widgetA.balance');
  });

  test('isReservedPortで予約ポートを判定', () => {
    expect(isReservedPort('_error')).toBe(true);
    expect(isReservedPort('_completed')).toBe(true);
    expect(isReservedPort('balance')).toBe(false);
    expect(isReservedPort('output')).toBe(false);
  });
});

describe('Port Value Type Guards', () => {
  test('isErrorPortValueで正しく判定', () => {
    expect(isErrorPortValue({ hasError: true, messages: ['error'] })).toBe(true);
    expect(isErrorPortValue({ hasError: false, messages: [] })).toBe(true);
    expect(isErrorPortValue({ hasError: true })).toBe(false);
    expect(isErrorPortValue({ messages: [] })).toBe(false);
    expect(isErrorPortValue(null)).toBe(false);
    expect(isErrorPortValue('string')).toBe(false);
  });

  test('isCompletedPortValueで正しく判定', () => {
    expect(isCompletedPortValue({ isCompleted: true })).toBe(true);
    expect(isCompletedPortValue({ isCompleted: false, requiredFields: ['field1'] })).toBe(true);
    expect(isCompletedPortValue({ completed: true })).toBe(false);
    expect(isCompletedPortValue(null)).toBe(false);
    expect(isCompletedPortValue(123)).toBe(false);
  });
});

describe('Default Values', () => {
  test('DEFAULT_ERROR_PORT_VALUEが正しい初期値', () => {
    const value: ErrorPortValue = DEFAULT_ERROR_PORT_VALUE;
    expect(value.hasError).toBe(false);
    expect(value.messages).toEqual([]);
  });

  test('DEFAULT_COMPLETED_PORT_VALUEが正しい初期値', () => {
    const value: CompletedPortValue = DEFAULT_COMPLETED_PORT_VALUE;
    expect(value.isCompleted).toBe(false);
    expect(value.requiredFields).toEqual([]);
  });
});

describe('Type Compatibility', () => {
  test('WidgetDefinitionがconfigSchemaをオプショナルに持てる', () => {
    const withSchema: WidgetDefinition = {
      id: 'test',
      name: 'Test',
      description: 'Test widget',
      stage: 'diverge',
      ports: { inputs: [], outputs: [] },
      configSchema: {
        type: 'object',
        properties: {
          label: { type: 'string' },
        },
      },
      metadata: { timing: 0.5, versatility: 0.5, bottleneck: [] },
    };

    const withoutSchema: WidgetDefinition = {
      id: 'test2',
      name: 'Test 2',
      description: 'Test widget without schema',
      stage: 'diverge',
      ports: { inputs: [], outputs: [] },
      metadata: { timing: 0.5, versatility: 0.5, bottleneck: [] },
    };

    expect(withSchema.configSchema).toBeDefined();
    expect(withoutSchema.configSchema).toBeUndefined();
  });

  test('ReactivePortDefinitionがdefaultValueをオプショナルに持てる', () => {
    const withDefault: ReactivePortDefinition = {
      id: 'test',
      direction: 'out',
      dataType: 'number',
      description: 'Test port',
      defaultValue: 0,
    };

    const withoutDefault: ReactivePortDefinition = {
      id: 'test2',
      direction: 'in',
      dataType: 'string',
      description: 'Test port 2',
    };

    expect(withDefault.defaultValue).toBe(0);
    expect(withoutDefault.defaultValue).toBeUndefined();
  });
});
