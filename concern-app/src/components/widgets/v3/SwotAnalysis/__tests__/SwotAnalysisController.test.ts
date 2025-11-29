/**
 * SwotAnalysisController.test.ts
 * SwotAnalysisControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { SwotAnalysisController } from '../SwotAnalysisController';

describe('SwotAnalysisController', () => {
  let controller: SwotAnalysisController;

  beforeEach(() => {
    controller = new SwotAnalysisController();
  });

  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => {
      const state = controller.getState();

      expect(state.items).toEqual([]);
      expect(state.suggestedGaps).toEqual([]);
    });
  });

  describe('アイテム追加', () => {
    test('アイテムを追加できる', () => {
      const item = controller.addItem('テスト強み', 'strengths');

      expect(item.text).toBe('テスト強み');
      expect(item.quadrant).toBe('strengths');
      expect(item.importance).toBe('medium');
      expect(item.id).toBeDefined();
      expect(item.timestamp).toBeGreaterThan(0);
    });

    test('重要度を指定して追加できる', () => {
      const item = controller.addItem('重要な強み', 'strengths', 'high');

      expect(item.importance).toBe('high');
    });

    test('各象限にアイテムを追加できる', () => {
      controller.addItem('強み', 'strengths');
      controller.addItem('弱み', 'weaknesses');
      controller.addItem('機会', 'opportunities');
      controller.addItem('脅威', 'threats');

      const state = controller.getState();
      expect(state.items).toHaveLength(4);
    });
  });

  describe('アイテム更新', () => {
    test('アイテムのテキストを更新できる', () => {
      const item = controller.addItem('元のテキスト', 'strengths');
      controller.updateItem(item.id, { text: '更新後のテキスト' });

      const items = controller.getItemsByQuadrant('strengths');
      expect(items[0].text).toBe('更新後のテキスト');
    });

    test('アイテムの重要度を更新できる', () => {
      const item = controller.addItem('テスト', 'strengths', 'low');
      controller.updateItem(item.id, { importance: 'high' });

      const items = controller.getItemsByQuadrant('strengths');
      expect(items[0].importance).toBe('high');
    });

    test('存在しないアイテムの更新はエラー', () => {
      expect(() => {
        controller.updateItem('non_existent', { text: 'test' });
      }).toThrow('Item not found');
    });
  });

  describe('アイテム削除', () => {
    test('アイテムを削除できる', () => {
      const item = controller.addItem('削除予定', 'strengths');
      controller.removeItem(item.id);

      const state = controller.getState();
      expect(state.items).toHaveLength(0);
    });

    test('複数アイテムから特定のアイテムを削除できる', () => {
      const item1 = controller.addItem('残る', 'strengths');
      const item2 = controller.addItem('削除', 'strengths');
      controller.removeItem(item2.id);

      const items = controller.getItemsByQuadrant('strengths');
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(item1.id);
    });
  });

  describe('アイテム移動', () => {
    test('アイテムを別の象限に移動できる', () => {
      const item = controller.addItem('移動アイテム', 'strengths');
      controller.moveItem(item.id, 'weaknesses');

      expect(controller.getItemsByQuadrant('strengths')).toHaveLength(0);
      expect(controller.getItemsByQuadrant('weaknesses')).toHaveLength(1);
    });

    test('存在しないアイテムの移動はエラー', () => {
      expect(() => {
        controller.moveItem('non_existent', 'weaknesses');
      }).toThrow('Item not found');
    });
  });

  describe('象限ごとのアイテム取得', () => {
    test('象限ごとのアイテムを取得できる', () => {
      controller.addItem('強み1', 'strengths');
      controller.addItem('強み2', 'strengths');
      controller.addItem('弱み1', 'weaknesses');

      expect(controller.getItemsByQuadrant('strengths')).toHaveLength(2);
      expect(controller.getItemsByQuadrant('weaknesses')).toHaveLength(1);
      expect(controller.getItemsByQuadrant('opportunities')).toHaveLength(0);
    });

    test('重要度順にソートされる', () => {
      controller.addItem('低', 'strengths', 'low');
      controller.addItem('高', 'strengths', 'high');
      controller.addItem('中', 'strengths', 'medium');

      const items = controller.getItemsByQuadrant('strengths');
      expect(items[0].importance).toBe('high');
      expect(items[1].importance).toBe('medium');
      expect(items[2].importance).toBe('low');
    });
  });

  describe('象限カウント', () => {
    test('象限ごとのカウントを取得できる', () => {
      controller.addItem('強み1', 'strengths');
      controller.addItem('強み2', 'strengths');
      controller.addItem('弱み1', 'weaknesses');
      controller.addItem('機会1', 'opportunities');
      controller.addItem('脅威1', 'threats');
      controller.addItem('脅威2', 'threats');

      const counts = controller.getQuadrantCounts();

      expect(counts.strengths).toBe(2);
      expect(counts.weaknesses).toBe(1);
      expect(counts.opportunities).toBe(1);
      expect(counts.threats).toBe(2);
    });
  });

  describe('完了判定', () => {
    test('全象限にアイテムがあれば完了', () => {
      expect(controller.isComplete()).toBe(false);

      controller.addItem('強み', 'strengths');
      controller.addItem('弱み', 'weaknesses');
      controller.addItem('機会', 'opportunities');

      expect(controller.isComplete()).toBe(false);

      controller.addItem('脅威', 'threats');

      expect(controller.isComplete()).toBe(true);
    });
  });

  describe('ギャップ提案', () => {
    test('空の象限を検出する', () => {
      controller.addItem('強み', 'strengths');

      const state = controller.getState();

      expect(state.suggestedGaps.some((g) => g.includes('弱み'))).toBe(true);
      expect(state.suggestedGaps.some((g) => g.includes('機会'))).toBe(true);
      expect(state.suggestedGaps.some((g) => g.includes('脅威'))).toBe(true);
    });

    test('アイテム追加でギャップが更新される', () => {
      controller.addItem('強み', 'strengths');
      controller.addItem('弱み', 'weaknesses');
      controller.addItem('機会', 'opportunities');
      controller.addItem('脅威', 'threats');

      const state = controller.getState();

      // 全象限に項目があるので空の象限のギャップはない
      expect(state.suggestedGaps.filter((g) => g.includes('項目がありません'))).toHaveLength(0);
    });
  });

  describe('サマリー生成', () => {
    test('アイテムがない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toBe('まだ項目がありません');
    });

    test('アイテムがある場合', () => {
      controller.addItem('強み1', 'strengths');
      controller.addItem('強み2', 'strengths');
      controller.addItem('弱み1', 'weaknesses');

      const summary = controller.generateSummary();

      expect(summary).toContain('SWOT分析');
      expect(summary).toContain('強み2件');
      expect(summary).toContain('弱み1件');
    });
  });

  describe('WidgetResult生成', () => {
    test('基本的な結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('swot_analysis');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('mapping');
    });

    test('アイテム情報が含まれる', () => {
      controller.addItem('強み', 'strengths', 'high');
      controller.addItem('弱み', 'weaknesses');

      const result = controller.getResult('widget_1');

      expect(result.data.mapping?.items).toHaveLength(2);
      expect(result.data.composite?.totalItems).toBe(2);
      expect(result.data.composite?.highPriorityItems).toHaveLength(1);
    });

    test('分析データが含まれる', () => {
      controller.addItem('強み', 'strengths');
      controller.addItem('弱み', 'weaknesses');
      controller.addItem('機会', 'opportunities');
      controller.addItem('脅威', 'threats');

      const result = controller.getResult('widget_1');

      expect(result.data.composite?.analysis).toBeDefined();
      expect(result.data.composite?.analysis?.internalStrength).toBe(0); // 1強み - 1弱み
      expect(result.data.composite?.analysis?.externalOpportunity).toBe(0); // 1機会 - 1脅威
    });

    test('メタデータが含まれる', () => {
      controller.addItem('強み', 'strengths');

      const result = controller.getResult('widget_1');

      expect(result.metadata?.totalItems).toBe(1);
      expect(result.metadata?.quadrantCounts).toBeDefined();
    });

    test('インタラクション履歴が含まれる', () => {
      controller.addItem('強み', 'strengths');
      controller.addItem('弱み', 'weaknesses');

      const result = controller.getResult('widget_1');

      expect(result.interactions).toHaveLength(2);
      expect(result.interactions?.[0].action).toBe('input');
    });
  });

  describe('リセット', () => {
    test('リセット後は初期状態に戻る', () => {
      controller.addItem('強み', 'strengths');
      controller.addItem('弱み', 'weaknesses');

      controller.reset();

      const state = controller.getState();
      expect(state.items).toEqual([]);
      expect(state.suggestedGaps).toEqual([]);
    });
  });
});
