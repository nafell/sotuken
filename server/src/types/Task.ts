/**
 * サーバー側Task型定義（Phase 2）
 * SQLite用の型調整版
 */

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
  
  // コンテキスト適合性（JSON文字列として保存）
  preferredTimeOfDay?: string; // JSON: ('morning' | 'afternoon' | 'evening' | 'night')[]
  preferredLocation?: string;  // JSON: ('home' | 'work' | 'transit' | 'other')[]
  requiredResources?: string;  // JSON: string[]
  
  // マイクロステップ情報
  hasIndependentMicroStep: boolean;
  microSteps?: string;         // JSON: Array<{stepId, description, estimateMin, completed}>
  
  // ステータス管理
  status: 'active' | 'completed' | 'archived' | 'deleted';
  progress: number;            // 進捗率 (0-100)
  
  lastTouchAt?: string;        // ISO 8601 date string
  daysSinceLastTouch?: number;
  
  completedAt?: string;        // ISO 8601 date string
  archivedAt?: string;         // ISO 8601 date string
  
  // タスク生成元
  source: 'ai_generated' | 'manual' | 'breakdown_flow';
  generationId?: string;
  
  // 行動報告履歴（JSON文字列として保存）
  actionHistory?: string;      // JSON: Array<{reportId, startedAt, completedAt, clarityImprovement, notes}>
  
  totalActionsStarted: number;
  totalActionsCompleted: number;
  
  // メタデータ
  createdAt: string;           // ISO 8601 date string
  updatedAt: string;           // ISO 8601 date string
  
  tags?: string;               // JSON: string[]
  priority?: 'low' | 'medium' | 'high';
  
  // サーバー同期
  syncedToServer: boolean;
  syncedAt?: string;           // ISO 8601 date string
}

/**
 * Task作成リクエスト型
 */
export interface CreateTaskRequest {
  userId: string;
  concernId?: string;
  title: string;
  description?: string;
  importance: number;
  urgency: number;
  dueInHours?: number;
  estimateMin: number;
  estimateMinChunk?: number;
  preferredTimeOfDay?: string[];
  preferredLocation?: string[];
  requiredResources?: string[];
  hasIndependentMicroStep: boolean;
  microSteps?: Array<{
    stepId: string;
    description: string;
    estimateMin: number;
    completed: boolean;
  }>;
  source: 'ai_generated' | 'manual' | 'breakdown_flow';
  generationId?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Task更新リクエスト型
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  importance?: number;
  urgency?: number;
  dueInHours?: number;
  estimateMin?: number;
  estimateMinChunk?: number;
  preferredTimeOfDay?: string[];
  preferredLocation?: string[];
  requiredResources?: string[];
  status?: 'active' | 'completed' | 'archived' | 'deleted';
  progress?: number;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

