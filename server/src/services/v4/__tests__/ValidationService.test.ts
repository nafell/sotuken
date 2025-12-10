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

    // UISpec構造検証テスト（null/undefined/不正構造対応）
    test('null UISpecでINVALID_UISPECエラー', () => {
      const validationResult = service.validateUISpec(null as unknown as UISpec);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_UISPEC')).toBe(true);
      expect(validationResult.errors.some((e) => e.message.includes('null'))).toBe(true);
    });

    test('undefined UISpecでINVALID_UISPECエラー', () => {
      const validationResult = service.validateUISpec(undefined as unknown as UISpec);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_UISPEC')).toBe(true);
    });

    test('widgets未定義でINVALID_UISPEC_STRUCTUREエラー', () => {
      const uiSpec = {
        version: '4.0',
        sessionId: 'test-session',
        stage: 'diverge',
        // widgets intentionally missing
        reactiveBindings: { bindings: [] },
        layout: { type: 'vertical', gap: 16 },
        metadata: { createdAt: Date.now(), llmModel: 'test' },
      } as unknown as UISpec;

      const validationResult = service.validateUISpec(uiSpec);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_UISPEC_STRUCTURE')).toBe(true);
      expect(validationResult.errors.some((e) => e.message.includes('widgets'))).toBe(true);
    });

    test('widgetsがnullでINVALID_UISPEC_STRUCTUREエラー', () => {
      const uiSpec = {
        version: '4.0',
        sessionId: 'test-session',
        stage: 'diverge',
        widgets: null,
        reactiveBindings: { bindings: [] },
        layout: { type: 'vertical', gap: 16 },
        metadata: { createdAt: Date.now(), llmModel: 'test' },
      } as unknown as UISpec;

      const validationResult = service.validateUISpec(uiSpec);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_UISPEC_STRUCTURE')).toBe(true);
    });

    test('widgetsがオブジェクト（非配列）でINVALID_UISPEC_STRUCTUREエラー', () => {
      const uiSpec = {
        version: '4.0',
        sessionId: 'test-session',
        stage: 'diverge',
        widgets: { someKey: 'value' }, // Object instead of array
        reactiveBindings: { bindings: [] },
        layout: { type: 'vertical', gap: 16 },
        metadata: { createdAt: Date.now(), llmModel: 'test' },
      } as unknown as UISpec;

      const validationResult = service.validateUISpec(uiSpec);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_UISPEC_STRUCTURE')).toBe(true);
    });

    test('空のwidgets配列は構造エラーにならない', () => {
      const uiSpec: UISpec = {
        version: '4.0',
        sessionId: 'test-session',
        stage: 'diverge',
        widgets: [], // Empty array should not cause INVALID_UISPEC_STRUCTURE
        reactiveBindings: { bindings: [] },
        layout: { type: 'vertical', gap: 16 },
        metadata: { createdAt: Date.now(), llmModel: 'test' },
      };

      const validationResult = service.validateUISpec(uiSpec);
      // Empty widgets may have other warnings, but not INVALID_UISPEC_STRUCTURE
      expect(validationResult.errors.filter((e) => e.type === 'INVALID_UISPEC_STRUCTURE')).toHaveLength(0);
    });
  });

  describe('validatePlanUISpec - v5.0構造検証', () => {
    test('null PlanUISpecでINVALID_UISPECエラー', () => {
      const validationResult = service.validatePlanUISpec(null as any);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_UISPEC')).toBe(true);
    });

    test('undefined PlanUISpecでINVALID_UISPECエラー', () => {
      const validationResult = service.validatePlanUISpec(undefined as any);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_UISPEC')).toBe(true);
    });

    test('sections未定義でINVALID_UISPEC_STRUCTUREエラー', () => {
      const planUISpec = { version: '5.0', stage: 'plan' } as any;
      const validationResult = service.validatePlanUISpec(planUISpec);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_UISPEC_STRUCTURE')).toBe(true);
      expect(validationResult.errors.some((e) => e.message.includes('sections'))).toBe(true);
    });

    test('sectionsがnullでINVALID_UISPEC_STRUCTUREエラー', () => {
      const planUISpec = { version: '5.0', stage: 'plan', sections: null } as any;
      const validationResult = service.validatePlanUISpec(planUISpec);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_UISPEC_STRUCTURE')).toBe(true);
    });

    test('セクション内widgets未定義でINVALID_UISPEC_STRUCTUREエラー', () => {
      const planUISpec = {
        version: '5.0',
        stage: 'plan',
        sections: {
          diverge: {}, // widgets missing
          organize: { widgets: [] },
          converge: { widgets: [] },
        },
      } as any;
      const validationResult = service.validatePlanUISpec(planUISpec);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some((e) => e.message.includes('diverge'))).toBe(true);
    });

    test('バージョン不一致でINVALID_VERSIONエラー', () => {
      const planUISpec = {
        version: '4.0', // Wrong version
        stage: 'plan',
        sections: {
          diverge: { header: { title: '発散' }, widgets: [] },
          organize: { header: { title: '整理' }, widgets: [] },
          converge: { header: { title: '収束' }, widgets: [] },
        },
        reactiveBindings: { bindings: [] },
        layout: { type: 'sectioned' },
        metadata: { generatedAt: Date.now(), llmModel: 'test' },
      } as any;
      const validationResult = service.validatePlanUISpec(planUISpec);
      expect(validationResult.errors.some((e) => e.type === 'INVALID_VERSION')).toBe(true);
    });

    test('有効なPlanUISpecは構造エラーなし', () => {
      const planUISpec = {
        version: '5.0',
        sessionId: 'test-session',
        stage: 'plan',
        sections: {
          diverge: { header: { title: '発散', description: '' }, widgets: [] },
          organize: { header: { title: '整理', description: '' }, widgets: [] },
          converge: { header: { title: '収束', description: '' }, widgets: [] },
        },
        reactiveBindings: { bindings: [] },
        layout: { type: 'sectioned' },
        metadata: { generatedAt: Date.now(), llmModel: 'test' },
      } as any;
      const validationResult = service.validatePlanUISpec(planUISpec);
      expect(validationResult.errors.filter((e) => e.type === 'INVALID_UISPEC_STRUCTURE')).toHaveLength(0);
      expect(validationResult.errors.filter((e) => e.type === 'INVALID_UISPEC')).toHaveLength(0);
    });

    test('validateUISpecからPlanUISpecへの自動ルーティング', () => {
      // sections プロパティがある場合、validateUISpecからvalidatePlanUISpecにルーティングされる
      const planUISpec = {
        version: '5.0',
        sessionId: 'test-session',
        stage: 'plan',
        sections: {
          diverge: { header: { title: '発散' }, widgets: [] },
          organize: { header: { title: '整理' }, widgets: [] },
          converge: { header: { title: '収束' }, widgets: [] },
        },
        reactiveBindings: { bindings: [] },
        layout: { type: 'sectioned' },
        metadata: { generatedAt: Date.now(), llmModel: 'test' },
      } as any;
      // validateUISpecを呼び出してもvalidatePlanUISpecにルーティングされる
      const validationResult = service.validateUISpec(planUISpec);
      expect(validationResult.errors.filter((e) => e.type === 'INVALID_UISPEC_STRUCTURE')).toHaveLength(0);
    });
  });
});
