/**
 * A8タスクのテスト: UISpecバリデーター実装テスト
 */

import { UISpecValidator, type UISpecDSL } from "../src/types/UISpecDSL";
import type { DataSchemaDSL } from "../src/types/DataSchemaDSL";

console.log("=== A8タスク: UISpecバリデーター実装テスト ===\n");

const validator = new UISpecValidator();

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
      urgency: { type: "number", function: "display" }
    }
  },
  dependencies: []
};

// テスト1: 有効なUISpec
console.log("Test 1: 有効なUISpec");
const validUISpec: UISpecDSL = {
  version: "1.0",
  generatedAt: "2025-10-17T00:00:00Z",
  generationId: "test-ui-123",
  schemaRef: "test-schema-123",
  stage: "capture",
  mappings: {
    "CONCERN.concernText": {
      render: "paragraph",
      editable: true,
      placeholder: "関心事を入力",
      displayOrder: 1
    },
    "CONCERN.category": {
      render: "category",
      editable: true,
      categories: ["学習系", "仕事系", "習慣系"],
      displayOrder: 2
    }
  }
};

const result1 = validator.validate(validUISpec, testDataSchema);
console.log("Result:", result1);
if (!result1.isValid) {
  console.error("❌ Test 1 Failed: Expected valid UISpec");
  console.error("Errors:", result1.errors);
  process.exit(1);
}
console.log("✅ Test 1 Passed\n");

// テスト2: 無効なUISpec（必須フィールド欠如）
console.log("Test 2: 無効なUISpec（version欠如）");
const invalidUISpec1 = {
  schemaRef: "test-schema-123",
  stage: "capture",
  mappings: {}
};

const result2 = validator.validate(invalidUISpec1);
console.log("Result:", result2);
if (result2.isValid) {
  console.error("❌ Test 2 Failed: Expected invalid UISpec");
  process.exit(1);
}
if (!result2.errors.some(e => e.includes("version"))) {
  console.error("❌ Test 2 Failed: Expected version error");
  console.error("Errors:", result2.errors);
  process.exit(1);
}
console.log("✅ Test 2 Passed\n");

// テスト3: 無効なmappings（category時のcategories欠如）
console.log("Test 3: 無効なmappings（category時のcategories欠如）");
const invalidUISpec2: Partial<UISpecDSL> = {
  version: "1.0",
  schemaRef: "test-schema-123",
  stage: "capture",
  mappings: {
    "CONCERN.category": {
      render: "category",
      editable: true
      // categories が欠如
    }
  }
};

const result3 = validator.validate(invalidUISpec2, testDataSchema);
console.log("Result:", result3);
if (result3.isValid) {
  console.error("❌ Test 3 Failed: Expected invalid UISpec");
  process.exit(1);
}
if (!result3.errors.some(e => e.includes("categories"))) {
  console.error("❌ Test 3 Failed: Expected categories error");
  console.error("Errors:", result3.errors);
  process.exit(1);
}
console.log("✅ Test 3 Passed\n");

// テスト4: DataSchemaとの整合性チェック
console.log("Test 4: DataSchemaとの整合性チェック（存在しないEntity）");
const invalidUISpec3: Partial<UISpecDSL> = {
  version: "1.0",
  schemaRef: "test-schema-123",
  stage: "capture",
  mappings: {
    "NONEXISTENT.field": {
      render: "shortText",
      editable: true
    }
  }
};

const result4 = validator.validate(invalidUISpec3, testDataSchema);
console.log("Result:", result4);
if (result4.isValid) {
  console.error("❌ Test 4 Failed: Expected invalid UISpec");
  process.exit(1);
}
if (!result4.errors.some(e => e.includes("NONEXISTENT"))) {
  console.error("❌ Test 4 Failed: Expected entity not found error");
  console.error("Errors:", result4.errors);
  process.exit(1);
}
console.log("✅ Test 4 Passed\n");

// テスト5: ARRY型の検証（summary時のsummary欠如）
console.log("Test 5: ARRY型の検証（summary時のsummary欠如）");
const invalidUISpec4: Partial<UISpecDSL> = {
  version: "1.0",
  schemaRef: "test-schema-123",
  stage: "capture",
  mappings: {
    "CONCERN.items": {
      render: "summary",
      editable: false,
      item: {
        render: "shortText"
      }
      // summary フィールドが欠如
    }
  }
};

const result5 = validator.validate(invalidUISpec4);
console.log("Result:", result5);
if (result5.isValid) {
  console.error("❌ Test 5 Failed: Expected invalid UISpec");
  process.exit(1);
}
if (!result5.errors.some(e => e.includes("summary") && e.includes("required"))) {
  console.error("❌ Test 5 Failed: Expected summary required error");
  console.error("Errors:", result5.errors);
  process.exit(1);
}
console.log("✅ Test 5 Passed\n");

// テスト6: PNTR型の検証（thumbnail欠如）
console.log("Test 6: PNTR型の検証（thumbnail欠如）");
const invalidUISpec5: Partial<UISpecDSL> = {
  version: "1.0",
  schemaRef: "test-schema-123",
  stage: "capture",
  mappings: {
    "ACTION.dependencies": {
      render: "link",
      editable: false
      // thumbnail が欠如
    }
  }
};

const result6 = validator.validate(invalidUISpec5);
console.log("Result:", result6);
if (result6.isValid) {
  console.error("❌ Test 6 Failed: Expected invalid UISpec");
  process.exit(1);
}
if (!result6.errors.some(e => e.includes("thumbnail"))) {
  console.error("❌ Test 6 Failed: Expected thumbnail error");
  console.error("Errors:", result6.errors);
  process.exit(1);
}
console.log("✅ Test 6 Passed\n");

console.log("✅✅✅ A8タスク成功: UISpecバリデーターが正常に動作しています");



