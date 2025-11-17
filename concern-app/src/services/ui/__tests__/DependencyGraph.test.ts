/**
 * DependencyGraph.test.ts
 * DependencyGraphクラスのテスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../DependencyGraph';
import type { DependencySpec, DependencyGraphSpec } from '../../../types/ui-spec.types';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe('addDependency', () => {
    test('依存関係を追加できる', () => {
      const dependency: DependencySpec = {
        source: 'widget1.output',
        target: 'widget2.input',
        mechanism: 'update',
        relationship: {
          type: 'javascript',
          javascript: 'return source.value * 2;',
        },
        updateMode: 'realtime',
      };

      graph.addDependency(dependency);

      expect(graph.getEdgeCount()).toBe(1);
      expect(graph.getNodeCount()).toBe(2);
    });

    test('複数の依存関係を追加できる', () => {
      graph.addDependency({
        source: 'widget1.output',
        target: 'widget2.input',
        mechanism: 'update',
        relationship: { type: 'transform', transform: 'calculate_ranking' },
        updateMode: 'realtime',
      });

      graph.addDependency({
        source: 'widget2.output',
        target: 'widget3.input',
        mechanism: 'update',
        relationship: { type: 'transform', transform: 'calculate_balance' },
        updateMode: 'debounced',
      });

      expect(graph.getEdgeCount()).toBe(2);
      expect(graph.getNodeCount()).toBe(3);
    });

    test('循環依存を検出してエラーをthrow', () => {
      graph.addDependency({
        source: 'A.out',
        target: 'B.in',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      graph.addDependency({
        source: 'B.out',
        target: 'C.in',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      expect(() => {
        graph.addDependency({
          source: 'C.out',
          target: 'A.in',
          mechanism: 'update',
          relationship: { type: 'javascript', javascript: 'return source;' },
          updateMode: 'realtime',
        });
      }).toThrow(/Circular dependency detected/);
    });
  });

  describe('detectCycle', () => {
    test('循環がない場合はfalseを返す', () => {
      graph.addDependency({
        source: 'A.out',
        target: 'B.in',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      expect(graph.detectCycle()).toBe(false);
    });
  });

  describe('getUpdateOrder', () => {
    test('トポロジカルソートで更新順序を計算する', () => {
      graph.addDependency({
        source: 'A.out',
        target: 'B.in',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      graph.addDependency({
        source: 'B.out',
        target: 'C.in',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      const order = graph.getUpdateOrder();

      // Aが最初、Cが最後であることを確認
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
      expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'));
    });

    test('独立したノードの順序は任意', () => {
      graph.addDependency({
        source: 'A.out',
        target: 'B.in',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      graph.addDependency({
        source: 'C.out',
        target: 'D.in',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      const order = graph.getUpdateOrder();

      expect(order).toHaveLength(4);
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
      expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'));
    });
  });

  describe('getDependencies', () => {
    test('指定したソースの依存関係を取得できる', () => {
      graph.addDependency({
        source: 'widget1.output',
        target: 'widget2.input',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      graph.addDependency({
        source: 'widget1.other',
        target: 'widget3.input',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      const deps = graph.getDependencies('widget1.output');

      expect(deps).toHaveLength(1);
      expect(deps[0].source).toBe('widget1.output');
    });
  });

  describe('getDependents', () => {
    test('指定したターゲットに依存している依存関係を取得できる', () => {
      graph.addDependency({
        source: 'widget1.output',
        target: 'widget3.input',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      graph.addDependency({
        source: 'widget2.output',
        target: 'widget3.input',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      const dependents = graph.getDependents('widget3.input');

      expect(dependents).toHaveLength(2);
    });
  });

  describe('buildFromSpec', () => {
    test('仕様から依存グラフを構築できる', () => {
      const spec: DependencyGraphSpec = {
        dependencies: [
          {
            source: 'widget1.value',
            target: 'widget2.value',
            mechanism: 'update',
            relationship: { type: 'transform', transform: 'calculate_ranking' },
            updateMode: 'debounced',
          },
          {
            source: 'widget2.value',
            target: 'widget3.value',
            mechanism: 'validate',
            relationship: { type: 'javascript', javascript: 'return source.value > 0;' },
            updateMode: 'on_confirm',
          },
        ],
      };

      const newGraph = new DependencyGraph(spec);

      expect(newGraph.getEdgeCount()).toBe(2);
      expect(newGraph.getNodeCount()).toBe(3);
    });
  });

  describe('パフォーマンステスト', () => {
    test('100個の依存関係を高速処理できる', () => {
      const startTime = performance.now();

      // 100個の依存関係を追加（線形チェーン）
      for (let i = 0; i < 99; i++) {
        graph.addDependency({
          source: `widget${i}.out`,
          target: `widget${i + 1}.in`,
          mechanism: 'update',
          relationship: { type: 'javascript', javascript: 'return source;' },
          updateMode: 'realtime',
        });
      }

      const order = graph.getUpdateOrder();
      const endTime = performance.now();

      expect(order).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
    });
  });

  describe('removeDependency', () => {
    test('依存関係を削除できる', () => {
      graph.addDependency({
        source: 'A.out',
        target: 'B.in',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      expect(graph.getEdgeCount()).toBe(1);

      const removed = graph.removeDependency('A.out', 'B.in');

      expect(removed).toBe(true);
      expect(graph.getEdgeCount()).toBe(0);
    });

    test('存在しない依存関係を削除するとfalseを返す', () => {
      const removed = graph.removeDependency('nonexistent.out', 'another.in');

      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    test('全ての依存関係をクリアできる', () => {
      graph.addDependency({
        source: 'A.out',
        target: 'B.in',
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime',
      });

      graph.clear();

      expect(graph.getEdgeCount()).toBe(0);
      expect(graph.getNodeCount()).toBe(0);
    });
  });
});
