# バッチ並列実行機能 実装報告書

## 概要

バッチ実験実行における2つの問題を解決：
1. **並列実行が未実装**: `parallelism`パラメータが使用されていなかった
2. **プログレスバーが動かない**: 1試行完了まで進捗が更新されなかった

---

## 1. 問題分析

### 1.1 並列実行の問題

**発見された問題**:
- `parallelism`パラメータはDBに保存されるが、実行ロジックでは使用されていなかった
- `BatchExecutionService.executeBatch()`はネストされた`for`ループ + `await`で完全に逐次実行
- 1試行に60-250秒かかるため、150試行 = 2.5-6.25時間の実行時間

**元のコード**:
```typescript
for (const modelConfigId of config.modelConfigs) {
  for (let inputIndex = 0; inputIndex < corpus.inputs.length; inputIndex++) {
    const result = await this.executeTrial(context, input);  // 逐次実行
  }
}
```

### 1.2 プログレスバーの問題

**発見された問題**:
- `completedTrials`は試行完了時のみインクリメント
- 1試行に60-250秒かかるため、長時間プログレスバーが0%のまま
- SSEは1秒間隔で送信されるが、実際の進捗変化がないと見た目は変わらない

---

## 2. 設計

### 2.1 タスクキュー方式の並列実行

**アーキテクチャ**:

```
┌─────────────────────────────────────────────────────────┐
│                    Task Queue                           │
│  [Task1] [Task2] [Task3] [Task4] [Task5] ...           │
└─────────────────────────────────────────────────────────┘
      │       │       │
      ▼       ▼       ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│Worker 0 │ │Worker 1 │ │Worker 2 │  ... (parallelism数)
└─────────┘ └─────────┘ └─────────┘
      │       │       │
      ▼       ▼       ▼
   Trial    Trial    Trial
   (3 stages each)
```

**設計ポイント**:
1. 全試行タスクを事前にキューに登録
2. `parallelism`数のワーカーを`Promise.all()`で並列起動
3. 各ワーカーはキューからタスクを取得して実行
4. キューが空になったらワーカー終了

### 2.2 ステージ単位の進捗更新

**従来の粒度**:
```
試行1完了 → completedTrials = 1 (進捗: 1/150 = 0.67%)
試行2完了 → completedTrials = 2 (進捗: 2/150 = 1.33%)
```

**新しい粒度**:
```
試行1 Stage1完了 → completedStages = 1 (進捗: 1/450 = 0.22%)
試行1 Stage2完了 → completedStages = 2 (進捗: 2/450 = 0.44%)
試行1 Stage3完了 → completedStages = 3 (進捗: 3/450 = 0.67%)
```

- `totalStages = totalTrials * 3` （各試行は3ステージ）
- ステージ完了ごとに`completedStages`をインクリメント
- プログレスバーは`completedStages / totalStages * 100`%で計算

### 2.3 並列実行状態の可視化

**データ構造**:
```typescript
interface RunningTask {
  workerId: number;      // ワーカー番号
  modelConfig: string;   // 'A', 'B', 'C', 'D', 'E'
  inputId: string;       // 入力データID
  stage: number;         // 1, 2, 3
  startedAt: string;     // ISO 8601
}

interface BatchProgress {
  // 既存フィールド
  totalTrials: number;
  completedTrials: number;
  failedTrials: number;

  // 新規追加
  totalStages: number;      // totalTrials * 3
  completedStages: number;  // ステージ完了数
  runningTasks: RunningTask[];  // 実行中タスク一覧
}
```

---

## 3. 実装

### 3.1 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `server/src/types/experiment-trial.types.ts` | 修正 | `RunningTask`型追加、`BatchProgress`型拡張 |
| `server/src/services/BatchExecutionService.ts` | 修正 | タスクキュー方式の並列実行実装 |
| `concern-app/src/services/BatchExperimentApiService.ts` | 修正 | フロントエンド型定義更新 |
| `concern-app/src/pages/research-experiment/BatchProgress.tsx` | 修正 | 並列実行状態表示UI追加 |

### 3.2 バックエンド実装

#### タスクキュー初期化 (startBatch)

```typescript
// タスクキューを作成
const taskQueue: TrialTask[] = [];
let trialNumber = 0;
for (const modelConfigId of config.modelConfigs) {
  for (const input of limitedInputs) {
    trialNumber++;
    taskQueue.push({ trialNumber, modelConfigId, input });
  }
}

// 実行状態を初期化
runningBatches.set(batchId, {
  progress: {
    totalStages: totalTrials * 3,
    completedStages: 0,
    runningTasks: [],
    // ...
  },
  taskQueue,
  taskQueueIndex: 0,
  parallelism: config.parallelism,
});
```

#### 並列ワーカー起動 (executeBatch)

```typescript
// 並列ワーカーを起動
const workers = Array(state.parallelism)
  .fill(null)
  .map((_, workerIndex) =>
    this.processTaskQueue(batchId, config.experimentId, workerIndex)
  );

// 全ワーカーの完了を待機
await Promise.all(workers);
```

#### ワーカー処理ループ (processTaskQueue)

```typescript
while (!state.shouldStop) {
  // タスクを取得
  const task = this.getNextTask(batchId);
  if (!task) break;

  // runningTasksに追加
  state.progress.runningTasks.push({
    workerId,
    modelConfig: task.modelConfigId,
    inputId: task.input.inputId,
    stage: 1,
    startedAt: new Date().toISOString(),
  });

  // 試行実行
  const result = await this.executeTrial(context, task.input);

  // runningTasksから削除
  const taskIndex = state.progress.runningTasks.findIndex(t => t.workerId === workerId);
  if (taskIndex !== -1) {
    state.progress.runningTasks.splice(taskIndex, 1);
  }
}
```

#### ステージ進捗更新 (executeTrial)

```typescript
for (const stageNum of [1, 2, 3] as const) {
  // runningTasks内のステージを更新
  const runningTask = state.progress.runningTasks.find(t => t.workerId === workerId);
  if (runningTask) {
    runningTask.stage = stageNum;
  }

  // ステージ実行
  const result = await this.executeStage(...);

  // ステージ完了時にcompletedStagesをインクリメント
  state.progress.completedStages++;
}
```

### 3.3 フロントエンド実装

#### プログレスバー計算

```typescript
// ステージベースで細かい粒度
const progressPercent = progress
  ? progress.totalStages && progress.completedStages !== undefined
    ? Math.round((progress.completedStages / progress.totalStages) * 100)
    : Math.round((progress.completedTrials / progress.totalTrials) * 100)
  : 0;
```

#### 並列実行状態表示

```tsx
{progress.runningTasks.map((task: RunningTask) => (
  <div key={task.workerId}>
    <span>W{task.workerId}</span>
    <span>{task.modelConfig}</span>
    <span>Stage {task.stage}</span>
    <span>{task.inputId}</span>
  </div>
))}
```

---

## 4. 技術的考慮事項

### 4.1 排他制御

タスクキューからの取得は単一スレッド（Node.js/Bunのイベントループ）で実行されるため、明示的なロックは不要。`taskQueueIndex`のインクリメントは同期的に行われる。

### 4.2 DB書き込み競合

`completedTrials`/`failedTrials`の更新は各ワーカーが独立して行うため、カウンタの値が一時的に不整合になる可能性があるが、最終的な値は正確。必要に応じてトランザクションを追加可能。

### 4.3 エラーハンドリング

1ワーカーのエラーが全体を止めないよう、各ワーカーは独立してエラーをキャッチ。エラー発生時は`failedTrials`に計上し、次のタスクに進む。

### 4.4 後方互換性

- `currentModelConfig`, `currentStage`などの従来フィールドも引き続き更新
- フロントエンドは`runningTasks`がない場合、従来のUIにフォールバック

---

## 5. 期待される効果

| 項目 | 改善前 | 改善後 |
|------|--------|--------|
| **実行時間** (150試行) | 2.5-6.25時間 | parallelism=5で約30-75分 |
| **プログレス更新頻度** | 60-250秒ごと | 20-80秒ごと（ステージ単位） |
| **可視性** | 単一タスクのみ | 全並列ワーカーの状態 |

---

## 6. 使用方法

1. バッチ開始ページで「並列数」スライダーを設定（1-5）
2. 実行開始後、進捗ページで：
   - プログレスバー: ステージ単位で更新される
   - 「並列実行状態」セクション: 各ワーカーの現在の状態を表示
   - 残り時間推定: ステージベースでより正確に計算

---

## 7. 今後の改善候補

1. **動的parallelism調整**: APIレート制限に応じて並列数を自動調整
2. **ワーカーごとの統計**: 各ワーカーの処理速度・エラー率を表示
3. **優先度キュー**: 特定のモデル構成を優先実行
