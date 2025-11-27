/**
 * TextAreaWidget - 段落テキスト入力ウィジェット
 * render: "paragraph"
 */

import React from 'react';

interface TextAreaWidgetProps {
  value: string;
  editable: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const TextAreaWidget: React.FC<TextAreaWidgetProps> = ({
  value,
  editable,
  placeholder,
  onChange,
  className = ''
}) => {
  if (!editable) {
    return (
      <div className={`p-3 bg-gray-50 rounded-md border border-gray-200 ${className}`}>
        <p className="text-gray-800 whitespace-pre-wrap">{value || '（未入力）'}</p>
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px] ${className}`}
    />
  );
};

