/**
 * ReplayView
 * 実験セッションのリプレイ表示
 *
 * Phase 6: 実験・評価環境構築
 * Phase 7: Generationsデータを使用したリプレイ
 * - 保存されたセッションの読み取り専用再生
 * - ステップバイステップナビゲーション
 * - 生成されたウィジェットの実体表示
 * - メタ情報・メトリクス表示
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  experimentApi,
  type ExperimentSession,
  type ExperimentGeneration
} from '../../services/ExperimentApiService';
import UIRendererV3 from '../../services/ui-generation/UIRendererV3';

type ViewMode = 'widget' | 'data';

export default function ReplayView() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [generations, setGenerations] = useState<ExperimentGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current step index for navigation
  const [currentStep, setCurrentStep] = useState(0);

  // Panel visibility toggles
  const [showMetaPanel, setShowMetaPanel] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('widget');
  const [showPrompt, setShowPrompt] = useState(false);

  // Load session and generations
  useEffect(() => {
    async function loadData() {
      if (!sessionId) return;
      try {
        const [sessionData, generationsData] = await Promise.all([
          experimentApi.getSession(sessionId),
          experimentApi.getGenerations(sessionId)
        ]);
        setSession(sessionData);
        setGenerations(generationsData);
        if (generationsData.length > 0) {
          setCurrentStep(0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load replay data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sessionId]);

  // Navigation handlers
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < generations.length) {
      setCurrentStep(step);
    }
  }, [generations.length]);

  const goToPrevStep = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const goToNextStep = useCallback(() => {
    goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'j') {
        goToPrevStep();
      } else if (e.key === 'ArrowRight' || e.key === 'k') {
        goToNextStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevStep, goToNextStep]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP');
  };

  const formatJson = (obj: unknown) => {
    return JSON.stringify(obj, null, 2);
  };

  // Get current generation
  const currentGeneration = generations[currentStep];

  // Calculate aggregated metrics from generations
  const aggregatedMetrics = {
    totalTokens: generations.reduce((sum, g) => sum + (g.promptTokens || 0) + (g.responseTokens || 0), 0),
    totalPromptTokens: generations.reduce((sum, g) => sum + (g.promptTokens || 0), 0),
    totalResponseTokens: generations.reduce((sum, g) => sum + (g.responseTokens || 0), 0),
    totalGenerateDuration: generations.reduce((sum, g) => sum + (g.generateDuration || 0), 0),
    totalRenderDuration: generations.reduce((sum, g) => sum + (g.renderDuration || 0), 0),
  };

  // Stage display names
  const stageNames: Record<string, string> = {
    diverge: '発散 (Diverge)',
    organize: '整理 (Organize)',
    converge: '収束 (Converge)',
    summary: 'まとめ (Summary)'
  };

  // Dummy handlers for UIRendererV3 (read-only mode)
  const handleWidgetUpdate = useCallback((widgetId: string, data: unknown) => {
    console.log('[ReplayView] Widget update (read-only):', widgetId, data);
  }, []);

  const handleWidgetComplete = useCallback((widgetId: string) => {
    console.log('[ReplayView] Widget complete (read-only):', widgetId);
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.spinner} />
          <p>Loading replay data...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <h2>Error Loading Replay</h2>
          <p>{error || 'Session not found'}</p>
          <Link to="/research-experiment/data/sessions" style={styles.backLink}>
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h2>No Generation Data</h2>
          <p>This session has no recorded generations to replay.</p>
          <Link to={`/research-experiment/data/sessions/${sessionId}`} style={styles.backLink}>
            View Session Details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to={`/research-experiment/data/sessions/${sessionId}`} style={styles.backButton}>
            Back
          </Link>
          <div>
            <h1 style={styles.title}>Session Replay</h1>
            <p style={styles.sessionInfo}>
              {session.caseId} | {session.modelId} | {session.widgetCount} widgets
            </p>
          </div>
        </div>
        <div style={styles.headerControls}>
          {/* View Mode Toggle */}
          <div style={styles.viewModeToggle}>
            <button
              onClick={() => setViewMode('widget')}
              style={{
                ...styles.viewModeButton,
                ...(viewMode === 'widget' ? styles.viewModeButtonActive : {})
              }}
            >
              Widget
            </button>
            <button
              onClick={() => setViewMode('data')}
              style={{
                ...styles.viewModeButton,
                ...(viewMode === 'data' ? styles.viewModeButtonActive : {})
              }}
            >
              Data
            </button>
          </div>
          <button
            onClick={() => setShowMetaPanel(!showMetaPanel)}
            style={{
              ...styles.toggleButton,
              backgroundColor: showMetaPanel ? '#3B82F6' : '#E5E7EB'
            }}
          >
            {showMetaPanel ? 'Hide Info' : 'Show Info'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Meta Panel (collapsible) */}
        {showMetaPanel && (
          <aside style={styles.metaPanel}>
            <div style={styles.metaSection}>
              <h3 style={styles.metaSectionTitle}>Session Info</h3>
              <div style={styles.metaGrid}>
                <MetaItem label="Type" value={session.experimentType} />
                <MetaItem label="Case" value={session.caseId} />
                <MetaItem label="Model" value={session.modelId} />
                <MetaItem label="Widgets" value={String(session.widgetCount)} />
              </div>
            </div>

            <div style={styles.metaSection}>
              <h3 style={styles.metaSectionTitle}>Metrics</h3>
              <div style={styles.metaGrid}>
                <MetaItem
                  label="Total Tokens"
                  value={aggregatedMetrics.totalTokens.toLocaleString()}
                />
                <MetaItem
                  label="Prompt"
                  value={aggregatedMetrics.totalPromptTokens.toLocaleString()}
                />
                <MetaItem
                  label="Response"
                  value={aggregatedMetrics.totalResponseTokens.toLocaleString()}
                />
                <MetaItem
                  label="Generate Time"
                  value={`${aggregatedMetrics.totalGenerateDuration.toLocaleString()}ms`}
                />
                <MetaItem
                  label="Render Time"
                  value={`${aggregatedMetrics.totalRenderDuration.toLocaleString()}ms`}
                />
                <MetaItem
                  label="Stages"
                  value={`${generations.length}`}
                />
                <MetaItem
                  label="Status"
                  value={session.generationSuccess ? 'Success' : session.completedAt ? 'Completed' : 'In Progress'}
                  highlight={session.generationSuccess ? 'success' : undefined}
                />
              </div>
            </div>

            <div style={styles.metaSection}>
              <h3 style={styles.metaSectionTitle}>Concern</h3>
              <p style={styles.concernText}>{session.concernText}</p>
            </div>

            <div style={styles.metaSection}>
              <h3 style={styles.metaSectionTitle}>Timestamps</h3>
              <div style={styles.metaGrid}>
                <MetaItem label="Started" value={formatDate(session.startedAt)} />
                <MetaItem
                  label="Completed"
                  value={session.completedAt ? formatDate(session.completedAt) : '-'}
                />
              </div>
            </div>
          </aside>
        )}

        {/* Generation Display Area */}
        <main style={styles.widgetArea}>
          {/* Progress Bar */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${((currentStep + 1) / generations.length) * 100}%`
                }}
              />
            </div>
            <span style={styles.progressText}>
              Stage {currentStep + 1} of {generations.length}
            </span>
          </div>

          {/* Step Indicator Pills */}
          <div style={styles.stepIndicators}>
            {generations.map((gen, idx) => (
              <button
                key={gen.id}
                onClick={() => goToStep(idx)}
                style={{
                  ...styles.stepPill,
                  backgroundColor: idx === currentStep ? '#3B82F6' :
                                   idx < currentStep ? '#10B981' : '#E5E7EB',
                  color: idx <= currentStep ? '#fff' : '#6B7280'
                }}
                title={`Stage ${idx + 1}: ${stageNames[gen.stage] || gen.stage}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Current Generation Display */}
          {currentGeneration && (
            <div style={styles.widgetCard}>
              <div style={styles.widgetHeader}>
                <div>
                  <span style={styles.widgetStep}>Stage {currentStep + 1}</span>
                  <h2 style={styles.widgetType}>{stageNames[currentGeneration.stage] || currentGeneration.stage}</h2>
                </div>
                <div style={styles.headerRight}>
                  <span style={styles.widgetTime}>
                    {formatDate(currentGeneration.createdAt)}
                  </span>
                </div>
              </div>

              {/* Generation Metrics */}
              <div style={styles.metricsBar}>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Model:</span>
                  <span style={styles.metricValue}>{currentGeneration.modelId}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Prompt Tokens:</span>
                  <span style={styles.metricValue}>{currentGeneration.promptTokens || '-'}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Response Tokens:</span>
                  <span style={styles.metricValue}>{currentGeneration.responseTokens || '-'}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Generate:</span>
                  <span style={styles.metricValue}>{currentGeneration.generateDuration ? `${currentGeneration.generateDuration}ms` : '-'}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Render:</span>
                  <span style={styles.metricValue}>{currentGeneration.renderDuration ? `${currentGeneration.renderDuration}ms` : '-'}</span>
                </div>
              </div>

              {/* Widget View Mode */}
              {viewMode === 'widget' && currentGeneration.generatedDsl && (
                <div style={styles.widgetRenderArea}>
                  <div style={styles.readOnlyBanner}>
                    Read-Only Preview - Interactions are disabled
                  </div>
                  <div style={styles.widgetContainer}>
                    <UIRendererV3
                      uiSpec={currentGeneration.generatedDsl}
                      onWidgetUpdate={handleWidgetUpdate}
                      onWidgetComplete={handleWidgetComplete}
                    />
                  </div>
                </div>
              )}

              {viewMode === 'widget' && !currentGeneration.generatedDsl && (
                <div style={styles.noWidgetMessage}>
                  No widget data available for this stage
                </div>
              )}

              {/* Data View Mode */}
              {viewMode === 'data' && (
                <>
                  {/* Prompt (collapsible) */}
                  <div style={styles.widgetSection}>
                    <div style={styles.sectionHeader}>
                      <h4 style={styles.sectionTitle}>Prompt</h4>
                      <button
                        onClick={() => setShowPrompt(!showPrompt)}
                        style={styles.expandButton}
                      >
                        {showPrompt ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {showPrompt && (
                      <pre style={styles.promptPre}>
                        {currentGeneration.prompt}
                      </pre>
                    )}
                  </div>

                  {/* Generated OODM */}
                  {currentGeneration.generatedOodm && (
                    <div style={styles.widgetSection}>
                      <h4 style={styles.sectionTitle}>Generated OODM</h4>
                      <pre style={styles.jsonPre}>
                        {formatJson(currentGeneration.generatedOodm)}
                      </pre>
                    </div>
                  )}

                  {/* Generated DSL */}
                  {currentGeneration.generatedDsl && (
                    <div style={styles.widgetSection}>
                      <h4 style={styles.sectionTitle}>Generated DSL (UISpec)</h4>
                      <pre style={styles.jsonPre}>
                        {formatJson(currentGeneration.generatedDsl)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div style={styles.navControls}>
            <button
              onClick={goToPrevStep}
              disabled={currentStep === 0}
              style={{
                ...styles.navButton,
                opacity: currentStep === 0 ? 0.5 : 1
              }}
            >
              Previous
            </button>
            <div style={styles.navInfo}>
              <span style={styles.navKeys}>Use arrow keys to navigate</span>
            </div>
            <button
              onClick={goToNextStep}
              disabled={currentStep === generations.length - 1}
              style={{
                ...styles.navButton,
                opacity: currentStep === generations.length - 1 ? 0.5 : 1
              }}
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

// Meta Item Component
interface MetaItemProps {
  label: string;
  value: string;
  highlight?: 'success' | 'error';
}

function MetaItem({ label, value, highlight }: MetaItemProps) {
  const valueStyle = {
    ...styles.metaValue,
    ...(highlight === 'success' && { color: '#10B981' }),
    ...(highlight === 'error' && { color: '#EF4444' })
  };

  return (
    <div style={styles.metaItem}>
      <span style={styles.metaLabel}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F3F4F6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#6B7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E7EB',
    borderTopColor: '#3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#EF4444',
    textAlign: 'center'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#6B7280',
    textAlign: 'center'
  },
  backLink: {
    color: '#3B82F6',
    textDecoration: 'none',
    marginTop: '16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #E5E7EB'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px'
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    margin: 0
  },
  sessionInfo: {
    fontSize: '12px',
    color: '#6B7280',
    margin: '4px 0 0 0'
  },
  headerControls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  viewModeToggle: {
    display: 'flex',
    backgroundColor: '#E5E7EB',
    borderRadius: '6px',
    padding: '2px'
  },
  viewModeButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#6B7280'
  },
  viewModeButtonActive: {
    backgroundColor: '#fff',
    color: '#111827',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  toggleButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#fff'
  },
  mainContent: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    maxWidth: '1600px',
    margin: '0 auto'
  },
  metaPanel: {
    width: '300px',
    flexShrink: 0,
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    padding: '16px',
    height: 'fit-content',
    position: 'sticky',
    top: '24px'
  },
  metaSection: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #F3F4F6'
  },
  metaSectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 12px 0'
  },
  metaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  metaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metaLabel: {
    fontSize: '13px',
    color: '#6B7280'
  },
  metaValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 500
  },
  concernText: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.5,
    margin: 0
  },
  widgetArea: {
    flex: 1,
    minWidth: 0
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '13px',
    color: '#6B7280',
    whiteSpace: 'nowrap'
  },
  stepIndicators: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '20px'
  },
  stepPill: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  widgetCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    marginBottom: '20px'
  },
  widgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB'
  },
  widgetStep: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  widgetType: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '8px 0 0 0'
  },
  widgetTime: {
    fontSize: '12px',
    color: '#6B7280'
  },
  metricsBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '12px 20px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB'
  },
  metricItem: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6B7280'
  },
  metricValue: {
    fontSize: '12px',
    color: '#111827',
    fontWeight: 500,
    fontFamily: 'monospace'
  },
  widgetRenderArea: {
    padding: '0'
  },
  readOnlyBanner: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 500,
    textAlign: 'center',
    borderBottom: '1px solid #FCD34D'
  },
  widgetContainer: {
    padding: '20px',
    minHeight: '200px',
    backgroundColor: '#FAFAFA'
  },
  noWidgetMessage: {
    padding: '40px',
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: '14px'
  },
  widgetSection: {
    padding: '16px 20px',
    borderBottom: '1px solid #F3F4F6'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    margin: 0
  },
  expandButton: {
    padding: '4px 8px',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#6B7280',
    cursor: 'pointer'
  },
  promptPre: {
    backgroundColor: '#FEF3C7',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '300px',
    margin: '8px 0 0 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid #FCD34D'
  },
  jsonPre: {
    backgroundColor: '#F9FAFB',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '400px',
    margin: '8px 0 0 0'
  },
  navControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  navButton: {
    padding: '12px 24px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  navInfo: {
    textAlign: 'center'
  },
  navKeys: {
    fontSize: '12px',
    color: '#9CA3AF'
  }
};
