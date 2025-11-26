/**
 * App.tsx
 * Phase 2 Step 5: 条件別ルーティング実装
 * 
 * 実験条件に応じて適切なNavigatorを表示:
 * - condition === 'dynamic_ui' → DynamicUINavigator
 * - condition === 'static_ui' → StaticUINavigator
 * - condition === null → UnassignedScreen（未割り当て）
 */

import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DynamicUINavigator } from './navigators/DynamicUINavigator';
import { StaticUINavigator } from './navigators/StaticUINavigator';
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

          {/* Phase 2 Step 5: 条件別ルーティング */}
          {condition === null ? (
            /* 未割り当てユーザー */
            <Route path="/*" element={<UnassignedScreen />} />
          ) : condition === 'dynamic_ui' ? (
            /* 動的UI版 */
            <Route path="/*" element={<DynamicUINavigator />} />
          ) : (
            /* 固定UI版 */
            <Route path="/*" element={<StaticUINavigator />} />
          )}
        </Routes>
      </div>
    </Router>
  )
}

export default App
