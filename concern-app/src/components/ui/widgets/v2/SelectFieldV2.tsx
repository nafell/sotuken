/**
 * SelectFieldV2 - 選択ウィジェット
 */

import React from 'react';
import type { UIField } from '../../../../../../server/src/types/UISpecV2';

interface SelectFieldV2Props {
  field: UIField;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
}

export const SelectFieldV2: React.FC<SelectFieldV2Props> = ({
  field,
  value = '',
  onChange,
  disabled = false
}) => {
  const options = field.options || {};
  const choices = options.choices || [];
  const display = options.display || 'dropdown';
  const isMultiple = options.multiple || false;
  const isReadonly = options.readonly || disabled;

  // ボタン表示
  if (display === 'buttons') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          {field.label}
          {options.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="flex flex-wrap gap-2">
          {choices.map((choice) => {
            const isSelected = isMultiple
              ? (value as string[]).includes(choice.value)
              : value === choice.value;

            return (
              <button
                key={choice.value}
                onClick={() => {
                  if (isMultiple) {
                    const currentValues = (value as string[]) || [];
                    const newValues = isSelected
                      ? currentValues.filter(v => v !== choice.value)
                      : [...currentValues, choice.value];
                    onChange(newValues);
                  } else {
                    onChange(choice.value);
                  }
                }}
                disabled={isReadonly || choice.disabled}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {choice.label}
              </button>
            );
          })}
        </div>

        {options.helperText && (
          <p className="text-xs text-gray-500">{options.helperText}</p>
        )}
      </div>
    );
  }

  // ラジオボタン表示
  if (display === 'radio') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          {field.label}
          {options.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="space-y-2">
          {choices.map((choice) => (
            <label
              key={choice.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                value === choice.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${(isReadonly || choice.disabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                value={choice.value}
                checked={value === choice.value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isReadonly || choice.disabled}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{choice.label}</div>
                {choice.description && (
                  <div className="text-sm text-gray-600 mt-1">{choice.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>

        {options.helperText && (
          <p className="text-xs text-gray-500 mt-2">{options.helperText}</p>
        )}
      </div>
    );
  }

  // ドロップダウン表示
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {field.label}
        {options.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <select
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        disabled={isReadonly}
        required={options.required}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">選択してください</option>
        {choices.map((choice) => (
          <option
            key={choice.value}
            value={choice.value}
            disabled={choice.disabled}
          >
            {choice.label}
          </option>
        ))}
      </select>

      {options.helperText && (
        <p className="text-xs text-gray-500">{options.helperText}</p>
      )}
    </div>
  );
};
