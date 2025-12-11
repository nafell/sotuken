/**
 * TrialWithStagesDetail.tsx
 *
 * バッチ実験の試行（Trial）を階層構造で表示するコンポーネント
 * Trial > Stage1, Stage2, Stage3 の折りたたみ構造
 */

import { useState } from 'react';
import type { TrialLog, ModelConfiguration } from '../../../services/BatchExperimentApiService';
import TrialLogDetail from './TrialLogDetail';

/** Trial + Stages の階層構造型 */
export interface TrialWithStages {
  trialKey: string;
  modelConfig: string;
  inputId: string;
  trialNumber: number;
  stages: Map<number, TrialLog>;
}

interface Props {
  trial: TrialWithStages;
  isExpanded: boolean;
  onToggle: () => void;
}

/** モデル構成定義 */
const MODEL_CONFIGURATIONS: Record<string, ModelConfiguration> = {
  'A': { id: 'A', name: 'All-5-Chat', stages: ['gpt-5-chat', 'gpt-5-chat', 'gpt-5-chat'] },
  'B': { id: 'B', name: 'All-5-mini', stages: ['gpt-5-mini', 'gpt-5-mini', 'gpt-5-mini'] },
  'C': { id: 'C', name: 'Hybrid-5Chat/4.1', stages: ['gpt-5-chat', 'gpt-4.1', 'gpt-4.1'] },
  'D': { id: 'D', name: 'Hybrid-5Chat/5mini', stages: ['gpt-5-chat', 'gpt-5-mini', 'gpt-5-mini'] },
  'E': { id: 'E', name: 'Router-based', stages: ['model-router', 'model-router', 'model-router'] },
};

export default function TrialWithStagesDetail({ trial, isExpanded, onToggle }: Props) {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  // 全体ステータス判定
  const hasRuntimeError = Array.from(trial.stages.values()).some(s => s.runtimeError);
  const hasAnyError = Array.from(trial.stages.values()).some(s =>
    (s.dslErrors && s.dslErrors.length > 0) || (s.renderErrors && s.renderErrors.length > 0)
  );

  const statusColor = hasRuntimeError ? '#d32f2f' : hasAnyError ? '#f57c00' : '#388e3c';
  const statusLabel = hasRuntimeError ? 'Error' : hasAnyError ? 'Warning' : 'OK';

  const modelConfig = MODEL_CONFIGURATIONS[trial.modelConfig];

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', marginBottom: '8px', backgroundColor: '#fff' }}>
      {/* Trial ヘッダー */}
      <div
        onClick={onToggle}
        style={{
          padding: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: isExpanded ? '#f5f5f5' : 'white',
          borderRadius: isExpanded ? '4px 4px 0 0' : '4px',
        }}
      >
        <span style={{ color: '#666' }}>{isExpanded ? '▼' : '▶'}</span>
        <span style={{ fontWeight: 'bold' }}>Trial #{trial.trialNumber}</span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#666',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '200px',
        }}>
          {trial.inputId}
        </span>
        <span style={{
          backgroundColor: '#e3f2fd',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 'bold',
          color: '#1565c0',
          fontSize: '12px',
        }}>
          {trial.modelConfig}
        </span>
        {modelConfig && (
          <span style={{ fontSize: '11px', color: '#666' }}>
            ({modelConfig.name})
          </span>
        )}
        <span style={{ fontSize: '12px', color: '#666' }}>
          {trial.stages.size}/3 stages
        </span>
        <span style={{
          marginLeft: 'auto',
          backgroundColor: statusColor,
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          {statusLabel}
        </span>
      </div>

      {/* 展開時: ステージ一覧 */}
      {isExpanded && (
        <div style={{ paddingLeft: '16px', paddingRight: '8px', paddingBottom: '8px', borderTop: '1px solid #e0e0e0' }}>
          {[1, 2, 3].map(stageNum => {
            const stageLog = trial.stages.get(stageNum);
            if (!stageLog) {
              // 未完了ステージ
              return (
                <div
                  key={stageNum}
                  style={{
                    padding: '12px',
                    margin: '8px 0',
                    color: '#999',
                    fontStyle: 'italic',
                    backgroundColor: '#fafafa',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{
                    backgroundColor: '#e0e0e0',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}>
                    Stage {stageNum}
                  </span>
                  <span>Pending...</span>
                  {modelConfig && (
                    <span style={{ fontSize: '11px', color: '#bbb' }}>
                      ({modelConfig.stages[stageNum - 1]})
                    </span>
                  )}
                </div>
              );
            }
            return (
              <div key={stageLog.id} style={{ margin: '8px 0' }}>
                <TrialLogDetail
                  trial={stageLog}
                  isExpanded={expandedStage === stageNum}
                  onToggle={() => setExpandedStage(expandedStage === stageNum ? null : stageNum)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
