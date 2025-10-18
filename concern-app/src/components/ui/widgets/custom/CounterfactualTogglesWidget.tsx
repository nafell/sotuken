/**
 * CounterfactualTogglesWidget - 反実仮想トグルウィジェット
 * planステージのカスタムウィジェット
 */

import React from 'react';

interface CounterfactualTogglesWidgetProps {
  value?: Record<string, boolean>;
  onChange?: (value: Record<string, boolean>) => void;
  options?: string[];
  className?: string;
}

export const CounterfactualTogglesWidget: React.FC<CounterfactualTogglesWidgetProps> = ({
  value = {},
  onChange,
  options = ['オプション1', 'オプション2', 'オプション3'],
  className = ''
}) => {
  const handleToggle = (option: string) => {
    const newValue = { ...value, [option]: !value[option] };
    onChange?.(newValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {options.map((option, index) => (
        <label
          key={index}
          className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <input
            type="checkbox"
            checked={value[option] || false}
            onChange={() => handleToggle(option)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-gray-800">{option}</span>
        </label>
      ))}
    </div>
  );
};

