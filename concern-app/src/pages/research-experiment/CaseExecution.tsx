/**
 * CaseExecution
 * テストケース実行画面
 *
 * Phase 6: 実験・評価環境構築
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  experimentApi,
  type TestCase,
  type ExperimentSettings,
  type ExperimentSession
} from '../../services/ExperimentApiService';
import { ExperimentExecutor } from '../../components/experiment/ExperimentExecutor';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

type ExecutionState = 'config' | 'running' | 'completed' | 'error';

export default function CaseExecution() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [settings, setSettings] = useState<ExperimentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Execution config
  const [experimentType, setExperimentType] = useState('expert');
  const [widgetCount, setWidgetCount] = useState(12);
  const [modelId, setModelId] = useState('gemini-2.5-flash-lite');
  const [evaluatorId, setEvaluatorId] = useState('');

  // Execution state
  const [executionState, setExecutionState] = useState<ExecutionState>('config');
  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!session) return;
    try {
      await experimentApi.updateSession(session.sessionId, {
        generationSuccess: true,
        completedAt: new Date().toISOString()
      });
      setSession(prev => prev ? { ...prev, generationSuccess: true, completedAt: new Date().toISOString() } : null);
      setExecutionState('completed');
    } catch (err) {
      console.error('Failed to complete session:', err);
      setExecutionError('Failed to complete session');
    }
  };

  // URLからクエリパラメータを取得
  const searchParams = new URLSearchParams(window.location.search);
  const urlMode = searchParams.get('mode');
  const urlModel = searchParams.get('model');
  const urlWidgets = searchParams.get('widgets');
  const urlEvaluator = searchParams.get('evaluator');

  // userモード判定: caseId === 'custom' または mode=user
  const isUserMode = caseId === 'custom' || urlMode === 'user';

  useEffect(() => {
    async function loadData() {
      if (!caseId) return;
      try {
        // userモードの場合、テストケースは取得しない
        if (isUserMode) {
          const settingsData = await experimentApi.getSettings();
          setSettings(settingsData);
          // URLパラメータから設定を取得、なければデフォルト
          setWidgetCount(urlWidgets ? parseInt(urlWidgets) : settingsData.defaults.widgetCount);
          setModelId(urlModel || settingsData.defaults.modelId);
          setExperimentType('user');
          setEvaluatorId(urlEvaluator || '');
          // userモード用のダミーテストケースを作成
          setTestCase({
            caseId: 'custom',
            title: 'User Experiment',
            description: 'Free-form concern input by user',
            concernText: '', // ユーザが入力する
            contextFactors: {
              mood: 'neutral',
              timeAvailable: 15,
              preferredStyle: 'guided'
            },
            expectedBottlenecks: [],
            evaluationCriteria: ['User satisfaction', 'Task completion'],
            complexity: 'medium',
            hasReactivity: true
          });
        } else {
          const [caseData, settingsData] = await Promise.all([
            experimentApi.getTestCase(caseId),
            experimentApi.getSettings()
          ]);
          setTestCase(caseData);
          setSettings(settingsData);
          setWidgetCount(settingsData.defaults.widgetCount);
          setModelId(settingsData.defaults.modelId);
          setExperimentType(settingsData.defaults.experimentType);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [caseId, isUserMode, urlWidgets, urlModel, urlEvaluator]);

  const handleStartExecution = async () => {
    if (!testCase) return;

    setExecutionState('running');
    setExecutionError(null);

    try {
      // Create session
      // userモードの場合、concernTextはユーザがcaptureフェーズで入力するため
      // プレースホルダーを使用（後で更新される）
      const newSession = await experimentApi.createSession({
        experimentType,
        caseId: testCase.caseId,
        evaluatorId: evaluatorId || undefined,
        widgetCount,
        modelId,
        concernText: isUserMode ? '(pending user input)' : testCase.concernText,
        contextFactors: testCase.contextFactors
      });

      setSession(newSession);
      // ExperimentExecutorがマウントされ、フローを開始する
      // 完了はExperimentExecutorのonCompleteコールバックで処理される

    } catch (err) {
      setExecutionError(err instanceof Error ? err.message : 'Execution failed');
      setExecutionState('error');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading test case...</div>
      </div>
    );
  }

  if (error || !testCase) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error || 'Test case not found'}</div>
        <Link to="/research-experiment/cases" style={styles.backLink}>← Back to Cases</Link>
      </div>
    );
  }

  // Running状態ではExperimentExecutorをフルスクリーンで表示
  if (executionState === 'running' && session) {
    const handleExperimentError = (error: Error) => {
      console.error('Experiment error:', error);
      setExecutionError(`Experiment crashed: ${error.message}`);
      // エラー発生時もセッションは保持（デバッグ用）
    };

    return (
      <div style={styles.executorContainer}>
        <ErrorBoundary
          onError={handleExperimentError}
          fallback={
            <div style={styles.errorFallback}>
              <div style={styles.errorFallbackIcon}>!</div>
              <h2 style={styles.errorFallbackTitle}>Experiment Error</h2>
              <p style={styles.errorFallbackMessage}>
                An error occurred during the experiment. Your session data has been preserved.
              </p>
              <p style={styles.errorFallbackSession}>
                Session ID: {session.sessionId}
              </p>
              <div style={styles.errorFallbackActions}>
                <button
                  onClick={() => navigate(`/research-experiment/data/sessions/${session.sessionId}`)}
                  style={styles.errorFallbackViewButton}
                >
                  View Session Data
                </button>
                <button
                  onClick={() => {
                    setExecutionState('config');
                    setSession(null);
                  }}
                  style={styles.errorFallbackRetryButton}
                >
                  Start New Session
                </button>
              </div>
            </div>
          }
        >
          <ExperimentExecutor
            sessionId={session.sessionId}
            mode={experimentType as 'user' | 'expert' | 'technical'}
            initialContext={isUserMode ? undefined : (testCase ? {
              concernText: testCase.concernText,
              bottleneckType: testCase.expectedBottlenecks?.[0]
            } : undefined)}
            onComplete={handleComplete}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Execute: {testCase.caseId}</h1>
          <p style={styles.subtitle}>{testCase.title}</p>
        </div>
        <Link to={isUserMode ? "/research-experiment/new/user" : "/research-experiment/new"} style={styles.backButton}>
          ← Back to {isUserMode ? 'User Setup' : 'Launcher'}
        </Link>
      </header>

      <div style={styles.content}>
        {/* Test Case Info - ユーザモードでは非表示 */}
        {!isUserMode && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Test Case Details</h2>
            <div style={styles.infoCard}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Concern Text:</span>
                <span style={styles.infoValue}>{testCase.concernText}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Complexity:</span>
                <span style={styles.infoValue}>{testCase.complexity}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Has Reactivity:</span>
                <span style={styles.infoValue}>{testCase.hasReactivity ? 'Yes' : 'No'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Expected Bottlenecks:</span>
                <span style={styles.infoValue}>{testCase.expectedBottlenecks.join(', ')}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Evaluation Criteria:</span>
                <ul style={styles.criteriaList}>
                  {testCase.evaluationCriteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Execution Config */}
        {executionState === 'config' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              {isUserMode ? 'Session Configuration' : 'Execution Configuration'}
            </h2>
            <div style={styles.configForm}>
              {/* ユーザモードでは設定は固定されているので読み取り専用で表示 */}
              {isUserMode ? (
                <>
                  <div style={styles.infoCard}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Participant ID:</span>
                      <span style={styles.infoValue}>{evaluatorId || '(not set)'}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Widget Count:</span>
                      <span style={styles.infoValue}>{widgetCount}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Model:</span>
                      <span style={styles.infoValue}>{modelId}</span>
                    </div>
                  </div>
                  <p style={styles.userModeHint}>
                    You will be asked to input your concern in the next step.
                  </p>
                </>
              ) : (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Experiment Type</label>
                    <select
                      value={experimentType}
                      onChange={(e) => setExperimentType(e.target.value)}
                      style={styles.formSelect}
                    >
                      {settings?.experimentTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Widget Count</label>
                    <select
                      value={widgetCount}
                      onChange={(e) => setWidgetCount(parseInt(e.target.value))}
                      style={styles.formSelect}
                    >
                      {settings?.widgetCountConditions.map(c => (
                        <option key={c.id} value={c.widgetCount}>
                          {c.widgetCount} - {c.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Model</label>
                    <select
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      style={styles.formSelect}
                    >
                      {settings?.modelConditions.map(c => (
                        <option key={c.id} value={c.modelId}>
                          {c.id} - {c.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Evaluator ID (optional)</label>
                    <input
                      type="text"
                      value={evaluatorId}
                      onChange={(e) => setEvaluatorId(e.target.value)}
                      placeholder="e.g., evaluator_01"
                      style={styles.formInput}
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleStartExecution}
                style={styles.startButton}
              >
                {isUserMode ? 'Begin Session' : 'Start Execution'}
              </button>
            </div>
          </section>
        )}

        {/* Completed State */}
        {executionState === 'completed' && session && (
          <section style={styles.section}>
            <div style={styles.completedCard}>
              <div style={styles.completedIcon}>✓</div>
              <h3 style={styles.completedTitle}>Execution Completed</h3>
              <p style={styles.completedText}>Session ID: {session.sessionId}</p>
              <div style={styles.completedActions}>
                <button
                  onClick={() => navigate(`/research-experiment/data/sessions/${session.sessionId}`)}
                  style={styles.viewButton}
                >
                  View Session Details
                </button>
                <button
                  onClick={() => {
                    setExecutionState('config');
                    setSession(null);
                  }}
                  style={styles.newButton}
                >
                  New Execution
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Error State */}
        {executionState === 'error' && (
          <section style={styles.section}>
            <div style={styles.errorCard}>
              <div style={styles.errorIcon}>✗</div>
              <h3 style={styles.errorTitle}>Execution Failed</h3>
              <p style={styles.errorText}>{executionError}</p>
              <button
                onClick={() => {
                  setExecutionState('config');
                  setExecutionError(null);
                }}
                style={styles.retryButton}
              >
                Retry
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  executorContainer: {
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  errorFallback: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '24px',
    backgroundColor: '#FEF2F2',
    textAlign: 'center'
  },
  errorFallbackIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    color: '#fff',
    fontSize: '32px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px'
  },
  errorFallbackTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#991B1B',
    margin: '0 0 12px'
  },
  errorFallbackMessage: {
    fontSize: '16px',
    color: '#B91C1C',
    margin: '0 0 8px',
    maxWidth: '500px'
  },
  errorFallbackSession: {
    fontSize: '14px',
    color: '#6B7280',
    fontFamily: 'monospace',
    margin: '0 0 24px'
  },
  errorFallbackActions: {
    display: 'flex',
    gap: '16px'
  },
  errorFallbackViewButton: {
    padding: '12px 24px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  errorFallbackRetryButton: {
    padding: '12px 24px',
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  container: {
    maxWidth: '900px',
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
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '4px'
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
  content: {},
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px'
  },
  infoCard: {
    padding: '20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  infoRow: {
    marginBottom: '12px'
  },
  infoLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '4px'
  },
  infoValue: {
    fontSize: '14px',
    color: '#111827'
  },
  criteriaList: {
    margin: '4px 0 0 20px',
    padding: 0,
    fontSize: '14px',
    color: '#111827'
  },
  configForm: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  formGroup: {
    marginBottom: '16px'
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px'
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    backgroundColor: '#fff'
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  startButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px'
  },
  userModeHint: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '16px 0 0 0',
    textAlign: 'center'
  },
  runningCard: {
    textAlign: 'center',
    padding: '48px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E7EB',
    borderTopColor: '#3B82F6',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 1s linear infinite'
  },
  runningText: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#111827',
    margin: '0 0 4px 0'
  },
  runningSubtext: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0
  },
  completedCard: {
    textAlign: 'center',
    padding: '48px',
    backgroundColor: '#F0FDF4',
    borderRadius: '8px',
    border: '1px solid #BBF7D0'
  },
  completedIcon: {
    width: '48px',
    height: '48px',
    lineHeight: '48px',
    fontSize: '24px',
    backgroundColor: '#10B981',
    color: '#fff',
    borderRadius: '50%',
    margin: '0 auto 16px'
  },
  completedTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#065F46',
    margin: '0 0 8px 0'
  },
  completedText: {
    fontSize: '14px',
    color: '#047857',
    margin: '0 0 24px 0',
    fontFamily: 'monospace'
  },
  completedActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  viewButton: {
    padding: '10px 20px',
    backgroundColor: '#10B981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  newButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  errorCard: {
    textAlign: 'center',
    padding: '48px',
    backgroundColor: '#FEF2F2',
    borderRadius: '8px',
    border: '1px solid #FECACA'
  },
  errorIcon: {
    width: '48px',
    height: '48px',
    lineHeight: '48px',
    fontSize: '24px',
    backgroundColor: '#EF4444',
    color: '#fff',
    borderRadius: '50%',
    margin: '0 auto 16px'
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#991B1B',
    margin: '0 0 8px 0'
  },
  errorText: {
    fontSize: '14px',
    color: '#B91C1C',
    margin: '0 0 24px 0'
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#EF4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  }
};
