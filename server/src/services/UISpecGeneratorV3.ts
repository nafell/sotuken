/**
 * UISpec Generator v3.0
 *
 * Phase 4 Day 3-4: DSL v3用UISpec生成サービス
 * 12種プリセットWidgetを活用した動的UI生成
 */

import { GeminiService, type GeminiResponse } from './GeminiService';
import { logMetrics } from '../utils/metricsLogger';
import type { GeminiResponseMetrics } from '../types/metrics.types';

/**
 * StageType - UIフローのステージ
 */
export type StageType = 'diverge' | 'organize' | 'converge' | 'summary';

/**
 * WidgetComponentType - 12種プリセットWidget
 */
export type WidgetComponentType =
  | 'brainstorm_cards'
  | 'question_card_chain'
  | 'emotion_palette'
  | 'card_sorting'
  | 'dependency_mapping'
  | 'swot_analysis'
  | 'mind_map'
  | 'matrix_placement'
  | 'tradeoff_balance'
  | 'priority_slider_grid'
  | 'timeline_slider'
  | 'structured_summary';

/**
 * UISpec v3生成オプション
 */
export interface UISpecV3GenerationOptions {
  /** 実装済みWidgetのみに制限 */
  restrictToImplementedWidgets?: boolean;
  /** テキストモード（Widget無しステージ用） */
  textOnlyMode?: boolean;
  /** 前ステージの結果（コンテキスト用） */
  previousStageResults?: Record<string, any>;
  /** ボトルネック情報 */
  bottleneckType?: string;
}

/**
 * UISpec v3生成リクエスト
 */
export interface UISpecV3GenerationRequest {
  sessionId: string;
  concernText: string;
  stage: StageType;
  factors?: Record<string, any>;
  options?: UISpecV3GenerationOptions;
}

/**
 * UISpec v3生成レスポンス
 */
export interface UISpecV3GenerationResponse {
  success: boolean;
  uiSpec?: any; // UISpec v3 JSON
  textSummary?: string; // テキストモード時のサマリー
  metrics?: GeminiResponseMetrics;
  error?: string;
  retryCount?: number;
  mode?: 'widget' | 'text'; // 生成モード
}

/** 実装済みWidgetの一覧（全12種） */
const IMPLEMENTED_WIDGETS: WidgetComponentType[] = [
  // Phase 1 - Basic Widgets
  'emotion_palette',
  'brainstorm_cards',
  'matrix_placement',
  'priority_slider_grid',
  // Phase 2 - Extended Widgets (diverge)
  'question_card_chain',
  // Phase 2 - Extended Widgets (organize)
  'card_sorting',
  'dependency_mapping',
  'swot_analysis',
  'mind_map',
  // Phase 2 - Extended Widgets (converge)
  'tradeoff_balance',
  'timeline_slider',
  // Phase 2 - Extended Widgets (summary)
  'structured_summary',
];

/**
 * UISpec Generator v3
 */
export class UISpecGeneratorV3 {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  /**
   * UISpec v3を生成
   */
  async generateUISpec(
    request: UISpecV3GenerationRequest
  ): Promise<UISpecV3GenerationResponse> {
    const options = request.options || {};

    // テキストモードまたはWidget無しステージの場合
    const availableWidgets = this.getWidgetsForStage(
      request.stage,
      options.restrictToImplementedWidgets
    );

    if (options.textOnlyMode || availableWidgets.length === 0) {
      console.log(`📝 テキストモードで生成: ${request.stage}`);
      return this.generateTextSummary(request);
    }

    // 通常のWidget生成モード
    return this.generateWidgetUISpec(request, availableWidgets);
  }

  /**
   * Widget UISpecを生成
   */
  private async generateWidgetUISpec(
    request: UISpecV3GenerationRequest,
    availableWidgets: WidgetComponentType[]
  ): Promise<UISpecV3GenerationResponse> {
    const maxRetries = 3;
    let lastError: string | undefined;
    let lastMetrics: GeminiResponseMetrics | undefined;
    let retryCount = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📝 UISpec v3.0 生成試行 ${attempt}/${maxRetries}...`);

        // プロンプト構築
        const prompt = this.buildPrompt(request, availableWidgets);

        // LLM実行
        const response = await this.geminiService.generateJSON(prompt);
        lastMetrics = response.metrics;

        // メトリクスをログ
        if (response.metrics) {
          logMetrics(request.sessionId, response.metrics, {
            model: this.geminiService.getModelId(),
            stage: request.stage,
            inputTextLength: request.concernText.length,
            success: response.success,
            validationPassed: response.success,
            retryCount: attempt - 1,
            error: response.error,
          });
        }

        if (!response.success || !response.data) {
          lastError = response.error || 'No data returned from LLM';
          console.error(`試行 ${attempt} 失敗:`, lastError);
          retryCount = attempt;
          continue;
        }

        // 生成されたUISpecを取得
        let uiSpec = response.data;

        // 基本フィールドの補完
        uiSpec = this.fillRequiredFields(uiSpec, request);

        // 簡易バリデーション
        const validationResult = this.validateUISpec(uiSpec, availableWidgets);

        if (!validationResult.valid) {
          lastError = `Validation failed: ${validationResult.errors.join(', ')}`;
          console.error(`試行 ${attempt} バリデーション失敗:`, validationResult.errors);
          retryCount = attempt;
          continue;
        }

        console.log(`✅ UISpec v3.0 生成成功（試行 ${attempt}）`);
        return {
          success: true,
          uiSpec,
          metrics: response.metrics,
          retryCount: attempt - 1,
          mode: 'widget',
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`試行 ${attempt} エラー:`, error);
        retryCount = attempt;
      }
    }

    // 全試行失敗
    return {
      success: false,
      error: `Failed to generate valid UISpec v3.0 after ${maxRetries} attempts. Last error: ${lastError}`,
      metrics: lastMetrics,
      retryCount,
      mode: 'widget',
    };
  }

  /**
   * テキストサマリーを生成（organize/summaryステージ用）
   */
  private async generateTextSummary(
    request: UISpecV3GenerationRequest
  ): Promise<UISpecV3GenerationResponse> {
    try {
      const prompt = this.buildTextPrompt(request);

      const response = await this.geminiService.generateText(prompt);

      // メトリクスをログ
      if (response.metrics) {
        logMetrics(request.sessionId, response.metrics, {
          model: this.geminiService.getModelId(),
          stage: request.stage,
          inputTextLength: request.concernText.length,
          success: response.success,
          validationPassed: response.success,
          retryCount: 0,
          error: response.error,
        });
      }

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to generate text summary',
          metrics: response.metrics,
          mode: 'text',
        };
      }

      console.log(`✅ テキストサマリー生成成功: ${request.stage}`);
      return {
        success: true,
        textSummary: response.data,
        metrics: response.metrics,
        mode: 'text',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        mode: 'text',
      };
    }
  }

  /**
   * テキストモード用プロンプトを構築
   */
  private buildTextPrompt(request: UISpecV3GenerationRequest): string {
    const stageInstructions: Record<StageType, string> = {
      diverge: 'ユーザーの悩みに関連するアイデアや視点を広げてください。',
      organize:
        'これまでの情報を整理し、構造化してください。関連する要素をグループ化し、関係性を明確にしてください。',
      converge:
        'これまでの検討内容から、重要なポイントを絞り込み、優先順位をつけてください。',
      summary:
        'これまでの検討内容を総括し、次のアクションにつながる形でまとめてください。',
    };

    const previousContext = request.options?.previousStageResults
      ? `\n\n## これまでの検討内容\n${JSON.stringify(request.options.previousStageResults, null, 2)}`
      : '';

    return `あなたはユーザーの悩み解決を支援するAIアシスタントです。

## ユーザーの悩み
「${request.concernText}」

## 現在のステージ
${request.stage}（${this.getStageDescription(request.stage)}）
${previousContext}

## タスク
${stageInstructions[request.stage]}

以下の形式で回答してください：
- 見出しを使って構造化
- 箇条書きで要点を整理
- 具体的で実行可能な内容
- 日本語で回答`;
  }

  /**
   * プロンプトを構築
   */
  private buildPrompt(
    request: UISpecV3GenerationRequest,
    availableWidgets: WidgetComponentType[]
  ): string {
    const widgetDescriptions = this.getWidgetDescriptions(availableWidgets);

    return `あなたはユーザーの悩み解決を支援するUI設計AIです。
ユーザーの悩みに対して、適切なWidgetを選択し、UISpec v3.0形式のJSONを生成してください。

## ユーザーの悩み
「${request.concernText}」

## ステージ
${request.stage}（${this.getStageDescription(request.stage)}）

## 利用可能なWidget
${widgetDescriptions}

## 生成するJSON形式
{
  "sessionId": "${request.sessionId}",
  "stage": "${request.stage}",
  "oodm": {
    "version": "3.0",
    "entities": [],
    "metadata": {}
  },
  "dpg": {
    "dependencies": [],
    "metadata": { "version": "3.0", "generatedAt": ${Date.now()} }
  },
  "widgets": [
    {
      "id": "widget_1",
      "component": "選択したWidget ID",
      "position": 1,
      "layout": "single",
      "config": { Widget固有の設定 },
      "inputs": [],
      "outputs": [],
      "reactiveBindings": [],
      "metadata": {
        "timing": 0.1-1.0,
        "versatility": 0.1-1.0,
        "bottleneck": ["対処するボトルネック"],
        "description": "Widgetの説明"
      }
    }
  ],
  "layout": {
    "type": "sequential",
    "config": { "spacing": "comfortable", "responsive": true }
  },
  "metadata": {
    "generatedAt": ${Date.now()},
    "llmModel": "${this.geminiService.getModelId()}",
    "tokenCount": 0,
    "version": "3.0"
  }
}

## 注意事項
- 悩みの内容に応じて1〜4個のWidgetを選択してください
- 各Widgetのconfigは適切に設定してください
- 日本語のプロンプトや説明を使用してください
- JSONのみを出力し、説明は不要です`;
  }

  /**
   * ステージに応じた利用可能Widgetを取得
   * @param stage ステージ
   * @param restrictToImplemented 実装済みWidgetのみに制限
   */
  private getWidgetsForStage(
    stage: StageType,
    restrictToImplemented = false
  ): WidgetComponentType[] {
    const stageWidgets: Record<StageType, WidgetComponentType[]> = {
      diverge: ['emotion_palette', 'brainstorm_cards', 'question_card_chain'],
      organize: ['card_sorting', 'dependency_mapping', 'swot_analysis', 'mind_map'],
      converge: [
        'matrix_placement',
        'tradeoff_balance',
        'priority_slider_grid',
        'timeline_slider',
      ],
      summary: ['structured_summary'],
    };

    let widgets = stageWidgets[stage] || [];

    if (restrictToImplemented) {
      widgets = widgets.filter((w) => IMPLEMENTED_WIDGETS.includes(w));
    }

    return widgets;
  }

  /**
   * Widgetの説明を取得
   */
  private getWidgetDescriptions(widgets: WidgetComponentType[]): string {
    const descriptions: Record<WidgetComponentType, string> = {
      emotion_palette:
        'emotion_palette: 8種類の感情から選択し強度を調整。config: { prompt: string }',
      brainstorm_cards:
        'brainstorm_cards: 自由にアイデアを書き出すカード。config: { prompt: string, maxCards: number }',
      question_card_chain:
        'question_card_chain: 質問に連鎖的に回答していく。config: { questions: string[] }',
      card_sorting:
        'card_sorting: カードをカテゴリに仕分け。config: { categories: string[] }',
      dependency_mapping:
        'dependency_mapping: 要素間の依存関係をマッピング。config: {}',
      swot_analysis:
        'swot_analysis: SWOT分析の4象限にカード配置。config: {}',
      mind_map:
        'mind_map: マインドマップで関連性を視覚化。config: { centerTopic: string }',
      matrix_placement:
        'matrix_placement: 2軸マトリックスにアイテム配置。config: { xAxisLabel: string, yAxisLabel: string, maxItems: number }',
      tradeoff_balance:
        'tradeoff_balance: トレードオフを天秤で可視化。config: {}',
      priority_slider_grid:
        'priority_slider_grid: 複数項目の優先度をスライダーで設定。config: { maxItems: number }',
      timeline_slider:
        'timeline_slider: 時間軸でイベントを配置。config: { startLabel: string, endLabel: string }',
      structured_summary:
        'structured_summary: 構造化された文章でまとめ。config: {}',
    };

    return widgets.map((w) => `- ${descriptions[w]}`).join('\n');
  }

  /**
   * ステージの説明を取得
   */
  private getStageDescription(stage: StageType): string {
    const descriptions: Record<StageType, string> = {
      diverge: '発散フェーズ - アイデアを広げ、感情を表現する',
      organize: '整理フェーズ - 情報を構造化し、関係性を明確にする',
      converge: '収束フェーズ - 優先順位をつけ、決断に向かう',
      summary: 'まとめフェーズ - 結論を構造化して出力する',
    };
    return descriptions[stage] || stage;
  }

  /**
   * 必須フィールドを補完
   */
  private fillRequiredFields(
    uiSpec: any,
    request: UISpecV3GenerationRequest
  ): any {
    return {
      sessionId: request.sessionId,
      stage: request.stage,
      oodm: uiSpec.oodm || {
        version: '3.0',
        entities: [],
        metadata: {},
      },
      dpg: uiSpec.dpg || {
        dependencies: [],
        metadata: { version: '3.0', generatedAt: Date.now() },
      },
      widgets: (uiSpec.widgets || []).map((widget: any, index: number) => ({
        id: widget.id || `widget_${index + 1}`,
        component: widget.component,
        position: widget.position || index + 1,
        layout: widget.layout || 'single',
        config: widget.config || {},
        inputs: widget.inputs || [],
        outputs: widget.outputs || [],
        reactiveBindings: widget.reactiveBindings || [],
        metadata: widget.metadata || {
          timing: 0.5,
          versatility: 0.5,
          bottleneck: [],
          description: '',
        },
      })),
      layout: uiSpec.layout || {
        type: 'sequential',
        config: { spacing: 'comfortable', responsive: true },
      },
      metadata: {
        generatedAt: Date.now(),
        llmModel: this.geminiService.getModelId(),
        tokenCount: 0,
        version: '3.0',
        ...(uiSpec.metadata || {}),
      },
    };
  }

  /**
   * 簡易バリデーション
   * @param uiSpec 検証対象のUISpec
   * @param availableWidgets 利用可能なWidgetリスト（指定時は検証）
   */
  private validateUISpec(
    uiSpec: any,
    availableWidgets?: WidgetComponentType[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!uiSpec.sessionId) errors.push('sessionId is required');
    if (!uiSpec.stage) errors.push('stage is required');
    if (!uiSpec.widgets || !Array.isArray(uiSpec.widgets)) {
      errors.push('widgets array is required');
    } else if (uiSpec.widgets.length === 0) {
      errors.push('at least one widget is required');
    } else {
      uiSpec.widgets.forEach((widget: any, index: number) => {
        if (!widget.component) {
          errors.push(`widget[${index}].component is required`);
        } else if (availableWidgets && !availableWidgets.includes(widget.component)) {
          errors.push(
            `widget[${index}].component "${widget.component}" is not in available widgets`
          );
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * UISpecGeneratorV3のインスタンスを作成
 */
export function createUISpecGeneratorV3(
  geminiService: GeminiService
): UISpecGeneratorV3 {
  return new UISpecGeneratorV3(geminiService);
}
