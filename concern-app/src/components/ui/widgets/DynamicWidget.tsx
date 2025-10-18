/**
 * DynamicWidget - カスタムウィジェット動的読み込み
 * render: "custom"
 */

import React from 'react';
import { TradeoffSliderWidget } from './custom/TradeoffSliderWidget';
import { CounterfactualTogglesWidget } from './custom/CounterfactualTogglesWidget';
import { StrategyPreviewPickerWidget } from './custom/StrategyPreviewPickerWidget';

interface DynamicWidgetProps {
  component: string;
  props?: Record<string, any>;
  value?: any;
  onChange?: (value: any) => void;
  className?: string;
}

export const DynamicWidget: React.FC<DynamicWidgetProps> = ({
  component,
  props = {},
  value,
  onChange,
  className = ''
}) => {
  // カスタムコンポーネントのマッピング
  const componentMap: Record<string, React.ComponentType<any>> = {
    tradeoff_slider: TradeoffSliderWidget,
    counterfactual_toggles: CounterfactualTogglesWidget,
    strategy_preview_picker: StrategyPreviewPickerWidget,
  };

  const Component = componentMap[component];

  if (!Component) {
    console.warn(`Unknown custom component: ${component}`);
    return (
      <div className={`p-4 border-2 border-yellow-400 bg-yellow-50 rounded-md ${className}`}>
        <p className="text-yellow-800 font-semibold">
          未実装のカスタムウィジェット: {component}
        </p>
        <pre className="mt-2 text-xs text-gray-600">
          {JSON.stringify({ props, value }, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className={className}>
      <Component {...props} value={value} onChange={onChange} />
    </div>
  );
};

