/**
 * Batch Experiment API Routes
 * /api/experiment/batch/* エンドポイント
 *
 * Layer1/Layer4自動評価実験のバッチ実行API
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { db } from '../database/index';
import { batchExecutions, experimentTrialLogs } from '../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
  getBatchExecutionService,
  startBatch,
  stopBatch,
  getBatchProgress,
} from '../services/BatchExecutionService';
import {
  MODEL_CONFIGURATIONS,
  TOKEN_PRICES_JPY_PER_MILLION,
  type ModelConfigId,
  type Layer1Metrics,
  type Layer4Metrics,
  type ModelStatistics,
  type ExperimentInput,
} from '../types/experiment-trial.types';
import { getStatisticalAnalysisService } from '../services/StatisticalAnalysisService';
import { exportToMarkdown, exportToCSV, exportSummaryTable } from '../services/StatisticalExportService';
import { createValidationService, validateUISpecForFrontend, getErrorSummary } from '../services/v4/ValidationService';
import { RevalidationLogger } from '../services/RevalidationLogger';
import { createExperimentOrchestrator } from '../services/ModelConfigurationService';
import { WidgetSelectionService } from '../services/v4/WidgetSelectionService';
import { ORSGeneratorService } from '../services/v4/ORSGeneratorService';
import { UISpecGeneratorV4 } from '../services/v4/UISpecGeneratorV4';
import { LLMOrchestrator } from '../services/v4/LLMOrchestrator';
import type { PlanUISpec } from '../types/v4/ui-spec.types';
import type { WidgetSelectionResult } from '../types/v4/widget-selection.types';
import type { PlanORS } from '../types/v4/ors.types';
import { LLM_ERROR_TYPES, type LLMCallMetrics } from '../types/v4/llm-task.types';

const batchExperimentRoutes = new Hono();

// UUID形式の検証用正規表現
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * batchIdがUUID形式かどうかを検証
 */
function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

// ========================================
// バッチ実行管理エンドポイント
// ========================================

/**
 * POST /api/experiment/batch/start
 * バッチ実行を開始
 */
batchExperimentRoutes.post('/start', async (c) => {
  try {
    const body = await c.req.json();
    const {
      experimentId,
      modelConfigs,
      inputCorpusId,
      parallelism = 1,
      headlessMode = true,
      maxTrials,
    } = body;

    // バリデーション
    if (!experimentId) {
      return c.json({
        success: false,
        error: 'experimentId is required'
      }, 400);
    }

    if (!Array.isArray(modelConfigs) || modelConfigs.length === 0) {
      return c.json({
        success: false,
        error: 'modelConfigs must be a non-empty array'
      }, 400);
    }

    // モデル構成IDの検証
    const validConfigIds = Object.keys(MODEL_CONFIGURATIONS);
    for (const configId of modelConfigs) {
      if (!validConfigIds.includes(configId)) {
        return c.json({
          success: false,
          error: `Invalid model config ID: ${configId}. Valid IDs: ${validConfigIds.join(', ')}`
        }, 400);
      }
    }

    if (!inputCorpusId) {
      return c.json({
        success: false,
        error: 'inputCorpusId is required'
      }, 400);
    }

    console.log(`🚀 Starting batch experiment: ${experimentId}`);
    console.log(`  Model configs: ${modelConfigs.join(', ')}`);
    console.log(`  Input corpus: ${inputCorpusId}`);
    console.log(`  Parallelism: ${parallelism}`);
    console.log(`  Headless mode: ${headlessMode}`);
    console.log(`  Max trials: ${maxTrials ?? 'unlimited'}`);

    const result = await startBatch({
      experimentId,
      modelConfigs: modelConfigs as ModelConfigId[],
      inputCorpusId,
      parallelism,
      headlessMode,
      maxTrials,
    });

    return c.json({
      success: true,
      batchId: result.batchId,
      totalTrials: result.totalTrials,
      status: 'queued',
    });
  } catch (error) {
    console.error('Failed to start batch:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/batch/:batchId/status
 * バッチステータスを取得
 */
batchExperimentRoutes.get('/:batchId/status', async (c) => {
  try {
    const batchId = c.req.param('batchId');

    // DBからバッチ情報を取得
    const [batch] = await db
      .select()
      .from(batchExecutions)
      .where(eq(batchExecutions.id, batchId));

    if (!batch) {
      return c.json({
        success: false,
        error: 'Batch not found'
      }, 404);
    }

    // メモリ上の進捗情報を取得
    const progress = getBatchProgress(batchId);

    return c.json({
      success: true,
      batchId,
      experimentId: batch.experimentId,
      status: batch.status,
      progress: progress ?? {
        batchId,
        status: batch.status,
        totalTrials: batch.totalTrials,
        completedTrials: batch.completedTrials,
        failedTrials: batch.failedTrials,
      },
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
    });
  } catch (error) {
    console.error('Failed to get batch status:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/experiment/batch/:batchId/stop
 * バッチ実行を停止
 */
batchExperimentRoutes.post('/:batchId/stop', async (c) => {
  try {
    const batchId = c.req.param('batchId');

    const stopped = await stopBatch(batchId);

    if (!stopped) {
      return c.json({
        success: false,
        error: 'Batch not found or not running'
      }, 404);
    }

    console.log(`🛑 Batch ${batchId} stopped`);

    return c.json({
      success: true,
      message: 'Batch stopped'
    });
  } catch (error) {
    console.error('Failed to stop batch:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/batch/:batchId/progress
 * SSEで進捗をリアルタイム配信
 */
batchExperimentRoutes.get('/:batchId/progress', async (c) => {
  const batchId = c.req.param('batchId');

  return streamSSE(c, async (stream) => {
    let lastProgressJson = '';
    let iterations = 0;
    const maxIterations = 3600; // 最大1時間（1秒間隔）

    while (iterations < maxIterations) {
      const progress = getBatchProgress(batchId);

      if (!progress) {
        // DBから最終状態を取得
        const [batch] = await db
          .select()
          .from(batchExecutions)
          .where(eq(batchExecutions.id, batchId));

        if (batch) {
          await stream.writeSSE({
            event: 'complete',
            data: JSON.stringify({
              batchId,
              status: batch.status,
              totalTrials: batch.totalTrials,
              completedTrials: batch.completedTrials,
              failedTrials: batch.failedTrials,
            }),
          });
        }
        break;
      }

      // 進捗が更新された場合のみ送信（JSON全体を比較）
      const progressJson = JSON.stringify(progress);
      if (progressJson !== lastProgressJson) {
        lastProgressJson = progressJson;

        await stream.writeSSE({
          event: 'progress',
          data: progressJson,
        });
      }

      // 完了チェック
      if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'stopped') {
        await stream.writeSSE({
          event: 'complete',
          data: progressJson,
        });
        break;
      }

      iterations++;
      await stream.sleep(1000); // 1秒間隔
    }
  });
});

/**
 * Layer1/Layer4統計を計算するヘルパー関数
 */
function calculateStatistics(logs: typeof experimentTrialLogs.$inferSelect[]): {
  layer1: Layer1Metrics;
  layer4: Layer4Metrics;
} {
  if (logs.length === 0) {
    return {
      layer1: { VR: 0, TCR: 0, RRR: 0, CDR: 0, RGR: 0, W2WR_SR: 0, RC_SR: 0, JA_SR: 0 },
      layer4: { LAT: 0, COST: 0, FR: 0 },
    };
  }

  const total = logs.length;

  // Layer1計算
  const validCount = logs.filter(
    log => (log.dslErrors === null || (Array.isArray(log.dslErrors) && log.dslErrors.length === 0)) &&
           (log.renderErrors === null || (Array.isArray(log.renderErrors) && log.renderErrors.length === 0))
  ).length;
  const typeOkCount = logs.filter(log => log.typeErrorCount === 0).length;
  const refOkCount = logs.filter(log => log.referenceErrorCount === 0).length;
  const cycleCount = logs.filter(log => log.cycleDetected).length;
  const regenCount = logs.filter(log => log.regenerated).length;

  // W2WR/RC/JA 成功率計算
  const w2wrSuccessCount = logs.filter(log => log.w2wrErrors === null).length;
  const rcSuccessCount = logs.filter(log => log.reactComponentErrors === null).length;
  const jaSuccessCount = logs.filter(log => log.jotaiAtomErrors === null).length;

  // Layer4計算
  const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
  const runtimeErrorCount = logs.filter(log => log.runtimeError).length;

  // コスト計算 (JPY) - Azure OpenAI料金表より
  let totalCostJPY = 0;
  for (const log of logs) {
    // GPT-4.1相当の価格を使用（modelConfigごとの詳細計算はExperimentStatisticsServiceで行う）
    const prices = TOKEN_PRICES_JPY_PER_MILLION['gpt-4.1'];
    const inputCost = (log.inputTokens / 1_000_000) * prices.input;
    const outputCost = (log.outputTokens / 1_000_000) * prices.output;
    totalCostJPY += inputCost + outputCost;
  }

  return {
    layer1: {
      VR: validCount / total,
      TCR: typeOkCount / total,
      RRR: refOkCount / total,
      CDR: cycleCount / total,
      RGR: regenCount / total,
      W2WR_SR: w2wrSuccessCount / total,
      RC_SR: rcSuccessCount / total,
      JA_SR: jaSuccessCount / total,
    },
    layer4: {
      LAT: totalLatency / total,
      COST: totalCostJPY,
      FR: runtimeErrorCount / total,
    },
  };
}

/**
 * GET /api/experiment/batch/:batchId/results
 * バッチ結果サマリーを取得
 */
batchExperimentRoutes.get('/:batchId/results', async (c) => {
  try {
    const batchId = c.req.param('batchId');

    // バッチ情報を取得
    const [batch] = await db
      .select()
      .from(batchExecutions)
      .where(eq(batchExecutions.id, batchId));

    if (!batch) {
      return c.json({
        success: false,
        error: 'Batch not found'
      }, 404);
    }

    // 試行ログを取得
    const trialLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(eq(experimentTrialLogs.batchId, batchId));

    // モデル構成別にグループ化
    const logsByModel = new Map<string, typeof trialLogs>();
    for (const log of trialLogs) {
      const existing = logsByModel.get(log.modelConfig) ?? [];
      existing.push(log);
      logsByModel.set(log.modelConfig, existing);
    }

    // モデル別統計を計算
    const byModel: ModelStatistics[] = [];
    for (const [modelConfig, logs] of logsByModel.entries()) {
      const stats = calculateStatistics(logs);
      byModel.push({
        modelConfig,
        trialCount: logs.length,
        layer1: stats.layer1,
        layer4: stats.layer4,
      });
    }

    // 全体統計を計算
    const overallStats = calculateStatistics(trialLogs);

    // 実行時間を計算
    let totalDurationMs = 0;
    if (batch.startedAt && batch.completedAt) {
      totalDurationMs = new Date(batch.completedAt).getTime() - new Date(batch.startedAt).getTime();
    }

    // 完全なサマリーを構築
    const summary = {
      batchId,
      experimentId: batch.experimentId,
      status: batch.status,
      totalTrials: batch.totalTrials,
      completedTrials: batch.completedTrials,
      failedTrials: batch.failedTrials,
      byModel,
      overall: overallStats,
      // 設定情報
      modelConfigs: batch.modelConfigs,
      inputCorpusId: batch.inputCorpusId,
      parallelism: batch.parallelism,
      maxTrials: batch.maxTrials,
      // タイミング
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      totalDurationMs,
    };

    return c.json({
      success: true,
      summary,
      layer1Results: overallStats.layer1,
      layer4Results: overallStats.layer4,
    });
  } catch (error) {
    console.error('Failed to get batch results:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/batch/:batchId/trials
 * バッチの試行ログ一覧を取得
 */
batchExperimentRoutes.get('/:batchId/trials', async (c) => {
  try {
    const batchId = c.req.param('batchId');
    const modelConfig = c.req.query('modelConfig');
    const stage = c.req.query('stage');

    let query = db
      .select()
      .from(experimentTrialLogs)
      .where(eq(experimentTrialLogs.batchId, batchId));

    // フィルタリング（基本的なwhere句のみ）
    const trialLogs = await query;

    // クライアント側でフィルタリング
    let filteredLogs = trialLogs;
    if (modelConfig) {
      filteredLogs = filteredLogs.filter(log => log.modelConfig === modelConfig);
    }
    if (stage) {
      filteredLogs = filteredLogs.filter(log => log.stage === parseInt(stage, 10));
    }

    return c.json({
      success: true,
      trials: filteredLogs,
      count: filteredLogs.length,
    });
  } catch (error) {
    console.error('Failed to get trial logs:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/batch/:batchId/export
 * バッチ結果をエクスポート
 */
batchExperimentRoutes.get('/:batchId/export', async (c) => {
  try {
    const batchId = c.req.param('batchId');
    const format = c.req.query('format') ?? 'json';

    // 試行ログを取得
    const trialLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(eq(experimentTrialLogs.batchId, batchId));

    if (format === 'csv') {
      // CSV形式でエクスポート
      const headers = [
        'experiment_id',
        'model_config',
        'stage',
        'input_tokens',
        'output_tokens',
        'latency_ms',
        'dsl_errors',
        'render_errors',
        'type_error_count',
        'reference_error_count',
        'cycle_detected',
        'regenerated',
        'runtime_error',
        'timestamp',
      ];

      const rows = trialLogs.map(log => [
        log.experimentId,
        log.modelConfig,
        log.stage,
        log.inputTokens,
        log.outputTokens,
        log.latencyMs,
        log.dslErrors ? JSON.stringify(log.dslErrors) : '',
        log.renderErrors ? JSON.stringify(log.renderErrors) : '',
        log.typeErrorCount,
        log.referenceErrorCount,
        log.cycleDetected,
        log.regenerated,
        log.runtimeError,
        log.timestamp,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(v => `"${v}"`).join(',')),
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="batch_${batchId}.csv"`,
        },
      });
    }

    // JSON形式でエクスポート（デフォルト）
    return c.json({
      success: true,
      batchId,
      exportedAt: new Date().toISOString(),
      trialLogs,
    });
  } catch (error) {
    console.error('Failed to export batch:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/batch
 * バッチ一覧を取得
 */
batchExperimentRoutes.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') ?? '20', 10);
    const offset = parseInt(c.req.query('offset') ?? '0', 10);

    const batches = await db
      .select()
      .from(batchExecutions)
      .orderBy(batchExecutions.createdAt)
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      batches,
      count: batches.length,
    });
  } catch (error) {
    console.error('Failed to get batches:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/batch/configs
 * 利用可能なモデル構成一覧を取得
 */
batchExperimentRoutes.get('/configs', async (c) => {
  return c.json({
    success: true,
    configs: Object.entries(MODEL_CONFIGURATIONS).map(([id, config]) => ({
      id,
      name: config.name,
      stages: config.stages,
    })),
  });
});

/**
 * W2WRカテゴリを判定
 * A: No W2WR, B: Passthrough, C: JS単純, D: JS複合, E: 複数Binding
 */
function classifyW2WRCategory(testCase: {
  hasReactivity?: boolean;
  expectedW2WR?: {
    bindings?: Array<{
      relationship?: { type?: string; javascript?: string };
    }>;
  };
}): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (!testCase.hasReactivity) {
    return 'A'; // No W2WR
  }

  const bindings = testCase.expectedW2WR?.bindings ?? [];
  if (bindings.length === 0) {
    return 'A'; // No W2WR
  }

  if (bindings.length >= 2) {
    return 'E'; // 複数Binding
  }

  const binding = bindings[0];
  const relType = binding?.relationship?.type;

  if (relType === 'passthrough') {
    return 'B'; // Passthrough
  }

  if (relType === 'javascript') {
    const js = binding?.relationship?.javascript ?? '';
    // 複合JS判定: filter, Object.entries, flatMap などが含まれるか
    const isComplex = /filter|Object\.entries|flatMap|reduce/.test(js);
    return isComplex ? 'D' : 'C';
  }

  return 'A'; // デフォルト
}

/**
 * GET /api/experiment/batch/corpuses
 * 利用可能な入力コーパス一覧を取得
 */
batchExperimentRoutes.get('/corpuses', async (c) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    interface CorpusInfo {
      corpusId: string;
      description: string;
      inputCount: number;
      metadata?: {
        w2wrDistribution: Record<string, number>;
        complexityDistribution: Record<string, number>;
        categoryDistribution: Record<string, number>;
      };
    }

    const corpuses: CorpusInfo[] = [];

    // 1. test_cases コーパス（config/test-cases/*.json）
    try {
      const testCasesDir = path.join(process.cwd(), '..', 'config', 'test-cases');
      const files = await fs.readdir(testCasesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

      // メタ情報を集計
      const w2wrDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      const complexityDistribution: Record<string, number> = {};
      const categoryDistribution: Record<string, number> = {};

      for (const file of jsonFiles) {
        const content = await fs.readFile(path.join(testCasesDir, file), 'utf-8');
        const testCase = JSON.parse(content);

        // W2WR分布
        const w2wrCategory = classifyW2WRCategory(testCase);
        w2wrDistribution[w2wrCategory] = (w2wrDistribution[w2wrCategory] ?? 0) + 1;

        // 複雑度分布
        const complexity = testCase.complexity ?? 'unknown';
        complexityDistribution[complexity] = (complexityDistribution[complexity] ?? 0) + 1;

        // カテゴリ分布
        const category = testCase.contextFactors?.category ?? 'unknown';
        categoryDistribution[category] = (categoryDistribution[category] ?? 0) + 1;
      }

      corpuses.push({
        corpusId: 'test_cases',
        description: 'Expert評価用テストケース',
        inputCount: jsonFiles.length,
        metadata: {
          w2wrDistribution,
          complexityDistribution,
          categoryDistribution,
        },
      });
    } catch {
      // test-casesディレクトリが存在しない場合はスキップ
    }

    // 2. experiment-input-corpus.json があれば読み込み
    try {
      const corpusPath = path.join(process.cwd(), '..', 'config', 'experiment-input-corpus.json');
      const content = await fs.readFile(corpusPath, 'utf-8');
      const corpus = JSON.parse(content);
      corpuses.push({
        corpusId: corpus.corpusId || 'default',
        description: corpus.description || '入力コーパス',
        inputCount: corpus.inputs?.length ?? 0,
      });
    } catch {
      // ファイルが存在しない場合はスキップ
    }

    return c.json({
      success: true,
      corpuses,
    });
  } catch (error) {
    console.error('Failed to list corpuses:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ========================================
// 再検証エンドポイント（LL-001/LL-002対応）
// ========================================

/**
 * GET /api/experiment/batch/:batchId/unvalidated
 * 未検証のログ一覧を取得
 *
 * serverValidatedAt が null のStage 3ログを返す
 */
batchExperimentRoutes.get('/:batchId/unvalidated', async (c) => {
  try {
    const batchId = c.req.param('batchId');

    // UUID形式の検証
    if (!isValidUUID(batchId)) {
      return c.json({
        success: false,
        error: `Invalid batch ID format: "${batchId}". Expected UUID format (e.g., "b845003f-a50f-4f51-a77c-c4256340a20e")`
      }, 400);
    }

    // Stage 3 かつ serverValidatedAt が null のログを取得
    const unvalidatedLogs = await db
      .select({
        id: experimentTrialLogs.id,
        trialNumber: experimentTrialLogs.trialNumber,
        inputId: experimentTrialLogs.inputId,
        modelConfig: experimentTrialLogs.modelConfig,
        stage: experimentTrialLogs.stage,
        generatedData: experimentTrialLogs.generatedData,
        timestamp: experimentTrialLogs.timestamp,
      })
      .from(experimentTrialLogs)
      .where(
        and(
          eq(experimentTrialLogs.batchId, batchId),
          eq(experimentTrialLogs.stage, 3)
        )
      );

    // serverValidatedAt が null のものをフィルタ（Drizzle の isNull が使えない場合の回避策）
    const fullLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(
        and(
          eq(experimentTrialLogs.batchId, batchId),
          eq(experimentTrialLogs.stage, 3)
        )
      );

    const unvalidated = fullLogs.filter(log => log.serverValidatedAt === null);

    return c.json({
      success: true,
      unvalidatedCount: unvalidated.length,
      totalStage3Count: fullLogs.length,
      unvalidatedLogs: unvalidated.map(log => ({
        id: log.id,
        trialNumber: log.trialNumber,
        inputId: log.inputId,
        modelConfig: log.modelConfig,
        hasGeneratedData: log.generatedData !== null,
        timestamp: log.timestamp,
      })),
    });
  } catch (error) {
    console.error('Failed to get unvalidated logs:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/batch/:batchId/api-errors
 * API_ERROR付きの試行一覧を取得
 *
 * dslErrorsにAPI_ERRORが含まれる試行を返す
 */
batchExperimentRoutes.get('/:batchId/api-errors', async (c) => {
  try {
    const batchId = c.req.param('batchId');

    // UUID形式の検証
    if (!isValidUUID(batchId)) {
      return c.json({
        success: false,
        error: `Invalid batch ID format: "${batchId}". Expected UUID format (e.g., "b845003f-a50f-4f51-a77c-c4256340a20e")`
      }, 400);
    }

    // 全ログを取得
    const allLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(eq(experimentTrialLogs.batchId, batchId));

    // API_ERRORを含むログをフィルタ
    const apiErrorType = LLM_ERROR_TYPES.API_ERROR;
    const apiErrorLogs = allLogs.filter(log => {
      if (!log.dslErrors || !Array.isArray(log.dslErrors)) {
        return false;
      }
      // dslErrorsにapi_errorを含むものを検出
      return (log.dslErrors as string[]).some(err =>
        err === apiErrorType || err.startsWith(apiErrorType)
      );
    });

    // Stage別に集計
    const stageDistribution: Record<number, number> = {};
    const modelConfigDistribution: Record<string, number> = {};
    const inputIdSet = new Set<string>();

    for (const log of apiErrorLogs) {
      stageDistribution[log.stage] = (stageDistribution[log.stage] ?? 0) + 1;
      modelConfigDistribution[log.modelConfig] = (modelConfigDistribution[log.modelConfig] ?? 0) + 1;
      inputIdSet.add(log.inputId);
    }

    return c.json({
      success: true,
      apiErrorCount: apiErrorLogs.length,
      totalLogCount: allLogs.length,
      affectedInputCount: inputIdSet.size,
      stageDistribution,
      modelConfigDistribution,
      apiErrorLogs: apiErrorLogs.map(log => ({
        id: log.id,
        trialNumber: log.trialNumber,
        inputId: log.inputId,
        modelConfig: log.modelConfig,
        stage: log.stage,
        dslErrors: log.dslErrors,
        latencyMs: log.latencyMs,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        timestamp: log.timestamp,
      })),
    });
  } catch (error) {
    console.error('Failed to get API error logs:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/experiment/batch/:batchId/revalidate
 * 未検証ログを再検証
 *
 * 機能美を重視したCLI出力で実行過程と差分を可視化
 *
 * Body:
 * - logIds?: string[] - 特定のログIDのみ再検証（省略時は全未検証を対象）
 * - rerunBackendValidation?: boolean - バックエンド検証も再実行するか（デフォルト: false）
 * - writeLogFile?: boolean - ログファイルを出力するか（デフォルト: true）
 */
batchExperimentRoutes.post('/:batchId/revalidate', async (c) => {
  try {
    const batchId = c.req.param('batchId');

    // UUID形式の検証
    if (!isValidUUID(batchId)) {
      return c.json({
        success: false,
        error: `Invalid batch ID format: "${batchId}". Expected UUID format (e.g., "b845003f-a50f-4f51-a77c-c4256340a20e")`
      }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const { logIds, rerunBackendValidation = false, writeLogFile = true } = body as {
      logIds?: string[];
      rerunBackendValidation?: boolean;
      writeLogFile?: boolean;
    };

    // バッチ情報を取得
    const [batch] = await db
      .select()
      .from(batchExecutions)
      .where(eq(batchExecutions.id, batchId));

    // 対象ログを取得
    let targetLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(
        and(
          eq(experimentTrialLogs.batchId, batchId),
          eq(experimentTrialLogs.stage, 3)
        )
      );

    // logIdsが指定されている場合はフィルタ
    if (logIds && logIds.length > 0) {
      targetLogs = targetLogs.filter(log => logIds.includes(log.id));
    } else {
      // 未検証のみを対象
      targetLogs = targetLogs.filter(log => log.serverValidatedAt === null);
    }

    if (targetLogs.length === 0) {
      console.log(`[revalidate] ─ No logs to revalidate for batch ${batchId.slice(0, 8)}...`);
      return c.json({
        success: true,
        message: 'No logs to revalidate',
        revalidatedCount: 0,
      });
    }

    // ロガー初期化
    const logger = new RevalidationLogger(batchId);
    logger.logHeader(targetLogs.length, {
      experimentId: batch?.experimentId,
      modelConfigs: batch?.modelConfigs as string[] | undefined,
      rerunBackendValidation,
    });

    const results: Array<{
      logId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const log of targetLogs) {
      const startTime = Date.now();

      try {
        if (!log.generatedData) {
          logger.logSkipped(log.id, 'No generated data available');
          results.push({
            logId: log.id,
            success: false,
            error: 'No generated data available',
          });
          continue;
        }

        // 再検証前の値を保存
        const beforeState = {
          renderErrors: log.renderErrors,
          reactComponentErrors: log.reactComponentErrors,
          jotaiAtomErrors: log.jotaiAtomErrors,
          typeErrorCount: log.typeErrorCount,
          referenceErrorCount: log.referenceErrorCount,
          cycleDetected: log.cycleDetected,
          serverValidatedAt: log.serverValidatedAt,
        };

        // フロントエンド互換検証を実行
        const frontendValidation = validateUISpecForFrontend(log.generatedData as PlanUISpec);

        // 再検証後の値
        const afterState = {
          renderErrors: frontendValidation.renderErrors,
          reactComponentErrors: frontendValidation.reactComponentErrors,
          jotaiAtomErrors: frontendValidation.jotaiAtomErrors,
          typeErrorCount: frontendValidation.typeErrorCount,
          referenceErrorCount: frontendValidation.referenceErrorCount,
          cycleDetected: frontendValidation.cycleDetected,
          serverValidatedAt: frontendValidation.serverValidatedAt,
        };

        // 差分を計算
        const diffs = [
          RevalidationLogger.createDiff('renderErrors', beforeState.renderErrors, afterState.renderErrors),
          RevalidationLogger.createDiff('reactComponentErrors', beforeState.reactComponentErrors, afterState.reactComponentErrors),
          RevalidationLogger.createDiff('jotaiAtomErrors', beforeState.jotaiAtomErrors, afterState.jotaiAtomErrors),
          RevalidationLogger.createDiff('typeErrorCount', beforeState.typeErrorCount, afterState.typeErrorCount),
          RevalidationLogger.createDiff('referenceErrorCount', beforeState.referenceErrorCount, afterState.referenceErrorCount),
          RevalidationLogger.createDiff('cycleDetected', beforeState.cycleDetected, afterState.cycleDetected),
        ];

        // DB更新
        await db
          .update(experimentTrialLogs)
          .set({
            renderErrors: frontendValidation.renderErrors,
            reactComponentErrors: frontendValidation.reactComponentErrors,
            jotaiAtomErrors: frontendValidation.jotaiAtomErrors,
            typeErrorCount: frontendValidation.typeErrorCount,
            referenceErrorCount: frontendValidation.referenceErrorCount,
            cycleDetected: frontendValidation.cycleDetected,
            serverValidatedAt: new Date(frontendValidation.serverValidatedAt),
          })
          .where(eq(experimentTrialLogs.id, log.id));

        const processingTimeMs = Date.now() - startTime;

        // 進捗をログ
        logger.logProgress({
          logId: log.id,
          trialNumber: log.trialNumber,
          inputId: log.inputId,
          modelConfig: log.modelConfig,
          success: true,
          diffs,
          processingTimeMs,
        });

        results.push({
          logId: log.id,
          success: true,
        });
      } catch (err) {
        const processingTimeMs = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        logger.logProgress({
          logId: log.id,
          trialNumber: log.trialNumber,
          inputId: log.inputId,
          modelConfig: log.modelConfig,
          success: false,
          error: errorMessage,
          diffs: [],
          processingTimeMs,
        });

        results.push({
          logId: log.id,
          success: false,
          error: errorMessage,
        });
      }
    }

    // サマリー出力
    const summary = logger.logSummary();

    // ログファイル出力
    let logFilePath: string | undefined;
    if (writeLogFile) {
      logFilePath = await logger.writeLogFile(summary);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return c.json({
      success: true,
      revalidatedCount: successCount,
      failedCount: failCount,
      changedCount: summary.changedCount,
      unchangedCount: summary.unchangedCount,
      totalProcessingTimeMs: summary.totalProcessingTimeMs,
      logFilePath,
      diffSummary: summary.diffSummary.map(d => ({
        field: d.field,
        changedCount: d.changedCount,
      })),
      results,
    });
  } catch (error) {
    console.error('Failed to revalidate logs:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ========================================
// API_ERROR再生成エンドポイント
// ========================================

/**
 * 入力コーパスを読み込むヘルパー関数
 */
async function loadInputCorpus(corpusId: string): Promise<ExperimentInput[]> {
  const fs = await import('fs/promises');
  const path = await import('path');

  if (corpusId === 'test_cases') {
    const testCasesDir = path.join(process.cwd(), '..', 'config', 'test-cases');
    const files = await fs.readdir(testCasesDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

    const inputs: ExperimentInput[] = [];
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(testCasesDir, file), 'utf-8');
      const testCase = JSON.parse(content);
      inputs.push({
        inputId: testCase.caseId,
        concernText: testCase.concernText,
        contextFactors: {
          category: testCase.contextFactors.category,
          urgency: testCase.contextFactors.urgency,
          emotionalState: testCase.contextFactors.emotionalState,
          timeAvailable: String(testCase.contextFactors.timeAvailable),
        },
      });
    }
    return inputs;
  }

  const corpusPath = path.join(process.cwd(), '..', 'config', 'experiment-input-corpus.json');
  const content = await fs.readFile(corpusPath, 'utf-8');
  const corpus = JSON.parse(content);
  return corpus.inputs ?? [];
}

/**
 * ボトルネックタイプ推定
 */
function inferBottleneckType(contextFactors: { emotionalState?: string }): string {
  const mapping: Record<string, string> = {
    'confused': 'information',
    'anxious': 'emotional',
    'overwhelmed': 'planning',
    'stuck': 'thought',
    'neutral': 'thought',
  };
  return mapping[contextFactors.emotionalState ?? 'neutral'] ?? 'thought';
}

/**
 * v4サービス群を作成するヘルパー
 */
function createV4Services(orchestrator: LLMOrchestrator) {
  return {
    widgetSelectionService: new WidgetSelectionService({
      llmOrchestrator: orchestrator,
      debug: true,
    }),
    orsGeneratorService: new ORSGeneratorService({
      llmOrchestrator: orchestrator,
      debug: true,
      disableFallback: true,
    }),
    uiSpecGeneratorService: new UISpecGeneratorV4({
      llmOrchestrator: orchestrator,
      debug: true,
      disableFallback: true,
    }),
  };
}

/**
 * 単一試行を再生成して既存ログを更新
 */
async function regenerateTrialAndUpdateLogs(
  batchId: string,
  experimentId: string,
  trialNumber: number,
  inputId: string,
  modelConfigId: ModelConfigId,
  input: ExperimentInput,
  existingLogIds: { stage1?: string; stage2?: string; stage3?: string }
): Promise<{
  success: boolean;
  stages: Array<{
    stage: number;
    success: boolean;
    logId?: string;
    error?: string;
  }>;
}> {
  const validationService = createValidationService();
  const orchestrator = createExperimentOrchestrator(modelConfigId);
  const services = createV4Services(orchestrator);
  const bottleneckType = inferBottleneckType(input.contextFactors);
  const sessionId = `regen-${batchId}-${trialNumber}-${Date.now()}`;

  const stageResults: Array<{
    stage: number;
    success: boolean;
    logId?: string;
    error?: string;
  }> = [];

  try {
    // ========================================
    // Stage 1: Widget Selection
    // ========================================
    const stage1Result = await services.widgetSelectionService.selectWidgets({
      concernText: input.concernText,
      bottleneckType,
      sessionId,
    });

    let stage1DslErrors: string[] | null = null;
    let stage1TypeErrorCount = 0;
    let stage1ReferenceErrorCount = 0;
    let stage1CycleDetected = false;

    if (stage1Result.success && stage1Result.data) {
      const validationResult = validationService.validateWidgetSelection(stage1Result.data);
      const summary = getErrorSummary(validationResult);
      stage1DslErrors = summary.dslErrors;
      stage1TypeErrorCount = summary.typeErrorCount;
      stage1ReferenceErrorCount = summary.referenceErrorCount;
      stage1CycleDetected = summary.cycleDetected;
    } else if (!stage1Result.success) {
      stage1DslErrors = [stage1Result.error?.type ?? 'WIDGET_SELECTION_FAILED'];
    }

    // Stage 1ログを更新または新規作成
    let stage1LogId = existingLogIds.stage1;
    if (stage1LogId) {
      await db.update(experimentTrialLogs)
        .set({
          inputTokens: stage1Result.metrics.inputTokens ?? 0,
          outputTokens: stage1Result.metrics.outputTokens ?? 0,
          latencyMs: stage1Result.metrics.latencyMs ?? 0,
          dslErrors: stage1DslErrors,
          typeErrorCount: stage1TypeErrorCount,
          referenceErrorCount: stage1ReferenceErrorCount,
          cycleDetected: stage1CycleDetected,
          regenerated: true,
          generatedData: stage1Result.data ?? null,
          promptData: stage1Result.prompt ?? null,
          inputVariables: { concernText: input.concernText, bottleneckType },
          timestamp: new Date(),
        })
        .where(eq(experimentTrialLogs.id, stage1LogId));
    } else {
      const [inserted] = await db.insert(experimentTrialLogs)
        .values({
          experimentId,
          batchId,
          trialNumber,
          inputId,
          modelConfig: modelConfigId,
          modelRouterSelection: null,
          stage: 1,
          inputTokens: stage1Result.metrics.inputTokens ?? 0,
          outputTokens: stage1Result.metrics.outputTokens ?? 0,
          latencyMs: stage1Result.metrics.latencyMs ?? 0,
          dslErrors: stage1DslErrors,
          typeErrorCount: stage1TypeErrorCount,
          referenceErrorCount: stage1ReferenceErrorCount,
          cycleDetected: stage1CycleDetected,
          regenerated: true,
          runtimeError: false,
          generatedData: stage1Result.data ?? null,
          promptData: stage1Result.prompt ?? null,
          inputVariables: { concernText: input.concernText, bottleneckType },
          serverValidatedAt: null,
          timestamp: new Date(),
        })
        .returning({ id: experimentTrialLogs.id });
      stage1LogId = inserted.id;
    }

    stageResults.push({
      stage: 1,
      success: stage1Result.success && stage1DslErrors === null,
      logId: stage1LogId,
    });

    if (!stage1Result.success || stage1DslErrors !== null) {
      return { success: false, stages: stageResults };
    }

    const widgetSelectionResult = stage1Result.data as WidgetSelectionResult;

    // ========================================
    // Stage 2: Plan ORS Generation
    // ========================================
    const stage2Result = await services.orsGeneratorService.generatePlanORS({
      concernText: input.concernText,
      bottleneckType,
      widgetSelectionResult,
      sessionId,
    });

    let stage2DslErrors: string[] | null = null;
    let stage2TypeErrorCount = 0;
    let stage2ReferenceErrorCount = 0;
    let stage2CycleDetected = false;

    if (stage2Result.success && stage2Result.data) {
      const validationResult = validationService.validatePlanORS(stage2Result.data);
      const summary = getErrorSummary(validationResult);
      stage2DslErrors = summary.dslErrors;
      stage2TypeErrorCount = summary.typeErrorCount;
      stage2ReferenceErrorCount = summary.referenceErrorCount;
      stage2CycleDetected = summary.cycleDetected;
    } else if (!stage2Result.success) {
      stage2DslErrors = [stage2Result.error?.type ?? 'ORS_GENERATION_FAILED'];
    }

    // Stage 2ログを更新または新規作成
    let stage2LogId = existingLogIds.stage2;
    if (stage2LogId) {
      await db.update(experimentTrialLogs)
        .set({
          inputTokens: stage2Result.metrics.inputTokens ?? 0,
          outputTokens: stage2Result.metrics.outputTokens ?? 0,
          latencyMs: stage2Result.metrics.latencyMs ?? 0,
          dslErrors: stage2DslErrors,
          typeErrorCount: stage2TypeErrorCount,
          referenceErrorCount: stage2ReferenceErrorCount,
          cycleDetected: stage2CycleDetected,
          regenerated: true,
          generatedData: stage2Result.data ?? null,
          promptData: stage2Result.prompt ?? null,
          inputVariables: { concernText: input.concernText, bottleneckType },
          timestamp: new Date(),
        })
        .where(eq(experimentTrialLogs.id, stage2LogId));
    } else {
      const [inserted] = await db.insert(experimentTrialLogs)
        .values({
          experimentId,
          batchId,
          trialNumber,
          inputId,
          modelConfig: modelConfigId,
          modelRouterSelection: null,
          stage: 2,
          inputTokens: stage2Result.metrics.inputTokens ?? 0,
          outputTokens: stage2Result.metrics.outputTokens ?? 0,
          latencyMs: stage2Result.metrics.latencyMs ?? 0,
          dslErrors: stage2DslErrors,
          typeErrorCount: stage2TypeErrorCount,
          referenceErrorCount: stage2ReferenceErrorCount,
          cycleDetected: stage2CycleDetected,
          regenerated: true,
          runtimeError: false,
          generatedData: stage2Result.data ?? null,
          promptData: stage2Result.prompt ?? null,
          inputVariables: { concernText: input.concernText, bottleneckType },
          serverValidatedAt: null,
          timestamp: new Date(),
        })
        .returning({ id: experimentTrialLogs.id });
      stage2LogId = inserted.id;
    }

    stageResults.push({
      stage: 2,
      success: stage2Result.success && stage2DslErrors === null,
      logId: stage2LogId,
    });

    if (!stage2Result.success || stage2DslErrors !== null) {
      return { success: false, stages: stageResults };
    }

    const planORS = stage2Result.data as PlanORS;

    // ========================================
    // Stage 3: Plan UISpec Generation
    // ========================================
    const stage3Result = await services.uiSpecGeneratorService.generatePlanUISpec({
      planORS,
      concernText: input.concernText,
      widgetSelectionResult,
      sessionId,
      enableReactivity: true,
    });

    let stage3DslErrors: string[] | null = null;
    let stage3W2wrErrors: string[] | null = null;
    let stage3TypeErrorCount = 0;
    let stage3ReferenceErrorCount = 0;
    let stage3CycleDetected = false;

    if (stage3Result.success && stage3Result.data) {
      const validationResult = validationService.validateUISpec(stage3Result.data, widgetSelectionResult);
      const summary = getErrorSummary(validationResult);
      stage3TypeErrorCount = summary.typeErrorCount;
      stage3ReferenceErrorCount = summary.referenceErrorCount;
      stage3CycleDetected = summary.cycleDetected;

      if (!validationResult.valid) {
        const allErrors = validationResult.errors.map(e => e.type);
        const w2wrTypes = ['CIRCULAR_DEPENDENCY', 'SELF_REFERENCE', 'INVALID_BINDING',
                         'UNKNOWN_SOURCE_WIDGET', 'UNKNOWN_TARGET_WIDGET'];
        const w2wrFound = allErrors.filter(e => w2wrTypes.includes(e));
        const dslFound = allErrors.filter(e => !w2wrTypes.includes(e));
        stage3W2wrErrors = w2wrFound.length > 0 ? w2wrFound : null;
        stage3DslErrors = dslFound.length > 0 ? dslFound : null;
      }
    } else if (!stage3Result.success) {
      stage3DslErrors = [stage3Result.error?.type ?? 'UISPEC_GENERATION_FAILED'];
    }

    // フロントエンド互換検証
    const frontendValidation = stage3Result.success && stage3Result.data
      ? validateUISpecForFrontend(stage3Result.data as PlanUISpec)
      : undefined;

    // Stage 3ログを更新または新規作成
    let stage3LogId = existingLogIds.stage3;
    if (stage3LogId) {
      await db.update(experimentTrialLogs)
        .set({
          inputTokens: stage3Result.metrics.inputTokens ?? 0,
          outputTokens: stage3Result.metrics.outputTokens ?? 0,
          latencyMs: stage3Result.metrics.latencyMs ?? 0,
          dslErrors: stage3DslErrors,
          w2wrErrors: stage3W2wrErrors,
          renderErrors: frontendValidation?.renderErrors ?? null,
          reactComponentErrors: frontendValidation?.reactComponentErrors ?? null,
          jotaiAtomErrors: frontendValidation?.jotaiAtomErrors ?? null,
          typeErrorCount: frontendValidation?.typeErrorCount ?? stage3TypeErrorCount,
          referenceErrorCount: frontendValidation?.referenceErrorCount ?? stage3ReferenceErrorCount,
          cycleDetected: frontendValidation?.cycleDetected ?? stage3CycleDetected,
          regenerated: true,
          generatedData: stage3Result.data ?? null,
          promptData: stage3Result.prompt ?? null,
          inputVariables: { concernText: input.concernText, enableReactivity: true },
          serverValidatedAt: frontendValidation ? new Date(frontendValidation.serverValidatedAt) : null,
          timestamp: new Date(),
        })
        .where(eq(experimentTrialLogs.id, stage3LogId));
    } else {
      const [inserted] = await db.insert(experimentTrialLogs)
        .values({
          experimentId,
          batchId,
          trialNumber,
          inputId,
          modelConfig: modelConfigId,
          modelRouterSelection: null,
          stage: 3,
          inputTokens: stage3Result.metrics.inputTokens ?? 0,
          outputTokens: stage3Result.metrics.outputTokens ?? 0,
          latencyMs: stage3Result.metrics.latencyMs ?? 0,
          dslErrors: stage3DslErrors,
          w2wrErrors: stage3W2wrErrors,
          renderErrors: frontendValidation?.renderErrors ?? null,
          reactComponentErrors: frontendValidation?.reactComponentErrors ?? null,
          jotaiAtomErrors: frontendValidation?.jotaiAtomErrors ?? null,
          typeErrorCount: frontendValidation?.typeErrorCount ?? stage3TypeErrorCount,
          referenceErrorCount: frontendValidation?.referenceErrorCount ?? stage3ReferenceErrorCount,
          cycleDetected: frontendValidation?.cycleDetected ?? stage3CycleDetected,
          regenerated: true,
          runtimeError: false,
          generatedData: stage3Result.data ?? null,
          promptData: stage3Result.prompt ?? null,
          inputVariables: { concernText: input.concernText, enableReactivity: true },
          serverValidatedAt: frontendValidation ? new Date(frontendValidation.serverValidatedAt) : null,
          timestamp: new Date(),
        })
        .returning({ id: experimentTrialLogs.id });
      stage3LogId = inserted.id;
    }

    stageResults.push({
      stage: 3,
      success: stage3Result.success && stage3DslErrors === null,
      logId: stage3LogId,
    });

    const overallSuccess = stageResults.every(s => s.success);
    return { success: overallSuccess, stages: stageResults };

  } catch (error) {
    console.error(`Regeneration failed for trial ${trialNumber}:`, error);
    return {
      success: false,
      stages: stageResults.concat([{
        stage: stageResults.length + 1,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]),
    };
  }
}

/**
 * POST /api/experiment/batch/:batchId/regenerate
 * API_ERROR付きの試行を再生成
 *
 * Body:
 * - logIds?: string[] - 特定のログIDのみ再生成（省略時は全API_ERRORを対象）
 * - dryRun?: boolean - trueの場合、実際の再生成は行わず影響範囲のみ返す
 */
batchExperimentRoutes.post('/:batchId/regenerate', async (c) => {
  try {
    const batchId = c.req.param('batchId');

    // UUID形式の検証
    if (!isValidUUID(batchId)) {
      return c.json({
        success: false,
        error: `Invalid batch ID format: "${batchId}". Expected UUID format`
      }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const { logIds, dryRun = false } = body as {
      logIds?: string[];
      dryRun?: boolean;
    };

    // バッチ情報を取得
    const [batch] = await db
      .select()
      .from(batchExecutions)
      .where(eq(batchExecutions.id, batchId));

    if (!batch) {
      return c.json({
        success: false,
        error: 'Batch not found'
      }, 404);
    }

    // 全ログを取得
    const allLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(eq(experimentTrialLogs.batchId, batchId));

    // API_ERRORを含むログをフィルタ
    const apiErrorType = LLM_ERROR_TYPES.API_ERROR;
    let targetLogs = allLogs.filter(log => {
      if (!log.dslErrors || !Array.isArray(log.dslErrors)) {
        return false;
      }
      return (log.dslErrors as string[]).some(err =>
        err === apiErrorType || err.startsWith(apiErrorType)
      );
    });

    // logIdsが指定されている場合はフィルタ
    if (logIds && logIds.length > 0) {
      targetLogs = targetLogs.filter(log => logIds.includes(log.id));
    }

    if (targetLogs.length === 0) {
      return c.json({
        success: true,
        message: 'No API_ERROR logs to regenerate',
        regeneratedCount: 0,
      });
    }

    // 試行番号+モデル構成でグループ化（同じ試行の全Stageを再生成する必要がある）
    const trialGroups = new Map<string, typeof targetLogs>();
    for (const log of targetLogs) {
      const key = `${log.trialNumber}-${log.modelConfig}`;
      if (!trialGroups.has(key)) {
        trialGroups.set(key, []);
      }
      trialGroups.get(key)!.push(log);
    }

    // 影響を受ける試行の全Stageを取得
    const affectedTrials: Array<{
      trialNumber: number;
      modelConfig: string;
      inputId: string;
      existingLogIds: { stage1?: string; stage2?: string; stage3?: string };
      apiErrorStages: number[];
    }> = [];

    for (const [key, logs] of trialGroups) {
      const firstLog = logs[0];
      const trialNumber = firstLog.trialNumber;
      const modelConfig = firstLog.modelConfig;
      const inputId = firstLog.inputId;

      // この試行の全Stageログを取得
      const trialLogs = allLogs.filter(
        log => log.trialNumber === trialNumber && log.modelConfig === modelConfig
      );

      const existingLogIds: { stage1?: string; stage2?: string; stage3?: string } = {};
      for (const log of trialLogs) {
        if (log.stage === 1) existingLogIds.stage1 = log.id;
        if (log.stage === 2) existingLogIds.stage2 = log.id;
        if (log.stage === 3) existingLogIds.stage3 = log.id;
      }

      affectedTrials.push({
        trialNumber,
        modelConfig,
        inputId,
        existingLogIds,
        apiErrorStages: logs.map(l => l.stage),
      });
    }

    // dryRunの場合は影響範囲のみ返す
    if (dryRun) {
      return c.json({
        success: true,
        dryRun: true,
        affectedTrialCount: affectedTrials.length,
        affectedTrials: affectedTrials.map(t => ({
          trialNumber: t.trialNumber,
          modelConfig: t.modelConfig,
          inputId: t.inputId,
          apiErrorStages: t.apiErrorStages,
        })),
      });
    }

    // 入力コーパスを読み込み
    const inputCorpus = await loadInputCorpus(batch.inputCorpusId);
    const inputMap = new Map(inputCorpus.map(i => [i.inputId, i]));

    console.log(`🔄 Regenerating ${affectedTrials.length} trials for batch ${batchId}`);

    const results: Array<{
      trialNumber: number;
      modelConfig: string;
      success: boolean;
      stages: Array<{ stage: number; success: boolean; error?: string }>;
    }> = [];

    for (const trial of affectedTrials) {
      const input = inputMap.get(trial.inputId);
      if (!input) {
        results.push({
          trialNumber: trial.trialNumber,
          modelConfig: trial.modelConfig,
          success: false,
          stages: [{ stage: 0, success: false, error: `Input not found: ${trial.inputId}` }],
        });
        continue;
      }

      console.log(`  Regenerating trial ${trial.trialNumber} (${trial.modelConfig})...`);

      const result = await regenerateTrialAndUpdateLogs(
        batchId,
        batch.experimentId,
        trial.trialNumber,
        trial.inputId,
        trial.modelConfig as ModelConfigId,
        input,
        trial.existingLogIds
      );

      results.push({
        trialNumber: trial.trialNumber,
        modelConfig: trial.modelConfig,
        success: result.success,
        stages: result.stages,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`✅ Regeneration complete: ${successCount} success, ${failCount} failed`);

    return c.json({
      success: true,
      regeneratedCount: successCount,
      failedCount: failCount,
      results,
    });
  } catch (error) {
    console.error('Failed to regenerate logs:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ========================================
// 統計分析エンドポイント
// ========================================

/**
 * GET /api/experiment/batch/:batchId/statistics
 * バッチの統計検定結果を取得
 */
batchExperimentRoutes.get('/:batchId/statistics', async (c) => {
  try {
    const batchId = c.req.param('batchId');

    const statisticsService = getStatisticalAnalysisService();
    const result = await statisticsService.runAllPairwiseComparisons(batchId);

    if (!result) {
      return c.json({
        success: false,
        error: 'Batch not found or no trial data available'
      }, 404);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to get statistics:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/batch/:batchId/statistics/export
 * 統計検定結果をエクスポート
 */
batchExperimentRoutes.get('/:batchId/statistics/export', async (c) => {
  try {
    const batchId = c.req.param('batchId');
    const format = c.req.query('format') ?? 'markdown';

    const statisticsService = getStatisticalAnalysisService();
    const result = await statisticsService.runAllPairwiseComparisons(batchId);

    if (!result) {
      return c.json({
        success: false,
        error: 'Batch not found or no trial data available'
      }, 404);
    }

    switch (format) {
      case 'markdown': {
        const content = exportToMarkdown(result);
        return new Response(content, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="statistics_${batchId}.md"`,
          },
        });
      }

      case 'csv': {
        const content = exportToCSV(result);
        return new Response(content, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="statistics_${batchId}.csv"`,
          },
        });
      }

      case 'summary': {
        const content = exportSummaryTable(result);
        return new Response(content, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="statistics_summary_${batchId}.md"`,
          },
        });
      }

      default:
        return c.json({
          success: false,
          error: `Unsupported format: ${format}. Supported: markdown, csv, summary`
        }, 400);
    }
  } catch (error) {
    console.error('Failed to export statistics:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { batchExperimentRoutes };
