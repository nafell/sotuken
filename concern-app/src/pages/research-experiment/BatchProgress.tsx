/**
 * BatchProgress.tsx
 *
 * Layer1/Layer4自動評価実験の進捗表示ページ
 * SSEでリアルタイム進捗を表示
 *
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getBatchExperimentApi,
  type BatchProgress as BatchProgressType,
  type BatchStatus,
  type ModelConfiguration,
  type RunningTask,
  type TrialLog,
} from '../../services/BatchExperimentApiService';
import TrialWithStagesDetail, { type TrialWithStages } from './components/TrialWithStagesDetail';
import { validateUISpecHeadless } from '../../components/experiment/HeadlessValidator';
import type { UISpec } from '../../types/v4/ui-spec.types';

/** モデル構成定義（フロントエンド用） */
const MODEL_CONFIGURATIONS: Record<string, ModelConfiguration> = {
  'A': { id: 'A', name: 'All-5-Chat', stages: ['gpt-5-chat', 'gpt-5-chat', 'gpt-5-chat'] },
  'B': { id: 'B', name: 'All-5-mini', stages: ['gpt-5-mini', 'gpt-5-mini', 'gpt-5-mini'] },
  'C': { id: 'C', name: 'Hybrid-5Chat/4.1', stages: ['gpt-5-chat', 'gpt-4.1', 'gpt-4.1'] },
  'D': { id: 'D', name: 'Hybrid-5Chat/5mini', stages: ['gpt-5-chat', 'gpt-5-mini', 'gpt-5-mini'] },
  'E': { id: 'E', name: 'Router-based', stages: ['model-router', 'model-router', 'model-router'] },
};

export default function BatchProgress() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const api = getBatchExperimentApi();

  // タスク履歴ログ用の型
  interface TaskLogEntry {
    id: string;
    timestamp: Date;
    modelConfig: string;
    inputId: string;
    stage: number;
    status: 'running' | 'completed';
  }

  // State
  const [progress, setProgress] = useState<BatchProgressType | null>(null);
  const [status, setStatus] = useState<BatchStatus>('queued');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [taskHistory, setTaskHistory] = useState<TaskLogEntry[]>([]);
  // 完了タスクの詳細表示用（Trial > Stage階層構造）
  const [completedTrials, setCompletedTrials] = useState<Map<string, TrialWithStages>>(new Map());
  const [expandedTrialId, setExpandedTrialId] = useState<string | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTaskIdRef = useRef<string | null>(null);
  const previousRunningTasksRef = useRef<RunningTask[]>([]);
  // ステージ追跡用ref
  const previousTaskStagesRef = useRef<Map<string, number>>(new Map());

  // ステージログ追加関数
  const addCompletedStageLog = useCallback((log: TrialLog) => {
    setCompletedTrials(prev => {
      const key = `${log.modelConfig}-${log.inputId}`;
      const newMap = new Map(prev);
      const existing = newMap.get(key);

      if (existing) {
        existing.stages.set(log.stage, log);
        newMap.set(key, { ...existing, stages: new Map(existing.stages) });
      } else {
        newMap.set(key, {
          trialKey: key,
          modelConfig: log.modelConfig,
          inputId: log.inputId,
          trialNumber: log.trialNumber,
          stages: new Map([[log.stage, log]]),
        });
      }
      return newMap;
    });

    // Stage 3のフロントエンド検証
    if (log.stage === 3 && log.generatedData) {
      try {
        const uiSpec = log.generatedData as UISpec;
        const validationResult = validateUISpecHeadless(uiSpec);

        api.sendRenderFeedback(log.id, {
          stage: 3,
          renderErrors: validationResult.renderErrors,
          reactComponentErrors: validationResult.reactComponentErrors,
          jotaiAtomErrors: validationResult.jotaiAtomErrors,
          typeErrorCount: validationResult.typeErrorCount,
          referenceErrorCount: validationResult.referenceErrorCount,
          cycleDetected: validationResult.cycleDetected,
        }).catch(err => console.error('Failed to send validation feedback:', err));
      } catch (err) {
        console.error('Failed to validate UISpec:', err);
      }
    }
  }, [api]);

  // SSE接続
  useEffect(() => {
    if (!batchId) return;

    // 初期ステータス取得
    api.getBatchStatus(batchId)
      .then(data => {
        setProgress(data.progress);
        setStatus(data.status);
        setStartedAt(data.startedAt ?? null);
      })
      .catch(err => setError(err.message));

    // SSEに接続
    cleanupRef.current = api.subscribeToProgress(batchId, {
      onProgress: (p) => {
        setProgress(p);
        setStatus(p.status);

        // runningTasksからステージ完了を検出
        if (p.runningTasks) {
          const completedStages: Array<{modelConfig: string; inputId: string; completedStage: number}> = [];
          const currentTaskKeys = new Set(p.runningTasks.map(t => `${t.modelConfig}-${t.inputId}`));

          // 1. タスクが消えた場合 = 残りステージ全て完了
          for (const prev of previousRunningTasksRef.current) {
            const key = `${prev.modelConfig}-${prev.inputId}`;
            if (!currentTaskKeys.has(key)) {
              const prevStage = previousTaskStagesRef.current.get(key) ?? prev.stage;
              for (let s = prevStage; s <= 3; s++) {
                completedStages.push({ modelConfig: prev.modelConfig, inputId: prev.inputId, completedStage: s });
              }
              previousTaskStagesRef.current.delete(key);
            }
          }

          // 2. ステージが進んだ場合 = 前ステージ完了
          for (const task of p.runningTasks) {
            const key = `${task.modelConfig}-${task.inputId}`;
            const prevStage = previousTaskStagesRef.current.get(key);
            if (prevStage !== undefined && task.stage > prevStage) {
              completedStages.push({ modelConfig: task.modelConfig, inputId: task.inputId, completedStage: prevStage });
            }
            previousTaskStagesRef.current.set(key, task.stage);
          }

          // 3. 完了したステージのログを取得
          for (const completed of completedStages) {
            api.getTrialLogs(batchId, { modelConfig: completed.modelConfig, stage: completed.completedStage })
              .then(logs => {
                const log = logs.find(l => l.inputId === completed.inputId);
                if (log) addCompletedStageLog(log);
              })
              .catch(err => console.error('Failed to fetch stage log:', err));
          }

          previousRunningTasksRef.current = [...p.runningTasks];
        }

        // タスク履歴の更新（後方互換性）
        if (p.currentModelConfig && p.currentInputId && p.currentStage) {
          const taskId = `${p.currentModelConfig}-${p.currentInputId}-${p.currentStage}`;
          if (taskId !== lastTaskIdRef.current) {
            // 新しいタスクを検出
            setTaskHistory(prev => {
              // 前のタスクをcompletedに更新
              const updated = prev.map(entry =>
                entry.status === 'running' ? { ...entry, status: 'completed' as const } : entry
              );
              // 新しいタスクを先頭に追加
              return [{
                id: taskId,
                timestamp: new Date(),
                modelConfig: p.currentModelConfig!,
                inputId: p.currentInputId!,
                stage: p.currentStage!,
                status: 'running',
              }, ...updated];
            });
            lastTaskIdRef.current = taskId;
          }
        }
      },
      onComplete: (p) => {
        setProgress(p);
        setStatus(p.status);
        // 完了時に残っているrunningタスクをcompletedに
        setTaskHistory(prev =>
          prev.map(entry =>
            entry.status === 'running' ? { ...entry, status: 'completed' as const } : entry
          )
        );
      },
      onError: (err) => {
        setError(err.message);
      },
    });

    return () => {
      cleanupRef.current?.();
    };
  }, [batchId, addCompletedStageLog]);

  // 経過時間カウンター
  useEffect(() => {
    if (status === 'running') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status]);

  // 停止ハンドラ
  const handleStop = async () => {
    if (!batchId) return;
    try {
      await api.stopBatch(batchId);
      setStatus('stopped');
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止に失敗しました');
    }
  };

  // 進捗率計算（ステージベースで細かい粒度）
  const progressPercent = progress
    ? progress.totalStages && progress.completedStages !== undefined
      ? Math.round((progress.completedStages / progress.totalStages) * 100)
      : Math.round((progress.completedTrials / progress.totalTrials) * 100)
    : 0;

  // 経過時間フォーマット
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ステータスラベル
  const getStatusLabel = (s: BatchStatus) => {
    const labels: Record<BatchStatus, string> = {
      queued: '待機中',
      running: '実行中',
      completed: '完了',
      failed: '失敗',
      stopped: '停止',
    };
    return labels[s] ?? s;
  };

  // ステータス色
  const getStatusColor = (s: BatchStatus) => {
    const colors: Record<BatchStatus, string> = {
      queued: '#757575',
      running: '#1976d2',
      completed: '#388e3c',
      failed: '#d32f2f',
      stopped: '#f57c00',
    };
    return colors[s] ?? '#757575';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>バッチ実行進捗</h1>

      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
        }}>
          {error}
        </div>
      )}

      {/* バッチ情報 */}
      <section style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Batch ID</div>
            <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>{batchId}</div>
          </div>
          <div style={{
            padding: '4px 12px',
            backgroundColor: getStatusColor(status),
            color: 'white',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
          }}>
            {getStatusLabel(status)}
          </div>
        </div>
        {/* 時間情報を3カラムで配置 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>開始時刻</div>
            <div style={{ fontSize: '14px' }}>
              {startedAt ? new Date(startedAt).toLocaleString('ja-JP') : '-'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>経過時間</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{formatTime(elapsedSeconds)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#e65100' }}>残り推定時間</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>
              {status === 'running' && progress && (progress.completedStages ?? progress.completedTrials) > 0
                ? formatTime(
                    progress.completedStages !== undefined && progress.totalStages
                      ? Math.round(
                          (elapsedSeconds / progress.completedStages) *
                          (progress.totalStages - progress.completedStages)
                        )
                      : Math.round(
                          (elapsedSeconds / progress.completedTrials) *
                          (progress.totalTrials - progress.completedTrials)
                        )
                  )
                : '-'}
            </div>
          </div>
        </div>
      </section>

      {/* プログレスバー */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{progressPercent}%</span>
          <span style={{ color: '#666' }}>
            {progress?.completedStages !== undefined && progress?.totalStages
              ? `${progress.completedStages} / ${progress.totalStages} stages`
              : `${progress?.completedTrials ?? 0} / ${progress?.totalTrials ?? 0} trials`
            }
          </span>
        </div>
        <div style={{
          height: '24px',
          backgroundColor: '#e0e0e0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: getStatusColor(status),
            transition: 'width 0.3s ease',
          }} />
        </div>
        {/* 試行レベルの進捗も表示 */}
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', textAlign: 'right' }}>
          {progress?.completedTrials ?? 0} / {progress?.totalTrials ?? 0} 試行完了
        </div>
      </section>

      {/* 詳細情報 */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#1565c0' }}>完了</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>
            {(progress?.completedTrials ?? 0) + (progress?.failedTrials ?? 0)}
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#2e7d32' }}>成功</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
            {progress?.completedTrials ?? 0}
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#c62828' }}>失敗</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c62828' }}>
            {progress?.failedTrials ?? 0}
          </div>
        </div>
      </section>

      {/* 現在の構成 */}
      {progress?.currentModelConfig && (
        <section style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>現在の構成</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {progress.currentModelConfig}: {MODEL_CONFIGURATIONS[progress.currentModelConfig]?.name ?? ''}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            {MODEL_CONFIGURATIONS[progress.currentModelConfig]?.stages.map((stage, i) => (
              <span key={i}>
                {i > 0 && ' → '}
                <span style={{
                  fontWeight: progress.currentStage === i + 1 ? 'bold' : 'normal',
                  color: progress.currentStage === i + 1 ? '#1976d2' : '#666',
                }}>
                  S{i + 1}:{stage}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 並列実行状態 */}
      {status === 'running' && progress?.runningTasks && progress.runningTasks.length > 0 && (
        <section style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#e8f5e9',
          borderRadius: '4px',
          border: '1px solid #c8e6c9',
        }}>
          <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '12px' }}>
            並列実行状態 ({progress.runningTasks.length} ワーカー稼働中)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {progress.runningTasks.map((task: RunningTask) => (
              <div
                key={task.workerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#c8e6c9',
                  borderRadius: '4px',
                }}
              >
                {/* ワーカーID */}
                <div style={{
                  backgroundColor: '#2e7d32',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}>
                  W{task.workerId}
                </div>
                {/* モデル構成 */}
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  color: '#1565c0',
                  fontSize: '12px',
                }}>
                  {task.modelConfig}
                </div>
                {/* ステージ */}
                <div style={{
                  backgroundColor: '#f3e5f5',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  color: '#7b1fa2',
                  fontSize: '12px',
                }}>
                  Stage {task.stage}
                </div>
                {/* 入力ID */}
                <div style={{
                  color: '#1b5e20',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {task.inputId}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 現在の実行状態（後方互換性：runningTasksがない場合） */}
      {status === 'running' && progress?.currentModelConfig && (!progress.runningTasks || progress.runningTasks.length === 0) && (
        <section style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#e8f5e9',
          borderRadius: '4px',
          border: '1px solid #c8e6c9',
        }}>
          <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '4px' }}>現在の実行状態</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1b5e20' }}>
            Stage {progress.currentStage ?? '?'} 実行中
            {progress.currentInputId && (
              <span style={{ fontWeight: 'normal', color: '#388e3c' }}>
                {' '}/ Input: {progress.currentInputId}
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#4caf50', marginTop: '4px' }}>
            入力 {(progress.currentInputIndex ?? 0) + 1} / {progress.totalTrials / 5} 件目
          </div>
        </section>
      )}

      {/* 完了タスク詳細（Trial > Stage階層表示） */}
      {completedTrials.size > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            完了タスク ({completedTrials.size}件)
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {Array.from(completedTrials.values())
              .sort((a, b) => b.trialNumber - a.trialNumber)
              .map(trial => (
                <TrialWithStagesDetail
                  key={trial.trialKey}
                  trial={trial}
                  isExpanded={expandedTrialId === trial.trialKey}
                  onToggle={() => setExpandedTrialId(
                    expandedTrialId === trial.trialKey ? null : trial.trialKey
                  )}
                />
              ))
            }
          </div>
        </section>
      )}

      {/* タスク履歴ログ（後方互換性：runningTasksがない場合のフォールバック） */}
      {taskHistory.length > 0 && completedTrials.size === 0 && (
        <section style={{
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            タスク履歴
          </div>
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: '#fafafa',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
          }}>
            {taskHistory.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderBottom: '1px solid #eee',
                  fontSize: '13px',
                }}
              >
                {/* ステータスインジケータ */}
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: task.status === 'running' ? '#1976d2' : '#388e3c',
                  flexShrink: 0,
                }} />
                {/* 時刻 */}
                <div style={{ color: '#666', fontFamily: 'monospace', fontSize: '12px', width: '70px', flexShrink: 0 }}>
                  {task.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                {/* モデル構成 */}
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  color: '#1565c0',
                  fontSize: '12px',
                  flexShrink: 0,
                }}>
                  {task.modelConfig}
                </div>
                {/* ステージ */}
                <div style={{
                  backgroundColor: '#f3e5f5',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  color: '#7b1fa2',
                  fontSize: '12px',
                  flexShrink: 0,
                }}>
                  S{task.stage}
                </div>
                {/* 入力ID */}
                <div style={{
                  color: '#333',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {task.inputId}
                </div>
                {/* ステータスラベル */}
                <div style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: task.status === 'running' ? '#1976d2' : '#388e3c',
                  fontWeight: task.status === 'running' ? 'bold' : 'normal',
                  flexShrink: 0,
                }}>
                  {task.status === 'running' ? '実行中' : '完了'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* アクションボタン */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {status === 'running' && (
          <button
            onClick={handleStop}
            style={{
              flex: 1,
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#f57c00',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            停止
          </button>
        )}

        {(status === 'completed' || status === 'stopped' || status === 'failed') && (
          <button
            onClick={() => navigate(`/research-experiment/batch/${batchId}/results`)}
            style={{
              flex: 1,
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#388e3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            結果を見る
          </button>
        )}

        <button
          onClick={() => navigate('/research-experiment/batch')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          戻る
        </button>
      </div>
    </div>
  );
}
