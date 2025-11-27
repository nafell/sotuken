/**
 * Aggregate Scores - 評価スコア集計スクリプト
 * Phase 4 タスク3.1
 *
 * 全ての専門家評価スコアを集計し、論文用のサマリーレポートを生成
 *
 * 使用方法:
 *   bun run tests/evaluation/aggregate_scores.ts
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// ============================================================
// 型定義
// ============================================================

interface EvaluationScore {
  bottleneckDiagnosis: number;
  componentSelection: number;
  flowLogic: number;
  reactivityDesign: number;
  overallScore: number;
  comments: string;
  evaluatorId: string;
  evaluatedAt: string;
}

interface ScoredResult {
  testCase: {
    id: string;
    concern: string;
    category: string;
    priority: string;
    hasReactivity: boolean;
    expectedComponents: string[];
  };
  metrics: {
    generationTime: number;
    tokenUsage: {
      prompt: number;
      response: number;
      total: number;
    };
    syntaxValid: boolean;
    widgetCount: number;
    validationResults: {
      matchedComponents: string[];
      missingComponents: string[];
    };
  };
  expertScore: EvaluationScore;
}

interface AggregateReport {
  generatedAt: string;
  totalCases: number;
  scoredCases: number;

  // 自動評価メトリクス
  automaticMetrics: {
    averageGenerationTime: number;
    averageTotalTokens: number;
    syntaxSuccessRate: number;
    componentMatchRate: number;
  };

  // 専門家評価メトリクス
  expertMetrics: {
    averageBottleneckDiagnosis: number;
    averageComponentSelection: number;
    averageFlowLogic: number;
    averageReactivityDesign: number;
    averageOverallScore: number;
    standardDeviations: {
      bottleneckDiagnosis: number;
      componentSelection: number;
      flowLogic: number;
      reactivityDesign: number;
      overallScore: number;
    };
  };

  // ケース別詳細
  caseDetails: {
    caseId: string;
    category: string;
    priority: string;
    generationTime: number;
    totalTokens: number;
    widgetCount: number;
    expertScores: {
      bottleneckDiagnosis: number;
      componentSelection: number;
      flowLogic: number;
      reactivityDesign: number;
      overallScore: number;
    };
    comments: string;
  }[];

  // カテゴリ別分析
  categoryAnalysis: Record<string, {
    count: number;
    averageOverall: number;
    averageTokens: number;
  }>;

  // トークン削減分析
  tokenAnalysis: {
    jellyBaseline: number;
    ourAverage: number;
    reductionRate: number;
    reductionPercentage: string;
  };
}

// ============================================================
// 設定
// ============================================================

const RESULTS_DIR = join(import.meta.dir, 'results');
const SCORED_DIR = join(RESULTS_DIR, 'scored');
const TEST_CASES_PATH = join(import.meta.dir, 'test_cases.json');

// ============================================================
// ユーティリティ
// ============================================================

function loadScoredResults(): ScoredResult[] {
  if (!existsSync(SCORED_DIR)) {
    console.log('⚠️  scored ディレクトリが存在しません');
    return [];
  }

  const files = readdirSync(SCORED_DIR).filter((f) => f.endsWith('_scored.json'));
  const results: ScoredResult[] = [];

  for (const file of files) {
    const filepath = join(SCORED_DIR, file);
    const content = readFileSync(filepath, 'utf-8');
    results.push(JSON.parse(content));
  }

  return results;
}

function loadTestCasesConfig(): any {
  const content = readFileSync(TEST_CASES_PATH, 'utf-8');
  return JSON.parse(content);
}

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
}

// ============================================================
// 集計ロジック
// ============================================================

function aggregateScores(results: ScoredResult[]): AggregateReport {
  const config = loadTestCasesConfig();
  const jellyBaseline = config.baselineComparison.jellyEstimatedTokens;

  // 自動評価メトリクス
  const generationTimes = results.map((r) => r.metrics.generationTime);
  const totalTokens = results.map((r) => r.metrics.tokenUsage.total);
  const syntaxValid = results.filter((r) => r.metrics.syntaxValid).length;
  const componentMatches = results.filter(
    (r) => r.metrics.validationResults.matchedComponents.length > 0
  ).length;

  // 専門家評価スコア
  const bottleneckScores = results.map((r) => r.expertScore.bottleneckDiagnosis);
  const componentScores = results.map((r) => r.expertScore.componentSelection);
  const flowScores = results.map((r) => r.expertScore.flowLogic);
  const reactivityResults = results.filter((r) => r.testCase.hasReactivity);
  const reactivityScores = reactivityResults.map((r) => r.expertScore.reactivityDesign);
  const overallScores = results.map((r) => r.expertScore.overallScore);

  // カテゴリ別分析
  const categoryAnalysis: Record<string, { count: number; overallScores: number[]; tokens: number[] }> = {};
  for (const result of results) {
    const cat = result.testCase.category;
    if (!categoryAnalysis[cat]) {
      categoryAnalysis[cat] = { count: 0, overallScores: [], tokens: [] };
    }
    categoryAnalysis[cat].count++;
    categoryAnalysis[cat].overallScores.push(result.expertScore.overallScore);
    categoryAnalysis[cat].tokens.push(result.metrics.tokenUsage.total);
  }

  const avgTokens = calculateMean(totalTokens);
  const reductionRate = (jellyBaseline - avgTokens) / jellyBaseline;

  return {
    generatedAt: new Date().toISOString(),
    totalCases: config.cases.length,
    scoredCases: results.length,

    automaticMetrics: {
      averageGenerationTime: Math.round(calculateMean(generationTimes)),
      averageTotalTokens: Math.round(avgTokens),
      syntaxSuccessRate: Math.round((syntaxValid / results.length) * 100),
      componentMatchRate: Math.round((componentMatches / results.length) * 100),
    },

    expertMetrics: {
      averageBottleneckDiagnosis: Math.round(calculateMean(bottleneckScores) * 10) / 10,
      averageComponentSelection: Math.round(calculateMean(componentScores) * 10) / 10,
      averageFlowLogic: Math.round(calculateMean(flowScores) * 10) / 10,
      averageReactivityDesign:
        reactivityScores.length > 0
          ? Math.round(calculateMean(reactivityScores) * 10) / 10
          : 0,
      averageOverallScore: Math.round(calculateMean(overallScores) * 10) / 10,
      standardDeviations: {
        bottleneckDiagnosis: Math.round(calculateStdDev(bottleneckScores) * 100) / 100,
        componentSelection: Math.round(calculateStdDev(componentScores) * 100) / 100,
        flowLogic: Math.round(calculateStdDev(flowScores) * 100) / 100,
        reactivityDesign:
          reactivityScores.length > 0
            ? Math.round(calculateStdDev(reactivityScores) * 100) / 100
            : 0,
        overallScore: Math.round(calculateStdDev(overallScores) * 100) / 100,
      },
    },

    caseDetails: results.map((r) => ({
      caseId: r.testCase.id,
      category: r.testCase.category,
      priority: r.testCase.priority,
      generationTime: r.metrics.generationTime,
      totalTokens: r.metrics.tokenUsage.total,
      widgetCount: r.metrics.widgetCount,
      expertScores: {
        bottleneckDiagnosis: r.expertScore.bottleneckDiagnosis,
        componentSelection: r.expertScore.componentSelection,
        flowLogic: r.expertScore.flowLogic,
        reactivityDesign: r.expertScore.reactivityDesign,
        overallScore: r.expertScore.overallScore,
      },
      comments: r.expertScore.comments,
    })),

    categoryAnalysis: Object.fromEntries(
      Object.entries(categoryAnalysis).map(([cat, data]) => [
        cat,
        {
          count: data.count,
          averageOverall: Math.round(calculateMean(data.overallScores) * 10) / 10,
          averageTokens: Math.round(calculateMean(data.tokens)),
        },
      ])
    ),

    tokenAnalysis: {
      jellyBaseline,
      ourAverage: Math.round(avgTokens),
      reductionRate: Math.round(reductionRate * 1000) / 10,
      reductionPercentage: `${Math.round(reductionRate * 100)}%`,
    },
  };
}

// ============================================================
// レポート生成
// ============================================================

function generateMarkdownReport(report: AggregateReport): string {
  let md = `# 専門家評価レポート

生成日時: ${report.generatedAt}

## 概要

- 総ケース数: ${report.totalCases}
- 評価済みケース: ${report.scoredCases}

## 自動評価メトリクス

| 指標 | 値 |
|------|-----|
| 平均生成時間 | ${report.automaticMetrics.averageGenerationTime}ms |
| 平均トークン数 | ${report.automaticMetrics.averageTotalTokens} |
| 構文成功率 | ${report.automaticMetrics.syntaxSuccessRate}% |
| コンポーネント一致率 | ${report.automaticMetrics.componentMatchRate}% |

## トークン削減分析

| 指標 | 値 |
|------|-----|
| Jelly基準値 | ${report.tokenAnalysis.jellyBaseline} |
| 本システム平均 | ${report.tokenAnalysis.ourAverage} |
| 削減率 | ${report.tokenAnalysis.reductionPercentage} |

## 専門家評価スコア (1-5)

| 項目 | 平均 | 標準偏差 |
|------|------|----------|
| ボトルネック診断 | ${report.expertMetrics.averageBottleneckDiagnosis} | ${report.expertMetrics.standardDeviations.bottleneckDiagnosis} |
| コンポーネント選択 | ${report.expertMetrics.averageComponentSelection} | ${report.expertMetrics.standardDeviations.componentSelection} |
| フロー構成 | ${report.expertMetrics.averageFlowLogic} | ${report.expertMetrics.standardDeviations.flowLogic} |
| リアクティビティ設計 | ${report.expertMetrics.averageReactivityDesign} | ${report.expertMetrics.standardDeviations.reactivityDesign} |
| **総合評価** | **${report.expertMetrics.averageOverallScore}** | ${report.expertMetrics.standardDeviations.overallScore} |

## カテゴリ別分析

| カテゴリ | ケース数 | 平均スコア | 平均トークン |
|----------|----------|------------|--------------|
`;

  for (const [cat, data] of Object.entries(report.categoryAnalysis)) {
    md += `| ${cat} | ${data.count} | ${data.averageOverall} | ${data.averageTokens} |\n`;
  }

  md += `
## ケース別詳細

| ケースID | カテゴリ | 優先度 | 総合スコア | トークン | Widget数 |
|----------|----------|--------|------------|----------|----------|
`;

  for (const detail of report.caseDetails) {
    md += `| ${detail.caseId} | ${detail.category} | ${detail.priority} | ${detail.expertScores.overallScore} | ${detail.totalTokens} | ${detail.widgetCount} |\n`;
  }

  md += `
## 評価コメント

`;

  for (const detail of report.caseDetails) {
    if (detail.comments) {
      md += `### ${detail.caseId}\n${detail.comments}\n\n`;
    }
  }

  return md;
}

function generateCSVReport(report: AggregateReport): string {
  const headers = [
    'caseId',
    'category',
    'priority',
    'generationTime',
    'totalTokens',
    'widgetCount',
    'bottleneckDiagnosis',
    'componentSelection',
    'flowLogic',
    'reactivityDesign',
    'overallScore',
  ];

  let csv = headers.join(',') + '\n';

  for (const detail of report.caseDetails) {
    csv +=
      [
        detail.caseId,
        detail.category,
        detail.priority,
        detail.generationTime,
        detail.totalTokens,
        detail.widgetCount,
        detail.expertScores.bottleneckDiagnosis,
        detail.expertScores.componentSelection,
        detail.expertScores.flowLogic,
        detail.expertScores.reactivityDesign,
        detail.expertScores.overallScore,
      ].join(',') + '\n';
  }

  return csv;
}

// ============================================================
// メイン
// ============================================================

function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  専門家評価スコア集計');
  console.log('═══════════════════════════════════════════════════════════════');

  const results = loadScoredResults();

  if (results.length === 0) {
    console.log('\n❌ 評価済みの結果がありません');
    console.log('   まずevaluation_form.tsで評価を行ってください');
    return;
  }

  console.log(`\n📊 評価済みケース: ${results.length}件`);

  const report = aggregateScores(results);

  // JSONレポート保存
  const jsonPath = join(RESULTS_DIR, 'aggregate_report.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📁 JSONレポート: ${jsonPath}`);

  // Markdownレポート保存
  const mdPath = join(RESULTS_DIR, 'aggregate_report.md');
  writeFileSync(mdPath, generateMarkdownReport(report), 'utf-8');
  console.log(`📁 Markdownレポート: ${mdPath}`);

  // CSVレポート保存
  const csvPath = join(RESULTS_DIR, 'expert_scores.csv');
  writeFileSync(csvPath, generateCSVReport(report), 'utf-8');
  console.log(`📁 CSVレポート: ${csvPath}`);

  // サマリー表示
  console.log(`
═══════════════════════════════════════════════════════════════
  集計結果サマリー
═══════════════════════════════════════════════════════════════

📊 自動評価:
  平均生成時間: ${report.automaticMetrics.averageGenerationTime}ms
  平均トークン: ${report.automaticMetrics.averageTotalTokens}
  構文成功率: ${report.automaticMetrics.syntaxSuccessRate}%

📉 トークン削減:
  Jelly基準: ${report.tokenAnalysis.jellyBaseline}
  本システム: ${report.tokenAnalysis.ourAverage}
  削減率: ${report.tokenAnalysis.reductionPercentage}

⭐ 専門家評価 (平均):
  ボトルネック診断: ${report.expertMetrics.averageBottleneckDiagnosis}/5
  コンポーネント選択: ${report.expertMetrics.averageComponentSelection}/5
  フロー構成: ${report.expertMetrics.averageFlowLogic}/5
  リアクティビティ: ${report.expertMetrics.averageReactivityDesign}/5
  総合評価: ${report.expertMetrics.averageOverallScore}/5
`);
}

main();
