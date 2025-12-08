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
// DSL v5: PlanUISpec (Plan統合用)
// =============================================================================

/**
 * セクション種別 (Plan統合用)
 */
export type SectionType = 'diverge' | 'organize' | 'converge';

/**
 * セクションヘッダー
 */
export interface SectionHeader {
  title: string;
  description: string;
}

/**
 * セクションSpec
 */
export interface SectionSpec {
  header: SectionHeader;
  widgets: WidgetSpec[];
}

/**
 * Plan用レイアウト
 */
export interface PlanLayout {
  type: 'sectioned';
  sectionGap: number;
  sectionOrder?: SectionType[];
}

/**
 * PlanUISpec
 *
 * DSL v5のPlanフェーズ統合生成で使用。
 * diverge/organize/convergeの3セクションを1ページに表示。
 */
export interface PlanUISpec {
  /** UISpecバージョン（DSL v5） */
  version: '5.0';

  /** セッションID */
  sessionId: string;

  /** ステージ（常に'plan'） */
  stage: 'plan';

  /** セクション */
  sections: {
    diverge: SectionSpec;
    organize: SectionSpec;
    converge: SectionSpec;
  };

  /** Widget間のReactiveBinding（セクション横断） */
  reactiveBindings: ReactiveBindingSpec;

  /** 画面レイアウト */
  layout: PlanLayout;

  /** メタデータ */
  metadata: UISpecMetadata;
}

/**
 * PlanUISpecの型ガード
 */
export function isPlanUISpec(value: unknown): value is PlanUISpec {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === '5.0' &&
    v.stage === 'plan' &&
    typeof v.sections === 'object' &&
    typeof v.reactiveBindings === 'object' &&
    typeof v.layout === 'object' &&
    typeof v.metadata === 'object'
  );
}

/**
 * AnyUISpec型（v4 UISpec または v5 PlanUISpec）
 */
export type AnyUISpec = UISpec | PlanUISpec;

/**
 * PlanUISpecをUISpecに変換（UIRendererV4で使用するため）
 *
 * 3セクションのWidgetをフラット化して1つのUISpecとして返す。
 * セクションヘッダーは各セクションの最初のWidgetのconfigに含める。
 */
export function flattenPlanUISpecToUISpec(planUISpec: PlanUISpec): UISpec {
  const allWidgets: WidgetSpec[] = [];
  let position = 0;

  const sectionOrder: SectionType[] = planUISpec.layout.sectionOrder || ['diverge', 'organize', 'converge'];

  for (const sectionType of sectionOrder) {
    const section = planUISpec.sections[sectionType];
    if (!section) continue;

    // セクション内のWidgetをpositionを振り直して追加
    for (const widget of section.widgets) {
      allWidgets.push({
        ...widget,
        position: position++,
        // セクション情報をmetadataに追加
        metadata: {
          ...widget.metadata,
          context: {
            ...(widget.metadata.context || {}),
            section: sectionType,
            sectionTitle: section.header.title,
            sectionDescription: section.header.description,
          },
        },
      });
    }
  }

  return {
    version: '4.0',
    sessionId: planUISpec.sessionId,
    stage: 'diverge', // Plan統合の場合、stageは便宜上'diverge'とする
    widgets: allWidgets,
    reactiveBindings: planUISpec.reactiveBindings,
    layout: {
      type: 'single_column',
      gap: planUISpec.layout.sectionGap,
    },
    metadata: planUISpec.metadata,
  };
}

/**
 * UISpecまたはPlanUISpecをUIRendererV4用のUISpecに変換
 */
export function normalizeToUISpec(spec: AnyUISpec): UISpec {
  if (isPlanUISpec(spec)) {
    return flattenPlanUISpecToUISpec(spec);
  }
  return spec;
}
