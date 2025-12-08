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
}

// =============================================================================
// 定数
// =============================================================================

const VALID_MECHANISMS: MechanismType[] = ['validate', 'update'];
const VALID_UPDATE_MODES: UpdateMode[] = ['realtime', 'debounced', 'on_confirm'];
const VALID_RELATIONSHIP_TYPES = ['javascript', 'transform', 'llm'];

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
 * DependencyGraphSpec全体を解析
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
  };
}

/**
 * UISpec から dpg を抽出して解析（便利関数）
 */
export function analyzeW2WRFromUISpec(uiSpec: { dpg?: DependencyGraphSpec } | undefined | null): W2WRAnalysis {
  return analyzeW2WRSpec(uiSpec?.dpg);
}
