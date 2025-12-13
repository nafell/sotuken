/**
 * Azure OpenAI API サービス
 * OpenAI SDK経由でAzure OpenAI Serviceにアクセス
 *
 * APIキー認証を使用（Entra IDではない）
 * 対応モデル: GPT-4.1, GPT-4.1 Mini, GPT-5 Chat, GPT-5 Mini, Model Router
 */

import OpenAI from "openai";
import type { GeminiResponseMetrics } from "../types/metrics.types";

/**
 * Azure OpenAI API レスポンス型（計測データ付き）
 * GeminiServiceと同じインターフェースを維持
 */
export interface AzureOpenAIResponse {
  success: boolean;
  data?: any;
  error?: string;
  /** 計測データ */
  metrics?: GeminiResponseMetrics;
}

/** デフォルトAPIバージョン（GPT-4.1系） */
export const DEFAULT_API_VERSION = "2024-12-01-preview";

/** GPT-5-chat用APIバージョン（Responses API） */
export const GPT5_RESPONSES_API_VERSION = "2025-04-01-preview";

/** GPT-5-mini用APIバージョン（Chat Completions API + reasoning_effort） */
export const GPT5_MINI_API_VERSION = "2025-03-01-preview";

/**
 * Responses APIを使用するモデルかどうかを判定
 * GPT-5-chatのみResponses APIを使用（推論機能を活用）
 */
function useResponsesApi(modelId: string): boolean {
  return modelId === "gpt-5-chat";
}

/**
 * GPT-5-miniかどうかを判定
 * Chat Completions API + reasoning_effort="minimal" を使用
 */
function isGpt5Mini(modelId: string): boolean {
  return modelId === "gpt-5-mini";
}

/** 利用可能なモデルID一覧 */
export const AZURE_AVAILABLE_MODELS = [
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-5-chat",
  "gpt-5-mini",
  "model-router"
] as const;

export type AzureModelId = typeof AZURE_AVAILABLE_MODELS[number];

/**
 * モデルIDからデプロイメント名の環境変数キーへのマッピング
 */
const MODEL_TO_DEPLOYMENT_ENV: Record<string, string> = {
  "gpt-4.1": "AZURE_OPENAI_DEPLOYMENT_GPT4_1_VANILLA",
  "gpt-4.1-mini": "AZURE_OPENAI_DEPLOYMENT_GPT4_1_MINI",
  "gpt-5-chat": "AZURE_OPENAI_DEPLOYMENT_GPT5_CHAT",
  "gpt-5-mini": "AZURE_OPENAI_DEPLOYMENT_GPT5_MINI",
  "model-router": "AZURE_OPENAI_DEPLOYMENT_MODEL_ROUTER",
};

/**
 * モデルIDに応じたAzure OpenAI接続設定を取得
 * 全モデル共通のエンドポイント・APIキーを使用
 * @param modelId 使用するモデルID
 * @returns エンドポイント、APIキー、デプロイメント名
 */
function getAzureConfig(modelId: string): { endpoint: string; apiKey: string; deploymentName: string } {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!endpoint) {
    throw new Error("AZURE_OPENAI_ENDPOINT environment variable is not set");
  }
  if (!apiKey) {
    throw new Error("AZURE_OPENAI_API_KEY environment variable is not set");
  }

  // モデルIDに対応するデプロイメント名の環境変数を取得
  const deploymentEnvKey = MODEL_TO_DEPLOYMENT_ENV[modelId];
  if (!deploymentEnvKey) {
    throw new Error(`Unknown model ID: ${modelId}. Available models: ${AZURE_AVAILABLE_MODELS.join(", ")}`);
  }

  const deploymentName = process.env[deploymentEnvKey];
  if (!deploymentName) {
    throw new Error(`${deploymentEnvKey} environment variable is not set`);
  }

  // デバッグ: モデルIDと環境変数の対応を出力
  console.log(`🔍 getAzureConfig: modelId="${modelId}" -> envKey="${deploymentEnvKey}" -> deploymentName="${deploymentName}"`);

  return { endpoint, apiKey, deploymentName };
}

/**
 * Azure OpenAI サービスクラス
 * OpenAI SDKを使用してAzure OpenAIにアクセス
 */
export class AzureOpenAIService {
  private client: OpenAI;
  private deploymentName: string;
  private modelId: string;
  private baseURL: string;
  private apiVersion: string;
  private useResponsesApi: boolean;
  private isGpt5Mini: boolean;

  /**
   * コンストラクタ
   * @param endpoint Azure OpenAI エンドポイントURL
   * @param apiKey Azure OpenAI APIキー
   * @param modelId 使用するモデルID
   * @param deploymentName デプロイメント名
   * @param apiVersion APIバージョン（省略時はデフォルト）
   */
  constructor(
    endpoint: string,
    apiKey: string,
    modelId: string,
    deploymentName: string,
    apiVersion?: string
  ) {
    if (!endpoint) {
      throw new Error("AZURE_OPENAI_ENDPOINT is required");
    }
    if (!apiKey) {
      throw new Error("AZURE_OPENAI_API_KEY is required");
    }
    if (!deploymentName) {
      throw new Error("deploymentName is required");
    }

    this.modelId = modelId;
    this.deploymentName = deploymentName;

    // モデル種別を判定
    this.useResponsesApi = useResponsesApi(modelId);  // GPT-5-chatのみtrue
    this.isGpt5Mini = isGpt5Mini(modelId);            // GPT-5-miniのみtrue

    // APIバージョンを決定
    // - GPT-5-chat: Responses API用バージョン
    // - GPT-5-mini: Chat Completions API + reasoning_effort用バージョン
    // - その他: デフォルトバージョン
    if (apiVersion) {
      this.apiVersion = apiVersion;
    } else if (this.useResponsesApi) {
      this.apiVersion = GPT5_RESPONSES_API_VERSION;
    } else if (this.isGpt5Mini) {
      this.apiVersion = GPT5_MINI_API_VERSION;
    } else {
      this.apiVersion = DEFAULT_API_VERSION;
    }

    // エンドポイントのベースを正規化（末尾のスラッシュを除去）
    const normalizedEndpoint = endpoint.replace(/\/$/, '');

    // URLを構築
    // GPT-5系: /openai/responses エンドポイントを使用
    // その他: /openai/deployments/{deploymentName} エンドポイントを使用
    if (this.useResponsesApi) {
      this.baseURL = `${normalizedEndpoint}/openai`;
    } else {
      this.baseURL = `${normalizedEndpoint}/openai/deployments/${this.deploymentName}`;
    }

    // デバッグログ出力
    console.log('🔧 AzureOpenAIService initialization:');
    console.log(`   Model ID: ${this.modelId}`);
    console.log(`   Deployment Name: ${this.deploymentName}`);
    console.log(`   Base URL: ${this.baseURL}`);
    console.log(`   API Version: ${this.apiVersion}`);
    console.log(`   Use Responses API: ${this.useResponsesApi}`);
    console.log(`   Is GPT-5-mini: ${this.isGpt5Mini}`);

    // OpenAI SDKをAzure用に設定
    this.client = new OpenAI({
      apiKey,
      baseURL: this.baseURL,
      defaultQuery: { 'api-version': this.apiVersion },
      defaultHeaders: { 'api-key': apiKey },
    });
  }

  /**
   * JSON形式のレスポンスを生成（計測機能付き）
   * @param prompt プロンプト文字列
   * @returns JSON形式のレスポンス（計測データ含む）
   */
  async generateJSON(prompt: string): Promise<AzureOpenAIResponse> {
    const startTime = Date.now();

    // リクエスト情報をログ出力
    const expectedUrl = this.useResponsesApi
      ? `${this.baseURL}/responses?api-version=${this.apiVersion}`
      : `${this.baseURL}/chat/completions?api-version=${this.apiVersion}`;
    console.log('🌐 AzureOpenAI generateJSON request:');
    console.log(`   Expected URL: ${expectedUrl}`);
    console.log(`   Model: ${this.modelId}`);
    console.log(`   Deployment: ${this.deploymentName}`);

    try {
      // JSON形式での応答を要求
      const fullPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting, explanations, or text outside the JSON structure.`;

      let result: OpenAI.Chat.Completions.ChatCompletion;

      if (this.useResponsesApi) {
        // GPT-5-chat: Responses API を使用
        // 注意: Azure OpenAI Responses APIでは reasoning パラメータは非対応
        console.log('   Using Responses API for GPT-5-chat model');
        const responsesResult = await (this.client as any).responses.create({
          model: this.deploymentName,
          input: fullPrompt,
          text: {
            format: { type: "json_object" }
          }
        });

        // デバッグ: Responses APIの生レスポンスをログ出力
        console.log('   📊 Responses API raw usage:', JSON.stringify(responsesResult.usage, null, 2));

        // Responses API の結果を Chat Completions 形式に変換
        // 注意: Responses APIは input_tokens/output_tokens を返す（Chat Completions APIは prompt_tokens/completion_tokens）
        const outputText = responsesResult.output_text || "";
        const responsesUsage = responsesResult.usage || {};
        result = {
          id: responsesResult.id || "",
          object: "chat.completion",
          created: Date.now(),
          model: this.deploymentName,
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content: outputText,
              refusal: null
            },
            finish_reason: "stop",
            logprobs: null
          }],
          // Responses APIのフィールド名をChat Completions形式に変換
          usage: {
            prompt_tokens: responsesUsage.input_tokens || 0,
            completion_tokens: responsesUsage.output_tokens || 0,
            total_tokens: responsesUsage.total_tokens || 0
          }
        };
      } else if (this.isGpt5Mini) {
        // GPT-5-mini: Chat Completions API + reasoning_effort="minimal"
        console.log('   Using Chat Completions API for GPT-5-mini (reasoning_effort: minimal)');
        result = await this.client.chat.completions.create({
          model: this.deploymentName,
          messages: [
            {
              role: "user",
              content: fullPrompt,
            },
          ],
          response_format: { type: "json_object" },
          reasoning_effort: "minimal",     // 推論を最小化
          max_completion_tokens: 4096,     // 推論モデル用パラメータ
        } as any);  // reasoning_effortの型定義がない場合のため
      } else {
        // GPT-4.1系など: Chat Completions API を使用
        console.log('   Using Chat Completions API');
        result = await this.client.chat.completions.create({
          model: this.deploymentName,
          messages: [
            {
              role: "user",
              content: fullPrompt,
            },
          ],
          response_format: { type: "json_object" },
        });
      }

      const endTime = Date.now();

      // 計測データを抽出
      const metrics = this.extractMetrics(result, startTime, endTime);
      console.log('📊 AzureOpenAIService metrics:', metrics);

      const text = result.choices[0]?.message?.content || "";

      // JSONをパース
      let jsonData;
      try {
        // マークダウンのコードブロックを削除（念のため）
        const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        jsonData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Raw response:", text);
        return {
          success: false,
          error: `Failed to parse JSON response: ${parseError}`,
          metrics
        };
      }

      return {
        success: true,
        data: jsonData,
        metrics
      };
    } catch (error) {
      const endTime = Date.now();
      console.error("❌ Azure OpenAI API error:", error);
      // エラーの詳細をログ出力
      if (error instanceof Error) {
        console.error(`   Error name: ${error.name}`);
        console.error(`   Error message: ${error.message}`);
        if ('status' in error) {
          console.error(`   HTTP Status: ${(error as any).status}`);
        }
        if ('response' in error) {
          console.error(`   Response:`, (error as any).response);
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          promptTokens: 0,
          responseTokens: 0,
          totalTokens: 0,
          processingTimeMs: endTime - startTime
        }
      };
    }
  }

  /**
   * レスポンスから計測データを抽出
   * @param result OpenAI APIレスポンス
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   */
  private extractMetrics(result: OpenAI.Chat.Completions.ChatCompletion, startTime: number, endTime: number): GeminiResponseMetrics {
    const usage = result.usage || {};

    const promptTokens = usage.prompt_tokens || 0;
    const responseTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || (promptTokens + responseTokens);

    // model-router使用時: レスポンスのmodelフィールドに選択されたモデル名が含まれる
    // 例: "gpt-4.1-nano-2025-04-14", "gpt-5-chat-2025-03-27" など
    const selectedModel = this.modelId === 'model-router' ? result.model : undefined;

    return {
      promptTokens,
      responseTokens,
      totalTokens,
      processingTimeMs: endTime - startTime,
      selectedModel,
    };
  }

  /**
   * テキスト形式のレスポンスを生成（計測機能付き）
   * @param prompt プロンプト文字列
   * @returns テキストレスポンス（計測データ含む）
   */
  async generateText(prompt: string): Promise<AzureOpenAIResponse> {
    const startTime = Date.now();

    // リクエスト情報をログ出力
    const expectedUrl = this.useResponsesApi
      ? `${this.baseURL}/responses?api-version=${this.apiVersion}`
      : `${this.baseURL}/chat/completions?api-version=${this.apiVersion}`;
    console.log('🌐 AzureOpenAI generateText request:');
    console.log(`   Expected URL: ${expectedUrl}`);
    console.log(`   Model: ${this.modelId}`);
    console.log(`   Deployment: ${this.deploymentName}`);

    try {
      let result: OpenAI.Chat.Completions.ChatCompletion;

      if (this.useResponsesApi) {
        // GPT-5-chat: Responses API を使用
        // 注意: Azure OpenAI Responses APIでは reasoning パラメータは非対応
        console.log('   Using Responses API for GPT-5-chat model');
        const responsesResult = await (this.client as any).responses.create({
          model: this.deploymentName,
          input: prompt,
        });

        // デバッグ: Responses APIの生レスポンスをログ出力
        console.log('   📊 Responses API raw usage (text):', JSON.stringify(responsesResult.usage, null, 2));

        // Responses API の結果を Chat Completions 形式に変換
        // 注意: Responses APIは input_tokens/output_tokens を返す（Chat Completions APIは prompt_tokens/completion_tokens）
        const outputText = responsesResult.output_text || "";
        const responsesUsage = responsesResult.usage || {};
        result = {
          id: responsesResult.id || "",
          object: "chat.completion",
          created: Date.now(),
          model: this.deploymentName,
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content: outputText,
              refusal: null
            },
            finish_reason: "stop",
            logprobs: null
          }],
          // Responses APIのフィールド名をChat Completions形式に変換
          usage: {
            prompt_tokens: responsesUsage.input_tokens || 0,
            completion_tokens: responsesUsage.output_tokens || 0,
            total_tokens: responsesUsage.total_tokens || 0
          }
        };
      } else if (this.isGpt5Mini) {
        // GPT-5-mini: Chat Completions API + reasoning_effort="minimal"
        console.log('   Using Chat Completions API for GPT-5-mini (reasoning_effort: minimal)');
        result = await this.client.chat.completions.create({
          model: this.deploymentName,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          reasoning_effort: "minimal",     // 推論を最小化
          max_completion_tokens: 4096,     // 推論モデル用パラメータ
        } as any);  // reasoning_effortの型定義がない場合のため
      } else {
        // GPT-4.1系など: Chat Completions API を使用
        console.log('   Using Chat Completions API');
        result = await this.client.chat.completions.create({
          model: this.deploymentName,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });
      }

      const endTime = Date.now();

      // 計測データを抽出
      const metrics = this.extractMetrics(result, startTime, endTime);
      console.log('📊 AzureOpenAIService metrics (text):', metrics);

      const text = result.choices[0]?.message?.content || "";

      return {
        success: true,
        data: text,
        metrics
      };
    } catch (error) {
      const endTime = Date.now();
      console.error("❌ Azure OpenAI API error (text):", error);
      // エラーの詳細をログ出力
      if (error instanceof Error) {
        console.error(`   Error name: ${error.name}`);
        console.error(`   Error message: ${error.message}`);
        if ('status' in error) {
          console.error(`   HTTP Status: ${(error as any).status}`);
        }
        if ('response' in error) {
          console.error(`   Response:`, (error as any).response);
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          promptTokens: 0,
          responseTokens: 0,
          totalTokens: 0,
          processingTimeMs: endTime - startTime
        }
      };
    }
  }

  /**
   * 使用モデルIDを取得
   */
  getModelId(): string {
    return this.modelId;
  }

  /**
   * デプロイメント名を取得
   */
  getDeploymentName(): string {
    return this.deploymentName;
  }
}

/**
 * AzureOpenAIServiceインスタンスを作成
 * モデルIDに応じて適切な環境変数から接続設定を取得
 * @param modelId 使用するモデルID
 */
export function createAzureOpenAIService(modelId: string): AzureOpenAIService {
  const config = getAzureConfig(modelId);
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

  return new AzureOpenAIService(
    config.endpoint,
    config.apiKey,
    modelId,
    config.deploymentName,
    apiVersion
  );
}
