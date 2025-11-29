/**
 * CounterfactualTogglesWidget - 反実仮想トグルウィジェット
 * planステージのカスタムウィジェット
 */

import React, { useEffect } from 'react';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import type { BaseWidgetProps } from '../../../../types/widget.types';

interface CounterfactualTogglesWidgetProps extends Partial<BaseWidgetProps> {
  value?: Record<string, boolean>;
  onChange?: (value: Record<string, boolean>) => void;
  options?: string[];
  className?: string;
  // Reactive props
  spec?: any; // WidgetSpecObject is complex, keeping any for now. Reactive props might be passed directly or via spec.
  onPortChange?: (widgetId: string, portId: string, value: unknown) => void;
  getPortValue?: (portKey: string) => unknown;
  initialPortValues?: Record<string, unknown>;
}

export const CounterfactualTogglesWidget: React.FC<CounterfactualTogglesWidgetProps> = ({
  value = {},
  onChange,
  options = ['オプション1', 'オプション2', 'オプション3'],
  className = '',
  // Reactive props
  spec,
  onPortChange,
  getPortValue,
  initialPortValues,
}) => {
  // Use reactive ports if available
  const { emitPort } = useReactivePorts({
    widgetId: spec?.id || 'unknown',
    onPortChange,
    getPortValue,
    initialPortValues,
  });

  // Emit initial value if spec is present
  useEffect(() => {
    if (spec?.id) {
      emitPort('value', value);
    }
  }, [spec?.id, emitPort, value]);

  const handleToggle = (option: string) => {
    const newValue = { ...value, [option]: !value[option] };
    onChange?.(newValue);
    if (spec?.id) {
      emitPort('value', newValue);
    }
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
