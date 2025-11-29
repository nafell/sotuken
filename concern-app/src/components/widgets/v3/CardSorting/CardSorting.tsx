/**
 * CardSorting.tsx
 * カード仕分けWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * カードをカテゴリにドラッグ＆ドロップで仕分けるWidget
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  CardSortingController,
  DEFAULT_CATEGORIES,
  DEFAULT_CARDS,
  type SortingCard,
  type SortingCategory,
} from './CardSortingController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './CardSorting.module.css';

/**
 * CardSorting Component
 */
export const CardSorting: React.FC<BaseWidgetProps> = ({
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

  const [, forceUpdate] = useState({});
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const controllerRef = useRef<CardSortingController>(
    new CardSortingController()
  );

  // configからカードとカテゴリを設定
  useEffect(() => {
    const cards = spec.config.cards as SortingCard[] | undefined;
    const categories = spec.config.categories as SortingCategory[] | undefined;

    if (cards && cards.length > 0) {
      controllerRef.current.setCards(cards);
    } else {
      controllerRef.current.setCards(DEFAULT_CARDS);
    }

    if (categories && categories.length > 0) {
      controllerRef.current.setCategories(categories);
    } else {
      controllerRef.current.setCategories(DEFAULT_CATEGORIES);
    }

    forceUpdate({});
  }, [spec.config.cards, spec.config.categories]);

  const state = controllerRef.current.getState();
  const unsortedCards = controllerRef.current.getUnsortedCards();
  const progress = controllerRef.current.getProgress();
  const isAllSorted = controllerRef.current.isAllSorted();

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    emitPort('cards', controllerRef.current.getState().cards);
    emitPort('summary', controllerRef.current.generateSummary());
    emitPort('progress', controllerRef.current.getProgress());
  }, [emitPort]);

  /**
   * ドラッグ開始
   */
  const handleDragStart = useCallback((cardId: string) => {
    setDraggedCardId(cardId);
  }, []);

  /**
   * ドラッグ終了
   */
  const handleDragEnd = useCallback(() => {
    setDraggedCardId(null);
    setDragOverCategory(null);
  }, []);

  /**
   * カテゴリへのドラッグオーバー
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent, categoryId: string | null) => {
      e.preventDefault();
      setDragOverCategory(categoryId);
    },
    []
  );

  /**
   * カテゴリへのドロップ
   */
  const handleDrop = useCallback(
    (categoryId: string | null) => {
      if (draggedCardId) {
        try {
          controllerRef.current.placeCard(draggedCardId, categoryId);
          forceUpdate({});

          // Reactive Port出力
          emitAllPorts();

          // 親に通知
          if (onUpdate) {
            const result = controllerRef.current.getResult(spec.id);
            onUpdate(spec.id, result.data);
          }
        } catch (error) {
          console.error('Failed to place card:', error);
        }
      }
      setDraggedCardId(null);
      setDragOverCategory(null);
    },
    [draggedCardId, emitAllPorts, onUpdate, spec.id]
  );

  /**
   * カードの配置解除
   */
  const handleRemoveCard = useCallback(
    (cardId: string) => {
      controllerRef.current.unplaceCard(cardId);
      forceUpdate({});

      // Reactive Port出力
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [emitAllPorts, onUpdate, spec.id]
  );

  /**
   * リセット
   */
  const handleReset = useCallback(() => {
    controllerRef.current.reset();
    forceUpdate({});

    // Reactive Port出力
    emitAllPorts();

    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [emitAllPorts, onUpdate, spec.id]);

  /**
   * 完了
   */
  const handleComplete = useCallback(() => {
    if (!isAllSorted) {
      setError(true, ['全てのカードを分類してください']);
      return;
    }

    setError(false);
    setCompleted(true);

    if (onComplete) {
      onComplete(spec.id);
    }
  }, [isAllSorted, setError, setCompleted, onComplete, spec.id]);

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
    <div className={styles.container} role="region" aria-label="カード仕分け" data-testid="card-sorting-container">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {spec.config.title || 'カードを分類してください'}
        </h2>
        <p className={styles.description}>
          {spec.config.description || 'ドラッグ＆ドロップでカードを適切なカテゴリに仕分けましょう'}
        </p>
      </div>

      {/* Progress */}
      <div className={styles.progressContainer} data-testid="card-sorting-progress">
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={styles.progressText}>
          {progress}% 完了 ({state.cards.length - unsortedCards.length} / {state.cards.length})
        </div>
      </div>

      <div className={styles.sortingArea}>
        {/* Unsorted cards */}
        <div
          className={styles.unsortedSection}
          onDragOver={(e) => handleDragOver(e, null)}
          onDrop={() => handleDrop(null)}
          style={{
            backgroundColor: dragOverCategory === null ? '#f1f5f9' : '#f8fafc',
          }}
          data-testid="card-sorting-unsorted"
        >
          <h3 className={styles.sectionTitle}>
            未分類のカード
            <span className={styles.cardCount}>({unsortedCards.length}枚)</span>
          </h3>
          <div className={styles.cardsContainer}>
            {unsortedCards.length === 0 ? (
              <div className={styles.emptyState}>
                全てのカードが分類されました
              </div>
            ) : (
              unsortedCards.map((card) => (
                <div
                  key={card.id}
                  className={`${styles.card} ${draggedCardId === card.id ? styles.cardDragging : ''
                    }`}
                  draggable
                  onDragStart={() => handleDragStart(card.id)}
                  onDragEnd={handleDragEnd}
                  style={{ backgroundColor: card.color }}
                  title={card.description}
                  data-testid={`card-sorting-card-${card.id}`}
                >
                  {card.label}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Categories */}
        <div className={styles.categoriesGrid}>
          {state.categories.map((category) => {
            const cardsInCategory = controllerRef.current.getCardsInCategory(
              category.id
            );
            return (
              <div
                key={category.id}
                className={`${styles.categoryBox} ${dragOverCategory === category.id
                  ? styles.categoryBoxDragOver
                  : ''
                  }`}
                style={{
                  backgroundColor: `${category.color}20`,
                  borderColor: category.color,
                }}
                onDragOver={(e) => handleDragOver(e, category.id)}
                onDrop={() => handleDrop(category.id)}
                data-testid={`card-sorting-category-${category.id}`}
              >
                <div className={styles.categoryHeader}>
                  <h4 className={styles.categoryLabel}>{category.label}</h4>
                  {category.description && (
                    <p className={styles.categoryDescription}>
                      {category.description}
                    </p>
                  )}
                </div>
                <div className={styles.cardsContainer}>
                  {cardsInCategory.length === 0 ? (
                    <div className={styles.emptyState}>
                      ここにドロップ
                    </div>
                  ) : (
                    cardsInCategory.map((card) => (
                      <div
                        key={card.id}
                        className={`${styles.card} ${styles.cardInCategory} ${draggedCardId === card.id ? styles.cardDragging : ''
                          }`}
                        draggable
                        onDragStart={() => handleDragStart(card.id)}
                        onDragEnd={handleDragEnd}
                        style={{ color: category.color }}
                        title={card.description}
                        data-testid={`card-sorting-card-${card.id}`}
                      >
                        {card.label}
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveCard(card.id)}
                          aria-label={`${card.label}を未分類に戻す`}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.resetButton}
          onClick={handleReset}
          aria-label="分類をリセット"
          data-testid="card-sorting-reset-btn"
        >
          リセット
        </button>
        <button
          className={styles.completeButton}
          onClick={handleComplete}
          disabled={!isAllSorted}
          aria-label="完了"
          data-testid="card-sorting-complete-btn"
        >
          {isAllSorted ? '完了' : '全てのカードを分類してください'}
        </button>
      </div>
    </div>
  );
};

export default CardSorting;
