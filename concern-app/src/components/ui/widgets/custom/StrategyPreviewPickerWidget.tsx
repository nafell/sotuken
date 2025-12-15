/**
 * StrategyPreviewPickerWidget - 戦略プレビューピッカーウィジェット
 * planステージのカスタムウィジェット
 */

import React, { useEffect } from 'react';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import type { BaseWidgetProps } from '../../../../types/widget.types';

interface Strategy {
  id: string;
  name: string;
  description: string;
  preview?: string;
}

interface StrategyPreviewPickerWidgetProps extends Partial<BaseWidgetProps> {
  value?: string;
  onChange?: (strategyId: string) => void;
  strategies?: Strategy[];
  className?: string;
  // Reactive props
  spec?: any;
  onPortChange?: (widgetId: string, portId: string, value: unknown) => void;
  getPortValue?: (portKey: string) => unknown;
  initialPortValues?: Record<string, unknown>;
}

export const StrategyPreviewPickerWidget: React.FC<StrategyPreviewPickerWidgetProps> = ({
  value,
  onChange,
  strategies = [
    { id: 'strategy1', name: '戦略A', description: '戦略Aの説明', preview: 'プレビューA' },
    { id: 'strategy2', name: '戦略B', description: '戦略Bの説明', preview: 'プレビューB' },
  ],
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
    if (spec?.id && value) {
      emitPort('value', value);
    }
  }, [spec?.id, emitPort, value]);

  const handleChange = (strategyId: string) => {
    onChange?.(strategyId);
    if (spec?.id) {
      emitPort('value', strategyId);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {strategies.map((strategy) => (
        <button
          key={strategy.id}
          onClick={() => handleChange(strategy.id)}
          className={`w-full p-4 border-2 rounded-md text-left transition-all ${value === strategy.id
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
        >
          <h4 className="font-bold text-gray-900 mb-1">{strategy.name}</h4>
          <p className="text-sm text-gray-600 mb-2">{strategy.description}</p>
          {strategy.preview && (
            <div className="p-2 bg-gray-100 rounded text-xs text-gray-700">
              {strategy.preview}
            </div>
          )}
        </button>
      ))}
    </div>
  );
};
