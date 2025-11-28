/**
 * MindMapController.test.ts
 * MindMapControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { MindMapController, LEVEL_COLORS } from '../MindMapController';

describe('MindMapController', () => {
  let controller: MindMapController;

  beforeEach(() => {
    controller = new MindMapController('テスト中心テーマ');
  });

  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => {
      const defaultController = new MindMapController();
      const state = defaultController.getState();

      expect(state.centerTopic).toBe('中心テーマ');
      expect(state.nodes).toEqual([]);
      expect(state.selectedNodeId).toBeNull();
    });

    test('カスタム中心テーマで初期化できる', () => {
      const state = controller.getState();

      expect(state.centerTopic).toBe('テスト中心テーマ');
    });
  });

  describe('中心テーマ設定', () => {
    test('中心テーマを変更できる', () => {
      controller.setCenterTopic('新しいテーマ');
      const state = controller.getState();

      expect(state.centerTopic).toBe('新しいテーマ');
    });
  });

  describe('ノード追加', () => {
    test('ルートノードを追加できる', () => {
      const node = controller.addNode('アイデア1', null);

      expect(node.text).toBe('アイデア1');
      expect(node.level).toBe(1);
      expect(node.parentId).toBeNull();
      expect(node.id).toBeDefined();
    });

    test('子ノードを追加できる', () => {
      const parent = controller.addNode('親ノード', null);
      const child = controller.addNode('子ノード', parent.id);

      expect(child.level).toBe(2);
      expect(child.parentId).toBe(parent.id);
    });

    test('深いネストが可能', () => {
      const level1 = controller.addNode('レベル1', null);
      const level2 = controller.addNode('レベル2', level1.id);
      const level3 = controller.addNode('レベル3', level2.id);
      const level4 = controller.addNode('レベル4', level3.id);

      expect(level1.level).toBe(1);
      expect(level2.level).toBe(2);
      expect(level3.level).toBe(3);
      expect(level4.level).toBe(4);
    });

    test('レベルに応じた色が設定される', () => {
      const level1 = controller.addNode('レベル1', null);
      const level2 = controller.addNode('レベル2', level1.id);

      expect(level1.color).toBe(LEVEL_COLORS[1]);
      expect(level2.color).toBe(LEVEL_COLORS[2]);
    });
  });

  describe('ノード更新', () => {
    test('ノードのテキストを更新できる', () => {
      const node = controller.addNode('元のテキスト', null);
      controller.updateNode(node.id, '更新後のテキスト');

      const state = controller.getState();
      const updatedNode = state.nodes.find((n) => n.id === node.id);

      expect(updatedNode?.text).toBe('更新後のテキスト');
    });

    test('存在しないノードの更新はエラー', () => {
      expect(() => {
        controller.updateNode('non_existent', 'テスト');
      }).toThrow('Node not found');
    });
  });

  describe('ノード削除', () => {
    test('ノードを削除できる', () => {
      const node = controller.addNode('削除予定', null);
      controller.removeNode(node.id);

      expect(controller.getNodeCount()).toBe(0);
    });

    test('子ノードも一緒に削除される', () => {
      const parent = controller.addNode('親', null);
      controller.addNode('子1', parent.id);
      controller.addNode('子2', parent.id);

      controller.removeNode(parent.id);

      expect(controller.getNodeCount()).toBe(0);
    });

    test('孫ノードも一緒に削除される', () => {
      const parent = controller.addNode('親', null);
      const child = controller.addNode('子', parent.id);
      controller.addNode('孫', child.id);

      controller.removeNode(parent.id);

      expect(controller.getNodeCount()).toBe(0);
    });

    test('選択されているノードが削除されると選択解除される', () => {
      const node = controller.addNode('選択ノード', null);
      controller.selectNode(node.id);
      controller.removeNode(node.id);

      const state = controller.getState();
      expect(state.selectedNodeId).toBeNull();
    });
  });

  describe('ノード選択', () => {
    test('ノードを選択できる', () => {
      const node = controller.addNode('選択対象', null);
      controller.selectNode(node.id);

      const state = controller.getState();
      expect(state.selectedNodeId).toBe(node.id);
    });

    test('選択を解除できる', () => {
      const node = controller.addNode('選択対象', null);
      controller.selectNode(node.id);
      controller.selectNode(null);

      const state = controller.getState();
      expect(state.selectedNodeId).toBeNull();
    });
  });

  describe('折りたたみ', () => {
    test('ノードを折りたためる', () => {
      const node = controller.addNode('折りたたみ対象', null);
      controller.toggleCollapse(node.id);

      const state = controller.getState();
      const collapsedNode = state.nodes.find((n) => n.id === node.id);

      expect(collapsedNode?.collapsed).toBe(true);
    });

    test('折りたたみを解除できる', () => {
      const node = controller.addNode('折りたたみ対象', null);
      controller.toggleCollapse(node.id);
      controller.toggleCollapse(node.id);

      const state = controller.getState();
      const collapsedNode = state.nodes.find((n) => n.id === node.id);

      expect(collapsedNode?.collapsed).toBe(false);
    });

    test('存在しないノードの折りたたみはエラー', () => {
      expect(() => {
        controller.toggleCollapse('non_existent');
      }).toThrow('Node not found');
    });
  });

  describe('ノード取得', () => {
    test('子ノードを取得できる', () => {
      const parent = controller.addNode('親', null);
      controller.addNode('子1', parent.id);
      controller.addNode('子2', parent.id);

      const children = controller.getChildren(parent.id);

      expect(children).toHaveLength(2);
    });

    test('ルートノードを取得できる', () => {
      controller.addNode('ルート1', null);
      controller.addNode('ルート2', null);
      const root1 = controller.getRootNodes()[0];
      controller.addNode('子', root1.id);

      const roots = controller.getRootNodes();

      expect(roots).toHaveLength(2);
    });
  });

  describe('ノード表示判定', () => {
    test('ルートノードは常に表示される', () => {
      const node = controller.addNode('ルート', null);

      expect(controller.isNodeVisible(node.id)).toBe(true);
    });

    test('折りたたまれた親の子は非表示', () => {
      const parent = controller.addNode('親', null);
      const child = controller.addNode('子', parent.id);
      controller.toggleCollapse(parent.id);

      expect(controller.isNodeVisible(child.id)).toBe(false);
    });
  });

  describe('統計情報', () => {
    test('ノード数を取得できる', () => {
      controller.addNode('ノード1', null);
      controller.addNode('ノード2', null);

      expect(controller.getNodeCount()).toBe(2);
    });

    test('レベルごとのカウントを取得できる', () => {
      const root1 = controller.addNode('ルート1', null);
      controller.addNode('ルート2', null);
      controller.addNode('子1', root1.id);
      controller.addNode('子2', root1.id);

      const counts = controller.getLevelCounts();

      expect(counts[1]).toBe(2);
      expect(counts[2]).toBe(2);
    });

    test('最大深度を取得できる', () => {
      const level1 = controller.addNode('レベル1', null);
      const level2 = controller.addNode('レベル2', level1.id);
      controller.addNode('レベル3', level2.id);

      expect(controller.getMaxDepth()).toBe(3);
    });

    test('ノードがない場合の最大深度は0', () => {
      expect(controller.getMaxDepth()).toBe(0);
    });
  });

  describe('サマリー生成', () => {
    test('ノードがない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toContain('テスト中心テーマ');
      expect(summary).toContain('項目なし');
    });

    test('ノードがある場合', () => {
      const root = controller.addNode('ルート', null);
      controller.addNode('子', root.id);

      const summary = controller.generateSummary();

      expect(summary).toContain('2項目');
      expect(summary).toContain('2階層');
    });
  });

  describe('WidgetResult生成', () => {
    test('基本的な結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('mind_map');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('mapping');
    });

    test('ノード情報が含まれる', () => {
      const root = controller.addNode('ルート', null);
      controller.addNode('子', root.id);

      const result = controller.getResult('widget_1');

      expect(result.data.mapping?.items).toHaveLength(2);
      expect(result.data.composite?.statistics?.totalNodes).toBe(2);
      expect(result.data.composite?.statistics?.maxDepth).toBe(2);
    });

    test('メタデータが含まれる', () => {
      controller.addNode('ルート', null);

      const result = controller.getResult('widget_1');

      expect(result.metadata?.nodeCount).toBe(1);
      expect(result.metadata?.maxDepth).toBe(1);
    });
  });

  describe('リセット', () => {
    test('リセット後は初期状態に戻る', () => {
      const node = controller.addNode('ルート', null);
      controller.selectNode(node.id);

      controller.reset();

      const state = controller.getState();
      expect(state.nodes).toEqual([]);
      expect(state.selectedNodeId).toBeNull();
    });
  });
});
