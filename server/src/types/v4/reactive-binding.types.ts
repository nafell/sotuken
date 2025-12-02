/**
 * ReactiveBinding Type Definitions for DSL v4
 *
 * UISpec層に配置されるWidget間UI連携の仕様。
 * DependencyGraph（TDDM層）とは分離され、Widget間のリアクティブな連携を定義する。
 *
 * 責務の分離:
 * - DependencyGraph: データ間の依存関係（entityId.attributeName形式）
 * - ReactiveBinding: Widget間のUI連携（widgetId.portId形式）
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @see specs/discussions/DSLv4_review_minutes.md トピック2
 * @since DSL v4.0
 */

import type { DICT, SVAL } from './ors.types';

// =============================================================================
// Widget Port 参照
// =============================================================================

/**
 * Widget Port パス
 * 形式: "widgetId.portId"
 */
export type WidgetPortPath = `${string}.${string}`;

/**
 * Widget Port パスをパースした結果
 */
export interface ParsedWidgetPortPath {
  widgetId: string;
  portId: string;
}

/**
 * Widget Port パスをパースする
 */
export function parseWidgetPortPath(path: string): ParsedWidgetPortPath {
  const [widgetId, portId] = path.split('.');
  if (!widgetId || !portId) {
    throw new Error(`Invalid widget port path: ${path}. Expected format: "widgetId.portId"`);
  }
  return { widgetId, portId };
}

/**
 * Widget Port パスを生成する
 */
export function createWidgetPortPath(widgetId: string, portId: string): WidgetPortPath {
  return `${widgetId}.${portId}`;
}

// =============================================================================
// 更新モード
// =============================================================================

/**
 * 更新モード
 *
 * - realtime: ソースの変更を即座に反映
 * - debounced: 一定時間の遅延後に反映（連続入力の最適化）
 * - on_confirm: ユーザーの確認アクション後に反映
 */
export type UpdateMode = 'realtime' | 'debounced' | 'on_confirm';

// =============================================================================
// 関係仕様（Widget間用）
// =============================================================================

/**
 * JavaScript式によるWidget間関係
 */
export interface WidgetJavaScriptRelationship {
  type: 'javascript';
  /**
   * JavaScript式
   * - `source`: ソースWidgetのPort値
   * - `target`: ターゲットWidgetの現在値
   * - 戻り値: updateの場合は新しい値、validateの場合はboolean
   */
  javascript: string;
}

/**
 * 変換式によるWidget間関係
 */
export interface WidgetTransformRelationship {
  type: 'transform';
  /**
   * 変換式
   */
  transform: string;
  /** 変換パラメータ */
  params?: DICT<SVAL>;
}

/**
 * LLMによるWidget間関係
 */
export interface WidgetLLMRelationship {
  type: 'llm';
  /**
   * LLMに渡すプロンプト
   */
  llmPrompt: string;
  /** 追加コンテキスト */
  context?: DICT<SVAL>;
}

/**
 * パススルー（値をそのまま渡す）
 */
export interface PassthroughRelationship {
  type: 'passthrough';
}

/**
 * Widget間関係仕様
 */
export type WidgetRelationshipSpec =
  | WidgetJavaScriptRelationship
  | WidgetTransformRelationship
  | WidgetLLMRelationship
  | PassthroughRelationship;

// =============================================================================
// ReactiveBinding
// =============================================================================

/**
 * ReactiveBinding メカニズム
 *
 * - validate: ソースの変更時にターゲットの値を検証
 * - update: ソースの変更時にターゲットの値を更新
 */
export type BindingMechanism = 'validate' | 'update';

/**
 * ReactiveBinding
 *
 * Widget間のリアクティブなUI連携を定義。
 * ソースWidgetのPort値が変更された時にターゲットWidgetに対してアクションを実行。
 */
export interface ReactiveBinding {
  /** バインディングID（ReactiveBindingSpec内で一意） */
  id: string;

  /**
   * ソース（依存元Widget.Port）
   * 形式: "widgetId.portId"
   */
  source: WidgetPortPath;

  /**
   * ターゲット（依存先Widget.Port）
   * 形式: "widgetId.portId"
   */
  target: WidgetPortPath;

  /**
   * メカニズム
   * - validate: ソースの変更時にターゲットの値を検証
   * - update: ソースの変更時にターゲットの値を更新
   */
  mechanism: BindingMechanism;

  /**
   * 関係仕様
   * Widget間のデータ変換・検証ロジック
   */
  relationship: WidgetRelationshipSpec;

  /**
   * 更新モード
   * - realtime: 即座に反映
   * - debounced: 遅延後に反映
   * - on_confirm: 確認後に反映
   */
  updateMode: UpdateMode;

  /**
   * Debounce遅延（updateMode='debounced'の場合、ミリ秒）
   */
  debounceMs?: number;

  /**
   * complexity閾値チェックを有効にするか
   * trueの場合、ターゲットWidgetのcomplexityが閾値を超えると警告
   */
  complexityCheck?: boolean;

  /**
   * 説明（デバッグ・ドキュメント用）
   */
  description?: string;

  /**
   * 有効フラグ
   */
  enabled?: boolean;
}

// =============================================================================
// ReactiveBindingSpec
// =============================================================================

/**
 * ReactiveBindingSpec メタデータ
 */
export interface ReactiveBindingSpecMetadata {
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
 * ReactiveBindingSpec
 *
 * UISpec層に配置され、Widget間のリアクティブなUI連携を管理。
 *
 * 責務:
 * - Widget間の連携（widgetId.portId形式）
 * - 更新モードの制御（realtime/debounced/on_confirm）
 * - complexity閾値チェック
 *
 * DependencyGraph（TDDM層）との違い:
 * - DependencyGraph: データ間依存（entityId.attributeName形式）、要件的
 * - ReactiveBinding: Widget間連携（widgetId.portId形式）、実装的
 */
export interface ReactiveBindingSpec {
  /** ReactiveBindingのリスト */
  bindings: ReactiveBinding[];

  /** メタデータ */
  metadata?: ReactiveBindingSpecMetadata;
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * ReactiveBindingSpecを作成する
 */
export function createReactiveBindingSpec(
  bindings: ReactiveBinding[] = [],
  metadata?: Partial<ReactiveBindingSpecMetadata>
): ReactiveBindingSpec {
  return {
    bindings,
    metadata: {
      version: '4.0',
      generatedAt: Date.now(),
      ...metadata,
    },
  };
}

/**
 * ReactiveBindingを作成する
 */
export function createReactiveBinding(
  id: string,
  source: WidgetPortPath,
  target: WidgetPortPath,
  mechanism: BindingMechanism,
  relationship: WidgetRelationshipSpec,
  updateMode: UpdateMode = 'realtime',
  options?: Partial<Pick<ReactiveBinding, 'debounceMs' | 'complexityCheck' | 'description' | 'enabled'>>
): ReactiveBinding {
  return {
    id,
    source,
    target,
    mechanism,
    relationship,
    updateMode,
    enabled: true,
    ...options,
  };
}

/**
 * パススルー関係を作成する
 */
export function createPassthroughRelationship(): PassthroughRelationship {
  return { type: 'passthrough' };
}

/**
 * Widget用JavaScript関係を作成する
 */
export function createWidgetJavaScriptRelationship(expression: string): WidgetJavaScriptRelationship {
  return {
    type: 'javascript',
    javascript: expression,
  };
}

/**
 * Widget用変換関係を作成する
 */
export function createWidgetTransformRelationship(
  transform: string,
  params?: DICT<SVAL>
): WidgetTransformRelationship {
  return {
    type: 'transform',
    transform,
    params,
  };
}

/**
 * Widget用LLM関係を作成する
 */
export function createWidgetLLMRelationship(
  prompt: string,
  context?: DICT<SVAL>
): WidgetLLMRelationship {
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
 * BindingMechanismの型ガード
 */
export function isBindingMechanism(value: unknown): value is BindingMechanism {
  return value === 'validate' || value === 'update';
}

/**
 * UpdateModeの型ガード
 */
export function isUpdateMode(value: unknown): value is UpdateMode {
  return value === 'realtime' || value === 'debounced' || value === 'on_confirm';
}

/**
 * PassthroughRelationshipの型ガード
 */
export function isPassthroughRelationship(value: unknown): value is PassthroughRelationship {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === 'passthrough';
}

/**
 * WidgetJavaScriptRelationshipの型ガード
 */
export function isWidgetJavaScriptRelationship(value: unknown): value is WidgetJavaScriptRelationship {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === 'javascript' && typeof v.javascript === 'string';
}

/**
 * WidgetTransformRelationshipの型ガード
 */
export function isWidgetTransformRelationship(value: unknown): value is WidgetTransformRelationship {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === 'transform' && typeof v.transform === 'string';
}

/**
 * WidgetLLMRelationshipの型ガード
 */
export function isWidgetLLMRelationship(value: unknown): value is WidgetLLMRelationship {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === 'llm' && typeof v.llmPrompt === 'string';
}

/**
 * WidgetRelationshipSpecの型ガード
 */
export function isWidgetRelationshipSpec(value: unknown): value is WidgetRelationshipSpec {
  return (
    isPassthroughRelationship(value) ||
    isWidgetJavaScriptRelationship(value) ||
    isWidgetTransformRelationship(value) ||
    isWidgetLLMRelationship(value)
  );
}

/**
 * ReactiveBindingの型ガード
 */
export function isReactiveBinding(value: unknown): value is ReactiveBinding {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.source === 'string' &&
    typeof v.target === 'string' &&
    isBindingMechanism(v.mechanism) &&
    isWidgetRelationshipSpec(v.relationship) &&
    isUpdateMode(v.updateMode)
  );
}

/**
 * ReactiveBindingSpecの型ガード
 */
export function isReactiveBindingSpec(value: unknown): value is ReactiveBindingSpec {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.bindings) && v.bindings.every(isReactiveBinding);
}

// =============================================================================
// バインディング解析ユーティリティ
// =============================================================================

/**
 * 特定のソースWidgetに関連する全てのバインディングを取得
 */
export function getBindingsBySourceWidget(
  spec: ReactiveBindingSpec,
  widgetId: string
): ReactiveBinding[] {
  return spec.bindings.filter(
    (binding) => binding.source.startsWith(`${widgetId}.`) && binding.enabled !== false
  );
}

/**
 * 特定のターゲットWidgetに関連する全てのバインディングを取得
 */
export function getBindingsByTargetWidget(
  spec: ReactiveBindingSpec,
  widgetId: string
): ReactiveBinding[] {
  return spec.bindings.filter(
    (binding) => binding.target.startsWith(`${widgetId}.`) && binding.enabled !== false
  );
}

/**
 * 特定のソースPortに関連する全てのバインディングを取得
 */
export function getBindingsBySourcePort(
  spec: ReactiveBindingSpec,
  source: WidgetPortPath
): ReactiveBinding[] {
  return spec.bindings.filter(
    (binding) => binding.source === source && binding.enabled !== false
  );
}

/**
 * 特定のターゲットPortに関連する全てのバインディングを取得
 */
export function getBindingsByTargetPort(
  spec: ReactiveBindingSpec,
  target: WidgetPortPath
): ReactiveBinding[] {
  return spec.bindings.filter(
    (binding) => binding.target === target && binding.enabled !== false
  );
}

/**
 * バインディングで使用されている全てのWidgetIDを取得
 */
export function getAllWidgetIds(spec: ReactiveBindingSpec): Set<string> {
  const widgetIds = new Set<string>();
  for (const binding of spec.bindings) {
    if (binding.enabled !== false) {
      const { widgetId: sourceWidgetId } = parseWidgetPortPath(binding.source);
      const { widgetId: targetWidgetId } = parseWidgetPortPath(binding.target);
      widgetIds.add(sourceWidgetId);
      widgetIds.add(targetWidgetId);
    }
  }
  return widgetIds;
}
