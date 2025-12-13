# L1+ 追加検証指標 開発要件

> **基準ドキュメント**: `docs/research/Thoughts_Discussions/what-to-really-validate.md`
> **対象環境**: batch実験 (`/research-experiment/` route)
> **作成日**: 2025-12-13

---

## 1. 目的

既存Layer1評価が天井効果（ceiling effect）を示す可能性を検証するため、LLM/人手評価を用いず、**ログから自動算出可能な追加検証指標（L1+）** を実装する。

### 1.1 研究仮説

- **H1（天井効果）**: 既存Layer1指標は全モデル構成で高水準（差が付かない）
- **H2（L1+で差が出る）**: Spec-Compliance / Static-Sanity 指標ではモデル構成間に差が生じる
- **H3（タスク難易度反映）**: W2WRカテゴリ（A〜E）に応じてL1+指標の失敗率が増加する

---

## 2. 追加検証指標（L1+）

### 2.1 Spec-Compliance（仕様適合）系

| 指標ID | 型 | 定義 | 計算ロジック |
|--------|-----|------|-------------|
| `REQ_W2WR_PRES` | binary | `hasReactivity` と `actualBindingCount > 0` の一致 | `testCase.hasReactivity === (uiSpec.reactiveBindings?.length > 0)` |
| `REQ_BINDING_COUNT_OK` | binary | 期待カテゴリに応じたbinding本数レンジを満たす | カテゴリA:0, B/C/D:>=1, E:>=2 |
| `REQ_PATTERN_MATCH` | binary | 期待されるrelationshipパターンを満たす | `expectedW2WR.bindings[].relationship.type` との照合 |
| `REQ_STAGE_FORWARD_RATE` | ratio (0-1) | bindingの向きがdiverge→organize→convergeの"前方向"になっている割合 | sourceWidget.stage <= targetWidget.stageの比率 |

### 2.2 Static-Sanity（静的健全性）系

| 指標ID | 型 | 定義 | 計算ロジック |
|--------|-----|------|-------------|
| `JS_PARSE_OK` | binary | relationship.type=javascriptのコードがパース可能 | `acorn.parse()` or `new Function()` での構文検証 |
| `JS_POLICY_OK` | binary | 禁止要素を含まない | 禁止トークン: `while`, `for(;;)`, `fetch`, `Date.now`, `Math.random`, `eval`, `setTimeout`, `setInterval` |
| `DG_ACYCLIC` | binary | dependency graphが巡回を含まない（任意） | 既存の `cycleDetected` を流用可能 |

### 2.3 W2WRカテゴリ分類

テストケースに基づくカテゴリ分類：

```typescript
type W2WRCategory = 'A' | 'B' | 'C' | 'D' | 'E';

// A: No W2WR (hasReactivity=false)
// B: Passthrough (relationship.type='passthrough')
// C: JS単純 (relationship.type='javascript', 単純変換)
// D: JS複合 (relationship.type='javascript', filter/flatMap/reduce等)
// E: 複数Binding (bindings.length >= 2)
```

---

## 3. データベーススキーマ変更

### 3.1 `experimentTrialLogs` テーブル拡張

```sql
-- L1+ Spec-Compliance指標
ALTER TABLE experiment_trial_logs ADD COLUMN req_w2wr_pres BOOLEAN;
ALTER TABLE experiment_trial_logs ADD COLUMN req_binding_count_ok BOOLEAN;
ALTER TABLE experiment_trial_logs ADD COLUMN req_pattern_match BOOLEAN;
ALTER TABLE experiment_trial_logs ADD COLUMN req_stage_forward_rate REAL;

-- L1+ Static-Sanity指標
ALTER TABLE experiment_trial_logs ADD COLUMN js_parse_ok BOOLEAN;
ALTER TABLE experiment_trial_logs ADD COLUMN js_policy_ok BOOLEAN;

-- メタデータ
ALTER TABLE experiment_trial_logs ADD COLUMN w2wr_category TEXT; -- 'A'|'B'|'C'|'D'|'E'
ALTER TABLE experiment_trial_logs ADD COLUMN l1plus_validated_at TIMESTAMP WITH TIME ZONE;
```

### 3.2 Drizzleスキーマ更新（`server/src/database/schema.ts`）

```typescript
// 既存のexperimentTrialLogsテーブルに追加
// L1+ Spec-Compliance指標
reqW2wrPres: boolean('req_w2wr_pres'),
reqBindingCountOk: boolean('req_binding_count_ok'),
reqPatternMatch: boolean('req_pattern_match'),
reqStageForwardRate: real('req_stage_forward_rate'),

// L1+ Static-Sanity指標
jsParseOk: boolean('js_parse_ok'),
jsPolicyOk: boolean('js_policy_ok'),

// メタデータ
w2wrCategory: text('w2wr_category'), // 'A'|'B'|'C'|'D'|'E'
l1plusValidatedAt: timestamp('l1plus_validated_at', { withTimezone: true }),
```

---

## 4. 新規サービス実装

### 4.1 `L1PlusEvaluatorService`

**ファイル**: `server/src/services/L1PlusEvaluatorService.ts`

```typescript
interface L1PlusEvaluationInput {
  generatedUISpec: PlanUISpec;
  testCaseId: string;
  testCase: TestCaseDefinition;
}

interface L1PlusEvaluationResult {
  // Spec-Compliance
  reqW2wrPres: boolean;
  reqBindingCountOk: boolean;
  reqPatternMatch: boolean;
  reqStageForwardRate: number;

  // Static-Sanity
  jsParseOk: boolean;
  jsPolicyOk: boolean;

  // Metadata
  w2wrCategory: 'A' | 'B' | 'C' | 'D' | 'E';
  evaluatedAt: string; // ISO 8601

  // 詳細情報
  details: {
    actualBindingCount: number;
    expectedBindingRange: [number, number];
    jsErrors: string[];
    policyViolations: string[];
    forwardBindings: number;
    totalBindings: number;
  };
}

class L1PlusEvaluatorService {
  evaluate(input: L1PlusEvaluationInput): L1PlusEvaluationResult;

  // 個別評価メソッド
  evaluateReqW2wrPres(uiSpec: PlanUISpec, testCase: TestCaseDefinition): boolean;
  evaluateReqBindingCountOk(uiSpec: PlanUISpec, category: W2WRCategory): boolean;
  evaluateReqPatternMatch(uiSpec: PlanUISpec, testCase: TestCaseDefinition): boolean;
  evaluateReqStageForwardRate(uiSpec: PlanUISpec): number;
  evaluateJsParseOk(uiSpec: PlanUISpec): { ok: boolean; errors: string[] };
  evaluateJsPolicyOk(uiSpec: PlanUISpec): { ok: boolean; violations: string[] };
  classifyW2WRCategory(testCase: TestCaseDefinition): W2WRCategory;
}
```

### 4.2 JS検証ヘルパー

**ファイル**: `server/src/services/JSValidationHelper.ts`

```typescript
// 禁止トークン定義
const FORBIDDEN_TOKENS = [
  'while', 'for', 'eval', 'Function',
  'fetch', 'XMLHttpRequest',
  'Date.now', 'Math.random',
  'setTimeout', 'setInterval', 'setImmediate',
  'process', 'require', 'import',
];

// 安全なJSパターン（許可）
const SAFE_PATTERNS = [
  /^[\w.]+$/, // プロパティアクセス
  /^\([^)]*\)\s*=>\s*/, // アロー関数
  /^function\s*\([^)]*\)\s*{/, // 関数宣言
];

function parseJavaScript(code: string): { success: boolean; error?: string };
function checkPolicyCompliance(code: string): { compliant: boolean; violations: string[] };
```

---

## 5. 型定義拡張

### 5.1 `experiment-trial.types.ts` 更新

```typescript
// 既存のLayer1Metricsを拡張
export interface Layer1PlusMetrics {
  // Spec-Compliance
  REQ_W2WR_PRES: number;      // 成功率
  REQ_BINDING_COUNT_OK: number;
  REQ_PATTERN_MATCH: number;
  REQ_STAGE_FORWARD_RATE: number; // 平均値

  // Static-Sanity
  JS_PARSE_OK: number;
  JS_POLICY_OK: number;
}

// W2WRカテゴリ別の統計
export interface W2WRCategoryStatistics {
  category: 'A' | 'B' | 'C' | 'D' | 'E';
  trialCount: number;
  layer1: Layer1Metrics;
  layer1Plus: Layer1PlusMetrics;
}
```

---

## 6. 統計分析サービス拡張

### 6.1 `StatisticalAnalysisService` 更新

**追加する検定対象指標**:

```typescript
// L1+指標（binary）- z検定
const LAYER1_PLUS_BINARY_METRICS = [
  'REQ_W2WR_PRES',
  'REQ_BINDING_COUNT_OK',
  'REQ_PATTERN_MATCH',
  'JS_PARSE_OK',
  'JS_POLICY_OK',
] as const;

// L1+指標（ratio）- Mann-Whitney U検定
const LAYER1_PLUS_RATIO_METRICS = [
  'REQ_STAGE_FORWARD_RATE',
] as const;
```

### 6.2 対応あり検定の追加

```typescript
// Cochran's Q検定（全体差）
function performCochranQ(binaryData: boolean[][]): { Q: number; pValue: number };

// McNemar検定（ペア比較）
function performMcNemar(data1: boolean[], data2: boolean[]): { chi2: number; pValue: number };

// Friedman検定（全体差、順序データ）
function performFriedman(ratioData: number[][]): { chi2: number; pValue: number };

// Wilcoxon符号付順位検定（ペア比較）
function performWilcoxonSignedRank(data1: number[], data2: number[]): { W: number; pValue: number };
```

---

## 7. API拡張

### 7.1 新規エンドポイント

#### `POST /api/experiment/batch/:batchId/evaluate-l1plus`

L1+指標を一括評価してDBに保存する。

**Request Body**:
```json
{
  "logIds": ["uuid1", "uuid2"],  // 省略時は全Stage3ログ
  "forceReevaluate": false       // 既に評価済みでも再評価するか
}
```

**Response**:
```json
{
  "success": true,
  "evaluatedCount": 150,
  "skippedCount": 0,
  "failedCount": 0,
  "summary": {
    "byCategory": {
      "A": { "count": 30, "reqW2wrPresRate": 1.0 },
      "B": { "count": 30, "reqW2wrPresRate": 0.9 }
    }
  }
}
```

### 7.2 既存エンドポイント拡張

#### `GET /api/experiment/batch/:batchId/results`

L1+指標をレスポンスに追加:

```json
{
  "success": true,
  "summary": {
    "byModel": [
      {
        "modelConfig": "A",
        "layer1": { "VR": 0.98, "TCR": 1.0, ... },
        "layer1Plus": {
          "REQ_W2WR_PRES": 0.92,
          "REQ_BINDING_COUNT_OK": 0.88,
          "JS_PARSE_OK": 0.95,
          "JS_POLICY_OK": 0.90
        }
      }
    ]
  }
}
```

#### `GET /api/experiment/batch/:batchId/statistics`

L1+指標の統計検定結果を追加:

```json
{
  "layer1Comparisons": [...],
  "layer1PlusComparisons": [
    {
      "metric": "REQ_W2WR_PRES",
      "testType": "z-test",
      "model1": "A",
      "model2": "B",
      "pValue": 0.023,
      "significant": true
    }
  ]
}
```

---

## 8. 再検証API統合

### 8.1 既存 `/revalidate` エンドポイントの拡張

`POST /api/experiment/batch/:batchId/revalidate` に L1+ 評価を統合:

**Request Body 拡張**:
```json
{
  "logIds": ["uuid1"],
  "rerunBackendValidation": false,
  "evaluateL1Plus": true,  // NEW: L1+指標も評価
  "writeLogFile": true
}
```

### 8.2 統合ワークフロー

```
1. 対象ログ取得（Stage 3, serverValidatedAt=null or l1plusValidatedAt=null）
2. フロントエンド互換検証（既存）
3. L1+評価（NEW）
   - テストケース読み込み
   - Spec-Compliance評価
   - Static-Sanity評価
4. DB更新（既存フィールド + L1+フィールド）
5. サマリー出力
```

---

## 9. エクスポート機能拡張

### 9.1 CSV出力（`/export?format=csv`）

追加カラム:
```
w2wr_category,req_w2wr_pres,req_binding_count_ok,req_pattern_match,req_stage_forward_rate,js_parse_ok,js_policy_ok,l1plus_validated_at
```

### 9.2 統計レポート（`/statistics/export?format=markdown`）

```markdown
## L1+ 指標検定結果

### Spec-Compliance指標

| 指標 | A vs B | A vs C | ... | 全体p値 |
|------|--------|--------|-----|---------|
| REQ_W2WR_PRES | 0.023* | 0.156 | ... | 0.008** |

### Static-Sanity指標

| 指標 | A vs B | A vs C | ... | 全体p値 |
|------|--------|--------|-----|---------|
| JS_PARSE_OK | 0.041* | 0.089 | ... | 0.015* |
```

---

## 10. テストケース仕様との連携

### 10.1 テストケースJSONの活用

```typescript
interface TestCaseDefinition {
  caseId: string;
  hasReactivity: boolean;
  expectedW2WR?: {
    bindings: Array<{
      relationship: {
        type: 'passthrough' | 'javascript' | 'debounced';
        javascript?: string;
      };
    }>;
  };
  expectedFlow: {
    diverge: { widgets: string[] };
    organize: { widgets: string[] };
    converge: { widgets: string[] };
  };
}
```

### 10.2 期待値との照合

```typescript
// カテゴリ別期待binding数
const EXPECTED_BINDING_RANGES: Record<W2WRCategory, [number, number]> = {
  'A': [0, 0],    // No W2WR
  'B': [1, 1],    // Passthrough single
  'C': [1, 2],    // JS simple
  'D': [1, 3],    // JS complex
  'E': [2, 5],    // Multiple bindings
};
```

---

## 11. 実装優先順位

### Phase 1: 基盤（必須）
1. [ ] DBスキーマ拡張 + マイグレーション
2. [ ] `L1PlusEvaluatorService` 基本実装
3. [ ] `/evaluate-l1plus` エンドポイント

### Phase 2: 統計（必須）
4. [ ] `StatisticalAnalysisService` L1+指標追加
5. [ ] 対応あり検定（Cochran's Q, McNemar）実装
6. [ ] `/statistics` レスポンス拡張

### Phase 3: 統合（推奨）
7. [ ] `/revalidate` へのL1+評価統合
8. [ ] CSVエクスポート拡張
9. [ ] Markdownレポート拡張

### Phase 4: 品質（任意）
10. [ ] 単体テスト追加
11. [ ] W2WRカテゴリ別集計機能
12. [ ] CLI batch実行コマンド

---

## 12. 影響範囲サマリー

| ファイル/コンポーネント | 変更種別 | 内容 |
|------------------------|---------|------|
| `server/src/database/schema.ts` | 拡張 | L1+フィールド追加 |
| `server/src/types/experiment-trial.types.ts` | 拡張 | L1+型定義追加 |
| `server/src/services/L1PlusEvaluatorService.ts` | 新規 | L1+評価ロジック |
| `server/src/services/JSValidationHelper.ts` | 新規 | JS構文/ポリシー検証 |
| `server/src/services/StatisticalAnalysisService.ts` | 拡張 | L1+検定追加 |
| `server/src/services/StatisticalExportService.ts` | 拡張 | L1+エクスポート |
| `server/src/routes/batch-experiment.ts` | 拡張 | 新APIエンドポイント |
| `config/test-cases/*.json` | 参照のみ | 期待値として使用 |

---

## 13. リスクと緩和策

| リスク | 影響度 | 緩和策 |
|--------|--------|--------|
| DBマイグレーション失敗 | 高 | 既存データのバックアップ、段階的マイグレーション |
| JS解析の偽陽性/偽陰性 | 中 | ホワイトリスト方式、手動レビュー対象のフラグ |
| テストケース不整合 | 中 | `expectedW2WR` フィールドの補完スクリプト |
| 統計検定の多重性 | 低 | Holm補正の適用、主指標の限定 |

---

## 14. 参考

- [what-to-really-validate.md](./Thoughts_Discussions/what-to-really-validate.md)
- [experiment_spec_layer_1_layer_4.md](../../specs/system-design/experiment_spec_layer_1_layer_4.md)
- [statistics-summary-2057.md](./DATA-FINISH/statistics-summary-2057.md)
