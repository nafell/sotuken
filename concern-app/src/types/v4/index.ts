/**
 * DSL v4 Type Definitions Index (Frontend)
 *
 * DSL v4の全型定義をエクスポート
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

// =============================================================================
// Widget Definition v4
// =============================================================================
export {
  // Port関連
  type PortDataType,
  type PortDirection,
  type PortConstraint,
  type ReactivePortDefinition,
  // Stage
  type WidgetStage,
  // メタデータ
  type WidgetMetadataV3,
  type WidgetMetadataV4,
  // Widget定義
  type WidgetDefinitionV4,
  type WidgetDefinitionRegistryV4,
  // Complexity関連
  type ComplexityRules,
  DEFAULT_COMPLEXITY_RULES,
  isComplexityUnderThreshold,
  calculateTotalComplexity,
  countHighComplexityWidgets,
  validateStageComplexity,
  // 型ガード
  isWidgetMetadataV4,
  isWidgetDefinitionV4,
} from './widget-definition.types';

// =============================================================================
// ORS (Object-Relational Schema) - TDDM層
// =============================================================================
export {
  // 抽象型
  type StructuralType,
  type ConcreteType,
  type SVAL,
  type ARRY,
  type PNTR,
  type DICT,
  // 属性関連
  type Constraint,
  type GenerationSpec,
  type Attribute,
  // エンティティ関連
  type Entity,
  // ORS本体
  type ORSMetadata,
  type StageType,
  type ORS,
  // DependencyGraph（前方参照用）
  type DependencyGraph as ORSDependencyGraph,
  type DataDependency as ORSDataDependency,
  type RelationshipSpec as ORSRelationshipSpec,
  // ユーティリティ型
  type EntityAttributePath,
  type ParsedEntityAttributePath,
  // ユーティリティ関数
  parseEntityAttributePath,
  createEntityAttributePath,
  // 型ガード
  isStructuralType,
  isConcreteType,
  isEntity,
  isORS,
} from './ors.types';

// =============================================================================
// DependencyGraph - TDDM層（ORS内）
// =============================================================================
export {
  // メカニズム
  type DependencyMechanism,
  // 関係仕様
  type JavaScriptRelationship,
  type TransformRelationship,
  type LLMRelationship,
  type RelationshipSpec,
  // データ依存関係
  type DataDependency,
  // DependencyGraph本体
  type DependencyGraphMetadata,
  type DependencyGraph,
  // ファクトリ関数
  createDependencyGraph,
  createDataDependency,
  createJavaScriptRelationship,
  createTransformRelationship,
  createLLMRelationship,
  // 型ガード
  isDependencyMechanism,
  isJavaScriptRelationship,
  isTransformRelationship,
  isLLMRelationship,
  isRelationshipSpec,
  isDataDependency,
  isDependencyGraph,
  // グラフ解析
  getDependenciesBySource,
  getDependenciesByTarget,
  getDependenciesByEntity,
  topologicalSort,
} from './dependency-graph.types';

// =============================================================================
// ReactiveBinding - UISpec層
// =============================================================================
export {
  // Widget Port参照
  type WidgetPortPath,
  type ParsedWidgetPortPath,
  parseWidgetPortPath,
  createWidgetPortPath,
  // 更新モード
  type UpdateMode,
  // Widget間関係仕様
  type WidgetJavaScriptRelationship,
  type WidgetTransformRelationship,
  type WidgetLLMRelationship,
  type PassthroughRelationship,
  type WidgetRelationshipSpec,
  // ReactiveBinding
  type BindingMechanism,
  type ReactiveBinding,
  // ReactiveBindingSpec本体
  type ReactiveBindingSpecMetadata,
  type ReactiveBindingSpec,
  // ファクトリ関数
  createReactiveBindingSpec,
  createReactiveBinding,
  createPassthroughRelationship,
  createWidgetJavaScriptRelationship,
  createWidgetTransformRelationship,
  createWidgetLLMRelationship,
  // 型ガード
  isBindingMechanism,
  isUpdateMode,
  isPassthroughRelationship,
  isWidgetJavaScriptRelationship,
  isWidgetTransformRelationship,
  isWidgetLLMRelationship,
  isWidgetRelationshipSpec,
  isReactiveBinding,
  isReactiveBindingSpec,
  // バインディング解析
  getBindingsBySourceWidget,
  getBindingsByTargetWidget,
  getBindingsBySourcePort,
  getBindingsByTargetPort,
  getAllWidgetIds as getAllReactiveBindingWidgetIds,
} from './reactive-binding.types';

// =============================================================================
// WidgetSelection - 第1段階LLM出力
// =============================================================================
export {
  // Widget種別
  type WidgetComponentType,
  // 選定Widget
  type SelectedWidget,
  type SuggestedBinding,
  // ステージ選定
  type StageSelection,
  // Widget選定結果
  type WidgetSelectionMetadata,
  type WidgetSelectionResult,
  // 定数
  STAGE_ORDER,
  STAGE_NAMES,
  STAGE_DISPLAY_NAMES,
  // ユーティリティ関数
  getNextStage,
  getPreviousStage,
  getStageIndex,
  getStageByIndex,
  createEmptyStageSelection,
  createEmptyWidgetSelectionResult,
  getWidgetIdsForStage,
  getAllWidgetIds as getAllSelectionWidgetIds,
  getTotalWidgetCount,
  // 型ガード
  isWidgetComponentType,
  isSelectedWidget,
  isStageSelection,
  isWidgetSelectionResult,
} from './widget-selection.types';

// =============================================================================
// UISpec - UISpec層
// =============================================================================
export {
  // レイアウト
  type LayoutType,
  type ScreenLayout,
  // DataBinding
  type DataBindingDirection,
  type DataBindingSpec,
  // WidgetSpec
  type WidgetSpecMetadata,
  type WidgetConfig,
  type WidgetSpec,
  // UISpec本体
  type UISpecMetadata,
  type UISpec,
  // ファクトリ関数
  createEmptyUISpec,
  createWidgetSpec,
  createDataBindingSpec,
  // 検索関数
  findWidgetById,
  findWidgetsByComponent,
  sortWidgetsByPosition,
  getDataBindingByPort,
  getAllDataBindings,
  // 型ガード
  isLayoutType,
  isDataBindingDirection,
  isDataBindingSpec,
  isWidgetSpec,
  isScreenLayout,
  isUISpec,
  // 移行用
  type V3ToV4MigrationOptions,
  type V3WidgetSpecPartial,
  type V3UISpecPartial,
  migrateV3WidgetSpec,
} from './ui-spec.types';
