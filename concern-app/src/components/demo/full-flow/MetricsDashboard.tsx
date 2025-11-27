/**
 * MetricsDashboard - メトリクス表示パネル
 *
 * Phase 4 Full-Flow: リアルタイムメトリクス表示
 */

import { useMemo } from 'react';
import type { StageMetrics, CumulativeMetrics } from './types';

interface MetricsDashboardProps {
  metrics: StageMetrics[];
  cumulative: CumulativeMetrics;
  onExport?: () => void;
}

export function MetricsDashboard({ metrics, cumulative, onExport }: MetricsDashboardProps) {
  const recentMetrics = useMemo(() => {
    return metrics.slice(-5).reverse();
  }, [metrics]);

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '0.75rem',
        padding: '1rem',
        fontSize: '0.875rem',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          borderBottom: '1px solid #334155',
          paddingBottom: '0.5rem',
        }}
      >
        <h3 style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>
          Metrics Dashboard
        </h3>
        {onExport && (
          <button
            onClick={onExport}
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: '0.25rem',
              color: '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Export JSON
          </button>
        )}
      </div>

      {/* 累計メトリクス */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <MetricCard
          label="Total Calls"
          value={cumulative.totalCalls.toString()}
          subValue={`${cumulative.successfulCalls} OK / ${cumulative.failedCalls} NG`}
        />
        <MetricCard
          label="Total Tokens"
          value={cumulative.totalTokens.toLocaleString()}
          subValue={`P:${cumulative.totalPromptTokens} / R:${cumulative.totalResponseTokens}`}
          highlight
        />
        <MetricCard
          label="Total Time"
          value={`${(cumulative.totalTimeMs / 1000).toFixed(1)}s`}
          subValue={`Avg: ${cumulative.avgTimePerCall.toFixed(0)}ms`}
        />
      </div>

      {/* 最近のメトリクス */}
      {recentMetrics.length > 0 && (
        <div>
          <h4
            style={{
              margin: '0 0 0.5rem 0',
              color: '#64748b',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
            }}
          >
            Recent Calls
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {recentMetrics.map((m) => (
              <MetricRow key={m.id} metric={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}

function MetricCard({ label, value, subValue, highlight }: MetricCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        borderRadius: '0.5rem',
        padding: '0.75rem',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, color: '#64748b', fontSize: '0.625rem', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p
        style={{
          margin: '0.25rem 0',
          color: highlight ? '#f59e0b' : '#e2e8f0',
          fontSize: '1.125rem',
          fontWeight: 'bold',
        }}
      >
        {value}
      </p>
      {subValue && (
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.625rem' }}>{subValue}</p>
      )}
    </div>
  );
}

interface MetricRowProps {
  metric: StageMetrics;
}

function MetricRow({ metric }: MetricRowProps) {
  const stageName = metric.stage ? `${metric.phase}/${metric.stage}` : metric.phase;
  const time = new Date(metric.timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0.5rem',
        backgroundColor: '#0f172a',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: metric.success ? '#22c55e' : '#ef4444',
        }}
      />
      <span style={{ color: '#64748b', minWidth: '60px' }}>{time}</span>
      <span style={{ color: '#3b82f6', minWidth: '100px' }}>{stageName}</span>
      <span style={{ color: '#f59e0b', minWidth: '70px' }}>{metric.totalTokens} tok</span>
      <span style={{ color: '#94a3b8' }}>{metric.processingTimeMs}ms</span>
    </div>
  );
}
