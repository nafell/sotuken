/**
 * Task Recommendation API Routes
 * /v1/task/* エンドポイント
 */

import { Hono } from "hono";
import { ScoreRankingService } from "../services/ScoreRankingService";
import type { RankingRequest, InternalRankingRequest, RankingResponse } from "../types/TaskRecommendationDSL";

const taskRoutes = new Hono();
const scoreRankingService = new ScoreRankingService();

/**
 * POST /v1/task/rank
 * タスクをランク付けして推奨タスクを返す
 */
taskRoutes.post("/rank", async (c) => {
  try {
    // リクエストボディを取得
    const body = await c.req.json() as RankingRequest;

    // 入力バリデーション
    if (!body.tasks || body.tasks.length === 0) {
      return c.json({
        success: false,
        error: "No tasks provided"
      }, 400);
    }

    if (!body.factors) {
      return c.json({
        success: false,
        error: "Missing factors"
      }, 400);
    }

    if (!body.factors.available_time_min || typeof body.factors.available_time_min.value !== "number") {
      return c.json({
        success: false,
        error: "Missing or invalid factors.available_time_min"
      }, 400);
    }

    // 内部処理用に変換
    const internalRequest: InternalRankingRequest = {
      available_time: body.factors.available_time_min.value,
      factors: {
        time_of_day: body.factors.time_of_day.value,
        location_category: body.factors.location_category.value,
      },
      tasks: body.tasks
    };

    // タスク推奨DSLを生成
    const recommendationDSL = await scoreRankingService.selectAndRender(internalRequest);
    
    // レスポンスを構築
    const response: RankingResponse = {
      recommendation: {
        taskId: recommendationDSL.selectedTask.taskId,
        variant: recommendationDSL.selectedTask.variant,
        saliency: recommendationDSL.selectedTask.saliency,
        score: recommendationDSL.selectedTask.score || 0
      }
    };
    
    // デバッグ情報を含める（開発環境のみ）
    if (process.env.NODE_ENV !== "production") {
      // 全タスクのスコアを計算
      const allScores = body.tasks.map(task => ({
        taskId: task.id,
        score: scoreRankingService.calculateScore(task, body.factors)
      }));
      
      // 選択されたタスクの正規化された要因を取得
      const selectedTask = body.tasks.find(t => t.id === recommendationDSL.selectedTask.taskId);
      if (selectedTask) {
        response.debug = {
          allScores,
          normalizedFactors: {
            importance: selectedTask.importance,
            urgencyN: 0,  // 簡易版
            stalenessN: 0,
            contextFitN: 0
          }
        };
      }
    }
    
    return c.json(response);
    
  } catch (error) {
    console.error("Task ranking error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, 500);
  }
});

/**
 * GET /v1/task/health
 * タスク推奨サービスのヘルスチェック
 */
taskRoutes.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "task-recommendation",
    timestamp: new Date().toISOString()
  });
});

export { taskRoutes };

