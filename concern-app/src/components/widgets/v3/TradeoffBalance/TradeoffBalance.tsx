/**
 * TradeoffBalance.tsx
 * トレードオフ天秤Widget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 2つの選択肢の重み付けを視覚化するWidget
 *
 * Reactive Port対応 (Phase 4 Task 2.2):
 * - outputs: balance (number -1〜1), direction (string), recommendation (string)
 * - reserved: _completed, _error
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import { TradeoffBalanceController } from './TradeoffBalanceController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './TradeoffBalance.module.css';

/**
 * TradeoffBalance Component
 */
export const TradeoffBalance: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
  onPortChange,
  getPortValue,
  initialPortValues,
}) => {
  // Reactive Ports
  const { emitPort, setCompleted } = useReactivePorts({
    widgetId: spec.id,
    onPortChange,
    getPortValue,
    initialPortValues,
  });
  const [, forceUpdate] = useState({});
  const [leftLabel, setLeftLabel] = useState(spec.config.leftLabel || '選択肢A');
  const [rightLabel, setRightLabel] = useState(spec.config.rightLabel || '選択肢B');
  const [newLeftItem, setNewLeftItem] = useState('');
  const [newRightItem, setNewRightItem] = useState('');
  const controllerRef = useRef<TradeoffBalanceController>(
    new TradeoffBalanceController(
      spec.config.leftLabel || '選択肢A',
      spec.config.rightLabel || '選択肢B'
    )
  );

  // configから初期アイテムを設定
  useEffect(() => {
    const initialItems = spec.config.items as Array<{
      text: string;
      side: 'left' | 'right';
      weight?: number;
    }> | undefined;

    if (initialItems && initialItems.length > 0) {
      controllerRef.current.reset();
      initialItems.forEach((item) => {
        controllerRef.current.addItem(item.text, item.side, item.weight || 50);
      });
      forceUpdate({});
    }
  }, [spec.config.items]);


  const leftItems = controllerRef.current.getItemsBySide('left');
  const rightItems = controllerRef.current.getItemsBySide('right');
  const tiltAngle = controllerRef.current.getTiltAngle();
  const balanceDirection = controllerRef.current.getBalanceDirection();
  const recommendation = controllerRef.current.getRecommendation();
  const canComplete = leftItems.length > 0 && rightItems.length > 0;

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    // balance: -1〜1 (-1=left優勢, 0=均衡, 1=right優勢)
    const leftTotal = controllerRef.current.getSideTotal('left');
    const rightTotal = controllerRef.current.getSideTotal('right');
    const total = leftTotal + rightTotal;
    const balance = total > 0 ? (rightTotal - leftTotal) / total : 0;

    emitPort('balance', balance);
    emitPort('direction', controllerRef.current.getBalanceDirection());
    emitPort('recommendation', controllerRef.current.getRecommendation());
  }, [emitPort]);

  // canComplete状態の変更を検知してsetCompleted発行
  useEffect(() => {
    if (canComplete) {
      setCompleted(true);
    } else {
      setCompleted(false, ['左右両方に1つ以上の項目']);
    }
  }, [canComplete, setCompleted]);

  /**
   * ラベル更新
   */
  const handleLabelChange = useCallback(
    (side: 'left' | 'right', value: string) => {
      if (side === 'left') {
        setLeftLabel(value);
      } else {
        setRightLabel(value);
      }
      controllerRef.current.setLabels(
        side === 'left' ? value : leftLabel,
        side === 'right' ? value : rightLabel
      );
    },
    [leftLabel, rightLabel]
  );

  /**
   * アイテム追加
   */
  const handleAddItem = useCallback(
    (side: 'left' | 'right') => {
      const text = side === 'left' ? newLeftItem : newRightItem;
      if (!text.trim()) return;

      controllerRef.current.addItem(text.trim(), side, 50);
      if (side === 'left') {
        setNewLeftItem('');
      } else {
        setNewRightItem('');
      }
      forceUpdate({});

      // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [newLeftItem, newRightItem, onUpdate, spec.id, emitAllPorts]
  );

  /**
   * 重み更新
   */
  const handleWeightChange = useCallback(
    (itemId: string, weight: number) => {
      controllerRef.current.setItemWeight(itemId, weight);
      forceUpdate({});

      // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id, emitAllPorts]
  );

  /**
   * アイテム削除
   */
  const handleRemoveItem = useCallback(
    (itemId: string) => {
      controllerRef.current.removeItem(itemId);
      forceUpdate({});

      // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id, emitAllPorts]
  );

  /**
   * リセット
   */
  const handleReset = useCallback(() => {
    controllerRef.current.reset();
    setNewLeftItem('');
    setNewRightItem('');
    forceUpdate({});

    // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
    emitAllPorts();
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [onUpdate, spec.id, emitAllPorts]);

  /**
   * 完了
   */
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete(spec.id);
    }
  }, [onComplete, spec.id]);

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
    <div className={styles.container} role="region" aria-label="トレードオフ天秤" data-testid="tradeoff-container">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {spec.config.title || 'トレードオフ天秤'}
        </h2>
        <p className={styles.description}>
          {spec.config.description || '両方の選択肢について項目を追加し、重みを調整してください'}
        </p>
      </div>

      {/* Balance visualization */}
      <div className={styles.balanceVisualization}>
        <div className={styles.balanceBeam} data-testid="tradeoff-balance-beam">
          <div className={styles.pivot} />
          <div
            className={styles.beam}
            style={{ transform: `rotate(${tiltAngle}deg)` }}
          />
          <div
            className={styles.leftPan}
            style={{ transform: `translateY(${-tiltAngle * 2}px)` }}
          >
            {controllerRef.current.getSideTotal('left')}
          </div>
          <div
            className={styles.rightPan}
            style={{ transform: `translateY(${tiltAngle * 2}px)` }}
          >
            {controllerRef.current.getSideTotal('right')}
          </div>
        </div>

        <div className={styles.balanceIndicator}>
          <div
            className={`${styles.balanceScore} ${balanceDirection === 'left'
              ? styles.balanceScoreLeft
              : balanceDirection === 'right'
                ? styles.balanceScoreRight
                : styles.balanceScoreBalanced
              }`}
            data-testid="tradeoff-balance-score"
          >
            {balanceDirection === 'balanced'
              ? '均衡'
              : balanceDirection === 'left'
                ? `← ${leftLabel}`
                : `${rightLabel} →`}
          </div>
          <p className={styles.recommendation}>{recommendation}</p>
        </div>
      </div>

      {/* Sides */}
      <div className={styles.sidesContainer}>
        {/* Left side */}
        <div className={`${styles.side} ${styles.leftSide}`}>
          <div className={styles.sideHeader}>
            <input
              type="text"
              className={styles.sideLabelInput}
              value={leftLabel}
              onChange={(e) => handleLabelChange('left', e.target.value)}
              placeholder="選択肢A"
              data-testid="tradeoff-left-label"
            />
            <span className={styles.sideTotal}>
              計: {controllerRef.current.getSideTotal('left')}
            </span>
          </div>

          <div className={styles.itemsList}>
            {leftItems.length === 0 ? (
              <div className={styles.emptyState}>項目を追加してください</div>
            ) : (
              leftItems.map((item) => (
                <div key={item.id} className={styles.item} data-testid={`tradeoff-left-item-${item.id}`}>
                  <div className={styles.itemHeader} data-testid={`tradeoff-left-item-header-${item.id}`}>
                    <span className={styles.itemText}>{item.text}</span>
                    <span className={styles.itemWeight}>{item.weight}</span>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="range"
                    className={styles.itemSlider}
                    min="0"
                    max="100"
                    value={item.weight}
                    onChange={(e) =>
                      handleWeightChange(item.id, Number(e.target.value))
                    }
                    data-testid={`tradeoff-weight-${item.id}`}
                  />
                </div>
              ))
            )}
          </div>

          <form
            className={styles.addItemForm}
            onSubmit={(e) => {
              e.preventDefault();
              handleAddItem('left');
            }}
          >
            <input
              type="text"
              className={styles.addItemInput}
              value={newLeftItem}
              onChange={(e) => setNewLeftItem(e.target.value)}
              placeholder="項目を追加..."
              data-testid="tradeoff-left-input"
            />
            <button type="submit" className={styles.addItemButton} data-testid="tradeoff-left-add-btn">
              追加
            </button>
          </form>
        </div>

        {/* Right side */}
        <div className={`${styles.side} ${styles.rightSide}`}>
          <div className={styles.sideHeader}>
            <input
              type="text"
              className={styles.sideLabelInput}
              value={rightLabel}
              onChange={(e) => handleLabelChange('right', e.target.value)}
              placeholder="選択肢B"
              data-testid="tradeoff-right-label"
            />
            <span className={styles.sideTotal}>
              計: {controllerRef.current.getSideTotal('right')}
            </span>
          </div>

          <div className={styles.itemsList}>
            {rightItems.length === 0 ? (
              <div className={styles.emptyState}>項目を追加してください</div>
            ) : (
              rightItems.map((item) => (
                <div key={item.id} className={styles.item} data-testid={`tradeoff-right-item-${item.id}`}>
                  <div className={styles.itemHeader} data-testid={`tradeoff-right-item-header-${item.id}`}>
                    <span className={styles.itemText}>{item.text}</span>
                    <span className={styles.itemWeight}>{item.weight}</span>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="range"
                    className={styles.itemSlider}
                    min="0"
                    max="100"
                    value={item.weight}
                    onChange={(e) =>
                      handleWeightChange(item.id, Number(e.target.value))
                    }
                  />
                </div>
              ))
            )}
          </div>

          <form
            className={styles.addItemForm}
            onSubmit={(e) => {
              e.preventDefault();
              handleAddItem('right');
            }}
          >
            <input
              type="text"
              className={styles.addItemInput}
              value={newRightItem}
              onChange={(e) => setNewRightItem(e.target.value)}
              placeholder="項目を追加..."
              data-testid="tradeoff-right-input"
            />
            <button type="submit" className={styles.addItemButton} data-testid="tradeoff-right-add-btn">
              追加
            </button>
          </form>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.resetButton} onClick={handleReset}>
          リセット
        </button>
        <button
          className={styles.completeButton}
          onClick={handleComplete}
          disabled={!canComplete}
          data-testid="tradeoff-complete-btn"
        >
          {canComplete ? '完了' : '両方に項目を追加してください'}
        </button>
      </div>
    </div>
  );
};

export default TradeoffBalance;
