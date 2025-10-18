/**
 * RadioGroupWidget - ラジオボタングループウィジェット
 * render: "radio"
 */

import React from 'react';

interface RadioGroupWidgetProps {
  value: string;
  options: string[];
  editable: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

export const RadioGroupWidget: React.FC<RadioGroupWidgetProps> = ({
  value,
  options,
  editable,
  onChange,
  className = ''
}) => {
  if (!editable) {
    return (
      <div className={`p-3 bg-gray-50 rounded-md border border-gray-200 ${className}`}>
        <span className="text-gray-800 font-semibold">{value || '（未選択）'}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {options.map((option, index) => (
        <label
          key={index}
          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
        >
          <input
            type="radio"
            name={`radio-group-${Date.now()}`}
            value={option}
            checked={value === option}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-800">{option}</span>
        </label>
      ))}
    </div>
  );
};

