/**
 * DataBindingProcessor テスト
 *
 * DSL v4 データバインディングプロセッサーの単体テスト
 *
 * @since DSL v4.0
 */

import { describe, expect, test, beforeEach } from 'vitest';
import { DataBindingProcessor, createDataBindingProcessor } from '../DataBindingProcessor';
import type { ORS } from '../../../types/v4/ors.types';
import type { DataBindingSpec } from '../../../types/v4/ui-spec.types';

describe('DataBindingProcessor', () => {
  let processor: DataBindingProcessor;
  let testORS: ORS;

  beforeEach(() => {
    testORS = {
      version: '4.0',
      metadata: {
        sessionId: 'test-session',
        stage: 'diverge',
        generatedAt: Date.now(),
        llmModel: 'test',
      },
      entities: [
        {
          id: 'concern',
          type: 'concern',
          attributes: [
            {
              name: 'text',
              structuralType: 'SVAL',
              valueType: 'string',
              defaultValue: 'テスト悩み',
            },
            {
              name: 'level',
              structuralType: 'SVAL',
              valueType: 'number',
              defaultValue: 5,
            },
          ],
        },
        {
          id: 'emotion',
          type: 'widget_data',
          attributes: [
            {
              name: 'selected',
              structuralType: 'ARRY',
              itemType: 'SVAL',
              itemValueType: 'string',
              defaultValue: [],
            },
          ],
        },
        {
          id: 'reference',
          type: 'widget_data',
          attributes: [
            {
              name: 'pointer',
              structuralType: 'PNTR',
              ref: 'concern.text',
            },
          ],
        },
      ],
      dependencyGraph: { dependencies: [] },
    };
    processor = createDataBindingProcessor(testORS);
  });

  describe('getInitialValue', () => {
    test('入力バインディングで初期値を取得', () => {
      const binding: DataBindingSpec = {
        portId: 'input',
        entityAttribute: 'concern.text',
        direction: 'in',
      };

      const value = processor.getInitialValue(binding);
      expect(value).toBe('テスト悩み');
    });

    test('出力バインディングではundefined', () => {
      const binding: DataBindingSpec = {
        portId: 'output',
        entityAttribute: 'concern.text',
        direction: 'out',
      };

      const value = processor.getInitialValue(binding);
      expect(value).toBeUndefined();
    });

    test('双方向バインディングで初期値を取得', () => {
      const binding: DataBindingSpec = {
        portId: 'inout',
        entityAttribute: 'concern.level',
        direction: 'inout',
      };

      const value = processor.getInitialValue(binding);
      expect(value).toBe(5);
    });

    test('変換関数を適用', () => {
      const binding: DataBindingSpec = {
        portId: 'input',
        entityAttribute: 'concern.level',
        direction: 'in',
        transform: {
          toWidget: 'value * 10',
        },
      };

      const value = processor.getInitialValue(binding);
      expect(value).toBe(50);
    });
  });

  describe('getValue', () => {
    test('エンティティ属性の値を取得', () => {
      const value = processor.getValue('concern.text');
      expect(value).toBe('テスト悩み');
    });

    test('存在しないパスではundefined', () => {
      const value = processor.getValue('nonexistent.attr');
      expect(value).toBeUndefined();
    });

    test('不正なパスではundefined', () => {
      const value = processor.getValue('invalid');
      expect(value).toBeUndefined();
    });
  });

  describe('updateValue', () => {
    test('出力バインディングで値を更新', () => {
      const binding: DataBindingSpec = {
        portId: 'output',
        entityAttribute: 'concern.text',
        direction: 'out',
      };

      const result = processor.updateValue(binding, '新しい悩み');
      expect(result.success).toBe(true);
      expect(result.entityId).toBe('concern');
      expect(result.attributeName).toBe('text');

      // 更新後の値を確認
      expect(processor.getValue('concern.text')).toBe('新しい悩み');
    });

    test('入力バインディングでは更新不可', () => {
      const binding: DataBindingSpec = {
        portId: 'input',
        entityAttribute: 'concern.text',
        direction: 'in',
      };

      const result = processor.updateValue(binding, '新しい悩み');
      expect(result.success).toBe(false);
      expect(result.error).toContain('input-only');
    });

    test('双方向バインディングで更新可能', () => {
      const binding: DataBindingSpec = {
        portId: 'inout',
        entityAttribute: 'concern.level',
        direction: 'inout',
      };

      const result = processor.updateValue(binding, 8);
      expect(result.success).toBe(true);
      expect(processor.getValue('concern.level')).toBe(8);
    });

    test('変換関数を適用', () => {
      const binding: DataBindingSpec = {
        portId: 'output',
        entityAttribute: 'concern.level',
        direction: 'out',
        transform: {
          toORS: 'value / 10',
        },
      };

      const result = processor.updateValue(binding, 80);
      expect(result.success).toBe(true);
      expect(processor.getValue('concern.level')).toBe(8);
    });
  });

  describe('resolvePNTR', () => {
    test('PNTR参照を解決', () => {
      const value = processor.resolvePNTR('concern.text');
      expect(value).toBe('テスト悩み');
    });

    test('PNTR型属性から参照解決', () => {
      const value = processor.getValue('reference.pointer');
      expect(value).toBe('テスト悩み');
    });

    test('循環参照を検出', () => {
      // 循環参照を持つORSをセットアップ
      const circularORS: ORS = {
        version: '4.0',
        metadata: {
          sessionId: 'test',
          stage: 'diverge',
          generatedAt: Date.now(),
          llmModel: 'test',
        },
        entities: [
          {
            id: 'a',
            type: 'widget_data',
            attributes: [
              {
                name: 'ref',
                structuralType: 'PNTR',
                ref: 'b.ref',
              },
            ],
          },
          {
            id: 'b',
            type: 'widget_data',
            attributes: [
              {
                name: 'ref',
                structuralType: 'PNTR',
                ref: 'a.ref',
              },
            ],
          },
        ],
        dependencyGraph: { dependencies: [] },
      };

      const circularProcessor = createDataBindingProcessor(circularORS);
      const value = circularProcessor.resolvePNTR('a.ref');
      expect(value).toBeUndefined();
    });
  });

  describe('getEntity / getAttribute', () => {
    test('エンティティを取得', () => {
      const entity = processor.getEntity('concern');
      expect(entity).toBeDefined();
      expect(entity?.id).toBe('concern');
    });

    test('存在しないエンティティはundefined', () => {
      const entity = processor.getEntity('nonexistent');
      expect(entity).toBeUndefined();
    });

    test('属性を取得', () => {
      const attr = processor.getAttribute('concern', 'text');
      expect(attr).toBeDefined();
      expect(attr?.name).toBe('text');
    });

    test('存在しない属性はundefined', () => {
      const attr = processor.getAttribute('concern', 'nonexistent');
      expect(attr).toBeUndefined();
    });
  });

  describe('getStage', () => {
    test('現在のステージを取得', () => {
      const stage = processor.getStage();
      expect(stage).toBe('diverge');
    });
  });

  describe('updateORS', () => {
    test('ORSを更新できる', () => {
      const newORS: ORS = {
        version: '4.0',
        metadata: {
          sessionId: 'test-session',
          stage: 'organize',
          generatedAt: Date.now(),
          llmModel: 'test',
        },
        entities: [
          {
            id: 'concern',
            type: 'concern',
            attributes: [
              {
                name: 'text',
                structuralType: 'SVAL',
                valueType: 'string',
                defaultValue: '更新後の悩み',
              },
            ],
          },
        ],
        dependencyGraph: { dependencies: [] },
      };

      processor.updateORS(newORS);

      expect(processor.getStage()).toBe('organize');
      expect(processor.getValue('concern.text')).toBe('更新後の悩み');
    });
  });

  describe('getAllValues', () => {
    test('全ランタイム値を取得', () => {
      const values = processor.getAllValues();

      expect(values.get('concern.text')).toBe('テスト悩み');
      expect(values.get('concern.level')).toBe(5);
      expect(values.size).toBeGreaterThan(0);
    });
  });

  describe('dispose', () => {
    test('disposeでクリアされる', () => {
      processor.dispose();

      const values = processor.getAllValues();
      expect(values.size).toBe(0);
    });
  });
});
