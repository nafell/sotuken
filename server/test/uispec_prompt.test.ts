/**
 * A9タスクのテスト: UISpec生成プロンプト設計テスト
 */

import { UISpecGenerator } from "../src/services/UISpecGenerator";
import { GeminiService } from "../src/services/GeminiService";
import type { DataSchemaDSL } from "../src/types/DataSchemaDSL";

console.log("=== A9タスク: UISpec生成プロンプト設計テスト ===\n");

// ダミーのGeminiServiceを使用
const geminiService = new GeminiService("dummy-key");
const generator = new UISpecGenerator(geminiService);

// テスト用DataSchema
const testDataSchema: DataSchemaDSL = {
  version: "1.0",
  generatedAt: "2025-10-17T00:00:00Z",
  generationId: "test-schema-123",
  task: "CONCERN",
  stage: "capture",
  entities: {
    CONCERN: {
      id: { type: "string", function: "privateIdentifier" },
      concernText: { type: "string", function: "publicIdentifier" },
      category: { type: "string", function: "display" },
      urgency: { type: "number", function: "display" },
      clarificationQuestions: {
        type: "array",
        item: { type: "__QUESTION__" }
      }
    },
    QUESTION: {
      id: { type: "string", function: "privateIdentifier" },
      text: { type: "string", function: "publicIdentifier" },
      answerType: { type: "string", function: "display" }
    }
  },
  dependencies: []
};

// テスト1: captureステージのUIプロンプト生成
console.log("Test 1: captureステージのUIプロンプト生成");
const capturePrompt = generator.buildUISpecPrompt(testDataSchema, "capture");
console.log("Prompt length:", capturePrompt.length, "characters");

if (capturePrompt.length < 1000) {
  console.error("❌ Test 1 Failed: プロンプトが短すぎます");
  process.exit(1);
}

if (!capturePrompt.includes("UISpecDSL")) {
  console.error("❌ Test 1 Failed: UISpecDSL仕様が含まれていません");
  process.exit(1);
}

if (!capturePrompt.includes("capture")) {
  console.error("❌ Test 1 Failed: captureステージの説明が含まれていません");
  process.exit(1);
}

if (!capturePrompt.includes("singleColumn")) {
  console.error("❌ Test 1 Failed: レイアウト方針が含まれていません");
  process.exit(1);
}

// DataSchemaが埋め込まれているか確認
if (!capturePrompt.includes(testDataSchema.generationId)) {
  console.error("❌ Test 1 Failed: DataSchemaが埋め込まれていません");
  process.exit(1);
}

console.log("✅ Test 1 Passed: captureUIプロンプトが正常に生成されました\n");

// テスト2: planステージのUIプロンプト生成
console.log("Test 2: planステージのUIプロンプト生成");
const planDataSchema: DataSchemaDSL = {
  ...testDataSchema,
  stage: "plan",
  entities: {
    CONCERN: {
      ...testDataSchema.entities.CONCERN,
      strategyCandidates: {
        type: "array",
        item: { type: "__STRATEGY__" }
      }
    },
    STRATEGY: {
      id: { type: "string", function: "privateIdentifier" },
      approach: { type: "string", function: "publicIdentifier" },
      tradeoffs: { type: "DICT" }
    }
  }
};

const planPrompt = generator.buildUISpecPrompt(planDataSchema, "plan");
console.log("Prompt length:", planPrompt.length, "characters");

if (planPrompt.length < 1000) {
  console.error("❌ Test 2 Failed: プロンプトが短すぎます");
  process.exit(1);
}

if (!planPrompt.includes("plan")) {
  console.error("❌ Test 2 Failed: planステージの説明が含まれていません");
  process.exit(1);
}

if (!planPrompt.includes("twoColumn") && !planPrompt.includes("grid")) {
  console.error("❌ Test 2 Failed: レイアウトオプションが含まれていません");
  process.exit(1);
}

if (!planPrompt.includes("strategy_preview_picker") || !planPrompt.includes("tradeoff_slider")) {
  console.error("❌ Test 2 Failed: カスタムウィジェットの説明が含まれていません");
  process.exit(1);
}

if (!planPrompt.includes("regenerationPolicy")) {
  console.error("❌ Test 2 Failed: 再生成ポリシーの説明が含まれていません");
  process.exit(1);
}

console.log("✅ Test 2 Passed: planUIプロンプトが正常に生成されました\n");

// テスト3: breakdownステージのUIプロンプト生成
console.log("Test 3: breakdownステージのUIプロンプト生成");
const breakdownDataSchema: DataSchemaDSL = {
  ...testDataSchema,
  stage: "breakdown",
  entities: {
    CONCERN: {
      ...testDataSchema.entities.CONCERN,
      actionSteps: {
        type: "array",
        item: { type: "__ACTION__" }
      }
    },
    ACTION: {
      id: { type: "string", function: "privateIdentifier" },
      title: { type: "string", function: "publicIdentifier" },
      duration: { type: "number", function: "display" }
    }
  }
};

const breakdownPrompt = generator.buildUISpecPrompt(breakdownDataSchema, "breakdown");
console.log("Prompt length:", breakdownPrompt.length, "characters");

if (breakdownPrompt.length < 1000) {
  console.error("❌ Test 3 Failed: プロンプトが短すぎます");
  process.exit(1);
}

if (!breakdownPrompt.includes("breakdown")) {
  console.error("❌ Test 3 Failed: breakdownステージの説明が含まれていません");
  process.exit(1);
}

if (!breakdownPrompt.includes("twoColumn")) {
  console.error("❌ Test 3 Failed: レイアウト方針が含まれていません");
  process.exit(1);
}

if (!breakdownPrompt.includes("reorderable")) {
  console.error("❌ Test 3 Failed: 並び替え機能の説明が含まれていません");
  process.exit(1);
}

console.log("✅ Test 3 Passed: breakdownUIプロンプトが正常に生成されました\n");

// テスト4: プロンプト内容の詳細チェック
console.log("Test 4: プロンプト内容の詳細チェック");
const allPrompts = [capturePrompt, planPrompt, breakdownPrompt];

for (const prompt of allPrompts) {
  if (!prompt.includes("mappings")) {
    console.error("❌ Test 4 Failed: mappingsの説明が含まれていません");
    process.exit(1);
  }
  
  if (!prompt.includes("render")) {
    console.error("❌ Test 4 Failed: render指定の説明が含まれていません");
    process.exit(1);
  }

  // DataSchemaが埋め込まれていることを確認
  if (!prompt.includes("entities")) {
    console.error("❌ Test 4 Failed: DataSchemaが埋め込まれていません");
    process.exit(1);
  }
}

console.log("✅ Test 4 Passed: 全プロンプトに必要な情報が含まれています\n");

console.log("✅✅✅ A9タスク成功: ステージ別UIプロンプトが正常に生成されました");
console.log("\n📊 統計:");
console.log(`  - captureプロンプト: ${capturePrompt.length} 文字`);
console.log(`  - planプロンプト: ${planPrompt.length} 文字`);
console.log(`  - breakdownプロンプト: ${breakdownPrompt.length} 文字`);



