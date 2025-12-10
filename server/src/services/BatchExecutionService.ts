/**
 * Batch Execution Service
 *
 * Layer1/Layer4自動評価実験用のバッチ実行サービス。
 * 250試行（50入力 × 5構成）のバッチ実行を管理。
 *
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { db } from '../database/index';
import { batchExecutions, experimentTrialLogs } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { createExperimentOrchestrator, STAGE_TO_TASK_TYPE } from './ModelConfigurationService';
import { createValidationService, getErrorSummary } from './v4/ValidationService';
import type {
  ModelConfigId,
  BatchExecutionConfig,
  BatchProgress,
  BatchStatus,
  ExperimentInput,
  InputCorpus,
  TrialLogEntry,
} from '../types/experiment-trial.types';
import type { LLMCallMetrics, LLMTaskType } from '../types/v4/llm-task.types';

// ========================================
// Types
// ========================================

interface TrialContext {
  batchId: string;
  experimentId: string;
  trialNumber: number;
  inputId: string;
  modelConfigId: ModelConfigId;
}

interface StageResult {
  stage: number;
  success: boolean;
  data?: unknown;
  metrics: LLMCallMetrics;
  dslErrors: string[] | null;
  regenerated: boolean;
  promptData?: Record<string, unknown>; // プロンプト変数
}

interface TrialResult {
  trialNumber: number;
  inputId: string;
  modelConfigId: ModelConfigId;
  stages: StageResult[];
  success: boolean;
  runtimeError: boolean;
  errorMessage?: string;
}

interface BatchExecutionState {
  status: BatchStatus;
  shouldStop: boolean;
  progress: BatchProgress;
}

// ========================================
// In-memory state management
// ========================================

/** 実行中のバッチ状態 */
const runningBatches = new Map<string, BatchExecutionState>();

// ========================================
// Service Implementation
// ========================================

export class BatchExecutionService {
  private validationService = createValidationService();

  /**
   * バッチ実行を開始
   */
  async startBatch(config: BatchExecutionConfig): Promise<{ batchId: string; totalTrials: number }> {
    // 入力コーパスを読み込み
    const corpus = await this.loadInputCorpus(config.inputCorpusId);

    // maxTrialsで入力件数を制限
    const effectiveInputCount = config.maxTrials
      ? Math.min(corpus.inputs.length, config.maxTrials)
      : corpus.inputs.length;
    const limitedInputs = corpus.inputs.slice(0, effectiveInputCount);
    const limitedCorpus = { ...corpus, inputs: limitedInputs };

    const totalTrials = limitedInputs.length * config.modelConfigs.length;

    // バッチレコードを作成
    const [batch] = await db
      .insert(batchExecutions)
      .values({
        experimentId: config.experimentId,
        modelConfigs: config.modelConfigs,
        inputCorpusId: config.inputCorpusId,
        parallelism: config.parallelism,
        headlessMode: config.headlessMode,
        maxTrials: config.maxTrials ?? null,
        totalTrials,
        status: 'queued',
      })
      .returning();

    const batchId = batch.id;

    // 実行状態を初期化
    runningBatches.set(batchId, {
      status: 'queued',
      shouldStop: false,
      progress: {
        batchId,
        status: 'queued',
        totalTrials,
        completedTrials: 0,
        failedTrials: 0,
      },
    });

    // 非同期でバッチ実行を開始
    this.executeBatch(batchId, config, limitedCorpus).catch(err => {
      console.error(`Batch ${batchId} failed:`, err);
      this.updateBatchStatus(batchId, 'failed');
    });

    return { batchId, totalTrials };
  }

  /**
   * バッチ実行を停止
   */
  async stopBatch(batchId: string): Promise<boolean> {
    const state = runningBatches.get(batchId);
    if (!state) {
      return false;
    }

    state.shouldStop = true;
    await this.updateBatchStatus(batchId, 'stopped');
    return true;
  }

  /**
   * バッチ進捗を取得
   */
  getProgress(batchId: string): BatchProgress | null {
    const state = runningBatches.get(batchId);
    return state?.progress ?? null;
  }

  /**
   * バッチステータスを取得
   */
  async getBatchStatus(batchId: string): Promise<BatchStatus | null> {
    const [batch] = await db
      .select({ status: batchExecutions.status })
      .from(batchExecutions)
      .where(eq(batchExecutions.id, batchId));

    return (batch?.status as BatchStatus) ?? null;
  }

  // ========================================
  // Private: Batch Execution
  // ========================================

  private async executeBatch(
    batchId: string,
    config: BatchExecutionConfig,
    corpus: InputCorpus
  ): Promise<void> {
    await this.updateBatchStatus(batchId, 'running');

    const state = runningBatches.get(batchId)!;
    state.status = 'running';
    state.progress.status = 'running';

    let trialNumber = 0;
    const results: TrialResult[] = [];

    // モデル構成ごとに実行
    for (const modelConfigId of config.modelConfigs) {
      if (state.shouldStop) break;

      state.progress.currentModelConfig = modelConfigId;

      // 入力ごとに実行
      for (let inputIndex = 0; inputIndex < corpus.inputs.length; inputIndex++) {
        if (state.shouldStop) break;

        trialNumber++;
        const input = corpus.inputs[inputIndex];
        state.progress.currentInputIndex = inputIndex;
        state.progress.currentInputId = input.inputId;

        const context: TrialContext = {
          batchId,
          experimentId: config.experimentId,
          trialNumber,
          inputId: input.inputId,
          modelConfigId,
        };

        try {
          const result = await this.executeTrial(context, input);
          results.push(result);

          if (result.success) {
            state.progress.completedTrials++;
          } else {
            state.progress.failedTrials++;
          }
        } catch (error) {
          console.error(`Trial ${trialNumber} failed:`, error);
          state.progress.failedTrials++;

          // エラー時もログを記録
          results.push({
            trialNumber,
            inputId: input.inputId,
            modelConfigId,
            stages: [],
            success: false,
            runtimeError: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        // 進捗をDBに更新
        await db
          .update(batchExecutions)
          .set({
            completedTrials: state.progress.completedTrials,
            failedTrials: state.progress.failedTrials,
          })
          .where(eq(batchExecutions.id, batchId));
      }
    }

    // バッチ完了
    const finalStatus: BatchStatus = state.shouldStop ? 'stopped' : 'completed';
    await this.updateBatchStatus(batchId, finalStatus);

    // 完了時刻を記録
    await db
      .update(batchExecutions)
      .set({
        completedAt: new Date(),
      })
      .where(eq(batchExecutions.id, batchId));

    console.log(`Batch ${batchId} ${finalStatus}: ${state.progress.completedTrials}/${state.progress.totalTrials} completed`);
  }

  /**
   * 単一試行を実行
   */
  private async executeTrial(
    context: TrialContext,
    input: ExperimentInput
  ): Promise<TrialResult> {
    const { batchId, experimentId, trialNumber, inputId, modelConfigId } = context;
    const stages: StageResult[] = [];
    let overallSuccess = true;
    let runtimeError = false;

    // モデル構成に応じたOrchestratorを作成
    const orchestrator = createExperimentOrchestrator(modelConfigId);

    // 3ステージを順番に実行
    for (const stageNum of [1, 2, 3] as const) {
      const taskType = STAGE_TO_TASK_TYPE[stageNum];

      // 現在のステージを更新
      const state = runningBatches.get(batchId);
      if (state) {
        state.progress.currentStage = stageNum;
      }

      try {
        const result = await this.executeStage(
          orchestrator,
          taskType,
          stageNum,
          input,
          stages
        );

        stages.push(result);

        // ステージごとにログを記録
        await this.logTrialStage(context, stageNum, result);

        if (!result.success) {
          overallSuccess = false;
        }
      } catch (error) {
        console.error(`Stage ${stageNum} error:`, error);
        runtimeError = true;
        overallSuccess = false;

        // エラーステージをログに記録
        const errorResult: StageResult = {
          stage: stageNum,
          success: false,
          metrics: {
            taskType,
            modelId: 'unknown',
            latencyMs: 0,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          },
          dslErrors: ['RUNTIME_ERROR'],
          regenerated: false,
        };
        stages.push(errorResult);
        await this.logTrialStage(context, stageNum, errorResult, true);

        break; // 以降のステージはスキップ
      }
    }

    return {
      trialNumber,
      inputId,
      modelConfigId,
      stages,
      success: overallSuccess,
      runtimeError,
    };
  }

  /**
   * 単一ステージを実行
   */
  private async executeStage(
    orchestrator: ReturnType<typeof createExperimentOrchestrator>,
    taskType: LLMTaskType,
    stageNum: number,
    input: ExperimentInput,
    previousStages: StageResult[]
  ): Promise<StageResult> {
    // プロンプト変数を構築
    const variables = this.buildPromptVariables(taskType, input, previousStages);

    // LLM呼び出し
    const result = await orchestrator.execute(taskType, variables);

    // DSL検証
    let dslErrors: string[] | null = null;
    if (result.success && result.data) {
      const validationResult = this.validateStageOutput(stageNum, result.data);
      const errorSummary = getErrorSummary(validationResult);
      dslErrors = errorSummary.dslErrors;
    } else if (!result.success) {
      dslErrors = [result.error?.type ?? 'UNKNOWN_ERROR'];
    }

    return {
      stage: stageNum,
      success: result.success && dslErrors === null,
      data: result.data,
      metrics: result.metrics,
      dslErrors,
      regenerated: (result.metrics.retryCount ?? 0) > 0,
      promptData: variables,
    };
  }

  /**
   * プロンプト変数を構築
   */
  private buildPromptVariables(
    taskType: LLMTaskType,
    input: ExperimentInput,
    previousStages: StageResult[]
  ): Record<string, unknown> {
    const base = {
      concernText: input.concernText,
      contextFactors: input.contextFactors,
    };

    switch (taskType) {
      case 'widget_selection':
        return base;

      case 'plan_ors_generation':
        const widgetSelection = previousStages.find(s => s.stage === 1)?.data;
        return {
          ...base,
          widgetSelection,
        };

      case 'plan_uispec_generation':
        const ors = previousStages.find(s => s.stage === 2)?.data;
        return {
          ...base,
          ors,
        };

      default:
        return base;
    }
  }

  /**
   * ステージ出力を検証
   */
  private validateStageOutput(stageNum: number, data: unknown) {
    // 簡略化した検証（詳細な検証はValidationServiceで行う）
    switch (stageNum) {
      case 1:
        return this.validationService.validateWidgetSelection(data as any);
      case 2:
        return this.validationService.validateORS(data as any);
      case 3:
        return this.validationService.validateUISpec(data as any, {} as any);
      default:
        return { valid: true, errors: [], warnings: [], info: [], validatedAt: Date.now() };
    }
  }

  /**
   * 試行ステージログをDBに記録
   */
  private async logTrialStage(
    context: TrialContext,
    stageNum: number,
    result: StageResult,
    isRuntimeError = false
  ): Promise<void> {
    const { batchId, experimentId, trialNumber, inputId, modelConfigId } = context;

    const modelConfig = modelConfigId; // 'A', 'B', 'C', 'D', 'E'

    await db.insert(experimentTrialLogs).values({
      experimentId,
      batchId,
      trialNumber,
      inputId,
      modelConfig,
      modelRouterSelection: null, // TODO: model-router使用時に取得
      stage: stageNum,
      inputTokens: result.metrics.inputTokens ?? 0,
      outputTokens: result.metrics.outputTokens ?? 0,
      latencyMs: result.metrics.latencyMs,
      dslErrors: result.dslErrors,
      renderErrors: null, // フロントエンドからのフィードバック待ち
      typeErrorCount: 0,
      referenceErrorCount: 0,
      cycleDetected: false,
      regenerated: result.regenerated,
      runtimeError: isRuntimeError,
      generatedData: result.data ?? null,
      promptData: result.promptData ?? null,
    });
  }

  // ========================================
  // Private: Helper Methods
  // ========================================

  private async updateBatchStatus(batchId: string, status: BatchStatus): Promise<void> {
    const state = runningBatches.get(batchId);
    if (state) {
      state.status = status;
      state.progress.status = status;
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'running') {
      updateData.startedAt = new Date();
    }

    await db
      .update(batchExecutions)
      .set(updateData)
      .where(eq(batchExecutions.id, batchId));
  }

  /**
   * 入力コーパスを読み込み
   */
  private async loadInputCorpus(corpusId: string): Promise<InputCorpus> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // test_cases コーパスの場合、config/test-cases/*.json を読み込む
    if (corpusId === 'test_cases') {
      // server/ から実行されるので、親ディレクトリの config/ を参照
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

      console.log(`Loaded ${inputs.length} test cases as input corpus`);
      return {
        corpusId: 'test_cases',
        description: `${inputs.length} expert evaluation test cases`,
        inputs,
      };
    }

    // その他のコーパスID: config/experiment-input-corpus.json から読み込み
    const corpusPath = path.join(process.cwd(), '..', 'config', 'experiment-input-corpus.json');
    try {
      const content = await fs.readFile(corpusPath, 'utf-8');
      const corpus = JSON.parse(content) as InputCorpus;
      console.log(`Loaded corpus '${corpusId}' with ${corpus.inputs.length} inputs`);
      return corpus;
    } catch (err) {
      throw new Error(`Corpus not found: ${corpusId}. Create config/experiment-input-corpus.json or use 'test_cases' as corpusId.`);
    }
  }
}

// ========================================
// Factory Functions
// ========================================

let serviceInstance: BatchExecutionService | null = null;

/**
 * BatchExecutionServiceインスタンスを取得
 */
export function getBatchExecutionService(): BatchExecutionService {
  if (!serviceInstance) {
    serviceInstance = new BatchExecutionService();
  }
  return serviceInstance;
}

/**
 * バッチ実行を開始（便利関数）
 */
export async function startBatch(config: BatchExecutionConfig): Promise<{ batchId: string; totalTrials: number }> {
  return getBatchExecutionService().startBatch(config);
}

/**
 * バッチ実行を停止（便利関数）
 */
export async function stopBatch(batchId: string): Promise<boolean> {
  return getBatchExecutionService().stopBatch(batchId);
}

/**
 * バッチ進捗を取得（便利関数）
 */
export function getBatchProgress(batchId: string): BatchProgress | null {
  return getBatchExecutionService().getProgress(batchId);
}
