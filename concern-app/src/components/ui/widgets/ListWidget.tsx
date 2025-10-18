/**
 * ListWidget - リスト展開表示ウィジェット
 * render: "expanded"
 */

import React from 'react';

interface ListWidgetProps {
  items: any[];
  editable: boolean;
  reorderable?: boolean;
  renderItem: (item: any, index: number) => React.ReactNode;
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
  onAdd,
  onRemove,
  onReorder,
  className = ''
}) => {
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
            {renderItem(item, index)}
          </div>
          
          {editable && onRemove && (
            <button
              onClick={() => onRemove(index)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      
      {editable && onAdd && (
        <button
          onClick={onAdd}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
          + 追加
        </button>
      )}
    </div>
  );
};

