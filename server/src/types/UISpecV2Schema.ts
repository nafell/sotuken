/**
 * UISpec v2.0 Zod Validation Schema
 *
 * LLM生成結果のランタイムバリデーション
 */

import { z } from "zod";

// ============================================
// Basic Types
// ============================================

/** UIステージ */
const UIStageSchema = z.enum(["capture", "plan", "breakdown"]);

/** フィールドタイプ */
const FieldTypeSchema = z.enum([
  "text",
  "number",
  "select",
  "list",
  "slider",
  "toggle",
  "cards"
]);

/** アクションタイプ */
const ActionTypeSchema = z.enum([
  "submit",
  "save",
  "navigate",
  "reset",
  "compute",
  "validate",
  "cancel"
]);

/** アクション位置 */
const ActionPositionSchema = z.enum(["bottom", "top", "section", "inline"]);

/** アクションスタイル */
const ActionStyleSchema = z.enum(["primary", "secondary", "danger", "text"]);

// ============================================
// Supporting Types
// ============================================

/** 選択肢 */
const ChoiceSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
  disabled: z.boolean().optional()
});

/** アイテムテンプレートフィールド */
const ItemTemplateFieldSchema = z.object({
  type: z.enum(["text", "number", "toggle"]),
  label: z.string(),
  placeholder: z.string().optional()
});

/** アイテムテンプレート */
const ItemTemplateSchema = z.record(z.string(), ItemTemplateFieldSchema);

/** スライダーマーク */
const SliderMarkSchema = z.object({
  value: z.number(),
  label: z.string()
});

/** カードオプション */
const CardOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  disabled: z.boolean().optional()
});

/** バリデーションルール */
const FieldValidationSchema = z.object({
  pattern: z.string().optional(),
  custom: z.string().optional(),
  message: z.string().optional()
});

/** メタデータ */
const UIMetadataSchema = z.object({
  generatedAt: z.string(),
  generationId: z.string(),
  concernId: z.string().optional(),
  userId: z.string().optional()
}).passthrough(); // 追加フィールドを許可

// ============================================
// Field Options
// ============================================

/**
 * フィールドオプション
 * 各フィールドタイプに応じた検証を行う
 */
const FieldOptionsSchema = z.object({
  // 共通オプション
  required: z.boolean().optional(),
  readonly: z.boolean().optional(),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  visibleWhen: z.string().optional(),
  enabledWhen: z.string().optional(),
  computed: z.string().optional(),

  // text専用
  multiline: z.boolean().optional(),
  minLength: z.number().min(0).optional(),
  maxLength: z.number().min(1).optional(),
  inputType: z.enum(["text", "email", "url", "tel"]).optional(),

  // number専用
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  unit: z.string().optional(),

  // select専用
  choices: z.array(ChoiceSchema).optional(),
  multiple: z.boolean().optional(),
  display: z.enum(["dropdown", "radio", "buttons"]).optional(),

  // list専用
  itemTemplate: ItemTemplateSchema.optional(),
  minItems: z.number().min(0).optional(),
  maxItems: z.number().min(1).optional(),
  reorderable: z.boolean().optional(),
  addButton: z.string().optional(),

  // slider専用
  leftLabel: z.string().optional(),
  rightLabel: z.string().optional(),
  showValue: z.boolean().optional(),
  marks: z.array(SliderMarkSchema).optional(),

  // toggle専用
  onLabel: z.string().optional(),
  offLabel: z.string().optional(),

  // cards専用
  cards: z.array(CardOptionSchema).optional(),
  allowMultiple: z.boolean().optional(),
  columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional()
});

// ============================================
// Main Types
// ============================================

/** UIフィールド */
const UIFieldSchema = z.object({
  id: z.string().min(1, "フィールドIDは必須です"),
  label: z.string().min(1, "ラベルは必須です"),
  type: FieldTypeSchema,
  value: z.any().optional(),
  options: FieldOptionsSchema.optional(),
  validation: FieldValidationSchema.optional()
});

/** UIセクション */
const UISectionSchema = z.object({
  id: z.string().min(1, "セクションIDは必須です"),
  title: z.string().min(1, "セクションタイトルは必須です"),
  description: z.string().optional(),
  fields: z.array(UIFieldSchema).min(1, "セクションには最低1つのフィールドが必要です"),
  visible: z.boolean().optional()
});

/** UIアクション */
const UIActionSchema = z.object({
  id: z.string().min(1, "アクションIDは必須です"),
  type: ActionTypeSchema,
  label: z.string().min(1, "アクションラベルは必須です"),
  icon: z.string().optional(),
  target: z.string().optional(),
  condition: z.string().optional(),
  position: ActionPositionSchema.optional(),
  style: ActionStyleSchema.optional(),
  confirmation: z.string().optional()
});

/** UISpec v2.0 */
const UISpecV2Schema = z.object({
  version: z.literal("2.0"),
  stage: UIStageSchema,
  sections: z.array(UISectionSchema).min(1, "最低1つのセクションが必要です"),
  actions: z.array(UIActionSchema), // v2.1: actionsは空配列OK（メタUIはクライアント管理）
  metadata: UIMetadataSchema.optional()
});

// ============================================
// Validation Functions
// ============================================

/**
 * UISpecをバリデート
 */
export function validateUISpecV2(data: unknown): {
  success: boolean;
  data?: z.infer<typeof UISpecV2Schema>;
  errors?: z.ZodError;
} {
  try {
    const validated = UISpecV2Schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * 部分的なバリデーション（フィールドのみ）
 */
export function validateField(data: unknown): {
  success: boolean;
  data?: z.infer<typeof UIFieldSchema>;
  errors?: z.ZodError;
} {
  try {
    const validated = UIFieldSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * 部分的なバリデーション（セクションのみ）
 */
export function validateSection(data: unknown): {
  success: boolean;
  data?: z.infer<typeof UISectionSchema>;
  errors?: z.ZodError;
} {
  try {
    const validated = UISectionSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// ============================================
// Custom Refinements
// ============================================

/**
 * フィールドタイプ別の詳細バリデーション
 */
export const UIFieldWithRefinementsSchema = UIFieldSchema.refine(
  (field) => {
    // textフィールドの検証
    if (field.type === "text" && field.options) {
      const { minLength, maxLength } = field.options;
      if (minLength && maxLength && minLength > maxLength) {
        return false;
      }
    }

    // numberフィールドの検証
    if (field.type === "number" && field.options) {
      const { min, max } = field.options;
      if (min !== undefined && max !== undefined && min > max) {
        return false;
      }
    }

    // selectフィールドの検証
    if (field.type === "select" && field.options) {
      if (!field.options.choices || field.options.choices.length === 0) {
        return false;
      }
    }

    // cardsフィールドの検証
    if (field.type === "cards" && field.options) {
      if (!field.options.cards || field.options.cards.length === 0) {
        return false;
      }
    }

    return true;
  },
  {
    message: "フィールドオプションが不正です"
  }
);

/**
 * 完全なUISpec検証（詳細チェック付き）
 */
export const UISpecV2WithRefinementsSchema = UISpecV2Schema.refine(
  (spec) => {
    // 各セクションのフィールドIDの重複チェック
    const allFieldIds = new Set<string>();
    for (const section of spec.sections) {
      for (const field of section.fields) {
        if (allFieldIds.has(field.id)) {
          return false; // 重複ID発見
        }
        allFieldIds.add(field.id);
      }
    }

    // アクションIDの重複チェック（v2.1: 空配列の場合はスキップ）
    if (spec.actions && spec.actions.length > 0) {
      const actionIds = new Set<string>();
      for (const action of spec.actions) {
        if (actionIds.has(action.id)) {
          return false; // 重複ID発見
        }
        actionIds.add(action.id);
      }
    }

    return true;
  },
  {
    message: "IDの重複が検出されました"
  }
);

// ============================================
// Error Formatting
// ============================================

/**
 * Zodエラーを日本語メッセージに変換
 */
export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.errors.map(error => {
    const path = error.path.join(".");
    const message = translateErrorMessage(error.message);
    return `${path}: ${message}`;
  });
}

/**
 * エラーメッセージの日本語化
 */
function translateErrorMessage(message: string): string {
  const translations: Record<string, string> = {
    "Required": "必須項目です",
    "Invalid type": "型が不正です",
    "String must contain at least 1 character(s)": "1文字以上入力してください",
    "Invalid enum value": "無効な選択値です",
    "Array must contain at least 1 element(s)": "最低1つの要素が必要です"
  };

  for (const [key, value] of Object.entries(translations)) {
    if (message.includes(key)) {
      return value;
    }
  }

  return message;
}

// ============================================
// Export Schemas
// ============================================

export {
  UISpecV2Schema,
  UISectionSchema,
  UIFieldSchema,
  UIActionSchema,
  FieldOptionsSchema,
  FieldTypeSchema,
  ActionTypeSchema,
  UIStageSchema
};

// ============================================
// Type Exports
// ============================================

export type UISpecV2 = z.infer<typeof UISpecV2Schema>;
export type UISection = z.infer<typeof UISectionSchema>;
export type UIField = z.infer<typeof UIFieldSchema>;
export type UIAction = z.infer<typeof UIActionSchema>;
export type FieldOptions = z.infer<typeof FieldOptionsSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type UIStage = z.infer<typeof UIStageSchema>;