/**
 * PrioritySliderGrid.tsx
 * 優先度スライダーグリッドWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * アイテムに優先度スコアを付与して整理するWidget
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  PrioritySliderGridController,
  type PriorityItem,
} from './PrioritySliderGridController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './PrioritySliderGrid.module.css';

/**
 * PrioritySliderGrid Component
 */
export const PrioritySliderGrid: React.FC<BaseWidgetProps> = ({
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

  const [items, setItems] = useState<PriorityItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState<string>('');

  const controllerRef = useRef<PrioritySliderGridController>(
    new PrioritySliderGridController({
      maxItems: spec.config?.maxItems || 20,
    })
  );

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    emitPort('items', controllerRef.current.getItems());
    emitPort('summary', controllerRef.current.generateSummary());
  }, [emitPort]);

  /**
   * アイテム追加ハンドラー
   */
  const handleAddItem = useCallback(() => {
    if (newItemLabel.trim() === '') return;

    try {
      controllerRef.current.addItem(newItemLabel);
      setItems(controllerRef.current.getItems());
      setNewItemLabel('');

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
  }, [newItemLabel, emitAllPorts, onUpdate, spec.id]);

  /**
   * 優先度変更ハンドラー
   */
  const handlePriorityChange = useCallback((itemId: string, value: number) => {
    try {
      // スライダーは0-100の整数値、0.0-1.0に正規化
      const normalizedValue = value / 100;
      controllerRef.current.updateItemPriority(itemId, normalizedValue);
      setItems(controllerRef.current.getItems());

      // Reactive Port出力
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  }, [emitAllPorts, onUpdate, spec.id]);

  /**
   * アイテム削除ハンドラー
   */
  const handleDeleteItem = useCallback((itemId: string) => {
    if (confirm('このアイテムを削除しますか？')) {
      controllerRef.current.deleteItem(itemId);
      setItems(controllerRef.current.getItems());

      // Reactive Port出力
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
  }, [emitAllPorts, onUpdate, spec.id]);

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
  const handleComplete = useCallback(() => {
    if (items.length === 0) {
      setError(true, ['少なくとも1つのアイテムを追加してください']);
      alert('少なくとも1つのアイテムを追加してください');
      return;
    }

    setError(false);
    setCompleted(true);

    if (onComplete) {
      onComplete(spec.id);
    }
  }, [items.length, setError, setCompleted, onComplete, spec.id]);

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
      data-testid="psg-container"
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
          data-testid="psg-input"
        />
        <button
          onClick={handleAddItem}
          disabled={newItemLabel.trim() === ''}
          className={styles.addButton}
          aria-label="アイテムを追加"
          data-testid="psg-add-btn"
        >
          + 追加
        </button>
      </div>

      {/* 統計情報 */}
      {items.length > 0 && (
        <div className={styles.stats} data-testid="psg-stats">
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
      <div className={styles.gridContainer} role="list" data-testid="psg-item-list">
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
          data-testid="psg-complete-btn"
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
      data-testid={`psg-item-${item.id}`}
    >
      <div className={styles.itemHeader}>
        <span className={styles.rank}>#{rank}</span>
        <span className={styles.itemLabel}>{item.label}</span>
        <button
          onClick={() => onDelete(item.id)}
          className={styles.deleteButton}
          aria-label={`${item.label}を削除`}
          data-testid={`psg-delete-${item.id}`}
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
          data-testid={`psg-slider-${item.id}`}
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
