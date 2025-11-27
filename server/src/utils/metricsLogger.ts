/**
 * metricsLogger.ts
 * LLMメトリクスのロギングユーティリティ
 *
 * Phase 4 Day 3-4: 計測機能実装
 */

import type {
  LLMMetrics,
  MetricsSummary,
  GeminiResponseMetrics,
} from '../types/metrics.types';

/**
 * インメモリメトリクスストア
 * 実験中の計測データを保持
 */
class MetricsStore {
  private metrics: Map<string, LLMMetrics[]> = new Map();
  private requestCounter = 0;

  /**
   * メトリクスを追加
   */
  addMetrics(sessionId: string, metrics: LLMMetrics): void {
    if (!this.metrics.has(sessionId)) {
      this.metrics.set(sessionId, []);
    }
    this.metrics.get(sessionId)!.push(metrics);
  }

  /**
   * セッションのメトリクスを取得
   */
  getSessionMetrics(sessionId: string): LLMMetrics[] {
    return this.metrics.get(sessionId) || [];
  }

  /**
   * 全メトリクスを取得
   */
  getAllMetrics(): Map<string, LLMMetrics[]> {
    return new Map(this.metrics);
  }

  /**
   * セッションのメトリクスをクリア
   */
  clearSession(sessionId: string): void {
    this.metrics.delete(sessionId);
  }

  /**
   * 全メトリクスをクリア
   */
  clearAll(): void {
    this.metrics.clear();
  }

  /**
   * リクエストIDを生成
   */
  generateRequestId(): string {
    this.requestCounter++;
    return `req_${Date.now()}_${this.requestCounter}`;
  }
}

// シングルトンインスタンス
const metricsStore = new MetricsStore();

/**
 * メトリクスをログ出力
 */
export function logMetrics(
  sessionId: string,
  geminiMetrics: GeminiResponseMetrics,
  options: {
    model: string;
    stage?: string;
    inputTextLength?: number;
    success: boolean;
    validationPassed?: boolean;
    retryCount?: number;
    error?: string;
  }
): LLMMetrics {
  const requestId = metricsStore.generateRequestId();
  const timestamp = new Date().toISOString();

  const metrics: LLMMetrics = {
    requestId,
    timestamp,
    model: options.model,
    promptTokens: geminiMetrics.promptTokens,
    responseTokens: geminiMetrics.responseTokens,
    totalTokens: geminiMetrics.totalTokens,
    processingTimeMs: geminiMetrics.processingTimeMs,
    stage: options.stage,
    inputTextLength: options.inputTextLength,
    success: options.success,
    validationPassed: options.validationPassed,
    retryCount: options.retryCount,
    error: options.error,
  };

  // ストアに追加
  metricsStore.addMetrics(sessionId, metrics);

  // コンソールにログ出力
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 LLM Metrics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Request ID:      ${metrics.requestId}`);
  console.log(`  Session ID:      ${sessionId}`);
  console.log(`  Model:           ${metrics.model}`);
  console.log(`  Stage:           ${metrics.stage || 'N/A'}`);
  console.log('─────────────────────────────────────────────────');
  console.log(`  Prompt Tokens:   ${metrics.promptTokens}`);
  console.log(`  Response Tokens: ${metrics.responseTokens}`);
  console.log(`  Total Tokens:    ${metrics.totalTokens}`);
  console.log(`  Processing Time: ${metrics.processingTimeMs}ms`);
  console.log('─────────────────────────────────────────────────');
  console.log(`  Success:         ${metrics.success ? '✅' : '❌'}`);
  if (metrics.validationPassed !== undefined) {
    console.log(`  Validation:      ${metrics.validationPassed ? '✅' : '❌'}`);
  }
  if (metrics.retryCount !== undefined && metrics.retryCount > 0) {
    console.log(`  Retry Count:     ${metrics.retryCount}`);
  }
  if (metrics.error) {
    console.log(`  Error:           ${metrics.error}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return metrics;
}

/**
 * セッションのサマリーを取得
 */
export function getMetricsSummary(sessionId: string): MetricsSummary | null {
  const sessionMetrics = metricsStore.getSessionMetrics(sessionId);

  if (sessionMetrics.length === 0) {
    return null;
  }

  const successfulRequests = sessionMetrics.filter((m) => m.success).length;
  const processingTimes = sessionMetrics.map((m) => m.processingTimeMs);

  return {
    sessionId,
    totalRequests: sessionMetrics.length,
    successfulRequests,
    totalPromptTokens: sessionMetrics.reduce((sum, m) => sum + m.promptTokens, 0),
    totalResponseTokens: sessionMetrics.reduce(
      (sum, m) => sum + m.responseTokens,
      0
    ),
    totalTokens: sessionMetrics.reduce((sum, m) => sum + m.totalTokens, 0),
    avgProcessingTimeMs:
      processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length,
    maxProcessingTimeMs: Math.max(...processingTimes),
    minProcessingTimeMs: Math.min(...processingTimes),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * セッションのメトリクスを取得
 */
export function getSessionMetrics(sessionId: string): LLMMetrics[] {
  return metricsStore.getSessionMetrics(sessionId);
}

/**
 * セッションのメトリクスをクリア
 */
export function clearSessionMetrics(sessionId: string): void {
  metricsStore.clearSession(sessionId);
}

/**
 * 全メトリクスをクリア
 */
export function clearAllMetrics(): void {
  metricsStore.clearAll();
}

/**
 * サマリーをログ出力
 */
export function logMetricsSummary(sessionId: string): void {
  const summary = getMetricsSummary(sessionId);

  if (!summary) {
    console.log(`No metrics found for session: ${sessionId}`);
    return;
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║           📊 Metrics Summary                    ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║  Session ID:          ${summary.sessionId.padEnd(24)}║`);
  console.log('╟────────────────────────────────────────────────╢');
  console.log(`║  Total Requests:      ${String(summary.totalRequests).padEnd(24)}║`);
  console.log(`║  Successful:          ${String(summary.successfulRequests).padEnd(24)}║`);
  console.log('╟────────────────────────────────────────────────╢');
  console.log(`║  Prompt Tokens:       ${String(summary.totalPromptTokens).padEnd(24)}║`);
  console.log(`║  Response Tokens:     ${String(summary.totalResponseTokens).padEnd(24)}║`);
  console.log(`║  Total Tokens:        ${String(summary.totalTokens).padEnd(24)}║`);
  console.log('╟────────────────────────────────────────────────╢');
  console.log(`║  Avg Processing:      ${(summary.avgProcessingTimeMs.toFixed(1) + 'ms').padEnd(24)}║`);
  console.log(`║  Min Processing:      ${(summary.minProcessingTimeMs + 'ms').padEnd(24)}║`);
  console.log(`║  Max Processing:      ${(summary.maxProcessingTimeMs + 'ms').padEnd(24)}║`);
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
}
