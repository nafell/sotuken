# Phase 2 詳細実装タスク計画
**LLM実装エージェント向け - ステップバイステップガイド**

---

## 📋 実行前の確認事項

### 前提条件
- [ ] Phase 1完了済み（思考整理DSL・タスク推奨DSL・動的UIレンダリング）
- [ ] `specs/project/phase2/overview.md` を読んで全体像を理解済み
- [ ] `specs/project/phase2/data_models.md` を読んでデータ構造を理解済み
- [ ] `specs/project/phase2/api_specification.md` を読んでAPI仕様を理解済み
- [ ] 既存コードベースの構造を理解済み（concern-app/, server/）

### 実行ルール
1. **1タスクずつ実行** - 次に進む前に必ずテストを実行
2. **テスト失敗時は停止** - 人間に相談してから進行
3. **コミットタイミング** - 各メジャータスク完了時にコミット（✅マーク付き）
4. **質問タイミング** - 不明点があれば実装前に人間に確認

---

## 🎯 Phase 2 実装サマリー

| Step | タスク数 | 工数 | 優先度 |
|------|---------|------|--------|
| Step 1: データモデル・API | 16 | 2-3日 | ⭐️⭐️⭐️ |
| Step 2: タスク推奨画面 | 18 | 3-4日 | ⭐️⭐️⭐️ |
| Step 3: 思考整理フロー統合 | 12 | 4-5日 | ⭐️⭐️⭐️ |
| Step 4: 固定UI版整備 | 10 | 3-4日 | ⭐️⭐️ |
| Step 5: A/Bテスト機構（手動割り当て） | 15 | 3-4日 | ⭐️⭐️⭐️ |
| Step 6: 測定・ログシステム | 12 | 2-3日 | ⭐️⭐️⭐️ |

**合計**: 83タスク、17-23日

**設計変更**: 
- Step 4とStep 5を入れ替え（固定UI版を先に実装することでA/Bテスト時の検証が容易に）
- Step 5を手動割り当て方式に変更（被験者数が少ないため）

---

## 🔨 Step 1: データモデル・API統合（2-3日）

### 🎯 目標
Phase 2で必要なTask・ActionReportエンティティと、実験条件配布・イベントログAPIを整備する。

---

### 1.1 Task型定義追加

**目標**: Task entityの型定義のみ作成  
**ファイル**: `/concern-app/src/types/database.ts`

**実装内容**:
- `Task` interface定義（全フィールド）
- taskId, title, importance, urgency等の基本フィールド
- status, progress等の状態管理フィールド
- actionHistory等の履歴フィールド

**成功基準**:
- TypeScriptコンパイルエラーなし
- 全フィールドに型注釈あり

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
# エラーがなければ成功
```

**注意点**: 実装ロジックは含めない（型定義のみ）

**参考**: `specs/project/phase2/data_models.md` のTask型定義

---

### 1.2 ActionReport型定義追加

**目標**: ActionReport entityの型定義作成  
**ファイル**: `/concern-app/src/types/database.ts`

**実装内容**:
- `ActionReport` interface定義
- reportId, taskId, userId等の基本フィールド
- timeToStartSec（着手までの時間）⭐️重要
- clarityImprovement（スッキリ度）⭐️重要
- uiCondition（実験条件）⭐️重要

**成功基準**:
- TypeScriptコンパイルエラーなし
- ActionReport型が完全定義されている

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

**参考**: `specs/project/phase2/data_models.md` のActionReport型定義

---

### 1.3 EventType拡張

**目標**: 新しいイベントタイプを追加  
**ファイル**: `/concern-app/src/types/database.ts`

**実装内容**:
- EventType union型に以下を追加:
  - `task_recommendation_shown` ⭐️
  - `task_action_started` ⭐️
  - `task_action_completed` ⭐️
  - `clarity_feedback_submitted` ⭐️
  - `task_created`, `task_updated`, `task_deleted`
  - `experiment_condition_assigned`, `experiment_condition_switched`

**成功基準**:
- TypeScriptコンパイルエラーなし
- 全イベントタイプがunion型に含まれる

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

**参考**: `specs/project/phase2/event_logging.md`

---

### ✅ 1.4 Commit: クライアント側型定義追加

**コミット内容**:
```bash
git add concern-app/src/types/database.ts
git commit -m "feat(phase2): Add Task, ActionReport types and new EventTypes

- Add Task interface with all required fields
- Add ActionReport interface for engagement tracking
- Extend EventType union with Phase 2 event types
- Ref: specs/project/phase2/data_models.md"
```

---

### 1.5 IndexedDBスキーマv2追加

**目標**: tasksとactionReportsテーブル追加  
**ファイル**: `/concern-app/src/services/database/localDB.ts`

**実装内容**:
- LocalDatabaseクラスに新しいテーブル宣言追加
  - `tasks!: Table<Task>;`
  - `actionReports!: Table<ActionReport>;`
- `this.version(2).stores({...})` で新スキーマ定義
- インデックス設定（userId+status, taskId+startedAt等）

**成功基準**:
- コンパイルエラーなし
- Dexieのバージョン2スキーマが定義されている

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

**注意点**: CRUD操作はまだ実装しない（スキーマ定義のみ）

**参考**: `specs/project/phase2/data_models.md` のIndexedDBスキーマ

---

### 1.6 Task CRUD操作実装

**目標**: Task entity の基本CRUD操作  
**ファイル**: `/concern-app/src/services/database/localDB.ts`

**実装内容**:
- `createTask()` メソッド実装
- `getActiveTasks()` メソッド実装
- `updateTask()` メソッド実装
- `completeTask()` メソッド実装
- `getStaleTasks()` メソッド実装（放置タスク検出）

**成功基準**:
- 全メソッドがコンパイルエラーなし
- TypeScript型チェック通過

**テスト方法**:
```typescript
// concern-app/tests/localDB_task_test.ts を作成
import { db } from '../src/services/database/localDB';

const testTask = await db.createTask({
  userId: 'test_user',
  title: 'テストタスク',
  importance: 0.8,
  urgency: 0.7,
  estimateMin: 30,
  hasIndependentMicroStep: false,
  status: 'active',
  progress: 0,
  source: 'manual',
  totalActionsStarted: 0,
  totalActionsCompleted: 0,
  syncedToServer: false
});

console.log('Task created:', testTask.taskId);
// taskIdが生成されていることを確認
```

**参考**: `specs/project/phase2/data_models.md` のTask CRUD操作

---

### 1.7 ActionReport CRUD操作実装

**目標**: ActionReport entity の操作実装  
**ファイル**: `/concern-app/src/services/database/localDB.ts`

**実装内容**:
- `startAction()` メソッド実装 ⭐️着手記録
- `completeAction()` メソッド実装 ⭐️完了記録
- タスクの着手回数・完了回数を自動更新

**成功基準**:
- ActionReportが作成できる
- タスクのカウンターが自動更新される

**テスト方法**:
```typescript
// concern-app/tests/localDB_action_test.ts
const report = await db.startAction(
  testTask.taskId,
  'test_user',
  new Date(Date.now() - 10000), // 10秒前に表示
  'dynamic_ui',
  { timeOfDay: 'morning', location: 'home' }
);

console.log('Time to action:', report.timeToStartSec);
// timeToStartSecが約10秒であることを確認

await db.completeAction(report.reportId, 3, 'テストメモ');
console.log('Action completed');
```

**参考**: `specs/project/phase2/data_models.md` のActionReport CRUD操作

---

### ✅ 1.8 Commit: IndexedDB Phase 2スキーマ実装

**コミット内容**:
```bash
git add concern-app/src/services/database/localDB.ts
git commit -m "feat(phase2): Implement IndexedDB v2 schema with Task and ActionReport

- Add tasks and actionReports tables to IndexedDB
- Implement Task CRUD operations (create, get, update, complete, getStaleTasks)
- Implement ActionReport operations (startAction, completeAction)
- Auto-update task counters on action events
- Ref: specs/project/phase2/data_models.md"
```

---

### 1.9 サーバー側Task型定義

**目標**: サーバー側のTask型定義作成  
**ファイル**: `/server/src/types/Task.ts` （新規作成）

**実装内容**:
- クライアント側とほぼ同じTask interface定義
- SQLite用の型調整（Date → string等）

**成功基準**:
- TypeScriptコンパイルエラーなし

**テスト方法**:
```bash
cd /home/tk220307/sotuken/server
bun run build
```

---

### 1.10 サーバー側ActionReport型定義

**目標**: サーバー側のActionReport型定義  
**ファイル**: `/server/src/types/ActionReport.ts` （新規作成）

**実装内容**:
- ActionReport interface定義
- SQLite用の型調整

**成功基準**:
- TypeScriptコンパイルエラーなし

**テスト方法**:
```bash
cd /home/tk220307/sotuken/server
bun run build
```

---

### 1.11 ExperimentService基本骨格

**目標**: 実験条件管理サービスの骨格作成  
**ファイル**: `/server/src/services/ExperimentService.ts` （新規作成）

**実装内容**:
- `ExperimentService` class骨格
- `ExperimentAssignment` interface定義
- メソッドシグネチャのみ（空実装）
  - `getOrAssignCondition()`
  - `assignConditionByHash()`

**成功基準**:
- TypeScriptコンパイルエラーなし
- ExperimentServiceがインスタンス化可能

**テスト方法**:
```bash
cd /home/tk220307/sotuken/server
bun run build
```

---

### 1.12 ExperimentService実装

**目標**: ハッシュベース条件割り当て実装  
**ファイル**: `/server/src/services/ExperimentService.ts`

**実装内容**:
- `assignConditionByHash()` メソッド実装
  - SHA-256ハッシュ計算
  - ハッシュ値から条件決定（偶数=dynamic, 奇数=static）
- `getOrAssignCondition()` メソッド実装
  - 既存割り当てチェック
  - 新規割り当て＋DB保存

**成功基準**:
- 同じuserIdで常に同じ条件が返される
- 割り当て比率がほぼ50:50

**テスト方法**:
```typescript
// server/tests/experiment_service_test.ts
const service = new ExperimentService();

const user1_first = await service.getOrAssignCondition('user_abc123');
const user1_second = await service.getOrAssignCondition('user_abc123');

console.log('Condition consistency:', user1_first.condition === user1_second.condition);
// true であることを確認

// 100ユーザーで割り当て比率テスト
let dynamicCount = 0;
for (let i = 0; i < 100; i++) {
  const result = await service.getOrAssignCondition(`user_${i}`);
  if (result.condition === 'dynamic_ui') dynamicCount++;
}
console.log('Dynamic UI ratio:', dynamicCount / 100);
// 0.4-0.6の範囲であることを確認
```

**参考**: `specs/project/phase2/ab_testing.md` のハッシュベース割り当て

---

### ✅ 1.13 Commit: サーバー側型定義とExperimentService

**コミット内容**:
```bash
git add server/src/types/Task.ts server/src/types/ActionReport.ts server/src/services/ExperimentService.ts
git commit -m "feat(phase2): Add server-side types and ExperimentService

- Add Task and ActionReport type definitions for server
- Implement ExperimentService with hash-based assignment
- Ensure consistent condition assignment per user
- Ref: specs/project/phase2/ab_testing.md"
```

---

### 1.14 GET /v1/config API実装

**目標**: 実験条件配布APIエンドポイント  
**ファイル**: `/server/src/routes/config.ts` （新規作成）

**実装内容**:
- Honoルーター作成
- GET `/` エンドポイント実装
- ExperimentService統合
- 設定オブジェクト構築（weights, uiNoveltyPolicy等）

**成功基準**:
- APIエンドポイントが動作する
- X-User-IDヘッダーから条件を取得できる

**テスト方法**:
```bash
# サーバー起動
cd /home/tk220307/sotuken/server
bun run dev

# 別ターミナルでテスト
curl -X GET http://localhost:3000/v1/config \
  -H "X-User-ID: test_user_123"

# レスポンス例:
# {
#   "configVersion": "v1.0",
#   "experimentAssignment": {
#     "condition": "dynamic_ui",
#     "assignedAt": "2025-10-18T...",
#     "method": "hash"
#   },
#   ...
# }
```

**参考**: `specs/project/phase2/api_specification.md` の /v1/config

---

### 1.15 POST /v1/events/batch API拡張

**目標**: イベントログバッチ送信API実装  
**ファイル**: `/server/src/routes/events.ts` （既存ファイル拡張）

**実装内容**:
- POST `/batch` エンドポイント実装
- バッチイベント受信処理
- データベース保存（簡易実装）

**成功基準**:
- バッチイベントを受信できる
- レスポンスが返る

**テスト方法**:
```bash
curl -X POST http://localhost:3000/v1/events/batch \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test_user_123" \
  -d '{
    "batchId": "batch_001",
    "events": [
      {
        "eventId": "evt_001",
        "eventType": "task_recommendation_shown",
        "timestamp": "2025-10-18T10:00:00Z",
        "metadata": {"taskId": "task_123"}
      }
    ]
  }'

# レスポンス: {"success": true, "receivedCount": 1}
```

**参考**: `specs/project/phase2/api_specification.md` の /v1/events/batch

---

### 1.16 /server/src/index.ts にルート追加

**目標**: 新しいルートを登録  
**ファイル**: `/server/src/index.ts`

**実装内容**:
- config routerをimport
- `app.route('/v1/config', config)` 追加
- events routerが既に登録されていることを確認

**成功基準**:
- サーバー起動時にエラーなし
- 全ルートが登録されている

**テスト方法**:
```bash
cd /home/tk220307/sotuken/server
bun run dev
# "Server started on port 3000" 等のメッセージを確認
```

---

### ✅ 1.17 Commit: Phase 2 API実装

**コミット内容**:
```bash
git add server/src/routes/config.ts server/src/routes/events.ts server/src/index.ts
git commit -m "feat(phase2): Implement /v1/config and /v1/events/batch APIs

- Add GET /v1/config endpoint for experiment condition distribution
- Extend POST /v1/events/batch for Phase 2 event types
- Register new routes in server index
- Ref: specs/project/phase2/api_specification.md"
```

---

## 🔨 Step 2: タスク推奨画面（動的UI版）（3-4日）⭐️最重要

### 🎯 目標
タスク推奨画面と行動報告機能を実装。着手率測定の核心部分。

---

### 2.1 TaskService作成

**目標**: Task操作の抽象化サービス作成  
**ファイル**: `/concern-app/src/services/TaskService.ts` （新規作成）

**実装内容**:
- `TaskService` class実装
- static メソッド実装:
  - `createTask()`
  - `getActiveTasks()`
  - `updateTask()`
  - `deleteTask()`
- LocalDatabase (db) とのインターフェース

**成功基準**:
- TypeScriptコンパイルエラーなし
- TaskServiceがビルド成功

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

---

### 2.2 TaskRecommendationScreen骨格作成

**目標**: タスク推奨画面のReactコンポーネント骨格  
**ファイル**: `/concern-app/src/screens/TaskRecommendationScreen.tsx` （新規作成）

**実装内容**:
- Reactコンポーネント基本構造
- State定義（location, timeOfDay, availableTime等）
- 空のハンドラー関数（fetchRecommendation, handleActionStart）
- 基本的なJSX構造（Loading, Error, Empty state）

**成功基準**:
- コンポーネントがレンダリング可能
- コンパイルエラーなし

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run dev
# ブラウザで /tasks/recommend にアクセス
# 「実装中」等のメッセージが表示されればOK
```

**注意点**: まだAPIは呼ばない（骨格のみ）

---

### 2.3 factors入力UI実装

**目標**: factors（場所・時間帯・利用可能時間）の入力欄追加  
**ファイル**: `/concern-app/src/screens/TaskRecommendationScreen.tsx`

**実装内容**:
- 場所選択Selectコンポーネント
- 時間帯選択Selectコンポーネント
- 利用可能時間NumberInputコンポーネント
- onChange handlers実装

**成功基準**:
- 3つの入力欄が表示される
- 値の変更がstateに反映される

**テスト方法**:
```typescript
// ブラウザ開発ツールのReact DevToolsで確認
// 場所を変更 → stateのlocationが更新される
// 時間帯を変更 → stateのtimeOfDayが更新される
// 利用可能時間を変更 → stateのavailableTimeが更新される
```

---

### 2.4 /v1/task/rank API呼び出し基本実装

**目標**: タスク推奨API呼び出し  
**ファイル**: `/concern-app/src/screens/TaskRecommendationScreen.tsx`

**実装内容**:
- `fetchRecommendation()` メソッド実装
- TaskService.getActiveTasks()呼び出し
- fetch() で /v1/task/rank にPOST
- レスポンス処理（recommendedTask, variant, saliency, score を state に保存）

**成功基準**:
- API呼び出しが成功する
- レスポンスがstateに反映される

**テスト方法**:
```typescript
// 事前にテストタスクをDBに追加
await TaskService.createTask({
  userId: 'test_user',
  title: 'テストタスク',
  importance: 0.8,
  urgency: 0.7,
  estimateMin: 30,
  // ...
});

// ブラウザで画面を開く
// Console.logでrecommendedTaskが表示されることを確認
```

**注意点**: まだイベント記録は実装しない

---

### ✅ 2.5 Commit: TaskRecommendationScreen基本実装

**コミット内容**:
```bash
git add concern-app/src/services/TaskService.ts concern-app/src/screens/TaskRecommendationScreen.tsx
git commit -m "feat(phase2): Implement TaskRecommendationScreen with API integration

- Add TaskService for task CRUD operations
- Create TaskRecommendationScreen component skeleton
- Implement factors input UI (location, time, availableTime)
- Integrate /v1/task/rank API call
- Ref: specs/project/phase2/screen_specifications.md"
```

---

### 2.6 EventLogger基本実装

**目標**: イベントログ記録サービスの骨格  
**ファイル**: `/concern-app/src/services/EventLogger.ts` （新規作成）

**実装内容**:
- `EventLogger` class実装
- `log()` メソッド実装（ローカルDB保存のみ）
- バッファリング機能（空実装）

**成功基準**:
- eventLogger.log()でイベントがIndexedDBに保存される

**テスト方法**:
```typescript
// concern-app/tests/event_logger_test.ts
import { eventLogger } from '../src/services/EventLogger';

await eventLogger.log({
  eventType: 'task_recommendation_shown',
  screenId: 'task_recommendation',
  metadata: { taskId: 'test_123' }
});

console.log('Event logged successfully');
// IndexedDBのinteractionEventsテーブルを確認
```

---

### 2.7 task_recommendation_shown イベント記録

**目標**: タスク推奨UI表示時のイベント記録  
**ファイル**: `/concern-app/src/screens/TaskRecommendationScreen.tsx`

**実装内容**:
- fetchRecommendation()成功後にイベント記録
- recommendationShownAt（Date）を state に保存 ⭐️重要
- eventLogger.log()呼び出し

**成功基準**:
- タスク推奨表示時にイベントが記録される
- recommendationShownAt が保存される

**テスト方法**:
```typescript
// ブラウザでTaskRecommendationScreenを開く
// IndexedDBのinteractionEventsテーブルを確認
// eventType: 'task_recommendation_shown' が記録されていることを確認
```

**参考**: `specs/project/phase2/event_logging.md` の task_recommendation_shown

---

### 2.8 TaskCardWidget表示実装

**目標**: 推奨タスクをTaskCardWidgetで表示  
**ファイル**: `/concern-app/src/screens/TaskRecommendationScreen.tsx`

**実装内容**:
- recommendedTaskがある場合にTaskCardWidget表示
- variant, saliency を props として渡す
- onActionStart prop を空ハンドラーで設定

**成功基準**:
- TaskCardWidgetが表示される
- variant・saliencyが反映されている

**テスト方法**:
```typescript
// ブラウザで画面を開く
// TaskCardWidgetが表示されることを確認
// variant="task_card" などが適用されていることを確認
```

**注意点**: Phase 1CでTaskCardWidgetは実装済み

---

### 2.9 handleActionStart基本実装

**目標**: 「着手する」ボタンのハンドラー実装（ActionReport作成のみ）  
**ファイル**: `/concern-app/src/screens/TaskRecommendationScreen.tsx`

**実装内容**:
- `handleActionStart()` メソッド実装
- db.startAction()呼び出し
- ActionReport作成
- task_action_started イベント記録 ⭐️着手の定義

**成功基準**:
- 着手ボタンタップでActionReportが作成される
- timeToStartSecが正しく計算される

**テスト方法**:
```typescript
// 1. TaskRecommendationScreen表示
// 2. 10秒待つ
// 3. 「着手する」ボタンをタップ
// 4. IndexedDBのactionReportsテーブルを確認
//    → timeToStartSec が約10秒であることを確認
```

**参考**: `specs/project/phase2/event_logging.md` の task_action_started

---

### ✅ 2.10 Commit: 着手測定機能実装

**コミット内容**:
```bash
git add concern-app/src/services/EventLogger.ts concern-app/src/screens/TaskRecommendationScreen.tsx
git commit -m "feat(phase2): Implement engagement tracking (actionStart)

- Add EventLogger service for event recording
- Record task_recommendation_shown event on display
- Implement handleActionStart for engagement tracking
- Calculate timeToStartSec (time from display to action)
- Record task_action_started event
- Ref: specs/project/phase2/event_logging.md"
```

---

### 2.11 ActionReportModal骨格作成

**目標**: 行動報告モーダルの基本構造  
**ファイル**: `/concern-app/src/components/ActionReportModal.tsx` （新規作成）

**実装内容**:
- Modal component基本構造
- props定義（isOpen, onClose, task, reportId, onComplete）
- タイマーState（elapsedSec）
- useEffectでタイマー実装

**成功基準**:
- Modalがレンダリング可能
- タイマーが動作する

**テスト方法**:
```typescript
// TaskRecommendationScreenでhandleActionStart後にModal表示
// タイマーが1秒ごとにカウントアップすることを確認
```

---

### 2.12 ActionReportModal UI実装

**目標**: タイマー表示・完了ボタン・中断ボタン実装  
**ファイル**: `/concern-app/src/components/ActionReportModal.tsx`

**実装内容**:
- タイマー表示（分:秒形式）
- 「完了しました」ボタン
- 「中断」ボタン
- 基本スタイリング

**成功基準**:
- UIが正しく表示される
- ボタンがクリック可能

**テスト方法**:
```typescript
// Modalが表示される
// タイマーが "00:15" のように表示される
// ボタンをクリックするとonCompleteが呼ばれる
```

---

### 2.13 ClarityFeedbackModal骨格作成

**目標**: スッキリ度測定モーダルの基本構造  
**ファイル**: `/concern-app/src/components/ClarityFeedbackModal.tsx` （新規作成）

**実装内容**:
- Modal component基本構造
- props定義（isOpen, onClose, reportId, task, elapsedSec）
- State定義（clarityImprovement, notes）

**成功基準**:
- Modalがレンダリング可能

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

---

### 2.14 ClarityFeedbackModal UI実装

**目標**: 3段階ラジオボタン・メモ入力実装  
**ファイル**: `/concern-app/src/components/ClarityFeedbackModal.tsx`

**実装内容**:
- 3段階ラジオボタングループ
  - 1: あまりスッキリしない 😐
  - 2: 少しスッキリ 🙂
  - 3: かなりスッキリ 😊
- メモ入力欄（TextArea）
- 送信ボタン（clarityImprovementが未選択時はdisabled）

**成功基準**:
- UIが正しく表示される
- ラジオボタンが選択可能
- 送信ボタンが動作する

**テスト方法**:
```typescript
// Modalを表示
// ラジオボタンを選択できることを確認
// メモを入力できることを確認
// 送信ボタンが有効になることを確認
```

---

### 2.15 ClarityFeedbackModal送信処理実装

**目標**: スッキリ度データ送信とイベント記録  
**ファイル**: `/concern-app/src/components/ClarityFeedbackModal.tsx`

**実装内容**:
- `handleSubmit()` 実装
- db.completeAction()呼び出し
- task_action_completed イベント記録 ⭐️
- clarity_feedback_submitted イベント記録
- Modal閉じる処理

**成功基準**:
- ActionReportが完了状態になる
- clarityImprovementが保存される
- イベントが記録される

**テスト方法**:
```typescript
// 1. ActionReportModal → 完了ボタンタップ
// 2. ClarityFeedbackModal表示
// 3. スッキリ度を選択（例: 3）
// 4. 送信ボタンタップ
// 5. IndexedDBのactionReportsテーブル確認
//    → clarityImprovement = 3 が保存されていることを確認
// 6. interactionEventsテーブル確認
//    → task_action_completed イベントが記録されていることを確認
```

**参考**: `specs/project/phase2/event_logging.md` の task_action_completed

---

### ✅ 2.16 Commit: 行動報告・スッキリ度測定実装

**コミット内容**:
```bash
git add concern-app/src/components/ActionReportModal.tsx concern-app/src/components/ClarityFeedbackModal.tsx concern-app/src/screens/TaskRecommendationScreen.tsx
git commit -m "feat(phase2): Implement ActionReport and ClarityFeedback modals

- Add ActionReportModal with timer functionality
- Add ClarityFeedbackModal with 3-level scale
- Implement completeAction with clarity recording
- Record task_action_completed and clarity_feedback_submitted events
- Ref: specs/project/phase2/screen_specifications.md"
```

---

### 2.17 TaskListScreen基本実装

**目標**: タスク一覧表示画面  
**ファイル**: `/concern-app/src/screens/TaskListScreen.tsx` （新規作成）

**実装内容**:
- TaskService.getActiveTasks()呼び出し
- タスク一覧表示（FlatList or map）
- タブ切り替え（アクティブ/完了/アーカイブ）
- 空状態の表示

**成功基準**:
- タスク一覧が表示される
- タブ切り替えが動作する

**テスト方法**:
```typescript
// 事前にタスクを3つ作成
// TaskListScreenを開く
// 3つのタスクが表示されることを確認
// タブを切り替えてフィルタリングされることを確認
```

---

### 2.18 TaskCreateScreen基本実装

**目標**: タスク作成フォーム画面  
**ファイル**: `/concern-app/src/screens/TaskCreateScreen.tsx` （新規作成）

**実装内容**:
- タイトル入力欄
- 重要度スライダー
- 推定時間入力欄
- 作成ボタン
- TaskService.createTask()呼び出し

**成功基準**:
- フォームが表示される
- タスクが作成できる

**テスト方法**:
```typescript
// TaskCreateScreenを開く
// 全フィールドに値を入力
// 作成ボタンをタップ
// IndexedDBのtasksテーブルにタスクが追加されることを確認
```

---

### ✅ 2.19 Commit: タスク管理画面実装

**コミット内容**:
```bash
git add concern-app/src/screens/TaskListScreen.tsx concern-app/src/screens/TaskCreateScreen.tsx
git commit -m "feat(phase2): Implement TaskList and TaskCreate screens

- Add TaskListScreen with tab filtering (active/completed/archived)
- Add TaskCreateScreen with form validation
- Integrate TaskService for CRUD operations
- Ref: specs/project/phase2/screen_specifications.md"
```

---

### 2.20 Step 2統合テスト

**目標**: タスク推奨フロー全体の動作確認  
**テストシナリオ**:

1. TaskCreateScreenでテストタスクを作成
2. TaskRecommendationScreenを開く
3. factors（場所・時間帯・利用可能時間）を入力
4. タスク推奨が表示される（task_recommendation_shownイベント記録）
5. 10秒待つ
6. 「着手する」ボタンをタップ（task_action_startedイベント記録）
7. ActionReportModalが表示される
8. 30秒待つ
9. 「完了しました」ボタンをタップ
10. ClarityFeedbackModalが表示される
11. スッキリ度「3（かなりスッキリ）」を選択
12. 送信ボタンをタップ
13. task_action_completed, clarity_feedback_submittedイベント記録
14. IndexedDBを確認:
    - actionReportsテーブルにレコードあり
    - timeToStartSec ≈ 10秒
    - durationMin ≈ 0.5分（30秒）
    - clarityImprovement = 3

**成功基準**:
- [ ] 全フロー動作
- [ ] 全イベントログ記録
- [ ] ActionReport作成確認
- [ ] timeToStartSec, durationMin, clarityImprovement正確

**テスト方法**: 上記シナリオを手動実行

---

## 🔨 Step 3: 思考整理フロー統合（4-5日）

### 🎯 目標
Phase 1Cで実装したDynamicThoughtScreenを既存の関心事フローに統合し、思考整理結果からタスク生成までの流れを実装する。

---

### 3.1 DynamicUINavigator作成

**目標**: 動的UI版のルーター作成  
**ファイル**: `/concern-app/src/navigators/DynamicUINavigator.tsx` （新規作成）

**実装内容**:
- React Router設定
- 動的UI版の画面ルート定義:
  - `/` → HomeScreen
  - `/concern/capture` → DynamicThoughtScreen (stage=capture)
  - `/concern/plan` → DynamicThoughtScreen (stage=plan)
  - `/concern/breakdown` → DynamicThoughtScreen (stage=breakdown)
  - `/tasks/recommend` → TaskRecommendationScreen
  - `/tasks` → TaskListScreen
  - `/settings` → SettingsScreen

**成功基準**:
- Navigatorがレンダリング可能
- 各ルートが定義されている

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

---

### 3.2 ConcernFlowStateManager作成

**目標**: 関心事フロー全体のstate管理  
**ファイル**: `/concern-app/src/services/ConcernFlowStateManager.ts` （新規作成）

**実装内容**:
- `ConcernFlowState` interface定義
  - concernId, concernText
  - captureResult, planResult, breakdownResult
  - generatedTasks
- SessionStorageまたはReact Contextで状態管理
- saveState(), loadState()メソッド

**成功基準**:
- Stateの保存・読み込みが可能

**テスト方法**:
```typescript
const flowState = new ConcernFlowStateManager();
flowState.saveState({
  concernId: 'concern_123',
  concernText: 'テスト関心事',
  captureResult: { /* ... */ }
});

const loaded = flowState.loadState();
console.log('Loaded concernText:', loaded.concernText);
// 'テスト関心事' が表示されることを確認
```

---

### 3.3 ConcernInputScreenルーティング更新

**目標**: 関心事入力後にcaptureステージへ遷移  
**ファイル**: `/concern-app/src/screens/ConcernInputScreen.tsx`

**実装内容**:
- handleNext()を更新
- concernTextをConcernFlowStateに保存
- `/concern/capture` へナビゲート

**成功基準**:
- 関心事入力後にcapture画面へ遷移する

**テスト方法**:
```typescript
// 1. ConcernInputScreenを開く
// 2. 関心事を入力（例: "英語学習の継続"）
// 3. 次へボタンをタップ
// 4. DynamicThoughtScreen (capture) が開くことを確認
```

---

### ✅ 3.4 Commit: DynamicUINavigatorとフロー状態管理

**コミット内容**:
```bash
git add concern-app/src/navigators/DynamicUINavigator.tsx concern-app/src/services/ConcernFlowStateManager.ts concern-app/src/screens/ConcernInputScreen.tsx
git commit -m "feat(phase2): Add DynamicUINavigator and ConcernFlowStateManager

- Create DynamicUINavigator with all Phase 2 routes
- Implement ConcernFlowStateManager for flow state persistence
- Update ConcernInputScreen to navigate to DynamicThoughtScreen
- Ref: specs/project/phase2/overview.md"
```

---

### 3.5 DynamicThoughtScreen完了時の処理更新

**目標**: 各ステージ完了時の遷移ロジック実装  
**ファイル**: `/concern-app/src/components/screens/DynamicThoughtScreen.tsx`

**実装内容**:
- captureステージ完了 → `/concern/plan` へ遷移
- planステージ完了 → `/concern/breakdown` へ遷移
- breakdownステージ完了 → タスク生成処理呼び出し
- 各ステージの結果をConcernFlowStateに保存

**成功基準**:
- 各ステージ完了後に正しく遷移する
- データが保存される

**テスト方法**:
```typescript
// 1. capture画面で入力完了
// 2. 次へボタンタップ → plan画面へ遷移
// 3. plan画面で入力完了
// 4. 次へボタンタップ → breakdown画面へ遷移
// 5. breakdown画面で入力完了
// 6. 完了ボタンタップ → タスク生成処理実行
```

---

### 3.6 breakdown結果からTask生成ロジック

**目標**: breakdownステージの結果をTask entityに変換  
**ファイル**: `/concern-app/src/services/TaskGenerationService.ts` （新規作成）

**実装内容**:
- `TaskGenerationService` class実装
- `generateTasksFromBreakdown()` メソッド実装
- breakdownResult（DataValue）を解析
- 各アクションをTask entityに変換
- TaskService.createTask()呼び出し

**成功基準**:
- breakdownResultからTaskが生成される
- タスクがIndexedDBに保存される

**テスト方法**:
```typescript
const breakdownResult = {
  BREAKDOWN: {
    actions: [
      { id: 'a1', description: 'Google検索で情報収集', estimateMin: 15 },
      { id: 'a2', description: '関連書籍をリストアップ', estimateMin: 10 }
    ]
  }
};

const tasks = await TaskGenerationService.generateTasksFromBreakdown(
  'concern_123',
  'user_123',
  breakdownResult
);

console.log('Generated tasks:', tasks.length);
// 2つのタスクが生成されることを確認
```

---

### 3.7 タスク生成後の画面遷移

**目標**: タスク生成完了後にTaskRecommendationScreenへ  
**ファイル**: `/concern-app/src/components/screens/DynamicThoughtScreen.tsx`

**実装内容**:
- breakdownステージ完了時:
  1. TaskGenerationService.generateTasksFromBreakdown()呼び出し
  2. 生成されたタスクをConcernFlowStateに保存
  3. `/tasks/recommend` へナビゲート

**成功基準**:
- breakdownステージ完了後にタスク推奨画面へ遷移
- 生成されたタスクが表示される

**テスト方法**:
```typescript
// 1. 関心事入力フロー全体を実行（capture → plan → breakdown）
// 2. breakdown完了時にタスクが生成される
// 3. TaskRecommendationScreen が開く
// 4. 生成されたタスクが推奨表示される
```

---

### ✅ 3.8 Commit: 思考整理フロー→タスク生成統合

**コミット内容**:
```bash
git add concern-app/src/services/TaskGenerationService.ts concern-app/src/components/screens/DynamicThoughtScreen.tsx
git commit -m "feat(phase2): Integrate thought flow with task generation

- Update DynamicThoughtScreen stage completion handling
- Implement TaskGenerationService for breakdown → Task conversion
- Auto-navigate to TaskRecommendationScreen after breakdown
- Save generated tasks to ConcernFlowState
- Ref: specs/project/phase2/overview.md"
```

---

### 3.9 CompletionScreen更新

**目標**: 完了画面の統合  
**ファイル**: `/concern-app/src/screens/CompletionScreen.tsx` （既存ファイル更新）

**実装内容**:
- ConcernFlowStateから統計情報取得
- 生成されたタスク数表示
- 「タスクを見る」ボタン → `/tasks/recommend` へ
- 「新しい関心事を追加」ボタン → `/concern/input` へ

**成功基準**:
- 完了画面が正しく表示される
- ボタンが動作する

**テスト方法**:
```typescript
// breakdown完了後、CompletionScreenが表示される
// 生成されたタスク数が表示される（例: "3つのタスクを生成しました"）
// ボタンをタップして遷移することを確認
```

---

### 3.10 HomeScreen更新

**目標**: ホーム画面に統計情報表示  
**ファイル**: `/concern-app/src/screens/HomeScreen.tsx`

**実装内容**:
- アクティブタスク数表示
- 今日の着手回数表示
- 「新しい関心事を追加」ボタン
- 「タスクを見る」ボタン

**成功基準**:
- 統計情報が表示される

**テスト方法**:
```typescript
// HomeScreenを開く
// アクティブタスク数が表示される（例: "アクティブなタスク: 5個"）
// 今日の着手回数が表示される（例: "今日の着手: 3回"）
```

---

### ✅ 3.11 Commit: 完了画面・ホーム画面統合

**コミット内容**:
```bash
git add concern-app/src/screens/CompletionScreen.tsx concern-app/src/screens/HomeScreen.tsx
git commit -m "feat(phase2): Update Completion and Home screens

- Display task generation statistics in CompletionScreen
- Add navigation buttons to task recommendation
- Show active task count and today's actions in HomeScreen
- Ref: specs/project/phase2/screen_specifications.md"
```

---

### 3.12 Step 3統合テスト

**目標**: 関心事入力→タスク生成→推奨表示の全フロー確認

**テストシナリオ**:
1. HomeScreenを開く
2. 「新しい関心事を追加」ボタンをタップ
3. ConcernInputScreenで「英語学習の継続が困難」と入力
4. 次へボタンタップ → DynamicThoughtScreen (capture) 表示
5. capture入力完了 → plan画面へ遷移
6. plan入力完了 → breakdown画面へ遷移
7. breakdown入力完了 → タスク生成
8. TaskRecommendationScreen表示
9. 生成されたタスクが推奨される
10. IndexedDB確認:
    - concernSessionsテーブルにセッション記録
    - tasksテーブルに生成されたタスク
    - source='breakdown_flow' であることを確認

**成功基準**:
- [ ] 全フロー動作
- [ ] タスクが生成される
- [ ] タスク推奨が表示される

---

## 🔨 Step 4: 固定UI版整備（3-4日）

### 🎯 目標
固定UI版のタスク推奨画面を実装。動的UI版と同じ機能だがUIパターンは固定。

**実装理由**: Step 5のA/Bテスト機構実装前に両UI（動的UI版・固定UI版）を揃えることで、条件切り替えのテストが即座に可能になる。

---

### 4.1 StaticTaskRecommendationScreen骨格作成

**目標**: 固定UI版タスク推奨画面の基本構造  
**ファイル**: `/concern-app/src/screens/StaticTaskRecommendationScreen.tsx` （新規作成）

**実装内容**:
- TaskRecommendationScreenとほぼ同じ構造
- factors入力UI
- タスク推奨API呼び出し
- 固定デザインのTaskCard表示（DSL生成なし）

**成功基準**:
- 画面がレンダリング可能
- API呼び出しが動作する

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

---

### 4.2 固定デザインテンプレート定義

**目標**: 静的UIパターンの定数定義  
**ファイル**: `/concern-app/src/styles/StaticTaskCardStyles.ts` （新規作成）

**実装内容**:
- STATIC_TASK_CARD_STYLE 定数定義
- 固定レイアウト（vertical）
- 固定配色（background, border等）
- 固定フォントサイズ

**成功基準**:
- スタイル定数が定義されている

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

**参考**: `specs/project/phase2/screen_specifications.md` の固定デザインテンプレート

---

### 4.3 StaticTaskCard component実装

**目標**: 固定デザインのTaskCardコンポーネント  
**ファイル**: `/concern-app/src/components/StaticTaskCard.tsx` （新規作成）

**実装内容**:
- TaskCardWidgetとは異なる固定デザイン実装
- variant, saliencyは受け取るがスタイルは固定
- 「着手する」ボタンは共通

**成功基準**:
- TaskCardが表示される
- デザインが固定されている

**テスト方法**:
```typescript
<StaticTaskCard
  task={testTask}
  variant="task_card"
  saliency={2}
  onActionStart={handleActionStart}
/>
// 固定スタイルで表示されることを確認
```

---

### 4.4 StaticTaskRecommendationScreen完成

**目標**: 固定UI版タスク推奨画面の完全実装  
**ファイル**: `/concern-app/src/screens/StaticTaskRecommendationScreen.tsx`

**実装内容**:
- StaticTaskCard表示
- ActionReportModal統合（共通コンポーネント）
- ClarityFeedbackModal統合（共通コンポーネント）
- イベントログ記録（uiCondition='static_ui'）

**成功基準**:
- 全フローが動作する
- イベントログのuiConditionが'static_ui'

**テスト方法**:
```typescript
// 1. StaticTaskRecommendationScreenを開く（後でA/Bテスト機構実装後に条件切り替え可能）
// 2. タスク推奨が表示される（固定デザイン）
// 3. 着手ボタンをタップ
// 4. ActionReportModal → ClarityFeedbackModal
// 5. IndexedDBのinteractionEventsを確認
//    → metadata.uiCondition = 'static_ui' であることを確認
```

---

### ✅ 4.5 Commit: 固定UI版タスク推奨実装

**コミット内容**:
```bash
git add concern-app/src/screens/StaticTaskRecommendationScreen.tsx concern-app/src/components/StaticTaskCard.tsx concern-app/src/styles/StaticTaskCardStyles.ts
git commit -m "feat(phase2): Implement StaticTaskRecommendationScreen

- Create StaticTaskRecommendationScreen with fixed UI design
- Define static task card style template (no DSL generation)
- Implement StaticTaskCard component with consistent styling
- Share ActionReportModal and ClarityFeedbackModal with dynamic version
- Record events with uiCondition='static_ui'
- Ref: specs/project/phase2/screen_specifications.md"
```

---

### 4.6 固定UI版フロー機能統一

**目標**: 既存の固定UI画面のデータフロー調整  
**ファイル**: `/concern-app/src/screens/BreakdownScreen.tsx`（既存ファイル更新）

**実装内容**:
- breakdownステージ完了時にTaskGenerationService呼び出し
- 生成されたタスクをIndexedDBに保存
- `/tasks/recommend` へナビゲート（StaticTaskRecommendationScreen）

**成功基準**:
- 固定UI版フローでもタスク生成が動作する

**テスト方法**:
```typescript
// 1. ConcernInputScreenからフロー開始（固定UI版）
// 2. CategorySelection → Approach → Breakdownと進む
// 3. Breakdown完了時にタスクが生成される
// 4. StaticTaskRecommendationScreenが開く
```

**注意**: A/Bテスト機構実装前なので、まだ条件による切り替えはない。Step 5実装後に条件に応じて画面が切り替わるようになる。

---

### 4.7 Step 4統合テスト

**目標**: 固定UI版フロー全体の動作確認

**テストシナリオ**:
1. ConcernInputScreenから関心事入力フロー開始
2. CategorySelection → Approach → Breakdownと進む
3. Breakdown完了時にタスクが生成される
4. StaticTaskRecommendationScreen表示（固定デザイン）
5. 着手ボタンタップ → ActionReportModal
6. 完了ボタンタップ → ClarityFeedbackModal
7. スッキリ度送信
8. IndexedDB確認:
   - actionReports: uiCondition='static_ui'
   - interactionEvents: uiCondition='static_ui'

**成功基準**:
- [ ] 固定UI版フロー全体動作
- [ ] uiConditionが正しく記録される
- [ ] タスク生成からタスク推奨までの流れが正常

**注意**: この時点ではまだA/Bテスト機構がないため、条件切り替えはできない。Step 5実装後に両UI間の切り替えが可能になる。

---

## 🔨 Step 5: A/Bテスト機構（3-4日）⭐️研究の核心

### 🎯 目標
動的UI版と固定UI版を切り替える実験機構を実装。管理者による手動割り当て方式。

**設計変更**: 被験者数が少ない（5名程度）ため、ハッシュベース自動割り当てではなく、手動割り当て方式を採用。管理者が AdminUserManagement 画面で各被験者に条件を割り当てる。

**実装前提**: Step 4で固定UI版が実装済みのため、両UI（動的UI版・固定UI版）が揃った状態でA/Bテスト機構を構築できる。✅

---

### 5.1 サーバー側ExperimentService骨格作成

**目標**: サーバー側の実験条件管理サービス骨格  
**ファイル**: `/server/src/services/ExperimentService.ts` （新規作成）

**実装内容**:
- `ExperimentService` class骨格
- `ExperimentAssignment` interface定義
- メソッドシグネチャ（空実装）:
  - `getCondition()`
  - `assignConditionManually()`
  - `getAllAssignments()`
  - `getAssignmentCounts()`
  - `removeAssignment()`

**成功基準**:
- TypeScriptコンパイルエラーなし

**テスト方法**:
```bash
cd /home/tk220307/sotuken/server
bun run build
```

**参考**: `specs/project/phase2/ab_testing.md` のサーバー側実装

---

### 5.2 サーバー側ExperimentService実装

**目標**: 手動割り当てロジック実装  
**ファイル**: `/server/src/services/ExperimentService.ts`

**実装内容**:
- `getCondition()` メソッド実装
  - 既存の割り当てをチェック
  - 未割り当ての場合は null を返す
- `assignConditionManually()` メソッド実装
  - 管理者による手動割り当て
  - assignedBy, note を記録
- `getAllAssignments()` メソッド実装
  - 全ユーザーの割り当て状況を取得
- `getAssignmentCounts()` メソッド実装
  - 条件別の人数をカウント
- `removeAssignment()` メソッド実装
  - 割り当てを削除

**成功基準**:
- 全メソッドが正常に動作する
- データベースに正しく保存される

**テスト方法**:
```typescript
// server/tests/experiment_service_test.ts
const service = new ExperimentService();

// 手動割り当て
await service.assignConditionManually('user_abc123', 'dynamic_ui', 'admin', 'テスト被験者1');

// 条件取得
const assignment = await service.getCondition('user_abc123');
console.log('Condition:', assignment.condition);
// 'dynamic_ui' であることを確認

// 人数カウント
const counts = await service.getAssignmentCounts();
console.log('Counts:', counts);
// { dynamic_ui: 1, static_ui: 0, unassigned: 0 }
```

**参考**: `specs/project/phase2/ab_testing.md` のExperimentService実装

---

### 5.3 管理者用API実装

**目標**: 管理者が割り当てを行うためのAPIエンドポイント  
**ファイル**: `/server/src/routes/admin.ts` （新規作成）

**実装内容**:
- GET `/admin/assignments` - 全割り当て状況取得
- GET `/admin/assignments/counts` - 条件別人数取得
- POST `/admin/assignments` - 手動割り当て実行
- DELETE `/admin/assignments/:userId` - 割り当て削除

**成功基準**:
- 全エンドポイントが動作する
- ExperimentServiceと正しく統合されている

**テスト方法**:
```bash
# 割り当て状況取得
curl -X GET http://localhost:3000/admin/assignments

# 条件別人数取得
curl -X GET http://localhost:3000/admin/assignments/counts

# 手動割り当て
curl -X POST http://localhost:3000/admin/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "condition": "dynamic_ui",
    "assignedBy": "admin",
    "note": "テスト被験者1"
  }'

# レスポンス: {"success": true, "assignment": {...}}
```

**参考**: `specs/project/phase2/ab_testing.md` の管理者用API実装

---

### ✅ 5.4 Commit: サーバー側実験条件管理実装

**コミット内容**:
```bash
git add server/src/services/ExperimentService.ts server/src/routes/admin.ts
git commit -m "feat(phase2): Implement manual assignment ExperimentService

- Add ExperimentService with manual assignment methods
- Implement getCondition, assignConditionManually, getAllAssignments
- Add admin API endpoints for assignment management
- Support for assignedBy and note fields
- Ref: specs/project/phase2/ab_testing.md"
```

---

### 5.5 ClientExperimentService骨格作成

**目標**: クライアント側の実験条件管理サービス骨格  
**ファイル**: `/concern-app/src/services/ExperimentService.ts` （新規作成）

**実装内容**:
- `ClientExperimentService` class骨格
- Singleton パターン
- メソッドシグネチャ:
  - `fetchCondition()`
  - `getCachedCondition()`
  - `switchCondition()`

**成功基準**:
- TypeScriptコンパイルエラーなし

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

---

### 5.6 fetchCondition実装

**目標**: サーバーから実験条件を取得  
**ファイル**: `/concern-app/src/services/ExperimentService.ts`

**実装内容**:
- `/v1/config` API呼び出し
- condition（dynamic_ui / static_ui / null）を取得
- **nullの場合**: 未割り当てと判断
- LocalDBのuserProfileに保存
- experiment_condition_assignedイベント記録

**成功基準**:
- APIから条件を取得できる
- 未割り当ての場合nullが返る
- LocalDBに保存される

**テスト方法**:
```typescript
const condition = await experimentService.fetchCondition();
console.log('Assigned condition:', condition);
// 'dynamic_ui', 'static_ui', または null が返される

// IndexedDBのuserProfileを確認
// experimentConditionフィールドが保存されていることを確認
```

**参考**: `specs/project/phase2/ab_testing.md` のクライアント側実装

---

### 5.7 switchCondition実装（デバッグ用）

**目標**: 実験条件の手動切り替え機能  
**ファイル**: `/concern-app/src/services/ExperimentService.ts`

**実装内容**:
- `switchCondition()` メソッド実装
- LocalDBのuserProfile更新
- experiment_condition_switchedイベント記録
- window.location.reload()呼び出し
- **注意**: 開発環境専用機能

**成功基準**:
- 条件が切り替わる
- ページがリロードされる

**テスト方法**:
```typescript
await experimentService.switchCondition('static_ui');
// ページがリロードされる
// リロード後、getCachedCondition()が'static_ui'を返す
```

---

### ✅ 5.8 Commit: ClientExperimentService実装

**コミット内容**:
```bash
git add concern-app/src/services/ExperimentService.ts
git commit -m "feat(phase2): Implement ClientExperimentService

- Add fetchCondition() to retrieve assignment from /v1/config
- Support null condition for unassigned users
- Implement switchCondition() for debug purposes only
- Cache condition in IndexedDB userProfile
- Record experiment_condition_assigned/switched events
- Ref: specs/project/phase2/ab_testing.md"
```

---

### 5.9 UnassignedScreen作成

**目標**: 未割り当てユーザー用の待機画面  
**ファイル**: `/concern-app/src/screens/UnassignedScreen.tsx` （新規作成）

**実装内容**:
- 未割り当て状態を説明するメッセージ表示
- ユーザーIDを表示（被験者に伝えてもらう）
- 再読み込みボタン

**成功基準**:
- 画面が表示される
- ユーザーIDが表示される

**テスト方法**:
```typescript
// 未割り当て状態でアプリを開く
// UnassignedScreenが表示される
// "実験条件の割り当て待ち" メッセージが表示される
```

**参考**: `specs/project/phase2/ab_testing.md` のApp.tsx実装

---

### 5.10 App.tsx条件別ルーティング実装

**目標**: App.tsxで実験条件に応じてNavigatorを切り替え  
**ファイル**: `/concern-app/src/App.tsx`

**実装内容**:
- useEffect でexperimentService.fetchCondition()呼び出し
- condition state管理（`'dynamic_ui' | 'static_ui' | null`）
- 条件別レンダリング:
  - condition === null → UnassignedScreen（未割り当て）
  - condition === 'dynamic_ui' → DynamicUINavigator
  - condition === 'static_ui' → StaticUINavigator
- Loading state表示

**成功基準**:
- 条件に応じてNavigatorが切り替わる
- 未割り当ての場合UnassignedScreenが表示される

**テスト方法**:
```typescript
// 1. アプリ起動
// 2. Loading画面が表示される
// 3. 条件取得後:
//    - 未割り当て → UnassignedScreen
//    - dynamic_ui → DynamicUINavigator
//    - static_ui → StaticUINavigator
// 4. Console.logで条件を確認
```

**参考**: `specs/project/phase2/ab_testing.md` のApp.tsx実装

---

### 5.11 StaticUINavigator骨格作成

**目標**: 固定UI版のルーター骨格  
**ファイル**: `/concern-app/src/navigators/StaticUINavigator.tsx` （新規作成）

**実装内容**:
- React Router設定
- 固定UI版の画面ルート定義:
  - `/` → HomeScreen
  - `/concern/input` → ConcernInputScreen
  - `/concern/level` → ConcernLevelScreen
  - `/concern/category` → CategorySelectionScreen
  - `/concern/approach` → ApproachScreen
  - `/concern/breakdown` → BreakdownScreen
  - `/tasks/recommend` → StaticTaskRecommendationScreen（Step 4で実装済み）
  - `/tasks` → TaskListScreen（共通）
  - `/settings` → SettingsScreen（共通）

**成功基準**:
- Navigatorがレンダリング可能

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

**注意**: StaticTaskRecommendationScreenはStep 4で実装済み

---

### 5.12 SettingsScreen実装

**目標**: ユーザー用設定画面（条件表示・統計情報）  
**ファイル**: `/concern-app/src/screens/SettingsScreen.tsx` （新規作成）

**実装内容**:
- ユーザーID表示（被験者が研究者に伝えるため）
- 現在の実験条件表示（動的UI / 固定UI / 未割り当て）
- 割り当て日時表示
- 統計情報表示（タスク作成数、着手回数、完了回数、平均スッキリ度）
- **デバッグセクション**（開発環境のみ表示）:
  - 条件切り替えボタン（警告付き）

**成功基準**:
- 設定画面が正しく表示される
- 未割り当ての場合も適切に表示される
- デバッグ機能が開発環境でのみ動作する

**テスト方法**:
```typescript
// 1. SettingsScreenを開く
// 2. ユーザーIDが表示される
// 3. 実験条件が表示される（例: "動的UI版"）
// 4. 統計情報が表示される
// 5. 開発環境の場合、デバッグセクションが表示される
```

**参考**: `specs/project/phase2/ab_testing.md` のユーザー用設定画面

---

### 5.13 AdminUserManagement画面実装

**目標**: 管理者用のユーザー管理画面  
**ファイル**: `/concern-app/src/screens/AdminUserManagement.tsx` （新規作成）

**実装内容**:
- 条件別人数サマリー表示（動的UI群・固定UI群・未割り当て）
- ユーザー一覧テーブル:
  - ユーザーID
  - 実験条件（バッジ表示）
  - 割り当て日時
  - メモ
  - 操作ボタン（動的UI / 固定UI / 削除）
- 割り当てボタン操作:
  - メモ入力プロンプト
  - 管理者API呼び出し
  - データ再読み込み
- 運用ガイド表示

**成功基準**:
- 管理画面が正しく表示される
- 割り当て操作が正常に動作する
- UIが使いやすい

**テスト方法**:
```typescript
// 1. AdminUserManagement画面を開く
// 2. ユーザー一覧が表示される
// 3. 条件別人数が正しく表示される
// 4. 「動的UI」ボタンをクリック
// 5. メモ入力プロンプトが表示される
// 6. メモを入力して確定
// 7. 割り当てが成功し、テーブルが更新される
```

**参考**: `specs/project/phase2/ab_testing.md` の管理者用UI

---

### ✅ 5.14 Commit: A/Bテスト手動割り当て機構実装

**コミット内容**:
```bash
git add concern-app/src/App.tsx concern-app/src/navigators/StaticUINavigator.tsx concern-app/src/screens/SettingsScreen.tsx concern-app/src/screens/UnassignedScreen.tsx concern-app/src/screens/AdminUserManagement.tsx
git commit -m "feat(phase2): Implement manual assignment A/B testing

- Update App.tsx with condition-based Navigator switching
- Add UnassignedScreen for users without condition assignment
- Create StaticUINavigator for static UI condition
- Implement SettingsScreen with user stats and debug features
- Add AdminUserManagement screen for manual assignment
- Support null condition for unassigned users
- Ref: specs/project/phase2/ab_testing.md"
```

---

### 5.15 手動割り当てフローの検証テスト

**目標**: 手動割り当てフローの動作確認

**テストシナリオ**:
1. **未割り当てユーザーアクセス**:
   - ブラウザのIndexedDBを削除
   - アプリを起動
   - UnassignedScreenが表示される
   - ユーザーIDをメモする

2. **管理者による割り当て**:
   - AdminUserManagement画面を開く
   - 上記ユーザーIDが一覧に表示される
   - 「未割り当て」バッジが表示される
   - 「動的UI」ボタンをクリック
   - メモ入力（例: "テスト被験者1"）
   - 割り当てが成功する
   - テーブルで「動的UI」バッジに変わる
   - 条件別人数が更新される（動的UI群: 1名）

3. **ユーザー側での確認**:
   - 被験者のブラウザでアプリをリロード
   - DynamicUINavigatorが表示される
   - SettingsScreenで「動的UI版」と表示される

**成功基準**:
- [ ] 未割り当てユーザーがUnassignedScreenを見る
- [ ] 管理者が正しく割り当てできる
- [ ] 割り当て後、適切なUIが表示される
- [ ] 条件別人数が正確にカウントされる

---

### 5.16 条件切り替え（デバッグ）の検証テスト

**目標**: デバッグ用切り替え機能の動作確認

**テストシナリオ**:
1. 開発環境でアプリ起動（条件: dynamic_ui）
2. SettingsScreenを開く
3. デバッグセクションが表示される
4. 「条件を切り替え（デバッグ）」ボタンをタップ
5. 警告ダイアログが表示される
6. 続行を選択
7. ページがリロードされる
8. StaticUINavigatorが表示される

**成功基準**:
- [ ] デバッグ機能が開発環境でのみ表示される
- [ ] 警告ダイアログが表示される
- [ ] 条件切り替えが正常に動作する

---

## 🔨 Step 6: 測定・ログシステム（2-3日）

### 🎯 目標
イベントログのバッチ送信、着手率計算、簡易ダッシュボードを実装。

---

### 6.1 EventLoggerバッファリング実装

**目標**: クライアント側のバッファリング機能  
**ファイル**: `/concern-app/src/services/EventLogger.ts`（既存ファイル更新）

**実装内容**:
- buffer配列追加
- BUFFER_SIZE定数（10イベント）
- FLUSH_INTERVAL定数（30秒）
- setIntervalで自動フラッシュ
- window.addEventListener('beforeunload')でアプリ終了時フラッシュ

**成功基準**:
- 10イベント蓄積でバッチ送信される
- 30秒ごとにバッチ送信される

**テスト方法**:
```typescript
// 1. アプリを開く
// 2. 5つのイベントを記録（各種画面遷移等）
// 3. Network tabを確認 → まだバッチ送信されていない
// 4. さらに5つのイベントを記録
// 5. Network tabを確認 → /v1/events/batch へPOSTリクエストが送信される
```

---

### 6.2 EventLoggerリトライロジック

**目標**: バッチ送信失敗時のリトライ  
**ファイル**: `/concern-app/src/services/EventLogger.ts`

**実装内容**:
- flush()メソッドにtry-catchブロック
- 送信失敗時はバッファを保持
- 次回のflush()で再送信

**成功基準**:
- ネットワークエラー時にバッファが保持される

**テスト方法**:
```typescript
// 1. サーバーを停止
// 2. イベントを10個記録
// 3. バッチ送信が試行されるが失敗
// 4. サーバーを再起動
// 5. 次のflush（30秒後）で再送信される
```

---

### ✅ 6.3 Commit: EventLoggerバッファリング実装

**コミット内容**:
```bash
git add concern-app/src/services/EventLogger.ts
git commit -m "feat(phase2): Implement EventLogger buffering and retry

- Add buffer array for batch event collection
- Auto-flush every 30 seconds or 10 events
- Flush on app close (beforeunload)
- Retry failed batch sends
- Ref: specs/project/phase2/event_logging.md"
```

---

### 6.4 MetricsService骨格作成

**目標**: サーバー側の着手率計算サービス骨格  
**ファイル**: `/server/src/services/MetricsService.ts` （新規作成）

**実装内容**:
- `MetricsService` class骨格
- メソッドシグネチャ:
  - `calculateEngagementRate()`
  - `calculateAverageClarityImprovement()`
  - `calculateEngagementByVariant()`
  - `calculateEngagementBySaliency()`

**成功基準**:
- TypeScriptコンパイルエラーなし

**テスト方法**:
```bash
cd /home/tk220307/sotuken/server
bun run build
```

---

### 6.5 calculateEngagementRate実装

**目標**: 条件別着手率計算  
**ファイル**: `/server/src/services/MetricsService.ts`

**実装内容**:
- イベントログからtask_recommendation_shownをカウント（分母）
- イベントログからtask_action_startedをカウント（分子）
- 着手率 = 分子 / 分母
- 条件別（dynamic_ui / static_ui）に計算

**成功基準**:
- 着手率が計算できる

**テスト方法**:
```typescript
// 事前にテストデータを挿入
// - task_recommendation_shown: 10件 (dynamic_ui)
// - task_action_started: 7件 (dynamic_ui)
// - task_recommendation_shown: 10件 (static_ui)
// - task_action_started: 5件 (static_ui)

const dynamicRate = await metricsService.calculateEngagementRate('dynamic_ui');
console.log('Dynamic UI engagement rate:', dynamicRate);
// 0.7 が返される

const staticRate = await metricsService.calculateEngagementRate('static_ui');
console.log('Static UI engagement rate:', staticRate);
// 0.5 が返される
```

---

### 6.6 calculateAverageClarityImprovement実装

**目標**: スッキリ度平均計算  
**ファイル**: `/server/src/services/MetricsService.ts`

**実装内容**:
- clarity_feedback_submittedイベントを抽出
- clarityImprovementの平均値を計算
- 条件別に計算

**成功基準**:
- 平均スッキリ度が計算できる

**テスト方法**:
```typescript
// 事前にテストデータを挿入
// - clarityImprovement: [3, 2, 3, 3, 2] (dynamic_ui)
// 平均 = 2.6

const avgClarity = await metricsService.calculateAverageClarityImprovement('dynamic_ui');
console.log('Average clarity:', avgClarity);
// 2.6 が返される
```

---

### 6.7 GET /v1/metrics/engagement API実装

**目標**: 着手率取得APIエンドポイント  
**ファイル**: `/server/src/routes/metrics.ts` （Step 1で骨格作成済み、完成させる）

**実装内容**:
- MetricsService統合
- クエリパラメータ処理（condition, startDate, endDate）
- 条件別・variant別・saliency別の着手率取得
- レスポンス構築

**成功基準**:
- APIで着手率を取得できる

**テスト方法**:
```bash
curl -X GET "http://localhost:3000/v1/metrics/engagement?condition=dynamic_ui"

# レスポンス例:
# {
#   "overall": {
#     "engagementRate": 0.68,
#     "averageClarityImprovement": 2.4
#   },
#   "byCondition": {
#     "dynamic_ui": {"engagementRate": 0.75},
#     "static_ui": {"engagementRate": 0.60}
#   },
#   ...
# }
```

**参考**: `specs/project/phase2/api_specification.md` の /v1/metrics/engagement

---

### ✅ 6.8 Commit: MetricsService実装

**コミット内容**:
```bash
git add server/src/services/MetricsService.ts server/src/routes/metrics.ts
git commit -m "feat(phase2): Implement MetricsService for engagement calculation

- Add calculateEngagementRate() method (shown → started ratio)
- Add calculateAverageClarityImprovement() method
- Implement GET /v1/metrics/engagement API endpoint
- Support condition, variant, and saliency breakdowns
- Ref: specs/project/phase2/api_specification.md"
```

---

### 6.9 AdminDashboard骨格作成

**目標**: 簡易ダッシュボードのReactコンポーネント  
**ファイル**: `/concern-app/src/screens/AdminDashboard.tsx` （新規作成）

**実装内容**:
- /v1/metrics/engagement API呼び出し
- 着手率表示（動的UI vs 固定UI）
- スッキリ度平均表示
- 基本的なスタイリング

**成功基準**:
- ダッシュボードが表示される
- APIから取得したデータが表示される

**テスト方法**:
```typescript
// AdminDashboardを開く
// 着手率が表示される（例: "動的UI: 75% / 固定UI: 60%"）
// スッキリ度が表示される（例: "動的UI: 2.6 / 固定UI: 2.2"）
```

---

### 6.10 AdminDashboardグラフ実装

**目標**: Chart.jsによる可視化  
**ファイル**: `/concern-app/src/screens/AdminDashboard.tsx`

**実装内容**:
- Chart.jsライブラリ導入
- 着手率の棒グラフ
- スッキリ度の棒グラフ
- variant別・saliency別の着手率グラフ

**成功基準**:
- グラフが表示される

**テスト方法**:
```bash
# Chart.jsインストール
cd /home/tk220307/sotuken/concern-app
bun add chart.js react-chartjs-2

# AdminDashboardを開く
# グラフが表示されることを確認
```

---

### ✅ 6.11 Commit: AdminDashboard実装

**コミット内容**:
```bash
git add concern-app/src/screens/AdminDashboard.tsx package.json
git commit -m "feat(phase2): Implement AdminDashboard with metrics visualization

- Create AdminDashboard screen
- Integrate /v1/metrics/engagement API
- Display engagement rates and clarity improvement
- Add Chart.js for bar chart visualization
- Show condition, variant, and saliency breakdowns
- Ref: specs/project/phase2/implementation_tasks.md"
```

---

### 6.12 Step 6統合テスト

**目標**: 測定システム全体の動作確認

**テストシナリオ**:
1. 動的UI版で5回の着手（task_action_started）
2. 固定UI版で3回の着手
3. 各着手でスッキリ度を記録
4. イベントがバッファリングされてバッチ送信される
5. AdminDashboardを開く
6. 着手率が表示される:
   - 動的UI: 計算された着手率
   - 固定UI: 計算された着手率
7. スッキリ度平均が表示される
8. グラフが正しく描画される

**成功基準**:
- [ ] イベントログが正しく記録される
- [ ] バッチ送信が動作する
- [ ] 着手率が計算される
- [ ] ダッシュボードに正しく表示される

---

## ✅ Phase 2 完了基準チェックリスト

### 技術的完了基準

- [ ] 動的UI版フローが完全動作
- [ ] タスク推奨システムが動作
- [ ] 行動報告ボタンが機能（着手測定）⭐️
- [ ] スッキリ度測定が動作⭐️
- [ ] A/B条件切り替えが動作⭐️
- [ ] イベントログが正しく記録⭐️
- [ ] 着手率が計算可能⭐️
- [ ] 全TypeScriptコンパイルエラーなし
- [ ] 全データベースマイグレーション成功

### 研究的完了基準

- [ ] 動的UI vs 固定UI の比較実験が可能⭐️
- [ ] 着手率が測定可能（task_recommendation_shown → task_action_started）⭐️
- [ ] スッキリ度が測定可能（clarity_feedback_submitted）⭐️
- [ ] イベントログからデータ抽出可能
- [ ] ユーザーテスト実施準備完了

### 最終動作確認シナリオ

**シナリオ1: 動的UI版フロー**
1. アプリ起動（条件: dynamic_ui）
2. 関心事入力 → capture → plan → breakdown
3. タスク生成 → TaskRecommendationScreen
4. 着手ボタンタップ → ActionReportModal
5. 完了ボタンタップ → ClarityFeedbackModal
6. スッキリ度送信
7. イベントログ確認

**シナリオ2: 固定UI版フロー**
1. 条件を'static_ui'に切り替え
2. 関心事入力 → Category → Approach → Breakdown
3. タスク生成 → StaticTaskRecommendationScreen
4. 着手ボタンタップ → ActionReportModal
5. 完了ボタンタップ → ClarityFeedbackModal
6. スッキリ度送信
7. イベントログ確認（uiCondition='static_ui'）

**シナリオ3: メトリクス確認**
1. AdminDashboardを開く
2. 着手率が表示される
3. 動的UI vs 固定UIの比較が可能
4. スッキリ度平均が表示される
5. グラフが正しく描画される

**成功基準**: 全シナリオが正常に動作すること

---

## 📊 Phase 2完了時のコミット整理

Phase 2完了時に最終的な整理コミットを推奨：

```bash
# ドキュメント更新
git add specs/project/phase2/
git commit -m "docs(phase2): Complete Phase 2 documentation

- All Phase 2 design documents completed
- Implementation tasks fully documented
- Ready for user testing preparation"

# テストコード整理
git add concern-app/tests/ server/tests/
git commit -m "test(phase2): Add Phase 2 test suites

- Integration tests for task recommendation flow
- Engagement tracking verification
- A/B testing mechanism validation
- Metrics calculation tests"
```

---

**文書バージョン:** 1.2  
**対象:** LLM実装エージェント  
**総タスク数:** 83タスク  
**推定実行期間:** 17-23日（3.5-4.5週間）

**作成者**: AI Agent (Claude Sonnet 4.5)  
**作成日**: 2025年10月18日  
**最終更新**: 2025年10月19日  
**変更履歴**:
- v1.1: Step 4を手動割り当て方式に変更（被験者数少数のため）
- v1.2: Step 4とStep 5を入れ替え（固定UI版を先に実装することでA/Bテスト時の検証が容易に）

