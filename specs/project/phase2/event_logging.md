# Phase 2 イベントログ定義

**作成日**: 2025年10月18日  
**目的**: 着手率測定とユーザー行動分析

---

## 📋 イベントログ概要

### 主要測定指標との対応

| 測定指標 | 必要イベント |
|---------|-------------|
| **着手率** ⭐️ | `task_recommendation_shown` → `task_action_started` |
| **スッキリ度** ⭐️ | `task_action_completed` → `clarity_feedback_submitted` |
| **完了率** | `task_action_started` → `task_action_completed` |
| **UI効果** | `uiCondition='dynamic_ui'` vs `'static_ui'` |
| **variant効果** | `taskVariant` 別の着手率 |
| **saliency効果** | `saliency` 別の着手率 |

---

## 🎯 1. タスク推奨関連イベント（最重要）

### task_recommendation_shown ⭐️

**概要**: タスク推奨UIが表示された瞬間を記録。着手率計算の分母。

**発火タイミング**: TaskRecommendationScreen表示時

**イベント構造**:

```typescript
{
  eventId: "evt_abc123",
  eventType: "task_recommendation_shown",
  timestamp: "2025-10-18T10:00:00Z",
  sessionId: "sess_xyz789",
  screenId: "task_recommendation",
  
  metadata: {
    // A/Bテスト条件 ⭐️
    uiCondition: "dynamic_ui",  // or "static_ui"
    
    // タスク情報
    taskId: "task_456",
    taskTitle: "論文を読む",  // ローカルのみ
    
    // UI variant ⭐️
    taskVariant: "task_card",  // or "micro_step_card" or "prepare_step_card"
    
    // Saliency ⭐️
    saliency: 2,  // 0, 1, 2, 3
    
    // スコア情報
    score: 0.85,
    scoreBreakdown: {
      importance: 0.32,     // 0.4 * 0.8
      urgency: 0.27,        // 0.3 * 0.9
      staleness: 0.16,      // 0.2 * 0.8
      contextFit: 0.10      // 0.1 * 1.0
    },
    
    // UI生成情報（動的UIの場合）
    generationId: "gen_789",
    
    // コンテキスト
    factorsSnapshot: {
      time_of_day: "morning",
      location_category: "home",
      available_time: 30
    }
  }
}
```

**実装例**:

```typescript
// TaskRecommendationScreen.tsx
useEffect(() => {
  if (recommendedTask) {
    eventLogger.log({
      eventType: 'task_recommendation_shown',
      screenId: 'task_recommendation',
      metadata: {
        uiCondition: experimentCondition,
        taskId: recommendedTask.taskId,
        taskTitle: recommendedTask.title,
        taskVariant: variant,
        saliency: saliency,
        score: score,
        scoreBreakdown: scoreBreakdown,
        generationId: generationId,
        factorsSnapshot: currentFactors
      }
    });
    
    // 表示時刻を記録（着手までの時間計測用）
    setRecommendationShownAt(new Date());
  }
}, [recommendedTask]);
```

---

### task_action_started ⭐️

**概要**: 「着手する」ボタンをタップした瞬間を記録。**着手の定義**。着手率計算の分子。

**発火タイミング**: 「着手する」ボタンタップ時

**イベント構造**:

```typescript
{
  eventId: "evt_def456",
  eventType: "task_action_started",
  timestamp: "2025-10-18T10:00:12Z",
  sessionId: "sess_xyz789",
  screenId: "task_recommendation",
  
  metadata: {
    // A/Bテスト条件 ⭐️
    uiCondition: "dynamic_ui",
    
    // タスク情報
    taskId: "task_456",
    
    // 着手までの時間 ⭐️
    timeToActionSec: 12.5,  // recommendationShownAt → actionStartedAt
    
    // 行動報告ID
    reportId: "report_123",
    
    // UI情報
    taskVariant: "task_card",
    saliency: 2,
    
    // コンテキスト
    contextAtStart: {
      time_of_day: "morning",
      location_category: "home",
      available_time: 30,
      battery_level: 85
    }
  }
}
```

**実装例**:

```typescript
// TaskRecommendationScreen.tsx
const handleActionStart = async () => {
  if (!recommendedTask || !recommendationShownAt) return;
  
  const now = new Date();
  const timeToActionSec = (now.getTime() - recommendationShownAt.getTime()) / 1000;
  
  // ActionReport作成
  const report = await db.startAction(
    recommendedTask.taskId,
    userId,
    recommendationShownAt,
    experimentCondition,
    currentFactors
  );
  
  // ⭐️着手イベント記録
  await eventLogger.log({
    eventType: 'task_action_started',
    screenId: 'task_recommendation',
    metadata: {
      uiCondition: experimentCondition,
      taskId: recommendedTask.taskId,
      timeToActionSec: timeToActionSec,
      reportId: report.reportId,
      taskVariant: variant,
      saliency: saliency,
      contextAtStart: currentFactors
    }
  });
  
  // ActionReportModal表示
  setActionReportId(report.reportId);
  setShowActionReportModal(true);
};
```

---

### task_action_completed ⭐️

**概要**: タスク完了を記録。完了率計算に使用。

**発火タイミング**: ClarityFeedbackModalで送信ボタンタップ時

**イベント構造**:

```typescript
{
  eventId: "evt_ghi789",
  eventType: "task_action_completed",
  timestamp: "2025-10-18T10:25:00Z",
  sessionId: "sess_xyz789",
  screenId: "clarity_feedback_modal",
  
  metadata: {
    taskId: "task_456",
    reportId: "report_123",
    
    // 所要時間 ⭐️
    durationMin: 25,  // actionStartedAt → actionCompletedAt
    
    // スッキリ度 ⭐️
    clarityImprovement: 3,  // 1, 2, 3
    
    // メモの有無
    hasNotes: true,
    
    // タスク完了状態
    taskCompleted: true  // タスク自体が完了したかどうか
  }
}
```

**実装例**:

```typescript
// ClarityFeedbackModal.tsx
const handleSubmit = async () => {
  // ActionReport完了処理
  await db.completeAction(
    actionReportId,
    clarityImprovement,
    notes
  );
  
  // ⭐️完了イベント記録
  await eventLogger.log({
    eventType: 'task_action_completed',
    screenId: 'clarity_feedback_modal',
    metadata: {
      taskId: task.taskId,
      reportId: actionReportId,
      durationMin: elapsedMin,
      clarityImprovement: clarityImprovement,
      hasNotes: !!notes,
      taskCompleted: true
    }
  });
  
  setShowClarityFeedbackModal(false);
  showToast('お疲れ様でした！');
};
```

---

### task_action_paused

**概要**: タスク実行を中断。

**発火タイミング**: ActionReportModalで「中断」ボタンタップ時

**イベント構造**:

```typescript
{
  eventId: "evt_jkl012",
  eventType: "task_action_paused",
  timestamp: "2025-10-18T10:15:00Z",
  sessionId: "sess_xyz789",
  screenId: "action_report_modal",
  
  metadata: {
    taskId: "task_456",
    reportId: "report_123",
    durationMin: 15,  // 中断までの経過時間
    reason: "user_initiated"  // "user_initiated" or "app_background"
  }
}
```

---

## 🎯 2. スッキリ度測定イベント

### clarity_feedback_submitted ⭐️

**概要**: スッキリ度フィードバック送信。研究の副次測定指標。

**発火タイミング**: ClarityFeedbackModalで送信ボタンタップ時

**イベント構造**:

```typescript
{
  eventId: "evt_mno345",
  eventType: "clarity_feedback_submitted",
  timestamp: "2025-10-18T10:25:00Z",
  sessionId: "sess_xyz789",
  screenId: "clarity_feedback_modal",
  
  metadata: {
    taskId: "task_456",
    reportId: "report_123",
    
    // スッキリ度 ⭐️
    clarityImprovement: 3,  // 1: あまり, 2: 少し, 3: かなり
    
    // メモ
    hasNotes: true,
    notesLength: 50,
    
    // フィードバック所要時間
    feedbackTimeMs: 8500,  // モーダル表示 → 送信
    
    // A/Bテスト条件
    uiCondition: "dynamic_ui"
  }
}
```

---

## 🎯 3. タスク管理イベント

### task_created

**概要**: タスク作成。

**発火タイミング**: TaskCreateScreenで「作成」ボタンタップ時

**イベント構造**:

```typescript
{
  eventId: "evt_pqr678",
  eventType: "task_created",
  timestamp: "2025-10-18T09:00:00Z",
  sessionId: "sess_xyz789",
  screenId: "task_create",
  
  metadata: {
    taskId: "task_456",
    source: "manual",  // "manual" or "ai_generated" or "breakdown_flow"
    concernId: "concern_123",  // 関連する関心事（あれば）
    
    // タスク属性
    importance: 0.8,
    hasDeadline: true,
    hasDescription: true,
    estimateMin: 30
  }
}
```

---

### task_updated

**概要**: タスク更新。

**発火タイミング**: TaskEditScreenで「保存」ボタンタップ時

**イベント構造**:

```typescript
{
  eventId: "evt_stu901",
  eventType: "task_updated",
  timestamp: "2025-10-18T11:00:00Z",
  sessionId: "sess_xyz789",
  screenId: "task_edit",
  
  metadata: {
    taskId: "task_456",
    
    // 変更フィールド
    changedFields: ["importance", "dueInHours"],
    
    // 変更前後（ローカルのみ）
    before: { importance: 0.8, dueInHours: 48 },
    after: { importance: 0.9, dueInHours: 24 }
  }
}
```

---

### task_deleted

**概要**: タスク削除。

**発火タイミング**: タスク削除確認ダイアログで「削除」タップ時

**イベント構造**:

```typescript
{
  eventId: "evt_vwx234",
  eventType: "task_deleted",
  timestamp: "2025-10-18T12:00:00Z",
  sessionId: "sess_xyz789",
  screenId: "task_list",
  
  metadata: {
    taskId: "task_456",
    
    // 削除時のタスク状態
    status: "active",  // "active" or "completed"
    totalActionsStarted: 5,
    totalActionsCompleted: 3,
    
    // 削除理由（任意）
    reason: "user_initiated"  // "user_initiated" or "cleanup"
  }
}
```

---

## 🎯 4. A/Bテスト関連イベント

### experiment_condition_assigned

**概要**: 実験条件の初回割り当て。

**発火タイミング**: アプリ初回起動時、`/v1/config` から条件取得後

**イベント構造**:

```typescript
{
  eventId: "evt_yza567",
  eventType: "experiment_condition_assigned",
  timestamp: "2025-10-18T08:00:00Z",
  sessionId: "sess_xyz789",
  screenId: "home",
  
  metadata: {
    experimentId: "exp_2025_10",
    condition: "dynamic_ui",  // "dynamic_ui" or "static_ui"
    assignmentMethod: "hash",  // "hash" or "random" or "manual"
    configVersion: "v1.0"
  }
}
```

---

### experiment_condition_switched

**概要**: 実験条件の手動切り替え（デバッグ用）。

**発火タイミング**: SettingsScreenで条件切り替えボタンタップ時

**イベント構造**:

```typescript
{
  eventId: "evt_bcd890",
  eventType: "experiment_condition_switched",
  timestamp: "2025-10-18T13:00:00Z",
  sessionId: "sess_xyz789",
  screenId: "settings",
  
  metadata: {
    previousCondition: "dynamic_ui",
    newCondition: "static_ui",
    reason: "user_manual_switch",  // デバッグ用フラグ
    debugMode: true
  }
}
```

---

## 🎯 5. 画面遷移イベント

### screen_view

**概要**: 画面表示。

**発火タイミング**: 各画面のuseEffect

**イベント構造**:

```typescript
{
  eventId: "evt_efg123",
  eventType: "screen_view",
  timestamp: "2025-10-18T10:00:00Z",
  sessionId: "sess_xyz789",
  screenId: "task_recommendation",
  
  metadata: {
    previousScreen: "home",
    uiCondition: "dynamic_ui",
    navigationMethod: "button_tap"  // "button_tap" or "back_button" or "deep_link"
  }
}
```

---

## 📊 イベントログ収集フロー

### クライアント側バッファリング

```typescript
// /concern-app/src/services/EventLogger.ts
class EventLogger {
  private buffer: InteractionEvent[] = [];
  private readonly BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 30000; // 30秒
  
  constructor() {
    // 定期的にフラッシュ
    setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
    
    // アプリ終了時にフラッシュ
    window.addEventListener('beforeunload', () => this.flush());
  }
  
  async log(event: Omit<InteractionEvent, 'eventId' | 'timestamp' | 'sessionId'>): Promise<void> {
    const fullEvent: InteractionEvent = {
      ...event,
      eventId: generateUUID(),
      timestamp: new Date(),
      sessionId: sessionManager.getCurrentSessionId(),
      syncedToServer: false
    };
    
    // ローカルDBに保存
    await db.recordEvent(fullEvent);
    
    // バッファに追加
    this.buffer.push(fullEvent);
    
    // バッファが満杯になったらフラッシュ
    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }
  }
  
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    try {
      // バッチ送信
      await apiService.sendEventsBatch(this.buffer);
      
      // バッファをクリア
      this.buffer = [];
      
      console.log('✅ Events flushed successfully');
      
    } catch (error) {
      console.error('❌ Failed to flush events:', error);
      // エラー時はバッファを保持（次回リトライ）
    }
  }
}

export const eventLogger = new EventLogger();
```

---

## 📈 着手率計算ロジック

### サーバー側実装

```typescript
// /server/src/services/MetricsService.ts
class MetricsService {
  async calculateEngagementRate(
    condition: 'dynamic_ui' | 'static_ui',
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    // 推奨表示イベント数（分母）
    const shownCount = await this.countEvents({
      eventType: 'task_recommendation_shown',
      condition,
      startDate,
      endDate
    });
    
    // 着手イベント数（分子）
    const startedCount = await this.countEvents({
      eventType: 'task_action_started',
      condition,
      startDate,
      endDate
    });
    
    // 着手率 = 着手数 / 推奨表示数
    return shownCount > 0 ? startedCount / shownCount : 0;
  }
  
  async calculateAverageClarityImprovement(
    condition: 'dynamic_ui' | 'static_ui',
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const events = await this.getEvents({
      eventType: 'clarity_feedback_submitted',
      condition,
      startDate,
      endDate
    });
    
    if (events.length === 0) return 0;
    
    const sum = events.reduce((acc, e) => acc + (e.metadata.clarityImprovement || 0), 0);
    return sum / events.length;
  }
  
  async calculateEngagementByVariant(
    condition: 'dynamic_ui' | 'static_ui'
  ): Promise<Record<string, { engagementRate: number; count: number }>> {
    const variants = ['task_card', 'micro_step_card', 'prepare_step_card'];
    const result: Record<string, any> = {};
    
    for (const variant of variants) {
      const shownCount = await this.countEvents({
        eventType: 'task_recommendation_shown',
        condition,
        filters: { 'metadata.taskVariant': variant }
      });
      
      const startedCount = await this.countEvents({
        eventType: 'task_action_started',
        condition,
        filters: { 'metadata.taskVariant': variant }
      });
      
      result[variant] = {
        engagementRate: shownCount > 0 ? startedCount / shownCount : 0,
        count: shownCount
      };
    }
    
    return result;
  }
}
```

---

## 🔐 プライバシー・匿名化

### ローカル保存 vs サーバー送信

| フィールド | ローカル | サーバー | 備考 |
|-----------|---------|---------|------|
| taskTitle | ✅ | ❌ | タスク内容は送信しない |
| concernText | ✅ | ❌ | 関心事テキストも送信しない |
| userId | ✅ | ❌ | ローカルIDは送信しない |
| anonymousId | ✅ | ✅ | ハッシュ化IDのみ |
| factorsSnapshot | ✅ | ✅（抽象化） | 抽象カテゴリのみ |
| clarityImprovement | ✅ | ✅ | 数値のみ（内容なし） |

### 匿名化処理

```typescript
function anonymizeEvent(event: InteractionEvent): InteractionEvent {
  return {
    ...event,
    metadata: {
      ...event.metadata,
      taskTitle: undefined,  // タイトルは削除
      concernText: undefined, // テキストは削除
      factorsSnapshot: abstractFactors(event.metadata.factorsSnapshot)
    }
  };
}

function abstractFactors(factors: any): any {
  return {
    time_of_day: factors.time_of_day,        // OK（カテゴリ）
    location_category: factors.location_category, // OK（カテゴリ）
    available_time: factors.available_time   // OK（数値）
    // GPS座標などは含めない
  };
}
```

---

## 📝 実装チェックリスト

### Step 6: イベントログシステム実装

- [ ] `/concern-app/src/services/EventLogger.ts` 作成
  - [ ] バッファリングロジック
  - [ ] 自動フラッシュ
  - [ ] リトライロジック
- [ ] `/server/src/services/EventLogService.ts` 作成
  - [ ] バッチ処理
  - [ ] データベース保存
- [ ] `/server/src/services/MetricsService.ts` 作成
  - [ ] 着手率計算
  - [ ] スッキリ度平均計算
  - [ ] variant別・saliency別集計
- [ ] 各画面でイベント記録実装
  - [ ] TaskRecommendationScreen
  - [ ] ActionReportModal
  - [ ] ClarityFeedbackModal
  - [ ] TaskListScreen
  - [ ] SettingsScreen

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**最終更新**: 2025年10月18日

