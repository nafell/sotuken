# Layer3 意味的検証 開発要件仕様書

## 概要

本仕様書は、`what-to-validate-more.md`で提案された追加検証項目を実装するための開発要件を定義する。
既存のLayer1（構造健全性）・Layer4（性能）評価に加え、**Layer3（意味的妥当性）** の評価指標を追加する。

### 背景

- Layer1評価で100%の成功率を達成（天井効果）
- 「形式的に正しいだけでなく、意味的に有用か」の観点での評価が不可欠
- 保存済みLLM生成データを再検証することで、新規指標を算出

### 対象システム

- バッチ実験システム (`/research-experiment/route`)
- 再検証機能 (`POST /api/experiment/batch/:batchId/revalidate`)

---

## 1. 追加検証項目の定義

### 1.1 generatedValue コンテンツ妥当性 (GV_CR: GeneratedValue Content Relevance)

**目的**: LLMが生成する初期値（サンプルデータ）が、ユーザーの悩みに対して適切かを評価

**評価基準**:
| スコア | 分類 | 説明 |
|--------|------|------|
| 0 | `not_relevant` | 無関係または有害 |
| 1 | `generic` | 一般的すぎる（どの悩みにも当てはまる） |
| 2 | `useful` | 役に立つ・具体的 |

**抽出対象**:
- `generatedData.widgets[].config` 内の `isGenerated: true` を持つアイテム
- `GeneratedSampleItem` 型に該当するすべてのコンテンツ

**評価方法**:
1. **自動評価（フェーズ1）**: LLM-as-a-Judge（GPT-4o）による自動採点
2. **手動評価（フェーズ2）**: 開発者によるマニュアルコーディング（サンプリング検証）

### 1.2 W2WR 連動タイプ分布 (W2WR_TD: W2WR Type Distribution)

**目的**: 生成されたWidget間連携が、どのタイプに分類されるかを分析

**連動タイプ定義** (論文4.5.2節準拠):
| タイプ | 説明 | 複雑性 |
|--------|------|--------|
| `flow` | 一方向データフロー（A→B） | Level 3相当 |
| `meta` | メタデータ/設定の伝播 | Level 3.5相当 |
| `sync` | 双方向・即時同期 | Level 4相当 |

**分類ロジック**:
```typescript
// flow: 単方向、update mechanism
if (binding.mechanism === 'update' && !hasReverseDependency(binding)) → 'flow'

// sync: 双方向依存が存在
if (hasReverseDependency(binding)) → 'sync'

// meta: complexityCheckが有効、またはvalidate mechanism
if (binding.complexityCheck || binding.mechanism === 'validate') → 'meta'
```

### 1.3 W2WR 意味的正確性 (W2WR_SC: W2WR Semantic Correctness)

**目的**: 生成された接続が、思考整理フローとして論理的に正しいかを評価

**評価基準**:
| スコア | 分類 | 説明 |
|--------|------|------|
| 2 | `correct` | 文脈的に自然な接続（例: アイデア→評価） |
| 1 | `redundant` | 不要だが害はない接続 |
| 0 | `wrong` | 型は合うが意味不明な接続 |

**評価方法**: LLM-as-a-Judge + サンプリング手動検証

### 1.4 Widget選択多様性 (WS_DIV: Widget Selection Diversity)

**目的**: 入力パターンに応じた適切なWidget選択が行われているかを分析

**指標**:
- **カテゴリ別Widget分布**: 入力テキストのカテゴリごとのWidget選択頻度
- **多様性スコア**: Shannon entropy による多様性の定量化
- **文脈適合率**: 特定カテゴリに適したWidgetが選択された割合

### 1.5 グラフ複雑性 (GC: Graph Complexity)

**目的**: 生成されたUI構造の複雑性を定量評価

**指標**:
| 指標 | 計算方法 |
|------|----------|
| `nodeCount` | Widget数 |
| `edgeCount` | ReactiveBinding数 |
| `density` | edgeCount / (nodeCount * (nodeCount - 1)) |
| `avgDegree` | (2 * edgeCount) / nodeCount |

---

## 2. データベーススキーマ変更

### 2.1 experimentTrialLogs テーブルへのフィールド追加

```sql
ALTER TABLE experiment_trial_logs ADD COLUMN IF NOT EXISTS
  -- Layer3 評価結果
  layer3_metrics jsonb;  -- Layer3MetricsV1 型
```

### 2.2 Layer3Metrics 型定義

```typescript
// server/src/types/layer3-metrics.types.ts

/**
 * Layer3指標 v1.0
 * 意味的妥当性評価の結果を格納
 */
export interface Layer3MetricsV1 {
  version: '1.0';
  evaluatedAt: string; // ISO 8601
  evaluatorModel?: string; // LLM-as-a-Judge使用モデル

  // 1.1 generatedValue コンテンツ妥当性
  generatedValueRelevance?: {
    /** 抽出されたgeneratedValue数 */
    totalItems: number;
    /** 評価済み数 */
    evaluatedItems: number;
    /** スコア分布 */
    distribution: {
      notRelevant: number;  // score=0
      generic: number;      // score=1
      useful: number;       // score=2
    };
    /** 平均スコア (0-2) */
    avgScore: number;
    /** 各アイテムの詳細評価（オプション） */
    itemEvaluations?: GeneratedValueEvaluation[];
  };

  // 1.2 W2WR タイプ分布
  w2wrTypeDistribution?: {
    /** 総バインディング数 */
    totalBindings: number;
    /** タイプ別カウント */
    distribution: {
      flow: number;
      meta: number;
      sync: number;
      unknown: number;
    };
    /** タイプ別割合 (0-1) */
    ratios: {
      flow: number;
      meta: number;
      sync: number;
    };
  };

  // 1.3 W2WR 意味的正確性
  w2wrSemanticCorrectness?: {
    /** 評価済みバインディング数 */
    evaluatedBindings: number;
    /** スコア分布 */
    distribution: {
      correct: number;   // score=2
      redundant: number; // score=1
      wrong: number;     // score=0
    };
    /** 平均スコア (0-2) */
    avgScore: number;
    /** 正確率 (correct / total) */
    correctnessRate: number;
    /** 各バインディングの詳細評価（オプション） */
    bindingEvaluations?: W2WRSemanticEvaluation[];
  };

  // 1.4 Widget選択多様性
  widgetDiversity?: {
    /** 選択されたWidget種別 */
    selectedWidgets: string[];
    /** ユニークWidget数 */
    uniqueWidgetCount: number;
    /** Shannon entropy (多様性指標) */
    entropy: number;
    /** 正規化エントロピー (0-1) */
    normalizedEntropy: number;
  };

  // 1.5 グラフ複雑性
  graphComplexity?: {
    /** ノード数（Widget数） */
    nodeCount: number;
    /** エッジ数（ReactiveBinding数） */
    edgeCount: number;
    /** グラフ密度 */
    density: number;
    /** 平均次数 */
    avgDegree: number;
    /** セクション別ノード数 (Plan UISpecの場合) */
    sectionNodeCounts?: {
      diverge: number;
      organize: number;
      converge: number;
    };
  };
}

/**
 * generatedValue個別評価
 */
export interface GeneratedValueEvaluation {
  widgetId: string;
  portId?: string;
  itemId: string;
  text: string;
  score: 0 | 1 | 2;
  reasoning?: string;
}

/**
 * W2WR接続個別評価
 */
export interface W2WRSemanticEvaluation {
  bindingId: string;
  sourceWidget: string;
  targetWidget: string;
  score: 0 | 1 | 2;
  reasoning?: string;
}
```

### 2.3 batchExecutions テーブルへのフィールド追加

```sql
ALTER TABLE batch_executions ADD COLUMN IF NOT EXISTS
  -- Layer3集計結果
  layer3_results jsonb;  -- BatchLayer3Results 型
```

```typescript
// BatchLayer3Results 型定義
export interface BatchLayer3Results {
  // 全体集計
  gvContentRelevance: {
    avgScore: number;
    usefulRate: number; // useful / total
    sampleSize: number;
  };
  w2wrTypeDistribution: {
    flowRate: number;
    metaRate: number;
    syncRate: number;
  };
  w2wrSemanticCorrectness: {
    avgScore: number;
    correctnessRate: number;
  };
  widgetDiversity: {
    avgEntropy: number;
    avgUniqueWidgets: number;
  };
  graphComplexity: {
    avgNodeCount: number;
    avgEdgeCount: number;
    avgDensity: number;
  };
}
```

---

## 3. 統計検定の追加

### 3.1 statistics.types.ts への追加

```typescript
// 既存のLAYER1_METRICS, LAYER4_METRICS に加えて

/** Layer3指標名 */
export const LAYER3_METRICS = [
  'GV_CR',      // generatedValue Content Relevance (avg score)
  'GV_UR',      // generatedValue Useful Rate
  'W2WR_FR',    // W2WR Flow Rate
  'W2WR_MR',    // W2WR Meta Rate
  'W2WR_SYR',   // W2WR Sync Rate
  'W2WR_SC',    // W2WR Semantic Correctness (avg score)
  'W2WR_CR',    // W2WR Correctness Rate
  'WS_ENT',     // Widget Selection Entropy
  'GC_NC',      // Graph Complexity Node Count
  'GC_EC',      // Graph Complexity Edge Count
  'GC_DEN',     // Graph Complexity Density
] as const;

export type Layer3MetricName = typeof LAYER3_METRICS[number];
```

### 3.2 検定対象

| 指標 | 検定タイプ | 理由 |
|------|-----------|------|
| GV_CR | Mann-Whitney U | 順序尺度 (0/1/2) |
| GV_UR | z検定 | 割合 |
| W2WR_FR/MR/SYR | z検定 | 割合 |
| W2WR_SC | Mann-Whitney U | 順序尺度 |
| W2WR_CR | z検定 | 割合 |
| WS_ENT | Mann-Whitney U | 連続値 |
| GC_NC/EC/DEN | Mann-Whitney U | 連続値 |

---

## 4. 再検証システムとの統合

### 4.1 統合アーキテクチャ

```
既存の再検証フロー:
┌─────────────────────────────────────────────────────────┐
│  POST /api/experiment/batch/:batchId/revalidate         │
│  ↓                                                      │
│  1. serverValidatedAt === null のログを取得             │
│  2. validateUISpecForFrontend() 実行                    │
│  3. Layer1検証結果をDB更新                              │
└─────────────────────────────────────────────────────────┘

拡張後のフロー:
┌─────────────────────────────────────────────────────────┐
│  POST /api/experiment/batch/:batchId/revalidate         │
│  ↓                                                      │
│  1. 対象ログを取得（フィルタ条件拡張）                  │
│  2. validateUISpecForFrontend() 実行 [既存]             │
│  3. calculateLayer3Metrics() 実行 [新規]                │
│  4. Layer1 + Layer3 検証結果をDB更新                    │
└─────────────────────────────────────────────────────────┘

新規の全件Layer3評価フロー:
┌─────────────────────────────────────────────────────────┐
│  POST /api/experiment/batch/:batchId/evaluate-layer3    │
│  ↓                                                      │
│  1. Stage3の全ログを取得                                │
│  2. layer3_metrics === null のものをフィルタ            │
│  3. calculateLayer3Metrics() 実行                       │
│  4. Layer3結果をDB更新                                  │
│  5. バッチ統計再集計                                    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 新規APIエンドポイント

```typescript
// server/src/routes/batch-experiment.ts への追加

/**
 * Layer3評価の実行
 * 保存済みの生成データに対してLayer3指標を算出
 */
app.post('/api/experiment/batch/:batchId/evaluate-layer3', async (c) => {
  const { batchId } = c.req.param();
  const {
    evaluateGV = true,        // generatedValue評価
    evaluateW2WR = true,      // W2WR評価
    evaluateDiversity = true, // 多様性評価
    evaluateComplexity = true,// 複雑性評価
    useLLMJudge = false,      // LLM-as-a-Judge使用
    llmModel = 'gpt-4o',      // Judge用モデル
    forceReEvaluate = false,  // 既存評価の再実行
  } = await c.req.json();

  // 実行ロジック...
});

/**
 * Layer3評価の進捗取得
 */
app.get('/api/experiment/batch/:batchId/layer3-progress', async (c) => {
  // 評価進捗を返す
});

/**
 * Layer3評価結果のエクスポート
 */
app.get('/api/experiment/batch/:batchId/layer3-export', async (c) => {
  const { format = 'json' } = c.req.query();
  // json, csv, markdown 形式でエクスポート
});
```

---

## 5. サービス実装

### 5.1 Layer3MetricsService

```typescript
// server/src/services/Layer3MetricsService.ts

export class Layer3MetricsService {
  /**
   * 単一トライアルのLayer3指標を計算
   */
  async calculateMetrics(
    trialLog: ExperimentTrialLog,
    options: Layer3EvaluationOptions
  ): Promise<Layer3MetricsV1>;

  /**
   * generatedValueを抽出
   */
  extractGeneratedValues(
    uiSpec: PlanUISpec | UISpec
  ): GeneratedValueItem[];

  /**
   * W2WRタイプを分類
   */
  classifyBindingTypes(
    bindings: ReactiveBinding[]
  ): W2WRTypeDistribution;

  /**
   * グラフ複雑性を計算
   */
  calculateGraphComplexity(
    uiSpec: PlanUISpec | UISpec
  ): GraphComplexityMetrics;

  /**
   * LLM-as-a-Judgeによる評価
   */
  async evaluateWithLLM(
    item: GeneratedValueItem | ReactiveBinding,
    inputText: string,
    evaluationType: 'gv_relevance' | 'w2wr_semantic'
  ): Promise<LLMEvaluationResult>;
}
```

### 5.2 ExperimentStatisticsServiceの拡張

```typescript
// server/src/services/ExperimentStatisticsService.ts への追加

/**
 * Layer3指標を計算
 */
function calculateLayer3Metrics(logs: TrialLogRecord[]): BatchLayer3Results;

/**
 * バッチ統計サマリーにLayer3を追加
 */
interface BatchResultsSummary {
  // 既存フィールド...

  // Layer3追加
  layer3?: BatchLayer3Results;
}
```

---

## 6. フロントエンド変更（Admin UI）

### 6.1 新規コンポーネント

```
concern-app/src/pages/ResearchExperiment/
├── BatchDetail.tsx         # 既存: Layer3タブ追加
├── Layer3Panel.tsx         # 新規: Layer3結果表示
├── Layer3EvaluationModal.tsx # 新規: Layer3評価実行
└── Layer3ExportButton.tsx  # 新規: エクスポート機能
```

### 6.2 表示項目

1. **Layer3サマリーカード**
   - GV Content Relevance スコア
   - W2WR Type Distribution チャート（円グラフ）
   - Graph Complexity 統計

2. **詳細テーブル**
   - トライアルごとのLayer3指標一覧
   - フィルタ・ソート機能

3. **可視化**
   - Widget選択ヒートマップ
   - W2WRタイプ分布の棒グラフ
   - モデル間比較チャート

---

## 7. 実装フェーズ

### Phase 1: 基盤実装（必須）

1. **DBスキーマ変更**
   - `layer3_metrics` フィールド追加
   - マイグレーション作成・実行

2. **型定義**
   - `layer3-metrics.types.ts` 作成
   - `statistics.types.ts` 拡張

3. **非LLM評価の実装**
   - `Layer3MetricsService` 作成
   - W2WRタイプ分類ロジック
   - グラフ複雑性計算
   - Widget多様性計算

4. **APIエンドポイント**
   - `POST /api/experiment/batch/:batchId/evaluate-layer3`
   - `GET /api/experiment/batch/:batchId/layer3-progress`

### Phase 2: LLM評価（推奨）

5. **LLM-as-a-Judge実装**
   - generatedValue評価プロンプト作成
   - W2WR意味的正確性評価プロンプト作成
   - 評価結果の保存・集計

6. **統計検定の拡張**
   - Layer3指標の検定追加
   - エクスポート機能拡張

### Phase 3: 可視化（任意）

7. **フロントエンド**
   - Layer3パネル実装
   - 可視化コンポーネント

---

## 8. 影響範囲

### 8.1 変更が必要なファイル

| ファイル | 変更内容 |
|----------|----------|
| `server/src/database/schema.ts` | layer3_metrics, layer3_results フィールド追加 |
| `server/src/types/layer3-metrics.types.ts` | 新規作成 |
| `server/src/types/statistics.types.ts` | LAYER3_METRICS追加 |
| `server/src/types/experiment-trial.types.ts` | Layer3関連型追加 |
| `server/src/services/Layer3MetricsService.ts` | 新規作成 |
| `server/src/services/ExperimentStatisticsService.ts` | Layer3計算追加 |
| `server/src/services/RevalidationLogger.ts` | Layer3対応 |
| `server/src/routes/batch-experiment.ts` | エンドポイント追加 |

### 8.2 既存機能への影響

- **再検証機能**: Layer3評価を統合（オプトイン）
- **統計エクスポート**: Layer3指標を追加
- **バッチ結果表示**: Layer3サマリーを追加

### 8.3 後方互換性

- `layer3_metrics` は nullable として追加
- 既存データは `layer3_metrics = null` のまま動作
- Layer3評価は明示的なAPI呼び出しで実行

---

## 9. テスト計画

### 9.1 ユニットテスト

```typescript
// server/test/layer3-metrics.test.ts

describe('Layer3MetricsService', () => {
  describe('extractGeneratedValues', () => {
    it('should extract all isGenerated items from UISpec');
    it('should handle nested config structures');
  });

  describe('classifyBindingTypes', () => {
    it('should classify flow bindings correctly');
    it('should detect sync (bidirectional) bindings');
    it('should identify meta bindings');
  });

  describe('calculateGraphComplexity', () => {
    it('should count nodes and edges correctly');
    it('should calculate density for sparse graphs');
    it('should handle PlanUISpec sections');
  });
});
```

### 9.2 統合テスト

```typescript
// server/test/layer3-evaluation.integration.test.ts

describe('Layer3 Evaluation API', () => {
  it('should evaluate all Stage3 logs in a batch');
  it('should skip already-evaluated logs unless forceReEvaluate');
  it('should update batch layer3_results after completion');
});
```

---

## 10. 参考資料

- `docs/research/Thoughts_Discussions/what-to-validate-more.md` - 検証項目提案
- `specs/system-design/experiment_spec_layer_1_layer_4.md` - 既存評価設計
- `specs/dsl-design/v4/DSL-Spec-v4.0.md` - DSL仕様
- 論文4.5.2節 - W2WRタイプ定義
