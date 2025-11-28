/**
 * UIRenderer - 動的UIレンダラー
 * UISpecDSLを元に完全なUIを動的生成
 * 
 * Phase 1C - C6タスク
 */

import React, { useState, useCallback } from 'react';
import type { UISpecDSL } from '../../../../server/src/types/UISpecDSL';
import type { DataSchemaDSL } from '../../../../server/src/types/DataSchemaDSL';
import { ComponentMapper } from '../../services/ui-generation/ComponentMapper';

// ウィジェットのインポート
import { TextAreaWidget } from '../../components/ui/widgets/TextAreaWidget';
import { InputWidget } from '../../components/ui/widgets/InputWidget';
import { NumberInputWidget } from '../../components/ui/widgets/NumberInputWidget';
import { RadioGroupWidget } from '../../components/ui/widgets/RadioGroupWidget';
import { CategoryPickerWidget } from '../../components/ui/widgets/CategoryPickerWidget';
import { ListWidget } from '../../components/ui/widgets/ListWidget';
import { SummaryListWidget } from '../../components/ui/widgets/SummaryListWidget';
import { DynamicWidget } from '../../components/ui/widgets/DynamicWidget';
import { TaskCardWidget } from '../../components/ui/widgets/TaskCardWidget';

interface UIRendererProps {
  uiSpec: UISpecDSL;
  dataSchema: DataSchemaDSL;
  data: Record<string, any>;
  onChange: (path: string, value: any) => void;
  className?: string;
}

/**
 * UIRendererコンポーネント
 * UISpecDSLからReactコンポーネントツリーを生成
 */
export const UIRenderer: React.FC<UIRendererProps> = ({
  uiSpec,
  dataSchema,
  data,
  onChange,
  className = ''
}) => {
  const [mapper] = useState(() => new ComponentMapper());

  /**
   * エンティティパスからデータ値を取得
   */
  const getValueByPath = useCallback((path: string): any => {
    const parts = path.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }, [data]);

  /**
   * パス指定でデータを更新
   */
  const handleChange = useCallback((path: string, value: any) => {
    onChange(path, value);
  }, [onChange]);

  /**
   * コンポーネント名からReactコンポーネントを取得
   */
  const getComponentByName = (componentName: string): React.ComponentType<any> | null => {
    const componentMap: Record<string, React.ComponentType<any>> = {
      TextAreaWidget,
      InputWidget,
      NumberInputWidget,
      RadioGroupWidget,
      CategoryPickerWidget,
      ListWidget,
      SummaryListWidget,
      DynamicWidget,
      TaskCardWidget,
    };

    return componentMap[componentName] || null;
  };

  /**
   * 単一のウィジェットをレンダリング
   */
  const renderWidget = (entityPath: string, index: number) => {
    const renderSpec = uiSpec.mappings[entityPath];
    
    if (!renderSpec) {
      console.warn(`No render spec found for: ${entityPath}`);
      return null;
    }

    // データ値を取得
    const value = getValueByPath(entityPath);

    // コンポーネント情報を取得
    const { componentName, props } = mapper.getComponentInfo(
      renderSpec,
      value,
      (newValue) => handleChange(entityPath, newValue)
    );

    // Reactコンポーネントを取得
    const Component = getComponentByName(componentName);

    if (!Component) {
      console.warn(`Component not found: ${componentName}`);
      return (
        <div key={index} className="p-4 border-2 border-red-300 bg-red-50 rounded-md">
          <p className="text-red-800 font-semibold">
            未実装のコンポーネント: {componentName}
          </p>
          <p className="text-sm text-gray-600 mt-1">パス: {entityPath}</p>
        </div>
      );
    }

    // ラベルを抽出（最後のドット以降）
    const label = entityPath.split('.').pop() || entityPath;

    return (
      <div key={index} className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
        <Component {...props} />
      </div>
    );
  };

  /**
   * レイアウトに応じたレンダリング
   */
  const renderLayout = () => {
    const entityPaths = Object.keys(uiSpec.mappings);

    // layoutが指定されている場合
    if (uiSpec.layout && uiSpec.layout.sections) {
      return renderSectionedLayout(uiSpec.layout.sections);
    }

    // デフォルト: シングルカラム
    return (
      <div className="space-y-4">
        {entityPaths.map((path, index) => renderWidget(path, index))}
      </div>
    );
  };

  /**
   * セクション分割レイアウトのレンダリング
   */
  const renderSectionedLayout = (sections: any[]) => {
    return (
      <div className="space-y-6">
        {sections.map((section, sectionIndex) => {
          // デバッグログ: widgets が欠落している場合に警告
          if (!section.widgets) {
            console.warn(
              `⚠️ [UIRenderer] Section "${section.id || `index-${sectionIndex}`}" has no widgets. ` +
              `This may indicate an incomplete UISpec generation.`,
              { section, sectionIndex }
            );
          }

          return (
            <div key={sectionIndex} className="bg-white rounded-lg shadow-sm p-6">
              {section.title && (
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
                  {section.title}
                </h3>
              )}
              <div className="space-y-4">
                {(section.widgets || []).map((widgetPath: string, widgetIndex: number) => 
                  renderWidget(widgetPath, widgetIndex)
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // エラーハンドリング
  if (!uiSpec || !dataSchema || !data) {
    return (
      <div className="p-4 border border-yellow-400 bg-yellow-50 rounded-md">
        <p className="text-yellow-800 font-semibold">
          UIを生成できません：必要なデータが不足しています
        </p>
      </div>
    );
  }

  // UIレンダリング
  return (
    <div className={`ui-renderer ${className}`}>
      {renderLayout()}
    </div>
  );
};

