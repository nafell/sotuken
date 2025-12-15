/**
 * useFlowValidation.ts
 * フローバリデーション状態を購読するフック
 *
 * Phase 4 - Task 2.2
 *
 * 機能:
 * - ReactiveBindingEngineのバリデーション状態を購読
 * - canProceed（「次へ」ボタン制御）を提供
 * - Widget別のエラー・完了状態を提供
 */

import { useEffect, useState } from 'react';
import type {
  ReactiveBindingEngine,
  FlowValidationState,
} from '../services/ui/ReactiveBindingEngine';

// =============================================================================
// 型定義
// =============================================================================

/**
 * デフォルトのバリデーション状態
 */
const DEFAULT_VALIDATION_STATE: FlowValidationState = {
  canProceed: false,
  widgetErrors: new Map(),
  incompleteWidgets: [],
};

// =============================================================================
// useFlowValidation
// =============================================================================

/**
 * フローバリデーション状態を購読するフック
 *
 * ReactiveBindingEngineの状態変更を監視し、
 * 「次へ」ボタンの有効/無効を制御するために使用。
 *
 * @param engine ReactiveBindingEngineインスタンス（nullの場合はデフォルト状態を返す）
 * @returns FlowValidationState
 *
 * @example
 * ```tsx
 * const { canProceed, incompleteWidgets } = useFlowValidation(engine);
 *
 * return (
 *   <button disabled={!canProceed}>次へ</button>
 * );
 * ```
 */
export function useFlowValidation(
  engine: ReactiveBindingEngine | null
): FlowValidationState {
  const [validationState, setValidationState] = useState<FlowValidationState>(
    () => {
      if (engine) {
        return engine.getFlowValidationState();
      }
      return DEFAULT_VALIDATION_STATE;
    }
  );

  useEffect(() => {
    if (!engine) {
      setValidationState(DEFAULT_VALIDATION_STATE);
      return;
    }

    // 初期状態を取得
    setValidationState(engine.getFlowValidationState());

    // 状態変更を購読
    const handleValidationStateChange = (state: FlowValidationState): void => {
      setValidationState(state);
    };

    engine.setOnValidationStateChange(handleValidationStateChange);

    // クリーンアップ
    return () => {
      // コールバックをnullにリセット（engine.disposeで行われるが念のため）
      if (!engine.isDisposed()) {
        engine.setOnValidationStateChange(() => { });
      }
    };
  }, [engine]);

  return validationState;
}

// =============================================================================
// useCanProceed
// =============================================================================

/**
 * canProceedのみを返すシンプルなフック
 *
 * @param engine ReactiveBindingEngineインスタンス
 * @returns canProceed（boolean）
 *
 * @example
 * ```tsx
 * const canProceed = useCanProceed(engine);
 * ```
 */
export function useCanProceed(engine: ReactiveBindingEngine | null): boolean {
  const { canProceed } = useFlowValidation(engine);
  return canProceed;
}

// =============================================================================
// useWidgetErrors
// =============================================================================

/**
 * 特定WidgetのエラーメッセージのみをExportするフック
 *
 * @param engine ReactiveBindingEngineインスタンス
 * @param widgetId エラーを取得したいWidgetのID
 * @returns エラーメッセージ配列（エラーなしの場合は空配列）
 */
export function useWidgetErrors(
  engine: ReactiveBindingEngine | null,
  widgetId: string
): string[] {
  const { widgetErrors } = useFlowValidation(engine);
  const errorValue = widgetErrors.get(widgetId);
  return errorValue?.messages || [];
}

// =============================================================================
// useIncompleteWidgets
// =============================================================================

/**
 * 未完了のWidgetリストを返すフック
 *
 * @param engine ReactiveBindingEngineインスタンス
 * @returns 未完了のWidgetID配列
 */
export function useIncompleteWidgets(
  engine: ReactiveBindingEngine | null
): string[] {
  const { incompleteWidgets } = useFlowValidation(engine);
  return incompleteWidgets;
}
