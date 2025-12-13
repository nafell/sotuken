# Layer3 意味的検証機能 設計書

## 1. 概要

本設計書は、Layer1/Layer4自動評価実験に追加する **Layer3（意味的妥当性）** 評価機能を定義する。
保存済みLLM生成データに対して再検証を実施し、意味的な品質指標を算出する。

**参照文書:**
- `/specs/system-design/experiment_spec_layer_1_layer_4.md` - Layer1/Layer4実験仕様
- `/specs/system-design/statistical-analysis-design.md` - 統計分析設計
- `/docs/research/specs/layer3-semantic-validation-requirements.md` - 開発要件仕様
- `/docs/research/Thoughts_Discussions/what-to-validate-more.md` - 検証項目提案

---

## 2. 評価指標定義

### 2.1 Layer3 指標一覧

| 記号 | 指標名 | 定義 | データ型 |
|------|--------|------|----------|
| GV_CR | generatedValue コンテンツ妥当性 | 生成された初期値の悩みに対する関連性スコア（0-2） | 順序尺度 |
| GV_UR | generatedValue 有用率 | useful (score=2) の割合 | 比率 |
| W2WR_FR | W2WR Flow率 | Flow タイプのバインディング割合 | 比率 |
| W2WR_MR | W2WR Meta率 | Meta タイプのバインディング割合 | 比率 |
| W2WR_SYR | W2WR Sync率 | Sync タイプのバインディング割合 | 比率 |
| W2WR_SC | W2WR 意味的正確性 | 接続の論理的妥当性スコア（0-2） | 順序尺度 |
| W2WR_CR | W2WR 正確率 | correct (score=2) の割合 | 比率 |
| WS_ENT | Widget選択エントロピー | Shannon entropy による多様性指標 | 連続値 |
| GC_NC | グラフノード数 | Widget数 | 離散値 |
| GC_EC | グラフエッジ数 | ReactiveBinding数 | 離散値 |
| GC_DEN | グラフ密度 | edgeCount / (nodeCount × (nodeCount - 1)) | 連続値 |

### 2.2 評価基準詳細

#### 2.2.1 generatedValue コンテンツ妥当性 (GV_CR)

**評価対象**: `WidgetSpec.config` 内の `isGenerated: true` を持つアイテム

**採点基準**:
| スコア | 分類 | 判定条件 |
|--------|------|----------|
| 0 | not_relevant | 入力テキストと無関係、または有害な内容 |
| 1 | generic | どの悩みにも当てはまる一般的な内容 |
| 2 | useful | 入力テキストに具体的に関連する有用な内容 |

**評価方法**:
1. **自動評価**: LLM-as-a-Judge（GPT-4o）によるゼロショット分類
2. **手動検証**: サンプリングによるアノテーター間一致率確認

#### 2.2.2 W2WR タイプ分類

**分類基準** (論文4.5.2節準拠):

| タイプ | 判定条件 | 複雑性レベル |
|--------|----------|--------------|
| flow | `mechanism === 'update'` かつ 逆方向依存なし | Level 3 |
| meta | `mechanism === 'validate'` または `complexityCheck === true` | Level 3.5 |
| sync | 同一Widget間の双方向バインディングが存在 | Level 4 |

**分類アルゴリズム**:
```typescript
function classifyBindingType(
  binding: ReactiveBinding,
  allBindings: ReactiveBinding[]
): 'flow' | 'meta' | 'sync' {
  const { source, target, mechanism, complexityCheck } = binding;
  const [sourceWidget] = source.split('.');
  const [targetWidget] = target.split('.');

  // sync: 逆方向バインディングが存在
  const hasReverse = allBindings.some(
    b => b.source.startsWith(`${targetWidget}.`) &&
         b.target.startsWith(`${sourceWidget}.`)
  );
  if (hasReverse) return 'sync';

  // meta: validate mechanism または complexityCheck
  if (mechanism === 'validate' || complexityCheck === true) {
    return 'meta';
  }

  // flow: デフォルト
  return 'flow';
}
```

#### 2.2.3 W2WR 意味的正確性 (W2WR_SC)

**採点基準**:
| スコア | 分類 | 判定条件 |
|--------|------|----------|
| 0 | wrong | 型は合うが文脈的に意味不明な接続 |
| 1 | redundant | 不要だが害のない冗長な接続 |
| 2 | correct | 思考整理フローとして論理的に正しい接続 |

**評価例**:
- ✓ correct: ブレストカード出力 → 優先度マトリクス入力
- △ redundant: 感情パレット出力 → 感情パレット入力（自己参照）
- ✗ wrong: タイムライン出力 → 無関係なリスト入力

#### 2.2.4 Widget選択多様性 (WS_ENT)

**Shannon Entropy計算**:
```
H = -Σ p(w) × log₂(p(w))
```
- `p(w)`: Widget種別 w の選択確率
- 正規化: `H_norm = H / log₂(|W|)` (|W| = 利用可能Widget種別数)

#### 2.2.5 グラフ複雑性

```typescript
interface GraphComplexityMetrics {
  nodeCount: number;      // Widget数
  edgeCount: number;      // ReactiveBinding数
  density: number;        // edgeCount / (nodeCount × (nodeCount - 1))
  avgDegree: number;      // (2 × edgeCount) / nodeCount
}
```

---

## 3. データ構造設計

### 3.1 Layer3Metrics 型定義

```typescript
// server/src/types/layer3-metrics.types.ts

/**
 * Layer3指標 v1.0
 */
export interface Layer3MetricsV1 {
  /** スキーマバージョン */
  version: '1.0';

  /** 評価実行日時 (ISO 8601) */
  evaluatedAt: string;

  /** LLM-as-a-Judge使用モデル（該当する場合） */
  evaluatorModel?: string;

  /** generatedValue コンテンツ妥当性 */
  generatedValueRelevance?: GeneratedValueRelevanceMetrics;

  /** W2WR タイプ分布 */
  w2wrTypeDistribution?: W2WRTypeDistributionMetrics;

  /** W2WR 意味的正確性 */
  w2wrSemanticCorrectness?: W2WRSemanticCorrectnessMetrics;

  /** Widget選択多様性 */
  widgetDiversity?: WidgetDiversityMetrics;

  /** グラフ複雑性 */
  graphComplexity?: GraphComplexityMetrics;
}

/**
 * generatedValue 妥当性評価結果
 */
export interface GeneratedValueRelevanceMetrics {
  /** 抽出されたgeneratedValue総数 */
  totalItems: number;
  /** 評価済み数 */
  evaluatedItems: number;
  /** スコア分布 */
  distribution: {
    notRelevant: number;  // score = 0
    generic: number;      // score = 1
    useful: number;       // score = 2
  };
  /** 平均スコア (0.0 - 2.0) */
  avgScore: number;
  /** 有用率 (useful / total) */
  usefulRate: number;
  /** 個別評価詳細（オプション） */
  itemEvaluations?: GeneratedValueEvaluation[];
}

/**
 * generatedValue 個別評価
 */
export interface GeneratedValueEvaluation {
  widgetId: string;
  portId?: string;
  itemId: string;
  text: string;
  score: 0 | 1 | 2;
  label: 'not_relevant' | 'generic' | 'useful';
  reasoning?: string;
}

/**
 * W2WR タイプ分布
 */
export interface W2WRTypeDistributionMetrics {
  /** 総バインディング数 */
  totalBindings: number;
  /** タイプ別カウント */
  distribution: {
    flow: number;
    meta: number;
    sync: number;
    unknown: number;
  };
  /** タイプ別割合 (0.0 - 1.0) */
  ratios: {
    flow: number;
    meta: number;
    sync: number;
  };
  /** 個別分類詳細（オプション） */
  bindingClassifications?: W2WRBindingClassification[];
}

/**
 * W2WR バインディング分類
 */
export interface W2WRBindingClassification {
  bindingId: string;
  source: string;
  target: string;
  type: 'flow' | 'meta' | 'sync' | 'unknown';
  reason: string;
}

/**
 * W2WR 意味的正確性
 */
export interface W2WRSemanticCorrectnessMetrics {
  /** 評価済みバインディング数 */
  evaluatedBindings: number;
  /** スコア分布 */
  distribution: {
    correct: number;    // score = 2
    redundant: number;  // score = 1
    wrong: number;      // score = 0
  };
  /** 平均スコア (0.0 - 2.0) */
  avgScore: number;
  /** 正確率 (correct / total) */
  correctnessRate: number;
  /** 個別評価詳細（オプション） */
  bindingEvaluations?: W2WRSemanticEvaluation[];
}

/**
 * W2WR 意味的正確性 個別評価
 */
export interface W2WRSemanticEvaluation {
  bindingId: string;
  sourceWidget: string;
  sourcePort: string;
  targetWidget: string;
  targetPort: string;
  score: 0 | 1 | 2;
  label: 'wrong' | 'redundant' | 'correct';
  reasoning?: string;
}

/**
 * Widget選択多様性
 */
export interface WidgetDiversityMetrics {
  /** 選択されたWidget種別リスト */
  selectedWidgets: string[];
  /** Widget種別ごとの出現回数 */
  widgetCounts: Record<string, number>;
  /** ユニークWidget種別数 */
  uniqueWidgetCount: number;
  /** Shannon Entropy */
  entropy: number;
  /** 正規化エントロピー (0.0 - 1.0) */
  normalizedEntropy: number;
  /** 最大可能エントロピー（log₂(利用可能Widget数)） */
  maxEntropy: number;
}

/**
 * グラフ複雑性
 */
export interface GraphComplexityMetrics {
  /** ノード数（Widget数） */
  nodeCount: number;
  /** エッジ数（ReactiveBinding数） */
  edgeCount: number;
  /** グラフ密度 (0.0 - 1.0) */
  density: number;
  /** 平均次数 */
  avgDegree: number;
  /** 最大次数 */
  maxDegree: number;
  /** セクション別ノード数（PlanUISpecの場合） */
  sectionNodeCounts?: {
    diverge: number;
    organize: number;
    converge: number;
  };
  /** セクション間エッジ数 */
  crossSectionEdges?: number;
}
```

### 3.2 統計検定用型定義

```typescript
// server/src/types/statistics.types.ts への追加

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

export type Layer3MetricName = (typeof LAYER3_METRICS)[number];

/** バッチLayer3集計結果 */
export interface BatchLayer3Results {
  /** generatedValue 集計 */
  gvContentRelevance: {
    avgScore: number;
    usefulRate: number;
    sampleSize: number;
  };
  /** W2WR タイプ分布集計 */
  w2wrTypeDistribution: {
    flowRate: number;
    metaRate: number;
    syncRate: number;
    totalBindings: number;
  };
  /** W2WR 意味的正確性集計 */
  w2wrSemanticCorrectness: {
    avgScore: number;
    correctnessRate: number;
    sampleSize: number;
  };
  /** Widget多様性集計 */
  widgetDiversity: {
    avgEntropy: number;
    avgNormalizedEntropy: number;
    avgUniqueWidgets: number;
  };
  /** グラフ複雑性集計 */
  graphComplexity: {
    avgNodeCount: number;
    avgEdgeCount: number;
    avgDensity: number;
    avgDegree: number;
  };
}
```

### 3.3 DBスキーマ変更

```sql
-- Migration: add_layer3_metrics

-- experimentTrialLogs テーブルへの追加
ALTER TABLE experiment_trial_logs
ADD COLUMN IF NOT EXISTS layer3_metrics JSONB;

-- batchExecutions テーブルへの追加
ALTER TABLE batch_executions
ADD COLUMN IF NOT EXISTS layer3_results JSONB;

-- インデックス追加（Layer3評価済み/未評価のフィルタ用）
CREATE INDEX IF NOT EXISTS idx_trial_layer3_evaluated
ON experiment_trial_logs (batch_id)
WHERE layer3_metrics IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trial_layer3_unevaluated
ON experiment_trial_logs (batch_id, stage)
WHERE layer3_metrics IS NULL AND stage = 3;
```

```typescript
// server/src/database/schema.ts への追加

export const experimentTrialLogs = pgTable('experiment_trial_logs', {
  // ... 既存フィールド ...

  // Layer3 評価結果（新規追加）
  layer3Metrics: jsonb('layer3_metrics'), // Layer3MetricsV1 | null
});

export const batchExecutions = pgTable('batch_executions', {
  // ... 既存フィールド ...

  // Layer3 集計結果（新規追加）
  layer3Results: jsonb('layer3_results'), // BatchLayer3Results | null
});
```

---

## 4. 算出アルゴリズム

### 4.1 generatedValue 抽出アルゴリズム

```typescript
/**
 * UISpecからgeneratedValueアイテムを抽出
 */
function extractGeneratedValues(
  uiSpec: PlanUISpec | UISpec
): GeneratedValueItem[] {
  const items: GeneratedValueItem[] = [];
  const widgets = isPlanUISpec(uiSpec)
    ? getAllWidgetsFromUISpec(uiSpec)
    : uiSpec.widgets;

  for (const widget of widgets) {
    // config内を再帰的に探索
    const extracted = extractFromConfig(widget.id, widget.config);
    items.push(...extracted);
  }

  return items;
}

function extractFromConfig(
  widgetId: string,
  config: unknown,
  path: string = ''
): GeneratedValueItem[] {
  const items: GeneratedValueItem[] = [];

  if (config === null || typeof config !== 'object') {
    return items;
  }

  // GeneratedContentContainer のチェック
  if (isGeneratedContentContainer(config)) {
    for (const item of config.items) {
      if (isGeneratedSampleItem(item)) {
        items.push({
          widgetId,
          itemId: item.id,
          text: item.text,
          path: path || 'items',
        });
      }
    }
    return items;
  }

  // オブジェクトの再帰探索
  for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
    const newPath = path ? `${path}.${key}` : key;

    if (isGeneratedSampleItem(value)) {
      items.push({
        widgetId,
        itemId: value.id,
        text: value.text,
        path: newPath,
      });
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        items.push(...extractFromConfig(widgetId, value[i], `${newPath}[${i}]`));
      }
    } else if (typeof value === 'object') {
      items.push(...extractFromConfig(widgetId, value, newPath));
    }
  }

  return items;
}
```

### 4.2 W2WR タイプ分類アルゴリズム

```typescript
/**
 * ReactiveBindingのタイプを分類
 */
function classifyBindingTypes(
  bindings: ReactiveBinding[]
): W2WRTypeDistributionMetrics {
  const classifications: W2WRBindingClassification[] = [];
  const counts = { flow: 0, meta: 0, sync: 0, unknown: 0 };

  // 逆方向マップを構築
  const reverseMap = new Map<string, Set<string>>();
  for (const binding of bindings) {
    const [sourceWidget] = binding.source.split('.');
    const [targetWidget] = binding.target.split('.');

    if (!reverseMap.has(targetWidget)) {
      reverseMap.set(targetWidget, new Set());
    }
    reverseMap.get(targetWidget)!.add(sourceWidget);
  }

  for (const binding of bindings) {
    const [sourceWidget] = binding.source.split('.');
    const [targetWidget] = binding.target.split('.');

    let type: 'flow' | 'meta' | 'sync' | 'unknown';
    let reason: string;

    // sync判定: 逆方向依存の存在確認
    const hasReverse = reverseMap.get(sourceWidget)?.has(targetWidget) ?? false;
    if (hasReverse) {
      type = 'sync';
      reason = 'Bidirectional dependency detected';
    }
    // meta判定: validate mechanism または complexityCheck
    else if (binding.mechanism === 'validate') {
      type = 'meta';
      reason = 'Validate mechanism';
    } else if (binding.complexityCheck === true) {
      type = 'meta';
      reason = 'Complexity check enabled';
    }
    // flow判定: デフォルト
    else if (binding.mechanism === 'update') {
      type = 'flow';
      reason = 'Unidirectional update';
    }
    // unknown: 上記いずれにも該当しない
    else {
      type = 'unknown';
      reason = 'Unknown binding pattern';
    }

    counts[type]++;
    classifications.push({
      bindingId: binding.id,
      source: binding.source,
      target: binding.target,
      type,
      reason,
    });
  }

  const total = bindings.length || 1; // ゼロ除算防止

  return {
    totalBindings: bindings.length,
    distribution: counts,
    ratios: {
      flow: counts.flow / total,
      meta: counts.meta / total,
      sync: counts.sync / total,
    },
    bindingClassifications: classifications,
  };
}
```

### 4.3 グラフ複雑性計算アルゴリズム

```typescript
/**
 * UISpecのグラフ複雑性を計算
 */
function calculateGraphComplexity(
  uiSpec: PlanUISpec | UISpec
): GraphComplexityMetrics {
  const widgets = isPlanUISpec(uiSpec)
    ? getAllWidgetsFromUISpec(uiSpec)
    : uiSpec.widgets;

  const bindings = uiSpec.reactiveBindings.bindings;
  const nodeCount = widgets.length;
  const edgeCount = bindings.length;

  // 密度計算（有向グラフ）
  const maxPossibleEdges = nodeCount * (nodeCount - 1);
  const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

  // 次数計算
  const degreeMap = new Map<string, number>();
  for (const widget of widgets) {
    degreeMap.set(widget.id, 0);
  }

  for (const binding of bindings) {
    const [sourceWidget] = binding.source.split('.');
    const [targetWidget] = binding.target.split('.');

    degreeMap.set(sourceWidget, (degreeMap.get(sourceWidget) ?? 0) + 1);
    degreeMap.set(targetWidget, (degreeMap.get(targetWidget) ?? 0) + 1);
  }

  const degrees = Array.from(degreeMap.values());
  const avgDegree = nodeCount > 0
    ? degrees.reduce((a, b) => a + b, 0) / nodeCount
    : 0;
  const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;

  // PlanUISpec固有の分析
  let sectionNodeCounts: GraphComplexityMetrics['sectionNodeCounts'];
  let crossSectionEdges: number | undefined;

  if (isPlanUISpec(uiSpec)) {
    sectionNodeCounts = {
      diverge: uiSpec.sections.diverge.widgets.length,
      organize: uiSpec.sections.organize.widgets.length,
      converge: uiSpec.sections.converge.widgets.length,
    };

    // セクション間エッジをカウント
    const divergeIds = new Set(uiSpec.sections.diverge.widgets.map(w => w.id));
    const organizeIds = new Set(uiSpec.sections.organize.widgets.map(w => w.id));
    const convergeIds = new Set(uiSpec.sections.converge.widgets.map(w => w.id));

    crossSectionEdges = bindings.filter(b => {
      const [sourceWidget] = b.source.split('.');
      const [targetWidget] = b.target.split('.');

      const sourceSection = divergeIds.has(sourceWidget) ? 'diverge'
        : organizeIds.has(sourceWidget) ? 'organize'
        : convergeIds.has(sourceWidget) ? 'converge' : null;

      const targetSection = divergeIds.has(targetWidget) ? 'diverge'
        : organizeIds.has(targetWidget) ? 'organize'
        : convergeIds.has(targetWidget) ? 'converge' : null;

      return sourceSection !== targetSection;
    }).length;
  }

  return {
    nodeCount,
    edgeCount,
    density: Math.round(density * 10000) / 10000,
    avgDegree: Math.round(avgDegree * 100) / 100,
    maxDegree,
    sectionNodeCounts,
    crossSectionEdges,
  };
}
```

### 4.4 Widget選択多様性計算アルゴリズム

```typescript
/**
 * Widget選択の多様性を計算（Shannon Entropy）
 */
function calculateWidgetDiversity(
  uiSpec: PlanUISpec | UISpec,
  availableWidgetCount: number = 15  // 利用可能なWidget種別総数
): WidgetDiversityMetrics {
  const widgets = isPlanUISpec(uiSpec)
    ? getAllWidgetsFromUISpec(uiSpec)
    : uiSpec.widgets;

  // Widget種別ごとの出現回数をカウント
  const widgetCounts: Record<string, number> = {};
  for (const widget of widgets) {
    widgetCounts[widget.component] = (widgetCounts[widget.component] ?? 0) + 1;
  }

  const selectedWidgets = Object.keys(widgetCounts);
  const uniqueWidgetCount = selectedWidgets.length;
  const totalWidgets = widgets.length;

  // Shannon Entropy 計算
  let entropy = 0;
  if (totalWidgets > 0) {
    for (const count of Object.values(widgetCounts)) {
      const p = count / totalWidgets;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
  }

  // 最大エントロピー（全Widget種別が均等に選択された場合）
  const maxEntropy = Math.log2(availableWidgetCount);

  // 正規化エントロピー
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

  return {
    selectedWidgets,
    widgetCounts,
    uniqueWidgetCount,
    entropy: Math.round(entropy * 10000) / 10000,
    normalizedEntropy: Math.round(normalizedEntropy * 10000) / 10000,
    maxEntropy: Math.round(maxEntropy * 10000) / 10000,
  };
}
```

### 4.5 LLM-as-a-Judge 評価プロンプト

#### generatedValue 妥当性評価プロンプト

```typescript
const GV_RELEVANCE_PROMPT = `
あなたは思考整理アプリの品質評価者です。
ユーザーの悩みに対して、システムが生成した「初期サンプル値」の妥当性を評価してください。

## 評価基準

- **0 (not_relevant)**: 悩みと無関係、または有害な内容
- **1 (generic)**: どの悩みにも当てはまる一般的な内容
- **2 (useful)**: この悩みに具体的に関連する有用な内容

## 入力

ユーザーの悩み:
\`\`\`
{{concernText}}
\`\`\`

生成されたサンプル値:
\`\`\`
{{generatedText}}
\`\`\`

Widget種別: {{widgetType}}

## 出力形式（JSON）

{
  "score": <0|1|2>,
  "label": "<not_relevant|generic|useful>",
  "reasoning": "<評価理由を1-2文で>"
}
`;
```

#### W2WR 意味的正確性評価プロンプト

```typescript
const W2WR_SEMANTIC_PROMPT = `
あなたは思考整理アプリのUI設計評価者です。
Widget間の「連携接続」が、思考整理のフローとして論理的に正しいかを評価してください。

## 評価基準

- **0 (wrong)**: 型は合うが文脈的に意味不明な接続
- **1 (redundant)**: 不要だが害のない冗長な接続
- **2 (correct)**: 思考整理フローとして論理的に正しい接続

## 入力

ユーザーの悩み:
\`\`\`
{{concernText}}
\`\`\`

接続情報:
- ソースWidget: {{sourceWidget}} ({{sourceWidgetType}})
- ソースポート: {{sourcePort}}
- ターゲットWidget: {{targetWidget}} ({{targetWidgetType}})
- ターゲットポート: {{targetPort}}
- 連携説明: {{description}}

## 出力形式（JSON）

{
  "score": <0|1|2>,
  "label": "<wrong|redundant|correct>",
  "reasoning": "<評価理由を1-2文で>"
}
`;
```

---

## 5. API設計

### 5.1 新規エンドポイント

#### Layer3評価の実行

```
POST /api/experiment/batch/:batchId/evaluate-layer3
```

**リクエストボディ**:
```typescript
interface EvaluateLayer3Request {
  /** generatedValue評価を実行（デフォルト: true） */
  evaluateGV?: boolean;
  /** W2WRタイプ分類を実行（デフォルト: true） */
  evaluateW2WRType?: boolean;
  /** W2WR意味的正確性評価を実行（デフォルト: false） */
  evaluateW2WRSemantic?: boolean;
  /** Widget多様性評価を実行（デフォルト: true） */
  evaluateDiversity?: boolean;
  /** グラフ複雑性評価を実行（デフォルト: true） */
  evaluateComplexity?: boolean;
  /** LLM-as-a-Judgeを使用（デフォルト: false） */
  useLLMJudge?: boolean;
  /** Judge用LLMモデル（デフォルト: 'gpt-4o'） */
  llmModel?: string;
  /** 既存評価を再実行（デフォルト: false） */
  forceReEvaluate?: boolean;
  /** 評価対象のモデル構成（省略時: 全構成） */
  modelConfigs?: string[];
}
```

**レスポンス**:
```typescript
interface EvaluateLayer3Response {
  success: boolean;
  data: {
    batchId: string;
    totalTargets: number;
    evaluatedCount: number;
    skippedCount: number;
    errorCount: number;
    elapsedMs: number;
    options: EvaluateLayer3Request;
  };
  error?: string;
}
```

#### Layer3評価進捗（SSE）

```
GET /api/experiment/batch/:batchId/layer3-progress
```

**レスポンス（Server-Sent Events）**:
```typescript
// event: progress
interface Layer3ProgressEvent {
  current: number;
  total: number;
  percentage: number;
  currentLogId: string;
  metrics?: Partial<Layer3MetricsV1>;
}

// event: complete
interface Layer3CompleteEvent {
  success: boolean;
  summary: BatchLayer3Results;
  elapsedMs: number;
}

// event: error
interface Layer3ErrorEvent {
  logId: string;
  error: string;
}
```

#### Layer3評価結果の取得

```
GET /api/experiment/batch/:batchId/layer3-results
```

**クエリパラメータ**:
- `modelConfig`: モデル構成でフィルタ（オプション）
- `includeDetails`: 詳細評価を含める（デフォルト: false）

**レスポンス**:
```typescript
interface Layer3ResultsResponse {
  success: boolean;
  data: {
    batchId: string;
    experimentId: string;
    evaluatedAt: string;
    overall: BatchLayer3Results;
    byModel: Array<{
      modelConfig: string;
      trialCount: number;
      layer3: BatchLayer3Results;
    }>;
    summary: {
      totalEvaluated: number;
      totalUnevaluated: number;
      avgEvaluationTimeMs: number;
    };
  };
}
```

#### Layer3結果のエクスポート

```
GET /api/experiment/batch/:batchId/layer3-export
```

**クエリパラメータ**:
- `format`: `json` | `csv` | `markdown` | `latex`（デフォルト: json）
- `includeRawData`: 生データを含める（デフォルト: false）

**レスポンス**: 指定形式のファイルダウンロード

### 5.2 既存API拡張

#### バッチ統計API拡張

```
GET /api/experiment/batch/:batchId/statistics
```

**レスポンス拡張**:
```typescript
interface BatchStatisticsResponse {
  // ... 既存フィールド ...

  /** Layer3統計検定結果 */
  layer3Comparisons?: StatisticalTestResult[];

  /** サマリーにLayer3追加 */
  summary: {
    layer1: TestSummary;
    layer4: TestSummary;
    layer3?: TestSummary;  // 新規追加
  };
}
```

---

## 6. サービス実装設計

### 6.1 Layer3MetricsService

```typescript
// server/src/services/Layer3MetricsService.ts

export class Layer3MetricsService {
  private llmClient?: LLMClient;

  constructor(options?: { llmClient?: LLMClient }) {
    this.llmClient = options?.llmClient;
  }

  /**
   * 単一トライアルのLayer3指標を計算
   */
  async calculateMetrics(
    trialLog: ExperimentTrialLog,
    inputText: string,
    options: Layer3EvaluationOptions
  ): Promise<Layer3MetricsV1> {
    const metrics: Layer3MetricsV1 = {
      version: '1.0',
      evaluatedAt: new Date().toISOString(),
    };

    const uiSpec = this.parseUISpec(trialLog.generatedData);
    if (!uiSpec) {
      return metrics;
    }

    // 1. グラフ複雑性（常に計算）
    if (options.evaluateComplexity !== false) {
      metrics.graphComplexity = calculateGraphComplexity(uiSpec);
    }

    // 2. Widget多様性（常に計算）
    if (options.evaluateDiversity !== false) {
      metrics.widgetDiversity = calculateWidgetDiversity(uiSpec);
    }

    // 3. W2WRタイプ分布（常に計算）
    if (options.evaluateW2WRType !== false) {
      metrics.w2wrTypeDistribution = classifyBindingTypes(
        uiSpec.reactiveBindings.bindings
      );
    }

    // 4. generatedValue評価（LLM-as-a-Judge使用時）
    if (options.evaluateGV && options.useLLMJudge && this.llmClient) {
      metrics.evaluatorModel = options.llmModel;
      metrics.generatedValueRelevance = await this.evaluateGeneratedValues(
        uiSpec,
        inputText,
        options.llmModel
      );
    }

    // 5. W2WR意味的正確性（LLM-as-a-Judge使用時）
    if (options.evaluateW2WRSemantic && options.useLLMJudge && this.llmClient) {
      metrics.evaluatorModel = options.llmModel;
      metrics.w2wrSemanticCorrectness = await this.evaluateW2WRSemantics(
        uiSpec,
        inputText,
        options.llmModel
      );
    }

    return metrics;
  }

  /**
   * バッチ全体のLayer3統計を集計
   */
  aggregateBatchMetrics(
    logs: Array<{ layer3Metrics: Layer3MetricsV1 | null }>
  ): BatchLayer3Results {
    // 実装省略 - 各指標の平均/合計を計算
  }

  private parseUISpec(generatedData: unknown): PlanUISpec | UISpec | null {
    // UISpec/PlanUISpecをパース
  }

  private async evaluateGeneratedValues(
    uiSpec: PlanUISpec | UISpec,
    inputText: string,
    model: string
  ): Promise<GeneratedValueRelevanceMetrics> {
    // LLM-as-a-Judgeによる評価実装
  }

  private async evaluateW2WRSemantics(
    uiSpec: PlanUISpec | UISpec,
    inputText: string,
    model: string
  ): Promise<W2WRSemanticCorrectnessMetrics> {
    // LLM-as-a-Judgeによる評価実装
  }
}
```

### 6.2 Layer3EvaluationLogger

```typescript
// server/src/services/Layer3EvaluationLogger.ts

/**
 * Layer3評価プロセスの可視化ロガー
 * RevalidationLoggerと同様のリッチCLI出力を提供
 */
export class Layer3EvaluationLogger {
  // RevalidationLoggerと同様の構造
  // - logHeader()
  // - logProgress()
  // - logSummary()
  // - writeLogFile()
}
```

---

## 7. 統計検定設計

### 7.1 Layer3指標の検定手法

| 指標 | 検定手法 | 理由 |
|------|----------|------|
| GV_CR | Mann-Whitney U | 順序尺度（0/1/2）、連続値として扱う |
| GV_UR | z検定（2標本比例） | 二項割合 |
| W2WR_FR/MR/SYR | z検定（2標本比例） | 二項割合 |
| W2WR_SC | Mann-Whitney U | 順序尺度 |
| W2WR_CR | z検定（2標本比例） | 二項割合 |
| WS_ENT | Mann-Whitney U | 連続値（正規分布を仮定しない） |
| GC_NC/EC | Mann-Whitney U | 離散値（カウントデータ） |
| GC_DEN | Mann-Whitney U | 連続値 |

### 7.2 Bonferroni補正

- 基準有意水準: α = 0.05
- Layer3指標数: 11
- モデルペア数: 10
- 補正係数: 11 × 10 = 110（Layer3のみ）
- 補正後有意水準: α' = 0.05 / 110 ≈ 0.00045

**注**: 全Layer統合時は Layer1(8) + Layer4(2) + Layer3(11) = 21指標 × 10ペア = 210比較

---

## 8. UI設計

### 8.1 Layer3パネル構成

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layer3 意味的検証結果                                [評価実行] [エクスポート] │
├─────────────────────────────────────────────────────────────────────┤
│ [概要カード]                                                        │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ GV有用率   │ │ W2WR正確率 │ │ 平均エントロピー │ │ 平均密度  │        │
│ │   78.5%    │ │   85.2%    │ │    2.31    │ │   0.24    │        │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘        │
├─────────────────────────────────────────────────────────────────────┤
│ [W2WRタイプ分布]                                                    │
│ ┌──────────────────────────────────────────┐                        │
│ │ Flow  ████████████████████░░░░  65%      │                        │
│ │ Meta  ██████░░░░░░░░░░░░░░░░░░  22%      │                        │
│ │ Sync  ████░░░░░░░░░░░░░░░░░░░░  13%      │                        │
│ └──────────────────────────────────────────┘                        │
├─────────────────────────────────────────────────────────────────────┤
│ [モデル別比較テーブル]                                              │
│ ┌─────────┬────────┬────────┬────────┬────────┬────────┐           │
│ │ Model   │ GV_UR  │ W2WR_CR│ WS_ENT │ GC_NC  │ GC_DEN │           │
│ ├─────────┼────────┼────────┼────────┼────────┼────────┤           │
│ │ A       │ 82.0%  │ 88.0%  │  2.45  │  5.2   │ 0.28   │           │
│ │ B       │ 75.0%  │ 82.0%  │  2.21  │  4.8   │ 0.22   │           │
│ │ ...     │        │        │        │        │        │           │
│ └─────────┴────────┴────────┴────────┴────────┴────────┘           │
├─────────────────────────────────────────────────────────────────────┤
│ [統計検定結果]                                                      │
│ 指標選択: [GV_UR ▼]                                                │
│ ┌────────┬────────┬────────┬────────┬─────────┬──────────┐         │
│ │ 比較   │ M1値   │ M2値   │ p値    │ 有意(*)│ 効果量   │         │
│ ├────────┼────────┼────────┼────────┼─────────┼──────────┤         │
│ │ A vs B │ 82.0%  │ 75.0%  │ 0.021  │ *       │ 0.31 (S) │         │
│ └────────┴────────┴────────┴────────┴─────────┴──────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Layer3評価実行モーダル

```
┌───────────────────────────────────────────────────────┐
│ Layer3評価の実行                              [×]    │
├───────────────────────────────────────────────────────┤
│                                                       │
│ 評価対象:                                             │
│ ☑ グラフ複雑性 (自動)                                │
│ ☑ Widget多様性 (自動)                                │
│ ☑ W2WRタイプ分布 (自動)                              │
│ ☐ generatedValue妥当性 (LLM-as-a-Judge)              │
│ ☐ W2WR意味的正確性 (LLM-as-a-Judge)                  │
│                                                       │
│ LLM-as-a-Judge設定:                                  │
│ モデル: [gpt-4o ▼]                                   │
│                                                       │
│ オプション:                                           │
│ ☐ 既存評価を再実行                                   │
│                                                       │
│ 対象モデル構成:                                       │
│ ☑ A (All-5-Chat)                                     │
│ ☑ B (All-5-mini)                                     │
│ ☑ C (Hybrid-5Chat/4.1)                               │
│ ☑ D (Hybrid-5Chat/5mini)                             │
│ ☑ E (Router-based)                                   │
│                                                       │
│ 推定APIコスト: ¥120 (LLM評価使用時)                  │
│                                                       │
│              [キャンセル]  [評価開始]                 │
└───────────────────────────────────────────────────────┘
```

---

## 9. ファイル構成

### 9.1 新規ファイル

```
server/src/
├── types/
│   └── layer3-metrics.types.ts        # Layer3型定義
├── services/
│   ├── Layer3MetricsService.ts        # Layer3評価ロジック
│   ├── Layer3EvaluationLogger.ts      # 評価進捗ロガー
│   └── Layer3StatisticsService.ts     # Layer3統計計算
└── routes/
    └── layer3-evaluation.ts           # Layer3 APIルート

concern-app/src/pages/research-experiment/
└── components/
    ├── Layer3Panel.tsx                # Layer3結果表示パネル
    ├── Layer3EvaluationModal.tsx      # 評価実行モーダル
    ├── Layer3W2WRChart.tsx            # W2WRタイプ分布チャート
    └── Layer3ExportButton.tsx         # エクスポートボタン
```

### 9.2 既存ファイル変更

```
server/src/
├── database/
│   └── schema.ts                      # layer3_metrics, layer3_results追加
├── types/
│   ├── statistics.types.ts            # LAYER3_METRICS追加
│   └── experiment-trial.types.ts      # Layer3関連型追加
├── services/
│   ├── ExperimentStatisticsService.ts # Layer3集計追加
│   └── StatisticalAnalysisService.ts  # Layer3検定追加
└── routes/
    └── batch-experiment.ts            # Layer3エンドポイント統合

concern-app/src/pages/research-experiment/
├── BatchResults.tsx                   # Layer3タブ追加
└── components/
    └── BatchResultsTabs.tsx           # タブ構成変更
```

---

## 10. 実装タスク

### Phase 1: 基盤実装（1-2日）

1. **型定義作成**
   - `layer3-metrics.types.ts` 作成
   - `statistics.types.ts` 拡張

2. **DBマイグレーション**
   - `layer3_metrics` カラム追加
   - `layer3_results` カラム追加
   - インデックス追加

3. **非LLM評価の実装**
   - `calculateGraphComplexity()` 実装
   - `calculateWidgetDiversity()` 実装
   - `classifyBindingTypes()` 実装
   - `extractGeneratedValues()` 実装

### Phase 2: サービス・API実装（1-2日）

4. **Layer3MetricsService実装**
   - `calculateMetrics()` 実装
   - `aggregateBatchMetrics()` 実装

5. **APIエンドポイント実装**
   - `POST /evaluate-layer3` 実装
   - `GET /layer3-progress` (SSE) 実装
   - `GET /layer3-results` 実装
   - `GET /layer3-export` 実装

6. **Layer3EvaluationLogger実装**
   - RevalidationLoggerをベースに実装

### Phase 3: LLM評価・統計（1日）

7. **LLM-as-a-Judge実装**
   - GV妥当性評価プロンプト実装
   - W2WR意味的正確性プロンプト実装
   - 評価結果パース処理

8. **統計検定拡張**
   - Layer3指標の検定追加
   - Bonferroni補正更新
   - エクスポート機能拡張

### Phase 4: フロントエンド（1日）

9. **Layer3Panel実装**
   - 概要カード
   - W2WRタイプ分布チャート
   - モデル別比較テーブル

10. **Layer3EvaluationModal実装**
    - 評価オプションUI
    - 進捗表示
    - 結果サマリー

### Phase 5: テスト・統合（1日）

11. **単体テスト作成**
    - 各計算アルゴリズムのテスト
    - APIエンドポイントのテスト

12. **統合テスト**
    - 実データでの動作確認
    - パフォーマンス検証

---

## 11. 注意事項

### 11.1 後方互換性

- `layer3_metrics` は nullable として追加
- 既存データは `layer3_metrics = null` のまま動作
- Layer3評価は明示的なAPI呼び出しで実行
- 既存の Layer1/Layer4 評価フローに影響なし

### 11.2 パフォーマンス考慮事項

- 非LLM評価（複雑性・多様性・タイプ分類）は高速（<100ms/trial）
- LLM-as-a-Judge評価はAPIコスト・レイテンシに注意
  - 推定: 50ケース × 5モデル × 平均5アイテム = 1,250 LLM呼び出し
  - コスト: 約¥2,000-5,000（gpt-4o使用時）
  - 所要時間: 約30-60分（並列度による）

### 11.3 評価の再現性

- LLM-as-a-Judge評価は `temperature: 0.0` で実行
- 評価プロンプトはバージョン管理
- 評価結果には使用モデル・タイムスタンプを記録

---

## 12. 参考資料

- Cohen, J. (1988). Statistical power analysis for the behavioral sciences
- Shannon, C. E. (1948). A Mathematical Theory of Communication
- Zheng, L., et al. (2023). Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena
