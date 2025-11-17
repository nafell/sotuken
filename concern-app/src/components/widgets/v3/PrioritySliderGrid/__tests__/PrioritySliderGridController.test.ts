/**
 * PrioritySliderGridController.test.ts
 * PrioritySliderGridControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { PrioritySliderGridController } from '../PrioritySliderGridController';

describe('PrioritySliderGridController', () => {
  let controller: PrioritySliderGridController;

  beforeEach(() => {
    controller = new PrioritySliderGridController();
  });

  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => {
      const state = controller.getState();

      expect(state.items).toEqual([]);
      expect(state.maxItems).toBe(20);
    });

    test('カスタム最大数で初期化できる', () => {
      const customController = new PrioritySliderGridController({
        maxItems: 10,
      });

      const state = customController.getState();

      expect(state.maxItems).toBe(10);
    });
  });

  describe('アイテム追加', () => {
    test('アイテムを追加できる', () => {
      const item = controller.addItem('タスク1');

      expect(item.label).toBe('タスク1');
      expect(item.id).toBeDefined();
      expect(item.priority).toBe(0.5); // デフォルト優先度
    });

    test('カスタム優先度でアイテムを追加できる', () => {
      const item = controller.addItem('タスク1', 0.8);

      expect(item.priority).toBe(0.8);
    });

    test('前後の空白をトリムして追加する', () => {
      const item = controller.addItem('  タスク  ');

      expect(item.label).toBe('タスク');
    });

    test('空文字列の場合はエラーをthrow', () => {
      expect(() => {
        controller.addItem('');
      }).toThrow('Item label cannot be empty');
    });

    test('複数のアイテムを追加できる', () => {
      controller.addItem('タスク1');
      controller.addItem('タスク2');
      controller.addItem('タスク3');

      const items = controller.getItems();

      expect(items).toHaveLength(3);
    });

    test('最大数に達した場合はエラーをthrow', () => {
      const smallController = new PrioritySliderGridController({ maxItems: 2 });

      smallController.addItem('タスク1');
      smallController.addItem('タスク2');

      expect(() => {
        smallController.addItem('タスク3');
      }).toThrow(/Maximum number of items/);
    });

    test('範囲外の優先度は正規化される', () => {
      const item1 = controller.addItem('タスク1', 1.5); // > 1.0
      const item2 = controller.addItem('タスク2', -0.3); // < 0.0

      expect(item1.priority).toBe(1.0);
      expect(item2.priority).toBe(0.0);
    });
  });

  describe('優先度更新', () => {
    test('アイテムの優先度を更新できる', () => {
      const item = controller.addItem('タスク1');

      controller.updateItemPriority(item.id, 0.9);

      const items = controller.getItems();
      const updatedItem = items.find((i) => i.id === item.id);

      expect(updatedItem?.priority).toBe(0.9);
    });

    test('範囲外の優先度はエラーをthrow', () => {
      const item = controller.addItem('タスク1');

      expect(() => {
        controller.updateItemPriority(item.id, 1.5);
      }).toThrow('Priority must be between 0 and 1');

      expect(() => {
        controller.updateItemPriority(item.id, -0.1);
      }).toThrow('Priority must be between 0 and 1');
    });

    test('存在しないアイテムIDはエラーをthrow', () => {
      expect(() => {
        controller.updateItemPriority('non_existent', 0.5);
      }).toThrow('Item not found');
    });
  });

  describe('アイテム削除', () => {
    test('アイテムを削除できる', () => {
      const item1 = controller.addItem('タスク1');
      const item2 = controller.addItem('タスク2');

      controller.deleteItem(item1.id);

      const items = controller.getItems();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(item2.id);
    });

    test('存在しないアイテムIDはエラーをthrow', () => {
      expect(() => {
        controller.deleteItem('non_existent');
      }).toThrow('Item not found');
    });
  });

  describe('アイテム取得', () => {
    test('優先度順にソートされたアイテムを取得できる', () => {
      controller.addItem('低優先度', 0.2);
      controller.addItem('高優先度', 0.9);
      controller.addItem('中優先度', 0.5);

      const sorted = controller.getItemsSortedByPriority();

      expect(sorted[0].label).toBe('高優先度');
      expect(sorted[1].label).toBe('中優先度');
      expect(sorted[2].label).toBe('低優先度');
    });

    test('高優先度アイテムを取得できる', () => {
      controller.addItem('高1', 0.8);
      controller.addItem('低1', 0.3);
      controller.addItem('高2', 0.9);
      controller.addItem('中1', 0.5);

      const highPriority = controller.getHighPriorityItems();

      expect(highPriority).toHaveLength(2);
      expect(highPriority.every((item) => item.priority > 0.7)).toBe(true);
    });

    test('中優先度アイテムを取得できる', () => {
      controller.addItem('高1', 0.8);
      controller.addItem('低1', 0.3);
      controller.addItem('中1', 0.5);
      controller.addItem('中2', 0.6);

      const mediumPriority = controller.getMediumPriorityItems();

      expect(mediumPriority).toHaveLength(2);
      expect(
        mediumPriority.every(
          (item) => item.priority >= 0.4 && item.priority <= 0.7
        )
      ).toBe(true);
    });

    test('低優先度アイテムを取得できる', () => {
      controller.addItem('高1', 0.8);
      controller.addItem('低1', 0.2);
      controller.addItem('低2', 0.3);
      controller.addItem('中1', 0.5);

      const lowPriority = controller.getLowPriorityItems();

      expect(lowPriority).toHaveLength(2);
      expect(lowPriority.every((item) => item.priority < 0.4)).toBe(true);
    });
  });

  describe('統計計算', () => {
    test('平均優先度を計算できる', () => {
      controller.addItem('タスク1', 0.8);
      controller.addItem('タスク2', 0.6);
      controller.addItem('タスク3', 0.4);

      const avg = controller.getAveragePriority();

      expect(avg).toBeCloseTo(0.6, 2);
    });

    test('アイテムがない場合の平均は0', () => {
      const avg = controller.getAveragePriority();

      expect(avg).toBe(0);
    });

    test('優先度分布を取得できる', () => {
      controller.addItem('高1', 0.8);
      controller.addItem('高2', 0.9);
      controller.addItem('中1', 0.5);
      controller.addItem('低1', 0.2);

      const distribution = controller.getPriorityDistribution();

      expect(distribution.high).toBe(2);
      expect(distribution.medium).toBe(1);
      expect(distribution.low).toBe(1);
    });

    test('境界値の分布が正しい', () => {
      controller.addItem('境界0.7', 0.7);
      controller.addItem('境界0.4', 0.4);

      const distribution = controller.getPriorityDistribution();

      // 0.7 は medium に分類される (>0.7 が high)
      // 0.4 は medium に分類される (>=0.4 が medium)
      expect(distribution.medium).toBe(2);
      expect(distribution.high).toBe(0);
    });
  });

  describe('サマリー生成', () => {
    test('アイテムがない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toBe('アイテムがまだ追加されていません');
    });

    test('アイテムがある場合', () => {
      controller.addItem('タスク1', 0.8);
      controller.addItem('タスク2', 0.6);
      controller.addItem('タスク3', 0.4);

      const summary = controller.generateSummary();

      expect(summary).toContain('3個のアイテム');
      expect(summary).toContain('平均: 60%');
      expect(summary).toContain('高: 1個');
      // 0.6 と 0.4 は両方とも medium (0.4 <= x <= 0.7)
      expect(summary).toContain('中: 2個');
      expect(summary).toContain('低: 0個');
    });
  });

  describe('WidgetResult生成', () => {
    test('アイテムがない場合でも結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('priority_slider_grid');
      expect(result.data.type).toBe('ranking');
      expect(result.data.ranking?.items).toEqual([]);
    });

    test('アイテムがある場合の結果', () => {
      controller.addItem('タスク1', 0.9);
      controller.addItem('タスク2', 0.3);
      controller.addItem('タスク3', 0.6);

      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('priority_slider_grid');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('ranking');
      expect(result.data.ranking?.items).toHaveLength(3);

      // 優先度順にランク付けされている
      expect(result.data.ranking?.items[0].rank).toBe(1);
      expect(result.data.ranking?.items[0].label).toBe('タスク1');
      expect(result.data.ranking?.items[0].score).toBe(0.9);
    });

    test('メタデータが含まれる', () => {
      controller.addItem('タスク1', 0.8);
      controller.addItem('タスク2', 0.4);

      const result = controller.getResult('widget_1');

      expect(result.metadata?.itemCount).toBe(2);
      expect(result.metadata?.maxItems).toBe(20);
      expect(result.metadata?.averagePriority).toBeCloseTo(0.6, 2);
      expect(result.metadata?.distribution).toBeDefined();
      expect(result.metadata?.distribution.high).toBe(1);
      expect(result.metadata?.distribution.medium).toBe(1);
      expect(result.metadata?.distribution.low).toBe(0);
    });

    test('criteriaが含まれる', () => {
      controller.addItem('タスク1', 0.5);

      const result = controller.getResult('widget_1');

      expect(result.data.ranking?.criteria).toBeDefined();
      expect(result.data.ranking?.criteria.name).toBe('優先度');
      expect(result.data.ranking?.criteria.min).toBe(0);
      expect(result.data.ranking?.criteria.max).toBe(1);
    });
  });

  describe('リセット', () => {
    test('リセット後は初期状態に戻る', () => {
      controller.addItem('タスク1');
      controller.addItem('タスク2');

      controller.reset();

      const state = controller.getState();

      expect(state.items).toEqual([]);
    });
  });
});
