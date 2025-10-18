# Phase 2 エンドユーザーテスト計画書

**作成日**: 2025年10月18日  
**対象**: Phase 2 Step 1-2実装完了版  
**目的**: 着手率測定機能の動作確認とユーザビリティ評価

---

## 📋 テスト概要

### テスト対象機能

| 機能 | 優先度 | 実装状況 |
|------|--------|----------|
| タスク作成 | ⭐️⭐️⭐️ | ✅ 完了 |
| タスク推奨 | ⭐️⭐️⭐️ | ✅ 完了 |
| 着手測定（timeToStartSec） | ⭐️⭐️⭐️ | ✅ 完了 |
| スッキリ度測定 | ⭐️⭐️⭐️ | ✅ 完了 |
| イベントログ記録 | ⭐️⭐️⭐️ | ✅ 完了 |
| 実験条件割り当て | ⭐️⭐️⭐️ | ✅ 完了 |

### テスト環境

- **フロントエンド**: http://localhost:5173 (Vite開発サーバー)
- **バックエンド**: http://localhost:3000 (Bun HTTPサーバー)
- **データベース**: IndexedDB (ブラウザローカル)
- **推奨ブラウザ**: Chrome 最新版

---

## 🔧 事前準備

### 1. 環境セットアップ

#### サーバー起動

```bash
# ターミナル1: バックエンドサーバー起動
cd /home/tk220307/sotuken/server
bun run dev

# 確認: http://localhost:3000/health にアクセス
# {"status":"ok",...} が表示されればOK
```

#### フロントエンド起動

```bash
# ターミナル2: フロントエンド起動
cd /home/tk220307/sotuken/concern-app
bun run dev

# 確認: http://localhost:5173 にアクセス
# アプリが表示されればOK
```

### 2. ブラウザ開発ツール準備

#### Chrome DevToolsを開く

1. `F12` キーまたは右クリック → 「検証」
2. **Application** タブを開く
3. **IndexedDB** セクションを展開
4. `ConcernApp` データベースを確認

#### 確認すべきテーブル

- ✅ `userProfile` - ユーザー情報
- ✅ `tasks` - タスク一覧
- ✅ `actionReports` - 行動報告記録
- ✅ `interactionEvents` - イベントログ

### 3. テストデータのクリア（必要に応じて）

```javascript
// Consoleで実行
indexedDB.deleteDatabase('ConcernApp');
location.reload();
```

---

## ✅ テストシナリオ

---

## 📝 テスト1: タスク作成機能

### 目的
タスクが正常に作成できることを確認

### 手順

1. **TaskCreateScreenにアクセス**
   - ブラウザで `/tasks/create` を開く（または該当ルート）
   - 画面タイトル「新しいタスク」が表示されることを確認

2. **タスク情報入力**
   ```
   タイトル: 英語の勉強をする
   説明: TOEIC対策のリスニング練習
   重要度: 80%
   緊急度: 60%
   推定所要時間: 30分
   ```

3. **作成ボタンクリック**
   - 「タスクを作成」ボタンをクリック
   - 「タスクを作成しました！」アラートが表示される

4. **データ確認（IndexedDB）**
   - DevTools → Application → IndexedDB → `ConcernApp` → `tasks`
   - 新しいタスクが追加されていることを確認

5. **イベントログ確認**
   - `interactionEvents` テーブルを確認
   - `eventType: "task_created"` イベントが記録されている

### ✅ 合格基準

- [ ] タスクが作成される
- [ ] IndexedDBに保存される
- [ ] `task_created` イベントが記録される
- [ ] フォームがリセットされる

### 📊 データ確認項目

```javascript
// Console で確認
const db = new Dexie('ConcernApp');
db.version(2).stores({
  tasks: 'taskId, userId, status'
});
await db.open();
const tasks = await db.tasks.toArray();
console.log('Tasks:', tasks);
```

---

## 🎯 テスト2: タスク推奨機能

### 目的
タスク推奨APIが正常に動作し、推奨タスクが表示されることを確認

### 事前条件
- テスト1でタスクが1つ以上作成されていること

### 手順

1. **TaskRecommendationScreenにアクセス**
   - ブラウザで該当画面を開く
   - 画面タイトル「タスク推奨」が表示される

2. **Factors（状況）入力**
   ```
   場所: 自宅
   時間帯: 午後
   利用可能時間: 30分
   ```

3. **「タスクを推奨」ボタンクリック**
   - ボタンをクリック
   - Loading状態が表示される

4. **推奨結果確認**
   - 推奨タスクが表示される
   - タスクタイトル、説明、推定時間が表示される
   - スコアが表示される（0-100%）
   - 「着手する」ボタンが表示される

5. **イベントログ確認**
   - DevTools → Console でログ確認
   - `📝 Event logged: task_recommendation_shown` メッセージ
   - IndexedDB → `interactionEvents` に記録確認

6. **記録データ確認**
   ```javascript
   // 推奨表示イベント確認
   const events = await db.interactionEvents
     .where('eventType')
     .equals('task_recommendation_shown')
     .toArray();
   console.log('Recommendation events:', events);
   ```

### ✅ 合格基準

- [ ] API呼び出しが成功する
- [ ] 推奨タスクが表示される
- [ ] `task_recommendation_shown` イベントが記録される
- [ ] metadata に `taskId`, `score`, `saliency`, `factorsSnapshot` が含まれる

### ⚠️ エラーケース

**タスクが0件の場合**
- エラーメッセージ「推奨できるタスクがありません」が表示される

**API接続失敗の場合**
- エラーメッセージ「タスク推奨の取得に失敗しました」が表示される

---

## ⭐ テスト3: 着手測定機能（最重要）

### 目的
着手率測定の核心機能である timeToStartSec が正確に記録されることを確認

### 事前条件
- テスト2でタスク推奨が表示されていること

### 手順

1. **推奨表示からの経過時間を意識**
   - タスク推奨が表示されたら、**現在時刻をメモ**
   - 例: 14:30:00

2. **意図的に待機**
   - **10秒間待つ**（秒数をカウント）
   - 推奨画面はそのまま表示

3. **「着手する」ボタンをクリック**
   - 10秒後に「着手する」ボタンをクリック
   - ActionReportModalが表示される

4. **ActionReport確認（IndexedDB）**
   ```javascript
   const reports = await db.actionReports.toArray();
   const latest = reports[reports.length - 1];
   console.log('Time to start:', latest.timeToStartSec, 'seconds');
   ```

5. **timeToStartSec検証**
   - `timeToStartSec` が約10秒（9-11秒の範囲）であることを確認
   - 誤差±1秒は許容範囲

6. **イベントログ確認**
   - `task_action_started` イベントが記録されている
   - `metadata.timeToActionSec` が記録されている

### ✅ 合格基準

- [ ] ActionReportModalが表示される
- [ ] `timeToStartSec` が正確に計算される（誤差±1秒）
- [ ] `task_action_started` イベントが記録される
- [ ] タスクの `totalActionsStarted` カウンターが増加する

### 📊 精度テスト

**複数回測定**

| 試行 | 待機時間 | 記録値 | 誤差 | 合否 |
|------|---------|--------|------|------|
| 1回目 | 5秒 | ? 秒 | ? 秒 | ⬜ |
| 2回目 | 10秒 | ? 秒 | ? 秒 | ⬜ |
| 3回目 | 15秒 | ? 秒 | ? 秒 | ⬜ |

---

## 😊 テスト4: スッキリ度測定機能

### 目的
作業完了後のスッキリ度が正確に記録されることを確認

### 事前条件
- テスト3で「着手する」ボタンをクリックし、ActionReportModalが表示されていること

### 手順

1. **ActionReportModal表示確認**
   - タイマーが動作していることを確認
   - 「00:00」→「00:01」→「00:02」とカウントアップ

2. **作業時間を記録**
   - **20秒間待つ**
   - タイマーが「00:20」になることを確認

3. **「完了しました」ボタンクリック**
   - ボタンをクリック
   - ClarityFeedbackModalが表示される

4. **スッキリ度選択**
   - 「😊 かなりスッキリ」を選択
   - ラジオボタンが選択され、背景色が変わる

5. **メモ入力（任意）**
   ```
   集中して取り組めた。予想より早く終わった。
   ```

6. **「記録する」ボタンクリック**
   - ボタンをクリック
   - 「記録しました！お疲れさまでした 🎉」アラートが表示される

7. **ActionReport確認（IndexedDB）**
   ```javascript
   const reports = await db.actionReports.toArray();
   const latest = reports[reports.length - 1];
   console.log({
     clarityImprovement: latest.clarityImprovement,
     durationMin: latest.durationMin,
     notes: latest.notes
   });
   ```

8. **データ検証**
   - `clarityImprovement` = 3（かなりスッキリ）
   - `durationMin` ≈ 0.33分（20秒 = 0.33分）
   - `notes` = 入力したメモ

9. **イベントログ確認**
   - `task_action_completed` イベント確認
   - `clarity_feedback_submitted` イベント確認

### ✅ 合格基準

- [ ] タイマーが正常に動作する
- [ ] スッキリ度（1-3）が記録される
- [ ] `durationMin` が正確に計算される
- [ ] メモが保存される
- [ ] 2つのイベントが記録される
- [ ] タスクの `totalActionsCompleted` カウンターが増加する

### 📊 スッキリ度テストケース

| スッキリ度 | 絵文字 | 期待値 | 実測値 | 合否 |
|-----------|--------|--------|--------|------|
| あまりスッキリしない | 😐 | 1 | ? | ⬜ |
| 少しスッキリ | 🙂 | 2 | ? | ⬜ |
| かなりスッキリ | 😊 | 3 | ? | ⬜ |

---

## 🔄 テスト5: フルフロー統合テスト

### 目的
タスク作成→推奨→着手→完了の全フローが連続して動作することを確認

### シナリオ: 「英語学習」タスクの完全実行

#### Phase 1: タスク作成（5分）

1. TaskCreateScreenを開く
2. タスク情報入力
   ```
   タイトル: 英語リスニング練習
   説明: TOEIC Part 2の問題を10問解く
   重要度: 70%
   緊急度: 50%
   推定所要時間: 20分
   ```
3. タスク作成完了

#### Phase 2: タスク推奨（5分）

4. TaskRecommendationScreenを開く
5. Factors入力
   ```
   場所: 自宅
   時間帯: 夕方
   利用可能時間: 30分
   ```
6. 「タスクを推奨」クリック
7. 推奨結果表示確認
8. **現在時刻記録**: ____時____分____秒

#### Phase 3: 着手測定（1分）

9. **8秒間待機**（1、2、3...8とカウント）
10. 「着手する」ボタンクリック
11. ActionReportModal表示確認
12. タイマー動作確認

#### Phase 4: 作業実行（実際の作業）

13. **実際に英語リスニング問題を解く**（または25秒待機）
14. 作業完了後、「完了しました」ボタンクリック

#### Phase 5: スッキリ度報告（1分）

15. ClarityFeedbackModal表示確認
16. スッキリ度選択: 「🙂 少しスッキリ」
17. メモ入力: 「10問中7問正解。集中できた。」
18. 「記録する」ボタンクリック

#### Phase 6: データ検証（5分）

19. **IndexedDB確認**
    ```javascript
    // Task確認
    const task = await db.tasks.where('title').equals('英語リスニング練習').first();
    console.log('Task:', {
      totalActionsStarted: task.totalActionsStarted,
      totalActionsCompleted: task.totalActionsCompleted,
      lastTouchAt: task.lastTouchAt
    });
    
    // ActionReport確認
    const report = await db.actionReports.where('taskId').equals(task.taskId).first();
    console.log('ActionReport:', {
      timeToStartSec: report.timeToStartSec,
      durationMin: report.durationMin,
      clarityImprovement: report.clarityImprovement,
      notes: report.notes
    });
    
    // イベントログ確認
    const events = await db.interactionEvents
      .where('eventType')
      .anyOf(['task_recommendation_shown', 'task_action_started', 'task_action_completed'])
      .toArray();
    console.log('Events:', events.length, 'events');
    ```

20. **期待値チェック**
    - Task.totalActionsStarted = 1
    - Task.totalActionsCompleted = 1
    - ActionReport.timeToStartSec ≈ 8秒（7-9秒）
    - ActionReport.clarityImprovement = 2
    - イベント数 = 3件以上

### ✅ 合格基準

- [ ] 全フローがエラーなく完了する
- [ ] 各段階でデータが正しく記録される
- [ ] timeToStartSec が正確（誤差±1秒）
- [ ] durationMin が正確（誤差±5秒）
- [ ] clarityImprovement が正しく記録される
- [ ] タスクカウンターが正確に更新される

---

## 📊 テスト6: 実験条件割り当て

### 目的
ハッシュベースの実験条件割り当てが正常に動作することを確認

### 手順

1. **初回起動時の条件確認**
   ```bash
   # サーバーログを確認
   # "📤 Config served to user: [userId], condition: dynamic_ui" または
   # "📤 Config served to user: [userId], condition: static_ui"
   ```

2. **ユーザーID取得**
   ```javascript
   // Console で実行
   const user = await db.userProfile.toCollection().first();
   console.log('User ID:', user.anonymousId);
   console.log('Condition:', user.experimentCondition);
   ```

3. **条件の一貫性確認**
   - ページをリロード（F5）
   - 同じ条件が維持されることを確認

4. **ハッシュベース割り当てテスト**
   ```bash
   # サーバー側でテスト
   curl -X GET http://localhost:3000/v1/config \
     -H "X-User-ID: test_user_123"
   
   # 同じユーザーIDで複数回実行
   # 常に同じ condition が返される
   ```

### ✅ 合格基準

- [ ] 初回アクセス時に条件が割り当てられる
- [ ] 同じユーザーIDで常に同じ条件が返される
- [ ] 条件が userProfile に保存される
- [ ] `experiment_condition_assigned` イベントが記録される

---

## 🐛 テスト7: エラーハンドリング

### 7-1. サーバー接続エラー

**手順**

1. サーバーを停止
   ```bash
   # サーバーターミナルで Ctrl+C
   ```

2. TaskRecommendationScreenで「タスクを推奨」クリック

3. **期待動作**
   - エラーメッセージ「タスク推奨の取得に失敗しました」表示
   - アプリがクラッシュしない

### 7-2. タスク0件エラー

**手順**

1. IndexedDBのtasksをクリア
   ```javascript
   await db.tasks.clear();
   ```

2. TaskRecommendationScreenで「タスクを推奨」クリック

3. **期待動作**
   - エラーメッセージ「推奨できるタスクがありません」表示

### 7-3. 必須項目未入力エラー

**手順**

1. TaskCreateScreenでタイトルを空のまま「作成」クリック

2. **期待動作**
   - アラート「タイトルを入力してください」表示
   - タスクが作成されない

### ✅ 合格基準

- [ ] 全エラーケースで適切なメッセージが表示される
- [ ] アプリがクラッシュしない
- [ ] エラー後も操作を継続できる

---

## 🔍 テスト8: データ永続性

### 目的
ページリロード後もデータが保持されることを確認

### 手順

1. **タスク作成**
   - テスト1の手順でタスクを3つ作成

2. **ActionReport作成**
   - テスト3-4の手順で着手・完了を1回実行

3. **データ記録**
   ```javascript
   const taskCount = await db.tasks.count();
   const reportCount = await db.actionReports.count();
   const eventCount = await db.interactionEvents.count();
   console.log({ taskCount, reportCount, eventCount });
   ```

4. **ページリロード**
   - F5 キーでリロード

5. **データ確認**
   ```javascript
   const taskCount2 = await db.tasks.count();
   const reportCount2 = await db.actionReports.count();
   const eventCount2 = await db.interactionEvents.count();
   console.log({ taskCount2, reportCount2, eventCount2 });
   ```

6. **比較**
   - リロード前後で件数が一致すること

### ✅ 合格基準

- [ ] タスク数が保持される
- [ ] ActionReport数が保持される
- [ ] イベントログ数が保持される
- [ ] データ内容が変わらない

---

## 📈 テスト9: パフォーマンス

### 9-1. API応答時間

**測定項目**

- `/v1/config` API: < 200ms
- `/v1/task/rank` API: < 500ms
- `/v1/events/batch` API: < 100ms

**測定方法**

```javascript
// Chrome DevTools → Network タブ
// 各APIリクエストの時間を確認
```

### 9-2. UI応答性

**測定項目**

- ボタンクリック → モーダル表示: < 100ms
- タスク作成 → 完了通知: < 500ms
- ページ遷移: < 200ms

### ✅ 合格基準

- [ ] 全てのAPI呼び出しが制限時間内
- [ ] UIがスムーズに動作する
- [ ] ラグや遅延を感じない

---

## 📋 テスト結果記録シート

### 全体評価

| テスト項目 | 結果 | 所要時間 | 備考 |
|-----------|------|---------|------|
| 1. タスク作成 | ⬜ Pass / ⬜ Fail | ___ 分 | |
| 2. タスク推奨 | ⬜ Pass / ⬜ Fail | ___ 分 | |
| 3. 着手測定 ⭐️ | ⬜ Pass / ⬜ Fail | ___ 分 | |
| 4. スッキリ度測定 | ⬜ Pass / ⬜ Fail | ___ 分 | |
| 5. フルフロー統合 | ⬜ Pass / ⬜ Fail | ___ 分 | |
| 6. 実験条件割り当て | ⬜ Pass / ⬜ Fail | ___ 分 | |
| 7. エラーハンドリング | ⬜ Pass / ⬜ Fail | ___ 分 | |
| 8. データ永続性 | ⬜ Pass / ⬜ Fail | ___ 分 | |
| 9. パフォーマンス | ⬜ Pass / ⬜ Fail | ___ 分 | |

### 発見した問題

| # | 問題内容 | 深刻度 | 再現手順 | スクリーンショット |
|---|---------|--------|---------|-------------------|
| 1 | | ⬜ Critical / ⬜ High / ⬜ Medium / ⬜ Low | | |
| 2 | | ⬜ Critical / ⬜ High / ⬜ Medium / ⬜ Low | | |
| 3 | | ⬜ Critical / ⬜ High / ⬜ Medium / ⬜ Low | | |

### ユーザビリティフィードバック

**良かった点**
- 
- 

**改善が必要な点**
- 
- 

**追加してほしい機能**
- 
- 

---

## 🎯 重要メトリクス

### 研究目的の主要指標

| 指標 | 目標値 | 実測値 | 達成 |
|------|--------|--------|------|
| timeToStartSec 精度 | 誤差±1秒 | ___ 秒 | ⬜ |
| clarityImprovement 記録率 | 100% | ___ % | ⬜ |
| イベントログ記録率 | 100% | ___ % | ⬜ |
| UI応答時間 | < 500ms | ___ ms | ⬜ |
| データ永続性 | 100% | ___ % | ⬜ |

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. タスクが作成できない

**原因**: IndexedDBのバージョン不一致

**解決方法**:
```javascript
indexedDB.deleteDatabase('ConcernApp');
location.reload();
```

#### 2. API接続エラー

**原因**: サーバーが起動していない

**解決方法**:
```bash
cd /home/tk220307/sotuken/server
bun run dev
```

#### 3. イベントが記録されない

**原因**: EventLoggerの初期化失敗

**解決方法**:
- ページをリロード
- Consoleでエラーメッセージを確認

#### 4. timeToStartSec が 0 になる

**原因**: recommendationShownAt が未設定

**解決方法**:
- タスク推奨画面を最初から操作し直す
- 推奨表示後、必ず時間を置いてから着手する

---

## 📝 テスト実施チェックリスト

### 実施前

- [ ] サーバーが起動している
- [ ] フロントエンドが起動している
- [ ] Chrome DevToolsが開いている
- [ ] IndexedDBが確認できる
- [ ] テストデータがクリアされている

### 実施中

- [ ] 各手順を順番に実行している
- [ ] 結果を記録している
- [ ] スクリーンショットを撮影している
- [ ] 気づいた点をメモしている

### 実施後

- [ ] 全テスト項目を完了した
- [ ] 結果記録シートを記入した
- [ ] 発見した問題を記録した
- [ ] データをバックアップした

---

## 🎓 テスト完了証明

**テスト実施者**: ___________________  
**テスト実施日**: ___________________  
**テスト環境**: ___________________  
**全体評価**: ⬜ 合格 / ⬜ 条件付き合格 / ⬜ 不合格

**署名**: ___________________

---

**文書バージョン**: 1.0  
**最終更新**: 2025年10月18日

