/**
 * WidgetShowcaseIndex.tsx
 * Widget一覧ページ
 *
 * /dev-demo/widgets でアクセス
 * ステージ別にグループ化された全12種Widgetへのリンク
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  WIDGET_SHOWCASE_CONFIGS,
  getWidgetsByStage,
  STAGES,
  STAGE_LABELS,
} from './widget-configs';
import type { StageType } from '../../../types/ui-spec.types';

/**
 * ステージ別の色設定
 */
const STAGE_COLORS: Record<StageType, string> = {
  diverge: '#22c55e',
  organize: '#3b82f6',
  converge: '#f59e0b',
  summary: '#8b5cf6',
};

/**
 * WidgetShowcaseIndex Component
 */
export default function WidgetShowcaseIndex() {
  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Widget Showcase Index</h1>
          <p style={subtitleStyle}>
            Click on a widget to view its showcase page for testing
          </p>
        </div>
        <span style={devBadgeStyle}>DEV ONLY</span>
      </header>

      {/* Main content */}
      <main style={mainStyle}>
        {STAGES.map((stage) => {
          const widgets = getWidgetsByStage(stage);
          return (
            <section
              key={stage}
              style={stageSectionStyle}
              data-testid={`stage-${stage}`}
            >
              <div style={stageHeaderStyle}>
                <h2 style={{ ...stageTitleStyle, color: STAGE_COLORS[stage] }}>
                  {STAGE_LABELS[stage]} ({stage})
                </h2>
                <span style={widgetCountStyle}>{widgets.length} widgets</span>
              </div>

              <div style={gridStyle}>
                {widgets.map((widgetType) => {
                  const config = WIDGET_SHOWCASE_CONFIGS[widgetType];
                  return (
                    <Link
                      key={widgetType}
                      to={`/dev-demo/widgets/${widgetType}`}
                      style={cardStyle}
                      data-testid={`widget-link-${widgetType}`}
                    >
                      <div
                        style={{
                          ...cardAccentStyle,
                          backgroundColor: STAGE_COLORS[stage],
                        }}
                      />
                      <div style={cardContentStyle}>
                        <h3 style={cardTitleStyle}>{config.name}</h3>
                        <p style={cardDescStyle}>{config.description}</p>
                        <div style={cardFooterStyle}>
                          <span style={variationCountStyle}>
                            {config.variations.length} variation(s)
                          </span>
                          <span style={widgetTypeStyle}>{widgetType}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Footer with links to other demo pages */}
      <footer style={footerStyle}>
        <span style={footerLabelStyle}>Other Demo Pages:</span>
        <Link to="/dev-demo/widget-p4d3" style={footerLinkStyle}>
          Widget P4D3
        </Link>
        <Link to="/dev-demo/e2e-p4d3" style={footerLinkStyle}>
          E2E P4D3
        </Link>
        <Link to="/dev-demo/full-flow" style={footerLinkStyle}>
          Full-Flow Demo
        </Link>
      </footer>
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
  padding: '24px 32px',
  backgroundColor: '#16213e',
  borderBottom: '2px solid #0f3460',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '24px',
  fontWeight: 'bold',
};

const subtitleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: '14px',
  color: '#888',
};

const devBadgeStyle: React.CSSProperties = {
  padding: '6px 16px',
  backgroundColor: '#e94560',
  color: '#fff',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold',
};

const mainStyle: React.CSSProperties = {
  padding: '24px 32px',
};

const stageSectionStyle: React.CSSProperties = {
  marginBottom: '32px',
};

const stageHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '16px',
};

const stageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
};

const widgetCountStyle: React.CSSProperties = {
  padding: '2px 8px',
  backgroundColor: '#0f3460',
  borderRadius: '4px',
  fontSize: '11px',
  color: '#888',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '16px',
};

const cardStyle: React.CSSProperties = {
  display: 'flex',
  backgroundColor: '#16213e',
  borderRadius: '8px',
  overflow: 'hidden',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'transform 0.2s, box-shadow 0.2s',
};

const cardAccentStyle: React.CSSProperties = {
  width: '4px',
  flexShrink: 0,
};

const cardContentStyle: React.CSSProperties = {
  padding: '16px',
  flex: 1,
};

const cardTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#fff',
};

const cardDescStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '12px',
  color: '#888',
  lineHeight: 1.4,
};

const cardFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const variationCountStyle: React.CSSProperties = {
  padding: '2px 8px',
  backgroundColor: '#0f3460',
  borderRadius: '4px',
  fontSize: '10px',
  color: '#888',
};

const widgetTypeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontFamily: 'monospace',
  color: '#666',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 32px',
  backgroundColor: '#16213e',
  borderTop: '1px solid #0f3460',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const footerLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
};

const footerLinkStyle: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#0f3460',
  color: '#fff',
  borderRadius: '4px',
  fontSize: '12px',
  textDecoration: 'none',
};
