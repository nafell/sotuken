/**
 * ExpertModeConfig
 * 専門家評価モード設定画面
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { experimentApi, type TestCaseSummary, type ExperimentSettings, type LLMProvider } from '../../../services/ExperimentApiService';

export default function ExpertModeConfig() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<ExperimentSettings | null>(null);
    const [testCases, setTestCases] = useState<TestCaseSummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Config State
    const [evaluatorId, setEvaluatorId] = useState('');
    const [selectedCaseId, setSelectedCaseId] = useState('');
    const [widgetCount, setWidgetCount] = useState(12);
    const [provider, setProvider] = useState<LLMProvider>('gemini');
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
                if (casesData.length > 0) setSelectedCaseId(casesData[0].caseId);

                // Auto-generate evaluator ID (like UserModeConfig)
                setEvaluatorId(`expert_${Date.now().toString(36).slice(-4)}`);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleStart = () => {
        if (!selectedCaseId || !evaluatorId) return;

        navigate(
            `/research-experiment/execute/${selectedCaseId}?mode=expert&provider=${provider}&model=${modelId}&widgets=${widgetCount}&evaluator=${evaluatorId}&useMock=${useMockWidgetSelection}`
        );
    };

    // 選択中のproviderに応じたモデル一覧をフィルタ
    const filteredModels = settings?.modelConditions.filter(m => m.provider === provider) || [];

    // providerが変わったらmodelIdをリセット
    useEffect(() => {
        if (filteredModels.length > 0 && !filteredModels.find(m => m.modelId === modelId)) {
            setModelId(filteredModels[0].modelId);
        }
    }, [provider, filteredModels, modelId]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    const selectedCase = testCases.find(c => c.caseId === selectedCaseId);

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <Link to="/research-experiment/new" style={styles.backLink}>← Back to Mode Selection</Link>
                <h1 style={styles.title}>Expert Evaluation Setup</h1>
                <p style={styles.subtitle}>Configure session for expert evaluation.</p>
            </header>

            <div style={styles.content}>
                <div style={styles.configSection}>
                    <h2 style={styles.sectionTitle}>1. Evaluator Info</h2>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Evaluator ID</label>
                        <input
                            type="text"
                            value={evaluatorId}
                            onChange={e => setEvaluatorId(e.target.value)}
                            placeholder="e.g. expert_01"
                            style={styles.input}
                        />
                        <p style={styles.hint}>Auto-generated, but can be customized.</p>
                    </div>
                </div>

                <div style={styles.configSection}>
                    <h2 style={styles.sectionTitle}>2. Environment Settings</h2>
                    <div style={styles.row}>
                        <div style={{ ...styles.formGroup, flex: 1 }}>
                            <label style={styles.label}>LLM Provider</label>
                            <select
                                value={provider}
                                onChange={e => setProvider(e.target.value as LLMProvider)}
                                style={styles.select}
                            >
                                <option value="gemini">Google AI Studio</option>
                                <option value="azure">Azure OpenAI</option>
                            </select>
                        </div>
                        <div style={{ ...styles.formGroup, flex: 1 }}>
                            <label style={styles.label}>Model</label>
                            <select
                                value={modelId}
                                onChange={e => setModelId(e.target.value)}
                                style={styles.select}
                            >
                                {filteredModels.map(m => (
                                    <option key={m.id} value={m.modelId}>{m.modelId} ({m.description})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={styles.row}>
                        <div style={{ ...styles.formGroup, flex: 1 }}>
                            <label style={styles.label}>Widget Count</label>
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
                        <div style={{ ...styles.formGroup, flex: 1 }} />
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
                        </p>
                    </div>
                </div>

                <div style={styles.configSection}>
                    <h2 style={styles.sectionTitle}>3. Select Test Case</h2>
                    <div style={styles.formGroup}>
                        <select
                            value={selectedCaseId}
                            onChange={e => setSelectedCaseId(e.target.value)}
                            style={styles.select}
                        >
                            {testCases.map(c => (
                                <option key={c.caseId} value={c.caseId}>{c.caseId}: {c.title}</option>
                            ))}
                        </select>
                    </div>
                    {selectedCase && (
                        <div style={styles.casePreview}>
                            <div style={styles.previewLabel}>Category: {selectedCase.category}</div>
                            <div style={styles.previewLabel}>Complexity: {selectedCase.complexity}</div>
                        </div>
                    )}
                </div>

                <div style={styles.actions}>
                    <button
                        onClick={handleStart}
                        disabled={!selectedCaseId || !evaluatorId}
                        style={{
                            ...styles.startButton,
                            opacity: !selectedCaseId || !evaluatorId ? 0.5 : 1,
                            cursor: !selectedCaseId || !evaluatorId ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Start Evaluation Session
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
    row: { display: 'flex', gap: '16px' },
    label: { display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' },
    input: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '16px' },
    select: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '16px' },
    casePreview: { marginTop: '16px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' },
    previewLabel: { fontSize: '12px', color: '#6B7280', marginBottom: '4px' },
    previewText: { fontSize: '14px', color: '#111827', marginBottom: '8px', whiteSpace: 'pre-wrap' },
    previewMeta: { fontSize: '12px', color: '#4B5563', fontStyle: 'italic' },
    actions: { textAlign: 'right' },
    startButton: { padding: '12px 24px', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600 },
    checkbox: { marginRight: '8px' },
    checkboxLabel: { display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', cursor: 'pointer' },
    hint: { fontSize: '12px', color: '#6B7280', margin: '4px 0 0 24px' }
};
