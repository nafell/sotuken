/**
 * Mock Widget Selection Service for DSL v4
 *
 * テストケースのexpectedFlowをWidgetSelectionResult形式に変換するサービス。
 * 技術検証/専門家評価モードでLLM呼び出しをスキップする場合に使用。
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

import type {
  WidgetSelectionResult,
  StageSelection,
  SelectedWidget,
  WidgetComponentType,
} from '../../types/v4/widget-selection.types';
import { isWidgetComponentType } from '../../types/v4/widget-selection.types';
import {
  getExperimentConfigService,
  type TestCase,
  type TestCaseStage,
} from '../ExperimentConfigService';

// =============================================================================
// Types
// =============================================================================

/**
 * モックWidget選定入力
 */
export interface MockWidgetSelectionInput {
  /** テストケースID */
  caseId: string;
  /** セッションID（メタデータ用） */
  sessionId?: string;
  /** ボトルネックタイプ（オーバーライド用、省略時はテストケースから取得） */
  bottleneckType?: string;
}

/**
 * モックWidget選定出力
 */
export interface MockWidgetSelectionOutput {
  /** 成功フラグ */
  success: boolean;
  /** Widget選定結果 */
  result?: WidgetSelectionResult;
  /** エラーメッセージ */
  error?: string;
}

// =============================================================================
// Mock Widget Selection Service
// =============================================================================

/**
 * Mock Widget Selection Service
 *
 * テストケースのexpectedFlowを使用してWidget選定結果を生成。
 * LLM呼び出しをスキップしてモックデータを返す。
 */
export class MockWidgetSelectionService {
  private debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  /**
   * テストケースからWidget選定結果を生成
   *
   * @param input モック入力
   * @returns モック出力
   */
  generateFromTestCase(input: MockWidgetSelectionInput): MockWidgetSelectionOutput {
    const { caseId, sessionId, bottleneckType: overrideBottleneckType } = input;

    if (this.debug) {
      console.log(`[MockWidgetSelectionService] Generating mock for case: ${caseId}`);
    }

    // テストケースを取得
    const configService = getExperimentConfigService();
    const testCase = configService.getTestCase(caseId);

    if (!testCase) {
      return {
        success: false,
        error: `Test case not found: ${caseId}`,
      };
    }

    try {
      // expectedFlowをWidgetSelectionResult形式に変換
      const result = this.convertExpectedFlowToWidgetSelection(
        testCase,
        sessionId,
        overrideBottleneckType
      );

      if (this.debug) {
        console.log(`[MockWidgetSelectionService] Generated mock result for ${caseId}`);
      }

      return {
        success: true,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to convert expectedFlow: ${errorMessage}`,
      };
    }
  }

  /**
   * expectedFlowをWidgetSelectionResult形式に変換
   */
  private convertExpectedFlowToWidgetSelection(
    testCase: TestCase,
    sessionId?: string,
    overrideBottleneckType?: string
  ): WidgetSelectionResult {
    const { expectedFlow, concernText, expectedBottlenecks, caseId, title } = testCase;
    const bottleneckType = overrideBottleneckType || expectedBottlenecks[0] || 'unknown';

    // 各ステージを変換
    const divergeSelection = this.convertStage(
      expectedFlow.diverge,
      'diverge',
      concernText
    );
    const organizeSelection = this.convertStage(
      expectedFlow.organize,
      'organize',
      concernText
    );
    const convergeSelection = this.convertStage(
      expectedFlow.converge,
      'converge',
      concernText
    );

    // summaryステージはexpectedFlowに含まれない場合、デフォルトでstructured_summaryを設定
    const summarySelection = this.createDefaultSummarySelection(concernText);

    return {
      version: '4.0',
      stages: {
        diverge: divergeSelection,
        organize: organizeSelection,
        converge: convergeSelection,
        summary: summarySelection,
      },
      rationale: `[Mock] テストケース ${caseId}: ${title} のexpectedFlowに基づく選定`,
      flowDescription: `テストケース「${title}」の事前定義フローを使用したモック選定`,
      metadata: {
        generatedAt: Date.now(),
        llmModel: 'mock',
        bottleneckType,
        sessionId,
        latencyMs: 0,
      },
    };
  }

  /**
   * TestCaseStageをStageSelectionに変換
   */
  private convertStage(
    stage: TestCaseStage,
    stageName: string,
    concernText: string
  ): StageSelection {
    const widgets: SelectedWidget[] = [];

    for (let i = 0; i < stage.widgets.length; i++) {
      const widgetId = stage.widgets[i];

      // 実装済みWidgetかどうかを検証
      if (!isWidgetComponentType(widgetId)) {
        if (this.debug) {
          console.warn(
            `[MockWidgetSelectionService] Skipping unimplemented widget: ${widgetId} in stage ${stageName}`
          );
        }
        continue;
      }

      widgets.push({
        widgetId: widgetId as WidgetComponentType,
        purpose: stage.purpose,
        order: i,
      });
    }

    return {
      widgets,
      purpose: stage.purpose,
      target: concernText.substring(0, 100),
      description: `[Mock] ${stage.purpose}`,
    };
  }

  /**
   * デフォルトのsummaryステージ選定を作成
   */
  private createDefaultSummarySelection(concernText: string): StageSelection {
    return {
      widgets: [
        {
          widgetId: 'structured_summary',
          purpose: 'セッション結果のまとめと振り返り',
          order: 0,
        },
      ],
      purpose: 'セッション結果のまとめと振り返り',
      target: concernText.substring(0, 100),
      description: '[Mock] セッション結果を構造化して表示',
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let serviceInstance: MockWidgetSelectionService | null = null;

/**
 * MockWidgetSelectionServiceのシングルトンインスタンスを取得
 */
export function getMockWidgetSelectionService(debug = false): MockWidgetSelectionService {
  if (!serviceInstance) {
    serviceInstance = new MockWidgetSelectionService(debug);
  }
  return serviceInstance;
}

/**
 * テスト用：インスタンスをリセット
 */
export function resetMockWidgetSelectionService(): void {
  serviceInstance = null;
}
