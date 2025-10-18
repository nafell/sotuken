/**
 * TradeoffSliderWidget - トレードオフスライダーウィジェット
 * planステージのカスタムウィジェット
 */

import React from 'react';

interface TradeoffSliderWidgetProps {
  value?: number;
  onChange?: (value: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}

export const TradeoffSliderWidget: React.FC<TradeoffSliderWidgetProps> = ({
  value = 0.5,
  onChange,
  leftLabel = '左側',
  rightLabel = '右側',
  className = ''
}) => {
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
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="text-center mt-2 text-gray-600 font-mono">
        {(value * 100).toFixed(0)}%
      </div>
    </div>
  );
};

