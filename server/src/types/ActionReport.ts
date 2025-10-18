/**
 * サーバー側ActionReport型定義（Phase 2）
 * SQLite用の型調整版
 */

export interface ActionReport {
  // 基本情報
  reportId: string;            // プライマリキー (UUID)
  taskId: string;              // 外部キー (Task)
  userId: string;              // 外部キー (UserProfile)
  sessionId?: string;          // セッションID（任意）
  
  // 行動タイミング
  recommendationShownAt: string; // ISO 8601 date string
  actionStartedAt: string;       // ISO 8601 date string
  actionCompletedAt?: string;    // ISO 8601 date string
  
  timeToStartSec: number;        // 表示→着手の経過時間（秒）
  durationMin?: number;          // 着手→完了の所要時間（分）
  
  // UI条件（A/Bテスト用）
  uiCondition: 'dynamic_ui' | 'static_ui';
  uiVariant?: 'task_card' | 'micro_step_card' | 'prepare_step_card';
  saliency?: 0 | 1 | 2 | 3;
  generationId?: string;
  
  // コンテキスト情報（JSON文字列として保存）
  contextAtStart: string;        // JSON: {timeOfDay, location, availableTimeMin, factorsSnapshot}
  
  // 主観評価（完了時のみ）
  clarityImprovement?: 1 | 2 | 3;
  notes?: string;
  
  // メタデータ
  createdAt: string;             // ISO 8601 date string
  
  // サーバー同期
  syncedToServer: boolean;
  syncedAt?: string;             // ISO 8601 date string
}

/**
 * ActionReport作成リクエスト型
 */
export interface CreateActionReportRequest {
  taskId: string;
  userId: string;
  sessionId?: string;
  recommendationShownAt: string;
  actionStartedAt: string;
  timeToStartSec: number;
  uiCondition: 'dynamic_ui' | 'static_ui';
  uiVariant?: 'task_card' | 'micro_step_card' | 'prepare_step_card';
  saliency?: 0 | 1 | 2 | 3;
  generationId?: string;
  contextAtStart: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    location?: string;
    availableTimeMin?: number;
    factorsSnapshot: Record<string, any>;
  };
}

/**
 * ActionReport完了更新リクエスト型
 */
export interface CompleteActionReportRequest {
  actionCompletedAt: string;
  durationMin: number;
  clarityImprovement: 1 | 2 | 3;
  notes?: string;
}

/**
 * 着手率計算結果型
 */
export interface EngagementMetrics {
  totalRecommendationsShown: number;
  totalActionsStarted: number;
  engagementRate: number;
  averageTimeToStartSec: number;
  averageClarityImprovement?: number;
}

