/**
 * UIRendererV3.tsx
 * DSL v3 UISpec対応のWidgetレンダラー
 *
 * Phase 4 - DSL v3 検証
 * UISpec JSONから4種のv3 Widgetをレンダリング
 */

import React, { useCallback, useMemo } from 'react';
import type { UISpec, WidgetSpec } from '../../types/ui-spec.types';
import type { BaseWidgetProps, WidgetSpecObject } from '../../types/widget.types';

// v3 Widget Components - Phase 1 (Basic)
import { EmotionPalette } from '../../components/widgets/v3/EmotionPalette/EmotionPalette';
import { BrainstormCards } from '../../components/widgets/v3/BrainstormCards/BrainstormCards';
import { MatrixPlacement } from '../../components/widgets/v3/MatrixPlacement/MatrixPlacement';
import { PrioritySliderGrid } from '../../components/widgets/v3/PrioritySliderGrid/PrioritySliderGrid';

// v3 Widget Components - Phase 2 (Extended)
import { QuestionCardChain } from '../../components/widgets/v3/QuestionCardChain/QuestionCardChain';
import { CardSorting } from '../../components/widgets/v3/CardSorting/CardSorting';
import { DependencyMapping } from '../../components/widgets/v3/DependencyMapping/DependencyMapping';
import { SwotAnalysis } from '../../components/widgets/v3/SwotAnalysis/SwotAnalysis';
import { MindMap } from '../../components/widgets/v3/MindMap/MindMap';
import { TradeoffBalance } from '../../components/widgets/v3/TradeoffBalance/TradeoffBalance';
import { TimelineSlider } from '../../components/widgets/v3/TimelineSlider/TimelineSlider';
import { StructuredSummary } from '../../components/widgets/v3/StructuredSummary/StructuredSummary';

// Widget Component Registry
const WIDGET_COMPONENTS: Record<string, React.FC<BaseWidgetProps>> = {
  // Phase 1 - Basic Widgets
  emotion_palette: EmotionPalette,
  brainstorm_cards: BrainstormCards,
  matrix_placement: MatrixPlacement,
  priority_slider_grid: PrioritySliderGrid,
  // Phase 2 - Extended Widgets (diverge)
  question_card_chain: QuestionCardChain,
  // Phase 2 - Extended Widgets (organize)
  card_sorting: CardSorting,
  dependency_mapping: DependencyMapping,
  swot_analysis: SwotAnalysis,
  mind_map: MindMap,
  // Phase 2 - Extended Widgets (converge)
  tradeoff_balance: TradeoffBalance,
  timeline_slider: TimelineSlider,
  // Phase 2 - Extended Widgets (summary)
  structured_summary: StructuredSummary,
};

// Props
export interface UIRendererV3Props {
  uiSpec: UISpec;
  onWidgetUpdate?: (widgetId: string, data: any) => void;
  onWidgetComplete?: (widgetId: string) => void;
  className?: string;
}

/**
 * WidgetSpecをWidgetSpecObjectに変換
 * DSL層の型から実装層の型へ変換
 */
function convertToWidgetSpecObject(spec: WidgetSpec): WidgetSpecObject {
  return {
    id: spec.id,
    component: spec.component,
    position: spec.position,
    layout: spec.layout,
    config: spec.config || {},
    inputs: spec.inputs?.map((input) => ({
      name: input.name,
      type: input.type,
      source: input.source,
      required: input.required,
      defaultValue: input.defaultValue,
      description: input.description,
    })),
    outputs: spec.outputs?.map((output) => ({
      name: output.name,
      type: output.type,
      source: output.source,
      required: output.required,
      defaultValue: output.defaultValue,
      description: output.description,
    })),
    reactiveBindings: spec.reactiveBindings?.map((binding) => ({
      source: binding.source,
      target: binding.target,
      mechanism: binding.mechanism,
      relationship: {
        type: binding.relationship.type,
        javascript: binding.relationship.javascript,
        transform:
          typeof binding.relationship.transform === 'string'
            ? binding.relationship.transform
            : undefined,
        llmPrompt: binding.relationship.llmPrompt,
      },
      updateMode: binding.updateMode,
    })),
    metadata: spec.metadata,
  };
}

/**
 * UIRendererV3 Component
 * UISpec v3を受け取り、Widgetをレンダリング
 */
export const UIRendererV3: React.FC<UIRendererV3Props> = ({
  uiSpec,
  onWidgetUpdate,
  onWidgetComplete,
  className,
}) => {
  // Widgetをposition順にソート
  const sortedWidgets = useMemo(() => {
    return [...uiSpec.widgets].sort((a, b) => a.position - b.position);
  }, [uiSpec.widgets]);

  // Widget更新ハンドラー
  const handleWidgetUpdate = useCallback(
    (widgetId: string, data: any) => {
      console.log(`[UIRendererV3] Widget update: ${widgetId}`, data);
      onWidgetUpdate?.(widgetId, data);
    },
    [onWidgetUpdate]
  );

  // Widget完了ハンドラー
  const handleWidgetComplete = useCallback(
    (widgetId: string) => {
      console.log(`[UIRendererV3] Widget complete: ${widgetId}`);
      onWidgetComplete?.(widgetId);
    },
    [onWidgetComplete]
  );

  return (
    <div className={className} style={containerStyle}>
      <div style={headerStyle}>
        <span style={badgeStyle}>{uiSpec.stage}</span>
        <span style={sessionIdStyle}>Session: {uiSpec.sessionId}</span>
      </div>

      <div style={widgetsContainerStyle}>
        {sortedWidgets.map((widgetSpec) => {
          const WidgetComponent = WIDGET_COMPONENTS[widgetSpec.component];

          if (!WidgetComponent) {
            return (
              <div key={widgetSpec.id} style={errorWidgetStyle}>
                <strong>Unknown Widget:</strong> {widgetSpec.component}
                <br />
                <small>ID: {widgetSpec.id}</small>
              </div>
            );
          }

          const specObject = convertToWidgetSpecObject(widgetSpec);

          return (
            <div key={widgetSpec.id} style={widgetWrapperStyle}>
              <div style={widgetHeaderStyle}>
                <span style={widgetLabelStyle}>
                  #{widgetSpec.position} - {widgetSpec.component}
                </span>
                <span style={widgetIdStyle}>{widgetSpec.id}</span>
              </div>
              <WidgetComponent
                spec={specObject}
                onUpdate={handleWidgetUpdate}
                onComplete={handleWidgetComplete}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Inline styles for simplicity (development/demo purposes)
const containerStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#f5f5f5',
  minHeight: '100vh',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '24px',
  padding: '12px',
  backgroundColor: '#fff',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const badgeStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: '#4CAF50',
  color: '#fff',
  borderRadius: '16px',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
};

const sessionIdStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
};

const widgetsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const widgetWrapperStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  overflow: 'hidden',
};

const widgetHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 16px',
  backgroundColor: '#e3f2fd',
  borderBottom: '1px solid #bbdefb',
};

const widgetLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#1976d2',
};

const widgetIdStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#64b5f6',
  fontFamily: 'monospace',
};

const errorWidgetStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#ffebee',
  border: '1px solid #ef5350',
  borderRadius: '8px',
  color: '#c62828',
};

export default UIRendererV3;
