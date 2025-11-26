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
import styles from './StructuredSummary.module.css';

/**
 * StructuredSummary Component
 */
export const StructuredSummary: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
}) => {
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
   * タイトル更新
   */
  const handleTitleChange = useCallback((title: string) => {
    controllerRef.current.setTitle(title);
    forceUpdate({});
  }, []);

  /**
   * セクション内容更新
   */
  const handleSectionContentChange = useCallback(
    (sectionId: string, content: string) => {
      controllerRef.current.setSectionContent(sectionId, content);
      forceUpdate({});

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id]
  );

  /**
   * セクションタイトル更新
   */
  const handleSectionTitleChange = useCallback(
    (sectionId: string, title: string) => {
      controllerRef.current.updateSection(sectionId, { title });
      forceUpdate({});
    },
    []
  );

  /**
   * セクション追加
   */
  const handleAddSection = useCallback(
    (type: SectionType) => {
      controllerRef.current.addSection(type);
      forceUpdate({});

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id]
  );

  /**
   * セクション削除
   */
  const handleRemoveSection = useCallback(
    (sectionId: string) => {
      controllerRef.current.removeSection(sectionId);
      forceUpdate({});

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id]
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
    },
    []
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

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [newItems, onUpdate, spec.id]
  );

  /**
   * アイテム削除
   */
  const handleRemoveItem = useCallback(
    (sectionId: string, itemIndex: number) => {
      controllerRef.current.removeSectionItem(sectionId, itemIndex);
      forceUpdate({});

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [onUpdate, spec.id]
  );

  /**
   * 結論更新
   */
  const handleConclusionChange = useCallback(
    (conclusion: string) => {
      controllerRef.current.setConclusion(conclusion);
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
    setNewItems({});
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

  return (
    <div className={styles.container} role="region" aria-label="構造化まとめ">
      <div className={styles.header}>
        <input
          type="text"
          className={styles.titleInput}
          value={state.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="タイトルを入力..."
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
                      />
                      <button type="submit" className={styles.addItemButton}>
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
        >
          {isComplete ? '完了' : '2つ以上のセクションに入力してください'}
        </button>
      </div>
    </div>
  );
};

export default StructuredSummary;
