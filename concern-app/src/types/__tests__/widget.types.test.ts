/**
 * widget.types.test.ts
 * Widget実装層型定義のテスト
 */

import { describe, test, expect } from 'vitest';
import type {
  WidgetSpecObject,
  OODMObject,
  UISpecObject,
  DataBindingObject,
  ReactiveBindingObject,
} from '../widget.types';

describe('WidgetSpecObject型', () => {
  test('有効なWidgetSpecObjectを作成できる', () => {
    const specObject: WidgetSpecObject = {
      id: 'widget_1',
      component: 'emotion_palette',
      position: 0,
      config: {
        prompt: 'あなたの気持ちを教えてください',
        options: ['喜び', '悲しみ', '怒り', '不安'],
      },
      metadata: {
        timing: 0.1,
        versatility: 0.8,
        bottleneck: ['感情的ブロック'],
      },
    };

    expect(specObject.id).toBe('widget_1');
    expect(specObject.component).toBe('emotion_palette');
    expect(specObject.config.options).toHaveLength(4);
  });

  test('DataBindingObjectを含むWidgetSpecObjectを作成できる', () => {
    const specObject: WidgetSpecObject = {
      id: 'widget_2',
      component: 'matrix_placement',
      position: 1,
      config: {},
      inputs: [
        {
          name: 'items',
          type: 'object[]',
          source: 'widget_1.output',
          required: true,
        },
      ],
      outputs: [
        {
          name: 'placements',
          type: 'object[]',
        },
      ],
      metadata: {
        timing: 0.5,
        versatility: 0.6,
        bottleneck: [],
      },
    };

    expect(specObject.inputs).toHaveLength(1);
    expect(specObject.outputs).toHaveLength(1);
    expect(specObject.inputs?.[0].source).toBe('widget_1.output');
  });

  test('ReactiveBindingObjectを含むWidgetSpecObjectを作成できる', () => {
    const reactiveBinding: ReactiveBindingObject = {
      source: 'slider.values',
      target: 'ranking.items',
      mechanism: 'update',
      relationship: {
        type: 'transform',
        transform: 'calculate_ranking',
      },
      updateMode: 'debounced',
    };

    const specObject: WidgetSpecObject = {
      id: 'widget_3',
      component: 'priority_slider_grid',
      position: 2,
      config: {},
      reactiveBindings: [reactiveBinding],
      metadata: {
        timing: 0.7,
        versatility: 0.5,
        bottleneck: [],
      },
    };

    expect(specObject.reactiveBindings).toHaveLength(1);
    expect(specObject.reactiveBindings?.[0].updateMode).toBe('debounced');
  });
});

describe('OODMObject型', () => {
  test('有効なOODMObjectを作成できる', () => {
    const oodmObject: OODMObject = {
      version: '3.0',
      entities: [
        {
          id: 'entity_1',
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
      metadata: {
        parsedAt: Date.now(),
      },
    };

    expect(oodmObject.version).toBe('3.0');
    expect(oodmObject.entities).toHaveLength(1);
  });
});

describe('UISpecObject型', () => {
  test('有効なUISpecObjectを作成できる', () => {
    const uiSpecObject: UISpecObject = {
      sessionId: 'session_456',
      stage: 'converge',
      oodm: {
        version: '3.0',
        entities: [],
      },
      dpg: null, // DependencyGraphインスタンス（別途実装）
      widgets: [
        {
          id: 'widget_1',
          component: 'matrix_placement',
          position: 0,
          config: {
            axes: ['重要度', '緊急度'],
          },
          metadata: {
            timing: 0.5,
            versatility: 0.6,
            bottleneck: [],
          },
        },
      ],
      layout: {
        type: 'sequential',
      },
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'gemini-2.5-mini',
        tokenCount: 1800,
        version: '3.0',
      },
    };

    expect(uiSpecObject.sessionId).toBe('session_456');
    expect(uiSpecObject.stage).toBe('converge');
    expect(uiSpecObject.widgets).toHaveLength(1);
  });
});

describe('DataBindingObject型', () => {
  test('必須フィールドのみのDataBindingObjectを作成できる', () => {
    const binding: DataBindingObject = {
      name: 'input1',
      type: 'string',
    };

    expect(binding.name).toBe('input1');
    expect(binding.type).toBe('string');
  });

  test('全フィールドを持つDataBindingObjectを作成できる', () => {
    const binding: DataBindingObject = {
      name: 'concernList',
      type: 'object[]',
      source: 'brainstorm.cards',
      required: true,
      defaultValue: [],
      description: 'ブレインストームで収集した懸念事項のリスト',
    };

    expect(binding.name).toBe('concernList');
    expect(binding.required).toBe(true);
    expect(binding.defaultValue).toEqual([]);
  });
});
