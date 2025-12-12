/**
 * 統計分析 型定義
 * @see specs/system-design/statistical-analysis-design.md
 */

// ========================================
// 検定結果
// ========================================

/** 検定タイプ */
export type TestType = 'z-test' | 'mann-whitney-u';

/** 効果量の解釈 */
export type EffectSizeInterpretation = 'negligible' | 'small' | 'medium' | 'large';

/** サンプル統計量 */
export interface SampleStats {
  /** サンプルサイズ */
  n: number;
  /** 値（成功率 or 中央値/平均値） */
  value: number;
  /** z検定用: 成功数 */
  successes?: number;
  /** U検定用: 生データ */
  values?: number[];
}

/** 統計検定結果 */
export interface StatisticalTestResult {
  /** 指標名 (VR, LAT など) */
  metric: string;
  /** 検定タイプ */
  testType: TestType;

  /** 比較対象モデル1 */
  model1: string;
  /** 比較対象モデル2 */
  model2: string;

  /** モデル1の統計量 */
  model1Stats: SampleStats;
  /** モデル2の統計量 */
  model2Stats: SampleStats;

  /** 検定統計量 (z値 or U値) */
  testStatistic: number;
  /** p値（補正なし） */
  pValue: number;
  /** p値（Bonferroni補正後） */
  pValueCorrected: number;
  /** 有意か (p < 0.05) */
  significant: boolean;
  /** 補正後も有意か (p < α') */
  significantCorrected: boolean;

  /** 効果量 (Cohen's h or rank-biserial r) */
  effectSize: number;
  /** 効果量の解釈 */
  effectSizeInterpretation: EffectSizeInterpretation;
}

// ========================================
// バッチ統計結果
// ========================================

/** 検定サマリー */
export interface TestSummary {
  /** 総検定数 */
  totalTests: number;
  /** 有意な結果数 (p < 0.05) */
  significantCount: number;
  /** 補正後も有意な結果数 */
  significantCorrectedCount: number;
}

/** バッチ統計分析結果 */
export interface BatchStatisticsResult {
  /** バッチID */
  batchId: string;
  /** 実験ID */
  experimentId: string;
  /** 生成日時 (ISO 8601) */
  generatedAt: string;

  /** 有意水準 */
  alpha: number;
  /** 補正後有意水準 */
  alphaCorrected: number;
  /** 補正方法 */
  correctionMethod: 'bonferroni';
  /** 総比較数 */
  totalComparisons: number;

  /** Layer1検定結果（成功率系） */
  layer1Comparisons: StatisticalTestResult[];
  /** Layer4検定結果（実数値系） */
  layer4Comparisons: StatisticalTestResult[];

  /** サマリー */
  summary: {
    layer1: TestSummary;
    layer4: TestSummary;
  };
}

// ========================================
// z検定用
// ========================================

/** z検定入力 */
export interface ZTestInput {
  /** グループ1の成功数 */
  successes1: number;
  /** グループ1のサンプルサイズ */
  n1: number;
  /** グループ2の成功数 */
  successes2: number;
  /** グループ2のサンプルサイズ */
  n2: number;
}

/** z検定結果 */
export interface ZTestResult {
  /** z統計量 */
  z: number;
  /** p値（両側検定） */
  pValue: number;
  /** プールした比率 */
  pooledProportion: number;
  /** グループ1の比率 */
  p1: number;
  /** グループ2の比率 */
  p2: number;
  /** Cohen's h 効果量 */
  cohensH: number;
}

// ========================================
// Mann-Whitney U検定用
// ========================================

/** Mann-Whitney U検定入力 */
export interface MannWhitneyUInput {
  /** グループ1の値 */
  values1: number[];
  /** グループ2の値 */
  values2: number[];
}

/** Mann-Whitney U検定結果 */
export interface MannWhitneyUResult {
  /** U統計量 */
  U: number;
  /** U1 (グループ1のU) */
  U1: number;
  /** U2 (グループ2のU) */
  U2: number;
  /** z統計量（正規近似） */
  z: number;
  /** p値（両側検定） */
  pValue: number;
  /** グループ1の中央値 */
  median1: number;
  /** グループ2の中央値 */
  median2: number;
  /** rank-biserial correlation 効果量 */
  rankBiserialR: number;
}

// ========================================
// エクスポート形式
// ========================================

/** エクスポート形式 */
export type ExportFormat = 'markdown' | 'csv' | 'latex';

/** エクスポートオプション */
export interface ExportOptions {
  /** 形式 */
  format: ExportFormat;
  /** 小数点桁数 */
  decimalPlaces?: number;
  /** 効果量を含めるか */
  includeEffectSize?: boolean;
  /** 補正前p値を含めるか */
  includeUncorrectedPValue?: boolean;
}

// ========================================
// Layer1指標名（検定対象）
// ========================================

/** Layer1指標名 */
export const LAYER1_METRICS = [
  'VR',
  'TCR',
  'RRR',
  'CDR',
  'RGR',
  'W2WR_SR',
  'RC_SR',
  'JA_SR',
] as const;

export type Layer1MetricName = typeof LAYER1_METRICS[number];

/** Layer4指標名 */
export const LAYER4_METRICS = ['LAT', 'COST'] as const;

export type Layer4MetricName = typeof LAYER4_METRICS[number];

// ========================================
// モデルペア
// ========================================

/** モデルペア */
export interface ModelPair {
  model1: string;
  model2: string;
}

/** 全ペアワイズ比較（5モデル → 10ペア） */
export const ALL_MODEL_PAIRS: ModelPair[] = [
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
