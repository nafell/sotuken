/**
 * ListWidget - リスト展開表示ウィジェット
 * render: "expanded"
 */

import React from 'react';

interface ListWidgetProps {
  items: any[];
  editable: boolean;
  reorderable?: boolean;
  renderItem?: (item: any, index: number) => React.ReactNode;
  onChange?: (items: any[]) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  className?: string;
}

export const ListWidget: React.FC<ListWidgetProps> = ({
  items,
  editable,
  reorderable = false,
  renderItem,
  onChange,
  onAdd,
  onRemove,
  onReorder,
  className = ''
}) => {
  // デフォルトのrenderItem（タスクオブジェクト用）
  const defaultRenderItem = (item: any, index: number) => {
    if (!editable) {
      // 読み取り専用表示
      return (
        <div>
          <div className="font-medium">{item.title || item.name || `アイテム ${index + 1}`}</div>
          {item.description && <div className="text-sm text-gray-600">{item.description}</div>}
        </div>
      );
    }
    
    // 編集可能なフォーム
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={item.title || ''}
          onChange={(e) => {
            const newItems = [...items];
            newItems[index] = { ...item, title: e.target.value };
            onChange?.(newItems);
          }}
          placeholder="タスクのタイトル"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <textarea
          value={item.description || ''}
          onChange={(e) => {
            const newItems = [...items];
            newItems[index] = { ...item, description: e.target.value };
            onChange?.(newItems);
          }}
          placeholder="説明（任意）"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">重要度 (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={item.importance || 3}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index] = { ...item, importance: parseInt(e.target.value) || 3 };
                onChange?.(newItems);
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">緊急度 (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={item.urgency || 3}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index] = { ...item, urgency: parseInt(e.target.value) || 3 };
                onChange?.(newItems);
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">所要時間 (分)</label>
            <input
              type="number"
              min="1"
              value={item.estimatedMinutes || 30}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index] = { ...item, estimatedMinutes: parseInt(e.target.value) || 30 };
                onChange?.(newItems);
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>
    );
  };

  const handleAdd = () => {
    const newItem = {
      title: '',
      description: '',
      importance: 3,
      urgency: 3,
      estimatedMinutes: 30
    };
    const newItems = [...items, newItem];
    onChange?.(newItems);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange?.(newItems);
  };

  const actualRenderItem = renderItem || defaultRenderItem;

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-start space-x-2 p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
        >
          {reorderable && editable && (
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => index > 0 && onReorder?.(index, index - 1)}
                disabled={index === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                onClick={() => index < items.length - 1 && onReorder?.(index, index + 1)}
                disabled={index === items.length - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                ▼
              </button>
            </div>
          )}
          
          <div className="flex-1">
            {actualRenderItem(item, index)}
          </div>
          
          {editable && (
            <button
              onClick={() => onRemove ? onRemove(index) : handleRemove(index)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      
      {editable && (
        <button
          onClick={onAdd || handleAdd}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
          + タスクを追加
        </button>
      )}
    </div>
  );
};

