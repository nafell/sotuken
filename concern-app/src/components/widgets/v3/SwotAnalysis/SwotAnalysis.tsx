/**
 * SwotAnalysis.tsx
 * SWOT分析Widget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 4象限（強み・弱み・機会・脅威）に項目を配置するWidget
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
import styles from './SwotAnalysis.module.css';

/**
 * SwotAnalysis Component
 */
export const SwotAnalysis: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
}) => {
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
   * アイテム追加
   */
  const handleAddItem = useCallback(
    (quadrant: SwotQuadrant) => {
      const text = newItemTexts[quadrant].trim();
      if (!text) return;

      controllerRef.current.addItem(text, quadrant, selectedImportance);
      setNewItemTexts((prev) => ({ ...prev, [quadrant]: '' }));
      forceUpdate({});

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [newItemTexts, selectedImportance, onUpdate, spec.id]
  );

  /**
   * アイテム削除
   */
  const handleRemoveItem = useCallback(
    (itemId: string) => {
      controllerRef.current.removeItem(itemId);
      forceUpdate({});

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id]
  );

  /**
   * 重要度変更
   */
  const handleChangeImportance = useCallback(
    (itemId: string, importance: SwotItem['importance']) => {
      controllerRef.current.updateItem(itemId, { importance });
      forceUpdate({});

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id]
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

    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [onUpdate, spec.id]);

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
    <div className={styles.container} role="region" aria-label="SWOT分析">
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
              className={`${styles.importanceButton} ${
                selectedImportance === imp ? styles.importanceButtonActive : ''
              }`}
              style={{ backgroundColor: IMPORTANCE_COLORS[imp] }}
              onClick={() => setSelectedImportance(imp)}
              title={IMPORTANCE_LABELS[imp]}
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
                  items.map((item) => (
                    <div key={item.id} className={styles.item}>
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
                />
                <button
                  type="submit"
                  className={styles.addItemButton}
                  style={{ backgroundColor: quadrant.color }}
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
        >
          {isComplete ? '完了' : '各象限に1つ以上追加してください'}
        </button>
      </div>
    </div>
  );
};

export default SwotAnalysis;
