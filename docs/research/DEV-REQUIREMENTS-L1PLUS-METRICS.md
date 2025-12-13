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
| `REQ_BINDING_COUNT_OK` | binary | 期待カテゴリに応じたbinding本数レンジを満たす | カテゴリA:0, B:1, C:1-2, D:1-3, E:2-5 |
| `REQ_PATTERN_MATCH` | binary | 期待されるrelationshipパターンを満たす | `expectedW2WR?.bindings[].relationship.type` との照合（`expectedW2WR`が未定義の場合は「N/A」またはスキップ） |
| `REQ_STAGE_FORWARD_RATE` | ratio (0-1) | bindingの向きがdiverge→organize→convergeの"前方向"になっている割合 | sourceWidget.stage < targetWidget.stageの比率 |

### 2.2 Static-Sanity（静的健全性）系

| 指標ID | 型 | 定義 | 計算ロジック |
|--------|-----|------|-------------|
| `JS_PARSE_OK` | binary | relationship.type=javascriptのコードがパース可能 | `acorn.parse()` での構文検証（パース失敗時は `false`） |
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
ALTER TABLE experiment_trial_logs ADD COLUMN w2wr_category TEXT CHECK (w2wr_category IN ('A', 'B', 'C', 'D', 'E')); -- 'A'|'B'|'C'|'D'|'E'
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
w2wrCategory: text('w2wr_category').$type<'A' | 'B' | 'C' | 'D' | 'E'>(), // CHECK制約はマイグレーションで定義
l1plusValidatedAt: timestamp('l1plus_validated_at', { withTimezone: true }),
```

**注意**: Drizzle ORMではTypeScript型定義（`.$type<>()`）でカラム値を制限し、CHECK制約はマイグレーションSQLで定義します。

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
// 禁止構造の定義（概念的表現）
// 注意: 以下は **説明用の概念的リスト** です。コロン記法（例: 'CallExpression:eval'）は
// 標準AST表現ではなく、本ドキュメント内でのみ使用する短縮表記です。
// 実装ではacorn.parse()でAST生成後、acorn-walkのビジター関数を使って実際のASTノードを検証します。
const FORBIDDEN_CONSTRUCTS_CONCEPT = {
  loops: ['WhileStatement', 'ForStatement'], // while, for(;;)
  dynamicCode: [
    'CallExpression where callee.name === "eval"',
    'NewExpression where callee.name === "Function"'
  ],
  network: [
    'CallExpression where callee.name === "fetch"',
    'Identifier where name === "XMLHttpRequest"'
  ],
  nonDeterministic: [
    'CallExpression where callee is MemberExpression(object.name="Date", property.name="now")',
    'MemberExpression where object.name="Math" and property.name="random"'
  ],
  timers: [
    'CallExpression where callee.name in ["setTimeout", "setInterval", "setImmediate"]'
  ],
  nodeRuntime: [
    'Identifier where name === "process"',
    'CallExpression where callee.name === "require"',
    'ImportExpression' // import() 動的インポート
  ],
};

// 安全なJSパターン（許可）
const SAFE_PATTERNS = [
  /^[\w.]+$/, // プロパティアクセス
  /^\([^)]*\)\s*=>\s*/, // アロー関数
  /^function\s*\([^)]*\)\s*{/, // 関数宣言
];

function parseJavaScript(code: string): { success: boolean; error?: string };
function checkPolicyCompliance(code: string): { ok: boolean; violations: string[] };
```

**実装方針**:
- `parseJavaScript()`: `acorn.parse()` で構文検証（実行せずAST生成のみ）
  - 例外キャッチ: パース失敗時は `{ success: false, error: e.message }` を返す
- `checkPolicyCompliance()`: ASTをトラバースして禁止ノードタイプを検出
  - ASTウォーカーの例（acorn-walkを使用）:
    ```typescript
    import { parse } from 'acorn';
    import { simple } from 'acorn-walk';
    
    const violations: string[] = [];
    const ast = parse(code, { ecmaVersion: 2020 });
    
    simple(ast, {
      WhileStatement(node) { 
        violations.push('while loop detected'); 
      },
      ForStatement(node) {
        violations.push('for loop detected');
      },
      CallExpression(node) {
        // eval() 検出
        if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
          violations.push('eval() detected');
        }
        // fetch() 検出
        if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
          violations.push('fetch() detected');
        }
        // Date.now() 検出
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'Date' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'now') {
          violations.push('Date.now() detected');
        }
      },
      ImportExpression(node) {
        violations.push('dynamic import() detected');
      },
    });
    ```
  - この方式により、変数名に 'for' を含むケース（例: 'format', 'information'）は誤検出されません。

---

## 5. 型定義拡張

### 5.1 `experiment-trial.types.ts` 更新

```typescript
/**
 * Layer1PlusMetricsは、各指標の集計統計値（例: 成功率、平均値）を表します。
 * 各プロパティは複数トライアルの結果を集約したものであり、個々のトライアルでは
 * テーブル（2.1節）記載の通り binary（0/1）または ratio（0-1）値となります。
 * 例:
 *   - REQ_W2WR_PRES, REQ_BINDING_COUNT_OK, REQ_PATTERN_MATCH, JS_PARSE_OK, JS_POLICY_OK: 成功率（0-1, 平均）
 *   - REQ_STAGE_FORWARD_RATE: 各トライアルの比率（0-1）の平均値
 */
export interface Layer1PlusMetrics {
  // Spec-Compliance
  REQ_W2WR_PRES: number;      // 成功率（集計: 平均値）
  REQ_BINDING_COUNT_OK: number; // 成功率（集計: 平均値）
  REQ_PATTERN_MATCH: number;    // 成功率（集計: 平均値）
  REQ_STAGE_FORWARD_RATE: number; // 平均値（各トライアルの比率の平均）

  // Static-Sanity
  JS_PARSE_OK: number;         // 成功率（集計: 平均値）
  JS_POLICY_OK: number;        // 成功率（集計: 平均値）
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
// Cochran's Q検定（全体差）- バイナリデータ用
function performCochranQ(binaryData: boolean[][]): { Q: number; pValue: number };

// McNemar検定（ペア比較）- バイナリデータ用
function performMcNemar(data1: boolean[], data2: boolean[]): { chi2: number; pValue: number };

// Friedman検定（全体差、順序データ）- 比率データ用
function performFriedman(ratioData: number[][]): { chi2: number; pValue: number };

// Wilcoxon符号付順位検定（ペア比較）- 比率データ用
function performWilcoxonSignedRank(data1: number[], data2: number[]): { W: number; pValue: number };
```

**統計検定の前提条件**:
- **Cochran's Q検定**: バイナリデータの対応あり比較。交換可能性（exchangeability）を前提とし、各条件で同一の試行回数が必要。
- **McNemar検定**: 2条件のバイナリデータのペア比較。同一試行に対する前後比較や条件間差を評価。
- **Friedman検定**: 3つ以上の条件での順序データ比較。ノンパラメトリック検定で正規性を前提としない。
- **Wilcoxon符号付順位検定**: 2条件の順序データのペア比較。符号の対称性を前提とするが、正規性は不要。

**適用方針**:
- L1+ binary指標（REQ_W2WR_PRES等）: Cochran's Q（全体）→ McNemar（ペア）
- L1+ ratio指標（REQ_STAGE_FORWARD_RATE）: Friedman（全体）→ Wilcoxon（ペア）
- 前提条件を満たさない場合は結果に注釈を付けるか、代替手法を検討

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
      "A": { 
        "count": 30, 
        "reqW2wrPresRate": 1.0,
        "reqBindingCountOkRate": 1.0,
        "reqPatternMatchRate": 0.97,
        "jsParseOkRate": 1.0,
        "jsPolicyOkRate": 1.0,
        "reqStageForwardRateAvg": 0.0
      },
      "B": { 
        "count": 30, 
        "reqW2wrPresRate": 0.9,
        "reqBindingCountOkRate": 0.87,
        "reqPatternMatchRate": 0.83,
        "jsParseOkRate": 0.93,
        "jsPolicyOkRate": 0.90,
        "reqStageForwardRateAvg": 0.85
      }
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

**SQL条件**:
```sql
-- 対象: Stage 3で基本検証済み、かつL1+未評価
SELECT * FROM experiment_trial_logs 
WHERE stage = 3 
  AND serverValidatedAt IS NOT NULL 
  AND l1plusValidatedAt IS NULL;
```

**処理フロー**:
1. 対象ログ取得（上記SQL条件）
2. フロントエンド互換検証（既存）
3. L1+評価（NEW）
   - テストケース読み込み
   - Spec-Compliance評価
   - Static-Sanity評価
4. DB更新（既存フィールド + L1+フィールド）
5. サマリー出力

**注意**: L1+評価は基本検証（serverValidatedAt）が完了したログに対してのみ実行します。これにより、基本的な妥当性が確認されたUISpecに対してのみ詳細検証を行います。

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

#### カテゴリC（JS単純変換）とカテゴリD（JS複合変換）の区別について

- **カテゴリC: JS単純変換**
    - 1〜2個のbindingで、変換内容が「単純なプロパティアクセス」「直接的な値のマッピング」「簡単な算術演算（例: `a + 1`）」など、1対1または1対2のシンプルな変換。
    - **例:**
        - `value: props.input`
        - `value: props.count + 1`
        - `value: Boolean(props.flag)`
    - **含まれないもの:** 配列操作や複数ステップの変換、filter/map/reduce等の高階関数の利用。

- **カテゴリD: JS複合変換**
    - 1〜3個のbindingで、変換内容が「配列のfilter/map/reduce/flatMap等の高階関数を使う」「複数ステップの変換」「複数プロパティの合成」など、やや複雑なロジックを含む場合。
    - **例:**
        - `value: props.items.filter(x => x.active)`
        - `value: props.list.map(item => item.name).join(", ")`
        - `value: props.values.reduce((a, b) => a + b, 0)`
        - `value: props.a && props.b ? props.a + props.b : 0`
    - **含まれるもの:** filter/map/reduce/flatMap等の利用、複数プロパティの合成、条件分岐を含む複雑な式。

- **備考:**  
    - 境界例や判定に迷う場合は、まず「高階関数（filter/map/reduce等）」や「複数プロパティの合成」が含まれていればD、そうでなければCとする。
    - 仕様や実装上で不明点があれば、都度レビュー・相談すること。

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
7. [ ] `/revalidate` へのL1+評価統合（**依存**: Phase 1の1-3完了後）
8. [ ] CSVエクスポート拡張
9. [ ] Markdownレポート拡張

### Phase 4: 品質（任意）
10. [ ] 単体テスト追加
11. [ ] W2WRカテゴリ別集計機能
12. [ ] CLI batch実行コマンド

**タスク管理ガイドライン**:
- 各項目にはアサイニー、見積もり工数、依存関係を別途管理シート等で追跡
- Phase 1完了後にPhase 2に着手可能
- Phase 3の項目7は、Phase 1の1-3完了が前提（基本評価APIの動作確認後に統合）

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
