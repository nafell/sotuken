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
  [factorName: string]: FactorValue;
}

// 基本factors
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
  experimentCondition: 'static_ui' | 'dynamic_ui';
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

export interface InteractionEvent {
  eventId: string; // プライマリキー（UUID）
  sessionId: string; // 外部キー
  timestamp: Date;
  eventType: 'ui_shown' | 'button_tap' | 'input_change' | 'navigation' | 'action_started' | 'satisfaction_reported';
  screenId: string;
  componentId?: string;
  metadata: {
    uiVariant?: 'static' | 'dynamic';
    generationId?: string;
    actionId?: string;
    inputValue?: string;
    timeOnScreenSec?: number;
    scrollPosition?: number;
    deviceContext?: object;
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
// サーバー通信用型
// ========================================

export interface ServerSyncStatus {
  lastSyncAt?: Date;
  pendingEventCount: number;
  syncInProgress: boolean;
}
