## データディクショナリ（研究/運用）

### 共通キー
- `userAnonId`: 端末で生成した匿名UUID（キーチェーン保持）。
- `configVersion`: 設定の凍結バージョン（例: v1）。
- `responseId`: UI生成レスポンスのID（リプレイに使用）。
- `abCondition`: 実験条件（C0/C1/C2/C3）。
- `contextHash`: サーバ送信前に要約/ハッシュ化したコンテキスト。

### ConfigSnapshot
- `weights`: 優先スコア重み（`importance/urgency/relief/...`）。
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
- `task_completed`: タスク完了。`taskId`。
- `notification_shown/clicked`: 通知表示/クリック。`notificationId`。
- `self_reported_mood`: 不安の自己申告。`anxietyBefore/After`（0–10）。

### 保持期間
- 研究データ: 180日
- 運用ログ: 30日


