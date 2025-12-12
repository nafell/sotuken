/**
 * BatchResults.tsx
 *
 * Layer1/Layer4自動評価実験の結果サマリーページ
 * 設計書10章の論文用テーブル形式で表示
 * 全セクションを縦に配置
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
import StatisticsTab from './components/StatisticsTab';

type TabId = 'results' | 'statistics';

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
    // 設定情報
    modelConfigs?: string[];
    inputCorpusId?: string;
    parallelism?: number;
    maxTrials?: number | null;
    // タイミング
    startedAt: string;
    completedAt: string;
    totalDurationMs: number;
  } | null>(null);
  const [, setLayer1Results] = useState<Layer1Metrics | null>(null);
  const [, setLayer4Results] = useState<Layer4Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Trials セクション用
  const [trials, setTrials] = useState<TrialLog[]>([]);
  const [expandedTrialId, setExpandedTrialId] = useState<string | null>(null);
  const [filterModelConfig, setFilterModelConfig] = useState<string>('');
  const [filterStage, setFilterStage] = useState<string>('');

  // タブ管理
  const [activeTab, setActiveTab] = useState<TabId>('results');

  // データ読み込み
  useEffect(() => {
    if (!batchId) return;

    // サマリーとトライアルを並列で読み込み
    Promise.all([
      api.getBatchResults(batchId),
      api.getTrialLogs(batchId),
    ])
      .then(([resultsData, trialsData]) => {
        setSummary(resultsData.summary);
        setLayer1Results(resultsData.layer1Results ?? null);
        setLayer4Results(resultsData.layer4Results ?? null);
        setTrials(trialsData);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [batchId]);

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

  // タブスタイル
  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: isActive ? 'bold' : 'normal',
    backgroundColor: isActive ? '#1976d2' : '#f5f5f5',
    color: isActive ? 'white' : '#333',
    border: 'none',
    borderRadius: '4px 4px 0 0',
    cursor: 'pointer',
    marginRight: '4px',
  });

  // 概要セクションコンポーネント
  const OverviewSection = () => (
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

      <h3 style={{ fontSize: '16px', marginTop: '24px', marginBottom: '12px' }}>実行設定</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>開始時刻</div>
          <div>{summary?.startedAt ? new Date(summary.startedAt).toLocaleString('ja-JP') : '-'}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>完了時刻</div>
          <div>{summary?.completedAt ? new Date(summary.completedAt).toLocaleString('ja-JP') : '-'}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>コーパス</div>
          <div>{summary?.inputCorpusId ?? '-'}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>モデル構成</div>
          <div>{summary?.modelConfigs?.join(', ') ?? '-'}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>並列数</div>
          <div>{summary?.parallelism ?? '-'}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>直列数上限</div>
          <div>{summary?.maxTrials ?? '無制限'}</div>
        </div>
      </div>

      {/* Export セクション */}
      <h3 style={{ fontSize: '16px', marginTop: '24px', marginBottom: '12px' }}>データエクスポート</h3>
      <div style={{ display: 'flex', gap: '12px' }}>
        <a
          href={api.getExportUrl(batchId!, 'json')}
          download
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          JSON
        </a>
        <a
          href={api.getExportUrl(batchId!, 'csv')}
          download
          style={{
            padding: '10px 20px',
            backgroundColor: '#388e3c',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          CSV
        </a>
      </div>
    </section>
  );

  // Layer1セクション
  const Layer1Section = () => (
    <section>
      <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Layer1: 構造健全性</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e3f2fd' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #1976d2' }}>Model</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>VR</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>TCR</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>RRR</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>CDR</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>RGR</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>W2R</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>RCR</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1976d2' }}>JAR</th>
            </tr>
          </thead>
          <tbody>
            {summary?.byModel?.map((model, idx) => (
              <tr key={model.modelConfig} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{model.modelConfig}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatPercent(model.layer1.VR)}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatPercent(model.layer1.TCR)}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatPercent(model.layer1.RRR)}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatPercent(model.layer1.CDR)}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatPercent(model.layer1.RGR)}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatPercent(model.layer1.W2WR_SR ?? 0)}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatPercent(model.layer1.RC_SR ?? 0)}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatPercent(model.layer1.JA_SR ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
        VR: DSL妥当率 / TCR: 型整合率 / RRR: 参照整合率 / CDR: 循環依存率 / RGR: 再生成率 / W2R: W2WR成功率 / RCR: React変換成功率 / JAR: Jotai Atom変換成功率
      </div>
    </section>
  );

  // Layer4セクション
  const Layer4Section = () => (
    <section>
      <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Layer4: 実用性</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
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
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatMs(model.layer4.LAT)}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatCost(model.layer4.COST)}</td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatPercent(model.layer4.FR)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
        LAT: 平均レイテンシ / COST: 推定APIコスト / FR: 異常終了率
      </div>
    </section>
  );

  // Trialsセクション
  const TrialsSection = () => (
    <section>
      <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>試行ログ ({trials.length}件)</h2>
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
      }}>
        <div>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>モデル構成</label>
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
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>ステージ</label>
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
          <span style={{ fontSize: '12px', color: '#666' }}>{filteredTrials.length} / {trials.length} 件</span>
        </div>
      </div>

      {filteredTrials.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>試行ログがありません</div>
      ) : (
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {filteredTrials.map(trial => (
            <TrialLogDetail
              key={trial.id}
              trial={trial}
              isExpanded={expandedTrialId === trial.id}
              onToggle={() => setExpandedTrialId(expandedTrialId === trial.id ? null : trial.id)}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '16px' }}>実験結果サマリー</h1>

      {/* タブナビゲーション */}
      <div style={{ display: 'flex', marginBottom: '0', borderBottom: '2px solid #1976d2' }}>
        <button style={tabStyle(activeTab === 'results')} onClick={() => setActiveTab('results')}>結果</button>
        <button style={tabStyle(activeTab === 'statistics')} onClick={() => setActiveTab('statistics')}>統計検定</button>
      </div>

      {/* タブコンテンツ */}
      <div style={{ padding: '24px', backgroundColor: '#fff', border: '1px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 4px 4px', minHeight: '400px' }}>
        {activeTab === 'results' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <OverviewSection />
            <Layer1Section />
            <Layer4Section />
            <TrialsSection />
          </div>
        )}
        {activeTab === 'statistics' && batchId && <StatisticsTab batchId={batchId} />}
      </div>

      {/* ナビゲーション */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={() => navigate('/research-experiment/batch')}
          style={{ padding: '12px 24px', fontSize: '14px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
          新規バッチ
        </button>
        <button
          onClick={() => navigate('/research-experiment/batch/list')}
          style={{ padding: '12px 24px', fontSize: '14px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
          バッチ履歴
        </button>
        <button
          onClick={() => navigate('/research-experiment/sessions')}
          style={{ padding: '12px 24px', fontSize: '14px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
          セッション一覧
        </button>
      </div>
    </div>
  );
}
