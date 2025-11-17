/**
 * widget.types.ts
 * Widget実装層の型定義
 *
 * Phase 4 - DSL v3
 * このファイルはWidget実装（パース後、実行時）の型を定義します。
 */

import type {
  WidgetComponentType,
  WidgetConfig,
  WidgetMetadata,
  LayoutType,
  StageType,
  ScreenLayout,
  UISpecMetadata,
} from './ui-spec.types';

// ============================================================
// 実装層の型（DSL Parserがパースして生成）
// ============================================================

/**
 * DataBindingObject - パース後のデータバインディング
 */
export interface DataBindingObject {
  name: string;
  type: string;
  source?: string;
  required?: boolean;
  defaultValue?: any;
  description?: string;
}

/**
 * ReactiveBindingObject - パース後のリアクティブバインディング
 */
export interface ReactiveBindingObject {
  source: string;
  target: string;
  mechanism: 'validate' | 'update';
  relationship: {
    type: 'javascript' | 'transform' | 'llm';
    javascript?: string;
    transform?: string | ((source: any) => any);
    llmPrompt?: string;
  };
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
}

/**
 * WidgetSpecObject (実装)
 * DSL ParserがWidgetSpec（DSL）をパースして生成
 */
export interface WidgetSpecObject {
  id: string;
  component: WidgetComponentType;
  position: number;
  layout?: LayoutType;
  config: Record<string, any>;   // パース済み設定
  inputs?: DataBindingObject[];
  outputs?: DataBindingObject[];
  reactiveBindings?: ReactiveBindingObject[];
  metadata: WidgetMetadata;
}

/**
 * OODMObject (実装)
 * DSL ParserがOODM（DSL）をパースして生成
 */
export interface OODMObject {
  version: string;
  entities: any[];        // パース済みEntity（ui-spec.typesのEntityと同じ構造）
  metadata?: Record<string, any>;
}

/**
 * UISpecObject (実装)
 * DSL ParserがUISpec（DSL）をパースして生成
 *
 * 注意: dpgは実装クラスDependencyGraphのインスタンスになる
 */
export interface UISpecObject {
  sessionId: string;
  stage: StageType;
  oodm: OODMObject;              // パース済みOODM
  dpg: any;                      // DependencyGraphインスタンス（dependency.typesで定義）
  widgets: WidgetSpecObject[];   // パース済みWidget仕様
  layout: ScreenLayout;
  metadata: UISpecMetadata;
}

// ============================================================
// Widget Props - React Component用
// ============================================================

/**
 * BaseWidgetProps - 全てのWidgetコンポーネントが受け取る共通Props
 */
export interface BaseWidgetProps {
  spec: WidgetSpecObject;
  onComplete?: (widgetId: string) => void;
  onUpdate?: (widgetId: string, data: any) => void;
}

// ============================================================
// Widget Registry - プリセットWidget管理
// ============================================================

/**
 * WidgetRegistryEntry - Widget Registryのエントリ
 */
export interface WidgetRegistryEntry {
  id: WidgetComponentType;
  name: string;
  description: string;
  stage: StageType;
  component: React.ComponentType<BaseWidgetProps>;
  defaultConfig: WidgetConfig;
  metadata: WidgetMetadata;
}

/**
 * WidgetRegistry - プリセットWidgetの管理
 */
export type WidgetRegistry = Record<WidgetComponentType, WidgetRegistryEntry>;
