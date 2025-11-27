/**
 * FullFlowDemoPage - Full-Flow デモページ
 *
 * Phase 4 Full-Flow: capture -> plan(4 stages) -> breakdown
 * メトリクス計測付きの完全フローデモ
 */

import { useState, useCallback, useEffect } from 'react';
import { FullFlowContainer } from '../../components/demo/full-flow/FullFlowContainer';
import { MetricsDashboard } from '../../components/demo/full-flow/MetricsDashboard';
import { fullFlowMetricsService } from '../../services/FullFlowMetricsService';
import type { StageMetrics, CumulativeMetrics } from '../../components/demo/full-flow/types';

export default function FullFlowDemoPage() {
  const [metrics, setMetrics] = useState<StageMetrics[]>([]);
  const [cumulative, setCumulative] = useState<CumulativeMetrics>(
    fullFlowMetricsService.getCumulative()
  );
  const [currentPhase, setCurrentPhase] = useState<string>('capture');
  const [currentStage, setCurrentStage] = useState<string | undefined>(undefined);

  // メトリクス更新を監視
  useEffect(() => {
    const interval = setInterval(() => {
      const entries = fullFlowMetricsService.getEntries();
      const cumulativeMetrics = fullFlowMetricsService.getCumulative();
      setMetrics(entries);
      setCumulative(cumulativeMetrics);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // フェーズ変更ハンドラ
  const handlePhaseChange = useCallback((phase: string, stage?: string) => {
    setCurrentPhase(phase);
    setCurrentStage(stage);
  }, []);

  // メトリクスエクスポート
  const handleExportMetrics = useCallback(() => {
    const json = fullFlowMetricsService.exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `full-flow-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: '1rem',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#f59e0b' }}>
              Full-Flow Demo
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.75rem' }}>
              Phase 4: capture → plan(diverge→organize→converge→summary) → breakdown
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: '#0f172a',
                borderRadius: '9999px',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ color: '#64748b' }}>Phase: </span>
              <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{currentPhase}</span>
              {currentStage && (
                <>
                  <span style={{ color: '#475569' }}> / </span>
                  <span style={{ color: '#f59e0b' }}>{currentStage}</span>
                </>
              )}
            </div>
            <a
              href="/dev-demo/e2e-p4d3"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#334155',
                borderRadius: '0.5rem',
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.75rem',
              }}
            >
              ← E2E Demo
            </a>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '1rem',
        }}
      >
        {/* 左: Full-Flow Container */}
        <div style={{ minWidth: 0 }}>
          <FullFlowContainer onPhaseChange={handlePhaseChange} />
        </div>

        {/* 右: メトリクスパネル */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <MetricsDashboard
            metrics={metrics}
            cumulative={cumulative}
            onExport={handleExportMetrics}
          />

          {/* 追加情報パネル */}
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '0.75rem',
              padding: '1rem',
              fontSize: '0.75rem',
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#94a3b8', fontSize: '0.75rem' }}>
              Implementation Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <StatusRow label="emotion_palette" status="implemented" />
              <StatusRow label="brainstorm_cards" status="implemented" />
              <StatusRow label="matrix_placement" status="implemented" />
              <StatusRow label="priority_slider_grid" status="implemented" />
              <StatusRow label="timeline_builder" status="not_implemented" />
              <StatusRow label="comparison_table" status="not_implemented" />
              <StatusRow label="mind_map" status="not_implemented" />
              <StatusRow label="decision_tree" status="not_implemented" />
            </div>
          </div>

          {/* フロー説明 */}
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '0.75rem',
              padding: '1rem',
              fontSize: '0.75rem',
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#94a3b8', fontSize: '0.75rem' }}>
              Flow Stages
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <StageInfo
                stage="capture"
                description="テキスト入力 + ボトルネック診断"
                mode="固定UI"
              />
              <StageInfo
                stage="diverge"
                description="アイデア発散"
                mode="Widget"
                widgets={['emotion_palette', 'brainstorm_cards']}
              />
              <StageInfo
                stage="organize"
                description="情報整理"
                mode="Text"
              />
              <StageInfo
                stage="converge"
                description="優先度付け"
                mode="Widget"
                widgets={['matrix_placement', 'priority_slider_grid']}
              />
              <StageInfo
                stage="summary"
                description="まとめ"
                mode="Text"
              />
              <StageInfo
                stage="breakdown"
                description="タスク生成"
                mode="固定UI"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface StatusRowProps {
  label: string;
  status: 'implemented' | 'not_implemented';
}

function StatusRow({ label, status }: StatusRowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span
        style={{
          padding: '0.125rem 0.375rem',
          backgroundColor: status === 'implemented' ? '#14532d' : '#1e293b',
          borderRadius: '9999px',
          fontSize: '0.625rem',
          color: status === 'implemented' ? '#22c55e' : '#64748b',
        }}
      >
        {status === 'implemented' ? 'OK' : '-'}
      </span>
    </div>
  );
}

interface StageInfoProps {
  stage: string;
  description: string;
  mode: string;
  widgets?: string[];
}

function StageInfo({ stage, description, mode, widgets }: StageInfoProps) {
  return (
    <div
      style={{
        padding: '0.5rem',
        backgroundColor: '#0f172a',
        borderRadius: '0.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{stage}</span>
        <span
          style={{
            padding: '0.125rem 0.375rem',
            backgroundColor: mode === 'Widget' ? '#1e3a5f' : mode === 'Text' ? '#422006' : '#1e293b',
            borderRadius: '9999px',
            fontSize: '0.625rem',
            color: mode === 'Widget' ? '#60a5fa' : mode === 'Text' ? '#fbbf24' : '#94a3b8',
          }}
        >
          {mode}
        </span>
      </div>
      <p style={{ margin: 0, color: '#64748b', fontSize: '0.625rem' }}>{description}</p>
      {widgets && (
        <p style={{ margin: '0.25rem 0 0 0', color: '#475569', fontSize: '0.625rem' }}>
          {widgets.join(', ')}
        </p>
      )}
    </div>
  );
}
