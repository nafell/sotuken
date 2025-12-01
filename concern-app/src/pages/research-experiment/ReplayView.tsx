/**
 * ReplayView
 * 実験セッションのリプレイ表示
 *
 * Phase 6: 実験・評価環境構築
 * - 保存されたセッションの読み取り専用再生
 * - ステップバイステップナビゲーション
 * - メタ情報・メトリクス表示
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { experimentApi, type ExperimentSession, type WidgetState } from '../../services/ExperimentApiService';

export default function ReplayView() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [widgetStates, setWidgetStates] = useState<WidgetState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current step index for navigation
  const [currentStep, setCurrentStep] = useState(0);

  // Panel visibility toggles
  const [showMetaPanel, setShowMetaPanel] = useState(true);
  const [showPortValues, setShowPortValues] = useState(false);

  // Load session and widget states
  useEffect(() => {
    async function loadData() {
      if (!sessionId) return;
      try {
        const [sessionData, statesData] = await Promise.all([
          experimentApi.getSession(sessionId),
          experimentApi.getWidgetStates(sessionId)
        ]);
        setSession(sessionData);
        setWidgetStates(statesData);
        if (statesData.length > 0) {
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
    if (step >= 0 && step < widgetStates.length) {
      setCurrentStep(step);
    }
  }, [widgetStates.length]);

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

  // Get current widget state
  const currentWidgetState = widgetStates[currentStep];

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
          <Link to="/research-experiment/sessions" style={styles.backLink}>
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  if (widgetStates.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h2>No Widget States</h2>
          <p>This session has no recorded widget states to replay.</p>
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
                  label="Tokens"
                  value={session.totalTokens?.toLocaleString() || '-'}
                />
                <MetaItem
                  label="Latency"
                  value={session.totalLatencyMs ? `${session.totalLatencyMs}ms` : '-'}
                />
                <MetaItem
                  label="Status"
                  value={session.generationSuccess ? 'Success' : 'Failed'}
                  highlight={session.generationSuccess ? 'success' : 'error'}
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

        {/* Widget Display Area */}
        <main style={styles.widgetArea}>
          {/* Progress Bar */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${((currentStep + 1) / widgetStates.length) * 100}%`
                }}
              />
            </div>
            <span style={styles.progressText}>
              Step {currentStep + 1} of {widgetStates.length}
            </span>
          </div>

          {/* Step Indicator Pills */}
          <div style={styles.stepIndicators}>
            {widgetStates.map((state, idx) => (
              <button
                key={state.stateId}
                onClick={() => goToStep(idx)}
                style={{
                  ...styles.stepPill,
                  backgroundColor: idx === currentStep ? '#3B82F6' :
                                   idx < currentStep ? '#10B981' : '#E5E7EB',
                  color: idx <= currentStep ? '#fff' : '#6B7280'
                }}
                title={`Step ${idx + 1}: ${state.widgetType}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Current Widget State Display */}
          {currentWidgetState && (
            <div style={styles.widgetCard}>
              <div style={styles.widgetHeader}>
                <div>
                  <span style={styles.widgetStep}>Step {currentWidgetState.stepIndex}</span>
                  <h2 style={styles.widgetType}>{currentWidgetState.widgetType}</h2>
                </div>
                <span style={styles.widgetTime}>
                  {formatDate(currentWidgetState.recordedAt)}
                </span>
              </div>

              {/* Widget Config */}
              <div style={styles.widgetSection}>
                <h4 style={styles.sectionTitle}>Widget Configuration</h4>
                <pre style={styles.jsonPre}>
                  {formatJson(currentWidgetState.widgetConfig)}
                </pre>
              </div>

              {/* User Inputs */}
              {currentWidgetState.userInputs && (
                <div style={styles.widgetSection}>
                  <h4 style={styles.sectionTitle}>User Inputs</h4>
                  <pre style={styles.jsonPre}>
                    {formatJson(currentWidgetState.userInputs)}
                  </pre>
                </div>
              )}

              {/* Port Values (toggle) */}
              {currentWidgetState.portValues && (
                <div style={styles.widgetSection}>
                  <div style={styles.sectionHeader}>
                    <h4 style={styles.sectionTitle}>Port Values (Debug)</h4>
                    <button
                      onClick={() => setShowPortValues(!showPortValues)}
                      style={styles.expandButton}
                    >
                      {showPortValues ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showPortValues && (
                    <pre style={styles.jsonPre}>
                      {formatJson(currentWidgetState.portValues)}
                    </pre>
                  )}
                </div>
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
              disabled={currentStep === widgetStates.length - 1}
              style={{
                ...styles.navButton,
                opacity: currentStep === widgetStates.length - 1 ? 0.5 : 1
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
    gap: '8px'
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
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
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
  jsonPre: {
    backgroundColor: '#F9FAFB',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '300px',
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
