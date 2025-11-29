# Phase 1 詳細実装タスク計画
**LLM実装エージェント向け - ステップバイステップガイド**

---

## 📋 実行前の確認事項

### 前提条件
- [ ] CLAUDE.md を読んで開発環境を理解済み
- [ ] `specs/system_design/architedture_design.md` を読んでアーキテクチャ構成を理解済み
- [ ] `specs/dsl-design/` 内の全DSL仕様書を読了済み
- [ ] 既存コードベースの構造を理解済み（concern-app/, server/）

### 実行ルール
1. **1タスクずつ実行** - 次に進む前に必ずテストを実行
2. **テスト失敗時は停止** - 人間に相談してから進行
3. **コミットタイミング** - 各タスク完了時にコミット推奨
4. **質問タイミング** - 不明点があれば実装前に人間に確認

---

## 🎯 Phase 1A: 思考整理DSL基盤（11タスク）

### A1. DataSchemaDSL基本型定義
**目標**: TypeScript基本型定義のみ作成  
**ファイル**: `server/src/types/DataSchemaDSL.ts`

**実装内容**:
- `DataSchemaDSL` interface定義
- `EntityDefinition` interface定義
- `AttributeSpec` interface定義  
- `Dependency` interface定義

**成功基準**:
- TypeScriptコンパイルエラーなし
- 全interfaceにJSDocコメント付与済み

**テスト方法**:
```bash
cd server
bun run build
# エラーがなければ成功
```

**注意点**: 実装やバリデーション機能は含めない（型定義のみ）

---

### A2. DataSchemaバリデータークラス骨格
**目標**: バリデーター基本構造のみ作成  
**ファイル**: `server/src/types/DataSchemaDSL.ts`（A1に追加）

**実装内容**:
- `ValidationResult` interface定義
- `DataSchemaValidator` class骨格（空メソッド）
- `validate()` メソッドのシグネチャのみ

**成功基準**:
- TypeScriptコンパイルエラーなし
- 空のバリデーターがインスタンス化可能

**テスト方法**:
```typescript
// test/validator_basic.test.ts を作成してテスト
const validator = new DataSchemaValidator();
const result = validator.validate({} as DataSchemaDSL);
console.log('Validator created successfully:', result);
```

**注意点**: バリデーション ロジックは実装しない（骨格のみ）

---

### A3. DataSchemaバリデーション実装
**目標**: 必須フィールド検証ロジック実装  
**ファイル**: `server/src/types/DataSchemaDSL.ts`（A2を完成）

**実装内容**:
- 必須フィールド存在チェック（version, task, stage, entities）
- CONCERN entity存在チェック
- 基本的な型チェック

**成功基準**:
- 有効なDataSchemaでvalidation.isValid = true
- 無効なDataSchemaでvalidation.isValid = false + errors配列

**テスト方法**:
```typescript
// 有効なスキーマテスト
const validSchema = {
  version: "1.0",
  task: "CONCERN", 
  stage: "capture",
  entities: { CONCERN: { id: { type: "string", function: "privateIdentifier" } } },
  dependencies: []
};
const result = validator.validate(validSchema);
// result.isValid === true

// 無効なスキーマテスト  
const invalidSchema = { version: "1.0" };
const errorResult = validator.validate(invalidSchema);
// errorResult.isValid === false
```

---

### A4. Gemini API基本統合
**目標**: Gemini APIの基本接続のみ確認  
**ファイル**: `server/src/services/GeminiService.ts`

**実装内容**:
- GoogleGenerativeAI初期化
- 基本的なJSON生成テスト
- エラーハンドリング基本構造

**成功基準**:
- Gemini APIに接続できる
- 簡単なJSON形式の応答を取得できる

**テスト方法**:
```bash
# 環境変数設定
export GEMINI_API_KEY="your-key"

# テスト実行
bun test src/services/GeminiService.test.ts
```

**注意点**: Schema生成はまだ実装しない（接続確認のみ）

---

### A5. DataSchema生成プロンプト設計
**目標**: ステージ別プロンプトテンプレート作成  
**ファイル**: `server/src/services/DataSchemaGenerator.ts`

**実装内容**:
- captureステージ用プロンプト
- planステージ用プロンプト  
- breakdownステージ用プロンプト
- プロンプト構築関数

**成功基準**:
- 各ステージのプロンプトが生成される
- プロンプト内にDSL仕様が含まれる

**テスト方法**:
```typescript
const generator = new DataSchemaGenerator();
const prompt = generator.buildPrompt("plan", "卒業研究テーマ決め");
console.log('Generated prompt length:', prompt.length);
// プロンプトが1000文字以上であること
```

**注意点**: LLM実行はまだしない（プロンプト作成のみ）

---

### A6. DataSchema生成エンジン実装
**目標**: LLMによるDataSchema生成機能  
**ファイル**: `server/src/services/DataSchemaGenerator.ts`（A5を完成）

**実装内容**:
- LLM実行機能
- JSON解析機能
- 生成結果バリデーション統合
- エラー時の再試行ロジック

**成功基準**:
- 有効なDataSchemaが生成される
- 生成失敗時にエラーが適切に返される

**テスト方法**:
```typescript
const schema = await generator.generateSchema({
  stage: "capture",
  concernText: "英語学習の継続が困難"
});
const validation = validator.validate(schema);
// validation.isValid === true
```

---

### A7. UISpecDSL基本型定義
**目標**: UISpec TypeScript型定義作成  
**ファイル**: `server/src/types/UISpecDSL.ts`

**実装内容**:
- `UISpecDSL` interface定義
- `RenderSpec` interface定義
- `LayoutSpec` interface定義
- `RegenerationPolicy` interface定義

**成功基準**:
- TypeScriptコンパイルエラーなし
- 全render値のunion型が正しく定義されている

**テスト方法**:
```bash
cd server
bun run build
# コンパイルエラーがなければ成功
```

---

### A8. UISpecバリデーター実装
**目標**: UISpec検証機能  
**ファイル**: `server/src/types/UISpecDSL.ts`（A7に追加）

**実装内容**:
- `UISpecValidator` class実装
- mappingsキーの存在チェック
- render値の妥当性チェック
- DataSchemaとの整合性チェック

**成功基準**:
- 有効なUISpecでvalidation成功
- 無効なUISpecで適切なエラー

**テスト方法**:
```typescript
const validUISpec = {
  version: "1.0",
  stage: "capture",
  mappings: {
    "CONCERN.concernText": { render: "paragraph", editable: true }
  }
};
const result = uiValidator.validate(validUISpec, dataSchema);
// result.isValid === true
```

---

### A9. UISpec生成プロンプト設計
**目標**: DataSchema→UISpecプロンプト作成  
**ファイル**: `server/src/services/UISpecGenerator.ts`

**実装内容**:
- ステージ別UISpecプロンプト
- DataSchemaを入力とする変換ロジック
- カスタムウィジェット指定ロジック

**成功基準**:
- DataSchemaを含む適切なプロンプト生成
- ステージごとに異なるプロンプト内容

**テスト方法**:
```typescript
const generator = new UISpecGenerator();
const prompt = generator.buildUISpecPrompt(dataSchema, "plan");
console.log('UISpec prompt includes DataSchema:', prompt.includes('CONCERN'));
// DataSchemaの内容がプロンプトに含まれることを確認
```

---

### A10. UISpec生成エンジン実装
**目標**: DataSchema→UISpec変換機能  
**ファイル**: `server/src/services/UISpecGenerator.ts`（A9を完成）

**実装内容**:
- LLMによるUISpec生成
- 生成結果バリデーション
- planステージの高度なUI生成
- フォールバック機能

**成功基準**:
- DataSchemaから有効なUISpecが生成される
- planステージでカスタムウィジェットが使用される

**テスト方法**:
```typescript
const uiSpec = await uiGenerator.generateUISpec({
  dataSchema: planSchema,
  stage: "plan",
  factors: testFactors
});
const validation = uiValidator.validate(uiSpec, planSchema);
// validation.isValid === true
```

---

### A11. Thought Organization API実装
**目標**: 統合API エンドポイント作成  
**ファイル**: `server/src/routes/thought.ts`

**実装内容**:
- `/v1/thought/generate` POST エンドポイント
- Schema生成→UISpec生成の連携
- エラーハンドリング
- レスポンス形式統一

**成功基準**:
- APIリクエストで DataSchema + UISpec が返される
- 生成失敗時に適切なエラーレスポンス

**テスト方法**:
```bash
curl -X POST http://localhost:3000/v1/thought/generate \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "capture",
    "concernText": "時間管理の改善",
    "sessionId": "test_session"
  }'
# レスポンス: { generationId, dataSchema, uiSpec }
```

---

## 🎯 Phase 1B: タスク推奨DSL基盤（6タスク）

### B1. TaskRecommendationDSL型定義
**目標**: TaskRecommendationDSL基本型定義  
**ファイル**: `server/src/types/TaskRecommendationDSL.ts`

**実装内容**:
- `TaskRecommendationDSL` interface定義
- `ScoringSpec` interface定義
- `TaskCardSpec` interface定義
- variant, saliency型定義

**成功基準**:
- TypeScriptコンパイルエラーなし
- 全enum値が正しく定義されている

**テスト方法**:
```bash
cd server
bun run build
# コンパイルエラーがなければ成功
```

---

### B2. スコア計算関数実装
**目標**: 確定式スコアリング機能のみ  
**ファイル**: `server/src/services/ScoreRankingService.ts`

**実装内容**:
- `calculateScore()` メソッド実装
- logistic関数実装
- 正規化関数実装（urgency, staleness）
- contextFit計算（基本版）

**成功基準**:
- 所定の数式でスコアが計算される
- スコア値が0-1の範囲内

**テスト方法**:
```typescript
const task = {
  importance: 0.8,
  due_in_hours: 24,
  days_since_last_touch: 2,
  estimate: 30
};
const factors = { available_time: 60 };
const score = service.calculateScore(task, factors);
console.log('Score (expect 0.4-0.8):', score);
// 0.4-0.8の範囲であることを確認
```

---

### B3. ゲーティングルール実装
**目標**: variant決定ロジック  
**ファイル**: `server/src/services/ScoreRankingService.ts`（B2に追加）

**実装内容**:
- `applyGating()` メソッド実装
- available_time vs estimate比較
- micro_step_card条件判定
- prepare_step_card条件判定

**成功基準**:
- 時間条件に応じて正しいvariantが返される

**テスト方法**:
```typescript
// Case 1: 十分な時間がある
const variant1 = service.applyGating({ estimate: 30 }, 60);
// variant1 === "task_card"

// Case 2: 微小時間のみ
const variant2 = service.applyGating({ 
  estimate: 60, 
  estimate_min_chunk: 15,
  has_independent_micro_step: true 
}, 20);
// variant2 === "micro_step_card"
```

---

### B4. サリエンシー計算実装
**目標**: サリエンシーレベル決定  
**ファイル**: `server/src/services/ScoreRankingService.ts`（B3に追加）

**実装内容**:
- `calculateSaliency()` メソッド実装
- urgentレベル判定（due_in_hours < 24 && importance >= 0.67）
- primaryレベル判定（標準）
- emphasisレベル判定（prepare_step）

**成功基準**:
- 条件に応じて正しいsaliencyレベルが返される

**テスト方法**:
```typescript
// Case 1: urgent条件
const urgent = service.calculateSaliency({
  due_in_hours: 12,
  importance: 0.8
});
// urgent === 3

// Case 2: primary条件  
const primary = service.calculateSaliency({
  due_in_hours: 48,
  importance: 0.6
});
// primary === 2
```

---

### B5. TaskRecommendation統合サービス
**目標**: スコアリング→ランキング→DSL生成  
**ファイル**: `server/src/services/ScoreRankingService.ts`（B4を完成）

**実装内容**:
- `selectAndRender()` メソッド実装
- 全タスクのスコアリング
- ランキングによるトップ選出
- TaskRecommendationDSL生成

**成功基準**:
- 複数タスクから最高スコアタスクが選出される
- 有効なTaskRecommendationDSLが生成される

**テスト方法**:
```typescript
const tasks = [
  { id: "T1", importance: 0.6, due_in_hours: 48 },
  { id: "T2", importance: 0.9, due_in_hours: 12 }
];
const recommendation = await service.selectAndRender({
  tasks,
  available_time: 30,
  factors: {}
});
// recommendation.selectedTask.taskId === "T2" (高スコア)
```

---

### B6. Task Recommendation API実装
**目標**: タスク推奨APIエンドポイント  
**ファイル**: `server/src/routes/task.ts`

**実装内容**:
- `/v1/task/rank` POST エンドポイント
- ScoreRankingService統合
- リクエスト/レスポンス処理
- エラーハンドリング

**成功基準**:
- APIリクエストでTaskRecommendationDSLが返される

**テスト方法**:
```bash
curl -X POST http://localhost:3000/v1/task/rank \
  -H "Content-Type: application/json" \
  -d '{
    "available_time": 30,
    "factors": { "time_of_day": "morning" },
    "tasks": [
      { "id": "T1", "importance": 0.8, "due_in_hours": 6 }
    ]
  }'
# レスポンス: TaskRecommendationDSL
```

---

## 🎯 Phase 1C: Rule-based Rendering統合（8タスク）

### C1. ComponentMapper基本構造
**目標**: DSL→Component変換の骨格  
**ファイル**: `concern-app/src/services/ui-generation/ComponentMapper.ts`

**実装内容**:
- `ComponentMapper` class骨格
- render値→Component名のマッピング定数
- 基本的な変換メソッドシグネチャ

**成功基準**:
- TypeScriptコンパイルエラーなし
- 空のComponentMapperがインスタンス化可能

**テスト方法**:
```bash
cd concern-app
bun run build
# エラーがなければ成功
```

---

### C2. サリエンシースタイル定義
**目標**: CSS class定義とスタイル適用機能  
**ファイル**: `concern-app/src/services/ui-generation/ComponentMapper.ts`（C1に追加）

**実装内容**:
- `SALIENCY_STYLES` 定数定義（4レベル）
- `applySaliencyStyle()` メソッド実装
- Tailwind CSS class適用

**成功基準**:
- 各saliencyレベルで適切なCSS classが返される

**テスト方法**:
```typescript
const mapper = new ComponentMapper();
const style0 = mapper.applySaliencyStyle(0);
// style0.includes("bg-neutral-50")

const style3 = mapper.applySaliencyStyle(3); 
// style3.includes("animate-pulse")
```

---

### C3. 基本ウィジェット実装（Part 1）
**目標**: 4つの基本ウィジェット作成  
**ファイル**: `concern-app/src/components/ui/widgets/`

**実装対象**:
1. `TextAreaWidget.tsx` (paragraph)
2. `InputWidget.tsx` (shortText)  
3. `NumberInputWidget.tsx` (number)
4. `RadioGroupWidget.tsx` (radio)

**成功基準**:
- 各ウィジェットが正しくpropsを受け取る
- editableの切り替えが動作する

**テスト方法**:
```typescript
// Storybookまたは手動テスト
<TextAreaWidget 
  value="test content" 
  editable={true} 
  placeholder="Enter text"
  onChange={(val) => console.log(val)}
/>
```

---

### C4. 基本ウィジェット実装（Part 2）
**目標**: 残り5つのウィジェット作成  
**ファイル**: `concern-app/src/components/ui/widgets/`

**実装対象**:
5. `CategoryPickerWidget.tsx` (category)
6. `ListWidget.tsx` (expanded)
7. `SummaryListWidget.tsx` (summary)
8. `DynamicWidget.tsx` (custom)  
9. `TaskCardWidget.tsx` (task card)

**成功基準**:
- 全ウィジェットが期待通りに表示される
- プロパティが正しく反映される

**テスト方法**:
```typescript
<CategoryPickerWidget
  categories={["学習", "仕事", "趣味"]}
  selected="学習"
  editable={true}
  onChange={(cat) => console.log(cat)}
/>
```

---

### C5. ComponentMapper実装
**目標**: DSL→Reactコンポーネント変換機能  
**ファイル**: `concern-app/src/services/ui-generation/ComponentMapper.ts`（C2を完成）

**実装内容**:
- `mapToComponent()` メソッド実装
- RenderSpec→Component変換ロジック
- props渡しロジック
- エラーハンドリング

**成功基準**:
- 各render値で適切なComponentが返される
- propsが正しく渡される

**テスト方法**:
```typescript
const renderSpec = { render: "paragraph", editable: true };
const component = mapper.mapToComponent(renderSpec, "test data");
// Reactコンポーネントが返されることを確認
```

---

### C6. 動的UIレンダラー実装
**目標**: UISpecDSL→完全UIレンダリング  
**ファイル**: `concern-app/src/services/ui-generation/UIRenderer.tsx`

**実装内容**:
- `UIRenderer` Reactコンポーネント
- UISpecDSLを受け取ってUI生成
- レイアウト処理（singleColumn/twoColumn/grid）
- section/widgets配置

**成功基準**:
- UISpecDSLから完全なUIが生成される
- レイアウトが正しく適用される

**テスト方法**:
```typescript
<UIRenderer 
  uiSpec={testUISpec}
  dataSchema={testDataSchema}
  data={testData}
  onChange={(path, value) => console.log(path, value)}
/>
```

---

### C7. 思考整理画面統合
**目標**: 既存画面へのDSLレンダリング統合  
**ファイル**: `concern-app/src/components/screens/` (該当画面)

**実装内容**:
- capture/plan/breakdown画面でUIRenderer使用
- APIからDSL取得処理
- エラー時のフォールバック表示

**成功基準**:
- 各ステージ画面で動的UIが表示される
- 従来の固定UIから動的UIに切り替わる

**テスト方法**:
1. アプリを起動
2. 関心事入力→capture画面へ
3. 動的に生成されたUIが表示されることを確認

---

### C8. E2E統合テスト実装
**目標**: 全フロー動作確認  
**ファイル**: `tests/phase1_e2e_test.js`

**実装内容**:
- 思考整理フローテスト（capture→plan→breakdown）
- タスク推奨フローテスト
- 2系統独立性テスト
- パフォーマンステスト

**成功基準**:
- 全テストケースがPASSする
- パフォーマンス基準を満たす

**テスト方法**:
```bash
node tests/phase1_e2e_test.js
# All tests passed の出力を確認
```

---

## ✅ 各タスク完了後の確認リスト

### LLM確認事項（各タスク後）
1. **コンパイル確認**: `bun run build` でエラーなし
2. **テスト実行**: 上記テスト方法の実行
3. **ログ確認**: console.logの期待値確認

### 人間確認事項（主要タスク後）
1. **A6, A10, B5後**: API動作確認
2. **C4後**: UI表示確認
3. **C8後**: E2Eテスト結果確認

### Phase完了判定
- [ ] **Phase 1A完了**: A1-A11全てテスト成功
- [ ] **Phase 1B完了**: B1-B6全てテスト成功  
- [ ] **Phase 1C完了**: C1-C8全てテスト成功

---

**文書バージョン:** 1.0  
**対象:** LLM実装エージェント  
**総タスク数:** 25タスク  
**推定実行期間:** 3-4週間