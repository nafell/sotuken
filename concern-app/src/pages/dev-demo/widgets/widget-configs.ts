/**
 * widget-configs.ts
 * Widget Showcase用の設定ファイル
 *
 * 全12種Widgetのテスト設定を定義
 * 各Widgetに対して複数のconfig variationを提供
 */

import type { WidgetComponentType, StageType } from '../../../types/ui-spec.types';

/**
 * Widget Variation設定
 */
export interface WidgetVariation {
  id: string;
  label: string;
  config: Record<string, any>;
}

/**
 * Widget Showcase設定
 */
export interface WidgetShowcaseConfig {
  widgetType: WidgetComponentType;
  name: string;
  description: string;
  stage: StageType;
  variations: WidgetVariation[];
}

/**
 * 全12種Widgetの設定
 */
export const WIDGET_SHOWCASE_CONFIGS: Record<WidgetComponentType, WidgetShowcaseConfig> = {
  // === DIVERGE STAGE (3 widgets) ===
  emotion_palette: {
    widgetType: 'emotion_palette',
    name: 'Emotion Palette',
    description: '8種類の感情から選択し、強度を調整するWidget',
    stage: 'diverge',
    variations: [
      {
        id: 'default',
        label: 'Default',
        config: { prompt: '今の気持ちを選んでください' },
      },
      {
        id: 'custom_prompt',
        label: 'Custom Prompt',
        config: { prompt: 'この課題についてどう感じていますか？' },
      },
    ],
  },

  brainstorm_cards: {
    widgetType: 'brainstorm_cards',
    name: 'Brainstorm Cards',
    description: '自由にアイデアを出すブレインストーミングWidget',
    stage: 'diverge',
    variations: [
      {
        id: 'default',
        label: 'Default (max 10)',
        config: { prompt: 'アイデアを書き出してください', maxCards: 10, minCards: 1 },
      },
      {
        id: 'limited',
        label: 'Limited (max 5)',
        config: { prompt: '最も重要な5つのアイデア', maxCards: 5, minCards: 3 },
      },
    ],
  },

  question_card_chain: {
    widgetType: 'question_card_chain',
    name: 'Question Card Chain',
    description: '質問に順番に答えて思考を深めるWidget',
    stage: 'diverge',
    variations: [
      {
        id: 'default',
        label: 'Default (3 questions)',
        config: {
          questions: [
            { type: 'open', text: 'なぜそう思いますか？' },
            { type: 'why', text: '具体的にはどういうことですか？' },
            { type: 'what_if', text: '他に考えられることはありますか？' },
          ],
        },
      },
      {
        id: 'deep_dive',
        label: 'Deep Dive (5 questions)',
        config: {
          questions: [
            { type: 'open', text: '何が問題だと感じていますか？' },
            { type: 'why', text: 'それはなぜですか？' },
            { type: 'why', text: 'さらに深く考えると？' },
            { type: 'what_if', text: 'もし○○だったら？' },
            { type: 'open', text: '結論として何が言えますか？' },
          ],
        },
      },
    ],
  },

  // === ORGANIZE STAGE (4 widgets) ===
  card_sorting: {
    widgetType: 'card_sorting',
    name: 'Card Sorting',
    description: 'カードをカテゴリに分類するWidget',
    stage: 'organize',
    variations: [
      {
        id: 'default',
        label: 'Default (3 categories)',
        config: {
          categories: [
            { id: 'cat_1', name: '重要', color: '#ef4444' },
            { id: 'cat_2', name: '普通', color: '#f59e0b' },
            { id: 'cat_3', name: '後回し', color: '#6b7280' },
          ],
          cards: [
            { id: 'card_1', text: 'タスクA' },
            { id: 'card_2', text: 'タスクB' },
            { id: 'card_3', text: 'タスクC' },
          ],
        },
      },
      {
        id: 'priority',
        label: 'Priority (4 categories)',
        config: {
          categories: [
            { id: 'cat_1', name: '緊急・重要', color: '#ef4444' },
            { id: 'cat_2', name: '重要・非緊急', color: '#3b82f6' },
            { id: 'cat_3', name: '緊急・非重要', color: '#f59e0b' },
            { id: 'cat_4', name: '非緊急・非重要', color: '#6b7280' },
          ],
          cards: [
            { id: 'card_1', text: '締め切り対応' },
            { id: 'card_2', text: '長期計画' },
            { id: 'card_3', text: '雑務' },
          ],
        },
      },
    ],
  },

  dependency_mapping: {
    widgetType: 'dependency_mapping',
    name: 'Dependency Mapping',
    description: '項目間の依存関係をマッピングするWidget',
    stage: 'organize',
    variations: [
      {
        id: 'default',
        label: 'Default',
        config: {
          nodes: [
            { id: 'node_1', label: '企画', x: 100, y: 100 },
            { id: 'node_2', label: '設計', x: 250, y: 100 },
            { id: 'node_3', label: '実装', x: 400, y: 100 },
            { id: 'node_4', label: 'テスト', x: 550, y: 100 },
          ],
        },
      },
    ],
  },

  swot_analysis: {
    widgetType: 'swot_analysis',
    name: 'SWOT Analysis',
    description: 'SWOT分析を行うWidget',
    stage: 'organize',
    variations: [
      {
        id: 'default',
        label: 'Default (empty)',
        config: {},
      },
      {
        id: 'with_examples',
        label: 'With Examples',
        config: {
          initialItems: {
            strengths: ['技術力が高い'],
            weaknesses: ['人手不足'],
            opportunities: ['市場拡大'],
            threats: ['競合参入'],
          },
        },
      },
    ],
  },

  mind_map: {
    widgetType: 'mind_map',
    name: 'Mind Map',
    description: 'マインドマップで思考を整理するWidget',
    stage: 'organize',
    variations: [
      {
        id: 'default',
        label: 'Default',
        config: {
          centerTopic: '中心テーマ',
        },
      },
      {
        id: 'with_nodes',
        label: 'With Initial Nodes',
        config: {
          centerTopic: 'プロジェクト計画',
          nodes: [
            { text: '目標設定', parentId: null },
            { text: 'リソース', parentId: null },
            { text: 'スケジュール', parentId: null },
          ],
        },
      },
    ],
  },

  // === CONVERGE STAGE (4 widgets) ===
  matrix_placement: {
    widgetType: 'matrix_placement',
    name: 'Matrix Placement',
    description: '2軸マトリックスでアイテムを配置するWidget',
    stage: 'converge',
    variations: [
      {
        id: 'default',
        label: 'Importance x Urgency',
        config: {
          xAxisLabel: '重要度',
          yAxisLabel: '緊急度',
          xAxisLow: '低',
          xAxisHigh: '高',
          yAxisLow: '低',
          yAxisHigh: '高',
        },
      },
      {
        id: 'effort_impact',
        label: 'Effort x Impact',
        config: {
          xAxisLabel: '労力',
          yAxisLabel: 'インパクト',
          xAxisLow: '小',
          xAxisHigh: '大',
          yAxisLow: '小',
          yAxisHigh: '大',
        },
      },
    ],
  },

  priority_slider_grid: {
    widgetType: 'priority_slider_grid',
    name: 'Priority Slider Grid',
    description: '複数項目の優先度をスライダーで設定するWidget',
    stage: 'converge',
    variations: [
      {
        id: 'default',
        label: 'Default',
        config: {
          items: [
            { id: 'item_1', label: '品質' },
            { id: 'item_2', label: 'コスト' },
            { id: 'item_3', label: 'スピード' },
          ],
        },
      },
      {
        id: 'project_factors',
        label: 'Project Factors',
        config: {
          items: [
            { id: 'item_1', label: '技術的難易度' },
            { id: 'item_2', label: 'ビジネス価値' },
            { id: 'item_3', label: 'リスク' },
            { id: 'item_4', label: '工数' },
          ],
        },
      },
    ],
  },

  tradeoff_balance: {
    widgetType: 'tradeoff_balance',
    name: 'Tradeoff Balance',
    description: 'トレードオフのバランスを視覚的に調整するWidget',
    stage: 'converge',
    variations: [
      {
        id: 'default',
        label: 'Default',
        config: {
          leftOption: { label: '選択肢A', description: 'コスト重視' },
          rightOption: { label: '選択肢B', description: '品質重視' },
        },
      },
      {
        id: 'career',
        label: 'Career Choice',
        config: {
          leftOption: { label: '現職継続', description: '安定・経験蓄積' },
          rightOption: { label: '転職', description: '挑戦・成長機会' },
        },
      },
    ],
  },

  timeline_slider: {
    widgetType: 'timeline_slider',
    name: 'Timeline Slider',
    description: '時間軸上にアイテムを配置するWidget',
    stage: 'converge',
    variations: [
      {
        id: 'default',
        label: 'Default (weeks)',
        config: {
          timeUnit: 'weeks',
        },
      },
      {
        id: 'months',
        label: 'Months',
        config: {
          timeUnit: 'months',
          events: [
            { text: 'キックオフ', position: 0, priority: 'high' },
            { text: '中間レビュー', position: 50, priority: 'medium' },
            { text: '完了', position: 100, priority: 'high' },
          ],
        },
      },
    ],
  },

  // === SUMMARY STAGE (1 widget) ===
  structured_summary: {
    widgetType: 'structured_summary',
    name: 'Structured Summary',
    description: '構造化された文章まとめを生成・編集するWidget',
    stage: 'summary',
    variations: [
      {
        id: 'default',
        label: 'Default',
        config: {
          title: '思考整理のまとめ',
        },
      },
      {
        id: 'with_conclusion',
        label: 'With Conclusion',
        config: {
          title: '検討結果のまとめ',
          conclusion: 'ここに結論を記入してください',
        },
      },
    ],
  },
};

/**
 * 全Widget種別の配列
 */
export const WIDGET_TYPES = Object.keys(WIDGET_SHOWCASE_CONFIGS) as WidgetComponentType[];

/**
 * ステージ別Widget取得
 */
export const getWidgetsByStage = (stage: StageType): WidgetComponentType[] =>
  WIDGET_TYPES.filter((type) => WIDGET_SHOWCASE_CONFIGS[type].stage === stage);

/**
 * ステージ定義
 */
export const STAGES: StageType[] = ['diverge', 'organize', 'converge', 'summary'];

/**
 * ステージ表示名
 */
export const STAGE_LABELS: Record<StageType, string> = {
  diverge: '発散',
  organize: '整理',
  converge: '収束',
  summary: 'まとめ',
};
