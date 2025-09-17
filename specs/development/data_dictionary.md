## データディクショナリ（研究/運用）

### 共通キー
- `userAnonId`: 端末で生成した匿名UUID（キーチェーン保持）。
- `configVersion`: 設定の凍結バージョン（例: v1）。
- `responseId`: UI生成レスポンスのID（リプレイに使用）。
- `abCondition`: 実験条件（C0/C1/C2/C3）。
- `contextHash`: サーバ送信前に要約/ハッシュ化したコンテキスト。

### ConfigSnapshot
- `weights`: 優先スコア重み（`importance/urgency/cognitiveRelief/brainFogLevel/...`）。
- `uiNoveltyPolicy`: `lowThreshold/highThreshold/dailyBudget` と表示制約。
- `model`: モデル名・バージョンと決定論パラメータ。

### UiLayout（生成結果）
- `dslJson`: UI DSL v1.1の本文。
- `seed`: 乱数seed（決定論再現）。
- `model`: 生成に使用したモデル名。
- `configVersion/abCondition`: 実験状態。

### イベント（主要）
- `ui_generated`: 生成完了。`dslHash`, `seed`, `model`, `configSnapshotHash`。
- `ui_rendered`: 表示完了。
- `card_clicked`: カード押下。`cardId`。
- `action_executed`: アクション実行。`actionId`, `result?`。
- `concern_organized`: 関心事整理完了。`concernId`, `phase`（reality_check/planning/breakdown）, `completion`。
- `task_completed`: タスク完了。`taskId`。
- `notification_shown/clicked`: 通知表示/クリック。`notificationId`。
- `cognitive_load_reported`: 認知負荷の自己申告。`workingMemoryUsageBefore/After`（0–100）, `clarityLevel`（very_clear/somewhat_clear/still_foggy）, `brainFogImprovement`。

### 保持期間
- 研究データ: 180日
- 運用ログ: 30日


