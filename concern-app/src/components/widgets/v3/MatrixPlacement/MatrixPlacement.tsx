/**
 * MatrixPlacement.tsx
 * マトリックス配置Widget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 2軸のマトリックス上にアイテムを配置するWidget
 */

import React, { useEffect, useRef, useState } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  MatrixPlacementController,
  type MatrixItem,
  type MatrixAxis,
} from './MatrixPlacementController';
import styles from './MatrixPlacement.module.css';

/**
 * MatrixPlacement Component
 */
export const MatrixPlacement: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
}) => {
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState<string>('');
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  const controllerRef = useRef<MatrixPlacementController>(
    new MatrixPlacementController({
      xAxis: spec.config?.xAxis || {
        id: 'x',
        label: spec.config?.xAxisLabel || '重要度',
        lowLabel: '低',
        highLabel: '高',
      },
      yAxis: spec.config?.yAxis || {
        id: 'y',
        label: spec.config?.yAxisLabel || '緊急度',
        lowLabel: '低',
        highLabel: '高',
      },
      maxItems: spec.config?.maxItems || 20,
    })
  );

  const matrixRef = useRef<HTMLDivElement>(null);

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
   * マトリックス内でのクリックでアイテムを配置
   */
  const handleMatrixClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!matrixRef.current) return;
    if (draggingItemId) return; // ドラッグ中は無視

    const rect = matrixRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height; // Y軸を反転（下が0、上が1）

    // 最後に追加されたアイテムを移動
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      try {
        controllerRef.current.updateItemPosition(lastItem.id, x, y);
        setItems(controllerRef.current.getItems());

        if (onUpdate) {
          const result = controllerRef.current.getResult(spec.id);
          onUpdate(spec.id, result.data);
        }
      } catch (error) {
        console.error('Failed to update position:', error);
      }
    }
  };

  /**
   * ドラッグ開始
   */
  const handleMouseDown = (itemId: string) => {
    setDraggingItemId(itemId);
  };

  /**
   * ドラッグ中
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingItemId || !matrixRef.current) return;

    const rect = matrixRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = 1 - (e.clientY - rect.top) / rect.height;

    // 範囲制限
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    try {
      controllerRef.current.updateItemPosition(draggingItemId, x, y);
      setItems(controllerRef.current.getItems());
    } catch (error) {
      console.error('Failed to update position:', error);
    }
  };

  /**
   * ドラッグ終了
   */
  const handleMouseUp = () => {
    if (draggingItemId && onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
    setDraggingItemId(null);
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
      alert('少なくとも1つのアイテムを配置してください');
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

  const state = controllerRef.current.getState();

  return (
    <div className={styles.container} role="region" aria-label="マトリックス配置">
      <div className={styles.header}>
        <h2 className={styles.title}>アイテムをマトリックス上に配置してください</h2>
        <p className={styles.description}>
          {items.length} / {spec.config?.maxItems || 20} アイテム
        </p>
      </div>

      {/* マトリックス */}
      <div className={styles.matrixContainer}>
        {/* Y軸ラベル */}
        <div className={styles.yAxisLabel}>
          <span className={styles.axisHigh}>{state.yAxis.highLabel}</span>
          <span className={styles.axisTitle}>{state.yAxis.label}</span>
          <span className={styles.axisLow}>{state.yAxis.lowLabel}</span>
        </div>

        {/* マトリックス本体 */}
        <div className={styles.matrixWrapper}>
          <div
            ref={matrixRef}
            className={styles.matrix}
            onClick={handleMatrixClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            role="grid"
            aria-label="マトリックスグリッド"
          >
            {/* 象限背景 */}
            <div className={`${styles.quadrant} ${styles.topLeft}`} />
            <div className={`${styles.quadrant} ${styles.topRight}`} />
            <div className={`${styles.quadrant} ${styles.bottomLeft}`} />
            <div className={`${styles.quadrant} ${styles.bottomRight}`} />

            {/* 中央線 */}
            <div className={styles.centerLineV} />
            <div className={styles.centerLineH} />

            {/* アイテム */}
            {items.map((item) => (
              <MatrixItemComponent
                key={item.id}
                item={item}
                isDragging={draggingItemId === item.id}
                onMouseDown={handleMouseDown}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>

          {/* X軸ラベル */}
          <div className={styles.xAxisLabel}>
            <span className={styles.axisLow}>{state.xAxis.lowLabel}</span>
            <span className={styles.axisTitle}>{state.xAxis.label}</span>
            <span className={styles.axisHigh}>{state.xAxis.highLabel}</span>
          </div>
        </div>
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
 * マトリックスアイテムコンポーネント
 */
interface MatrixItemComponentProps {
  item: MatrixItem;
  isDragging: boolean;
  onMouseDown: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}

const MatrixItemComponent: React.FC<MatrixItemComponentProps> = ({
  item,
  isDragging,
  onMouseDown,
  onDelete,
}) => {
  const isHighPriority = item.position.x > 0.5 && item.position.y > 0.5;

  return (
    <div
      className={`${styles.item} ${isDragging ? styles.itemDragging : ''} ${
        isHighPriority ? styles.itemHighPriority : ''
      }`}
      style={{
        left: `${item.position.x * 100}%`,
        bottom: `${item.position.y * 100}%`,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(item.id);
      }}
      role="gridcell"
      aria-label={`アイテム: ${item.label}`}
    >
      <span className={styles.itemLabel}>{item.label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className={styles.deleteButton}
        aria-label={`${item.label}を削除`}
      >
        ×
      </button>
    </div>
  );
};

export default MatrixPlacement;
