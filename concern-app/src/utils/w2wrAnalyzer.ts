/**
 * w2wrAnalyzer.ts
 * Widget-to-Widget Reactivity (W2WR) 定義の構文解析と検証ユーティリティ
 *
 * ReplayViewでW2WR定義の可視化・検証に使用
 */

import type {
  DependencyGraphSpec,
  DependencySpec,
  MechanismType,
  UpdateMode,
} from '../types/ui-spec.types';
import type {
  ReactiveBindingSpec,
  ReactiveBinding,
  BindingMechanism,
  UpdateMode as UpdateModeV4,
} from '../types/v4/reactive-binding.types';
import { DependencyGraph } from '../services/ui/DependencyGraph';

// =============================================================================
// 型定義
// =============================================================================

/**
 * 個別の依存関係の検証結果
 */
export interface W2WRValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 解析された依存関係の詳細
 */
export interface AnalyzedDependency {
  /** ソースポートキー */
  source: string;
  /** ターゲットポートキー */
  target: string;
  /** メカニズム（生の値） */
  mechanism: string;
  /** 関係タイプ（生の値） */
  relationshipType: string;
  /** JavaScript コード（存在する場合） */
  javascriptCode?: string;
  /** Transform関数名（存在する場合） */
  transformFunction?: string;
  /** LLMプロンプト（存在する場合） */
  llmPrompt?: string;
  /** 更新モード（生の値） */
  updateMode: string;
  /** 検証結果 */
  validation: W2WRValidationResult;
}

/**
 * W2WR解析のソースタイプ
 */
export type W2WRSource = 'dpg' | 'reactiveBindings' | 'none';

/**
 * W2WR全体の解析結果
 */
export interface W2WRAnalysis {
  /** 依存関係の総数 */
  totalCount: number;
  /** 有効な依存関係の数 */
  validCount: number;
  /** エラーのある依存関係の数 */
  errorCount: number;
  /** 解析された依存関係リスト */
  dependencies: AnalyzedDependency[];
  /** 循環依存があるか */
  hasCycle: boolean;
  /** 循環依存のエラーメッセージ */
  cycleError?: string;
  /** 解析ソース（dpg: v3, reactiveBindings: v4/v5, none: なし） */
  source: W2WRSource;
  /** DSLバージョン */
  dslVersion?: string;
}

// =============================================================================
// 定数
// =============================================================================

// DSL v3 (dpg) 用
const VALID_MECHANISMS: MechanismType[] = ['validate', 'update'];
const VALID_UPDATE_MODES: UpdateMode[] = ['realtime', 'debounced', 'on_confirm'];
const VALID_RELATIONSHIP_TYPES = ['javascript', 'transform', 'llm'];

// DSL v4/v5 (reactiveBindings) 用
const VALID_MECHANISMS_V4: BindingMechanism[] = ['validate', 'update'];
const VALID_UPDATE_MODES_V4: UpdateModeV4[] = ['realtime', 'debounced', 'on_confirm'];
const VALID_RELATIONSHIP_TYPES_V4 = ['javascript', 'transform', 'llm', 'passthrough'];

// =============================================================================
// 検証関数
// =============================================================================

/**
 * ポートキーの形式を検証
 */
function validatePortKey(key: string, field: string): string[] {
  const errors: string[] = [];

  if (!key) {
    errors.push(`${field} is empty`);
    return errors;
  }

  if (typeof key !== 'string') {
    errors.push(`${field} must be a string`);
    return errors;
  }

  if (!key.includes('.')) {
    errors.push(`${field} "${key}" must contain a dot separator (widgetId.propertyName)`);
    return errors;
  }

  const parts = key.split('.');
  if (parts.length !== 2) {
    errors.push(`${field} "${key}" must have exactly one dot (widgetId.propertyName)`);
    return errors;
  }

  const [widgetId, propertyName] = parts;
  if (!widgetId) {
    errors.push(`${field} "${key}" has empty widgetId`);
  }
  if (!propertyName) {
    errors.push(`${field} "${key}" has empty propertyName`);
  }

  return errors;
}

/**
 * 個別の依存関係定義を検証
 */
export function validateDependencySpec(dep: DependencySpec): W2WRValidationResult {
  const errors: string[] = [];

  // source の検証
  errors.push(...validatePortKey(dep.source, 'source'));

  // target の検証
  errors.push(...validatePortKey(dep.target, 'target'));

  // mechanism の検証
  if (!dep.mechanism) {
    errors.push('mechanism is required');
  } else if (!VALID_MECHANISMS.includes(dep.mechanism as MechanismType)) {
    errors.push(`Invalid mechanism: "${dep.mechanism}". Must be one of: ${VALID_MECHANISMS.join(', ')}`);
  }

  // relationship の検証
  if (!dep.relationship) {
    errors.push('relationship is required');
  } else {
    if (!dep.relationship.type) {
      errors.push('relationship.type is required');
    } else if (!VALID_RELATIONSHIP_TYPES.includes(dep.relationship.type)) {
      errors.push(`Invalid relationship.type: "${dep.relationship.type}". Must be one of: ${VALID_RELATIONSHIP_TYPES.join(', ')}`);
    }

    // relationship タイプに応じた追加検証
    if (dep.relationship.type === 'javascript' && !dep.relationship.javascript) {
      errors.push('relationship.javascript is required when type is "javascript"');
    }
    if (dep.relationship.type === 'transform' && !dep.relationship.transform) {
      errors.push('relationship.transform is required when type is "transform"');
    }
    if (dep.relationship.type === 'llm' && !dep.relationship.llmPrompt) {
      errors.push('relationship.llmPrompt is required when type is "llm"');
    }
  }

  // updateMode の検証
  if (!dep.updateMode) {
    errors.push('updateMode is required');
  } else if (!VALID_UPDATE_MODES.includes(dep.updateMode as UpdateMode)) {
    errors.push(`Invalid updateMode: "${dep.updateMode}". Must be one of: ${VALID_UPDATE_MODES.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * ReactiveBinding（DSL v4/v5）の個別検証
 */
export function validateReactiveBinding(binding: ReactiveBinding): W2WRValidationResult {
  const errors: string[] = [];

  // id の検証
  if (!binding.id) {
    errors.push('id is required');
  }

  // source の検証
  errors.push(...validatePortKey(binding.source, 'source'));

  // target の検証
  errors.push(...validatePortKey(binding.target, 'target'));

  // mechanism の検証
  if (!binding.mechanism) {
    errors.push('mechanism is required');
  } else if (!VALID_MECHANISMS_V4.includes(binding.mechanism as BindingMechanism)) {
    errors.push(`Invalid mechanism: "${binding.mechanism}". Must be one of: ${VALID_MECHANISMS_V4.join(', ')}`);
  }

  // relationship の検証
  if (!binding.relationship) {
    errors.push('relationship is required');
  } else {
    if (!binding.relationship.type) {
      errors.push('relationship.type is required');
    } else if (!VALID_RELATIONSHIP_TYPES_V4.includes(binding.relationship.type)) {
      errors.push(`Invalid relationship.type: "${binding.relationship.type}". Must be one of: ${VALID_RELATIONSHIP_TYPES_V4.join(', ')}`);
    }

    // relationship タイプに応じた追加検証（passthroughは追加フィールド不要）
    if (binding.relationship.type === 'javascript') {
      const rel = binding.relationship as { javascript?: string };
      if (!rel.javascript) {
        errors.push('relationship.javascript is required when type is "javascript"');
      }
    }
    if (binding.relationship.type === 'transform') {
      const rel = binding.relationship as { transform?: string };
      if (!rel.transform) {
        errors.push('relationship.transform is required when type is "transform"');
      }
    }
    if (binding.relationship.type === 'llm') {
      const rel = binding.relationship as { llmPrompt?: string };
      if (!rel.llmPrompt) {
        errors.push('relationship.llmPrompt is required when type is "llm"');
      }
    }
    // passthrough は追加フィールド不要
  }

  // updateMode の検証
  if (!binding.updateMode) {
    errors.push('updateMode is required');
  } else if (!VALID_UPDATE_MODES_V4.includes(binding.updateMode as UpdateModeV4)) {
    errors.push(`Invalid updateMode: "${binding.updateMode}". Must be one of: ${VALID_UPDATE_MODES_V4.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * ReactiveBinding を AnalyzedDependency に変換
 */
function convertReactiveBindingToAnalyzed(binding: ReactiveBinding): AnalyzedDependency {
  const validation = validateReactiveBinding(binding);

  // relationship の詳細を抽出
  let javascriptCode: string | undefined;
  let transformFunction: string | undefined;
  let llmPrompt: string | undefined;

  if (binding.relationship) {
    switch (binding.relationship.type) {
      case 'javascript':
        javascriptCode = (binding.relationship as { javascript?: string }).javascript;
        break;
      case 'transform':
        transformFunction = (binding.relationship as { transform?: string }).transform;
        break;
      case 'llm':
        llmPrompt = (binding.relationship as { llmPrompt?: string }).llmPrompt;
        break;
      // passthrough は追加データなし
    }
  }

  return {
    source: binding.source || '',
    target: binding.target || '',
    mechanism: binding.mechanism || '',
    relationshipType: binding.relationship?.type || '',
    javascriptCode,
    transformFunction,
    llmPrompt,
    updateMode: binding.updateMode || '',
    validation,
  };
}

/**
 * ReactiveBindingSpec（DSL v4/v5）全体を解析
 */
export function analyzeReactiveBindingSpec(
  spec: ReactiveBindingSpec | undefined | null,
  dslVersion?: string
): W2WRAnalysis {
  // specがない場合は空の結果を返す
  if (!spec || !spec.bindings || !Array.isArray(spec.bindings)) {
    return {
      totalCount: 0,
      validCount: 0,
      errorCount: 0,
      dependencies: [],
      hasCycle: false,
      source: 'none',
      dslVersion,
    };
  }

  const dependencies: AnalyzedDependency[] = [];
  let validCount = 0;
  let errorCount = 0;

  // 各バインディングを解析
  for (const binding of spec.bindings) {
    const analyzed = convertReactiveBindingToAnalyzed(binding);
    dependencies.push(analyzed);

    if (analyzed.validation.isValid) {
      validCount++;
    } else {
      errorCount++;
    }
  }

  // 循環依存チェック（簡易版：グラフを構築して検出）
  let hasCycle = false;
  let cycleError: string | undefined;

  try {
    // ReactiveBindingSpecからDependencyGraphSpec形式に変換してチェック
    const dpgForCycleCheck: DependencyGraphSpec = {
      dependencies: spec.bindings.map((b) => ({
        source: b.source,
        target: b.target,
        mechanism: b.mechanism as MechanismType,
        relationship: b.relationship as DependencySpec['relationship'],
        updateMode: b.updateMode as UpdateMode,
      })),
    };
    const graph = new DependencyGraph(dpgForCycleCheck);
    hasCycle = graph.detectCycle();
    if (hasCycle) {
      cycleError = 'Circular dependency detected in the reactive bindings';
    }
  } catch (e) {
    hasCycle = true;
    cycleError = e instanceof Error ? e.message : 'Unknown error during cycle detection';
  }

  return {
    totalCount: spec.bindings.length,
    validCount,
    errorCount,
    dependencies,
    hasCycle,
    cycleError,
    source: 'reactiveBindings',
    dslVersion: dslVersion || spec.metadata?.version,
  };
}

/**
 * DependencyGraphSpec（DSL v3）全体を解析
 */
export function analyzeW2WRSpec(dpg: DependencyGraphSpec | undefined | null): W2WRAnalysis {
  // dpgがない場合は空の結果を返す
  if (!dpg || !dpg.dependencies || !Array.isArray(dpg.dependencies)) {
    return {
      totalCount: 0,
      validCount: 0,
      errorCount: 0,
      dependencies: [],
      hasCycle: false,
      source: 'none',
    };
  }

  const dependencies: AnalyzedDependency[] = [];
  let validCount = 0;
  let errorCount = 0;

  // 各依存関係を解析
  for (const dep of dpg.dependencies) {
    const validation = validateDependencySpec(dep);

    const analyzed: AnalyzedDependency = {
      source: dep.source || '',
      target: dep.target || '',
      mechanism: dep.mechanism || '',
      relationshipType: dep.relationship?.type || '',
      javascriptCode: dep.relationship?.javascript,
      transformFunction: typeof dep.relationship?.transform === 'string'
        ? dep.relationship.transform
        : undefined,
      llmPrompt: dep.relationship?.llmPrompt,
      updateMode: dep.updateMode || '',
      validation,
    };

    dependencies.push(analyzed);

    if (validation.isValid) {
      validCount++;
    } else {
      errorCount++;
    }
  }

  // 循環依存チェック
  let hasCycle = false;
  let cycleError: string | undefined;

  try {
    const graph = new DependencyGraph(dpg);
    hasCycle = graph.detectCycle();
    if (hasCycle) {
      cycleError = 'Circular dependency detected in the dependency graph';
    }
  } catch (e) {
    hasCycle = true;
    cycleError = e instanceof Error ? e.message : 'Unknown error during cycle detection';
  }

  return {
    totalCount: dpg.dependencies.length,
    validCount,
    errorCount,
    dependencies,
    hasCycle,
    cycleError,
    source: 'dpg',
  };
}

/**
 * UISpec から W2WR を抽出して解析
 * DSL v4/v5 (reactiveBindings) を優先し、なければ v3 (dpg) を使用
 */
export function analyzeW2WRFromUISpec(
  uiSpec: {
    dpg?: DependencyGraphSpec;
    reactiveBindings?: ReactiveBindingSpec;
    version?: string;
  } | undefined | null
): W2WRAnalysis {
  if (!uiSpec) {
    return {
      totalCount: 0,
      validCount: 0,
      errorCount: 0,
      dependencies: [],
      hasCycle: false,
      source: 'none',
    };
  }

  // DSL v4/v5: reactiveBindings を優先
  if (uiSpec.reactiveBindings && uiSpec.reactiveBindings.bindings && uiSpec.reactiveBindings.bindings.length > 0) {
    return analyzeReactiveBindingSpec(uiSpec.reactiveBindings, uiSpec.version);
  }

  // DSL v3: dpg を使用
  if (uiSpec.dpg && uiSpec.dpg.dependencies && uiSpec.dpg.dependencies.length > 0) {
    const result = analyzeW2WRSpec(uiSpec.dpg);
    result.dslVersion = uiSpec.version;
    return result;
  }

  // どちらもない場合
  return {
    totalCount: 0,
    validCount: 0,
    errorCount: 0,
    dependencies: [],
    hasCycle: false,
    source: 'none',
    dslVersion: uiSpec.version,
  };
}
