/**
 * BatchList.tsx
 *
 * バッチ実験履歴一覧ページ
 * 過去のバッチ実験を一覧表示し、結果ページへ遷移
 *
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getBatchExperimentApi,
  type BatchInfo,
  type BatchStatus,
} from '../../services/BatchExperimentApiService';

export default function BatchList() {
  const navigate = useNavigate();
  const api = getBatchExperimentApi();

  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getBatches(50, 0)
      .then(data => setBatches(data))
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const getStatusLabel = (status: BatchStatus) => {
    const labels: Record<BatchStatus, string> = {
      queued: '待機中',
      running: '実行中',
      completed: '完了',
      failed: '失敗',
      stopped: '停止',
    };
    return labels[status] ?? status;
  };

  const getStatusColor = (status: BatchStatus) => {
    const colors: Record<BatchStatus, string> = {
      queued: '#757575',
      running: '#1976d2',
      completed: '#388e3c',
      failed: '#d32f2f',
      stopped: '#f57c00',
    };
    return colors[status] ?? '#757575';
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
        }}>
          {error}
        </div>
        <button
          onClick={() => navigate('/research-experiment/batch')}
          style={{ marginTop: '16px', padding: '8px 16px' }}
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>バッチ実験履歴</h1>
        <button
          onClick={() => navigate('/research-experiment/batch')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          新規バッチ作成
        </button>
      </div>

      {batches.length === 0 ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          color: '#666',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}>
          バッチ実験履歴がありません
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>実験ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>ステータス</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e0e0e0' }}>試行数</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>モデル構成</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>開始時刻</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e0e0e0' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch, idx) => (
                <tr
                  key={batch.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (batch.status === 'running') {
                      navigate(`/research-experiment/batch/${batch.id}/progress`);
                    } else {
                      navigate(`/research-experiment/batch/${batch.id}/results`);
                    }
                  }}
                >
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{batch.experimentId}</div>
                    <div style={{ fontSize: '10px', color: '#999' }}>{batch.id.substring(0, 8)}...</div>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: getStatusColor(batch.status),
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      {getStatusLabel(batch.status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <span style={{ color: '#388e3c', fontWeight: 'bold' }}>{batch.completedTrials}</span>
                    {' / '}
                    {batch.totalTrials}
                    {batch.failedTrials > 0 && (
                      <span style={{ color: '#d32f2f', marginLeft: '4px' }}>
                        ({batch.failedTrials} failed)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {batch.modelConfigs.map(config => (
                        <span
                          key={config}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#e3f2fd',
                            color: '#1565c0',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          {config}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                    {formatDate(batch.startedAt)}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (batch.status === 'running') {
                          navigate(`/research-experiment/batch/${batch.id}/progress`);
                        } else {
                          navigate(`/research-experiment/batch/${batch.id}/results`);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: batch.status === 'running' ? '#1976d2' : '#388e3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {batch.status === 'running' ? '進捗' : '結果'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ナビゲーション */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
        <button
          onClick={() => navigate('/research-experiment')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ダッシュボード
        </button>
        <button
          onClick={() => navigate('/research-experiment/sessions')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          セッション一覧
        </button>
      </div>
    </div>
  );
}
