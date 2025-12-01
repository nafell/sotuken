/**
 * SessionList
 * 実験セッション一覧画面
 *
 * Phase 6: 実験・評価環境構築
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { experimentApi, type ExperimentSession } from '../../services/ExperimentApiService';

export default function SessionList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ExperimentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'technical' | 'expert' | 'user'>('all');

  useEffect(() => {
    async function loadSessions() {
      try {
        const params = filter !== 'all' ? { experimentType: filter } : {};
        const { sessions: data } = await experimentApi.getSessions(params);
        setSessions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, [filter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (session: ExperimentSession) => {
    if (session.generationSuccess === true) return '#10B981';
    if (session.generationSuccess === false) return '#EF4444';
    if (session.completedAt) return '#6B7280';
    return '#F59E0B';
  };

  const getStatusText = (session: ExperimentSession) => {
    if (session.generationSuccess === true) return 'Success';
    if (session.generationSuccess === false) return 'Failed';
    if (session.completedAt) return 'Completed';
    return 'In Progress';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Experiment Sessions</h1>
          <p style={styles.subtitle}>{sessions.length} sessions recorded</p>
        </div>
        <Link to="/research-experiment" style={styles.backButton}>← Dashboard</Link>
      </header>

      {/* Filter */}
      <div style={styles.filterBar}>
        <label style={styles.filterLabel}>Filter by Type:</label>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as any);
            setLoading(true);
          }}
          style={styles.filterSelect}
        >
          <option value="all">All</option>
          <option value="technical">Technical</option>
          <option value="expert">Expert</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Session Table */}
      {sessions.length > 0 ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Session ID</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Case</th>
                <th style={styles.th}>Model</th>
                <th style={styles.th}>Widgets</th>
                <th style={styles.th}>Tokens</th>
                <th style={styles.th}>Latency</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Started</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.sessionId} style={styles.tr}>
                  <td style={styles.td}>
                    <span style={styles.sessionId}>
                      {session.sessionId.substring(0, 8)}...
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.typeBadge}>{session.experimentType}</span>
                  </td>
                  <td style={styles.td}>{session.caseId}</td>
                  <td style={styles.td}>
                    <span style={styles.modelId}>
                      {session.modelId.split('-').pop()}
                    </span>
                  </td>
                  <td style={styles.td}>{session.widgetCount}</td>
                  <td style={styles.td}>
                    {session.totalTokens?.toLocaleString() || '-'}
                  </td>
                  <td style={styles.td}>
                    {session.totalLatencyMs ? `${session.totalLatencyMs}ms` : '-'}
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(session) + '20',
                        color: getStatusColor(session)
                      }}
                    >
                      {getStatusText(session)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {formatDate(session.startedAt)}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => navigate(`/research-experiment/data/sessions/${session.sessionId}`)}
                      style={styles.viewButton}
                    >
                      View
                    </button>
                    {session.generationSuccess && (
                      <button
                        onClick={() => navigate(`/research-experiment/data/replay/${session.sessionId}`)}
                        style={styles.replayButton}
                      >
                        Replay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.empty}>
          No sessions found.
          <Link to="/research-experiment/cases" style={styles.createLink}>
            Create your first session →
          </Link>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
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
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    padding: '12px 16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  },
  filterLabel: {
    fontSize: '14px',
    color: '#374151'
  },
  filterSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    backgroundColor: '#fff'
  },
  tableWrapper: {
    overflowX: 'auto',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid #E5E7EB'
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#111827',
    whiteSpace: 'nowrap'
  },
  sessionId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#6B7280'
  },
  typeBadge: {
    fontSize: '11px',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#EFF6FF',
    color: '#3B82F6',
    textTransform: 'capitalize'
  },
  modelId: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#6B7280'
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '4px'
  },
  viewButton: {
    padding: '4px 12px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    marginRight: '8px'
  },
  replayButton: {
    padding: '4px 12px',
    backgroundColor: '#7C3AED',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  empty: {
    textAlign: 'center',
    padding: '48px',
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  },
  createLink: {
    display: 'block',
    marginTop: '12px',
    color: '#3B82F6',
    textDecoration: 'none'
  }
};
