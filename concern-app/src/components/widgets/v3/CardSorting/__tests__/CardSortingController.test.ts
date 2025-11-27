/**
 * CardSortingController.test.ts
 * CardSortingControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  CardSortingController,
  DEFAULT_CARDS,
  DEFAULT_CATEGORIES,
  type SortingCard,
  type SortingCategory,
} from '../CardSortingController';

describe('CardSortingController', () => {
  let controller: CardSortingController;

  beforeEach(() => {
    controller = new CardSortingController();
  });

  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => {
      const state = controller.getState();

      expect(state.cards).toEqual(DEFAULT_CARDS);
      expect(state.categories).toEqual(DEFAULT_CATEGORIES);
      expect(state.placements).toEqual([]);
    });

    test('カスタムカードで初期化できる', () => {
      const customCards: SortingCard[] = [
        { id: 'c1', label: 'カード1' },
        { id: 'c2', label: 'カード2' },
      ];

      const customController = new CardSortingController(customCards);
      const state = customController.getState();

      expect(state.cards).toEqual(customCards);
      expect(state.categories).toEqual(DEFAULT_CATEGORIES);
    });

    test('カスタムカテゴリで初期化できる', () => {
      const customCategories: SortingCategory[] = [
        { id: 'cat1', label: 'カテゴリ1', color: '#ff0000' },
        { id: 'cat2', label: 'カテゴリ2', color: '#00ff00' },
      ];

      const customController = new CardSortingController(undefined, customCategories);
      const state = customController.getState();

      expect(state.cards).toEqual(DEFAULT_CARDS);
      expect(state.categories).toEqual(customCategories);
    });
  });

  describe('カード設定', () => {
    test('カードを設定できる', () => {
      const newCards: SortingCard[] = [
        { id: 'new1', label: '新カード1' },
        { id: 'new2', label: '新カード2' },
      ];

      controller.setCards(newCards);
      const state = controller.getState();

      expect(state.cards).toEqual(newCards);
    });

    test('カード設定時に存在しないカードのplacementは削除される', () => {
      controller.placeCard('card1', 'important_urgent');

      const newCards: SortingCard[] = [
        { id: 'new1', label: '新カード1' },
      ];
      controller.setCards(newCards);

      const state = controller.getState();
      expect(state.placements).toEqual([]);
    });
  });

  describe('カテゴリ設定', () => {
    test('カテゴリを設定できる', () => {
      const newCategories: SortingCategory[] = [
        { id: 'cat1', label: 'カテゴリ1', color: '#ff0000' },
      ];

      controller.setCategories(newCategories);
      const state = controller.getState();

      expect(state.categories).toEqual(newCategories);
    });

    test('削除されたカテゴリのカードは未分類になる', () => {
      controller.placeCard('card1', 'important_urgent');

      const newCategories: SortingCategory[] = [
        { id: 'new_cat', label: '新カテゴリ', color: '#ff0000' },
      ];
      controller.setCategories(newCategories);

      const state = controller.getState();
      const placement = state.placements.find((p) => p.cardId === 'card1');
      expect(placement?.categoryId).toBeNull();
    });
  });

  describe('カード配置', () => {
    test('カードをカテゴリに配置できる', () => {
      controller.placeCard('card1', 'important_urgent');

      const categoryId = controller.getCardCategory('card1');
      expect(categoryId).toBe('important_urgent');
    });

    test('カードを別のカテゴリに移動できる', () => {
      controller.placeCard('card1', 'important_urgent');
      controller.placeCard('card1', 'important_not_urgent');

      const categoryId = controller.getCardCategory('card1');
      expect(categoryId).toBe('important_not_urgent');
    });

    test('存在しないカードはエラー', () => {
      expect(() => {
        controller.placeCard('non_existent', 'important_urgent');
      }).toThrow('Card not found');
    });

    test('存在しないカテゴリはエラー', () => {
      expect(() => {
        controller.placeCard('card1', 'non_existent');
      }).toThrow('Category not found');
    });

    test('カードを未分類に戻せる', () => {
      controller.placeCard('card1', 'important_urgent');
      controller.placeCard('card1', null);

      const categoryId = controller.getCardCategory('card1');
      expect(categoryId).toBeNull();
    });

    test('maxCardsを超えるとエラー', () => {
      const limitedCategories: SortingCategory[] = [
        { id: 'limited', label: '制限付き', color: '#ff0000', maxCards: 1 },
      ];
      const cards: SortingCard[] = [
        { id: 'c1', label: 'カード1' },
        { id: 'c2', label: 'カード2' },
      ];
      const limitedController = new CardSortingController(cards, limitedCategories);

      limitedController.placeCard('c1', 'limited');

      expect(() => {
        limitedController.placeCard('c2', 'limited');
      }).toThrow('Category limited is full');
    });
  });

  describe('カード配置解除', () => {
    test('カードの配置を解除できる', () => {
      controller.placeCard('card1', 'important_urgent');
      controller.unplaceCard('card1');

      const unsorted = controller.getUnsortedCards();
      expect(unsorted.some((c) => c.id === 'card1')).toBe(true);
    });
  });

  describe('カード取得', () => {
    test('カテゴリ内のカードを取得できる', () => {
      controller.placeCard('card1', 'important_urgent');
      controller.placeCard('card2', 'important_urgent');

      const cards = controller.getCardsInCategory('important_urgent');

      expect(cards).toHaveLength(2);
      expect(cards.some((c) => c.id === 'card1')).toBe(true);
      expect(cards.some((c) => c.id === 'card2')).toBe(true);
    });

    test('未分類のカードを取得できる', () => {
      controller.placeCard('card1', 'important_urgent');

      const unsorted = controller.getUnsortedCards();

      expect(unsorted).toHaveLength(2);
      expect(unsorted.some((c) => c.id === 'card2')).toBe(true);
      expect(unsorted.some((c) => c.id === 'card3')).toBe(true);
    });

    test('カードの配置先を取得できる', () => {
      controller.placeCard('card1', 'important_urgent');

      expect(controller.getCardCategory('card1')).toBe('important_urgent');
      expect(controller.getCardCategory('card2')).toBeNull();
    });
  });

  describe('進捗確認', () => {
    test('全カードが分類済みか確認できる', () => {
      expect(controller.isAllSorted()).toBe(false);

      controller.placeCard('card1', 'important_urgent');
      controller.placeCard('card2', 'important_not_urgent');
      controller.placeCard('card3', 'not_important_urgent');

      expect(controller.isAllSorted()).toBe(true);
    });

    test('進捗率を取得できる', () => {
      expect(controller.getProgress()).toBe(0);

      controller.placeCard('card1', 'important_urgent');
      expect(controller.getProgress()).toBe(33); // 1/3

      controller.placeCard('card2', 'important_urgent');
      expect(controller.getProgress()).toBe(67); // 2/3

      controller.placeCard('card3', 'important_urgent');
      expect(controller.getProgress()).toBe(100); // 3/3
    });
  });

  describe('サマリー生成', () => {
    test('カードがない場合', () => {
      const emptyController = new CardSortingController([]);
      const summary = emptyController.generateSummary();

      expect(summary).toBe('まだカードが分類されていません');
    });

    test('分類されていない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toBe('まだカードが分類されていません');
    });

    test('一部分類された場合', () => {
      controller.placeCard('card1', 'important_urgent');

      const summary = controller.generateSummary();

      expect(summary).toContain('3枚中1枚');
    });

    test('全て分類された場合', () => {
      controller.placeCard('card1', 'important_urgent');
      controller.placeCard('card2', 'important_not_urgent');
      controller.placeCard('card3', 'not_important_urgent');

      const summary = controller.generateSummary();

      expect(summary).toContain('3枚のカードを全て分類しました');
    });
  });

  describe('WidgetResult生成', () => {
    test('基本的な結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('card_sorting');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('mapping');
    });

    test('配置されたカードの情報が含まれる', () => {
      controller.placeCard('card1', 'important_urgent');
      controller.placeCard('card2', 'important_not_urgent');

      const result = controller.getResult('widget_1');

      expect(result.data.mapping?.items).toHaveLength(3);
      expect(result.data.composite?.progress).toBe(67);
      expect(result.data.composite?.isComplete).toBe(false);
    });

    test('メタデータが含まれる', () => {
      const result = controller.getResult('widget_1');

      expect(result.metadata?.cardCount).toBe(3);
      expect(result.metadata?.categoryCount).toBe(4);
    });

    test('インタラクション履歴が含まれる', () => {
      controller.placeCard('card1', 'important_urgent');
      controller.placeCard('card2', 'important_not_urgent');

      const result = controller.getResult('widget_1');

      expect(result.interactions).toHaveLength(2);
      expect(result.interactions?.[0].action).toBe('drag');
    });
  });

  describe('リセット', () => {
    test('リセット後は初期状態に戻る', () => {
      controller.placeCard('card1', 'important_urgent');
      controller.placeCard('card2', 'important_not_urgent');

      controller.reset();

      const state = controller.getState();
      expect(state.placements).toEqual([]);
      expect(controller.getProgress()).toBe(0);
    });
  });
});
