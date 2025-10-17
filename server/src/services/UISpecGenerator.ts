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
3. **category時**: \`categories\`配列必須
4. **summary時**: \`summary\`フィールド必須
5. **PNTR時**: \`thumbnail\`配列必須
6. **custom時**: \`component\`名必須
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
   - \`concernText\`: \`paragraph\`（編集可能、プレースホルダー推奨）
   - \`category\`: \`category\`（categories必須）
   - \`urgency\`: \`number\`（編集可能）

3. **QUESTION配列のマッピング**:
   - \`clarificationQuestions\`: \`expanded\`（全質問を表示）
   - 各質問のanswerTypeに応じて適切なrender指定
     - answerType="choice" → \`radio\`
     - answerType="scale" → \`number\`
     - answerType="text" → \`shortText\`

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

2. **カスタムウィジェット活用**:
   - \`strategyCandidates\`: \`strategy_preview_picker\` 推奨
   - \`tradeoffs\`: \`tradeoff_slider\` 推奨
   - \`constraints\`: \`counterfactual_toggles\` 推奨

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

2. **ACTION配列のマッピング**:
   - \`actionSteps\`: \`expanded\`（全タスクを表示、並び替え可能）
   - \`reorderable: true\` 推奨

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
    return {
      ...uiSpec,
      version: uiSpec.version || "1.0",
      generatedAt: uiSpec.generatedAt || new Date().toISOString(),
      generationId: uiSpec.generationId || this.generateUUID(),
      schemaRef: request.dataSchema.generationId,
      stage: request.stage,
      mappings: uiSpec.mappings || {}
    };
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

