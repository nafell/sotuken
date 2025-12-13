/**
 * metrics.types.ts
 * LLMメトリクス（トークン使用量・レスポンス時間）の型定義
 *
 * Phase 4 Day 3-4: 計測機能実装
 */

/**
 * LLMAPIメトリクス - 単一API呼び出しの計測データ
 */
export interface LLMMetrics {
  /** リクエスト固有ID */
  requestId: string;
  /** タイムスタンプ (ISO 8601) */
  timestamp: string;
  /** 使用モデル名 */
  model: string;
  /** プロンプトトークン数 */
  promptTokens: number;
  /** レスポンストークン数 */
  responseTokens: number;
  /** 総トークン数 */
  totalTokens: number;
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
  /** ステージ (diverge/organize/converge/summary) */
  stage?: string;
  /** 入力テキストの長さ */
  inputTextLength?: number;
  /** 成功フラグ */
  success: boolean;
  /** バリデーション成功フラグ */
  validationPassed?: boolean;
  /** リトライ回数 */
  retryCount?: number;
  /** エラーメッセージ */
  error?: string;
}

/**
 * GeminiResponseメトリクス - GeminiResponse型に追加するメトリクスフィールド
 */
export interface GeminiResponseMetrics {
  /** プロンプトトークン数 */
  promptTokens: number;
  /** レスポンストークン数 */
  responseTokens: number;
  /** 総トークン数 */
  totalTokens: number;
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
  /** model-router使用時に選択された実際のモデル名 */
  selectedModel?: string;
}

/**
 * MetricsSummary - セッション単位のサマリー
 */
export interface MetricsSummary {
  /** セッションID */
  sessionId: string;
  /** 総リクエスト数 */
  totalRequests: number;
  /** 成功リクエスト数 */
  successfulRequests: number;
  /** 総プロンプトトークン */
  totalPromptTokens: number;
  /** 総レスポンストークン */
  totalResponseTokens: number;
  /** 総トークン数 */
  totalTokens: number;
  /** 平均処理時間 */
  avgProcessingTimeMs: number;
  /** 最大処理時間 */
  maxProcessingTimeMs: number;
  /** 最小処理時間 */
  minProcessingTimeMs: number;
  /** サマリー作成時刻 */
  generatedAt: string;
}
