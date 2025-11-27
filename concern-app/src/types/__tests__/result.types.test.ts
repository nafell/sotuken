/**
 * result.types.test.ts
 * Widget結果型定義のテスト
 */

import { describe, test, expect } from 'vitest';
import type {
  WidgetResult,
  StructuredData,
  SelectionData,
  RankingData,
  MappingData,
  TextData,
  UserInteraction,
} from '../result.types';

describe('UserInteraction型', () => {
  test('有効なUserInteractionを作成できる', () => {
    const interaction: UserInteraction = {
      timestamp: Date.now(),
      action: 'click',
      target: 'emotion_button_joy',
    };

    expect(interaction.action).toBe('click');
    expect(interaction.target).toBe('emotion_button_joy');
  });

  test('値を含むUserInteractionを作成できる', () => {
    const interaction: UserInteraction = {
      timestamp: Date.now(),
      action: 'adjust',
      target: 'intensity_slider',
      value: 0.75,
      duration: 2500,
    };

    expect(interaction.value).toBe(0.75);
    expect(interaction.duration).toBe(2500);
  });
});

describe('StructuredData型', () => {
  test('selection型のStructuredDataを作成できる', () => {
    const selectionData: SelectionData = {
      selected: '不安',
      options: ['喜び', '悲しみ', '怒り', '不安', '恐れ'],
      metadata: {
        intensity: 0.7,
      },
    };

    const structuredData: StructuredData = {
      type: 'selection',
      selection: selectionData,
    };

    expect(structuredData.type).toBe('selection');
    expect(structuredData.selection?.selected).toBe('不安');
    expect(structuredData.selection?.metadata?.intensity).toBe(0.7);
  });

  test('ranking型のStructuredDataを作成できる', () => {
    const rankingData: RankingData = {
      items: [
        {
          id: 'item_1',
          label: 'プロジェクトA',
          score: 95,
          metadata: {
            importance: 0.9,
            urgency: 0.8,
          },
        },
        {
          id: 'item_2',
          label: 'プロジェクトB',
          score: 70,
        },
      ],
    };

    const structuredData: StructuredData = {
      type: 'ranking',
      ranking: rankingData,
    };

    expect(structuredData.type).toBe('ranking');
    expect(structuredData.ranking?.items).toHaveLength(2);
    expect(structuredData.ranking?.items[0].score).toBe(95);
  });

  test('mapping型のStructuredDataを作成できる', () => {
    const mappingData: MappingData = {
      items: [
        {
          id: 'node_1',
          label: 'タスクA',
          position: { x: 100, y: 200 },
          category: '重要度高・緊急度高',
          relations: ['node_2', 'node_3'],
        },
        {
          id: 'node_2',
          label: 'タスクB',
          position: { x: 300, y: 150 },
          category: '重要度高・緊急度低',
        },
      ],
    };

    const structuredData: StructuredData = {
      type: 'mapping',
      mapping: mappingData,
    };

    expect(structuredData.type).toBe('mapping');
    expect(structuredData.mapping?.items[0].position).toEqual({ x: 100, y: 200 });
    expect(structuredData.mapping?.items[0].relations).toContain('node_2');
  });

  test('text型のStructuredDataを作成できる', () => {
    const textData: TextData = {
      content: 'これは要約文です。\n複数行のテキストを含むことができます。',
      structured: {
        sections: ['導入', '本文', '結論'],
        wordCount: 15,
      },
    };

    const structuredData: StructuredData = {
      type: 'text',
      text: textData,
    };

    expect(structuredData.type).toBe('text');
    expect(structuredData.text?.content).toContain('要約文');
    expect(structuredData.text?.structured?.wordCount).toBe(15);
  });

  test('composite型のStructuredDataを作成できる', () => {
    const structuredData: StructuredData = {
      type: 'composite',
      composite: {
        emotion: '不安',
        intensity: 0.7,
        concern: '転職先が決まらない',
        timestamp: Date.now(),
      },
    };

    expect(structuredData.type).toBe('composite');
    expect(structuredData.composite?.emotion).toBe('不安');
    expect(structuredData.composite?.intensity).toBe(0.7);
  });
});

describe('WidgetResult型', () => {
  test('必須フィールドを持つWidgetResultを作成できる', () => {
    const result: WidgetResult = {
      widgetId: 'widget_1',
      component: 'emotion_palette',
      timestamp: Date.now(),
      summary: '不安を70%の強さで感じています',
      data: {
        type: 'composite',
        composite: {
          emotion: '不安',
          intensity: 0.7,
        },
      },
    };

    expect(result.widgetId).toBe('widget_1');
    expect(result.component).toBe('emotion_palette');
    expect(result.summary).toBe('不安を70%の強さで感じています');
  });

  test('インタラクション記録を含むWidgetResultを作成できる', () => {
    const result: WidgetResult = {
      widgetId: 'widget_2',
      component: 'priority_slider_grid',
      timestamp: Date.now(),
      summary: '5つのプロジェクトに優先順位をつけました',
      data: {
        type: 'ranking',
        ranking: {
          items: [
            { id: '1', label: 'プロジェクトA', score: 95 },
            { id: '2', label: 'プロジェクトB', score: 70 },
          ],
        },
      },
      interactions: [
        {
          timestamp: Date.now() - 5000,
          action: 'adjust',
          target: 'slider_project_a',
          value: 95,
        },
        {
          timestamp: Date.now() - 3000,
          action: 'adjust',
          target: 'slider_project_b',
          value: 70,
        },
      ],
      metadata: {
        totalAdjustments: 12,
        completionTime: 45000,
      },
    };

    expect(result.interactions).toHaveLength(2);
    expect(result.metadata?.totalAdjustments).toBe(12);
  });

  test('selection型データを持つWidgetResultを作成できる', () => {
    const result: WidgetResult = {
      widgetId: 'emotion_widget',
      component: 'emotion_palette',
      timestamp: Date.now(),
      summary: '喜びの感情を選択しました',
      data: {
        type: 'selection',
        selection: {
          selected: '喜び',
          options: ['喜び', '悲しみ', '怒り', '不安'],
        },
      },
    };

    expect(result.data.type).toBe('selection');
    expect(result.data.selection?.selected).toBe('喜び');
  });

  test('mapping型データを持つWidgetResultを作成できる', () => {
    const result: WidgetResult = {
      widgetId: 'matrix_widget',
      component: 'matrix_placement',
      timestamp: Date.now(),
      summary: 'タスクを4象限に配置しました',
      data: {
        type: 'mapping',
        mapping: {
          items: [
            {
              id: 'task_1',
              label: 'タスクA',
              position: { x: 80, y: 80 },
              category: '重要・緊急',
            },
          ],
        },
      },
    };

    expect(result.data.type).toBe('mapping');
    expect(result.data.mapping?.items[0].category).toBe('重要・緊急');
  });
});
