/**
 * WidgetSelection Type Definitions for DSL v4
 *
 * 3段階LLM呼び出しの第1段階で生成されるWidget選定結果の型定義。
 * 4ステージ（diverge, organize, converge, summary）分のWidget選定を一括で行う。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @see specs/discussions/DSLv4_review_minutes.md トピック1
 * @since DSL v4.0
 */

import type { DICT, SVAL, StageType } from './ors.types';

// =============================================================================
// Widget Component Types
// =============================================================================

/**
 * Widgetコンポーネント種別
 *
 * v3実装済みの12種のWidget
 * v4未実装のWidgetはコメントアウト
 */
export type WidgetComponentType =
  // Divergeステージ（v3実装済み）
  | 'emotion_palette'
  | 'brainstorm_cards'
  | 'mind_map'
  | 'question_card_chain'
  // | 'concern_map'          // v4未実装
  // | 'free_writing'         // v4未実装
  // Organizeステージ（v3実装済み）
  | 'card_sorting'
  | 'matrix_placement'
  | 'dependency_mapping'
  | 'swot_analysis'
  | 'timeline_slider'
  // | 'timeline_view'        // v4未実装
  // Convergeステージ（v3実装済み）
  | 'priority_slider_grid'
  | 'tradeoff_balance'
  // | 'decision_balance'     // v4未実装
  // | 'action_cards'         // v4未実装
  // Summaryステージ（v3実装済み）
  | 'structured_summary';
  // | 'summary_view'         // v4未実装
  // | 'export_options'       // v4未実装
  // 共通（v4追加、未実装）
  // | 'stage_summary'        // v4未実装

// =============================================================================
// Selected Widget
// =============================================================================

/**
 * 選定されたWidget
 *
 * LLMが選定した個々のWidgetの情報
 */
export interface SelectedWidget {
  /** Widget種別 */
  widgetId: WidgetComponentType;

  /**
   * このWidgetの使用目的
   * ユーザーの悩みに対してどのように役立つか
   */
  purpose: string;

  /**
   * ステージ内での表示順序
   * 0から開始、小さいほど先に表示
   */
  order: number;

  /**
   * 推奨設定
   * Widget固有の設定パラメータ
   */
  suggestedConfig?: Record<string, unknown>;

  /**
   * Widget間連携の提案
   * このWidgetが他のどのWidgetと連携すべきか
   */
  suggestedBindings?: SuggestedBinding[];
}

/**
 * 提案されたWidget間連携
 */
export interface SuggestedBinding {
  /** 連携先WidgetID */
  targetWidgetId: WidgetComponentType;
  /** 連携の説明 */
  description: string;
  /** 連携の種類 */
  type: 'data_flow' | 'validation' | 'trigger';
}

// =============================================================================
// Stage Selection
// =============================================================================

/**
 * ステージ別Widget選定結果
 *
 * 各ステージ（diverge, organize, converge, summary）での選定内容
 */
export interface StageSelection {
  /**
   * 選定されたWidgetのリスト
   * orderでソート済み
   */
  widgets: SelectedWidget[];

  /**
   * このステージの分析目的
   * ユーザーの悩みに対してこのステージが達成すべきこと
   */
  purpose: string;

  /**
   * 分析対象
   * このステージで扱うデータや情報
   */
  target: string;

  /**
   * ステージの説明（ユーザー向け）
   */
  description?: string;

  /**
   * このステージの推定所要時間（分）
   */
  estimatedDuration?: number;
}

// =============================================================================
// Widget Selection Result
// =============================================================================

/**
 * WidgetSelectionResult メタデータ
 */
export interface WidgetSelectionMetadata {
  /** 生成日時（Unix timestamp） */
  generatedAt: number;
  /** 使用したLLMモデル */
  llmModel: string;
  /** 診断されたボトルネック種別 */
  bottleneckType: string;
  /** セッションID */
  sessionId?: string;
  /** LLM呼び出しにかかった時間（ミリ秒） */
  latencyMs?: number;
  /** カスタムメタデータ */
  custom?: DICT<SVAL>;
}

/**
 * WidgetSelectionResult
 *
 * 3段階LLM呼び出しの第1段階の出力。
 * 4ステージ分のWidget選定結果を一括で保持する。
 *
 * 入力:
 * - ConcernText（ユーザーの悩み）
 * - BottleneckType（診断されたボトルネック種別）
 * - 全Widget Definitions
 *
 * 出力:
 * - 各ステージのWidget + 分析目的 + 分析対象
 */
export interface WidgetSelectionResult {
  /** バージョン */
  version: '4.0';

  /**
   * ステージ別選定結果
   */
  stages: {
    diverge: StageSelection;
    organize: StageSelection;
    converge: StageSelection;
    summary: StageSelection;
  };

  /**
   * 全体の選定理由
   * なぜこのWidget組み合わせを選んだか
   */
  rationale: string;

  /**
   * 全体フローの説明（ユーザー向け）
   */
  flowDescription?: string;

  /**
   * 推定合計所要時間（分）
   */
  totalEstimatedDuration?: number;

  /** メタデータ */
  metadata: WidgetSelectionMetadata;
}

// =============================================================================
// Stage順序定義
// =============================================================================

/**
 * ステージの順序（配列）
 */
export const STAGE_ORDER: readonly StageType[] = ['diverge', 'organize', 'converge', 'summary'] as const;

/**
 * ステージの日本語名
 */
export const STAGE_NAMES: Record<StageType, string> = {
  diverge: '発散',
  organize: '整理',
  converge: '収束',
  summary: 'まとめ',
};

/**
 * ステージの英語名（表示用）
 */
export const STAGE_DISPLAY_NAMES: Record<StageType, string> = {
  diverge: 'Diverge',
  organize: 'Organize',
  converge: 'Converge',
  summary: 'Summary',
};

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * 次のステージを取得
 */
export function getNextStage(currentStage: StageType): StageType | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1];
}

/**
 * 前のステージを取得
 */
export function getPreviousStage(currentStage: StageType): StageType | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  return STAGE_ORDER[currentIndex - 1];
}

/**
 * ステージのインデックスを取得
 */
export function getStageIndex(stage: StageType): number {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * インデックスからステージを取得
 */
export function getStageByIndex(index: number): StageType | null {
  if (index < 0 || index >= STAGE_ORDER.length) {
    return null;
  }
  return STAGE_ORDER[index];
}

/**
 * 空のStageSelectionを作成
 */
export function createEmptyStageSelection(): StageSelection {
  return {
    widgets: [],
    purpose: '',
    target: '',
  };
}

/**
 * 空のWidgetSelectionResultを作成
 */
export function createEmptyWidgetSelectionResult(
  bottleneckType: string,
  llmModel: string
): WidgetSelectionResult {
  return {
    version: '4.0',
    stages: {
      diverge: createEmptyStageSelection(),
      organize: createEmptyStageSelection(),
      converge: createEmptyStageSelection(),
      summary: createEmptyStageSelection(),
    },
    rationale: '',
    metadata: {
      generatedAt: Date.now(),
      llmModel,
      bottleneckType,
    },
  };
}

/**
 * WidgetSelectionResultから特定ステージのWidgetIDリストを取得
 */
export function getWidgetIdsForStage(
  result: WidgetSelectionResult,
  stage: StageType
): WidgetComponentType[] {
  return result.stages[stage].widgets.map((w) => w.widgetId);
}

/**
 * WidgetSelectionResultから全ステージのWidgetIDリストを取得
 */
export function getAllWidgetIds(result: WidgetSelectionResult): WidgetComponentType[] {
  const widgetIds: WidgetComponentType[] = [];
  for (const stage of STAGE_ORDER) {
    widgetIds.push(...getWidgetIdsForStage(result, stage));
  }
  return widgetIds;
}

/**
 * 全ステージの合計Widget数を取得
 */
export function getTotalWidgetCount(result: WidgetSelectionResult): number {
  return STAGE_ORDER.reduce((count, stage) => count + result.stages[stage].widgets.length, 0);
}

// =============================================================================
// 型ガード
// =============================================================================

/**
 * WidgetComponentTypeの型ガード
 *
 * v3実装済みWidgetのみを有効な型として判定
 */
export function isWidgetComponentType(value: unknown): value is WidgetComponentType {
  const validTypes: WidgetComponentType[] = [
    // Diverge（v3実装済み）
    'emotion_palette',
    'brainstorm_cards',
    'mind_map',
    'question_card_chain',
    // Organize（v3実装済み）
    'card_sorting',
    'matrix_placement',
    'dependency_mapping',
    'swot_analysis',
    'timeline_slider',
    // Converge（v3実装済み）
    'priority_slider_grid',
    'tradeoff_balance',
    // Summary（v3実装済み）
    'structured_summary',
  ];
  return typeof value === 'string' && validTypes.includes(value as WidgetComponentType);
}

/**
 * SelectedWidgetの型ガード
 */
export function isSelectedWidget(value: unknown): value is SelectedWidget {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isWidgetComponentType(v.widgetId) &&
    typeof v.purpose === 'string' &&
    typeof v.order === 'number'
  );
}

/**
 * StageSelectionの型ガード
 */
export function isStageSelection(value: unknown): value is StageSelection {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.widgets) &&
    v.widgets.every(isSelectedWidget) &&
    typeof v.purpose === 'string' &&
    typeof v.target === 'string'
  );
}

/**
 * WidgetSelectionResultの型ガード
 */
export function isWidgetSelectionResult(value: unknown): value is WidgetSelectionResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  if (v.version !== '4.0') return false;
  if (typeof v.stages !== 'object' || v.stages === null) return false;
  if (typeof v.rationale !== 'string') return false;
  if (typeof v.metadata !== 'object' || v.metadata === null) return false;

  const stages = v.stages as Record<string, unknown>;
  return (
    isStageSelection(stages.diverge) &&
    isStageSelection(stages.organize) &&
    isStageSelection(stages.converge) &&
    isStageSelection(stages.summary)
  );
}
