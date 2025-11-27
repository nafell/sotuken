/**
 * QuestionCardChainController.test.ts
 * QuestionCardChainControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  QuestionCardChainController,
  DEFAULT_QUESTIONS,
  type QuestionCard,
} from '../QuestionCardChainController';

describe('QuestionCardChainController', () => {
  let controller: QuestionCardChainController;

  beforeEach(() => {
    controller = new QuestionCardChainController();
  });

  describe('初期化', () => {
    test('デフォルトの質問で初期化される', () => {
      const state = controller.getState();

      expect(state.questions).toEqual(DEFAULT_QUESTIONS);
      expect(state.answers).toEqual([]);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.isComplete).toBe(false);
    });

    test('カスタム質問で初期化できる', () => {
      const customQuestions: QuestionCard[] = [
        { id: 'cq1', question: 'カスタム質問1', category: 'what', depth: 0 },
        { id: 'cq2', question: 'カスタム質問2', category: 'why', depth: 1 },
      ];

      const customController = new QuestionCardChainController(customQuestions);
      const state = customController.getState();

      expect(state.questions).toEqual(customQuestions);
    });
  });

  describe('質問設定', () => {
    test('質問リストを設定できる', () => {
      const newQuestions: QuestionCard[] = [
        { id: 'nq1', question: '新しい質問', category: 'how', depth: 0 },
      ];

      controller.setQuestions(newQuestions);
      const state = controller.getState();

      expect(state.questions).toEqual(newQuestions);
      expect(state.answers).toEqual([]);
      expect(state.currentQuestionIndex).toBe(0);
    });
  });

  describe('現在の質問取得', () => {
    test('現在の質問を取得できる', () => {
      const question = controller.getCurrentQuestion();

      expect(question).toBeDefined();
      expect(question?.id).toBe('q1');
    });

    test('質問がない場合はnullを返す', () => {
      const emptyController = new QuestionCardChainController([]);
      const question = emptyController.getCurrentQuestion();
      expect(question).toBeNull();
    });

    test('最後の質問でも質問を返す', () => {
      // 全ての質問を進む（最後の質問に到達）
      for (let i = 0; i < DEFAULT_QUESTIONS.length - 1; i++) {
        controller.nextQuestion();
      }

      const question = controller.getCurrentQuestion();
      expect(question).not.toBeNull();
      expect(question?.id).toBe('q5');
    });
  });

  describe('回答追加', () => {
    test('回答を追加できる', () => {
      controller.addAnswer('テスト回答');

      const state = controller.getState();
      expect(state.answers).toHaveLength(1);
      expect(state.answers[0].text).toBe('テスト回答');
      expect(state.answers[0].questionId).toBe('q1');
    });

    test('同じ質問への回答は上書きされる', () => {
      controller.addAnswer('最初の回答');
      controller.addAnswer('更新された回答');

      const state = controller.getState();
      expect(state.answers).toHaveLength(1);
      expect(state.answers[0].text).toBe('更新された回答');
    });

    test('現在の質問がない場合はエラー', () => {
      const emptyController = new QuestionCardChainController([]);

      expect(() => {
        emptyController.addAnswer('回答');
      }).toThrow('No current question');
    });
  });

  describe('質問ナビゲーション', () => {
    test('次の質問へ進める', () => {
      const result = controller.nextQuestion();

      expect(result).toBe(true);
      expect(controller.getCurrentQuestion()?.id).toBe('q2');
    });

    test('最後の質問の次はfalseを返し完了状態になる', () => {
      for (let i = 0; i < DEFAULT_QUESTIONS.length - 1; i++) {
        controller.nextQuestion();
      }

      const result = controller.nextQuestion();

      expect(result).toBe(false);
      expect(controller.getState().isComplete).toBe(true);
    });

    test('前の質問へ戻れる', () => {
      controller.nextQuestion();
      const result = controller.prevQuestion();

      expect(result).toBe(true);
      expect(controller.getCurrentQuestion()?.id).toBe('q1');
    });

    test('最初の質問より前には戻れない', () => {
      const result = controller.prevQuestion();

      expect(result).toBe(false);
      expect(controller.getCurrentQuestion()?.id).toBe('q1');
    });

    test('特定の質問へジャンプできる', () => {
      controller.goToQuestion(2);

      expect(controller.getCurrentQuestion()?.id).toBe('q3');
    });

    test('無効なインデックスはエラー', () => {
      expect(() => {
        controller.goToQuestion(-1);
      }).toThrow('Invalid question index');

      expect(() => {
        controller.goToQuestion(100);
      }).toThrow('Invalid question index');
    });
  });

  describe('回答取得', () => {
    test('質問IDで回答を取得できる', () => {
      controller.addAnswer('テスト回答');

      const answer = controller.getAnswerForQuestion('q1');

      expect(answer?.text).toBe('テスト回答');
    });

    test('回答がない場合はundefined', () => {
      const answer = controller.getAnswerForQuestion('q1');

      expect(answer).toBeUndefined();
    });
  });

  describe('全回答確認', () => {
    test('全ての質問に回答したらtrue', () => {
      DEFAULT_QUESTIONS.forEach((_, index) => {
        if (index > 0) controller.nextQuestion();
        controller.addAnswer(`回答${index + 1}`);
      });

      expect(controller.isAllAnswered()).toBe(true);
    });

    test('未回答があればfalse', () => {
      controller.addAnswer('回答1');

      expect(controller.isAllAnswered()).toBe(false);
    });

    test('空の回答はカウントされない', () => {
      DEFAULT_QUESTIONS.forEach((_, index) => {
        if (index > 0) controller.nextQuestion();
        controller.addAnswer(index === 0 ? '回答' : '   ');
      });

      expect(controller.isAllAnswered()).toBe(false);
    });
  });

  describe('進捗', () => {
    test('進捗率を取得できる', () => {
      expect(controller.getProgress()).toBe(0);

      controller.addAnswer('回答1');
      expect(controller.getProgress()).toBe(20); // 1/5 = 20%

      controller.nextQuestion();
      controller.addAnswer('回答2');
      expect(controller.getProgress()).toBe(40); // 2/5 = 40%
    });
  });

  describe('サマリー生成', () => {
    test('回答がない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toBe('まだ回答がありません');
    });

    test('一部回答した場合', () => {
      controller.addAnswer('回答1');
      controller.nextQuestion();
      controller.addAnswer('回答2');

      const summary = controller.generateSummary();

      expect(summary).toContain('5個中2個');
    });

    test('全て回答した場合', () => {
      DEFAULT_QUESTIONS.forEach((_, index) => {
        if (index > 0) controller.nextQuestion();
        controller.addAnswer(`回答${index + 1}`);
      });

      const summary = controller.generateSummary();

      expect(summary).toContain('すべてに回答');
    });
  });

  describe('WidgetResult生成', () => {
    test('基本的な結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('question_card_chain');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('composite');
    });

    test('質問と回答のペアが含まれる', () => {
      controller.addAnswer('回答1');
      controller.nextQuestion();
      controller.addAnswer('回答2');

      const result = controller.getResult('widget_1');

      expect(result.data.composite?.qaItems).toHaveLength(5);
      expect(result.data.composite?.answeredCount).toBe(2);
      expect(result.data.composite?.progress).toBe(40);
    });

    test('カテゴリ別の回答が含まれる', () => {
      controller.addAnswer('what回答');
      controller.nextQuestion();
      controller.addAnswer('why回答');

      const result = controller.getResult('widget_1');

      expect(result.data.composite?.categoryBreakdown?.what).toContain('what回答');
      expect(result.data.composite?.categoryBreakdown?.why).toContain('why回答');
    });

    test('メタデータが含まれる', () => {
      const result = controller.getResult('widget_1');

      expect(result.metadata?.questionCount).toBe(5);
      expect(result.metadata?.categories).toBeDefined();
    });

    test('インタラクション履歴が含まれる', () => {
      controller.addAnswer('回答1');
      controller.nextQuestion();
      controller.addAnswer('回答2');

      const result = controller.getResult('widget_1');

      expect(result.interactions).toHaveLength(2);
      expect(result.interactions?.[0].action).toBe('input');
    });
  });

  describe('リセット', () => {
    test('リセット後は初期状態に戻る', () => {
      controller.addAnswer('回答1');
      controller.nextQuestion();
      controller.addAnswer('回答2');
      controller.nextQuestion();

      controller.reset();

      const state = controller.getState();
      expect(state.answers).toEqual([]);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.isComplete).toBe(false);
    });
  });
});
