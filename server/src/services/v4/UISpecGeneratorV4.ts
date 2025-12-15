/**
 * UISpec Generator Service for DSL v4
 *
 * 3段階LLM呼び出しの第3段階：UISpec + ReactiveBinding生成サービス。
 * ORSとWidget選定結果に基づいて、UISpecを生成。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @see specs/discussions/DSLv4_review_minutes.md トピック3
 * @since DSL v4.0
 */

import type {
  UISpec,
  WidgetSpec,
  DataBindingSpec,
  ScreenLayout,
  LayoutType,
  UISpecMetadata,
  WidgetConfig,
  DataBindingDirection,
  PlanUISpec,
  SectionSpec,
  SectionHeader,
  PlanLayout,
  SectionType,
} from '../../types/v4/ui-spec.types';
import type {
  ReactiveBindingSpec,
  ReactiveBinding,
  WidgetRelationshipSpec,
  UpdateMode,
  BindingMechanism,
  WidgetPortPath,
} from '../../types/v4/reactive-binding.types';
import type { ORS, StageType, Entity, Attribute, PlanORS, PlanSectionType } from '../../types/v4/ors.types';
import type { StageSelection, SelectedWidget, SuggestedBinding, WidgetSelectionResult } from '../../types/v4/widget-selection.types';
import type { LLMCallResult } from '../../types/v4/llm-task.types';
import type { WidgetDefinitionV4 } from '../../types/v4/widget-definition.types';
import { isUISpec, isPlanUISpec, createEmptyUISpec, createEmptyPlanUISpec, createWidgetSpec, createDataBindingSpec } from '../../types/v4/ui-spec.types';
import {
  createReactiveBindingSpec,
  createReactiveBinding,
  createPassthroughRelationship,
  createWidgetJavaScriptRelationship,
} from '../../types/v4/reactive-binding.types';
import { LLMOrchestrator } from './LLMOrchestrator';
import { getWidgetDefinitionV4 } from '../../definitions/v4/widgets';

// =============================================================================
// Types
// =============================================================================

/**
 * UISpec生成入力
 */
export interface UISpecGeneratorInput {
  /** ORS（データ構造） */
  ors: ORS;
  /** 選定されたWidget情報 */
  stageSelection: StageSelection;
  /** ステージ種別 */
  stage: StageType;
  /** セッションID */
  sessionId: string;
  /** Reactivity有効フラグ */
  enableReactivity?: boolean;
}

/**
 * DSL v5: Plan統合UISpec生成入力
 */
export interface PlanUISpecGeneratorInput {
  /** PlanORS（データ構造） */
  planORS: PlanORS;
  /** ユーザーの悩み */
  concernText: string;
  /** Widget選定結果（全ステージ分） */
  widgetSelectionResult: WidgetSelectionResult;
  /** セッションID */
  sessionId: string;
  /** Reactivity有効フラグ */
  enableReactivity?: boolean;
}

/**
 * UISpec Generator Service設定
 */
export interface UISpecGeneratorServiceConfig {
  /** LLM Orchestrator */
  llmOrchestrator: LLMOrchestrator;
  /** デバッグモード */
  debug?: boolean;
  /** フォールバック無効化（実験用：エラーをそのまま返す） */
  disableFallback?: boolean;
}

// =============================================================================
// UISpec Generator Service
// =============================================================================

/**
 * UISpec Generator Service
 *
 * 3段階LLM呼び出しの第3段階を担当。
 * ORSのエンティティ・属性と選定Widgetのポートを対応付け、
 * UISpecとReactiveBindingSpecを生成。
 */
export class UISpecGeneratorV4 {
  private llmOrchestrator: LLMOrchestrator;
  private debug: boolean;
  private disableFallback: boolean;

  constructor(config: UISpecGeneratorServiceConfig) {
    this.llmOrchestrator = config.llmOrchestrator;
    this.debug = config.debug ?? false;
    this.disableFallback = config.disableFallback ?? false;
  }

  /**
   * UISpec生成を実行
   *
   * @param input UISpec生成入力
   * @returns UISpec生成結果
   */
  async generateUISpec(input: UISpecGeneratorInput): Promise<LLMCallResult<UISpec>> {
    const { ors, stageSelection, stage, sessionId, enableReactivity = true } = input;

    if (this.debug) {
      console.log(`[UISpecGeneratorV4] Starting UISpec generation for stage: ${stage}`);
    }

    // Widget定義情報を収集
    const widgetDefinitions = this.collectWidgetDefinitions(stageSelection);

    // LLM呼び出し
    const result = await this.llmOrchestrator.execute<UISpec>('uispec_generation', {
      ors: JSON.stringify(ors, null, 2),
      stageSelection: JSON.stringify(stageSelection, null, 2),
      stage,
      widgetDefinitions: JSON.stringify(widgetDefinitions, null, 2),
      enableReactivity: enableReactivity.toString(),
    });

    if (!result.success || !result.data) {
      return result;
    }

    // 結果の検証と補正
    const validatedUISpec = this.validateAndNormalizeUISpec(result.data, ors, stageSelection, stage, sessionId, enableReactivity);

    return {
      ...result,
      data: validatedUISpec,
    };
  }

  // ===========================================================================
  // DSL v5: Plan統合UISpec生成
  // ===========================================================================

  /**
   * Plan統合UISpec生成を実行
   *
   * DSL v5のPlanフェーズ用。diverge/organize/convergeの3セクション分の
   * UISpecを1回のLLM呼び出しで生成する。
   *
   * 改善点（v5.1）:
   * - プロンプトにgeneratedValueチェックリストを追加
   * - W2WR接続ヒントを明示的に提供
   * - 各セクションのポート情報を整形して渡す
   *
   * @param input Plan UISpec生成入力
   * @returns Plan UISpec生成結果
   */
  async generatePlanUISpec(input: PlanUISpecGeneratorInput): Promise<LLMCallResult<PlanUISpec>> {
    const { planORS, concernText, widgetSelectionResult, sessionId, enableReactivity = true } = input;

    if (this.debug) {
      console.log(`[UISpecGeneratorV4] Starting Plan UISpec generation for session: ${sessionId}`);
    }

    // 各セクションのWidget定義情報を収集
    const divergeDefinitions = this.collectWidgetDefinitions(widgetSelectionResult.stages.diverge);
    const organizeDefinitions = this.collectWidgetDefinitions(widgetSelectionResult.stages.organize);
    const convergeDefinitions = this.collectWidgetDefinitions(widgetSelectionResult.stages.converge);

    // 全Widget定義を統合（チェックリスト生成用）
    const allDefinitions = [...divergeDefinitions, ...organizeDefinitions, ...convergeDefinitions];

    // プロンプト用の追加コンテキストを生成
    const divergePortInfo = this.formatPortInfoForPrompt(divergeDefinitions);
    const organizePortInfo = this.formatPortInfoForPrompt(organizeDefinitions);
    const convergePortInfo = this.formatPortInfoForPrompt(convergeDefinitions);
    const w2wrHints = this.generateW2WRHints(widgetSelectionResult);
    const generatedValueChecklist = this.generateGeneratedValueChecklist(allDefinitions);

    if (this.debug) {
      console.log(`[UISpecGeneratorV4] W2WR Hints:\n${w2wrHints}`);
      console.log(`[UISpecGeneratorV4] GeneratedValue Checklist:\n${generatedValueChecklist}`);
    }

    // LLM呼び出し
    const result = await this.llmOrchestrator.execute<PlanUISpec>('plan_uispec_generation', {
      ors: JSON.stringify(planORS, null, 2),
      concernText,
      divergeSelection: this.formatSelectionForPrompt(widgetSelectionResult.stages.diverge),
      divergePurpose: widgetSelectionResult.stages.diverge.purpose,
      divergeTarget: widgetSelectionResult.stages.diverge.target,
      divergePortInfo,
      organizeSelection: this.formatSelectionForPrompt(widgetSelectionResult.stages.organize),
      organizePurpose: widgetSelectionResult.stages.organize.purpose,
      organizeTarget: widgetSelectionResult.stages.organize.target,
      organizePortInfo,
      convergeSelection: this.formatSelectionForPrompt(widgetSelectionResult.stages.converge),
      convergePurpose: widgetSelectionResult.stages.converge.purpose,
      convergeTarget: widgetSelectionResult.stages.converge.target,
      convergePortInfo,
      widgetDefinitions: JSON.stringify({
        diverge: divergeDefinitions,
        organize: organizeDefinitions,
        converge: convergeDefinitions,
      }, null, 2),
      enableReactivity: enableReactivity.toString(),
      w2wrHints,
      generatedValueChecklist,
      sessionId,
    });

    if (!result.success || !result.data) {
      if (this.disableFallback) {
        // フォールバック無効時：エラーをそのまま返す（実験失敗として記録可能）
        if (this.debug) {
          console.log(`[UISpecGeneratorV4] Plan UISpec generation failed, fallback disabled - returning error`);
        }
        return result;
      }
      // フォールバック
      if (this.debug) {
        console.log(`[UISpecGeneratorV4] Plan UISpec generation failed, using fallback`);
      }
      return {
        ...result,
        data: this.fallbackPlanUISpec(input),
      };
    }

    // 結果の検証と補正
    const validatedPlanUISpec = this.validateAndNormalizePlanUISpec(
      result.data,
      planORS,
      widgetSelectionResult,
      sessionId,
      enableReactivity
    );

    // 生成後検証（警告ログ出力）
    this.validateGeneratedContent(validatedPlanUISpec, widgetSelectionResult, enableReactivity);

    return {
      ...result,
      data: validatedPlanUISpec,
    };
  }

  /**
   * StageSelectionをプロンプト用文字列にフォーマット
   */
  private formatSelectionForPrompt(stageSelection: StageSelection): string {
    return stageSelection.widgets
      .map((w, i) => `${i + 1}. ${w.widgetId} - ${w.purpose}`)
      .join('\n');
  }

  /**
   * PlanUISpec検証・正規化
   */
  private validateAndNormalizePlanUISpec(
    result: unknown,
    planORS: PlanORS,
    widgetSelectionResult: WidgetSelectionResult,
    sessionId: string,
    enableReactivity: boolean
  ): PlanUISpec {
    if (this.debug) {
      console.log('[UISpecGeneratorV4] Validating Plan UISpec...');
    }

    // 型ガードでチェック
    if (isPlanUISpec(result)) {
      // メタデータを補完
      return {
        ...result,
        sessionId,
        metadata: {
          ...result.metadata,
          generatedAt: result.metadata.generatedAt || Date.now(),
        },
      };
    }

    // 結果がオブジェクトの場合、部分的に変換を試みる
    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      return this.buildPlanUISpecFromPartial(obj, planORS, widgetSelectionResult, sessionId, enableReactivity);
    }

    // 変換失敗時はデフォルトPlanUISpecを返す
    return this.createDefaultPlanUISpec(planORS, widgetSelectionResult, sessionId, enableReactivity);
  }

  /**
   * 部分的な結果からPlanUISpecを構築
   */
  private buildPlanUISpecFromPartial(
    obj: Record<string, unknown>,
    planORS: PlanORS,
    widgetSelectionResult: WidgetSelectionResult,
    sessionId: string,
    enableReactivity: boolean
  ): PlanUISpec {
    const sections: Record<SectionType, SectionSpec> = {
      diverge: this.extractSectionSpec(obj, 'diverge', widgetSelectionResult.stages.diverge, planORS),
      organize: this.extractSectionSpec(obj, 'organize', widgetSelectionResult.stages.organize, planORS),
      converge: this.extractSectionSpec(obj, 'converge', widgetSelectionResult.stages.converge, planORS),
    };

    // reactiveBindings を抽出
    const bindings: ReactiveBinding[] = [];
    if (typeof obj.reactiveBindings === 'object' && obj.reactiveBindings !== null) {
      const rbSpec = obj.reactiveBindings as Record<string, unknown>;
      if (Array.isArray(rbSpec.bindings)) {
        for (const b of rbSpec.bindings) {
          if (typeof b === 'object' && b !== null) {
            const binding = this.normalizeReactiveBinding(b as Record<string, unknown>);
            if (binding) {
              bindings.push(binding);
            }
          }
        }
      }
    }

    // layout を抽出
    const layout: PlanLayout = this.normalizePlanLayout(obj.layout);

    return {
      version: '5.0',
      sessionId,
      stage: 'plan',
      sections,
      reactiveBindings: createReactiveBindingSpec(enableReactivity ? bindings : []),
      layout,
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'unknown',
      },
    };
  }

  /**
   * セクションSpecを抽出
   */
  private extractSectionSpec(
    obj: Record<string, unknown>,
    sectionType: SectionType,
    stageSelection: StageSelection,
    planORS: PlanORS
  ): SectionSpec {
    // sections オブジェクトから該当セクションを取得
    if (typeof obj.sections === 'object' && obj.sections !== null) {
      const sectionsObj = obj.sections as Record<string, unknown>;
      const sectionData = sectionsObj[sectionType];

      if (typeof sectionData === 'object' && sectionData !== null) {
        const section = sectionData as Record<string, unknown>;

        // header を抽出
        const header = this.extractSectionHeader(section.header, sectionType);

        // widgets を抽出
        const widgets: WidgetSpec[] = [];
        if (Array.isArray(section.widgets)) {
          for (let i = 0; i < section.widgets.length; i++) {
            const w = section.widgets[i];
            if (typeof w === 'object' && w !== null) {
              // ORS風の空オブジェクトを渡す（PlanORSからORS形式を作成するのは複雑なため）
              const widgetSpec = this.normalizeWidgetSpec(w as Record<string, unknown>, i, {
                version: '4.0',
                entities: planORS.entities,
                dependencyGraph: planORS.dependencyGraph,
                metadata: {
                  generatedAt: planORS.metadata.generatedAt,
                  llmModel: planORS.metadata.llmModel,
                  sessionId: planORS.metadata.sessionId,
                  stage: sectionType as StageType,
                },
              });
              if (widgetSpec) {
                widgets.push(widgetSpec);
              }
            }
          }
        }

        // widgets が空の場合はデフォルトを使用
        if (widgets.length === 0) {
          return this.createDefaultSectionSpec(sectionType, stageSelection, planORS);
        }

        return { header, widgets };
      }
    }

    // セクションデータがない場合はデフォルトを作成
    return this.createDefaultSectionSpec(sectionType, stageSelection, planORS);
  }

  /**
   * セクションヘッダーを抽出
   */
  private extractSectionHeader(value: unknown, sectionType: SectionType): SectionHeader {
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      return {
        title: typeof obj.title === 'string' ? obj.title : this.getDefaultSectionTitle(sectionType),
        description: typeof obj.description === 'string' ? obj.description : this.getDefaultSectionDescription(sectionType),
      };
    }
    return {
      title: this.getDefaultSectionTitle(sectionType),
      description: this.getDefaultSectionDescription(sectionType),
    };
  }

  /**
   * デフォルトセクションタイトルを取得
   */
  private getDefaultSectionTitle(sectionType: SectionType): string {
    const titles: Record<SectionType, string> = {
      diverge: '発散',
      organize: '整理',
      converge: '収束',
    };
    return titles[sectionType];
  }

  /**
   * デフォルトセクション説明を取得
   */
  private getDefaultSectionDescription(sectionType: SectionType): string {
    const descriptions: Record<SectionType, string> = {
      diverge: 'アイデアを広げましょう',
      organize: '情報を整理しましょう',
      converge: '優先順位をつけましょう',
    };
    return descriptions[sectionType];
  }

  /**
   * PlanLayout正規化
   */
  private normalizePlanLayout(value: unknown): PlanLayout {
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      return {
        type: 'sectioned',
        sectionGap: typeof obj.sectionGap === 'number' ? obj.sectionGap : 24,
        sectionOrder: Array.isArray(obj.sectionOrder)
          ? obj.sectionOrder as SectionType[]
          : ['diverge', 'organize', 'converge'],
      };
    }
    return {
      type: 'sectioned',
      sectionGap: 24,
      sectionOrder: ['diverge', 'organize', 'converge'],
    };
  }

  /**
   * デフォルトセクションSpecを作成
   */
  private createDefaultSectionSpec(
    sectionType: SectionType,
    stageSelection: StageSelection,
    planORS: PlanORS
  ): SectionSpec {
    const widgets: WidgetSpec[] = [];

    for (let i = 0; i < stageSelection.widgets.length; i++) {
      const selectedWidget = stageSelection.widgets[i];
      const definition = getWidgetDefinitionV4(selectedWidget.widgetId);
      if (!definition) continue;

      const widgetId = `${selectedWidget.widgetId}_${sectionType}_${i}`;
      const dataBindings = this.createDefaultDataBindingsForPlan(definition, planORS, sectionType);

      widgets.push(
        createWidgetSpec(widgetId, selectedWidget.widgetId, i, selectedWidget.suggestedConfig ?? {}, dataBindings, {
          metadata: {
            purpose: selectedWidget.purpose,
          },
        })
      );
    }

    return {
      header: {
        title: this.getDefaultSectionTitle(sectionType),
        description: this.getDefaultSectionDescription(sectionType),
      },
      widgets,
    };
  }

  /**
   * Plan用のデフォルトDataBindingを作成
   */
  private createDefaultDataBindingsForPlan(
    definition: WidgetDefinitionV4,
    planORS: PlanORS,
    sectionType: SectionType
  ): DataBindingSpec[] {
    const bindings: DataBindingSpec[] = [];

    // セクション用のエンティティを探す
    const sectionEntity = planORS.entities.find(e => e.id === `${sectionType}_data`);

    // 入力ポートに対してバインド
    for (const input of definition.ports.inputs) {
      if (sectionEntity) {
        const attr = sectionEntity.attributes.find(a => a.name === 'input' || a.name === input.id);
        if (attr) {
          bindings.push(createDataBindingSpec(input.id, `${sectionEntity.id}.${attr.name}`, 'in'));
        }
      }
    }

    // 出力ポートに対してバインド
    for (const output of definition.ports.outputs) {
      if (sectionEntity) {
        const attr = sectionEntity.attributes.find(a => a.name === 'output' || a.name === output.id);
        if (attr) {
          bindings.push(createDataBindingSpec(output.id, `${sectionEntity.id}.${attr.name}`, 'out'));
        }
      }
    }

    return bindings;
  }

  /**
   * デフォルトPlanUISpec作成
   */
  private createDefaultPlanUISpec(
    planORS: PlanORS,
    widgetSelectionResult: WidgetSelectionResult,
    sessionId: string,
    enableReactivity: boolean
  ): PlanUISpec {
    const sections: Record<SectionType, SectionSpec> = {
      diverge: this.createDefaultSectionSpec('diverge', widgetSelectionResult.stages.diverge, planORS),
      organize: this.createDefaultSectionSpec('organize', widgetSelectionResult.stages.organize, planORS),
      converge: this.createDefaultSectionSpec('converge', widgetSelectionResult.stages.converge, planORS),
    };

    const bindings = enableReactivity
      ? this.createDefaultCrossSectionBindings(sections)
      : [];

    return {
      version: '5.0',
      sessionId,
      stage: 'plan',
      sections,
      reactiveBindings: createReactiveBindingSpec(bindings),
      layout: {
        type: 'sectioned',
        sectionGap: 24,
        sectionOrder: ['diverge', 'organize', 'converge'],
      },
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'fallback',
      },
    };
  }

  /**
   * セクション間のデフォルトReactiveBindingを作成
   */
  private createDefaultCrossSectionBindings(sections: Record<SectionType, SectionSpec>): ReactiveBinding[] {
    const bindings: ReactiveBinding[] = [];

    // diverge → organize のバインディング
    if (sections.diverge.widgets.length > 0 && sections.organize.widgets.length > 0) {
      const sourceWidget = sections.diverge.widgets[sections.diverge.widgets.length - 1];
      const targetWidget = sections.organize.widgets[0];

      const sourceDef = getWidgetDefinitionV4(sourceWidget.component);
      const targetDef = getWidgetDefinitionV4(targetWidget.component);

      if (sourceDef && targetDef && sourceDef.ports.outputs.length > 0 && targetDef.ports.inputs.length > 0) {
        bindings.push(
          createReactiveBinding(
            `rb_diverge_to_organize`,
            `${sourceWidget.id}.${sourceDef.ports.outputs[0].id}` as WidgetPortPath,
            `${targetWidget.id}.${targetDef.ports.inputs[0].id}` as WidgetPortPath,
            'update',
            createPassthroughRelationship(),
            'realtime',
            { description: '発散→整理のデータ連携' }
          )
        );
      }
    }

    // organize → converge のバインディング
    if (sections.organize.widgets.length > 0 && sections.converge.widgets.length > 0) {
      const sourceWidget = sections.organize.widgets[sections.organize.widgets.length - 1];
      const targetWidget = sections.converge.widgets[0];

      const sourceDef = getWidgetDefinitionV4(sourceWidget.component);
      const targetDef = getWidgetDefinitionV4(targetWidget.component);

      if (sourceDef && targetDef && sourceDef.ports.outputs.length > 0 && targetDef.ports.inputs.length > 0) {
        bindings.push(
          createReactiveBinding(
            `rb_organize_to_converge`,
            `${sourceWidget.id}.${sourceDef.ports.outputs[0].id}` as WidgetPortPath,
            `${targetWidget.id}.${targetDef.ports.inputs[0].id}` as WidgetPortPath,
            'update',
            createWidgetJavaScriptRelationship('Object.values(source).flat()'),
            'debounced',
            { description: '整理→収束のデータ連携', debounceMs: 300 }
          )
        );
      }
    }

    return bindings;
  }

  /**
   * フォールバックPlanUISpec生成
   *
   * LLM呼び出しが失敗した場合のフォールバック。
   */
  fallbackPlanUISpec(input: PlanUISpecGeneratorInput): PlanUISpec {
    const { planORS, widgetSelectionResult, sessionId, enableReactivity = true } = input;

    if (this.debug) {
      console.log(`[UISpecGeneratorV4] Using fallback PlanUISpec for session: ${sessionId}`);
    }

    return this.createDefaultPlanUISpec(planORS, widgetSelectionResult, sessionId, enableReactivity);
  }

  /**
   * Widget定義を収集
   */
  private collectWidgetDefinitions(stageSelection: StageSelection): WidgetDefinitionSummary[] {
    const summaries: WidgetDefinitionSummary[] = [];

    for (const selectedWidget of stageSelection.widgets) {
      const definition = getWidgetDefinitionV4(selectedWidget.widgetId);
      if (definition) {
        summaries.push({
          id: definition.id,
          name: definition.name,
          description: definition.description,
          complexity: definition.metadata.complexity,
          inputs: definition.ports.inputs.map((p) => ({
            id: p.id,
            dataType: p.dataType,
            description: p.description,
            required: p.required,
          })),
          outputs: definition.ports.outputs.map((p) => ({
            id: p.id,
            dataType: p.dataType,
            description: p.description,
          })),
          // generatedValue用のヒント（v4.1追加）
          generationHints: definition.generationHints,
        });
      }
    }

    return summaries;
  }

  // ===========================================================================
  // DSL v5: プロンプト補助メソッド（W2WR, generatedValue用）
  // ===========================================================================

  /**
   * Widget別のポート情報を明示的に整形
   * プロンプトに渡すための読みやすい形式
   */
  private formatPortInfoForPrompt(widgets: WidgetDefinitionSummary[]): string {
    return widgets.map(w => {
      const inputs = w.inputs.map(i => `  IN: ${i.id} (${i.dataType})${i.required ? ' [required]' : ''}`).join('\n');
      const outputs = w.outputs.map(o => `  OUT: ${o.id} (${o.dataType})`).join('\n');
      const hints = w.generationHints
        ? `  GENERATE: config.${w.generationHints.labels?.field || w.generationHints.samples?.field}`
        : '';
      return `${w.id} (complexity: ${w.complexity}):\n${inputs}\n${outputs}${hints ? '\n' + hints : ''}`;
    }).join('\n\n');
  }

  /**
   * Widget選択結果から推奨W2WR接続を生成
   * LLMに明示的な接続ヒントを渡す
   */
  private generateW2WRHints(widgetSelectionResult: WidgetSelectionResult): string {
    const hints: string[] = [];
    const divergeWidgets = widgetSelectionResult.stages.diverge.widgets;
    const organizeWidgets = widgetSelectionResult.stages.organize.widgets;
    const convergeWidgets = widgetSelectionResult.stages.converge.widgets;

    // diverge → organize 接続推奨
    for (let di = 0; di < divergeWidgets.length; di++) {
      const dw = divergeWidgets[di];
      const dwDef = getWidgetDefinitionV4(dw.widgetId);
      if (!dwDef) continue;

      for (let oi = 0; oi < organizeWidgets.length; oi++) {
        const ow = organizeWidgets[oi];
        const owDef = getWidgetDefinitionV4(ow.widgetId);
        if (!owDef) continue;

        // 出力ポートと入力ポートを接続
        for (const outPort of dwDef.ports.outputs) {
          for (const inPort of owDef.ports.inputs) {
            hints.push(`- ${dw.widgetId}_${di}.${outPort.id} → ${ow.widgetId}_${oi}.${inPort.id} (diverge→organize)`);
          }
        }
      }
    }

    // organize → converge 接続推奨
    for (let oi = 0; oi < organizeWidgets.length; oi++) {
      const ow = organizeWidgets[oi];
      const owDef = getWidgetDefinitionV4(ow.widgetId);
      if (!owDef) continue;

      for (let ci = 0; ci < convergeWidgets.length; ci++) {
        const cw = convergeWidgets[ci];
        const cwDef = getWidgetDefinitionV4(cw.widgetId);
        if (!cwDef) continue;

        // 出力ポートと入力ポートを接続
        for (const outPort of owDef.ports.outputs) {
          for (const inPort of cwDef.ports.inputs) {
            hints.push(`- ${ow.widgetId}_${oi}.${outPort.id} → ${cw.widgetId}_${ci}.${inPort.id} (organize→converge)`);
          }
        }
      }
    }

    return hints.length > 0 ? hints.join('\n') : '(No specific connections suggested)';
  }

  /**
   * generatedValueチェックリストを生成
   * LLMに生成すべきコンテンツを明示
   */
  private generateGeneratedValueChecklist(allDefinitions: WidgetDefinitionSummary[]): string {
    const checks: string[] = [];

    for (const w of allDefinitions) {
      if (w.generationHints) {
        const field = w.generationHints.labels?.field || w.generationHints.samples?.field;
        const count = w.generationHints.labels?.count || w.generationHints.samples?.count;
        const countStr = typeof count === 'object' ? `${count.min}-${count.max} items` : count ? `${count} items` : 'items';
        const hintType = w.generationHints.labels ? 'labels' : 'samples';
        checks.push(`[ ] ${w.id}: config.${field} (${hintType}, ${countStr})`);
      }
    }

    return checks.length > 0 ? checks.join('\n') : '(No widgets require generated content)';
  }

  /**
   * 生成後のgeneratedValueとW2WR検証
   * 欠損時に警告ログを出力
   */
  private validateGeneratedContent(
    planUISpec: PlanUISpec,
    widgetSelectionResult: WidgetSelectionResult,
    enableReactivity: boolean
  ): void {
    // generatedValue検証
    for (const sectionType of ['diverge', 'organize', 'converge'] as const) {
      const section = planUISpec.sections[sectionType];
      const stageSelection = widgetSelectionResult.stages[sectionType];

      for (let i = 0; i < section.widgets.length; i++) {
        const widget = section.widgets[i];
        const selectedWidget = stageSelection.widgets[i];
        if (!selectedWidget) continue;

        const def = getWidgetDefinitionV4(widget.component || selectedWidget.widgetId);
        if (!def?.generationHints) continue;

        const field = def.generationHints.labels?.field || def.generationHints.samples?.field;
        if (field && !widget.config[field]) {
          console.warn(`[UISpecGeneratorV4] Missing generatedValue for ${widget.id}.config.${field}`);
        } else if (field && widget.config[field]) {
          // 存在確認 - isGeneratedマーカーチェック
          const content = widget.config[field];
          if (typeof content === 'object' && content !== null) {
            const hasIsGenerated = 'isGenerated' in content ||
              (Array.isArray(content) && content.some((item: Record<string, unknown>) => item.isGenerated === true));
            if (!hasIsGenerated) {
              console.warn(`[UISpecGeneratorV4] ${widget.id}.config.${field} missing isGenerated marker`);
            }
          }
        }
      }
    }

    // W2WR検証
    if (enableReactivity) {
      if (!planUISpec.reactiveBindings?.bindings || planUISpec.reactiveBindings.bindings.length === 0) {
        console.warn('[UISpecGeneratorV4] ReactiveBindings is empty when enableReactivity=true');
      } else {
        if (this.debug) {
          console.log(`[UISpecGeneratorV4] ReactiveBindings count: ${planUISpec.reactiveBindings.bindings.length}`);
        }
      }
    }
  }

  /**
   * UISpec検証・正規化
   */
  private validateAndNormalizeUISpec(
    result: unknown,
    ors: ORS,
    stageSelection: StageSelection,
    stage: StageType,
    sessionId: string,
    enableReactivity: boolean
  ): UISpec {
    if (this.debug) {
      console.log('[UISpecGeneratorV4] Raw LLM result type:', typeof result);
      console.log('[UISpecGeneratorV4] Raw LLM result:', JSON.stringify(result, null, 2).slice(0, 2000));
      console.log('[UISpecGeneratorV4] stageSelection.widgets count:', stageSelection.widgets?.length ?? 0);
    }

    // 型ガードでチェック
    const isValid = isUISpec(result);
    if (this.debug) {
      console.log('[UISpecGeneratorV4] isUISpec check:', isValid);
    }

    if (isValid) {
      if (this.debug) {
        console.log('[UISpecGeneratorV4] Valid UISpec, widgets count:', (result as UISpec).widgets?.length ?? 0);
      }
      // メタデータを補完
      return {
        ...result,
        sessionId,
        stage,
        metadata: {
          ...result.metadata,
          generatedAt: result.metadata.generatedAt || Date.now(),
        },
      };
    }

    // 結果がオブジェクトの場合、部分的に変換を試みる
    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      if (this.debug) {
        console.log('[UISpecGeneratorV4] Building from partial, obj.widgets:', Array.isArray(obj.widgets) ? obj.widgets.length : 'not array');
      }
      return this.buildUISpecFromPartial(obj, ors, stageSelection, stage, sessionId, enableReactivity);
    }

    // 変換失敗時はデフォルトUISpecを返す
    if (this.debug) {
      console.log('[UISpecGeneratorV4] Using default UISpec (fallback)');
    }
    return this.createDefaultUISpec(ors, stageSelection, stage, sessionId, enableReactivity);
  }

  /**
   * 部分的な結果からUISpecを構築
   */
  private buildUISpecFromPartial(
    obj: Record<string, unknown>,
    ors: ORS,
    stageSelection: StageSelection,
    stage: StageType,
    sessionId: string,
    enableReactivity: boolean
  ): UISpec {
    const widgets: WidgetSpec[] = [];
    const bindings: ReactiveBinding[] = [];

    // widgets が存在する場合
    if (Array.isArray(obj.widgets)) {
      if (this.debug) {
        console.log(`[UISpecGeneratorV4] Processing ${obj.widgets.length} widgets from LLM output`);
      }
      for (let i = 0; i < obj.widgets.length; i++) {
        const w = obj.widgets[i];
        if (typeof w === 'object' && w !== null) {
          const widgetObj = w as Record<string, unknown>;
          if (this.debug) {
            console.log(`[UISpecGeneratorV4] Widget[${i}] raw:`, JSON.stringify(widgetObj, null, 2).slice(0, 500));
            console.log(`[UISpecGeneratorV4] Widget[${i}] component:`, widgetObj.component, 'type:', typeof widgetObj.component);
          }
          const widgetSpec = this.normalizeWidgetSpec(widgetObj, i, ors);
          if (widgetSpec) {
            widgets.push(widgetSpec);
            if (this.debug) {
              console.log(`[UISpecGeneratorV4] Widget[${i}] normalized successfully: ${widgetSpec.component}`);
            }
          } else if (this.debug) {
            console.log(`[UISpecGeneratorV4] Widget[${i}] normalization returned null (missing component?)`);
          }
        }
      }
    }

    if (this.debug) {
      console.log(`[UISpecGeneratorV4] Extracted ${widgets.length} widgets from LLM output`);
    }

    // reactiveBindings が存在する場合
    if (typeof obj.reactiveBindings === 'object' && obj.reactiveBindings !== null) {
      const rbSpec = obj.reactiveBindings as Record<string, unknown>;
      if (Array.isArray(rbSpec.bindings)) {
        for (const b of rbSpec.bindings) {
          if (typeof b === 'object' && b !== null) {
            const binding = this.normalizeReactiveBinding(b as Record<string, unknown>);
            if (binding) {
              bindings.push(binding);
            }
          }
        }
      }
    }

    // layout
    const layout = this.normalizeScreenLayout(obj.layout);

    // widgets が空の場合はデフォルトを使用
    const finalWidgets = widgets.length > 0 ? widgets : this.createDefaultWidgets(ors, stageSelection);
    if (this.debug) {
      console.log(`[UISpecGeneratorV4] Final widgets count: ${finalWidgets.length} (used default: ${widgets.length === 0})`);
    }

    return {
      version: '4.0',
      sessionId,
      stage,
      widgets: finalWidgets,
      reactiveBindings: createReactiveBindingSpec(enableReactivity ? bindings : []),
      layout,
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'unknown',
      },
    };
  }

  /**
   * WidgetSpec正規化
   */
  private normalizeWidgetSpec(obj: Record<string, unknown>, index: number, ors: ORS): WidgetSpec | null {
    const id = typeof obj.id === 'string' ? obj.id : `widget_${index}`;
    const component = typeof obj.component === 'string' ? obj.component : null;

    if (!component) return null;

    const position = typeof obj.position === 'number' ? obj.position : index;
    const layout = this.normalizeLayoutType(obj.layout);
    const config = typeof obj.config === 'object' && obj.config !== null ? (obj.config as WidgetConfig) : {};

    // DataBindings
    const dataBindings: DataBindingSpec[] = [];
    if (Array.isArray(obj.dataBindings)) {
      for (const db of obj.dataBindings) {
        if (typeof db === 'object' && db !== null) {
          const binding = this.normalizeDataBinding(db as Record<string, unknown>);
          if (binding) {
            dataBindings.push(binding);
          }
        }
      }
    }

    return {
      id,
      component: component as WidgetSpec['component'],
      position,
      layout,
      config,
      dataBindings,
      metadata: {
        purpose: typeof obj.purpose === 'string' ? obj.purpose : undefined,
      },
    };
  }

  /**
   * LayoutType正規化
   */
  private normalizeLayoutType(value: unknown): LayoutType {
    const validTypes: LayoutType[] = ['full', 'half', 'third', 'quarter', 'auto'];
    if (typeof value === 'string' && validTypes.includes(value as LayoutType)) {
      return value as LayoutType;
    }
    return 'auto';
  }

  /**
   * DataBindingSpec正規化
   */
  private normalizeDataBinding(obj: Record<string, unknown>): DataBindingSpec | null {
    const portId = typeof obj.portId === 'string' ? obj.portId : null;
    const entityAttribute = typeof obj.entityAttribute === 'string' ? obj.entityAttribute : null;

    if (!portId || !entityAttribute) return null;

    const direction = this.normalizeDataBindingDirection(obj.direction);

    return createDataBindingSpec(portId, entityAttribute as `${string}.${string}`, direction);
  }

  /**
   * DataBindingDirection正規化
   */
  private normalizeDataBindingDirection(value: unknown): DataBindingDirection {
    if (value === 'in' || value === 'out' || value === 'inout') {
      return value;
    }
    return 'inout';
  }

  /**
   * ReactiveBinding正規化
   */
  private normalizeReactiveBinding(obj: Record<string, unknown>): ReactiveBinding | null {
    const id = typeof obj.id === 'string' ? obj.id : `binding_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const source = typeof obj.source === 'string' ? obj.source : null;
    const target = typeof obj.target === 'string' ? obj.target : null;

    if (!source || !target) return null;

    const mechanism = this.normalizeBindingMechanism(obj.mechanism);
    const relationship = this.normalizeWidgetRelationship(obj.relationship);
    const updateMode = this.normalizeUpdateMode(obj.updateMode);

    return createReactiveBinding(id, source as WidgetPortPath, target as WidgetPortPath, mechanism, relationship, updateMode, {
      description: typeof obj.description === 'string' ? obj.description : undefined,
      debounceMs: typeof obj.debounceMs === 'number' ? obj.debounceMs : undefined,
      enabled: obj.enabled !== false,
    });
  }

  /**
   * BindingMechanism正規化
   */
  private normalizeBindingMechanism(value: unknown): BindingMechanism {
    if (value === 'validate' || value === 'update') {
      return value;
    }
    return 'update';
  }

  /**
   * WidgetRelationshipSpec正規化
   */
  private normalizeWidgetRelationship(value: unknown): WidgetRelationshipSpec {
    if (typeof value !== 'object' || value === null) {
      return createPassthroughRelationship();
    }

    const obj = value as Record<string, unknown>;
    const type = obj.type;

    if (type === 'javascript' && typeof obj.javascript === 'string') {
      return createWidgetJavaScriptRelationship(obj.javascript);
    }

    if (type === 'transform' && typeof obj.transform === 'string') {
      return {
        type: 'transform',
        transform: obj.transform,
        params: typeof obj.params === 'object' ? (obj.params as Record<string, string | number | boolean>) : undefined,
      };
    }

    if (type === 'llm' && typeof obj.llmPrompt === 'string') {
      return {
        type: 'llm',
        llmPrompt: obj.llmPrompt,
        context: typeof obj.context === 'object' ? (obj.context as Record<string, string | number | boolean>) : undefined,
      };
    }

    return createPassthroughRelationship();
  }

  /**
   * UpdateMode正規化
   */
  private normalizeUpdateMode(value: unknown): UpdateMode {
    if (value === 'realtime' || value === 'debounced' || value === 'on_confirm') {
      return value;
    }
    return 'realtime';
  }

  /**
   * ScreenLayout正規化
   */
  private normalizeScreenLayout(value: unknown): ScreenLayout {
    if (typeof value !== 'object' || value === null) {
      return { type: 'single_column' };
    }

    const obj = value as Record<string, unknown>;
    const validTypes: ScreenLayout['type'][] = ['single_column', 'two_column', 'grid', 'flex'];
    const type = validTypes.includes(obj.type as ScreenLayout['type']) ? (obj.type as ScreenLayout['type']) : 'single_column';

    return {
      type,
      columns: typeof obj.columns === 'number' ? obj.columns : undefined,
      gap: typeof obj.gap === 'number' ? obj.gap : undefined,
      padding: typeof obj.padding === 'object' ? (obj.padding as ScreenLayout['padding']) : undefined,
    };
  }

  /**
   * デフォルトWidgetsを作成
   */
  private createDefaultWidgets(ors: ORS, stageSelection: StageSelection): WidgetSpec[] {
    const widgets: WidgetSpec[] = [];

    for (let i = 0; i < stageSelection.widgets.length; i++) {
      const selectedWidget = stageSelection.widgets[i];
      const definition = getWidgetDefinitionV4(selectedWidget.widgetId);
      if (!definition) continue;

      const widgetId = `${selectedWidget.widgetId}_${i}`;
      const dataBindings = this.createDefaultDataBindings(definition, ors, widgetId);

      widgets.push(
        createWidgetSpec(widgetId, selectedWidget.widgetId, i, selectedWidget.suggestedConfig ?? {}, dataBindings, {
          metadata: {
            purpose: selectedWidget.purpose,
          },
        })
      );
    }

    return widgets;
  }

  /**
   * デフォルトのDataBindingを作成
   */
  private createDefaultDataBindings(definition: WidgetDefinitionV4, ors: ORS, widgetId: string): DataBindingSpec[] {
    const bindings: DataBindingSpec[] = [];

    // 入力ポートに対してORSエンティティを探してバインド
    for (const input of definition.ports.inputs) {
      const entityAttribute = this.findMatchingEntityAttribute(ors, input.dataType, input.id);
      if (entityAttribute) {
        bindings.push(createDataBindingSpec(input.id, entityAttribute, 'in'));
      }
    }

    // 出力ポートに対してORSエンティティを探してバインド
    for (const output of definition.ports.outputs) {
      const entityAttribute = this.findMatchingEntityAttribute(ors, output.dataType, output.id);
      if (entityAttribute) {
        bindings.push(createDataBindingSpec(output.id, entityAttribute, 'out'));
      }
    }

    return bindings;
  }

  /**
   * 型が一致するエンティティ・属性を探す
   */
  private findMatchingEntityAttribute(ors: ORS, dataType: string, portId: string): `${string}.${string}` | null {
    for (const entity of ors.entities) {
      for (const attr of entity.attributes) {
        // ポートIDと属性名が一致する場合は優先
        if (attr.name === portId) {
          return `${entity.id}.${attr.name}`;
        }

        // 型の一致を確認
        if (this.isTypeCompatible(dataType, attr)) {
          return `${entity.id}.${attr.name}`;
        }
      }
    }
    return null;
  }

  /**
   * 型互換性チェック
   */
  private isTypeCompatible(portDataType: string, attr: Attribute): boolean {
    const portIsArray = portDataType.includes('[]') || portDataType.includes('Array');
    const attrIsArray = attr.structuralType === 'ARRY';

    if (portIsArray !== attrIsArray) return false;

    // 基本型のマッピング
    const baseType = portDataType.replace('[]', '').replace('Array<', '').replace('>', '').toLowerCase();
    const attrValueType = attr.valueType ?? attr.itemValueType;

    if (!attrValueType) return true; // 型指定なしは許容

    const typeMapping: Record<string, string[]> = {
      string: ['string', 'text'],
      number: ['number', 'integer', 'float'],
      boolean: ['boolean', 'bool'],
      object: ['object', 'dict', 'record'],
    };

    const compatibleTypes = typeMapping[attrValueType] ?? [attrValueType];
    return compatibleTypes.includes(baseType);
  }

  /**
   * デフォルトUISpec作成
   */
  private createDefaultUISpec(
    ors: ORS,
    stageSelection: StageSelection,
    stage: StageType,
    sessionId: string,
    enableReactivity: boolean
  ): UISpec {
    const widgets = this.createDefaultWidgets(ors, stageSelection);
    const bindings = enableReactivity ? this.createDefaultReactiveBindings(widgets, stageSelection) : [];

    return {
      version: '4.0',
      sessionId,
      stage,
      widgets,
      reactiveBindings: createReactiveBindingSpec(bindings),
      layout: { type: 'single_column' },
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'fallback',
      },
    };
  }

  /**
   * デフォルトのReactiveBindingを作成
   */
  private createDefaultReactiveBindings(widgets: WidgetSpec[], stageSelection: StageSelection): ReactiveBinding[] {
    const bindings: ReactiveBinding[] = [];

    // suggestedBindings があれば使用
    for (const selectedWidget of stageSelection.widgets) {
      if (selectedWidget.suggestedBindings) {
        for (const suggested of selectedWidget.suggestedBindings) {
          const sourceWidget = widgets.find((w) => w.component === suggested.sourceWidgetType);
          const targetWidget = widgets.find((w) => w.component === selectedWidget.widgetId);

          if (sourceWidget && targetWidget) {
            bindings.push(
              createReactiveBinding(
                `binding_${sourceWidget.id}_${targetWidget.id}_${suggested.outputPort}`,
                `${sourceWidget.id}.${suggested.outputPort}` as WidgetPortPath,
                `${targetWidget.id}.${suggested.inputPort}` as WidgetPortPath,
                'update',
                createPassthroughRelationship(),
                'realtime',
                {
                  description: `Auto-generated binding: ${suggested.outputPort} -> ${suggested.inputPort}`,
                }
              )
            );
          }
        }
      }
    }

    // 連続するWidget間のデフォルトバインディング
    if (bindings.length === 0 && widgets.length >= 2) {
      for (let i = 0; i < widgets.length - 1; i++) {
        const sourceWidget = widgets[i];
        const targetWidget = widgets[i + 1];

        const sourceDef = getWidgetDefinitionV4(sourceWidget.component);
        const targetDef = getWidgetDefinitionV4(targetWidget.component);

        if (sourceDef && targetDef && sourceDef.ports.outputs.length > 0 && targetDef.ports.inputs.length > 0) {
          const sourcePort = sourceDef.ports.outputs[0];
          const targetPort = targetDef.ports.inputs[0];

          bindings.push(
            createReactiveBinding(
              `binding_${sourceWidget.id}_${targetWidget.id}`,
              `${sourceWidget.id}.${sourcePort.id}` as WidgetPortPath,
              `${targetWidget.id}.${targetPort.id}` as WidgetPortPath,
              'update',
              createPassthroughRelationship(),
              'realtime',
              {
                description: `Default sequential binding`,
              }
            )
          );
        }
      }
    }

    return bindings;
  }

  /**
   * フォールバックUISpec生成
   *
   * LLM呼び出しが失敗した場合のフォールバック。
   */
  fallbackUISpec(input: UISpecGeneratorInput): UISpec {
    const { ors, stageSelection, stage, sessionId, enableReactivity = true } = input;

    if (this.debug) {
      console.log(`[UISpecGeneratorV4] Using fallback UISpec for stage: ${stage}`);
    }

    return this.createDefaultUISpec(ors, stageSelection, stage, sessionId, enableReactivity);
  }
}

// =============================================================================
// 内部型
// =============================================================================

interface WidgetDefinitionSummary {
  id: string;
  name: string;
  description: string;
  complexity: number;
  inputs: {
    id: string;
    dataType: string;
    description?: string;
    required?: boolean;
  }[];
  outputs: {
    id: string;
    dataType: string;
    description?: string;
  }[];
  /** 動的コンテンツ生成ヒント（v4.1追加） */
  generationHints?: import('../../types/v4/widget-definition.types').WidgetGenerationHints;
}

// =============================================================================
// ファクトリ関数
// =============================================================================

/**
 * UISpecGeneratorV4インスタンスを作成
 */
export function createUISpecGeneratorV4(config: UISpecGeneratorServiceConfig): UISpecGeneratorV4 {
  return new UISpecGeneratorV4(config);
}
