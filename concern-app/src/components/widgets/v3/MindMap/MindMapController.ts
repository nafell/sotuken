/**
 * MindMapController.ts
 * マインドマップWidgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * 中心テーマから放射状にアイデアを展開するWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * マインドマップノードの定義
 */
export interface MindMapNode {
  id: string;
  text: string;
  parentId: string | null;
  level: number;
  color?: string;
  collapsed?: boolean;
}

/**
 * MindMapの状態
 */
export interface MindMapState {
  centerTopic: string;
  nodes: MindMapNode[];
  selectedNodeId: string | null;
}

/**
 * レベルごとの色
 */
export const LEVEL_COLORS: string[] = [
  '#3b82f6', // Level 0 - Blue (center)
  '#22c55e', // Level 1 - Green
  '#f59e0b', // Level 2 - Amber
  '#8b5cf6', // Level 3 - Purple
  '#ef4444', // Level 4+ - Red
];

/**
 * MindMapController
 * マインドマップのロジック管理
 */
export class MindMapController {
  private state: MindMapState;
  private nodeIdCounter: number = 0;

  constructor(centerTopic: string = '中心テーマ') {
    this.state = {
      centerTopic,
      nodes: [],
      selectedNodeId: null,
    };
  }

  /**
   * 中心テーマを設定
   */
  public setCenterTopic(topic: string): void {
    this.state.centerTopic = topic;
  }

  /**
   * ノードを追加
   */
  public addNode(text: string, parentId: string | null): MindMapNode {
    // 親ノードのレベルを取得
    let level = 1;
    if (parentId) {
      const parentNode = this.state.nodes.find((n) => n.id === parentId);
      if (parentNode) {
        level = parentNode.level + 1;
      }
    }

    const node: MindMapNode = {
      id: `mind_node_${++this.nodeIdCounter}`,
      text,
      parentId,
      level,
      color: LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)],
    };

    this.state.nodes.push(node);
    return node;
  }

  /**
   * ノードを更新
   */
  public updateNode(nodeId: string, text: string): void {
    const node = this.state.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    node.text = text;
  }

  /**
   * ノードを削除（子ノードも含む）
   */
  public removeNode(nodeId: string): void {
    const nodesToRemove = new Set<string>();

    // 削除対象のノードを再帰的に収集
    const collectNodes = (id: string) => {
      nodesToRemove.add(id);
      this.state.nodes
        .filter((n) => n.parentId === id)
        .forEach((n) => collectNodes(n.id));
    };

    collectNodes(nodeId);

    this.state.nodes = this.state.nodes.filter((n) => !nodesToRemove.has(n.id));

    if (nodesToRemove.has(this.state.selectedNodeId || '')) {
      this.state.selectedNodeId = null;
    }
  }

  /**
   * ノードを選択
   */
  public selectNode(nodeId: string | null): void {
    this.state.selectedNodeId = nodeId;
  }

  /**
   * ノードの折りたたみ/展開
   */
  public toggleCollapse(nodeId: string): void {
    const node = this.state.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    node.collapsed = !node.collapsed;
  }

  /**
   * 子ノードを取得
   */
  public getChildren(parentId: string | null): MindMapNode[] {
    return this.state.nodes.filter((n) => n.parentId === parentId);
  }

  /**
   * ルートノード（レベル1）を取得
   */
  public getRootNodes(): MindMapNode[] {
    return this.state.nodes.filter((n) => n.level === 1);
  }

  /**
   * ノードが表示されるべきか（親が折りたたまれていないか）
   */
  public isNodeVisible(nodeId: string): boolean {
    const node = this.state.nodes.find((n) => n.id === nodeId);
    if (!node || !node.parentId) return true;

    const parent = this.state.nodes.find((n) => n.id === node.parentId);
    if (!parent) return true;

    if (parent.collapsed) return false;
    return this.isNodeVisible(parent.id);
  }

  /**
   * 現在の状態を取得
   */
  public getState(): MindMapState {
    return { ...this.state };
  }

  /**
   * ノードの総数を取得
   */
  public getNodeCount(): number {
    return this.state.nodes.length;
  }

  /**
   * レベルごとのノード数を取得
   */
  public getLevelCounts(): Record<number, number> {
    const counts: Record<number, number> = {};
    this.state.nodes.forEach((node) => {
      counts[node.level] = (counts[node.level] || 0) + 1;
    });
    return counts;
  }

  /**
   * 最大深度を取得
   */
  public getMaxDepth(): number {
    if (this.state.nodes.length === 0) return 0;
    return Math.max(...this.state.nodes.map((n) => n.level));
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const nodeCount = this.state.nodes.length;
    const maxDepth = this.getMaxDepth();

    if (nodeCount === 0) {
      return `「${this.state.centerTopic}」のマインドマップ（項目なし）`;
    }

    return `「${this.state.centerTopic}」: ${nodeCount}項目、最大${maxDepth}階層`;
  }

  /**
   * ツリー構造を生成
   */
  private buildTree(parentId: string | null = null): any[] {
    const children = this.getChildren(parentId);
    return children.map((node) => ({
      id: node.id,
      text: node.text,
      level: node.level,
      children: this.buildTree(node.id),
    }));
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    const tree = this.buildTree();
    const levelCounts = this.getLevelCounts();

    return {
      widgetId,
      component: 'mind_map',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'mapping',
        mapping: {
          items: this.state.nodes.map((node) => ({
            id: node.id,
            label: node.text,
            category: `level_${node.level}`,
            relations: node.parentId ? [node.parentId] : [],
          })),
        },
        composite: {
          centerTopic: this.state.centerTopic,
          tree,
          nodes: this.state.nodes,
          statistics: {
            totalNodes: this.state.nodes.length,
            maxDepth: this.getMaxDepth(),
            levelCounts,
            avgNodesPerLevel:
              Object.keys(levelCounts).length > 0
                ? this.state.nodes.length / Object.keys(levelCounts).length
                : 0,
          },
        },
      },
      interactions: [],
      metadata: {
        nodeCount: this.state.nodes.length,
        maxDepth: this.getMaxDepth(),
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.nodes = [];
    this.state.selectedNodeId = null;
    this.nodeIdCounter = 0;
  }
}
