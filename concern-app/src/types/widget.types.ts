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
 * PortChangeCallback - ポート変更時のコールバック
 *
 * @param widgetId - Widget ID
 * @param portId - Port ID（例: 'balance', '_completed'）
 * @param value - 出力する値
 */
export type PortChangeCallback = (
  widgetId: string,
  portId: string,
  value: unknown
) => void;

/**
 * PortValueGetter - 入力ポートから値を取得する関数
 *
 * @param portKey - ポートキー（"widgetId.portId" 形式）
 * @returns ポートの現在値（未設定の場合はundefined）
 */
export type PortValueGetter = (portKey: string) => unknown;

/**
 * BaseWidgetProps - 全てのWidgetコンポーネントが受け取る共通Props
 *
 * Phase 4 - Task 2.2で拡張: Reactive Port対応を追加
 */
export interface BaseWidgetProps {
  /** Widget仕様 */
  spec: WidgetSpecObject;

  // --------------------------------------------------------------------------
  // 既存Props（後方互換性維持）
  // --------------------------------------------------------------------------

  /** Widget完了時のコールバック */
  onComplete?: (widgetId: string) => void;

  /** Widget状態更新時のコールバック */
  onUpdate?: (widgetId: string, data: unknown) => void;

  // --------------------------------------------------------------------------
  // Reactive Port対応 (Phase 4 Task 2.2)
  // --------------------------------------------------------------------------

  /**
   * ポート変更時のコールバック
   *
   * Widget内でemitPort()が呼ばれた時に発火。
   * ReactiveBindingEngineのupdatePort()に接続される。
   */
  onPortChange?: PortChangeCallback;

  /**
   * 入力ポートから値を取得する関数
   *
   * 他のWidgetから伝播された値を読み取る際に使用。
   * ReactiveBindingEngineのgetPortValue()に接続される。
   */
  getPortValue?: PortValueGetter;

  /**
   * 初期ポート値
   *
   * Widget初期化時に設定するポート値。
   * 予約ポート（_error, _completed）の初期状態を含む。
   */
  initialPortValues?: Record<string, unknown>;
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
