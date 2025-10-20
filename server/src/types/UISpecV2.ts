/**
 * UISpec DSL v2.0 Type Definitions
 *
 * シンプルで理解しやすい動的UI仕様
 * LLMが生成しやすいフラット構造を採用
 */

// ============================================
// Core Types
// ============================================

/**
 * UISpec v2.0のルート構造
 */
export interface UISpecV2 {
  /** DSLバージョン（固定値: "2.0"） */
  version: "2.0";

  /** 思考整理のステージ */
  stage: UIStage;

  /** UIセクションの配列 */
  sections: UISection[];

  /** アクションの配列 */
  actions: UIAction[];

  /** メタデータ（オプション） */
  metadata?: UIMetadata;
}

/**
 * UIステージ
 */
export type UIStage = "capture" | "plan" | "breakdown";

// ============================================
// Section Types
// ============================================

/**
 * UIセクション
 */
export interface UISection {
  /** セクションID */
  id: string;

  /** セクションタイトル（日本語） */
  title: string;

  /** セクション説明（オプション） */
  description?: string;

  /** フィールドの配列 */
  fields: UIField[];

  /** 表示/非表示 */
  visible?: boolean;
}

// ============================================
// Field Types
// ============================================

/**
 * UIフィールド
 */
export interface UIField {
  /** フィールドID */
  id: string;

  /** 表示ラベル（日本語） */
  label: string;

  /** フィールドタイプ */
  type: FieldType;

  /** 初期値 */
  value?: any;

  /** フィールドオプション */
  options?: FieldOptions;

  /** バリデーションルール */
  validation?: FieldValidation;
}

/**
 * フィールドタイプ（7種類に限定）
 */
export type FieldType =
  | "text"    // テキスト入力
  | "number"  // 数値入力
  | "select"  // 選択
  | "list"    // リスト
  | "slider"  // スライダー
  | "toggle"  // トグル
  | "cards";  // カード選択

/**
 * フィールドオプション
 */
export interface FieldOptions {
  // ============================================
  // 共通オプション
  // ============================================

  /** 必須フィールド */
  required?: boolean;

  /** 読み取り専用 */
  readonly?: boolean;

  /** プレースホルダー */
  placeholder?: string;

  /** ヘルプテキスト */
  helperText?: string;

  /** 表示条件式 */
  visibleWhen?: string;

  /** 有効化条件式 */
  enabledWhen?: string;

  /** 計算式（他フィールド参照） */
  computed?: string;

  // ============================================
  // text専用オプション
  // ============================================

  /** 複数行入力 */
  multiline?: boolean;

  /** 最小文字数 */
  minLength?: number;

  /** 最大文字数 */
  maxLength?: number;

  /** 入力タイプ */
  inputType?: "text" | "email" | "url" | "tel";

  // ============================================
  // number専用オプション
  // ============================================

  /** 最小値 */
  min?: number;

  /** 最大値 */
  max?: number;

  /** ステップ値 */
  step?: number;

  /** 単位（例: "分", "円"） */
  unit?: string;

  // ============================================
  // select専用オプション
  // ============================================

  /** 選択肢 */
  choices?: Choice[];

  /** 複数選択 */
  multiple?: boolean;

  /** 表示形式 */
  display?: "dropdown" | "radio" | "buttons";

  // ============================================
  // list専用オプション
  // ============================================

  /** アイテムテンプレート */
  itemTemplate?: ItemTemplate;

  /** 最小項目数 */
  minItems?: number;

  /** 最大項目数 */
  maxItems?: number;

  /** 並び替え可能 */
  reorderable?: boolean;

  /** 追加ボタンラベル */
  addButton?: string;

  // ============================================
  // slider専用オプション
  // ============================================

  /** 左端ラベル */
  leftLabel?: string;

  /** 右端ラベル */
  rightLabel?: string;

  /** 値を表示 */
  showValue?: boolean;

  /** 目盛り */
  marks?: SliderMark[];

  // ============================================
  // toggle専用オプション
  // ============================================

  /** ONラベル */
  onLabel?: string;

  /** OFFラベル */
  offLabel?: string;

  // ============================================
  // cards専用オプション
  // ============================================

  /** カードオプション */
  cards?: CardOption[];

  /** 複数選択可能 */
  allowMultiple?: boolean;

  /** カラム数（モバイル用） */
  columns?: 1 | 2 | 3;
}

// ============================================
// Action Types
// ============================================

/**
 * UIアクション
 */
export interface UIAction {
  /** アクションID */
  id: string;

  /** アクションタイプ */
  type: ActionType;

  /** ボタンラベル（日本語） */
  label: string;

  /** アイコン（絵文字） */
  icon?: string;

  /** ターゲット（画面遷移先など） */
  target?: string;

  /** 実行条件式 */
  condition?: string;

  /** 配置位置 */
  position?: ActionPosition;

  /** ボタンスタイル */
  style?: ActionStyle;

  /** 確認メッセージ */
  confirmation?: string;
}

/**
 * アクションタイプ
 */
export type ActionType =
  | "submit"     // データ送信
  | "save"       // 保存
  | "navigate"   // 画面遷移
  | "reset"      // リセット
  | "compute"    // 再計算
  | "validate"   // バリデーション
  | "cancel";    // キャンセル

/**
 * アクション配置位置
 */
export type ActionPosition = "bottom" | "top" | "section" | "inline";

/**
 * アクションスタイル
 */
export type ActionStyle = "primary" | "secondary" | "danger" | "text";

// ============================================
// Supporting Types
// ============================================

/**
 * 選択肢
 */
export interface Choice {
  /** 値 */
  value: string;

  /** 表示ラベル */
  label: string;

  /** 説明 */
  description?: string;

  /** 無効化 */
  disabled?: boolean;
}

/**
 * リストアイテムテンプレート
 */
export interface ItemTemplate {
  [key: string]: {
    /** フィールドタイプ */
    type: "text" | "number" | "toggle";

    /** ラベル */
    label: string;

    /** プレースホルダー */
    placeholder?: string;
  };
}

/**
 * スライダーマーク
 */
export interface SliderMark {
  /** 値 */
  value: number;

  /** ラベル */
  label: string;
}

/**
 * カードオプション
 */
export interface CardOption {
  /** カードID */
  id: string;

  /** タイトル */
  title: string;

  /** 説明 */
  description: string;

  /** アイコン（絵文字） */
  icon?: string;

  /** バッジ */
  badge?: string;

  /** 無効化 */
  disabled?: boolean;
}

/**
 * バリデーションルール
 */
export interface FieldValidation {
  /** 正規表現パターン */
  pattern?: string;

  /** カスタム検証式 */
  custom?: string;

  /** エラーメッセージ */
  message?: string;
}

/**
 * メタデータ
 */
export interface UIMetadata {
  /** 生成日時 */
  generatedAt: string;

  /** 生成ID */
  generationId: string;

  /** 関心事ID */
  concernId?: string;

  /** ユーザーID */
  userId?: string;

  /** その他の情報 */
  [key: string]: any;
}

// ============================================
// Utility Types
// ============================================

/**
 * フィールド値の型
 */
export type FieldValue = string | number | boolean | any[] | null;

/**
 * フォームデータ
 */
export interface FormData {
  [fieldId: string]: FieldValue;
}

/**
 * バリデーションエラー
 */
export interface ValidationError {
  /** フィールドID */
  fieldId: string;

  /** エラーメッセージ */
  message: string;

  /** エラータイプ */
  type: "required" | "pattern" | "custom" | "system";
}

/**
 * システムエラー
 */
export interface SystemError {
  /** エラーコード */
  code: string;

  /** エラーメッセージ */
  message: string;

  /** リカバリー方法 */
  recovery?: {
    /** アクション */
    action: "retry" | "fallback" | "cancel";

    /** フォールバックUI */
    fallbackUI?: UISpecV2;
  };
}

// ============================================
// Helper Functions (Type Guards)
// ============================================

/**
 * UISpecV2の型ガード
 */
export function isUISpecV2(value: any): value is UISpecV2 {
  return value &&
    value.version === "2.0" &&
    typeof value.stage === "string" &&
    Array.isArray(value.sections) &&
    Array.isArray(value.actions);
}

/**
 * フィールドタイプの型ガード
 */
export function isValidFieldType(type: string): type is FieldType {
  return ["text", "number", "select", "list", "slider", "toggle", "cards"].includes(type);
}

/**
 * アクションタイプの型ガード
 */
export function isValidActionType(type: string): type is ActionType {
  return ["submit", "save", "navigate", "reset", "compute", "validate", "cancel"].includes(type);
}

// ============================================
// Default Values
// ============================================

/**
 * デフォルトUISpec
 */
export const DEFAULT_UI_SPEC: UISpecV2 = {
  version: "2.0",
  stage: "capture",
  sections: [],
  actions: []
};

/**
 * デフォルトフィールドオプション
 */
export const DEFAULT_FIELD_OPTIONS: Partial<FieldOptions> = {
  required: false,
  readonly: false,
  showValue: false,
  multiple: false,
  reorderable: false,
  columns: 1
};