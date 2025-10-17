/**
 * DataSchemaDSL v1.0 Type Definitions
 * 思考整理タスク特化型データモデル記述言語
 * 
 * 参考: specs/dsl-design/DataSchemaDSL_v1.0.md
 */

/**
 * DataSchemaDSLの最上位構造
 * ユーザーの関心事に応じた思考整理のデータ構造を定義
 */
export interface DataSchemaDSL {
  /** DSLバージョン（固定: "1.0"） */
  version: "1.0";
  
  /** スキーマ生成日時（ISO 8601形式） */
  generatedAt: string;
  
  /** 生成ID（UUID） */
  generationId: string;
  
  /** ルートエンティティ名（固定: "CONCERN"） */
  task: "CONCERN";
  
  /** 思考整理のステージ */
  stage: "capture" | "plan" | "breakdown";
  
  /** エンティティ定義の集合 */
  entities: {
    /** ルートエンティティ（必須） */
    CONCERN: EntityDefinition;
    
    /** 問診エンティティ（captureステージで使用） */
    QUESTION?: EntityDefinition;
    
    /** 戦略エンティティ（planステージで使用） */
    STRATEGY?: EntityDefinition;
    
    /** アクションエンティティ（breakdownステージで使用） */
    ACTION?: EntityDefinition;
  };
  
  /** Entity/属性間の制約・自動更新ルール */
  dependencies: Dependency[];
}

/**
 * エンティティ定義
 * 各エンティティが持つ属性の集合
 */
export interface EntityDefinition {
  /** 属性名をキーとした属性仕様のマッピング */
  [attributeName: string]: AttributeSpec;
}

/**
 * 属性仕様
 * 各属性の型と機能を定義
 */
export interface AttributeSpec {
  /** 属性の型 */
  type: "string" | "number" | "array" | string;  // stringの場合、"__ENTITY_NAME__"の形式でPNTR
  
  /** 属性の機能（役割） */
  function?: "privateIdentifier" | "publicIdentifier" | "display";
  
  /** 配列型の場合のアイテム仕様 */
  item?: {
    /** アイテムの型 */
    type: "string" | "number" | string;  // stringの場合、"__ENTITY_NAME__"の形式
    
    /** Entity参照時のサムネイル表示属性 */
    thumbnail?: string[];
  };
  
  /** DICT型の場合のキー一覧（限定使用） */
  keys?: string[];
  
  /** DICT型の場合の値の型 */
  valueType?: "string" | "number";
}

/**
 * 依存関係定義
 * Entity/属性間の制約・自動更新を表現
 */
export interface Dependency {
  /** 依存元の属性パス（"ENTITY.attribute"形式） */
  source: string;
  
  /** 依存先の属性パス（"ENTITY.attribute"形式） */
  target: string;
  
  /** 依存関係のメカニズム */
  mechanism: "Update" | "Validate";
  
  /** 依存関係の内容（自然言語またはコードスニペット） */
  relationship: string;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  /** バリデーションが成功したかどうか */
  isValid: boolean;
  
  /** エラーメッセージの配列（isValid=falseの場合） */
  errors: string[];
}

/**
 * DataSchemaバリデータークラス
 * DataSchemaDSLの妥当性を検証
 */
export class DataSchemaValidator {
  /**
   * DataSchemaDSLを検証する
   * @param schema 検証対象のDataSchemaDSL
   * @returns バリデーション結果
   */
  validate(schema: Partial<DataSchemaDSL>): ValidationResult {
    const errors: string[] = [];

    // 必須フィールドの存在チェック
    if (!schema.version) {
      errors.push("Missing required field: version");
    } else if (schema.version !== "1.0") {
      errors.push("Invalid version: must be '1.0'");
    }

    if (!schema.task) {
      errors.push("Missing required field: task");
    } else if (schema.task !== "CONCERN") {
      errors.push("Invalid task: must be 'CONCERN'");
    }

    if (!schema.stage) {
      errors.push("Missing required field: stage");
    } else if (!["capture", "plan", "breakdown"].includes(schema.stage)) {
      errors.push(`Invalid stage: must be one of 'capture', 'plan', 'breakdown'`);
    }

    if (!schema.entities) {
      errors.push("Missing required field: entities");
    } else {
      // CONCERN entity存在チェック
      if (!schema.entities.CONCERN) {
        errors.push("Missing required entity: CONCERN");
      } else {
        // CONCERN必須属性チェック
        this.validateConcernEntity(schema.entities.CONCERN, errors);
      }

      // ステージ別のentityチェック
      if (schema.stage === "capture" && schema.entities.QUESTION) {
        this.validateQuestionEntity(schema.entities.QUESTION, errors);
      }
      if (schema.stage === "plan" && schema.entities.STRATEGY) {
        this.validateStrategyEntity(schema.entities.STRATEGY, errors);
      }
      if (schema.stage === "breakdown" && schema.entities.ACTION) {
        this.validateActionEntity(schema.entities.ACTION, errors);
      }
    }

    if (!schema.dependencies) {
      errors.push("Missing required field: dependencies");
    } else if (!Array.isArray(schema.dependencies)) {
      errors.push("Invalid dependencies: must be an array");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * CONCERNエンティティの検証
   */
  private validateConcernEntity(concern: EntityDefinition, errors: string[]): void {
    const requiredAttrs = ["id", "concernText", "category", "urgency"];
    
    for (const attr of requiredAttrs) {
      if (!concern[attr]) {
        errors.push(`CONCERN entity missing required attribute: ${attr}`);
      } else if (!concern[attr].type) {
        errors.push(`CONCERN.${attr} missing type specification`);
      }
    }

    // 各属性の型チェック
    if (concern.id && concern.id.type !== "string") {
      errors.push("CONCERN.id must be of type 'string'");
    }
    if (concern.concernText && concern.concernText.type !== "string") {
      errors.push("CONCERN.concernText must be of type 'string'");
    }
    if (concern.category && concern.category.type !== "string") {
      errors.push("CONCERN.category must be of type 'string'");
    }
    if (concern.urgency && concern.urgency.type !== "number") {
      errors.push("CONCERN.urgency must be of type 'number'");
    }
  }

  /**
   * QUESTIONエンティティの検証（captureステージ）
   */
  private validateQuestionEntity(question: EntityDefinition, errors: string[]): void {
    const requiredAttrs = ["id", "text", "answerType"];
    
    for (const attr of requiredAttrs) {
      if (!question[attr]) {
        errors.push(`QUESTION entity missing required attribute: ${attr}`);
      }
    }
  }

  /**
   * STRATEGYエンティティの検証（planステージ）
   */
  private validateStrategyEntity(strategy: EntityDefinition, errors: string[]): void {
    const requiredAttrs = ["id", "approach"];
    
    for (const attr of requiredAttrs) {
      if (!strategy[attr]) {
        errors.push(`STRATEGY entity missing required attribute: ${attr}`);
      }
    }
  }

  /**
   * ACTIONエンティティの検証（breakdownステージ）
   */
  private validateActionEntity(action: EntityDefinition, errors: string[]): void {
    const requiredAttrs = ["id", "title", "duration"];
    
    for (const attr of requiredAttrs) {
      if (!action[attr]) {
        errors.push(`ACTION entity missing required attribute: ${attr}`);
      }
    }
  }
}

