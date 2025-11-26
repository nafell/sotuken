/**
 * DebugSidebar.tsx
 * Widget Showcase用デバッグサイドバー
 *
 * Playwright MCP対応のdata-testid属性付き
 */

import React from 'react';

/**
 * Widget更新ログ
 */
export interface WidgetUpdateLog {
  timestamp: string;
  widgetId: string;
  data: any;
}

/**
 * Config選択肢
 */
export interface ConfigOption {
  id: string;
  label: string;
}

/**
 * DebugSidebar Props
 */
export interface DebugSidebarProps {
  updateLogs: WidgetUpdateLog[];
  completedWidgets: string[];
  currentConfig: string;
  availableConfigs: ConfigOption[];
  onConfigChange: (configId: string) => void;
  onClear: () => void;
  onReset: () => void;
  widgetData: any;
}

/**
 * DebugSidebar Component
 */
export const DebugSidebar: React.FC<DebugSidebarProps> = ({
  updateLogs,
  completedWidgets,
  currentConfig,
  availableConfigs,
  onConfigChange,
  onClear,
  onReset,
  widgetData,
}) => {
  return (
    <div style={containerStyle} data-testid="debug-sidebar">
      {/* Header with actions */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>Debug Panel</h2>
        <div style={actionsStyle}>
          <button
            onClick={onReset}
            data-testid="reset-button"
            style={buttonStyle}
          >
            Reset
          </button>
          <button
            onClick={onClear}
            data-testid="clear-logs-button"
            style={buttonStyle}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Config Selector */}
      <section style={sectionStyle} data-testid="config-section">
        <h3 style={sectionTitleStyle}>Configuration</h3>
        <select
          value={currentConfig}
          onChange={(e) => onConfigChange(e.target.value)}
          data-testid="config-dropdown"
          style={selectStyle}
        >
          {availableConfigs.map((config) => (
            <option key={config.id} value={config.id}>
              {config.label}
            </option>
          ))}
        </select>
      </section>

      {/* Completion Status */}
      <section style={sectionStyle} data-testid="completion-status">
        <h3 style={sectionTitleStyle}>
          Completed: {completedWidgets.length > 0 ? 'Yes' : 'No'}
        </h3>
        {completedWidgets.length > 0 && (
          <div style={completedListStyle}>
            {completedWidgets.map((id) => (
              <span key={id} style={completedBadgeStyle}>
                {id}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Current Widget Data */}
      <section style={sectionStyle} data-testid="widget-data">
        <h3 style={sectionTitleStyle}>Current Data</h3>
        <pre style={preStyle}>
          {widgetData ? JSON.stringify(widgetData, null, 2) : 'No data yet'}
        </pre>
      </section>

      {/* Update Logs */}
      <section style={sectionStyle} data-testid="update-logs">
        <h3 style={sectionTitleStyle}>Update Logs ({updateLogs.length})</h3>
        <div style={logsContainerStyle}>
          {updateLogs.length === 0 ? (
            <p style={emptyStyle}>No updates yet</p>
          ) : (
            updateLogs.map((log, index) => (
              <div
                key={index}
                style={logEntryStyle}
                data-testid={`log-entry-${index}`}
              >
                <div style={logHeaderStyle}>
                  <span style={logIdStyle}>{log.widgetId}</span>
                  <span style={logTimeStyle}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre style={logDataStyle}>
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  backgroundColor: '#16213e',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #0f3460',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#eee',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const buttonStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: '#0f3460',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};

const sectionStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #0f3460',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#888',
  textTransform: 'uppercase',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  backgroundColor: '#0f3460',
  color: '#fff',
  border: '1px solid #1a1a2e',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer',
};

const completedListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
};

const completedBadgeStyle: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: '#22c55e',
  color: '#fff',
  borderRadius: '4px',
  fontSize: '11px',
  fontFamily: 'monospace',
};

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: '8px',
  backgroundColor: '#1a1a2e',
  borderRadius: '4px',
  fontSize: '10px',
  overflow: 'auto',
  maxHeight: '150px',
  color: '#eee',
  fontFamily: 'monospace',
};

const emptyStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '12px',
  fontStyle: 'italic',
  margin: 0,
};

const logsContainerStyle: React.CSSProperties = {
  maxHeight: '250px',
  overflow: 'auto',
};

const logEntryStyle: React.CSSProperties = {
  marginBottom: '8px',
  padding: '8px',
  backgroundColor: '#0f3460',
  borderRadius: '4px',
};

const logHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '4px',
};

const logIdStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#4CAF50',
};

const logTimeStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#666',
};

const logDataStyle: React.CSSProperties = {
  margin: 0,
  padding: '8px',
  backgroundColor: '#1a1a2e',
  borderRadius: '4px',
  fontSize: '10px',
  overflow: 'auto',
  maxHeight: '80px',
  color: '#eee',
  fontFamily: 'monospace',
};

export default DebugSidebar;
