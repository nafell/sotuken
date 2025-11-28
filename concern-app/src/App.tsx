/**
 * App.tsx
 *
 * ルーティング構成:
 * - / → Full-Flow Demo（現行メイン）
 * - /dev-demo/* → 開発用デモページ
 * - /legacy/* → 旧実験条件別ルーティング（Phase 2 Step 5）
 * - /admin/* → 管理者画面
 */

import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Legacy navigators（旧実験用、/legacy/*で利用可能）
import { DynamicUINavigator } from './legacy/navigators/DynamicUINavigator';
import { StaticUINavigator } from './legacy/navigators/StaticUINavigator';
import { UnassignedScreen } from './screens/UnassignedScreen';
import { AdminUserManagement } from './screens/AdminUserManagement';
import { AdminDashboard } from './screens/AdminDashboard';
import { DatabaseTest } from './components/DatabaseTest';
import { FactorsTest } from './components/FactorsTest';
import { experimentService, type ExperimentCondition } from './services/ClientExperimentService';

// Phase 4 Day 3-4: 開発用デモページ（lazy load）
const WidgetP4D3Page = lazy(() => import('./pages/dev-demo/WidgetP4D3Page'));
const E2EP4D3Page = lazy(() => import('./pages/dev-demo/E2EP4D3Page'));
const FullFlowDemoPage = lazy(() => import('./pages/dev-demo/FullFlowDemoPage'));

// Widget Showcase（Playwright MCPテスト用）
const WidgetShowcaseIndex = lazy(() => import('./pages/dev-demo/widgets/WidgetShowcaseIndex'));
const WidgetShowcasePage = lazy(() => import('./pages/dev-demo/widgets/WidgetShowcasePage'));

// Phase 6: Research Experiment Pages
const ExperimentDashboard = lazy(() => import('./pages/research-experiment/ExperimentDashboard'));
const CaseSelection = lazy(() => import('./pages/research-experiment/CaseSelection'));
const CaseExecution = lazy(() => import('./pages/research-experiment/CaseExecution'));
const SessionList = lazy(() => import('./pages/research-experiment/SessionList'));
const SessionDetail = lazy(() => import('./pages/research-experiment/SessionDetail'));
const ReplayView = lazy(() => import('./pages/research-experiment/ReplayView'));

function App() {
  const [condition, setCondition] = useState<ExperimentCondition>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // アプリ起動時に実験条件を取得
    experimentService.fetchCondition()
      .then(setCondition)
      .catch((error) => {
        console.error('[App] 実験条件の取得に失敗:', error);
        setCondition(null);  // エラー時は未割り当てとして扱う
      })
      .finally(() => setIsLoading(false));
  }, []);
  
  // ローディング中
  if (isLoading) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#F9FAFB'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #E5E7EB',
              borderTopColor: '#3B82F6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}
          />
          <p style={{ color: '#6B7280', fontSize: '14px' }}>読み込み中...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }
  
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* 管理者画面（実験条件に関係なくアクセス可能） */}
          <Route path="/admin" element={<AdminUserManagement />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* 開発・デバッグ用ルート（直接アクセス） */}
          <Route path="/dev/database" element={<DatabaseTest />} />
          <Route path="/dev/factors" element={<FactorsTest />} />

          {/* Phase 4 Day 3-4: 開発用デモページ（本番には含めない） */}
          <Route
            path="/dev-demo/widget-p4d3"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Widget Demo...</div>}>
                <WidgetP4D3Page />
              </Suspense>
            }
          />
          <Route
            path="/dev-demo/e2e-p4d3"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading E2E Demo...</div>}>
                <E2EP4D3Page />
              </Suspense>
            }
          />
          <Route
            path="/dev-demo/full-flow"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Full-Flow Demo...</div>}>
                <FullFlowDemoPage />
              </Suspense>
            }
          />

          {/* Widget Showcase（Playwright MCPテスト用） */}
          <Route
            path="/dev-demo/widgets"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Widget Index...</div>}>
                <WidgetShowcaseIndex />
              </Suspense>
            }
          />
          <Route
            path="/dev-demo/widgets/:widgetType"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Widget Showcase...</div>}>
                <WidgetShowcasePage />
              </Suspense>
            }
          />

          {/* Phase 6: Research Experiment Routes */}
          <Route
            path="/research-experiment"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Experiment Dashboard...</div>}>
                <ExperimentDashboard />
              </Suspense>
            }
          />
          <Route
            path="/research-experiment/cases"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Cases...</div>}>
                <CaseSelection />
              </Suspense>
            }
          />
          <Route
            path="/research-experiment/execute/:caseId"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Execution...</div>}>
                <CaseExecution />
              </Suspense>
            }
          />
          <Route
            path="/research-experiment/sessions"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Sessions...</div>}>
                <SessionList />
              </Suspense>
            }
          />
          <Route
            path="/research-experiment/sessions/:sessionId"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Session...</div>}>
                <SessionDetail />
              </Suspense>
            }
          />
          <Route
            path="/research-experiment/replay/:sessionId"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading Replay...</div>}>
                <ReplayView />
              </Suspense>
            }
          />

          {/* メインルート: Full-Flow Demo（現行メイン） */}
          <Route
            path="/"
            element={
              <Suspense fallback={<div style={{ padding: '20px' }}>Loading...</div>}>
                <FullFlowDemoPage />
              </Suspense>
            }
          />

          {/* Legacy: 旧実験条件別ルーティング（Phase 2 Step 5） */}
          {condition === null ? (
            <Route path="/legacy/*" element={<UnassignedScreen />} />
          ) : condition === 'dynamic_ui' ? (
            <Route path="/legacy/*" element={<DynamicUINavigator />} />
          ) : (
            <Route path="/legacy/*" element={<StaticUINavigator />} />
          )}

          {/* 未知のパスはメインにリダイレクト */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
