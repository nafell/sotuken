/**
 * B2: スコア計算関数のテスト
 */

import { ScoreRankingService } from "../src/services/ScoreRankingService";
import type { Task } from "../src/types/TaskRecommendationDSL";

const service = new ScoreRankingService();

console.log("=== B2: スコア計算関数テスト ===\n");

// テストケース1: 標準的なタスク
console.log("Test 1: 標準的なタスク（重要度=0.8, 締切=24時間後, 放置=2日）");
const task1: Task = {
  id: "T1",
  title: "論文5本をピックアップ",
  importance: 0.8,
  due_in_hours: 24,
  days_since_last_touch: 2,
  estimate: 30,
  estimate_min_chunk: 10,
  has_independent_micro_step: true
};

const factors1 = {
  available_time: 60,
  time_of_day: "morning" as const,
  location_category: "home" as const
};

const score1 = service.calculateScore(task1, factors1);
console.log(`  スコア: ${score1.toFixed(3)}`);
console.log(`  期待値: 0.4-0.8の範囲`);
console.log(`  結果: ${score1 >= 0.4 && score1 <= 0.8 ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース2: 高重要度・緊急タスク
console.log("Test 2: 高重要度・緊急タスク（重要度=1.0, 締切=6時間後, 放置=0日）");
const task2: Task = {
  id: "T2",
  title: "指導教員にメール返信",
  importance: 1.0,
  due_in_hours: 6,
  days_since_last_touch: 0,
  estimate: 15,
  estimate_min_chunk: 15,
  has_independent_micro_step: false
};

const factors2 = {
  available_time: 30,
  time_of_day: "afternoon" as const,
  location_category: "work" as const
};

const score2 = service.calculateScore(task2, factors2);
console.log(`  スコア: ${score2.toFixed(3)}`);
console.log(`  期待値: score2 > score1（より緊急）`);
console.log(`  結果: ${score2 > score1 ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース3: 放置タスク
console.log("Test 3: 放置タスク（重要度=0.6, 締切=48時間後, 放置=7日）");
const task3: Task = {
  id: "T3",
  title: "プロトタイプ設計",
  importance: 0.6,
  due_in_hours: 48,
  days_since_last_touch: 7,
  estimate: 90,
  estimate_min_chunk: 30,
  has_independent_micro_step: true
};

const factors3 = {
  available_time: 45,
  time_of_day: "evening" as const,
  location_category: "home" as const
};

const score3 = service.calculateScore(task3, factors3);
console.log(`  スコア: ${score3.toFixed(3)}`);
console.log(`  期待値: staleness要因で一定のスコア`);
console.log(`  結果: ${score3 >= 0.3 && score3 <= 0.7 ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース4: contextFit効果の確認
console.log("Test 4: contextFit効果（時間が足りる vs 足りない）");
const task4: Task = {
  id: "T4",
  title: "テストタスク",
  importance: 0.5,
  due_in_hours: 72,
  days_since_last_touch: 1,
  estimate: 30,
  estimate_min_chunk: 10,
  has_independent_micro_step: false
};

const factorsWithTime = {
  available_time: 60,  // 時間が足りる
  time_of_day: "morning" as const,
  location_category: "home" as const
};

const factorsWithoutTime = {
  available_time: 15,  // 時間が足りない
  time_of_day: "morning" as const,
  location_category: "home" as const
};

const scoreWithTime = service.calculateScore(task4, factorsWithTime);
const scoreWithoutTime = service.calculateScore(task4, factorsWithoutTime);

console.log(`  時間が足りる場合のスコア: ${scoreWithTime.toFixed(3)}`);
console.log(`  時間が足りない場合のスコア: ${scoreWithoutTime.toFixed(3)}`);
console.log(`  期待値: 時間が足りる方が高スコア`);
console.log(`  結果: ${scoreWithTime > scoreWithoutTime ? "✅ PASS" : "❌ FAIL"}\n`);

// テストケース5: スコアの範囲確認
console.log("Test 5: スコアが0-1の範囲内であることを確認");
const testTasks: Task[] = [
  { ...task1 },
  { ...task2 },
  { ...task3 },
  { ...task4 }
];

const allInRange = testTasks.every(task => {
  const score = service.calculateScore(task, factors1);
  return score >= 0 && score <= 1;
});

console.log(`  全タスクのスコアが0-1の範囲内: ${allInRange ? "✅ PASS" : "❌ FAIL"}\n`);

console.log("=== B2: スコア計算関数テスト完了 ===");

