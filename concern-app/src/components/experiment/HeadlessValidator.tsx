/**
 * HeadlessValidator.tsx
 *
 * Layer1/Layer4自動評価実験用のヘッドレス検証コンポーネント。
 * UIレンダリングを行わず、DSL検証とReactiveBinding検証のみを実行。
 *
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { useEffect, useCallback, useRef } from 'react';
import type { UISpec, WidgetSpec } from '../../types/v4/ui-spec.types';
import type { ORS } from '../../types/v4/ors.types';
import type { ReactiveBindingSpec, ReactiveBinding } from '../../types/v4/reactive-binding.types';
import { ReactiveBindingEngineV4, DEFAULT_ENGINE_CONFIG_V4 } from '../../services/ui/ReactiveBindingEngineV4';

// ========================================
// Types
// ========================================

/**
 * ヘッドレス検証結果
 */
export interface HeadlessValidationResult {
  /** 検証成功 */
  success: boolean;
  /** レンダーエラー（Layer1用） */
  renderErrors: string[] | null;
  /** Reactコンポーネント変換エラー */
  reactComponentErrors: string[] | null;
  /** Jotai atom変換エラー */
  jotaiAtomErrors: string[] | null;
  /** 型エラー数 */
  typeErrorCount: number;
  /** 参照エラー数 */
  referenceErrorCount: number;
  /** 循環依存検出 */
  cycleDetected: boolean;
  /** Atom作成数 */
  atomCount: number;
  /** バインディング数 */
  bindingCount: number;
  /** 検証所要時間 (ms) */
  validationDurationMs: number;
}

/**
 * コンポーネントProps
 */
interface HeadlessValidatorProps {
  /** UISpec */
  uiSpec: UISpec | null;
  /** ORS */
  ors: ORS | null;
  /** 試行ID（APIフィードバック用） */
  trialId?: string;
  /** ステージ番号 */
  stage?: number;
  /** 検証完了コールバック */
  onValidationComplete: (result: HeadlessValidationResult) => void;
  /** 自動実行 */
  autoValidate?: boolean;
}

// ========================================
// Validation Logic
// ========================================

/**
 * 循環依存を検出（DFS）
 */
function detectCyclicDependencies(bindings: ReactiveBinding[]): boolean {
  const graph = new Map<string, string[]>();

  // グラフを構築
  for (const binding of bindings) {
    const sourceWidget = binding.source.split('.')[0];
    const targetWidget = binding.target.split('.')[0];

    if (!graph.has(sourceWidget)) {
      graph.set(sourceWidget, []);
    }
    graph.get(sourceWidget)!.push(targetWidget);
  }

  // DFSで循環を検出
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(node: string): boolean {
    if (recursionStack.has(node)) {
      return true; // 循環検出
    }
    if (visited.has(node)) {
      return false;
    }

    visited.add(node);
    recursionStack.add(node);

    for (const neighbor of graph.get(node) ?? []) {
      if (hasCycle(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (hasCycle(node)) {
      return true;
    }
  }

  return false;
}

/**
 * ウィジェット参照を検証
 */
function validateWidgetReferences(
  uiSpec: UISpec,
  bindings: ReactiveBinding[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const widgetIds = new Set(uiSpec.widgets.map(w => w.id));

  for (const binding of bindings) {
    const sourceWidget = binding.source.split('.')[0];
    const targetWidget = binding.target.split('.')[0];

    if (!widgetIds.has(sourceWidget)) {
      errors.push(`UNKNOWN_WIDGET: ${sourceWidget}`);
    }
    if (!widgetIds.has(targetWidget)) {
      errors.push(`UNKNOWN_WIDGET: ${targetWidget}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * バインディングメカニズムを検証
 */
function validateBindingMechanisms(
  bindings: ReactiveBinding[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const binding of bindings) {
    const { mechanism } = binding.relationship;

    if (mechanism === 'javascript' && !binding.relationship.javascript) {
      errors.push(`MISSING_JAVASCRIPT: ${binding.id}`);
    }

    if (mechanism === 'transform' && !binding.relationship.transform) {
      errors.push(`MISSING_TRANSFORM: ${binding.id}`);
    }

    if (mechanism === 'llm_rewrite' && !binding.relationship.llmRewrite) {
      errors.push(`MISSING_LLM_REWRITE: ${binding.id}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * UISpec全体を検証
 */
function validateUISpec(uiSpec: UISpec): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Widgets検証
  if (!uiSpec.widgets || uiSpec.widgets.length === 0) {
    errors.push('NO_WIDGETS');
  }

  // ID重複チェック
  const widgetIds = uiSpec.widgets.map(w => w.id);
  const uniqueIds = new Set(widgetIds);
  if (uniqueIds.size !== widgetIds.length) {
    errors.push('DUPLICATE_WIDGET_ID');
  }

  // 各ウィジェットの基本検証
  for (const widget of uiSpec.widgets) {
    if (!widget.id) {
      errors.push('MISSING_WIDGET_ID');
    }
    if (!widget.component) {
      errors.push(`MISSING_COMPONENT: ${widget.id}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ========================================
// Component
// ========================================

/**
 * HeadlessValidator
 *
 * UIをレンダリングせずにDSL検証を実行。
 * Layer1/Layer4実験のrender_errors収集に使用。
 */
export function HeadlessValidator({
  uiSpec,
  ors,
  trialId,
  stage,
  onValidationComplete,
  autoValidate = true,
}: HeadlessValidatorProps) {
  const hasValidated = useRef(false);

  const runValidation = useCallback(() => {
    const startTime = performance.now();
    const errors: string[] = [];
    const reactComponentErrors: string[] = [];
    const jotaiAtomErrors: string[] = [];
    let cycleDetected = false;
    let atomCount = 0;
    let bindingCount = 0;
    let typeErrorCount = 0;
    let referenceErrorCount = 0;

    try {
      if (!uiSpec) {
        errors.push('MISSING_UISPEC');
        reactComponentErrors.push('MISSING_UISPEC');
      } else {
        // UISpec検証
        const uiSpecResult = validateUISpec(uiSpec);
        errors.push(...uiSpecResult.errors);

        // Reactコンポーネントエラー収集
        // NO_WIDGETS, DUPLICATE_WIDGET_ID, MISSING_COMPONENTはReact変換に影響
        for (const err of uiSpecResult.errors) {
          if (err === 'NO_WIDGETS' || err === 'DUPLICATE_WIDGET_ID' || err.startsWith('MISSING_')) {
            reactComponentErrors.push(err);
          }
        }

        const expectedAtomCount = uiSpec.widgets.length;
        atomCount = expectedAtomCount;

        // ReactiveBindings検証
        if (uiSpec.reactiveBindings && uiSpec.reactiveBindings.bindings && uiSpec.reactiveBindings.bindings.length > 0) {
          const bindings = uiSpec.reactiveBindings.bindings;
          bindingCount = bindings.length;

          // 循環依存チェック
          cycleDetected = detectCyclicDependencies(bindings);
          if (cycleDetected) {
            errors.push('CYCLIC_DEPENDENCY');
          }

          // ウィジェット参照チェック
          const refResult = validateWidgetReferences(uiSpec, bindings);
          referenceErrorCount = refResult.errors.length;
          errors.push(...refResult.errors);

          // メカニズム検証
          const mechResult = validateBindingMechanisms(bindings);
          typeErrorCount = mechResult.errors.length;
          errors.push(...mechResult.errors);

          // ReactiveBindingEngine初期化テスト（エラーキャッチ用）
          try {
            const engine = new ReactiveBindingEngineV4({
              ...DEFAULT_ENGINE_CONFIG_V4,
              debug: false,
            });
            engine.initialize({ bindings });
          } catch (engineError) {
            const errMsg = `ENGINE_INIT_ERROR: ${engineError instanceof Error ? engineError.message : 'Unknown'}`;
            errors.push(errMsg);
            // Jotai atom変換エラーとして記録（エンジン初期化失敗はatom作成に影響）
            jotaiAtomErrors.push('ATOM_CREATION_FAILED:engine_init');
          }
        }

        // Jotai Atom作成検証
        // ヘッドレスモードでは実際のatom作成はしないが、構造エラーがあればatom作成も失敗すると推定
        if (uiSpecResult.errors.some(e => e === 'NO_WIDGETS' || e === 'MISSING_WIDGET_ID')) {
          if (!jotaiAtomErrors.some(e => e.startsWith('ATOM_CREATION_FAILED'))) {
            jotaiAtomErrors.push('ATOM_CREATION_FAILED:structure_error');
          }
        }
      }
    } catch (error) {
      const errMsg = `VALIDATION_ERROR: ${error instanceof Error ? error.message : 'Unknown'}`;
      errors.push(errMsg);
      reactComponentErrors.push('RENDER_EXCEPTION');
    }

    const endTime = performance.now();
    const validationDurationMs = Math.round(endTime - startTime);

    const result: HeadlessValidationResult = {
      success: errors.length === 0,
      renderErrors: errors.length > 0 ? [...new Set(errors)] : null,
      reactComponentErrors: reactComponentErrors.length > 0 ? [...new Set(reactComponentErrors)] : null,
      jotaiAtomErrors: jotaiAtomErrors.length > 0 ? [...new Set(jotaiAtomErrors)] : null,
      typeErrorCount,
      referenceErrorCount,
      cycleDetected,
      atomCount,
      bindingCount,
      validationDurationMs,
    };

    onValidationComplete(result);
  }, [uiSpec, onValidationComplete]);

  // 自動検証
  useEffect(() => {
    if (autoValidate && uiSpec && !hasValidated.current) {
      hasValidated.current = true;
      // 非同期で実行（メインスレッドをブロックしない）
      setTimeout(runValidation, 0);
    }
  }, [autoValidate, uiSpec, runValidation]);

  // このコンポーネントはUIをレンダリングしない
  return null;
}

// ========================================
// Utility Functions
// ========================================

/**
 * UISpecを検証してHeadlessValidationResultを返す（フック不要版）
 */
export function validateUISpecHeadless(
  uiSpec: UISpec | null
): HeadlessValidationResult {
  const startTime = performance.now();
  const errors: string[] = [];
  const reactComponentErrors: string[] = [];
  const jotaiAtomErrors: string[] = [];
  let cycleDetected = false;
  let atomCount = 0;
  let bindingCount = 0;
  let typeErrorCount = 0;
  let referenceErrorCount = 0;

  try {
    if (!uiSpec) {
      errors.push('MISSING_UISPEC');
      reactComponentErrors.push('MISSING_UISPEC');
    } else {
      // UISpec検証
      const uiSpecResult = validateUISpec(uiSpec);
      errors.push(...uiSpecResult.errors);

      // Reactコンポーネントエラー収集
      for (const err of uiSpecResult.errors) {
        if (err === 'NO_WIDGETS' || err === 'DUPLICATE_WIDGET_ID' || err.startsWith('MISSING_')) {
          reactComponentErrors.push(err);
        }
      }

      atomCount = uiSpec.widgets.length;

      // ReactiveBindings検証
      if (uiSpec.reactiveBindings && uiSpec.reactiveBindings.bindings && uiSpec.reactiveBindings.bindings.length > 0) {
        const bindings = uiSpec.reactiveBindings.bindings;
        bindingCount = bindings.length;

        // 循環依存チェック
        cycleDetected = detectCyclicDependencies(bindings);
        if (cycleDetected) {
          errors.push('CYCLIC_DEPENDENCY');
        }

        // ウィジェット参照チェック
        const refResult = validateWidgetReferences(uiSpec, bindings);
        referenceErrorCount = refResult.errors.length;
        errors.push(...refResult.errors);

        // メカニズム検証
        const mechResult = validateBindingMechanisms(bindings);
        typeErrorCount = mechResult.errors.length;
        errors.push(...mechResult.errors);
      }

      // Jotai Atom作成検証
      if (uiSpecResult.errors.some(e => e === 'NO_WIDGETS' || e === 'MISSING_WIDGET_ID')) {
        jotaiAtomErrors.push('ATOM_CREATION_FAILED:structure_error');
      }
    }
  } catch (error) {
    const errMsg = `VALIDATION_ERROR: ${error instanceof Error ? error.message : 'Unknown'}`;
    errors.push(errMsg);
    reactComponentErrors.push('RENDER_EXCEPTION');
  }

  const endTime = performance.now();

  return {
    success: errors.length === 0,
    renderErrors: errors.length > 0 ? [...new Set(errors)] : null,
    reactComponentErrors: reactComponentErrors.length > 0 ? [...new Set(reactComponentErrors)] : null,
    jotaiAtomErrors: jotaiAtomErrors.length > 0 ? [...new Set(jotaiAtomErrors)] : null,
    typeErrorCount,
    referenceErrorCount,
    cycleDetected,
    atomCount,
    bindingCount,
    validationDurationMs: Math.round(endTime - startTime),
  };
}

export default HeadlessValidator;
