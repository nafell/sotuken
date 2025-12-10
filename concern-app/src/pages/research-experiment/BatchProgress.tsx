/**
 * BatchProgress.tsx
 *
 * Layer1/Layer4自動評価実験の進捗表示ページ
 * SSEでリアルタイム進捗を表示
 *
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getBatchExperimentApi,
  type BatchProgress as BatchProgressType,
  type BatchStatus,
} from '../../services/BatchExperimentApiService';

export default function BatchProgress() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const api = getBatchExperimentApi();

  // State
  const [progress, setProgress] = useState<BatchProgressType | null>(null);
  const [status, setStatus] = useState<BatchStatus>('queued');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const cleanupRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      },
      onComplete: (p) => {
        setProgress(p);
        setStatus(p.status);
      },
      onError: (err) => {
        setError(err.message);
      },
    });

    return () => {
      cleanupRef.current?.();
    };
  }, [batchId]);

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

  // 進捗率計算
  const progressPercent = progress
    ? Math.round((progress.completedTrials / progress.totalTrials) * 100)
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
      </section>

      {/* プログレスバー */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{progressPercent}%</span>
          <span style={{ color: '#666' }}>
            {progress?.completedTrials ?? 0} / {progress?.totalTrials ?? 0}
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
      </section>

      {/* 詳細情報 */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#1565c0' }}>完了</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>
            {progress?.completedTrials ?? 0}
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#c62828' }}>失敗</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c62828' }}>
            {progress?.failedTrials ?? 0}
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>経過時間</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>現在の構成</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {progress?.currentModelConfig ?? '-'}
          </div>
        </div>
      </section>

      {/* 残り時間推定 */}
      {status === 'running' && progress && progress.completedTrials > 0 && (
        <section style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#fff3e0',
          borderRadius: '4px',
        }}>
          <div style={{ fontSize: '12px', color: '#e65100' }}>残り推定時間</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>
            {formatTime(
              Math.round(
                (elapsedSeconds / progress.completedTrials) *
                (progress.totalTrials - progress.completedTrials)
              )
            )}
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
