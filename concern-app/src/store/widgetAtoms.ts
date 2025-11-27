/**
 * widgetAtoms.ts
 * Widget atomの動的生成と管理
 *
 * Phase 4 - DSL v3
 * JotaiのatomをWidget IDをキーとして動的に生成・管理する
 */

import { atom } from 'jotai';
import type { Atom } from 'jotai';

/**
 * Widget atomを管理するMap
 * キー: Widget ID
 * 値: Jotai atom
 */
const widgetAtomMap = new Map<string, Atom<any>>();

/**
 * Widget atomを作成または取得
 * @param widgetId Widget ID
 * @param initialValue 初期値
 * @returns Jotai atom
 */
export function createWidgetAtom<T>(
  widgetId: string,
  initialValue: T
): Atom<T> {
  // 既存のatomがあればそれを返す
  if (widgetAtomMap.has(widgetId)) {
    return widgetAtomMap.get(widgetId) as Atom<T>;
  }

  // 新しいatomを作成
  const newAtom = atom<T>(initialValue);
  widgetAtomMap.set(widgetId, newAtom);

  return newAtom;
}

/**
 * Widget atomを取得
 * @param widgetId Widget ID
 * @returns Jotai atom or undefined
 */
export function getWidgetAtom<T>(widgetId: string): Atom<T> | undefined {
  return widgetAtomMap.get(widgetId) as Atom<T> | undefined;
}

/**
 * Widget atomを削除（クリーンアップ）
 * @param widgetId Widget ID
 * @returns 削除成功したかどうか
 */
export function removeWidgetAtom(widgetId: string): boolean {
  return widgetAtomMap.delete(widgetId);
}

/**
 * 全てのWidget atomをクリア
 */
export function clearAllWidgetAtoms(): void {
  widgetAtomMap.clear();
}

/**
 * 登録されているWidget atomの数を取得（テスト用）
 */
export function getWidgetAtomCount(): number {
  return widgetAtomMap.size;
}

/**
 * Widget atom が存在するかチェック
 * @param widgetId Widget ID
 */
export function hasWidgetAtom(widgetId: string): boolean {
  return widgetAtomMap.has(widgetId);
}
