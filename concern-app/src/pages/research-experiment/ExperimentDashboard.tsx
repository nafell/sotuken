/**
 * ExperimentDashboard
 * 実験管理ダッシュボード
 *
 * Phase 6: 実験・評価環境構築
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { experimentApi, type ExperimentSettings } from '../../services/ExperimentApiService';

export default function ExperimentDashboard() {
  const [settings, setSettings] = useState<ExperimentSettings | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsData, healthData] = await Promise.all([
          experimentApi.getSettings(),
          experimentApi.checkHealth()
        ]);
        setSettings(settingsData);
        setHealth(healthData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
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
        <h1 style={styles.title}>Research Experiment Dashboard</h1>
        <p style={styles.subtitle}>Phase 6: Experiment Environment</p>
      </header>

      {/* Health Status */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>System Status</h2>
        <div style={styles.statusCard}>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Status:</span>
            <span style={{
              ...styles.statusValue,
              color: health?.status === 'healthy' ? '#10B981' : '#EF4444'
            }}>
              {health?.status || 'Unknown'}
            </span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Test Cases:</span>
            <span style={styles.statusValue}>{health?.config?.testCaseCount || 0}</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Widget Conditions:</span>
            <span style={styles.statusValue}>{health?.config?.widgetConditions || 0}</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Model Conditions:</span>
            <span style={styles.statusValue}>{health?.config?.modelConditions || 0}</span>
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section style={styles.section}>
        <div style={styles.actionGrid}>
          <Link to="/research-experiment/new" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, backgroundColor: '#EFF6FF', color: '#3B82F6' }}>🚀</div>
            <div style={styles.actionTitle}>Run Experiment</div>
            <div style={styles.actionDesc}>Start a new experiment session (Technical, Expert, or User mode)</div>
          </Link>
          <Link to="/research-experiment/data/sessions" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, backgroundColor: '#F0FDF4', color: '#10B981' }}>📊</div>
            <div style={styles.actionTitle}>View Data</div>
            <div style={styles.actionDesc}>Analyze session history, metrics, and replay execution flows</div>
          </Link>
          <Link to="/research-experiment/settings" style={styles.actionCard}>
            <div style={{ ...styles.actionIcon, backgroundColor: '#F3F4F6', color: '#6B7280' }}>⚙️</div>
            <div style={styles.actionTitle}>Settings</div>
            <div style={styles.actionDesc}>Configure system parameters and defaults</div>
          </Link>
        </div>
      </section>

      {/* Recent Activity (Placeholder for now) */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Activity</h2>
        <div style={styles.statusCard}>
          <div style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
            No recent sessions found.
          </div>
        </div>
      </section>

      {/* Configuration Summary */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Configuration</h2>

        <div style={styles.configSection}>
          <h3 style={styles.configTitle}>Widget Count Conditions</h3>
          <div style={styles.configGrid}>
            {settings?.widgetCountConditions.map(condition => (
              <div key={condition.id} style={styles.configCard}>
                <div style={styles.configCardTitle}>{condition.widgetCount} Widgets</div>
                <div style={styles.configCardDesc}>{condition.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.configSection}>
          <h3 style={styles.configTitle}>Model Conditions</h3>
          <div style={styles.configGrid}>
            {settings?.modelConditions.map(condition => (
              <div key={condition.id} style={styles.configCard}>
                <div style={styles.configCardTitle}>{condition.id}</div>
                <div style={styles.configCardDesc}>{condition.description}</div>
                <div style={styles.configCardMeta}>{condition.modelId}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.configSection}>
          <h3 style={styles.configTitle}>Experiment Types</h3>
          <div style={styles.configGrid}>
            {settings?.experimentTypes.map(type => (
              <div key={type.id} style={styles.configCard}>
                <div style={styles.configCardTitle}>{type.name}</div>
                <div style={styles.configCardDesc}>{type.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Defaults */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Default Settings</h2>
        <div style={styles.defaultsCard}>
          <div style={styles.defaultItem}>
            <span style={styles.defaultLabel}>Widget Count:</span>
            <span style={styles.defaultValue}>{settings?.defaults.widgetCount}</span>
          </div>
          <div style={styles.defaultItem}>
            <span style={styles.defaultLabel}>Model:</span>
            <span style={styles.defaultValue}>{settings?.defaults.modelId}</span>
          </div>
          <div style={styles.defaultItem}>
            <span style={styles.defaultLabel}>Experiment Type:</span>
            <span style={styles.defaultValue}>{settings?.defaults.experimentType}</span>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <Link to="/" style={styles.backLink}>← Back to Main App</Link>
      </footer>
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
    marginBottom: '32px',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '4px'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '16px'
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
  statusCard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    backgroundColor: '#F9FAFB',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statusLabel: {
    fontSize: '12px',
    color: '#6B7280',
    textTransform: 'uppercase'
  },
  statusValue: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827'
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  actionCard: {
    display: 'block',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    textDecoration: 'none',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  actionIcon: {
    fontSize: '32px',
    marginBottom: '12px'
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '4px'
  },
  actionDesc: {
    fontSize: '14px',
    color: '#6B7280'
  },
  configSection: {
    marginBottom: '24px'
  },
  configTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6B7280',
    marginBottom: '12px'
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  configCard: {
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  configCardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '4px'
  },
  configCardDesc: {
    fontSize: '12px',
    color: '#6B7280'
  },
  configCardMeta: {
    fontSize: '11px',
    color: '#9CA3AF',
    marginTop: '8px',
    fontFamily: 'monospace'
  },
  defaultsCard: {
    display: 'flex',
    gap: '32px',
    padding: '20px',
    backgroundColor: '#EFF6FF',
    borderRadius: '8px',
    border: '1px solid #BFDBFE'
  },
  defaultItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  defaultLabel: {
    fontSize: '12px',
    color: '#3B82F6'
  },
  defaultValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1E40AF'
  },
  footer: {
    marginTop: '48px',
    paddingTop: '24px',
    borderTop: '1px solid #E5E7EB'
  },
  backLink: {
    color: '#6B7280',
    textDecoration: 'none',
    fontSize: '14px'
  }
};
