/**
 * A3タスクのテスト: バリデーション実装テスト
 */

import { DataSchemaValidator, type DataSchemaDSL } from "../src/types/DataSchemaDSL";

const validator = new DataSchemaValidator();

// テスト1: 有効なスキーマ
console.log("=== Test 1: 有効なスキーマ ===");
const validSchema: DataSchemaDSL = {
  version: "1.0",
  generatedAt: "2025-10-17T00:00:00Z",
  generationId: "test-id-123",
  task: "CONCERN",
  stage: "capture",
  entities: {
    CONCERN: {
      id: { type: "string", function: "privateIdentifier" },
      concernText: { type: "string", function: "publicIdentifier" },
      category: { type: "string", function: "display" },
      urgency: { type: "number", function: "display" }
    }
  },
  dependencies: []
};

const result1 = validator.validate(validSchema);
console.log("Result:", result1);
if (!result1.isValid) {
  console.error("❌ Test 1 Failed: Expected valid schema");
  console.error("Errors:", result1.errors);
  process.exit(1);
}
console.log("✅ Test 1 Passed\n");

// テスト2: 無効なスキーマ（必須フィールド欠如）
console.log("=== Test 2: 無効なスキーマ（version欠如） ===");
const invalidSchema1 = {
  task: "CONCERN",
  stage: "capture"
};

const result2 = validator.validate(invalidSchema1);
console.log("Result:", result2);
if (result2.isValid) {
  console.error("❌ Test 2 Failed: Expected invalid schema");
  process.exit(1);
}
if (result2.errors.length === 0) {
  console.error("❌ Test 2 Failed: Expected errors array");
  process.exit(1);
}
console.log("✅ Test 2 Passed - Errors detected:", result2.errors.length, "errors\n");

// テスト3: 無効なスキーマ（CONCERN entity欠如）
console.log("=== Test 3: 無効なスキーマ（CONCERN entity欠如） ===");
const invalidSchema2 = {
  version: "1.0",
  task: "CONCERN",
  stage: "capture",
  entities: {},
  dependencies: []
};

const result3 = validator.validate(invalidSchema2);
console.log("Result:", result3);
if (result3.isValid) {
  console.error("❌ Test 3 Failed: Expected invalid schema");
  process.exit(1);
}
if (!result3.errors.some(e => e.includes("CONCERN"))) {
  console.error("❌ Test 3 Failed: Expected CONCERN entity error");
  console.error("Errors:", result3.errors);
  process.exit(1);
}
console.log("✅ Test 3 Passed\n");

// テスト4: CONCERNの必須属性チェック
console.log("=== Test 4: CONCERN必須属性チェック ===");
const invalidSchema3 = {
  version: "1.0",
  task: "CONCERN",
  stage: "capture",
  entities: {
    CONCERN: {
      id: { type: "string", function: "privateIdentifier" }
      // concernText, category, urgency が欠如
    }
  },
  dependencies: []
};

const result4 = validator.validate(invalidSchema3);
console.log("Result:", result4);
if (result4.isValid) {
  console.error("❌ Test 4 Failed: Expected invalid schema");
  process.exit(1);
}
const missingAttrs = ["concernText", "category", "urgency"];
for (const attr of missingAttrs) {
  if (!result4.errors.some(e => e.includes(attr))) {
    console.error(`❌ Test 4 Failed: Expected error for missing ${attr}`);
    console.error("Errors:", result4.errors);
    process.exit(1);
  }
}
console.log("✅ Test 4 Passed\n");

console.log("✅✅✅ A3タスク成功: すべてのバリデーションテストがパスしました");


