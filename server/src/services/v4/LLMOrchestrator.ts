/**
 * LLM Orchestrator for DSL v4
 *
 * 3段階LLM呼び出しの統合管理サービス。
 * タスク別のモデル切り替え、リトライ、メトリクス収集を担当。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @see specs/discussions/DSLv4_review_minutes.md トピック4
 * @since DSL v4.0
 */

import {
  type LLMTaskType,
  type LLMTaskConfig,
  type LLMTaskConfigMap,
  type LLMCallResult,
  type LLMCallMetrics,
  type ModelConfig,
  DEFAULT_LLM_TASK_CONFIGS,
} from '../../types/v4/llm-task.types';
import { GeminiService, createGeminiService } from '../GeminiService';

// V4プロンプトテンプレートをインポート
import {
  CAPTURE_DIAGNOSIS_PROMPT,
  WIDGET_SELECTION_PROMPT,
  ORS_GENERATION_PROMPT,
  UISPEC_GENERATION_PROMPT,
  SUMMARY_GENERATION_PROMPT,
} from '../../prompts/v4';

// =============================================================================
// LLM Service Interface
// =============================================================================

/**
 * LLMサービスインターフェース
 *
 * 異なるLLMプロバイダーを統一的に扱うためのインターフェース
 */
export interface LLMServiceInterface {
  /**
   * JSON形式のレスポンスを生成
   */
  generateJSON(prompt: string): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    metrics?: {
      promptTokens: number;
      responseTokens: number;
      totalTokens: number;
      processingTimeMs: number;
    };
  }>;

  /**
   * テキスト形式のレスポンスを生成
   */
  generateText(prompt: string): Promise<{
    success: boolean;
    data?: string;
    error?: string;
    metrics?: {
      promptTokens: number;
      responseTokens: number;
      totalTokens: number;
      processingTimeMs: number;
    };
  }>;

  /**
   * モデルIDを取得
   */
  getModelId(): string;
}

// =============================================================================
// Prompt Template Manager
// =============================================================================

/**
 * プロンプトテンプレートマネージャー
 *
 * プロンプトテンプレートの読み込みと変数置換を担当
 */
export interface PromptTemplateManager {
  /**
   * テンプレートを読み込んで変数を置換
   */
  render(templateId: string, variables: Record<string, unknown>): string;
}

/**
 * 簡易プロンプトテンプレートマネージャー（インメモリ）
 */
export class InMemoryPromptTemplateManager implements PromptTemplateManager {
  private templates: Map<string, string> = new Map();

  /**
   * テンプレートを登録
   */
  registerTemplate(templateId: string, template: string): void {
    this.templates.set(templateId, template);
  }

  /**
   * テンプレートを読み込んで変数を置換
   */
  render(templateId: string, variables: Record<string, unknown>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      result = result.split(placeholder).join(stringValue);
    }

    return result;
  }
}

// =============================================================================
// LLM Orchestrator
// =============================================================================

/**
 * LLMOrchestrator設定
 */
export interface LLMOrchestratorConfig {
  /** タスク設定マップ */
  taskConfigs?: LLMTaskConfigMap;
  /** プロンプトテンプレートマネージャー */
  promptManager?: PromptTemplateManager;
  /** メトリクスコールバック */
  onMetrics?: (metrics: LLMCallMetrics) => void;
  /** デバッグモード */
  debug?: boolean;
}

/**
 * LLM Orchestrator
 *
 * 3段階LLM呼び出しの統合管理。
 * タスク種別に応じたモデル選択、リトライ、エラーハンドリングを提供。
 */
export class LLMOrchestrator {
  private taskConfigs: LLMTaskConfigMap;
  private promptManager: PromptTemplateManager;
  private serviceCache: Map<string, LLMServiceInterface> = new Map();
  private onMetrics?: (metrics: LLMCallMetrics) => void;
  private debug: boolean;

  constructor(config: LLMOrchestratorConfig = {}) {
    this.taskConfigs = config.taskConfigs ?? DEFAULT_LLM_TASK_CONFIGS;
    this.promptManager = config.promptManager ?? new InMemoryPromptTemplateManager();
    this.onMetrics = config.onMetrics;
    this.debug = config.debug ?? false;
  }

  /**
   * LLMタスクを実行
   *
   * @param taskType タスク種別
   * @param variables プロンプト変数
   * @returns LLM呼び出し結果
   */
  async execute<T = unknown>(
    taskType: LLMTaskType,
    variables: Record<string, unknown>
  ): Promise<LLMCallResult<T>> {
    const config = this.taskConfigs[taskType];
    if (!config) {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    const startTime = Date.now();
    let retryCount = 0;
    let lastError: string | undefined;

    while (retryCount <= config.maxRetries) {
      try {
        const result = await this.executeOnce<T>(config, variables, startTime);

        // 成功時のメトリクス記録
        if (result.success && this.onMetrics) {
          this.onMetrics(result.metrics);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        retryCount++;

        if (this.debug) {
          console.log(`[LLMOrchestrator] Retry ${retryCount}/${config.maxRetries} for ${taskType}: ${lastError}`);
        }

        // リトライ前に少し待機
        if (retryCount <= config.maxRetries) {
          await this.sleep(1000 * retryCount); // 指数バックオフ的に待機時間を増加
        }
      }
    }

    // 全リトライ失敗
    const metrics: LLMCallMetrics = {
      taskType,
      modelId: config.model.modelId,
      latencyMs: Date.now() - startTime,
      retryCount,
      success: false,
      errorMessage: lastError,
      timestamp: Date.now(),
    };

    if (this.onMetrics) {
      this.onMetrics(metrics);
    }

    return {
      success: false,
      error: {
        type: 'api_error',
        message: `All retries failed: ${lastError}`,
      },
      metrics,
    };
  }

  /**
   * 1回のLLM呼び出しを実行
   */
  private async executeOnce<T>(
    config: LLMTaskConfig,
    variables: Record<string, unknown>,
    startTime: number
  ): Promise<LLMCallResult<T>> {
    const service = this.getService(config.model);
    const prompt = this.promptManager.render(config.promptTemplateId, variables);

    if (this.debug) {
      console.log(`[LLMOrchestrator] Executing ${config.taskType} with model ${config.model.modelId}`);
      console.log(`[LLMOrchestrator] Prompt length: ${prompt.length}`);
    }

    // タイムアウト付きで実行
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), config.timeout);
    });

    const generatePromise = config.outputSchema
      ? service.generateJSON(prompt)
      : service.generateText(prompt);

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    const metrics: LLMCallMetrics = {
      taskType: config.taskType,
      modelId: config.model.modelId,
      inputTokens: response.metrics?.promptTokens,
      outputTokens: response.metrics?.responseTokens,
      latencyMs,
      retryCount: 0,
      success: response.success,
      errorMessage: response.error,
      timestamp: endTime,
    };

    if (!response.success) {
      return {
        success: false,
        rawOutput: undefined,
        prompt, // 使用されたプロンプトを記録
        error: {
          type: 'api_error',
          message: response.error ?? 'Unknown error',
        },
        metrics,
      };
    }

    return {
      success: true,
      data: response.data as T,
      rawOutput: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      prompt, // 使用されたプロンプトを記録
      metrics,
    };
  }

  /**
   * モデル設定に対応するLLMサービスを取得
   */
  private getService(model: ModelConfig): LLMServiceInterface {
    const cacheKey = `${model.provider}:${model.modelId}`;

    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey)!;
    }

    let service: LLMServiceInterface;

    switch (model.provider) {
      case 'gemini':
        service = createGeminiService(model.modelId);
        break;
      case 'openai':
        // TODO: OpenAI サービスの実装
        throw new Error('OpenAI provider not yet implemented');
      case 'anthropic':
        // TODO: Anthropic サービスの実装
        throw new Error('Anthropic provider not yet implemented');
      default:
        throw new Error(`Unknown provider: ${model.provider}`);
    }

    this.serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * タスク設定を更新
   */
  updateTaskConfig(taskType: LLMTaskType, config: Partial<LLMTaskConfig>): void {
    this.taskConfigs[taskType] = {
      ...this.taskConfigs[taskType],
      ...config,
    };
  }

  /**
   * 全タスク設定を取得
   */
  getTaskConfigs(): LLMTaskConfigMap {
    return { ...this.taskConfigs };
  }

  /**
   * プロンプトテンプレートを登録
   */
  registerPromptTemplate(templateId: string, template: string): void {
    if (this.promptManager instanceof InMemoryPromptTemplateManager) {
      this.promptManager.registerTemplate(templateId, template);
    } else {
      throw new Error('Cannot register template on custom prompt manager');
    }
  }

  /**
   * サービスキャッシュをクリア
   */
  clearServiceCache(): void {
    this.serviceCache.clear();
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// ファクトリ関数
// =============================================================================

/**
 * LLMOrchestratorインスタンスを作成
 */
export function createLLMOrchestrator(config?: LLMOrchestratorConfig): LLMOrchestrator {
  return new LLMOrchestrator(config);
}

/**
 * デフォルトプロンプトテンプレート付きでLLMOrchestratorを作成
 *
 * prompts/v4/ の詳細なプロンプトテンプレートを使用
 */
export function createLLMOrchestratorWithDefaultPrompts(config?: Omit<LLMOrchestratorConfig, 'promptManager'>): LLMOrchestrator {
  const promptManager = new InMemoryPromptTemplateManager();

  // V4プロンプトテンプレートを登録（専用ファイルから読み込み）
  promptManager.registerTemplate('capture-diagnosis', CAPTURE_DIAGNOSIS_PROMPT);
  promptManager.registerTemplate('widget-selection', WIDGET_SELECTION_PROMPT);
  promptManager.registerTemplate('ors-generation', ORS_GENERATION_PROMPT);
  promptManager.registerTemplate('uispec-generation', UISPEC_GENERATION_PROMPT);
  promptManager.registerTemplate('summary-generation', SUMMARY_GENERATION_PROMPT);

  return new LLMOrchestrator({
    ...config,
    promptManager,
  });
}
