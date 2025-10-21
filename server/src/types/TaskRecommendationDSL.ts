/**
 * TaskRecommendationDSL v1.0 型定義
 * ホーム推奨タスク表示用DSL（DataSchema不要の簡易版）
 */

/**
 * タスクカードのバリアント（種別）
 */
export type TaskCardVariant = "task_card" | "micro_step_card" | "prepare_step_card";

/**
 * サリエンシーレベル（視覚的強調度）
 * 0: base - 通常タスク（ほぼ使用しない）
 * 1: emphasis - 準備ステップ
 * 2: primary - 推奨タスク（標準）
 * 3: urgent - 緊急タスク（稀）
 */
export type SaliencyLevel = 0 | 1 | 2 | 3;

/**
 * サリエンシースタイル定義
 */
export interface SaliencyStyle {
  backgroundColor: string;  // Tailwind CSSクラス
  fontSize: string;
  elevation: number;  // shadow-sm/md/lg/xl
  icon?: string;
  animation?: string;
}

/**
 * タスクカード - 本体タスク
 * 使用条件: available_time >= estimate
 */
export interface TaskCardVariantSpec {
  title: string;  // タスク名
  estimate: number;  // 見積時間（分）
  due_in_hours: number;  // 締切までの時間
  
  // 表示ラベル
  label: string;  // "今すぐ始められます"
  actionButton: string;  // "開始"
}

/**
 * マイクロステップカード
 * 使用条件: available_time >= estimate_min_chunk AND has_independent_micro_step
 */
export interface MicroStepCardVariantSpec {
  title: string;  // マイクロステップ名
  duration: number;  // 所要時間（分）
  parentTaskTitle: string;  // 元のタスク名
  
  // 表示ラベル
  label: string;  // "少しだけ進められます"
  actionButton: string;  // "10分だけやる"
}

/**
 * 準備ステップカード
 * 使用条件: available_time < estimate_min_chunk
 */
export interface PrepareStepCardVariantSpec {
  title: string;  // 準備ステップ名
  duration: number;  // 所要時間（分）
  parentTaskTitle: string;  // 元のタスク名
  
  // 表示ラベル
  label: string;  // "準備だけでもしておきましょう"
  actionButton: string;  // "準備する"
}

/**
 * タスクカード仕様（固定構造）
 */
export interface TaskCardSpec {
  // 表示フィールド（固定）
  fields: ["title", "estimate", "due_in_hours"];
  
  // variant別の表示内容調整
  variants: {
    task_card: TaskCardVariantSpec;
    micro_step_card: MicroStepCardVariantSpec;
    prepare_step_card: PrepareStepCardVariantSpec;
  };
  
  // saliencyレベル別のスタイル
  saliencyStyles: {
    0: SaliencyStyle;
    1: SaliencyStyle;
    2: SaliencyStyle;
    3: SaliencyStyle;
  };
}

/**
 * 正規化ルール
 */
export interface NormalizationRule {
  method: string;
  formula?: string;
  mapping?: Record<string, number>;
}

/**
 * ゲーティングルール（variant決定）
 */
export interface GatingRule {
  condition: string;
  variant: TaskCardVariant;
}

/**
 * スコアリング仕様
 */
export interface ScoringSpec {
  // スコア計算式
  formula: string;  // "0.4*importance + 0.3*urgency + 0.2*staleness + 0.1*contextFit"
  
  // 各要素の正規化方法
  normalization: {
    importance: NormalizationRule;
    urgency: NormalizationRule;
    staleness: NormalizationRule;
    contextFit: NormalizationRule;
  };
  
  // ゲーティングルール（variant決定）
  gating: GatingRule[];
  
  // サリエンシー決定ルール
  saliencyRule: string;  // "if(due_in_hours<24 && importance>=0.67, 3, 2)"
}

/**
 * 将来拡張: ミニ実行画面（Phase 1では未実装）
 */
export interface EmbeddedExecutionSpec {
  enabled: boolean;
  condition: string;  // "importance >= 0.9 && estimate <= 5"
  
  miniUI: {
    component: string;
    layout: string;
    actions: string[];
  };
}

/**
 * TaskRecommendationDSL 最上位構造
 */
export interface TaskRecommendationDSL {
  version: "1.0";
  generatedAt: string;  // ISO 8601
  recommendationId: string;  // UUID
  
  type: "task_recommendation";  // 識別子
  
  // 推奨タスク情報
  selectedTask: {
    taskId: string;
    variant: TaskCardVariant;
    saliency: SaliencyLevel;
    score?: number;  // デバッグ用
  };
  
  // タスクカード表示仕様（固定構造）
  taskCard: TaskCardSpec;
  
  // スコアリング・選出ルール
  scoring: ScoringSpec;
  
  // 将来拡張: ミニ実行画面
  embeddedExecution?: EmbeddedExecutionSpec;
}

/**
 * タスクデータ構造（API入力用）
 */
export interface Task {
  id: string;
  title: string;
  estimate: number;  // 分
  estimate_min_chunk: number;  // 分
  importance: number;  // 0-1
  due_in_hours: number;
  days_since_last_touch: number;
  has_independent_micro_step: boolean;
  
  // contextFit計算用
  preferred_time?: string;
  preferred_location?: string;
  
  // マイクロステップ・準備ステップ情報（オプション）
  micro_step_title?: string;
  prepare_step_title?: string;
}

/**
 * Factor値の形式
 */
export interface FactorValue<T = any> {
  value: T;
}

/**
 * ランキングリクエスト（API入力）
 */
export interface RankingRequest {
  tasks: Task[];
  factors: {
    time_of_day: FactorValue<"morning" | "afternoon" | "evening" | "night">;
    location_category: FactorValue<"home" | "work" | "transit" | "other">;
    available_time_min: FactorValue<number>;
    mood?: FactorValue<"happy" | "neutral" | "stressed" | "tired">;
    energy_level?: FactorValue<number>;
    [key: string]: any;  // 将来のfactors拡張
  };
}

/**
 * 内部処理用ランキングリクエスト（ScoreRankingService用）
 */
export interface InternalRankingRequest {
  available_time: number;  // 分単位
  factors: {
    time_of_day: "morning" | "afternoon" | "evening" | "night";
    location_category: "home" | "work" | "transit" | "other";
    [key: string]: any;  // 将来のfactors拡張
  };
  tasks: Task[];
}

/**
 * ランキングレスポンス
 */
export interface RankingResponse {
  recommendation: {
    taskId: string;
    variant: TaskCardVariant;
    saliency: SaliencyLevel;
    score: number;
  };
  
  // デバッグ情報
  debug?: {
    allScores: Array<{ taskId: string; score: number }>;
    normalizedFactors: {
      importance: number;
      urgencyN: number;
      stalenessN: number;
      contextFitN: number;
    };
  };
}

