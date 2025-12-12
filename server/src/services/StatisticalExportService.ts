/**
 * Statistical Export Service
 *
 * 統計検定結果のエクスポート機能。
 * Markdown表とCSV形式をサポート。
 *
 * @see specs/system-design/statistical-analysis-design.md
 */

import type {
  BatchStatisticsResult,
  StatisticalTestResult,
  ExportFormat,
  ExportOptions,
} from '../types/statistics.types';

// ========================================
// Markdown エクスポート
// ========================================

/**
 * 統計結果をMarkdown形式にエクスポート
 */
export function exportToMarkdown(
  result: BatchStatisticsResult,
  options?: Partial<ExportOptions>
): string {
  const decimalPlaces = options?.decimalPlaces ?? 3;
  const includeEffectSize = options?.includeEffectSize ?? true;

  const lines: string[] = [];

  // ヘッダー
  lines.push('# 統計検定結果');
  lines.push('');
  lines.push(`- **バッチID**: \`${result.batchId}\``);
  lines.push(`- **実験ID**: ${result.experimentId}`);
  lines.push(`- **生成日時**: ${result.generatedAt}`);
  lines.push(`- **有意水準**: α = ${result.alpha}`);
  lines.push(`- **補正後有意水準**: α' = ${result.alphaCorrected} (${result.correctionMethod}補正, ${result.totalComparisons}比較)`);
  lines.push('');

  // サマリー
  lines.push('## サマリー');
  lines.push('');
  lines.push('| 指標タイプ | 総検定数 | 有意 (p<0.05) | 有意 (補正後) |');
  lines.push('|-----------|---------|--------------|--------------|');
  lines.push(
    `| Layer1 (構造健全性) | ${result.summary.layer1.totalTests} | ${result.summary.layer1.significantCount} | ${result.summary.layer1.significantCorrectedCount} |`
  );
  lines.push(
    `| Layer4 (実用性) | ${result.summary.layer4.totalTests} | ${result.summary.layer4.significantCount} | ${result.summary.layer4.significantCorrectedCount} |`
  );
  lines.push('');

  // Layer1 検定結果（指標ごと）
  lines.push('## Layer1: 構造健全性 - ペアワイズ比較');
  lines.push('');

  const layer1Metrics = [...new Set(result.layer1Comparisons.map((c) => c.metric))];
  for (const metric of layer1Metrics) {
    const comparisons = result.layer1Comparisons.filter((c) => c.metric === metric);
    lines.push(`### ${metric} (${getMetricDescription(metric)})`);
    lines.push('');
    lines.push(formatComparisonTable(comparisons, 'z-test', decimalPlaces, includeEffectSize));
    lines.push('');
  }

  // Layer4 検定結果（指標ごと）
  lines.push('## Layer4: 実用性 - ペアワイズ比較');
  lines.push('');

  const layer4Metrics = [...new Set(result.layer4Comparisons.map((c) => c.metric))];
  for (const metric of layer4Metrics) {
    const comparisons = result.layer4Comparisons.filter((c) => c.metric === metric);
    lines.push(`### ${metric} (${getMetricDescription(metric)})`);
    lines.push('');
    lines.push(formatComparisonTable(comparisons, 'mann-whitney-u', decimalPlaces, includeEffectSize));
    lines.push('');
  }

  // 凡例
  lines.push('---');
  lines.push('');
  lines.push('**凡例**:');
  lines.push('- `*`: p < 0.05 (有意)');
  lines.push('- `**`: p < 0.005 (Bonferroni補正後も有意)');
  lines.push('- 効果量: N=negligible, S=small, M=medium, L=large');
  lines.push('');

  return lines.join('\n');
}

/**
 * 比較テーブルをMarkdown形式でフォーマット
 */
function formatComparisonTable(
  comparisons: StatisticalTestResult[],
  testType: 'z-test' | 'mann-whitney-u',
  decimalPlaces: number,
  includeEffectSize: boolean
): string {
  const lines: string[] = [];

  // ヘッダー
  if (testType === 'z-test') {
    if (includeEffectSize) {
      lines.push('| 比較 | M1 (n) | M2 (n) | z | p値 | 有意 | Cohen\'s h |');
      lines.push('|------|--------|--------|---|-----|------|-----------|');
    } else {
      lines.push('| 比較 | M1 (n) | M2 (n) | z | p値 | 有意 |');
      lines.push('|------|--------|--------|---|-----|------|');
    }
  } else {
    if (includeEffectSize) {
      lines.push('| 比較 | M1 Mdn (n) | M2 Mdn (n) | U | p値 | 有意 | r |');
      lines.push('|------|------------|------------|---|-----|------|---|');
    } else {
      lines.push('| 比較 | M1 Mdn (n) | M2 Mdn (n) | U | p値 | 有意 |');
      lines.push('|------|------------|------------|---|-----|------|');
    }
  }

  // データ行
  for (const c of comparisons) {
    const comparison = `${c.model1} vs ${c.model2}`;
    const sig = c.significantCorrected ? '**' : c.significant ? '*' : '-';

    if (testType === 'z-test') {
      const m1Value = `${(c.model1Stats.value * 100).toFixed(1)}% (${c.model1Stats.n})`;
      const m2Value = `${(c.model2Stats.value * 100).toFixed(1)}% (${c.model2Stats.n})`;
      const zValue = c.testStatistic.toFixed(2);
      const pValue = formatPValue(c.pValue, decimalPlaces);

      if (includeEffectSize) {
        const effect = `${c.effectSize.toFixed(2)} (${c.effectSizeInterpretation.charAt(0).toUpperCase()})`;
        lines.push(`| ${comparison} | ${m1Value} | ${m2Value} | ${zValue} | ${pValue} | ${sig} | ${effect} |`);
      } else {
        lines.push(`| ${comparison} | ${m1Value} | ${m2Value} | ${zValue} | ${pValue} | ${sig} |`);
      }
    } else {
      const m1Value = `${c.model1Stats.value.toFixed(0)} (${c.model1Stats.n})`;
      const m2Value = `${c.model2Stats.value.toFixed(0)} (${c.model2Stats.n})`;
      const uValue = c.testStatistic.toFixed(0);
      const pValue = formatPValue(c.pValue, decimalPlaces);

      if (includeEffectSize) {
        const effect = `${c.effectSize.toFixed(2)} (${c.effectSizeInterpretation.charAt(0).toUpperCase()})`;
        lines.push(`| ${comparison} | ${m1Value} | ${m2Value} | ${uValue} | ${pValue} | ${sig} | ${effect} |`);
      } else {
        lines.push(`| ${comparison} | ${m1Value} | ${m2Value} | ${uValue} | ${pValue} | ${sig} |`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * p値をフォーマット
 */
function formatPValue(p: number, decimalPlaces: number): string {
  if (p < 0.001) {
    return '<0.001';
  }
  return p.toFixed(decimalPlaces);
}

/**
 * 指標の説明を取得
 */
function getMetricDescription(metric: string): string {
  const descriptions: Record<string, string> = {
    VR: 'DSL妥当率',
    TCR: '型整合率',
    RRR: '参照整合率',
    CDR: '循環依存なし率',
    RGR: '再生成なし率',
    W2WR_SR: 'W2WR成功率',
    RC_SR: 'React変換成功率',
    JA_SR: 'Jotai Atom成功率',
    LAT: '平均レイテンシ',
    COST: '推定APIコスト',
  };
  return descriptions[metric] ?? metric;
}

// ========================================
// CSV エクスポート
// ========================================

/**
 * 統計結果をCSV形式にエクスポート
 */
export function exportToCSV(
  result: BatchStatisticsResult,
  options?: Partial<ExportOptions>
): string {
  const decimalPlaces = options?.decimalPlaces ?? 6;

  const lines: string[] = [];

  // ヘッダー
  lines.push([
    'metric',
    'test_type',
    'model1',
    'model2',
    'model1_n',
    'model1_value',
    'model1_successes',
    'model2_n',
    'model2_value',
    'model2_successes',
    'test_statistic',
    'p_value',
    'p_value_corrected',
    'significant',
    'significant_corrected',
    'effect_size',
    'effect_size_interpretation',
  ].join(','));

  // Layer1データ
  for (const c of result.layer1Comparisons) {
    lines.push([
      c.metric,
      c.testType,
      c.model1,
      c.model2,
      c.model1Stats.n,
      c.model1Stats.value.toFixed(decimalPlaces),
      c.model1Stats.successes ?? '',
      c.model2Stats.n,
      c.model2Stats.value.toFixed(decimalPlaces),
      c.model2Stats.successes ?? '',
      c.testStatistic.toFixed(decimalPlaces),
      c.pValue.toFixed(decimalPlaces),
      c.pValueCorrected.toFixed(decimalPlaces),
      c.significant,
      c.significantCorrected,
      c.effectSize.toFixed(decimalPlaces),
      c.effectSizeInterpretation,
    ].join(','));
  }

  // Layer4データ
  for (const c of result.layer4Comparisons) {
    lines.push([
      c.metric,
      c.testType,
      c.model1,
      c.model2,
      c.model1Stats.n,
      c.model1Stats.value.toFixed(decimalPlaces),
      '',
      c.model2Stats.n,
      c.model2Stats.value.toFixed(decimalPlaces),
      '',
      c.testStatistic.toFixed(decimalPlaces),
      c.pValue.toFixed(decimalPlaces),
      c.pValueCorrected.toFixed(decimalPlaces),
      c.significant,
      c.significantCorrected,
      c.effectSize.toFixed(decimalPlaces),
      c.effectSizeInterpretation,
    ].join(','));
  }

  return lines.join('\n');
}

// ========================================
// サマリーテーブル（論文用）
// ========================================

/**
 * 論文用のサマリーテーブルを生成（Markdown）
 */
export function exportSummaryTable(
  result: BatchStatisticsResult
): string {
  const lines: string[] = [];

  lines.push('## 統計的有意差サマリー');
  lines.push('');
  lines.push('以下の表は、各モデルペアで統計的に有意な差が検出された指標を示す。');
  lines.push('');

  // 有意な結果のみ抽出
  const significantResults = [
    ...result.layer1Comparisons,
    ...result.layer4Comparisons,
  ].filter((c) => c.significantCorrected);

  if (significantResults.length === 0) {
    lines.push('Bonferroni補正後に有意な差が検出された比較はありませんでした。');
    return lines.join('\n');
  }

  lines.push('| 比較 | 指標 | M1値 | M2値 | p値(補正後) | 効果量 |');
  lines.push('|------|------|------|------|-------------|--------|');

  for (const c of significantResults) {
    const comparison = `${c.model1} vs ${c.model2}`;
    const m1Value =
      c.testType === 'z-test'
        ? `${(c.model1Stats.value * 100).toFixed(1)}%`
        : c.model1Stats.value.toFixed(0);
    const m2Value =
      c.testType === 'z-test'
        ? `${(c.model2Stats.value * 100).toFixed(1)}%`
        : c.model2Stats.value.toFixed(0);
    const pValue = formatPValue(c.pValueCorrected, 3);
    const effect = `${c.effectSize.toFixed(2)} (${c.effectSizeInterpretation})`;

    lines.push(`| ${comparison} | ${c.metric} | ${m1Value} | ${m2Value} | ${pValue} | ${effect} |`);
  }

  return lines.join('\n');
}

// ========================================
// Factory
// ========================================

export interface StatisticalExporter {
  toMarkdown(result: BatchStatisticsResult, options?: Partial<ExportOptions>): string;
  toCSV(result: BatchStatisticsResult, options?: Partial<ExportOptions>): string;
  toSummaryTable(result: BatchStatisticsResult): string;
}

export function createStatisticalExporter(): StatisticalExporter {
  return {
    toMarkdown: exportToMarkdown,
    toCSV: exportToCSV,
    toSummaryTable: exportSummaryTable,
  };
}
