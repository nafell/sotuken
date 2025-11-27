/**
 * DependencyExecutor.test.ts
 * DependencyExecutorクラスのテスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DependencyExecutor } from '../DependencyExecutor';
import type { DependencySpec } from '../../../types/ui-spec.types';

describe('DependencyExecutor', () => {
  let executor: DependencyExecutor;

  beforeEach(() => {
    executor = new DependencyExecutor();
  });

  describe('execute - update mechanism', () => {
    test('JavaScript変換を実行できる', () => {
      const dependency: DependencySpec = {
        source: 'widget1.value',
        target: 'widget2.value',
        mechanism: 'update',
        relationship: {
          type: 'javascript',
          javascript: 'return source.value * 2;',
        },
        updateMode: 'realtime',
      };

      const result = executor.execute(dependency, 10);

      expect(result.type).toBe('update');
      expect(result.target).toBe('widget2.value');
      expect(result.value).toBe(20);
    });

    test('組み込み変換関数を実行できる', () => {
      const dependency: DependencySpec = {
        source: 'slider.values',
        target: 'ranking.items',
        mechanism: 'update',
        relationship: {
          type: 'transform',
          transform: 'calculate_ranking',
        },
        updateMode: 'debounced',
      };

      const sliderValues = {
        item1: { importance: 5, urgency: 3 },
        item2: { importance: 2, urgency: 4 },
        item3: { importance: 4, urgency: 5 },
      };

      const result = executor.execute(dependency, sliderValues);

      expect(result.type).toBe('update');
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value[0].score).toBeGreaterThanOrEqual(result.value[1].score);
    });
  });

  describe('execute - validate mechanism', () => {
    test('バリデーションが成功する', () => {
      const dependency: DependencySpec = {
        source: 'input.value',
        target: 'output.value',
        mechanism: 'validate',
        relationship: {
          type: 'javascript',
          javascript: 'return source.value > 0;',
        },
        updateMode: 'on_confirm',
      };

      const result = executor.execute(dependency, 5);

      expect(result.type).toBe('update');
    });

    test('バリデーションが失敗する', () => {
      const dependency: DependencySpec = {
        source: 'input.value',
        target: 'output.value',
        mechanism: 'validate',
        relationship: {
          type: 'javascript',
          javascript: 'return source.value > 10;',
        },
        updateMode: 'on_confirm',
      };

      const result = executor.execute(dependency, 5);

      expect(result.type).toBe('validation_error');
      expect(result.message).toContain('Validation failed');
    });
  });

  describe('executeTransform - JavaScript', () => {
    test('JavaScriptコードを安全に実行できる', () => {
      const result = executor.executeTransform(
        {
          type: 'javascript',
          javascript: 'return source.value * 3 + 1;',
        },
        10
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(31);
    });

    test('危険なコードを実行しない', () => {
      const result = executor.executeTransform(
        {
          type: 'javascript',
          javascript: 'eval("alert(1)")',
        },
        10
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsafe code detected');
    });

    test('不正なJavaScriptコードでエラーを返す', () => {
      const result = executor.executeTransform(
        {
          type: 'javascript',
          javascript: 'return invalid syntax here',
        },
        10
      );

      expect(result.success).toBe(false);
    });
  });

  describe('executeTransform - Built-in transforms', () => {
    test('calculate_ranking: ランキングを計算できる', () => {
      const sliderValues = {
        project_a: { importance: 5, urgency: 4 },
        project_b: { importance: 3, urgency: 2 },
        project_c: { importance: 4, urgency: 5 },
      };

      const result = executor.executeTransform(
        {
          type: 'transform',
          transform: 'calculate_ranking',
        },
        sliderValues
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toHaveLength(3);
      // スコアの降順にソートされている
      expect(result.value[0].score).toBeGreaterThanOrEqual(result.value[1].score);
      expect(result.value[1].score).toBeGreaterThanOrEqual(result.value[2].score);
    });

    test('calculate_balance: 天秤のバランスを計算できる', () => {
      const weights = {
        risk1: 3,
        risk2: 5,
        benefit1: 4,
        benefit2: 6,
      };

      const result = executor.executeTransform(
        {
          type: 'transform',
          transform: 'calculate_balance',
        },
        weights
      );

      expect(result.success).toBe(true);
      expect(typeof result.value).toBe('number');
      expect(result.value).toBeGreaterThanOrEqual(-1);
      expect(result.value).toBeLessThanOrEqual(1);
    });

    test('filter_high_priority: 高優先度アイテムをフィルタリングできる', () => {
      const items = [
        { id: '1', label: 'Task A', position: { x: 0.8, y: 0.8 } }, // 高優先度
        { id: '2', label: 'Task B', position: { x: 0.3, y: 0.7 } },
        { id: '3', label: 'Task C', position: { x: 0.6, y: 0.6 } }, // 高優先度
        { id: '4', label: 'Task D', position: { x: 0.2, y: 0.2 } },
      ];

      const result = executor.executeTransform(
        {
          type: 'transform',
          transform: 'filter_high_priority',
        },
        items
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value.every((item: any) => item.position.x > 0.5 && item.position.y > 0.5)).toBe(true);
    });

    test('generate_summary: サマリーを生成できる', () => {
      const data = {
        emotion: '不安',
        intensity: 0.7,
        concern: '転職先が決まらない',
      };

      const result = executor.executeTransform(
        {
          type: 'transform',
          transform: 'generate_summary',
        },
        data
      );

      expect(result.success).toBe(true);
      expect(typeof result.value).toBe('string');
      expect(result.value).toContain('プロパティ');
    });

    test('detect_gaps: ギャップを検出できる', () => {
      const swotData = {
        strengths: ['強み1', '強み2'],
        weaknesses: [],
        opportunities: ['機会1'],
        threats: [],
      };

      const result = executor.executeTransform(
        {
          type: 'transform',
          transform: 'detect_gaps',
        },
        swotData
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toContain('weaknesses');
      expect(result.value).toContain('threats');
    });

    test('未知の変換関数は元の値を返す', () => {
      const result = executor.executeTransform(
        {
          type: 'transform',
          transform: 'unknown_transform' as any,
        },
        'test value'
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('test value');
    });
  });

  describe('Security checks', () => {
    const dangerousPatterns = [
      'eval("code")',
      'new Function("code")',
      'setTimeout(fn, 100)',
      'setInterval(fn, 100)',
      'import("module")',
      'require("module")',
      'process.exit()',
      'global.something',
      'window.location',
      'document.cookie',
    ];

    dangerousPatterns.forEach((pattern) => {
      test(`危険なパターンを検出: ${pattern}`, () => {
        const result = executor.executeTransform(
          {
            type: 'javascript',
            javascript: pattern,
          },
          10
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unsafe code detected');
      });
    });
  });
});
