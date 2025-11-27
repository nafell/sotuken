/**
 * MetricsService (Phase 2 Step 6)
 * 着手率・スッキリ度などのメトリクス計算サービス
 */

import { db } from '../database/index';
import { measurementEvents } from '../database/schema';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';

/**
 * 着手率メトリクス
 */
export interface EngagementMetrics {
  totalShown: number;
  totalStarted: number;
  engagementRate: number;
}

/**
 * スッキリ度メトリクス
 */
export interface ClarityMetrics {
  averageClarityImprovement: number;
  totalFeedbacks: number;
  distribution: {
    level1: number;
    level2: number;
    level3: number;
  };
}

/**
 * バリアント別メトリクス
 */
export interface VariantMetrics {
  [variant: string]: EngagementMetrics;
}

/**
 * Saliency別メトリクス
 */
export interface SaliencyMetrics {
  [saliency: string]: EngagementMetrics;
}

/**
 * メトリクスサービス
 */
export class MetricsService {
  /**
   * 条件別着手率を計算
   * @param condition 実験条件（dynamic_ui / static_ui）
   * @param startDate 開始日時（オプション）
   * @param endDate 終了日時（オプション）
   */
  async calculateEngagementRate(
    condition?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<EngagementMetrics> {
    try {
      // WHERE条件を構築
      const whereConditions: any[] = [];

      if (condition) {
        whereConditions.push(eq(measurementEvents.experimentCondition, condition));
      }
      if (startDate) {
        whereConditions.push(gte(measurementEvents.recordedAt, startDate));
      }
      if (endDate) {
        whereConditions.push(lte(measurementEvents.recordedAt, endDate));
      }

      // task_recommendation_shownイベント数を取得（分母）
      const shownConditions = [...whereConditions, eq(measurementEvents.eventType, 'task_recommendation_shown')];
      const shownResult = await db
        .select({ count: count() })
        .from(measurementEvents)
        .where(shownConditions.length > 0 ? and(...shownConditions) : undefined);

      const totalShown = Number(shownResult[0]?.count || 0);

      // task_action_startedイベント数を取得（分子）
      const startedConditions = [...whereConditions, eq(measurementEvents.eventType, 'task_action_started')];
      const startedResult = await db
        .select({ count: count() })
        .from(measurementEvents)
        .where(startedConditions.length > 0 ? and(...startedConditions) : undefined);

      const totalStarted = Number(startedResult[0]?.count || 0);

      // 着手率を計算
      const engagementRate = totalShown > 0 ? totalStarted / totalShown : 0;

      return {
        totalShown,
        totalStarted,
        engagementRate,
      };

    } catch (error) {
      console.error('❌ calculateEngagementRate failed:', error);
      return {
        totalShown: 0,
        totalStarted: 0,
        engagementRate: 0,
      };
    }
  }

  /**
   * スッキリ度平均を計算
   * @param condition 実験条件（dynamic_ui / static_ui）
   * @param startDate 開始日時（オプション）
   * @param endDate 終了日時（オプション）
   */
  async calculateAverageClarityImprovement(
    condition?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ClarityMetrics> {
    try {
      // WHERE条件を構築
      const whereConditions: any[] = [
        eq(measurementEvents.eventType, 'clarity_feedback_submitted')
      ];

      if (condition) {
        whereConditions.push(eq(measurementEvents.experimentCondition, condition));
      }
      if (startDate) {
        whereConditions.push(gte(measurementEvents.recordedAt, startDate));
      }
      if (endDate) {
        whereConditions.push(lte(measurementEvents.recordedAt, endDate));
      }

      // clarity_feedback_submittedイベントを取得
      const feedbackEvents = await db
        .select()
        .from(measurementEvents)
        .where(and(...whereConditions));

      // clarityImprovementを集計
      let totalClarity = 0;
      let totalFeedbacks = 0;
      const distribution = {
        level1: 0,
        level2: 0,
        level3: 0,
      };

      for (const event of feedbackEvents) {
        const metadata = event.metadata as any;
        const clarityImprovement = metadata?.clarityImprovement;

        if (clarityImprovement !== undefined && clarityImprovement !== null) {
          totalClarity += clarityImprovement;
          totalFeedbacks++;

          // 分布をカウント
          if (clarityImprovement === 1) distribution.level1++;
          else if (clarityImprovement === 2) distribution.level2++;
          else if (clarityImprovement === 3) distribution.level3++;
        }
      }

      // 平均値を計算
      const averageClarityImprovement = totalFeedbacks > 0 ? totalClarity / totalFeedbacks : 0;

      return {
        averageClarityImprovement,
        totalFeedbacks,
        distribution,
      };

    } catch (error) {
      console.error('❌ calculateAverageClarityImprovement failed:', error);
      return {
        averageClarityImprovement: 0,
        totalFeedbacks: 0,
        distribution: {
          level1: 0,
          level2: 0,
          level3: 0,
        },
      };
    }
  }

  /**
   * バリアント別着手率を計算
   * @param condition 実験条件
   * @param startDate 開始日時（オプション）
   * @param endDate 終了日時（オプション）
   */
  async calculateEngagementByVariant(
    condition?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<VariantMetrics> {
    // 実装は後で追加
    return {};
  }

  /**
   * Saliency別着手率を計算
   * @param condition 実験条件
   * @param startDate 開始日時（オプション）
   * @param endDate 終了日時（オプション）
   */
  async calculateEngagementBySaliency(
    condition?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SaliencyMetrics> {
    // 実装は後で追加
    return {};
  }
}

// シングルトンインスタンス
export const metricsService = new MetricsService();
