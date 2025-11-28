/**
 * CaseSelection
 * テストケース選択画面
 *
 * Phase 6: 実験・評価環境構築
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { experimentApi, type TestCaseSummary } from '../../services/ExperimentApiService';

export default function CaseSelection() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<TestCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'simple' | 'medium' | 'complex'>('all');
  const [reactivityFilter, setReactivityFilter] = useState<'all' | 'yes' | 'no'>('all');

  useEffect(() => {
    async function loadCases() {
      try {
        const casesData = await experimentApi.getTestCases();
        setCases(casesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cases');
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, []);

  const filteredCases = cases.filter(c => {
    if (filter !== 'all' && c.complexity !== filter) return false;
    if (reactivityFilter === 'yes' && !c.hasReactivity) return false;
    if (reactivityFilter === 'no' && c.hasReactivity) return false;
    return true;
  });

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'complex': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading test cases...</div>
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
          <h1 style={styles.title}>Test Cases</h1>
          <p style={styles.subtitle}>Select a test case for expert evaluation</p>
        </div>
        <Link to="/research-experiment" style={styles.backButton}>← Dashboard</Link>
      </header>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Complexity:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={styles.filterSelect}
          >
            <option value="all">All</option>
            <option value="simple">Simple</option>
            <option value="medium">Medium</option>
            <option value="complex">Complex</option>
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Reactivity:</label>
          <select
            value={reactivityFilter}
            onChange={(e) => setReactivityFilter(e.target.value as any)}
            style={styles.filterSelect}
          >
            <option value="all">All</option>
            <option value="yes">With Reactivity</option>
            <option value="no">Without Reactivity</option>
          </select>
        </div>
        <div style={styles.filterInfo}>
          Showing {filteredCases.length} of {cases.length} cases
        </div>
      </div>

      {/* Case List */}
      <div style={styles.caseGrid}>
        {filteredCases.map(testCase => (
          <div
            key={testCase.caseId}
            style={styles.caseCard}
            onClick={() => navigate(`/research-experiment/execute/${testCase.caseId}`)}
          >
            <div style={styles.caseHeader}>
              <span style={styles.caseId}>{testCase.caseId}</span>
              <span
                style={{
                  ...styles.complexityBadge,
                  backgroundColor: getComplexityColor(testCase.complexity) + '20',
                  color: getComplexityColor(testCase.complexity)
                }}
              >
                {testCase.complexity}
              </span>
            </div>
            <h3 style={styles.caseTitle}>{testCase.title}</h3>
            <div style={styles.caseMeta}>
              <span style={styles.categoryBadge}>{testCase.category}</span>
              {testCase.hasReactivity && (
                <span style={styles.reactivityBadge}>Reactivity</span>
              )}
            </div>
            <button
              style={styles.executeButton}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/research-experiment/execute/${testCase.caseId}`);
              }}
            >
              Execute →
            </button>
          </div>
        ))}
      </div>

      {filteredCases.length === 0 && (
        <div style={styles.empty}>
          No test cases match the current filters.
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
  filters: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
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
  filterInfo: {
    marginLeft: 'auto',
    fontSize: '14px',
    color: '#6B7280'
  },
  caseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  caseCard: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  caseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  caseId: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  complexityBadge: {
    fontSize: '11px',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase'
  },
  caseTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 12px 0',
    lineHeight: 1.4
  },
  caseMeta: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  categoryBadge: {
    fontSize: '12px',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  reactivityBadge: {
    fontSize: '12px',
    color: '#7C3AED',
    backgroundColor: '#F3E8FF',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  executeButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  empty: {
    textAlign: 'center',
    padding: '48px',
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  }
};
