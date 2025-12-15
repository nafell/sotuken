# バッチ実験UI改善 実装報告書

## 概要

本ドキュメントは、Layer1/Layer4自動評価実験システムのUI改善実装報告である。

**実装日**: 2025年12月11日
**対象**: バッチ実験の開始前UI、実行中UI、データ確認機能

---

## 1. 改善内容サマリー

| 領域 | 改善前 | 改善後 |
|------|--------|--------|
| コーパス入力 | テキストボックス手入力 | ドロップダウン選択 |
| 直列数制限 | なし（全件実行） | 1-50のスライダー |
| 開始時刻 | 未表示 | 表示あり |
| モデル構成詳細 | アルファベット1文字のみ | 名称+各ステージモデル表示 |
| 実行状態 | モデル構成のみ | Stage番号+入力ID表示 |
| 試行ログ詳細 | なし | Trialsタブで詳細表示 |

---

## 2. Phase 1: 開始前UI改善

### 2.1 コーパスドロップダウン

**変更ファイル**:
- `server/src/routes/batch-experiment.ts`
- `concern-app/src/services/BatchExperimentApiService.ts`
- `concern-app/src/pages/research-experiment/BatchExperiment.tsx`

**実装内容**:
- バックエンドに `GET /api/experiment/batch/corpuses` エンドポイント追加
- `config/test-cases/` ディレクトリと `config/experiment-input-corpus.json` をスキャン
- 各コーパスのID、説明、入力件数を返却
- フロントエンドでドロップダウン選択UIに変更

**API レスポンス例**:
```json
{
  "success": true,
  "corpuses": [
    { "corpusId": "test_cases", "description": "Expert評価用テストケース", "inputCount": 6 },
    { "corpusId": "default", "description": "入力コーパス", "inputCount": 50 }
  ]
}
```

### 2.2 直列数制限スライダー

**変更ファイル**:
- `server/src/types/experiment-trial.types.ts`
- `server/src/services/BatchExecutionService.ts`
- `concern-app/src/pages/research-experiment/BatchExperiment.tsx`

**実装内容**:
- `BatchExecutionConfig` に `maxTrials?: number` フィールド追加
- バッチ実行開始時に入力コーパスを `maxTrials` で制限
- フロントエンドに1-50のスライダーUI追加
- 実行予定サマリーで動的に計算された値を表示

---

## 3. Phase 2: 実行中UI改善

### 3.1 開始時刻表示

**変更ファイル**:
- `concern-app/src/pages/research-experiment/BatchProgress.tsx`

**実装内容**:
- バッチ情報セクションに開始時刻を追加表示
- `startedAt` は既にAPIから取得済みのため、表示のみ追加

### 3.2 モデル構成詳細表示

**変更ファイル**:
- `concern-app/src/pages/research-experiment/BatchProgress.tsx`

**実装内容**:
- `MODEL_CONFIGURATIONS` 定数を参照して詳細表示
- 表示形式: `A: All-5-Chat` + 各ステージのモデル名
- 現在実行中のステージをハイライト表示

### 3.3 現在の実行状態表示

**変更ファイル**:
- `server/src/types/experiment-trial.types.ts`
- `server/src/services/BatchExecutionService.ts`
- `concern-app/src/services/BatchExperimentApiService.ts`
- `concern-app/src/pages/research-experiment/BatchProgress.tsx`

**実装内容**:
- `BatchProgress` 型に `currentStage` と `currentInputId` フィールド追加
- バッチ実行中にSSEで現在のステージ番号と入力IDを送信
- 「現在の実行状態」セクションを追加（緑色背景で強調）

**表示例**:
```
現在の実行状態
Stage 2 実行中 / Input: case_03
入力 3 / 6 件目
```

---

## 4. Phase 3: データ確認改善

### 4.1 TrialLogDetailコンポーネント

**新規ファイル**:
- `concern-app/src/pages/research-experiment/components/TrialLogDetail.tsx`

**実装内容**:
- 試行ログの詳細表示コンポーネント（SessionDetailのUI構造を参考）
- 3タブ構成: Overview / Metrics / Errors
- アコーディオン形式で展開/折りたたみ

**タブ内容**:

| タブ | 表示内容 |
|------|----------|
| Overview | inputId, modelConfig, stage, timestamp, regenerated |
| Metrics | inputTokens, outputTokens, latencyMs, totalTokens |
| Errors | typeErrorCount, referenceErrorCount, cycleDetected, runtimeError, dslErrors, renderErrors |

### 4.2 BatchResults統合

**変更ファイル**:
- `concern-app/src/pages/research-experiment/BatchResults.tsx`

**実装内容**:
- タブナビゲーション追加（概要/Layer1/Layer4/Trials/Export）
- Trialsタブで試行ログ一覧を表示
- フィルタ機能（モデル構成、ステージ）
- TrialLogDetailコンポーネントでアコーディオン展開

---

## 5. ファイル変更一覧

### バックエンド（server/）

| ファイル | 変更種別 | 内容 |
|----------|----------|------|
| `src/routes/batch-experiment.ts` | 修正 | corpuses API追加、maxTrials対応 |
| `src/services/BatchExecutionService.ts` | 修正 | maxTrials制限、currentStage/currentInputId追加 |
| `src/types/experiment-trial.types.ts` | 修正 | BatchExecutionConfig, BatchProgress型拡張 |

### フロントエンド（concern-app/）

| ファイル | 変更種別 | 内容 |
|----------|----------|------|
| `src/services/BatchExperimentApiService.ts` | 修正 | CorpusInfo型、getCorpuses()、BatchProgress型拡張 |
| `src/pages/research-experiment/BatchExperiment.tsx` | 修正 | コーパスドロップダウン、直列数スライダー |
| `src/pages/research-experiment/BatchProgress.tsx` | 修正 | 開始時刻、モデル詳細、実行状態表示 |
| `src/pages/research-experiment/BatchResults.tsx` | 修正 | タブナビゲーション、Trialsタブ |
| `src/pages/research-experiment/components/TrialLogDetail.tsx` | **新規** | 試行ログ詳細コンポーネント |

---

## 6. 使用方法

### バッチ実験の開始

1. `http://localhost:5173/research-experiment/batch` にアクセス
2. 入力コーパスをドロップダウンから選択
3. 直列数制限スライダーで実行件数を調整（1-50）
4. モデル構成を選択
5. 「バッチ実行開始」をクリック

### 実行中の監視

- 進捗ページでリアルタイム進捗を確認
- 開始時刻、現在の構成、現在のステージ/入力IDを表示
- 残り推定時間を自動計算

### 結果確認

1. 完了後、結果ページに遷移
2. 「概要」タブで実験サマリーを確認
3. 「Layer1」「Layer4」タブで統計テーブルを確認
4. 「Trials」タブで個別試行の詳細を確認
   - フィルタでモデル構成/ステージを絞り込み
   - 各試行をクリックして展開
5. 「Export」タブでJSON/CSVダウンロード

---

## 7. 技術的考慮事項

### 並列実行について

現在は直列実行のみ実装済み。`parallelism` パラメータはDBに保存されるが、実行時は未使用。
将来の並列化に備えて `currentStage` / `currentInputId` フィールドを設計済み。

### パフォーマンス

- Trialsタブは遅延読み込み（タブ選択時にAPI呼び出し）
- 試行ログリストは最大600pxでスクロール表示
- フィルタリングはクライアントサイドで実行

---

## 8. 参照

- 設計書: `specs/system-design/experiment_spec_layer_1_layer_4.md`
- 前回実装報告: `docs/project/itr11/layer1_layer4_experiment_implementation_report.md`
- 計画書: `.claude/plans/warm-giggling-gizmo.md`
