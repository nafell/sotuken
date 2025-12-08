/**
 * TechnicalModeConfig
 * 技術検証モード設定画面
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { experimentApi, type TestCaseSummary, type ExperimentSettings } from '../../../services/ExperimentApiService';

export default function TechnicalModeConfig() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<ExperimentSettings | null>(null);
    const [testCases, setTestCases] = useState<TestCaseSummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Config State
    const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
    const [widgetCount, setWidgetCount] = useState(12);
    const [modelId, setModelId] = useState('gemini-2.5-flash-lite');
    const [useMockWidgetSelection, setUseMockWidgetSelection] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const [settingsData, casesData] = await Promise.all([
                    experimentApi.getSettings(),
                    experimentApi.getTestCases()
                ]);
                setSettings(settingsData);
                setTestCases(casesData);
                setWidgetCount(settingsData.defaults.widgetCount);
                setModelId(settingsData.defaults.modelId);

                // Default select all cases
                setSelectedCaseIds(new Set(casesData.map(c => c.caseId)));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleToggleCase = (caseId: string) => {
        const newSelected = new Set(selectedCaseIds);
        if (newSelected.has(caseId)) {
            newSelected.delete(caseId);
        } else {
            newSelected.add(caseId);
        }
        setSelectedCaseIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedCaseIds.size === testCases.length) {
            setSelectedCaseIds(new Set());
        } else {
            setSelectedCaseIds(new Set(testCases.map(c => c.caseId)));
        }
    };

    const handleStart = async () => {
        if (selectedCaseIds.size === 0) return;

        // TODO: Implement batch execution logic or queueing
        // For now, just start the first selected case
        const firstCaseId = Array.from(selectedCaseIds)[0];

        // Pass configuration via state or URL params
        // In a real implementation, we might create a "BatchSession" here
        navigate(`/research-experiment/execute/${firstCaseId}?mode=technical&model=${modelId}&widgets=${widgetCount}&useMock=${useMockWidgetSelection}`);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <Link to="/research-experiment/new" style={styles.backLink}>← Back to Mode Selection</Link>
                <h1 style={styles.title}>Technical Validation Setup</h1>
                <p style={styles.subtitle}>Configure automated test execution parameters.</p>
            </header>

            <div style={styles.content}>
                <div style={styles.configSection}>
                    <h2 style={styles.sectionTitle}>1. Environment Settings</h2>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Model</label>
                        <select
                            value={modelId}
                            onChange={e => setModelId(e.target.value)}
                            style={styles.select}
                        >
                            {settings?.modelConditions.map(m => (
                                <option key={m.id} value={m.modelId}>{m.modelId} ({m.description})</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Widget Count Condition</label>
                        <select
                            value={widgetCount}
                            onChange={e => setWidgetCount(Number(e.target.value))}
                            style={styles.select}
                        >
                            {settings?.widgetCountConditions.map(c => (
                                <option key={c.id} value={c.widgetCount}>{c.widgetCount} Widgets - {c.description}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={useMockWidgetSelection}
                                onChange={e => setUseMockWidgetSelection(e.target.checked)}
                                style={styles.checkbox}
                            />
                            モックWidget選定を使用
                        </label>
                        <p style={styles.hint}>
                            有効にすると、LLM呼び出しをスキップしてテストケースのexpectedFlowを使用します。
                            再現性の高いテストに有効です。
                        </p>
                    </div>
                </div>

                <div style={styles.configSection}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>2. Test Cases ({selectedCaseIds.size} selected)</h2>
                        <button onClick={handleSelectAll} style={styles.textButton}>
                            {selectedCaseIds.size === testCases.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div style={styles.caseList}>
                        {testCases.map(testCase => (
                            <label key={testCase.caseId} style={styles.caseItem}>
                                <input
                                    type="checkbox"
                                    checked={selectedCaseIds.has(testCase.caseId)}
                                    onChange={() => handleToggleCase(testCase.caseId)}
                                    style={styles.checkbox}
                                />
                                <div>
                                    <div style={styles.caseId}>{testCase.caseId}</div>
                                    <div style={styles.caseTitle}>{testCase.title}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div style={styles.actions}>
                    <button
                        onClick={handleStart}
                        disabled={selectedCaseIds.size === 0}
                        style={{
                            ...styles.startButton,
                            opacity: selectedCaseIds.size === 0 ? 0.5 : 1,
                            cursor: selectedCaseIds.size === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Start Automated Execution
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
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    sectionTitle: { fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' },
    select: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' },
    caseList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', maxHeight: '300px', overflowY: 'auto' },
    caseItem: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer' },
    checkbox: { marginTop: '4px' },
    caseId: { fontSize: '12px', color: '#6B7280', fontWeight: 500 },
    caseTitle: { fontSize: '14px', fontWeight: 500 },
    textButton: { background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: '14px' },
    actions: { textAlign: 'right' },
    startButton: { padding: '12px 24px', backgroundColor: '#0284C7', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600 },
    checkboxLabel: { display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', cursor: 'pointer' },
    hint: { fontSize: '12px', color: '#6B7280', margin: '4px 0 0 24px' }
};
