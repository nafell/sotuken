/**
 * A2タスクのテスト: バリデーター基本構造テスト
 */

import { DataSchemaValidator } from "../src/types/DataSchemaDSL";
import type { DataSchemaDSL } from "../src/types/DataSchemaDSL";

// バリデーターのインスタンス化テスト
const validator = new DataSchemaValidator();
const result = validator.validate({} as DataSchemaDSL);

console.log("✅ Validator created successfully");
console.log("Validation result:", result);
console.log("isValid:", result.isValid);
console.log("errors:", result.errors);

if (result.isValid && result.errors.length === 0) {
  console.log("\n✅ A2タスク成功: バリデーター骨格が正常に動作しています");
} else {
  console.error("\n❌ A2タスク失敗: 予期しない動作");
  process.exit(1);
}


