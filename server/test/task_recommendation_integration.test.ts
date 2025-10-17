/**
 * B5: TaskRecommendation統合サービスのテスト
 */

import { ScoreRankingService } from "../src/services/ScoreRankingService";
import type { Task, RankingRequest } from "../src/types/TaskRecommendationDSL";

const service = new ScoreRankingService();

console.log("=== B5: TaskRecommendation統合テスト ===\n");

// テストケース1: 複数タスクから最高スコアを選出
console.log("Test 1: 複数タスクから最高スコアタスクを選出");
const tasks1: Task[] = [
  {
    id: "T1",
    title: "論文を読む",
    importance: 0.6,
    due_in_hours: 48,
    days_since_last_touch: 2,
    estimate: 30,
    estimate_min_chunk: 10,
    has_independent_micro_step: true
  },
  {
    id: "T2",
    title: "指導教員にメール返信",
    importance: 0.9,
    due_in_hours: 12,
    days_since_last_touch: 0,
    estimate: 15,
    estimate_min_chunk: 15,
    has_independent_micro_step: false
  },
  {
    id: "T3",
    title: "実験実施",
    importance: 0.5,
    due_in_hours: 72,
    days_since_last_touch: 5,
    estimate: 90,
    estimate_min_chunk: 30,
    has_independent_micro_step: true
  }
];

const request1: RankingRequest = {
  available_time: 30,
  factors: {
    time_of_day: "morning",
    location_category: "home"
  },
  tasks: tasks1
};

const recommendation1 = await service.selectAndRender(request1);
console.log(`  選出タスク: ${recommendation1.selectedTask.taskId}`);
console.log(`  期待値: T2（高重要度・緊急）`);
console.log(`  variant: ${recommendation1.selectedTask.variant}`);
console.log(`  saliency: ${recommendation1.selectedTask.saliency}`);
console.log(`  score: ${recommendation1.selectedTask.score?.toFixed(3)}`);
console.log(`  判定: ${recommendation1.selectedTask.taskId === "T2" ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース2: 有効なTaskRecommendationDSLが生成される
console.log("Test 2: 有効なTaskRecommendationDSL生成確認");
console.log(`  version: ${recommendation1.version}`);
console.log(`  type: ${recommendation1.type}`);
console.log(`  recommendationId: ${recommendation1.recommendationId}`);
console.log(`  generatedAt: ${recommendation1.generatedAt}`);

const isValidDSL = 
  recommendation1.version === "1.0" &&
  recommendation1.type === "task_recommendation" &&
  recommendation1.recommendationId.length > 0 &&
  recommendation1.selectedTask.taskId.length > 0 &&
  recommendation1.taskCard.fields.length === 3 &&
  recommendation1.scoring.formula.length > 0;

console.log(`  判定: ${isValidDSL ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース3: variantとsaliencyの正確性
console.log("Test 3: variant・saliency決定の正確性");
const urgentTask: Task = {
  id: "T_URGENT",
  title: "緊急タスク",
  importance: 0.9,
  due_in_hours: 6,
  days_since_last_touch: 0,
  estimate: 20,
  estimate_min_chunk: 10,
  has_independent_micro_step: true
};

const request2: RankingRequest = {
  available_time: 30,  // 十分な時間がある
  factors: {
    time_of_day: "afternoon",
    location_category: "work"
  },
  tasks: [urgentTask]
};

const recommendation2 = await service.selectAndRender(request2);
console.log(`  variant: ${recommendation2.selectedTask.variant}`);
console.log(`  期待値: task_card（時間が十分）`);
console.log(`  saliency: ${recommendation2.selectedTask.saliency}`);
console.log(`  期待値: 3 (urgent)（締切<24h & 重要度≥0.67）`);

const isCorrect = 
  recommendation2.selectedTask.variant === "task_card" &&
  recommendation2.selectedTask.saliency === 3;

console.log(`  判定: ${isCorrect ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース4: micro_step_card条件
console.log("Test 4: micro_step_card選出確認");
const longTask: Task = {
  id: "T_LONG",
  title: "長時間タスク",
  importance: 0.7,
  due_in_hours: 48,
  days_since_last_touch: 1,
  estimate: 60,
  estimate_min_chunk: 15,
  has_independent_micro_step: true
};

const request3: RankingRequest = {
  available_time: 20,  // min_chunkには足りるが、estimateには足りない
  factors: {
    time_of_day: "evening",
    location_category: "home"
  },
  tasks: [longTask]
};

const recommendation3 = await service.selectAndRender(request3);
console.log(`  variant: ${recommendation3.selectedTask.variant}`);
console.log(`  期待値: micro_step_card`);
console.log(`  判定: ${recommendation3.selectedTask.variant === "micro_step_card" ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース5: TaskCardSpecの内容確認
console.log("Test 5: TaskCardSpec内容確認");
const taskCard = recommendation1.taskCard;
console.log(`  fields: ${taskCard.fields.join(", ")}`);
console.log(`  variants: ${Object.keys(taskCard.variants).join(", ")}`);
console.log(`  saliencyStyles: ${Object.keys(taskCard.saliencyStyles).join(", ")}`);

const hasAllVariants = 
  taskCard.variants.task_card &&
  taskCard.variants.micro_step_card &&
  taskCard.variants.prepare_step_card;

const hasAllSaliencyStyles = 
  taskCard.saliencyStyles[0] &&
  taskCard.saliencyStyles[1] &&
  taskCard.saliencyStyles[2] &&
  taskCard.saliencyStyles[3];

console.log(`  全variant定義: ${hasAllVariants ? "✅" : "❌"}`);
console.log(`  全saliency定義: ${hasAllSaliencyStyles ? "✅" : "❌"}`);
console.log(`  判定: ${hasAllVariants && hasAllSaliencyStyles ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース6: ScoringSpec内容確認
console.log("Test 6: ScoringSpec内容確認");
const scoring = recommendation1.scoring;
console.log(`  formula: ${scoring.formula}`);
console.log(`  gating rules: ${scoring.gating.length}件`);
console.log(`  saliencyRule: ${scoring.saliencyRule}`);

const hasScoringSpec = 
  scoring.formula.includes("importance") &&
  scoring.gating.length === 3 &&
  scoring.saliencyRule.includes("due_in_hours");

console.log(`  判定: ${hasScoringSpec ? "✅ PASS" : "❌ FAIL"}\n`);

console.log("=== B5: TaskRecommendation統合テスト完了 ===");

