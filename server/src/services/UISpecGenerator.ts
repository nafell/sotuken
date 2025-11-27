/**
 * UISpec生成サービス
 * DataSchemaからUISpecを生成
 */

import { GeminiService } from "./GeminiService";
import { UISpecValidator, type UISpecDSL } from "../types/UISpecDSL";
import type { DataSchemaDSL } from "../types/DataSchemaDSL";

/**
 * UISpec生成リクエスト
 */
export interface UISpecGenerationRequest {
  dataSchema: DataSchemaDSL;
  stage: "capture" | "plan" | "breakdown";
  factors?: Record<string, any>;
}

/**
 * UISpec生成サービス
 */
export class UISpecGenerator {
  private geminiService: GeminiService;
  private validator: UISpecValidator;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
    this.validator = new UISpecValidator();
  }

  /**
   * DataSchemaからUISpec用のプロンプトを構築
   * @param dataSchema 入力となるDataSchema
   * @param stage 思考整理のステージ
   * @returns 構築されたプロンプト
   */
  buildUISpecPrompt(dataSchema: DataSchemaDSL, stage: "capture" | "plan" | "breakdown"): string {
    const basePrompt = this.getBasePrompt();
    
    switch (stage) {
      case "capture":
        return this.buildCaptureUIPrompt(dataSchema, basePrompt);
      case "plan":
        return this.buildPlanUIPrompt(dataSchema, basePrompt);
      case "breakdown":
        return this.buildBreakdownUIPrompt(dataSchema, basePrompt);
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }

  /**
   * UISpecDSLの基本仕様プロンプト
   */
  private getBasePrompt(): string {
    return `# UISpecDSL v1.0 仕様

あなたはDataSchemaDSLで定義されたデータ構造を、ユーザーフレンドリーなUIとしてレンダリングするための仕様（UISpecDSL）を生成するエキスパートです。

## UISpecDSLの構造

\`\`\`typescript
interface UISpecDSL {
  version: "1.0";
  generatedAt: string;  // ISO 8601形式
  generationId: string;  // UUID
  schemaRef: string;    // DataSchemaDSLのgenerationId
  stage: "capture" | "plan" | "breakdown";
  
  mappings: {
    [entityPath: string]: RenderSpec;
  };
  
  layout?: LayoutSpec;
  regenerationPolicy?: RegenerationPolicy;  // planのみ
}
\`\`\`

## レンダリングタイプ

### SVAL（基本型）
- \`paragraph\`: 複数行テキスト入力
- \`shortText\`: 1行テキスト入力
- \`number\`: 数値入力
- \`radio\`: ラジオボタン選択
- \`category\`: カテゴリ選択（categories配列必須）
- \`hidden\`: 非表示（内部ID用）

### ARRY（配列型）
- \`expanded\`: 全アイテムを展開表示
- \`summary\`: 要約表示（クリックで展開）

### PNTR（ポインタ型）
- \`link\`: リンク形式
- \`inline\`: インライン表示
- \`card\`: カード形式

### CUSTOM（カスタムウィジェット）
- \`tradeoff_slider\`: トレードオフスライダー
- \`counterfactual_toggles\`: 反実仮想トグル
- \`strategy_preview_picker\`: プレビュー付き戦略選択

## 必須ルール

1. **全mappingsキー**はDataSchema内の有効な"ENTITY.attribute"形式
2. **render値**は上記のサポートされたタイプのみ
3. **editableフィールド必須**: 全てのSVAL, ARRY, PNTRレンダリングには\`editable: true\`または\`editable: false\`を明示的に指定すること
4. **category時**: \`categories\`配列必須
5. **summary時**: \`summary\`フィールド必須
6. **PNTR時**: \`thumbnail\`配列必須
7. **custom時**: \`component\`名必須
`;
  }

  /**
   * captureステージ用UIプロンプト
   */
  private buildCaptureUIPrompt(dataSchema: DataSchemaDSL, basePrompt: string): string {
    return `${basePrompt}

## タスク: captureステージのUISpec生成

### 入力DataSchema:
\`\`\`json
${JSON.stringify(dataSchema, null, 2)}
\`\`\`

### captureステージのUI設計方針

1. **レイアウト**: \`singleColumn\` 固定（シンプルで直感的）

2. **CONCERN属性のマッピング**:
   - \`concernText\`: { render: "paragraph", editable: true, placeholder: "..." }
   - \`category\`: { render: "category", editable: true, categories: [...] }
   - \`urgency\`: { render: "number", editable: true }

3. **QUESTION配列のマッピング**（重要: itemフィールド必須）:
   - \`clarificationQuestions\`: { render: "expanded", editable: true, item: { render: "shortText" } }
   
   ⚠️ **重要**: 配列型（render="expanded" または "summary"）は必ず \`item\`フィールドを含めてください！
   
   - 各質問のanswerTypeに応じて適切な\`item.render\`指定
     - answerType="choice" → item: { render: "radio" }
     - answerType="scale" → item: { render: "number" }
     - answerType="text" → item: { render: "shortText" }

4. **表示順序**: \`displayOrder\`で論理的な順序を指定

### 出力形式
有効なJSON形式のUISpecDSLのみを出力してください。説明やマークダウンは不要です。

今すぐ生成してください:`;
  }

  /**
   * planステージ用UIプロンプト
   */
  private buildPlanUIPrompt(dataSchema: DataSchemaDSL, basePrompt: string): string {
    return `${basePrompt}

## タスク: planステージのUISpec生成

### 入力DataSchema:
\`\`\`json
${JSON.stringify(dataSchema, null, 2)}
\`\`\`

### planステージのUI設計方針（🌟高度な自由度）

1. **レイアウト**: 
   - \`twoColumn\` または \`grid\` を選択可能
   - sections配列で左右/上下のパネル構成を設計
   - 戦略選択と詳細調整を分離

2. **カスタムウィジェット活用**（重要: render="custom"を使用）:
   - \`strategyCandidates\`: { render: "custom", component: "strategy_preview_picker", props: {...} }
   - \`tradeoffs\`: { render: "custom", component: "tradeoff_slider", props: {...} }
   - \`constraints\`: { render: "custom", component: "counterfactual_toggles", props: {...} }
   
   ⚠️ **注意**: カスタムウィジェットは必ず \`render: "custom"\` を指定し、\`component\`フィールドでウィジェット名を指定してください。
   
   例:
   \`\`\`json
   "STRATEGY.strategyCandidates": {
     "render": "custom",
     "component": "strategy_preview_picker",
     "props": {
       "allowMultiSelect": false
     },
     "displayOrder": 1
   }
   \`\`\`

3. **再生成ポリシー**（オプション）:
   - ユーザーがスライダーやトグルを操作したら、戦略候補を再生成
   - \`debounceMs: 300\` 推奨
   - \`triggers\`配列で再生成条件を指定

4. **動的設計**:
   - DataSchemaのSTRATEGY属性に応じて最適なUIを選択
   - 関心事の性質に合わせてレイアウトをカスタマイズ

### 出力形式
有効なJSON形式のUISpecDSLのみを出力してください。

今すぐ生成してください:`;
  }

  /**
   * breakdownステージ用UIプロンプト
   */
  private buildBreakdownUIPrompt(dataSchema: DataSchemaDSL, basePrompt: string): string {
    return `${basePrompt}

## タスク: breakdownステージのUISpec生成

### 入力DataSchema:
\`\`\`json
${JSON.stringify(dataSchema, null, 2)}
\`\`\`

### breakdownステージのUI設計方針（ほぼ固定）

1. **レイアウト**: \`twoColumn\` 固定
   - 左パネル: タスクリスト（actionSteps）
   - 右パネル: サマリー情報（totalEstimate等）

2. **ACTION配列のマッピング**（重要: itemフィールド必須）:
   - \`actionSteps\`: { render: "expanded", editable: true, reorderable: true, item: { render: "shortText" } }
   
   ⚠️ **重要**: 配列型（render="expanded" または "summary"）は必ず \`item\`フィールドを含めてください！
   
   例: { "render": "expanded", "editable": true, "item": { "render": "shortText" } }

3. **ACTION属性のマッピング**:
   - \`title\`: \`shortText\`（編集可能）
   - \`duration\`: \`number\`（編集可能）
   - \`priority\`: \`number\`（編集不可、自動計算）
   - \`dependencies\`: \`link\`（依存タスクへのリンク）

4. **表示順序**: 
   - タスクリストを優先表示
   - 詳細情報は後ろに配置

### 出力形式
有効なJSON形式のUISpecDSLのみを出力してください。

今すぐ生成してください:`;
  }

  /**
   * UISpecを生成
   * @param request 生成リクエスト
   * @returns 生成されたUISpec（検証済み）
   */
  async generateUISpec(request: UISpecGenerationRequest): Promise<UISpecDSL> {
    const maxRetries = 3;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`UISpec生成試行 ${attempt}/${maxRetries}...`);

        // プロンプト構築
        const prompt = this.buildUISpecPrompt(request.dataSchema, request.stage);

        // LLM実行
        const response = await this.geminiService.generateJSON(prompt);

        if (!response.success || !response.data) {
          lastError = response.error || "No data returned from LLM";
          console.error(`試行 ${attempt} 失敗:`, lastError);
          continue;
        }

        // 生成されたUISpecを取得
        let uiSpec = response.data as Partial<UISpecDSL>;

        // 必須フィールドの補完
        uiSpec = this.fillRequiredFields(uiSpec, request);

        // バリデーション
        const validation = this.validator.validate(uiSpec, request.dataSchema);

        if (!validation.isValid) {
          lastError = `Validation failed: ${validation.errors.join(", ")}`;
          console.error(`試行 ${attempt} バリデーション失敗:`, validation.errors);
          continue;
        }

        console.log(`✅ UISpec生成成功（試行 ${attempt}）`);
        return uiSpec as UISpecDSL;

      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        console.error(`試行 ${attempt} エラー:`, error);
      }
    }

    // 全試行失敗
    throw new Error(`Failed to generate valid UISpec after ${maxRetries} attempts. Last error: ${lastError}`);
  }

  /**
   * 必須フィールドを補完
   */
  private fillRequiredFields(uiSpec: Partial<UISpecDSL>, request: UISpecGenerationRequest): Partial<UISpecDSL> {
    // 基本フィールドの補完
    const filled: Partial<UISpecDSL> = {
      ...uiSpec,
      version: uiSpec.version || "1.0",
      generatedAt: uiSpec.generatedAt || new Date().toISOString(),
      generationId: uiSpec.generationId || this.generateUUID(),
      schemaRef: request.dataSchema.generationId,
      stage: request.stage,
      mappings: uiSpec.mappings || {}
    };

    // mappingsの補完（ARRY, PNTRの不足フィールド）
    if (filled.mappings) {
      filled.mappings = this.fillMappingsDefaults(filled.mappings, request.dataSchema);
    }

    // layoutの補完（sectionsのwidgets欠落対応）
    if (filled.layout) {
      this.fillLayoutDefaults(filled.layout);
    }

    return filled;
  }

  /**
   * mappingsのデフォルト値を補完
   */
  private fillMappingsDefaults(
    mappings: { [entityPath: string]: any },
    dataSchema: DataSchemaDSL
  ): { [entityPath: string]: any } {
    const filledMappings = { ...mappings };

    for (const [entityPath, renderSpec] of Object.entries(filledMappings)) {
      const render = renderSpec.render;

      // ARRYレンダリングの補完
      if (["expanded", "summary"].includes(render)) {
        if (!renderSpec.item) {
          console.log(`⚠️ ARRY ${entityPath}: itemフィールドが欠落 → デフォルト補完`);
          renderSpec.item = { render: "shortText" };
        }
        if (renderSpec.editable === undefined) {
          renderSpec.editable = true;
        }
      }

      // PNTRレンダリングの補完
      else if (["link", "inline", "card"].includes(render)) {
        if (!renderSpec.thumbnail || renderSpec.thumbnail.length === 0) {
          console.log(`⚠️ PNTR ${entityPath}: thumbnailが欠落 → デフォルト補完`);
          // エンティティパスから属性名を推測
          const [entityName, ...attrParts] = entityPath.split(".");
          const attrName = attrParts.join(".");
          renderSpec.thumbnail = [attrName + ".title", attrName + ".description"];
        }
        if (renderSpec.editable === undefined) {
          renderSpec.editable = false;
        }
      }

      // SVALレンダリングのeditable補完
      else if (["paragraph", "shortText", "number", "radio", "category", "hidden"].includes(render)) {
        if (renderSpec.editable === undefined) {
          renderSpec.editable = render !== "hidden";
        }
      }

      // CUSTOMレンダリングの補完
      else if (render === "custom") {
        if (!renderSpec.component) {
          console.log(`⚠️ CUSTOM ${entityPath}: componentが欠落 → 削除`);
          delete filledMappings[entityPath];
        }
      }
    }

    return filledMappings;
  }

  /**
   * layout.sectionsのデフォルト値を補完
   */
  private fillLayoutDefaults(layout: any): void {
    if (!layout.sections) return;

    for (const section of layout.sections) {
      // widgets が欠落している場合
      if (!section.widgets) {
        console.log(`⚠️ LayoutSection ${section.id || 'unknown'}: widgetsフィールドが欠落 → 空配列に補完`);
        section.widgets = [];
      }

      // widgets が配列でない場合
      if (!Array.isArray(section.widgets)) {
        console.warn(`⚠️ LayoutSection ${section.id || 'unknown'}: widgetsが配列でない → 空配列に変換`);
        section.widgets = [];
      }

      // id が欠落している場合
      if (!section.id) {
        const generatedId = `section-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`⚠️ LayoutSection: idが欠落 → ${generatedId} を割り当て`);
        section.id = generatedId;
      }
    }
  }

  /**
   * シンプルなUUID生成
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

