/**
 * Metrics Routes (Phase 2 Step 6)
 * 着手率・スッキリ度などのメトリクス取得API
 */

import { Hono } from 'hono';
import { metricsService } from '../services/MetricsService';

const app = new Hono();

/**
 * GET /v1/metrics/engagement
 * 着手率とスッキリ度のメトリクスを取得
 *
 * Query Parameters:
 *   - condition: 実験条件（dynamic_ui / static_ui）
 *   - startDate: 集計開始日時（ISO 8601形式）
 *   - endDate: 集計終了日時（ISO 8601形式）
 */
app.get('/engagement', async (c) => {
  try {
    const condition = c.req.query('condition');
    const startDateStr = c.req.query('startDate');
    const endDateStr = c.req.query('endDate');

    // 日時をパース
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // 全体のメトリクスを計算
    const overallEngagement = await metricsService.calculateEngagementRate(
      condition,
      startDate,
      endDate
    );

    const overallClarity = await metricsService.calculateAverageClarityImprovement(
      condition,
      startDate,
      endDate
    );

    // 条件別のメトリクスを計算（conditionが指定されていない場合）
    let byCondition = undefined;
    if (!condition) {
      const dynamicEngagement = await metricsService.calculateEngagementRate(
        'dynamic_ui',
        startDate,
        endDate
      );

      const staticEngagement = await metricsService.calculateEngagementRate(
        'static_ui',
        startDate,
        endDate
      );

      const dynamicClarity = await metricsService.calculateAverageClarityImprovement(
        'dynamic_ui',
        startDate,
        endDate
      );

      const staticClarity = await metricsService.calculateAverageClarityImprovement(
        'static_ui',
        startDate,
        endDate
      );

      byCondition = {
        dynamic_ui: {
          engagementRate: dynamicEngagement.engagementRate,
          totalShown: dynamicEngagement.totalShown,
          totalStarted: dynamicEngagement.totalStarted,
          averageClarityImprovement: dynamicClarity.averageClarityImprovement,
          totalFeedbacks: dynamicClarity.totalFeedbacks,
          clarityDistribution: dynamicClarity.distribution,
        },
        static_ui: {
          engagementRate: staticEngagement.engagementRate,
          totalShown: staticEngagement.totalShown,
          totalStarted: staticEngagement.totalStarted,
          averageClarityImprovement: staticClarity.averageClarityImprovement,
          totalFeedbacks: staticClarity.totalFeedbacks,
          clarityDistribution: staticClarity.distribution,
        },
      };
    }

    // レスポンス構築
    return c.json({
      overall: {
        engagementRate: overallEngagement.engagementRate,
        totalShown: overallEngagement.totalShown,
        totalStarted: overallEngagement.totalStarted,
        averageClarityImprovement: overallClarity.averageClarityImprovement,
        totalFeedbacks: overallClarity.totalFeedbacks,
        clarityDistribution: overallClarity.distribution,
      },
      byCondition,
      filters: {
        condition: condition || 'all',
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ GET /v1/metrics/engagement failed:', error);
    return c.json(
      {
        error: 'Failed to calculate engagement metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /v1/metrics/health
 * メトリクスサービスの動作確認
 */
app.get('/health', async (c) => {
  return c.json({
    status: 'ok',
    service: 'metrics',
    timestamp: new Date().toISOString(),
  });
});

export { app as metricsRoutes };
