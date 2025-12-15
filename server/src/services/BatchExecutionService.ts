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
import { createValidationService, getErrorSummary, validateUISpecForFrontend, type FrontendValidationResult } from './v4/ValidationService';
import { WidgetSelectionService } from './v4/WidgetSelectionService';
import { ORSGeneratorService } from './v4/ORSGeneratorService';
import { UISpecGeneratorV4 } from './v4/UISpecGeneratorV4';
import { LLMOrchestrator } from './v4/LLMOrchestrator';
import type {
  ModelConfigId,
  BatchExecutionConfig,
  BatchProgress,
  BatchStatus,
  ExperimentInput,
  InputCorpus,
  TrialLogEntry,
  RunningTask,
} from '../types/experiment-trial.types';
import type { LLMCallMetrics, LLMTaskType } from '../types/v4/llm-task.types';
import type { WidgetSelectionResult } from '../types/v4/widget-selection.types';
import type { PlanORS } from '../types/v4/ors.types';
import type { PlanUISpec } from '../types/v4/ui-spec.types';

// ========================================
// Types
// ========================================

interface TrialContext {
  batchId: string;
  experimentId: string;
  trialNumber: number;
  inputId: string;
  modelConfigId: ModelConfigId;
  workerId: number;
}

/** タスクキュー用のタスク定義 */
interface TrialTask {
  trialNumber: number;
  modelConfigId: ModelConfigId;
  input: ExperimentInput;
}

interface StageResult {
  stage: number;
  success: boolean;
  data?: unknown;
  metrics: LLMCallMetrics;
  dslErrors: string[] | null;
  w2wrErrors: string[] | null; // W2WR DSL生成エラー
  typeErrorCount?: number;
  referenceErrorCount?: number;
  cycleDetected?: boolean;
  regenerated: boolean;
  promptData?: string; // 実際にLLMに送信されたプロンプト全文
  inputVariables?: Record<string, unknown>; // プロンプト変数
  // フロントエンド互換検証結果（Stage 3のみ）
  frontendValidation?: FrontendValidationResult;
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
  /** タスクキュー（残りの未実行タスク） */
  taskQueue: TrialTask[];
  /** タスクキューのインデックス（次に取得するタスク） */
  taskQueueIndex: number;
  /** 並列数 */
  parallelism: number;
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

    // タスクキューを作成
    const taskQueue: TrialTask[] = [];
    let trialNumber = 0;
    for (const modelConfigId of config.modelConfigs) {
      for (const input of limitedInputs) {
        trialNumber++;
        taskQueue.push({ trialNumber, modelConfigId, input });
      }
    }

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
        totalStages: totalTrials * 3, // 各試行は3ステージ
        completedStages: 0,
        runningTasks: [],
      },
      taskQueue,
      taskQueueIndex: 0,
      parallelism: config.parallelism,
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

    console.log(`Batch ${batchId} starting with parallelism=${state.parallelism}, totalTrials=${state.progress.totalTrials}`);

    // 並列ワーカーを起動
    const workers = Array(state.parallelism)
      .fill(null)
      .map((_, workerIndex) =>
        this.processTaskQueue(batchId, config.experimentId, workerIndex)
      );

    // 全ワーカーの完了を待機
    await Promise.all(workers);

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
   * ワーカーがタスクキューからタスクを取得して実行
   */
  private async processTaskQueue(
    batchId: string,
    experimentId: string,
    workerId: number
  ): Promise<void> {
    const state = runningBatches.get(batchId);
    if (!state) return;

    console.log(`Worker ${workerId} started for batch ${batchId}`);

    while (!state.shouldStop) {
      // タスクを取得（排他制御）
      const task = this.getNextTask(batchId);
      if (!task) {
        // タスクがなくなったら終了
        break;
      }

      const { trialNumber, modelConfigId, input } = task;

      // runningTasksに追加
      const runningTask: RunningTask = {
        workerId,
        modelConfig: modelConfigId,
        inputId: input.inputId,
        stage: 1,
        startedAt: new Date().toISOString(),
      };
      state.progress.runningTasks.push(runningTask);

      // 後方互換性のために単一タスク情報も更新
      state.progress.currentModelConfig = modelConfigId;
      state.progress.currentInputId = input.inputId;
      state.progress.currentStage = 1;

      const context: TrialContext = {
        batchId,
        experimentId,
        trialNumber,
        inputId: input.inputId,
        modelConfigId,
        workerId,
      };

      try {
        const result = await this.executeTrial(context, input);

        if (result.success) {
          state.progress.completedTrials++;
        } else {
          state.progress.failedTrials++;
        }
      } catch (error) {
        console.error(`Worker ${workerId}: Trial ${trialNumber} failed:`, error);
        state.progress.failedTrials++;
      }

      // runningTasksから削除
      const taskIndex = state.progress.runningTasks.findIndex(t => t.workerId === workerId);
      if (taskIndex !== -1) {
        state.progress.runningTasks.splice(taskIndex, 1);
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

    console.log(`Worker ${workerId} finished for batch ${batchId}`);
  }

  /**
   * タスクキューから次のタスクを取得（排他制御）
   */
  private getNextTask(batchId: string): TrialTask | null {
    const state = runningBatches.get(batchId);
    if (!state) return null;

    if (state.taskQueueIndex >= state.taskQueue.length) {
      return null;
    }

    const task = state.taskQueue[state.taskQueueIndex];
    state.taskQueueIndex++;
    return task;
  }

  /**
   * モデル構成に応じたv4サービス群を作成
   */
  private createV4Services(orchestrator: LLMOrchestrator) {
    return {
      widgetSelectionService: new WidgetSelectionService({
        llmOrchestrator: orchestrator,
        debug: true,
      }),
      orsGeneratorService: new ORSGeneratorService({
        llmOrchestrator: orchestrator,
        debug: true,
        disableFallback: true,  // 実験用：フォールバック無効
      }),
      uiSpecGeneratorService: new UISpecGeneratorV4({
        llmOrchestrator: orchestrator,
        debug: true,
        disableFallback: true,  // 実験用：フォールバック無効
      }),
    };
  }

  /**
   * 単一試行を実行
   *
   * v4サービス群（WidgetSelectionService, ORSGeneratorService, UISpecGeneratorV4）を使用。
   * /research-experiment/new と同じ処理パスを使用することで、プロンプト変数の不足を解消。
   */
  private async executeTrial(
    context: TrialContext,
    input: ExperimentInput
  ): Promise<TrialResult> {
    const { batchId, experimentId, trialNumber, inputId, modelConfigId, workerId } = context;
    const stages: StageResult[] = [];
    let overallSuccess = true;
    let runtimeError = false;

    // モデル構成に応じたOrchestratorを作成
    const orchestrator = createExperimentOrchestrator(modelConfigId);

    // v4サービス群を作成
    const services = this.createV4Services(orchestrator);

    // bottleneckType推定（contextFactors.emotionalStateから）
    const bottleneckType = this.inferBottleneckType(input.contextFactors);
    const sessionId = `batch-${batchId}-${trialNumber}`;

    try {
      // ========================================
      // Stage 1: Widget Selection
      // ========================================
      this.updateStageProgress(batchId, workerId, 1);

      const stage1Result = await this.executeWidgetSelection(
        services,
        input.concernText,
        bottleneckType,
        sessionId
      );
      stages.push(stage1Result);
      await this.logTrialStage(context, 1, stage1Result);

      if (!stage1Result.success) {
        overallSuccess = false;
        return this.createTrialResult(trialNumber, inputId, modelConfigId, stages, overallSuccess, runtimeError);
      }
      this.incrementCompletedStages(batchId);

      const widgetSelectionResult = stage1Result.data as WidgetSelectionResult;

      // ========================================
      // Stage 2: Plan ORS Generation
      // ========================================
      this.updateStageProgress(batchId, workerId, 2);

      const stage2Result = await this.executePlanORSGeneration(
        services,
        input.concernText,
        bottleneckType,
        widgetSelectionResult,
        sessionId
      );
      stages.push(stage2Result);
      await this.logTrialStage(context, 2, stage2Result);

      if (!stage2Result.success) {
        overallSuccess = false;
        return this.createTrialResult(trialNumber, inputId, modelConfigId, stages, overallSuccess, runtimeError);
      }
      this.incrementCompletedStages(batchId);

      const planORS = stage2Result.data as PlanORS;

      // ========================================
      // Stage 3: Plan UISpec Generation
      // ========================================
      this.updateStageProgress(batchId, workerId, 3);

      const stage3Result = await this.executePlanUISpecGeneration(
        services,
        input.concernText,
        widgetSelectionResult,
        planORS,
        sessionId
      );
      stages.push(stage3Result);
      await this.logTrialStage(context, 3, stage3Result);

      if (!stage3Result.success) {
        overallSuccess = false;
      }
      this.incrementCompletedStages(batchId);

    } catch (error) {
      console.error(`Trial ${trialNumber} error:`, error);
      runtimeError = true;
      overallSuccess = false;

      // エラーステージをログに記録
      const currentStage = stages.length + 1;
      const errorResult = this.createErrorStageResult(currentStage, error);
      stages.push(errorResult);
      await this.logTrialStage(context, currentStage, errorResult, true);

      // 残りステージ分のcompletedStagesをインクリメント
      this.incrementCompletedStages(batchId);
    }

    return this.createTrialResult(trialNumber, inputId, modelConfigId, stages, overallSuccess, runtimeError);
  }

  // ========================================
  // Stage Execution Methods
  // ========================================

  /**
   * Stage 1: Widget Selection
   */
  private async executeWidgetSelection(
    services: ReturnType<typeof this.createV4Services>,
    concernText: string,
    bottleneckType: string,
    sessionId: string
  ): Promise<StageResult> {
    const result = await services.widgetSelectionService.selectWidgets({
      concernText,
      bottleneckType,
      sessionId,
    });

    // Widget選定結果の検証
    let dslErrors: string[] | null = null;
    let typeErrorCount = 0;
    let referenceErrorCount = 0;
    let cycleDetected = false;

    if (result.success && result.data) {
      const validationResult = this.validationService.validateWidgetSelection(result.data);
      const summary = getErrorSummary(validationResult);
      dslErrors = summary.dslErrors;
      typeErrorCount = summary.typeErrorCount;
      referenceErrorCount = summary.referenceErrorCount;
      cycleDetected = summary.cycleDetected;
    } else if (!result.success) {
      dslErrors = [result.error?.type ?? 'WIDGET_SELECTION_FAILED'];
    }

    return {
      stage: 1,
      success: result.success && dslErrors === null,
      data: result.data,
      metrics: result.metrics,
      dslErrors,
      w2wrErrors: null,
      typeErrorCount,
      referenceErrorCount,
      cycleDetected,
      regenerated: (result.metrics.retryCount ?? 0) > 0,
      promptData: result.prompt, // 実際にLLMに送信されたプロンプト全文
      inputVariables: {
        concernText,
        bottleneckType,
      },
    };
  }

  /**
   * Stage 2: Plan ORS Generation
   */
  private async executePlanORSGeneration(
    services: ReturnType<typeof this.createV4Services>,
    concernText: string,
    bottleneckType: string,
    widgetSelectionResult: WidgetSelectionResult,
    sessionId: string
  ): Promise<StageResult> {
    const result = await services.orsGeneratorService.generatePlanORS({
      concernText,
      bottleneckType,
      widgetSelectionResult,
      sessionId,
    });

    // PlanORS検証（v5.0）
    let dslErrors: string[] | null = null;
    let typeErrorCount = 0;
    let referenceErrorCount = 0;
    let cycleDetected = false;

    if (result.success && result.data) {
      const validationResult = this.validationService.validatePlanORS(result.data);
      const summary = getErrorSummary(validationResult);
      dslErrors = summary.dslErrors;
      typeErrorCount = summary.typeErrorCount;
      referenceErrorCount = summary.referenceErrorCount;
      cycleDetected = summary.cycleDetected;
    } else if (!result.success) {
      dslErrors = [result.error?.type ?? 'ORS_GENERATION_FAILED'];
    }

    return {
      stage: 2,
      success: result.success && dslErrors === null,
      data: result.data,
      metrics: result.metrics,
      dslErrors,
      w2wrErrors: null,
      typeErrorCount,
      referenceErrorCount,
      cycleDetected,
      regenerated: (result.metrics.retryCount ?? 0) > 0,
      promptData: result.prompt, // 実際にLLMに送信されたプロンプト全文
      inputVariables: {
        concernText,
        bottleneckType,
        widgetSelectionResult: '(omitted for brevity)',
      },
    };
  }

  /**
   * Stage 3: Plan UISpec Generation
   */
  private async executePlanUISpecGeneration(
    services: ReturnType<typeof this.createV4Services>,
    concernText: string,
    widgetSelectionResult: WidgetSelectionResult,
    planORS: PlanORS,
    sessionId: string,
    enableReactivity = true
  ): Promise<StageResult> {
    const result = await services.uiSpecGeneratorService.generatePlanUISpec({
      planORS,
      concernText,
      widgetSelectionResult,
      sessionId,
      enableReactivity,
    });

    // UISpec検証
    let dslErrors: string[] | null = null;
    let w2wrErrors: string[] | null = null;
    let typeErrorCount = 0;
    let referenceErrorCount = 0;
    let cycleDetected = false;

    if (result.success && result.data) {
      const validationResult = this.validationService.validateUISpec(result.data, widgetSelectionResult);
      // NOTE: Stage3ではW2WRエラーを分離するため summary.dslErrors を使わず独自に構築
      const summary = getErrorSummary(validationResult);
      typeErrorCount = summary.typeErrorCount;
      referenceErrorCount = summary.referenceErrorCount;
      cycleDetected = summary.cycleDetected;

      if (!validationResult.valid) {
        // DSLエラーとW2WRエラーを分離（W2WR_SR指標計算用）
        const allErrors = validationResult.errors.map(e => e.type);
        const w2wrTypes = ['CIRCULAR_DEPENDENCY', 'SELF_REFERENCE', 'INVALID_BINDING',
                           'UNKNOWN_SOURCE_WIDGET', 'UNKNOWN_TARGET_WIDGET'];

        const w2wrFound = allErrors.filter(e => w2wrTypes.includes(e));
        const dslFound = allErrors.filter(e => !w2wrTypes.includes(e));

        w2wrErrors = w2wrFound.length > 0 ? w2wrFound : null;
        dslErrors = dslFound.length > 0 ? dslFound : null;
      }
    } else if (!result.success) {
      dslErrors = [result.error?.type ?? 'UISPEC_GENERATION_FAILED'];
    }

    // Stage 3: フロントエンド互換検証をサーバー側で実行
    // SSE切断時も検証結果が保存されるようにする（LL-002対応）
    const frontendValidation = result.success && result.data
      ? validateUISpecForFrontend(result.data as PlanUISpec)
      : undefined;

    return {
      stage: 3,
      success: result.success && dslErrors === null,
      data: result.data,
      metrics: result.metrics,
      dslErrors,
      w2wrErrors,
      typeErrorCount,
      referenceErrorCount,
      cycleDetected,
      regenerated: (result.metrics.retryCount ?? 0) > 0,
      promptData: result.prompt, // 実際にLLMに送信されたプロンプト全文
      inputVariables: {
        concernText,
        enableReactivity,
        planORS: '(omitted for brevity)',
        widgetSelectionResult: '(omitted for brevity)',
      },
      frontendValidation,
    };
  }

  // ========================================
  // Helper Methods for Trial Execution
  // ========================================

  /**
   * ボトルネックタイプ推定
   * emotionalStateからボトルネックタイプを推定
   */
  private inferBottleneckType(contextFactors: { emotionalState?: string }): string {
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
   * ステージ進捗更新
   */
  private updateStageProgress(batchId: string, workerId: number, stage: number): void {
    const state = runningBatches.get(batchId);
    if (state) {
      state.progress.currentStage = stage;
      const runningTask = state.progress.runningTasks.find(t => t.workerId === workerId);
      if (runningTask) {
        runningTask.stage = stage;
      }
    }
  }

  /**
   * 完了ステージ数インクリメント
   */
  private incrementCompletedStages(batchId: string): void {
    const state = runningBatches.get(batchId);
    if (state) {
      state.progress.completedStages++;
    }
  }

  /**
   * エラーステージ結果作成
   */
  private createErrorStageResult(stageNum: number, error: unknown): StageResult {
    const taskType = STAGE_TO_TASK_TYPE[stageNum as 1 | 2 | 3] ?? 'widget_selection';
    return {
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
      w2wrErrors: null,
      typeErrorCount: 0,
      referenceErrorCount: 0,
      cycleDetected: false,
      regenerated: false,
    };
  }

  /**
   * 試行結果作成
   */
  private createTrialResult(
    trialNumber: number,
    inputId: string,
    modelConfigId: ModelConfigId,
    stages: StageResult[],
    dslSuccess: boolean,
    runtimeError: boolean
  ): TrialResult {
    return {
      trialNumber,
      inputId,
      modelConfigId,
      stages,
      success: dslSuccess && !runtimeError, // 全ステージDSL検証成功かつランタイムエラーなし
      runtimeError,
    };
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

    // Stage 3の場合、サーバー側でフロントエンド互換検証を実行済み
    const fv = result.frontendValidation;
    const hasServerValidation = stageNum === 3 && fv !== undefined;

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
      // フロントエンド互換検証結果（サーバー側で実行済みの場合は設定）
      renderErrors: hasServerValidation ? fv.renderErrors : null,
      w2wrErrors: result.w2wrErrors, // W2WR DSL生成エラー
      reactComponentErrors: hasServerValidation ? fv.reactComponentErrors : null,
      jotaiAtomErrors: hasServerValidation ? fv.jotaiAtomErrors : null,
      typeErrorCount: hasServerValidation ? fv.typeErrorCount : (result.typeErrorCount ?? 0),
      referenceErrorCount: hasServerValidation ? fv.referenceErrorCount : (result.referenceErrorCount ?? 0),
      cycleDetected: hasServerValidation ? fv.cycleDetected : (result.cycleDetected ?? false),
      regenerated: result.regenerated,
      runtimeError: isRuntimeError,
      generatedData: result.data ?? null,
      promptData: result.promptData ?? null, // 実際にLLMに送信されたプロンプト全文
      inputVariables: result.inputVariables ?? null, // プロンプト変数
      // サーバー検証タイムスタンプ（LL-001対応: nullの曖昧性を解消）
      serverValidatedAt: hasServerValidation ? new Date(fv.serverValidatedAt) : null,
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
