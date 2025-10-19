/**
 * App.tsx
 * Phase 2 Step 5: 条件別ルーティング実装
 * 
 * 実験条件に応じて適切なNavigatorを表示:
 * - condition === 'dynamic_ui' → DynamicUINavigator
 * - condition === 'static_ui' → StaticUINavigator
 * - condition === null → UnassignedScreen（未割り当て）
 */

import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DynamicUINavigator } from './navigators/DynamicUINavigator';
import { StaticUINavigator } from './navigators/StaticUINavigator';
import { UnassignedScreen } from './screens/UnassignedScreen';
import { AdminUserManagement } from './screens/AdminUserManagement';
import { DatabaseTest } from './components/DatabaseTest';
import { FactorsTest } from './components/FactorsTest';
import { experimentService, type ExperimentCondition } from './services/ClientExperimentService';

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
          
          {/* 開発・デバッグ用ルート（直接アクセス） */}
          <Route path="/dev/database" element={<DatabaseTest />} />
          <Route path="/dev/factors" element={<FactorsTest />} />
          
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
