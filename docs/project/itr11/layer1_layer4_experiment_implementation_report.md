# Layer1/Layer4 自動評価実験システム 実装報告書

## 概要

本ドキュメントは、設計書 `specs/system-design/experiment_spec_layer_1_layer_4.md` に基づいて実装した自動評価実験システムの実装報告である。

**実装期間**: 2025年12月10日
**対象仕様**: Layer1（構造健全性）& Layer4（実用性）自動評価実験

---

## 1. 実装目的

- 5つのモデル構成（A-E）の定量比較
- 250試行（50入力 × 5構成）のバッチ自動実行
- Layer1/Layer4評価指標の自動算出
- ヘッドレス実行環境の構築

---

## 2. 実装フェーズ

### Phase 1: データモデル & コア基盤

| 成果物 | 説明 |
|--------|------|
| `batchExecutions` テーブル | バッチ実行管理 |
| `experimentTrialLogs` テーブル | 試行ログ（設計書7章スキーマ準拠） |
| `ModelConfigurationService` | 5モデル構成管理 |
| `experiment-trial.types.ts` | 型定義 |

### Phase 2: エラー収集システム

| 成果物 | 説明 |
|--------|------|
| `getErrorsAsStringArray()` | ValidationResult → string[]変換 |
| `countTypeErrors()` | 型エラーカウント |
| `countReferenceErrors()` | 参照エラーカウント |
| `hasCyclicDependency()` | 循環依存検出 |
| render-feedback API | フロントエンドからのエラーフィードバック |

### Phase 3: バッチ実行エンジン

| 成果物 | 説明 |
|--------|------|
| `BatchExecutionService` | バッチ実行オーケストレーション |
| `batch-experiment.ts` | バッチAPI（start/status/stop/results/export） |
| SSE進捗通知 | リアルタイム進捗配信 |

### Phase 4: ヘッドレスモード

| 成果物 | 説明 |
|--------|------|
| `HeadlessValidator.tsx` | UIレンダリングなしのDSL検証 |
| `validateUISpecHeadless()` | フック不要の検証関数 |

### Phase 5: 統計・出力

| 成果物 | 説明 |
|--------|------|
| `ExperimentStatisticsService` | Layer1/Layer4指標算出 |
| `calculateBatchStatistics()` | バッチ統計計算 |
| `generatePaperTableData()` | 論文用テーブルデータ生成 |
| CSV/JSONエクスポート | データダウンロード機能 |

### Phase 6: 実験UI

| 成果物 | 説明 |
|--------|------|
| `BatchExperiment.tsx` | バッチ実行制御ページ |
| `BatchProgress.tsx` | リアルタイム進捗表示 |
| `BatchResults.tsx` | 結果サマリー（論文用テーブル形式） |
| `BatchExperimentApiService.ts` | APIクライアント |

---

## 3. ファイル一覧

### 新規作成ファイル（Backend）

```
server/src/
├── types/
│   └── experiment-trial.types.ts          # 型定義
├── services/
│   ├── ModelConfigurationService.ts       # モデル構成管理
│   ├── BatchExecutionService.ts           # バッチ実行
│   └── ExperimentStatisticsService.ts     # 統計集計
└── routes/
    └── batch-experiment.ts                # バッチAPI
```

### 新規作成ファイル（Frontend）

```
concern-app/src/
├── services/
│   └── BatchExperimentApiService.ts       # APIクライアント
├── components/experiment/
│   └── HeadlessValidator.tsx              # ヘッドレス検証
└── pages/research-experiment/
    ├── BatchExperiment.tsx                # バッチ制御UI
    ├── BatchProgress.tsx                  # 進捗UI
    └── BatchResults.tsx                   # 結果UI
```

### 修正ファイル

| ファイル | 変更内容 |
|----------|----------|
| `server/src/database/schema.ts` | 2テーブル追加 |
| `server/src/services/v4/ValidationService.ts` | エラー集計関数追加 |
| `server/src/routes/experiment.ts` | render-feedback API追加 |
| `server/src/index.ts` | batch-experiment ルート登録 |
| `concern-app/src/App.tsx` | バッチ実験ルート追加 |

---

## 4. モデル構成

設計書の5構成を実装：

| ID | 名称 | Stage 1 | Stage 2 | Stage 3 |
|----|------|---------|---------|---------|
| A | All-5-Chat | gpt-5-chat | gpt-5-chat | gpt-5-chat |
| B | All-5-mini | gpt-5-mini | gpt-5-mini | gpt-5-mini |
| C | Hybrid-5Chat/4.1 | gpt-5-chat | gpt-4.1 | gpt-4.1 |
| D | Hybrid-5Chat/5mini | gpt-5-chat | gpt-5-mini | gpt-5-mini |
| E | Router-based | model-router | model-router | model-router |

---

## 5. 評価指標

### Layer1（構造健全性）

| 指標 | 算出方法 |
|------|----------|
| VR | dsl_errors=null && render_errors=null の割合 |
| TCR | type_error_count=0 の割合 |
| RRR | reference_error_count=0 の割合 |
| CDR | cycle_detected=true の割合 |
| RGR | regenerated=true の割合 |

### Layer4（実用性）

| 指標 | 算出方法 |
|------|----------|
| LAT | 平均レイテンシ (ms) |
| COST | トークン数 × 単価 × 為替レート (JPY) |
| FR | runtime_error=true の割合 |

---

## 6. API エンドポイント

### バッチ実行

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/experiment/batch/start` | バッチ開始 |
| GET | `/api/experiment/batch/:id/status` | ステータス取得 |
| POST | `/api/experiment/batch/:id/stop` | バッチ停止 |
| GET | `/api/experiment/batch/:id/progress` | SSE進捗 |
| GET | `/api/experiment/batch/:id/results` | 結果取得 |
| GET | `/api/experiment/batch/:id/trials` | 試行ログ一覧 |
| GET | `/api/experiment/batch/:id/export` | エクスポート |
| GET | `/api/experiment/batch` | バッチ一覧 |
| GET | `/api/experiment/batch/configs` | モデル構成一覧 |

### レンダーフィードバック

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/experiment/trials/:id/render-feedback` | render_errors送信 |
| GET | `/api/experiment/trials/:id` | 試行ログ取得 |

---

## 7. UIルート

| パス | 説明 |
|------|------|
| `/research-experiment/batch` | バッチ実験制御 |
| `/research-experiment/batch/:batchId/progress` | 進捗表示 |
| `/research-experiment/batch/:batchId/results` | 結果サマリー |

---

## 8. 使用方法

### 事前準備

1. DBマイグレーション
```bash
cd server
bun run db:generate
bun run db:migrate
```

2. 入力コーパス準備（50件）
```json
// config/experiment-input-corpus.json
{
  "corpusId": "default",
  "description": "50件の入力テストデータ",
  "inputs": [
    {
      "inputId": "input_001",
      "concernText": "...",
      "contextFactors": { ... }
    },
    ...
  ]
}
```

### 実験実行

1. `http://localhost:5173/research-experiment/batch` にアクセス
2. モデル構成を選択（A-E）
3. 並列数を設定（初期は1推奨）
4. 「バッチ実行開始」をクリック
5. 進捗ページで監視
6. 完了後、結果ページでLayer1/Layer4テーブルを確認
7. CSV/JSONでエクスポート

---

## 9. 設計判断

### 9.1 データベース設計

- **独立テーブル方式**: 既存の`experimentSessions`に列追加ではなく、専用テーブル（`experimentTrialLogs`）を作成
- **理由**: 設計書7章のスキーマがステージ単位（1試行=3レコード）であり、1:N関係を明確に表現

### 9.2 ヘッドレスモード

- **フロントエンド軽量モード方式**: サーバーサイドのみ完結ではなく、フロントエンドでJotai atom作成・ReactiveBinding検証を実行
- **理由**: 実際のReact環境での検証によりrender_errorsの正確な検出が可能

### 9.3 並列実行

- **初期値1（直列実行）**: APIレート制限とシステム安定性を考慮
- **段階的スケールアップ**: UI上のスライダーで1-10まで調整可能

---

## 10. 未実装・制約事項

| 項目 | 状態 | 備考 |
|------|------|------|
| 入力コーパス50件 | 未作成 | 別途JSONファイルを準備 |
| model-router選択モデル取得 | 要調査 | Azureレスポンスから取得できるか確認 |
| 統計検定（z検定/U検定） | 未実装 | Phase 5の拡張として実装可能 |
| LaTeX出力 | 未実装 | CSVからの変換で対応 |

---

## 11. 参照

- 設計書: `specs/system-design/experiment_spec_layer_1_layer_4.md`
- 計画書: `.claude/plans/floating-mapping-gizmo.md`
