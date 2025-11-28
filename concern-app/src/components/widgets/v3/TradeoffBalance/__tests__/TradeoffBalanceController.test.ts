/**
 * TradeoffBalanceController.test.ts
 * TradeoffBalanceControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { TradeoffBalanceController } from '../TradeoffBalanceController';

describe('TradeoffBalanceController', () => {
  let controller: TradeoffBalanceController;

  beforeEach(() => {
    controller = new TradeoffBalanceController();
  });

  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => {
      const state = controller.getState();

      expect(state.leftLabel).toBe('選択肢A');
      expect(state.rightLabel).toBe('選択肢B');
      expect(state.items).toEqual([]);
      expect(state.balanceScore).toBe(0);
    });

    test('カスタムラベルで初期化できる', () => {
      const customController = new TradeoffBalanceController('転職する', '現職に残る');
      const state = customController.getState();

      expect(state.leftLabel).toBe('転職する');
      expect(state.rightLabel).toBe('現職に残る');
    });
  });

  describe('ラベル設定', () => {
    test('ラベルを変更できる', () => {
      controller.setLabels('新しい左', '新しい右');
      const state = controller.getState();

      expect(state.leftLabel).toBe('新しい左');
      expect(state.rightLabel).toBe('新しい右');
    });
  });

  describe('項目追加', () => {
    test('左側に項目を追加できる', () => {
      const item = controller.addItem('左の項目', 'left');

      expect(item.text).toBe('左の項目');
      expect(item.side).toBe('left');
      expect(item.weight).toBe(50);
      expect(item.id).toBeDefined();
    });

    test('右側に項目を追加できる', () => {
      const item = controller.addItem('右の項目', 'right');

      expect(item.side).toBe('right');
    });

    test('重みを指定して追加できる', () => {
      const item = controller.addItem('重い項目', 'left', 80);

      expect(item.weight).toBe(80);
    });

    test('重みは0-100に制限される', () => {
      const negative = controller.addItem('負', 'left', -20);
      const over = controller.addItem('超過', 'right', 150);

      expect(negative.weight).toBe(0);
      expect(over.weight).toBe(100);
    });
  });

  describe('項目更新', () => {
    test('項目のテキストを更新できる', () => {
      const item = controller.addItem('元のテキスト', 'left');
      controller.updateItem(item.id, { text: '更新後' });

      const items = controller.getItemsBySide('left');
      expect(items[0].text).toBe('更新後');
    });

    test('項目の重みを更新できる', () => {
      const item = controller.addItem('テスト', 'left', 30);
      controller.updateItem(item.id, { weight: 70 });

      const items = controller.getItemsBySide('left');
      expect(items[0].weight).toBe(70);
    });

    test('重みは更新時も0-100に制限される', () => {
      const item = controller.addItem('テスト', 'left');
      controller.updateItem(item.id, { weight: 200 });

      const items = controller.getItemsBySide('left');
      expect(items[0].weight).toBe(100);
    });

    test('存在しない項目の更新はエラー', () => {
      expect(() => {
        controller.updateItem('non_existent', { text: 'テスト' });
      }).toThrow('Item not found');
    });
  });

  describe('項目重み設定', () => {
    test('setItemWeightで重みを更新できる', () => {
      const item = controller.addItem('テスト', 'left', 50);
      controller.setItemWeight(item.id, 90);

      const items = controller.getItemsBySide('left');
      expect(items[0].weight).toBe(90);
    });
  });

  describe('項目削除', () => {
    test('項目を削除できる', () => {
      const item = controller.addItem('削除予定', 'left');
      controller.removeItem(item.id);

      expect(controller.getItemsBySide('left')).toHaveLength(0);
    });

    test('削除後にバランスが再計算される', () => {
      const item = controller.addItem('左', 'left', 100);
      controller.addItem('右', 'right', 50);

      expect(controller.getBalanceDirection()).toBe('left');

      controller.removeItem(item.id);

      expect(controller.getBalanceDirection()).toBe('right');
    });
  });

  describe('側の項目取得', () => {
    test('左側の項目を取得できる', () => {
      controller.addItem('左1', 'left');
      controller.addItem('左2', 'left');
      controller.addItem('右1', 'right');

      expect(controller.getItemsBySide('left')).toHaveLength(2);
    });

    test('右側の項目を取得できる', () => {
      controller.addItem('左1', 'left');
      controller.addItem('右1', 'right');
      controller.addItem('右2', 'right');

      expect(controller.getItemsBySide('right')).toHaveLength(2);
    });
  });

  describe('バランス計算', () => {
    test('項目がない場合はスコア0', () => {
      expect(controller.getBalanceScore()).toBe(0);
    });

    test('左だけの場合は負のスコア', () => {
      controller.addItem('左のみ', 'left', 100);

      expect(controller.getBalanceScore()).toBe(-100);
    });

    test('右だけの場合は正のスコア', () => {
      controller.addItem('右のみ', 'right', 100);

      expect(controller.getBalanceScore()).toBe(100);
    });

    test('均衡の場合はスコア0', () => {
      controller.addItem('左', 'left', 50);
      controller.addItem('右', 'right', 50);

      expect(controller.getBalanceScore()).toBe(0);
    });

    test('複数項目の合計で計算される', () => {
      controller.addItem('左1', 'left', 50);
      controller.addItem('左2', 'left', 50);
      controller.addItem('右1', 'right', 50);

      // 左: 100, 右: 50 -> (50 - 100) / 150 * 100 = -33
      expect(controller.getBalanceScore()).toBe(-33);
    });
  });

  describe('バランス方向', () => {
    test('均衡状態を検出', () => {
      controller.addItem('左', 'left', 50);
      controller.addItem('右', 'right', 50);

      expect(controller.getBalanceDirection()).toBe('balanced');
    });

    test('スコア差が小さい場合も均衡', () => {
      controller.addItem('左', 'left', 51);
      controller.addItem('右', 'right', 49);

      // スコア差が10未満なので均衡
      expect(controller.getBalanceDirection()).toBe('balanced');
    });

    test('左優勢を検出', () => {
      controller.addItem('左', 'left', 80);
      controller.addItem('右', 'right', 20);

      expect(controller.getBalanceDirection()).toBe('left');
    });

    test('右優勢を検出', () => {
      controller.addItem('左', 'left', 20);
      controller.addItem('右', 'right', 80);

      expect(controller.getBalanceDirection()).toBe('right');
    });
  });

  describe('傾き角度', () => {
    test('均衡時は0度', () => {
      controller.addItem('左', 'left', 50);
      controller.addItem('右', 'right', 50);

      expect(controller.getTiltAngle()).toBe(0);
    });

    test('完全に左の場合は-15度', () => {
      controller.addItem('左のみ', 'left', 100);

      expect(controller.getTiltAngle()).toBe(-15);
    });

    test('完全に右の場合は15度', () => {
      controller.addItem('右のみ', 'right', 100);

      expect(controller.getTiltAngle()).toBe(15);
    });
  });

  describe('側の合計取得', () => {
    test('左側の合計を取得できる', () => {
      controller.addItem('左1', 'left', 30);
      controller.addItem('左2', 'left', 50);

      expect(controller.getSideTotal('left')).toBe(80);
    });

    test('右側の合計を取得できる', () => {
      controller.addItem('右1', 'right', 40);
      controller.addItem('右2', 'right', 60);

      expect(controller.getSideTotal('right')).toBe(100);
    });

    test('項目がない場合は0', () => {
      expect(controller.getSideTotal('left')).toBe(0);
      expect(controller.getSideTotal('right')).toBe(0);
    });
  });

  describe('推奨取得', () => {
    test('均衡時のメッセージ', () => {
      controller.addItem('左', 'left', 50);
      controller.addItem('右', 'right', 50);

      const recommendation = controller.getRecommendation();

      expect(recommendation).toContain('均衡');
    });

    test('左優勢時のメッセージ', () => {
      controller.addItem('左', 'left', 80);
      controller.addItem('右', 'right', 20);

      const recommendation = controller.getRecommendation();

      expect(recommendation).toContain('選択肢A');
      expect(recommendation).toContain('優勢');
    });

    test('右優勢時のメッセージ', () => {
      controller.addItem('左', 'left', 20);
      controller.addItem('右', 'right', 80);

      const recommendation = controller.getRecommendation();

      expect(recommendation).toContain('選択肢B');
    });
  });

  describe('サマリー生成', () => {
    test('項目がない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toBe('項目を追加して比較してください');
    });

    test('均衡時', () => {
      controller.addItem('左', 'left', 50);
      controller.addItem('右', 'right', 50);

      const summary = controller.generateSummary();

      expect(summary).toContain('均衡');
      expect(summary).toContain('左:50');
      expect(summary).toContain('右:50');
    });

    test('優勢がある場合', () => {
      controller.addItem('左', 'left', 80);
      controller.addItem('右', 'right', 20);

      const summary = controller.generateSummary();

      expect(summary).toContain('選択肢A');
      expect(summary).toContain('優勢');
    });
  });

  describe('WidgetResult生成', () => {
    test('基本的な結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('tradeoff_balance');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('composite');
    });

    test('項目情報が含まれる', () => {
      controller.addItem('左', 'left', 60);
      controller.addItem('右', 'right', 40);

      const result = controller.getResult('widget_1');

      expect(result.data.composite?.leftItems).toHaveLength(1);
      expect(result.data.composite?.rightItems).toHaveLength(1);
      expect(result.data.composite?.leftTotal).toBe(60);
      expect(result.data.composite?.rightTotal).toBe(40);
    });

    test('バランス情報が含まれる', () => {
      controller.addItem('左', 'left', 80);
      controller.addItem('右', 'right', 20);

      const result = controller.getResult('widget_1');

      expect(result.data.composite?.balanceScore).toBeDefined();
      expect(result.data.composite?.balanceDirection).toBe('left');
      expect(result.data.composite?.tiltAngle).toBeDefined();
    });

    test('推奨が含まれる', () => {
      controller.addItem('左', 'left', 80);
      controller.addItem('右', 'right', 20);

      const result = controller.getResult('widget_1');

      expect(result.data.composite?.recommendation).toBeDefined();
    });

    test('ランキング形式のデータが含まれる', () => {
      controller.addItem('左', 'left', 80);
      controller.addItem('右', 'right', 40);

      const result = controller.getResult('widget_1');

      expect(result.data.ranking?.items).toHaveLength(2);
      // スコア順にソートされている
      expect(result.data.ranking?.items[0].score).toBe(80);
    });

    test('メタデータが含まれる', () => {
      controller.addItem('左1', 'left');
      controller.addItem('左2', 'left');
      controller.addItem('右1', 'right');

      const result = controller.getResult('widget_1');

      expect(result.metadata?.itemCount).toBe(3);
      expect(result.metadata?.leftCount).toBe(2);
      expect(result.metadata?.rightCount).toBe(1);
    });
  });

  describe('リセット', () => {
    test('リセット後は初期状態に戻る', () => {
      controller.addItem('左', 'left', 80);
      controller.addItem('右', 'right', 20);

      controller.reset();

      const state = controller.getState();
      expect(state.items).toEqual([]);
      expect(state.balanceScore).toBe(0);
    });

    test('ラベルは保持される', () => {
      controller.setLabels('転職', '残留');
      controller.addItem('項目', 'left');

      controller.reset();

      const state = controller.getState();
      expect(state.leftLabel).toBe('転職');
      expect(state.rightLabel).toBe('残留');
    });
  });
});
