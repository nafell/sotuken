/**
 * widgets.ts - Reactive Widget定義
 *
 * 各Widgetのメタデータとポート定義。
 * LLMプロンプト生成とDependencyGraph検証に使用。
 *
 * @module widgets
 * @since Phase 4 Task 2.2
 */

import type {
  WidgetDefinition,
  WidgetDefinitionRegistry,
} from '../types/WidgetDefinition';

// =============================================================================
// TradeoffBalance定義
// =============================================================================

/**
 * トレードオフ天秤 Widget定義
 *
 * 2つの選択肢の重み付けを視覚化し、バランスを表示する。
 */
export const TradeoffBalanceDefinition: WidgetDefinition = {
  id: 'tradeoff_balance',
  name: 'トレードオフ天秤',
  description:
    '複数の選択肢を重み付けし、バランスを視覚的に表示。天秤のメタファーで直感的に比較可能。',
  stage: 'converge',
  ports: {
    inputs: [
      {
        id: 'items',
        direction: 'in',
        dataType: 'object[]',
        description:
          '比較対象の項目リスト。各項目は {text: string, side: "left" | "right", weight?: number} の形式。',
        required: false,
      },
      {
        id: 'weights',
        direction: 'in',
        dataType: 'number[]',
        description: '各項目の重み値配列（0-100）',
        constraints: [
          { type: 'array', minLength: 0 },
          { type: 'range', min: 0, max: 100 },
        ],
        required: false,
      },
    ],
    outputs: [
      {
        id: 'balance',
        direction: 'out',
        dataType: 'number',
        description: 'バランススコア（-100〜100、負=左優勢、正=右優勢）',
        constraints: [{ type: 'range', min: -100, max: 100 }],
      },
      {
        id: 'direction',
        direction: 'out',
        dataType: 'string',
        description: '天秤の傾き方向',
        constraints: [{ type: 'enum', values: ['left', 'right', 'balanced'] }],
      },
      {
        id: 'tiltAngle',
        direction: 'out',
        dataType: 'number',
        description: '天秤の傾き角度（-15〜15度）',
        constraints: [{ type: 'range', min: -15, max: 15 }],
      },
      {
        id: 'recommendation',
        direction: 'out',
        dataType: 'string',
        description: '判断の推奨テキスト',
      },
    ],
  },
  metadata: {
    timing: 0.6,
    versatility: 0.7,
    bottleneck: ['comparison', 'decision', 'tradeoff'],
  },
};

// =============================================================================
// DependencyMapping定義
// =============================================================================

/**
 * 依存関係マッピング Widget定義
 *
 * ノード間の依存関係を可視化・編集する。
 */
export const DependencyMappingDefinition: WidgetDefinition = {
  id: 'dependency_mapping',
  name: '依存関係マップ',
  description:
    'タスクや要素間の依存関係をノードとエッジで可視化。クリティカルパスや循環依存を自動検出。',
  stage: 'organize',
  ports: {
    inputs: [
      {
        id: 'nodes',
        direction: 'in',
        dataType: 'object[]',
        description:
          'ノードリスト。各ノードは {id: string, label: string, x?: number, y?: number} の形式。',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'edges',
        direction: 'out',
        dataType: 'object[]',
        description:
          '接続エッジリスト。各エッジは {sourceId: string, targetId: string, type: string} の形式。',
      },
      {
        id: 'criticalPath',
        direction: 'out',
        dataType: 'string[]',
        description: 'クリティカルパス（最長依存チェーン）のノードID配列',
      },
      {
        id: 'hasLoop',
        direction: 'out',
        dataType: 'boolean',
        description: '循環依存が存在するかどうか',
      },
      {
        id: 'cyclePath',
        direction: 'out',
        dataType: 'string[]',
        description: '循環依存が検出された場合のパス（存在しない場合は空配列）',
      },
      {
        id: 'statistics',
        direction: 'out',
        dataType: 'object',
        description: '統計情報 {nodeCount: number, edgeCount: number, avgDegree: number}',
      },
    ],
  },
  metadata: {
    timing: 0.4,
    versatility: 0.8,
    bottleneck: ['dependency', 'sequence', 'blocking', 'ordering'],
  },
};

// =============================================================================
// SwotAnalysis定義
// =============================================================================

/**
 * SWOT分析 Widget定義
 *
 * 4象限（強み・弱み・機会・脅威）に項目を配置する。
 */
export const SwotAnalysisDefinition: WidgetDefinition = {
  id: 'swot_analysis',
  name: 'SWOT分析',
  description:
    '強み(Strengths)・弱み(Weaknesses)・機会(Opportunities)・脅威(Threats)の4象限で状況を整理。',
  stage: 'organize',
  ports: {
    inputs: [
      {
        id: 'items',
        direction: 'in',
        dataType: 'object[]',
        description:
          'SWOTアイテムリスト。各アイテムは {text: string, quadrant: "strengths"|"weaknesses"|"opportunities"|"threats", importance?: "high"|"medium"|"low"} の形式。',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'placement',
        direction: 'out',
        dataType: 'object',
        description:
          '象限ごとのアイテム配置 {strengths: Item[], weaknesses: Item[], opportunities: Item[], threats: Item[]}',
      },
      {
        id: 'gaps',
        direction: 'out',
        dataType: 'string[]',
        description: '不足している分析観点のリスト（例: 「機会」の項目が少ない）',
      },
      {
        id: 'counts',
        direction: 'out',
        dataType: 'object',
        description:
          '各象限のアイテム数 {strengths: number, weaknesses: number, opportunities: number, threats: number}',
      },
      {
        id: 'isComplete',
        direction: 'out',
        dataType: 'boolean',
        description: '全象限に最低1つ以上のアイテムがあるかどうか',
      },
      {
        id: 'analysis',
        direction: 'out',
        dataType: 'object',
        description:
          '分析結果 {internalStrength: number, externalOpportunity: number, overallBalance: number}',
      },
    ],
  },
  metadata: {
    timing: 0.3,
    versatility: 0.9,
    bottleneck: ['analysis', 'categorization', 'evaluation', 'strategy'],
  },
};

// =============================================================================
// 追加Widget定義（既存実装ベース）
// =============================================================================

/**
 * ブレインストームカード Widget定義
 */
export const BrainstormCardsDefinition: WidgetDefinition = {
  id: 'brainstorm_cards',
  name: 'ブレインストームカード',
  description: '自由にアイデアをカードとして追加し、視覚的に整理する。',
  stage: 'diverge',
  ports: {
    inputs: [],
    outputs: [
      {
        id: 'cards',
        direction: 'out',
        dataType: 'object[]',
        description: 'カードリスト {id: string, text: string, color?: string}',
      },
      {
        id: 'cardCount',
        direction: 'out',
        dataType: 'number',
        description: 'カードの総数',
      },
    ],
  },
  metadata: {
    timing: 0.1,
    versatility: 0.95,
    bottleneck: ['ideation', 'brainstorm', 'collection'],
  },
};

/**
 * 感情パレット Widget定義
 */
export const EmotionPaletteDefinition: WidgetDefinition = {
  id: 'emotion_palette',
  name: '感情パレット',
  description: '感情をカラーパレットから選択し、強度を調整する。',
  stage: 'diverge',
  ports: {
    inputs: [],
    outputs: [
      {
        id: 'selectedEmotions',
        direction: 'out',
        dataType: 'object[]',
        description: '選択された感情リスト {emotion: string, intensity: number}',
      },
      {
        id: 'dominantEmotion',
        direction: 'out',
        dataType: 'string',
        description: '最も強い感情',
      },
    ],
  },
  metadata: {
    timing: 0.15,
    versatility: 0.6,
    bottleneck: ['emotion', 'feeling', 'mood'],
  },
};

/**
 * マトリクス配置 Widget定義
 */
export const MatrixPlacementDefinition: WidgetDefinition = {
  id: 'matrix_placement',
  name: 'マトリクス配置',
  description: '2軸のマトリクス上にアイテムを配置し、位置関係を可視化。',
  stage: 'organize',
  ports: {
    inputs: [
      {
        id: 'items',
        direction: 'in',
        dataType: 'object[]',
        description: '配置するアイテムリスト',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'placements',
        direction: 'out',
        dataType: 'object[]',
        description: 'アイテムの配置情報 {id: string, x: number, y: number}',
      },
      {
        id: 'quadrantCounts',
        direction: 'out',
        dataType: 'object',
        description: '各象限のアイテム数',
      },
    ],
  },
  metadata: {
    timing: 0.5,
    versatility: 0.85,
    bottleneck: ['prioritization', 'comparison', 'positioning'],
  },
};

/**
 * 優先度スライダーグリッド Widget定義
 */
export const PrioritySliderGridDefinition: WidgetDefinition = {
  id: 'priority_slider_grid',
  name: '優先度スライダー',
  description: '複数の項目に対してスライダーで優先度を設定。',
  stage: 'converge',
  ports: {
    inputs: [
      {
        id: 'items',
        direction: 'in',
        dataType: 'object[]',
        description: '優先度を設定する項目リスト',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'priorities',
        direction: 'out',
        dataType: 'object[]',
        description: '優先度情報 {id: string, label: string, priority: number}',
      },
      {
        id: 'ranking',
        direction: 'out',
        dataType: 'string[]',
        description: '優先度順のID配列',
      },
    ],
  },
  metadata: {
    timing: 0.7,
    versatility: 0.75,
    bottleneck: ['prioritization', 'ranking', 'scoring'],
  },
};

/**
 * 質問カードチェーン Widget定義
 */
export const QuestionCardChainDefinition: WidgetDefinition = {
  id: 'question_card_chain',
  name: '質問カードチェーン',
  description: '質問に対する回答を連鎖的に記録し、思考の流れを可視化。',
  stage: 'diverge',
  ports: {
    inputs: [
      {
        id: 'questions',
        direction: 'in',
        dataType: 'string[]',
        description: '提示する質問リスト',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'answers',
        direction: 'out',
        dataType: 'object[]',
        description: '回答リスト {questionId: string, answer: string}',
      },
      {
        id: 'completedCount',
        direction: 'out',
        dataType: 'number',
        description: '回答済みの質問数',
      },
    ],
  },
  metadata: {
    timing: 0.2,
    versatility: 0.8,
    bottleneck: ['exploration', 'questioning', 'deep-dive'],
  },
};

/**
 * カードソート Widget定義
 */
export const CardSortingDefinition: WidgetDefinition = {
  id: 'card_sorting',
  name: 'カードソート',
  description: 'カードをカテゴリにドラッグ&ドロップで分類。',
  stage: 'organize',
  ports: {
    inputs: [
      {
        id: 'cards',
        direction: 'in',
        dataType: 'object[]',
        description: 'ソートするカードリスト',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'categories',
        direction: 'out',
        dataType: 'object',
        description: 'カテゴリごとのカード配置',
      },
      {
        id: 'uncategorized',
        direction: 'out',
        dataType: 'object[]',
        description: '未分類のカード',
      },
    ],
  },
  metadata: {
    timing: 0.35,
    versatility: 0.85,
    bottleneck: ['categorization', 'grouping', 'classification'],
  },
};

/**
 * マインドマップ Widget定義
 */
export const MindMapDefinition: WidgetDefinition = {
  id: 'mind_map',
  name: 'マインドマップ',
  description: '中心トピックから放射状にアイデアを展開。',
  stage: 'diverge',
  ports: {
    inputs: [
      {
        id: 'centralTopic',
        direction: 'in',
        dataType: 'string',
        description: '中心トピック',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'nodes',
        direction: 'out',
        dataType: 'object[]',
        description: 'マインドマップのノード',
      },
      {
        id: 'connections',
        direction: 'out',
        dataType: 'object[]',
        description: 'ノード間の接続',
      },
      {
        id: 'depth',
        direction: 'out',
        dataType: 'number',
        description: '最大の深さ',
      },
    ],
  },
  metadata: {
    timing: 0.2,
    versatility: 0.9,
    bottleneck: ['ideation', 'association', 'exploration'],
  },
};

/**
 * タイムラインスライダー Widget定義
 */
export const TimelineSliderDefinition: WidgetDefinition = {
  id: 'timeline_slider',
  name: 'タイムラインスライダー',
  description: '時間軸に沿ってイベントや計画を配置。',
  stage: 'organize',
  ports: {
    inputs: [
      {
        id: 'events',
        direction: 'in',
        dataType: 'object[]',
        description: 'イベントリスト',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'timeline',
        direction: 'out',
        dataType: 'object[]',
        description: '時系列に並んだイベント',
      },
      {
        id: 'currentPosition',
        direction: 'out',
        dataType: 'number',
        description: '現在のスライダー位置',
      },
    ],
  },
  metadata: {
    timing: 0.5,
    versatility: 0.7,
    bottleneck: ['planning', 'scheduling', 'timeline'],
  },
};

/**
 * 構造化サマリー Widget定義
 */
export const StructuredSummaryDefinition: WidgetDefinition = {
  id: 'structured_summary',
  name: '構造化サマリー',
  description: '入力された情報を構造化して要約表示。',
  stage: 'summary',
  ports: {
    inputs: [
      {
        id: 'data',
        direction: 'in',
        dataType: 'object',
        description: '要約対象のデータ',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'summary',
        direction: 'out',
        dataType: 'string',
        description: '生成されたサマリーテキスト',
      },
      {
        id: 'keyPoints',
        direction: 'out',
        dataType: 'string[]',
        description: '主要ポイントのリスト',
      },
    ],
  },
  metadata: {
    timing: 0.9,
    versatility: 0.6,
    bottleneck: ['summary', 'conclusion', 'synthesis'],
  },
};

// =============================================================================
// Widget定義レジストリ
// =============================================================================

/**
 * 全Widget定義のレジストリ
 *
 * WidgetDefinitionGeneratorやDependencyGraph検証で使用。
 */
export const WIDGET_DEFINITIONS: WidgetDefinitionRegistry = {
  tradeoff_balance: TradeoffBalanceDefinition,
  dependency_mapping: DependencyMappingDefinition,
  swot_analysis: SwotAnalysisDefinition,
  brainstorm_cards: BrainstormCardsDefinition,
  emotion_palette: EmotionPaletteDefinition,
  matrix_placement: MatrixPlacementDefinition,
  priority_slider_grid: PrioritySliderGridDefinition,
  question_card_chain: QuestionCardChainDefinition,
  card_sorting: CardSortingDefinition,
  mind_map: MindMapDefinition,
  timeline_slider: TimelineSliderDefinition,
  structured_summary: StructuredSummaryDefinition,
};

/**
 * Widget IDからWidget定義を取得
 */
export function getWidgetDefinition(widgetId: string): WidgetDefinition | undefined {
  return WIDGET_DEFINITIONS[widgetId];
}

/**
 * ステージごとのWidget定義を取得
 */
export function getWidgetsByStage(
  stage: WidgetDefinition['stage']
): WidgetDefinition[] {
  return Object.values(WIDGET_DEFINITIONS).filter((w) => w.stage === stage);
}

/**
 * 全Widget IDのリストを取得
 */
export function getAllWidgetIds(): string[] {
  return Object.keys(WIDGET_DEFINITIONS);
}
