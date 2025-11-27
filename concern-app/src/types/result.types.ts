/**
 * result.types.ts
 * Widget結果の型定義
 *
 * Phase 4 - DSL v3
 * このファイルはWidget実行結果の構造化データ型を定義します。
 */

// ============================================================
// UserInteraction - ユーザー操作記録
// ============================================================

/**
 * UserInteraction - ユーザーのインタラクション記録
 */
export interface UserInteraction {
  timestamp: number;
  action: 'click' | 'input' | 'drag' | 'select' | 'adjust';
  target: string;
  value?: any;
  duration?: number;
}

// ============================================================
// StructuredData - 構造化データ
// ============================================================

export type StructuredDataType = 'selection' | 'ranking' | 'mapping' | 'text' | 'composite';

/**
 * Position - 2D座標
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * SelectionData - 選択データ
 */
export interface SelectionData {
  selected: string | string[];
  options: string[];
  metadata?: Record<string, any>;
}

/**
 * RankingItem - ランキングアイテム
 */
export interface RankingItem {
  id: string;
  label: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * RankingData - ランキングデータ
 */
export interface RankingData {
  items: RankingItem[];
}

/**
 * MappingItem - マッピングアイテム
 */
export interface MappingItem {
  id: string;
  label: string;
  position?: Position;
  category?: string;
  relations?: string[];
}

/**
 * MappingData - マッピングデータ
 */
export interface MappingData {
  items: MappingItem[];
}

/**
 * TextData - テキストデータ
 */
export interface TextData {
  content: string;
  structured?: Record<string, any>;
}

/**
 * StructuredData - 構造化データ（型によって内容が変わる）
 */
export interface StructuredData {
  type: StructuredDataType;
  selection?: SelectionData;
  ranking?: RankingData;
  mapping?: MappingData;
  text?: TextData;
  composite?: Record<string, any>;
}

// ============================================================
// WidgetResult - Widget実行結果
// ============================================================

/**
 * WidgetResult - Widgetの実行結果
 *
 * 各Widgetは操作完了時にこの型の結果を返す
 */
export interface WidgetResult {
  widgetId: string;
  component: string;
  timestamp: number;
  summary: string;          // 人間が読める要約
  data: StructuredData;     // 構造化データ
  interactions?: UserInteraction[];
  metadata?: Record<string, any>;
}
