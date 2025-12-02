/**
 * ValidationService テスト
 *
 * DSL v4 バリデーションサービスの単体テスト
 *
 * @since DSL v4.0
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { ValidationService, createValidationService } from '../ValidationService';
import type { WidgetSelectionResult } from '../../../types/v4/widget-selection.types';
import type { ORS, Entity, Attribute } from '../../../types/v4/ors.types';
import type { UISpec } from '../../../types/v4/ui-spec.types';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = createValidationService({ strict: false });
  });

  describe('validateWidgetSelection', () => {
    test('有効なWidgetSelectionResultを検証', () => {
      const result: WidgetSelectionResult = {
        version: '4.0',
        stages: {
          diverge: {
            widgets: [
              { widgetId: 'emotion_palette', purpose: 'テスト', order: 0 },
            ],
            purpose: 'テスト目的',
            target: 'テスト対象',
          },
          organize: {
            widgets: [
              { widgetId: 'card_sorting', purpose: 'テスト', order: 0 },
            ],
            purpose: 'テスト',
            target: 'テスト',
          },
          converge: {
            widgets: [
              { widgetId: 'priority_slider_grid', purpose: 'テスト', order: 0 },
            ],
            purpose: 'テスト',
            target: 'テスト',
          },
          summary: {
            widgets: [
              { widgetId: 'summary_view', purpose: 'テスト', order: 0 },
            ],
            purpose: 'テスト',
            target: 'テスト',
          },
        },
        rationale: 'テスト理由',
        metadata: {
          generatedAt: Date.now(),
          llmModel: 'test',
          bottleneckType: 'thought',
        },
      };

      const validationResult = service.validateWidgetSelection(result);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    test('不正なバージョンでエラー', () => {
      const result = {
        version: '3.0',
        stages: {
          diverge: { widgets: [], purpose: '', target: '' },
          organize: { widgets: [], purpose: '', target: '' },
          converge: { widgets: [], purpose: '', target: '' },
          summary: { widgets: [], purpose: '', target: '' },
        },
        rationale: '',
        metadata: { generatedAt: Date.now(), llmModel: '', bottleneckType: '' },
      } as unknown as WidgetSelectionResult;

      const validationResult = service.validateWidgetSelection(result);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.message.includes('version'))).toBe(true);
    });

    test('存在しないWidgetでエラー', () => {
      const result: WidgetSelectionResult = {
        version: '4.0',
        stages: {
          diverge: {
            widgets: [
              { widgetId: 'invalid_widget' as any, purpose: 'テスト', order: 0 },
            ],
            purpose: 'テスト',
            target: 'テスト',
          },
          organize: { widgets: [{ widgetId: 'card_sorting', purpose: 'テスト', order: 0 }], purpose: 'テスト', target: 'テスト' },
          converge: { widgets: [{ widgetId: 'priority_slider_grid', purpose: 'テスト', order: 0 }], purpose: 'テスト', target: 'テスト' },
          summary: { widgets: [{ widgetId: 'summary_view', purpose: 'テスト', order: 0 }], purpose: 'テスト', target: 'テスト' },
        },
        rationale: 'テスト',
        metadata: { generatedAt: Date.now(), llmModel: 'test', bottleneckType: 'thought' },
      };

      const validationResult = service.validateWidgetSelection(result);
      // 存在しないWidgetはerrorsに入る
      expect(validationResult.errors.some((e) => e.message.includes('invalid_widget'))).toBe(true);
    });
  });

  describe('validateORS', () => {
    test('有効なORSを検証', () => {
      const ors: ORS = {
        version: '4.0',
        metadata: {
          sessionId: 'test-session',
          stage: 'diverge',
          createdAt: Date.now(),
        },
        entities: [
          {
            id: 'concern',
            type: 'primary',
            attributes: [
              {
                name: 'text',
                structuralType: 'SVAL',
                valueType: 'string',
                defaultValue: 'テスト悩み',
              },
            ],
          },
        ],
        dependencyGraph: {
          dependencies: [],
        },
      };

      const validationResult = service.validateORS(ors);
      expect(validationResult.valid).toBe(true);
    });

    test('concernエンティティがないとエラー', () => {
      const ors: ORS = {
        version: '4.0',
        metadata: {
          sessionId: 'test-session',
          stage: 'diverge',
          createdAt: Date.now(),
        },
        entities: [],
        dependencyGraph: { dependencies: [] },
      };

      const validationResult = service.validateORS(ors);
      expect(validationResult.warnings.some((w) => w.message.includes('concern'))).toBe(true);
    });

    test('重複Entity IDでエラー', () => {
      const ors: ORS = {
        version: '4.0',
        metadata: {
          sessionId: 'test-session',
          stage: 'diverge',
          createdAt: Date.now(),
        },
        entities: [
          { id: 'concern', type: 'primary', attributes: [] },
          { id: 'concern', type: 'primary', attributes: [] },
        ],
        dependencyGraph: { dependencies: [] },
      };

      const validationResult = service.validateORS(ors);
      expect(validationResult.errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
    });
  });

  describe('validateUISpec', () => {
    test('有効なUISpecを検証', () => {
      const uiSpec: UISpec = {
        version: '4.0',
        sessionId: 'test-session',
        stage: 'diverge',
        widgets: [
          {
            id: 'widget-1',
            component: 'emotion_palette',
            position: 0,
            props: {},
            dataBindings: [],
            metadata: { complexity: 0.3 },
          },
        ],
        reactiveBindings: { bindings: [] },
        layout: { type: 'vertical', gap: 16 },
        metadata: {
          createdAt: Date.now(),
          llmModel: 'test',
        },
      };

      const validationResult = service.validateUISpec(uiSpec);
      expect(validationResult.valid).toBe(true);
    });

    test('重複Widget IDでエラー', () => {
      const uiSpec: UISpec = {
        version: '4.0',
        sessionId: 'test-session',
        stage: 'diverge',
        widgets: [
          {
            id: 'widget-1',
            component: 'emotion_palette',
            position: 0,
            props: {},
            dataBindings: [],
            metadata: { complexity: 0.3 },
          },
          {
            id: 'widget-1',
            component: 'brainstorm_cards',
            position: 1,
            props: {},
            dataBindings: [],
            metadata: { complexity: 0.3 },
          },
        ],
        reactiveBindings: { bindings: [] },
        layout: { type: 'vertical', gap: 16 },
        metadata: { createdAt: Date.now(), llmModel: 'test' },
      };

      const validationResult = service.validateUISpec(uiSpec);
      expect(validationResult.errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
    });

    test('循環参照のReactiveBindingでエラー', () => {
      const uiSpec: UISpec = {
        version: '4.0',
        sessionId: 'test-session',
        stage: 'diverge',
        widgets: [
          {
            id: 'widget-a',
            component: 'emotion_palette',
            position: 0,
            props: {},
            dataBindings: [],
            metadata: { complexity: 0.3 },
          },
          {
            id: 'widget-b',
            component: 'brainstorm_cards',
            position: 1,
            props: {},
            dataBindings: [],
            metadata: { complexity: 0.3 },
          },
        ],
        reactiveBindings: {
          bindings: [
            {
              id: 'binding-1',
              source: 'widget-a.output',
              target: 'widget-b.input',
              mechanism: 'update',
              relationship: { type: 'passthrough' },
              updateMode: 'realtime',
            },
            {
              id: 'binding-2',
              source: 'widget-b.output',
              target: 'widget-a.input',
              mechanism: 'update',
              relationship: { type: 'passthrough' },
              updateMode: 'realtime',
            },
          ],
        },
        layout: { type: 'vertical', gap: 16 },
        metadata: { createdAt: Date.now(), llmModel: 'test' },
      };

      const validationResult = service.validateUISpec(uiSpec);
      expect(validationResult.errors.some((e) => e.message.includes('Circular'))).toBe(true);
    });
  });
});
