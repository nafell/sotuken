/**
 * DataSchema生成サービス
 * ステージ別のプロンプトテンプレートとLLMによるスキーマ生成
 */

import { GeminiService } from "./GeminiService";
import { DataSchemaValidator, type DataSchemaDSL } from "../types/DataSchemaDSL";

/**
 * DataSchema生成リクエスト
 */
export interface DataSchemaGenerationRequest {
  stage: "capture" | "plan" | "breakdown";
  concernText: string;
  category?: string;
  previousSchema?: DataSchemaDSL;
  factors?: Record<string, any>;
}

/**
 * DataSchema生成サービス
 */
export class DataSchemaGenerator {
  private geminiService: GeminiService;
  private validator: DataSchemaValidator;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
    this.validator = new DataSchemaValidator();
  }

  /**
   * ステージ別のプロンプトを構築
   * @param stage 思考整理のステージ
   * @param concernText ユーザーの関心事
   * @param context 追加のコンテキスト情報
   * @returns 構築されたプロンプト
   */
  buildPrompt(stage: "capture" | "plan" | "breakdown", concernText: string, context?: any): string {
    const basePrompt = this.getBasePrompt();
    
    switch (stage) {
      case "capture":
        return this.buildCapturePrompt(concernText, basePrompt);
      case "plan":
        return this.buildPlanPrompt(concernText, context, basePrompt);
      case "breakdown":
        return this.buildBreakdownPrompt(concernText, context, basePrompt);
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }

  /**
   * DataSchemaDSLの基本仕様プロンプト
   */
  private getBasePrompt(): string {
    return `# DataSchemaDSL v1.0 仕様

あなたはユーザーの関心事に基づいて、思考整理のためのデータ構造（DataSchemaDSL）を生成するエキスパートです。

## DataSchemaDSLの構造

\`\`\`typescript
interface DataSchemaDSL {
  version: "1.0";
  generatedAt: string;  // ISO 8601形式
  generationId: string;  // UUID
  task: "CONCERN";  // 固定
  stage: "capture" | "plan" | "breakdown";
  entities: {
    CONCERN: EntityDefinition;  // 必須
    QUESTION?: EntityDefinition;  // captureで使用
    STRATEGY?: EntityDefinition;  // planで使用
    ACTION?: EntityDefinition;  // breakdownで使用
  };
  dependencies: Dependency[];
}

interface EntityDefinition {
  [attributeName: string]: AttributeSpec;
}

interface AttributeSpec {
  type: "string" | "number" | "array" | "__ENTITY_NAME__";
  function?: "privateIdentifier" | "publicIdentifier" | "display";
  item?: {
    type: "string" | "number" | "__ENTITY_NAME__";
    thumbnail?: string[];
  };
}
\`\`\`

## 必須ルール

1. **CONCERN entity は必須**で、以下の固定属性を含む:
   - id: { type: "string", function: "privateIdentifier" }
   - concernText: { type: "string", function: "publicIdentifier" }
   - category: { type: "string", function: "display" }
   - urgency: { type: "number", function: "display" }

2. **ステージ別のentity**:
   - capture: QUESTION entity（質問項目）
   - plan: STRATEGY entity（戦略候補）
   - breakdown: ACTION entity（具体的なタスク）

3. **配列型の定義**: \`type: "array"\` の場合、\`item\` フィールドが必須

4. **Entity参照**: 他のEntityを参照する場合、\`type: "__ENTITY_NAME__"\` の形式を使用

5. **dependencies**: Entity/属性間の依存関係を定義（空配列も可）
`;
  }

  /**
   * captureステージ用プロンプト
   */
  private buildCapturePrompt(concernText: string, basePrompt: string): string {
    return `${basePrompt}

## タスク: captureステージのDataSchema生成

ユーザーの関心事: "${concernText}"

### captureステージの目的
ユーザーの関心事を深掘りし、詳細を明確にするための質問項目を生成します。

### 生成ルール

1. **CONCERNエンティティ**:
   - 固定属性（id, concernText, category, urgency）に加えて
   - \`clarificationQuestions\` 属性を追加: \`{ type: "array", item: { type: "__QUESTION__" } }\`

2. **QUESTIONエンティティ**:
   - 必須属性: id, text, answerType
   - answerType は "choice" | "scale" | "text" のいずれか
   - answerType="choice" の場合、choices 属性を追加
   - answerType="scale" の場合、scaleRange 属性を追加

3. **質問内容**: 
   - 関心事に応じて3-5個の適切な質問を生成
   - 現状把握、障壁、リソース、優先度などを聞く

### 出力形式
有効なJSON形式のDataSchemaDSLのみを出力してください。説明やマークダウンは不要です。

### 例（参考）:
- 関心事が「英語学習の継続が困難」なら、「現在の学習時間」「困難を感じる要因」「利用可能な時間帯」などを質問
- 関心事が「卒業研究のテーマ決め」なら、「現在の進捗段階」「興味分野」「指導教員との関係」などを質問

今すぐ生成してください:`;
  }

  /**
   * planステージ用プロンプト
   */
  private buildPlanPrompt(concernText: string, context: any, basePrompt: string): string {
    const previousAnswers = context?.previousAnswers ? 
      `\n\n前のステージでの回答:\n${JSON.stringify(context.previousAnswers, null, 2)}` : "";

    return `${basePrompt}

## タスク: planステージのDataSchema生成

ユーザーの関心事: "${concernText}"
${previousAnswers}

### planステージの目的
関心事への取り組み方針（戦略）の候補を生成し、ユーザーに選択させます。

### 生成ルール

1. **CONCERNエンティティ**:
   - 固定属性に加えて
   - \`strategyCandidates\`: { type: "array", item: { type: "__STRATEGY__" } }
   - \`selectedStrategy\`: { type: "__STRATEGY__", thumbnail: ["approach"] } （オプション）

2. **STRATEGYエンティティ** (動的に属性を設計):
   - 必須: id, approach
   - 推奨: next3Steps (配列), estimate (number), expectedGain (string)
   - 高度: tradeoffs (DICT型、speed/quality/effortなど)

3. **アプローチの種類**:
   - "情報整理": 現状を整理・可視化するアプローチ
   - "具体行動": すぐに実行可能な行動を起こすアプローチ  
   - "計画・戦略": 長期的な計画を立てるアプローチ

4. **動的設計**:
   - 関心事の性質に応じて、STRATEGYに独自の属性を追加可能
   - 例: resources (必要なリソース), risks (リスク要因) など

### 出力形式
有効なJSON形式のDataSchemaDSLのみを出力してください。

今すぐ生成してください:`;
  }

  /**
   * breakdownステージ用プロンプト
   */
  private buildBreakdownPrompt(concernText: string, context: any, basePrompt: string): string {
    const selectedStrategy = context?.selectedStrategy ? 
      `\n\n選択された戦略: ${context.selectedStrategy.approach}\n次のステップ: ${JSON.stringify(context.selectedStrategy.next3Steps, null, 2)}` : "";

    return `${basePrompt}

## タスク: breakdownステージのDataSchema生成

ユーザーの関心事: "${concernText}"
${selectedStrategy}

### breakdownステージの目的
選択された戦略を具体的な実行可能タスク（ACTION）に分解します。

### 生成ルール

1. **CONCERNエンティティ**:
   - 固定属性に加えて
   - \`actionSteps\`: { type: "array", item: { type: "__ACTION__" } }
   - \`totalEstimate\`: { type: "number", function: "display" } （全タスクの合計時間）

2. **ACTIONエンティティ**:
   - 必須: id, title, duration (分単位)
   - 推奨: priority (number), importance (0-1), urgency (0-1)
   - PNTR: dependencies (他のACTIONへの依存): { type: "array", item: { type: "__ACTION__", thumbnail: ["title"] } }

3. **タスク分解の原則**:
   - 各タスクは30-120分程度の実行可能な単位に
   - 依存関係を明確に（先に完了すべきタスクを dependencies で指定）
   - 3-7個程度のタスクに分解

4. **dependencies**:
   - totalEstimate を自動計算する依存関係を追加:
     \`{ source: "ACTION.duration", target: "CONCERN.totalEstimate", mechanism: "Update", relationship: "SUM(ACTION.duration)" }\`

### 出力形式
有効なJSON形式のDataSchemaDSLのみを出力してください。

今すぐ生成してください:`;
  }

  /**
   * DataSchemaを生成
   * @param request 生成リクエスト
   * @returns 生成されたDataSchema（検証済み）
   */
  async generateSchema(request: DataSchemaGenerationRequest): Promise<DataSchemaDSL> {
    const maxRetries = 3;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`DataSchema生成試行 ${attempt}/${maxRetries}...`);

        // プロンプト構築
        const prompt = this.buildPrompt(request.stage, request.concernText, {
          previousAnswers: request.previousSchema,
          ...request.factors
        });

        // LLM実行
        const response = await this.geminiService.generateJSON(prompt);

        if (!response.success || !response.data) {
          lastError = response.error || "No data returned from LLM";
          console.error(`試行 ${attempt} 失敗:`, lastError);
          continue;
        }

        // 生成されたスキーマを取得
        let schema = response.data as Partial<DataSchemaDSL>;

        // 必須フィールドの補完
        schema = this.fillRequiredFields(schema, request);

        // バリデーション
        const validation = this.validator.validate(schema);

        if (!validation.isValid) {
          lastError = `Validation failed: ${validation.errors.join(", ")}`;
          console.error(`試行 ${attempt} バリデーション失敗:`, validation.errors);
          continue;
        }

        console.log(`✅ DataSchema生成成功（試行 ${attempt}）`);
        return schema as DataSchemaDSL;

      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        console.error(`試行 ${attempt} エラー:`, error);
      }
    }

    // 全試行失敗
    throw new Error(`Failed to generate valid DataSchema after ${maxRetries} attempts. Last error: ${lastError}`);
  }

  /**
   * 必須フィールドを補完
   */
  private fillRequiredFields(schema: Partial<DataSchemaDSL>, request: DataSchemaGenerationRequest): Partial<DataSchemaDSL> {
    return {
      ...schema,
      version: schema.version || "1.0",
      generatedAt: schema.generatedAt || new Date().toISOString(),
      generationId: schema.generationId || this.generateUUID(),
      task: "CONCERN",
      stage: request.stage,
      dependencies: schema.dependencies || []
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

