/**
 * Experiment Statistics Service
 *
 * Layer1/Layer4自動評価実験の統計集計サービス。
 * 設計書の評価指標を算出。
 *
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { db } from '../database/index';
import { batchExecutions, experimentTrialLogs } from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import type {
  Layer1Metrics,
  Layer4Metrics,
  ModelStatistics,
  BatchResultsSummary,
  TOKEN_PRICES,
  USD_TO_JPY,
} from '../types/experiment-trial.types';

// ========================================
// Token Pricing (2025年12月時点の概算)
// ========================================

const TOKEN_PRICES_DATA: Record<string, { input: number; output: number }> = {
  'gpt-5-chat': { input: 0.015, output: 0.060 },
  'gpt-5-mini': { input: 0.0015, output: 0.006 },
  'gpt-4.1': { input: 0.010, output: 0.030 },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
  'model-router': { input: 0.010, output: 0.030 },
};

const USD_TO_JPY_RATE = 150;

// ========================================
// Types
// ========================================

interface TrialLogRecord {
  id: string;
  experimentId: string;
  batchId: string;
  trialNumber: number;
  inputId: string;
  modelConfig: string;
  modelRouterSelection: unknown;
  stage: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  dslErrors: unknown;
  renderErrors: unknown;
  typeErrorCount: number;
  referenceErrorCount: number;
  cycleDetected: boolean;
  regenerated: boolean;
  runtimeError: boolean;
  timestamp: Date | string | null;
}

// ========================================
// Statistics Calculation
// ========================================

/**
 * Layer1指標を計算
 */
function calculateLayer1Metrics(logs: TrialLogRecord[]): Layer1Metrics {
  if (logs.length === 0) {
    return { VR: 0, TCR: 0, RRR: 0, CDR: 0, RGR: 0 };
  }

  const total = logs.length;

  // VR: DSL妥当率 = dsl_errors=null && render_errors=null の割合
  const validCount = logs.filter(
    log => log.dslErrors === null && log.renderErrors === null
  ).length;
  const VR = validCount / total;

  // TCR: 型整合率 = type_error_count=0 の割合
  const typeValidCount = logs.filter(log => log.typeErrorCount === 0).length;
  const TCR = typeValidCount / total;

  // RRR: 参照整合率 = reference_error_count=0 の割合
  const refValidCount = logs.filter(log => log.referenceErrorCount === 0).length;
  const RRR = refValidCount / total;

  // CDR: 循環依存率 = cycle_detected=true の割合
  const cycleCount = logs.filter(log => log.cycleDetected).length;
  const CDR = cycleCount / total;

  // RGR: 再生成率 = regenerated=true の割合
  const regeneratedCount = logs.filter(log => log.regenerated).length;
  const RGR = regeneratedCount / total;

  return {
    VR: Math.round(VR * 10000) / 10000,
    TCR: Math.round(TCR * 10000) / 10000,
    RRR: Math.round(RRR * 10000) / 10000,
    CDR: Math.round(CDR * 10000) / 10000,
    RGR: Math.round(RGR * 10000) / 10000,
  };
}

/**
 * Layer4指標を計算
 */
function calculateLayer4Metrics(
  logs: TrialLogRecord[],
  modelConfig?: string
): Layer4Metrics {
  if (logs.length === 0) {
    return { LAT: 0, COST: 0, FR: 0 };
  }

  const total = logs.length;

  // LAT: 平均レイテンシ (ms)
  const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
  const LAT = Math.round(totalLatency / total);

  // COST: 推定APIコスト (JPY)
  let totalCostUSD = 0;
  for (const log of logs) {
    // モデル別の単価を取得
    const modelId = getModelIdFromConfig(modelConfig ?? log.modelConfig, log.stage);
    const prices = TOKEN_PRICES_DATA[modelId] ?? TOKEN_PRICES_DATA['model-router'];

    const inputCost = (log.inputTokens / 1000) * prices.input;
    const outputCost = (log.outputTokens / 1000) * prices.output;
    totalCostUSD += inputCost + outputCost;
  }
  const COST = Math.round(totalCostUSD * USD_TO_JPY_RATE * 100) / 100;

  // FR: 異常終了率 = runtime_error=true の割合
  const runtimeErrorCount = logs.filter(log => log.runtimeError).length;
  const FR = Math.round((runtimeErrorCount / total) * 10000) / 10000;

  return { LAT, COST, FR };
}

/**
 * モデル構成からステージごとのモデルIDを取得
 */
function getModelIdFromConfig(modelConfig: string, stage: number): string {
  const configs: Record<string, string[]> = {
    'A': ['gpt-5-chat', 'gpt-5-chat', 'gpt-5-chat'],
    'B': ['gpt-5-mini', 'gpt-5-mini', 'gpt-5-mini'],
    'C': ['gpt-5-chat', 'gpt-4.1', 'gpt-4.1'],
    'D': ['gpt-5-chat', 'gpt-5-mini', 'gpt-5-mini'],
    'E': ['model-router', 'model-router', 'model-router'],
    'All-5-Chat': ['gpt-5-chat', 'gpt-5-chat', 'gpt-5-chat'],
    'All-5-mini': ['gpt-5-mini', 'gpt-5-mini', 'gpt-5-mini'],
    'Hybrid-5Chat/4.1': ['gpt-5-chat', 'gpt-4.1', 'gpt-4.1'],
    'Hybrid-5Chat/5mini': ['gpt-5-chat', 'gpt-5-mini', 'gpt-5-mini'],
    'Router-based': ['model-router', 'model-router', 'model-router'],
  };

  const models = configs[modelConfig];
  if (!models) {
    return 'model-router'; // フォールバック
  }

  return models[stage - 1] ?? models[0];
}

// ========================================
// Service Implementation
// ========================================

export class ExperimentStatisticsService {
  /**
   * バッチの統計サマリーを計算
   */
  async calculateBatchStatistics(batchId: string): Promise<BatchResultsSummary | null> {
    // バッチ情報を取得
    const [batch] = await db
      .select()
      .from(batchExecutions)
      .where(eq(batchExecutions.id, batchId));

    if (!batch) {
      return null;
    }

    // 試行ログを取得
    const trialLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(eq(experimentTrialLogs.batchId, batchId));

    if (trialLogs.length === 0) {
      return null;
    }

    // モデル構成別に統計を計算
    const modelConfigs = [...new Set(trialLogs.map(log => log.modelConfig))];
    const byModel: ModelStatistics[] = [];

    for (const config of modelConfigs) {
      const configLogs = trialLogs.filter(log => log.modelConfig === config);
      byModel.push({
        modelConfig: config,
        trialCount: configLogs.length,
        layer1: calculateLayer1Metrics(configLogs as TrialLogRecord[]),
        layer4: calculateLayer4Metrics(configLogs as TrialLogRecord[], config),
      });
    }

    // 全体統計を計算
    const overall = {
      layer1: calculateLayer1Metrics(trialLogs as TrialLogRecord[]),
      layer4: calculateLayer4Metrics(trialLogs as TrialLogRecord[]),
    };

    // 実行時間を計算
    const startedAt = batch.startedAt ? new Date(batch.startedAt).toISOString() : '';
    const completedAt = batch.completedAt ? new Date(batch.completedAt).toISOString() : '';
    const totalDurationMs = batch.startedAt && batch.completedAt
      ? new Date(batch.completedAt).getTime() - new Date(batch.startedAt).getTime()
      : 0;

    const summary: BatchResultsSummary = {
      batchId,
      experimentId: batch.experimentId,
      totalTrials: batch.totalTrials,
      completedTrials: batch.completedTrials,
      failedTrials: batch.failedTrials,
      byModel,
      overall,
      startedAt,
      completedAt,
      totalDurationMs,
    };

    // 結果をDBに保存
    await db
      .update(batchExecutions)
      .set({
        layer1Results: overall.layer1,
        layer4Results: overall.layer4,
      })
      .where(eq(batchExecutions.id, batchId));

    return summary;
  }

  /**
   * モデル構成別の詳細統計を取得
   */
  async getModelStatistics(
    batchId: string,
    modelConfig: string
  ): Promise<ModelStatistics | null> {
    const trialLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(
        and(
          eq(experimentTrialLogs.batchId, batchId),
          eq(experimentTrialLogs.modelConfig, modelConfig)
        )
      );

    if (trialLogs.length === 0) {
      return null;
    }

    return {
      modelConfig,
      trialCount: trialLogs.length,
      layer1: calculateLayer1Metrics(trialLogs as TrialLogRecord[]),
      layer4: calculateLayer4Metrics(trialLogs as TrialLogRecord[], modelConfig),
    };
  }

  /**
   * ステージ別の統計を取得
   */
  async getStageStatistics(
    batchId: string,
    stage: number
  ): Promise<{ layer1: Layer1Metrics; layer4: Layer4Metrics; count: number } | null> {
    const trialLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(
        and(
          eq(experimentTrialLogs.batchId, batchId),
          eq(experimentTrialLogs.stage, stage)
        )
      );

    if (trialLogs.length === 0) {
      return null;
    }

    return {
      layer1: calculateLayer1Metrics(trialLogs as TrialLogRecord[]),
      layer4: calculateLayer4Metrics(trialLogs as TrialLogRecord[]),
      count: trialLogs.length,
    };
  }

  /**
   * 論文用テーブルデータを生成
   */
  async generatePaperTableData(batchId: string): Promise<{
    layer1Table: Array<{ model: string; VR: string; TCR: string; RRR: string; CDR: string; RGR: string }>;
    layer4Table: Array<{ model: string; LAT: string; COST: string; FR: string }>;
  } | null> {
    const summary = await this.calculateBatchStatistics(batchId);
    if (!summary) {
      return null;
    }

    const layer1Table = summary.byModel.map(m => ({
      model: m.modelConfig,
      VR: `${(m.layer1.VR * 100).toFixed(1)}%`,
      TCR: `${(m.layer1.TCR * 100).toFixed(1)}%`,
      RRR: `${(m.layer1.RRR * 100).toFixed(1)}%`,
      CDR: `${(m.layer1.CDR * 100).toFixed(1)}%`,
      RGR: `${(m.layer1.RGR * 100).toFixed(1)}%`,
    }));

    const layer4Table = summary.byModel.map(m => ({
      model: m.modelConfig,
      LAT: `${m.layer4.LAT}`,
      COST: `${m.layer4.COST.toFixed(2)}`,
      FR: `${(m.layer4.FR * 100).toFixed(1)}%`,
    }));

    return { layer1Table, layer4Table };
  }

  /**
   * エラー分布を取得
   */
  async getErrorDistribution(batchId: string): Promise<{
    dslErrors: Record<string, number>;
    renderErrors: Record<string, number>;
  } | null> {
    const trialLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(eq(experimentTrialLogs.batchId, batchId));

    if (trialLogs.length === 0) {
      return null;
    }

    const dslErrors: Record<string, number> = {};
    const renderErrors: Record<string, number> = {};

    for (const log of trialLogs) {
      // DSLエラー集計
      if (log.dslErrors && Array.isArray(log.dslErrors)) {
        for (const error of log.dslErrors as string[]) {
          dslErrors[error] = (dslErrors[error] ?? 0) + 1;
        }
      }

      // レンダーエラー集計
      if (log.renderErrors && Array.isArray(log.renderErrors)) {
        for (const error of log.renderErrors as string[]) {
          renderErrors[error] = (renderErrors[error] ?? 0) + 1;
        }
      }
    }

    return { dslErrors, renderErrors };
  }
}

// ========================================
// Factory Functions
// ========================================

let serviceInstance: ExperimentStatisticsService | null = null;

/**
 * ExperimentStatisticsServiceインスタンスを取得
 */
export function getExperimentStatisticsService(): ExperimentStatisticsService {
  if (!serviceInstance) {
    serviceInstance = new ExperimentStatisticsService();
  }
  return serviceInstance;
}

/**
 * バッチ統計を計算（便利関数）
 */
export async function calculateBatchStatistics(batchId: string): Promise<BatchResultsSummary | null> {
  return getExperimentStatisticsService().calculateBatchStatistics(batchId);
}

/**
 * 論文用テーブルデータを生成（便利関数）
 */
export async function generatePaperTableData(batchId: string) {
  return getExperimentStatisticsService().generatePaperTableData(batchId);
}
