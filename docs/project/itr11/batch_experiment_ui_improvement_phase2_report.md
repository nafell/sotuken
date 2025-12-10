# バッチ実験UI改善 Phase 2 実装報告書

## 概要

前回のUI改善（Phase 1）後に発見されたバグ修正と追加改善を実施。

- **実施日**: 2025-12-11
- **対象システム**: Layer1/Layer4バッチ実験システム

---

## 1. 課題と対応

### 1.1 データ連携（生成DSLデータの参照）

**課題**:
- `experimentTrialLogs`テーブルにはメトリクスのみ保存されており、生成されたprompt/DSLデータは参照できなかった
- 単発実験用の`experimentGenerations`テーブルにはこれらのデータがあるが、バッチ実験とは別システムのためJOINでの対応は不可能

**設計判断**:
- 既存テーブルへのカラム追加で対応
- `generatedData` (JSONB): Stage1-3の生成結果を保存
- `promptData` (JSONB): 各Stageで使用したプロンプト変数を保存

**実装**:
- `server/src/database/schema.ts`: カラム追加
- `server/src/services/BatchExecutionService.ts`: `logTrialStage`で生成データを保存
- `TrialLogDetail.tsx`: 「Generated」タブを追加してDSLデータをJSON形式で表示

---

### 1.2 プログレスバーが0%から動かない問題

**課題**:
- SSE送信条件が`completedTrials`の変更のみだったため、ステージ実行中は進捗更新が送信されなかった
- `currentStage`/`currentInputId`は更新されていたが、クライアントに通知されていなかった

**設計判断**:
- SSE送信条件をJSON全体比較に変更
- `progress`オブジェクトの任意のプロパティが変更された場合に送信

**実装**:
```typescript
// 変更前
if (progress.completedTrials !== lastCompleted)

// 変更後
const progressJson = JSON.stringify(progress);
if (progressJson !== lastProgressJson)
```

---

### 1.3 結果UI概要に設定情報が表示されない

**課題**:
- バッチ開始時の`modelConfigs`, `inputCorpusId`, `parallelism`はDBに保存されていたが、フロントエンドで表示していなかった
- `maxTrials`はDBスキーマに存在しなかった

**設計判断**:
- `batchExecutions`テーブルに`maxTrials` INTEGERカラムを追加
- `/results` APIで設定情報を含めて返す
- 概要タブに「実行設定」セクションを追加

**実装**:
- 表示項目: 開始時刻、完了時刻、コーパスID、モデル構成、並列数、直列数上限

---

### 1.4 Layer1/Layer4の値が表示されない

**課題**:
- `executeBatch`完了時に`layer1Results`/`layer4Results`を計算・保存していなかった
- `/results`は`batch.layer1Results`をそのまま返すが、DBには常に`null`

**設計判断**:
- バッチ完了後の統計保存は行わず、`/results`呼び出し時に動的計算する方式を採用
- 理由: 試行ログが更新された場合（render-feedbackなど）に再計算が必要になるため

**統計計算ロジック**:

| 指標 | 計算式 |
|------|--------|
| VR (DSL妥当率) | `(dsl_errors=null && render_errors=null) / total` |
| TCR (型整合率) | `(type_error_count=0) / total` |
| RRR (参照整合率) | `(reference_error_count=0) / total` |
| CDR (循環依存率) | `(cycle_detected=true) / total` |
| RGR (再生成率) | `(regenerated=true) / total` |
| LAT (平均レイテンシ) | `sum(latency_ms) / total` |
| COST (推定コスト) | `(input_tokens * 0.010 + output_tokens * 0.030) / 1000 * 150` |
| FR (異常終了率) | `(runtime_error=true) / total` |

**モデル別統計**:
- `experimentTrialLogs`を`modelConfig`でグループ化
- 各グループでLayer1/Layer4を計算
- `byModel: ModelStatistics[]`として返す

---

## 2. 修正ファイル一覧

### バックエンド

| ファイル | 変更内容 |
|---------|---------|
| `server/src/database/schema.ts` | `generatedData`, `promptData`, `maxTrials`カラム追加 |
| `server/src/routes/batch-experiment.ts` | SSE送信条件修正、`calculateStatistics`関数追加、`/results`改善 |
| `server/src/services/BatchExecutionService.ts` | `logTrialStage`で生成データ保存、`startBatch`でmaxTrials保存 |

### フロントエンド

| ファイル | 変更内容 |
|---------|---------|
| `concern-app/src/services/BatchExperimentApiService.ts` | `BatchResultsSummary`型に設定情報追加、`TrialLog`型にgeneratedData追加 |
| `concern-app/src/pages/research-experiment/BatchResults.tsx` | 概要タブに「実行設定」セクション追加 |
| `concern-app/src/pages/research-experiment/components/TrialLogDetail.tsx` | 「Generated」タブ追加 |

### マイグレーション

| ファイル | 内容 |
|---------|------|
| `server/drizzle/0004_light_manta.sql` | `max_trials`, `generated_data`, `prompt_data`カラム追加 |

---

## 3. 変更差分

```
7 files changed, 250 insertions(+), 14 deletions(-)
```

---

## 4. テスト確認項目

- [ ] バッチ実験を開始して、プログレスバーがステージ実行中も更新されることを確認
- [ ] 結果ページの概要タブに設定情報（開始時刻、コーパス、モデル構成等）が表示されることを確認
- [ ] Layer1/Layer4タブにモデル別統計が表示されることを確認
- [ ] Trialsタブで試行を展開し、「Generated」タブでDSLデータが表示されることを確認

---

## 5. 既知の制限事項

1. **コスト計算の精度**: TOKEN_PRICESからモデル別の正確な価格を取得せず、平均的な価格（input: $0.010/K, output: $0.030/K）で概算している
2. **既存データのgeneratedData**: 本修正以前に実行されたバッチ実験のgeneratedData/promptDataは`null`のまま

---

## 6. 関連ドキュメント

- [Phase 1 実装報告書](./batch_experiment_ui_improvement_report.md)
- [Layer1/Layer4実験設計書](../../../specs/system-design/experiment_spec_layer_1_layer_4.md)
