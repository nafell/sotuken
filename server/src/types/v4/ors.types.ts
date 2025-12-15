/**
 * ORS (Object-Relational Schema) Type Definitions for DSL v4
 *
 * Jelly Framework準拠の3層DSL構造のデータモデル層。
 * TDDM (Task-Driven Data Model) の一部として機能し、
 * 抽象型（SVAL/ARRY/PNTR/DICT）を使用してデータ構造を定義する。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

// =============================================================================
// 抽象型定義 (Jelly Framework準拠)
// =============================================================================

/**
 * 構造的データ型（抽象型）
 *
 * Jelly論文で定義された4つの基本構造型。
 * TDDM層（ORS）では抽象型を使用し、UISpec層では具体型を使用する。
 */
export type StructuralType = 'SVAL' | 'ARRY' | 'PNTR' | 'DICT';

/**
 * 具体的データ型
 *
 * UISpec層で使用される実際のデータ型。
 */
export type ConcreteType = 'string' | 'number' | 'boolean' | 'date' | 'object';

/**
 * SVAL (Scalar Value) - スカラー値
 * 単一の値を表す基本型
 */
export type SVAL = string | number | boolean | Date;

/**
 * ARRY (Array) - 配列型
 * 同一型の要素の順序付きコレクション
 */
export type ARRY<T = unknown> = T[];

/**
 * PNTR (Pointer) - ポインタ型
 * 他のエンティティへの参照
 * 形式: "entityId.attributeName"
 */
export type PNTR = string;

/**
 * DICT (Dictionary) - 辞書型
 * キー・バリューペアのコレクション
 */
export type DICT<T = SVAL> = Record<string, T>;

// =============================================================================
// 属性定義
// =============================================================================

/**
 * 属性制約
 */
export interface Constraint {
  /** 制約の種類 */
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'enum';
  /** 制約の値 */
  value: unknown;
  /** エラーメッセージ */
  message?: string;
}

/**
 * 生成仕様（generatedValue）
 *
 * LLMによって生成される値の仕様。
 * - label: UIの「枠」を埋めるラベル・説明文
 * - sample: ユーザー入力の叩き台となるサンプルデータ
 */
export interface GenerationSpec {
  /** 生成タイプ */
  type: 'label' | 'sample';
  /** 生成に使用するプロンプト */
  prompt: string;
  /** 生成コンテキスト（参照する他の属性など） */
  context?: string[];
}

/**
 * 属性定義
 *
 * エンティティが持つ各属性を定義する。
 * 構造型と具体型の両方を指定可能。
 */
export interface Attribute {
  /** 属性名 */
  name: string;

  /**
   * 構造的データ型（抽象型）
   * - SVAL: スカラー値
   * - ARRY: 配列
   * - PNTR: 他エンティティへの参照
   * - DICT: 辞書（キー・バリュー）
   */
  structuralType: StructuralType;

  /**
   * 具体的データ型（SVAL/DICTの値の型）
   * structuralTypeがSVALまたはDICTの場合に指定
   */
  valueType?: ConcreteType;

  /**
   * 配列要素の構造型（ARRYの場合）
   */
  itemType?: StructuralType;

  /**
   * 配列要素の具体型（ARRYでitemTypeがSVALの場合）
   */
  itemValueType?: ConcreteType;

  /**
   * 参照先（PNTRの場合）
   * 形式: "entityId.attributeName"
   */
  ref?: PNTR;

  /**
   * オブジェクトスキーマ（ARRY<object>やDICT<object>の場合）
   * JSON Schema形式
   */
  schema?: Record<string, unknown>;

  /**
   * 値の制約
   */
  constraints?: Constraint[];

  /**
   * 生成仕様（LLMで生成される値の場合）
   */
  generation?: GenerationSpec;

  /**
   * 説明（LLMプロンプト用）
   */
  description?: string;

  /**
   * デフォルト値
   */
  defaultValue?: unknown;
}

// =============================================================================
// エンティティ定義
// =============================================================================

/**
 * エンティティ定義
 *
 * データモデル内の1つのエンティティ（オブジェクト）を表す。
 * Widget間で共有されるデータの構造を定義。
 */
export interface Entity {
  /** エンティティID（ORS内で一意） */
  id: string;

  /**
   * エンティティタイプ
   * - concern: ユーザーの関心事
   * - stage_data: ステージ固有のデータ
   * - widget_data: Widget固有のデータ
   * - shared_data: Widget間共有データ
   */
  type: 'concern' | 'stage_data' | 'widget_data' | 'shared_data';

  /** 属性定義のリスト */
  attributes: Attribute[];

  /** メタデータ */
  metadata?: DICT<SVAL>;
}

// =============================================================================
// ORS (Object-Relational Schema)
// =============================================================================

/**
 * ORS メタデータ
 */
export interface ORSMetadata {
  /** 生成日時（Unix timestamp） */
  generatedAt: number;
  /** 使用したLLMモデル */
  llmModel: string;
  /** セッションID */
  sessionId: string;
  /** ステージ */
  stage: StageType;
  /** カスタムメタデータ */
  custom?: DICT<SVAL>;
}

/**
 * ステージ種別
 */
export type StageType = 'diverge' | 'organize' | 'converge' | 'summary';

/**
 * DSL v5: Plan統合ステージ種別
 * Planフェーズで使用される3つのセクション
 */
export type PlanSectionType = 'diverge' | 'organize' | 'converge';

/**
 * ORS (Object-Relational Schema)
 *
 * DSL v4のTDDM層（データモデル層）の中核。
 * Jelly Framework準拠の3段階LLM呼び出しの第2段階で生成される。
 *
 * 責務:
 * - データ構造の定義（エンティティ・属性）
 * - データ間の依存関係（DependencyGraph）の保持
 * - generatedValueの管理
 */
export interface ORS {
  /** ORSバージョン */
  version: '4.0';

  /** エンティティ定義のリスト */
  entities: Entity[];

  /**
   * 依存関係グラフ
   * エンティティ・属性間のデータ依存を定義
   * 別ファイル (dependency-graph.types.ts) で型定義
   */
  dependencyGraph: DependencyGraph;

  /** メタデータ */
  metadata: ORSMetadata;
}

// =============================================================================
// 依存関係グラフ（前方参照用、詳細は dependency-graph.types.ts）
// =============================================================================

/**
 * 依存関係グラフ（前方参照用インターフェース）
 *
 * 詳細な型定義は dependency-graph.types.ts を参照。
 * ここでは循環参照を避けるため最小限の定義のみ。
 */
export interface DependencyGraph {
  /** データ依存関係のリスト */
  dependencies: DataDependency[];
  /** メタデータ */
  metadata?: {
    version: string;
    generatedAt: number;
  };
}

/**
 * データ依存関係（前方参照用インターフェース）
 */
export interface DataDependency {
  /** 依存関係ID */
  id: string;
  /** ソース（"entityId.attributeName"形式） */
  source: string;
  /** ターゲット（"entityId.attributeName"形式） */
  target: string;
  /** メカニズム */
  mechanism: 'validate' | 'update';
  /** 関係仕様 */
  relationship: RelationshipSpec;
}

/**
 * 関係仕様
 */
export interface RelationshipSpec {
  /** 関係の実装タイプ */
  type: 'javascript' | 'transform' | 'llm';
  /** JavaScript式（type='javascript'の場合） */
  javascript?: string;
  /** 変換式（type='transform'の場合） */
  transform?: string;
  /** LLMプロンプト（type='llm'の場合） */
  llmPrompt?: string;
}

// =============================================================================
// ユーティリティ型
// =============================================================================

/**
 * エンティティ属性パス
 * 形式: "entityId.attributeName"
 */
export type EntityAttributePath = `${string}.${string}`;

/**
 * エンティティ属性パスをパースした結果
 */
export interface ParsedEntityAttributePath {
  entityId: string;
  attributeName: string;
}

/**
 * エンティティ属性パスをパースする
 */
export function parseEntityAttributePath(path: string): ParsedEntityAttributePath {
  const [entityId, attributeName] = path.split('.');
  if (!entityId || !attributeName) {
    throw new Error(`Invalid entity attribute path: ${path}. Expected format: "entityId.attributeName"`);
  }
  return { entityId, attributeName };
}

/**
 * エンティティ属性パスを生成する
 */
export function createEntityAttributePath(entityId: string, attributeName: string): EntityAttributePath {
  return `${entityId}.${attributeName}`;
}

// =============================================================================
// 型ガード
// =============================================================================

/**
 * StructuralTypeの型ガード
 */
export function isStructuralType(value: unknown): value is StructuralType {
  return value === 'SVAL' || value === 'ARRY' || value === 'PNTR' || value === 'DICT';
}

/**
 * ConcreteTypeの型ガード
 */
export function isConcreteType(value: unknown): value is ConcreteType {
  return (
    value === 'string' ||
    value === 'number' ||
    value === 'boolean' ||
    value === 'date' ||
    value === 'object'
  );
}

/**
 * Entityの型ガード
 */
export function isEntity(value: unknown): value is Entity {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.type === 'string' &&
    Array.isArray(v.attributes)
  );
}

/**
 * ORSの型ガード
 */
export function isORS(value: unknown): value is ORS {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === '4.0' &&
    Array.isArray(v.entities) &&
    typeof v.dependencyGraph === 'object' &&
    typeof v.metadata === 'object'
  );
}

// =============================================================================
// DSL v5: PlanORS (Plan統合用)
// =============================================================================

/**
 * PlanORS メタデータ
 * Plan統合生成用の拡張メタデータ
 */
export interface PlanORSMetadata {
  /** 生成日時（Unix timestamp） */
  generatedAt: number;
  /** 使用したLLMモデル */
  llmModel: string;
  /** セッションID */
  sessionId: string;
  /** ユーザーの悩み */
  concernText: string;
  /** ボトルネックタイプ */
  bottleneckType: string;
  /** 含まれるセクション */
  sections: PlanSectionType[];
  /** カスタムメタデータ */
  custom?: DICT<SVAL>;
}

/**
 * PlanORS (Plan統合ORS)
 *
 * DSL v5のPlanフェーズ統合生成で使用。
 * diverge/organize/convergeの3セクション分のデータ構造を1つのORSで定義。
 */
export interface PlanORS {
  /** ORSバージョン（DSL v5） */
  version: '5.0';

  /** Planメタデータ */
  planMetadata: {
    concernText: string;
    bottleneckType: string;
    sections: PlanSectionType[];
  };

  /** エンティティ定義のリスト */
  entities: Entity[];

  /**
   * 依存関係グラフ
   * セクション間のデータ依存を定義
   */
  dependencyGraph: DependencyGraph;

  /** メタデータ */
  metadata: PlanORSMetadata;
}

/**
 * PlanORSの型ガード
 */
export function isPlanORS(value: unknown): value is PlanORS {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === '5.0' &&
    typeof v.planMetadata === 'object' &&
    Array.isArray(v.entities) &&
    typeof v.dependencyGraph === 'object' &&
    typeof v.metadata === 'object'
  );
}

/**
 * 空のPlanORSを作成
 */
export function createEmptyPlanORS(
  sessionId: string,
  concernText: string,
  bottleneckType: string,
  llmModel: string
): PlanORS {
  return {
    version: '5.0',
    planMetadata: {
      concernText,
      bottleneckType,
      sections: ['diverge', 'organize', 'converge'],
    },
    entities: [
      {
        id: 'concern',
        type: 'concern',
        attributes: [
          {
            name: 'text',
            structuralType: 'SVAL',
            valueType: 'string',
            description: 'ユーザーの元の悩みテキスト',
          },
        ],
      },
    ],
    dependencyGraph: {
      dependencies: [],
      metadata: {
        version: '5.0',
        generatedAt: Date.now(),
      },
    },
    metadata: {
      generatedAt: Date.now(),
      llmModel,
      sessionId,
      concernText,
      bottleneckType,
      sections: ['diverge', 'organize', 'converge'],
    },
  };
}

/**
 * AnyORS型（v4 ORS または v5 PlanORS）
 */
export type AnyORS = ORS | PlanORS;

/**
 * AnyORSの型ガード
 */
export function isAnyORS(value: unknown): value is AnyORS {
  return isORS(value) || isPlanORS(value);
}
