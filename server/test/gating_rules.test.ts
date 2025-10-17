/**
 * B3: ゲーティングルールのテスト
 */

import { ScoreRankingService } from "../src/services/ScoreRankingService";
import type { Task } from "../src/types/TaskRecommendationDSL";

const service = new ScoreRankingService();

console.log("=== B3: ゲーティングルールテスト ===\n");

// テストケース1: 十分な時間がある → task_card
console.log("Test 1: 十分な時間がある場合（available=60, estimate=30）");
const task1: Task = {
  id: "T1",
  title: "論文を読む",
  estimate: 30,
  estimate_min_chunk: 10,
  has_independent_micro_step: true,
  importance: 0.8,
  due_in_hours: 24,
  days_since_last_touch: 1
};

const variant1 = service.applyGating(task1, 60);
console.log(`  結果: ${variant1}`);
console.log(`  期待値: task_card`);
console.log(`  判定: ${variant1 === "task_card" ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース2: マイクロステップ条件
console.log("Test 2: マイクロステップ条件（available=20, estimate=60, min_chunk=15, has_micro=true）");
const task2: Task = {
  id: "T2",
  title: "卒論執筆",
  estimate: 60,
  estimate_min_chunk: 15,
  has_independent_micro_step: true,
  importance: 0.9,
  due_in_hours: 12,
  days_since_last_touch: 0
};

const variant2 = service.applyGating(task2, 20);
console.log(`  結果: ${variant2}`);
console.log(`  期待値: micro_step_card`);
console.log(`  判定: ${variant2 === "micro_step_card" ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース3: マイクロステップがない場合は準備ステップ
console.log("Test 3: マイクロステップなし（available=20, estimate=60, has_micro=false）");
const task3: Task = {
  id: "T3",
  title: "実験実施",
  estimate: 60,
  estimate_min_chunk: 30,
  has_independent_micro_step: false,  // マイクロステップなし
  importance: 0.7,
  due_in_hours: 48,
  days_since_last_touch: 3
};

const variant3 = service.applyGating(task3, 20);
console.log(`  結果: ${variant3}`);
console.log(`  期待値: prepare_step_card`);
console.log(`  判定: ${variant3 === "prepare_step_card" ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース4: 最小チャンク時間すら足りない場合
console.log("Test 4: 最小時間も足りない（available=5, estimate=60, min_chunk=10）");
const task4: Task = {
  id: "T4",
  title: "データ分析",
  estimate: 60,
  estimate_min_chunk: 10,
  has_independent_micro_step: true,
  importance: 0.6,
  due_in_hours: 72,
  days_since_last_touch: 2
};

const variant4 = service.applyGating(task4, 5);
console.log(`  結果: ${variant4}`);
console.log(`  期待値: prepare_step_card`);
console.log(`  判定: ${variant4 === "prepare_step_card" ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース5: ちょうどestimateと同じ時間
console.log("Test 5: ちょうど見積時間と同じ（available=30, estimate=30）");
const task5: Task = {
  id: "T5",
  title: "ミーティング準備",
  estimate: 30,
  estimate_min_chunk: 10,
  has_independent_micro_step: false,
  importance: 0.5,
  due_in_hours: 6,
  days_since_last_touch: 0
};

const variant5 = service.applyGating(task5, 30);
console.log(`  結果: ${variant5}`);
console.log(`  期待値: task_card（>=条件なので）`);
console.log(`  判定: ${variant5 === "task_card" ? "✅ PASS" : "❌ FAIL"}\n`);

console.log("=== B3: ゲーティングルールテスト完了 ===");

