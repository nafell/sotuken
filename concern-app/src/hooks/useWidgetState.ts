/**
 * useWidgetState.ts
 * Widget State管理用フック
 *
 * Phase 4 - DSL v3
 * Widget毎の状態をJotai atomで管理する
 */

import { useAtom } from 'jotai';
import { createWidgetAtom } from '../store/widgetAtoms';

/**
 * Widget Stateを管理するフック
 * @param widgetId Widget ID
 * @param initialValue 初期値
 * @returns [state, setState]
 */
export function useWidgetState<T>(
  widgetId: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const atom = createWidgetAtom<T>(widgetId, initialValue);
  return useAtom(atom);
}
