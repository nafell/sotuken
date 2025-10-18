# Phase 2 クイックテストガイド

**所要時間**: 15分  
**目的**: 主要機能の動作確認

---

## 🚀 事前準備（3分）

### 1. サーバー起動

```bash
# ターミナル1
cd /home/tk220307/sotuken/server
bun run dev

# ターミナル2
cd /home/tk220307/sotuken/concern-app
bun run dev
```

### 2. ブラウザ準備

1. Chrome で http://localhost:5173 を開く
2. F12 でDevToolsを開く
3. Application → IndexedDB → ConcernApp を表示

---

## ⚡ クイックテスト（12分）

### テスト1: タスク作成（2分）

```
1. TaskCreateScreen を開く
2. 入力:
   - タイトル: 英語の勉強
   - 重要度: 80%
   - 推定時間: 30分
3. 「タスクを作成」クリック
4. ✅ アラート表示を確認
5. ✅ IndexedDB の tasks に保存確認
```

### テスト2: タスク推奨（2分）

```
1. TaskRecommendationScreen を開く
2. 入力:
   - 場所: 自宅
   - 時間帯: 午後
   - 利用可能時間: 30分
3. 「タスクを推奨」クリック
4. ✅ 推奨タスクが表示される
5. ✅ Console に "Event logged: task_recommendation_shown"
```

### テスト3: 着手測定 ⭐️最重要（3分）

```
1. 推奨画面で **10秒待つ**（1, 2, 3...10）
2. 「着手する」ボタンクリック
3. ✅ ActionReportModal 表示
4. ✅ タイマーが動作
5. Console で確認:
   const report = await db.actionReports.toArray();
   console.log(report[0].timeToStartSec);
   // 期待値: 約10秒（9-11秒）
```

### テスト4: スッキリ度測定（3分）

```
1. **15秒待つ**（タイマーを見ながら）
2. 「完了しました」クリック
3. スッキリ度選択: 😊 かなりスッキリ
4. メモ入力: テスト完了
5. 「記録する」クリック
6. ✅ アラート "記録しました！" 表示
7. Console で確認:
   const report = await db.actionReports.toArray();
   console.log({
     clarityImprovement: report[0].clarityImprovement,
     durationMin: report[0].durationMin
   });
   // 期待値: clarityImprovement=3, durationMin≈0.25
```

### テスト5: データ確認（2分）

```javascript
// Console で実行
const db = new Dexie('ConcernApp');
db.version(2).stores({
  tasks: 'taskId',
  actionReports: 'reportId',
  interactionEvents: 'eventId'
});
await db.open();

// 確認1: Task
const task = await db.tasks.toArray();
console.log('Task:', {
  totalActionsStarted: task[0].totalActionsStarted,
  totalActionsCompleted: task[0].totalActionsCompleted
});
// 期待値: 両方とも 1

// 確認2: ActionReport
const report = await db.actionReports.toArray();
console.log('ActionReport:', {
  timeToStartSec: report[0].timeToStartSec,
  clarityImprovement: report[0].clarityImprovement
});
// 期待値: timeToStartSec≈10, clarityImprovement=3

// 確認3: Events
const events = await db.interactionEvents
  .where('eventType')
  .anyOf([
    'task_recommendation_shown',
    'task_action_started',
    'task_action_completed'
  ])
  .toArray();
console.log('Events:', events.length);
// 期待値: 3件以上
```

---

## ✅ 合格基準チェックリスト

- [ ] タスクが作成できる
- [ ] タスク推奨が表示される
- [ ] timeToStartSec が正確（誤差±1秒）
- [ ] ActionReportModal が表示される
- [ ] スッキリ度が記録される
- [ ] 全てのイベントが記録される
- [ ] タスクカウンターが更新される

---

## 🐛 問題が発生したら

### エラー: "推奨できるタスクがありません"

→ タスクを作成してください

### エラー: "API error"

→ サーバーが起動しているか確認

### timeToStartSec が 0 になる

→ 推奨表示後、時間を置いてから着手してください

### データが保存されない

→ IndexedDBをクリアして再試行
```javascript
indexedDB.deleteDatabase('ConcernApp');
location.reload();
```

---

## 📊 期待結果サマリー

| 項目 | 期待値 | 実測値 | OK? |
|------|--------|--------|-----|
| タスク作成 | 成功 | ⬜ | ⬜ |
| 推奨表示 | 成功 | ⬜ | ⬜ |
| timeToStartSec | 10±1秒 | ___ 秒 | ⬜ |
| clarityImprovement | 3 | ___ | ⬜ |
| durationMin | 0.25±0.05分 | ___ 分 | ⬜ |
| イベント数 | 3件以上 | ___ 件 | ⬜ |

---

**テスト完了時刻**: ___:___  
**結果**: ⬜ 全て合格 / ⬜ 一部不合格


