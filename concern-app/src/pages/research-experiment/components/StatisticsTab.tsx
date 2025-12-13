/**
 * StatisticsTab.tsx
 *
 * 統計検定結果を表示するタブコンポーネント
 * z検定（成功率系）とMann-Whitney U検定（実数値系）の結果を表示
 *
 * @see specs/system-design/statistical-analysis-design.md
 */

import { useState, useEffect } from 'react';
import {
  getBatchExperimentApi,
  type BatchStatisticsResult,
  type StatisticalTestResult,
} from '../../../services/BatchExperimentApiService';

interface StatisticsTabProps {
  batchId: string;
  refreshKey?: number; // 親からの更新トリガー
}

const LAYER1_METRICS = ['VR', 'TCR', 'RRR', 'CDR', 'RGR', 'W2WR_SR', 'RC_SR', 'JA_SR'];
const LAYER4_METRICS = ['LAT', 'COST'];

const METRIC_DESCRIPTIONS: Record<string, string> = {
  VR: 'DSL妥当率',
  TCR: '型整合率',
  RRR: '参照整合率',
  CDR: '循環依存なし率',
  RGR: '再生成なし率',
  W2WR_SR: 'W2WR成功率',
  RC_SR: 'React変換成功率',
  JA_SR: 'Jotai Atom成功率',
  LAT: '平均レイテンシ (ms)',
  COST: '推定APIコスト (JPY)',
};

export default function StatisticsTab({ batchId, refreshKey }: StatisticsTabProps) {
  const api = getBatchExperimentApi();

  const [statistics, setStatistics] = useState<BatchStatisticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルター
  const [selectedLayer1Metric, setSelectedLayer1Metric] = useState<string>('VR');
  const [selectedLayer4Metric, setSelectedLayer4Metric] = useState<string>('LAT');

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    api
      .getStatistics(batchId)
      .then(setStatistics)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [api, batchId, refreshKey]); // refreshKeyが変わると再取得

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        統計データを計算中...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
        }}
      >
        {error}
      </div>
    );
  }

  if (!statistics) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
        統計データがありません
      </div>
    );
  }

  const layer1Comparisons = statistics.layer1Comparisons.filter(
    (c) => c.metric === selectedLayer1Metric
  );
  const layer4Comparisons = statistics.layer4Comparisons.filter(
    (c) => c.metric === selectedLayer4Metric
  );

  return (
    <div>
      {/* 検定設定 */}
      <section
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
        }}
      >
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>検定設定</h3>
        <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
          <div>
            <span style={{ color: '#666' }}>有意水準: </span>
            <strong>α = {statistics.alpha}</strong>
          </div>
          <div>
            <span style={{ color: '#666' }}>補正後有意水準: </span>
            <strong>α' = {statistics.alphaCorrected}</strong>
            <span style={{ marginLeft: '8px', color: '#666' }}>
              ({statistics.correctionMethod}補正, {statistics.totalComparisons}比較)
            </span>
          </div>
        </div>
      </section>

      {/* サマリー */}
      <section
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}
      >
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>サマリー</h3>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#e0e0e0' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>指標タイプ</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>総検定数</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>有意 (p&lt;0.05)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>有意 (補正後)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '8px' }}>Layer1 (構造健全性)</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                {statistics.summary.layer1.totalTests}
              </td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                {statistics.summary.layer1.significantCount}
              </td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                {statistics.summary.layer1.significantCorrectedCount}
              </td>
            </tr>
            <tr style={{ backgroundColor: '#fafafa' }}>
              <td style={{ padding: '8px' }}>Layer4 (実用性)</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                {statistics.summary.layer4.totalTests}
              </td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                {statistics.summary.layer4.significantCount}
              </td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                {statistics.summary.layer4.significantCorrectedCount}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Layer1検定結果 */}
      <section style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px',
          }}
        >
          <h3 style={{ fontSize: '16px', margin: 0 }}>Layer1: 構造健全性</h3>
          <select
            value={selectedLayer1Metric}
            onChange={(e) => setSelectedLayer1Metric(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          >
            {LAYER1_METRICS.map((metric) => (
              <option key={metric} value={metric}>
                {metric} ({METRIC_DESCRIPTIONS[metric]})
              </option>
            ))}
          </select>
        </div>
        <ComparisonTable comparisons={layer1Comparisons} testType="z-test" />
      </section>

      {/* Layer4検定結果 */}
      <section style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px',
          }}
        >
          <h3 style={{ fontSize: '16px', margin: 0 }}>Layer4: 実用性</h3>
          <select
            value={selectedLayer4Metric}
            onChange={(e) => setSelectedLayer4Metric(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          >
            {LAYER4_METRICS.map((metric) => (
              <option key={metric} value={metric}>
                {metric} ({METRIC_DESCRIPTIONS[metric]})
              </option>
            ))}
          </select>
        </div>
        <ComparisonTable comparisons={layer4Comparisons} testType="mann-whitney-u" />
      </section>

      {/* エクスポート */}
      <section>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>統計データエクスポート</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href={api.getStatisticsExportUrl(batchId, 'markdown')}
            download
            style={{
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            Markdown
          </a>
          <a
            href={api.getStatisticsExportUrl(batchId, 'csv')}
            download
            style={{
              padding: '10px 20px',
              backgroundColor: '#388e3c',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            CSV
          </a>
          <a
            href={api.getStatisticsExportUrl(batchId, 'summary')}
            download
            style={{
              padding: '10px 20px',
              backgroundColor: '#f57c00',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            サマリー (有意のみ)
          </a>
        </div>
      </section>

      {/* 凡例 */}
      <section
        style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666',
        }}
      >
        <strong>凡例:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>
            <span style={{ color: '#ffc107' }}>*</span>: p &lt; 0.05 (有意)
          </li>
          <li>
            <span style={{ color: '#4caf50' }}>**</span>: p &lt; 0.005 (Bonferroni補正後も有意)
          </li>
          <li>効果量: N=negligible, S=small, M=medium, L=large</li>
        </ul>
      </section>
    </div>
  );
}

// ========================================
// ComparisonTable Component
// ========================================

interface ComparisonTableProps {
  comparisons: StatisticalTestResult[];
  testType: 'z-test' | 'mann-whitney-u';
}

function ComparisonTable({ comparisons, testType }: ComparisonTableProps) {
  const formatPValue = (p: number) => {
    if (p < 0.001) return '<0.001';
    return p.toFixed(3);
  };

  const getEffectSizeLabel = (interpretation: string) => {
    const labels: Record<string, string> = {
      negligible: 'N',
      small: 'S',
      medium: 'M',
      large: 'L',
    };
    return labels[interpretation] ?? interpretation;
  };

  const getRowStyle = (c: StatisticalTestResult): React.CSSProperties => {
    if (c.significantCorrected) {
      return { backgroundColor: '#e8f5e9' }; // green
    }
    if (c.significant) {
      return { backgroundColor: '#fff8e1' }; // yellow
    }
    return {};
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#e0e0e0' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>比較</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>
              {testType === 'z-test' ? 'M1 (n)' : 'M1 Mdn (n)'}
            </th>
            <th style={{ padding: '10px', textAlign: 'right' }}>
              {testType === 'z-test' ? 'M2 (n)' : 'M2 Mdn (n)'}
            </th>
            <th style={{ padding: '10px', textAlign: 'right' }}>
              {testType === 'z-test' ? 'z' : 'U'}
            </th>
            <th style={{ padding: '10px', textAlign: 'right' }}>p値</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>有意</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>効果量</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c, idx) => {
            const comparison = `${c.model1} vs ${c.model2}`;
            const sig = c.significantCorrected ? '**' : c.significant ? '*' : '-';

            let m1Value: string;
            let m2Value: string;
            if (testType === 'z-test') {
              m1Value = `${(c.model1Stats.value * 100).toFixed(1)}% (${c.model1Stats.n})`;
              m2Value = `${(c.model2Stats.value * 100).toFixed(1)}% (${c.model2Stats.n})`;
            } else {
              m1Value = `${c.model1Stats.value.toFixed(0)} (${c.model1Stats.n})`;
              m2Value = `${c.model2Stats.value.toFixed(0)} (${c.model2Stats.n})`;
            }

            return (
              <tr key={`${c.model1}-${c.model2}`} style={getRowStyle(c)}>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                  {comparison}
                </td>
                <td
                  style={{
                    padding: '10px',
                    textAlign: 'right',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  {m1Value}
                </td>
                <td
                  style={{
                    padding: '10px',
                    textAlign: 'right',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  {m2Value}
                </td>
                <td
                  style={{
                    padding: '10px',
                    textAlign: 'right',
                    borderBottom: '1px solid #eee',
                    fontFamily: 'monospace',
                  }}
                >
                  {testType === 'z-test'
                    ? c.testStatistic.toFixed(2)
                    : c.testStatistic.toFixed(0)}
                </td>
                <td
                  style={{
                    padding: '10px',
                    textAlign: 'right',
                    borderBottom: '1px solid #eee',
                    fontFamily: 'monospace',
                  }}
                >
                  {formatPValue(c.pValue)}
                </td>
                <td
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    borderBottom: '1px solid #eee',
                    fontWeight: 'bold',
                    color: c.significantCorrected
                      ? '#4caf50'
                      : c.significant
                      ? '#ffc107'
                      : '#999',
                  }}
                >
                  {sig}
                </td>
                <td
                  style={{
                    padding: '10px',
                    textAlign: 'right',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  {c.effectSize.toFixed(2)}
                  <span
                    style={{
                      marginLeft: '4px',
                      padding: '2px 6px',
                      backgroundColor:
                        c.effectSizeInterpretation === 'large'
                          ? '#e3f2fd'
                          : c.effectSizeInterpretation === 'medium'
                          ? '#f3e5f5'
                          : '#f5f5f5',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  >
                    {getEffectSizeLabel(c.effectSizeInterpretation)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
