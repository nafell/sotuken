/**
 * widgets.test.ts - Widget定義テスト
 *
 * @module widgets.test
 */

import { describe, expect, test } from 'bun:test';
import {
  WIDGET_DEFINITIONS,
  TradeoffBalanceDefinition,
  DependencyMappingDefinition,
  SwotAnalysisDefinition,
  getWidgetDefinition,
  getWidgetsByStage,
  getAllWidgetIds,
} from '../widgets';

describe('Widget Definitions', () => {
  test('TradeoffBalanceのPort定義が正しい', () => {
    const def = WIDGET_DEFINITIONS['tradeoff_balance'];

    expect(def).toBeDefined();
    expect(def.id).toBe('tradeoff_balance');
    expect(def.stage).toBe('converge');

    // 出力ポート確認
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'balance', dataType: 'number' })
    );
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'direction', dataType: 'string' })
    );
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'tiltAngle', dataType: 'number' })
    );

    // balance制約確認
    const balancePort = def.ports.outputs.find((p) => p.id === 'balance');
    expect(balancePort?.constraints).toContainEqual(
      expect.objectContaining({ type: 'range', min: -100, max: 100 })
    );

    // direction制約確認
    const directionPort = def.ports.outputs.find((p) => p.id === 'direction');
    expect(directionPort?.constraints).toContainEqual(
      expect.objectContaining({
        type: 'enum',
        values: ['left', 'right', 'balanced'],
      })
    );
  });

  test('DependencyMappingのPort定義が正しい', () => {
    const def = WIDGET_DEFINITIONS['dependency_mapping'];

    expect(def).toBeDefined();
    expect(def.id).toBe('dependency_mapping');
    expect(def.stage).toBe('organize');

    // 出力ポート確認
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'criticalPath', dataType: 'string[]' })
    );
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'hasLoop', dataType: 'boolean' })
    );
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'edges', dataType: 'object[]' })
    );
  });

  test('SwotAnalysisのPort定義が正しい', () => {
    const def = WIDGET_DEFINITIONS['swot_analysis'];

    expect(def).toBeDefined();
    expect(def.id).toBe('swot_analysis');
    expect(def.stage).toBe('organize');

    // 出力ポート確認
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'gaps', dataType: 'string[]' })
    );
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'placement', dataType: 'object' })
    );
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'isComplete', dataType: 'boolean' })
    );
  });

  test('全Widget定義が必須フィールドを持つ', () => {
    Object.values(WIDGET_DEFINITIONS).forEach((def) => {
      expect(def.id).toBeDefined();
      expect(def.id.length).toBeGreaterThan(0);

      expect(def.name).toBeDefined();
      expect(def.name.length).toBeGreaterThan(0);

      expect(def.description).toBeDefined();

      expect(['diverge', 'organize', 'converge', 'summary']).toContain(def.stage);

      expect(def.ports).toBeDefined();
      expect(def.ports.inputs).toBeDefined();
      expect(Array.isArray(def.ports.inputs)).toBe(true);
      expect(def.ports.outputs).toBeDefined();
      expect(Array.isArray(def.ports.outputs)).toBe(true);

      expect(def.metadata).toBeDefined();
      expect(typeof def.metadata.timing).toBe('number');
      expect(def.metadata.timing).toBeGreaterThanOrEqual(0);
      expect(def.metadata.timing).toBeLessThanOrEqual(1);
      expect(typeof def.metadata.versatility).toBe('number');
      expect(def.metadata.versatility).toBeGreaterThanOrEqual(0);
      expect(def.metadata.versatility).toBeLessThanOrEqual(1);
      expect(Array.isArray(def.metadata.bottleneck)).toBe(true);
    });
  });

  test('全PortDefinitionが正しい形式', () => {
    Object.values(WIDGET_DEFINITIONS).forEach((def) => {
      [...def.ports.inputs, ...def.ports.outputs].forEach((port) => {
        expect(port.id).toBeDefined();
        expect(port.id.length).toBeGreaterThan(0);

        expect(['in', 'out']).toContain(port.direction);

        expect([
          'string',
          'number',
          'boolean',
          'string[]',
          'number[]',
          'object',
          'object[]',
        ]).toContain(port.dataType);

        expect(port.description).toBeDefined();
      });
    });
  });

  test('入力ポートはdirection=in、出力ポートはdirection=out', () => {
    Object.values(WIDGET_DEFINITIONS).forEach((def) => {
      def.ports.inputs.forEach((port) => {
        expect(port.direction).toBe('in');
      });
      def.ports.outputs.forEach((port) => {
        expect(port.direction).toBe('out');
      });
    });
  });
});

describe('getWidgetDefinition', () => {
  test('存在するWidget IDで定義を取得できる', () => {
    const def = getWidgetDefinition('tradeoff_balance');
    expect(def).toBeDefined();
    expect(def?.id).toBe('tradeoff_balance');
  });

  test('存在しないWidget IDでundefinedを返す', () => {
    const def = getWidgetDefinition('nonexistent_widget');
    expect(def).toBeUndefined();
  });
});

describe('getWidgetsByStage', () => {
  test('divergeステージのWidgetを取得できる', () => {
    const widgets = getWidgetsByStage('diverge');
    expect(widgets.length).toBeGreaterThan(0);
    widgets.forEach((w) => {
      expect(w.stage).toBe('diverge');
    });
  });

  test('organizeステージのWidgetを取得できる', () => {
    const widgets = getWidgetsByStage('organize');
    expect(widgets.length).toBeGreaterThan(0);
    widgets.forEach((w) => {
      expect(w.stage).toBe('organize');
    });
  });

  test('convergeステージのWidgetを取得できる', () => {
    const widgets = getWidgetsByStage('converge');
    expect(widgets.length).toBeGreaterThan(0);
    widgets.forEach((w) => {
      expect(w.stage).toBe('converge');
    });
  });

  test('summaryステージのWidgetを取得できる', () => {
    const widgets = getWidgetsByStage('summary');
    expect(widgets.length).toBeGreaterThan(0);
    widgets.forEach((w) => {
      expect(w.stage).toBe('summary');
    });
  });
});

describe('getAllWidgetIds', () => {
  test('全Widget IDを取得できる', () => {
    const ids = getAllWidgetIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain('tradeoff_balance');
    expect(ids).toContain('dependency_mapping');
    expect(ids).toContain('swot_analysis');
  });

  test('レジストリのキーと一致する', () => {
    const ids = getAllWidgetIds();
    const registryKeys = Object.keys(WIDGET_DEFINITIONS);
    expect(ids.sort()).toEqual(registryKeys.sort());
  });
});

describe('Widget Definition Exports', () => {
  test('個別のWidget定義がエクスポートされている', () => {
    expect(TradeoffBalanceDefinition).toBeDefined();
    expect(TradeoffBalanceDefinition.id).toBe('tradeoff_balance');

    expect(DependencyMappingDefinition).toBeDefined();
    expect(DependencyMappingDefinition.id).toBe('dependency_mapping');

    expect(SwotAnalysisDefinition).toBeDefined();
    expect(SwotAnalysisDefinition.id).toBe('swot_analysis');
  });

  test('個別定義とレジストリ内の定義が同一', () => {
    expect(TradeoffBalanceDefinition).toBe(WIDGET_DEFINITIONS['tradeoff_balance']);
    expect(DependencyMappingDefinition).toBe(WIDGET_DEFINITIONS['dependency_mapping']);
    expect(SwotAnalysisDefinition).toBe(WIDGET_DEFINITIONS['swot_analysis']);
  });
});

describe('Widget Definition Constraints', () => {
  test('TradeoffBalanceのbalanceポートにrange制約がある', () => {
    const def = WIDGET_DEFINITIONS['tradeoff_balance'];
    const balancePort = def.ports.outputs.find((p) => p.id === 'balance');

    expect(balancePort).toBeDefined();
    expect(balancePort?.constraints).toBeDefined();

    const rangeConstraint = balancePort?.constraints?.find((c) => c.type === 'range');
    expect(rangeConstraint).toBeDefined();
    if (rangeConstraint && rangeConstraint.type === 'range') {
      expect(rangeConstraint.min).toBe(-100);
      expect(rangeConstraint.max).toBe(100);
    }
  });

  test('TradeoffBalanceのdirectionポートにenum制約がある', () => {
    const def = WIDGET_DEFINITIONS['tradeoff_balance'];
    const directionPort = def.ports.outputs.find((p) => p.id === 'direction');

    expect(directionPort).toBeDefined();
    expect(directionPort?.constraints).toBeDefined();

    const enumConstraint = directionPort?.constraints?.find((c) => c.type === 'enum');
    expect(enumConstraint).toBeDefined();
    if (enumConstraint && enumConstraint.type === 'enum') {
      expect(enumConstraint.values).toContain('left');
      expect(enumConstraint.values).toContain('right');
      expect(enumConstraint.values).toContain('balanced');
    }
  });
});
