/**
 * AdminDashboard (Phase 2 Step 6)
 * メトリクス可視化ダッシュボード
 */

import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';

/**
 * メトリクスデータ型
 */
interface MetricsData {
  overall: {
    engagementRate: number;
    totalShown: number;
    totalStarted: number;
    averageClarityImprovement: number;
    totalFeedbacks: number;
    clarityDistribution: {
      level1: number;
      level2: number;
      level3: number;
    };
  };
  byCondition?: {
    dynamic_ui: {
      engagementRate: number;
      totalShown: number;
      totalStarted: number;
      averageClarityImprovement: number;
      totalFeedbacks: number;
      clarityDistribution: {
        level1: number;
        level2: number;
        level3: number;
      };
    };
    static_ui: {
      engagementRate: number;
      totalShown: number;
      totalStarted: number;
      averageClarityImprovement: number;
      totalFeedbacks: number;
      clarityDistribution: {
        level1: number;
        level2: number;
        level3: number;
      };
    };
  };
  filters: {
    condition: string;
    startDate?: string;
    endDate?: string;
  };
  generatedAt: string;
}

/**
 * AdminDashboard コンポーネント
 */
export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // メトリクスを取得
  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${serverUrl}/v1/metrics/engagement`);

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);

    } catch (err) {
      console.error('❌ Metrics fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-loading">
          <p>📊 メトリクスを読み込み中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !metrics) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-error">
          <h2>❌ エラー</h2>
          <p>{error || 'メトリクスの取得に失敗しました'}</p>
          <button onClick={fetchMetrics} className="retry-button">
            再試行
          </button>
        </div>
      </div>
    );
  }

  // パーセンテージ表示
  const formatRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>📊 メトリクスダッシュボード</h1>
        <div className="header-actions">
          <button onClick={fetchMetrics} className="refresh-button">
            🔄 更新
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* 全体メトリクス */}
        <section className="metrics-section">
          <h2>全体メトリクス</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>着手率</h3>
              <div className="metric-value">
                {formatRate(metrics.overall.engagementRate)}
              </div>
              <div className="metric-detail">
                {metrics.overall.totalStarted} / {metrics.overall.totalShown} 回
              </div>
            </div>

            <div className="metric-card">
              <h3>スッキリ度平均</h3>
              <div className="metric-value">
                {metrics.overall.averageClarityImprovement.toFixed(2)}
              </div>
              <div className="metric-detail">
                {metrics.overall.totalFeedbacks} 件のフィードバック
              </div>
            </div>
          </div>
        </section>

        {/* 条件別比較 */}
        {metrics.byCondition && (
          <section className="metrics-section">
            <h2>条件別比較（動的UI vs 固定UI）</h2>
            <div className="comparison-grid">
              <div className="condition-card dynamic-ui">
                <h3>🎨 動的UI</h3>
                <div className="condition-metrics">
                  <div className="metric-item">
                    <span className="metric-label">着手率:</span>
                    <span className="metric-value">
                      {formatRate(metrics.byCondition.dynamic_ui.engagementRate)}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">表示回数:</span>
                    <span className="metric-value">
                      {metrics.byCondition.dynamic_ui.totalShown}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">着手回数:</span>
                    <span className="metric-value">
                      {metrics.byCondition.dynamic_ui.totalStarted}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">スッキリ度:</span>
                    <span className="metric-value">
                      {metrics.byCondition.dynamic_ui.averageClarityImprovement.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="condition-card static-ui">
                <h3>📋 固定UI</h3>
                <div className="condition-metrics">
                  <div className="metric-item">
                    <span className="metric-label">着手率:</span>
                    <span className="metric-value">
                      {formatRate(metrics.byCondition.static_ui.engagementRate)}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">表示回数:</span>
                    <span className="metric-value">
                      {metrics.byCondition.static_ui.totalShown}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">着手回数:</span>
                    <span className="metric-value">
                      {metrics.byCondition.static_ui.totalStarted}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">スッキリ度:</span>
                    <span className="metric-value">
                      {metrics.byCondition.static_ui.averageClarityImprovement.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* スッキリ度分布 */}
        <section className="metrics-section">
          <h2>スッキリ度分布</h2>
          <div className="distribution-chart">
            <div className="distribution-bar">
              <span className="bar-label">レベル1 😐</span>
              <div className="bar-container">
                <div
                  className="bar-fill level-1"
                  style={{
                    width: `${(metrics.overall.clarityDistribution.level1 /
                        metrics.overall.totalFeedbacks) *
                      100
                      }%`,
                  }}
                />
                <span className="bar-value">
                  {metrics.overall.clarityDistribution.level1}
                </span>
              </div>
            </div>

            <div className="distribution-bar">
              <span className="bar-label">レベル2 🙂</span>
              <div className="bar-container">
                <div
                  className="bar-fill level-2"
                  style={{
                    width: `${(metrics.overall.clarityDistribution.level2 /
                        metrics.overall.totalFeedbacks) *
                      100
                      }%`,
                  }}
                />
                <span className="bar-value">
                  {metrics.overall.clarityDistribution.level2}
                </span>
              </div>
            </div>

            <div className="distribution-bar">
              <span className="bar-label">レベル3 😊</span>
              <div className="bar-container">
                <div
                  className="bar-fill level-3"
                  style={{
                    width: `${(metrics.overall.clarityDistribution.level3 /
                        metrics.overall.totalFeedbacks) *
                      100
                      }%`,
                  }}
                />
                <span className="bar-value">
                  {metrics.overall.clarityDistribution.level3}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* メタ情報 */}
        <footer className="dashboard-footer">
          <p>
            最終更新: {new Date(metrics.generatedAt).toLocaleString('ja-JP')}
          </p>
        </footer>
      </div>
    </div>
  );
};
