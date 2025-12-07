/**
 * UIRendererV4.tsx
 * DSL v4 UISpec対応のWidgetレンダラー
 *
 * DSL v4 Phase 3 - TASK-3.1
 *
 * v3からの変更点:
 * - UISpec v4対応（ReactiveBindingSpec内包）
 * - ORS連携（DataBindingProcessor）
 * - ReactiveBindingEngineV4
 * - WidgetSpec.dataBindings対応
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import type { UISpec, WidgetSpec, DataBindingSpec } from '../../types/v4/ui-spec.types';
import type { ORS } from '../../types/v4/ors.types';
import type { BaseWidgetProps, WidgetSpecObject } from '../../types/widget.types';
import type { WidgetPortPath } from '../../types/v4/reactive-binding.types';
import { DataBindingProcessor, createDataBindingProcessor } from '../ui/DataBindingProcessor';
import { createReactiveBindingEngineV4, type PropagationEventV4 } from '../ui/ReactiveBindingEngineV4';

// v3 Widget Components（既存を再利用）
import { EmotionPalette } from '../../components/widgets/v3/EmotionPalette/EmotionPalette';
import { BrainstormCards } from '../../components/widgets/v3/BrainstormCards/BrainstormCards';
import { MatrixPlacement } from '../../components/widgets/v3/MatrixPlacement/MatrixPlacement';
import { PrioritySliderGrid } from '../../components/widgets/v3/PrioritySliderGrid/PrioritySliderGrid';
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
  // Core Widgets (v3)
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
  // TODO: 将来v4で追加予定のWidget
  // - free_writing: フリーライティング専用Widget
  // - action_cards: アクションカード専用Widget
  // - decision_balance: 意思決定バランスWidget
  // - stage_summary: ステージサマリーWidget
  // - summary_view: サマリービューWidget
  // - concern_map: マインドマップ拡張
  // - timeline_view: タイムライン拡張
  // - export_options: エクスポートオプションWidget
};

// =============================================================================
// Props
// =============================================================================

export interface UIRendererV4Props {
  /** UISpec v4 */
  uiSpec: UISpec;
  /** ORS（データモデル） */
  ors: ORS;
  /** Widget更新コールバック */
  onWidgetUpdate?: (widgetId: string, data: unknown) => void;
  /** Widget完了コールバック */
  onWidgetComplete?: (widgetId: string) => void;
  /** Port変更コールバック */
  onPortChange?: (widgetId: string, portId: string, value: unknown) => void;
  /** ORS更新コールバック */
  onORSUpdate?: (entityAttribute: string, value: unknown) => void;
  /** Unknown Widgetが検出されたときのコールバック */
  onUnknownWidget?: (widgetId: string, componentName: string) => void;
  /** クラス名 */
  className?: string;
  /** コンテキストサマリー */
  contextSummary?: string;
  /** デバッグモード */
  debug?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * v4 WidgetSpecをWidgetSpecObjectに変換
 */
function convertToWidgetSpecObject(
  spec: WidgetSpec,
  dataBindingProcessor: DataBindingProcessor
): WidgetSpecObject {
  // DataBindingから初期値を抽出
  const initialInputs: Record<string, unknown> = {};
  for (const binding of spec.dataBindings) {
    if (binding.direction === 'in' || binding.direction === 'inout') {
      const value = dataBindingProcessor.getInitialValue(binding);
      if (value !== undefined) {
        initialInputs[binding.portId] = value;
      }
    }
  }

  // v4 WidgetComponentTypeをv3互換の型に変換（文字列として扱う）
  const v3ComponentType = spec.component as string;

  // v4 LayoutTypeをv3互換の型に変換
  const v3Layout = spec.layout === 'auto' ? undefined : spec.layout;

  return {
    id: spec.id,
    component: v3ComponentType as WidgetSpecObject['component'],
    position: spec.position,
    layout: v3Layout as WidgetSpecObject['layout'],
    config: {
      ...spec.config,
      // 初期値をconfigにマージ
      ...initialInputs,
    },
    inputs: spec.dataBindings
      .filter((db) => db.direction === 'in' || db.direction === 'inout')
      .map((db) => ({
        name: db.portId,
        type: 'any',
        source: db.entityAttribute,
        required: false,
        defaultValue: dataBindingProcessor.getInitialValue(db),
      })),
    outputs: spec.dataBindings
      .filter((db) => db.direction === 'out' || db.direction === 'inout')
      .map((db) => ({
        name: db.portId,
        type: 'any',
        source: db.entityAttribute,
      })),
    // v4 metadata to v3 compatible format
    metadata: {
      description: spec.metadata.purpose,
      timing: 0.5,
      versatility: 0.5,
      bottleneck: ['thought'],
      ...(spec.metadata.context || {}),
    },
  };
}

// =============================================================================
// UIRendererV4 Component
// =============================================================================

/**
 * UIRendererV4 Component
 * UISpec v4とORSを受け取り、Widgetをレンダリング
 */
export const UIRendererV4: React.FC<UIRendererV4Props> = ({
  uiSpec,
  ors,
  onWidgetUpdate,
  onWidgetComplete,
  onPortChange,
  onORSUpdate,
  onUnknownWidget,
  className,
  contextSummary,
  debug = false,
}) => {
  // DataBindingProcessor
  const dataBindingProcessor = useMemo(() => {
    return createDataBindingProcessor(ors, { debug });
  }, [ors, debug]);

  // ReactiveBindingEngineV4
  const engine = useMemo(() => {
    return createReactiveBindingEngineV4(uiSpec.reactiveBindings, { debug });
  }, [uiSpec.reactiveBindings, debug]);

  // Port値のローカルステート
  const [portValues, setPortValues] = useState<Map<string, unknown>>(new Map());

  // DataBindingマップ（widgetId.portId → DataBindingSpec）
  const dataBindingMap = useMemo(() => {
    const map = new Map<string, DataBindingSpec>();
    for (const widget of uiSpec.widgets) {
      for (const binding of widget.dataBindings) {
        map.set(`${widget.id}.${binding.portId}`, binding);
      }
    }
    return map;
  }, [uiSpec.widgets]);

  // エンジンのセットアップ
  useEffect(() => {
    // 初期値をエンジンにセット
    for (const widget of uiSpec.widgets) {
      for (const binding of widget.dataBindings) {
        if (binding.direction === 'in' || binding.direction === 'inout') {
          const value = dataBindingProcessor.getInitialValue(binding);
          const portPath = `${widget.id}.${binding.portId}` as WidgetPortPath;
          engine.initPort(portPath, value);
        }
      }
    }

    // 初期Port値をステートに反映
    setPortValues(engine.getAllPortValues());

    // 伝播コールバック
    engine.setOnPropagate((events: PropagationEventV4[]) => {
      if (debug) {
        console.log('[UIRendererV4] Propagation events:', events);
      }
      setPortValues(engine.getAllPortValues());

      // ORS更新
      for (const event of events) {
        const binding = dataBindingMap.get(event.target);
        if (binding && (binding.direction === 'out' || binding.direction === 'inout')) {
          const result = dataBindingProcessor.updateValue(binding, event.value);
          if (result.success) {
            onORSUpdate?.(binding.entityAttribute, event.value);
          }
        }
      }
    });

    return () => {
      engine.dispose();
      dataBindingProcessor.dispose();
    };
  }, [engine, dataBindingProcessor, uiSpec.widgets, dataBindingMap, debug, onORSUpdate]);

  // Widgetをposition順にソート
  const sortedWidgets = useMemo(() => {
    return [...uiSpec.widgets].sort((a, b) => a.position - b.position);
  }, [uiSpec.widgets]);

  // Widget更新ハンドラー
  const handleWidgetUpdate = useCallback(
    (widgetId: string, data: unknown) => {
      if (debug) {
        console.log(`[UIRendererV4] Widget update: ${widgetId}`, data);
      }
      onWidgetUpdate?.(widgetId, data);
    },
    [onWidgetUpdate, debug]
  );

  // Widget完了ハンドラー
  const handleWidgetComplete = useCallback(
    (widgetId: string) => {
      if (debug) {
        console.log(`[UIRendererV4] Widget complete: ${widgetId}`);
      }
      onWidgetComplete?.(widgetId);
    },
    [onWidgetComplete, debug]
  );

  // Port変更ハンドラー
  const handlePortChange = useCallback(
    (widgetId: string, portId: string, value: unknown) => {
      const portPath = `${widgetId}.${portId}` as WidgetPortPath;

      // エンジンに通知（伝播処理）
      engine.updatePort(portPath, value);

      // DataBindingに基づいてORS更新
      const binding = dataBindingMap.get(portPath);
      if (binding && (binding.direction === 'out' || binding.direction === 'inout')) {
        const result = dataBindingProcessor.updateValue(binding, value);
        if (result.success) {
          onORSUpdate?.(binding.entityAttribute, value);
        }
      }

      // 親コンポーネントへの通知
      onPortChange?.(widgetId, portId, value);
    },
    [engine, dataBindingMap, dataBindingProcessor, onPortChange, onORSUpdate]
  );

  // Port値取得ハンドラー
  const handleGetPortValue = useCallback(
    (portKey: string) => {
      return engine.getPortValue(portKey as WidgetPortPath);
    },
    [engine]
  );

  return (
    <div className={className} style={containerStyle}>
      {/* Context Summary Section */}
      {contextSummary && (
        <div style={summaryStyle}>
          <h3 style={summaryTitleStyle}>Current Context</h3>
          <p style={summaryTextStyle}>{contextSummary}</p>
        </div>
      )}

      {/* Header */}
      <div style={headerStyle}>
        <span style={badgeStyle}>{uiSpec.stage}</span>
        <span style={sessionIdStyle}>Session: {uiSpec.sessionId}</span>
        <span style={versionBadgeStyle}>v4.0</span>
      </div>

      {/* Widgets */}
      <div style={widgetsContainerStyle}>
        {sortedWidgets.map((widgetSpec) => {
          const WidgetComponent = WIDGET_COMPONENTS[widgetSpec.component];

          if (!WidgetComponent) {
            // Unknown Widgetを親コンポーネントに通知
            onUnknownWidget?.(widgetSpec.id, widgetSpec.component);

            return (
              <div
                key={widgetSpec.id}
                className="unknown-widget-error"
                style={{
                  padding: '16px',
                  margin: '8px 0',
                  backgroundColor: '#FEF2F2',
                  border: '2px solid #EF4444',
                  borderRadius: '8px',
                }}
              >
                <div style={{ color: '#DC2626', fontWeight: 'bold', marginBottom: '8px' }}>
                  Unknown Widget: {widgetSpec.component}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Widget ID: {widgetSpec.id}
                </div>
                <div style={{ fontSize: '12px', color: '#059669', marginTop: '8px' }}>
                  * This error has been recorded. The experiment can continue.
                </div>
              </div>
            );
          }

          const specObject = convertToWidgetSpecObject(widgetSpec, dataBindingProcessor);

          // 初期Port値の抽出
          const initialValues: Record<string, unknown> = {};
          portValues.forEach((value, key) => {
            if (key.startsWith(`${widgetSpec.id}.`)) {
              const portId = key.split('.').slice(1).join('.');
              initialValues[portId] = value;
            }
          });

          return (
            <div key={widgetSpec.id} style={widgetWrapperStyle}>
              <div style={widgetHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={widgetLabelStyle}>
                    #{widgetSpec.position} - {widgetSpec.component}
                  </span>
                  <span style={widgetIdStyle}>{widgetSpec.id}</span>
                </div>
                {/* Purpose */}
                {widgetSpec.metadata.purpose && (
                  <span style={widgetPurposeStyle} title={widgetSpec.metadata.purpose}>
                    {widgetSpec.metadata.purpose}
                  </span>
                )}
              </div>
              {/* DataBinding Info */}
              {debug && widgetSpec.dataBindings.length > 0 && (
                <div style={dataBindingInfoStyle}>
                  {widgetSpec.dataBindings.map((db) => (
                    <span key={db.portId} style={dataBindingBadgeStyle}>
                      {db.portId} ↔ {db.entityAttribute} ({db.direction})
                    </span>
                  ))}
                </div>
              )}
              <WidgetComponent
                spec={specObject}
                onUpdate={handleWidgetUpdate}
                onComplete={handleWidgetComplete}
                onPortChange={handlePortChange}
                getPortValue={handleGetPortValue}
                initialPortValues={initialValues}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

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

const versionBadgeStyle: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: '#9C27B0',
  color: '#fff',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 'bold',
};

const sessionIdStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
  flex: 1,
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
  backgroundColor: '#e8eaf6',
  borderBottom: '1px solid #c5cae9',
};

const widgetLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#3f51b5',
};

const widgetIdStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#7986cb',
  fontFamily: 'monospace',
};

const widgetPurposeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#5c6bc0',
  fontStyle: 'italic',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '400px',
};

const dataBindingInfoStyle: React.CSSProperties = {
  padding: '4px 16px',
  backgroundColor: '#fafafa',
  borderBottom: '1px solid #eee',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
};

const dataBindingBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  padding: '2px 6px',
  backgroundColor: '#e0e0e0',
  borderRadius: '4px',
  fontFamily: 'monospace',
};

// errorWidgetStyle was removed - Unknown Widget error now uses inline styles
// See the if (!WidgetComponent) block in the render logic

const summaryStyle: React.CSSProperties = {
  marginBottom: '24px',
  padding: '16px',
  backgroundColor: '#fff',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  borderLeft: '4px solid #3f51b5',
};

const summaryTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#3f51b5',
  margin: '0 0 8px 0',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const summaryTextStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#374151',
  margin: 0,
  lineHeight: 1.5,
};

export default UIRendererV4;
