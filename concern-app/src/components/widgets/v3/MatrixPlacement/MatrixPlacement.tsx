/**
 * MatrixPlacement.tsx
 * マトリックス配置Widget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 2軸のマトリックス上にアイテムを配置するWidget
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  MatrixPlacementController,
  type MatrixItem,
} from './MatrixPlacementController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './MatrixPlacement.module.css';

/**
 * MatrixPlacement Component
 */
export const MatrixPlacement: React.FC<BaseWidgetProps> = ({
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
   * マトリックス内でのクリックでアイテムを配置
   */
  const handleMatrixClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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

        // Reactive Port出力
        emitAllPorts();

        if (onUpdate) {
          const result = controllerRef.current.getResult(spec.id);
          onUpdate(spec.id, result.data);
        }
      } catch (error) {
        console.error('Failed to update position:', error);
      }
    }
  }, [draggingItemId, items, emitAllPorts, onUpdate, spec.id]);

  /**
   * ドラッグ開始
   */
  const handleMouseDown = (itemId: string) => {
    setDraggingItemId(itemId);
  };

  /**
   * ドラッグ中
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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
  }, [draggingItemId]);

  /**
   * ドラッグ終了
   */
  const handleMouseUp = useCallback(() => {
    if (draggingItemId) {
      // Reactive Port出力
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
    setDraggingItemId(null);
  }, [draggingItemId, emitAllPorts, onUpdate, spec.id]);

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
      setError(true, ['少なくとも1つのアイテムを配置してください']);
      alert('少なくとも1つのアイテムを配置してください');
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

  const state = controllerRef.current.getState();

  return (
    <div className={styles.container} role="region" aria-label="マトリックス配置" data-testid="matrix-container">
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
            data-testid="matrix-grid"
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
                data-testid={`matrix-item-${item.id}`}
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
          data-testid="matrix-item-input"
        />
        <button
          onClick={handleAddItem}
          disabled={newItemLabel.trim() === ''}
          className={styles.addButton}
          aria-label="アイテムを追加"
          data-testid="matrix-add-btn"
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
          data-testid="matrix-complete-btn"
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
  'data-testid'?: string;
}

const MatrixItemComponent: React.FC<MatrixItemComponentProps> = ({
  item,
  isDragging,
  onMouseDown,
  onDelete,
  ...props
}) => {
  const isHighPriority = item.position.x > 0.5 && item.position.y > 0.5;

  return (
    <div
      className={`${styles.item} ${isDragging ? styles.itemDragging : ''} ${isHighPriority ? styles.itemHighPriority : ''
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
      data-testid={props['data-testid']}
    >
      <span className={styles.itemLabel}>{item.label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className={styles.deleteButton}
        aria-label={`${item.label}を削除`}
        data-testid={`matrix-delete-${item.id}`}
      >
        ×
      </button>
    </div>
  );
};

export default MatrixPlacement;
