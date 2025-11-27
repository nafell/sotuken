/**
 * SwotAnalysis.tsx
 * SWOT分析Widget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 4象限（強み・弱み・機会・脅威）に項目を配置するWidget
 *
 * Reactive Port対応 (Phase 4 Task 2.2):
 * - outputs: strengths (object[]), weaknesses (object[]), opportunities (object[]), threats (object[])
 * - reserved: _completed, _error
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  SwotAnalysisController,
  SWOT_QUADRANTS,
  IMPORTANCE_COLORS,
  IMPORTANCE_LABELS,
  type SwotQuadrant,
  type SwotItem,
} from './SwotAnalysisController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './SwotAnalysis.module.css';

/**
 * SwotAnalysis Component
 */
export const SwotAnalysis: React.FC<BaseWidgetProps> = ({
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
  const [newItemTexts, setNewItemTexts] = useState<Record<SwotQuadrant, string>>({
    strengths: '',
    weaknesses: '',
    opportunities: '',
    threats: '',
  });
  const [selectedImportance, setSelectedImportance] = useState<SwotItem['importance']>('medium');
  const controllerRef = useRef<SwotAnalysisController>(
    new SwotAnalysisController()
  );

  // configから初期アイテムを設定
  useEffect(() => {
    const initialItems = spec.config.items as Array<{
      text: string;
      quadrant: SwotQuadrant;
      importance?: SwotItem['importance'];
    }> | undefined;

    if (initialItems && initialItems.length > 0) {
      controllerRef.current.reset();
      initialItems.forEach((item) => {
        controllerRef.current.addItem(
          item.text,
          item.quadrant,
          item.importance || 'medium'
        );
      });
      forceUpdate({});
    }
  }, [spec.config.items]);

  const state = controllerRef.current.getState();
  const isComplete = controllerRef.current.isComplete();

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    emitPort('strengths', controllerRef.current.getItemsByQuadrant('strengths'));
    emitPort('weaknesses', controllerRef.current.getItemsByQuadrant('weaknesses'));
    emitPort('opportunities', controllerRef.current.getItemsByQuadrant('opportunities'));
    emitPort('threats', controllerRef.current.getItemsByQuadrant('threats'));
  }, [emitPort]);

  // isComplete状態の変更を検知してsetCompleted発行
  useEffect(() => {
    if (isComplete) {
      setCompleted(true);
    } else {
      setCompleted(false, ['各象限に1つ以上の項目']);
    }
  }, [isComplete, setCompleted]);

  /**
   * アイテム追加
   */
  const handleAddItem = useCallback(
    (quadrant: SwotQuadrant) => {
      const text = newItemTexts[quadrant].trim();
      if (!text) return;

      controllerRef.current.addItem(text, quadrant, selectedImportance);
      setNewItemTexts((prev) => ({ ...prev, [quadrant]: '' }));
      forceUpdate({});

      // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [newItemTexts, selectedImportance, onUpdate, spec.id, emitAllPorts]
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
   * 重要度変更
   */
  const handleChangeImportance = useCallback(
    (itemId: string, importance: SwotItem['importance']) => {
      controllerRef.current.updateItem(itemId, { importance });
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
    setNewItemTexts({
      strengths: '',
      weaknesses: '',
      opportunities: '',
      threats: '',
    });
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
  const getResult = (): WidgetResult => {
    return controllerRef.current.getResult(spec.id);
  };

  // 外部から結果を取得できるようにrefを設定
  useEffect(() => {
    (window as any)[`widget_${spec.id}_getResult`] = getResult;
    return () => {
      delete (window as any)[`widget_${spec.id}_getResult`];
    };
  }, [spec.id, state]);

  const counts = controllerRef.current.getQuadrantCounts();

  return (
    <div className={styles.container} role="region" aria-label="SWOT分析" data-testid="swot-container">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {spec.config.title || 'SWOT分析'}
        </h2>
        <p className={styles.description}>
          {spec.config.description || '各象限に項目を追加して状況を整理しましょう'}
        </p>
      </div>

      {/* Importance selector */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>新規項目の重要度:</span>
        <div className={styles.importanceSelector}>
          {(Object.keys(IMPORTANCE_COLORS) as SwotItem['importance'][]).map((imp) => (
            <button
              key={imp}
              className={`${styles.importanceButton} ${selectedImportance === imp ? styles.importanceButtonActive : ''
                }`}
              style={{ backgroundColor: IMPORTANCE_COLORS[imp] }}
              onClick={() => setSelectedImportance(imp)}
              title={IMPORTANCE_LABELS[imp]}
              data-testid={`swot-importance-btn-${imp}`}
            />
          ))}
        </div>
      </div>

      {/* SWOT Grid */}
      <div className={styles.swotGrid}>
        {SWOT_QUADRANTS.map((quadrant) => {
          const items = controllerRef.current.getItemsByQuadrant(quadrant.id);
          return (
            <div
              key={quadrant.id}
              className={styles.quadrant}
              style={{ backgroundColor: `${quadrant.color}20` }}
              data-testid={`swot-${quadrant.id}`}
            >
              <div className={styles.quadrantHeader}>
                <span className={styles.quadrantIcon}>{quadrant.icon}</span>
                <div>
                  <h3 className={styles.quadrantTitle}>{quadrant.labelJa}</h3>
                  <p className={styles.quadrantSubtitle}>{quadrant.description}</p>
                </div>
                <span className={styles.quadrantCount}>{counts[quadrant.id]}</span>
              </div>

              <div className={styles.itemsList}>
                {items.length === 0 ? (
                  <div className={styles.emptyState}>
                    項目を追加してください
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={item.id} className={styles.item} data-testid={`swot-${quadrant.id}-item-${index}`}>
                      <div
                        className={styles.itemImportance}
                        style={{ backgroundColor: IMPORTANCE_COLORS[item.importance] }}
                        title={`重要度: ${IMPORTANCE_LABELS[item.importance]}`}
                      />
                      <span className={styles.itemText}>{item.text}</span>
                      <div className={styles.itemActions}>
                        {(Object.keys(IMPORTANCE_COLORS) as SwotItem['importance'][]).map((imp) => (
                          <button
                            key={imp}
                            className={styles.itemButton}
                            style={{
                              backgroundColor: item.importance === imp ? IMPORTANCE_COLORS[imp] : undefined,
                              color: item.importance === imp ? 'white' : undefined,
                            }}
                            onClick={() => handleChangeImportance(item.id, imp)}
                            title={IMPORTANCE_LABELS[imp]}
                          >
                            {IMPORTANCE_LABELS[imp]}
                          </button>
                        ))}
                        <button
                          className={`${styles.itemButton} ${styles.deleteButton}`}
                          onClick={() => handleRemoveItem(item.id)}
                          title="削除"
                          data-testid={`swot-${quadrant.id}-delete-${index}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add item form */}
              <form
                className={styles.addItemForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddItem(quadrant.id);
                }}
              >
                <input
                  type="text"
                  className={styles.addItemInput}
                  placeholder={`${quadrant.labelJa}を追加...`}
                  value={newItemTexts[quadrant.id]}
                  onChange={(e) =>
                    setNewItemTexts((prev) => ({
                      ...prev,
                      [quadrant.id]: e.target.value,
                    }))
                  }
                  data-testid={`swot-${quadrant.id}-input`}
                />
                <button
                  type="submit"
                  className={styles.addItemButton}
                  style={{ backgroundColor: quadrant.color }}
                  data-testid={`swot-${quadrant.id}-add-btn`}
                >
                  追加
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {/* Gaps panel */}
      {state.suggestedGaps.length > 0 && (
        <div className={styles.gapsPanel}>
          <h4 className={styles.gapsPanelTitle}>
            💡 分析のヒント
          </h4>
          <ul className={styles.gapsList}>
            {state.suggestedGaps.map((gap, index) => (
              <li key={index} className={styles.gapsItem}>
                • {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className={styles.summary}>
        {SWOT_QUADRANTS.map((quadrant) => (
          <div key={quadrant.id} className={styles.summaryItem}>
            <div className={styles.summaryLabel}>{quadrant.labelJa}</div>
            <div className={styles.summaryValue} style={{ color: quadrant.color }}>
              {counts[quadrant.id]}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.resetButton} onClick={handleReset}>
          リセット
        </button>
        <button
          className={styles.completeButton}
          onClick={handleComplete}
          disabled={!isComplete}
          data-testid="swot-complete-btn"
        >
          {isComplete ? '完了' : '各象限に1つ以上追加してください'}
        </button>
      </div>
    </div>
  );
};

export default SwotAnalysis;
