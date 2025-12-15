/**
 * UISpec Type Definitions for DSL v4
 *
 * UISpec層の型定義。
 * 3段階LLM呼び出しの第3段階で生成される。
 * Widget構成、ReactiveBinding、DataBindingを含む。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

import type { DICT, SVAL, StageType, EntityAttributePath } from './ors.types';
import type { ReactiveBindingSpec } from './reactive-binding.types';
import type { WidgetComponentType } from './widget-selection.types';

// =============================================================================
// Layout Types
// =============================================================================

/**
 * レイアウトタイプ
 */
export type LayoutType = 'full' | 'half' | 'third' | 'quarter' | 'auto';

/**
 * 画面レイアウト
 */
export interface ScreenLayout {
  /** レイアウトタイプ */
  type: 'single_column' | 'two_column' | 'grid' | 'flex';
  /** カラム数（gridの場合） */
  columns?: number;
  /** ギャップ（px） */
  gap?: number;
  /** パディング */
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

// =============================================================================
// Data Binding
// =============================================================================

/**
 * DataBinding方向
 *
 * - in: ORSからWidgetへの入力
 * - out: Widgetから ORS への出力
 * - inout: 双方向バインディング
 */
export type DataBindingDirection = 'in' | 'out' | 'inout';

/**
 * DataBindingSpec
 *
 * WidgetのPortとORSのEntity.Attributeの対応を定義。
 * Widget初期値の取得とWidget出力のORS反映に使用。
 */
export interface DataBindingSpec {
  /** WidgetのPort ID */
  portId: string;

  /**
   * ORS上のEntity.Attribute
   * 形式: "entityId.attributeName"
   */
  entityAttribute: EntityAttributePath;

  /** バインディング方向 */
  direction: DataBindingDirection;

  /**
   * 変換関数（オプション）
   * ORSの値とWidget値の間の変換
   */
  transform?: {
    /** ORSからWidgetへの変換 */
    toWidget?: string;
    /** WidgetからORSへの変換 */
    toORS?: string;
  };
}

// =============================================================================
// Widget Spec
// =============================================================================

/**
 * WidgetSpec メタデータ
 */
export interface WidgetSpecMetadata {
  /** Widget選定時の目的 */
  purpose?: string;
  /** 生成に使用したコンテキスト */
  context?: DICT<SVAL>;
  /** カスタムメタデータ */
  custom?: DICT<SVAL>;
}

/**
 * WidgetConfig
 *
 * Widget固有の設定パラメータ
 */
export type WidgetConfig = Record<string, unknown>;

/**
 * WidgetSpec
 *
 * 1つのWidgetの仕様を定義。
 * コンポーネント種別、位置、設定、DataBindingを含む。
 */
export interface WidgetSpec {
  /** Widget ID（UISpec内で一意） */
  id: string;

  /** Widgetコンポーネント種別 */
  component: WidgetComponentType;

  /** 表示順序（0から開始） */
  position: number;

  /** レイアウト設定 */
  layout?: LayoutType;

  /** Widget固有の設定 */
  config: WidgetConfig;

  /**
   * ORSとのDataBinding
   * Widget PortとORS Entity.Attributeの対応
   */
  dataBindings: DataBindingSpec[];

  /** メタデータ */
  metadata: WidgetSpecMetadata;
}

// =============================================================================
// UISpec
// =============================================================================

/**
 * UISpec メタデータ
 */
export interface UISpecMetadata {
  /** 生成日時（Unix timestamp） */
  generatedAt: number;
  /** 使用したLLMモデル */
  llmModel: string;
  /** ORS参照（ORSのバージョンまたはID） */
  orsRef?: string;
  /** Widget選定結果参照 */
  widgetSelectionRef?: string;
  /** LLM呼び出しレイテンシ（ミリ秒） */
  latencyMs?: number;
  /** カスタムメタデータ */
  custom?: DICT<SVAL>;
}

/**
 * UISpec
 *
 * DSL v4のUISpec層の中核。
 * 3段階LLM呼び出しの第3段階で生成される。
 *
 * 責務:
 * - Widget構成の定義
 * - Widget間のReactiveBinding
 * - ORSとのDataBinding
 * - レイアウト設定
 */
export interface UISpec {
  /** UISpecバージョン */
  version: '4.0';

  /** セッションID */
  sessionId: string;

  /** ステージ */
  stage: StageType;

  /** Widgetリスト（positionでソート済み） */
  widgets: WidgetSpec[];

  /**
   * Widget間のReactiveBinding
   * Widget間のリアクティブなUI連携を定義
   */
  reactiveBindings: ReactiveBindingSpec;

  /** 画面レイアウト */
  layout: ScreenLayout;

  /** メタデータ */
  metadata: UISpecMetadata;
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * 空のUISpecを作成
 */
export function createEmptyUISpec(
  sessionId: string,
  stage: StageType,
  llmModel: string
): UISpec {
  return {
    version: '4.0',
    sessionId,
    stage,
    widgets: [],
    reactiveBindings: {
      bindings: [],
    },
    layout: {
      type: 'single_column',
    },
    metadata: {
      generatedAt: Date.now(),
      llmModel,
    },
  };
}

/**
 * WidgetSpecを作成
 */
export function createWidgetSpec(
  id: string,
  component: WidgetComponentType,
  position: number,
  config: WidgetConfig = {},
  dataBindings: DataBindingSpec[] = [],
  options?: Partial<Pick<WidgetSpec, 'layout' | 'metadata'>>
): WidgetSpec {
  return {
    id,
    component,
    position,
    config,
    dataBindings,
    metadata: {},
    ...options,
  };
}

/**
 * DataBindingSpecを作成
 */
export function createDataBindingSpec(
  portId: string,
  entityAttribute: EntityAttributePath,
  direction: DataBindingDirection,
  transform?: DataBindingSpec['transform']
): DataBindingSpec {
  return {
    portId,
    entityAttribute,
    direction,
    transform,
  };
}

/**
 * UISpecからWidgetを検索
 */
export function findWidgetById(uiSpec: UISpec, widgetId: string): WidgetSpec | undefined {
  return uiSpec.widgets.find((w) => w.id === widgetId);
}

/**
 * UISpecからWidgetをコンポーネント種別で検索
 */
export function findWidgetsByComponent(
  uiSpec: UISpec,
  component: WidgetComponentType
): WidgetSpec[] {
  return uiSpec.widgets.filter((w) => w.component === component);
}

/**
 * UISpecのWidgetをpositionでソート
 */
export function sortWidgetsByPosition(uiSpec: UISpec): UISpec {
  return {
    ...uiSpec,
    widgets: [...uiSpec.widgets].sort((a, b) => a.position - b.position),
  };
}

/**
 * WidgetのDataBindingから特定のポートのバインディングを取得
 */
export function getDataBindingByPort(
  widget: WidgetSpec,
  portId: string
): DataBindingSpec | undefined {
  return widget.dataBindings.find((db) => db.portId === portId);
}

/**
 * UISpec内の全DataBindingを取得
 */
export function getAllDataBindings(uiSpec: UISpec): Array<{ widgetId: string; binding: DataBindingSpec }> {
  const result: Array<{ widgetId: string; binding: DataBindingSpec }> = [];
  for (const widget of uiSpec.widgets) {
    for (const binding of widget.dataBindings) {
      result.push({ widgetId: widget.id, binding });
    }
  }
  return result;
}

// =============================================================================
// 型ガード
// =============================================================================

/**
 * LayoutTypeの型ガード
 */
export function isLayoutType(value: unknown): value is LayoutType {
  return (
    value === 'full' ||
    value === 'half' ||
    value === 'third' ||
    value === 'quarter' ||
    value === 'auto'
  );
}

/**
 * DataBindingDirectionの型ガード
 */
export function isDataBindingDirection(value: unknown): value is DataBindingDirection {
  return value === 'in' || value === 'out' || value === 'inout';
}

/**
 * DataBindingSpecの型ガード
 */
export function isDataBindingSpec(value: unknown): value is DataBindingSpec {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.portId === 'string' &&
    typeof v.entityAttribute === 'string' &&
    isDataBindingDirection(v.direction)
  );
}

/**
 * WidgetSpecの型ガード
 */
export function isWidgetSpec(value: unknown): value is WidgetSpec {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.component === 'string' &&
    typeof v.position === 'number' &&
    typeof v.config === 'object' &&
    Array.isArray(v.dataBindings) &&
    v.dataBindings.every(isDataBindingSpec)
  );
}

/**
 * ScreenLayoutの型ガード
 */
export function isScreenLayout(value: unknown): value is ScreenLayout {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const validTypes = ['single_column', 'two_column', 'grid', 'flex'];
  return typeof v.type === 'string' && validTypes.includes(v.type);
}

/**
 * UISpecの型ガード
 */
export function isUISpec(value: unknown): value is UISpec {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  if (v.version !== '4.0') return false;
  if (typeof v.sessionId !== 'string') return false;
  if (typeof v.stage !== 'string') return false;
  if (!Array.isArray(v.widgets)) return false;
  if (!v.widgets.every(isWidgetSpec)) return false;
  if (typeof v.reactiveBindings !== 'object') return false;
  if (!isScreenLayout(v.layout)) return false;
  if (typeof v.metadata !== 'object') return false;

  return true;
}

// =============================================================================
// 後方互換性（v3からの移行用）
// =============================================================================

/**
 * v3 UISpecからv4 UISpecへの変換（部分的）
 *
 * 注意: 完全な変換は不可能な場合がある
 * DataBindingとReactiveBindingは新規で設定が必要
 */
export interface V3ToV4MigrationOptions {
  /** セッションID */
  sessionId: string;
  /** LLMモデル名 */
  llmModel: string;
  /** デフォルトのDataBinding */
  defaultDataBindings?: DataBindingSpec[];
}

/**
 * v3 WidgetSpecの部分的な型定義（移行用）
 */
export interface V3WidgetSpecPartial {
  id: string;
  component: string;
  position?: number;
  config?: Record<string, unknown>;
}

/**
 * v3 UISpecの部分的な型定義（移行用）
 */
export interface V3UISpecPartial {
  version?: string;
  stage?: string;
  widgets?: V3WidgetSpecPartial[];
  layout?: Partial<ScreenLayout>;
}

/**
 * v3形式のWidgetSpecをv4形式に変換
 */
export function migrateV3WidgetSpec(
  v3Widget: V3WidgetSpecPartial,
  position: number,
  defaultDataBindings: DataBindingSpec[] = []
): WidgetSpec {
  return {
    id: v3Widget.id,
    component: v3Widget.component as WidgetComponentType,
    position: v3Widget.position ?? position,
    config: v3Widget.config ?? {},
    dataBindings: defaultDataBindings,
    metadata: {
      context: { migratedFrom: 'v3' },
    },
  };
}

// =============================================================================
// generatedValue Types (v4.1)
// =============================================================================

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

// =============================================================================
// PlanUISpec Types (v5.0)
// =============================================================================

/**
 * セクションタイプ
 * Planフェーズの3セクション
 *
 * @since DSL v5.0
 */
export type SectionType = 'diverge' | 'organize' | 'converge';

/**
 * セクションヘッダー
 *
 * @since DSL v5.0
 */
export interface SectionHeader {
  /** セクションタイトル（例: "発散", "整理", "収束"） */
  title: string;
  /** セクション説明文 */
  description: string;
}

/**
 * セクション仕様
 *
 * PlanUISpec内の各セクション（diverge/organize/converge）の仕様
 *
 * @since DSL v5.0
 */
export interface SectionSpec {
  /** セクションヘッダー */
  header: SectionHeader;
  /** セクション内のWidget配列 */
  widgets: WidgetSpec[];
}

/**
 * Planレイアウト
 *
 * @since DSL v5.0
 */
export interface PlanLayout {
  /** レイアウトタイプ（固定: 'sectioned'） */
  type: 'sectioned';
  /** セクション間のギャップ（px） */
  sectionGap: number;
  /** セクション順序 */
  sectionOrder?: SectionType[];
}

/**
 * PlanUISpec
 *
 * DSL v5.0で追加されたPlanフェーズ用のUISpec。
 * diverge/organize/convergeの3セクションを1ページに統合。
 *
 * @since DSL v5.0
 */
export interface PlanUISpec {
  /** UISpecバージョン */
  version: '5.0';

  /** セッションID */
  sessionId: string;

  /** ステージ（固定: 'plan'） */
  stage: 'plan';

  /** 3セクション構造 */
  sections: {
    diverge: SectionSpec;
    organize: SectionSpec;
    converge: SectionSpec;
  };

  /**
   * セクション横断のReactiveBinding
   * diverge→organize→converge間のW2WRを定義
   */
  reactiveBindings: ReactiveBindingSpec;

  /** Planレイアウト */
  layout: PlanLayout;

  /** メタデータ */
  metadata: UISpecMetadata;
}

/**
 * 空のPlanUISpecを作成
 *
 * @since DSL v5.0
 */
export function createEmptyPlanUISpec(
  sessionId: string,
  llmModel: string
): PlanUISpec {
  const emptySection: SectionSpec = {
    header: { title: '', description: '' },
    widgets: [],
  };

  return {
    version: '5.0',
    sessionId,
    stage: 'plan',
    sections: {
      diverge: { ...emptySection, header: { title: '発散', description: 'アイデアを広げる' } },
      organize: { ...emptySection, header: { title: '整理', description: '構造化する' } },
      converge: { ...emptySection, header: { title: '収束', description: '優先順位をつける' } },
    },
    reactiveBindings: {
      bindings: [],
    },
    layout: {
      type: 'sectioned',
      sectionGap: 24,
      sectionOrder: ['diverge', 'organize', 'converge'],
    },
    metadata: {
      generatedAt: Date.now(),
      llmModel,
    },
  };
}

/**
 * SectionSpecの型ガード
 *
 * @since DSL v5.0
 */
export function isSectionSpec(value: unknown): value is SectionSpec {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.header === 'object' &&
    v.header !== null &&
    typeof (v.header as Record<string, unknown>).title === 'string' &&
    typeof (v.header as Record<string, unknown>).description === 'string' &&
    Array.isArray(v.widgets)
  );
}

/**
 * PlanLayoutの型ガード
 *
 * @since DSL v5.0
 */
export function isPlanLayout(value: unknown): value is PlanLayout {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === 'sectioned' && typeof v.sectionGap === 'number';
}

/**
 * PlanUISpecの型ガード
 *
 * @since DSL v5.0
 */
export function isPlanUISpec(value: unknown): value is PlanUISpec {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  if (v.version !== '5.0') return false;
  if (typeof v.sessionId !== 'string') return false;
  if (v.stage !== 'plan') return false;
  if (typeof v.sections !== 'object' || v.sections === null) return false;

  const sections = v.sections as Record<string, unknown>;
  if (!isSectionSpec(sections.diverge)) return false;
  if (!isSectionSpec(sections.organize)) return false;
  if (!isSectionSpec(sections.converge)) return false;

  if (typeof v.reactiveBindings !== 'object') return false;
  if (!isPlanLayout(v.layout)) return false;
  if (typeof v.metadata !== 'object') return false;

  return true;
}

/**
 * UISpec または PlanUISpec の統合型
 *
 * @since DSL v5.0
 */
export type AnyUISpec = UISpec | PlanUISpec;

/**
 * AnyUISpecからWidgetを全て取得
 *
 * @since DSL v5.0
 */
export function getAllWidgetsFromUISpec(uiSpec: AnyUISpec): WidgetSpec[] {
  if (isPlanUISpec(uiSpec)) {
    return [
      ...uiSpec.sections.diverge.widgets,
      ...uiSpec.sections.organize.widgets,
      ...uiSpec.sections.converge.widgets,
    ];
  }
  return uiSpec.widgets;
}

/**
 * AnyUISpecからWidgetを検索
 *
 * @since DSL v5.0
 */
export function findWidgetInAnyUISpec(uiSpec: AnyUISpec, widgetId: string): WidgetSpec | undefined {
  return getAllWidgetsFromUISpec(uiSpec).find((w) => w.id === widgetId);
}
