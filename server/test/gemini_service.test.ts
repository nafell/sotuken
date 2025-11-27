/**
 * A4タスクのテスト: Gemini API基本統合テスト
 * 
 * 注意: 実際のAPI呼び出しテストは環境変数 GEMINI_API_KEY が必要です
 */

import { GeminiService } from "../src/services/GeminiService";

console.log("=== A4タスク: Gemini API基本統合テスト ===\n");

// テスト1: コンストラクタテスト（APIキーなし）
console.log("Test 1: コンストラクタ（APIキーなし）");
try {
  new GeminiService("");
  console.error("❌ Test 1 Failed: APIキーなしでエラーが発生すべき");
  process.exit(1);
} catch (error) {
  if (error instanceof Error && error.message.includes("required")) {
    console.log("✅ Test 1 Passed: 適切にエラーが発生\n");
  } else {
    console.error("❌ Test 1 Failed: 予期しないエラー", error);
    process.exit(1);
  }
}

// テスト2: コンストラクタテスト（APIキーあり）
console.log("Test 2: コンストラクタ（APIキーあり）");
try {
  const service = new GeminiService("test-api-key-dummy");
  console.log("✅ Test 2 Passed: GeminiServiceインスタンス作成成功\n");
} catch (error) {
  console.error("❌ Test 2 Failed:", error);
  process.exit(1);
}

// テスト3: 環境変数チェック
console.log("Test 3: 環境変数チェック");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log("⚠️  GEMINI_API_KEY が設定されていません");
  console.log("実際のAPI呼び出しテストをスキップします");
  console.log("\n✅ A4タスク成功（構造テストのみ）");
  console.log("\n📝 実際のAPI接続テストを行うには:");
  console.log("   export GEMINI_API_KEY='your-api-key'");
  console.log("   bun test/gemini_service.test.ts");
  process.exit(0);
}

// テスト4: 実際のAPI呼び出し（環境変数があれば実行）
console.log("✅ Test 3 Passed: GEMINI_API_KEY が設定されています");
console.log("\nTest 4: 実際のAPI呼び出しテスト");

async function runAPITest() {
  const service = new GeminiService(apiKey!);
  
  // 簡単なJSON生成テスト
  const prompt = `Generate a simple JSON object with the following structure:
{
  "greeting": "Hello",
  "number": 42,
  "success": true
}

Respond ONLY with this JSON, no other text.`;

  console.log("API呼び出し中...");
  const result = await service.generateJSON(prompt);
  
  console.log("API Result:", result);
  
  if (!result.success) {
    console.error("❌ Test 4 Failed: API呼び出しに失敗");
    console.error("Error:", result.error);
    process.exit(1);
  }
  
  if (!result.data) {
    console.error("❌ Test 4 Failed: データが返されていません");
    process.exit(1);
  }
  
  console.log("Response data:", result.data);
  console.log("✅ Test 4 Passed: API呼び出し成功\n");
  
  console.log("✅✅✅ A4タスク完全成功: Gemini API統合が正常に動作しています");
}

runAPITest().catch(error => {
  console.error("❌ API Test Failed:", error);
  process.exit(1);
});


