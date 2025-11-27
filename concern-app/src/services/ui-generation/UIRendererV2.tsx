/**
 * UIRenderer v2.0
 *
 * UISpec v2.0に基づいた動的UIレンダラー
 * シンプルな7つのウィジェットで全画面を構成
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { UISpecV2, UIField, UIAction, FormData } from '../../../../server/src/types/UISpecV2';
import { ExpressionEngine } from './ExpressionEngine';

// ウィジェットのインポート（v2対応版を使用）
import { TextFieldV2 } from '../../components/ui/widgets/v2/TextFieldV2';
import { NumberFieldV2 } from '../../components/ui/widgets/v2/NumberFieldV2';
import { SelectFieldV2 } from '../../components/ui/widgets/v2/SelectFieldV2';
import { ListFieldV2 } from '../../components/ui/widgets/v2/ListFieldV2';
import { SliderFieldV2 } from '../../components/ui/widgets/v2/SliderFieldV2';
import { ToggleFieldV2 } from '../../components/ui/widgets/v2/ToggleFieldV2';
import { CardsFieldV2 } from '../../components/ui/widgets/v2/CardsFieldV2';

interface UIRendererV2Props {
  uiSpec: UISpecV2;
  data: FormData;
  onChange: (fieldId: string, value: any) => void;
  onAction: (actionId: string) => void;
  className?: string;
}

/**
 * UIRenderer v2コンポーネント
 */
export const UIRendererV2: React.FC<UIRendererV2Props> = ({
  uiSpec,
  data,
  onChange,
  onAction,
  className = ''
}) => {
  const [expressionEngine] = useState(() => new ExpressionEngine());

  /**
   * フィールドの値を取得
   */
  const getFieldValue = useCallback((fieldId: string): any => {
    return data[fieldId];
  }, [data]);

  /**
   * 条件式を評価
   */
  const evaluateCondition = useCallback((
    condition: string | undefined,
    currentData: FormData
  ): boolean => {
    if (!condition) return true;

    try {
      return expressionEngine.evaluateCondition(condition, currentData);
    } catch (error) {
      console.warn(`条件式の評価に失敗: ${condition}`, error);
      return true; // エラー時はデフォルトで表示
    }
  }, [expressionEngine]);

  /**
   * 計算式を評価
   */
  const evaluateComputed = useCallback((
    expression: string | undefined,
    currentData: FormData
  ): any => {
    if (!expression) return undefined;

    try {
      return expressionEngine.evaluateExpression(expression, currentData);
    } catch (error) {
      console.warn(`計算式の評価に失敗: ${expression}`, error);
      return undefined;
    }
  }, [expressionEngine]);

  /**
   * フィールドが表示されるべきかチェック
   */
  const isFieldVisible = useCallback((field: UIField): boolean => {
    return evaluateCondition(field.options?.visibleWhen, data);
  }, [data, evaluateCondition]);

  /**
   * フィールドが有効かチェック
   */
  const isFieldEnabled = useCallback((field: UIField): boolean => {
    if (field.options?.readonly) return false;
    return evaluateCondition(field.options?.enabledWhen, data);
  }, [data, evaluateCondition]);

  /**
   * フィールドの表示値を取得（computed対応）
   */
  const getDisplayValue = useCallback((field: UIField): any => {
    if (field.options?.computed) {
      return evaluateComputed(field.options.computed, data);
    }
    return getFieldValue(field.id) ?? field.value;
  }, [data, evaluateComputed, getFieldValue]);

  /**
   * 単一フィールドをレンダリング
   */
  const renderField = useCallback((field: UIField, index: number) => {
    // 表示条件チェック
    if (!isFieldVisible(field)) {
      return null;
    }

    const value = getDisplayValue(field);
    const enabled = isFieldEnabled(field);

    const commonProps = {
      key: `field-${field.id}-${index}`,
      field,
      value,
      onChange: (newValue: any) => onChange(field.id, newValue),
      disabled: !enabled
    };

    // フィールドタイプに応じたコンポーネント選択
    switch (field.type) {
      case 'text':
        return <TextFieldV2 {...commonProps} />;

      case 'number':
        return <NumberFieldV2 {...commonProps} />;

      case 'select':
        return <SelectFieldV2 {...commonProps} />;

      case 'list':
        return <ListFieldV2 {...commonProps} />;

      case 'slider':
        return <SliderFieldV2 {...commonProps} />;

      case 'toggle':
        return <ToggleFieldV2 {...commonProps} />;

      case 'cards':
        return <CardsFieldV2 {...commonProps} />;

      default:
        console.warn(`Unknown field type: ${field.type}`);
        return (
          <div key={commonProps.key} className="p-4 bg-yellow-50 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ 未対応のフィールドタイプ: {field.type}
            </p>
          </div>
        );
    }
  }, [isFieldVisible, getDisplayValue, isFieldEnabled, onChange]);

  /**
   * アクションボタンをレンダリング
   */
  const renderAction = useCallback((action: UIAction) => {
    // 実行条件チェック
    const canExecute = evaluateCondition(action.condition, data);

    const styleClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
      danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300',
      text: 'bg-transparent text-blue-600 hover:underline disabled:text-gray-400'
    };

    const style = action.style || 'primary';
    const baseClass = 'px-6 py-3 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed';
    const className = `${baseClass} ${styleClasses[style]}`;

    return (
      <button
        key={action.id}
        onClick={() => onAction(action.id)}
        disabled={!canExecute}
        className={className}
        title={action.confirmation}
      >
        {action.icon && <span className="mr-2">{action.icon}</span>}
        {action.label}
      </button>
    );
  }, [data, evaluateCondition, onAction]);

  /**
   * アクションを位置別にグループ化
   */
  const actionsByPosition = useMemo(() => {
    const groups: Record<string, UIAction[]> = {
      top: [],
      bottom: [],
      section: [],
      inline: []
    };

    uiSpec.actions.forEach(action => {
      const position = action.position || 'bottom';
      groups[position].push(action);
    });

    return groups;
  }, [uiSpec.actions]);

  // エラーハンドリング
  if (!uiSpec || !uiSpec.sections || uiSpec.sections.length === 0) {
    return (
      <div className="p-6 border border-yellow-400 bg-yellow-50 rounded-lg">
        <p className="text-yellow-800 font-semibold">
          ⚠️ UIを表示できません
        </p>
        <p className="text-sm text-yellow-700 mt-2">
          UISpec が正しく生成されていない可能性があります
        </p>
      </div>
    );
  }

  return (
    <div className={`ui-renderer-v2 ${className}`}>
      {/* トップアクション */}
      {actionsByPosition.top.length > 0 && (
        <div className="flex gap-2 mb-4">
          {actionsByPosition.top.map(renderAction)}
        </div>
      )}

      {/* セクション */}
      <div className="space-y-6">
        {uiSpec.sections.map((section, sectionIndex) => {
          // セクションの表示条件チェック
          if (section.visible === false) {
            return null;
          }

          return (
            <div
              key={`section-${section.id}-${sectionIndex}`}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              {/* セクションタイトル */}
              <div className="mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {section.title}
                </h2>
                {section.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {section.description}
                  </p>
                )}
              </div>

              {/* フィールド */}
              <div className="space-y-4">
                {section.fields.map((field, fieldIndex) =>
                  renderField(field, fieldIndex)
                )}
              </div>

              {/* セクション内アクション */}
              {actionsByPosition.section.length > 0 && (
                <div className="mt-6 flex gap-2">
                  {actionsByPosition.section.map(renderAction)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ボトムアクション */}
      {actionsByPosition.bottom.length > 0 && (
        <div className="mt-6 flex gap-3 justify-end">
          {actionsByPosition.bottom.map(renderAction)}
        </div>
      )}
    </div>
  );
};
