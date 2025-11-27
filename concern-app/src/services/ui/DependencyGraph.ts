/**
 * DependencyGraph.ts
 * Widget間の依存関係を管理するクラス
 *
 * Phase 4 - DSL v3
 * 循環依存の検出、トポロジカルソート、依存関係の実行を担当
 */

import type {
  DependencyGraphSpec,
  DependencySpec,
} from '../../types/ui-spec.types';

/**
 * DependencyGraph
 * Widget間の依存関係を管理し、更新順序を決定する
 */
export class DependencyGraph {
  private dependencies: Map<string, DependencySpec[]> = new Map();
  private nodes: Set<string> = new Set();

  constructor(spec?: DependencyGraphSpec) {
    if (spec) {
      this.buildFromSpec(spec);
    }
  }

  /**
   * 仕様からグラフを構築
   */
  private buildFromSpec(spec: DependencyGraphSpec): void {
    spec.dependencies.forEach((dep) => this.addDependency(dep));
  }

  /**
   * 依存関係を追加
   * @throws {Error} 循環依存が検出された場合
   */
  public addDependency(spec: DependencySpec): void {
    const sourceId = this.extractWidgetId(spec.source);
    const targetId = this.extractWidgetId(spec.target);

    // ノードを登録
    this.nodes.add(sourceId);
    this.nodes.add(targetId);

    // 循環依存チェック
    if (this.wouldCreateCycle(sourceId, targetId)) {
      throw new Error(
        `Circular dependency detected: ${spec.source} -> ${spec.target}`
      );
    }

    // 依存関係を追加
    if (!this.dependencies.has(sourceId)) {
      this.dependencies.set(sourceId, []);
    }
    this.dependencies.get(sourceId)!.push(spec);
  }

  /**
   * 依存関係を削除
   */
  public removeDependency(source: string, target: string): boolean {
    const sourceId = this.extractWidgetId(source);
    const deps = this.dependencies.get(sourceId);

    if (!deps) {
      return false;
    }

    const initialLength = deps.length;
    const filtered = deps.filter(
      (dep) => dep.source !== source || dep.target !== target
    );
    this.dependencies.set(sourceId, filtered);

    return filtered.length < initialLength;
  }

  /**
   * 循環依存が発生するかチェック（DFS）
   */
  private wouldCreateCycle(source: string, target: string): boolean {
    const visited = new Set<string>();

    const dfs = (node: string): boolean => {
      if (node === source) {
        return true; // 循環検出
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);

      const deps = this.dependencies.get(node) || [];
      for (const dep of deps) {
        const nextNode = this.extractWidgetId(dep.target);
        if (dfs(nextNode)) {
          return true;
        }
      }

      return false;
    };

    return dfs(target);
  }

  /**
   * 循環依存を検出
   */
  public detectCycle(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string): boolean => {
      if (recStack.has(node)) {
        return true; // 循環検出
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recStack.add(node);

      const deps = this.dependencies.get(node) || [];
      for (const dep of deps) {
        const targetNode = this.extractWidgetId(dep.target);
        if (dfs(targetNode)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of this.nodes) {
      if (dfs(node)) {
        return true;
      }
    }

    return false;
  }

  /**
   * トポロジカルソート（更新順序を決定）
   * @returns ノードIDの配列（更新すべき順序）
   */
  public getUpdateOrder(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // 入次数を初期化
    this.nodes.forEach((nodeId) => {
      inDegree.set(nodeId, 0);
    });

    // 入次数を計算
    this.dependencies.forEach((depList) => {
      depList.forEach((dep) => {
        const targetId = this.extractWidgetId(dep.target);
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
      });
    });

    // 入次数0のノードをキューに追加
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    // BFS
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const deps = this.dependencies.get(node) || [];
      deps.forEach((dep) => {
        const targetId = this.extractWidgetId(dep.target);
        const newDegree = (inDegree.get(targetId) || 0) - 1;
        inDegree.set(targetId, newDegree);

        if (newDegree === 0) {
          queue.push(targetId);
        }
      });
    }

    return result;
  }

  /**
   * 指定したソースの依存関係を取得
   */
  public getDependencies(sourceKey: string): DependencySpec[] {
    const widgetId = this.extractWidgetId(sourceKey);
    const allDeps = this.dependencies.get(widgetId) || [];

    // sourceKeyに完全一致するもののみを返す
    return allDeps.filter((dep) => dep.source === sourceKey);
  }

  /**
   * 指定したターゲットに依存している依存関係を取得
   */
  public getDependents(targetKey: string): DependencySpec[] {
    const result: DependencySpec[] = [];

    this.dependencies.forEach((depList) => {
      depList.forEach((dep) => {
        if (dep.target === targetKey) {
          result.push(dep);
        }
      });
    });

    return result;
  }

  /**
   * 全ての依存関係を取得
   */
  public getAllDependencies(): DependencySpec[] {
    const result: DependencySpec[] = [];

    this.dependencies.forEach((depList) => {
      result.push(...depList);
    });

    return result;
  }

  /**
   * Widget IDを抽出（"widgetId.propertyName" → "widgetId"）
   */
  private extractWidgetId(key: string): string {
    return key.split('.')[0];
  }

  /**
   * エッジ数を取得（テスト用）
   */
  public getEdgeCount(): number {
    let count = 0;
    this.dependencies.forEach((depList) => {
      count += depList.length;
    });
    return count;
  }

  /**
   * ノード数を取得（テスト用）
   */
  public getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * グラフをクリア
   */
  public clear(): void {
    this.dependencies.clear();
    this.nodes.clear();
  }
}
