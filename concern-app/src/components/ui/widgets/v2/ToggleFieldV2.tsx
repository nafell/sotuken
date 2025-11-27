/**
 * ToggleFieldV2 - トグルウィジェット
 */

import React from 'react';
import type { UIField } from '../../../../../../server/src/types/UISpecV2';

interface ToggleFieldV2Props {
  field: UIField;
  value?: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const ToggleFieldV2: React.FC<ToggleFieldV2Props> = ({
  field,
  value = false,
  onChange,
  disabled = false
}) => {
  const options = field.options || {};
  const isReadonly = options.readonly || disabled;

  return (
    <div className="space-y-2">
      {/* ラベルとトグル */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          {field.label}
          {options.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {/* トグルスイッチ */}
        <button
          type="button"
          onClick={() => !isReadonly && onChange(!value)}
          disabled={isReadonly}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            value ? 'bg-blue-600' : 'bg-gray-200'
          } ${isReadonly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* ON/OFFラベル表示 */}
      {(options.onLabel || options.offLabel) && (
        <div className="text-sm text-gray-600">
          {value ? options.onLabel || 'ON' : options.offLabel || 'OFF'}
        </div>
      )}

      {/* ヘルプテキスト */}
      {options.helperText && (
        <p className="text-xs text-gray-500">{options.helperText}</p>
      )}
    </div>
  );
};
