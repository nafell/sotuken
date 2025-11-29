/**
 * BrainstormCards.tsx
 * ブレインストームカードWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 自由にアイデアカードを追加・編集・削除できるWidget
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  BrainstormCardsController,
  type BrainstormCard,
} from './BrainstormCardsController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './BrainstormCards.module.css';

/**
 * BrainstormCards Component
 */
export const BrainstormCards: React.FC<BaseWidgetProps> = ({
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

  const [cards, setCards] = useState<BrainstormCard[]>([]);
  const [newCardText, setNewCardText] = useState<string>('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const controllerRef = useRef<BrainstormCardsController>(
    new BrainstormCardsController({ maxCards: spec.config?.maxCards || 20 })
  );

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    emitPort('cards', controllerRef.current.getCards());
    emitPort('summary', controllerRef.current.generateSummary());
  }, [emitPort]);

  /**
   * カード追加ハンドラー
   */
  const handleAddCard = useCallback(() => {
    if (newCardText.trim() === '') return;

    try {
      controllerRef.current.addCard(newCardText);
      setCards(controllerRef.current.getCards());
      setNewCardText('');

      // Reactive Port出力
      emitAllPorts();

      // 親コンポーネントに通知
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  }, [newCardText, emitAllPorts, onUpdate, spec.id]);

  /**
   * カード編集開始
   */
  const handleStartEdit = (card: BrainstormCard) => {
    setEditingCardId(card.id);
    setEditingText(card.text);
  };

  /**
   * カード編集キャンセル
   */
  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditingText('');
  };

  /**
   * カード編集保存
   */
  const handleSaveEdit = useCallback(() => {
    if (!editingCardId) return;

    try {
      controllerRef.current.editCard(editingCardId, editingText);
      setCards(controllerRef.current.getCards());
      setEditingCardId(null);
      setEditingText('');

      // Reactive Port出力
      emitAllPorts();

      // 親コンポーネントに通知
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  }, [editingCardId, editingText, emitAllPorts, onUpdate, spec.id]);

  /**
   * カード削除ハンドラー
   */
  const handleDeleteCard = useCallback((cardId: string) => {
    if (confirm('このカードを削除しますか？')) {
      controllerRef.current.deleteCard(cardId);
      setCards(controllerRef.current.getCards());

      // Reactive Port出力
      emitAllPorts();

      // 親コンポーネントに通知
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
  }, [emitAllPorts, onUpdate, spec.id]);

  /**
   * Enterキーでカード追加
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddCard();
    }
  };

  /**
   * 編集時のEnterキーハンドラー
   */
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  /**
   * 完了ハンドラー
   */
  const handleComplete = useCallback(() => {
    if (cards.length === 0) {
      setError(true, ['少なくとも1つのアイデアを追加してください']);
      alert('少なくとも1つのアイデアを追加してください');
      return;
    }

    setError(false);
    setCompleted(true);

    if (onComplete) {
      onComplete(spec.id);
    }
  }, [cards.length, setError, setCompleted, onComplete, spec.id]);

  /**
   * 結果取得メソッド（外部から呼び出し可能）
   */
  /**
   * 結果取得メソッド（外部から呼び出し可能）
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
    <div className={styles.container} role="region" aria-label="ブレインストーム" data-testid="brainstorm-cards-container">
      <div className={styles.header}>
        <h2 className={styles.title}>アイデアを自由に書き出してください</h2>
        <p className={styles.description}>
          思いついたことをどんどんカードに書き出しましょう
        </p>
        <div className={styles.counter} data-testid="brainstorm-cards-count">
          {cards.length} / {spec.config?.maxCards || 20} カード
        </div>
      </div>

      {/* カード一覧 */}
      <div className={styles.cardsGrid} role="list" aria-label="アイデアカード一覧" data-testid="brainstorm-cards-list">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            isEditing={editingCardId === card.id}
            editingText={editingText}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onDelete={handleDeleteCard}
            onEditTextChange={setEditingText}
            onEditKeyDown={handleEditKeyDown}
          />
        ))}

        {/* 新規カード追加フォーム */}
        {controllerRef.current.getRemainingCards() > 0 && (
          <div className={styles.newCardContainer} role="listitem">
            <input
              type="text"
              value={newCardText}
              onChange={(e) => setNewCardText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="新しいアイデアを入力..."
              className={styles.newCardInput}
              aria-label="新しいアイデア"
              data-testid="brainstorm-cards-input"
            />
            <button
              onClick={handleAddCard}
              disabled={newCardText.trim() === ''}
              className={styles.addButton}
              aria-label="カードを追加"
              data-testid="brainstorm-cards-add-btn"
            >
              + 追加
            </button>
          </div>
        )}
      </div>

      {/* サマリー */}
      {cards.length > 0 && (
        <div className={styles.summary} role="status" aria-live="polite">
          <p>{controllerRef.current.generateSummary()}</p>
        </div>
      )}

      {/* 完了ボタン */}
      <div className={styles.actions}>
        <button
          onClick={handleComplete}
          disabled={cards.length === 0}
          className={styles.completeButton}
          aria-label="完了"
          data-testid="brainstorm-cards-complete-btn"
        >
          完了
        </button>
      </div>
    </div>
  );
};

/**
 * カードアイテムコンポーネント
 */
interface CardItemProps {
  card: BrainstormCard;
  isEditing: boolean;
  editingText: string;
  onStartEdit: (card: BrainstormCard) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: (cardId: string) => void;
  onEditTextChange: (text: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const CardItem: React.FC<CardItemProps> = ({
  card,
  isEditing,
  editingText,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditTextChange,
  onEditKeyDown,
}) => {
  return (
    <div className={styles.card} role="listitem" data-testid={`brainstorm-cards-item-${card.id}`}>
      {isEditing ? (
        <div className={styles.editMode}>
          <input
            type="text"
            value={editingText}
            onChange={(e) => onEditTextChange(e.target.value)}
            onKeyDown={onEditKeyDown}
            autoFocus
            className={styles.editInput}
            aria-label="カードを編集"
            data-testid="brainstorm-cards-edit-input"
          />
          <div className={styles.editActions}>
            <button
              onClick={onSaveEdit}
              className={styles.saveButton}
              aria-label="保存"
            >
              保存
            </button>
            <button
              onClick={onCancelEdit}
              className={styles.cancelButton}
              aria-label="キャンセル"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.cardText}>{card.text}</div>
          <div className={styles.cardActions}>
            <button
              onClick={() => onStartEdit(card)}
              className={styles.editButton}
              aria-label={`カード「${card.text}」を編集`}
              data-testid={`brainstorm-cards-edit-btn-${card.id}`}
            >
              編集
            </button>
            <button
              onClick={() => onDelete(card.id)}
              className={styles.deleteButton}
              aria-label={`カード「${card.text}」を削除`}
              data-testid={`brainstorm-cards-delete-btn-${card.id}`}
            >
              削除
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BrainstormCards;
