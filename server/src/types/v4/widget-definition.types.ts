/**
 * Widget Definition Type Definitions for DSL v4
 *
 * v3のWidgetDefinitionを拡張し、complexityとsummarizationPromptを追加。
 * Widget選定とReactiveBindingのcomplexityチェックに使用。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @see specs/discussions/DSLv4_review_minutes.md トピック1
 * @since DSL v4.0
 */

import type {
  WidgetDefinition as V3WidgetDefinition,
  WidgetMetadata as V3WidgetMetadata,
  ReactivePortDefinition,
  WidgetStage,
} from '../WidgetDefinition';

// =============================================================================
// v4 Widget Metadata（complexity追加）
// =============================================================================

/**
 * v4 Widgetメタデータ
 *
 * v3から以下を追加:
 * - complexity: 認知負荷・複雑度（0.0-1.0）
 */
export interface WidgetMetadataV4 extends V3WidgetMetadata {
  /**
   * 認知負荷・複雑度 (0.0-1.0)
   *
   * 用途:
   * - Widget to Widget Reactivityのtarget選定制限
   * - 1ステージ内のWidget組み合わせ制御
   *
   * 目安:
   * - 0.0-0.3: シンプル（例: 感情パレット、ブレインストームカード）
   * - 0.4-0.6: 中程度（例: カードソート、マトリクス配置）
   * - 0.7-1.0: 複雑（例: 依存関係マップ、SWOT分析）
   */
  complexity: number;
}

// =============================================================================
// v4 Widget Definition
// =============================================================================

/**
 * ラベル生成ヒント (Type A)
 *
 * UIのラベル・説明文を動的生成するための指示
 * @since DSL v4.1
 */
export interface LabelGenerationHint {
  /** 配置先のconfigフィールド名 */
  field: string;
  /** LLMへの生成指示 */
  instruction: string;
  /** 生成数 */
  count?: number;
  /** アイテムのスキーマ（フィールド名: 型説明） */
  schema: Record<string, string>;
}

/**
 * サンプル生成ヒント (Type B)
 *
 * サンプルデータを動的生成するための指示
 * @since DSL v4.1
 */
export interface SampleGenerationHint {
  /** 配置先のconfigフィールド名 */
  field: string;
  /** LLMへの生成指示 */
  instruction: string;
  /** 生成数の範囲 */
  count: { min: number; max: number };
  /** アイテムのスキーマ（フィールド名: 型説明） */
  schema: Record<string, string>;
}

/**
 * Widget生成ヒント
 *
 * UISpec生成時にLLMが動的コンテンツを生成するための指示
 * @since DSL v4.1
 */
export interface WidgetGenerationHints {
  /** ラベル・説明文の生成ヒント (Type A) */
  labels?: LabelGenerationHint;
  /** サンプルデータの生成ヒント (Type B) */
  samples?: SampleGenerationHint;
}

/**
 * v4 Widget定義
 *
 * v3から以下を追加:
 * - metadata.complexity
 * - summarizationPrompt: stage_summaryで使用する言語化プロンプト
 * - stage: 'all' を追加（全ステージ対応Widget用）
 * - generationHints: 動的コンテンツ生成ヒント（v4.1追加）
 */
export interface WidgetDefinitionV4 {
  /** Widget ID（システム全体で一意） */
  id: string;

  /** 表示名 */
  name: string;

  /** 説明（LLMプロンプト用） */
  description: string;

  /**
   * 対応ステージ
   * 'all' は全ステージで使用可能（stage_summary等）
   */
  stage: WidgetStage | 'all';

  /** ポート定義 */
  ports: {
    inputs: ReactivePortDefinition[];
    outputs: ReactivePortDefinition[];
  };

  /** 設定スキーマ (JSON Schema形式、オプション) */
  configSchema?: Record<string, unknown>;

  /** メタデータ（v4拡張） */
  metadata: WidgetMetadataV4;

  /**
   * 操作内容言語化プロンプト
   *
   * stage_summary WidgetでこのWidgetの操作結果を要約する際に使用。
   * プレースホルダー:
   * - {{state}}: Widgetの現在の状態（JSON）
   * - {{outputs}}: Widgetの出力ポート値
   */
  summarizationPrompt?: string;

  /**
   * 動的コンテンツ生成ヒント
   *
   * UISpec生成時にLLMがWidget固有のコンテンツを生成するための指示。
   * @since DSL v4.1
   */
  generationHints?: WidgetGenerationHints;
}

/**
 * v4 Widget定義レジストリ
 */
export type WidgetDefinitionRegistryV4 = Record<string, WidgetDefinitionV4>;

// =============================================================================
// v3 → v4 変換
// =============================================================================

/**
 * v3 WidgetDefinitionをv4に変換する
 *
 * @param v3Def v3のWidget定義
 * @param complexity complexityの値（0.0-1.0）
 * @param summarizationPrompt 言語化プロンプト（オプション）
 * @returns v4のWidget定義
 */
export function convertV3ToV4Definition(
  v3Def: V3WidgetDefinition,
  complexity: number,
  summarizationPrompt?: string
): WidgetDefinitionV4 {
  return {
    ...v3Def,
    metadata: {
      ...v3Def.metadata,
      complexity,
    },
    summarizationPrompt,
  };
}

// =============================================================================
// Complexity関連ユーティリティ
// =============================================================================

/**
 * Complexity閾値ルール
 */
export interface ComplexityRules {
  /**
   * ReactiveBindingのtargetになれる最大complexity
   * この値を超えるWidgetはtargetにならない
   */
  maxTargetComplexity: number;

  /**
   * 1ステージ内のcomplexity合計の上限
   */
  maxStageComplexitySum: number;

  /**
   * 1ステージ内の高complexity Widget（>0.7）の最大数
   */
  maxHighComplexityWidgets: number;
}

/**
 * デフォルトのcomplexity閾値ルール
 */
export const DEFAULT_COMPLEXITY_RULES: ComplexityRules = {
  maxTargetComplexity: 0.7,
  maxStageComplexitySum: 1.5,
  maxHighComplexityWidgets: 1,
};

/**
 * Widgetがcomplexityの閾値以下かチェック
 */
export function isComplexityUnderThreshold(
  widget: WidgetDefinitionV4,
  threshold: number
): boolean {
  return widget.metadata.complexity <= threshold;
}

/**
 * Widget配列のcomplexity合計を計算
 */
export function calculateTotalComplexity(widgets: WidgetDefinitionV4[]): number {
  return widgets.reduce((sum, w) => sum + w.metadata.complexity, 0);
}

/**
 * 高complexity Widgetの数をカウント
 */
export function countHighComplexityWidgets(
  widgets: WidgetDefinitionV4[],
  threshold: number = 0.7
): number {
  return widgets.filter((w) => w.metadata.complexity > threshold).length;
}

/**
 * Widgetの組み合わせがcomplexityルールを満たすかチェック
 */
export function validateStageComplexity(
  widgets: WidgetDefinitionV4[],
  rules: ComplexityRules = DEFAULT_COMPLEXITY_RULES
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  const totalComplexity = calculateTotalComplexity(widgets);
  if (totalComplexity > rules.maxStageComplexitySum) {
    violations.push(
      `Total complexity (${totalComplexity.toFixed(2)}) exceeds max (${rules.maxStageComplexitySum})`
    );
  }

  const highComplexityCount = countHighComplexityWidgets(widgets);
  if (highComplexityCount > rules.maxHighComplexityWidgets) {
    violations.push(
      `High complexity widget count (${highComplexityCount}) exceeds max (${rules.maxHighComplexityWidgets})`
    );
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// =============================================================================
// 型ガード
// =============================================================================

/**
 * WidgetMetadataV4の型ガード
 */
export function isWidgetMetadataV4(value: unknown): value is WidgetMetadataV4 {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.timing === 'number' &&
    typeof v.versatility === 'number' &&
    typeof v.complexity === 'number' &&
    Array.isArray(v.bottleneck)
  );
}

/**
 * WidgetDefinitionV4の型ガード
 */
export function isWidgetDefinitionV4(value: unknown): value is WidgetDefinitionV4 {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.description === 'string' &&
    typeof v.stage === 'string' &&
    typeof v.ports === 'object' &&
    isWidgetMetadataV4(v.metadata)
  );
}
