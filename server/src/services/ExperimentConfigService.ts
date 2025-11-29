/**
 * ExperimentConfigService
 * 実験設定・テストケースの読み込み・管理サービス
 *
 * Phase 6: 実験環境構築
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// ========================================
// 型定義
// ========================================

export interface WidgetCountCondition {
  id: string;
  widgetCount: number;
  description: string;
  widgets: string[];
}

export interface ModelCondition {
  id: string;
  modelId: string;
  description: string;
}

export interface ExperimentType {
  id: string;
  name: string;
  description: string;
}

export interface ExperimentSettings {
  version: string;
  description: string;
  widgetCountConditions: WidgetCountCondition[];
  modelConditions: ModelCondition[];
  experimentTypes: ExperimentType[];
  defaults: {
    widgetCount: number;
    modelId: string;
    experimentType: string;
  };
  bottleneckTypes: string[];
}

export interface TestCaseContextFactors {
  category: string;
  urgency: string;
  emotionalState: string;
  timeAvailable: number;
}

export interface TestCaseReactivity {
  description: string;
  sourceWidget: string;
  targetWidget: string;
}

export interface TestCaseStage {
  widgets: string[];
  purpose: string;
  reactivity?: TestCaseReactivity;
  llmFeature?: boolean;
}

export interface TestCaseExpectedFlow {
  diverge: TestCaseStage;
  organize: TestCaseStage;
  converge: TestCaseStage;
}

export interface TestCase {
  caseId: string;
  title: string;
  complexity: 'simple' | 'medium' | 'complex';
  hasReactivity: boolean;
  concernText: string;
  contextFactors: TestCaseContextFactors;
  expectedBottlenecks: string[];
  expectedFlow: TestCaseExpectedFlow;
  evaluationCriteria: string[];
}

// ========================================
// サービスクラス
// ========================================

export class ExperimentConfigService {
  private settings: ExperimentSettings | null = null;
  private testCases: Map<string, TestCase> = new Map();
  private configPath: string;
  private testCasesPath: string;

  constructor(configBasePath?: string) {
    // 本番環境（Docker）: /config/
    // 開発環境: ../config/ (server/から見て)
    const basePath = configBasePath || (
      existsSync('/config/experiment-settings.json')
        ? '/config'
        : join(process.cwd(), '..', 'config')
    );
    this.configPath = join(basePath, 'experiment-settings.json');
    this.testCasesPath = join(basePath, 'test-cases');
  }

  /**
   * 設定ファイルを読み込み
   */
  loadSettings(): ExperimentSettings {
    if (this.settings) {
      return this.settings;
    }

    if (!existsSync(this.configPath)) {
      throw new Error(`Experiment settings file not found: ${this.configPath}`);
    }

    const content = readFileSync(this.configPath, 'utf-8');
    this.settings = JSON.parse(content) as ExperimentSettings;
    return this.settings;
  }

  /**
   * テストケースを全件読み込み
   */
  loadAllTestCases(): TestCase[] {
    if (this.testCases.size > 0) {
      return Array.from(this.testCases.values());
    }

    if (!existsSync(this.testCasesPath)) {
      throw new Error(`Test cases directory not found: ${this.testCasesPath}`);
    }

    const files = readdirSync(this.testCasesPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = join(this.testCasesPath, file);
      const content = readFileSync(filePath, 'utf-8');
      const testCase = JSON.parse(content) as TestCase;
      this.testCases.set(testCase.caseId, testCase);
    }

    return Array.from(this.testCases.values());
  }

  /**
   * 特定のテストケースを取得
   */
  getTestCase(caseId: string): TestCase | null {
    if (this.testCases.size === 0) {
      this.loadAllTestCases();
    }
    return this.testCases.get(caseId) || null;
  }

  /**
   * Widget数条件を取得
   */
  getWidgetCountCondition(conditionId: string): WidgetCountCondition | null {
    const settings = this.loadSettings();
    return settings.widgetCountConditions.find(c => c.id === conditionId) || null;
  }

  /**
   * モデル条件を取得
   */
  getModelCondition(conditionId: string): ModelCondition | null {
    const settings = this.loadSettings();
    return settings.modelConditions.find(c => c.id === conditionId) || null;
  }

  /**
   * Widget数からWidget一覧を取得
   */
  getWidgetsForCount(widgetCount: number): string[] {
    const settings = this.loadSettings();
    const condition = settings.widgetCountConditions.find(c => c.widgetCount === widgetCount);
    return condition?.widgets || [];
  }

  /**
   * デフォルト設定を取得
   */
  getDefaults(): ExperimentSettings['defaults'] {
    const settings = this.loadSettings();
    return settings.defaults;
  }

  /**
   * 利用可能なボトルネックタイプ一覧を取得
   */
  getBottleneckTypes(): string[] {
    const settings = this.loadSettings();
    return settings.bottleneckTypes;
  }

  /**
   * テストケースのサマリー一覧を取得（UI表示用）
   */
  getTestCaseSummaries(): Array<{
    caseId: string;
    title: string;
    complexity: string;
    hasReactivity: boolean;
    category: string;
  }> {
    const testCases = this.loadAllTestCases();
    return testCases.map(tc => ({
      caseId: tc.caseId,
      title: tc.title,
      complexity: tc.complexity,
      hasReactivity: tc.hasReactivity,
      category: tc.contextFactors.category
    }));
  }

  /**
   * 複雑度でフィルタリング
   */
  getTestCasesByComplexity(complexity: 'simple' | 'medium' | 'complex'): TestCase[] {
    const testCases = this.loadAllTestCases();
    return testCases.filter(tc => tc.complexity === complexity);
  }

  /**
   * Reactivity有無でフィルタリング
   */
  getTestCasesWithReactivity(hasReactivity: boolean): TestCase[] {
    const testCases = this.loadAllTestCases();
    return testCases.filter(tc => tc.hasReactivity === hasReactivity);
  }

  /**
   * キャッシュをクリア（設定変更時用）
   */
  clearCache(): void {
    this.settings = null;
    this.testCases.clear();
  }
}

// ========================================
// ファクトリ関数
// ========================================

let serviceInstance: ExperimentConfigService | null = null;

/**
 * ExperimentConfigServiceのシングルトンインスタンスを取得
 */
export function getExperimentConfigService(configBasePath?: string): ExperimentConfigService {
  if (!serviceInstance) {
    serviceInstance = new ExperimentConfigService(configBasePath);
  }
  return serviceInstance;
}

/**
 * テスト用：インスタンスをリセット
 */
export function resetExperimentConfigService(): void {
  serviceInstance = null;
}
