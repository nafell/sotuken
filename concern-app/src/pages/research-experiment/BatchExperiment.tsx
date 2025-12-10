/**
 * BatchExperiment.tsx
 *
 * Layer1/Layer4自動評価実験のバッチ実行制御ページ
 * @see specs/system-design/experiment_spec_layer_1_layer_4.md
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getBatchExperimentApi,
  type ModelConfigId,
  type ModelConfiguration,
  type CorpusInfo,
} from '../../services/BatchExperimentApiService';

export default function BatchExperiment() {
  const navigate = useNavigate();
  const api = getBatchExperimentApi();

  // State
  const [configs, setConfigs] = useState<ModelConfiguration[]>([]);
  const [corpuses, setCorpuses] = useState<CorpusInfo[]>([]);
  const [selectedConfigs, setSelectedConfigs] = useState<ModelConfigId[]>(['A', 'B', 'C', 'D', 'E']);
  const [experimentId, setExperimentId] = useState(`exp_${Date.now()}`);
  const [inputCorpusId, setInputCorpusId] = useState('');
  const [maxTrials, setMaxTrials] = useState(50);
  const [parallelism, setParallelism] = useState(1);
  const [headlessMode, setHeadlessMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 選択中のコーパスの入力件数
  const selectedCorpus = corpuses.find(c => c.corpusId === inputCorpusId);
  const corpusInputCount = selectedCorpus?.inputCount ?? 0;
  const effectiveInputCount = Math.min(corpusInputCount, maxTrials);

  // モデル構成とコーパスを読み込み
  useEffect(() => {
    Promise.all([
      api.getConfigs(),
      api.getCorpuses(),
    ])
      .then(([configsData, corpusesData]) => {
        setConfigs(configsData);
        setCorpuses(corpusesData);
        // デフォルトで最初のコーパスを選択
        if (corpusesData.length > 0 && !inputCorpusId) {
          setInputCorpusId(corpusesData[0].corpusId);
        }
      })
      .catch(err => setError(err.message));
  }, []);

  // モデル構成の選択/解除
  const toggleConfig = (configId: ModelConfigId) => {
    setSelectedConfigs(prev =>
      prev.includes(configId)
        ? prev.filter(id => id !== configId)
        : [...prev, configId]
    );
  };

  // 全選択/全解除
  const toggleAll = () => {
    if (selectedConfigs.length === configs.length) {
      setSelectedConfigs([]);
    } else {
      setSelectedConfigs(configs.map(c => c.id));
    }
  };

  // バッチ開始
  const handleStart = async () => {
    if (selectedConfigs.length === 0) {
      setError('少なくとも1つのモデル構成を選択してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.startBatch({
        experimentId,
        modelConfigs: selectedConfigs,
        inputCorpusId,
        parallelism,
        headlessMode,
        maxTrials: effectiveInputCount,
      });

      // 進捗ページに遷移
      navigate(`/research-experiment/batch/${result.batchId}/progress`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'バッチ開始に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>Layer1/Layer4 バッチ実験</h1>

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

      {/* 実験ID */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>実験ID</h2>
        <input
          type="text"
          value={experimentId}
          onChange={(e) => setExperimentId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </section>

      {/* モデル構成選択 */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>モデル構成</h2>
          <button
            onClick={toggleAll}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {selectedConfigs.length === configs.length ? '全解除' : '全選択'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {configs.map(config => (
            <label
              key={config.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: selectedConfigs.includes(config.id) ? '#e3f2fd' : '#f5f5f5',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedConfigs.includes(config.id)}
                onChange={() => toggleConfig(config.id)}
                style={{ marginRight: '12px' }}
              />
              <div>
                <div style={{ fontWeight: 'bold' }}>
                  {config.id}: {config.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Stage1: {config.stages[0]} / Stage2: {config.stages[1]} / Stage3: {config.stages[2]}
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* 入力コーパス */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>入力コーパス</h2>
        <select
          value={inputCorpusId}
          onChange={(e) => setInputCorpusId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: 'white',
          }}
        >
          {corpuses.length === 0 && (
            <option value="">コーパスを読み込み中...</option>
          )}
          {corpuses.map(corpus => (
            <option key={corpus.corpusId} value={corpus.corpusId}>
              {corpus.corpusId} - {corpus.description} ({corpus.inputCount}件)
            </option>
          ))}
        </select>
        {selectedCorpus && (
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            選択中: {selectedCorpus.description} ({selectedCorpus.inputCount}件の入力データ)
          </p>
        )}
      </section>

      {/* 直列数制限 */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>
          直列数制限: {maxTrials}
          {corpusInputCount > 0 && maxTrials < corpusInputCount && (
            <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
              {' '}(コーパス {corpusInputCount}件中)
            </span>
          )}
        </h2>
        <input
          type="range"
          min="1"
          max="50"
          value={maxTrials}
          onChange={(e) => setMaxTrials(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          実行する入力データ件数の上限 (1-50)
        </p>
      </section>

      {/* 並列数 */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>並列数: {parallelism}</h2>
        <input
          type="range"
          min="1"
          max="10"
          value={parallelism}
          onChange={(e) => setParallelism(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          ※現在は直列実行のみサポート
        </p>
      </section>

      {/* ヘッドレスモード */}
      <section style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={headlessMode}
            onChange={(e) => setHeadlessMode(e.target.checked)}
            style={{ marginRight: '12px' }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>ヘッドレスモード</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              UIレンダリングを省略してDSL検証のみ実行
            </div>
          </div>
        </label>
      </section>

      {/* 実行予定サマリー */}
      <section style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#e3f2fd',
        borderRadius: '4px',
        border: '1px solid #90caf9',
      }}>
        <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>実行予定</h3>
        <div style={{ fontSize: '14px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
          <div>選択構成数:</div>
          <div style={{ fontWeight: 'bold' }}>{selectedConfigs.length}</div>
          <div>実行入力数:</div>
          <div style={{ fontWeight: 'bold' }}>
            {effectiveInputCount}
            {corpusInputCount > 0 && effectiveInputCount < corpusInputCount && (
              <span style={{ fontWeight: 'normal', color: '#666' }}> (コーパス {corpusInputCount}件中)</span>
            )}
          </div>
          <div>総試行数:</div>
          <div style={{ fontWeight: 'bold' }}>{selectedConfigs.length * effectiveInputCount}</div>
          <div>LLMリクエスト数:</div>
          <div style={{ fontWeight: 'bold' }}>{selectedConfigs.length * effectiveInputCount * 3}</div>
        </div>
      </section>

      {/* 実行ボタン */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleStart}
          disabled={isLoading || selectedConfigs.length === 0}
          style={{
            flex: 1,
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: isLoading ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? '開始中...' : 'バッチ実行開始'}
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
          履歴
        </button>
      </div>
    </div>
  );
}
