/**
 * UISpec Generator v2.0
 *
 * シンプルで理解しやすいプロンプトでLLMからUISpecを生成
 */

import { GeminiService } from "./GeminiService";
import { validateUISpecV2, formatValidationErrors } from "../types/UISpecV2Schema";
import type { UISpecV2, UIStage } from "../types/UISpecV2";
import type { DataSchemaDSL } from "../types/DataSchemaDSL";

/**
 * UISpec生成リクエスト
 */
export interface UISpecGenerationRequestV2 {
  concernText: string;
  stage: UIStage;
  factors?: Record<string, any>;
}

/**
 * UISpec Generator v2
 */
export class UISpecGeneratorV2 {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  /**
   * UISpecを生成
   */
  async generateUISpec(request: UISpecGenerationRequestV2): Promise<UISpecV2> {
    const maxRetries = 3;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📝 UISpec v2.0 生成試行 ${attempt}/${maxRetries}...`);

        // プロンプト構築
        const prompt = this.buildPrompt(request);

        // LLM実行
        const response = await this.geminiService.generateJSON(prompt);

        if (!response.success || !response.data) {
          lastError = response.error || "No data returned from LLM";
          console.error(`試行 ${attempt} 失敗:`, lastError);
          continue;
        }

        // 生成されたUISpecを取得
        let uiSpec = response.data;

        // 基本フィールドの補完
        uiSpec = this.fillRequiredFields(uiSpec, request);

        // Zodバリデーション
        const validation = validateUISpecV2(uiSpec);

        if (!validation.success) {
          if (validation.errors) {
            const errors = formatValidationErrors(validation.errors);
            lastError = `Validation failed: ${errors.join(", ")}`;
            console.error(`試行 ${attempt} バリデーション失敗:`, errors);
          } else {
            lastError = 'Validation failed: Unknown error';
            console.error(`試行 ${attempt} バリデーション失敗: Unknown error`);
          }
          continue;
        }

        console.log(`✅ UISpec v2.0 生成成功（試行 ${attempt}）`);
        return validation.data!;

      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        console.error(`試行 ${attempt} エラー:`, error);
      }
    }

    // 全試行失敗
    throw new Error(
      `Failed to generate valid UISpec v2.0 after ${maxRetries} attempts. Last error: ${lastError}`
    );
  }

  /**
   * プロンプトを構築
   */
  private buildPrompt(request: UISpecGenerationRequestV2): string {
    const basePrompt = this.getBasePrompt();
    const stagePrompt = this.getStagePrompt(request.stage, request.concernText);
    const factorsStr = this.formatFactors(request.factors);

    return `${basePrompt}

${stagePrompt}

## 入力情報
- ステージ: ${request.stage}
- 関心事: ${request.concernText}
${factorsStr ? `- コンテキスト: ${factorsStr}` : ''}

JSONのみを出力してください。説明は不要です。`;
  }

  /**
   * 基本プロンプト（全ステージ共通）
   */
  private getBasePrompt(): string {
    return `# UISpec v2.0 JSON生成

以下の形式でJSONを生成：

{
  "version": "2.0",
  "stage": "[capture|plan|breakdown]",
  "sections": [
    {
      "id": "セクションID",
      "title": "セクションタイトル（日本語）",
      "description": "説明（オプション）",
      "fields": [
        {
          "id": "フィールドID",
          "label": "ラベル（日本語）",
          "type": "text|number|select|list|slider|toggle|cards",
          "value": "初期値（オプション）",
          "options": { /* フィールドタイプに応じたオプション */ }
        }
      ]
    }
  ],
  "actions": []
}

## 使用可能なフィールドタイプ
- text: テキスト入力（options: multiline, placeholder, minLength, maxLength）
- number: 数値入力（options: min, max, step, unit）
- select: 選択肢（options: choices=[{value, label, description}], display）
- list: リスト（options: itemTemplate, reorderable, addButton）
- slider: スライダー（options: min, max, leftLabel, rightLabel）
- toggle: ON/OFF切り替え（options: onLabel, offLabel）
- cards: カード選択（options: cards=[{id, title, description, icon}]）

## ルール
1. すべてのラベルは日本語で記述
2. ユーザーフレンドリーな表現を使用
3. placeholder と helperText で使い方を説明
4. 必須フィールドには required: true を設定`;
  }

  /**
   * ステージ別プロンプト
   */
  private getStagePrompt(stage: UIStage, concernText: string): string {
    switch (stage) {
      case "capture":
        return this.getCapturePrompt();
      case "plan":
        return this.getPlanPrompt(concernText);
      case "breakdown":
        return this.getBreakdownPrompt(concernText);
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }

  /**
   * Captureステージ用プロンプト
   */
  private getCapturePrompt(): string {
    return `## Captureステージの要件

関心事の詳細を収集する画面を生成してください。

### 必須セクション
1. main: 関心事の入力
   - concern_text (text, multiline, 必須, minLength: 10, maxLength: 500)
   - category (select, display: "buttons", 3つの選択肢)
   - urgency (slider, 0-10, leftLabel: "急がない", rightLabel: "とても急ぐ")

2. context: 追加情報（任意）
   - 制約条件や背景情報を1-2個のフィールドで収集

### 注意事項
- actionsは生成しない（ナビゲーションはクライアントが管理）
- フィールドのみに集中してください`;
  }

  /**
   * Planステージ用プロンプト
   */
  private getPlanPrompt(concernText: string): string {
    return `## Planステージの要件

関心事「${concernText}」への取り組み方を計画する画面を生成してください。

### 必須セクション
1. strategy: 戦略選択
   - approach (cards): 3つの異なるアプローチを提示
     * 積極的/行動重視のアプローチ
     * 慎重/計画重視のアプローチ
     * バランス型/相談重視のアプローチ

2. balance: バランス調整
   - 2-3個のsliderで優先度や力の入れ方を調整
   - 例: "スピード vs 品質", "力の入れ方", "一人で vs みんなで"

### 注意事項
- actionsは生成しない（ナビゲーションはクライアントが管理）
- フィールドのみに集中してください

### カード内容の指針
各カードには具体的な行動イメージを含めてください。`;
  }

  /**
   * Breakdownステージ用プロンプト
   */
  private getBreakdownPrompt(concernText: string): string {
    return `## Breakdownステージの要件

関心事「${concernText}」を解決するための具体的なタスクリストを生成してください。

### 必須セクション
1. tasks: タスクリスト
   - task_list (list, reorderable: true)
   - itemTemplate:
     * title: タスク名（text）
     * duration: 所要時間（number, unit: "分"）
     * priority: 優先度（number, 1-5）
     * done: 完了チェック（toggle）
   - value: 3-5個の具体的なタスクを初期値として設定

2. summary: サマリー（すべてreadonly, computed使用）
   - total_time: 合計時間（computed: "sum(task_list.*.duration) + ' 分'"）
   - task_count: タスク数（computed: "count(task_list) + ' 個'"）
   - first_action: 最初の一歩（computed: "task_list[0].title"）

### 注意事項
- actionsは生成しない（ナビゲーションはクライアントが管理）
- フィールドのみに集中してください

### タスク生成指針
- 最初のタスクは5分以内でできる小さなアクション
- 具体的で実行可能な行動を記述
- 3-7個程度のタスク`;
  }

  /**
   * factorsを整形
   */
  private formatFactors(factors?: Record<string, any>): string {
    if (!factors || Object.keys(factors).length === 0) {
      return "";
    }

    const entries = Object.entries(factors)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    return entries;
  }

  /**
   * 必須フィールドを補完
   */
  private fillRequiredFields(
    uiSpec: Partial<UISpecV2>,
    request: UISpecGenerationRequestV2
  ): Partial<UISpecV2> {
    const filled: Partial<UISpecV2> = {
      ...uiSpec,
      version: "2.0",
      stage: request.stage,
      metadata: {
        generatedAt: new Date().toISOString(),
        generationId: this.generateUUID(),
        ...uiSpec.metadata
      }
    };

    // sectionsの補完
    if (filled.sections) {
      filled.sections = filled.sections.map(section => ({
        ...section,
        visible: section.visible ?? true
      }));
    }

    // actionsの補完（v2.1: デフォルトで空配列）
    if (!filled.actions) {
      filled.actions = [];
    } else {
      filled.actions = filled.actions.map(action => ({
        ...action,
        position: action.position ?? "bottom",
        style: action.style ?? "primary"
      }));
    }

    return filled;
  }

  /**
   * UUID生成
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
