import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomeScreen } from './components/screens/HomeScreen';
import { ConcernInputScreen } from './components/screens/ConcernInputScreen';
import { ConcernLevelScreen } from './components/screens/ConcernLevelScreen';
import { CategorySelectionScreen } from './components/screens/CategorySelectionScreen';
import { ApproachScreen } from './components/screens/ApproachScreen';
import { BreakdownScreen } from './components/screens/BreakdownScreen';
import { FeedbackScreen } from './components/screens/FeedbackScreen';
import { DatabaseTest } from './components/DatabaseTest';
import { FactorsTest } from './components/FactorsTest';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* メインアプリケーションフロー */}
          <Route path="/" element={<HomeScreen />} />
          <Route path="/concern-input" element={<ConcernInputScreen />} />
          <Route path="/concern-level" element={<ConcernLevelScreen />} />
          <Route path="/category" element={<CategorySelectionScreen />} />
          <Route path="/approach" element={<ApproachScreen />} />
          <Route path="/breakdown" element={<BreakdownScreen />} />
          <Route path="/feedback" element={<FeedbackScreen />} />
          
          {/* 開発・デバッグ用ルート */}
          <Route path="/dev/database" element={<DatabaseTest />} />
          <Route path="/dev/factors" element={<FactorsTest />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
