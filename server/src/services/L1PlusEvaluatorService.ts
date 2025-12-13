/**
 * L1PlusEvaluatorService
 *
 * L1+（追加検証指標）の評価を行うサービス。
 * 保存済みのgeneratedData（PlanUISpec）とテストケース定義から
 * Spec-Compliance/Static-Sanity指標を算出する。
 *
 * @see docs/research/DEV-REQUIREMENTS-L1PLUS-METRICS.md
 */

import type { PlanUISpec, SectionType } from '../types/v4/ui-spec.types';
import type { ReactiveBinding } from '../types/v4/reactive-binding.types';
import type {
  W2WRCategory,
  L1PlusEvaluationResult,
  TestCaseDefinition,
  EXPECTED_BINDING_RANGES,
} from '../types/experiment-trial.types';
import {
  validateJavaScript,
  validateMultipleJavaScript,
} from './JSValidationHelper';

// ========================================
// Constants
// ========================================

/** セクション順序（前方向判定用） */
const SECTION_ORDER: Record<SectionType, number> = {
  diverge: 0,
  organize: 1,
  converge: 2,
};

/** W2WRカテゴリ別期待binding数レンジ */
const EXPECTED_BINDING_RANGES_LOCAL: Record<W2WRCategory, [number, number]> = {
  'A': [0, 0],    // No W2WR
  'B': [1, 1],    // Passthrough single
  'C': [1, 2],    // JS simple
  'D': [1, 3],    // JS complex
  'E': [2, 5],    // Multiple bindings
};

// ========================================
// Types
// ========================================

export interface L1PlusEvaluatorConfig {
  /** デバッグモード */
  debug?: boolean;
}

export interface EvaluationInput {
  /** 評価対象のUISpec */
  uiSpec: PlanUISpec;
  /** テストケース定義 */
  testCase: TestCaseDefinition;
}

// ========================================
// L1PlusEvaluatorService
// ========================================

export class L1PlusEvaluatorService {
  private debug: boolean;

  constructor(config: L1PlusEvaluatorConfig = {}) {
    this.debug = config.debug ?? false;
  }

  /**
   * L1+指標を一括評価
   */
  evaluate(input: EvaluationInput): L1PlusEvaluationResult {
    const { uiSpec, testCase } = input;

    // W2WRカテゴリを分類
    const w2wrCategory = this.classifyW2WRCategory(testCase);

    // Bindingsを取得
    const bindings = uiSpec.reactiveBindings?.bindings ?? [];
    const actualBindingCount = bindings.length;

    // Spec-Compliance評価
    const reqW2wrPres = this.evaluateReqW2wrPres(uiSpec, testCase);
    const reqBindingCountOk = this.evaluateReqBindingCountOk(actualBindingCount, w2wrCategory);
    const reqPatternMatch = this.evaluateReqPatternMatch(uiSpec, testCase);
    const { rate: reqStageForwardRate, forwardCount, totalCount } =
      this.evaluateReqStageForwardRate(uiSpec);

    // Static-Sanity評価
    const { jsParseOk, jsPolicyOk, jsErrors, policyViolations } =
      this.evaluateStaticSanity(bindings);

    const result: L1PlusEvaluationResult = {
      reqW2wrPres,
      reqBindingCountOk,
      reqPatternMatch,
      reqStageForwardRate,
      jsParseOk,
      jsPolicyOk,
      w2wrCategory,
      evaluatedAt: new Date().toISOString(),
      details: {
        actualBindingCount,
        expectedBindingRange: EXPECTED_BINDING_RANGES_LOCAL[w2wrCategory],
        jsErrors,
        policyViolations,
        forwardBindings: forwardCount,
        totalBindings: totalCount,
      },
    };

    if (this.debug) {
      console.log('[L1PlusEvaluator] Evaluation result:', JSON.stringify(result, null, 2));
    }

    return result;
  }

  // ========================================
  // W2WR Category Classification
  // ========================================

  /**
   * テストケースからW2WRカテゴリを分類
   *
   * A: No W2WR (hasReactivity=false or no bindings expected)
   * B: Passthrough (relationship.type='passthrough')
   * C: JS単純 (relationship.type='javascript', 単純変換)
   * D: JS複合 (relationship.type='javascript', filter/flatMap/reduce等)
   * E: 複数Binding (bindings.length >= 2)
   */
  classifyW2WRCategory(testCase: TestCaseDefinition): W2WRCategory {
    // hasReactivity=false ならカテゴリA
    if (!testCase.hasReactivity) {
      return 'A';
    }

    const expectedBindings = testCase.expectedW2WR?.bindings ?? [];

    // 期待bindingsがない場合もカテゴリA
    if (expectedBindings.length === 0) {
      return 'A';
    }

    // 複数bindingsならカテゴリE
    if (expectedBindings.length >= 2) {
      return 'E';
    }

    // 単一bindingの場合、typeで分類
    const binding = expectedBindings[0];
    const relType = binding?.relationship?.type;

    if (relType === 'passthrough') {
      return 'B';
    }

    if (relType === 'javascript') {
      const js = binding?.relationship?.javascript ?? '';
      // 複合JS判定: filter, Object.entries, flatMap, reduce, map+条件 などが含まれるか
      const isComplex = /filter|Object\.entries|flatMap|reduce|\.map\s*\([^)]*=>/.test(js);
      return isComplex ? 'D' : 'C';
    }

    if (relType === 'debounced') {
      // debouncedは通常passthrough+遅延なのでB扱い
      return 'B';
    }

    // デフォルト
    return 'A';
  }

  // ========================================
  // Spec-Compliance Evaluators
  // ========================================

  /**
   * REQ_W2WR_PRES: hasReactivityとbinding存在の一致を検証
   */
  evaluateReqW2wrPres(uiSpec: PlanUISpec, testCase: TestCaseDefinition): boolean {
    const hasExpectedReactivity = testCase.hasReactivity;
    const actualBindingCount = uiSpec.reactiveBindings?.bindings?.length ?? 0;
    const hasActualBindings = actualBindingCount > 0;

    // hasReactivity=trueなら1つ以上のbindingが必要
    // hasReactivity=falseならbindingは0であるべき
    return hasExpectedReactivity === hasActualBindings;
  }

  /**
   * REQ_BINDING_COUNT_OK: カテゴリ別期待binding数レンジを満たすか
   */
  evaluateReqBindingCountOk(actualCount: number, category: W2WRCategory): boolean {
    const [min, max] = EXPECTED_BINDING_RANGES_LOCAL[category];
    return actualCount >= min && actualCount <= max;
  }

  /**
   * REQ_PATTERN_MATCH: 期待パターンとの一致を検証
   *
   * expectedW2WR.bindings[].relationship.typeと実際のbindingsを比較
   */
  evaluateReqPatternMatch(uiSpec: PlanUISpec, testCase: TestCaseDefinition): boolean {
    const expectedBindings = testCase.expectedW2WR?.bindings ?? [];
    const actualBindings = uiSpec.reactiveBindings?.bindings ?? [];

    // 期待がない場合は、実際もない場合にtrue
    if (expectedBindings.length === 0) {
      return actualBindings.length === 0;
    }

    // 期待される各typeが実際に存在するかチェック
    const expectedTypes = new Set(expectedBindings.map((b) => b.relationship?.type).filter(Boolean));
    const actualTypes = new Set(actualBindings.map((b) => b.relationship?.type).filter(Boolean));

    // 期待されるtype全てが実際に存在するか
    for (const expectedType of expectedTypes) {
      if (!actualTypes.has(expectedType)) {
        return false;
      }
    }

    return true;
  }

  /**
   * REQ_STAGE_FORWARD_RATE: 前方向bindingの比率を計算
   *
   * diverge→organize→convergeの順で、sourceのstage <= targetのstageなら前方向
   */
  evaluateReqStageForwardRate(uiSpec: PlanUISpec): {
    rate: number;
    forwardCount: number;
    totalCount: number;
  } {
    const bindings = uiSpec.reactiveBindings?.bindings ?? [];

    if (bindings.length === 0) {
      return { rate: 1, forwardCount: 0, totalCount: 0 }; // bindingなしは100%とみなす
    }

    // 各WidgetがどのSectionに属するかマップを構築
    const widgetSectionMap = this.buildWidgetSectionMap(uiSpec);

    let forwardCount = 0;
    let totalCount = 0;

    for (const binding of bindings) {
      const sourceWidgetId = binding.source?.split('.')[0];
      const targetWidgetId = binding.target?.split('.')[0];

      if (!sourceWidgetId || !targetWidgetId) {
        continue;
      }

      const sourceSection = widgetSectionMap.get(sourceWidgetId);
      const targetSection = widgetSectionMap.get(targetWidgetId);

      if (sourceSection && targetSection) {
        totalCount++;
        const sourceOrder = SECTION_ORDER[sourceSection];
        const targetOrder = SECTION_ORDER[targetSection];

        if (sourceOrder <= targetOrder) {
          forwardCount++;
        }
      }
    }

    const rate = totalCount > 0 ? forwardCount / totalCount : 1;
    return { rate, forwardCount, totalCount };
  }

  /**
   * WidgetIDからSectionへのマップを構築
   */
  private buildWidgetSectionMap(uiSpec: PlanUISpec): Map<string, SectionType> {
    const map = new Map<string, SectionType>();

    const sections: SectionType[] = ['diverge', 'organize', 'converge'];
    for (const section of sections) {
      const sectionSpec = uiSpec.sections?.[section];
      if (sectionSpec?.widgets) {
        for (const widget of sectionSpec.widgets) {
          map.set(widget.id, section);
        }
      }
    }

    return map;
  }

  // ========================================
  // Static-Sanity Evaluators
  // ========================================

  /**
   * JS_PARSE_OK / JS_POLICY_OK を評価
   */
  evaluateStaticSanity(bindings: ReactiveBinding[]): {
    jsParseOk: boolean;
    jsPolicyOk: boolean;
    jsErrors: string[];
    policyViolations: string[];
  } {
    // relationship.type='javascript'のbindingsを抽出
    const jsCodes: string[] = [];

    for (const binding of bindings) {
      if (binding.relationship?.type === 'javascript') {
        const js = (binding.relationship as { javascript?: string }).javascript;
        if (js) {
          jsCodes.push(js);
        }
      }
    }

    // JSコードがない場合は全てOK
    if (jsCodes.length === 0) {
      return {
        jsParseOk: true,
        jsPolicyOk: true,
        jsErrors: [],
        policyViolations: [],
      };
    }

    // 一括検証
    const result = validateMultipleJavaScript(jsCodes);

    return {
      jsParseOk: result.allParseOk,
      jsPolicyOk: result.allPolicyOk,
      jsErrors: result.parseErrors,
      policyViolations: result.policyViolations,
    };
  }
}

// ========================================
// Factory
// ========================================

let serviceInstance: L1PlusEvaluatorService | null = null;

export function getL1PlusEvaluatorService(
  config?: L1PlusEvaluatorConfig
): L1PlusEvaluatorService {
  if (!serviceInstance) {
    serviceInstance = new L1PlusEvaluatorService(config);
  }
  return serviceInstance;
}

/**
 * 新しいインスタンスを作成（テスト用）
 */
export function createL1PlusEvaluatorService(
  config?: L1PlusEvaluatorConfig
): L1PlusEvaluatorService {
  return new L1PlusEvaluatorService(config);
}
