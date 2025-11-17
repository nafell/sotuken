/**
 * BrainstormCards.tsx
 * ブレインストームカードWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 自由にアイデアカードを追加・編集・削除できるWidget
 */

import React, { useEffect, useRef, useState } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  BrainstormCardsController,
  type BrainstormCard,
} from './BrainstormCardsController';
import styles from './BrainstormCards.module.css';

/**
 * BrainstormCards Component
 */
export const BrainstormCards: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
}) => {
  const [cards, setCards] = useState<BrainstormCard[]>([]);
  const [newCardText, setNewCardText] = useState<string>('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const controllerRef = useRef<BrainstormCardsController>(
    new BrainstormCardsController({ maxCards: spec.config?.maxCards || 20 })
  );

  /**
   * カード追加ハンドラー
   */
  const handleAddCard = () => {
    if (newCardText.trim() === '') return;

    try {
      controllerRef.current.addCard(newCardText);
      setCards(controllerRef.current.getCards());
      setNewCardText('');

      // 親コンポーネントに通知
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

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
  const handleSaveEdit = () => {
    if (!editingCardId) return;

    try {
      controllerRef.current.editCard(editingCardId, editingText);
      setCards(controllerRef.current.getCards());
      setEditingCardId(null);
      setEditingText('');

      // 親コンポーネントに通知
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

  /**
   * カード削除ハンドラー
   */
  const handleDeleteCard = (cardId: string) => {
    if (confirm('このカードを削除しますか？')) {
      controllerRef.current.deleteCard(cardId);
      setCards(controllerRef.current.getCards());

      // 親コンポーネントに通知
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
  };

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
  const handleComplete = () => {
    if (cards.length === 0) {
      alert('少なくとも1つのアイデアを追加してください');
      return;
    }

    if (onComplete) {
      onComplete(spec.id);
    }
  };

  /**
   * 結果取得メソッド（外部から呼び出し可能）
   */
  const getResult = (): WidgetResult => {
    return controllerRef.current.getResult(spec.id);
  };

  // 外部から結果を取得できるようにrefを設定
  useEffect(() => {
    (window as any)[`widget_${spec.id}_getResult`] = getResult;
    return () => {
      delete (window as any)[`widget_${spec.id}_getResult`];
    };
  }, [spec.id, cards]);

  return (
    <div className={styles.container} role="region" aria-label="ブレインストーム">
      <div className={styles.header}>
        <h2 className={styles.title}>アイデアを自由に書き出してください</h2>
        <p className={styles.description}>
          思いついたことをどんどんカードに書き出しましょう
        </p>
        <div className={styles.counter}>
          {cards.length} / {spec.config?.maxCards || 20} カード
        </div>
      </div>

      {/* カード一覧 */}
      <div className={styles.cardsGrid} role="list" aria-label="アイデアカード一覧">
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
            />
            <button
              onClick={handleAddCard}
              disabled={newCardText.trim() === ''}
              className={styles.addButton}
              aria-label="カードを追加"
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
    <div className={styles.card} role="listitem">
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
            >
              編集
            </button>
            <button
              onClick={() => onDelete(card.id)}
              className={styles.deleteButton}
              aria-label={`カード「${card.text}」を削除`}
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
