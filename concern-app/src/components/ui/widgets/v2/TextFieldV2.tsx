/**
 * TextFieldV2 - テキスト入力ウィジェット
 */

import React from 'react';
import type { UIField } from '../../../../../../server/src/types/UISpecV2';

interface TextFieldV2Props {
  field: UIField;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const TextFieldV2: React.FC<TextFieldV2Props> = ({
  field,
  value = '',
  onChange,
  disabled = false
}) => {
  const options = field.options || {};
  const isMultiline = options.multiline || false;
  const isReadonly = options.readonly || disabled;

  const baseClasses = "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const disabledClasses = isReadonly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "bg-white";

  return (
    <div className="space-y-2">
      {/* ラベル */}
      <label className="block text-sm font-semibold text-gray-700">
        {field.label}
        {options.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* 入力フィールド */}
      {isMultiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={options.placeholder}
          disabled={isReadonly}
          minLength={options.minLength}
          maxLength={options.maxLength}
          required={options.required}
          className={`${baseClasses} ${disabledClasses} min-h-[120px] resize-y`}
          rows={4}
        />
      ) : (
        <input
          type={options.inputType || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={options.placeholder}
          disabled={isReadonly}
          minLength={options.minLength}
          maxLength={options.maxLength}
          required={options.required}
          className={`${baseClasses} ${disabledClasses}`}
        />
      )}

      {/* ヘルプテキスト */}
      {options.helperText && (
        <p className="text-xs text-gray-500">{options.helperText}</p>
      )}

      {/* 文字数カウンター */}
      {options.maxLength && value && (
        <p className="text-xs text-gray-500 text-right">
          {value.length} / {options.maxLength}
        </p>
      )}
    </div>
  );
};
