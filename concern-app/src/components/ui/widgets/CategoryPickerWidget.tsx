/**
 * CategoryPickerWidget - カテゴリー選択ウィジェット
 * render: "category"
 */

import React from 'react';

interface CategoryPickerWidgetProps {
  categories: string[];
  selected: string;
  editable: boolean;
  onChange?: (category: string) => void;
  className?: string;
}

export const CategoryPickerWidget: React.FC<CategoryPickerWidgetProps> = ({
  categories,
  selected,
  editable,
  onChange,
  className = ''
}) => {
  if (!editable) {
    return (
      <div className={`inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold ${className}`}>
        {selected || '（未選択）'}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {categories.map((category, index) => (
        <button
          key={index}
          onClick={() => onChange?.(category)}
          className={`px-4 py-2 rounded-full font-semibold transition-all ${
            selected === category
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

