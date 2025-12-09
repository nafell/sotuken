/**
 * Azure OpenAI API サービス
 * OpenAI SDK経由でAzure OpenAI Serviceにアクセス
 *
 * APIキー認証を使用（Entra IDではない）
 * 対応モデル: GPT-5.1 Global, GPT-5.1-codex Global, GPT-5.1-codex-mini Global
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

/** デフォルトAPIバージョン */
export const DEFAULT_API_VERSION = "2024-12-01-preview";

/** 利用可能なモデルID一覧 */
export const AZURE_AVAILABLE_MODELS = [
  "gpt-51-global",
  "gpt-51-codex-global",
  "gpt-51-codex-mini-global",
  "model-router",
  "gpt-4.1-mini"
] as const;

export type AzureModelId = typeof AZURE_AVAILABLE_MODELS[number];

/**
 * モデルIDに応じたAzure OpenAI接続設定を取得
 * @param modelId 使用するモデルID
 * @returns エンドポイント、APIキー、デプロイメント名
 */
function getAzureConfig(modelId: string): { endpoint: string; apiKey: string; deploymentName: string } {
  // GPT-4.1 Mini用の専用エンドポイント
  if (modelId === "gpt-4.1-mini") {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT_GPT4_1_MINI;
    const apiKey = process.env.AZURE_OPENAI_API_KEY_GPT4_1_MINI;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_GPT4_1_MINI;

    if (!endpoint) {
      throw new Error("AZURE_OPENAI_ENDPOINT_GPT4_1_MINI environment variable is not set");
    }
    if (!apiKey) {
      throw new Error("AZURE_OPENAI_API_KEY_GPT4_1_MINI environment variable is not set");
    }
    if (!deploymentName) {
      throw new Error("AZURE_OPENAI_DEPLOYMENT_GPT4_1_MINI environment variable is not set");
    }

    return { endpoint, apiKey, deploymentName };
  }

  // デフォルト: モデルルーター経由
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_MODEL_ROUTER;

  if (!endpoint) {
    throw new Error("AZURE_OPENAI_ENDPOINT environment variable is not set");
  }
  if (!apiKey) {
    throw new Error("AZURE_OPENAI_API_KEY environment variable is not set");
  }
  if (!deploymentName) {
    throw new Error("AZURE_OPENAI_DEPLOYMENT_MODEL_ROUTER environment variable is not set");
  }

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

    // OpenAI SDKをAzure用に設定
    this.client = new OpenAI({
      apiKey,
      baseURL: `${endpoint.replace(/\/$/, '')}/openai/deployments/${this.deploymentName}`,
      defaultQuery: { 'api-version': apiVersion || DEFAULT_API_VERSION },
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

    try {
      // JSON形式での応答を要求
      const fullPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting, explanations, or text outside the JSON structure.`;

      const result = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        response_format: { type: "json_object" },
      });

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
      console.error("Azure OpenAI API error:", error);
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

    return {
      promptTokens,
      responseTokens,
      totalTokens,
      processingTimeMs: endTime - startTime
    };
  }

  /**
   * テキスト形式のレスポンスを生成（計測機能付き）
   * @param prompt プロンプト文字列
   * @returns テキストレスポンス（計測データ含む）
   */
  async generateText(prompt: string): Promise<AzureOpenAIResponse> {
    const startTime = Date.now();

    try {
      const result = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

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
      console.error("Azure OpenAI API error:", error);
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
