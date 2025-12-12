# 統計分析機能 実装タスク計画

**設計書**: `/specs/system-design/statistical-analysis-design.md`
**作成日**: 2025-12-12

---

## タスク一覧

### Phase 1: バックエンド統計計算

#### Task 1.1: 型定義ファイル作成
- **ファイル**: `server/src/types/statistics.types.ts`
- **内容**:
  - `StatisticalTestResult` インターフェース
  - `BatchStatisticsResult` インターフェース
  - 関連する型定義
- **依存**: なし
- **見積り**: 小

#### Task 1.2: z検定アルゴリズム実装
- **ファイル**: `server/src/services/StatisticalAnalysisService.ts`
- **内容**:
  - `performZTest(successes1, n1, successes2, n2)` 関数
  - pooled proportion計算
  - z統計量計算
  - p値計算（両側検定）
  - Cohen's h効果量計算
- **依存**: Task 1.1
- **見積り**: 中

#### Task 1.3: Mann-Whitney U検定アルゴリズム実装
- **ファイル**: `server/src/services/StatisticalAnalysisService.ts`
- **内容**:
  - `performMannWhitneyU(values1, values2)` 関数
  - ランク付けアルゴリズム
  - U統計量計算
  - 正規近似によるp値計算
  - rank-biserial correlation効果量計算
- **依存**: Task 1.1
- **見積り**: 中

#### Task 1.4: StatisticalAnalysisService メインロジック
- **ファイル**: `server/src/services/StatisticalAnalysisService.ts`
- **内容**:
  - `runAllPairwiseComparisons(batchId)` メソッド
  - モデル別データ取得
  - Layer1指標の検定実行（8指標 × 10ペア）
  - Layer4指標の検定実行（2指標 × 10ペア）
  - Bonferroni補正適用
  - 結果集約
- **依存**: Task 1.2, Task 1.3
- **見積り**: 大

#### Task 1.5: 統計計算の単体テスト
- **ファイル**: `server/test/statistical-analysis.test.ts`
- **内容**:
  - z検定の既知値テスト
  - Mann-Whitney U検定の既知値テスト
  - 効果量計算テスト
  - エッジケース（n=0, 成功率100%等）
- **依存**: Task 1.4
- **見積り**: 中

---

### Phase 2: APIエンドポイント

#### Task 2.1: 統計APIエンドポイント追加
- **ファイル**: `server/src/routes/batch-experiment.ts`
- **内容**:
  - `GET /api/batch/:batchId/statistics` 追加
  - StatisticalAnalysisService呼び出し
  - レスポンス整形
- **依存**: Task 1.4
- **見積り**: 小

#### Task 2.2: Markdownエクスポート実装
- **ファイル**: `server/src/services/StatisticalExportService.ts`
- **内容**:
  - `exportToMarkdown(result: BatchStatisticsResult)` 関数
  - Layer1テーブル生成
  - Layer4テーブル生成
  - サマリー生成
- **依存**: Task 1.1
- **見積り**: 中

#### Task 2.3: CSVエクスポート実装
- **ファイル**: `server/src/services/StatisticalExportService.ts`
- **内容**:
  - `exportToCSV(result: BatchStatisticsResult)` 関数
  - ヘッダー行生成
  - データ行生成
- **依存**: Task 1.1
- **見積り**: 小

#### Task 2.4: エクスポートAPIエンドポイント追加
- **ファイル**: `server/src/routes/batch-experiment.ts`
- **内容**:
  - `GET /api/batch/:batchId/statistics/export` 追加
  - formatクエリパラメータ対応（markdown/csv）
  - Content-Type設定
  - ファイルダウンロード対応
- **依存**: Task 2.2, Task 2.3
- **見積り**: 小

#### Task 2.5: APIテスト作成
- **ファイル**: `server/test/statistics-api.test.ts`
- **内容**:
  - 統計エンドポイントのE2Eテスト
  - エクスポートエンドポイントのテスト
  - 異常系テスト（存在しないbatchId等）
- **依存**: Task 2.4
- **見積り**: 中

---

### Phase 3: フロントエンドUI

#### Task 3.1: API Serviceにメソッド追加
- **ファイル**: `concern-app/src/services/BatchExperimentApiService.ts`
- **内容**:
  - `getStatistics(batchId)` メソッド追加
  - `getStatisticsExportUrl(batchId, format)` メソッド追加
  - 型定義追加
- **依存**: Task 2.1
- **見積り**: 小

#### Task 3.2: BatchResults.tsx タブUI追加
- **ファイル**: `concern-app/src/pages/research-experiment/BatchResults.tsx`
- **内容**:
  - タブコンポーネント追加
  - 既存セクションをタブ内に移動
  - 「統計検定」タブ追加
  - タブ切り替えstate管理
- **依存**: なし
- **見積り**: 中

#### Task 3.3: StatisticsTab.tsx コンポーネント作成
- **ファイル**: `concern-app/src/pages/research-experiment/components/StatisticsTab.tsx`
- **内容**:
  - 検定設定表示（α, 補正方法）
  - サマリーセクション
  - Layer1検定結果テーブル（指標選択UI付き）
  - Layer4検定結果テーブル
  - 有意性のハイライト表示
  - 効果量バッジ
- **依存**: Task 3.1
- **見積り**: 大

#### Task 3.4: StatisticsExport.tsx コンポーネント作成
- **ファイル**: `concern-app/src/pages/research-experiment/components/StatisticsExport.tsx`
- **内容**:
  - Markdownダウンロードボタン
  - CSVダウンロードボタン
  - クリップボードコピー機能（オプション）
- **依存**: Task 3.1
- **見積り**: 小

#### Task 3.5: UI統合
- **ファイル**: `concern-app/src/pages/research-experiment/BatchResults.tsx`
- **内容**:
  - StatisticsTabをタブ内に配置
  - エクスポートセクション統合
  - スタイル調整
- **依存**: Task 3.2, Task 3.3, Task 3.4
- **見積り**: 小

---

### Phase 4: 統合・検証

#### Task 4.1: 実データでの動作確認
- **内容**:
  - 既存バッチ実験結果で統計計算実行
  - UI表示確認
  - エクスポート動作確認
- **依存**: Task 3.5
- **見積り**: 中

#### Task 4.2: 論文用出力の最終調整
- **内容**:
  - Markdown表のフォーマット微調整
  - 小数点桁数の調整
  - 論文に直接貼り付け可能か確認
- **依存**: Task 4.1
- **見積り**: 小

---

## 依存関係図

```
Phase 1 (Backend)
├── Task 1.1 (型定義)
│   ├── Task 1.2 (z検定)
│   └── Task 1.3 (Mann-Whitney U)
│       └── Task 1.4 (メインロジック)
│           └── Task 1.5 (単体テスト)

Phase 2 (API)
├── Task 2.1 (統計API) ← Task 1.4
├── Task 2.2 (Markdown Export) ← Task 1.1
├── Task 2.3 (CSV Export) ← Task 1.1
├── Task 2.4 (Export API) ← Task 2.2, 2.3
└── Task 2.5 (APIテスト) ← Task 2.4

Phase 3 (Frontend)
├── Task 3.1 (API Service) ← Task 2.1
├── Task 3.2 (タブUI)
├── Task 3.3 (StatisticsTab) ← Task 3.1
├── Task 3.4 (StatisticsExport) ← Task 3.1
└── Task 3.5 (UI統合) ← Task 3.2, 3.3, 3.4

Phase 4 (Integration)
├── Task 4.1 (動作確認) ← Task 3.5
└── Task 4.2 (最終調整) ← Task 4.1
```

---

## 実装順序（推奨）

1. **Task 1.1** - 型定義（他タスクの前提）
2. **Task 1.2** - z検定アルゴリズム
3. **Task 1.3** - Mann-Whitney U検定アルゴリズム
4. **Task 1.4** - メインサービスロジック
5. **Task 1.5** - 単体テスト
6. **Task 2.1** - 統計APIエンドポイント
7. **Task 2.2** - Markdownエクスポート
8. **Task 2.3** - CSVエクスポート
9. **Task 2.4** - エクスポートAPI
10. **Task 3.1** - フロントAPI Service
11. **Task 3.2** - タブUI構造
12. **Task 3.3** - 統計タブコンポーネント
13. **Task 3.4** - エクスポートコンポーネント
14. **Task 3.5** - UI統合
15. **Task 4.1** - 動作確認
16. **Task 4.2** - 最終調整

---

## 備考

### 並列実行可能なタスク

- Task 1.2 と Task 1.3（両方Task 1.1に依存）
- Task 2.2 と Task 2.3（両方Task 1.1に依存）
- Task 3.2 と Task 3.3 と Task 3.4（Task 3.2は依存なし、3.3/3.4はTask 3.1に依存）

### リスク項目

1. **z検定の前提条件違反**: 成功率が0%または100%に近い場合、正規近似が不正確になる可能性
   - 対策: 連続性補正または正確検定（Fisher's exact）のフォールバック検討

2. **サンプルサイズの偏り**: モデル構成によって試行数が異なる場合
   - 対策: 現状設計では各モデル50試行で固定なので問題なし

3. **UI表示のパフォーマンス**: 80+20=100検定結果の表示
   - 対策: 指標選択UIでフィルタリング、ページネーション検討
