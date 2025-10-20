/**
 * NumberFieldV2 - 数値入力ウィジェット
 */

import React from 'react';
import type { UIField } from '../../../../../../server/src/types/UISpecV2';

interface NumberFieldV2Props {
  field: UIField;
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const NumberFieldV2: React.FC<NumberFieldV2Props> = ({
  field,
  value = 0,
  onChange,
  disabled = false
}) => {
  const options = field.options || {};
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
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={options.placeholder}
          disabled={isReadonly}
          min={options.min}
          max={options.max}
          step={options.step}
          required={options.required}
          className={`${baseClasses} ${disabledClasses} flex-1`}
        />
        {options.unit && (
          <span className="text-sm text-gray-600 font-medium">
            {options.unit}
          </span>
        )}
      </div>

      {/* ヘルプテキスト */}
      {options.helperText && (
        <p className="text-xs text-gray-500">{options.helperText}</p>
      )}

      {/* 範囲表示 */}
      {(options.min !== undefined || options.max !== undefined) && (
        <p className="text-xs text-gray-500">
          {options.min !== undefined && options.max !== undefined
            ? `範囲: ${options.min} 〜 ${options.max}`
            : options.min !== undefined
            ? `最小: ${options.min}`
            : `最大: ${options.max}`}
        </p>
      )}
    </div>
  );
};
