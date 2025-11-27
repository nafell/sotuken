/**
 * SwotAnalysisController.ts
 * SWOT分析Widgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * 4象限（強み・弱み・機会・脅威）に項目を配置するWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * SWOT象限の定義
 */
export type SwotQuadrant = 'strengths' | 'weaknesses' | 'opportunities' | 'threats';

/**
 * SWOTアイテムの定義
 */
export interface SwotItem {
  id: string;
  text: string;
  quadrant: SwotQuadrant;
  importance: 'high' | 'medium' | 'low';
  timestamp: number;
}

/**
 * SwotAnalysisの状態
 */
export interface SwotAnalysisState {
  items: SwotItem[];
  suggestedGaps: string[];
}

/**
 * SWOT象限の設定
 */
export interface SwotQuadrantConfig {
  id: SwotQuadrant;
  label: string;
  labelJa: string;
  description: string;
  color: string;
  icon: string;
}

/**
 * SWOT象限の設定
 */
export const SWOT_QUADRANTS: SwotQuadrantConfig[] = [
  {
    id: 'strengths',
    label: 'Strengths',
    labelJa: '強み',
    description: '内部のポジティブな要素',
    color: '#22c55e',
    icon: '💪',
  },
  {
    id: 'weaknesses',
    label: 'Weaknesses',
    labelJa: '弱み',
    description: '内部のネガティブな要素',
    color: '#ef4444',
    icon: '⚠️',
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    labelJa: '機会',
    description: '外部のポジティブな要素',
    color: '#3b82f6',
    icon: '🚀',
  },
  {
    id: 'threats',
    label: 'Threats',
    labelJa: '脅威',
    description: '外部のネガティブな要素',
    color: '#f59e0b',
    icon: '⛈️',
  },
];

/**
 * 重要度の色
 */
export const IMPORTANCE_COLORS: Record<SwotItem['importance'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#6b7280',
};

/**
 * 重要度のラベル
 */
export const IMPORTANCE_LABELS: Record<SwotItem['importance'], string> = {
  high: '高',
  medium: '中',
  low: '低',
};

/**
 * SwotAnalysisController
 * SWOT分析のロジック管理
 */
export class SwotAnalysisController {
  private state: SwotAnalysisState;
  private itemIdCounter: number = 0;

  constructor() {
    this.state = {
      items: [],
      suggestedGaps: [],
    };
  }

  /**
   * アイテムを追加
   */
  public addItem(
    text: string,
    quadrant: SwotQuadrant,
    importance: SwotItem['importance'] = 'medium'
  ): SwotItem {
    const item: SwotItem = {
      id: `swot_item_${++this.itemIdCounter}`,
      text,
      quadrant,
      importance,
      timestamp: Date.now(),
    };
    this.state.items.push(item);
    this.updateSuggestedGaps();
    return item;
  }

  /**
   * アイテムを更新
   */
  public updateItem(
    itemId: string,
    updates: Partial<Omit<SwotItem, 'id' | 'timestamp'>>
  ): void {
    const item = this.state.items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }
    Object.assign(item, updates);
    this.updateSuggestedGaps();
  }

  /**
   * アイテムを削除
   */
  public removeItem(itemId: string): void {
    this.state.items = this.state.items.filter((i) => i.id !== itemId);
    this.updateSuggestedGaps();
  }

  /**
   * アイテムを別の象限に移動
   */
  public moveItem(itemId: string, newQuadrant: SwotQuadrant): void {
    const item = this.state.items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }
    item.quadrant = newQuadrant;
    this.updateSuggestedGaps();
  }

  /**
   * 象限ごとのアイテムを取得
   */
  public getItemsByQuadrant(quadrant: SwotQuadrant): SwotItem[] {
    return this.state.items
      .filter((i) => i.quadrant === quadrant)
      .sort((a, b) => {
        const importanceOrder = { high: 0, medium: 1, low: 2 };
        return importanceOrder[a.importance] - importanceOrder[b.importance];
      });
  }

  /**
   * 象限ごとのアイテム数を取得
   */
  public getQuadrantCounts(): Record<SwotQuadrant, number> {
    const counts: Record<SwotQuadrant, number> = {
      strengths: 0,
      weaknesses: 0,
      opportunities: 0,
      threats: 0,
    };
    this.state.items.forEach((item) => {
      counts[item.quadrant]++;
    });
    return counts;
  }

  /**
   * 不足している情報を推論
   */
  private updateSuggestedGaps(): void {
    const counts = this.getQuadrantCounts();
    const gaps: string[] = [];

    // 空の象限を検出
    SWOT_QUADRANTS.forEach((q) => {
      if (counts[q.id] === 0) {
        gaps.push(`「${q.labelJa}」に項目がありません`);
      }
    });

    // バランスの悪さを検出
    const total = this.state.items.length;
    if (total >= 4) {
      const avgPerQuadrant = total / 4;
      SWOT_QUADRANTS.forEach((q) => {
        if (counts[q.id] < avgPerQuadrant * 0.5) {
          gaps.push(`「${q.labelJa}」の項目が少ないかもしれません`);
        }
      });
    }

    // 内部/外部のバランス
    const internal = counts.strengths + counts.weaknesses;
    const external = counts.opportunities + counts.threats;
    if (total >= 4 && Math.abs(internal - external) > total * 0.4) {
      if (internal > external) {
        gaps.push('外部環境（機会・脅威）の分析を追加してみてください');
      } else {
        gaps.push('内部環境（強み・弱み）の分析を追加してみてください');
      }
    }

    // 高重要度の項目がない象限
    SWOT_QUADRANTS.forEach((q) => {
      const highItems = this.state.items.filter(
        (i) => i.quadrant === q.id && i.importance === 'high'
      );
      if (counts[q.id] >= 2 && highItems.length === 0) {
        gaps.push(`「${q.labelJa}」で最も重要な項目を特定してみてください`);
      }
    });

    this.state.suggestedGaps = gaps;
  }

  /**
   * 現在の状態を取得
   */
  public getState(): SwotAnalysisState {
    return { ...this.state };
  }

  /**
   * 入力が十分かどうか
   */
  public isComplete(): boolean {
    const counts = this.getQuadrantCounts();
    // 各象限に最低1つ以上
    return Object.values(counts).every((count) => count >= 1);
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const counts = this.getQuadrantCounts();
    const total = this.state.items.length;

    if (total === 0) {
      return 'まだ項目がありません';
    }

    const parts: string[] = [];
    SWOT_QUADRANTS.forEach((q) => {
      if (counts[q.id] > 0) {
        parts.push(`${q.labelJa}${counts[q.id]}件`);
      }
    });

    return `SWOT分析: ${parts.join('、')}`;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    const counts = this.getQuadrantCounts();
    const quadrantData: Record<string, SwotItem[]> = {};

    SWOT_QUADRANTS.forEach((q) => {
      quadrantData[q.id] = this.getItemsByQuadrant(q.id);
    });

    // 高重要度アイテムのみ抽出
    const highPriorityItems = this.state.items.filter(
      (i) => i.importance === 'high'
    );

    return {
      widgetId,
      component: 'swot_analysis',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'mapping',
        mapping: {
          items: this.state.items.map((item) => ({
            id: item.id,
            label: item.text,
            category: item.quadrant,
          })),
        },
        composite: {
          quadrantData,
          counts,
          totalItems: this.state.items.length,
          highPriorityItems: highPriorityItems.map((i) => ({
            text: i.text,
            quadrant: i.quadrant,
          })),
          suggestedGaps: this.state.suggestedGaps,
          isComplete: this.isComplete(),
          analysis: {
            internalStrength: counts.strengths - counts.weaknesses,
            externalOpportunity: counts.opportunities - counts.threats,
            overallBalance:
              (counts.strengths + counts.opportunities) -
              (counts.weaknesses + counts.threats),
          },
        },
      },
      interactions: this.state.items.map((item) => ({
        timestamp: item.timestamp,
        action: 'input' as const,
        target: item.quadrant,
        value: item.text,
      })),
      metadata: {
        totalItems: this.state.items.length,
        quadrantCounts: counts,
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.items = [];
    this.state.suggestedGaps = [];
    this.itemIdCounter = 0;
  }
}
