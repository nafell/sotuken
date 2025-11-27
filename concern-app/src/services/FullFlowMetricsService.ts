/**
 * FullFlowMetricsService
 * Phase 4: Full-flow demo metrics aggregation service
 *
 * LLM呼び出しごとのメトリクスを収集・集計するサービス
 */

import type {
  StageMetrics,
  CumulativeMetrics,
  MetricsExport,
  Phase,
  PlanStage,
} from '../components/demo/full-flow/types';

class FullFlowMetricsService {
  private metricsLog: StageMetrics[] = [];
  private sessionId: string = '';
  private concernText: string = '';

  /**
   * セッション開始
   */
  startSession(sessionId: string, concernText: string): void {
    this.sessionId = sessionId;
    this.concernText = concernText;
    this.metricsLog = [];
    console.log(`📊 [Metrics] Session started: ${sessionId}`);
  }

  /**
   * メトリクスエントリを追加
   */
  addEntry(entry: Omit<StageMetrics, 'id' | 'timestamp'>): StageMetrics {
    const fullEntry: StageMetrics = {
      ...entry,
      id: `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.metricsLog.push(fullEntry);

    console.log(
      `📊 [Metrics] ${entry.phase}${entry.stage ? `/${entry.stage}` : ''}: ` +
        `${entry.totalTokens} tokens, ${entry.processingTimeMs}ms`
    );

    return fullEntry;
  }

  /**
   * APIレスポンスからメトリクスを追加
   */
  addFromApiResponse(
    phase: Phase,
    operation: string,
    response: {
      success: boolean;
      generation?: {
        model: string;
        processingTimeMs: number;
        promptTokens: number;
        responseTokens: number;
        totalTokens: number;
      };
      error?: { message: string };
    },
    stage?: PlanStage
  ): StageMetrics {
    const generation = response.generation;

    return this.addEntry({
      phase,
      stage,
      operation,
      promptTokens: generation?.promptTokens || 0,
      responseTokens: generation?.responseTokens || 0,
      totalTokens: generation?.totalTokens || 0,
      processingTimeMs: generation?.processingTimeMs || 0,
      model: generation?.model || 'unknown',
      success: response.success,
      error: response.error?.message,
    });
  }

  /**
   * 全エントリを取得
   */
  getAll(): StageMetrics[] {
    return [...this.metricsLog];
  }

  /**
   * 全エントリを取得（エイリアス）
   */
  getEntries(): StageMetrics[] {
    return this.getAll();
  }

  /**
   * フェーズ別エントリを取得
   */
  getByPhase(phase: Phase): StageMetrics[] {
    return this.metricsLog.filter((e) => e.phase === phase);
  }

  /**
   * ステージ別エントリを取得
   */
  getByStage(stage: PlanStage): StageMetrics[] {
    return this.metricsLog.filter((e) => e.stage === stage);
  }

  /**
   * 累計メトリクスを計算
   */
  getCumulative(): CumulativeMetrics {
    const entries = this.metricsLog;

    if (entries.length === 0) {
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalPromptTokens: 0,
        totalResponseTokens: 0,
        totalTokens: 0,
        totalTimeMs: 0,
        avgTimePerCall: 0,
      };
    }

    const successfulCalls = entries.filter((e) => e.success).length;
    const totalTimeMs = entries.reduce((sum, e) => sum + e.processingTimeMs, 0);

    return {
      totalCalls: entries.length,
      successfulCalls,
      failedCalls: entries.length - successfulCalls,
      totalPromptTokens: entries.reduce((sum, e) => sum + e.promptTokens, 0),
      totalResponseTokens: entries.reduce((sum, e) => sum + e.responseTokens, 0),
      totalTokens: entries.reduce((sum, e) => sum + e.totalTokens, 0),
      totalTimeMs,
      avgTimePerCall: totalTimeMs / entries.length,
    };
  }

  /**
   * フェーズ別累計を計算
   */
  getCumulativeByPhase(phase: Phase): CumulativeMetrics {
    const entries = this.metricsLog.filter((e) => e.phase === phase);

    if (entries.length === 0) {
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalPromptTokens: 0,
        totalResponseTokens: 0,
        totalTokens: 0,
        totalTimeMs: 0,
        avgTimePerCall: 0,
      };
    }

    const successfulCalls = entries.filter((e) => e.success).length;
    const totalTimeMs = entries.reduce((sum, e) => sum + e.processingTimeMs, 0);

    return {
      totalCalls: entries.length,
      successfulCalls,
      failedCalls: entries.length - successfulCalls,
      totalPromptTokens: entries.reduce((sum, e) => sum + e.promptTokens, 0),
      totalResponseTokens: entries.reduce((sum, e) => sum + e.responseTokens, 0),
      totalTokens: entries.reduce((sum, e) => sum + e.totalTokens, 0),
      totalTimeMs,
      avgTimePerCall: totalTimeMs / entries.length,
    };
  }

  /**
   * エクスポート用データを生成
   */
  export(): MetricsExport {
    return {
      sessionId: this.sessionId,
      concernText: this.concernText,
      entries: [...this.metricsLog],
      cumulative: this.getCumulative(),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * JSON形式でエクスポート
   */
  exportAsJSON(): string {
    return JSON.stringify(this.export(), null, 2);
  }

  /**
   * セッションをリセット
   */
  reset(): void {
    this.metricsLog = [];
    this.sessionId = '';
    this.concernText = '';
    console.log('📊 [Metrics] Session reset');
  }

  /**
   * 最新のエントリを取得
   */
  getLatest(): StageMetrics | null {
    if (this.metricsLog.length === 0) return null;
    return this.metricsLog[this.metricsLog.length - 1];
  }

  /**
   * コンソールにサマリーを出力
   */
  logSummary(): void {
    const cumulative = this.getCumulative();
    console.log('📊 ═══════════════════════════════════════');
    console.log('📊 METRICS SUMMARY');
    console.log('📊 ═══════════════════════════════════════');
    console.log(`📊 Session: ${this.sessionId}`);
    console.log(`📊 Total Calls: ${cumulative.totalCalls}`);
    console.log(`📊 Success Rate: ${cumulative.successfulCalls}/${cumulative.totalCalls}`);
    console.log(`📊 Total Tokens: ${cumulative.totalTokens}`);
    console.log(`📊   - Prompt: ${cumulative.totalPromptTokens}`);
    console.log(`📊   - Response: ${cumulative.totalResponseTokens}`);
    console.log(`📊 Total Time: ${cumulative.totalTimeMs}ms`);
    console.log(`📊 Avg Time/Call: ${cumulative.avgTimePerCall.toFixed(0)}ms`);
    console.log('📊 ═══════════════════════════════════════');
  }
}

// シングルトンインスタンス
export const fullFlowMetricsService = new FullFlowMetricsService();
