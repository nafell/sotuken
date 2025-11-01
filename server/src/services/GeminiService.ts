/**
 * Gemini API サービス
 * Google Generative AI (Gemini 2.5) との統合
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini API レスポンス型
 */
export interface GeminiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Gemini サービスクラス
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  /**
   * コンストラクタ
   * @param apiKey Gemini API キー
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    // gemini-2.5-flash-lite を使用
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  }

  /**
   * JSON形式のレスポンスを生成
   * @param prompt プロンプト文字列
   * @returns JSON形式のレスポンス
   */
  async generateJSON(prompt: string): Promise<GeminiResponse> {
    try {
      // JSON形式での応答を要求
      const fullPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting, explanations, or text outside the JSON structure.`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      console.log('🔍 GeminiService generateJSON response:', response);
      const text = response.text();

      // JSONをパース
      let jsonData;
      try {
        // マークダウンのコードブロックを削除
        const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        jsonData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Raw response:", text);
        return {
          success: false,
          error: `Failed to parse JSON response: ${parseError}`
        };
      }

      return {
        success: true,
        data: jsonData
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * テキスト形式のレスポンスを生成
   * @param prompt プロンプト文字列
   * @returns テキストレスポンス
   */
  async generateText(prompt: string): Promise<GeminiResponse> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        data: text
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

/**
 * デフォルトのGeminiServiceインスタンスを作成
 * 環境変数からAPIキーを取得
 */
export function createGeminiService(): GeminiService {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  return new GeminiService(apiKey);
}


