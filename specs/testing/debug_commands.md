# Phase 2 デバッグコマンド集

**対象**: エンドユーザーテスト実施時のデータ確認・トラブルシューティング

---

## 📊 データ確認コマンド

### IndexedDB 初期化

```javascript
// ブラウザConsoleで実行

// Dexieインスタンス作成
const db = new Dexie('ConcernApp');
db.version(2).stores({
  userProfile: 'userId',
  tasks: 'taskId, userId, status',
  actionReports: 'reportId, taskId, userId',
  interactionEvents: 'eventId, eventType'
});
await db.open();

console.log('✅ Database opened');
```

---

## 👤 ユーザー情報確認

```javascript
// ユーザープロファイル取得
const user = await db.userProfile.toCollection().first();
console.log('User:', user);

// 確認項目
console.log({
  userId: user.userId,
  anonymousId: user.anonymousId,
  experimentCondition: user.experimentCondition,
  createdAt: user.createdAt
});
```

---

## 📝 タスク一覧確認

```javascript
// 全タスク取得
const allTasks = await db.tasks.toArray();
console.log('Total tasks:', allTasks.length);

// アクティブタスクのみ
const activeTasks = await db.tasks.where('status').equals('active').toArray();
console.log('Active tasks:', activeTasks);

// タスク詳細表示
activeTasks.forEach(task => {
  console.log({
    title: task.title,
    importance: task.importance,
    urgency: task.urgency,
    totalActionsStarted: task.totalActionsStarted,
    totalActionsCompleted: task.totalActionsCompleted,
    estimateMin: task.estimateMin
  });
});
```

---

## ⭐ ActionReport確認（最重要）

```javascript
// 全ActionReport取得
const reports = await db.actionReports.toArray();
console.log('Total reports:', reports.length);

// 最新のレポート
const latestReport = reports[reports.length - 1];
console.log('Latest ActionReport:', {
  reportId: latestReport.reportId,
  taskId: latestReport.taskId,
  timeToStartSec: latestReport.timeToStartSec,
  durationMin: latestReport.durationMin,
  clarityImprovement: latestReport.clarityImprovement,
  uiCondition: latestReport.uiCondition,
  notes: latestReport.notes
});

// timeToStartSec の精度確認
console.log(`⏱ Time to start: ${latestReport.timeToStartSec.toFixed(2)} seconds`);
console.log(`⏱ Duration: ${latestReport.durationMin?.toFixed(2)} minutes`);
console.log(`😊 Clarity: ${latestReport.clarityImprovement}/3`);
```

---

## 📊 イベントログ確認

```javascript
// 全イベント数
const totalEvents = await db.interactionEvents.count();
console.log('Total events:', totalEvents);

// イベントタイプ別集計
const eventTypes = {};
const allEvents = await db.interactionEvents.toArray();
allEvents.forEach(e => {
  eventTypes[e.eventType] = (eventTypes[e.eventType] || 0) + 1;
});
console.log('Event types:', eventTypes);

// Phase 2重要イベントのみ抽出
const phase2Events = await db.interactionEvents
  .where('eventType')
  .anyOf([
    'task_recommendation_shown',
    'task_action_started',
    'task_action_completed',
    'clarity_feedback_submitted',
    'task_created'
  ])
  .toArray();

console.log('Phase 2 events:', phase2Events.length);
phase2Events.forEach(e => {
  console.log({
    eventType: e.eventType,
    timestamp: new Date(e.timestamp).toLocaleTimeString(),
    metadata: e.metadata
  });
});
```

---

## 🔍 特定タスクの詳細確認

```javascript
// タスクID指定
const taskId = 'YOUR_TASK_ID'; // ここにタスクIDを入れる

// タスク情報
const task = await db.tasks.get(taskId);
console.log('Task:', task);

// 関連ActionReports
const taskReports = await db.actionReports
  .where('taskId')
  .equals(taskId)
  .toArray();
console.log('Action reports for this task:', taskReports);

// 関連イベント
const taskEvents = await db.interactionEvents
  .filter(e => e.metadata?.taskId === taskId)
  .toArray();
console.log('Events for this task:', taskEvents);

// 統計情報
console.log('Statistics:', {
  actionsStarted: task.totalActionsStarted,
  actionsCompleted: task.totalActionsCompleted,
  completionRate: task.totalActionsStarted > 0 
    ? (task.totalActionsCompleted / task.totalActionsStarted * 100).toFixed(1) + '%'
    : '0%'
});
```

---

## 📈 着手率計算

```javascript
// 推奨表示イベント数
const shownEvents = await db.interactionEvents
  .where('eventType')
  .equals('task_recommendation_shown')
  .count();

// 着手イベント数
const startedEvents = await db.interactionEvents
  .where('eventType')
  .equals('task_action_started')
  .count();

// 着手率計算
const engagementRate = shownEvents > 0 
  ? (startedEvents / shownEvents * 100).toFixed(1)
  : 0;

console.log('📊 Engagement Metrics:', {
  recommendationsShown: shownEvents,
  actionsStarted: startedEvents,
  engagementRate: engagementRate + '%'
});
```

---

## 😊 スッキリ度統計

```javascript
// スッキリ度データ取得
const reportsWithClarity = await db.actionReports
  .filter(r => r.clarityImprovement !== undefined)
  .toArray();

// 集計
const clarityStats = {
  level1: 0,
  level2: 0,
  level3: 0,
  total: reportsWithClarity.length
};

reportsWithClarity.forEach(r => {
  clarityStats[`level${r.clarityImprovement}`]++;
});

// 平均計算
const avgClarity = reportsWithClarity.length > 0
  ? reportsWithClarity.reduce((sum, r) => sum + r.clarityImprovement, 0) / reportsWithClarity.length
  : 0;

console.log('😊 Clarity Statistics:', {
  '😐 あまりスッキリしない (1)': clarityStats.level1,
  '🙂 少しスッキリ (2)': clarityStats.level2,
  '😊 かなりスッキリ (3)': clarityStats.level3,
  total: clarityStats.total,
  average: avgClarity.toFixed(2)
});
```

---

## 🧹 データクリーンアップ

### 全データ削除（注意！）

```javascript
// ⚠️ 警告: 全てのデータが削除されます
if (confirm('本当に全データを削除しますか？')) {
  await db.delete();
  console.log('✅ Database deleted');
  location.reload();
}
```

### 特定テーブルのみクリア

```javascript
// タスクのみ削除
await db.tasks.clear();
console.log('✅ Tasks cleared');

// ActionReportsのみ削除
await db.actionReports.clear();
console.log('✅ ActionReports cleared');

// イベントログのみ削除
await db.interactionEvents.clear();
console.log('✅ Events cleared');
```

---

## 🔧 テストデータ生成

### サンプルタスク作成

```javascript
// テスト用タスク3件作成
const user = await db.userProfile.toCollection().first();

const testTasks = [
  {
    userId: user.userId,
    title: '英語リスニング練習',
    description: 'TOEIC Part 2の問題を10問解く',
    importance: 0.8,
    urgency: 0.6,
    estimateMin: 20,
    hasIndependentMicroStep: false,
    status: 'active',
    progress: 0,
    source: 'manual',
    totalActionsStarted: 0,
    totalActionsCompleted: 0,
    syncedToServer: false
  },
  {
    userId: user.userId,
    title: '論文要約作成',
    description: '研究論文3本の要約をまとめる',
    importance: 0.9,
    urgency: 0.8,
    estimateMin: 45,
    hasIndependentMicroStep: false,
    status: 'active',
    progress: 0,
    source: 'manual',
    totalActionsStarted: 0,
    totalActionsCompleted: 0,
    syncedToServer: false
  },
  {
    userId: user.userId,
    title: 'ジョギング',
    description: '近所を30分ジョギング',
    importance: 0.5,
    urgency: 0.3,
    estimateMin: 30,
    hasIndependentMicroStep: false,
    status: 'active',
    progress: 0,
    source: 'manual',
    totalActionsStarted: 0,
    totalActionsCompleted: 0,
    syncedToServer: false
  }
];

for (const taskData of testTasks) {
  const task = {
    ...taskData,
    taskId: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await db.tasks.add(task);
  console.log('✅ Created:', task.title);
}

console.log('✅ 3 test tasks created');
```

---

## 🐛 トラブルシューティング

### 問題: timeToStartSec が 0

```javascript
// 原因調査
const reports = await db.actionReports.toArray();
const problematicReports = reports.filter(r => r.timeToStartSec === 0);
console.log('Reports with timeToStartSec=0:', problematicReports.length);

// 詳細確認
problematicReports.forEach(r => {
  console.log({
    reportId: r.reportId,
    recommendationShownAt: r.recommendationShownAt,
    actionStartedAt: r.actionStartedAt,
    timeToStartSec: r.timeToStartSec
  });
});
```

### 問題: イベントが記録されない

```javascript
// 直近5分のイベント確認
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
const recentEvents = await db.interactionEvents
  .where('timestamp')
  .above(fiveMinutesAgo)
  .toArray();

console.log('Recent events (last 5 min):', recentEvents.length);
recentEvents.forEach(e => {
  console.log({
    eventType: e.eventType,
    time: new Date(e.timestamp).toLocaleTimeString()
  });
});
```

### 問題: タスクカウンターが更新されない

```javascript
// タスクとActionReportの整合性確認
const tasks = await db.tasks.toArray();

for (const task of tasks) {
  const reports = await db.actionReports
    .where('taskId')
    .equals(task.taskId)
    .toArray();
  
  const actualStarted = reports.length;
  const actualCompleted = reports.filter(r => r.actionCompletedAt).length;
  
  console.log(`Task: ${task.title}`);
  console.log({
    recorded: {
      started: task.totalActionsStarted,
      completed: task.totalActionsCompleted
    },
    actual: {
      started: actualStarted,
      completed: actualCompleted
    },
    match: task.totalActionsStarted === actualStarted 
      && task.totalActionsCompleted === actualCompleted
  });
}
```

---

## 📤 データエクスポート

### JSON形式でエクスポート

```javascript
// 全データをJSONで取得
const exportData = {
  user: await db.userProfile.toArray(),
  tasks: await db.tasks.toArray(),
  actionReports: await db.actionReports.toArray(),
  events: await db.interactionEvents.toArray(),
  exportedAt: new Date().toISOString()
};

// JSON文字列化
const json = JSON.stringify(exportData, null, 2);

// ダウンロード
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `phase2-test-data-${Date.now()}.json`;
a.click();

console.log('✅ Data exported');
```

### CSV形式でActionReports出力

```javascript
// ActionReportsをCSV形式で取得
const reports = await db.actionReports.toArray();

const csv = [
  // ヘッダー
  'reportId,taskId,timeToStartSec,durationMin,clarityImprovement,uiCondition',
  // データ行
  ...reports.map(r => 
    `${r.reportId},${r.taskId},${r.timeToStartSec},${r.durationMin || ''},${r.clarityImprovement || ''},${r.uiCondition}`
  )
].join('\n');

// ダウンロード
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `action-reports-${Date.now()}.csv`;
a.click();

console.log('✅ CSV exported');
```

---

## 🔄 データ修復

### タスクカウンター再計算

```javascript
// 全タスクのカウンターを実際のActionReportから再計算
const tasks = await db.tasks.toArray();

for (const task of tasks) {
  const reports = await db.actionReports
    .where('taskId')
    .equals(task.taskId)
    .toArray();
  
  const started = reports.length;
  const completed = reports.filter(r => r.actionCompletedAt).length;
  
  await db.tasks.update(task.taskId, {
    totalActionsStarted: started,
    totalActionsCompleted: completed
  });
  
  console.log(`✅ Updated ${task.title}: ${started} started, ${completed} completed`);
}

console.log('✅ All task counters recalculated');
```

---

## 📊 統計レポート生成

```javascript
// 包括的な統計レポート
async function generateTestReport() {
  const user = await db.userProfile.toCollection().first();
  const tasks = await db.tasks.toArray();
  const reports = await db.actionReports.toArray();
  const events = await db.interactionEvents.toArray();
  
  // 基本統計
  const activeTasks = tasks.filter(t => t.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  
  // 着手率
  const shownCount = events.filter(e => e.eventType === 'task_recommendation_shown').length;
  const startedCount = events.filter(e => e.eventType === 'task_action_started').length;
  const engagementRate = shownCount > 0 ? (startedCount / shownCount * 100) : 0;
  
  // スッキリ度
  const clarityReports = reports.filter(r => r.clarityImprovement);
  const avgClarity = clarityReports.length > 0
    ? clarityReports.reduce((sum, r) => sum + r.clarityImprovement, 0) / clarityReports.length
    : 0;
  
  // 平均着手時間
  const avgTimeToStart = reports.length > 0
    ? reports.reduce((sum, r) => sum + r.timeToStartSec, 0) / reports.length
    : 0;
  
  const report = {
    testDate: new Date().toLocaleString(),
    user: {
      userId: user.userId,
      condition: user.experimentCondition
    },
    tasks: {
      total: tasks.length,
      active: activeTasks.length,
      completed: completedTasks.length
    },
    actions: {
      total: reports.length,
      completed: reports.filter(r => r.actionCompletedAt).length
    },
    engagement: {
      shown: shownCount,
      started: startedCount,
      rate: engagementRate.toFixed(1) + '%'
    },
    clarity: {
      average: avgClarity.toFixed(2),
      level1: clarityReports.filter(r => r.clarityImprovement === 1).length,
      level2: clarityReports.filter(r => r.clarityImprovement === 2).length,
      level3: clarityReports.filter(r => r.clarityImprovement === 3).length
    },
    timing: {
      avgTimeToStartSec: avgTimeToStart.toFixed(2)
    },
    events: {
      total: events.length,
      phase2Events: events.filter(e => 
        ['task_recommendation_shown', 'task_action_started', 'task_action_completed'].includes(e.eventType)
      ).length
    }
  };
  
  console.log('📊 Test Report:');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}

// 実行
const report = await generateTestReport();
```

---

**使い方**:
1. ブラウザのConsoleで上記コマンドをコピペ実行
2. 問題がある場合はトラブルシューティングコマンドを使用
3. データをエクスポートして分析

**注意**: `await` を使用するため、Console で実行してください

