/**
 * QuestionCardChain.tsx
 * 質問カード連鎖Widget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 連続的な質問を表示し、思考を深めるWidget
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  QuestionCardChainController,
  DEFAULT_QUESTIONS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type QuestionCard,
} from './QuestionCardChainController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './QuestionCardChain.module.css';

/**
 * QuestionCardChain Component
 */
export const QuestionCardChain: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
  onPortChange,
  getPortValue,
  initialPortValues,
}) => {
  // Reactive Ports
  const { emitPort, setCompleted, setError } = useReactivePorts({
    widgetId: spec.id,
    onPortChange,
    getPortValue,
    initialPortValues,
  });

  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const controllerRef = useRef<QuestionCardChainController>(
    new QuestionCardChainController()
  );

  // configから質問を設定
  useEffect(() => {
    const questions = spec.config.questions as QuestionCard[] | undefined;
    if (questions && questions.length > 0) {
      controllerRef.current.setQuestions(questions);
    } else {
      controllerRef.current.setQuestions(DEFAULT_QUESTIONS);
    }
    setCurrentIndex(0);
    setCurrentAnswer('');
  }, [spec.config.questions]);

  const state = controllerRef.current.getState();
  const currentQuestion = controllerRef.current.getCurrentQuestion();
  const progress = controllerRef.current.getProgress();
  const isAllAnswered = controllerRef.current.isAllAnswered();

  // 現在の質問の既存回答を取得
  useEffect(() => {
    if (currentQuestion) {
      const existingAnswer = controllerRef.current.getAnswerForQuestion(currentQuestion.id);
      setCurrentAnswer(existingAnswer?.text || '');
    }
  }, [currentIndex, currentQuestion?.id]);

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    emitPort('answers', controllerRef.current.getState().answers);
    emitPort('summary', controllerRef.current.generateSummary());
    emitPort('progress', controllerRef.current.getProgress());
  }, [emitPort]);

  /**
   * 回答変更ハンドラ
   */
  const handleAnswerChange = useCallback((text: string) => {
    setCurrentAnswer(text);
  }, []);

  /**
   * 回答保存
   */
  const saveCurrentAnswer = useCallback(() => {
    if (currentAnswer.trim()) {
      controllerRef.current.addAnswer(currentAnswer);
      // Reactive Port出力
      emitAllPorts();
    }
  }, [currentAnswer, emitAllPorts]);

  /**
   * 次の質問へ
   */
  const handleNext = useCallback(() => {
    saveCurrentAnswer();

    if (controllerRef.current.nextQuestion()) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentAnswer('');
    } else {
      // 最後の質問
      setShowSummary(true);
    }

    // 親に通知
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [saveCurrentAnswer, onUpdate, spec.id]);

  /**
   * 前の質問へ
   */
  const handlePrev = useCallback(() => {
    saveCurrentAnswer();

    if (controllerRef.current.prevQuestion()) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [saveCurrentAnswer]);

  /**
   * 特定の質問へジャンプ
   */
  const handleGoTo = useCallback((index: number) => {
    saveCurrentAnswer();
    controllerRef.current.goToQuestion(index);
    setCurrentIndex(index);
    setShowSummary(false);
  }, [saveCurrentAnswer]);

  /**
   * 完了ハンドラ
   */
  const handleComplete = useCallback(() => {
    saveCurrentAnswer();

    if (!isAllAnswered) {
      setError(true, ['全ての質問に回答してください']);
      return;
    }

    setError(false);
    setCompleted(true);

    if (onComplete) {
      onComplete(spec.id);
    }
  }, [saveCurrentAnswer, isAllAnswered, setError, setCompleted, onComplete, spec.id]);

  /**
   * 結果取得
   */
  /**
   * 結果取得
   */
  const getResult = useCallback((): WidgetResult => {
    return controllerRef.current.getResult(spec.id);
  }, [spec.id]);

  // 外部から結果を取得できるようにrefを設定
  useEffect(() => {
    (window as any)[`widget_${spec.id}_getResult`] = getResult;
    return () => {
      delete (window as any)[`widget_${spec.id}_getResult`];
    };
  }, [spec.id, getResult]);

  return (
    <div className={styles.container} role="region" aria-label="質問カード" data-testid="qcc-container">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {spec.config.title || '思考を深める質問'}
        </h2>
        <p className={styles.description}>
          {spec.config.description || '各質問に答えながら、考えを整理していきましょう'}
        </p>
      </div>

      {/* Progress bar */}
      <div className={styles.progressContainer} data-testid="qcc-progress-bar">
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={styles.progressText}>
          <span>進捗: {progress}%</span>
          <span>
            {state.answers.filter((a) => a.text.trim()).length} / {state.questions.length} 回答済み
          </span>
        </div>
      </div>

      {/* Current question card or summary */}
      {!showSummary && currentQuestion ? (
        <>
          <div
            className={styles.questionCard}
            style={{ borderLeftColor: CATEGORY_COLORS[currentQuestion.category] }}
          >
            <div className={styles.questionHeader}>
              <span
                className={styles.categoryBadge}
                style={{ backgroundColor: CATEGORY_COLORS[currentQuestion.category] }}
              >
                {CATEGORY_LABELS[currentQuestion.category]}
              </span>
              <span className={styles.questionNumber} data-testid="qcc-question-number">
                質問 {currentIndex + 1} / {state.questions.length}
              </span>
            </div>
            <p className={styles.questionText} data-testid="qcc-question-text">{currentQuestion.question}</p>
            {currentQuestion.hint && (
              <p className={styles.hint}>{currentQuestion.hint}</p>
            )}
            <div className={styles.answerSection}>
              <textarea
                className={styles.answerTextarea}
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="ここに回答を入力..."
                aria-label={`質問「${currentQuestion.question}」への回答`}
                data-testid="qcc-answer-textarea"
              />
              <div className={styles.charCount}>
                {currentAnswer.length} 文字
              </div>
            </div>
          </div>

          {/* Navigation dots */}
          <div className={styles.navigationDots} role="tablist">
            {state.questions.map((q, idx) => {
              const hasAnswer = state.answers.some(
                (a) => a.questionId === q.id && a.text.trim() !== ''
              );
              return (
                <button
                  key={q.id}
                  className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ''
                    } ${hasAnswer && idx !== currentIndex ? styles.dotAnswered : ''}`}
                  onClick={() => handleGoTo(idx)}
                  aria-label={`質問${idx + 1}へ移動${hasAnswer ? '（回答済み）' : ''}`}
                  role="tab"
                  aria-selected={idx === currentIndex}
                  data-testid={`qcc-nav-dot-${idx}`}
                />
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div className={styles.navigationButtons}>
            <button
              className={`${styles.navButton} ${styles.prevButton}`}
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="前の質問"
              data-testid="qcc-prev-btn"
            >
              前へ
            </button>
            <button
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={handleNext}
              aria-label={
                currentIndex === state.questions.length - 1
                  ? '回答を確認'
                  : '次の質問'
              }
              data-testid="qcc-next-btn"
            >
              {currentIndex === state.questions.length - 1 ? '確認' : '次へ'}
            </button>
          </div>
        </>
      ) : (
        /* Summary view */
        <div className={styles.completeSection}>
          <h3 className={styles.completeTitle}>回答の確認</h3>
          <p className={styles.completeText}>
            {controllerRef.current.generateSummary()}
          </p>

          {/* Answers summary */}
          <div className={styles.answersSummary}>
            <h4 className={styles.summaryTitle}>あなたの回答</h4>
            {state.questions.map((q, idx) => {
              const answer = controllerRef.current.getAnswerForQuestion(q.id);
              return (
                <div
                  key={q.id}
                  className={styles.summaryItem}
                  onClick={() => handleGoTo(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <p className={styles.summaryQuestion}>
                    Q{idx + 1}: {q.question}
                  </p>
                  <p className={styles.summaryAnswer}>
                    {answer?.text || <em style={{ color: '#9ca3af' }}>未回答</em>}
                  </p>
                </div>
              );
            })}
          </div>

          <button
            className={styles.completeButton}
            onClick={handleComplete}
            disabled={!isAllAnswered}
            aria-label="完了"
            data-testid="qcc-complete-btn"
            style={{
              marginTop: '1rem',
              opacity: isAllAnswered ? 1 : 0.5,
              cursor: isAllAnswered ? 'pointer' : 'not-allowed',
            }}
          >
            {isAllAnswered ? '完了' : '全ての質問に回答してください'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionCardChain;
