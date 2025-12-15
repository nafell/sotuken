/**
 * Model Configuration Service
 *
 * Layer1/Layer4自動評価実験用のモデル構成管理サービス。
 * 5つのモデル構成（A-E）に応じたLLMOrchestratorを作成。
 *
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { LLMOrchestrator, createLLMOrchestratorWithDefaultPrompts } from './v4/LLMOrchestrator';
import type { ModelConfig, LLMTaskType } from '../types/v4/llm-task.types';
import { MODEL_CONFIGURATIONS, type ModelConfigId, type ModelConfiguration } from '../types/experiment-trial.types';

// ========================================
// 実験用LLMパラメータ（設計書5章）
// ========================================

/**
 * 実験用固定パラメータ
 * 乱数ゆらぎの排除と結果の再現性確保
 */
export const EXPERIMENT_LLM_PARAMS = {
  temperature: 0.0,
  topP: 1.0,
} as const;

// ========================================
// ステージとタスク種別のマッピング
// ========================================

/**
 * 3ステージとLLMTaskTypeの対応
 * - Stage 1: Widget選定 → widget_selection
 * - Stage 2: ORS + DependencyGraph → plan_ors_generation
 * - Stage 3: UISpec + ReactiveBinding → plan_uispec_generation
 */
export const STAGE_TO_TASK_TYPE: Record<1 | 2 | 3, LLMTaskType> = {
  1: 'widget_selection',
  2: 'plan_ors_generation',
  3: 'plan_uispec_generation',
} as const;

// ========================================
// Service Implementation
// ========================================

/**
 * モデル構成サービス
 */
export class ModelConfigurationService {
  private static instance: ModelConfigurationService;

  private constructor() {}

  static getInstance(): ModelConfigurationService {
    if (!ModelConfigurationService.instance) {
      ModelConfigurationService.instance = new ModelConfigurationService();
    }
    return ModelConfigurationService.instance;
  }

  /**
   * 利用可能なモデル構成一覧を取得
   */
  getAvailableConfigurations(): ModelConfiguration[] {
    return Object.values(MODEL_CONFIGURATIONS);
  }

  /**
   * モデル構成IDから構成情報を取得
   */
  getConfiguration(configId: ModelConfigId): ModelConfiguration {
    const config = MODEL_CONFIGURATIONS[configId];
    if (!config) {
      throw new Error(`Unknown model configuration: ${configId}`);
    }
    return config;
  }

  /**
   * モデル構成に応じたLLMOrchestratorを作成
   *
   * @param configId モデル構成ID（A-E）
   * @param onMetrics オプションのメトリクスコールバック
   * @returns 設定済みLLMOrchestrator
   */
  createOrchestratorForConfig(
    configId: ModelConfigId,
    onMetrics?: (metrics: { taskType: LLMTaskType; modelId: string; [key: string]: unknown }) => void
  ): LLMOrchestrator {
    const config = this.getConfiguration(configId);

    // デフォルトプロンプト付きOrchestratorを作成
    const orchestrator = createLLMOrchestratorWithDefaultPrompts({
      onMetrics,
      debug: false,
    });

    // 各ステージのモデル設定を適用
    for (let stage = 1; stage <= 3; stage++) {
      const modelId = config.stages[stage - 1];
      const taskType = STAGE_TO_TASK_TYPE[stage as 1 | 2 | 3];

      const modelConfig: ModelConfig = {
        provider: 'azure',
        modelId,
        temperature: EXPERIMENT_LLM_PARAMS.temperature,
        topP: EXPERIMENT_LLM_PARAMS.topP,
      };

      orchestrator.updateTaskConfig(taskType, {
        model: modelConfig,
      });
    }

    return orchestrator;
  }

  /**
   * 特定ステージ用のModelConfigを取得
   *
   * @param configId モデル構成ID
   * @param stage ステージ番号 (1-3)
   */
  getModelConfigForStage(configId: ModelConfigId, stage: 1 | 2 | 3): ModelConfig {
    const config = this.getConfiguration(configId);
    const modelId = config.stages[stage - 1];

    return {
      provider: 'azure',
      modelId,
      temperature: EXPERIMENT_LLM_PARAMS.temperature,
      topP: EXPERIMENT_LLM_PARAMS.topP,
    };
  }

  /**
   * モデル構成がmodel-routerを使用しているか判定
   */
  usesModelRouter(configId: ModelConfigId): boolean {
    const config = this.getConfiguration(configId);
    return config.stages.some(model => model === 'model-router');
  }

  /**
   * 全ステージでmodel-routerを使用しているか判定
   */
  isFullyRouterBased(configId: ModelConfigId): boolean {
    const config = this.getConfiguration(configId);
    return config.stages.every(model => model === 'model-router');
  }
}

// ========================================
// ファクトリ関数
// ========================================

/**
 * ModelConfigurationServiceインスタンスを取得
 */
export function getModelConfigurationService(): ModelConfigurationService {
  return ModelConfigurationService.getInstance();
}

/**
 * モデル構成IDに対応するLLMOrchestratorを直接作成
 */
export function createExperimentOrchestrator(
  configId: ModelConfigId,
  onMetrics?: (metrics: { taskType: LLMTaskType; modelId: string; [key: string]: unknown }) => void
): LLMOrchestrator {
  return getModelConfigurationService().createOrchestratorForConfig(configId, onMetrics);
}

/**
 * 全モデル構成のサマリーを取得（デバッグ用）
 */
export function getConfigurationSummary(): string {
  const service = getModelConfigurationService();
  const configs = service.getAvailableConfigurations();

  return configs.map(c =>
    `${c.id}: ${c.name}\n  Stage1: ${c.stages[0]}, Stage2: ${c.stages[1]}, Stage3: ${c.stages[2]}`
  ).join('\n');
}
