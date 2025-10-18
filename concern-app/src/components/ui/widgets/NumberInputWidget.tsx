/**
 * NumberInputWidget - 数値入力ウィジェット
 * render: "number"
 */

import React from 'react';

interface NumberInputWidgetProps {
  value: number;
  editable: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  className?: string;
}

export const NumberInputWidget: React.FC<NumberInputWidgetProps> = ({
  value,
  editable,
  placeholder,
  min,
  max,
  step = 1,
  onChange,
  className = ''
}) => {
  if (!editable) {
    return (
      <div className={`p-2 bg-gray-50 rounded-md border border-gray-200 ${className}`}>
        <span className="text-gray-800 font-mono">{value}</span>
      </div>
    );
  }

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange?.(parseFloat(e.target.value))}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${className}`}
    />
  );
};

