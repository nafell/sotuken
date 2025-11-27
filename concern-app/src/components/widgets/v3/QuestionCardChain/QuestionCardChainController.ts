/**
 * QuestionCardChainController.ts
 * 質問カード連鎖Widgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * 連続的な質問を表示し、思考を深めるWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * 質問カードの定義
 */
export interface QuestionCard {
  id: string;
  question: string;
  hint?: string;
  category: 'why' | 'what' | 'how' | 'when' | 'who' | 'where';
  depth: number; // 質問の深さ（0から開始）
}

/**
 * 回答の定義
 */
export interface Answer {
  questionId: string;
  text: string;
  timestamp: number;
}

/**
 * QuestionCardChainの状態
 */
export interface QuestionCardChainState {
  questions: QuestionCard[];
  answers: Answer[];
  currentQuestionIndex: number;
  isComplete: boolean;
}

/**
 * デフォルトの質問テンプレート
 */
export const DEFAULT_QUESTIONS: QuestionCard[] = [
  {
    id: 'q1',
    question: 'この問題で一番気になっていることは何ですか？',
    hint: '最初に頭に浮かぶことを書いてみてください',
    category: 'what',
    depth: 0,
  },
  {
    id: 'q2',
    question: 'それはなぜ気になっているのですか？',
    hint: '理由や背景を考えてみましょう',
    category: 'why',
    depth: 1,
  },
  {
    id: 'q3',
    question: 'いつ頃からそう感じていますか？',
    hint: 'きっかけや時期を思い出してみてください',
    category: 'when',
    depth: 1,
  },
  {
    id: 'q4',
    question: '理想の状態はどのようなものですか？',
    hint: '解決したらどうなっていたいか想像してみましょう',
    category: 'what',
    depth: 2,
  },
  {
    id: 'q5',
    question: '今までに試したことはありますか？',
    hint: '過去のアクションを振り返ってみてください',
    category: 'how',
    depth: 2,
  },
];

/**
 * 質問カテゴリの色
 */
export const CATEGORY_COLORS: Record<QuestionCard['category'], string> = {
  why: '#ef4444',   // Red
  what: '#3b82f6',  // Blue
  how: '#22c55e',   // Green
  when: '#f59e0b',  // Amber
  who: '#a855f7',   // Purple
  where: '#06b6d4', // Cyan
};

/**
 * 質問カテゴリの日本語ラベル
 */
export const CATEGORY_LABELS: Record<QuestionCard['category'], string> = {
  why: 'なぜ',
  what: '何',
  how: 'どうやって',
  when: 'いつ',
  who: '誰',
  where: 'どこ',
};

/**
 * QuestionCardChainController
 * 質問カード連鎖のロジック管理
 */
export class QuestionCardChainController {
  private state: QuestionCardChainState;

  constructor(customQuestions?: QuestionCard[]) {
    this.state = {
      questions: customQuestions || DEFAULT_QUESTIONS,
      answers: [],
      currentQuestionIndex: 0,
      isComplete: false,
    };
  }

  /**
   * 質問リストを設定
   */
  public setQuestions(questions: QuestionCard[]): void {
    this.state.questions = questions;
    this.state.answers = [];
    this.state.currentQuestionIndex = 0;
    this.state.isComplete = false;
  }

  /**
   * 現在の質問を取得
   */
  public getCurrentQuestion(): QuestionCard | null {
    if (this.state.currentQuestionIndex >= this.state.questions.length) {
      return null;
    }
    return this.state.questions[this.state.currentQuestionIndex];
  }

  /**
   * 回答を追加
   */
  public addAnswer(text: string): void {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      throw new Error('No current question');
    }

    // 同じ質問への既存の回答を削除
    this.state.answers = this.state.answers.filter(
      (a) => a.questionId !== currentQuestion.id
    );

    // 新しい回答を追加
    this.state.answers.push({
      questionId: currentQuestion.id,
      text,
      timestamp: Date.now(),
    });
  }

  /**
   * 次の質問へ進む
   */
  public nextQuestion(): boolean {
    if (this.state.currentQuestionIndex >= this.state.questions.length - 1) {
      this.state.isComplete = true;
      return false;
    }
    this.state.currentQuestionIndex++;
    return true;
  }

  /**
   * 前の質問へ戻る
   */
  public prevQuestion(): boolean {
    if (this.state.currentQuestionIndex <= 0) {
      return false;
    }
    this.state.currentQuestionIndex--;
    return true;
  }

  /**
   * 特定の質問へジャンプ
   */
  public goToQuestion(index: number): void {
    if (index < 0 || index >= this.state.questions.length) {
      throw new Error('Invalid question index');
    }
    this.state.currentQuestionIndex = index;
  }

  /**
   * 質問への回答を取得
   */
  public getAnswerForQuestion(questionId: string): Answer | undefined {
    return this.state.answers.find((a) => a.questionId === questionId);
  }

  /**
   * 全ての質問に回答したかどうか
   */
  public isAllAnswered(): boolean {
    return this.state.questions.every((q) =>
      this.state.answers.some((a) => a.questionId === q.id && a.text.trim() !== '')
    );
  }

  /**
   * 現在の状態を取得
   */
  public getState(): QuestionCardChainState {
    return { ...this.state };
  }

  /**
   * 進捗を取得（パーセンテージ）
   */
  public getProgress(): number {
    const answeredCount = this.state.questions.filter((q) =>
      this.state.answers.some((a) => a.questionId === q.id && a.text.trim() !== '')
    ).length;
    return Math.round((answeredCount / this.state.questions.length) * 100);
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const answeredCount = this.state.answers.filter((a) => a.text.trim() !== '').length;
    const totalCount = this.state.questions.length;

    if (answeredCount === 0) {
      return 'まだ回答がありません';
    }

    if (answeredCount === totalCount) {
      return `${totalCount}個の質問すべてに回答しました`;
    }

    return `${totalCount}個中${answeredCount}個の質問に回答しました`;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    // 質問と回答をペアにした構造を作成
    const qaItems = this.state.questions.map((q) => {
      const answer = this.getAnswerForQuestion(q.id);
      return {
        questionId: q.id,
        question: q.question,
        category: q.category,
        depth: q.depth,
        answer: answer?.text || '',
        answeredAt: answer?.timestamp || null,
      };
    });

    // カテゴリごとの回答集計
    const categoryBreakdown: Record<string, string[]> = {};
    qaItems.forEach((qa) => {
      if (qa.answer) {
        if (!categoryBreakdown[qa.category]) {
          categoryBreakdown[qa.category] = [];
        }
        categoryBreakdown[qa.category].push(qa.answer);
      }
    });

    return {
      widgetId,
      component: 'question_card_chain',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'composite',
        composite: {
          qaItems,
          totalQuestions: this.state.questions.length,
          answeredCount: this.state.answers.filter((a) => a.text.trim() !== '').length,
          progress: this.getProgress(),
          categoryBreakdown,
          isComplete: this.state.isComplete,
        },
      },
      interactions: this.state.answers.map((a) => ({
        timestamp: a.timestamp,
        action: 'input' as const,
        target: a.questionId,
        value: a.text,
      })),
      metadata: {
        questionCount: this.state.questions.length,
        categories: [...new Set(this.state.questions.map((q) => q.category))],
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.answers = [];
    this.state.currentQuestionIndex = 0;
    this.state.isComplete = false;
  }
}
