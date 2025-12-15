/**
 * TradeoffSliderWidget - トレードオフスライダーウィジェット
 * planステージのカスタムウィジェット
 */

import React, { useEffect } from 'react';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import type { BaseWidgetProps } from '../../../../types/widget.types';

interface TradeoffSliderWidgetProps extends Partial<BaseWidgetProps> {
  value?: number;
  onChange?: (value: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
  // Reactive props might be passed directly or via spec
  onPortChange?: (widgetId: string, portId: string, value: unknown) => void;
  getPortValue?: (portKey: string) => unknown;
  initialPortValues?: Record<string, unknown>;
  spec?: any; // Should be WidgetSpec
}

export const TradeoffSliderWidget: React.FC<TradeoffSliderWidgetProps> = ({
  value = 0.5,
  onChange,
  leftLabel = '左側',
  rightLabel = '右側',
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

  const handleChange = (newValue: number) => {
    onChange?.(newValue);
    if (spec?.id) {
      emitPort('value', newValue);
    }
  };

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">{leftLabel}</span>
        <span className="text-sm font-semibold text-gray-700">{rightLabel}</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="text-center mt-2 text-gray-600 font-mono">
        {(value * 100).toFixed(0)}%
      </div>
    </div>
  );
};
