/**
 * BatchResults.tsx
 *
 * Layer1/Layer4自動評価実験の結果サマリーページ
 * 設計書10章の論文用テーブル形式で表示
 *
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getBatchExperimentApi,
  type Layer1Metrics,
  type Layer4Metrics,
  type ModelStatistics,
  type TrialLog,
} from '../../services/BatchExperimentApiService';
import TrialLogDetail from './components/TrialLogDetail';

type TabType = 'overview' | 'layer1' | 'layer4' | 'trials' | 'export';

export default function BatchResults() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const api = getBatchExperimentApi();

  // State
  const [summary, setSummary] = useState<{
    experimentId: string;
    totalTrials: number;
    completedTrials: number;
    failedTrials: number;
    byModel: ModelStatistics[];
    startedAt: string;
    completedAt: string;
    totalDurationMs: number;
  } | null>(null);
  const [, setLayer1Results] = useState<Layer1Metrics | null>(null);
  const [, setLayer4Results] = useState<Layer4Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Trials タブ用
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [trials, setTrials] = useState<TrialLog[]>([]);
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [expandedTrialId, setExpandedTrialId] = useState<string | null>(null);
  const [filterModelConfig, setFilterModelConfig] = useState<string>('');
  const [filterStage, setFilterStage] = useState<string>('');

  // データ読み込み
  useEffect(() => {
    if (!batchId) return;

    api.getBatchResults(batchId)
      .then(data => {
        setSummary(data.summary);
        setLayer1Results(data.layer1Results ?? null);
        setLayer4Results(data.layer4Results ?? null);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [batchId]);

  // Trialsタブ選択時にデータ読み込み
  useEffect(() => {
    if (activeTab !== 'trials' || !batchId) return;
    if (trials.length > 0) return; // 既に読み込み済み

    setTrialsLoading(true);
    api.getTrialLogs(batchId)
      .then(data => setTrials(data))
      .catch(err => setError(err.message))
      .finally(() => setTrialsLoading(false));
  }, [activeTab, batchId]);

  // フィルタリングされた試行ログ
  const filteredTrials = trials.filter(trial => {
    if (filterModelConfig && trial.modelConfig !== filterModelConfig) return false;
    if (filterStage && trial.stage !== parseInt(filterStage, 10)) return false;
    return true;
  });

  // フォーマット関数
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatMs = (value: number) => `${value.toLocaleString()}`;
  const formatCost = (value: number) => `${value.toFixed(2)}`;

  // 時間フォーマット
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    return `${m}m ${s}s`;
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
      <h1 style={{ marginBottom: '24px' }}>実験結果サマリー</h1>

      {/* タブナビゲーション */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e0e0e0',
        marginBottom: '24px',
      }}>
        {(['overview', 'layer1', 'layer4', 'trials', 'export'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: activeTab === tab ? '2px solid #1976d2' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              color: activeTab === tab ? '#1976d2' : '#666',
              fontSize: '14px',
            }}
          >
            {tab === 'overview' && '概要'}
            {tab === 'layer1' && 'Layer1'}
            {tab === 'layer4' && 'Layer4'}
            {tab === 'trials' && `Trials (${trials.length || '...'})`}
            {tab === 'export' && 'Export'}
          </button>
        ))}
      </div>

      {/* Overview タブ */}
      {activeTab === 'overview' && (
        <section style={{
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>実験概要</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Batch ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{batchId}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>実験ID</div>
              <div>{summary?.experimentId ?? '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>実行時間</div>
              <div>{summary?.totalDurationMs ? formatDuration(summary.totalDurationMs) : '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>総試行数</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{summary?.totalTrials ?? 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>完了</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#388e3c' }}>
                {summary?.completedTrials ?? 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>失敗</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>
                {summary?.failedTrials ?? 0}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Layer1 タブ */}
      {activeTab === 'layer1' && (
        <section>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Layer1: 構造健全性</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#e3f2fd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #1976d2' }}>Model</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>VR</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>TCR</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>RRR</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>CDR</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>RGR</th>
                </tr>
              </thead>
              <tbody>
                {summary?.byModel?.map((model, idx) => (
                  <tr key={model.modelConfig} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{model.modelConfig}</td>
                    <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatPercent(model.layer1.VR)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatPercent(model.layer1.TCR)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatPercent(model.layer1.RRR)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatPercent(model.layer1.CDR)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatPercent(model.layer1.RGR)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            VR: DSL妥当率 / TCR: 型整合率 / RRR: 参照整合率 / CDR: 循環依存率 / RGR: 再生成率
          </div>
        </section>
      )}

      {/* Layer4 タブ */}
      {activeTab === 'layer4' && (
        <section>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Layer4: 実用性</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#fff3e0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e65100' }}>Model</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e65100' }}>LAT (ms)</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e65100' }}>COST (JPY)</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e65100' }}>FR</th>
                </tr>
              </thead>
              <tbody>
                {summary?.byModel?.map((model, idx) => (
                  <tr key={model.modelConfig} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{model.modelConfig}</td>
                    <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatMs(model.layer4.LAT)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatCost(model.layer4.COST)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatPercent(model.layer4.FR)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            LAT: 平均レイテンシ / COST: 推定APIコスト / FR: 異常終了率
          </div>
        </section>
      )}

      {/* Trials タブ */}
      {activeTab === 'trials' && (
        <section>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>試行ログ</h2>

          {/* フィルタ */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                モデル構成
              </label>
              <select
                value={filterModelConfig}
                onChange={(e) => setFilterModelConfig(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">All</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                ステージ
              </label>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">All</option>
                <option value="1">Stage 1</option>
                <option value="2">Stage 2</option>
                <option value="3">Stage 3</option>
              </select>
            </div>
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {filteredTrials.length} / {trials.length} 件
              </span>
            </div>
          </div>

          {/* 試行リスト */}
          {trialsLoading ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>読み込み中...</div>
          ) : filteredTrials.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
              試行ログがありません
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filteredTrials.map(trial => (
                <TrialLogDetail
                  key={trial.id}
                  trial={trial}
                  isExpanded={expandedTrialId === trial.id}
                  onToggle={() => setExpandedTrialId(
                    expandedTrialId === trial.id ? null : trial.id
                  )}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Export タブ */}
      {activeTab === 'export' && (
        <section>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>データエクスポート</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href={api.getExportUrl(batchId!, 'json')}
              download
              style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              JSON ダウンロード
            </a>
            <a
              href={api.getExportUrl(batchId!, 'csv')}
              download
              style={{
                padding: '12px 24px',
                backgroundColor: '#388e3c',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              CSV ダウンロード
            </a>
          </div>
        </section>
      )}

      {/* ナビゲーション */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
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
          新規バッチ
        </button>
        <button
          onClick={() => navigate('/research-experiment/batch/list')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          バッチ履歴
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
