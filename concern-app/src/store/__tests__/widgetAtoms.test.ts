/**
 * widgetAtoms.test.ts
 * Widget atomsのテスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  createWidgetAtom,
  getWidgetAtom,
  removeWidgetAtom,
  clearAllWidgetAtoms,
  getWidgetAtomCount,
  hasWidgetAtom,
} from '../widgetAtoms';

describe('widgetAtoms', () => {
  beforeEach(() => {
    clearAllWidgetAtoms();
  });

  describe('createWidgetAtom', () => {
    test('Widget atomを作成できる', () => {
      const atom = createWidgetAtom('test_widget_1', { value: 10 });

      expect(atom).toBeDefined();
      expect(getWidgetAtomCount()).toBe(1);
    });

    test('同じIDで2回呼ぶと同じatomを返す', () => {
      const atom1 = createWidgetAtom('test_widget_1', { value: 10 });
      const atom2 = createWidgetAtom('test_widget_1', { value: 20 });

      expect(atom1).toBe(atom2);
      expect(getWidgetAtomCount()).toBe(1);
    });

    test('異なるIDで呼ぶと異なるatomを作成', () => {
      const atom1 = createWidgetAtom('widget_1', { value: 10 });
      const atom2 = createWidgetAtom('widget_2', { value: 20 });

      expect(atom1).not.toBe(atom2);
      expect(getWidgetAtomCount()).toBe(2);
    });

    test('様々な型の初期値でatomを作成できる', () => {
      const numberAtom = createWidgetAtom('number_widget', 42);
      const stringAtom = createWidgetAtom('string_widget', 'hello');
      const objectAtom = createWidgetAtom('object_widget', { foo: 'bar' });
      const arrayAtom = createWidgetAtom('array_widget', [1, 2, 3]);

      expect(numberAtom).toBeDefined();
      expect(stringAtom).toBeDefined();
      expect(objectAtom).toBeDefined();
      expect(arrayAtom).toBeDefined();
      expect(getWidgetAtomCount()).toBe(4);
    });
  });

  describe('getWidgetAtom', () => {
    test('既存のatomを取得できる', () => {
      const atom = createWidgetAtom('test_widget', { value: 10 });
      const retrieved = getWidgetAtom('test_widget');

      expect(retrieved).toBe(atom);
    });

    test('存在しないatomはundefinedを返す', () => {
      const retrieved = getWidgetAtom('non_existent_widget');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('hasWidgetAtom', () => {
    test('存在するatomに対してtrueを返す', () => {
      createWidgetAtom('test_widget', { value: 10 });

      expect(hasWidgetAtom('test_widget')).toBe(true);
    });

    test('存在しないatomに対してfalseを返す', () => {
      expect(hasWidgetAtom('non_existent_widget')).toBe(false);
    });
  });

  describe('removeWidgetAtom', () => {
    test('atomを削除できる', () => {
      createWidgetAtom('test_widget', { value: 10 });
      expect(getWidgetAtomCount()).toBe(1);

      const removed = removeWidgetAtom('test_widget');

      expect(removed).toBe(true);
      expect(getWidgetAtomCount()).toBe(0);
      expect(hasWidgetAtom('test_widget')).toBe(false);
    });

    test('存在しないatomの削除はfalseを返す', () => {
      const removed = removeWidgetAtom('non_existent_widget');

      expect(removed).toBe(false);
    });

    test('複数のatomから特定のものだけを削除できる', () => {
      createWidgetAtom('widget_1', { value: 1 });
      createWidgetAtom('widget_2', { value: 2 });
      createWidgetAtom('widget_3', { value: 3 });

      removeWidgetAtom('widget_2');

      expect(getWidgetAtomCount()).toBe(2);
      expect(hasWidgetAtom('widget_1')).toBe(true);
      expect(hasWidgetAtom('widget_2')).toBe(false);
      expect(hasWidgetAtom('widget_3')).toBe(true);
    });
  });

  describe('clearAllWidgetAtoms', () => {
    test('全てのatomをクリアできる', () => {
      createWidgetAtom('widget_1', { value: 1 });
      createWidgetAtom('widget_2', { value: 2 });
      createWidgetAtom('widget_3', { value: 3 });

      expect(getWidgetAtomCount()).toBe(3);

      clearAllWidgetAtoms();

      expect(getWidgetAtomCount()).toBe(0);
      expect(hasWidgetAtom('widget_1')).toBe(false);
      expect(hasWidgetAtom('widget_2')).toBe(false);
      expect(hasWidgetAtom('widget_3')).toBe(false);
    });

    test('空の状態でクリアしてもエラーにならない', () => {
      expect(() => clearAllWidgetAtoms()).not.toThrow();
      expect(getWidgetAtomCount()).toBe(0);
    });
  });

  describe('getWidgetAtomCount', () => {
    test('atom数を正確にカウントできる', () => {
      expect(getWidgetAtomCount()).toBe(0);

      createWidgetAtom('widget_1', { value: 1 });
      expect(getWidgetAtomCount()).toBe(1);

      createWidgetAtom('widget_2', { value: 2 });
      expect(getWidgetAtomCount()).toBe(2);

      removeWidgetAtom('widget_1');
      expect(getWidgetAtomCount()).toBe(1);

      clearAllWidgetAtoms();
      expect(getWidgetAtomCount()).toBe(0);
    });
  });

  describe('メモリリーク対策', () => {
    test('大量のatomを作成しても削除できる', () => {
      // 100個のatomを作成
      for (let i = 0; i < 100; i++) {
        createWidgetAtom(`widget_${i}`, { value: i });
      }

      expect(getWidgetAtomCount()).toBe(100);

      // 全てクリア
      clearAllWidgetAtoms();

      expect(getWidgetAtomCount()).toBe(0);
    });
  });
});
