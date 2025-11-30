/**
 * DependencyMappingController.ts
 * 依存関係マッピングWidgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * ノード間の依存関係を可視化・編集するWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * ノードの定義
 */
export interface DependencyNode {
  id: string;
  label: string;
  description?: string;
  color?: string;
  x?: number;
  y?: number;
}

/**
 * 接続（エッジ）の定義
 */
export interface DependencyEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  type: 'blocks' | 'requires' | 'influences' | 'custom';
}

/**
 * DependencyMappingの状態
 */
export interface DependencyMappingState {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  selectedNodeId: string | null;
}

/**
 * エッジタイプの色
 */
export const EDGE_TYPE_COLORS: Record<DependencyEdge['type'], string> = {
  blocks: '#ef4444',
  requires: '#3b82f6',
  influences: '#22c55e',
  custom: '#8b5cf6',
};

/**
 * エッジタイプのラベル
 */
export const EDGE_TYPE_LABELS: Record<DependencyEdge['type'], string> = {
  blocks: 'ブロック',
  requires: '必要',
  influences: '影響',
  custom: 'その他',
};

/**
 * デフォルトのノード
 */
export const DEFAULT_NODES: DependencyNode[] = [
  { id: 'node1', label: 'タスク1', x: 100, y: 100 },
  { id: 'node2', label: 'タスク2', x: 300, y: 100 },
  { id: 'node3', label: 'タスク3', x: 200, y: 250 },
];

/**
 * DependencyMappingController
 * 依存関係マッピングのロジック管理
 */
export class DependencyMappingController {
  private state: DependencyMappingState;
  private edgeIdCounter: number = 0;

  constructor(nodes?: DependencyNode[]) {
    this.state = {
      nodes: nodes ? [...nodes] : [...DEFAULT_NODES],
      edges: [],
      selectedNodeId: null,
    };
  }

  /**
   * ノードを設定
   */
  public setNodes(nodes: DependencyNode[]): void {
    this.state.nodes = nodes;
    // 存在しないノードへのエッジを削除
    this.state.edges = this.state.edges.filter(
      (e) =>
        nodes.some((n) => n.id === e.sourceId) &&
        nodes.some((n) => n.id === e.targetId)
    );
  }

  /**
   * ノードを追加
   */
  public addNode(node: DependencyNode): void {
    if (this.state.nodes.some((n) => n.id === node.id)) {
      throw new Error(`Node already exists: ${node.id}`);
    }
    this.state.nodes.push(node);
  }

  /**
   * ノードを削除
   */
  public removeNode(nodeId: string): void {
    this.state.nodes = this.state.nodes.filter((n) => n.id !== nodeId);
    this.state.edges = this.state.edges.filter(
      (e) => e.sourceId !== nodeId && e.targetId !== nodeId
    );
    if (this.state.selectedNodeId === nodeId) {
      this.state.selectedNodeId = null;
    }
  }

  /**
   * ノードの位置を更新
   */
  public updateNodePosition(nodeId: string, x: number, y: number): void {
    const node = this.state.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    node.x = x;
    node.y = y;
  }

  /**
   * ノードを選択
   */
  public selectNode(nodeId: string | null): void {
    if (nodeId && !this.state.nodes.some((n) => n.id === nodeId)) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    this.state.selectedNodeId = nodeId;
  }

  /**
   * エッジを追加
   */
  public addEdge(
    sourceId: string,
    targetId: string,
    type: DependencyEdge['type'],
    label?: string
  ): DependencyEdge {
    // ノードの存在確認
    if (!this.state.nodes.some((n) => n.id === sourceId)) {
      throw new Error(`Source node not found: ${sourceId}`);
    }
    if (!this.state.nodes.some((n) => n.id === targetId)) {
      throw new Error(`Target node not found: ${targetId}`);
    }

    // 自己参照の禁止
    if (sourceId === targetId) {
      throw new Error('Self-reference is not allowed');
    }

    // 重複エッジの確認
    const existingEdge = this.state.edges.find(
      (e) => e.sourceId === sourceId && e.targetId === targetId
    );
    if (existingEdge) {
      throw new Error('Edge already exists');
    }

    const edge: DependencyEdge = {
      id: `edge_${++this.edgeIdCounter}`,
      sourceId,
      targetId,
      type,
      label,
    };

    this.state.edges.push(edge);
    return edge;
  }

  /**
   * エッジを削除
   */
  public removeEdge(edgeId: string): void {
    this.state.edges = this.state.edges.filter((e) => e.id !== edgeId);
  }

  /**
   * 循環依存を検出
   */
  public detectCycle(): string[] | null {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const outgoingEdges = this.state.edges.filter(
        (e) => e.sourceId === nodeId
      );

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.targetId)) {
          if (dfs(edge.targetId)) {
            return true;
          }
        } else if (recursionStack.has(edge.targetId)) {
          // 循環を検出
          return true;
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of this.state.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return path;
        }
      }
    }

    return null;
  }

  /**
   * クリティカルパスを計算（最長パス）
   */
  public getCriticalPath(): string[] {
    const inDegree: Record<string, number> = {};
    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};

    // 初期化
    this.state.nodes.forEach((n) => {
      inDegree[n.id] = 0;
      dist[n.id] = 0;
      prev[n.id] = null;
    });

    // 入次数を計算
    this.state.edges.forEach((e) => {
      inDegree[e.targetId]++;
    });

    // トポロジカルソート順に処理
    const queue = this.state.nodes
      .filter((n) => inDegree[n.id] === 0)
      .map((n) => n.id);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const outgoing = this.state.edges.filter((e) => e.sourceId === nodeId);

      for (const edge of outgoing) {
        if (dist[nodeId] + 1 > dist[edge.targetId]) {
          dist[edge.targetId] = dist[nodeId] + 1;
          prev[edge.targetId] = nodeId;
        }

        inDegree[edge.targetId]--;
        if (inDegree[edge.targetId] === 0) {
          queue.push(edge.targetId);
        }
      }
    }

    // 最長パスを復元
    let maxDist = 0;
    let endNode = this.state.nodes[0]?.id || '';
    this.state.nodes.forEach((n) => {
      if (dist[n.id] > maxDist) {
        maxDist = dist[n.id];
        endNode = n.id;
      }
    });

    const path: string[] = [];
    let current: string | null = endNode;
    while (current) {
      path.unshift(current);
      current = prev[current];
    }

    return path;
  }

  /**
   * 現在の状態を取得
   */
  public getState(): DependencyMappingState {
    return { ...this.state };
  }

  /**
   * ノードへの入力エッジを取得
   */
  public getIncomingEdges(nodeId: string): DependencyEdge[] {
    return this.state.edges.filter((e) => e.targetId === nodeId);
  }

  /**
   * ノードからの出力エッジを取得
   */
  public getOutgoingEdges(nodeId: string): DependencyEdge[] {
    return this.state.edges.filter((e) => e.sourceId === nodeId);
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const nodeCount = this.state.nodes.length;
    const edgeCount = this.state.edges.length;
    const hasCycle = this.detectCycle() !== null;

    if (edgeCount === 0) {
      return `${nodeCount}個のノードがあります（関係なし）`;
    }

    let summary = `${nodeCount}個のノード、${edgeCount}個の関係`;
    if (hasCycle) {
      summary += '（循環あり）';
    }
    return summary;
  }

  /**
   * 逆方向のエッジが存在するか確認（双方向検出用）
   */
  public hasInverseEdge(sourceId: string, targetId: string): boolean {
    return this.state.edges.some(
      (e) => e.sourceId === targetId && e.targetId === sourceId
    );
  }

  /**
   * ノードのラベルを更新
   */
  public updateNodeLabel(nodeId: string, label: string): void {
    const node = this.state.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    node.label = label;
  }


  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    const criticalPath = this.getCriticalPath();
    const cycle = this.detectCycle();

    return {
      widgetId,
      component: 'dependency_mapping',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'mapping',
        mapping: {
          items: this.state.nodes.map((n) => ({
            id: n.id,
            label: n.label,
            position: { x: n.x || 0, y: n.y || 0 },
            relations: this.state.edges
              .filter((e) => e.sourceId === n.id)
              .map((e) => e.targetId),
          })),
        },
        composite: {
          nodes: this.state.nodes,
          edges: this.state.edges,
          criticalPath,
          hasCycle: cycle !== null,
          cyclePath: cycle,
          statistics: {
            nodeCount: this.state.nodes.length,
            edgeCount: this.state.edges.length,
            avgDegree:
              this.state.nodes.length > 0
                ? (this.state.edges.length * 2) / this.state.nodes.length
                : 0,
          },
        },
      },
      interactions: [],
      metadata: {
        nodeCount: this.state.nodes.length,
        edgeCount: this.state.edges.length,
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.edges = [];
    this.state.selectedNodeId = null;
  }
}
