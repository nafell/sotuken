/**
 * UISpecDSL v1.0 Type Definitions
 * 思考整理タスク特化型UI仕様記述言語
 * 
 * 参考: specs/dsl-design/UISpecDSL_v1.0.md
 */

import type { DataSchemaDSL } from "./DataSchemaDSL";

/**
 * UISpecDSLの最上位構造
 * DataSchemaDSLで定義されたデータ構造を画面上にどう表示するかを記述
 */
export interface UISpecDSL {
  /** DSLバージョン（固定: "1.0"） */
  version: "1.0";
  
  /** UI仕様生成日時（ISO 8601形式） */
  generatedAt: string;
  
  /** 生成ID（UUID） */
  generationId: string;
  
  /** 参照するDataSchemaDSLのgenerationId */
  schemaRef: string;
  
  /** 思考整理のステージ */
  stage: "capture" | "plan" | "breakdown";
  
  /** Entity/属性ごとのレンダリング指定 */
  mappings: {
    [entityPath: string]: RenderSpec;
  };
  
  /** ステージ別のレイアウト（planのみ自由度高） */
  layout?: LayoutSpec;
  
  /** 再生成ポリシー（planのみ） */
  regenerationPolicy?: RegenerationPolicy;
}

/**
 * レンダリング仕様
 * 各属性をどのようにUIとしてレンダリングするか
 */
export type RenderSpec = 
  | SVALRenderSpec 
  | ARRYRenderSpec 
  | PNTRRenderSpec 
  | CUSTOMRenderSpec;

/**
 * 基本型（SVAL）のレンダリング仕様
 */
export interface SVALRenderSpec {
  /** レンダリングタイプ */
  render: "paragraph" | "shortText" | "number" | "radio" | "category" | "hidden";
  
  /** 編集可能かどうか */
  editable: boolean;
  
  /** 入力欄のプレースホルダー */
  placeholder?: string;
  
  /** category時のみ必須 */
  categories?: string[];
  
  /** 表示順序 */
  displayOrder?: number;
  
  /** グルーピング */
  group?: string;
}

/**
 * 配列型（ARRY）のレンダリング仕様
 */
export interface ARRYRenderSpec {
  /** レンダリングタイプ */
  render: "expanded" | "summary";
  
  /** 編集可能かどうか */
  editable: boolean;
  
  /** ドラッグ&ドロップで並び替え可能か */
  reorderable?: boolean;
  
  /** アイテムのレンダリング */
  item: {
    /** アイテムのレンダリングタイプ */
    render: string;
    
    /** Entity参照時の表示属性 */
    thumbnail?: string[];
  };
  
  /** summary時のみ */
  summary?: {
    /** 要約の名称 */
    name: string;
    
    /** 集計操作 */
    derived: {
      operation: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";
      field?: string;
    };
  };
  
  /** 表示順序 */
  displayOrder?: number;
}

/**
 * ポインタ型（PNTR）のレンダリング仕様
 */
export interface PNTRRenderSpec {
  /** レンダリングタイプ */
  render: "link" | "inline" | "card";
  
  /** 編集可能かどうか */
  editable: boolean;
  
  /** 参照先の表示属性 */
  thumbnail: string[];
  
  /** 表示順序 */
  displayOrder?: number;
}

/**
 * カスタムウィジェット（CUSTOM）のレンダリング仕様
 */
export interface CUSTOMRenderSpec {
  /** レンダリングタイプ */
  render: "custom";
  
  /** ウィジェット名 */
  component: "tradeoff_slider" | "counterfactual_toggles" | "strategy_preview_picker" | string;
  
  /** ウィジェットへの追加パラメータ */
  props?: Record<string, any>;
  
  /** 表示順序 */
  displayOrder?: number;
}

/**
 * レイアウト仕様
 */
export interface LayoutSpec {
  /** レイアウトタイプ */
  type: "singleColumn" | "twoColumn" | "grid";
  
  /** セクション定義 */
  sections?: LayoutSection[];
}

/**
 * レイアウトセクション
 */
export interface LayoutSection {
  /** セクションID */
  id: string;
  
  /** セクションタイトル */
  title?: string;
  
  /** このセクションに含まれるウィジェット（entityPath） */
  widgets: string[];
  
  /** grid時のカラム幅 */
  span?: number;
}

/**
 * 再生成ポリシー（planステージのみ）
 */
export interface RegenerationPolicy {
  /** 連続操作時の遅延（ミリ秒） */
  debounceMs: number;
  
  /** 再生成トリガー */
  triggers: RegenerationTrigger[];
}

/**
 * 再生成トリガー
 */
export interface RegenerationTrigger {
  /** トリガー元の属性パス */
  source: string;
  
  /** トリガーとなるアクション */
  action: "change" | "toggle" | "slide";
  
  /** 再生成対象の属性パス */
  regenerateTarget: string[];
}

/**
 * UISpecバリデーション結果
 */
export interface UISpecValidationResult {
  /** バリデーションが成功したかどうか */
  isValid: boolean;
  
  /** エラーメッセージの配列 */
  errors: string[];
}

/**
 * UISpecバリデータークラス
 * UISpecDSLの妥当性を検証
 */
export class UISpecValidator {
  /**
   * UISpecDSLを検証する
   * @param uiSpec 検証対象のUISpec
   * @param dataSchema 参照するDataSchema（整合性チェック用）
   * @returns バリデーション結果
   */
  validate(uiSpec: Partial<UISpecDSL>, dataSchema?: DataSchemaDSL): UISpecValidationResult {
    const errors: string[] = [];

    // 必須フィールドの存在チェック
    if (!uiSpec.version) {
      errors.push("Missing required field: version");
    } else if (uiSpec.version !== "1.0") {
      errors.push("Invalid version: must be '1.0'");
    }

    if (!uiSpec.schemaRef) {
      errors.push("Missing required field: schemaRef");
    }

    if (!uiSpec.stage) {
      errors.push("Missing required field: stage");
    } else if (!["capture", "plan", "breakdown"].includes(uiSpec.stage)) {
      errors.push(`Invalid stage: must be one of 'capture', 'plan', 'breakdown'`);
    }

    if (!uiSpec.mappings) {
      errors.push("Missing required field: mappings");
    } else {
      // mappingsの検証
      this.validateMappings(uiSpec.mappings, errors, dataSchema);
    }

    // DataSchemaとの整合性チェック
    if (dataSchema && uiSpec.schemaRef && uiSpec.schemaRef !== dataSchema.generationId) {
      errors.push(`schemaRef mismatch: ${uiSpec.schemaRef} !== ${dataSchema.generationId}`);
    }

    // layout.sections の検証
    if (uiSpec.layout?.sections) {
      this.validateLayoutSections(uiSpec.layout.sections, errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * mappingsの検証
   */
  private validateMappings(
    mappings: { [entityPath: string]: RenderSpec },
    errors: string[],
    dataSchema?: DataSchemaDSL
  ): void {
    for (const [entityPath, renderSpec] of Object.entries(mappings)) {
      // entityPathの形式チェック（"ENTITY.attribute"）
      if (!entityPath.includes(".")) {
        errors.push(`Invalid entityPath format: ${entityPath} (must be 'ENTITY.attribute')`);
        continue;
      }

      // DataSchemaとの整合性チェック
      if (dataSchema) {
        const [entityName] = entityPath.split(".");
        if (!dataSchema.entities[entityName as keyof typeof dataSchema.entities]) {
          errors.push(`Entity not found in DataSchema: ${entityName}`);
        }
      }

      // RenderSpecの検証
      this.validateRenderSpec(entityPath, renderSpec, errors);
    }
  }

  /**
   * RenderSpecの検証
   */
  private validateRenderSpec(
    entityPath: string,
    renderSpec: RenderSpec,
    errors: string[]
  ): void {
    if (!renderSpec.render) {
      errors.push(`${entityPath}: Missing 'render' field`);
      return;
    }

    const render = renderSpec.render;

    // SVALの検証
    if (["paragraph", "shortText", "number", "radio", "category", "hidden"].includes(render)) {
      const svalSpec = renderSpec as SVALRenderSpec;
      
      if (svalSpec.editable === undefined) {
        errors.push(`${entityPath}: Missing 'editable' field for SVAL render`);
      }

      if (render === "category" && !svalSpec.categories) {
        errors.push(`${entityPath}: 'categories' is required for category render`);
      }
    }

    // ARRYの検証
    else if (["expanded", "summary"].includes(render)) {
      const arrySpec = renderSpec as ARRYRenderSpec;
      
      if (arrySpec.editable === undefined) {
        errors.push(`${entityPath}: Missing 'editable' field for ARRY render`);
      }

      if (!arrySpec.item) {
        errors.push(`${entityPath}: Missing 'item' field for ARRY render`);
      } else if (!arrySpec.item.render) {
        errors.push(`${entityPath}: Missing 'item.render' field`);
      }

      if (render === "summary" && !arrySpec.summary) {
        errors.push(`${entityPath}: 'summary' is required for summary render`);
      } else if (render === "summary" && arrySpec.summary && !arrySpec.summary.derived) {
        errors.push(`${entityPath}: 'summary.derived' is required`);
      }
    }

    // PNTRの検証
    else if (["link", "inline", "card"].includes(render)) {
      const pntrSpec = renderSpec as PNTRRenderSpec;
      
      if (pntrSpec.editable === undefined) {
        errors.push(`${entityPath}: Missing 'editable' field for PNTR render`);
      }

      if (!pntrSpec.thumbnail || pntrSpec.thumbnail.length === 0) {
        errors.push(`${entityPath}: 'thumbnail' is required for PNTR render`);
      }
    }

    // CUSTOMの検証
    else if (render === "custom") {
      const customSpec = renderSpec as CUSTOMRenderSpec;
      
      if (!customSpec.component) {
        errors.push(`${entityPath}: Missing 'component' field for custom render`);
      } else {
        // サポートされているカスタムコンポーネントのチェック
        const supportedComponents = [
          "tradeoff_slider",
          "counterfactual_toggles",
          "strategy_preview_picker"
        ];
        
        // 完全一致でなくても警告のみ（将来の拡張を許容）
        // エラーにはしない
      }
    }

    // 未知のrenderタイプ
    else {
      errors.push(`${entityPath}: Unknown render type: ${render}`);
    }
  }

  /**
   * layout.sectionsの検証
   */
  private validateLayoutSections(
    sections: any[],
    errors: string[]
  ): void {
    if (!Array.isArray(sections)) {
      errors.push("layout.sections must be an array");
      return;
    }

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionId = section.id || `index-${i}`;

      // id の検証
      if (!section.id) {
        errors.push(`LayoutSection at index ${i}: Missing required field 'id'`);
      }

      // widgets の検証
      if (!section.widgets) {
        errors.push(`LayoutSection ${sectionId}: 'widgets' is required`);
      } else if (!Array.isArray(section.widgets)) {
        errors.push(`LayoutSection ${sectionId}: 'widgets' must be an array`);
      } else if (section.widgets.length === 0) {
        // 空配列は警告のみ（エラーにはしない）
        console.warn(`⚠️ LayoutSection ${sectionId}: 'widgets' array is empty`);
      }

      // span の検証（オプショナル）
      if (section.span !== undefined) {
        if (typeof section.span !== 'number') {
          errors.push(`LayoutSection ${sectionId}: 'span' must be a number`);
        } else if (section.span < 1 || section.span > 12) {
          errors.push(`LayoutSection ${sectionId}: 'span' must be between 1 and 12`);
        }
      }
    }
  }
}

