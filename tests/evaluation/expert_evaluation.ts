/**
 * Expert Evaluation Script
 * Phase 4 タスク3.1 - 専門家評価システム
 *
 * 10ケースの悩みに対してUIフローを自動生成し、評価データを収集する
 *
 * 使用方法:
 *   bun run tests/evaluation/expert_evaluation.ts
 *   bun run tests/evaluation/expert_evaluation.ts --dry-run  # API呼び出しなしでテスト
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================
// 型定義
// ============================================================

interface TestCase {
  id: string;
  concern: string;
  category: string;
  expectedBottleneck: string[];
  expectedComponents: string[];
  expectedStages: string[];
  hasReactivity: boolean;
  reactivityType?: string;
  priority: 'high' | 'medium' | 'low';
  evaluationCriteria: {
    bottleneckDiagnosis: string;
    componentSelection: string;
    flowLogic?: string;
    reactivityDesign?: string;
  };
}

interface TestCasesConfig {
  version: string;
  description: string;
  createdAt: string;
  cases: TestCase[];
  evaluationMetrics: Record<string, {
    weight: number;
    scale: number;
    description: string;
  }>;
  baselineComparison: {
    jellyEstimatedTokens: number;
    targetReductionRate: number;
    description: string;
  };
}

interface UISpecV3GenerationResponse {
  success: boolean;
  uiSpec?: any;
  textSummary?: string;
  mode?: 'widget' | 'text';
  generation?: {
    model: string;
    generatedAt: string;
    processingTimeMs: number;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    retryCount: number;
  };
  error?: {
    code: string;
    message: string;
    retryCount?: number;
  };
}

interface EvaluationMetrics {
  caseId: string;
  concern: string;
  category: string;
  generationTime: number;
  tokenUsage: {
    prompt: number;
    response: number;
    total: number;
  };
  syntaxValid: boolean;
  componentsGenerated: string[];
  stagesGenerated: string[];
  hasExpectedReactivity: boolean;
  widgetCount: number;
  errors: string[];
  validationResults: {
    hasExpectedComponents: boolean;
    matchedComponents: string[];
    missingComponents: string[];
    extraComponents: string[];
  };
}

interface EvaluationResult {
  testCase: TestCase;
  uiSpec: any | null;
  metrics: EvaluationMetrics;
  rawResponse: UISpecV3GenerationResponse;
  timestamp: string;
}

interface SummaryReport {
  executedAt: string;
  totalCases: number;
  successfulCases: number;
  failedCases: number;
  averageGenerationTime: number;
  averageTokens: number;
  tokenReductionRate: number;
  baselineTokens: number;
  syntaxErrorRate: number;
  componentMatchRate: number;
  reactivityDetectionRate: number;
  caseResults: {
    caseId: string;
    success: boolean;
    generationTime: number;
    totalTokens: number;
    widgetCount: number;
    errors: string[];
  }[];
}

// ============================================================
// 設定
// ============================================================

const API_BASE_URL = 'http://localhost:3000/v1';
const RESULTS_DIR = join(import.meta.dir, 'results');
const TEST_CASES_PATH = join(import.meta.dir, 'test_cases.json');

// ============================================================
// ユーティリティ関数
// ============================================================

function loadTestCases(): TestCasesConfig {
  const content = readFileSync(TEST_CASES_PATH, 'utf-8');
  return JSON.parse(content);
}

function ensureResultsDir(): void {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

function saveResult(filename: string, data: any): void {
  ensureResultsDir();
  const filepath = join(RESULTS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  📁 結果保存: ${filepath}`);
}

function generateSessionId(): string {
  return 'eval_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================================
// API呼び出し
// ============================================================

async function generateUIFlow(
  concern: string,
  stage: 'diverge' | 'organize' | 'converge' | 'summary' = 'diverge'
): Promise<UISpecV3GenerationResponse> {
  const sessionId = generateSessionId();

  const response = await fetch(`${API_BASE_URL}/ui/generate-v3`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': 'expert_evaluation',
    },
    body: JSON.stringify({
      sessionId,
      concernText: concern,
      stage,
      options: {
        restrictToImplementedWidgets: true,
      },
    }),
  });

  return response.json();
}

// ============================================================
// バリデーション
// ============================================================

function validateDSL(uiSpec: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!uiSpec) {
    errors.push('UISpec is null or undefined');
    return { valid: false, errors };
  }

  if (!uiSpec.sessionId) errors.push('Missing sessionId');
  if (!uiSpec.stage) errors.push('Missing stage');
  if (!Array.isArray(uiSpec.widgets)) {
    errors.push('widgets is not an array');
  } else if (uiSpec.widgets.length === 0) {
    errors.push('widgets array is empty');
  } else {
    uiSpec.widgets.forEach((widget: any, index: number) => {
      if (!widget.id) errors.push(`widget[${index}]: missing id`);
      if (!widget.component) errors.push(`widget[${index}]: missing component`);
      if (!widget.config) errors.push(`widget[${index}]: missing config`);
    });
  }

  if (!uiSpec.layout) errors.push('Missing layout');
  if (!uiSpec.metadata) errors.push('Missing metadata');

  return {
    valid: errors.length === 0,
    errors,
  };
}

function checkReactivity(uiSpec: any, testCase: TestCase): boolean {
  if (!testCase.hasReactivity) return true; // リアクティビティが不要なケースは常にtrue

  if (!uiSpec || !uiSpec.widgets) return false;

  // reactiveBindingsまたはdpg.dependenciesをチェック
  const hasBindings = uiSpec.widgets.some(
    (widget: any) => widget.reactiveBindings && widget.reactiveBindings.length > 0
  );

  const hasDependencies =
    uiSpec.dpg && uiSpec.dpg.dependencies && uiSpec.dpg.dependencies.length > 0;

  return hasBindings || hasDependencies;
}

function validateComponents(
  generatedComponents: string[],
  expectedComponents: string[]
): {
  hasExpectedComponents: boolean;
  matchedComponents: string[];
  missingComponents: string[];
  extraComponents: string[];
} {
  const matched = generatedComponents.filter((c) => expectedComponents.includes(c));
  const missing = expectedComponents.filter((c) => !generatedComponents.includes(c));
  const extra = generatedComponents.filter((c) => !expectedComponents.includes(c));

  return {
    hasExpectedComponents: matched.length > 0,
    matchedComponents: matched,
    missingComponents: missing,
    extraComponents: extra,
  };
}

// ============================================================
// メイン評価ロジック
// ============================================================

async function evaluateCase(testCase: TestCase): Promise<EvaluationResult> {
  console.log(`\n📋 評価中: ${testCase.id}`);
  console.log(`  悩み: "${testCase.concern.slice(0, 50)}..."`);

  const startTime = Date.now();
  let uiSpec: any = null;
  let rawResponse: UISpecV3GenerationResponse;
  const errors: string[] = [];

  try {
    // UI生成API呼び出し
    rawResponse = await generateUIFlow(testCase.concern, 'diverge');

    if (!rawResponse.success) {
      errors.push(rawResponse.error?.message || 'Unknown error');
    } else {
      uiSpec = rawResponse.uiSpec;
    }
  } catch (error) {
    rawResponse = {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
      },
    };
    errors.push(`API呼び出しエラー: ${rawResponse.error!.message}`);
  }

  const endTime = Date.now();

  // バリデーション
  const validation = validateDSL(uiSpec);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  // 生成されたコンポーネント抽出
  const componentsGenerated = uiSpec?.widgets?.map((w: any) => w.component) || [];
  const stagesGenerated = uiSpec?.stage ? [uiSpec.stage] : [];

  // コンポーネント検証
  const componentValidation = validateComponents(
    componentsGenerated,
    testCase.expectedComponents
  );

  // リアクティビティ検証
  const hasExpectedReactivity = checkReactivity(uiSpec, testCase);

  // メトリクス構築
  const metrics: EvaluationMetrics = {
    caseId: testCase.id,
    concern: testCase.concern,
    category: testCase.category,
    generationTime: endTime - startTime,
    tokenUsage: {
      prompt: rawResponse.generation?.promptTokens || 0,
      response: rawResponse.generation?.responseTokens || 0,
      total: rawResponse.generation?.totalTokens || 0,
    },
    syntaxValid: validation.valid,
    componentsGenerated,
    stagesGenerated,
    hasExpectedReactivity,
    widgetCount: uiSpec?.widgets?.length || 0,
    errors,
    validationResults: componentValidation,
  };

  // 結果表示
  if (rawResponse.success) {
    console.log(
      `  ✅ 生成成功 (${metrics.generationTime}ms, ${metrics.tokenUsage.total} tokens)`
    );
    console.log(`  📦 Widget: ${metrics.widgetCount}個 [${componentsGenerated.join(', ')}]`);
    if (testCase.hasReactivity) {
      console.log(`  🔗 Reactivity: ${hasExpectedReactivity ? '✓' : '✗'}`);
    }
  } else {
    console.log(`  ❌ 生成失敗: ${errors[0] || 'Unknown error'}`);
  }

  return {
    testCase,
    uiSpec,
    metrics,
    rawResponse,
    timestamp: new Date().toISOString(),
  };
}

async function runExpertEvaluation(dryRun: boolean = false): Promise<SummaryReport> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  専門家評価スクリプト - Phase 4 タスク3.1');
  console.log('═══════════════════════════════════════════════════════════════');

  if (dryRun) {
    console.log('⚠️  ドライランモード: API呼び出しはスキップされます');
  }

  // テストケース読み込み
  const config = loadTestCases();
  console.log(`\n📂 テストケース読み込み: ${config.cases.length}件`);
  console.log(`📊 基準トークン数（Jelly）: ${config.baselineComparison.jellyEstimatedTokens}`);
  console.log(`🎯 目標削減率: ${(config.baselineComparison.targetReductionRate * 100).toFixed(0)}%`);

  const results: EvaluationResult[] = [];

  // 各ケースを評価
  for (const testCase of config.cases) {
    let result: EvaluationResult;

    if (dryRun) {
      // ドライランモード: モック結果を生成
      result = {
        testCase,
        uiSpec: null,
        metrics: {
          caseId: testCase.id,
          concern: testCase.concern,
          category: testCase.category,
          generationTime: 0,
          tokenUsage: { prompt: 0, response: 0, total: 0 },
          syntaxValid: false,
          componentsGenerated: [],
          stagesGenerated: [],
          hasExpectedReactivity: false,
          widgetCount: 0,
          errors: ['Dry run mode'],
          validationResults: {
            hasExpectedComponents: false,
            matchedComponents: [],
            missingComponents: testCase.expectedComponents,
            extraComponents: [],
          },
        },
        rawResponse: { success: false, error: { code: 'DRY_RUN', message: 'Dry run mode' } },
        timestamp: new Date().toISOString(),
      };
      console.log(`\n📋 [DRY RUN] ${testCase.id}: スキップ`);
    } else {
      result = await evaluateCase(testCase);

      // 結果を個別ファイルに保存
      saveResult(`${testCase.id}_result.json`, result);

      // API負荷軽減のため少し待機
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    results.push(result);
  }

  // サマリー生成
  const successfulResults = results.filter((r) => r.rawResponse.success);
  const failedResults = results.filter((r) => !r.rawResponse.success);

  const totalTokens = successfulResults.reduce(
    (sum, r) => sum + r.metrics.tokenUsage.total,
    0
  );
  const avgTokens =
    successfulResults.length > 0 ? totalTokens / successfulResults.length : 0;
  const avgTime =
    successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.metrics.generationTime, 0) /
        successfulResults.length
      : 0;

  const tokenReductionRate =
    (config.baselineComparison.jellyEstimatedTokens - avgTokens) /
    config.baselineComparison.jellyEstimatedTokens;

  const syntaxErrorCount = results.filter((r) => !r.metrics.syntaxValid).length;
  const componentMatchCount = results.filter(
    (r) => r.metrics.validationResults.hasExpectedComponents
  ).length;
  const reactivityCases = results.filter((r) => r.testCase.hasReactivity);
  const reactivityMatchCount = reactivityCases.filter(
    (r) => r.metrics.hasExpectedReactivity
  ).length;

  const summary: SummaryReport = {
    executedAt: new Date().toISOString(),
    totalCases: results.length,
    successfulCases: successfulResults.length,
    failedCases: failedResults.length,
    averageGenerationTime: Math.round(avgTime),
    averageTokens: Math.round(avgTokens),
    tokenReductionRate: Math.round(tokenReductionRate * 1000) / 10, // パーセント表示用
    baselineTokens: config.baselineComparison.jellyEstimatedTokens,
    syntaxErrorRate:
      results.length > 0
        ? Math.round((syntaxErrorCount / results.length) * 1000) / 10
        : 0,
    componentMatchRate:
      results.length > 0
        ? Math.round((componentMatchCount / results.length) * 1000) / 10
        : 0,
    reactivityDetectionRate:
      reactivityCases.length > 0
        ? Math.round((reactivityMatchCount / reactivityCases.length) * 1000) / 10
        : 100,
    caseResults: results.map((r) => ({
      caseId: r.testCase.id,
      success: r.rawResponse.success,
      generationTime: r.metrics.generationTime,
      totalTokens: r.metrics.tokenUsage.total,
      widgetCount: r.metrics.widgetCount,
      errors: r.metrics.errors,
    })),
  };

  // サマリー保存
  saveResult('summary_report.json', summary);

  // サマリー表示
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  評価サマリー');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`
📊 結果概要:
  成功率: ${((summary.successfulCases / summary.totalCases) * 100).toFixed(1)}% (${summary.successfulCases}/${summary.totalCases})
  平均生成時間: ${summary.averageGenerationTime}ms
  平均トークン数: ${summary.averageTokens}

📉 トークン削減:
  Jelly推定値: ${summary.baselineTokens}
  本システム平均: ${summary.averageTokens}
  削減率: ${summary.tokenReductionRate.toFixed(1)}%

🔍 品質指標:
  構文エラー率: ${summary.syntaxErrorRate.toFixed(1)}%
  コンポーネント一致率: ${summary.componentMatchRate.toFixed(1)}%
  リアクティビティ検出率: ${summary.reactivityDetectionRate.toFixed(1)}%
`);

  // 目標達成確認
  const targetMet = tokenReductionRate >= config.baselineComparison.targetReductionRate;
  if (targetMet) {
    console.log(`✅ 目標達成: トークン削減率${(config.baselineComparison.targetReductionRate * 100).toFixed(0)}%以上`);
  } else {
    console.log(`⚠️  目標未達: トークン削減率${(tokenReductionRate * 100).toFixed(1)}% < ${(config.baselineComparison.targetReductionRate * 100).toFixed(0)}%`);
  }

  console.log('\n📁 結果ファイル:');
  console.log(`  ${join(RESULTS_DIR, 'summary_report.json')}`);

  return summary;
}

// ============================================================
// エントリーポイント
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    await runExpertEvaluation(dryRun);
  } catch (error) {
    console.error('❌ 評価スクリプトエラー:', error);
    process.exit(1);
  }
}

// Bun環境でのエントリーポイント
main();
