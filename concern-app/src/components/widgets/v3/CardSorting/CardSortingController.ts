/**
 * CardSortingController.ts
 * カード仕分けWidgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * カードをカテゴリにドラッグ＆ドロップで仕分けるWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * カードの定義
 */
export interface SortingCard {
  id: string;
  label: string;
  description?: string;
  color?: string;
}

/**
 * カテゴリの定義
 */
export interface SortingCategory {
  id: string;
  label: string;
  description?: string;
  color: string;
  maxCards?: number;
}

/**
 * カードの配置
 */
export interface CardPlacement {
  cardId: string;
  categoryId: string | null; // nullは未分類
  timestamp: number;
}

/**
 * CardSortingの状態
 */
export interface CardSortingState {
  cards: SortingCard[];
  categories: SortingCategory[];
  placements: CardPlacement[];
}

/**
 * デフォルトのカテゴリ
 */
export const DEFAULT_CATEGORIES: SortingCategory[] = [
  {
    id: 'important_urgent',
    label: '重要かつ緊急',
    description: 'すぐに対処が必要',
    color: '#ef4444',
  },
  {
    id: 'important_not_urgent',
    label: '重要だが緊急でない',
    description: '計画的に進める',
    color: '#f59e0b',
  },
  {
    id: 'not_important_urgent',
    label: '緊急だが重要でない',
    description: '委任や効率化を検討',
    color: '#3b82f6',
  },
  {
    id: 'not_important_not_urgent',
    label: '重要でも緊急でもない',
    description: '後回しまたは削除',
    color: '#6b7280',
  },
];

/**
 * デフォルトのカード
 */
export const DEFAULT_CARDS: SortingCard[] = [
  { id: 'card1', label: '項目1', description: '分類してください' },
  { id: 'card2', label: '項目2', description: '分類してください' },
  { id: 'card3', label: '項目3', description: '分類してください' },
];

/**
 * CardSortingController
 * カード仕分けのロジック管理
 */
export class CardSortingController {
  private state: CardSortingState;

  constructor(
    cards?: SortingCard[],
    categories?: SortingCategory[]
  ) {
    this.state = {
      cards: cards || DEFAULT_CARDS,
      categories: categories || DEFAULT_CATEGORIES,
      placements: [],
    };
  }

  /**
   * カードを設定
   */
  public setCards(cards: SortingCard[]): void {
    this.state.cards = cards;
    // 新しいカードで既存のplacementsを更新
    this.state.placements = this.state.placements.filter((p) =>
      cards.some((c) => c.id === p.cardId)
    );
  }

  /**
   * カテゴリを設定
   */
  public setCategories(categories: SortingCategory[]): void {
    this.state.categories = categories;
    // 削除されたカテゴリのplacementsを未分類に
    this.state.placements = this.state.placements.map((p) => {
      if (p.categoryId && !categories.some((c) => c.id === p.categoryId)) {
        return { ...p, categoryId: null };
      }
      return p;
    });
  }

  /**
   * カードをカテゴリに配置
   */
  public placeCard(cardId: string, categoryId: string | null): void {
    const card = this.state.cards.find((c) => c.id === cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    if (categoryId !== null) {
      const category = this.state.categories.find((c) => c.id === categoryId);
      if (!category) {
        throw new Error(`Category not found: ${categoryId}`);
      }

      // maxCardsのチェック
      if (category.maxCards) {
        const currentCount = this.state.placements.filter(
          (p) => p.categoryId === categoryId
        ).length;
        const isMovingWithinCategory = this.state.placements.some(
          (p) => p.cardId === cardId && p.categoryId === categoryId
        );
        if (!isMovingWithinCategory && currentCount >= category.maxCards) {
          throw new Error(`Category ${categoryId} is full`);
        }
      }
    }

    // 既存のplacementを削除
    this.state.placements = this.state.placements.filter(
      (p) => p.cardId !== cardId
    );

    // 新しいplacementを追加
    this.state.placements.push({
      cardId,
      categoryId,
      timestamp: Date.now(),
    });
  }

  /**
   * カードの配置を解除（未分類に戻す）
   */
  public unplaceCard(cardId: string): void {
    this.state.placements = this.state.placements.filter(
      (p) => p.cardId !== cardId
    );
  }

  /**
   * カテゴリ内のカードを取得
   */
  public getCardsInCategory(categoryId: string | null): SortingCard[] {
    const placedCardIds = this.state.placements
      .filter((p) => p.categoryId === categoryId)
      .map((p) => p.cardId);

    return this.state.cards.filter((c) => placedCardIds.includes(c.id));
  }

  /**
   * 未分類のカードを取得
   */
  public getUnsortedCards(): SortingCard[] {
    const placedCardIds = new Set(
      this.state.placements.map((p) => p.cardId)
    );
    return this.state.cards.filter((c) => !placedCardIds.has(c.id));
  }

  /**
   * カードの配置先を取得
   */
  public getCardCategory(cardId: string): string | null {
    const placement = this.state.placements.find((p) => p.cardId === cardId);
    return placement?.categoryId || null;
  }

  /**
   * 全てのカードが分類されているか
   */
  public isAllSorted(): boolean {
    const placedCardIds = new Set(
      this.state.placements.filter((p) => p.categoryId !== null).map((p) => p.cardId)
    );
    return this.state.cards.every((c) => placedCardIds.has(c.id));
  }

  /**
   * 進捗を取得
   */
  public getProgress(): number {
    const sortedCount = this.state.placements.filter(
      (p) => p.categoryId !== null
    ).length;
    return Math.round((sortedCount / this.state.cards.length) * 100);
  }

  /**
   * 現在の状態を取得
   */
  public getState(): CardSortingState {
    return { ...this.state };
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const sortedCount = this.state.placements.filter(
      (p) => p.categoryId !== null
    ).length;
    const total = this.state.cards.length;

    if (sortedCount === 0) {
      return 'まだカードが分類されていません';
    }

    if (sortedCount === total) {
      return `${total}枚のカードを全て分類しました`;
    }

    return `${total}枚中${sortedCount}枚のカードを分類しました`;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    // カテゴリごとの分類結果
    const categorization: Record<string, SortingCard[]> = {};
    this.state.categories.forEach((cat) => {
      categorization[cat.id] = this.getCardsInCategory(cat.id);
    });
    categorization['unsorted'] = this.getUnsortedCards();

    // マッピングデータ形式
    const mappingItems = this.state.cards.map((card) => {
      const categoryId = this.getCardCategory(card.id);
      const category = this.state.categories.find((c) => c.id === categoryId);
      return {
        id: card.id,
        label: card.label,
        category: categoryId || 'unsorted',
        categoryLabel: category?.label || '未分類',
      };
    });

    return {
      widgetId,
      component: 'card_sorting',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'mapping',
        mapping: {
          items: mappingItems,
        },
        composite: {
          categorization,
          categories: this.state.categories.map((c) => ({
            id: c.id,
            label: c.label,
            cardCount: this.getCardsInCategory(c.id).length,
          })),
          progress: this.getProgress(),
          isComplete: this.isAllSorted(),
        },
      },
      interactions: this.state.placements.map((p) => ({
        timestamp: p.timestamp,
        action: 'drag' as const,
        target: p.cardId,
        value: p.categoryId,
      })),
      metadata: {
        cardCount: this.state.cards.length,
        categoryCount: this.state.categories.length,
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.placements = [];
  }
}
