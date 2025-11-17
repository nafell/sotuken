/**
 * dependency.types.ts
 * Dependency Graph実装層の型定義
 *
 * Phase 4 - DSL v3
 * このファイルはDependency Graph実装に必要な型を定義します。
 */

import type {
  DependencySpec,
  MechanismType,
  UpdateMode,
  RelationshipSpec,
} from './ui-spec.types';

// ============================================================
// Dependency Graph実装用の型
// ============================================================

/**
 * DependencyNode - 依存関係グラフのノード
 */
export interface DependencyNode {
  id: string;          // Widget ID
  type: 'widget';
  outputs?: string[];  // 出力プロパティ名のリスト
  inputs?: string[];   // 入力プロパティ名のリスト
}

/**
 * DependencyEdge - 依存関係グラフのエッジ
 */
export interface DependencyEdge {
  id: string;
  source: string;      // "widgetId.propertyName"
  target: string;      // "widgetId.propertyName"
  mechanism: MechanismType;
  relationship: RelationshipSpec;
  updateMode: UpdateMode;
}

/**
 * UpdateResult - 依存関係の更新結果
 */
export interface UpdateResult {
  type: 'update' | 'validation_error';
  target: string;
  value?: any;
  message?: string;
}

/**
 * DependencyGraphData - DependencyGraphが管理するデータ
 */
export interface DependencyGraphData {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, DependencyEdge>;
  adjacencyList: Map<string, string[]>; // nodeId -> 依存先nodeId[]
}

/**
 * CycleDetectionResult - 循環依存検出の結果
 */
export interface CycleDetectionResult {
  hasCycle: boolean;
  cycle?: string[];  // 循環しているノードのパス
}

// ============================================================
// DependencyExecutor関連の型
// ============================================================

/**
 * ExecutionContext - 依存関係実行時のコンテキスト
 */
export interface ExecutionContext {
  source: any;        // ソースの値
  target?: any;       // ターゲットの現在値（validation時に使用）
  metadata?: Record<string, any>;
}

/**
 * TransformResult - 変換関数の実行結果
 */
export interface TransformResult {
  success: boolean;
  value?: any;
  error?: string;
}

/**
 * ValidationResult - バリデーション結果
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

// ============================================================
// Export DependencySpec for convenience
// ============================================================

export type { DependencySpec, MechanismType, UpdateMode, RelationshipSpec };
