/**
 * Statistical Analysis Service
 *
 * Layer1/Layer4自動評価実験の統計検定サービス。
 * z検定（成功率比較）とMann-Whitney U検定（分布比較）を実施。
 *
 * @see specs/system-design/statistical-analysis-design.md
 */

import { db } from '../database/index';
import { batchExecutions, experimentTrialLogs } from '../database/schema';
import { eq } from 'drizzle-orm';
import type {
  ZTestInput,
  ZTestResult,
  MannWhitneyUInput,
  MannWhitneyUResult,
  StatisticalTestResult,
  BatchStatisticsResult,
  EffectSizeInterpretation,
  SampleStats,
  LAYER1_METRICS,
  LAYER4_METRICS,
  ALL_MODEL_PAIRS,
} from '../types/statistics.types';
import type { Layer1Metrics, Layer4Metrics } from '../types/experiment-trial.types';

// ========================================
// 定数
// ========================================

const ALPHA = 0.05;
const BONFERRONI_COMPARISONS = 10; // 5モデル → C(5,2) = 10ペア
const ALPHA_CORRECTED = ALPHA / BONFERRONI_COMPARISONS; // 0.005

// Layer1指標（成功率系）
const LAYER1_METRIC_NAMES = [
  'VR',
  'TCR',
  'RRR',
  'CDR',
  'RGR',
  'W2WR_SR',
  'RC_SR',
  'JA_SR',
] as const;

// Layer4指標（実数値系）
const LAYER4_METRIC_NAMES = ['LAT', 'COST'] as const;

// モデルペア
const MODEL_PAIRS = [
  { model1: 'A', model2: 'B' },
  { model1: 'A', model2: 'C' },
  { model1: 'A', model2: 'D' },
  { model1: 'A', model2: 'E' },
  { model1: 'B', model2: 'C' },
  { model1: 'B', model2: 'D' },
  { model1: 'B', model2: 'E' },
  { model1: 'C', model2: 'D' },
  { model1: 'C', model2: 'E' },
  { model1: 'D', model2: 'E' },
];

// ========================================
// 数学ユーティリティ
// ========================================

/**
 * 標準正規分布の累積分布関数（CDF）
 * Abramowitz and Stegun approximation
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);

  const t = 1.0 / (1.0 + p * absZ);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * 両側検定のp値を計算
 */
function twoTailedPValue(z: number): number {
  return 2 * (1 - normalCDF(Math.abs(z)));
}

/**
 * 中央値を計算
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ========================================
// z検定（2標本比例検定）
// ========================================

/**
 * 2標本比例z検定を実行
 *
 * @param input - 検定入力（成功数とサンプルサイズ）
 * @returns z検定結果
 */
export function performZTest(input: ZTestInput): ZTestResult {
  const { successes1, n1, successes2, n2 } = input;

  // 比率を計算
  const p1 = n1 > 0 ? successes1 / n1 : 0;
  const p2 = n2 > 0 ? successes2 / n2 : 0;

  // プールした比率
  const pooledProportion = (successes1 + successes2) / (n1 + n2);

  // 標準誤差
  const se = Math.sqrt(
    pooledProportion * (1 - pooledProportion) * (1 / n1 + 1 / n2)
  );

  // z統計量（se=0の場合は0）
  const z = se > 0 ? (p1 - p2) / se : 0;

  // p値（両側検定）
  const pValue = twoTailedPValue(z);

  // Cohen's h 効果量
  // h = 2 * arcsin(sqrt(p1)) - 2 * arcsin(sqrt(p2))
  const phi1 = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, p1))));
  const phi2 = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, p2))));
  const cohensH = phi1 - phi2;

  return {
    z,
    pValue,
    pooledProportion,
    p1,
    p2,
    cohensH,
  };
}

// ========================================
// Mann-Whitney U検定
// ========================================

/**
 * Mann-Whitney U検定を実行
 *
 * @param input - 検定入力（2群の値）
 * @returns U検定結果
 */
export function performMannWhitneyU(input: MannWhitneyUInput): MannWhitneyUResult {
  const { values1, values2 } = input;
  const n1 = values1.length;
  const n2 = values2.length;

  if (n1 === 0 || n2 === 0) {
    return {
      U: 0,
      U1: 0,
      U2: 0,
      z: 0,
      pValue: 1,
      median1: 0,
      median2: 0,
      rankBiserialR: 0,
    };
  }

  // 統合してランク付け
  const combined: Array<{ value: number; group: 1 | 2; originalIndex: number }> = [
    ...values1.map((v, i) => ({ value: v, group: 1 as const, originalIndex: i })),
    ...values2.map((v, i) => ({ value: v, group: 2 as const, originalIndex: i })),
  ];

  // 値でソート
  combined.sort((a, b) => a.value - b.value);

  // ランクを割り当て（同順位は平均ランク）
  const ranks: number[] = new Array(combined.length);
  let i = 0;
  while (i < combined.length) {
    let j = i;
    // 同じ値の範囲を見つける
    while (j < combined.length && combined[j].value === combined[i].value) {
      j++;
    }
    // 平均ランクを計算（ランクは1-indexed）
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[k] = avgRank;
    }
    i = j;
  }

  // 各グループのランク和を計算
  let R1 = 0;
  let R2 = 0;
  for (let idx = 0; idx < combined.length; idx++) {
    if (combined[idx].group === 1) {
      R1 += ranks[idx];
    } else {
      R2 += ranks[idx];
    }
  }

  // U統計量
  const U1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - R1;
  const U2 = n1 * n2 + (n2 * (n2 + 1)) / 2 - R2;
  const U = Math.min(U1, U2);

  // 正規近似
  const meanU = (n1 * n2) / 2;
  const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);

  // 連続性補正を適用したz統計量
  const z = stdU > 0 ? (U - meanU) / stdU : 0;

  // p値（両側検定）
  const pValue = twoTailedPValue(z);

  // 中央値
  const median1 = median(values1);
  const median2 = median(values2);

  // rank-biserial correlation（効果量）
  // r = 1 - (2*U) / (n1*n2)
  const rankBiserialR = 1 - (2 * U) / (n1 * n2);

  return {
    U,
    U1,
    U2,
    z,
    pValue,
    median1,
    median2,
    rankBiserialR,
  };
}

// ========================================
// 効果量の解釈
// ========================================

/**
 * Cohen's h の解釈
 */
function interpretCohensH(h: number): EffectSizeInterpretation {
  const absH = Math.abs(h);
  if (absH < 0.2) return 'negligible';
  if (absH < 0.5) return 'small';
  if (absH < 0.8) return 'medium';
  return 'large';
}

/**
 * rank-biserial correlation の解釈
 */
function interpretRankBiserial(r: number): EffectSizeInterpretation {
  const absR = Math.abs(r);
  if (absR < 0.1) return 'negligible';
  if (absR < 0.3) return 'small';
  if (absR < 0.5) return 'medium';
  return 'large';
}

// ========================================
// データ取得ヘルパー
// ========================================

interface TrialLogRecord {
  id: string;
  modelConfig: string;
  stage: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  dslErrors: unknown;
  renderErrors: unknown;
  w2wrErrors: unknown;
  reactComponentErrors: unknown;
  jotaiAtomErrors: unknown;
  typeErrorCount: number;
  referenceErrorCount: number;
  cycleDetected: boolean;
  regenerated: boolean;
  runtimeError: boolean;
}

/**
 * Layer1指標の成功/失敗をカウント
 */
function countLayer1Successes(
  logs: TrialLogRecord[],
  metric: string
): { successes: number; total: number } {
  const total = logs.length;
  let successes = 0;

  for (const log of logs) {
    let isSuccess = false;
    switch (metric) {
      case 'VR':
        isSuccess = log.dslErrors === null && log.renderErrors === null;
        break;
      case 'TCR':
        isSuccess = log.typeErrorCount === 0;
        break;
      case 'RRR':
        isSuccess = log.referenceErrorCount === 0;
        break;
      case 'CDR':
        // CDRは「循環なし」を成功とする（低い方が良い）
        isSuccess = !log.cycleDetected;
        break;
      case 'RGR':
        // RGRは「再生成なし」を成功とする（低い方が良い）
        isSuccess = !log.regenerated;
        break;
      case 'W2WR_SR':
        isSuccess = log.w2wrErrors === null;
        break;
      case 'RC_SR':
        isSuccess = log.reactComponentErrors === null;
        break;
      case 'JA_SR':
        isSuccess = log.jotaiAtomErrors === null;
        break;
    }
    if (isSuccess) successes++;
  }

  return { successes, total };
}

/**
 * Layer4指標の値を抽出
 */
function extractLayer4Values(
  logs: TrialLogRecord[],
  metric: string
): number[] {
  switch (metric) {
    case 'LAT':
      return logs.map((log) => log.latencyMs);
    case 'COST':
      // COSTはトークン数から計算（簡易版）
      return logs.map((log) => {
        const inputCost = (log.inputTokens / 1000) * 0.01;
        const outputCost = (log.outputTokens / 1000) * 0.03;
        return (inputCost + outputCost) * 150; // JPY
      });
    default:
      return [];
  }
}

// ========================================
// メインサービス
// ========================================

export class StatisticalAnalysisService {
  /**
   * バッチの全ペアワイズ比較を実行
   */
  async runAllPairwiseComparisons(batchId: string): Promise<BatchStatisticsResult | null> {
    // バッチ情報を取得
    const [batch] = await db
      .select()
      .from(batchExecutions)
      .where(eq(batchExecutions.id, batchId));

    if (!batch) {
      return null;
    }

    // 試行ログを取得
    const trialLogs = await db
      .select()
      .from(experimentTrialLogs)
      .where(eq(experimentTrialLogs.batchId, batchId));

    if (trialLogs.length === 0) {
      return null;
    }

    // モデル別にグループ化
    const logsByModel: Record<string, TrialLogRecord[]> = {};
    for (const log of trialLogs) {
      if (!logsByModel[log.modelConfig]) {
        logsByModel[log.modelConfig] = [];
      }
      logsByModel[log.modelConfig].push(log as TrialLogRecord);
    }

    const layer1Comparisons: StatisticalTestResult[] = [];
    const layer4Comparisons: StatisticalTestResult[] = [];

    // Layer1指標のペアワイズ比較（z検定）
    for (const metric of LAYER1_METRIC_NAMES) {
      for (const pair of MODEL_PAIRS) {
        const logs1 = logsByModel[pair.model1] ?? [];
        const logs2 = logsByModel[pair.model2] ?? [];

        const count1 = countLayer1Successes(logs1, metric);
        const count2 = countLayer1Successes(logs2, metric);

        const result = performZTest({
          successes1: count1.successes,
          n1: count1.total,
          successes2: count2.successes,
          n2: count2.total,
        });

        const pValueCorrected = Math.min(result.pValue * BONFERRONI_COMPARISONS, 1);

        layer1Comparisons.push({
          metric,
          testType: 'z-test',
          model1: pair.model1,
          model2: pair.model2,
          model1Stats: {
            n: count1.total,
            value: result.p1,
            successes: count1.successes,
          },
          model2Stats: {
            n: count2.total,
            value: result.p2,
            successes: count2.successes,
          },
          testStatistic: result.z,
          pValue: result.pValue,
          pValueCorrected,
          significant: result.pValue < ALPHA,
          significantCorrected: result.pValue < ALPHA_CORRECTED,
          effectSize: result.cohensH,
          effectSizeInterpretation: interpretCohensH(result.cohensH),
        });
      }
    }

    // Layer4指標のペアワイズ比較（Mann-Whitney U検定）
    for (const metric of LAYER4_METRIC_NAMES) {
      for (const pair of MODEL_PAIRS) {
        const logs1 = logsByModel[pair.model1] ?? [];
        const logs2 = logsByModel[pair.model2] ?? [];

        const values1 = extractLayer4Values(logs1, metric);
        const values2 = extractLayer4Values(logs2, metric);

        const result = performMannWhitneyU({ values1, values2 });

        const pValueCorrected = Math.min(result.pValue * BONFERRONI_COMPARISONS, 1);

        layer4Comparisons.push({
          metric,
          testType: 'mann-whitney-u',
          model1: pair.model1,
          model2: pair.model2,
          model1Stats: {
            n: values1.length,
            value: result.median1,
            values: values1,
          },
          model2Stats: {
            n: values2.length,
            value: result.median2,
            values: values2,
          },
          testStatistic: result.U,
          pValue: result.pValue,
          pValueCorrected,
          significant: result.pValue < ALPHA,
          significantCorrected: result.pValue < ALPHA_CORRECTED,
          effectSize: result.rankBiserialR,
          effectSizeInterpretation: interpretRankBiserial(result.rankBiserialR),
        });
      }
    }

    // サマリー集計
    const layer1Significant = layer1Comparisons.filter((c) => c.significant).length;
    const layer1SignificantCorrected = layer1Comparisons.filter(
      (c) => c.significantCorrected
    ).length;
    const layer4Significant = layer4Comparisons.filter((c) => c.significant).length;
    const layer4SignificantCorrected = layer4Comparisons.filter(
      (c) => c.significantCorrected
    ).length;

    return {
      batchId,
      experimentId: batch.experimentId,
      generatedAt: new Date().toISOString(),
      alpha: ALPHA,
      alphaCorrected: ALPHA_CORRECTED,
      correctionMethod: 'bonferroni',
      totalComparisons: BONFERRONI_COMPARISONS,
      layer1Comparisons,
      layer4Comparisons,
      summary: {
        layer1: {
          totalTests: layer1Comparisons.length,
          significantCount: layer1Significant,
          significantCorrectedCount: layer1SignificantCorrected,
        },
        layer4: {
          totalTests: layer4Comparisons.length,
          significantCount: layer4Significant,
          significantCorrectedCount: layer4SignificantCorrected,
        },
      },
    };
  }

  /**
   * 特定指標のペアワイズ比較結果を取得
   */
  async getMetricComparisons(
    batchId: string,
    metric: string
  ): Promise<StatisticalTestResult[] | null> {
    const result = await this.runAllPairwiseComparisons(batchId);
    if (!result) return null;

    const allComparisons = [...result.layer1Comparisons, ...result.layer4Comparisons];
    return allComparisons.filter((c) => c.metric === metric);
  }
}

// ========================================
// Factory
// ========================================

let serviceInstance: StatisticalAnalysisService | null = null;

export function getStatisticalAnalysisService(): StatisticalAnalysisService {
  if (!serviceInstance) {
    serviceInstance = new StatisticalAnalysisService();
  }
  return serviceInstance;
}
