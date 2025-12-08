/**
 * ui-spec.types.ts
 * UISpec/OODM/DpG型定義（DSL層）
 *
 * Phase 4 - DSL v3
 * このファイルはLLMが生成する抽象仕様（DSL）の型定義を含みます。
 */

// ============================================================
// OODM (Object-Oriented Data Model) - DSL
// ============================================================

/**
 * プリミティブ型（DSLv3 Core Spec v3.0）
 */
export type SVAL = string | number | boolean | null;
export type ARRY<T> = T[];
export type DICT<T> = { [key: string]: T };

/**
 * PNTR - エンティティまたは属性への参照
 */
export interface PNTR {
  ref: string;               // 参照先のID
  type: 'entity' | 'attribute';
}

/**
 * Constraint - 属性の制約
 */
export interface Constraint {
  type: 'required' | 'min' | 'max' | 'pattern' | 'enum';
  value: any;
  message?: string;          // エラーメッセージ
}

/**
 * Attribute（属性）
 * エンティティの特性を定義
 *
 * DSLv3 Core Spec v3.0から引用
 */
export interface Attribute {
  name: string;              // 属性名
  value: SVAL | ARRY<SVAL> | PNTR | DICT<SVAL>;
  type: 'sval' | 'arry' | 'pntr' | 'dict';
  constraints?: Constraint[];  // 制約（オプション）
}

/**
 * Entity（エンティティ）
 * データの基本単位。UIコンポーネントや情報の塊を表現
 *
 * DSLv3 Core Spec v3.0から引用
 */
export interface Entity {
  id: string;                // 一意識別子
  type: string;              // エンティティタイプ
  attributes: Attribute[];   // 属性リスト
  metadata?: DICT<SVAL>;     // メタデータ（オプション）
}

/**
 * OODM (DSL)
 * Object-Oriented Data Model
 * ユーザーの悩みに関するデータ構造を定義
 *
 * DSLv3 Core Spec v3.0のDataSchemaに相当
 */
export interface OODM {
  version: string;           // スキーマバージョン
  entities: Entity[];        // エンティティリスト
  metadata?: DICT<SVAL>;     // メタデータ
}

// ============================================================
// DependencyGraphSpec (Dependency Graph) - DSL
// ============================================================

export type UpdateMode = 'realtime' | 'debounced' | 'on_confirm';
export type MechanismType = 'validate' | 'update';

export type TransformFunction =
  | 'calculate_ranking'
  | 'calculate_balance'
  | 'filter_high_priority'
  | 'generate_summary'
  | 'detect_gaps'
  | ((source: any) => any);

/**
 * RelationshipSpec - 依存関係の変換方法
 */
export interface RelationshipSpec {
  type: 'javascript' | 'transform' | 'llm';
  javascript?: string;        // JavaScriptコード
  transform?: TransformFunction;  // 組み込み変換関数
  llmPrompt?: string;         // LLMプロンプト
}

/**
 * DependencySpec - 個別の依存関係定義
 */
export interface DependencySpec {
  source: string;             // "widgetId.propertyName"
  target: string;             // "widgetId.propertyName"
  mechanism: MechanismType;
  relationship: RelationshipSpec;
  updateMode: UpdateMode;
}

/**
 * DependencyGraphSpec (DSL)
 * Widget間の依存関係を定義
 * LLMの主要な動的生成対象
 */
export interface DependencyGraphSpec {
  dependencies: DependencySpec[];
  metadata?: {
    version: string;
    generatedAt: number;
  };
}

// ============================================================
// WidgetSpec - DSL
// ============================================================

/**
 * WidgetComponentType
 * プリセットWidget（12種）のID
 * Widget Registryに事前登録されている
 *
 * DSLv3 Plan Requirements v3.0 (UC01-UC18) から選定
 */
export type WidgetComponentType =
  // 発散フェーズ (diverge) - 3種
  | 'brainstorm_cards'        // UC01: ブレインストームカード
  | 'question_card_chain'     // UC03: 質問カード連鎖
  | 'emotion_palette'         // UC05: 感情カラーパレット

  // 整理フェーズ (organize) - 4種
  | 'card_sorting'            // UC09: カード仕分けUI
  | 'dependency_mapping'      // UC10: 依存関係マッピング
  | 'swot_analysis'           // UC11: SWOT分析UI
  | 'mind_map'                // UC04: マインドマップ生成

  // 収束フェーズ (converge) - 4種
  | 'matrix_placement'        // UC12: マトリックス配置
  | 'tradeoff_balance'        // UC13: トレードオフ天秤
  | 'priority_slider_grid'    // UC14: 優先度スライダーグリッド
  | 'timeline_slider'         // UC06: 時間軸スライダー

  // まとめフェーズ (summary) - 1種
  | 'structured_summary';     // UC18: 構造化文章まとめ

export type StageType = 'diverge' | 'organize' | 'converge' | 'summary';
export type LayoutType = 'single' | 'split_horizontal' | 'split_vertical';

export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'string[]'
  | 'number[]'
  | 'object[]';

/**
 * DataBinding - データの入出力バインディング
 */
export interface DataBinding {
  name: string;
  type: DataType;
  source?: string;      // "widgetId.outputName" 形式
  required?: boolean;
  defaultValue?: any;
  description?: string;
}

/**
 * ReactiveBinding - リアクティブな依存関係
 */
export interface ReactiveBinding {
  source: string;       // "widgetId.propertyName"
  target: string;       // "widgetId.propertyName"
  mechanism: MechanismType;
  relationship: RelationshipSpec;
  updateMode: UpdateMode;
}

/**
 * WidgetConfig - Widget固有の設定
 */
export interface WidgetConfig {
  prompt?: string;
  [key: string]: any; // Widget固有の設定を許可
}

/**
 * WidgetMetadata - Widgetのメタデータ
 */
export interface WidgetMetadata {
  timing: number;        // 0.0-1.0
  versatility: number;   // 0.0-1.0
  bottleneck: string[];
  description?: string;
}

/**
 * WidgetSpec (DSL)
 * LLMが生成する個別Widgetの仕様（プリセットWidgetへの参照+設定）
 */
export interface WidgetSpec {
  id: string;
  component: WidgetComponentType; // プリセットWidgetのID
  position: number;              // 表示順序
  layout?: LayoutType;
  config: WidgetConfig;          // プリセットWidgetへの設定
  inputs?: DataBinding[];
  outputs?: DataBinding[];
  reactiveBindings?: ReactiveBinding[];
  metadata: WidgetMetadata;
}

// ============================================================
// UISpec - DSL
// ============================================================

/**
 * ScreenLayout - 画面レイアウト設定
 */
export interface ScreenLayout {
  type: 'sequential' | 'grid' | 'custom';
  config?: Record<string, any>;
}

/**
 * UISpecMetadata - UISpec生成時のメタデータ
 */
export interface UISpecMetadata {
  generatedAt: number;
  llmModel: string;
  tokenCount: number;
  version: string;               // DSLバージョン
}

/**
 * UISpec (DSL)
 * LLMが生成する画面全体のUI仕様
 */
export interface UISpec {
  sessionId: string;
  stage: StageType;
  oodm: OODM;                    // データモデル（DSL）
  dpg: DependencyGraphSpec;      // 依存関係グラフ（DSL）
  widgets: WidgetSpec[];         // Widget仕様の配列（DSL）
  layout: ScreenLayout;
  metadata: UISpecMetadata;
}

// ============================================================
// generatedValue Types (v4.1)
// ============================================================

/**
 * 生成されたサンプルアイテム
 *
 * LLMがUISpec生成時に生成するサンプルデータ。
 * isGenerated: true により生成コンテンツであることを識別。
 *
 * @since DSL v4.1
 */
export interface GeneratedSampleItem {
  /** アイテムID */
  id: string;
  /** テキスト内容 */
  text: string;
  /** 色（オプション） */
  color?: string;
  /** 生成コンテンツマーカー（常にtrue） */
  isGenerated: true;
  /** その他のプロパティ */
  [key: string]: unknown;
}

/**
 * 生成コンテンツのコンテナ
 *
 * WidgetSpec.config内に配置される生成コンテンツのコンテナ。
 *
 * @since DSL v4.1
 */
export interface GeneratedContentContainer<T = GeneratedSampleItem> {
  /** 生成されたアイテムの配列 */
  items: T[];
  /** コンテナレベルの生成マーカー（常にtrue） */
  isGenerated: true;
}

/**
 * GeneratedSampleItemの型ガード
 */
export function isGeneratedSampleItem(value: unknown): value is GeneratedSampleItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.text === 'string' &&
    v.isGenerated === true
  );
}

/**
 * GeneratedContentContainerの型ガード
 */
export function isGeneratedContentContainer(value: unknown): value is GeneratedContentContainer {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.items) &&
    v.isGenerated === true
  );
}
