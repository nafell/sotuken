/**
 * UserModeConfig
 * ユーザー実験モード設定画面
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { experimentApi, type ExperimentSettings } from '../../../services/ExperimentApiService';

export default function UserModeConfig() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<ExperimentSettings | null>(null);
    const [loading, setLoading] = useState(true);

    // Config State
    const [participantId, setParticipantId] = useState('');
    const [widgetCount, setWidgetCount] = useState(12);

    // User mode usually fixes the model to the best one or randomizes it, 
    // but for now we'll use the default from settings
    const [modelId, setModelId] = useState('gemini-2.5-flash-lite');

    useEffect(() => {
        async function loadData() {
            try {
                const settingsData = await experimentApi.getSettings();
                setSettings(settingsData);
                setWidgetCount(settingsData.defaults.widgetCount);
                setModelId(settingsData.defaults.modelId);

                // Auto-generate participant ID
                setParticipantId(`user_${Date.now().toString(36).slice(-4)}`);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleStart = () => {
        if (!participantId) return;

        // For user mode, we use a special caseId 'custom' or empty
        navigate(
            `/research-experiment/execute/custom?mode=user&model=${modelId}&widgets=${widgetCount}&evaluator=${participantId}`
        );
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <Link to="/research-experiment/new" style={styles.backLink}>← Back to Mode Selection</Link>
                <h1 style={styles.title}>User Experiment Setup</h1>
                <p style={styles.subtitle}>Prepare for a participant session.</p>
            </header>

            <div style={styles.content}>
                <div style={styles.configSection}>
                    <h2 style={styles.sectionTitle}>1. Participant Info</h2>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Participant ID</label>
                        <input
                            type="text"
                            value={participantId}
                            onChange={e => setParticipantId(e.target.value)}
                            style={styles.input}
                        />
                        <p style={styles.hint}>Auto-generated, but can be customized.</p>
                    </div>
                </div>

                <div style={styles.configSection}>
                    <h2 style={styles.sectionTitle}>2. Condition Settings</h2>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Widget Count Condition</label>
                        <select
                            value={widgetCount}
                            onChange={e => setWidgetCount(Number(e.target.value))}
                            style={styles.select}
                        >
                            {settings?.widgetCountConditions.map(c => (
                                <option key={c.id} value={c.widgetCount}>{c.widgetCount} Widgets</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={styles.infoBox}>
                    <h3 style={styles.infoTitle}>Instructions for Facilitator</h3>
                    <ul style={styles.infoList}>
                        <li>Ensure the participant has signed the consent form.</li>
                        <li>Explain that they can freely write about any concern.</li>
                        <li>The session will start with a blank input screen.</li>
                    </ul>
                </div>

                <div style={styles.actions}>
                    <button
                        onClick={handleStart}
                        disabled={!participantId}
                        style={{
                            ...styles.startButton,
                            opacity: !participantId ? 0.5 : 1,
                            cursor: !participantId ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Start Experiment Session
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: { marginBottom: '32px' },
    backLink: { color: '#6B7280', textDecoration: 'none', fontSize: '14px', display: 'block', marginBottom: '16px' },
    title: { fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' },
    subtitle: { color: '#6B7280', margin: 0 },
    content: { display: 'flex', flexDirection: 'column', gap: '32px' },
    configSection: { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #E5E7EB' },
    sectionTitle: { fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' },
    input: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '16px' },
    select: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '16px' },
    hint: { fontSize: '12px', color: '#6B7280', marginTop: '4px' },
    infoBox: { backgroundColor: '#F0FDF4', padding: '20px', borderRadius: '8px', border: '1px solid #BBF7D0' },
    infoTitle: { fontSize: '14px', fontWeight: 600, color: '#15803D', margin: '0 0 8px 0' },
    infoList: { margin: 0, padding: '0 0 0 20px', fontSize: '14px', color: '#166534' },
    actions: { textAlign: 'right' },
    startButton: { padding: '12px 24px', backgroundColor: '#16A34A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600 }
};
