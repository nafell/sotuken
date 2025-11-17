/**
 * MatrixPlacementController.test.ts
 * MatrixPlacementControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { MatrixPlacementController } from '../MatrixPlacementController';

describe('MatrixPlacementController', () => {
  let controller: MatrixPlacementController;

  beforeEach(() => {
    controller = new MatrixPlacementController();
  });

  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => {
      const state = controller.getState();

      expect(state.items).toEqual([]);
      expect(state.maxItems).toBe(20);
      expect(state.xAxis).toBeDefined();
      expect(state.yAxis).toBeDefined();
    });

    test('カスタム軸で初期化できる', () => {
      const customController = new MatrixPlacementController({
        xAxis: {
          id: 'importance',
          label: '重要度',
          lowLabel: '低い',
          highLabel: '高い',
        },
        yAxis: {
          id: 'urgency',
          label: '緊急度',
          lowLabel: '低い',
          highLabel: '高い',
        },
      });

      const state = customController.getState();

      expect(state.xAxis.label).toBe('重要度');
      expect(state.yAxis.label).toBe('緊急度');
    });
  });

  describe('アイテム追加', () => {
    test('アイテムを追加できる', () => {
      const item = controller.addItem('タスク1');

      expect(item.label).toBe('タスク1');
      expect(item.id).toBeDefined();
      expect(item.position.x).toBe(0.5);
      expect(item.position.y).toBe(0.5);
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
      const smallController = new MatrixPlacementController({ maxItems: 2 });

      smallController.addItem('タスク1');
      smallController.addItem('タスク2');

      expect(() => {
        smallController.addItem('タスク3');
      }).toThrow(/Maximum number of items/);
    });
  });

  describe('位置更新', () => {
    test('アイテムの位置を更新できる', () => {
      const item = controller.addItem('タスク1');

      controller.updateItemPosition(item.id, 0.8, 0.9);

      const items = controller.getItems();
      const updatedItem = items.find((i) => i.id === item.id);

      expect(updatedItem?.position.x).toBe(0.8);
      expect(updatedItem?.position.y).toBe(0.9);
    });

    test('範囲外の位置はエラーをthrow', () => {
      const item = controller.addItem('タスク1');

      expect(() => {
        controller.updateItemPosition(item.id, 1.5, 0.5);
      }).toThrow('Position must be between 0 and 1');

      expect(() => {
        controller.updateItemPosition(item.id, 0.5, -0.1);
      }).toThrow('Position must be between 0 and 1');
    });

    test('存在しないアイテムIDはエラーをthrow', () => {
      expect(() => {
        controller.updateItemPosition('non_existent', 0.5, 0.5);
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

  describe('象限カウント', () => {
    test('4象限のカウントを取得できる', () => {
      // 各象限に1つずつ配置
      const item1 = controller.addItem('右上');
      controller.updateItemPosition(item1.id, 0.8, 0.8); // topRight

      const item2 = controller.addItem('左上');
      controller.updateItemPosition(item2.id, 0.2, 0.8); // topLeft

      const item3 = controller.addItem('右下');
      controller.updateItemPosition(item3.id, 0.8, 0.2); // bottomRight

      const item4 = controller.addItem('左下');
      controller.updateItemPosition(item4.id, 0.2, 0.2); // bottomLeft

      const counts = controller.getQuadrantCounts();

      expect(counts.topRight).toBe(1);
      expect(counts.topLeft).toBe(1);
      expect(counts.bottomRight).toBe(1);
      expect(counts.bottomLeft).toBe(1);
    });

    test('アイテムがない場合は全て0', () => {
      const counts = controller.getQuadrantCounts();

      expect(counts.topRight).toBe(0);
      expect(counts.topLeft).toBe(0);
      expect(counts.bottomRight).toBe(0);
      expect(counts.bottomLeft).toBe(0);
    });

    test('中央線上のアイテムも正しくカウントされる', () => {
      const item1 = controller.addItem('中央');
      controller.updateItemPosition(item1.id, 0.5, 0.5);

      const counts = controller.getQuadrantCounts();

      // x=0.5, y=0.5 は bottomLeft にカウントされる
      expect(counts.bottomLeft).toBe(1);
    });
  });

  describe('高優先度アイテム', () => {
    test('高優先度アイテムを取得できる', () => {
      const item1 = controller.addItem('高優先度');
      controller.updateItemPosition(item1.id, 0.8, 0.8);

      const item2 = controller.addItem('低優先度');
      controller.updateItemPosition(item2.id, 0.2, 0.2);

      const highPriorityItems = controller.getHighPriorityItems();

      expect(highPriorityItems).toHaveLength(1);
      expect(highPriorityItems[0].id).toBe(item1.id);
    });

    test('高優先度アイテムがない場合は空配列', () => {
      const item = controller.addItem('低優先度');
      controller.updateItemPosition(item.id, 0.2, 0.2);

      const highPriorityItems = controller.getHighPriorityItems();

      expect(highPriorityItems).toHaveLength(0);
    });
  });

  describe('サマリー生成', () => {
    test('アイテムがない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toBe('アイテムがまだ配置されていません');
    });

    test('高優先度アイテムがある場合', () => {
      const item1 = controller.addItem('タスク1');
      controller.updateItemPosition(item1.id, 0.8, 0.8);

      const item2 = controller.addItem('タスク2');
      controller.updateItemPosition(item2.id, 0.2, 0.2);

      const summary = controller.generateSummary();

      expect(summary).toContain('2個のアイテム');
      expect(summary).toContain('高優先度: 1個');
    });

    test('高優先度アイテムがない場合', () => {
      const item = controller.addItem('タスク1');
      controller.updateItemPosition(item.id, 0.2, 0.2);

      const summary = controller.generateSummary();

      expect(summary).toContain('1個のアイテム');
      expect(summary).toContain('高優先度: なし');
    });
  });

  describe('WidgetResult生成', () => {
    test('アイテムがない場合でも結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('matrix_placement');
      expect(result.data.type).toBe('mapping');
      expect(result.data.mapping?.items).toEqual([]);
    });

    test('アイテムがある場合の結果', () => {
      const item1 = controller.addItem('タスク1');
      controller.updateItemPosition(item1.id, 0.8, 0.9);

      const item2 = controller.addItem('タスク2');
      controller.updateItemPosition(item2.id, 0.3, 0.4);

      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('matrix_placement');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('mapping');
      expect(result.data.mapping?.items).toHaveLength(2);
      expect(result.data.mapping?.items[0].position).toEqual({ x: 0.8, y: 0.9 });
    });

    test('軸情報がメタデータに含まれる', () => {
      const customController = new MatrixPlacementController({
        xAxis: {
          id: 'importance',
          label: '重要度',
          lowLabel: '低',
          highLabel: '高',
        },
        yAxis: {
          id: 'urgency',
          label: '緊急度',
          lowLabel: '低',
          highLabel: '高',
        },
      });

      customController.addItem('テスト');

      const result = customController.getResult('widget_1');

      expect(result.data.mapping?.axes.x.label).toBe('重要度');
      expect(result.data.mapping?.axes.y.label).toBe('緊急度');
    });

    test('メタデータに象限カウントが含まれる', () => {
      const item = controller.addItem('タスク');
      controller.updateItemPosition(item.id, 0.8, 0.8);

      const result = controller.getResult('widget_1');

      expect(result.metadata?.quadrantCounts).toBeDefined();
      expect(result.metadata?.quadrantCounts.topRight).toBe(1);
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
