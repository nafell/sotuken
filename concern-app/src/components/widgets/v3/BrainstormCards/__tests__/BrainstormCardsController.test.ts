/**
 * BrainstormCardsController.test.ts
 * BrainstormCardsControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { BrainstormCardsController } from '../BrainstormCardsController';

describe('BrainstormCardsController', () => {
  let controller: BrainstormCardsController;

  beforeEach(() => {
    controller = new BrainstormCardsController();
  });

  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => {
      const state = controller.getState();

      expect(state.cards).toEqual([]);
      expect(state.maxCards).toBe(20);
    });

    test('初期値を指定して初期化できる', () => {
      const customController = new BrainstormCardsController({
        maxCards: 10,
      });

      const state = customController.getState();

      expect(state.maxCards).toBe(10);
    });

    test('初期カードを指定して初期化できる', () => {
      const initialCards = [
        { id: 'card_1', text: 'Test 1', createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'card_2', text: 'Test 2', createdAt: Date.now(), updatedAt: Date.now() },
      ];

      const customController = new BrainstormCardsController({
        cards: initialCards,
      });

      const state = customController.getState();

      expect(state.cards).toHaveLength(2);
    });
  });

  describe('カード追加', () => {
    test('カードを追加できる', () => {
      const card = controller.addCard('新しいアイデア');

      expect(card.text).toBe('新しいアイデア');
      expect(card.id).toBeDefined();
      expect(card.createdAt).toBeGreaterThan(0);
      expect(card.updatedAt).toBeGreaterThan(0);
    });

    test('前後の空白をトリムして追加する', () => {
      const card = controller.addCard('  テスト  ');

      expect(card.text).toBe('テスト');
    });

    test('空文字列の場合はエラーをthrow', () => {
      expect(() => {
        controller.addCard('');
      }).toThrow('Card text cannot be empty');
    });

    test('空白のみの場合はエラーをthrow', () => {
      expect(() => {
        controller.addCard('   ');
      }).toThrow('Card text cannot be empty');
    });

    test('複数のカードを追加できる', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');
      controller.addCard('アイデア3');

      const cards = controller.getCards();

      expect(cards).toHaveLength(3);
      expect(cards[0].text).toBe('アイデア1');
      expect(cards[1].text).toBe('アイデア2');
      expect(cards[2].text).toBe('アイデア3');
    });

    test('最大数に達した場合はエラーをthrow', () => {
      const smallController = new BrainstormCardsController({ maxCards: 2 });

      smallController.addCard('アイデア1');
      smallController.addCard('アイデア2');

      expect(() => {
        smallController.addCard('アイデア3');
      }).toThrow(/Maximum number of cards/);
    });
  });

  describe('カード編集', () => {
    test('カードを編集できる', () => {
      const card = controller.addCard('元のテキスト');

      controller.editCard(card.id, '編集後のテキスト');

      const updatedCard = controller.getCards().find((c) => c.id === card.id);

      expect(updatedCard?.text).toBe('編集後のテキスト');
      expect(updatedCard?.updatedAt).toBeGreaterThanOrEqual(card.updatedAt);
    });

    test('前後の空白をトリムして編集する', () => {
      const card = controller.addCard('元のテキスト');

      controller.editCard(card.id, '  編集後  ');

      const updatedCard = controller.getCards().find((c) => c.id === card.id);

      expect(updatedCard?.text).toBe('編集後');
    });

    test('空文字列の場合はエラーをthrow', () => {
      const card = controller.addCard('元のテキスト');

      expect(() => {
        controller.editCard(card.id, '');
      }).toThrow('Card text cannot be empty');
    });

    test('存在しないカードIDの場合はエラーをthrow', () => {
      expect(() => {
        controller.editCard('non_existent_id', 'テキスト');
      }).toThrow('Card not found');
    });
  });

  describe('カード削除', () => {
    test('カードを削除できる', () => {
      const card1 = controller.addCard('アイデア1');
      const card2 = controller.addCard('アイデア2');

      controller.deleteCard(card1.id);

      const cards = controller.getCards();

      expect(cards).toHaveLength(1);
      expect(cards[0].id).toBe(card2.id);
    });

    test('存在しないカードIDの場合はエラーをthrow', () => {
      expect(() => {
        controller.deleteCard('non_existent_id');
      }).toThrow('Card not found');
    });

    test('全てのカードを削除できる', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');
      controller.addCard('アイデア3');

      const cards = controller.getCards();

      cards.forEach((card) => {
        controller.deleteCard(card.id);
      });

      expect(controller.getCards()).toHaveLength(0);
    });
  });

  describe('カード取得', () => {
    test('全カードを取得できる', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');

      const cards = controller.getCards();

      expect(cards).toHaveLength(2);
    });

    test('カード数を取得できる', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');

      expect(controller.getCardCount()).toBe(2);
    });

    test('残りカード数を取得できる', () => {
      const smallController = new BrainstormCardsController({ maxCards: 5 });

      smallController.addCard('アイデア1');
      smallController.addCard('アイデア2');

      expect(smallController.getRemainingCards()).toBe(3);
    });
  });

  describe('サマリー生成', () => {
    test('カードがない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toBe('アイデアがまだありません');
    });

    test('カードが1つの場合', () => {
      controller.addCard('最初のアイデア');

      const summary = controller.generateSummary();

      expect(summary).toBe('1つのアイデア: 最初のアイデア');
    });

    test('カードが2つの場合', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');

      const summary = controller.generateSummary();

      expect(summary).toContain('2個のアイデア');
      expect(summary).toContain('アイデア1');
      expect(summary).toContain('アイデア2');
    });

    test('カードが3つの場合', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');
      controller.addCard('アイデア3');

      const summary = controller.generateSummary();

      expect(summary).toContain('3個のアイデア');
    });

    test('カードが4つ以上の場合は省略される', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');
      controller.addCard('アイデア3');
      controller.addCard('アイデア4');

      const summary = controller.generateSummary();

      expect(summary).toContain('4個のアイデア');
      expect(summary).toContain('...など');
    });
  });

  describe('WidgetResult生成', () => {
    test('カードがない場合でも結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('brainstorm_cards');
      expect(result.summary).toBe('アイデアがまだありません');
      expect(result.data.type).toBe('text');
      expect(result.data.text?.structured?.items).toEqual([]);
    });

    test('カードがある場合の結果', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');

      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('brainstorm_cards');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('text');
      expect(result.data.text?.structured?.items).toEqual(['アイデア1', 'アイデア2']);
      expect(result.data.text?.content).toBe('アイデア1\nアイデア2');
    });

    test('メタデータが含まれる', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');

      const result = controller.getResult('widget_1');

      expect(result.metadata?.cardCount).toBe(2);
      expect(result.metadata?.maxCards).toBe(20);
      expect(result.metadata?.totalCharacters).toBeGreaterThan(0);
    });
  });

  describe('リセット', () => {
    test('リセット後は初期状態に戻る', () => {
      controller.addCard('アイデア1');
      controller.addCard('アイデア2');

      controller.reset();

      const state = controller.getState();

      expect(state.cards).toEqual([]);
    });
  });
});
