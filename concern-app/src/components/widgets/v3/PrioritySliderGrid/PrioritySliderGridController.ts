/**
 * PrioritySliderGridController.ts
 * 優先度スライダーグリッドWidgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * アイテムに優先度スコアを付与して整理するWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * 優先度アイテム
 */
export interface PriorityItem {
  id: string;
  label: string;
  priority: number; // 0.0 ~ 1.0 (normalized)
  createdAt: number;
  updatedAt: number;
}

/**
 * PrioritySliderGridの状態
 */
export interface PrioritySliderGridState {
  items: PriorityItem[];
  maxItems?: number;
}

/**
 * PrioritySliderGridController
 * 優先度スライダーグリッドのロジック
 */
export class PrioritySliderGridController {
  private state: PrioritySliderGridState;
  private nextId: number = 1;

  constructor(initialState?: Partial<PrioritySliderGridState>) {
    this.state = {
      items: initialState?.items || [],
      maxItems: initialState?.maxItems || 20,
    };

    // 既存アイテムからnextIdを設定
    if (this.state.items.length > 0) {
      const maxId = Math.max(
        ...this.state.items.map((item) =>
          parseInt(item.id.replace('priority_item_', ''), 10)
        )
      );
      this.nextId = maxId + 1;
    }
  }

  /**
   * アイテムを追加（デフォルト優先度: 0.5）
   */
  public addItem(label: string, initialPriority: number = 0.5): PriorityItem {
    if (label.trim() === '') {
      throw new Error('Item label cannot be empty');
    }

    if (
      this.state.maxItems &&
      this.state.maxItems > 0 &&
      this.state.items.length >= this.state.maxItems
    ) {
      throw new Error(
        `Maximum number of items (${this.state.maxItems}) reached`
      );
    }

    // 優先度を0.0-1.0に正規化
    const normalizedPriority = Math.max(0, Math.min(1, initialPriority));

    const now = Date.now();
    const newItem: PriorityItem = {
      id: `priority_item_${this.nextId++}`,
      label: label.trim(),
      priority: normalizedPriority,
      createdAt: now,
      updatedAt: now,
    };

    this.state.items.push(newItem);
    return newItem;
  }

  /**
   * アイテムの優先度を更新
   */
  public updateItemPriority(itemId: string, priority: number): void {
    // 範囲チェック
    if (priority < 0 || priority > 1) {
      throw new Error('Priority must be between 0 and 1');
    }

    const item = this.state.items.find((item) => item.id === itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    item.priority = priority;
    item.updatedAt = Date.now();
  }

  /**
   * アイテムを削除
   */
  public deleteItem(itemId: string): void {
    const index = this.state.items.findIndex((item) => item.id === itemId);
    if (index === -1) {
      throw new Error(`Item not found: ${itemId}`);
    }

    this.state.items.splice(index, 1);
  }

  /**
   * 全アイテムを取得
   */
  public getItems(): PriorityItem[] {
    return [...this.state.items];
  }

  /**
   * 優先度順にソートされたアイテムを取得
   */
  public getItemsSortedByPriority(): PriorityItem[] {
    return [...this.state.items].sort((a, b) => b.priority - a.priority);
  }

  /**
   * 高優先度アイテムを取得（priority > 0.7）
   */
  public getHighPriorityItems(): PriorityItem[] {
    return this.state.items.filter((item) => item.priority > 0.7);
  }

  /**
   * 中優先度アイテムを取得（0.4 <= priority <= 0.7）
   */
  public getMediumPriorityItems(): PriorityItem[] {
    return this.state.items.filter(
      (item) => item.priority >= 0.4 && item.priority <= 0.7
    );
  }

  /**
   * 低優先度アイテムを取得（priority < 0.4）
   */
  public getLowPriorityItems(): PriorityItem[] {
    return this.state.items.filter((item) => item.priority < 0.4);
  }

  /**
   * 平均優先度を計算
   */
  public getAveragePriority(): number {
    if (this.state.items.length === 0) return 0;

    const sum = this.state.items.reduce(
      (acc, item) => acc + item.priority,
      0
    );
    return sum / this.state.items.length;
  }

  /**
   * 優先度分布を取得
   */
  public getPriorityDistribution(): {
    high: number;
    medium: number;
    low: number;
  } {
    return {
      high: this.getHighPriorityItems().length,
      medium: this.getMediumPriorityItems().length,
      low: this.getLowPriorityItems().length,
    };
  }

  /**
   * 現在の状態を取得
   */
  public getState(): PrioritySliderGridState {
    return {
      items: [...this.state.items],
      maxItems: this.state.maxItems,
    };
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const count = this.state.items.length;

    if (count === 0) {
      return 'アイテムがまだ追加されていません';
    }

    const distribution = this.getPriorityDistribution();
    const avgPriority = Math.round(this.getAveragePriority() * 100);

    return `${count}個のアイテムを優先度付け（平均: ${avgPriority}%、高: ${distribution.high}個、中: ${distribution.medium}個、低: ${distribution.low}個）`;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    const sortedItems = this.getItemsSortedByPriority();

    return {
      widgetId,
      component: 'priority_slider_grid',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'ranking',
        ranking: {
          items: sortedItems.map((item, index) => ({
            rank: index + 1,
            label: item.label,
            score: item.priority,
            metadata: {
              id: item.id,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            },
          })),
          criteria: {
            name: '優先度',
            min: 0,
            max: 1,
            description: '0（低）から1（高）までの優先度スコア',
          },
        },
      },
      interactions: [],
      metadata: {
        itemCount: this.state.items.length,
        maxItems: this.state.maxItems,
        averagePriority: this.getAveragePriority(),
        distribution: this.getPriorityDistribution(),
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.items = [];
    this.nextId = 1;
  }
}
