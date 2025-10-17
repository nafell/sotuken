# Phase 1 改訂ロードマップ（v2.0）
**2系統DSL対応版 - 思考整理 + タスク推奨の分離実装**

---

## 📋 変更サマリー

### v1.0 → v2.0の主な変更点

| 項目 | v1.0 (旧計画) | v2.0 (改訂版) |
|------|-------------|-------------|
| **DSL体系** | 単一DSL（混在） | 2系統DSL（思考整理 + タスク推奨） |
| **データモデル** | なし | DataSchemaDSL導入（Jelly準拠） |
| **UI仕様** | 固定 | UISpecDSL導入（動的生成） |
| **Phase分割** | Phase 1のみ | Phase 1A/1B/1Cの3段階 |
| **実装期間** | 10-14日 | 14-18日（+4日バッファ） |

**参考文献:** [Jelly: Generative and Malleable User Interfaces (CHI 2025)](https://arxiv.org/html/2503.04084v1)

---

## 🎯 Phase 1 全体構造（改訂版）

### Phase 1A: 思考整理DSL基盤（Week 7-8）
**目標:** DataSchemaDSL + UISpecDSL生成パイプライン完成

- DataSchemaDSL実装（TypeScript型定義）
- LLMService: Schema生成
- LLMService: UISpec生成
- ステージ別生成ロジック（capture/plan/breakdown）
- API実装（`/v1/thought/*`）

---

### Phase 1B: タスク推奨DSL基盤（Week 9）
**目標:** TaskRecommendationDSL生成パイプライン完成

- TaskRecommendationDSL実装
- ScoreRankingService実装
- スコアリング・ゲーティング・サリエンシー
- API実装（`/v1/task/rank`）

---

### Phase 1C: Rule-based Rendering統合（Week 10）
**目標:** 2系統DSLの統合とReactコンポーネント実装

- ComponentMapper実装
- 9種類のReactウィジェット実装
- サリエンシートークン→CSSマッピング
- 動的UIレンダラー統合
- E2E統合テスト

---

## 📅 Phase 1A: 思考整理DSL基盤（Week 7-8）

### Day 1-2: DataSchemaDSL実装

#### **Task 1A.1: DataSchemaDSL型定義実装**
**目標:** TypeScript型定義・バリデーター実装  
**時間:** 3時間  
**ファイル:** `server/src/types/DataSchemaDSL.ts`

**実装内容:**
```typescript
// DataSchemaDSL v1.0型定義
export interface DataSchemaDSL {
  version: "1.0";
  generatedAt: string;
  generationId: string;
  task: "CONCERN";
  stage: "capture" | "plan" | "breakdown";
  entities: Record<string, EntityDefinition>;
  dependencies: Dependency[];
}

export interface EntityDefinition {
  [attributeName: string]: AttributeSpec;
}

export interface AttributeSpec {
  type: "string" | "number" | "array" | `__${string}__`;
  function: "privateIdentifier" | "publicIdentifier" | "display";
  item?: { type: string; thumbnail?: string[] };
}

export interface Dependency {
  source: string;
  target: string;
  mechanism: "Update" | "Validate";
  relationship: string;
}

// バリデーター
export class DataSchemaValidator {
  validate(schema: DataSchemaDSL): ValidationResult {
    // 必須フィールド検証
    // Entity構造検証
    // 依存関係検証（循環参照チェック）
  }
}
```

**テスト方法:**
```typescript
const testSchema: DataSchemaDSL = {
  version: "1.0",
  stage: "capture",
  task: "CONCERN",
  entities: {
    CONCERN: {
      id: { type: "string", function: "privateIdentifier" },
      concernText: { type: "string", function: "publicIdentifier" }
    }
  },
  dependencies: []
};

const validator = new DataSchemaValidator();
const result = validator.validate(testSchema);
console.log('Validation result:', result);
```

**成功判定:** TypeScriptコンパイル成功、バリデーター動作確認

---

#### **Task 1A.2: LLMService - DataSchema生成**
**目標:** LLMがDataSchemaを生成する機能  
**時間:** 4時間  
**ファイル:** `server/src/services/DataSchemaGenerator.ts`

**実装内容:**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

class DataSchemaGenerator {
  private genAI: GoogleGenerativeAI;
  
  async generateSchema(request: {
    stage: 'capture' | 'plan' | 'breakdown';
    concernText: string;
    previousSchema?: DataSchemaDSL;
  }): Promise<DataSchemaDSL> {
    
    if (request.stage === 'capture') {
      return this.generateCaptureSchema(request);
    } else if (request.stage === 'plan') {
      return this.generatePlanSchema(request);
    } else {
      return this.generateBreakdownSchema(request);
    }
  }
  
  private async generatePlanSchema(request): Promise<DataSchemaDSL> {
    const prompt = this.buildPlanSchemaPrompt(request);
    
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-mini',
      generationConfig: {
        temperature: 0.4,  // planは創造性高め
        responseFormat: { type: "json" }
      }
    });
    
    const result = await model.generateContent(prompt);
    const schema = JSON.parse(result.response.text());
    
    // バリデーション
    const validated = new DataSchemaValidator().validate(schema);
    if (!validated.isValid) {
      throw new Error(`Invalid schema: ${validated.errors}`);
    }
    
    return schema;
  }
  
  private buildPlanSchemaPrompt(request): string {
    return `
あなたはDataSchemaDSL v1.0に基づいて、ユーザーの関心事に最適なデータ構造を生成します。

【ユーザーの関心事】
${request.concernText}

【指示】
以下のJSONスキーマ形式で、この関心事を整理するための最適なEntity構造を生成してください。

必須Entity: CONCERN, STRATEGY
動的属性: 関心事の内容に応じて適切な属性を追加

【DataSchemaDSL v1.0仕様】
...（仕様の詳細を記載）...

【出力】
JSONのみを出力してください。説明文は不要です。
    `;
  }
}
```

**テスト方法:**
```bash
# LLM生成テスト
curl -X POST http://localhost:3000/test/schema-generation \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "plan",
    "concernText": "卒業研究のテーマ決め"
  }'

# 期待する出力: 有効なDataSchemaDSL JSON
```

**成功判定:** 関心事に応じた適切なEntity構造が生成される

---

### Day 3-4: UISpecDSL実装

#### **Task 1A.3: UISpecDSL型定義実装**
**目標:** UISpecDSL v1.0型定義・バリデーター  
**時間:** 3時間  
**ファイル:** `server/src/types/UISpecDSL.ts`

**実装内容:**
```typescript
export interface UISpecDSL {
  version: "1.0";
  generatedAt: string;
  generationId: string;
  schemaRef: string;
  stage: "capture" | "plan" | "breakdown";
  
  mappings: Record<string, RenderSpec>;
  layout?: LayoutSpec;
  regenerationPolicy?: RegenerationPolicy;
}

export interface RenderSpec {
  render: "paragraph" | "shortText" | "number" | "radio" | "category" | "expanded" | "summary" | "custom";
  editable: boolean;
  placeholder?: string;
  categories?: string[];
  item?: ItemRenderSpec;
  summary?: SummarySpec;
  component?: string;
  props?: Record<string, any>;
}

export interface LayoutSpec {
  type: "singleColumn" | "twoColumn" | "grid";
  sections?: LayoutSection[];
}

export class UISpecValidator {
  validate(uiSpec: UISpecDSL, dataSchema: DataSchemaDSL): ValidationResult {
    // schemaRef検証
    // mappingsキーがDataSchema内に存在するか
    // render値の妥当性
    // category時のcategories配列存在
  }
}
```

**成功判定:** TypeScriptコンパイル成功、バリデーター動作確認

---

#### **Task 1A.4: LLMService - UISpec生成**
**目標:** DataSchemaをUISpecに変換  
**時間:** 4時間  
**ファイル:** `server/src/services/UISpecGenerator.ts`

**実装内容:**
```typescript
class UISpecGenerator {
  async generateUISpec(request: {
    dataSchema: DataSchemaDSL;
    factors: FactorsDict;
    stage: 'capture' | 'plan' | 'breakdown';
  }): Promise<UISpecDSL> {
    
    if (request.stage === 'plan') {
      return this.generatePlanUISpec(request);
    } else if (request.stage === 'capture') {
      return this.generateCaptureUISpec(request);
    } else {
      return this.generateBreakdownUISpec(request);
    }
  }
  
  private async generatePlanUISpec(request): Promise<UISpecDSL> {
    const prompt = this.buildPlanUISpecPrompt(request);
    
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-mini',
      generationConfig: {
        temperature: 0.5,  // UI設計は創造性重視
        responseFormat: { type: "json" }
      }
    });
    
    const result = await model.generateContent(prompt);
    const uiSpec = JSON.parse(result.response.text());
    
    // バリデーション
    const validated = new UISpecValidator().validate(uiSpec, request.dataSchema);
    if (!validated.isValid) {
      throw new Error(`Invalid UISpec: ${validated.errors}`);
    }
    
    return uiSpec;
  }
  
  private buildPlanUISpecPrompt(request): string {
    return `
あなたはUISpecDSL v1.0に基づいて、DataSchemaを最適なUI表現に変換します。

【DataSchema】
${JSON.stringify(request.dataSchema, null, 2)}

【指示】
planステージでは、ユーザーが戦略を選びやすいように、クリエイティブなUI構成を設計してください。

使用可能なカスタムウィジェット:
- tradeoff_slider: トレードオフ2軸スライダー
- counterfactual_toggles: 反実仮想条件チップ
- strategy_preview_picker: プレビュー付き戦略選択

【UISpecDSL v1.0仕様】
...（仕様の詳細を記載）...

【出力】
JSONのみを出力してください。
    `;
  }
}
```

**テスト方法:**
```bash
# UISpec生成テスト
curl -X POST http://localhost:3000/test/uispec-generation \
  -H "Content-Type: application/json" \
  -d '{
    "dataSchema": { ... },
    "stage": "plan"
  }'
```

**成功判定:** DataSchemaに対応した適切なUISpecが生成される

---

### Day 5-6: API実装・統合

#### **Task 1A.5: Thought Organization API実装**
**目標:** `/v1/thought/*` エンドポイント実装  
**時間:** 4時間  
**ファイル:** `server/src/routes/thought.ts`

**実装内容:**
```typescript
import { Hono } from 'hono';
import { DataSchemaGenerator } from '../services/DataSchemaGenerator.js';
import { UISpecGenerator } from '../services/UISpecGenerator.js';

const thoughtRoutes = new Hono();

// 一括生成API（便利メソッド）
thoughtRoutes.post('/generate', async (c) => {
  try {
    const request = await c.req.json();
    
    // Step 1: DataSchema生成
    const dataSchema = await dataSchemaGenerator.generateSchema({
      stage: request.stage,
      concernText: request.concernText,
      previousSchema: request.previousSchema
    });
    
    // Step 2: UISpec生成
    const uiSpec = await uiSpecGenerator.generateUISpec({
      dataSchema,
      factors: request.factors,
      stage: request.stage
    });
    
    // Step 3: DB記録
    await db.thought_ui_generations.create({
      generation_id: dataSchema.generationId,
      session_id: request.sessionId,
      stage: request.stage,
      data_schema: dataSchema,
      ui_spec: uiSpec
    });
    
    return c.json({
      generationId: dataSchema.generationId,
      dataSchema,
      uiSpec
    });
    
  } catch (error) {
    // フォールバック処理
    const fallback = await this.getFallbackUI(request);
    return c.json({ ...fallback, fallback: { used: true, reason: error.message } });
  }
});

// 個別生成API
thoughtRoutes.post('/generate-schema', async (c) => { /* DataSchemaのみ */ });
thoughtRoutes.post('/generate-uispec', async (c) => { /* UISpecのみ */ });

export default thoughtRoutes;
```

**テスト方法:**
```bash
# E2Eテスト
curl -X POST http://localhost:3000/v1/thought/generate \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "plan",
    "concernText": "卒業研究のテーマ決め",
    "sessionId": "test_session",
    "factors": {
      "time_of_day": "morning",
      "location_category": "home",
      "available_time": 60
    }
  }'
```

**成功判定:** DataSchema + UISpecが正しく生成され、DBに保存される

---

## 📅 Phase 1B: タスク推奨DSL基盤（Week 9）

### Day 7-8: TaskRecommendationDSL実装

#### **Task 1B.1: TaskRecommendationDSL型定義**
**目標:** TaskRecommendationDSL v1.0型定義  
**時間:** 2時間  
**ファイル:** `server/src/types/TaskRecommendationDSL.ts`

**実装内容:**
```typescript
export interface TaskRecommendationDSL {
  version: "1.0";
  generatedAt: string;
  recommendationId: string;
  type: "task_recommendation";
  
  selectedTask: {
    taskId: string;
    variant: "task_card" | "micro_step_card" | "prepare_step_card";
    saliency: 0 | 1 | 2 | 3;
  };
  
  taskCard: TaskCardSpec;
  scoring: ScoringSpec;
}

export interface ScoringSpec {
  formula: string;
  normalization: {
    importance: NormalizationRule;
    urgency: NormalizationRule;
    staleness: NormalizationRule;
    contextFit: NormalizationRule;
  };
  gating: GatingRule[];
  saliencyRule: string;
}
```

**成功判定:** TypeScriptコンパイル成功

---

#### **Task 1B.2: ScoreRankingService実装**
**目標:** スコアリング・ゲーティング・サリエンシー  
**時間:** 5時間  
**ファイル:** `server/src/services/ScoreRankingService.ts`

**実装内容:**
```typescript
class ScoreRankingService {
  // スコア計算（確定式）
  calculateScore(task: Task, factors: FactorsDict): number {
    const importance = task.importance;
    const urgencyN = 1 - this.logistic(task.due_in_hours, 48, 0.1);
    const stalenessN = this.logistic(task.days_since_last_touch, 3, 1.5);
    const contextFitN = this.calculateContextFit(task, factors);
    
    return 0.4 * importance + 0.3 * urgencyN + 0.2 * stalenessN + 0.1 * contextFitN;
  }
  
  // ゲーティング（variant決定）
  applyGating(task: Task, available_time: number): string {
    if (available_time >= task.estimate) {
      return "task_card";
    } else if (available_time >= task.estimate_min_chunk && task.has_independent_micro_step) {
      return "micro_step_card";
    } else {
      return "prepare_step_card";
    }
  }
  
  // サリエンシー決定
  calculateSaliency(task: Task): number {
    if (task.due_in_hours < 24 && task.importance >= 0.67) {
      return 3;  // urgent
    } else {
      return 2;  // primary
    }
  }
  
  // 統合メソッド
  async selectAndRender(request: {
    available_time: number;
    factors: FactorsDict;
    tasks: Task[];
  }): Promise<TaskRecommendationDSL> {
    // 全タスクスコアリング
    const scored = request.tasks.map(task => ({
      task,
      score: this.calculateScore(task, request.factors)
    }));
    
    // ランキング
    const ranked = scored.sort((a, b) => b.score - a.score);
    const topTask = ranked[0].task;
    
    // variant・saliency決定
    const variant = this.applyGating(topTask, request.available_time);
    const saliency = this.calculateSaliency(topTask);
    
    return {
      version: "1.0",
      type: "task_recommendation",
      selectedTask: { taskId: topTask.id, variant, saliency },
      taskCard: this.getTaskCardSpec(),
      scoring: this.getScoringSpec()
    };
  }
}
```

**テスト方法:**
```typescript
// 単体テスト
const task = {
  id: "T1",
  importance: 0.8,
  urgency: 0.6,
  due_in_hours: 12,
  days_since_last_touch: 5,
  estimate: 30
};

const factors = {
  time_of_day: "morning",
  location_category: "home",
  available_time: 15
};

const score = service.calculateScore(task, factors);
console.log('Score:', score);  // 期待: 0.6-0.8の範囲

const variant = service.applyGating(task, 15);
console.log('Variant:', variant);  // 期待: "micro_step_card"
```

**成功判定:** 全メソッドが正しくスコア・variant・saliencyを計算

---

### Day 9: API実装

#### **Task 1B.3: Task Recommendation API実装**
**目標:** `/v1/task/rank` エンドポイント実装  
**時間:** 3時間  
**ファイル:** `server/src/routes/task.ts`

**実装内容:**
```typescript
const taskRoutes = new Hono();

taskRoutes.post('/rank', async (c) => {
  try {
    const request = await c.req.json();
    
    // TaskRecommendationDSL生成
    const recommendation = await scoreRankingService.selectAndRender({
      available_time: request.available_time,
      factors: request.factors,
      tasks: request.tasks
    });
    
    // DB記録
    await db.task_recommendations.create({
      recommendation_id: recommendation.recommendationId,
      session_id: request.sessionId,
      selected_task_id: recommendation.selectedTask.taskId,
      variant: recommendation.selectedTask.variant,
      saliency: recommendation.selectedTask.saliency
    });
    
    return c.json(recommendation);
    
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

export default taskRoutes;
```

**テスト方法:**
```bash
curl -X POST http://localhost:3000/v1/task/rank \
  -H "Content-Type: application/json" \
  -d '{
    "available_time": 30,
    "factors": {
      "time_of_day": "morning",
      "location_category": "home"
    },
    "tasks": [
      {
        "id": "T1",
        "importance": 0.8,
        "due_in_hours": 6,
        "estimate": 20
      }
    ]
  }'
```

**成功判定:** TaskRecommendationDSLが正しく生成される

---

## 📅 Phase 1C: Rule-based Rendering統合（Week 10）

### Day 10-11: Component Mapper実装

#### **Task 1C.1: ComponentMapper実装**
**目標:** DSL→React Componentマッピング  
**時間:** 4時間  
**ファイル:** `concern-app/src/services/ui-generation/ComponentMapper.ts`

**実装内容:**
```typescript
// DSL render → React Component マッピング
const COMPONENT_MAP = {
  paragraph: TextAreaWidget,
  shortText: InputWidget,
  number: NumberInputWidget,
  radio: RadioGroupWidget,
  category: CategoryPickerWidget,
  expanded: ListWidget,
  summary: SummaryListWidget,
  custom: DynamicWidget
};

const SALIENCY_STYLES = {
  0: "bg-neutral-50 text-base shadow-none",
  1: "bg-blue-50 text-md shadow-sm",
  2: "bg-blue-100 text-lg font-semibold shadow-md",
  3: "bg-red-100 text-lg font-bold shadow-lg animate-pulse"
};

class ComponentMapper {
  mapToComponent(renderSpec: RenderSpec, data: any): React.ReactElement {
    const Component = COMPONENT_MAP[renderSpec.render];
    
    if (!Component) {
      throw new Error(`Unknown render type: ${renderSpec.render}`);
    }
    
    return (
      <Component
        value={data}
        editable={renderSpec.editable}
        placeholder={renderSpec.placeholder}
        categories={renderSpec.categories}
        onChange={(newValue) => this.handleChange(newValue)}
      />
    );
  }
  
  applySaliencyStyle(saliency: number): string {
    return SALIENCY_STYLES[saliency];
  }
}
```

**成功判定:** 各render typeが正しいReact Componentにマップされる

---

### Day 12-13: Reactウィジェット実装

#### **Task 1C.2: 9種類のReactウィジェット実装**
**目標:** 基本UIウィジェット完成  
**時間:** 6時間  
**ファイル:** `concern-app/src/components/ui/widgets/*`

**実装リスト:**
1. `TextAreaWidget.tsx` (paragraph)
2. `InputWidget.tsx` (shortText)
3. `NumberInputWidget.tsx` (number)
4. `RadioGroupWidget.tsx` (radio)
5. `CategoryPickerWidget.tsx` (category)
6. `ListWidget.tsx` (expanded)
7. `SummaryListWidget.tsx` (summary)
8. `DynamicWidget.tsx` (custom)
9. `TaskCardWidget.tsx` (タスクカード)

**テスト方法:** Storybookで各ウィジェットの動作確認

**成功判定:** 全ウィジェットが正しく表示・操作可能

---

### Day 14: 統合テスト

#### **Task 1C.3: E2E統合テスト**
**目標:** 全フロー動作確認  
**時間:** 4時間  
**ファイル:** `tests/phase1_integration_test.js`

**テスト内容:**
```javascript
async function runPhase1IntegrationTests() {
  // Test 1: 思考整理フロー（capture → plan → breakdown）
  console.log('1️⃣ 思考整理フロー...');
  await testThoughtOrganizationFlow();
  
  // Test 2: タスク推奨フロー（home推奨）
  console.log('2️⃣ タスク推奨フロー...');
  await testTaskRecommendationFlow();
  
  // Test 3: 2系統の独立性確認
  console.log('3️⃣ 2系統独立性確認...');
  await testSystemIndependence();
  
  // Test 4: パフォーマンステスト
  console.log('4️⃣ パフォーマンステスト...');
  await testPerformance();
}
```

**成功判定:** 全テストケースがパス

---

## 📊 Phase 1完了基準

### 技術的完成度（100%達成必須）
- [ ] DataSchemaDSL生成パイプライン動作
- [ ] UISpecDSL生成パイプライン動作
- [ ] TaskRecommendationDSL生成パイプライン動作
- [ ] 2系統の完全独立動作
- [ ] Rule-based Rendering動作
- [ ] 全API動作（`/v1/thought/*`, `/v1/task/rank`）
- [ ] E2E統合テスト100%成功

### パフォーマンス目標
- [ ] Schema生成: <500ms
- [ ] UISpec生成: <700ms
- [ ] TaskRecommendation生成: <300ms

### ドキュメント整備
- [ ] API仕様書更新
- [ ] Component実装ガイド作成
- [ ] Phase 2引き継ぎ資料完成

---

## 🚀 Phase 2への引き継ぎ

Phase 1完了後、Phase 2（ユーザー評価）で使用する要素:
- ✅ 思考整理DSL: capture/plan/breakdownで動的UI生成
- ✅ タスク推奨DSL: home画面で最適タスク推奨
- ✅ 2系統の完全独立: 各々を独立して改善可能
- ✅ 測定基盤: 着手率・認知負荷軽減の精密測定

---

**文書バージョン:** 2.0  
**最終更新:** 2025年10月12日  
**推定総作業時間:** 70-90時間（14-18日間）  
**ステータス:** 確定（実装開始可能）

