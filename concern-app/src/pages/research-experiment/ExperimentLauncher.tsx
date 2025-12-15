/**
 * ExperimentLauncher
 * 実験モード選択ランチャー
 *
 * Phase 7: 実験環境統合
 */

import { Link } from 'react-router-dom';

export default function ExperimentLauncher() {
    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <Link to="/research-experiment" style={styles.backLink}>← Back to Dashboard</Link>
                <h1 style={styles.title}>Start New Experiment</h1>
                <p style={styles.subtitle}>Select the experiment mode appropriate for your purpose.</p>
            </header>

            <div style={styles.grid}>
                {/* Technical Validation Mode */}
                <Link to="/research-experiment/new/technical" style={styles.card}>
                    <div style={{ ...styles.icon, backgroundColor: '#E0F2FE', color: '#0284C7' }}>⚡️</div>
                    <h2 style={styles.cardTitle}>Technical Validation</h2>
                    <p style={styles.cardDesc}>
                        Automated execution of test cases to measure system performance (latency, token usage, error rates).
                    </p>
                    <ul style={styles.featureList}>
                        <li>Batch execution</li>
                        <li>No UI rendering (optional)</li>
                        <li>Performance metrics focus</li>
                    </ul>
                </Link>

                {/* Expert Evaluation Mode */}
                <Link to="/research-experiment/new/expert" style={styles.card}>
                    <div style={{ ...styles.icon, backgroundColor: '#F3E8FF', color: '#7C3AED' }}>🎓</div>
                    <h2 style={styles.cardTitle}>Expert Evaluation</h2>
                    <p style={styles.cardDesc}>
                        Manual operation by an expert evaluator to assess the quality of generated UI flows.
                    </p>
                    <ul style={styles.featureList}>
                        <li>Pre-defined test cases</li>
                        <li>Evaluator observation</li>
                        <li>Quality scoring</li>
                    </ul>
                </Link>

                {/* User Experiment Mode */}
                <Link to="/research-experiment/new/user" style={styles.card}>
                    <div style={{ ...styles.icon, backgroundColor: '#DCFCE7', color: '#16A34A' }}>👥</div>
                    <h2 style={styles.cardTitle}>User Experiment</h2>
                    <p style={styles.cardDesc}>
                        Real-world usage by participants to verify effectiveness in organizing thoughts.
                    </p>
                    <ul style={styles.featureList}>
                        <li>Free-text input</li>
                        <li>Participant interaction</li>
                        <li>Subjective feedback</li>
                    </ul>
                </Link>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '40px 24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
        marginBottom: '48px',
        textAlign: 'center'
    },
    backLink: {
        display: 'inline-block',
        marginBottom: '16px',
        color: '#6B7280',
        textDecoration: 'none',
        fontSize: '14px'
    },
    title: {
        fontSize: '32px',
        fontWeight: 700,
        color: '#111827',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: '16px',
        color: '#6B7280',
        margin: 0
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        padding: '32px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        textDecoration: 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        color: 'inherit'
    },
    icon: {
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        marginBottom: '24px'
    },
    cardTitle: {
        fontSize: '20px',
        fontWeight: 600,
        color: '#111827',
        margin: '0 0 12px 0'
    },
    cardDesc: {
        fontSize: '14px',
        color: '#6B7280',
        lineHeight: '1.5',
        marginBottom: '24px',
        flex: 1
    },
    featureList: {
        margin: 0,
        padding: '0 0 0 20px',
        fontSize: '13px',
        color: '#4B5563',
        lineHeight: '1.6'
    }
};
