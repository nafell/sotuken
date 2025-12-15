/**
 * widgets.ts - DSL v4 Widget定義
 *
 * v3のWidget定義をv4形式に拡張（complexity追加、stage_summary追加）。
 * LLMプロンプト生成、Widget選定、complexityチェックに使用。
 *
 * @module widgets-v4
 * @since DSL v4.0
 */

import type {
  WidgetDefinitionV4,
  WidgetDefinitionRegistryV4,
} from '../../types/v4/widget-definition.types';

// =============================================================================
// Divergeステージ Widget定義
// =============================================================================

/**
 * 感情パレット Widget定義
 */
export const EmotionPaletteDefinitionV4: WidgetDefinitionV4 = {
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
    complexity: 0.3,
    bottleneck: ['emotion', 'feeling', 'mood'],
  },
  summarizationPrompt: `選択された感情を「{emotion}({intensity}%)」形式でリスト化してください。
強度が高い順に並べてください。
{{state}}`,
};

/**
 * ブレインストームカード Widget定義
 */
export const BrainstormCardsDefinitionV4: WidgetDefinitionV4 = {
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
    complexity: 0.2,
    bottleneck: ['ideation', 'brainstorm', 'collection'],
  },
  summarizationPrompt: `作成されたカードの内容を箇条書きで列挙してください。
カードの色情報は省略してください。
{{state}}`,
};

/**
 * マインドマップ Widget定義
 */
export const ConcernMapDefinitionV4: WidgetDefinitionV4 = {
  id: 'concern_map',
  name: '関心事マップ',
  description: '中心トピックから放射状にアイデアを展開するマインドマップ。',
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
    complexity: 0.5,
    bottleneck: ['ideation', 'association', 'exploration'],
  },
  summarizationPrompt: `マインドマップの構造を階層的に表示してください。
中心トピックから各ブランチを箇条書きでまとめてください。
{{state}}`,
};

/**
 * フリーライティング Widget定義
 */
export const FreeWritingDefinitionV4: WidgetDefinitionV4 = {
  id: 'free_writing',
  name: 'フリーライティング',
  description: '自由に思考を書き出すテキストエリア。タイマー付きで集中を促進。',
  stage: 'diverge',
  ports: {
    inputs: [
      {
        id: 'prompt',
        direction: 'in',
        dataType: 'string',
        description: '書き出しのためのプロンプト',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'text',
        direction: 'out',
        dataType: 'string',
        description: '書き出されたテキスト',
      },
      {
        id: 'wordCount',
        direction: 'out',
        dataType: 'number',
        description: '単語数',
      },
    ],
  },
  metadata: {
    timing: 0.05,
    versatility: 0.85,
    complexity: 0.1,
    bottleneck: ['expression', 'exploration', 'venting'],
  },
  summarizationPrompt: `書き出された内容の要点を3〜5点にまとめてください。
{{state}}`,
};

// =============================================================================
// Organizeステージ Widget定義
// =============================================================================

/**
 * カードソート Widget定義
 */
export const CardSortingDefinitionV4: WidgetDefinitionV4 = {
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
    complexity: 0.4,
    bottleneck: ['categorization', 'grouping', 'classification'],
  },
  summarizationPrompt: `カテゴリごとに分類されたカードを以下の形式で出力してください：
【{category}】: {items}
{{state}}`,
};

/**
 * マトリクス配置 Widget定義
 */
export const MatrixPlacementDefinitionV4: WidgetDefinitionV4 = {
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
      {
        id: 'axisLabels',
        direction: 'in',
        dataType: 'object',
        description: '軸のラベル {xAxis: {low: string, high: string}, yAxis: {low: string, high: string}}',
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
    complexity: 0.5,
    bottleneck: ['prioritization', 'comparison', 'positioning'],
  },
  summarizationPrompt: `各象限に配置されたアイテムを象限名と共に表示してください。
象限の位置関係が分かるようにまとめてください。
{{state}}`,
};

/**
 * タイムラインビュー Widget定義
 */
export const TimelineViewDefinitionV4: WidgetDefinitionV4 = {
  id: 'timeline_view',
  name: 'タイムライン',
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
    complexity: 0.4,
    bottleneck: ['planning', 'scheduling', 'timeline'],
  },
  summarizationPrompt: `タイムライン上のイベントを時系列順に列挙してください。
各イベントの日時と内容を含めてください。
{{state}}`,
};

// =============================================================================
// Convergeステージ Widget定義
// =============================================================================

/**
 * 優先度スライダーグリッド Widget定義
 */
export const PrioritySliderGridDefinitionV4: WidgetDefinitionV4 = {
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
    complexity: 0.3,
    bottleneck: ['prioritization', 'ranking', 'scoring'],
  },
  summarizationPrompt: `優先度順にソートしたリストを表示してください。
各項目の優先度スコアも含めてください。
{{state}}`,
};

/**
 * 意思決定バランス Widget定義
 */
export const DecisionBalanceDefinitionV4: WidgetDefinitionV4 = {
  id: 'decision_balance',
  name: '意思決定バランス',
  description: '2つの選択肢のメリット・デメリットを比較し、バランスを視覚化。',
  stage: 'converge',
  ports: {
    inputs: [
      {
        id: 'items',
        direction: 'in',
        dataType: 'object[]',
        description: '比較対象の項目リスト {text: string, side: "left"|"right", weight?: number}',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'balance',
        direction: 'out',
        dataType: 'number',
        description: 'バランススコア（-100〜100）',
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
    complexity: 0.5,
    bottleneck: ['comparison', 'decision', 'tradeoff'],
  },
  summarizationPrompt: `比較結果を以下の形式で出力してください：
【選択肢A】のメリット: ...
【選択肢A】のデメリット: ...
【選択肢B】のメリット: ...
【選択肢B】のデメリット: ...
【結論】: ...
{{state}}`,
};

/**
 * アクションカード Widget定義
 */
export const ActionCardsDefinitionV4: WidgetDefinitionV4 = {
  id: 'action_cards',
  name: 'アクションカード',
  description: '具体的なアクションをカードとして作成し、計画を立てる。',
  stage: 'converge',
  ports: {
    inputs: [
      {
        id: 'suggestions',
        direction: 'in',
        dataType: 'object[]',
        description: 'アクション提案リスト',
        required: false,
      },
    ],
    outputs: [
      {
        id: 'actions',
        direction: 'out',
        dataType: 'object[]',
        description: 'アクションリスト {id: string, title: string, description?: string, deadline?: string}',
      },
      {
        id: 'totalActions',
        direction: 'out',
        dataType: 'number',
        description: 'アクションの総数',
      },
    ],
  },
  metadata: {
    timing: 0.8,
    versatility: 0.8,
    complexity: 0.3,
    bottleneck: ['action', 'planning', 'execution'],
  },
  summarizationPrompt: `作成されたアクションを以下の形式で列挙してください：
1. {アクション名}: {説明}（期限: {日時}）
{{state}}`,
};

// =============================================================================
// Summaryステージ Widget定義
// =============================================================================

/**
 * サマリービュー Widget定義
 */
export const SummaryViewDefinitionV4: WidgetDefinitionV4 = {
  id: 'summary_view',
  name: 'サマリービュー',
  description: '全ステージの結果を構造化して表示。',
  stage: 'summary',
  ports: {
    inputs: [
      {
        id: 'stageResults',
        direction: 'in',
        dataType: 'object[]',
        description: '各ステージの結果',
        required: true,
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
    timing: 0.95,
    versatility: 0.6,
    complexity: 0.2,
    bottleneck: ['summary', 'conclusion', 'synthesis'],
  },
  summarizationPrompt: '', // サマリー自体は言語化不要
};

/**
 * エクスポートオプション Widget定義
 */
export const ExportOptionsDefinitionV4: WidgetDefinitionV4 = {
  id: 'export_options',
  name: 'エクスポート',
  description: '結果をさまざまな形式でエクスポート。',
  stage: 'summary',
  ports: {
    inputs: [
      {
        id: 'content',
        direction: 'in',
        dataType: 'object',
        description: 'エクスポートする内容',
        required: true,
      },
    ],
    outputs: [
      {
        id: 'exportedFormat',
        direction: 'out',
        dataType: 'string',
        description: '選択されたエクスポート形式',
      },
    ],
  },
  metadata: {
    timing: 1.0,
    versatility: 0.5,
    complexity: 0.1,
    bottleneck: ['export', 'share', 'save'],
  },
  summarizationPrompt: '', // エクスポートは言語化不要
};

// =============================================================================
// 共通 Widget定義（v4追加）
// =============================================================================

/**
 * ステージサマリー Widget定義（v4新規）
 *
 * 各ステージの先頭に表示し、前ステージまでの操作内容を要約表示する。
 */
export const StageSummaryDefinitionV4: WidgetDefinitionV4 = {
  id: 'stage_summary',
  name: 'ステージサマリー',
  description: '前ステージまでの操作内容を要約表示。',
  stage: 'all',
  ports: {
    inputs: [
      {
        id: 'previousStages',
        direction: 'in',
        dataType: 'object[]',
        description: '前ステージの要約データ',
        required: true,
      },
    ],
    outputs: [],
  },
  metadata: {
    timing: 0,
    versatility: 1.0,
    complexity: 0.1,
    bottleneck: [],
  },
  summarizationPrompt: '', // 自身は要約不要
};

// =============================================================================
// Widget定義レジストリ
// =============================================================================

/**
 * v4 全Widget定義のレジストリ
 */
export const WIDGET_DEFINITIONS_V4: WidgetDefinitionRegistryV4 = {
  // Diverge
  emotion_palette: EmotionPaletteDefinitionV4,
  brainstorm_cards: BrainstormCardsDefinitionV4,
  concern_map: ConcernMapDefinitionV4,
  free_writing: FreeWritingDefinitionV4,
  // Organize
  card_sorting: CardSortingDefinitionV4,
  matrix_placement: MatrixPlacementDefinitionV4,
  timeline_view: TimelineViewDefinitionV4,
  // Converge
  priority_slider_grid: PrioritySliderGridDefinitionV4,
  decision_balance: DecisionBalanceDefinitionV4,
  action_cards: ActionCardsDefinitionV4,
  // Summary
  summary_view: SummaryViewDefinitionV4,
  export_options: ExportOptionsDefinitionV4,
  // Common (v4追加)
  stage_summary: StageSummaryDefinitionV4,
};

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * Widget IDからv4 Widget定義を取得
 */
export function getWidgetDefinitionV4(widgetId: string): WidgetDefinitionV4 | undefined {
  return WIDGET_DEFINITIONS_V4[widgetId];
}

/**
 * ステージごとのv4 Widget定義を取得
 */
export function getWidgetsByStageV4(
  stage: WidgetDefinitionV4['stage']
): WidgetDefinitionV4[] {
  return Object.values(WIDGET_DEFINITIONS_V4).filter(
    (w) => w.stage === stage || w.stage === 'all'
  );
}

/**
 * 全v4 Widget IDのリストを取得
 */
export function getAllWidgetIdsV4(): string[] {
  return Object.keys(WIDGET_DEFINITIONS_V4);
}

/**
 * Widget定義の配列を取得
 */
export function getAllWidgetDefinitionsV4(): WidgetDefinitionV4[] {
  return Object.values(WIDGET_DEFINITIONS_V4);
}

/**
 * complexityでソートしたWidget定義を取得
 */
export function getWidgetsSortedByComplexity(ascending: boolean = true): WidgetDefinitionV4[] {
  const widgets = getAllWidgetDefinitionsV4();
  return widgets.sort((a, b) =>
    ascending
      ? a.metadata.complexity - b.metadata.complexity
      : b.metadata.complexity - a.metadata.complexity
  );
}

/**
 * 特定のボトルネックを解消できるWidgetを取得
 */
export function getWidgetsByBottleneck(bottleneck: string): WidgetDefinitionV4[] {
  return Object.values(WIDGET_DEFINITIONS_V4).filter((w) =>
    w.metadata.bottleneck.includes(bottleneck)
  );
}
