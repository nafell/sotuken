/**
 * ListFieldV2 - リストウィジェット
 */

import React, { useState } from 'react';
import type { UIField } from '../../../../../../server/src/types/UISpecV2';

interface ListFieldV2Props {
  field: UIField;
  value?: any[];
  onChange: (value: any[]) => void;
  disabled?: boolean;
}

export const ListFieldV2: React.FC<ListFieldV2Props> = ({
  field,
  value = [],
  onChange,
  disabled = false
}) => {
  const options = field.options || {};
  const itemTemplate = options.itemTemplate || {};
  const isReadonly = options.readonly || disabled;
  const reorderable = options.reorderable && !isReadonly;

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // アイテム追加
  const handleAddItem = () => {
    const newItem: Record<string, any> = {};

    // テンプレートから初期値を設定
    for (const [key, template] of Object.entries(itemTemplate)) {
      if (template.type === 'text') {
        newItem[key] = '';
      } else if (template.type === 'number') {
        newItem[key] = 0;
      } else if (template.type === 'toggle') {
        newItem[key] = false;
      }
    }

    onChange([...value, newItem]);
  };

  // アイテム削除
  const handleRemoveItem = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  // アイテム更新
  const handleUpdateItem = (index: number, key: string, newValue: any) => {
    const updatedItems = value.map((item, i) =>
      i === index ? { ...item, [key]: newValue } : item
    );
    onChange(updatedItems);
  };

  // ドラッグ&ドロップ
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const items = [...value];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);

    onChange(items);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // フィールドレンダリング
  const renderItemField = (item: any, index: number, key: string, template: any) => {
    const fieldValue = item[key];

    switch (template.type) {
      case 'text':
        return (
          <input
            type="text"
            value={fieldValue || ''}
            onChange={(e) => handleUpdateItem(index, key, e.target.value)}
            placeholder={template.placeholder}
            disabled={isReadonly}
            className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={fieldValue || 0}
            onChange={(e) => handleUpdateItem(index, key, Number(e.target.value))}
            placeholder={template.placeholder}
            disabled={isReadonly}
            className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        );

      case 'toggle':
        return (
          <button
            type="button"
            onClick={() => !isReadonly && handleUpdateItem(index, key, !fieldValue)}
            disabled={isReadonly}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              fieldValue ? 'bg-blue-600' : 'bg-gray-200'
            } ${isReadonly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                fieldValue ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* ラベル */}
      <label className="block text-sm font-semibold text-gray-700">
        {field.label}
        {options.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* アイテムリスト */}
      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            draggable={reorderable}
            onDragStart={() => reorderable && handleDragStart(index)}
            onDragOver={(e) => reorderable && handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`p-4 bg-white border rounded-lg ${
              reorderable ? 'cursor-move' : ''
            } ${draggedIndex === index ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start gap-3">
              {/* ドラッグハンドル */}
              {reorderable && (
                <div className="flex-shrink-0 text-gray-400 mt-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
                  </svg>
                </div>
              )}

              {/* フィールド */}
              <div className="flex-1 space-y-2">
                {Object.entries(itemTemplate).map(([key, template]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {template.label}
                    </label>
                    {renderItemField(item, index, key, template)}
                  </div>
                ))}
              </div>

              {/* 削除ボタン */}
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="flex-shrink-0 text-red-600 hover:text-red-700 mt-2"
                  title="削除"
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* 空の状態 */}
        {value.length === 0 && (
          <div className="p-6 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            まだ項目がありません
          </div>
        )}
      </div>

      {/* 追加ボタン */}
      {!isReadonly && (
        <button
          type="button"
          onClick={handleAddItem}
          disabled={!!(options.maxItems && value.length >= options.maxItems)}
          className="w-full px-4 py-2 text-sm font-medium text-blue-600 border-2 border-blue-600 border-dashed rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + {options.addButton || '項目を追加'}
        </button>
      )}

      {/* ヘルプテキスト */}
      {options.helperText && (
        <p className="text-xs text-gray-500">{options.helperText}</p>
      )}

      {/* 件数表示 */}
      {(options.minItems || options.maxItems) && (
        <p className="text-xs text-gray-500">
          {value.length} 件
          {options.minItems && ` (最小: ${options.minItems})`}
          {options.maxItems && ` (最大: ${options.maxItems})`}
        </p>
      )}
    </div>
  );
};
