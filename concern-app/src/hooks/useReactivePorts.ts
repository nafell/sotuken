/**
 * useReactivePorts.ts
 * Widget用のリアクティブポート操作フック
 *
 * Phase 4 - Task 2.2
 *
 * 機能:
 * - Portへの値出力（emitPort）
 * - 入力Portからの値読み取り（readPort）
 * - エラー状態設定（setError）
 * - 完了状態設定（setCompleted）
 */

import { useCallback, useMemo, useState, useEffect } from 'react';

// =============================================================================
// 型定義
// =============================================================================

/**
 * PortChangeコールバック
 */
export type PortChangeCallback = (
  widgetId: string,
  portId: string,
  value: unknown
) => void;

/**
 * Port値取得関数
 */
export type PortValueGetter = (portKey: string) => unknown;

/**
 * エラーPort値
 */
export interface ErrorPortValue {
  hasError: boolean;
  messages: string[];
}

/**
 * 完了Port値
 */
export interface CompletedPortValue {
  isCompleted: boolean;
  requiredFields?: string[];
}

/**
 * useReactivePortsのオプション
 */
export interface UseReactivePortsOptions {
  /** Widget ID */
  widgetId: string;

  /** Port変更時のコールバック */
  onPortChange?: PortChangeCallback;

  /** Port値取得関数 */
  getPortValue?: PortValueGetter;

  /** 初期Port値 */
  initialPortValues?: Record<string, unknown>;
}

/**
 * useReactivePortsの戻り値
 */
export interface UseReactivePortsReturn {
  /** Portに値を出力 */
  emitPort: (portId: string, value: unknown) => void;

  /** 入力Portから値を読み取り */
  readPort: (portKey: string) => unknown;

  /** エラー状態を設定 */
  setError: (hasError: boolean, messages?: string[]) => void;

  /** 完了状態を設定 */
  setCompleted: (isCompleted: boolean, requiredFields?: string[]) => void;

  /** 現在のエラー状態 */
  errorState: ErrorPortValue;

  /** 現在の完了状態 */
  completedState: CompletedPortValue;
}

// =============================================================================
// デフォルト値
// =============================================================================

const DEFAULT_ERROR_STATE: ErrorPortValue = {
  hasError: false,
  messages: [],
};

const DEFAULT_COMPLETED_STATE: CompletedPortValue = {
  isCompleted: false,
  requiredFields: [],
};

const RESERVED_PORTS = {
  ERROR: '_error',
  COMPLETED: '_completed',
} as const;

// =============================================================================
// useReactivePorts
// =============================================================================

/**
 * Widget用のリアクティブポート操作フック
 *
 * @example
 * ```tsx
 * const { emitPort, setCompleted, errorState } = useReactivePorts({
 *   widgetId: spec.id,
 *   onPortChange,
 * });
 *
 * // 値を出力
 * emitPort('balance', 0.5);
 *
 * // 完了状態を設定
 * setCompleted(true);
 * ```
 */
export function useReactivePorts(
  options: UseReactivePortsOptions
): UseReactivePortsReturn {
  const {
    widgetId,
    onPortChange,
    getPortValue,
    initialPortValues,
  } = options;

  // ローカル状態（エラー・完了）
  const [errorState, setErrorState] = useState<ErrorPortValue>(() => {
    const initial = initialPortValues?.[RESERVED_PORTS.ERROR];
    return isErrorPortValue(initial) ? initial : DEFAULT_ERROR_STATE;
  });

  const [completedState, setCompletedState] = useState<CompletedPortValue>(() => {
    const initial = initialPortValues?.[RESERVED_PORTS.COMPLETED];
    return isCompletedPortValue(initial) ? initial : DEFAULT_COMPLETED_STATE;
  });

  // 初期値の変更を反映
  useEffect(() => {
    if (initialPortValues) {
      const errorValue = initialPortValues[RESERVED_PORTS.ERROR];
      if (isErrorPortValue(errorValue)) {
        setErrorState(errorValue);
      }

      const completedValue = initialPortValues[RESERVED_PORTS.COMPLETED];
      if (isCompletedPortValue(completedValue)) {
        setCompletedState(completedValue);
      }
    }
  }, [initialPortValues]);

  /**
   * Portに値を出力
   */
  const emitPort = useCallback(
    (portId: string, value: unknown): void => {
      if (onPortChange) {
        onPortChange(widgetId, portId, value);
      }
    },
    [widgetId, onPortChange]
  );

  /**
   * 入力Portから値を読み取り
   */
  const readPort = useCallback(
    (portKey: string): unknown => {
      if (getPortValue) {
        return getPortValue(portKey);
      }
      return undefined;
    },
    [getPortValue]
  );

  /**
   * エラー状態を設定
   */
  const setError = useCallback(
    (hasError: boolean, messages: string[] = []): void => {
      const newErrorState: ErrorPortValue = { hasError, messages };
      setErrorState(newErrorState);

      if (onPortChange) {
        onPortChange(widgetId, RESERVED_PORTS.ERROR, newErrorState);
      }
    },
    [widgetId, onPortChange]
  );

  /**
   * 完了状態を設定
   */
  const setCompleted = useCallback(
    (isCompleted: boolean, requiredFields?: string[]): void => {
      const newCompletedState: CompletedPortValue = {
        isCompleted,
        requiredFields: requiredFields || [],
      };
      setCompletedState(newCompletedState);

      if (onPortChange) {
        onPortChange(widgetId, RESERVED_PORTS.COMPLETED, newCompletedState);
      }
    },
    [widgetId, onPortChange]
  );

  return useMemo(
    () => ({
      emitPort,
      readPort,
      setError,
      setCompleted,
      errorState,
      completedState,
    }),
    [emitPort, readPort, setError, setCompleted, errorState, completedState]
  );
}

// =============================================================================
// 型ガード
// =============================================================================

/**
 * ErrorPortValueの型ガード
 */
function isErrorPortValue(value: unknown): value is ErrorPortValue {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.hasError === 'boolean' && Array.isArray(v.messages);
}

/**
 * CompletedPortValueの型ガード
 */
function isCompletedPortValue(value: unknown): value is CompletedPortValue {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.isCompleted === 'boolean';
}
