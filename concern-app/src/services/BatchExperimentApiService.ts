/**
 * Batch Experiment API Service
 *
 * Layer1/Layer4自動評価実験のバッチAPIクライアント
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

// ========================================
// Types
// ========================================

export type ModelConfigId = 'A' | 'B' | 'C' | 'D' | 'E';
export type BatchStatus = 'queued' | 'running' | 'completed' | 'failed' | 'stopped';

export interface ModelConfiguration {
  id: ModelConfigId;
  name: string;
  stages: [string, string, string];
}

/** 並列実行中のタスク情報 */
export interface RunningTask {
  workerId: number;
  modelConfig: ModelConfigId;
  inputId: string;
  stage: number;
  startedAt: string;
}

export interface BatchProgress {
  batchId: string;
  status: BatchStatus;
  totalTrials: number;
  completedTrials: number;
  failedTrials: number;
  /** ステージ単位の進捗（試行×3） */
  totalStages?: number;
  completedStages?: number;
  /** 並列実行中の全タスク */
  runningTasks?: RunningTask[];
  // 後方互換性のために残す
  currentModelConfig?: ModelConfigId;
  currentInputIndex?: number;
  currentStage?: number;
  currentInputId?: string;
}

export interface Layer1Metrics {
  VR: number;
  TCR: number;
  RRR: number;
  CDR: number;
  RGR: number;
  W2WR_SR: number;
  RC_SR: number;
  JA_SR: number;
}

export interface Layer4Metrics {
  LAT: number;
  COST: number;
  FR: number;
}

export interface ModelStatistics {
  modelConfig: string;
  trialCount: number;
  layer1: Layer1Metrics;
  layer4: Layer4Metrics;
}

export interface BatchResultsSummary {
  batchId: string;
  experimentId: string;
  totalTrials: number;
  completedTrials: number;
  failedTrials: number;
  byModel: ModelStatistics[];
  overall: {
    layer1: Layer1Metrics;
    layer4: Layer4Metrics;
  };
  // 設定情報
  modelConfigs?: ModelConfigId[];
  inputCorpusId?: string;
  parallelism?: number;
  maxTrials?: number | null;
  // タイミング
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
}

export interface BatchInfo {
  id: string;
  experimentId: string;
  modelConfigs: ModelConfigId[];
  inputCorpusId: string;
  parallelism: number;
  headlessMode: boolean;
  status: BatchStatus;
  totalTrials: number;
  completedTrials: number;
  failedTrials: number;
  startedAt?: string;
  completedAt?: string;
  layer1Results?: Layer1Metrics;
  layer4Results?: Layer4Metrics;
  createdAt: string;
}

export interface TrialLog {
  id: string;
  experimentId: string;
  batchId: string;
  trialNumber: number;
  inputId: string;
  modelConfig: string;
  modelRouterSelection: string[] | null;
  stage: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  dslErrors: string[] | null;
  renderErrors: string[] | null;
  w2wrErrors: string[] | null;
  reactComponentErrors: string[] | null;
  jotaiAtomErrors: string[] | null;
  typeErrorCount: number;
  referenceErrorCount: number;
  cycleDetected: boolean;
  regenerated: boolean;
  runtimeError: boolean;
  timestamp: string;
  // 生成データ（DSL参照用）
  generatedData?: unknown;
  promptData?: string; // 実際にLLMに送信されたプロンプト全文
  inputVariables?: Record<string, unknown>; // プロンプト変数
}

export interface CorpusMetadata {
  w2wrDistribution: Record<string, number>;
  complexityDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
}

export interface CorpusInfo {
  corpusId: string;
  description: string;
  inputCount: number;
  metadata?: CorpusMetadata;
}

// ========================================
// API Service
// ========================================

export class BatchExperimentApiService {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * 利用可能なモデル構成を取得
   */
  async getConfigs(): Promise<ModelConfiguration[]> {
    const response = await fetch(`${this.baseUrl}/api/experiment/batch/configs`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to get configs');
    }
    return data.configs;
  }

  /**
   * 利用可能なコーパス一覧を取得
   */
  async getCorpuses(): Promise<CorpusInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/experiment/batch/corpuses`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to get corpuses');
    }
    return data.corpuses;
  }

  /**
   * バッチ実行を開始
   */
  async startBatch(params: {
    experimentId: string;
    modelConfigs: ModelConfigId[];
    inputCorpusId: string;
    parallelism?: number;
    headlessMode?: boolean;
    maxTrials?: number;
  }): Promise<{ batchId: string; totalTrials: number }> {
    const response = await fetch(`${this.baseUrl}/api/experiment/batch/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to start batch');
    }
    return { batchId: data.batchId, totalTrials: data.totalTrials };
  }

  /**
   * バッチステータスを取得
   */
  async getBatchStatus(batchId: string): Promise<{
    status: BatchStatus;
    progress: BatchProgress;
    startedAt?: string;
    completedAt?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/experiment/batch/${batchId}/status`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to get batch status');
    }
    return {
      status: data.status,
      progress: data.progress,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
    };
  }

  /**
   * バッチ実行を停止
   */
  async stopBatch(batchId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/experiment/batch/${batchId}/stop`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to stop batch');
    }
  }

  /**
   * バッチ結果を取得
   */
  async getBatchResults(batchId: string): Promise<{
    summary: BatchResultsSummary | null;
    layer1Results?: Layer1Metrics;
    layer4Results?: Layer4Metrics;
  }> {
    const response = await fetch(`${this.baseUrl}/api/experiment/batch/${batchId}/results`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to get batch results');
    }
    return {
      summary: data.summary,
      layer1Results: data.layer1Results,
      layer4Results: data.layer4Results,
    };
  }

  /**
   * バッチ一覧を取得
   */
  async getBatches(limit = 20, offset = 0): Promise<BatchInfo[]> {
    const response = await fetch(
      `${this.baseUrl}/api/experiment/batch?limit=${limit}&offset=${offset}`
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to get batches');
    }
    return data.batches;
  }

  /**
   * 試行ログ一覧を取得
   */
  async getTrialLogs(
    batchId: string,
    filters?: { modelConfig?: string; stage?: number }
  ): Promise<TrialLog[]> {
    let url = `${this.baseUrl}/api/experiment/batch/${batchId}/trials`;
    const params = new URLSearchParams();
    if (filters?.modelConfig) params.append('modelConfig', filters.modelConfig);
    if (filters?.stage) params.append('stage', filters.stage.toString());
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to get trial logs');
    }
    return data.trials;
  }

  /**
   * エクスポートURLを取得
   */
  getExportUrl(batchId: string, format: 'json' | 'csv' = 'json'): string {
    return `${this.baseUrl}/api/experiment/batch/${batchId}/export?format=${format}`;
  }

  /**
   * フロントエンド検証結果をサーバーに送信
   */
  async sendRenderFeedback(
    trialId: string,
    feedback: {
      stage: number;
      renderErrors?: string[] | null;
      reactComponentErrors?: string[] | null;
      jotaiAtomErrors?: string[] | null;
      typeErrorCount?: number;
      referenceErrorCount?: number;
      cycleDetected?: boolean;
    }
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/experiment/trials/${trialId}/render-feedback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      }
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to send render feedback');
    }
  }

  /**
   * SSE進捗ストリームに接続
   */
  subscribeToProgress(
    batchId: string,
    callbacks: {
      onProgress: (progress: BatchProgress) => void;
      onComplete: (progress: BatchProgress) => void;
      onError?: (error: Error) => void;
    }
  ): () => void {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/experiment/batch/${batchId}/progress`
    );

    eventSource.addEventListener('progress', (event) => {
      try {
        const progress = JSON.parse(event.data);
        callbacks.onProgress(progress);
      } catch (e) {
        callbacks.onError?.(new Error('Failed to parse progress event'));
      }
    });

    eventSource.addEventListener('complete', (event) => {
      try {
        const progress = JSON.parse(event.data);
        callbacks.onComplete(progress);
        eventSource.close();
      } catch (e) {
        callbacks.onError?.(new Error('Failed to parse complete event'));
      }
    });

    eventSource.onerror = () => {
      callbacks.onError?.(new Error('SSE connection error'));
      eventSource.close();
    };

    // クリーンアップ関数を返す
    return () => eventSource.close();
  }
}

// シングルトンインスタンス
let apiInstance: BatchExperimentApiService | null = null;

export function getBatchExperimentApi(): BatchExperimentApiService {
  if (!apiInstance) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
    apiInstance = new BatchExperimentApiService(baseUrl);
  }
  return apiInstance;
}
