/**
 * WidgetDefinition - Reactive Widget型システム
 *
 * Widget間のリアクティブなデータ連携を実現するための型定義。
 * LLMが生成するDependencyGraphの正確性検証に使用。
 *
 * @module WidgetDefinition
 * @since Phase 4 Task 2.2
 */

// =============================================================================
// Port データ型
// =============================================================================

/**
 * Portで扱えるデータ型
 */
export type PortDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'number[]'
  | 'object'
  | 'object[]';

/**
 * Port方向（片方向のみ）
 */
export type PortDirection = 'in' | 'out';

// =============================================================================
// Port 制約
// =============================================================================

/**
 * 数値範囲制約
 */
export interface RangeConstraint {
  type: 'range';
  min?: number;
  max?: number;
}

/**
 * 列挙値制約
 */
export interface EnumConstraint {
  type: 'enum';
  values: (string | number)[];
}

/**
 * 配列制約
 */
export interface ArrayConstraint {
  type: 'array';
  minLength?: number;
  maxLength?: number;
  itemType?: PortDataType;
}

/**
 * パターン制約（正規表現）
 */
export interface PatternConstraint {
  type: 'pattern';
  regex: string;
}

/**
 * Port制約の共用型
 */
export type PortConstraint =
  | RangeConstraint
  | EnumConstraint
  | ArrayConstraint
  | PatternConstraint;

// =============================================================================
// Reactive Port 定義
// =============================================================================

/**
 * Reactive Port定義
 *
 * Widgetの入出力ポートを定義する。
 * LLMがDependencyGraphを生成する際に参照される。
 */
export interface ReactivePortDefinition {
  /** ポートID（Widget内で一意） */
  id: string;

  /** ポート方向 */
  direction: PortDirection;

  /** データ型 */
  dataType: PortDataType;

  /** 説明（LLMプロンプト用） */
  description: string;

  /** デフォルト値 */
  defaultValue?: unknown;

  /** 値の制約 */
  constraints?: PortConstraint[];

  /** 必須フラグ */
  required?: boolean;
}

// =============================================================================
// Widget 定義
// =============================================================================

/**
 * Widgetのステージ（思考フェーズ）
 */
export type WidgetStage = 'diverge' | 'organize' | 'converge' | 'summary';

/**
 * Widgetメタデータ
 */
export interface WidgetMetadata {
  /** タイミング適性 (0.0-1.0, 早期→後期) */
  timing: number;

  /** 汎用性 (0.0-1.0) */
  versatility: number;

  /** 解消可能なボトルネック */
  bottleneck: string[];
}

/**
 * Widget定義
 *
 * 各Widgetのメタデータとポート定義を含む。
 * WidgetDefinitionGeneratorでLLMプロンプト生成に使用。
 */
export interface WidgetDefinition {
  /** Widget ID（システム全体で一意） */
  id: string;

  /** 表示名 */
  name: string;

  /** 説明（LLMプロンプト用） */
  description: string;

  /** 対応ステージ */
  stage: WidgetStage;

  /** ポート定義 */
  ports: {
    inputs: ReactivePortDefinition[];
    outputs: ReactivePortDefinition[];
  };

  /** 設定スキーマ (JSON Schema形式、オプション) */
  configSchema?: Record<string, unknown>;

  /** メタデータ */
  metadata: WidgetMetadata;
}

/**
 * Widget定義レジストリ
 */
export type WidgetDefinitionRegistry = Record<string, WidgetDefinition>;

// =============================================================================
// 予約Port
// =============================================================================

/**
 * 全Widgetに共通の予約Port
 *
 * - _error: エラー状態通知用
 * - _completed: 完了状態通知用
 */
export const RESERVED_PORTS = {
  ERROR: '_error',
  COMPLETED: '_completed',
} as const;

/**
 * 予約PortのID型
 */
export type ReservedPortId = (typeof RESERVED_PORTS)[keyof typeof RESERVED_PORTS];

/**
 * エラーPort値
 *
 * Widget内でエラーが発生した場合に_errorポートから出力される。
 */
export interface ErrorPortValue {
  /** エラーの有無 */
  hasError: boolean;

  /** エラーメッセージ配列 */
  messages: string[];
}

/**
 * 完了Port値
 *
 * Widgetの完了状態を_completedポートから出力する。
 * FlowValidationStateで「次へ」ボタン制御に使用。
 */
export interface CompletedPortValue {
  /** 完了フラグ */
  isCompleted: boolean;

  /** 未入力の必須フィールド（isCompleted=falseの場合） */
  requiredFields?: string[];
}

// =============================================================================
// ユーティリティ型
// =============================================================================

/**
 * ポートキー（"widgetId.portId" 形式）
 */
export type PortKey = `${string}.${string}`;

/**
 * ポートキーをパースした結果
 */
export interface ParsedPortKey {
  widgetId: string;
  portId: string;
}

/**
 * ポートキーをパースする
 */
export function parsePortKey(portKey: string): ParsedPortKey {
  const [widgetId, portId] = portKey.split('.');
  if (!widgetId || !portId) {
    throw new Error(`Invalid port key: ${portKey}. Expected format: "widgetId.portId"`);
  }
  return { widgetId, portId };
}

/**
 * ポートキーを生成する
 */
export function createPortKey(widgetId: string, portId: string): PortKey {
  return `${widgetId}.${portId}`;
}

/**
 * 予約ポートかどうかを判定
 */
export function isReservedPort(portId: string): portId is ReservedPortId {
  return Object.values(RESERVED_PORTS).includes(portId as ReservedPortId);
}

// =============================================================================
// 型ガード
// =============================================================================

/**
 * ErrorPortValueの型ガード
 */
export function isErrorPortValue(value: unknown): value is ErrorPortValue {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.hasError === 'boolean' && Array.isArray(v.messages);
}

/**
 * CompletedPortValueの型ガード
 */
export function isCompletedPortValue(value: unknown): value is CompletedPortValue {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.isCompleted === 'boolean';
}

// =============================================================================
// デフォルト値
// =============================================================================

/**
 * ErrorPortValueのデフォルト値
 */
export const DEFAULT_ERROR_PORT_VALUE: ErrorPortValue = {
  hasError: false,
  messages: [],
};

/**
 * CompletedPortValueのデフォルト値
 */
export const DEFAULT_COMPLETED_PORT_VALUE: CompletedPortValue = {
  isCompleted: false,
  requiredFields: [],
};
