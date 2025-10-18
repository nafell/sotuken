/**
 * SummaryListWidget - サマリー表示リストウィジェット
 * render: "summary"
 */

import React, { useState } from 'react';

interface SummaryListWidgetProps {
  items: any[];
  summaryName: string;
  summaryValue: number | string;
  renderItem: (item: any, index: number) => React.ReactNode;
  editable: boolean;
  className?: string;
}

export const SummaryListWidget: React.FC<SummaryListWidgetProps> = ({
  items,
  summaryName,
  summaryValue,
  renderItem,
  editable,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`border border-gray-200 rounded-md ${className}`}>
      {/* サマリーヘッダー */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className="text-gray-600">{summaryName}:</span>
          <span className="font-bold text-gray-900">{summaryValue}</span>
          <span className="text-sm text-gray-500">({items.length}件)</span>
        </div>
        <span className="text-gray-600">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>
      
      {/* 展開されたリスト */}
      {isExpanded && (
        <div className="p-4 space-y-2 bg-white">
          {items.map((item, index) => (
            <div
              key={index}
              className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              {renderItem(item, index)}
            </div>
          ))}
          
          {items.length === 0 && (
            <p className="text-center text-gray-500 py-4">アイテムがありません</p>
          )}
        </div>
      )}
    </div>
  );
};

