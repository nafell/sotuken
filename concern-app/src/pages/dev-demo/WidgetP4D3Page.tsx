/**
 * WidgetP4D3Page.tsx
 * Phase 4 Day 3-4: Widget表示検証ページ
 *
 * 開発用ページ - 本番には含めない
 * サンプルUISpec v3 JSONから4種Widgetをレンダリングして動作確認
 */

import React, { useState, useCallback } from 'react';
import { UIRendererV3 } from '../../services/ui-generation/UIRendererV3';
import type { UISpec } from '../../types/ui-spec.types';

// サンプルUISpec JSONをインポート
import sampleUISpec from '../../__fixtures__/sample-uispec-v3.json';

interface WidgetUpdateLog {
  timestamp: string;
  widgetId: string;
  data: any;
}

/**
 * WidgetP4D3Page Component
 * DSL v3 → Widget表示の検証用ページ
 */
export const WidgetP4D3Page: React.FC = () => {
  const [updateLogs, setUpdateLogs] = useState<WidgetUpdateLog[]>([]);
  const [completedWidgets, setCompletedWidgets] = useState<string[]>([]);

  // Widget更新ハンドラー
  const handleWidgetUpdate = useCallback((widgetId: string, data: any) => {
    const log: WidgetUpdateLog = {
      timestamp: new Date().toISOString(),
      widgetId,
      data,
    };
    setUpdateLogs((prev) => [log, ...prev].slice(0, 50)); // 最新50件を保持
  }, []);

  // Widget完了ハンドラー
  const handleWidgetComplete = useCallback((widgetId: string) => {
    setCompletedWidgets((prev) => {
      if (prev.includes(widgetId)) return prev;
      return [...prev, widgetId];
    });
  }, []);

  // ログクリア
  const clearLogs = () => {
    setUpdateLogs([]);
    setCompletedWidgets([]);
  };

  return (
    <div style={pageStyle}>
      {/* ヘッダー */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>Widget表示検証 (Phase 4 Day 3-4)</h1>
        <p style={subtitleStyle}>
          開発用ページ - DSL v3 → Widget表示のE2E検証
        </p>
        <div style={devBadgeStyle}>DEV ONLY</div>
      </header>

      <div style={contentStyle}>
        {/* メインエリア: Widget表示 */}
        <main style={mainStyle}>
          <UIRendererV3
            uiSpec={sampleUISpec as UISpec}
            onWidgetUpdate={handleWidgetUpdate}
            onWidgetComplete={handleWidgetComplete}
          />
        </main>

        {/* サイドパネル: デバッグ情報 */}
        <aside style={sidebarStyle}>
          <div style={sidebarHeaderStyle}>
            <h2 style={sidebarTitleStyle}>Debug Panel</h2>
            <button onClick={clearLogs} style={clearButtonStyle}>
              Clear
            </button>
          </div>

          {/* 完了Widget */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              Completed Widgets ({completedWidgets.length})
            </h3>
            <ul style={listStyle}>
              {completedWidgets.length === 0 ? (
                <li style={emptyStyle}>No widgets completed yet</li>
              ) : (
                completedWidgets.map((id) => (
                  <li key={id} style={completedItemStyle}>
                    {id}
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* 更新ログ */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Update Logs ({updateLogs.length})</h3>
            <div style={logsContainerStyle}>
              {updateLogs.length === 0 ? (
                <p style={emptyStyle}>No updates yet</p>
              ) : (
                updateLogs.map((log, index) => (
                  <div key={index} style={logEntryStyle}>
                    <div style={logHeaderStyle}>
                      <span style={logWidgetIdStyle}>{log.widgetId}</span>
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

          {/* UISpec情報 */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>UISpec Info</h3>
            <dl style={infoListStyle}>
              <dt>Session ID:</dt>
              <dd>{sampleUISpec.sessionId}</dd>
              <dt>Stage:</dt>
              <dd>{sampleUISpec.stage}</dd>
              <dt>Widgets:</dt>
              <dd>{sampleUISpec.widgets.length}</dd>
              <dt>Version:</dt>
              <dd>{sampleUISpec.metadata.version}</dd>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
};

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
  position: 'relative',
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

const devBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '24px',
  padding: '4px 12px',
  backgroundColor: '#e94560',
  color: '#fff',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 'bold',
};

const contentStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0',
  height: 'calc(100vh - 80px)',
};

const mainStyle: React.CSSProperties = {
  flex: '1',
  overflow: 'auto',
  padding: '16px',
};

const sidebarStyle: React.CSSProperties = {
  width: '360px',
  backgroundColor: '#16213e',
  borderLeft: '1px solid #0f3460',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

const sidebarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #0f3460',
};

const sidebarTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 'bold',
};

const clearButtonStyle: React.CSSProperties = {
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

const listStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const emptyStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '12px',
  fontStyle: 'italic',
};

const completedItemStyle: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: '#0f3460',
  borderRadius: '4px',
  marginBottom: '4px',
  fontSize: '12px',
  fontFamily: 'monospace',
};

const logsContainerStyle: React.CSSProperties = {
  maxHeight: '300px',
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

const logWidgetIdStyle: React.CSSProperties = {
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
  maxHeight: '100px',
};

const infoListStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '12px',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: '4px 12px',
};

export default WidgetP4D3Page;
