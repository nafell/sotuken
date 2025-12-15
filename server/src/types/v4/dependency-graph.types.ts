/**
 * DependencyGraph Type Definitions for DSL v4
 *
 * TDDM層（ORS内）に配置されるデータ間依存関係グラフ。
 * Jelly Framework準拠で、「データ間の依存関係」を定義する。
 *
 * 注意: Widget間のUI連携は ReactiveBinding（UISpec層）で定義する。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @see specs/discussions/DSLv4_review_minutes.md トピック2
 * @since DSL v4.0
 */

import type { DICT, SVAL, EntityAttributePath } from './ors.types';

// =============================================================================
// 依存関係メカニズム
// =============================================================================

/**
 * 依存関係メカニズム
 *
 * - validate: ソースの変更時にターゲットの値を検証
 * - update: ソースの変更時にターゲットの値を更新
 */
export type DependencyMechanism = 'validate' | 'update';

// =============================================================================
// 関係仕様
// =============================================================================

/**
 * JavaScript式による関係
 */
export interface JavaScriptRelationship {
  type: 'javascript';
  /**
   * JavaScript式
   * - `source`: ソースの値
   * - `target`: ターゲットの現在値
   * - 戻り値: updateの場合は新しい値、validateの場合はboolean
   */
  javascript: string;
}

/**
 * 変換式による関係
 */
export interface TransformRelationship {
  type: 'transform';
  /**
   * 変換式
   * サポートされる変換:
   * - map: 配列要素の変換
   * - filter: 配列要素のフィルタリング
   * - reduce: 配列の集約
   * - pick: オブジェクトから特定のキーを抽出
   */
  transform: string;
  /** 変換パラメータ */
  params?: DICT<SVAL>;
}

/**
 * LLMによる関係
 */
export interface LLMRelationship {
  type: 'llm';
  /**
   * LLMに渡すプロンプト
   * プレースホルダー:
   * - {{source}}: ソースの値
   * - {{target}}: ターゲットの現在値
   * - {{context}}: 追加コンテキスト
   */
  llmPrompt: string;
  /** 追加コンテキスト */
  context?: DICT<SVAL>;
}

/**
 * 関係仕様（共用型）
 */
export type RelationshipSpec = JavaScriptRelationship | TransformRelationship | LLMRelationship;

// =============================================================================
// データ依存関係
// =============================================================================

/**
 * データ依存関係
 *
 * エンティティ・属性間の依存関係を定義。
 * ソースの変更時にターゲットに対してアクションを実行する。
 */
export interface DataDependency {
  /** 依存関係ID（DependencyGraph内で一意） */
  id: string;

  /**
   * ソース（依存元）
   * 形式: "entityId.attributeName"
   */
  source: EntityAttributePath;

  /**
   * ターゲット（依存先）
   * 形式: "entityId.attributeName"
   */
  target: EntityAttributePath;

  /**
   * メカニズム
   * - validate: ソースの変更時にターゲットの値を検証
   * - update: ソースの変更時にターゲットの値を更新
   */
  mechanism: DependencyMechanism;

  /**
   * 関係仕様
   * 依存関係の具体的な実装方法
   */
  relationship: RelationshipSpec;

  /**
   * 説明（デバッグ・ドキュメント用）
   */
  description?: string;

  /**
   * 優先度（0が最高、複数の依存が同時に発火する場合の順序）
   */
  priority?: number;

  /**
   * 有効フラグ
   */
  enabled?: boolean;
}

// =============================================================================
// 依存関係グラフ
// =============================================================================

/**
 * DependencyGraph メタデータ
 */
export interface DependencyGraphMetadata {
  /** バージョン */
  version: string;
  /** 生成日時（Unix timestamp） */
  generatedAt: number;
  /** 使用したLLMモデル */
  llmModel?: string;
  /** カスタムメタデータ */
  custom?: DICT<SVAL>;
}

/**
 * DependencyGraph（依存関係グラフ）
 *
 * TDDM層（ORS内）に配置され、エンティティ・属性間のデータ依存関係を管理。
 *
 * 責務:
 * - データ間の依存関係の定義
 * - ソースの変更時にターゲットへのアクション（validate/update）を実行
 *
 * 注意:
 * - Widget間のUI連携は ReactiveBinding（UISpec層）で定義
 * - 参照形式は "entityId.attributeName"
 */
export interface DependencyGraph {
  /** データ依存関係のリスト */
  dependencies: DataDependency[];

  /** メタデータ */
  metadata?: DependencyGraphMetadata;
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * DependencyGraphを作成する
 */
export function createDependencyGraph(
  dependencies: DataDependency[] = [],
  metadata?: Partial<DependencyGraphMetadata>
): DependencyGraph {
  return {
    dependencies,
    metadata: {
      version: '4.0',
      generatedAt: Date.now(),
      ...metadata,
    },
  };
}

/**
 * DataDependencyを作成する
 */
export function createDataDependency(
  id: string,
  source: EntityAttributePath,
  target: EntityAttributePath,
  mechanism: DependencyMechanism,
  relationship: RelationshipSpec,
  options?: Partial<Pick<DataDependency, 'description' | 'priority' | 'enabled'>>
): DataDependency {
  return {
    id,
    source,
    target,
    mechanism,
    relationship,
    enabled: true,
    ...options,
  };
}

/**
 * JavaScript式による関係を作成する
 */
export function createJavaScriptRelationship(expression: string): JavaScriptRelationship {
  return {
    type: 'javascript',
    javascript: expression,
  };
}

/**
 * 変換式による関係を作成する
 */
export function createTransformRelationship(
  transform: string,
  params?: DICT<SVAL>
): TransformRelationship {
  return {
    type: 'transform',
    transform,
    params,
  };
}

/**
 * LLMによる関係を作成する
 */
export function createLLMRelationship(
  prompt: string,
  context?: DICT<SVAL>
): LLMRelationship {
  return {
    type: 'llm',
    llmPrompt: prompt,
    context,
  };
}

// =============================================================================
// 型ガード
// =============================================================================

/**
 * DependencyMechanismの型ガード
 */
export function isDependencyMechanism(value: unknown): value is DependencyMechanism {
  return value === 'validate' || value === 'update';
}

/**
 * JavaScriptRelationshipの型ガード
 */
export function isJavaScriptRelationship(value: unknown): value is JavaScriptRelationship {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === 'javascript' && typeof v.javascript === 'string';
}

/**
 * TransformRelationshipの型ガード
 */
export function isTransformRelationship(value: unknown): value is TransformRelationship {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === 'transform' && typeof v.transform === 'string';
}

/**
 * LLMRelationshipの型ガード
 */
export function isLLMRelationship(value: unknown): value is LLMRelationship {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === 'llm' && typeof v.llmPrompt === 'string';
}

/**
 * RelationshipSpecの型ガード
 */
export function isRelationshipSpec(value: unknown): value is RelationshipSpec {
  return (
    isJavaScriptRelationship(value) ||
    isTransformRelationship(value) ||
    isLLMRelationship(value)
  );
}

/**
 * DataDependencyの型ガード
 */
export function isDataDependency(value: unknown): value is DataDependency {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.source === 'string' &&
    typeof v.target === 'string' &&
    isDependencyMechanism(v.mechanism) &&
    isRelationshipSpec(v.relationship)
  );
}

/**
 * DependencyGraphの型ガード
 */
export function isDependencyGraph(value: unknown): value is DependencyGraph {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.dependencies) && v.dependencies.every(isDataDependency);
}

// =============================================================================
// グラフ解析ユーティリティ
// =============================================================================

/**
 * 特定のソースに依存する全ての依存関係を取得
 */
export function getDependenciesBySource(
  graph: DependencyGraph,
  source: EntityAttributePath
): DataDependency[] {
  return graph.dependencies.filter((dep) => dep.source === source && dep.enabled !== false);
}

/**
 * 特定のターゲットを持つ全ての依存関係を取得
 */
export function getDependenciesByTarget(
  graph: DependencyGraph,
  target: EntityAttributePath
): DataDependency[] {
  return graph.dependencies.filter((dep) => dep.target === target && dep.enabled !== false);
}

/**
 * 特定のエンティティに関連する全ての依存関係を取得
 */
export function getDependenciesByEntity(
  graph: DependencyGraph,
  entityId: string
): DataDependency[] {
  return graph.dependencies.filter(
    (dep) =>
      (dep.source.startsWith(`${entityId}.`) || dep.target.startsWith(`${entityId}.`)) &&
      dep.enabled !== false
  );
}

/**
 * 依存関係のトポロジカルソート（循環検出付き）
 *
 * @returns ソートされた依存関係ID、または循環が検出された場合はnull
 */
export function topologicalSort(graph: DependencyGraph): string[] | null {
  const dependencies = graph.dependencies.filter((dep) => dep.enabled !== false);
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // グラフ構築
  for (const dep of dependencies) {
    if (!adjacency.has(dep.source)) {
      adjacency.set(dep.source, []);
    }
    adjacency.get(dep.source)!.push(dep.target);

    if (!inDegree.has(dep.source)) {
      inDegree.set(dep.source, 0);
    }
    inDegree.set(dep.target, (inDegree.get(dep.target) || 0) + 1);
  }

  // カーンのアルゴリズム
  const queue: string[] = [];
  const result: string[] = [];

  inDegree.forEach((degree, node) => {
    if (degree === 0) {
      queue.push(node);
    }
  });

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    for (const neighbor of adjacency.get(node) || []) {
      const newDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // 循環検出
  if (result.length !== inDegree.size) {
    return null; // 循環あり
  }

  // 依存関係IDに変換
  return dependencies
    .filter((dep) => result.includes(dep.source))
    .sort((a, b) => result.indexOf(a.source) - result.indexOf(b.source))
    .map((dep) => dep.id);
}
