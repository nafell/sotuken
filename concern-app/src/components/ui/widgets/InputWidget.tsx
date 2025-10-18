/**
 * InputWidget - 短文テキスト入力ウィジェット
 * render: "shortText"
 */

import React from 'react';

interface InputWidgetProps {
  value: string;
  editable: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const InputWidget: React.FC<InputWidgetProps> = ({
  value,
  editable,
  placeholder,
  onChange,
  className = ''
}) => {
  if (!editable) {
    return (
      <div className={`p-2 bg-gray-50 rounded-md border border-gray-200 ${className}`}>
        <span className="text-gray-800">{value || '（未入力）'}</span>
      </div>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  );
};

