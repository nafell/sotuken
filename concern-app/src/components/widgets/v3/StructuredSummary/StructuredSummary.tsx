/**
 * StructuredSummary.tsx
 * 構造化文章まとめWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 思考整理の結果を構造化して表示・編集するWidget
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  StructuredSummaryController,
  SECTION_TYPE_CONFIG,
  type SectionType,
} from './StructuredSummaryController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './StructuredSummary.module.css';

/**
 * StructuredSummary Component
 */
export const StructuredSummary: React.FC<BaseWidgetProps> = ({
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
  const [showPreview, setShowPreview] = useState(false);
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const controllerRef = useRef<StructuredSummaryController>(
    new StructuredSummaryController(spec.config.title || '思考整理のまとめ')
  );

  // configから初期設定を適用
  useEffect(() => {
    if (spec.config.title) {
      controllerRef.current.setTitle(spec.config.title);
    }
    if (spec.config.conclusion) {
      controllerRef.current.setConclusion(spec.config.conclusion);
    }
    forceUpdate({});
  }, [spec.config.title, spec.config.conclusion]);

  const state = controllerRef.current.getState();
  const isComplete = controllerRef.current.isComplete();

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    emitPort('summary_text', controllerRef.current.exportAsPlainText());
    emitPort('sections', state.sections);
    emitPort('conclusion', state.conclusion);
  }, [emitPort, state.sections, state.conclusion]);

  // isComplete状態の変更を検知してsetCompleted発行
  useEffect(() => {
    if (isComplete) {
      setCompleted(true);
    } else {
      setCompleted(false, ['2つ以上のセクションに入力']);
    }
  }, [isComplete, setCompleted]);

  /**
   * タイトル更新
   */
  const handleTitleChange = useCallback((title: string) => {
    controllerRef.current.setTitle(title);
    forceUpdate({});
    emitAllPorts();
  }, [emitAllPorts]);

  /**
   * セクション内容更新
   */
  const handleSectionContentChange = useCallback(
    (sectionId: string, content: string) => {
      controllerRef.current.setSectionContent(sectionId, content);
      forceUpdate({});
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id, emitAllPorts]
  );

  /**
   * セクションタイトル更新
   */
  const handleSectionTitleChange = useCallback(
    (sectionId: string, title: string) => {
      controllerRef.current.updateSection(sectionId, { title });
      forceUpdate({});
      emitAllPorts();
    },
    [emitAllPorts]
  );

  /**
   * セクション追加
   */
  const handleAddSection = useCallback(
    (type: SectionType) => {
      controllerRef.current.addSection(type);
      forceUpdate({});
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id, emitAllPorts]
  );

  /**
   * セクション削除
   */
  const handleRemoveSection = useCallback(
    (sectionId: string) => {
      controllerRef.current.removeSection(sectionId);
      forceUpdate({});
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id, emitAllPorts]
  );

  /**
   * セクション順序変更
   */
  const handleMoveSection = useCallback(
    (sectionId: string, direction: 'up' | 'down') => {
      if (direction === 'up') {
        controllerRef.current.moveSectionUp(sectionId);
      } else {
        controllerRef.current.moveSectionDown(sectionId);
      }
      forceUpdate({});
      emitAllPorts();
    },
    [emitAllPorts]
  );

  /**
   * アイテム追加
   */
  const handleAddItem = useCallback(
    (sectionId: string) => {
      const item = newItems[sectionId]?.trim();
      if (!item) return;

      controllerRef.current.addSectionItem(sectionId, item);
      setNewItems((prev) => ({ ...prev, [sectionId]: '' }));
      forceUpdate({});
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [newItems, onUpdate, spec.id, emitAllPorts]
  );

  /**
   * アイテム削除
   */
  const handleRemoveItem = useCallback(
    (sectionId: string, itemIndex: number) => {
      controllerRef.current.removeSectionItem(sectionId, itemIndex);
      forceUpdate({});
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id, emitAllPorts]
  );

  /**
   * 結論更新
   */
  const handleConclusionChange = useCallback(
    (conclusion: string) => {
      controllerRef.current.setConclusion(conclusion);
      forceUpdate({});
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
    setNewItems({});
    forceUpdate({});
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
    <div className={styles.container} role="region" aria-label="構造化まとめ" data-testid="struct-summary-container">
      <div className={styles.header}>
        <input
          type="text"
          className={styles.titleInput}
          value={state.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="タイトルを入力..."
          data-testid="struct-summary-title"
        />
        <p className={styles.description}>
          各セクションに内容を入力して、思考を整理しましょう
        </p>
      </div>

      {/* Sections */}
      <div className={styles.sectionsContainer}>
        {state.sections.map((section, index) => {
          const config = SECTION_TYPE_CONFIG[section.type];
          return (
            <div
              key={section.id}
              className={styles.section}
              style={{ backgroundColor: `${config.color}10` }}
              data-testid={`struct-summary-section-${section.id}`}
            >
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>{config.icon}</span>
                <input
                  type="text"
                  className={styles.sectionTitleInput}
                  value={section.title}
                  onChange={(e) =>
                    handleSectionTitleChange(section.id, e.target.value)
                  }
                  data-testid={`struct-summary-section-title-${section.id}`}
                />
                <div className={styles.sectionActions}>
                  {index > 0 && (
                    <button
                      className={styles.sectionButton}
                      onClick={() => handleMoveSection(section.id, 'up')}
                    >
                      ↑
                    </button>
                  )}
                  {index < state.sections.length - 1 && (
                    <button
                      className={styles.sectionButton}
                      onClick={() => handleMoveSection(section.id, 'down')}
                    >
                      ↓
                    </button>
                  )}
                  <button
                    className={`${styles.sectionButton} ${styles.deleteButton}`}
                    onClick={() => handleRemoveSection(section.id)}
                    data-testid={`struct-summary-section-delete-${section.id}`}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className={styles.sectionContent}>
                <textarea
                  className={styles.sectionTextarea}
                  value={section.content}
                  onChange={(e) =>
                    handleSectionContentChange(section.id, e.target.value)
                  }
                  placeholder={config.placeholder}
                  data-testid={`struct-summary-section-content-${section.id}`}
                />

                {/* Items list for certain section types */}
                {(section.type === 'action_items' ||
                  section.type === 'next_steps' ||
                  section.type === 'options') && (
                    <div className={styles.itemsList}>
                      {section.items?.map((item, itemIndex) => (
                        <div key={itemIndex} className={styles.item}>
                          <input
                            type="checkbox"
                            className={styles.itemCheckbox}
                          />
                          <span className={styles.itemText}>{item}</span>
                          <button
                            className={styles.itemDeleteButton}
                            onClick={() =>
                              handleRemoveItem(section.id, itemIndex)
                            }
                            data-testid={`struct-summary-item-delete-${section.id}-${itemIndex}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <form
                        className={styles.addItemForm}
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddItem(section.id);
                        }}
                      >
                        <input
                          type="text"
                          className={styles.addItemInput}
                          value={newItems[section.id] || ''}
                          onChange={(e) =>
                            setNewItems((prev) => ({
                              ...prev,
                              [section.id]: e.target.value,
                            }))
                          }
                          placeholder="項目を追加..."
                          data-testid={`struct-summary-item-input-${section.id}`}
                        />
                        <button type="submit" className={styles.addItemButton} data-testid={`struct-summary-item-add-${section.id}`}>
                          追加
                        </button>
                      </form>
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add section buttons */}
      <div className={styles.addSectionContainer}>
        {(Object.keys(SECTION_TYPE_CONFIG) as SectionType[]).map((type) => {
          const config = SECTION_TYPE_CONFIG[type];
          return (
            <button
              key={type}
              className={styles.addSectionButton}
              style={{ borderColor: config.color, color: config.color }}
              onClick={() => handleAddSection(type)}
              data-testid={`struct-summary-add-section-${type}`}
            >
              {config.icon} {config.label}
            </button>
          );
        })}
      </div>

      {/* Conclusion */}
      <div className={styles.conclusionSection}>
        <h3 className={styles.conclusionTitle}>💡 結論・まとめ</h3>
        <textarea
          className={styles.conclusionTextarea}
          value={state.conclusion}
          onChange={(e) => handleConclusionChange(e.target.value)}
          placeholder="最終的な結論やまとめを記述..."
          data-testid="struct-summary-conclusion"
        />
      </div>

      {/* Statistics */}
      <div className={styles.statistics}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{state.sections.length}</div>
          <div className={styles.statLabel}>セクション</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {controllerRef.current.getTotalCharCount()}
          </div>
          <div className={styles.statLabel}>文字数</div>
        </div>
      </div>

      {/* Preview toggle */}
      <div className={styles.previewToggle}>
        <button
          className={styles.previewButton}
          onClick={() => setShowPreview(!showPreview)}
          data-testid="struct-summary-preview-btn"
        >
          {showPreview ? '編集に戻る' : 'プレビュー表示'}
        </button>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className={styles.previewContainer}>
          <h4 className={styles.previewTitle}>エクスポートプレビュー</h4>
          <pre className={styles.previewContent}>
            {controllerRef.current.exportAsPlainText()}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.resetButton} onClick={handleReset}>
          リセット
        </button>
        <button
          className={styles.completeButton}
          onClick={handleComplete}
          disabled={!isComplete}
          data-testid="struct-summary-complete-btn"
        >
          {isComplete ? '完了' : '2つ以上のセクションに入力してください'}
        </button>
      </div>
    </div>
  );
};

export default StructuredSummary;
