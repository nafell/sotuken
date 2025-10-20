/**
 * ローカルデータベース（IndexedDB）の型定義
 * @see specs/system-design/database_schema.md
 */

// ========================================
// factors辞書システム
// ========================================

export interface FactorValue {
  value: string | number | boolean | object;
  confidence?: number; // 0-1
  source?: string;
  timestamp?: Date;
  rawData?: object; // ローカルのみ保存される詳細データ
}

export interface FactorsDict {
  [factorName: string]: FactorValue | undefined;
}

// 基本factors - FactorsDictと互換性を持たせる
export interface BaseFactors extends FactorsDict {
  time_of_day: FactorValue & { value: 'morning' | 'afternoon' | 'evening' | 'night' };
  day_of_week: FactorValue & { value: number }; // 0=日曜
  location_category?: FactorValue & { value: 'home' | 'work' | 'transit' | 'other' };
  activity_level?: FactorValue & { value: 'stationary' | 'light' | 'active' };
  device_orientation?: FactorValue & { value: 'portrait' | 'landscape' };
  available_time_min?: FactorValue & { value: number };
}

// ========================================
// ユーザープロファイル
// ========================================

export interface UserProfile {
  userId: string; // プライマリキー（UUID）
  anonymousId: string; // サーバー送信用匿名ID
  createdAt: Date;
  experimentCondition?: 'static_ui' | 'dynamic_ui'; // Phase 2 Step 5: オプショナルに変更
  experimentAssignedAt?: Date; // Phase 2 Step 5: 実験条件割り当て日時
  conditionOverriddenByUser?: boolean; // Phase 2 Step 5: デバッグ用切り替えフラグ
  configVersion: string;
  settings: {
    notifications: boolean;
    timerSound: boolean;
    dataCollection: boolean;
  };
}

// ========================================
// 関心事セッション
// ========================================

export interface ConcernSession {
  sessionId: string; // プライマリキー（UUID）
  userId: string; // 外部キー
  startTime: Date;
  endTime?: Date;
  currentScreen: string;
  completed: boolean;

  // フェーズ1: 実態把握
  realityCheck: {
    rawInput?: string; // ローカルのみ
    concernLevel?: 'low' | 'medium' | 'high';
    urgency?: 'now' | 'this_week' | 'this_month' | 'someday';
    estimatedMentalLoad?: number; // 0-100
    inputMethod?: 'keyboard' | 'voice';
    inputTime?: Date;
  };

  // フェーズ2: 方針立案
  planning: {
    category?: 'learning_research' | 'event_planning' | 'lifestyle_habits' | 'work_project' | 'other';
    approach?: 'information_gathering' | 'concrete_action' | 'strategic_planning';
    confidenceLevel?: number; // 選択の確信度
    alternativeConsidered?: string[]; // 検討した他の選択肢
  };

  // フェーズ3: 細分化
  breakdown: {
    suggestedActions?: Array<{
      id: string;
      description: string;
      estimatedTimeMin: number;
      actionType: 'information_gathering' | 'communication' | 'planning' | 'execution';
      source: 'ai_generated' | 'user_custom';
      priority: number;
    }>;
    selectedActionId?: string;
    customAction?: {
      description: string;
      estimatedTimeMin: number;
    };
    uiVariant?: 'static' | 'dynamic';
    generationId?: string; // サーバー生成ID
  };

  // 結果測定
  outcomes: {
    actionStarted?: boolean;
    actionCompleted?: boolean;
    satisfactionLevel?: 'very_clear' | 'somewhat_clear' | 'still_foggy';
    workingMemoryBefore?: number;
    workingMemoryAfter?: number;
    cognitiveReliefScore?: number; // 0-100
    nextConcern?: string;
    totalTimeSpentMin?: number;
    screenTransitions?: number;
    completionTime?: Date;
    mentalLoadChange?: number;
    executionMemo?: string;
  };
}

// ========================================
// コンテキストデータ
// ========================================

export interface ContextData {
  contextId: string; // プライマリキー（UUID）
  sessionId: string; // 外部キー
  collectedAt: Date;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number; // 0=日曜
  availableTimeMin?: number;
  factors: BaseFactors; // 拡張可能なfactors辞書
}

// ========================================
// インタラクションイベント
// ========================================

// イベントタイプ定義
export type EventType = 
  // Phase 0 既存イベント
  | 'ui_shown'
  | 'button_tap'
  | 'input_change'
  | 'navigation'
  | 'action_started'
  | 'satisfaction_reported'
  // Phase 2 追加イベント
  | 'task_recommendation_shown'     // タスク推奨UI表示 ⭐️
  | 'task_action_started'           // タスク着手 ⭐️
  | 'task_action_completed'         // タスク完了 ⭐️
  | 'clarity_feedback_submitted'    // スッキリ度報告
  | 'task_created'                  // タスク作成
  | 'task_updated'                  // タスク更新
  | 'task_deleted'                  // タスク削除
  | 'experiment_condition_assigned' // 実験条件割り当て
  | 'experiment_condition_switched' // 実験条件切り替え
  ;

export interface InteractionEvent {
  eventId: string; // プライマリキー（UUID）
  sessionId: string; // 外部キー
  timestamp: Date;
  eventType: EventType;
  screenId: string;
  componentId?: string;
  metadata: {
    // Phase 0 既存フィールド
    uiVariant?: 'static' | 'dynamic';
    generationId?: string;
    actionId?: string;
    inputValue?: string;
    timeOnScreenSec?: number;
    scrollPosition?: number;
    deviceContext?: object;
    
    // Phase 2 追加フィールド
    uiCondition?: 'dynamic_ui' | 'static_ui';       // A/Bテスト条件
    taskId?: string;                                 // タスクID
    taskVariant?: 'task_card' | 'micro_step_card' | 'prepare_step_card';
    saliency?: 0 | 1 | 2 | 3;                       // サリエンシーレベル
    score?: number;                                  // タスク推奨スコア
    clarityImprovement?: 1 | 2 | 3;                 // スッキリ度
    timeToActionSec?: number;                        // 表示→着手の経過時間
    durationMin?: number;                            // 所要時間
    factorsSnapshot?: Record<string, any>;          // factors辞書スナップショット
  };
  syncedToServer: boolean;
  syncedAt?: Date;
}

// ========================================
// UI生成データ
// ========================================

export interface UIGeneration {
  generationId: string; // プライマリキー（UUID）
  sessionId: string; // 外部キー
  generatedAt: Date;
  uiDsl: object; // DSL JSON
  requestContext: object; // 生成リクエスト情報
  generationMetadata: {
    model: string;
    seed: number;
    processingTimeMs: number;
    fallbackUsed: boolean;
    promptTokens: number;
    responseTokens: number;
  };
}

// ========================================
// Task（タスクエンティティ）- Phase 2
// ========================================

export interface Task {
  // 基本情報
  taskId: string;              // プライマリキー (UUID)
  userId: string;              // 外部キー
  concernId?: string;          // 関連する関心事セッションID（任意）
  
  title: string;               // タスクタイトル（必須）
  description?: string;        // 詳細説明
  
  // スコアリング用属性
  importance: number;          // 重要度 (0.0-1.0)
  urgency: number;             // 緊急度 (0.0-1.0)
  dueInHours?: number;         // 締切までの時間（時間単位）
  
  estimateMin: number;         // 推定所要時間（分）
  estimateMinChunk?: number;   // 最小実行単位（分）
  
  // コンテキスト適合性
  preferredTimeOfDay?: ('morning' | 'afternoon' | 'evening' | 'night')[];
  preferredLocation?: ('home' | 'work' | 'transit' | 'other')[];
  requiredResources?: string[]; // 必要なリソース
  
  // マイクロステップ情報
  hasIndependentMicroStep: boolean;  // 独立したマイクロステップがあるか
  microSteps?: Array<{
    stepId: string;
    description: string;
    estimateMin: number;
    completed: boolean;
  }>;
  
  // ステータス管理
  status: 'active' | 'completed' | 'archived' | 'deleted';
  progress: number;            // 進捗率 (0-100)
  
  lastTouchAt?: Date;          // 最終操作日時
  daysSinceLastTouch?: number; // 最終操作からの経過日数
  
  completedAt?: Date;
  archivedAt?: Date;
  
  // タスク生成元
  source: 'ai_generated' | 'manual' | 'breakdown_flow';
  generationId?: string;       // UI生成ID（AI生成の場合）
  
  // 行動報告履歴
  actionHistory?: Array<{
    reportId: string;          // ActionReport ID
    startedAt: Date;
    completedAt?: Date;
    clarityImprovement?: 1 | 2 | 3;
    notes?: string;
  }>;
  
  totalActionsStarted: number;  // 着手回数
  totalActionsCompleted: number; // 完了回数
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  
  tags?: string[];             // タグ（任意）
  priority?: 'low' | 'medium' | 'high'; // 優先度ラベル（任意）
  
  // サーバー同期
  syncedToServer: boolean;
  syncedAt?: Date;
}

// ========================================
// ActionReport（行動報告記録）- Phase 2
// ========================================

export interface ActionReport {
  // 基本情報
  reportId: string;            // プライマリキー (UUID)
  taskId: string;              // 外部キー (Task)
  userId: string;              // 外部キー (UserProfile)
  sessionId?: string;          // セッションID（任意）
  
  // 行動タイミング
  recommendationShownAt: Date; // タスク推奨UI表示時刻
  actionStartedAt: Date;       // 「着手する」ボタンタップ時刻 ⭐️着手の定義
  actionCompletedAt?: Date;    // 「完了しました」ボタンタップ時刻
  
  timeToStartSec: number;      // 表示→着手の経過時間（秒）
  durationMin?: number;        // 着手→完了の所要時間（分）
  
  // UI条件（A/Bテスト用）
  uiCondition: 'dynamic_ui' | 'static_ui';
  uiVariant?: 'task_card' | 'micro_step_card' | 'prepare_step_card';
  saliency?: 0 | 1 | 2 | 3;
  generationId?: string;       // 動的UI生成ID（dynamic_uiの場合）
  
  // コンテキスト情報
  contextAtStart: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    location?: string;
    availableTimeMin?: number;
    factorsSnapshot: Record<string, any>; // factors辞書のスナップショット
  };
  
  // 主観評価（完了時のみ）
  clarityImprovement?: 1 | 2 | 3; // スッキリ度（1: あまり / 2: 少し / 3: かなり）
  notes?: string;                  // 自由記述（任意）
  
  // メタデータ
  createdAt: Date;
  
  // サーバー同期
  syncedToServer: boolean;
  syncedAt?: Date;
}

// ========================================
// サーバー通信用型
// ========================================

export interface ServerSyncStatus {
  lastSyncAt?: Date;
  pendingEventCount: number;
  syncInProgress: boolean;
}
