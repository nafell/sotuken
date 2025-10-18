# Phase 2 Step 3 フルフロー統合テスト

**作成日**: 2025年10月18日  
**対象**: Phase 2 Step 3 - 思考整理フロー統合  
**所要時間**: 約30分

---

## 🎯 テスト目的

Phase 2 Step 3で実装した「関心事入力→思考整理→タスク生成→タスク推奨」の完全なフローが正しく動作することを確認する。

---

## 📋 前提条件

### 環境

- サーバーが起動している（`http://localhost:3000`）
- フロントエンドが起動している（`http://localhost:5173`）
- Chrome DevTools が使用可能

### 準備

```bash
# サーバー起動（ターミナル1）
cd /home/tk220307/sotuken/server
bun run dev

# フロントエンド起動（ターミナル2）
cd /home/tk220307/sotuken/concern-app
bun run dev
```

### データクリア（オプション）

```javascript
// Chrome DevTools Console で実行
indexedDB.deleteDatabase('ConcernApp');
sessionStorage.clear();
localStorage.clear();
location.reload();
```

---

## 🚀 テストシナリオ

### シナリオ1: 基本フロー（成功パス）

**目的**: 関心事入力からタスク推奨までの完全フローを検証

#### Step 1: 関心事入力

1. ブラウザで `http://localhost:5173` を開く
2. ホーム画面が表示されることを確認
3. 「関心事を入力する」ボタンをクリック
4. `/concern/input` に遷移することを確認

**入力データ**:
```
英語学習を継続したい
```

5. テキストエリアに関心事を入力
6. 「次へ進む」ボタンをクリック

**期待結果**:
- ✅ `/concern/capture` に遷移
- ✅ Console に「✅ ConcernFlow開始」ログ
- ✅ SessionStorageに`concernFlowState`が保存される

**検証方法**:
```javascript
// Chrome DevTools Console
const flowState = JSON.parse(sessionStorage.getItem('concernFlowState'));
console.log('FlowState:', flowState);
// 期待値: { concernText: "英語学習を継続したい", currentStage: "capture", ... }
```

---

#### Step 2: Captureステージ（思考整理：捕捉）

1. DynamicThoughtScreenが表示される
2. 「UI生成中...」ローディング表示
3. 動的UIが生成される（約5-10秒）

**期待結果**:
- ✅ UIが正常に生成される
- ✅ タイトル: 「📝 関心事の整理」
- ✅ 関心事テキスト: 「英語学習を継続したい」が表示

**入力データ（例）**:
- 明確化された関心事: 「毎日30分英語学習を継続したい」
- キーポイント: 「継続性」「習慣化」

4. フォームに入力
5. 「次へ」ボタンをクリック

**期待結果**:
- ✅ `/concern/plan` に遷移
- ✅ Console に「✅ Capture結果保存完了」ログ
- ✅ SessionStorageにcaptureResultが追加される

**検証方法**:
```javascript
// Chrome DevTools Console
const flowState = JSON.parse(sessionStorage.getItem('concernFlowState'));
console.log('CaptureResult:', flowState.captureResult);
// 期待値: { clarifiedConcern: "...", keyPoints: [...], timestamp: "..." }
```

---

#### Step 3: Planステージ（思考整理：計画）

1. DynamicThoughtScreenが表示される（Planステージ）
2. 動的UIが生成される

**期待結果**:
- ✅ タイトル: 「💭 アプローチの計画」
- ✅ 前ステージの結果が引き継がれている

**入力データ（例）**:
- アプローチ: 「朝の通勤時間に学習する」
- ステップ: 「アプリをインストール」「毎日記録をつける」

3. フォームに入力
4. 「次へ」ボタンをクリック

**期待結果**:
- ✅ `/concern/breakdown` に遷移
- ✅ Console に「✅ Plan結果保存完了」ログ
- ✅ SessionStorageにplanResultが追加される

**検証方法**:
```javascript
// Chrome DevTools Console
const flowState = JSON.parse(sessionStorage.getItem('concernFlowState'));
console.log('PlanResult:', flowState.planResult);
// 期待値: { approach: "...", steps: [...], timestamp: "..." }
```

---

#### Step 4: Breakdownステージ（思考整理：分解）⭐️最重要

1. DynamicThoughtScreenが表示される（Breakdownステージ）
2. 動的UIが生成される

**期待結果**:
- ✅ タイトル: 「🚀 具体的なアクション」
- ✅ タスク分解のフォームが表示される

**入力データ（例）**:
タスク1:
- タイトル: 「英語学習アプリをインストール」
- 説明: 「DuolingoまたはAnkiをスマホに入れる」
- 重要度: 5
- 緊急度: 4
- 見積もり時間: 10分

タスク2:
- タイトル: 「毎朝7:30に英語学習を実施」
- 説明: 「通勤電車で30分学習する」
- 重要度: 5
- 緊急度: 3
- 見積もり時間: 30分

タスク3:
- タイトル: 「学習記録をGoogleカレンダーに記入」
- 説明: 「毎日の実施状況を記録」
- 重要度: 3
- 緊急度: 2
- 見積もり時間: 5分

3. タスクを入力
4. 「次へ」ボタンをクリック

**期待結果（⭐️重要）**:
- ✅ Console に「✅ Breakdown結果保存完了」ログ
- ✅ Console に「✅ タスク生成完了: 3件」ログ
- ✅ `/tasks/recommend` に遷移
- ✅ 「✅ タスク生成完了！」メッセージが表示される
- ✅ IndexedDBの`tasks`テーブルに3件追加される

**検証方法**:
```javascript
// Chrome DevTools Console

// 1. FlowStateチェック
const flowState = JSON.parse(sessionStorage.getItem('concernFlowState'));
console.log('BreakdownResult:', flowState.breakdownResult);
console.log('GeneratedTasks:', flowState.generatedTasks);

// 2. IndexedDBチェック
const db = new Dexie('ConcernApp');
db.version(2).stores({ tasks: 'taskId' });
await db.open();
const tasks = await db.tasks.toArray();
console.log('Tasks in IndexedDB:', tasks.length); // 期待値: 3
console.log('Task titles:', tasks.map(t => t.title));
// 期待値: 
// ["英語学習アプリをインストール", "毎朝7:30に英語学習を実施", "学習記録をGoogleカレンダーに記入"]

// 3. タスクの詳細確認
tasks.forEach((task, index) => {
  console.log(`Task ${index + 1}:`, {
    taskId: task.taskId,
    title: task.title,
    importance: task.importance,
    urgency: task.urgency,
    estimatedMinutes: task.estimatedMinutes,
    status: task.status,
    concernId: task.concernId,
    uiCondition: task.uiCondition
  });
});

// 期待値:
// - taskId: "task_xxxxx"
// - importance: 1-5
// - urgency: 1-5
// - status: "active"
// - uiCondition: "dynamic_ui"
```

---

#### Step 5: タスク推奨画面

1. TaskRecommendationScreenが表示される
2. 成功メッセージが表示される

**期待結果**:
- ✅ 「✅ タスク生成完了！」メッセージ
- ✅ 「思考整理から 3 件のタスクを生成しました。」
- ✅ Factors入力欄が表示される
- ✅ 1秒後に自動的に推奨が取得される（loadingが始まる）

2. 推奨が表示されるのを待つ

**期待結果**:
- ✅ 推奨タスクが表示される
- ✅ タスクカードまたは詳細情報が表示される
- ✅ 「着手する」ボタンが表示される

3. 「着手する」ボタンをクリック

**期待結果**:
- ✅ ActionReportModalが表示される
- ✅ タイマーが開始される（00:00 → 00:01 → ...）
- ✅ IndexedDBの`actionReports`テーブルにレコード追加
- ✅ `timeToStartSec`が正確に記録される

**検証方法**:
```javascript
// Chrome DevTools Console
const db = new Dexie('ConcernApp');
db.version(2).stores({ actionReports: 'reportId' });
await db.open();
const reports = await db.actionReports.toArray();
console.log('ActionReports:', reports);

// 最新のActionReportを確認
const latestReport = reports[reports.length - 1];
console.log({
  reportId: latestReport.reportId,
  taskId: latestReport.taskId,
  timeToStartSec: latestReport.timeToStartSec, // 期待値: 推奨表示から着手までの秒数
  actionStartedAt: latestReport.actionStartedAt,
  uiCondition: latestReport.uiCondition // 期待値: "dynamic_ui"
});
```

4. 30秒待つ
5. 「完了しました」ボタンをクリック

**期待結果**:
- ✅ ClarityFeedbackModalが表示される
- ✅ 3段階のラジオボタンが表示される

6. スッキリ度「3（かなりスッキリ）」を選択
7. メモを入力（任意）
8. 「送信」ボタンをクリック

**期待結果**:
- ✅ Modalが閉じる
- ✅ ActionReportが更新される（clarityImprovement = 3）
- ✅ task_action_completed イベントが記録される
- ✅ clarity_feedback_submitted イベントが記録される

**検証方法**:
```javascript
// Chrome DevTools Console
const db = new Dexie('ConcernApp');
db.version(2).stores({ actionReports: 'reportId' });
await db.open();
const reports = await db.actionReports.toArray();
const latestReport = reports[reports.length - 1];

console.log('Completed ActionReport:', {
  clarityImprovement: latestReport.clarityImprovement, // 期待値: 3
  durationMin: latestReport.durationMin, // 期待値: 約0.5（30秒）
  actionCompletedAt: latestReport.actionCompletedAt
});

// イベントログ確認
const events = await db.interactionEvents.toArray();
const recentEvents = events.slice(-5);
console.log('Recent events:', recentEvents.map(e => e.eventType));
// 期待値: [..., "task_action_started", "task_action_completed", "clarity_feedback_submitted"]
```

---

### シナリオ2: エラーハンドリング

**目的**: タスク生成失敗時のエラーハンドリングを確認

#### Step 1: Breakdownで空データ送信

1. Breakdownステージまで進む
2. タスクを入力せずに「次へ」ボタンをクリック

**期待結果**:
- ✅ タスク生成エラーが発生
- ✅ `/tasks/recommend` に遷移
- ✅ エラーメッセージが表示される

---

### シナリオ3: フロー再開

**目的**: SessionStorageからのフロー再開を確認

#### Step 1: 中断

1. Captureステージで入力途中
2. ブラウザをリロード（F5）

**期待結果**:
- ✅ SessionStorageにデータが残っている
- ✅ ConcernFlowStateManagerで読み込み可能

**検証方法**:
```javascript
// Chrome DevTools Console
const flowState = JSON.parse(sessionStorage.getItem('concernFlowState'));
console.log('Preserved state:', flowState);
// 期待値: { concernText: "...", currentStage: "capture", ... }
```

---

## ✅ 成功基準

### 必須項目

- [ ] 関心事入力 → capture → plan → breakdown → タスク推奨 の完全フロー動作
- [ ] 各ステージでConcernFlowStateManagerに結果が保存される
- [ ] Breakdown完了時に TaskGenerationService が実行される
- [ ] 3件のタスクがIndexedDBに保存される
- [ ] TaskRecommendationScreenで成功メッセージが表示される
- [ ] タスク推奨が正常に動作する
- [ ] ActionReportの記録が正確（timeToStartSec, clarityImprovement）
- [ ] イベントログが記録される

### 推奨項目

- [ ] UI生成が10秒以内に完了
- [ ] エラーが発生せずに完了
- [ ] Console にエラーログがない
- [ ] linterエラーがない

---

## 🐛 問題発生時のデバッグ

### 問題1: UI生成が失敗する

**症状**: 「UI生成エラー」が表示される

**原因**:
- サーバーが起動していない
- `/v1/thought/generate` APIエラー

**解決方法**:
```bash
# サーバー再起動
cd /home/tk220307/sotuken/server
bun run dev

# API確認
curl http://localhost:3000/health
```

---

### 問題2: タスク生成が失敗する

**症状**: 「タスク生成エラー」メッセージ

**原因**:
- Breakdown結果がない
- IndexedDB エラー

**解決方法**:
```javascript
// Chrome DevTools Console
const flowState = JSON.parse(sessionStorage.getItem('concernFlowState'));
console.log('BreakdownResult:', flowState.breakdownResult);

// 期待値: { tasks: [{ title: "...", ... }], timestamp: "..." }
```

---

### 問題3: SessionStorageが消える

**症状**: フロー状態が保存されない

**原因**:
- シークレットモード使用
- ブラウザの設定

**解決方法**:
- 通常モードで開く
- SessionStorage を確認

```javascript
// Chrome DevTools Console
console.log('SessionStorage items:', Object.keys(sessionStorage));
// 期待値: ["concernFlowState"]
```

---

## 📊 テスト結果記録

### テスト実施日: ___________

| 項目 | 結果 | 備考 |
|------|------|------|
| 関心事入力 | ⬜ 成功 / ⬜ 失敗 |  |
| Captureステージ | ⬜ 成功 / ⬜ 失敗 |  |
| Planステージ | ⬜ 成功 / ⬜ 失敗 |  |
| Breakdownステージ | ⬜ 成功 / ⬜ 失敗 |  |
| タスク生成 | ⬜ 成功 / ⬜ 失敗 |  |
| タスク推奨 | ⬜ 成功 / ⬜ 失敗 |  |
| ActionReport記録 | ⬜ 成功 / ⬜ 失敗 |  |
| ClarityFeedback記録 | ⬜ 成功 / ⬜ 失敗 |  |

### データ確認

```
IndexedDB tasks: _____ 件
IndexedDB actionReports: _____ 件
IndexedDB interactionEvents: _____ 件

SessionStorage concernFlowState: ⬜ あり / ⬜ なし
```

### パフォーマンス

```
UI生成時間（Capture）: _____ 秒
UI生成時間（Plan）: _____ 秒
UI生成時間（Breakdown）: _____ 秒
タスク生成時間: _____ 秒
```

---

## 🎉 完了確認

Phase 2 Step 3の統合テストが完了したら、以下を確認：

✅ 完全フローが動作する  
✅ IndexedDBにデータが保存される  
✅ SessionStorageにフロー状態が保存される  
✅ タスク生成が正確に動作する  
✅ イベントログが記録される

**次のステップ**: Phase 2 Step 4（A/Bテスト機構）の実装

---

**ドキュメント管理**:
- 作成日: 2025年10月18日
- 最終更新: 2025年10月18日
- バージョン: 1.0
- 管理場所: `/home/tk220307/sotuken/specs/testing/phase2_step3_integration_test.md`

