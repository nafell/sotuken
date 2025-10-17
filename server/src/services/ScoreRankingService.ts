/**
 * ScoreRankingService
 * タスクのスコアリング・ランキング・推奨DSL生成を行うサービス
 */

import type { 
  Task, 
  RankingRequest, 
  TaskCardVariant, 
  SaliencyLevel,
  TaskRecommendationDSL,
  TaskCardSpec,
  ScoringSpec
} from "../types/TaskRecommendationDSL";

/**
 * スコアリング・ランキングサービス
 */
export class ScoreRankingService {
  /**
   * タスクのスコアを計算
   * 
   * 最終スコア = 0.4 × importance + 0.3 × urgency + 0.2 × staleness + 0.1 × contextFit
   * 
   * @param task - タスクデータ
   * @param factors - コンテキスト要因
   * @returns スコア（0-1の範囲）
   */
  calculateScore(task: Task, factors: RankingRequest["factors"]): number {
    // 1. importance: 既に0-1の範囲
    const importance = task.importance;
    
    // 2. urgency: 締切が近いほど高スコア
    // 1 - logistic(due_in_hours, mid=48, k=0.1)
    const urgencyN = 1 - this.logistic(task.due_in_hours, 48, 0.1);
    
    // 3. staleness: 放置期間が長いほど高スコア
    // logistic(days_since_last_touch, mid=3, k=1.5)
    const stalenessN = this.logistic(task.days_since_last_touch, 3, 1.5);
    
    // 4. contextFit: 状況適合度
    const contextFitN = this.calculateContextFit(task, factors);
    
    // スコア計算（重み: 0.4, 0.3, 0.2, 0.1）
    const score = 0.4 * importance + 0.3 * urgencyN + 0.2 * stalenessN + 0.1 * contextFitN;
    
    return score;
  }
  
  /**
   * ロジスティック関数
   * 
   * @param x - 入力値
   * @param mid - 中間点（この値で0.5を出力）
   * @param k - 傾き（大きいほど急激に変化）
   * @returns 0-1の範囲の値
   */
  private logistic(x: number, mid: number, k: number): number {
    return 1 / (1 + Math.exp(-k * (x - mid)));
  }
  
  /**
   * コンテキスト適合度を計算
   * 
   * contextFit = time_of_day_match*0.2 + location_match*0.3 + time_available_match*0.5
   * 
   * @param task - タスクデータ
   * @param factors - コンテキスト要因
   * @returns 0-1の範囲の値
   */
  private calculateContextFit(task: Task, factors: RankingRequest["factors"]): number {
    let fit = 0;
    
    // 時間帯が合う（+0.2）
    if (task.preferred_time && task.preferred_time === factors.time_of_day) {
      fit += 0.2;
    }
    
    // 場所が合う（+0.3）
    if (task.preferred_location && task.preferred_location === factors.location_category) {
      fit += 0.3;
    }
    
    // 時間が足りる（+0.5）- 最重要
    if (factors.available_time >= task.estimate) {
      fit += 0.5;
    }
    
    // 最大1.0に制限
    return Math.min(1, fit);
  }
  
  /**
   * ゲーティングルールを適用してvariantを決定
   * 
   * ルール評価順序:
   * 1. available_time >= estimate → task_card
   * 2. available_time >= estimate_min_chunk && has_independent_micro_step → micro_step_card
   * 3. その他 → prepare_step_card
   * 
   * @param task - タスクデータ
   * @param available_time - 利用可能時間（分）
   * @returns タスクカードのvariant
   */
  applyGating(task: Task, available_time: number): TaskCardVariant {
    // ルール1: 十分な時間がある → 本体タスク
    if (available_time >= task.estimate) {
      return "task_card";
    }
    
    // ルール2: 最小チャンク時間があり、独立したマイクロステップがある → マイクロステップ
    if (available_time >= task.estimate_min_chunk && task.has_independent_micro_step) {
      return "micro_step_card";
    }
    
    // ルール3: その他 → 準備ステップ
    return "prepare_step_card";
  }
  
  /**
   * サリエンシーレベルを計算
   * 
   * ルール:
   * - Level 3 (urgent): due_in_hours < 24 && importance >= 0.67
   * - Level 2 (primary): 標準推奨タスク（デフォルト）
   * - Level 1 (emphasis): prepare_step の場合
   * 
   * @param task - タスクデータ
   * @param variant - タスクカードのvariant（オプション）
   * @returns サリエンシーレベル（0-3）
   */
  calculateSaliency(task: Task, variant?: TaskCardVariant): SaliencyLevel {
    // Level 3 (urgent): 緊急条件を満たす場合
    // 締切24時間未満 かつ 重要度≥0.67（高）
    if (task.due_in_hours < 24 && task.importance >= 0.67) {
      return 3;
    }
    
    // Level 1 (emphasis): 準備ステップの場合
    if (variant === "prepare_step_card") {
      return 1;
    }
    
    // Level 2 (primary): 標準推奨タスク（デフォルト）
    return 2;
  }
  
  /**
   * タスクを選出してTaskRecommendationDSLを生成
   * 
   * 処理フロー:
   * 1. 全タスクのスコアを計算
   * 2. 最高スコアのタスクを選出
   * 3. variantとsaliencyを決定
   * 4. TaskRecommendationDSLを生成
   * 
   * @param request - ランキングリクエスト
   * @returns TaskRecommendationDSL
   */
  async selectAndRender(request: RankingRequest): Promise<TaskRecommendationDSL> {
    const { tasks, available_time, factors } = request;
    
    if (!tasks || tasks.length === 0) {
      throw new Error("No tasks provided");
    }
    
    // 1. 全タスクのスコアを計算
    const scoredTasks = tasks.map(task => ({
      task,
      score: this.calculateScore(task, factors)
    }));
    
    // 2. 最高スコアのタスクを選出
    const bestTask = scoredTasks.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    const selectedTask = bestTask.task;
    const score = bestTask.score;
    
    // 3. variantとsaliencyを決定
    const variant = this.applyGating(selectedTask, available_time);
    const saliency = this.calculateSaliency(selectedTask, variant);
    
    // 4. TaskRecommendationDSLを生成
    const taskRecommendationDSL: TaskRecommendationDSL = {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      recommendationId: this.generateUUID(),
      type: "task_recommendation",
      
      selectedTask: {
        taskId: selectedTask.id,
        variant,
        saliency,
        score
      },
      
      taskCard: this.buildTaskCardSpec(selectedTask, variant),
      scoring: this.buildScoringSpec()
    };
    
    return taskRecommendationDSL;
  }
  
  /**
   * TaskCardSpecを構築
   */
  private buildTaskCardSpec(task: Task, variant: TaskCardVariant): TaskCardSpec {
    return {
      fields: ["title", "estimate", "due_in_hours"],
      
      variants: {
        task_card: {
          title: task.title,
          estimate: task.estimate,
          due_in_hours: task.due_in_hours,
          label: "今すぐ始められます",
          actionButton: "開始"
        },
        micro_step_card: {
          title: task.micro_step_title || `${task.title}の一部`,
          duration: task.estimate_min_chunk,
          parentTaskTitle: task.title,
          label: "少しだけ進められます",
          actionButton: "10分だけやる"
        },
        prepare_step_card: {
          title: task.prepare_step_title || `${task.title}の準備`,
          duration: 5,  // デフォルト準備時間
          parentTaskTitle: task.title,
          label: "準備だけでもしておきましょう",
          actionButton: "準備する"
        }
      },
      
      saliencyStyles: {
        0: {
          backgroundColor: "bg-neutral-50",
          fontSize: "text-base",
          elevation: 0
        },
        1: {
          backgroundColor: "bg-blue-50",
          fontSize: "text-md",
          elevation: 1
        },
        2: {
          backgroundColor: "bg-blue-100",
          fontSize: "text-lg font-semibold",
          elevation: 2
        },
        3: {
          backgroundColor: "bg-red-100",
          fontSize: "text-lg font-bold",
          elevation: 3,
          icon: "⚠️",
          animation: "animate-pulse"
        }
      }
    };
  }
  
  /**
   * ScoringSpecを構築
   */
  private buildScoringSpec(): ScoringSpec {
    return {
      formula: "0.4*importance + 0.3*urgency + 0.2*staleness + 0.1*contextFit",
      
      normalization: {
        importance: {
          method: "discrete_3level",
          mapping: {
            low: 0.33,
            medium: 0.67,
            high: 1.0
          }
        },
        urgency: {
          method: "logistic",
          formula: "1 - logistic(due_in_hours, mid=48, k=0.1)"
        },
        staleness: {
          method: "logistic",
          formula: "logistic(days_since_last_touch, mid=3, k=1.5)"
        },
        contextFit: {
          method: "additive",
          formula: "min(1, time_of_day_match*0.2 + location_match*0.3 + time_available_match*0.5)"
        }
      },
      
      gating: [
        {
          condition: "available_time >= estimate",
          variant: "task_card"
        },
        {
          condition: "available_time >= estimate_min_chunk && has_independent_micro_step",
          variant: "micro_step_card"
        },
        {
          condition: "true",
          variant: "prepare_step_card"
        }
      ],
      
      saliencyRule: "if(due_in_hours<24 && importance>=0.67, 3, 2)"
    };
  }
  
  /**
   * UUID生成（簡易版）
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

