/**
 * BrainstormCardsController.ts
 * ブレインストームカードWidgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * 自由にアイデアカードを追加・編集・削除できるWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * ブレインストームカード
 */
export interface BrainstormCard {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * BrainstormCardsの状態
 */
export interface BrainstormCardsState {
  cards: BrainstormCard[];
  maxCards?: number;
}

/**
 * BrainstormCardsController
 * カードの追加・編集・削除のロジック
 */
export class BrainstormCardsController {
  private state: BrainstormCardsState;
  private nextId: number = 1;

  constructor(initialState?: Partial<BrainstormCardsState>) {
    this.state = {
      cards: initialState?.cards || [],
      maxCards: initialState?.maxCards || 20,
    };

    // 既存カードからnextIdを設定
    if (this.state.cards.length > 0) {
      const maxId = Math.max(
        ...this.state.cards.map((c) =>
          parseInt(c.id.replace('card_', ''), 10)
        )
      );
      this.nextId = maxId + 1;
    }
  }

  /**
   * カードを追加
   */
  public addCard(text: string): BrainstormCard {
    if (text.trim() === '') {
      throw new Error('Card text cannot be empty');
    }

    if (
      this.state.maxCards &&
      this.state.maxCards > 0 &&
      this.state.cards.length >= this.state.maxCards
    ) {
      throw new Error(
        `Maximum number of cards (${this.state.maxCards}) reached`
      );
    }

    const now = Date.now();
    const newCard: BrainstormCard = {
      id: `card_${this.nextId++}`,
      text: text.trim(),
      createdAt: now,
      updatedAt: now,
    };

    this.state.cards.push(newCard);
    return newCard;
  }

  /**
   * カードを編集
   */
  public editCard(cardId: string, newText: string): void {
    if (newText.trim() === '') {
      throw new Error('Card text cannot be empty');
    }

    const card = this.state.cards.find((c) => c.id === cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    card.text = newText.trim();
    card.updatedAt = Date.now();
  }

  /**
   * カードを削除
   */
  public deleteCard(cardId: string): void {
    const index = this.state.cards.findIndex((c) => c.id === cardId);
    if (index === -1) {
      throw new Error(`Card not found: ${cardId}`);
    }

    this.state.cards.splice(index, 1);
  }

  /**
   * 全カードを取得
   */
  public getCards(): BrainstormCard[] {
    return [...this.state.cards];
  }

  /**
   * カード数を取得
   */
  public getCardCount(): number {
    return this.state.cards.length;
  }

  /**
   * 残りカード追加可能数を取得
   */
  public getRemainingCards(): number {
    if (!this.state.maxCards || this.state.maxCards === 0) return Infinity;
    return this.state.maxCards - this.state.cards.length;
  }

  /**
   * 現在の状態を取得
   */
  public getState(): BrainstormCardsState {
    return {
      cards: [...this.state.cards],
      maxCards: this.state.maxCards,
    };
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const count = this.state.cards.length;

    if (count === 0) {
      return 'アイデアがまだありません';
    }

    if (count === 1) {
      return `1つのアイデア: ${this.state.cards[0].text}`;
    }

    const preview = this.state.cards
      .slice(0, 3)
      .map((c) => c.text)
      .join('、');

    if (count <= 3) {
      return `${count}個のアイデア: ${preview}`;
    }

    return `${count}個のアイデア: ${preview}...など`;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    return {
      widgetId,
      component: 'brainstorm_cards',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'text',
        text: {
          content: this.state.cards.map((c) => c.text).join('\n'),
          items: this.state.cards.map((c) => c.text),
        },
      },
      interactions: [],
      metadata: {
        cardCount: this.state.cards.length,
        maxCards: this.state.maxCards,
        totalCharacters: this.state.cards.reduce(
          (sum, c) => sum + c.text.length,
          0
        ),
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.cards = [];
    this.nextId = 1;
  }
}
