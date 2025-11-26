/**
 * WidgetShowcasePage.tsx
 * Widget個別Showcaseページ（動的ルート対応）
 *
 * /dev-demo/widgets/:widgetType でアクセス
 * 各Widgetを単独で表示・操作・デバッグ可能
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import {
  WIDGET_SHOWCASE_CONFIGS,
  WIDGET_TYPES,
  STAGE_LABELS,
} from './widget-configs';
import {
  DebugSidebar,
  type WidgetUpdateLog,
} from '../../../components/demo/widget-showcase/DebugSidebar';
import type { WidgetComponentType } from '../../../types/ui-spec.types';
import type { WidgetSpecObject } from '../../../types/widget.types';

// Widget Imports (same as UIRendererV3)
import { EmotionPalette } from '../../../components/widgets/v3/EmotionPalette/EmotionPalette';
import { BrainstormCards } from '../../../components/widgets/v3/BrainstormCards/BrainstormCards';
import { MatrixPlacement } from '../../../components/widgets/v3/MatrixPlacement/MatrixPlacement';
import { PrioritySliderGrid } from '../../../components/widgets/v3/PrioritySliderGrid/PrioritySliderGrid';
import { QuestionCardChain } from '../../../components/widgets/v3/QuestionCardChain/QuestionCardChain';
import { CardSorting } from '../../../components/widgets/v3/CardSorting/CardSorting';
import { DependencyMapping } from '../../../components/widgets/v3/DependencyMapping/DependencyMapping';
import { SwotAnalysis } from '../../../components/widgets/v3/SwotAnalysis/SwotAnalysis';
import { MindMap } from '../../../components/widgets/v3/MindMap/MindMap';
import { TradeoffBalance } from '../../../components/widgets/v3/TradeoffBalance/TradeoffBalance';
import { TimelineSlider } from '../../../components/widgets/v3/TimelineSlider/TimelineSlider';
import { StructuredSummary } from '../../../components/widgets/v3/StructuredSummary/StructuredSummary';

// Widget Component Registry
const WIDGET_COMPONENTS: Record<WidgetComponentType, React.FC<any>> = {
  emotion_palette: EmotionPalette,
  brainstorm_cards: BrainstormCards,
  matrix_placement: MatrixPlacement,
  priority_slider_grid: PrioritySliderGrid,
  question_card_chain: QuestionCardChain,
  card_sorting: CardSorting,
  dependency_mapping: DependencyMapping,
  swot_analysis: SwotAnalysis,
  mind_map: MindMap,
  tradeoff_balance: TradeoffBalance,
  timeline_slider: TimelineSlider,
  structured_summary: StructuredSummary,
};

/**
 * WidgetShowcasePage Component
 */
export default function WidgetShowcasePage() {
  const { widgetType } = useParams<{ widgetType: string }>();

  // Validate widget type
  if (!widgetType || !WIDGET_TYPES.includes(widgetType as WidgetComponentType)) {
    return <Navigate to="/dev-demo/widgets" replace />;
  }

  const config = WIDGET_SHOWCASE_CONFIGS[widgetType as WidgetComponentType];
  const [selectedVariation, setSelectedVariation] = useState(config.variations[0].id);
  const [updateLogs, setUpdateLogs] = useState<WidgetUpdateLog[]>([]);
  const [completedWidgets, setCompletedWidgets] = useState<string[]>([]);
  const [widgetKey, setWidgetKey] = useState(0);
  const [currentData, setCurrentData] = useState<any>(null);

  // Current variation config
  const currentVariation = useMemo(() => {
    return config.variations.find((v) => v.id === selectedVariation) || config.variations[0];
  }, [config, selectedVariation]);

  // Build widget spec
  const widgetSpec: WidgetSpecObject = useMemo(
    () => ({
      id: `showcase_${widgetType}_${selectedVariation}`,
      component: widgetType as WidgetComponentType,
      position: 1,
      layout: 'single',
      config: currentVariation.config,
      inputs: [],
      outputs: [],
      reactiveBindings: [],
      metadata: {
        timing: 0.5,
        versatility: 0.5,
        bottleneck: [],
        description: config.description,
      },
    }),
    [widgetType, selectedVariation, currentVariation, config]
  );

  const WidgetComponent = WIDGET_COMPONENTS[widgetType as WidgetComponentType];

  // Handlers
  const handleUpdate = useCallback((widgetId: string, data: any) => {
    const log: WidgetUpdateLog = {
      timestamp: new Date().toISOString(),
      widgetId,
      data,
    };
    setUpdateLogs((prev) => [log, ...prev].slice(0, 50));
    setCurrentData(data);
  }, []);

  const handleComplete = useCallback((widgetId: string) => {
    setCompletedWidgets((prev) =>
      prev.includes(widgetId) ? prev : [...prev, widgetId]
    );
  }, []);

  const handleReset = useCallback(() => {
    setWidgetKey((prev) => prev + 1);
    setUpdateLogs([]);
    setCompletedWidgets([]);
    setCurrentData(null);
  }, []);

  const handleClearLogs = useCallback(() => {
    setUpdateLogs([]);
  }, []);

  const handleConfigChange = useCallback(
    (configId: string) => {
      setSelectedVariation(configId);
      handleReset();
    },
    [handleReset]
  );

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>{config.name}</h1>
          <p style={subtitleStyle}>{config.description}</p>
        </div>
        <div style={badgeContainerStyle}>
          <span style={stageBadgeStyle}>
            {STAGE_LABELS[config.stage]} ({config.stage})
          </span>
          <span style={typeBadgeStyle}>{widgetType}</span>
          <Link to="/dev-demo/widgets" style={backLinkStyle}>
            Back to Index
          </Link>
          <span style={devBadgeStyle}>DEV ONLY</span>
        </div>
      </header>

      <div style={contentStyle}>
        {/* Main: Widget Display */}
        <main style={mainStyle}>
          <div
            data-testid="widget-container"
            data-widget-type={widgetType}
            data-widget-variation={selectedVariation}
            style={widgetWrapperStyle}
          >
            <WidgetComponent
              key={widgetKey}
              spec={widgetSpec}
              onUpdate={handleUpdate}
              onComplete={handleComplete}
            />
          </div>
        </main>

        {/* Sidebar: Debug Panel */}
        <aside style={sidebarStyle}>
          <DebugSidebar
            updateLogs={updateLogs}
            completedWidgets={completedWidgets}
            currentConfig={selectedVariation}
            availableConfigs={config.variations.map((v) => ({
              id: v.id,
              label: v.label,
            }))}
            onConfigChange={handleConfigChange}
            onClear={handleClearLogs}
            onReset={handleReset}
            widgetData={currentData}
          />
        </aside>
      </div>
    </div>
  );
}

// Styles
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#1a1a2e',
  color: '#eee',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const headerStyle: React.CSSProperties = {
  padding: '16px 24px',
  backgroundColor: '#16213e',
  borderBottom: '2px solid #0f3460',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
  fontWeight: 'bold',
};

const subtitleStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: '12px',
  color: '#888',
};

const badgeContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const stageBadgeStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: '#3b82f6',
  color: '#fff',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 'bold',
};

const typeBadgeStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: '#0f3460',
  color: '#fff',
  borderRadius: '4px',
  fontSize: '11px',
  fontFamily: 'monospace',
};

const backLinkStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: '#374151',
  color: '#fff',
  borderRadius: '4px',
  fontSize: '11px',
  textDecoration: 'none',
};

const devBadgeStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: '#e94560',
  color: '#fff',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 'bold',
};

const contentStyle: React.CSSProperties = {
  display: 'flex',
  height: 'calc(100vh - 90px)',
};

const mainStyle: React.CSSProperties = {
  flex: '1',
  overflow: 'auto',
  padding: '16px',
};

const widgetWrapperStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  overflow: 'hidden',
};

const sidebarStyle: React.CSSProperties = {
  width: '360px',
  borderLeft: '1px solid #0f3460',
  overflow: 'auto',
};
