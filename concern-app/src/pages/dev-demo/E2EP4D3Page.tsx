/**
 * E2EP4D3Page - E2E統合検証ページ
 *
 * Phase 4 Day 3-4: LLM → UISpec v3 → Widget 統合検証
 * 実際のLLMを使用してUISpecを生成し、Widgetとして表示
 */

import { useState, useCallback } from 'react';
import { apiService, type UISpecV3GenerationResponse } from '../../services/api/ApiService';
import UIRendererV3 from '../../services/ui-generation/UIRendererV3';

type StageType = 'diverge' | 'organize' | 'converge' | 'summary';

interface GenerationMetrics {
  model: string;
  processingTimeMs: number;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
  retryCount: number;
  generatedAt: string;
}

const stageDescriptions: Record<StageType, string> = {
  diverge: '発散フェーズ - アイデアを広げ、感情を表現する',
  organize: '整理フェーズ - 情報を構造化し、関係性を明確にする',
  converge: '収束フェーズ - 優先順位をつけ、決断に向かう',
  summary: 'まとめフェーズ - 結論を構造化して出力する',
};

const stageWidgets: Record<StageType, string[]> = {
  diverge: ['emotion_palette', 'brainstorm_cards', 'question_card_chain'],
  organize: ['card_sorting', 'dependency_mapping', 'swot_analysis', 'mind_map'],
  converge: ['matrix_placement', 'tradeoff_balance', 'priority_slider_grid', 'timeline_slider'],
  summary: ['structured_summary'],
};

export default function E2EP4D3Page() {
  const [concernText, setConcernText] = useState('仕事と趣味の両立ができない');
  const [stage, setStage] = useState<StageType>('diverge');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<UISpecV3GenerationResponse | null>(null);
  const [metrics, setMetrics] = useState<GenerationMetrics | null>(null);
  const [widgetUpdates, setWidgetUpdates] = useState<
    Array<{ widgetId: string; timestamp: string; data: any }>
  >([]);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setMetrics(null);
    setWidgetUpdates([]);

    try {
      console.log('🚀 UISpec v3生成開始...');
      const result = await apiService.generateUIV3(concernText, stage);

      setResponse(result);

      if (result.success && result.generation) {
        setMetrics({
          model: result.generation.model,
          processingTimeMs: result.generation.processingTimeMs,
          promptTokens: result.generation.promptTokens,
          responseTokens: result.generation.responseTokens,
          totalTokens: result.generation.totalTokens,
          retryCount: result.generation.retryCount,
          generatedAt: result.generation.generatedAt,
        });
      } else if (result.error) {
        setError(`${result.error.code}: ${result.error.message}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [concernText, stage]);

  const handleWidgetUpdate = useCallback((widgetId: string, data: any) => {
    setWidgetUpdates((prev) => [
      ...prev,
      {
        widgetId,
        timestamp: new Date().toISOString(),
        data,
      },
    ]);
    console.log(`📝 Widget更新: ${widgetId}`, data);
  }, []);

  const handleWidgetComplete = useCallback((widgetId: string) => {
    console.log(`✅ Widget完了: ${widgetId}`);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        padding: '1rem',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #334155',
          paddingBottom: '1rem',
        }}
      >
        <span
          style={{
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
          }}
        >
          DEV ONLY
        </span>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>E2E統合検証 - Phase 4 Day 3-4</h1>
      </div>

      {/* 入力フォーム */}
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#94a3b8' }}>
          入力パラメータ
        </h2>

        {/* 悩みテキスト */}
        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}
          >
            悩みテキスト
          </label>
          <textarea
            value={concernText}
            onChange={(e) => setConcernText(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '0.5rem',
              color: '#e2e8f0',
              fontSize: '1rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* ステージ選択 */}
        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}
          >
            ステージ
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['diverge', 'organize', 'converge', 'summary'] as StageType[]).map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: stage === s ? '#3b82f6' : '#334155',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
            {stageDescriptions[stage]}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
            利用可能Widget: {stageWidgets[stage].join(', ')}
          </p>
        </div>

        {/* 生成ボタン */}
        <button
          onClick={handleGenerate}
          disabled={isLoading || !concernText.trim()}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: isLoading ? '#475569' : '#10b981',
            border: 'none',
            borderRadius: '0.5rem',
            color: 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          {isLoading ? '生成中...' : '🚀 UISpec v3を生成'}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div
          style={{
            backgroundColor: '#7f1d1d',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#fca5a5' }}>エラー</h3>
          <p style={{ margin: 0, color: '#fecaca' }}>{error}</p>
        </div>
      )}

      {/* メトリクス表示 */}
      {metrics && (
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#94a3b8' }}>
            📊 生成メトリクス
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Model</p>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>{metrics.model}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Processing Time</p>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#22c55e' }}>
                {metrics.processingTimeMs}ms
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Prompt Tokens</p>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>{metrics.promptTokens}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Response Tokens</p>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>{metrics.responseTokens}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Total Tokens</p>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {metrics.totalTokens}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Retry Count</p>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>{metrics.retryCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* 生成されたUISpec表示 */}
      {response?.success && response.uiSpec && (
        <>
          {/* Widget表示エリア */}
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#94a3b8' }}>
              🎯 生成されたWidget
            </h2>
            <UIRendererV3
              uiSpec={response.uiSpec}
              onWidgetUpdate={handleWidgetUpdate}
              onWidgetComplete={handleWidgetComplete}
            />
          </div>

          {/* Widget更新ログ */}
          {widgetUpdates.length > 0 && (
            <div
              style={{
                backgroundColor: '#1e293b',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#94a3b8' }}>
                📝 Widget更新ログ
              </h2>
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: '#0f172a',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                }}
              >
                {widgetUpdates.map((update, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.5rem',
                      borderBottom: index < widgetUpdates.length - 1 ? '1px solid #334155' : 'none',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>
                      {new Date(update.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>{update.widgetId}</span>
                    <pre
                      style={{
                        margin: '0.25rem 0 0 0',
                        color: '#94a3b8',
                        fontSize: '0.625rem',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {JSON.stringify(update.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 生成されたUISpec JSON */}
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '0.75rem',
              padding: '1.5rem',
            }}
          >
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#94a3b8' }}>
              📄 生成されたUISpec JSON
            </h2>
            <pre
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '0.5rem',
                padding: '1rem',
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '0.75rem',
                color: '#94a3b8',
              }}
            >
              {JSON.stringify(response.uiSpec, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
