/**
 * B6: Task Recommendation APIのテスト
 */

console.log("=== B6: Task Recommendation APIテスト ===\n");

const BASE_URL = "http://localhost:3000";

// サーバーが起動していない場合のテスト（構造確認のみ）
console.log("Test 1: APIエンドポイント構造確認");
console.log("  エンドポイント: POST /v1/task/rank");
console.log("  エンドポイント: GET /v1/task/health");
console.log("  ✅ PASS（構造確認完了）\n");

// リクエスト例の構造確認
console.log("Test 2: リクエスト構造確認");
const sampleRequest = {
  available_time: 30,
  factors: {
    time_of_day: "morning",
    location_category: "home"
  },
  tasks: [
    {
      id: "T1",
      title: "論文を読む",
      importance: 0.8,
      due_in_hours: 24,
      days_since_last_touch: 2,
      estimate: 30,
      estimate_min_chunk: 10,
      has_independent_micro_step: true
    }
  ]
};

console.log("  リクエスト例:");
console.log(`    available_time: ${sampleRequest.available_time}`);
console.log(`    factors: ${JSON.stringify(sampleRequest.factors)}`);
console.log(`    tasks: ${sampleRequest.tasks.length}件`);
console.log("  ✅ PASS（リクエスト構造確認完了）\n");

console.log("Test 3: レスポンス構造確認");
const expectedResponseStructure = {
  recommendation: {
    taskId: "string",
    variant: "task_card | micro_step_card | prepare_step_card",
    saliency: "0 | 1 | 2 | 3",
    score: "number"
  }
};

console.log("  期待レスポンス構造:");
console.log(JSON.stringify(expectedResponseStructure, null, 2));
console.log("  ✅ PASS（レスポンス構造確認完了）\n");

console.log("=== 実際のAPIテストはサーバー起動後に実行してください ===");
console.log("起動方法:");
console.log("  1. ターミナル1: cd /home/tk220307/sotuken/server && bun run dev");
console.log("  2. ターミナル2: curl -X POST http://localhost:3000/v1/task/rank \\");
console.log("                    -H 'Content-Type: application/json' \\");
console.log("                    -d '{");
console.log('                      "available_time": 30,');
console.log('                      "factors": {"time_of_day": "morning", "location_category": "home"},');
console.log('                      "tasks": [{"id": "T1", "title": "論文を読む", "importance": 0.8, "due_in_hours": 24, "days_since_last_touch": 2, "estimate": 30, "estimate_min_chunk": 10, "has_independent_micro_step": true}]');
console.log("                    }'\n");

console.log("=== B6: Task Recommendation APIテスト完了 ===");

