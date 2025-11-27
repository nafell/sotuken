/**
 * DependencyMappingController.test.ts
 * DependencyMappingControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  DependencyMappingController,
  DEFAULT_NODES,
  type DependencyNode,
} from '../DependencyMappingController';

describe('DependencyMappingController', () => {
  let controller: DependencyMappingController;

  beforeEach(() => {
    controller = new DependencyMappingController();
  });

  describe('初期化', () => {
    test('デフォルトノードで初期化される', () => {
      const state = controller.getState();

      expect(state.nodes).toEqual(DEFAULT_NODES);
      expect(state.edges).toEqual([]);
      expect(state.selectedNodeId).toBeNull();
    });

    test('カスタムノードで初期化できる', () => {
      const customNodes: DependencyNode[] = [
        { id: 'n1', label: 'ノード1' },
        { id: 'n2', label: 'ノード2' },
      ];

      const customController = new DependencyMappingController(customNodes);
      const state = customController.getState();

      expect(state.nodes).toEqual(customNodes);
    });
  });

  describe('ノード設定', () => {
    test('ノードを設定できる', () => {
      const newNodes: DependencyNode[] = [
        { id: 'new1', label: '新ノード1' },
        { id: 'new2', label: '新ノード2' },
      ];

      controller.setNodes(newNodes);
      const state = controller.getState();

      expect(state.nodes).toEqual(newNodes);
    });

    test('ノード設定時に存在しないノードへのエッジは削除される', () => {
      controller.addEdge('node1', 'node2', 'blocks');

      const newNodes: DependencyNode[] = [{ id: 'new1', label: '新ノード' }];
      controller.setNodes(newNodes);

      const state = controller.getState();
      expect(state.edges).toEqual([]);
    });
  });

  describe('ノード追加', () => {
    test('ノードを追加できる', () => {
      const newNode: DependencyNode = { id: 'new', label: '新規ノード' };
      controller.addNode(newNode);

      const state = controller.getState();
      expect(state.nodes).toContainEqual(newNode);
    });

    test('重複IDのノードはエラー', () => {
      expect(() => {
        controller.addNode({ id: 'node1', label: '重複' });
      }).toThrow('Node already exists');
    });
  });

  describe('ノード削除', () => {
    test('ノードを削除できる', () => {
      controller.removeNode('node1');

      const state = controller.getState();
      expect(state.nodes.some((n) => n.id === 'node1')).toBe(false);
    });

    test('ノード削除時に関連エッジも削除される', () => {
      controller.addEdge('node1', 'node2', 'blocks');
      controller.removeNode('node1');

      const state = controller.getState();
      expect(state.edges).toEqual([]);
    });

    test('選択中のノードを削除すると選択解除される', () => {
      controller.selectNode('node1');
      controller.removeNode('node1');

      const state = controller.getState();
      expect(state.selectedNodeId).toBeNull();
    });
  });

  describe('ノード位置更新', () => {
    test('ノードの位置を更新できる', () => {
      controller.updateNodePosition('node1', 200, 300);

      const state = controller.getState();
      const node = state.nodes.find((n) => n.id === 'node1');

      expect(node?.x).toBe(200);
      expect(node?.y).toBe(300);
    });

    test('存在しないノードはエラー', () => {
      expect(() => {
        controller.updateNodePosition('non_existent', 100, 100);
      }).toThrow('Node not found');
    });
  });

  describe('ノード選択', () => {
    test('ノードを選択できる', () => {
      controller.selectNode('node1');

      const state = controller.getState();
      expect(state.selectedNodeId).toBe('node1');
    });

    test('選択を解除できる', () => {
      controller.selectNode('node1');
      controller.selectNode(null);

      const state = controller.getState();
      expect(state.selectedNodeId).toBeNull();
    });

    test('存在しないノードの選択はエラー', () => {
      expect(() => {
        controller.selectNode('non_existent');
      }).toThrow('Node not found');
    });
  });

  describe('エッジ追加', () => {
    test('エッジを追加できる', () => {
      const edge = controller.addEdge('node1', 'node2', 'blocks');

      expect(edge.sourceId).toBe('node1');
      expect(edge.targetId).toBe('node2');
      expect(edge.type).toBe('blocks');
    });

    test('ラベル付きエッジを追加できる', () => {
      const edge = controller.addEdge('node1', 'node2', 'requires', '必須');

      expect(edge.label).toBe('必須');
    });

    test('存在しないソースノードはエラー', () => {
      expect(() => {
        controller.addEdge('non_existent', 'node2', 'blocks');
      }).toThrow('Source node not found');
    });

    test('存在しないターゲットノードはエラー', () => {
      expect(() => {
        controller.addEdge('node1', 'non_existent', 'blocks');
      }).toThrow('Target node not found');
    });

    test('自己参照はエラー', () => {
      expect(() => {
        controller.addEdge('node1', 'node1', 'blocks');
      }).toThrow('Self-reference is not allowed');
    });

    test('重複エッジはエラー', () => {
      controller.addEdge('node1', 'node2', 'blocks');

      expect(() => {
        controller.addEdge('node1', 'node2', 'requires');
      }).toThrow('Edge already exists');
    });
  });

  describe('エッジ削除', () => {
    test('エッジを削除できる', () => {
      const edge = controller.addEdge('node1', 'node2', 'blocks');
      controller.removeEdge(edge.id);

      const state = controller.getState();
      expect(state.edges).toEqual([]);
    });
  });

  describe('循環依存検出', () => {
    test('循環がない場合はnull', () => {
      controller.addEdge('node1', 'node2', 'blocks');
      controller.addEdge('node2', 'node3', 'blocks');

      const cycle = controller.detectCycle();
      expect(cycle).toBeNull();
    });

    test('循環がある場合はパスを返す', () => {
      controller.addEdge('node1', 'node2', 'blocks');
      controller.addEdge('node2', 'node3', 'blocks');
      controller.addEdge('node3', 'node1', 'blocks');

      const cycle = controller.detectCycle();
      expect(cycle).not.toBeNull();
      expect(cycle?.length).toBeGreaterThan(0);
    });
  });

  describe('クリティカルパス', () => {
    test('クリティカルパスを計算できる', () => {
      controller.addEdge('node1', 'node2', 'blocks');
      controller.addEdge('node2', 'node3', 'blocks');

      const path = controller.getCriticalPath();

      expect(path).toContain('node1');
      expect(path).toContain('node2');
      expect(path).toContain('node3');
    });

    test('エッジがない場合は単一ノード', () => {
      const path = controller.getCriticalPath();

      expect(path).toHaveLength(1);
    });
  });

  describe('エッジ取得', () => {
    test('入力エッジを取得できる', () => {
      controller.addEdge('node1', 'node2', 'blocks');
      controller.addEdge('node3', 'node2', 'requires');

      const incoming = controller.getIncomingEdges('node2');

      expect(incoming).toHaveLength(2);
    });

    test('出力エッジを取得できる', () => {
      controller.addEdge('node1', 'node2', 'blocks');
      controller.addEdge('node1', 'node3', 'requires');

      const outgoing = controller.getOutgoingEdges('node1');

      expect(outgoing).toHaveLength(2);
    });
  });

  describe('サマリー生成', () => {
    test('エッジがない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toContain('3個のノード');
      expect(summary).toContain('関係なし');
    });

    test('エッジがある場合', () => {
      controller.addEdge('node1', 'node2', 'blocks');

      const summary = controller.generateSummary();

      expect(summary).toContain('3個のノード');
      expect(summary).toContain('1個の関係');
    });

    test('循環がある場合', () => {
      controller.addEdge('node1', 'node2', 'blocks');
      controller.addEdge('node2', 'node3', 'blocks');
      controller.addEdge('node3', 'node1', 'blocks');

      const summary = controller.generateSummary();

      expect(summary).toContain('循環あり');
    });
  });

  describe('WidgetResult生成', () => {
    test('基本的な結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('dependency_mapping');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('mapping');
    });

    test('ノードとエッジ情報が含まれる', () => {
      controller.addEdge('node1', 'node2', 'blocks');

      const result = controller.getResult('widget_1');

      expect(result.data.mapping?.items).toHaveLength(3);
      expect(result.data.composite?.edges).toHaveLength(1);
    });

    test('メタデータが含まれる', () => {
      controller.addEdge('node1', 'node2', 'blocks');

      const result = controller.getResult('widget_1');

      expect(result.metadata?.nodeCount).toBe(3);
      expect(result.metadata?.edgeCount).toBe(1);
    });
  });

  describe('リセット', () => {
    test('リセット後はエッジと選択がクリアされる', () => {
      controller.addEdge('node1', 'node2', 'blocks');
      controller.selectNode('node1');

      controller.reset();

      const state = controller.getState();
      expect(state.edges).toEqual([]);
      expect(state.selectedNodeId).toBeNull();
      // ノードは保持される
      expect(state.nodes).toEqual(DEFAULT_NODES);
    });
  });
});
