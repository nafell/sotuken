/**
 * WidgetSummarizationService.ts
 * Widget操作の言語化サービス
 *
 * TASK-4.3: Widget操作言語化実装
 *
 * 各WidgetのsummarizationPromptを使用して、
 * ユーザーの操作内容を自然言語で要約する。
 *
 * @since DSL v4.0
 */

import type { WidgetComponentType } from '../../types/v4/widget-selection.types';
import type { LLMOrchestrator } from './LLMOrchestrator';
import type { WidgetDefinitionV4 } from '../../definitions/v4/widgets.types';
import { getWidgetDefinitionV4 } from '../../definitions/v4/widgets';

// =============================================================================
// Types
// =============================================================================

/**
 * Widget状態（要約対象）
 */
export interface WidgetState {
  /** Widget ID */
  widgetId: string;
  /** Widgetコンポーネント種別 */
  component: WidgetComponentType;
  /** 出力データ */
  outputs: Record<string, unknown>;
  /** 追加コンテキスト */
  context?: Record<string, unknown>;
}

/**
 * Widget要約結果
 */
export interface WidgetSummary {
  /** Widget ID */
  widgetId: string;
  /** Widgetコンポーネント種別 */
  component: WidgetComponentType;
  /** 要約テキスト */
  summary: string;
  /** 生成成功フラグ */
  success: boolean;
  /** エラーメッセージ */
  error?: string;
  /** 処理時間（ミリ秒） */
  latencyMs?: number;
}

/**
 * バッチ要約入力
 */
export interface BatchSummarizationInput {
  /** Widget状態リスト */
  widgetStates: WidgetState[];
  /** ユーザーの悩みテキスト */
  concernText?: string;
  /** ステージ種別 */
  stage?: string;
}

/**
 * バッチ要約結果
 */
export interface BatchSummarizationResult {
  /** Widget要約リスト */
  summaries: WidgetSummary[];
  /** 全体の処理時間（ミリ秒） */
  totalLatencyMs: number;
}

// =============================================================================
// Summarization Prompts
// =============================================================================

/**
 * Widget別の言語化プロンプト
 */
const SUMMARIZATION_PROMPTS: Record<WidgetComponentType, string> = {
  emotion_palette: `
以下の感情選択データを、ユーザーの感情状態として自然な日本語で要約してください。
選択された感情とその強度を含めてください。

データ:
{{data}}

出力形式: 1-3文の簡潔な要約
`,

  brainstorm_cards: `
以下のブレインストーミングカードの内容を、箇条書きまたは段落形式で要約してください。
重要なアイデアや気づきを含めてください。

データ:
{{data}}

出力形式: 箇条書きまたは短い段落
`,

  concern_map: `
以下の関心マップのデータを、ユーザーの悩みの構造として要約してください。
中心的な悩みと関連する要素を含めてください。

データ:
{{data}}

出力形式: 階層的な要約
`,

  free_writing: `
以下の自由記述テキストの主要なポイントを抽出し、要約してください。

データ:
{{data}}

出力形式: 主要なポイントの箇条書き
`,

  card_sorting: `
以下のカード分類結果を、カテゴリ別に整理して要約してください。

データ:
{{data}}

出力形式: 【カテゴリ名】: 項目リスト
`,

  matrix_placement: `
以下のマトリクス配置結果を、各象限の内容として要約してください。

データ:
{{data}}

出力形式: 象限別の要約
`,

  timeline_view: `
以下のタイムライン情報を、時系列で要約してください。

データ:
{{data}}

出力形式: 時系列順の要約
`,

  priority_slider_grid: `
以下の優先度評価結果を、優先度が高い順に要約してください。

データ:
{{data}}

出力形式: 優先度順のリスト
`,

  decision_balance: `
以下の判断バランス分析結果を、メリット・デメリットとして要約してください。

データ:
{{data}}

出力形式: メリット/デメリットの比較
`,

  action_cards: `
以下のアクションカードの内容を、具体的なアクションプランとして要約してください。

データ:
{{data}}

出力形式: アクション項目のリスト
`,

  summary_view: `
以下のサマリー内容を簡潔に再要約してください。

データ:
{{data}}

出力形式: 簡潔な要約
`,

  export_options: `
選択されたエクスポートオプションを説明してください。

データ:
{{data}}

出力形式: 選択内容の説明
`,

  stage_summary: `
このステージのサマリーを生成してください。

データ:
{{data}}

出力形式: ステージの要約
`,
};

// =============================================================================
// WidgetSummarizationService
// =============================================================================

/**
 * WidgetSummarizationService
 *
 * Widget操作の言語化サービス
 */
export class WidgetSummarizationService {
  private llmOrchestrator: LLMOrchestrator;
  private debug: boolean;

  constructor(llmOrchestrator: LLMOrchestrator, options?: { debug?: boolean }) {
    this.llmOrchestrator = llmOrchestrator;
    this.debug = options?.debug ?? false;
  }

  /**
   * 単一Widgetの操作を言語化
   */
  async summarizeWidgetInteraction(widgetState: WidgetState): Promise<WidgetSummary> {
    const startTime = Date.now();

    try {
      // Widget定義を取得
      const definition = getWidgetDefinitionV4(widgetState.component);

      // プロンプトを構築
      const prompt = this.buildPrompt(widgetState, definition);

      if (this.debug) {
        console.log(`[WidgetSummarizationService] Summarizing ${widgetState.component}:`, prompt);
      }

      // LLM呼び出し
      const result = await this.llmOrchestrator.execute<string>('summary_generation', prompt);

      const latencyMs = Date.now() - startTime;

      if (!result.success) {
        return {
          widgetId: widgetState.widgetId,
          component: widgetState.component,
          summary: this.fallbackSummary(widgetState),
          success: false,
          error: result.error,
          latencyMs,
        };
      }

      return {
        widgetId: widgetState.widgetId,
        component: widgetState.component,
        summary: result.data || this.fallbackSummary(widgetState),
        success: true,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        widgetId: widgetState.widgetId,
        component: widgetState.component,
        summary: this.fallbackSummary(widgetState),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
      };
    }
  }

  /**
   * 複数Widgetの操作を一括言語化
   */
  async summarizeBatch(input: BatchSummarizationInput): Promise<BatchSummarizationResult> {
    const startTime = Date.now();
    const summaries: WidgetSummary[] = [];

    // 並列処理
    const promises = input.widgetStates.map((state) => this.summarizeWidgetInteraction(state));
    const results = await Promise.all(promises);

    summaries.push(...results);

    const totalLatencyMs = Date.now() - startTime;

    return {
      summaries,
      totalLatencyMs,
    };
  }

  /**
   * 同期的なフォールバック要約（LLM無し）
   */
  generateFallbackSummary(widgetState: WidgetState): WidgetSummary {
    return {
      widgetId: widgetState.widgetId,
      component: widgetState.component,
      summary: this.fallbackSummary(widgetState),
      success: true,
    };
  }

  /**
   * ステージ全体のサマリーを生成
   */
  async summarizeStage(
    stage: string,
    widgetSummaries: WidgetSummary[],
    concernText?: string
  ): Promise<string> {
    if (widgetSummaries.length === 0) {
      return '';
    }

    const combinedSummary = widgetSummaries.map((s) => `- ${s.summary}`).join('\n');

    const prompt = `
以下は「${stage}」ステージでのユーザーの思考整理内容です。
全体を通した要約を1-2段落で生成してください。

${concernText ? `ユーザーの悩み: ${concernText}\n` : ''}
Widget操作の内容:
${combinedSummary}

出力: ステージ全体の要約（日本語）
`;

    try {
      const result = await this.llmOrchestrator.execute<string>('summary_generation', prompt);
      return result.success ? result.data || combinedSummary : combinedSummary;
    } catch {
      return combinedSummary;
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * プロンプトを構築
   */
  private buildPrompt(widgetState: WidgetState, definition?: WidgetDefinitionV4): string {
    // Widget定義のsummarizationPromptを使用
    if (definition?.summarizationPrompt) {
      return definition.summarizationPrompt.replace('{{data}}', JSON.stringify(widgetState.outputs, null, 2));
    }

    // デフォルトプロンプトを使用
    const defaultPrompt = SUMMARIZATION_PROMPTS[widgetState.component];
    if (defaultPrompt) {
      return defaultPrompt.replace('{{data}}', JSON.stringify(widgetState.outputs, null, 2));
    }

    // 汎用プロンプト
    return `
以下のWidget操作データを自然な日本語で要約してください。

Widget: ${widgetState.component}
データ:
${JSON.stringify(widgetState.outputs, null, 2)}

出力: 簡潔な要約
`;
  }

  /**
   * フォールバック要約を生成（LLM無し）
   */
  private fallbackSummary(widgetState: WidgetState): string {
    const outputs = widgetState.outputs;

    switch (widgetState.component) {
      case 'emotion_palette':
        return this.summarizeEmotionPalette(outputs);
      case 'brainstorm_cards':
        return this.summarizeBrainstormCards(outputs);
      case 'card_sorting':
        return this.summarizeCardSorting(outputs);
      case 'priority_slider_grid':
        return this.summarizePrioritySlider(outputs);
      case 'free_writing':
        return this.summarizeFreeWriting(outputs);
      default:
        return this.summarizeGeneric(outputs);
    }
  }

  private summarizeEmotionPalette(outputs: Record<string, unknown>): string {
    const emotions = outputs.emotions || outputs.selectedEmotions;
    if (!Array.isArray(emotions)) return '感情が選択されました';

    const emotionList = emotions
      .map((e: { name?: string; label?: string; intensity?: number }) => {
        const name = e.name || e.label || '不明';
        const intensity = e.intensity ? ` (${e.intensity}%)` : '';
        return `${name}${intensity}`;
      })
      .join('、');

    return `選択された感情: ${emotionList}`;
  }

  private summarizeBrainstormCards(outputs: Record<string, unknown>): string {
    const cards = outputs.cards || outputs.items;
    if (!Array.isArray(cards)) return 'カードが作成されました';

    const cardTexts = cards
      .slice(0, 5)
      .map((c: { text?: string; content?: string }) => c.text || c.content || '')
      .filter(Boolean);

    if (cardTexts.length === 0) return 'カードが作成されました';

    const suffix = cards.length > 5 ? `...他${cards.length - 5}件` : '';
    return `作成されたアイデア:\n${cardTexts.map((t: string) => `- ${t}`).join('\n')}${suffix}`;
  }

  private summarizeCardSorting(outputs: Record<string, unknown>): string {
    const categories = outputs.categories || outputs.groups;
    if (!categories || typeof categories !== 'object') return 'カードが分類されました';

    const categoryList = Object.entries(categories as Record<string, unknown[]>)
      .map(([cat, items]) => `【${cat}】: ${Array.isArray(items) ? items.length : 0}件`)
      .join('\n');

    return `カテゴリ分類:\n${categoryList}`;
  }

  private summarizePrioritySlider(outputs: Record<string, unknown>): string {
    const items = outputs.items || outputs.priorities;
    if (!Array.isArray(items)) return '優先度が設定されました';

    const sorted = [...items].sort(
      (a: { priority?: number; value?: number }, b: { priority?: number; value?: number }) =>
        (b.priority || b.value || 0) - (a.priority || a.value || 0)
    );

    const topItems = sorted.slice(0, 3).map((item: { label?: string; name?: string; priority?: number; value?: number }) => {
      const name = item.label || item.name || '項目';
      const priority = item.priority || item.value || 0;
      return `${name}: ${priority}`;
    });

    return `優先度（上位）:\n${topItems.map((t: string) => `- ${t}`).join('\n')}`;
  }

  private summarizeFreeWriting(outputs: Record<string, unknown>): string {
    const text = outputs.text || outputs.content;
    if (typeof text !== 'string') return '自由記述が入力されました';

    const truncated = text.length > 100 ? text.slice(0, 100) + '...' : text;
    return `記述内容: ${truncated}`;
  }

  private summarizeGeneric(outputs: Record<string, unknown>): string {
    const keys = Object.keys(outputs);
    if (keys.length === 0) return '操作が完了しました';

    return `入力データ: ${keys.join(', ')}`;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * WidgetSummarizationServiceインスタンスを作成
 */
export function createWidgetSummarizationService(
  llmOrchestrator: LLMOrchestrator,
  options?: { debug?: boolean }
): WidgetSummarizationService {
  return new WidgetSummarizationService(llmOrchestrator, options);
}
