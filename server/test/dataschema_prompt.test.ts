/**
 * A5タスクのテスト: DataSchema生成プロンプト設計テスト
 */

import { DataSchemaGenerator } from "../src/services/DataSchemaGenerator";
import { GeminiService } from "../src/services/GeminiService";

console.log("=== A5タスク: DataSchema生成プロンプト設計テスト ===\n");

// ダミーのGeminiServiceを使用（実際のAPI呼び出しは不要）
const geminiService = new GeminiService("dummy-key");
const generator = new DataSchemaGenerator(geminiService);

// テスト1: captureステージのプロンプト生成
console.log("Test 1: captureステージのプロンプト生成");
const capturePrompt = generator.buildPrompt("capture", "卒業研究のテーマ決めに悩んでいる");
console.log("Prompt length:", capturePrompt.length, "characters");

if (capturePrompt.length < 1000) {
  console.error("❌ Test 1 Failed: プロンプトが短すぎます");
  process.exit(1);
}

if (!capturePrompt.includes("DataSchemaDSL")) {
  console.error("❌ Test 1 Failed: DSL仕様が含まれていません");
  process.exit(1);
}

if (!capturePrompt.includes("capture")) {
  console.error("❌ Test 1 Failed: captureステージの説明が含まれていません");
  process.exit(1);
}

if (!capturePrompt.includes("QUESTION")) {
  console.error("❌ Test 1 Failed: QUESTIONエンティティの説明が含まれていません");
  process.exit(1);
}

console.log("✅ Test 1 Passed: captureプロンプトが正常に生成されました\n");

// テスト2: planステージのプロンプト生成
console.log("Test 2: planステージのプロンプト生成");
const planPrompt = generator.buildPrompt("plan", "卒業研究のテーマ決めに悩んでいる", {
  previousAnswers: {
    stage: "テーマ決め",
    difficulty: "高"
  }
});
console.log("Prompt length:", planPrompt.length, "characters");

if (planPrompt.length < 1000) {
  console.error("❌ Test 2 Failed: プロンプトが短すぎます");
  process.exit(1);
}

if (!planPrompt.includes("plan")) {
  console.error("❌ Test 2 Failed: planステージの説明が含まれていません");
  process.exit(1);
}

if (!planPrompt.includes("STRATEGY")) {
  console.error("❌ Test 2 Failed: STRATEGYエンティティの説明が含まれていません");
  process.exit(1);
}

if (!planPrompt.includes("情報整理") || !planPrompt.includes("具体行動")) {
  console.error("❌ Test 2 Failed: アプローチの種類が含まれていません");
  process.exit(1);
}

console.log("✅ Test 2 Passed: planプロンプトが正常に生成されました\n");

// テスト3: breakdownステージのプロンプト生成
console.log("Test 3: breakdownステージのプロンプト生成");
const breakdownPrompt = generator.buildPrompt("breakdown", "卒業研究のテーマ決めに悩んでいる", {
  selectedStrategy: {
    approach: "情報整理",
    next3Steps: ["論文調査", "分野整理", "テーマ候補リスト作成"]
  }
});
console.log("Prompt length:", breakdownPrompt.length, "characters");

if (breakdownPrompt.length < 1000) {
  console.error("❌ Test 3 Failed: プロンプトが短すぎます");
  process.exit(1);
}

if (!breakdownPrompt.includes("breakdown")) {
  console.error("❌ Test 3 Failed: breakdownステージの説明が含まれていません");
  process.exit(1);
}

if (!breakdownPrompt.includes("ACTION")) {
  console.error("❌ Test 3 Failed: ACTIONエンティティの説明が含まれていません");
  process.exit(1);
}

if (!breakdownPrompt.includes("dependencies")) {
  console.error("❌ Test 3 Failed: 依存関係の説明が含まれていません");
  process.exit(1);
}

console.log("✅ Test 3 Passed: breakdownプロンプトが正常に生成されました\n");

// テスト4: プロンプト内容の詳細チェック
console.log("Test 4: プロンプト内容の詳細チェック");
const allPrompts = [capturePrompt, planPrompt, breakdownPrompt];

for (const prompt of allPrompts) {
  if (!prompt.includes("CONCERN")) {
    console.error("❌ Test 4 Failed: CONCERNエンティティの説明が含まれていません");
    process.exit(1);
  }
  
  if (!prompt.includes("version")) {
    console.error("❌ Test 4 Failed: version指定が含まれていません");
    process.exit(1);
  }
}

console.log("✅ Test 4 Passed: 全プロンプトに必要な情報が含まれています\n");

console.log("✅✅✅ A5タスク成功: ステージ別プロンプトが正常に生成されました");
console.log("\n📊 統計:");
console.log(`  - captureプロンプト: ${capturePrompt.length} 文字`);
console.log(`  - planプロンプト: ${planPrompt.length} 文字`);
console.log(`  - breakdownプロンプト: ${breakdownPrompt.length} 文字`);


