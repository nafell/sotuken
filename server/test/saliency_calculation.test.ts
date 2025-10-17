/**
 * B4: サリエンシー計算のテスト
 */

import { ScoreRankingService } from "../src/services/ScoreRankingService";
import type { Task } from "../src/types/TaskRecommendationDSL";

const service = new ScoreRankingService();

console.log("=== B4: サリエンシー計算テスト ===\n");

// テストケース1: Level 3 (urgent) - 締切<24h かつ 重要度≥0.67
console.log("Test 1: Level 3 (urgent) 条件（due_in_hours=12, importance=0.8）");
const task1: Task = {
  id: "T1",
  title: "指導教員にメール返信",
  estimate: 15,
  estimate_min_chunk: 15,
  has_independent_micro_step: false,
  importance: 0.8,  // ≥0.67
  due_in_hours: 12,  // <24
  days_since_last_touch: 0
};

const saliency1 = service.calculateSaliency(task1);
console.log(`  結果: Level ${saliency1}`);
console.log(`  期待値: Level 3 (urgent)`);
console.log(`  判定: ${saliency1 === 3 ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース2: Level 2 (primary) - 標準推奨タスク
console.log("Test 2: Level 2 (primary) 条件（due_in_hours=48, importance=0.6）");
const task2: Task = {
  id: "T2",
  title: "論文を読む",
  estimate: 30,
  estimate_min_chunk: 10,
  has_independent_micro_step: true,
  importance: 0.6,
  due_in_hours: 48,
  days_since_last_touch: 2
};

const saliency2 = service.calculateSaliency(task2, "task_card");
console.log(`  結果: Level ${saliency2}`);
console.log(`  期待値: Level 2 (primary)`);
console.log(`  判定: ${saliency2 === 2 ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース3: Level 1 (emphasis) - 準備ステップ
console.log("Test 3: Level 1 (emphasis) 条件（variant=prepare_step_card）");
const task3: Task = {
  id: "T3",
  title: "実験実施",
  estimate: 60,
  estimate_min_chunk: 30,
  has_independent_micro_step: false,
  importance: 0.7,
  due_in_hours: 72,
  days_since_last_touch: 3
};

const saliency3 = service.calculateSaliency(task3, "prepare_step_card");
console.log(`  結果: Level ${saliency3}`);
console.log(`  期待値: Level 1 (emphasis)`);
console.log(`  判定: ${saliency3 === 1 ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース4: urgent条件の境界値テスト（due_in_hours=24）
console.log("Test 4: urgent条件の境界値（due_in_hours=24, importance=0.8）");
const task4: Task = {
  id: "T4",
  title: "レポート提出",
  estimate: 45,
  estimate_min_chunk: 20,
  has_independent_micro_step: true,
  importance: 0.8,
  due_in_hours: 24,  // =24（境界値、<24でないのでurgentにならない）
  days_since_last_touch: 1
};

const saliency4 = service.calculateSaliency(task4);
console.log(`  結果: Level ${saliency4}`);
console.log(`  期待値: Level 2 (primary)（<24でないため）`);
console.log(`  判定: ${saliency4 === 2 ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース5: urgent条件の境界値テスト（importance=0.66）
console.log("Test 5: urgent条件の境界値（due_in_hours=12, importance=0.66）");
const task5: Task = {
  id: "T5",
  title: "ミーティング準備",
  estimate: 20,
  estimate_min_chunk: 10,
  has_independent_micro_step: false,
  importance: 0.66,  // <0.67（境界値、urgentにならない）
  due_in_hours: 12,
  days_since_last_touch: 0
};

const saliency5 = service.calculateSaliency(task5);
console.log(`  結果: Level ${saliency5}`);
console.log(`  期待値: Level 2 (primary)（importance<0.67のため）`);
console.log(`  判定: ${saliency5 === 2 ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース6: urgent条件を満たすが、prepare_stepの場合
console.log("Test 6: urgentかつprepare_step（due_in_hours=12, importance=0.9, variant=prepare_step）");
const task6: Task = {
  id: "T6",
  title: "緊急タスク",
  estimate: 60,
  estimate_min_chunk: 30,
  has_independent_micro_step: false,
  importance: 0.9,  // urgent条件を満たす
  due_in_hours: 6,  // urgent条件を満たす
  days_since_last_touch: 0
};

const saliency6 = service.calculateSaliency(task6, "prepare_step_card");
console.log(`  結果: Level ${saliency6}`);
console.log(`  期待値: Level 3 (urgent)（urgentが優先）`);
console.log(`  判定: ${saliency6 === 3 ? "✅ PASS" : "❌ FAIL"}\n`);

console.log("=== B4: サリエンシー計算テスト完了 ===");

