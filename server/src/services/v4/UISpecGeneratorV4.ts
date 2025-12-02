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
} from '../../types/v4/ui-spec.types';
import type {
  ReactiveBindingSpec,
  ReactiveBinding,
  WidgetRelationshipSpec,
  UpdateMode,
  BindingMechanism,
  WidgetPortPath,
} from '../../types/v4/reactive-binding.types';
import type { ORS, StageType, Entity, Attribute } from '../../types/v4/ors.types';
import type { StageSelection, SelectedWidget, SuggestedBinding } from '../../types/v4/widget-selection.types';
import type { LLMCallResult } from '../../types/v4/llm-task.types';
import type { WidgetDefinitionV4 } from '../../types/v4/widget-definition.types';
import { isUISpec, createEmptyUISpec, createWidgetSpec, createDataBindingSpec } from '../../types/v4/ui-spec.types';
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
 * UISpec Generator Service設定
 */
export interface UISpecGeneratorServiceConfig {
  /** LLM Orchestrator */
  llmOrchestrator: LLMOrchestrator;
  /** デバッグモード */
  debug?: boolean;
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

  constructor(config: UISpecGeneratorServiceConfig) {
    this.llmOrchestrator = config.llmOrchestrator;
    this.debug = config.debug ?? false;
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
        });
      }
    }

    return summaries;
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
