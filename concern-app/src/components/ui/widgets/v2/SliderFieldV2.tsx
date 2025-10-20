/**
 * SliderFieldV2 - スライダーウィジェット
 */

import React from 'react';
import type { UIField } from '../../../../../../server/src/types/UISpecV2';

interface SliderFieldV2Props {
  field: UIField;
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const SliderFieldV2: React.FC<SliderFieldV2Props> = ({
  field,
  value = 0.5,
  onChange,
  disabled = false
}) => {
  const options = field.options || {};
  const min = options.min ?? 0;
  const max = options.max ?? 1;
  const step = options.step ?? 0.1;
  const showValue = options.showValue ?? false;
  const isReadonly = options.readonly || disabled;

  // パーセント表示用
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      {/* ラベル */}
      <label className="block text-sm font-semibold text-gray-700">
        {field.label}
        {options.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* ラベル表示（左右） */}
      {(options.leftLabel || options.rightLabel) && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>{options.leftLabel || ''}</span>
          <span>{options.rightLabel || ''}</span>
        </div>
      )}

      {/* スライダー */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={isReadonly}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
          }}
        />

        {/* マーク */}
        {options.marks && (
          <div className="relative mt-2">
            {options.marks.map((mark) => {
              const markPosition = ((mark.value - min) / (max - min)) * 100;
              return (
                <div
                  key={mark.value}
                  className="absolute text-xs text-gray-500 transform -translate-x-1/2"
                  style={{ left: `${markPosition}%` }}
                >
                  {mark.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 値表示 */}
      {showValue && (
        <div className="text-center text-lg font-semibold text-gray-900">
          {value}
        </div>
      )}

      {/* ヘルプテキスト */}
      {options.helperText && (
        <p className="text-xs text-gray-500">{options.helperText}</p>
      )}
    </div>
  );
};
