/**
 * App.tsx
 * Phase 2 Step 3: DynamicUINavigatorを統合
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DynamicUINavigator } from './navigators/DynamicUINavigator';
import { DatabaseTest } from './components/DatabaseTest';
import { FactorsTest } from './components/FactorsTest';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* Phase 2 Step 3: DynamicUINavigatorを使用 */}
          <Route path="/*" element={<DynamicUINavigator />} />
          
          {/* 開発・デバッグ用ルート（直接アクセス） */}
          <Route path="/dev/database" element={<DatabaseTest />} />
          <Route path="/dev/factors" element={<FactorsTest />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
