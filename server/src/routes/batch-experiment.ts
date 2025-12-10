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
import { MODEL_CONFIGURATIONS, type ModelConfigId } from '../types/experiment-trial.types';

const batchExperimentRoutes = new Hono();

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
    let lastCompleted = -1;
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

      // 進捗が更新された場合のみ送信
      if (progress.completedTrials !== lastCompleted) {
        lastCompleted = progress.completedTrials;

        await stream.writeSSE({
          event: 'progress',
          data: JSON.stringify(progress),
        });
      }

      // 完了チェック
      if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'stopped') {
        await stream.writeSSE({
          event: 'complete',
          data: JSON.stringify(progress),
        });
        break;
      }

      iterations++;
      await stream.sleep(1000); // 1秒間隔
    }
  });
});

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

    // 基本的な集計
    const summary = {
      batchId,
      experimentId: batch.experimentId,
      status: batch.status,
      totalTrials: batch.totalTrials,
      completedTrials: batch.completedTrials,
      failedTrials: batch.failedTrials,
      trialLogCount: trialLogs.length,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
    };

    return c.json({
      success: true,
      summary,
      // 詳細な統計はExperimentStatisticsServiceで計算（Phase 5）
      layer1Results: batch.layer1Results,
      layer4Results: batch.layer4Results,
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
 * GET /api/experiment/batch/corpuses
 * 利用可能な入力コーパス一覧を取得
 */
batchExperimentRoutes.get('/corpuses', async (c) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const corpuses: Array<{ corpusId: string; description: string; inputCount: number }> = [];

    // 1. test_cases コーパス（config/test-cases/*.json）
    try {
      const testCasesDir = path.join(process.cwd(), '..', 'config', 'test-cases');
      const files = await fs.readdir(testCasesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      corpuses.push({
        corpusId: 'test_cases',
        description: 'Expert評価用テストケース',
        inputCount: jsonFiles.length,
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

export { batchExperimentRoutes };
