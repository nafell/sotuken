/**
 * SessionDetail
 * 実験セッション詳細画面
 *
 * Phase 6: 実験・評価環境構築
 * Phase 7: 生成履歴（Generations）タブ追加
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  experimentApi,
  type ExperimentSession,
  type WidgetState,
  type ExperimentGeneration
} from '../../services/ExperimentApiService';

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [widgetStates, setWidgetStates] = useState<WidgetState[]>([]);
  const [generations, setGenerations] = useState<ExperimentGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'generations' | 'generated' | 'metrics' | 'states'>('overview');
  const [expandedGeneration, setExpandedGeneration] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!sessionId) return;
      try {
        const [sessionData, statesData, generationsData] = await Promise.all([
          experimentApi.getSession(sessionId),
          experimentApi.getWidgetStates(sessionId),
          experimentApi.getGenerations(sessionId)
        ]);
        setSession(sessionData);
        setWidgetStates(statesData);
        setGenerations(generationsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sessionId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP');
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  // Calculate aggregated metrics from generations (V4対応)
  const aggregatedMetrics = {
    // V4: totalPromptTokens/totalResponseTokens を優先、なければlegacy フィールドを使用
    totalTokens: generations.reduce((sum, g) =>
      sum + (g.totalPromptTokens || g.promptTokens || 0) + (g.totalResponseTokens || g.responseTokens || 0), 0),
    totalPromptTokens: generations.reduce((sum, g) => sum + (g.totalPromptTokens || g.promptTokens || 0), 0),
    totalResponseTokens: generations.reduce((sum, g) => sum + (g.totalResponseTokens || g.responseTokens || 0), 0),
    totalGenerateDuration: generations.reduce((sum, g) => sum + (g.totalGenerateDuration || g.generateDuration || 0), 0),
    totalRenderDuration: generations.reduce((sum, g) => sum + (g.renderDuration || 0), 0),
    // V4 各段階メトリクス
    totalWidgetSelectionDuration: generations.reduce((sum, g) => sum + (g.widgetSelectionDuration || 0), 0),
    totalOrsDuration: generations.reduce((sum, g) => sum + (g.orsDuration || 0), 0),
    totalUiSpecDuration: generations.reduce((sum, g) => sum + (g.uiSpecDuration || 0), 0),
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error || 'Session not found'}</div>
        <Link to="/research-experiment/sessions" style={styles.backLink}>← Back to Sessions</Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Session Details</h1>
          <p style={styles.sessionId}>{session.sessionId}</p>
        </div>
        <div style={styles.headerActions}>
          {(session.generationSuccess || session.completedAt) && (
            <button
              onClick={() => navigate(`/research-experiment/data/replay/${session.sessionId}`)}
              style={styles.replayButton}
            >
              Replay Session
            </button>
          )}
          <Link to="/research-experiment/data/sessions" style={styles.backButton}>← Back</Link>
        </div>
      </header>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'generations', 'generated', 'metrics', 'states'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {})
            }}
          >
            {tab === 'generations' ? `Generations (${generations.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={styles.content}>
          <div style={styles.grid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Experiment Info</h3>
              <div style={styles.infoList}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Type:</span>
                  <span style={styles.infoValue}>{session.experimentType}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Case ID:</span>
                  <span style={styles.infoValue}>{session.caseId}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Evaluator:</span>
                  <span style={styles.infoValue}>{session.evaluatorId || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Started:</span>
                  <span style={styles.infoValue}>{formatDate(session.startedAt)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Completed:</span>
                  <span style={styles.infoValue}>
                    {session.completedAt ? formatDate(session.completedAt) : 'In Progress'}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Configuration</h3>
              <div style={styles.infoList}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Widget Count:</span>
                  <span style={styles.infoValue}>{session.widgetCount}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Model:</span>
                  <span style={styles.infoValue}>{session.modelId}</span>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Status</h3>
              <div style={styles.statusBox}>
                <div
                  style={{
                    ...styles.statusIndicator,
                    backgroundColor: session.generationSuccess ? '#10B981' :
                                     session.generationSuccess === false ? '#EF4444' : '#F59E0B'
                  }}
                />
                <span style={styles.statusText}>
                  {session.generationSuccess ? 'Success' :
                   session.generationSuccess === false ? 'Failed' : 'Pending'}
                </span>
              </div>
              {session.errorMessage && (
                <div style={styles.errorMessage}>{session.errorMessage}</div>
              )}
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Concern Text</h3>
            <p style={styles.concernText}>{session.concernText}</p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Context Factors</h3>
            <pre style={styles.jsonPre}>{formatJson(session.contextFactors)}</pre>
          </div>
        </div>
      )}

      {/* Generated Tab */}
      {activeTab === 'generated' && (
        <div style={styles.content}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Generated OODM</h3>
            <pre style={styles.jsonPre}>
              {session.generatedOodm ? formatJson(session.generatedOodm) : 'Not generated'}
            </pre>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Generated DPG</h3>
            <pre style={styles.jsonPre}>
              {session.generatedDpg ? formatJson(session.generatedDpg) : 'Not generated'}
            </pre>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Generated DSL</h3>
            <pre style={styles.jsonPre}>
              {session.generatedDsl ? formatJson(session.generatedDsl) : 'Not generated'}
            </pre>
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div style={styles.content}>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>{aggregatedMetrics.totalTokens.toLocaleString()}</div>
              <div style={styles.metricLabel}>Total Tokens</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>{aggregatedMetrics.totalPromptTokens.toLocaleString()}</div>
              <div style={styles.metricLabel}>Prompt Tokens</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>{aggregatedMetrics.totalResponseTokens.toLocaleString()}</div>
              <div style={styles.metricLabel}>Response Tokens</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>{aggregatedMetrics.totalGenerateDuration.toLocaleString()}ms</div>
              <div style={styles.metricLabel}>Generate Time</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>{aggregatedMetrics.totalRenderDuration.toLocaleString()}ms</div>
              <div style={styles.metricLabel}>Render Time</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>{generations.length}</div>
              <div style={styles.metricLabel}>Stages</div>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Per-Stage Breakdown (V4)</h3>
            <div style={styles.stageBreakdown}>
              {generations.map((gen, idx) => {
                // V4フィールドを優先、なければlegacyを使用
                const tokens = (gen.totalPromptTokens || gen.promptTokens || 0) + (gen.totalResponseTokens || gen.responseTokens || 0);
                const genDuration = gen.totalGenerateDuration || gen.generateDuration || 0;
                // Widget選定フェーズかステージ実行フェーズかを判定
                const isWidgetSelection = gen.stage === 'widget_selection';
                const stageLabel = isWidgetSelection ? '🔍 Widget Selection' : gen.stage;
                return (
                  <div key={gen.id} style={{
                    ...styles.stageRow,
                    backgroundColor: isWidgetSelection ? '#f5f3ff' : undefined,
                    borderLeft: isWidgetSelection ? '3px solid #7c3aed' : undefined,
                  }}>
                    <span style={styles.stageName}>{idx + 1}. {stageLabel}</span>
                    <span style={styles.stageMetric}>{tokens} tokens</span>
                    <span style={styles.stageMetric}>{genDuration}ms total</span>
                    {/* V4: 各段階の内訳 */}
                    {gen.widgetSelectionDuration && !isWidgetSelection && (
                      <span style={styles.stageMetric}>WS:{gen.widgetSelectionDuration}ms</span>
                    )}
                    {gen.orsDuration && (
                      <span style={styles.stageMetric}>ORS:{gen.orsDuration}ms</span>
                    )}
                    {gen.uiSpecDuration && (
                      <span style={styles.stageMetric}>UI:{gen.uiSpecDuration}ms</span>
                    )}
                    {!isWidgetSelection && (
                      <span style={styles.stageMetric}>{gen.renderDuration || 0}ms render</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {session.oodmMetrics && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>OODM Metrics (Legacy)</h3>
              <pre style={styles.jsonPre}>
                {formatJson(session.oodmMetrics)}
              </pre>
            </div>
          )}

          {session.dslMetrics && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>DSL Metrics (Legacy)</h3>
              <pre style={styles.jsonPre}>
                {formatJson(session.dslMetrics)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Generations Tab */}
      {activeTab === 'generations' && (
        <div style={styles.content}>
          {generations.length > 0 ? (
            generations.map((gen) => {
              // V4フィールドを優先
              const promptTokens = gen.totalPromptTokens || gen.promptTokens || 0;
              const responseTokens = gen.totalResponseTokens || gen.responseTokens || 0;
              const genDuration = gen.totalGenerateDuration || gen.generateDuration || 0;
              // Widget選定フェーズかステージ実行フェーズかを判定
              const isWidgetSelection = gen.stage === 'widget_selection';
              const stageLabel = isWidgetSelection ? '🔍 Widget Selection' : gen.stage;
              const stageBadgeStyle = isWidgetSelection
                ? { ...styles.generationStage, backgroundColor: '#7c3aed', color: 'white' }
                : styles.generationStage;
              return (
                <div key={gen.id} style={styles.generationCard}>
                  <div
                    style={styles.generationHeader}
                    onClick={() => setExpandedGeneration(expandedGeneration === gen.id ? null : gen.id)}
                  >
                    <div style={styles.generationHeaderLeft}>
                      <span style={stageBadgeStyle}>{stageLabel}</span>
                      <span style={styles.generationModel}>{gen.modelId}</span>
                    </div>
                    <div style={styles.generationHeaderRight}>
                      <span style={styles.generationMetric}>
                        {promptTokens} + {responseTokens} tokens
                      </span>
                      <span style={styles.generationMetric}>
                        {genDuration ? `${genDuration}ms` : '-'}
                      </span>
                      <span style={styles.generationTime}>{formatDate(gen.createdAt)}</span>
                      <span style={styles.expandIcon}>{expandedGeneration === gen.id ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {expandedGeneration === gen.id && (
                    <div style={styles.generationBody}>
                      {/* Prompt (JSON形式の場合は整形表示) */}
                      {gen.prompt && (
                        <div style={styles.generationSection}>
                          <h4 style={styles.generationSectionTitle}>Prompt</h4>
                          <pre style={styles.promptPre}>
                            {typeof gen.prompt === 'string' && gen.prompt.startsWith('{')
                              ? formatJson(JSON.parse(gen.prompt))
                              : gen.prompt || 'Not saved'}
                          </pre>
                        </div>
                      )}

                      {/* V4: Widget Selection Result */}
                      {gen.generatedWidgetSelection && (
                        <div style={styles.generationSection}>
                          <h4 style={styles.generationSectionTitle}>Widget Selection (Stage 1)</h4>
                          <pre style={styles.jsonPre}>{formatJson(gen.generatedWidgetSelection)}</pre>
                        </div>
                      )}

                      {/* V4: ORS */}
                      {gen.generatedOrs && (
                        <div style={styles.generationSection}>
                          <h4 style={styles.generationSectionTitle}>ORS (Stage 2)</h4>
                          <pre style={styles.jsonPre}>{formatJson(gen.generatedOrs)}</pre>
                        </div>
                      )}

                      {/* V4: UISpec */}
                      {gen.generatedUiSpec && (
                        <div style={styles.generationSection}>
                          <h4 style={styles.generationSectionTitle}>UISpec (Stage 3)</h4>
                          <pre style={styles.jsonPre}>{formatJson(gen.generatedUiSpec)}</pre>
                        </div>
                      )}

                      {/* Legacy: OODM (backward compatibility) */}
                      {gen.generatedOodm && !gen.generatedOrs && (
                        <div style={styles.generationSection}>
                          <h4 style={styles.generationSectionTitle}>Generated OODM (Legacy)</h4>
                          <pre style={styles.jsonPre}>{formatJson(gen.generatedOodm)}</pre>
                        </div>
                      )}

                      {/* Legacy: DSL (backward compatibility) */}
                      {gen.generatedDsl && !gen.generatedUiSpec && (
                        <div style={styles.generationSection}>
                          <h4 style={styles.generationSectionTitle}>Generated DSL (Legacy)</h4>
                          <pre style={styles.jsonPre}>{formatJson(gen.generatedDsl)}</pre>
                        </div>
                      )}

                      <div style={styles.generationMetrics}>
                        {/* V4 各段階メトリクス */}
                        {gen.widgetSelectionDuration && (
                          <div style={styles.generationMetricItem}>
                            <span style={styles.generationMetricLabel}>Widget Selection:</span>
                            <span style={styles.generationMetricValue}>{gen.widgetSelectionDuration}ms</span>
                          </div>
                        )}
                        {gen.orsDuration && (
                          <div style={styles.generationMetricItem}>
                            <span style={styles.generationMetricLabel}>ORS Gen:</span>
                            <span style={styles.generationMetricValue}>{gen.orsDuration}ms</span>
                          </div>
                        )}
                        {gen.uiSpecDuration && (
                          <div style={styles.generationMetricItem}>
                            <span style={styles.generationMetricLabel}>UISpec Gen:</span>
                            <span style={styles.generationMetricValue}>{gen.uiSpecDuration}ms</span>
                          </div>
                        )}
                        <div style={styles.generationMetricItem}>
                          <span style={styles.generationMetricLabel}>Total Prompt Tokens:</span>
                          <span style={styles.generationMetricValue}>{promptTokens || '-'}</span>
                        </div>
                        <div style={styles.generationMetricItem}>
                          <span style={styles.generationMetricLabel}>Total Response Tokens:</span>
                          <span style={styles.generationMetricValue}>{responseTokens || '-'}</span>
                        </div>
                        <div style={styles.generationMetricItem}>
                          <span style={styles.generationMetricLabel}>Total Generate Duration:</span>
                          <span style={styles.generationMetricValue}>{genDuration ? `${genDuration}ms` : '-'}</span>
                        </div>
                        <div style={styles.generationMetricItem}>
                          <span style={styles.generationMetricLabel}>Render Duration:</span>
                          <span style={styles.generationMetricValue}>{gen.renderDuration ? `${gen.renderDuration}ms` : '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={styles.empty}>No generations recorded for this session.</div>
          )}
        </div>
      )}

      {/* Widget States Tab */}
      {activeTab === 'states' && (
        <div style={styles.content}>
          {widgetStates.length > 0 ? (
            widgetStates.map((state) => (
              <div key={state.stateId} style={styles.stateCard}>
                <div style={styles.stateHeader}>
                  <span style={styles.stateStep}>Step {state.stepIndex}</span>
                  <span style={styles.stateWidget}>{state.widgetType}</span>
                  <span style={styles.stateTime}>{formatDate(state.recordedAt)}</span>
                </div>
                <div style={styles.stateContent}>
                  <div style={styles.stateSection}>
                    <strong>Config:</strong>
                    <pre style={styles.jsonPreSmall}>{formatJson(state.widgetConfig)}</pre>
                  </div>
                  {state.userInputs && (
                    <div style={styles.stateSection}>
                      <strong>User Inputs:</strong>
                      <pre style={styles.jsonPreSmall}>{formatJson(state.userInputs)}</pre>
                    </div>
                  )}
                  {state.portValues && (
                    <div style={styles.stateSection}>
                      <strong>Port Values:</strong>
                      <pre style={styles.jsonPreSmall}>{formatJson(state.portValues)}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={styles.empty}>No widget states recorded for this session.</div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '16px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: 0
  },
  sessionId: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#6B7280',
    marginTop: '4px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  replayButton: {
    padding: '8px 16px',
    backgroundColor: '#7C3AED',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  backButton: {
    color: '#6B7280',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: '#F3F4F6'
  },
  backLink: {
    color: '#3B82F6',
    textDecoration: 'none'
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#6B7280'
  },
  error: {
    textAlign: 'center',
    padding: '48px',
    color: '#EF4444'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '16px'
  },
  tab: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    color: '#fff'
  },
  content: {},
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  card: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    marginBottom: '16px'
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0'
  },
  infoList: {},
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #F3F4F6'
  },
  infoLabel: {
    fontSize: '13px',
    color: '#6B7280'
  },
  infoValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 500
  },
  statusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statusIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  statusText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827'
  },
  errorMessage: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#FEF2F2',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#B91C1C'
  },
  concernText: {
    fontSize: '14px',
    color: '#111827',
    lineHeight: 1.6,
    margin: 0
  },
  jsonPre: {
    backgroundColor: '#F9FAFB',
    padding: '16px',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '400px',
    margin: 0,
    fontFamily: 'monospace'
  },
  jsonPreSmall: {
    backgroundColor: '#F9FAFB',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
    maxHeight: '200px',
    margin: '4px 0 0 0',
    fontFamily: 'monospace'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  metricCard: {
    padding: '24px',
    backgroundColor: '#EFF6FF',
    borderRadius: '8px',
    textAlign: 'center'
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1E40AF'
  },
  metricLabel: {
    fontSize: '14px',
    color: '#3B82F6',
    marginTop: '4px'
  },
  stateCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    marginBottom: '12px',
    overflow: 'hidden'
  },
  stateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB'
  },
  stateStep: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  stateWidget: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827'
  },
  stateTime: {
    fontSize: '12px',
    color: '#6B7280',
    marginLeft: 'auto'
  },
  stateContent: {
    padding: '16px'
  },
  stateSection: {
    marginBottom: '12px'
  },
  empty: {
    textAlign: 'center',
    padding: '48px',
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  },
  // Generation tab styles
  generationCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    marginBottom: '12px',
    overflow: 'hidden'
  },
  generationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
    cursor: 'pointer'
  },
  generationHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  generationHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  generationStage: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    padding: '4px 10px',
    borderRadius: '4px'
  },
  generationModel: {
    fontSize: '12px',
    color: '#6B7280',
    fontFamily: 'monospace'
  },
  generationMetric: {
    fontSize: '12px',
    color: '#6B7280'
  },
  generationTime: {
    fontSize: '12px',
    color: '#9CA3AF'
  },
  expandIcon: {
    fontSize: '10px',
    color: '#9CA3AF'
  },
  generationBody: {
    padding: '16px'
  },
  generationSection: {
    marginBottom: '16px'
  },
  generationSectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0'
  },
  promptPre: {
    backgroundColor: '#FEF3C7',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '300px',
    margin: 0,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid #FCD34D'
  },
  generationMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '6px'
  },
  generationMetricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  generationMetricLabel: {
    fontSize: '11px',
    color: '#6B7280'
  },
  generationMetricValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827'
  },
  // Stage breakdown styles
  stageBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  stageRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '6px'
  },
  stageName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    minWidth: '120px'
  },
  stageMetric: {
    fontSize: '12px',
    color: '#6B7280',
    fontFamily: 'monospace'
  }
};
