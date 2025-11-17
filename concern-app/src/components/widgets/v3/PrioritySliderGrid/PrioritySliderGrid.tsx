/**
 * PrioritySliderGrid.tsx
 * 優先度スライダーグリッドWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * アイテムに優先度スコアを付与して整理するWidget
 */

import React, { useEffect, useRef, useState } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  PrioritySliderGridController,
  type PriorityItem,
} from './PrioritySliderGridController';
import styles from './PrioritySliderGrid.module.css';

/**
 * PrioritySliderGrid Component
 */
export const PrioritySliderGrid: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
}) => {
  const [items, setItems] = useState<PriorityItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState<string>('');

  const controllerRef = useRef<PrioritySliderGridController>(
    new PrioritySliderGridController({
      maxItems: spec.config?.maxItems || 20,
    })
  );

  /**
   * アイテム追加ハンドラー
   */
  const handleAddItem = () => {
    if (newItemLabel.trim() === '') return;

    try {
      controllerRef.current.addItem(newItemLabel);
      setItems(controllerRef.current.getItems());
      setNewItemLabel('');

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
   * 優先度変更ハンドラー
   */
  const handlePriorityChange = (itemId: string, value: number) => {
    try {
      // スライダーは0-100の整数値、0.0-1.0に正規化
      const normalizedValue = value / 100;
      controllerRef.current.updateItemPriority(itemId, normalizedValue);
      setItems(controllerRef.current.getItems());

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  /**
   * アイテム削除ハンドラー
   */
  const handleDeleteItem = (itemId: string) => {
    if (confirm('このアイテムを削除しますか？')) {
      controllerRef.current.deleteItem(itemId);
      setItems(controllerRef.current.getItems());

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
  };

  /**
   * Enterキーでアイテム追加
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  /**
   * 完了ハンドラー
   */
  const handleComplete = () => {
    if (items.length === 0) {
      alert('少なくとも1つのアイテムを追加してください');
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
  }, [spec.id, items]);

  // 優先度でソートしたアイテムを取得
  const sortedItems = controllerRef.current.getItemsSortedByPriority();
  const distribution = controllerRef.current.getPriorityDistribution();
  const avgPriority = Math.round(
    controllerRef.current.getAveragePriority() * 100
  );

  return (
    <div
      className={styles.container}
      role="region"
      aria-label="優先度スライダーグリッド"
    >
      <div className={styles.header}>
        <h2 className={styles.title}>アイテムに優先度を設定してください</h2>
        <p className={styles.description}>
          {items.length} / {spec.config?.maxItems || 20} アイテム
        </p>
      </div>

      {/* アイテム追加フォーム */}
      <div className={styles.addItemSection}>
        <input
          type="text"
          value={newItemLabel}
          onChange={(e) => setNewItemLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="新しいアイテムを入力..."
          className={styles.addItemInput}
          aria-label="新しいアイテム"
        />
        <button
          onClick={handleAddItem}
          disabled={newItemLabel.trim() === ''}
          className={styles.addButton}
          aria-label="アイテムを追加"
        >
          + 追加
        </button>
      </div>

      {/* 統計情報 */}
      {items.length > 0 && (
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>平均優先度</span>
            <span className={styles.statValue}>{avgPriority}%</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>高優先度</span>
            <span className={styles.statValue}>{distribution.high}個</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>中優先度</span>
            <span className={styles.statValue}>{distribution.medium}個</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>低優先度</span>
            <span className={styles.statValue}>{distribution.low}個</span>
          </div>
        </div>
      )}

      {/* アイテムグリッド */}
      <div className={styles.gridContainer} role="list">
        {sortedItems.length === 0 ? (
          <div className={styles.emptyState}>
            アイテムを追加して優先度を設定しましょう
          </div>
        ) : (
          sortedItems.map((item, index) => (
            <PriorityItemComponent
              key={item.id}
              item={item}
              rank={index + 1}
              onPriorityChange={handlePriorityChange}
              onDelete={handleDeleteItem}
            />
          ))
        )}
      </div>

      {/* サマリー */}
      {items.length > 0 && (
        <div className={styles.summary} role="status" aria-live="polite">
          <p>{controllerRef.current.generateSummary()}</p>
        </div>
      )}

      {/* 完了ボタン */}
      <div className={styles.actions}>
        <button
          onClick={handleComplete}
          disabled={items.length === 0}
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
 * 優先度アイテムコンポーネント
 */
interface PriorityItemComponentProps {
  item: PriorityItem;
  rank: number;
  onPriorityChange: (itemId: string, value: number) => void;
  onDelete: (itemId: string) => void;
}

const PriorityItemComponent: React.FC<PriorityItemComponentProps> = ({
  item,
  rank,
  onPriorityChange,
  onDelete,
}) => {
  const priorityPercent = Math.round(item.priority * 100);
  const priorityLevel =
    item.priority > 0.7 ? 'high' : item.priority >= 0.4 ? 'medium' : 'low';

  return (
    <div
      className={`${styles.item} ${styles[`priority-${priorityLevel}`]}`}
      role="listitem"
    >
      <div className={styles.itemHeader}>
        <span className={styles.rank}>#{rank}</span>
        <span className={styles.itemLabel}>{item.label}</span>
        <button
          onClick={() => onDelete(item.id)}
          className={styles.deleteButton}
          aria-label={`${item.label}を削除`}
        >
          ×
        </button>
      </div>

      <div className={styles.sliderContainer}>
        <label htmlFor={`slider-${item.id}`} className={styles.sliderLabel}>
          優先度: <strong>{priorityPercent}%</strong>
        </label>
        <input
          id={`slider-${item.id}`}
          type="range"
          min="0"
          max="100"
          value={priorityPercent}
          onChange={(e) => onPriorityChange(item.id, parseInt(e.target.value))}
          className={styles.slider}
          aria-label={`${item.label}の優先度`}
        />
        <div className={styles.sliderLabels}>
          <span>低</span>
          <span>高</span>
        </div>
      </div>
    </div>
  );
};

export default PrioritySliderGrid;
