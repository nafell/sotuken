/**
 * ORS Generator Service for DSL v4
 *
 * 3段階LLM呼び出しの第2段階：ORS + DependencyGraph生成サービス。
 * 選定されたWidgetと悩みに基づいて、データ構造を生成。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @see specs/discussions/DSLv4_review_minutes.md トピック2
 * @since DSL v4.0
 */

import type {
  ORS,
  Entity,
  Attribute,
  StageType,
  ORSMetadata,
  StructuralType,
  ConcreteType,
  GenerationSpec,
} from '../../types/v4/ors.types';
import type {
  DependencyGraph,
  DataDependency,
  RelationshipSpec,
} from '../../types/v4/dependency-graph.types';
import type { StageSelection, SelectedWidget } from '../../types/v4/widget-selection.types';
import type { LLMCallResult } from '../../types/v4/llm-task.types';
import { isORS } from '../../types/v4/ors.types';
import { createDependencyGraph, isDependencyGraph } from '../../types/v4/dependency-graph.types';
import { LLMOrchestrator } from './LLMOrchestrator';
import { getWidgetDefinitionV4 } from '../../definitions/v4/widgets';

// =============================================================================
// Types
// =============================================================================

/**
 * ORS生成入力
 */
export interface ORSGeneratorInput {
  /** ユーザーの悩み */
  concernText: string;
  /** ステージ種別 */
  stage: StageType;
  /** 選定されたWidget情報 */
  stageSelection: StageSelection;
  /** 前ステージのORS（継続生成用） */
  previousORS?: ORS;
  /** セッションID */
  sessionId: string;
}

/**
 * ステージ結果（前ステージからの引き継ぎ用）
 */
export interface StageResult {
  /** ステージ種別 */
  stage: StageType;
  /** Widget入力/出力データ */
  widgetData: Record<string, unknown>;
  /** 要約テキスト（サマリーWidget出力） */
  summary?: string;
}

/**
 * ORS Generator Service設定
 */
export interface ORSGeneratorServiceConfig {
  /** LLM Orchestrator */
  llmOrchestrator: LLMOrchestrator;
  /** デバッグモード */
  debug?: boolean;
}

// =============================================================================
// ORS Generator Service
// =============================================================================

/**
 * ORS Generator Service
 *
 * 3段階LLM呼び出しの第2段階を担当。
 * 選定されたWidgetの入出力ポート定義を元に、
 * Entity, Attribute, DependencyGraphを生成。
 */
export class ORSGeneratorService {
  private llmOrchestrator: LLMOrchestrator;
  private debug: boolean;

  constructor(config: ORSGeneratorServiceConfig) {
    this.llmOrchestrator = config.llmOrchestrator;
    this.debug = config.debug ?? false;
  }

  /**
   * ORS生成を実行
   *
   * @param input ORS生成入力
   * @returns ORS生成結果
   */
  async generateORS(input: ORSGeneratorInput): Promise<LLMCallResult<ORS>> {
    const { concernText, stage, stageSelection, previousORS, sessionId } = input;

    if (this.debug) {
      console.log(`[ORSGeneratorService] Starting ORS generation for stage: ${stage}`);
    }

    // Widget定義から入出力ポート情報を収集
    const widgetPortInfo = this.collectWidgetPortInfo(stageSelection);

    // LLM呼び出し
    const result = await this.llmOrchestrator.execute<ORS>('ors_generation', {
      concernText,
      stage,
      selectedWidgets: JSON.stringify(stageSelection.widgets, null, 2),
      widgetPortInfo: JSON.stringify(widgetPortInfo, null, 2),
      previousStageResult: previousORS ? JSON.stringify(this.extractPreviousContext(previousORS), null, 2) : 'なし（初回ステージ）',
      stageTarget: stageSelection.target,
      stagePurpose: stageSelection.purpose,
    });

    if (!result.success || !result.data) {
      return result;
    }

    // 結果の検証と補正
    const validatedORS = this.validateAndNormalizeORS(result.data, stage, sessionId);

    return {
      ...result,
      data: validatedORS,
    };
  }

  /**
   * Widget定義から入出力ポート情報を収集
   */
  private collectWidgetPortInfo(stageSelection: StageSelection): WidgetPortInfo[] {
    const portInfoList: WidgetPortInfo[] = [];

    for (const selectedWidget of stageSelection.widgets) {
      const definition = getWidgetDefinitionV4(selectedWidget.widgetId);
      if (!definition) {
        if (this.debug) {
          console.warn(`[ORSGeneratorService] Widget definition not found: ${selectedWidget.widgetId}`);
        }
        continue;
      }

      portInfoList.push({
        widgetId: selectedWidget.widgetId,
        purpose: selectedWidget.purpose,
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

    return portInfoList;
  }

  /**
   * 前ステージORSからコンテキスト抽出
   */
  private extractPreviousContext(previousORS: ORS): PreviousORSContext {
    return {
      stage: previousORS.metadata.stage,
      entityIds: previousORS.entities.map((e) => e.id),
      entitySummaries: previousORS.entities.map((e) => ({
        id: e.id,
        type: e.type,
        attributeNames: e.attributes.map((a) => a.name),
      })),
    };
  }

  /**
   * ORS検証・正規化
   */
  private validateAndNormalizeORS(result: unknown, stage: StageType, sessionId: string): ORS {
    // 型ガードでチェック
    if (isORS(result)) {
      // メタデータを補完
      return {
        ...result,
        metadata: {
          ...result.metadata,
          stage,
          sessionId,
          generatedAt: result.metadata.generatedAt || Date.now(),
        },
      };
    }

    // 結果がオブジェクトの場合、部分的に変換を試みる
    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      return this.buildORSFromPartial(obj, stage, sessionId);
    }

    // 変換失敗時はデフォルトORSを返す
    return this.createDefaultORS(stage, sessionId);
  }

  /**
   * 部分的な結果からORSを構築
   */
  private buildORSFromPartial(obj: Record<string, unknown>, stage: StageType, sessionId: string): ORS {
    const entities: Entity[] = [];
    const dependencies: DataDependency[] = [];

    // entities が存在する場合
    if (Array.isArray(obj.entities)) {
      for (const e of obj.entities) {
        if (typeof e === 'object' && e !== null) {
          const entity = this.normalizeEntity(e as Record<string, unknown>);
          if (entity) {
            entities.push(entity);
          }
        }
      }
    }

    // dependencyGraph が存在する場合
    if (typeof obj.dependencyGraph === 'object' && obj.dependencyGraph !== null) {
      const dpg = obj.dependencyGraph as Record<string, unknown>;
      if (Array.isArray(dpg.dependencies)) {
        for (const d of dpg.dependencies) {
          if (typeof d === 'object' && d !== null) {
            const dep = this.normalizeDataDependency(d as Record<string, unknown>);
            if (dep) {
              dependencies.push(dep);
            }
          }
        }
      }
    }

    return {
      version: '4.0',
      entities,
      dependencyGraph: createDependencyGraph(dependencies),
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'unknown',
        sessionId,
        stage,
      },
    };
  }

  /**
   * Entity正規化
   */
  private normalizeEntity(obj: Record<string, unknown>): Entity | null {
    const id = typeof obj.id === 'string' ? obj.id : null;
    if (!id) return null;

    const type = this.normalizeEntityType(obj.type);
    const attributes: Attribute[] = [];

    if (Array.isArray(obj.attributes)) {
      for (const a of obj.attributes) {
        if (typeof a === 'object' && a !== null) {
          const attr = this.normalizeAttribute(a as Record<string, unknown>);
          if (attr) {
            attributes.push(attr);
          }
        }
      }
    }

    return {
      id,
      type,
      attributes,
      metadata: typeof obj.metadata === 'object' ? (obj.metadata as Entity['metadata']) : undefined,
    };
  }

  /**
   * EntityType正規化
   */
  private normalizeEntityType(value: unknown): Entity['type'] {
    const validTypes: Entity['type'][] = ['concern', 'stage_data', 'widget_data', 'shared_data'];
    if (typeof value === 'string' && validTypes.includes(value as Entity['type'])) {
      return value as Entity['type'];
    }
    return 'widget_data';
  }

  /**
   * Attribute正規化
   */
  private normalizeAttribute(obj: Record<string, unknown>): Attribute | null {
    const name = typeof obj.name === 'string' ? obj.name : null;
    if (!name) return null;

    const structuralType = this.normalizeStructuralType(obj.structuralType);
    const valueType = this.normalizeConcreteType(obj.valueType);

    const attr: Attribute = {
      name,
      structuralType,
    };

    if (valueType) attr.valueType = valueType;
    if (typeof obj.description === 'string') attr.description = obj.description;
    if (obj.defaultValue !== undefined) attr.defaultValue = obj.defaultValue;
    if (typeof obj.ref === 'string') attr.ref = obj.ref;
    if (obj.generation && typeof obj.generation === 'object') {
      attr.generation = obj.generation as GenerationSpec;
    }
    if (obj.constraints && Array.isArray(obj.constraints)) {
      attr.constraints = obj.constraints as Attribute['constraints'];
    }

    // 配列型の場合
    if (structuralType === 'ARRY') {
      if (typeof obj.itemType === 'string') {
        attr.itemType = this.normalizeStructuralType(obj.itemType);
      }
      if (obj.itemValueType) {
        attr.itemValueType = this.normalizeConcreteType(obj.itemValueType);
      }
      if (obj.schema && typeof obj.schema === 'object') {
        attr.schema = obj.schema as Record<string, unknown>;
      }
    }

    return attr;
  }

  /**
   * StructuralType正規化
   */
  private normalizeStructuralType(value: unknown): StructuralType {
    const validTypes: StructuralType[] = ['SVAL', 'ARRY', 'PNTR', 'DICT'];
    if (typeof value === 'string' && validTypes.includes(value as StructuralType)) {
      return value as StructuralType;
    }
    return 'SVAL';
  }

  /**
   * ConcreteType正規化
   */
  private normalizeConcreteType(value: unknown): ConcreteType | undefined {
    const validTypes: ConcreteType[] = ['string', 'number', 'boolean', 'date', 'object'];
    if (typeof value === 'string' && validTypes.includes(value as ConcreteType)) {
      return value as ConcreteType;
    }
    return undefined;
  }

  /**
   * DataDependency正規化
   */
  private normalizeDataDependency(obj: Record<string, unknown>): DataDependency | null {
    const id = typeof obj.id === 'string' ? obj.id : `dep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const source = typeof obj.source === 'string' ? obj.source : null;
    const target = typeof obj.target === 'string' ? obj.target : null;

    if (!source || !target) return null;

    const mechanism = obj.mechanism === 'validate' || obj.mechanism === 'update' ? obj.mechanism : 'update';

    const relationship: RelationshipSpec = this.normalizeRelationship(obj.relationship);

    return {
      id,
      source,
      target,
      mechanism,
      relationship,
    };
  }

  /**
   * RelationshipSpec正規化
   */
  private normalizeRelationship(value: unknown): RelationshipSpec {
    if (typeof value !== 'object' || value === null) {
      return { type: 'javascript', javascript: 'source' };
    }

    const obj = value as Record<string, unknown>;
    const type = obj.type === 'javascript' || obj.type === 'transform' || obj.type === 'llm' ? obj.type : 'javascript';

    const rel: RelationshipSpec = { type };

    if (type === 'javascript' && typeof obj.javascript === 'string') {
      rel.javascript = obj.javascript;
    } else if (type === 'transform' && typeof obj.transform === 'string') {
      rel.transform = obj.transform;
    } else if (type === 'llm' && typeof obj.llmPrompt === 'string') {
      rel.llmPrompt = obj.llmPrompt;
    } else if (type === 'javascript') {
      rel.javascript = 'source';
    }

    return rel;
  }

  /**
   * デフォルトORS作成
   */
  private createDefaultORS(stage: StageType, sessionId: string): ORS {
    return {
      version: '4.0',
      entities: [
        {
          id: 'concern',
          type: 'concern',
          attributes: [
            {
              name: 'text',
              structuralType: 'SVAL',
              valueType: 'string',
              description: 'ユーザーの元の悩みテキスト',
            },
          ],
        },
        {
          id: `${stage}_data`,
          type: 'stage_data',
          attributes: [
            {
              name: 'items',
              structuralType: 'ARRY',
              itemType: 'SVAL',
              itemValueType: 'string',
              description: `${stage}ステージのデータ項目`,
            },
          ],
        },
      ],
      dependencyGraph: createDependencyGraph([]),
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'fallback',
        sessionId,
        stage,
      },
    };
  }

  /**
   * フォールバックORS生成
   *
   * LLM呼び出しが失敗した場合のフォールバック。
   * ステージとWidget選定結果に基づいてルールベースでORSを生成。
   */
  fallbackORS(input: ORSGeneratorInput): ORS {
    const { stage, stageSelection, sessionId } = input;

    if (this.debug) {
      console.log(`[ORSGeneratorService] Using fallback ORS for stage: ${stage}`);
    }

    const entities: Entity[] = [];
    const dependencies: DataDependency[] = [];

    // 基本のconcernエンティティ
    entities.push({
      id: 'concern',
      type: 'concern',
      attributes: [
        {
          name: 'text',
          structuralType: 'SVAL',
          valueType: 'string',
          description: 'ユーザーの悩みテキスト',
        },
      ],
    });

    // Widget毎にエンティティを作成
    for (const selectedWidget of stageSelection.widgets) {
      const definition = getWidgetDefinitionV4(selectedWidget.widgetId);
      if (!definition) continue;

      const widgetEntityId = `widget_${selectedWidget.widgetId}`;
      const attributes: Attribute[] = [];

      // 入力ポートからattribute生成
      for (const input of definition.ports.inputs) {
        attributes.push(this.portToAttribute(input, 'input'));
      }

      // 出力ポートからattribute生成
      for (const output of definition.ports.outputs) {
        attributes.push(this.portToAttribute(output, 'output'));
      }

      entities.push({
        id: widgetEntityId,
        type: 'widget_data',
        attributes,
      });
    }

    return {
      version: '4.0',
      entities,
      dependencyGraph: createDependencyGraph(dependencies),
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'fallback',
        sessionId,
        stage,
      },
    };
  }

  /**
   * ポート定義からAttribute生成
   */
  private portToAttribute(
    port: { id: string; dataType: string; description?: string; required?: boolean },
    direction: 'input' | 'output'
  ): Attribute {
    const structuralType = this.dataTypeToStructuralType(port.dataType);
    const valueType = this.dataTypeToConcreteType(port.dataType);

    const attr: Attribute = {
      name: port.id,
      structuralType,
      description: port.description || `${direction} port: ${port.id}`,
    };

    if (valueType) attr.valueType = valueType;

    if (structuralType === 'ARRY') {
      attr.itemType = 'SVAL';
      attr.itemValueType = 'string';
    }

    return attr;
  }

  /**
   * Widget dataTypeからStructuralType変換
   */
  private dataTypeToStructuralType(dataType: string): StructuralType {
    if (dataType.includes('[]') || dataType.includes('Array') || dataType === 'items') {
      return 'ARRY';
    }
    if (dataType === 'object' || dataType.includes('Record')) {
      return 'DICT';
    }
    return 'SVAL';
  }

  /**
   * Widget dataTypeからConcreteType変換
   */
  private dataTypeToConcreteType(dataType: string): ConcreteType | undefined {
    const baseType = dataType.replace('[]', '').replace('Array<', '').replace('>', '');
    const mapping: Record<string, ConcreteType> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'date',
      object: 'object',
      text: 'string',
      items: 'string',
    };
    return mapping[baseType.toLowerCase()];
  }
}

// =============================================================================
// 内部型
// =============================================================================

interface WidgetPortInfo {
  widgetId: string;
  purpose: string;
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

interface PreviousORSContext {
  stage: StageType;
  entityIds: string[];
  entitySummaries: {
    id: string;
    type: string;
    attributeNames: string[];
  }[];
}

// =============================================================================
// ファクトリ関数
// =============================================================================

/**
 * ORSGeneratorServiceインスタンスを作成
 */
export function createORSGeneratorService(config: ORSGeneratorServiceConfig): ORSGeneratorService {
  return new ORSGeneratorService(config);
}
