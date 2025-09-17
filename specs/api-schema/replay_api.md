## リプレイAPI 仕様

### 目的
過去のUI生成結果を再生成し、決定論と再現性を検証する。

### エンドポイント
- POST `/v1/replay/generate`
  - Request: `{ "responseId": string }` または `{ "sessionId": string }`
  - Response: `UiGenerateResponse`（`/v1/ui/generate`と同形）

### 処理概要
1) `responseId`から当時の`configSnapshot`・`seed`・`contextHash`・`model`を復元
2) キャッシュに当時の`dsl`があれば返却（`diffFromOriginal = null`）
3) なければ同一設定で再生成→オリジナルとJSON正規化後に比較
4) 差分を`diffFromOriginal`として返却（要素順の違いは無視するオプション）

### 応答フィールド（追加）
- `diffFromOriginal`: `null` もしくは `{ "changed": boolean, "pathDiffs": [ ... ] }`

### 一致判定
- 厳密一致（ハッシュ一致）を第一指標。許容差として、順序のみの差異や色相の小変化は二次指標で評価。


