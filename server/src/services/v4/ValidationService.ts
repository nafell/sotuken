/**
 * Validation Service for DSL v4
 *
 * ORS, UISpec, ReactiveBindingSpecの検証とエラーログサービス。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

import type { ORS, Entity, Attribute, StageType } from '../../types/v4/ors.types';
import type { DependencyGraph, DataDependency } from '../../types/v4/dependency-graph.types';
import type { UISpec, WidgetSpec, DataBindingSpec, PlanUISpec } from '../../types/v4/ui-spec.types';
import type { ReactiveBindingSpec, ReactiveBinding } from '../../types/v4/reactive-binding.types';
import type { WidgetSelectionResult, StageSelection, SelectedWidget } from '../../types/v4/widget-selection.types';
import { parseEntityAttributePath } from '../../types/v4/ors.types';
import { parseWidgetPortPath } from '../../types/v4/reactive-binding.types';
import { getWidgetDefinitionV4 } from '../../definitions/v4/widgets';
import { validateStageComplexity, DEFAULT_COMPLEXITY_RULES, type ComplexityRules } from '../../types/v4/widget-definition.types';
import { STAGE_ORDER } from '../../types/v4/widget-selection.types';

// =============================================================================
// Types
// =============================================================================

/**
 * 検証エラーの深刻度
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * 検証エラー
 */
export interface ValidationError {
  /** エラーID */
  id: string;
  /** エラー種別 */
  type: string;
  /** 深刻度 */
  severity: ValidationSeverity;
  /** エラーメッセージ */
  message: string;
  /** エラーが発生した箇所 */
  path?: string;
  /** 関連するコンテキスト */
  context?: Record<string, unknown>;
  /** 修正の提案 */
  suggestion?: string;
}

/**
 * 検証結果
 */
export interface ValidationResult {
  /** 検証が成功したか */
  valid: boolean;
  /** 検証エラーのリスト */
  errors: ValidationError[];
  /** 警告のリスト */
  warnings: ValidationError[];
  /** 情報メッセージのリスト */
  info: ValidationError[];
  /** 検証日時 */
  validatedAt: number;
}

/**
 * Validation Service設定
 */
export interface ValidationServiceConfig {
  /** Complexity閾値ルール */
  complexityRules?: ComplexityRules;
  /** 厳格モード（警告もエラーとして扱う） */
  strictMode?: boolean;
  /** デバッグモード */
  debug?: boolean;
}

// =============================================================================
// Validation Service
// =============================================================================

/**
 * Validation Service
 *
 * DSL v4の各種データ構造を検証し、エラーを報告する。
 */
export class ValidationService {
  private complexityRules: ComplexityRules;
  private strictMode: boolean;
  private debug: boolean;

  constructor(config: ValidationServiceConfig = {}) {
    this.complexityRules = config.complexityRules ?? DEFAULT_COMPLEXITY_RULES;
    this.strictMode = config.strictMode ?? false;
    this.debug = config.debug ?? false;
  }

  // ===========================================================================
  // Widget Selection Validation
  // ===========================================================================

  /**
   * WidgetSelectionResultを検証
   */
  validateWidgetSelection(result: WidgetSelectionResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // バージョンチェック
    if (result.version !== '4.0') {
      errors.push(this.createError('INVALID_VERSION', `Invalid version: ${result.version}, expected 4.0`, 'version'));
    }

    // 各ステージを検証
    for (const stage of STAGE_ORDER) {
      const selection = result.stages[stage];
      this.validateStageSelection(selection, stage, errors, warnings, info);
    }

    // メタデータ検証
    if (!result.metadata.bottleneckType) {
      errors.push(this.createError('MISSING_BOTTLENECK_TYPE', 'bottleneckType is required in metadata', 'metadata.bottleneckType'));
    }

    return this.buildResult(errors, warnings, info);
  }

  /**
   * StageSelectionを検証
   */
  private validateStageSelection(
    selection: StageSelection,
    stage: StageType,
    errors: ValidationError[],
    warnings: ValidationError[],
    info: ValidationError[]
  ): void {
    const path = `stages.${stage}`;

    // Widget数チェック
    if (selection.widgets.length === 0) {
      errors.push(this.createError('NO_WIDGETS', `No widgets selected for stage: ${stage}`, path));
    }

    if (selection.widgets.length > 3) {
      warnings.push(this.createWarning('TOO_MANY_WIDGETS', `${selection.widgets.length} widgets selected for ${stage}, recommended max is 3`, path));
    }

    // Complexity検証
    const widgetDefs = selection.widgets
      .map((w) => getWidgetDefinitionV4(w.widgetId))
      .filter((d) => d !== undefined);

    const { valid, violations } = validateStageComplexity(widgetDefs, this.complexityRules);
    if (!valid) {
      for (const violation of violations) {
        warnings.push(this.createWarning('COMPLEXITY_VIOLATION', violation, path));
      }
    }

    // 各Widget検証
    const widgetIds = new Set<string>();
    for (let i = 0; i < selection.widgets.length; i++) {
      const widget = selection.widgets[i];
      const widgetPath = `${path}.widgets[${i}]`;

      // 重複チェック
      if (widgetIds.has(widget.widgetId)) {
        errors.push(this.createError('DUPLICATE_WIDGET', `Duplicate widget: ${widget.widgetId} in stage ${stage}`, widgetPath));
      }
      widgetIds.add(widget.widgetId);

      // Widget定義存在チェック
      const def = getWidgetDefinitionV4(widget.widgetId);
      if (!def) {
        errors.push(this.createError('UNKNOWN_WIDGET', `Unknown widget type: ${widget.widgetId}`, widgetPath));
      } else {
        // ステージ適合性チェック
        if (def.stage !== 'all' && def.stage !== stage) {
          warnings.push(
            this.createWarning(
              'STAGE_MISMATCH',
              `Widget ${widget.widgetId} is designed for stage ${def.stage}, used in ${stage}`,
              widgetPath,
              { suggestion: `Consider using a widget designed for ${stage} stage` }
            )
          );
        }
      }
    }

    // purposeとtargetチェック
    if (!selection.purpose) {
      warnings.push(this.createWarning('MISSING_PURPOSE', `Stage ${stage} has no purpose defined`, `${path}.purpose`));
    }
    if (!selection.target) {
      warnings.push(this.createWarning('MISSING_TARGET', `Stage ${stage} has no target defined`, `${path}.target`));
    }
  }

  // ===========================================================================
  // ORS Validation
  // ===========================================================================

  /**
   * ORSを検証
   */
  validateORS(ors: ORS): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // null/undefinedチェック
    if (!ors || typeof ors !== 'object') {
      errors.push(this.createError('INVALID_ORS', 'ORS is null or not an object', 'root'));
      return this.buildResult(errors, warnings, info);
    }

    // バージョンチェック
    if (ors.version !== '4.0') {
      errors.push(this.createError('INVALID_VERSION', `Invalid version: ${ors.version}, expected 4.0`, 'version'));
    }

    // entitiesが配列であることを確認
    if (!Array.isArray(ors.entities)) {
      errors.push(this.createError('INVALID_ENTITIES', 'ORS entities is not an array', 'entities'));
      return this.buildResult(errors, warnings, info);
    }

    // Entity検証
    const entityIds = new Set<string>();
    for (let i = 0; i < ors.entities.length; i++) {
      const entity = ors.entities[i];
      const path = `entities[${i}]`;

      // 重複チェック
      if (entityIds.has(entity.id)) {
        errors.push(this.createError('DUPLICATE_ENTITY', `Duplicate entity ID: ${entity.id}`, path));
      }
      entityIds.add(entity.id);

      // 属性検証
      this.validateEntityAttributes(entity, path, errors, warnings, info);
    }

    // DependencyGraph検証
    this.validateDependencyGraph(ors.dependencyGraph, entityIds, ors.entities, errors, warnings, info);

    // concernエンティティの存在チェック
    const hasConcern = ors.entities.some((e) => e.type === 'concern');
    if (!hasConcern) {
      warnings.push(this.createWarning('NO_CONCERN_ENTITY', 'ORS has no concern entity', 'entities'));
    }

    return this.buildResult(errors, warnings, info);
  }

  /**
   * Entity属性を検証
   */
  private validateEntityAttributes(
    entity: Entity,
    basePath: string,
    errors: ValidationError[],
    warnings: ValidationError[],
    info: ValidationError[]
  ): void {
    const attrNames = new Set<string>();

    for (let i = 0; i < entity.attributes.length; i++) {
      const attr = entity.attributes[i];
      const path = `${basePath}.attributes[${i}]`;

      // 重複チェック
      if (attrNames.has(attr.name)) {
        errors.push(this.createError('DUPLICATE_ATTRIBUTE', `Duplicate attribute name: ${attr.name} in entity ${entity.id}`, path));
      }
      attrNames.add(attr.name);

      // structuralType チェック
      const validStructuralTypes = ['SVAL', 'ARRY', 'PNTR', 'DICT'];
      if (!validStructuralTypes.includes(attr.structuralType)) {
        errors.push(this.createError('INVALID_STRUCTURAL_TYPE', `Invalid structuralType: ${attr.structuralType}`, `${path}.structuralType`));
      }

      // valueType チェック（SVALとDICTの場合）
      if ((attr.structuralType === 'SVAL' || attr.structuralType === 'DICT') && !attr.valueType) {
        warnings.push(this.createWarning('MISSING_VALUE_TYPE', `Attribute ${attr.name} has no valueType`, `${path}.valueType`));
      }

      // itemType チェック（ARRYの場合）
      if (attr.structuralType === 'ARRY' && !attr.itemType) {
        warnings.push(this.createWarning('MISSING_ITEM_TYPE', `Array attribute ${attr.name} has no itemType`, `${path}.itemType`));
      }

      // ref チェック（PNTRの場合）
      if (attr.structuralType === 'PNTR' && !attr.ref) {
        errors.push(this.createError('MISSING_REF', `Pointer attribute ${attr.name} has no ref`, `${path}.ref`));
      }
    }
  }

  /**
   * DependencyGraphを検証
   */
  private validateDependencyGraph(
    dpg: DependencyGraph,
    entityIds: Set<string>,
    entities: Entity[],
    errors: ValidationError[],
    warnings: ValidationError[],
    info: ValidationError[]
  ): void {
    const basePath = 'dependencyGraph';
    const depIds = new Set<string>();

    for (let i = 0; i < dpg.dependencies.length; i++) {
      const dep = dpg.dependencies[i];
      const path = `${basePath}.dependencies[${i}]`;

      // 重複チェック
      if (depIds.has(dep.id)) {
        errors.push(this.createError('DUPLICATE_DEPENDENCY', `Duplicate dependency ID: ${dep.id}`, path));
      }
      depIds.add(dep.id);

      // source/target検証
      this.validateEntityAttributePath(dep.source, entityIds, entities, `${path}.source`, errors, warnings);
      this.validateEntityAttributePath(dep.target, entityIds, entities, `${path}.target`, errors, warnings);

      // 自己参照チェック
      if (dep.source === dep.target) {
        warnings.push(this.createWarning('SELF_REFERENCE', `Dependency ${dep.id} has same source and target`, path));
      }

      // relationship検証
      if (!dep.relationship || !dep.relationship.type) {
        errors.push(this.createError('MISSING_RELATIONSHIP', `Dependency ${dep.id} has no relationship`, `${path}.relationship`));
      }
    }
  }

  /**
   * EntityAttributePathを検証
   */
  private validateEntityAttributePath(
    pathStr: string,
    entityIds: Set<string>,
    entities: Entity[],
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    try {
      const { entityId, attributeName } = parseEntityAttributePath(pathStr);

      if (!entityIds.has(entityId)) {
        errors.push(this.createError('UNKNOWN_ENTITY', `Unknown entity: ${entityId}`, path, { entityId, attributeName }));
        return;
      }

      const entity = entities.find((e) => e.id === entityId);
      if (entity) {
        const hasAttribute = entity.attributes.some((a) => a.name === attributeName);
        if (!hasAttribute) {
          errors.push(
            this.createError('UNKNOWN_ATTRIBUTE', `Unknown attribute: ${attributeName} in entity ${entityId}`, path, { entityId, attributeName })
          );
        }
      }
    } catch {
      errors.push(this.createError('INVALID_PATH', `Invalid entity attribute path: ${pathStr}`, path));
    }
  }

  // ===========================================================================
  // UISpec Validation
  // ===========================================================================

  /**
   * UISpecを検証
   */
  validateUISpec(uiSpec: UISpec, ors?: ORS): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // null/undefinedチェック
    if (!uiSpec || typeof uiSpec !== 'object') {
      errors.push(this.createError('INVALID_UISPEC', 'UISpec is null or not an object', 'root'));
      return this.buildResult(errors, warnings, info);
    }

    // v5.0 PlanUISpec判定 → 専用メソッドへルーティング
    if ('sections' in uiSpec) {
      return this.validatePlanUISpec(uiSpec as unknown as PlanUISpec, ors);
    }

    // widgets配列チェック
    if (!Array.isArray(uiSpec.widgets)) {
      errors.push(
        this.createError('INVALID_UISPEC_STRUCTURE', 'UISpec.widgets is missing or not an array', 'widgets')
      );
      return this.buildResult(errors, warnings, info);
    }

    // バージョンチェック
    if (uiSpec.version !== '4.0') {
      errors.push(this.createError('INVALID_VERSION', `Invalid version: ${uiSpec.version}, expected 4.0`, 'version'));
    }

    // Widget検証
    const widgetIds = new Set<string>();
    for (let i = 0; i < uiSpec.widgets.length; i++) {
      const widget = uiSpec.widgets[i];
      const path = `widgets[${i}]`;

      // 重複チェック
      if (widgetIds.has(widget.id)) {
        errors.push(this.createError('DUPLICATE_WIDGET_ID', `Duplicate widget ID: ${widget.id}`, path));
      }
      widgetIds.add(widget.id);

      // Widget定義存在チェック
      const def = getWidgetDefinitionV4(widget.component);
      if (!def) {
        errors.push(this.createError('UNKNOWN_WIDGET', `Unknown widget component: ${widget.component}`, `${path}.component`));
      }

      // DataBinding検証
      this.validateDataBindings(widget, def, ors, path, errors, warnings, info);
    }

    // ReactiveBinding検証
    this.validateReactiveBindings(uiSpec.reactiveBindings, widgetIds, errors, warnings, info);

    return this.buildResult(errors, warnings, info);
  }

  /**
   * PlanUISpec (v5.0) を検証
   */
  validatePlanUISpec(planUISpec: PlanUISpec, ors?: ORS): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // null/undefinedチェック
    if (!planUISpec || typeof planUISpec !== 'object') {
      errors.push(this.createError('INVALID_UISPEC', 'PlanUISpec is null or not an object', 'root'));
      return this.buildResult(errors, warnings, info);
    }

    // sections構造チェック
    if (!planUISpec.sections || typeof planUISpec.sections !== 'object') {
      errors.push(
        this.createError('INVALID_UISPEC_STRUCTURE', 'PlanUISpec.sections is missing or not an object', 'sections')
      );
      return this.buildResult(errors, warnings, info);
    }

    // バージョンチェック
    if (planUISpec.version !== '5.0') {
      errors.push(
        this.createError('INVALID_VERSION', `Invalid version: ${planUISpec.version}, expected 5.0`, 'version')
      );
    }

    // 各セクションのwidgets配列チェック
    const widgetIds = new Set<string>();
    for (const sectionName of ['diverge', 'organize', 'converge'] as const) {
      const section = planUISpec.sections[sectionName];
      if (!section || !Array.isArray(section.widgets)) {
        errors.push(
          this.createError(
            'INVALID_UISPEC_STRUCTURE',
            `PlanUISpec.sections.${sectionName}.widgets is missing or not an array`,
            `sections.${sectionName}.widgets`
          )
        );
        continue;
      }

      // セクション内の各Widgetを検証
      for (let i = 0; i < section.widgets.length; i++) {
        const widget = section.widgets[i];
        const path = `sections.${sectionName}.widgets[${i}]`;

        // 重複チェック
        if (widgetIds.has(widget.id)) {
          errors.push(this.createError('DUPLICATE_WIDGET_ID', `Duplicate widget ID: ${widget.id}`, path));
        }
        widgetIds.add(widget.id);

        // Widget定義存在チェック
        const def = getWidgetDefinitionV4(widget.component);
        if (!def) {
          errors.push(
            this.createError('UNKNOWN_WIDGET', `Unknown widget component: ${widget.component}`, `${path}.component`)
          );
        }

        // DataBinding検証
        this.validateDataBindings(widget, def, ors, path, errors, warnings, info);
      }
    }

    // ReactiveBinding検証
    if (planUISpec.reactiveBindings) {
      this.validateReactiveBindings(planUISpec.reactiveBindings, widgetIds, errors, warnings, info);
    }

    return this.buildResult(errors, warnings, info);
  }

  /**
   * DataBindingsを検証
   */
  private validateDataBindings(
    widget: WidgetSpec,
    def: ReturnType<typeof getWidgetDefinitionV4>,
    ors: ORS | undefined,
    basePath: string,
    errors: ValidationError[],
    warnings: ValidationError[],
    info: ValidationError[]
  ): void {
    if (!def) return;

    // required入力ポートのチェック
    for (const input of def.ports.inputs) {
      if (input.required) {
        const hasBinding = widget.dataBindings.some((db) => db.portId === input.id && (db.direction === 'in' || db.direction === 'inout'));
        if (!hasBinding) {
          warnings.push(
            this.createWarning(
              'MISSING_REQUIRED_INPUT',
              `Widget ${widget.id} is missing required input binding for port: ${input.id}`,
              `${basePath}.dataBindings`
            )
          );
        }
      }
    }

    // 各DataBindingを検証
    for (let i = 0; i < widget.dataBindings.length; i++) {
      const db = widget.dataBindings[i];
      const path = `${basePath}.dataBindings[${i}]`;

      // portIdがWidget定義に存在するか
      const portExists =
        def.ports.inputs.some((p) => p.id === db.portId) || def.ports.outputs.some((p) => p.id === db.portId);
      if (!portExists) {
        errors.push(this.createError('UNKNOWN_PORT', `Unknown port: ${db.portId} in widget ${widget.component}`, path));
      }

      // ORSとの整合性チェック
      if (ors) {
        try {
          const { entityId, attributeName } = parseEntityAttributePath(db.entityAttribute);
          const entity = ors.entities.find((e) => e.id === entityId);
          if (!entity) {
            errors.push(this.createError('UNKNOWN_ENTITY', `Unknown entity: ${entityId} in data binding`, `${path}.entityAttribute`));
          } else {
            const attr = entity.attributes.find((a) => a.name === attributeName);
            if (!attr) {
              errors.push(
                this.createError('UNKNOWN_ATTRIBUTE', `Unknown attribute: ${attributeName} in entity ${entityId}`, `${path}.entityAttribute`)
              );
            }
          }
        } catch {
          errors.push(this.createError('INVALID_PATH', `Invalid entity attribute path: ${db.entityAttribute}`, `${path}.entityAttribute`));
        }
      }
    }
  }

  /**
   * ReactiveBindingsを検証
   */
  private validateReactiveBindings(
    rbSpec: ReactiveBindingSpec,
    widgetIds: Set<string>,
    errors: ValidationError[],
    warnings: ValidationError[],
    info: ValidationError[]
  ): void {
    const basePath = 'reactiveBindings';
    const bindingIds = new Set<string>();

    for (let i = 0; i < rbSpec.bindings.length; i++) {
      const binding = rbSpec.bindings[i];
      const path = `${basePath}.bindings[${i}]`;

      // 重複チェック
      if (bindingIds.has(binding.id)) {
        errors.push(this.createError('DUPLICATE_BINDING', `Duplicate binding ID: ${binding.id}`, path));
      }
      bindingIds.add(binding.id);

      // source/target検証
      this.validateWidgetPortPath(binding.source, widgetIds, `${path}.source`, errors, warnings);
      this.validateWidgetPortPath(binding.target, widgetIds, `${path}.target`, errors, warnings);

      // 自己参照チェック
      if (binding.source === binding.target) {
        warnings.push(this.createWarning('SELF_REFERENCE', `Binding ${binding.id} has same source and target`, path));
      }

      // complexity警告
      if (binding.complexityCheck !== false) {
        try {
          const { widgetId } = parseWidgetPortPath(binding.target);
          const widget = [...widgetIds].find((id) => id.startsWith(widgetId));
          if (widget) {
            // widgetIdからcomponentを推測（"component_index"形式を想定）
            const component = widget.replace(/_\d+$/, '');
            const def = getWidgetDefinitionV4(component);
            if (def && def.metadata.complexity > 0.5 && binding.updateMode === 'realtime') {
              warnings.push(
                this.createWarning(
                  'HIGH_COMPLEXITY_TARGET',
                  `Binding ${binding.id} targets high-complexity widget with realtime update`,
                  path,
                  { suggestion: 'Consider using debounced or on_confirm update mode' }
                )
              );
            }
          }
        } catch {
          // パース失敗は他のエラーでカバー
        }
      }
    }

    // 循環参照チェック
    const cycles = this.detectCycles(rbSpec.bindings);
    for (const cycle of cycles) {
      errors.push(this.createError('CIRCULAR_BINDING', `Circular binding detected: ${cycle.join(' -> ')}`, basePath));
    }
  }

  /**
   * WidgetPortPathを検証
   */
  private validateWidgetPortPath(
    pathStr: string,
    widgetIds: Set<string>,
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    try {
      const { widgetId } = parseWidgetPortPath(pathStr);

      if (!widgetIds.has(widgetId)) {
        errors.push(this.createError('UNKNOWN_WIDGET', `Unknown widget: ${widgetId}`, path, { widgetId }));
      }
    } catch {
      errors.push(this.createError('INVALID_PATH', `Invalid widget port path: ${pathStr}`, path));
    }
  }

  /**
   * 循環参照を検出
   */
  private detectCycles(bindings: ReactiveBinding[]): string[][] {
    const graph = new Map<string, string[]>();

    // グラフ構築
    for (const binding of bindings) {
      if (binding.enabled === false) continue;

      const sourceWidget = binding.source.split('.')[0];
      const targetWidget = binding.target.split('.')[0];

      if (!graph.has(sourceWidget)) {
        graph.set(sourceWidget, []);
      }
      graph.get(sourceWidget)!.push(targetWidget);
    }

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // 循環検出
          const cycleStart = path.indexOf(neighbor);
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }

      path.pop();
      recursionStack.delete(node);
      return false;
    };

    graph.forEach((_, node) => {
      if (!visited.has(node)) {
        dfs(node);
      }
    });

    return cycles;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * エラーを作成
   */
  private createError(type: string, message: string, path?: string, context?: Record<string, unknown>): ValidationError {
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity: 'error',
      message,
      path,
      context,
    };
  }

  /**
   * 警告を作成
   */
  private createWarning(
    type: string,
    message: string,
    path?: string,
    options?: { context?: Record<string, unknown>; suggestion?: string }
  ): ValidationError {
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity: 'warning',
      message,
      path,
      context: options?.context,
      suggestion: options?.suggestion,
    };
  }

  /**
   * 検証結果を構築
   */
  private buildResult(errors: ValidationError[], warnings: ValidationError[], info: ValidationError[]): ValidationResult {
    const valid = errors.length === 0 && (!this.strictMode || warnings.length === 0);

    if (this.debug) {
      console.log(`[ValidationService] Validation result: valid=${valid}, errors=${errors.length}, warnings=${warnings.length}`);
    }

    return {
      valid,
      errors,
      warnings,
      info,
      validatedAt: Date.now(),
    };
  }
}

// =============================================================================
// ファクトリ関数
// =============================================================================

/**
 * ValidationServiceインスタンスを作成
 */
export function createValidationService(config?: ValidationServiceConfig): ValidationService {
  return new ValidationService(config);
}

// =============================================================================
// Layer1/Layer4 実験用ヘルパー関数
// =============================================================================

/**
 * DSLエラータイプ一覧（Layer1/Layer4実験用）
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */
export const DSL_ERROR_TYPES = [
  'JSON_PARSE_ERROR',
  'ZOD_SCHEMA_MISMATCH',
  'UNKNOWN_WIDGET',
  'UNKNOWN_ENTITY',
  'UNKNOWN_ATTRIBUTE',
  'INVALID_PATH',
  'CIRCULAR_DEPENDENCY',
  'REFERENCE_ERROR',
  'DUPLICATE_ID',
  'MISSING_REQUIRED_FIELD',
  'INVALID_BINDING',
  'TYPE_MISMATCH',
  'COMPLEXITY_VIOLATION',
  'INVALID_VERSION',
  'NO_WIDGETS',
  'DUPLICATE_WIDGET',
  'SELF_REFERENCE',
  'INVALID_RELATIONSHIP',
  'INVALID_UISPEC',
  'INVALID_UISPEC_STRUCTURE',
] as const;

export type DSLErrorType = typeof DSL_ERROR_TYPES[number];

/**
 * ValidationResultからエラータイプのstring[]を抽出
 *
 * Layer1/Layer4実験のdsl_errorsフィールド用
 *
 * @param result 検証結果
 * @returns エラータイプの配列、エラーがなければnull
 */
export function getErrorsAsStringArray(result: ValidationResult): string[] | null {
  if (result.valid && result.errors.length === 0) {
    return null;
  }

  // errorsからtypeを抽出してユニークにする
  const errorTypes = result.errors.map(e => e.type);
  const uniqueTypes = [...new Set(errorTypes)];

  return uniqueTypes.length > 0 ? uniqueTypes : null;
}

/**
 * ValidationResultから型エラー数を取得
 *
 * @param result 検証結果
 * @returns TYPE_MISMATCHまたはZOD_SCHEMA_MISMATCHエラーの数
 */
export function countTypeErrors(result: ValidationResult): number {
  return result.errors.filter(e =>
    e.type === 'TYPE_MISMATCH' || e.type === 'ZOD_SCHEMA_MISMATCH'
  ).length;
}

/**
 * ValidationResultから参照エラー数を取得
 *
 * @param result 検証結果
 * @returns REFERENCE_ERROR、UNKNOWN_ENTITY、UNKNOWN_ATTRIBUTE、INVALID_PATHエラーの数
 */
export function countReferenceErrors(result: ValidationResult): number {
  return result.errors.filter(e =>
    e.type === 'REFERENCE_ERROR' ||
    e.type === 'UNKNOWN_ENTITY' ||
    e.type === 'UNKNOWN_ATTRIBUTE' ||
    e.type === 'INVALID_PATH'
  ).length;
}

/**
 * ValidationResultから循環依存が検出されたか判定
 *
 * @param result 検証結果
 * @returns 循環依存エラーが含まれるか
 */
export function hasCyclicDependency(result: ValidationResult): boolean {
  return result.errors.some(e => e.type === 'CIRCULAR_DEPENDENCY');
}

/**
 * ValidationResultからエラーサマリーを作成（Layer1/Layer4実験用）
 *
 * @param result 検証結果
 * @returns Layer1メトリクス計算用のサマリー
 */
export function getErrorSummary(result: ValidationResult): {
  dslErrors: string[] | null;
  typeErrorCount: number;
  referenceErrorCount: number;
  cycleDetected: boolean;
} {
  return {
    dslErrors: getErrorsAsStringArray(result),
    typeErrorCount: countTypeErrors(result),
    referenceErrorCount: countReferenceErrors(result),
    cycleDetected: hasCyclicDependency(result),
  };
}
