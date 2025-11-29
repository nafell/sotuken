# Phase 2 データモデル詳細

**作成日**: 2025年10月18日  
**対象**: IndexedDB（クライアント側）+ SQLite（サーバー側）

---

## 📋 概要

Phase 2で新規追加・拡張するデータモデルを定義します。

### 新規追加モデル
1. **Task** - タスクエンティティ（最重要）
2. **ActionReport** - 行動報告記録
3. **ExperimentConfig** - 実験条件設定

### 拡張モデル
1. **InteractionEvent** - イベントログ（新規eventType追加）
2. **UserProfile** - ユーザープロファイル（実験条件管理強化）

---

## 🆕 1. Task（タスクエンティティ）

### 概要
ユーザーのタスクを管理する中心的なエンティティ。思考整理フローから生成されるタスクと、手動で追加されるタスクの両方を扱う。

### TypeScript型定義

```typescript
/**
 * タスクエンティティ
 * @table tasks (IndexedDB), tasks (SQLite)
 */
export interface Task {
  // ========================================
  // 基本情報
  // ========================================
  taskId: string;              // プライマリキー (UUID)
  userId: string;              // 外部キー
  concernId?: string;          // 関連する関心事セッションID（任意）
  
  title: string;               // タスクタイトル（必須）
  description?: string;        // 詳細説明
  
  // ========================================
  // スコアリング用属性
  // ========================================
  importance: number;          // 重要度 (0.0-1.0)
  urgency: number;             // 緊急度 (0.0-1.0)
  dueInHours?: number;         // 締切までの時間（時間単位）
  
  estimateMin: number;         // 推定所要時間（分）
  estimateMinChunk?: number;   // 最小実行単位（分）
  
  // ========================================
  // コンテキスト適合性
  // ========================================
  preferredTimeOfDay?: ('morning' | 'afternoon' | 'evening' | 'night')[];
  preferredLocation?: ('home' | 'work' | 'transit' | 'other')[];
  requiredResources?: string[]; // 必要なリソース（例: "PC", "静かな場所"）
  
  // ========================================
  // マイクロステップ情報
  // ========================================
  hasIndependentMicroStep: boolean;  // 独立したマイクロステップがあるか
  microSteps?: Array<{
    stepId: string;
    description: string;
    estimateMin: number;
    completed: boolean;
  }>;
  
  // ========================================
  // ステータス管理
  // ========================================
  status: 'active' | 'completed' | 'archived' | 'deleted';
  progress: number;            // 進捗率 (0-100)
  
  lastTouchAt?: Date;          // 最終操作日時
  daysSinceLastTouch?: number; // 最終操作からの経過日数
  
  completedAt?: Date;
  archivedAt?: Date;
  
  // ========================================
  // タスク生成元
  // ========================================
  source: 'ai_generated' | 'manual' | 'breakdown_flow';
  generationId?: string;       // UI生成ID（AI生成の場合）
  
  // ========================================
  // 行動報告履歴
  // ========================================
  actionHistory?: Array<{
    reportId: string;          // ActionReport ID
    startedAt: Date;
    completedAt?: Date;
    clarityImprovement?: 1 | 2 | 3;
    notes?: string;
  }>;
  
  totalActionsStarted: number;  // 着手回数
  totalActionsCompleted: number; // 完了回数
  
  // ========================================
  // メタデータ
  // ========================================
  createdAt: Date;
  updatedAt: Date;
  
  tags?: string[];             // タグ（任意）
  priority?: 'low' | 'medium' | 'high'; // 優先度ラベル（任意）
  
  // サーバー同期
  syncedToServer: boolean;
  syncedAt?: Date;
}
```

### IndexedDBスキーマ

```typescript
// LocalDatabase.ts に追加
this.version(2).stores({
  // 既存テーブル
  userProfile: 'userId',
  concernSessions: 'sessionId, userId, startTime, completed, [userId+startTime]',
  contextData: 'contextId, sessionId, collectedAt',
  interactionEvents: 'eventId, sessionId, timestamp, syncedToServer, [sessionId+timestamp], [syncedToServer+timestamp]',
  uiGenerations: 'generationId, sessionId, generatedAt',
  
  // 新規追加
  tasks: 'taskId, userId, status, dueInHours, lastTouchAt, syncedToServer, [userId+status], [userId+lastTouchAt]',
  actionReports: 'reportId, taskId, userId, startedAt, [taskId+startedAt], [userId+startedAt]'
});
```

### インデックス戦略

| インデックス | 用途 |
|------------|------|
| `userId` | ユーザーの全タスク取得 |
| `[userId+status]` | ステータス別タスク一覧 |
| `[userId+lastTouchAt]` | 放置タスク検出 |
| `dueInHours` | 締切順ソート |
| `syncedToServer` | 未同期タスク検出 |

### CRUD操作

```typescript
// LocalDatabase.ts に追加メソッド
class LocalDatabase extends Dexie {
  tasks!: Table<Task>;
  
  // タスク作成
  async createTask(task: Omit<Task, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const fullTask: Task = {
      ...task,
      taskId: generateUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      syncedToServer: false
    };
    
    await this.tasks.add(fullTask);
    return fullTask;
  }
  
  // タスク取得（アクティブのみ）
  async getActiveTasks(userId: string): Promise<Task[]> {
    return await this.tasks
      .where('[userId+status]')
      .equals([userId, 'active'])
      .toArray();
  }
  
  // タスク更新
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    await this.tasks.update(taskId, {
      ...updates,
      updatedAt: new Date(),
      syncedToServer: false
    });
  }
  
  // タスク完了
  async completeTask(taskId: string): Promise<void> {
    await this.tasks.update(taskId, {
      status: 'completed',
      completedAt: new Date(),
      progress: 100,
      updatedAt: new Date(),
      syncedToServer: false
    });
  }
  
  // 放置タスク検出
  async getStaleTasks(userId: string, daysThreshold: number = 3): Promise<Task[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
    
    return await this.tasks
      .where('[userId+status]')
      .equals([userId, 'active'])
      .filter(task => task.lastTouchAt && task.lastTouchAt < thresholdDate)
      .toArray();
  }
  
  // 未同期タスク取得
  async getUnsyncedTasks(limit: number = 50): Promise<Task[]> {
    return await this.tasks
      .where('syncedToServer')
      .equals(false)
      .limit(limit)
      .toArray();
  }
}
```

---

## 🆕 2. ActionReport（行動報告記録）

### 概要
「着手する」ボタンをタップした瞬間を記録する、着手率測定の核心エンティティ。

### TypeScript型定義

```typescript
/**
 * 行動報告記録
 * @table actionReports (IndexedDB), action_reports (SQLite)
 */
export interface ActionReport {
  // ========================================
  // 基本情報
  // ========================================
  reportId: string;            // プライマリキー (UUID)
  taskId: string;              // 外部キー (Task)
  userId: string;              // 外部キー (UserProfile)
  sessionId?: string;          // セッションID（任意）
  
  // ========================================
  // 行動タイミング
  // ========================================
  recommendationShownAt: Date; // タスク推奨UI表示時刻
  actionStartedAt: Date;       // 「着手する」ボタンタップ時刻 ⭐️着手の定義
  actionCompletedAt?: Date;    // 「完了しました」ボタンタップ時刻
  
  timeToStartSec: number;      // 表示→着手の経過時間（秒）
  durationMin?: number;        // 着手→完了の所要時間（分）
  
  // ========================================
  // UI条件（A/Bテスト用）
  // ========================================
  uiCondition: 'dynamic_ui' | 'static_ui';
  uiVariant?: 'task_card' | 'micro_step_card' | 'prepare_step_card';
  saliency?: 0 | 1 | 2 | 3;
  generationId?: string;       // 動的UI生成ID（dynamic_uiの場合）
  
  // ========================================
  // コンテキスト情報
  // ========================================
  contextAtStart: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    location?: string;
    availableTimeMin?: number;
    factorsSnapshot: Record<string, any>; // factors辞書のスナップショット
  };
  
  // ========================================
  // 主観評価（完了時のみ）
  // ========================================
  clarityImprovement?: 1 | 2 | 3; // スッキリ度（1: あまり / 2: 少し / 3: かなり）
  notes?: string;                  // 自由記述（任意）
  
  // ========================================
  // メタデータ
  // ========================================
  createdAt: Date;
  
  // サーバー同期
  syncedToServer: boolean;
  syncedAt?: Date;
}
```

### IndexedDBスキーマ

```typescript
actionReports: 'reportId, taskId, userId, startedAt, uiCondition, syncedToServer, [taskId+startedAt], [userId+startedAt], [uiCondition+startedAt]'
```

### CRUD操作

```typescript
class LocalDatabase extends Dexie {
  actionReports!: Table<ActionReport>;
  
  // 行動開始記録
  async startAction(
    taskId: string,
    userId: string,
    recommendationShownAt: Date,
    uiCondition: 'dynamic_ui' | 'static_ui',
    contextSnapshot: any
  ): Promise<ActionReport> {
    const now = new Date();
    const timeToStartSec = (now.getTime() - recommendationShownAt.getTime()) / 1000;
    
    const report: ActionReport = {
      reportId: generateUUID(),
      taskId,
      userId,
      recommendationShownAt,
      actionStartedAt: now,
      timeToStartSec,
      uiCondition,
      contextAtStart: contextSnapshot,
      createdAt: now,
      syncedToServer: false
    };
    
    await this.actionReports.add(report);
    
    // タスクの着手回数を更新
    await this.tasks.where('taskId').equals(taskId).modify(task => {
      task.totalActionsStarted++;
      task.lastTouchAt = now;
    });
    
    return report;
  }
  
  // 行動完了記録
  async completeAction(
    reportId: string,
    clarityImprovement: 1 | 2 | 3,
    notes?: string
  ): Promise<void> {
    const report = await this.actionReports.get(reportId);
    if (!report) throw new Error('Report not found');
    
    const now = new Date();
    const durationMin = (now.getTime() - report.actionStartedAt.getTime()) / 1000 / 60;
    
    await this.actionReports.update(reportId, {
      actionCompletedAt: now,
      durationMin,
      clarityImprovement,
      notes,
      syncedToServer: false
    });
    
    // タスクの完了回数を更新
    await this.tasks.where('taskId').equals(report.taskId).modify(task => {
      task.totalActionsCompleted++;
    });
  }
  
  // 条件別着手率計算（クライアント側）
  async calculateEngagementRate(userId: string, condition: 'dynamic_ui' | 'static_ui'): Promise<number> {
    // 推奨表示イベント数
    const shownCount = await this.interactionEvents
      .where('[userId+eventType]')
      .equals([userId, 'task_recommendation_shown'])
      .filter(e => e.metadata.uiCondition === condition)
      .count();
    
    // 着手報告数
    const startedCount = await this.actionReports
      .where('[userId+uiCondition]')
      .equals([userId, condition])
      .count();
    
    return shownCount > 0 ? startedCount / shownCount : 0;
  }
}
```

---

## 🔄 3. InteractionEvent（イベントログ拡張）

### 概要
既存の `InteractionEvent` に新しいイベントタイプを追加。

### 新規追加イベントタイプ

```typescript
export type EventType = 
  // 既存（Phase 0で実装済み）
  | 'ui_shown'
  | 'button_tap'
  | 'input_change'
  | 'navigation'
  | 'action_started'
  | 'satisfaction_reported'
  // Phase 2で追加
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
```

### イベントログ構造（拡張版）

```typescript
export interface InteractionEvent {
  eventId: string;
  sessionId: string;
  timestamp: Date;
  eventType: EventType;
  screenId: string;
  componentId?: string;
  
  metadata: {
    // 既存フィールド
    uiVariant?: 'static' | 'dynamic';
    generationId?: string;
    actionId?: string;
    inputValue?: string;
    timeOnScreenSec?: number;
    scrollPosition?: number;
    deviceContext?: object;
    
    // Phase 2追加フィールド
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
```

### 重要イベントの詳細

#### task_recommendation_shown（タスク推奨UI表示）⭐️

```typescript
{
  eventType: 'task_recommendation_shown',
  metadata: {
    uiCondition: 'dynamic_ui',
    taskId: 'task_123',
    taskVariant: 'task_card',
    saliency: 2,
    score: 0.85,
    generationId: 'gen_456',
    factorsSnapshot: {
      time_of_day: 'morning',
      location_category: 'home',
      available_time: 30
    }
  }
}
```

#### task_action_started（タスク着手）⭐️

```typescript
{
  eventType: 'task_action_started',
  metadata: {
    uiCondition: 'dynamic_ui',
    taskId: 'task_123',
    timeToActionSec: 12.5, // UI表示から12.5秒後に着手
  }
}
```

#### task_action_completed（タスク完了）⭐️

```typescript
{
  eventType: 'task_action_completed',
  metadata: {
    taskId: 'task_123',
    durationMin: 25,
    clarityImprovement: 3 // かなりスッキリ
  }
}
```

---

## 🔄 4. UserProfile（拡張）

### 追加フィールド

```typescript
export interface UserProfile {
  // 既存フィールド
  userId: string;
  anonymousId: string;
  createdAt: Date;
  experimentCondition: 'static_ui' | 'dynamic_ui';
  configVersion: string;
  settings: {
    notifications: boolean;
    timerSound: boolean;
    dataCollection: boolean;
  };
  
  // Phase 2追加フィールド
  experimentAssignedAt: Date;           // 実験条件割り当て日時
  experimentId: string;                 // 実験ID（例: "exp_2025_10"）
  conditionOverridden: boolean;         // 手動上書きフラグ（デバッグ用）
  
  // 統計情報（キャッシュ）
  stats?: {
    totalTasksCreated: number;
    totalActionsStarted: number;
    totalActionsCompleted: number;
    averageClarityImprovement: number; // 平均スッキリ度
    lastActivityAt: Date;
  };
}
```

---

## 🆕 5. ExperimentConfig（実験条件設定）

### 概要
サーバー側で管理する実験条件の設定情報。

### TypeScript型定義

```typescript
/**
 * 実験条件設定
 * @table experiment_configs (SQLite, サーバー側のみ)
 */
export interface ExperimentConfig {
  configId: string;            // プライマリキー
  experimentId: string;        // 実験ID（例: "exp_2025_10"）
  version: string;             // バージョン（例: "v1.0"）
  
  // 割り当てルール
  assignmentRule: {
    method: 'hash' | 'random' | 'manual';
    seed?: number;
    splitRatio?: number;       // dynamic_ui の割合（0.0-1.0）
  };
  
  // 条件別パラメータ
  conditions: {
    dynamic_ui: {
      enabled: boolean;
      noveltyLevel: 'low' | 'medium' | 'high';
      model: string;           // 使用するLLMモデル
    };
    static_ui: {
      enabled: boolean;
      templateVersion: string; // 固定UIテンプレートバージョン
    };
  };
  
  // タスク推奨パラメータ
  taskRecommendation: {
    weights: {
      importance: number;      // 例: 0.4
      urgency: number;         // 例: 0.3
      staleness: number;       // 例: 0.2
      contextFit: number;      // 例: 0.1
    };
    logisticParams: {
      urgency: { mid: number; k: number };
      staleness: { mid: number; k: number };
    };
  };
  
  // 実験期間
  startDate: Date;
  endDate?: Date;
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
}
```

---

## 📊 データフロー図

### タスク生成フロー

```
[ConcernInputScreen]
  ↓ concernText
[DynamicThoughtScreen (capture)]
  ↓ captureResult
[DynamicThoughtScreen (plan)]
  ↓ planResult
[DynamicThoughtScreen (breakdown)]
  ↓ breakdownResult
  → Task生成
    → db.tasks.add(task)
      → IndexedDB保存
      → サーバー同期（バックグラウンド）
```

### タスク推奨・行動報告フロー

```
[TaskRecommendationScreen]
  ↓
  GET /v1/task/rank
    ← 推奨タスク返却
  ↓
  イベント記録: task_recommendation_shown
  ↓
  タスクカード表示（TaskCardWidget）
  ↓
  【ユーザーが「着手する」ボタンをタップ】⭐️着手の定義
  ↓
  db.actionReports.startAction()
  イベント記録: task_action_started
  ↓
  【ユーザーがタスク実行】
  ↓
  【ユーザーが「完了しました」ボタンをタップ】
  ↓
  [ClarityFeedbackModal表示]
    ユーザーがスッキリ度を選択（1/2/3）
  ↓
  db.actionReports.completeAction()
  イベント記録: task_action_completed
  イベント記録: clarity_feedback_submitted
  ↓
  サーバー同期（バックグラウンド）
```

### 着手率計算フロー

```
[サーバー側 - MetricsService]
  ↓
  SELECT COUNT(*) FROM event_logs 
    WHERE event_type = 'task_recommendation_shown' 
    AND metadata->>'uiCondition' = 'dynamic_ui'
  → shownCount_dynamic
  ↓
  SELECT COUNT(*) FROM action_reports 
    WHERE ui_condition = 'dynamic_ui'
  → startedCount_dynamic
  ↓
  engagementRate_dynamic = startedCount_dynamic / shownCount_dynamic
  
  （static_uiも同様）
  ↓
  比較: engagementRate_dynamic vs engagementRate_static
```

---

## 🔐 プライバシー・セキュリティ

### データ保存場所

| データ | ローカル保存 | サーバー送信 | 備考 |
|--------|-------------|-------------|------|
| Task.title | ✅ | ✅ | ユーザー明示入力 |
| Task.description | ✅ | ✅ | ユーザー明示入力 |
| factorsSnapshot | ✅ | ✅（抽象化） | システム自動取得 |
| ActionReport.notes | ✅ | ✅ | ユーザー明示入力 |
| userId | ✅ | ❌ | ローカルのみ |
| anonymousId | ✅ | ✅ | ハッシュ化ID |

### 匿名化戦略

```typescript
// サーバー送信時の匿名化処理
function anonymizeForServer(data: any): any {
  return {
    ...data,
    userId: undefined,           // ローカルIDは送信しない
    anonymousId: data.anonymousId, // ハッシュ化IDのみ
    factorsSnapshot: abstractFactors(data.factorsSnapshot) // factors抽象化
  };
}

function abstractFactors(factors: Record<string, any>): Record<string, any> {
  return {
    time_of_day: factors.time_of_day,          // OK（抽象的）
    location_category: factors.location_category, // OK（抽象的）
    // GPS座標などは送信しない
  };
}
```

---

## 📝 実装チェックリスト

### Step 1: データモデル実装

- [ ] Task型定義追加（`/concern-app/src/types/database.ts`）
- [ ] ActionReport型定義追加
- [ ] EventType拡張
- [ ] UserProfile拡張
- [ ] IndexedDBスキーマv2追加（LocalDatabase.ts）
- [ ] Task CRUD操作実装
- [ ] ActionReport CRUD操作実装
- [ ] マイグレーション処理実装

### Step 1-サーバー: データモデル実装

- [ ] Task型定義（サーバー側）
- [ ] ActionReport型定義（サーバー側）
- [ ] ExperimentConfig型定義
- [ ] SQLiteスキーマ定義
- [ ] マイグレーション処理

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**最終更新**: 2025年10月18日

