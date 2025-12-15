/**
 * Widget Selection Service for DSL v4
 *
 * 3段階LLM呼び出しの第1段階：Widget選定サービス。
 * 4ステージ（diverge, organize, converge, summary）分のWidgetを一括選定。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @see specs/discussions/DSLv4_review_minutes.md トピック1
 * @since DSL v4.0
 */

import type {
  WidgetSelectionResult,
  StageSelection,
  SelectedWidget,
  WidgetComponentType,
  StageType,
} from '../../types/v4/widget-selection.types';
import type { WidgetDefinitionV4 } from '../../types/v4/widget-definition.types';
import type { LLMCallResult } from '../../types/v4/llm-task.types';
import { STAGE_ORDER, createEmptyWidgetSelectionResult, isWidgetSelectionResult } from '../../types/v4/widget-selection.types';
import { validateStageComplexity, DEFAULT_COMPLEXITY_RULES, type ComplexityRules } from '../../types/v4/widget-definition.types';
import { LLMOrchestrator } from './LLMOrchestrator';
import { WIDGET_DEFINITIONS_V4, getAllWidgetDefinitionsV4, getWidgetDefinitionV4 } from '../../definitions/v4/widgets';

// =============================================================================
// Types
// =============================================================================

/**
 * Widget選定入力
 */
export interface WidgetSelectionInput {
  /** ユーザーの悩み */
  concernText: string;
  /** 診断されたボトルネック種別 */
  bottleneckType: string;
  /** セッションID */
  sessionId?: string;
}

/**
 * Widget選定サービス設定
 */
export interface WidgetSelectionServiceConfig {
  /** LLM Orchestrator */
  llmOrchestrator: LLMOrchestrator;
  /** Complexity閾値ルール */
  complexityRules?: ComplexityRules;
  /** デバッグモード */
  debug?: boolean;
}

// =============================================================================
// Widget Selection Service
// =============================================================================

/**
 * Widget Selection Service
 *
 * 3段階LLM呼び出しの第1段階を担当。
 * ユーザーの悩みとボトルネック種別に基づいて、4ステージ分のWidgetを選定。
 */
export class WidgetSelectionService {
  private llmOrchestrator: LLMOrchestrator;
  private complexityRules: ComplexityRules;
  private debug: boolean;

  constructor(config: WidgetSelectionServiceConfig) {
    this.llmOrchestrator = config.llmOrchestrator;
    this.complexityRules = config.complexityRules ?? DEFAULT_COMPLEXITY_RULES;
    this.debug = config.debug ?? false;
  }

  /**
   * Widget選定を実行
   *
   * @param input Widget選定入力
   * @returns Widget選定結果
   */
  async selectWidgets(input: WidgetSelectionInput): Promise<LLMCallResult<WidgetSelectionResult>> {
    const { concernText, bottleneckType, sessionId } = input;

    if (this.debug) {
      console.log(`[WidgetSelectionService] Starting widget selection for bottleneck: ${bottleneckType}`);
    }

    // Widget定義を取得
    const widgetDefinitions = getAllWidgetDefinitionsV4();

    // LLM呼び出し
    const result = await this.llmOrchestrator.execute<WidgetSelectionResult>('widget_selection', {
      concernText,
      bottleneckType,
      widgetDefinitions: this.formatWidgetDefinitionsForPrompt(widgetDefinitions),
    });

    // デバッグログ: LLM呼び出し結果
    if (this.debug) {
      console.log(`[WidgetSelectionService] LLM result.success: ${result.success}`);
      console.log(`[WidgetSelectionService] LLM result.data:`, JSON.stringify(result.data, null, 2)?.substring(0, 1000));
      console.log(`[WidgetSelectionService] LLM result.rawOutput:`, result.rawOutput?.substring(0, 500));
    }

    if (!result.success || !result.data) {
      if (this.debug) {
        console.log(`[WidgetSelectionService] LLM call failed, error:`, result.error);
      }
      return result;
    }

    // 結果の検証と補正
    const validatedResult = this.validateAndNormalizeResult(result.data, bottleneckType, sessionId);

    // Complexity検証
    const complexityViolations = this.validateComplexity(validatedResult);
    if (complexityViolations.length > 0) {
      if (this.debug) {
        console.warn(`[WidgetSelectionService] Complexity violations:`, complexityViolations);
      }
      // 違反があっても続行（警告のみ）
    }

    return {
      ...result,
      data: validatedResult,
    };
  }

  /**
   * Widget定義をプロンプト用にフォーマット
   */
  private formatWidgetDefinitionsForPrompt(definitions: WidgetDefinitionV4[]): string {
    return JSON.stringify(
      definitions.map((def) => ({
        id: def.id,
        name: def.name,
        description: def.description,
        stage: def.stage,
        metadata: def.metadata,
        ports: {
          inputs: def.ports.inputs.map((p) => ({
            id: p.id,
            dataType: p.dataType,
            description: p.description,
            required: p.required,
          })),
          outputs: def.ports.outputs.map((p) => ({
            id: p.id,
            dataType: p.dataType,
            description: p.description,
          })),
        },
      })),
      null,
      2
    );
  }

  /**
   * 結果を検証・正規化
   */
  private validateAndNormalizeResult(
    result: unknown,
    bottleneckType: string,
    sessionId?: string
  ): WidgetSelectionResult {
    // 型ガードでチェック
    const isValid = isWidgetSelectionResult(result);

    if (this.debug) {
      console.log(`[WidgetSelectionService] isWidgetSelectionResult: ${isValid}`);
      if (!isValid && typeof result === 'object' && result !== null) {
        const obj = result as Record<string, unknown>;
        console.log(`[WidgetSelectionService] Validation details:`, {
          hasVersion: 'version' in obj,
          version: obj.version,
          hasStages: 'stages' in obj,
          hasRationale: typeof obj.rationale === 'string',
          hasMetadata: typeof obj.metadata === 'object',
        });
      }
    }

    if (isValid) {
      // メタデータを補完
      return {
        ...result,
        metadata: {
          ...result.metadata,
          bottleneckType,
          sessionId,
          generatedAt: result.metadata.generatedAt || Date.now(),
        },
      };
    }

    // 結果がオブジェクトの場合、部分的に変換を試みる
    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      if (this.debug) {
        console.log(`[WidgetSelectionService] Attempting partial conversion...`);
      }
      return this.buildResultFromPartial(obj, bottleneckType, sessionId);
    }

    // 変換失敗時はデフォルト結果を返す
    if (this.debug) {
      console.log(`[WidgetSelectionService] Returning empty fallback result`);
    }
    return createEmptyWidgetSelectionResult(bottleneckType, 'unknown');
  }

  /**
   * 部分的な結果からWidgetSelectionResultを構築
   */
  private buildResultFromPartial(
    obj: Record<string, unknown>,
    bottleneckType: string,
    sessionId?: string
  ): WidgetSelectionResult {
    const result = createEmptyWidgetSelectionResult(bottleneckType, 'unknown');

    // stages が存在する場合
    if (typeof obj.stages === 'object' && obj.stages !== null) {
      const stages = obj.stages as Record<string, unknown>;

      for (const stage of STAGE_ORDER) {
        if (typeof stages[stage] === 'object' && stages[stage] !== null) {
          result.stages[stage] = this.normalizeStageSelection(stages[stage] as Record<string, unknown>);
        }
      }
    }

    // その他のフィールド
    if (typeof obj.rationale === 'string') {
      result.rationale = obj.rationale;
    }
    if (typeof obj.flowDescription === 'string') {
      result.flowDescription = obj.flowDescription;
    }
    if (typeof obj.totalEstimatedDuration === 'number') {
      result.totalEstimatedDuration = obj.totalEstimatedDuration;
    }

    // メタデータ
    result.metadata = {
      generatedAt: Date.now(),
      llmModel: 'unknown',
      bottleneckType,
      sessionId,
    };

    return result;
  }

  /**
   * StageSelectionを正規化
   */
  private normalizeStageSelection(obj: Record<string, unknown>): StageSelection {
    const widgets: SelectedWidget[] = [];

    if (Array.isArray(obj.widgets)) {
      for (const w of obj.widgets) {
        if (typeof w === 'object' && w !== null) {
          const widget = w as Record<string, unknown>;
          const widgetId = widget.widgetId as string;

          if (typeof widgetId === 'string') {
            // Widget IDが有効か確認（未知でも警告のみで続行）
            if (!getWidgetDefinitionV4(widgetId)) {
              console.warn(`[WidgetSelectionService] Unknown widget ID: ${widgetId}, including anyway`);
            }
            widgets.push({
              widgetId: widgetId as WidgetComponentType,
              purpose: typeof widget.purpose === 'string' ? widget.purpose : '',
              order: typeof widget.order === 'number' ? widget.order : widgets.length,
              suggestedConfig: widget.suggestedConfig as Record<string, unknown> | undefined,
            });
          }
        }
      }
    }

    return {
      widgets,
      purpose: typeof obj.purpose === 'string' ? obj.purpose : '',
      target: typeof obj.target === 'string' ? obj.target : '',
      description: typeof obj.description === 'string' ? obj.description : undefined,
      estimatedDuration: typeof obj.estimatedDuration === 'number' ? obj.estimatedDuration : undefined,
    };
  }

  /**
   * Complexity検証
   */
  private validateComplexity(result: WidgetSelectionResult): string[] {
    const violations: string[] = [];

    for (const stage of STAGE_ORDER) {
      const selection = result.stages[stage];
      const widgetDefs: WidgetDefinitionV4[] = [];

      for (const widget of selection.widgets) {
        const def = getWidgetDefinitionV4(widget.widgetId);
        if (def) {
          widgetDefs.push(def);
        }
      }

      const { valid, violations: stageViolations } = validateStageComplexity(widgetDefs, this.complexityRules);
      if (!valid) {
        violations.push(`[${stage}] ${stageViolations.join(', ')}`);
      }
    }

    return violations;
  }

  /**
   * フォールバックWidget選定
   *
   * LLM呼び出しが失敗した場合のフォールバック。
   * ボトルネック種別に基づいてルールベースでWidgetを選定。
   */
  fallbackSelection(input: WidgetSelectionInput): WidgetSelectionResult {
    const { concernText, bottleneckType, sessionId } = input;

    if (this.debug) {
      console.log(`[WidgetSelectionService] Using fallback selection for bottleneck: ${bottleneckType}`);
    }

    // ボトルネック種別に応じたデフォルトWidget
    // 注意: v3実装済みWidgetのみを使用
    const defaultWidgets: Record<string, Record<StageType, WidgetComponentType[]>> = {
      emotion: {
        diverge: ['emotion_palette', 'brainstorm_cards'],
        organize: ['card_sorting'],
        converge: ['priority_slider_grid'],
        summary: ['structured_summary'],  // summary_view → structured_summary
      },
      thought: {
        diverge: ['brainstorm_cards', 'mind_map'],  // concern_map → mind_map
        organize: ['matrix_placement'],
        converge: ['priority_slider_grid'],
        summary: ['structured_summary'],
      },
      action: {
        diverge: ['brainstorm_cards'],
        organize: ['timeline_slider'],  // timeline_view → timeline_slider
        converge: ['priority_slider_grid'],  // action_cards → priority_slider_grid
        summary: ['structured_summary'],
      },
      decision: {
        diverge: ['brainstorm_cards'],
        organize: ['matrix_placement'],
        converge: ['tradeoff_balance'],  // decision_balance → tradeoff_balance
        summary: ['structured_summary'],
      },
    };

    const widgetMap = defaultWidgets[bottleneckType] ?? defaultWidgets.thought;

    const result = createEmptyWidgetSelectionResult(bottleneckType, 'fallback');
    result.rationale = `Fallback selection based on bottleneck type: ${bottleneckType}`;
    result.metadata.sessionId = sessionId;

    for (const stage of STAGE_ORDER) {
      const widgetIds = widgetMap[stage] ?? [];
      result.stages[stage] = {
        widgets: widgetIds.map((id, index) => ({
          widgetId: id,
          purpose: `Default widget for ${stage} stage`,
          order: index,
        })),
        purpose: `Default ${stage} stage`,
        target: concernText.substring(0, 100),
      };
    }

    return result;
  }

  /**
   * Complexity閾値ルールを更新
   */
  updateComplexityRules(rules: Partial<ComplexityRules>): void {
    this.complexityRules = {
      ...this.complexityRules,
      ...rules,
    };
  }
}

// =============================================================================
// ファクトリ関数
// =============================================================================

/**
 * WidgetSelectionServiceインスタンスを作成
 */
export function createWidgetSelectionService(config: WidgetSelectionServiceConfig): WidgetSelectionService {
  return new WidgetSelectionService(config);
}
