/**
 * ui-spec.types.test.ts
 * UISpec/OODM/DpG型定義のテスト
 */

import { describe, test, expect } from 'vitest';
import type {
  UISpec,
  WidgetSpec,
  OODM,
  Entity,
  Attribute,
  DependencyGraphSpec,
  DependencySpec,
  WidgetComponentType,
  StageType,
} from '../ui-spec.types';

describe('OODM型', () => {
  test('有効なOODMを作成できる', () => {
    const oodm: OODM = {
      version: '3.0',
      entities: [],
      metadata: {
        created: Date.now(),
      },
    };

    expect(oodm.version).toBe('3.0');
    expect(oodm.entities).toEqual([]);
  });

  test('有効なEntityを作成できる', () => {
    const entity: Entity = {
      id: 'entity_1',
      type: 'concern',
      attributes: [],
    };

    expect(entity.id).toBe('entity_1');
    expect(entity.type).toBe('concern');
  });

  test('有効なAttributeを作成できる', () => {
    const attribute: Attribute = {
      name: 'title',
      value: '転職の悩み',
      type: 'sval',
    };

    expect(attribute.name).toBe('title');
    expect(attribute.value).toBe('転職の悩み');
    expect(attribute.type).toBe('sval');
  });

  test('制約付きAttributeを作成できる', () => {
    const attribute: Attribute = {
      name: 'priority',
      value: 5,
      type: 'sval',
      constraints: [
        {
          type: 'min',
          value: 1,
          message: '優先度は1以上である必要があります',
        },
        {
          type: 'max',
          value: 10,
          message: '優先度は10以下である必要があります',
        },
      ],
    };

    expect(attribute.constraints).toHaveLength(2);
    expect(attribute.constraints?.[0].type).toBe('min');
  });
});

describe('DependencyGraphSpec型', () => {
  test('有効なDependencyGraphSpecを作成できる', () => {
    const dpg: DependencyGraphSpec = {
      dependencies: [],
      metadata: {
        version: '3.0',
        generatedAt: Date.now(),
      },
    };

    expect(dpg.dependencies).toEqual([]);
    expect(dpg.metadata?.version).toBe('3.0');
  });

  test('有効なDependencySpecを作成できる', () => {
    const dependency: DependencySpec = {
      source: 'widget1.output',
      target: 'widget2.input',
      mechanism: 'update',
      relationship: {
        type: 'javascript',
        javascript: 'return source.value * 2;',
      },
      updateMode: 'realtime',
    };

    expect(dependency.source).toBe('widget1.output');
    expect(dependency.target).toBe('widget2.input');
    expect(dependency.mechanism).toBe('update');
    expect(dependency.updateMode).toBe('realtime');
  });

  test('Transform関数を使用したDependencySpecを作成できる', () => {
    const dependency: DependencySpec = {
      source: 'slider.values',
      target: 'ranking.items',
      mechanism: 'update',
      relationship: {
        type: 'transform',
        transform: 'calculate_ranking',
      },
      updateMode: 'debounced',
    };

    expect(dependency.relationship.type).toBe('transform');
    expect(dependency.relationship.transform).toBe('calculate_ranking');
    expect(dependency.updateMode).toBe('debounced');
  });
});

describe('WidgetSpec型', () => {
  test('有効なWidgetSpecを作成できる', () => {
    const spec: WidgetSpec = {
      id: 'test_widget_1',
      component: 'emotion_palette',
      position: 0,
      config: {
        prompt: 'あなたの気持ちを選んでください',
      },
      metadata: {
        timing: 0.1,
        versatility: 0.8,
        bottleneck: ['感情的ブロック'],
      },
    };

    expect(spec.id).toBe('test_widget_1');
    expect(spec.component).toBe('emotion_palette');
    expect(spec.metadata.bottleneck).toContain('感情的ブロック');
  });

  test('ReactiveBindingを含むWidgetSpecを作成できる', () => {
    const spec: WidgetSpec = {
      id: 'test_widget_2',
      component: 'matrix_placement',
      position: 1,
      config: {
        axes: ['重要度', '緊急度'],
      },
      reactiveBindings: [
        {
          source: 'widget1.selectedEmotion',
          target: 'widget2.config.xAxisLabel',
          mechanism: 'update',
          relationship: {
            type: 'javascript',
            javascript: 'return source + "への対処";',
          },
          updateMode: 'realtime',
        },
      ],
      metadata: {
        timing: 0.7,
        versatility: 0.6,
        bottleneck: ['選択肢が多すぎる'],
      },
    };

    expect(spec.reactiveBindings).toHaveLength(1);
    expect(spec.reactiveBindings?.[0].source).toBe('widget1.selectedEmotion');
  });

  test('全12種のWidgetComponentTypeが有効', () => {
    const types: WidgetComponentType[] = [
      // diverge
      'brainstorm_cards',
      'question_card_chain',
      'emotion_palette',
      // organize
      'card_sorting',
      'dependency_mapping',
      'swot_analysis',
      'mind_map',
      // converge
      'matrix_placement',
      'tradeoff_balance',
      'priority_slider_grid',
      'timeline_slider',
      // summary
      'structured_summary',
    ];

    expect(types).toHaveLength(12);
    types.forEach((type) => {
      const spec: WidgetSpec = {
        id: `test_${type}`,
        component: type,
        position: 0,
        config: {},
        metadata: {
          timing: 0.5,
          versatility: 0.5,
          bottleneck: [],
        },
      };
      expect(spec.component).toBe(type);
    });
  });
});

describe('UISpec型', () => {
  test('完全なUISpecを作成できる', () => {
    const uiSpec: UISpec = {
      sessionId: 'session_123',
      stage: 'diverge',
      oodm: {
        version: '3.0',
        entities: [
          {
            id: 'concern_1',
            type: 'concern',
            attributes: [
              {
                name: 'title',
                value: '転職の悩み',
                type: 'sval',
              },
            ],
          },
        ],
      },
      dpg: {
        dependencies: [],
      },
      widgets: [
        {
          id: 'widget_1',
          component: 'emotion_palette',
          position: 0,
          config: {
            prompt: 'あなたの気持ちは？',
          },
          metadata: {
            timing: 0.1,
            versatility: 0.8,
            bottleneck: ['感情的ブロック'],
          },
        },
      ],
      layout: {
        type: 'sequential',
      },
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'gemini-2.5-mini',
        tokenCount: 1500,
        version: '3.0',
      },
    };

    expect(uiSpec.sessionId).toBe('session_123');
    expect(uiSpec.stage).toBe('diverge');
    expect(uiSpec.widgets).toHaveLength(1);
    expect(uiSpec.oodm.entities).toHaveLength(1);
  });

  test('全ステージタイプが有効', () => {
    const stages: StageType[] = ['diverge', 'organize', 'converge', 'summary'];

    stages.forEach((stage) => {
      const uiSpec: UISpec = {
        sessionId: 'test',
        stage: stage,
        oodm: { version: '3.0', entities: [] },
        dpg: { dependencies: [] },
        widgets: [],
        layout: { type: 'sequential' },
        metadata: {
          generatedAt: Date.now(),
          llmModel: 'test',
          tokenCount: 100,
          version: '3.0',
        },
      };
      expect(uiSpec.stage).toBe(stage);
    });
  });
});
