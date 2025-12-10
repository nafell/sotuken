/**
 * TrialLogDetail.tsx
 *
 * バッチ実験の試行ログ詳細表示コンポーネント
 * SessionDetailのUI構造を参考にした軽量版
 */

import { useState } from 'react';
import type { TrialLog, ModelConfiguration } from '../../../services/BatchExperimentApiService';

/** モデル構成定義 */
const MODEL_CONFIGURATIONS: Record<string, ModelConfiguration> = {
  'A': { id: 'A', name: 'All-5-Chat', stages: ['gpt-5-chat', 'gpt-5-chat', 'gpt-5-chat'] },
  'B': { id: 'B', name: 'All-5-mini', stages: ['gpt-5-mini', 'gpt-5-mini', 'gpt-5-mini'] },
  'C': { id: 'C', name: 'Hybrid-5Chat/4.1', stages: ['gpt-5-chat', 'gpt-4.1', 'gpt-4.1'] },
  'D': { id: 'D', name: 'Hybrid-5Chat/5mini', stages: ['gpt-5-chat', 'gpt-5-mini', 'gpt-5-mini'] },
  'E': { id: 'E', name: 'Router-based', stages: ['model-router', 'model-router', 'model-router'] },
};

interface TrialLogDetailProps {
  trial: TrialLog;
  isExpanded: boolean;
  onToggle: () => void;
}

type TabType = 'overview' | 'metrics' | 'errors';

export default function TrialLogDetail({ trial, isExpanded, onToggle }: TrialLogDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const modelConfig = MODEL_CONFIGURATIONS[trial.modelConfig];
  const hasErrors = (trial.dslErrors && trial.dslErrors.length > 0) ||
                    (trial.renderErrors && trial.renderErrors.length > 0) ||
                    trial.typeErrorCount > 0 ||
                    trial.referenceErrorCount > 0 ||
                    trial.cycleDetected ||
                    trial.runtimeError;

  const getStatusColor = () => {
    if (trial.runtimeError) return '#d32f2f';
    if (hasErrors) return '#f57c00';
    return '#388e3c';
  };

  const getStatusLabel = () => {
    if (trial.runtimeError) return 'Error';
    if (hasErrors) return 'Warning';
    return 'OK';
  };

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      marginBottom: '8px',
      overflow: 'hidden',
    }}>
      {/* ヘッダー（クリックで展開/折りたたみ） */}
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          backgroundColor: isExpanded ? '#f5f5f5' : 'white',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'monospace', color: '#666' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <span style={{ fontWeight: 'bold' }}>
            Trial #{trial.trialNumber}
          </span>
          <span style={{ color: '#666' }}>
            {trial.inputId}
          </span>
          <span style={{
            padding: '2px 8px',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '12px',
          }}>
            {trial.modelConfig}
          </span>
          <span style={{
            padding: '2px 8px',
            backgroundColor: '#fff3e0',
            borderRadius: '4px',
            fontSize: '12px',
          }}>
            Stage {trial.stage}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            padding: '2px 8px',
            backgroundColor: getStatusColor(),
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
          }}>
            {getStatusLabel()}
          </span>
          <span style={{ color: '#666', fontSize: '14px' }}>
            {trial.latencyMs}ms
          </span>
        </div>
      </div>

      {/* 展開時の詳細 */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid #e0e0e0' }}>
          {/* タブ */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#fafafa',
          }}>
            {(['overview', 'metrics', 'errors'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: activeTab === tab ? 'white' : 'transparent',
                  borderBottom: activeTab === tab ? '2px solid #1976d2' : '2px solid transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  color: activeTab === tab ? '#1976d2' : '#666',
                }}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'metrics' && 'Metrics'}
                {tab === 'errors' && `Errors ${hasErrors ? '⚠' : ''}`}
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div style={{ padding: '16px' }}>
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px' }}>
                <div style={{ color: '#666' }}>Input ID:</div>
                <div style={{ fontFamily: 'monospace' }}>{trial.inputId}</div>

                <div style={{ color: '#666' }}>Model Config:</div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>{trial.modelConfig}</span>
                  {modelConfig && (
                    <span style={{ color: '#666', marginLeft: '8px' }}>
                      ({modelConfig.name})
                    </span>
                  )}
                </div>

                <div style={{ color: '#666' }}>Stage:</div>
                <div>
                  Stage {trial.stage}
                  {modelConfig && (
                    <span style={{ color: '#666', marginLeft: '8px' }}>
                      ({modelConfig.stages[trial.stage - 1]})
                    </span>
                  )}
                </div>

                <div style={{ color: '#666' }}>Timestamp:</div>
                <div>{new Date(trial.timestamp).toLocaleString('ja-JP')}</div>

                {trial.regenerated && (
                  <>
                    <div style={{ color: '#666' }}>Regenerated:</div>
                    <div style={{ color: '#f57c00' }}>Yes (再生成あり)</div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'metrics' && (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '4px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '12px', color: '#1565c0' }}>Input Tokens</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>
                      {trial.inputTokens.toLocaleString()}
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '4px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '12px', color: '#2e7d32' }}>Output Tokens</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                      {trial.outputTokens.toLocaleString()}
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fff3e0',
                    borderRadius: '4px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '12px', color: '#e65100' }}>Latency</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
                      {trial.latencyMs.toLocaleString()}ms
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    Total Tokens
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {(trial.inputTokens + trial.outputTokens).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'errors' && (
              <div>
                {!hasErrors ? (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#388e3c',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '4px',
                  }}>
                    No errors detected
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Error Summary */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                    }}>
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: trial.typeErrorCount > 0 ? '#ffebee' : '#f5f5f5',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>Type Errors:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: trial.typeErrorCount > 0 ? '#c62828' : '#666',
                        }}>
                          {trial.typeErrorCount}
                        </span>
                      </div>

                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: trial.referenceErrorCount > 0 ? '#ffebee' : '#f5f5f5',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>Reference Errors:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: trial.referenceErrorCount > 0 ? '#c62828' : '#666',
                        }}>
                          {trial.referenceErrorCount}
                        </span>
                      </div>

                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: trial.cycleDetected ? '#ffebee' : '#f5f5f5',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>Cyclic Dependency:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: trial.cycleDetected ? '#c62828' : '#666',
                        }}>
                          {trial.cycleDetected ? 'Yes' : 'No'}
                        </span>
                      </div>

                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: trial.runtimeError ? '#ffebee' : '#f5f5f5',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>Runtime Error:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: trial.runtimeError ? '#c62828' : '#666',
                        }}>
                          {trial.runtimeError ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>

                    {/* DSL Errors */}
                    {trial.dslErrors && trial.dslErrors.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: '#c62828',
                          marginBottom: '4px',
                          fontWeight: 'bold',
                        }}>
                          DSL Errors ({trial.dslErrors.length})
                        </div>
                        <div style={{
                          padding: '8px 12px',
                          backgroundColor: '#ffebee',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          maxHeight: '150px',
                          overflowY: 'auto',
                        }}>
                          {trial.dslErrors.map((err, i) => (
                            <div key={i} style={{ marginBottom: '4px' }}>
                              • {err}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render Errors */}
                    {trial.renderErrors && trial.renderErrors.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: '#c62828',
                          marginBottom: '4px',
                          fontWeight: 'bold',
                        }}>
                          Render Errors ({trial.renderErrors.length})
                        </div>
                        <div style={{
                          padding: '8px 12px',
                          backgroundColor: '#ffebee',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          maxHeight: '150px',
                          overflowY: 'auto',
                        }}>
                          {trial.renderErrors.map((err, i) => (
                            <div key={i} style={{ marginBottom: '4px' }}>
                              • {err}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
