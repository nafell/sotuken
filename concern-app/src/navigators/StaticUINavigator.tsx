/**
 * StaticUINavigator（Phase 2 Step 5）
 * 固定UI版のルーター
 * 
 * 固定UI条件（static_ui）用のルーティング設定
 * 
 * フロー:
 * 1. / → HomeScreen（スタート）
 * 2. /concern/input → ConcernInputScreen（関心事入力）
 * 3. /concern/level → ConcernLevelScreen（関心事レベル選択）
 * 4. /concern/category → CategorySelectionScreen（カテゴリ選択）
 * 5. /concern/approach → ApproachScreen（アプローチ選択）
 * 6. /concern/breakdown → BreakdownScreen（アクション分解）
 * 7. /tasks/recommend/static → StaticTaskRecommendationScreen（タスク推奨）
 * 8. /tasks → TaskListScreen（タスク一覧）
 * 9. /tasks/create → TaskCreateScreen（タスク作成）
 * 10. /settings → SettingsScreen（設定）
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Phase 0-1: 既存画面（固定UI版）
import { HomeScreen } from '../components/screens/HomeScreen';
import { ConcernInputScreen } from '../components/screens/ConcernInputScreen';
import { ConcernLevelScreen } from '../components/screens/ConcernLevelScreen';
import { CategorySelectionScreen } from '../components/screens/CategorySelectionScreen';
import { ApproachScreen } from '../components/screens/ApproachScreen';
import { BreakdownScreen } from '../components/screens/BreakdownScreen';
import { FeedbackScreen } from '../components/screens/FeedbackScreen';

// Phase 2: タスク管理画面
import { StaticTaskRecommendationScreen } from '../screens/StaticTaskRecommendationScreen';
import { TaskListScreen } from '../screens/TaskListScreen';
import { TaskCreateScreen } from '../screens/TaskCreateScreen';

// Phase 2 Step 5: 設定画面
import { SettingsScreen } from '../screens/SettingsScreen';

/**
 * StaticUINavigator
 * 
 * 固定UI条件（static_ui）用のルーティング設定
 */
export const StaticUINavigator: React.FC = () => {
  // Phase 2: userIdを取得（localStorage から）
  const userId = localStorage.getItem('anonymousUserId') || 'anonymous';
  
  return (
    <Routes>
      {/* ==================== */}
      {/* ホーム */}
      {/* ==================== */}
      <Route path="/" element={<HomeScreen />} />

      {/* ==================== */}
      {/* 関心事入力フロー（固定UI版） */}
      {/* ==================== */}
      <Route path="/concern/input" element={<ConcernInputScreen />} />
      <Route path="/concern/level" element={<ConcernLevelScreen />} />
      <Route path="/concern/category" element={<CategorySelectionScreen />} />
      <Route path="/concern/approach" element={<ApproachScreen />} />
      <Route path="/concern/breakdown" element={<BreakdownScreen />} />
      <Route path="/concern/feedback" element={<FeedbackScreen />} />

      {/* ==================== */}
      {/* タスク管理（Phase 2） */}
      {/* ==================== */}
      
      {/* タスク推奨画面（固定UI版） - Phase 2 Step 4で実装済み */}
      <Route path="/tasks/recommend" element={<StaticTaskRecommendationScreen userId={userId} />} />
      <Route path="/tasks/recommend/static" element={<StaticTaskRecommendationScreen userId={userId} />} />
      
      {/* タスク一覧（共通） */}
      <Route path="/tasks" element={<TaskListScreen userId={userId} />} />
      
      {/* タスク作成（共通） */}
      <Route path="/tasks/create" element={<TaskCreateScreen userId={userId} />} />

      {/* ==================== */}
      {/* 設定（Phase 2 Step 5） */}
      {/* ==================== */}
      <Route path="/settings" element={<SettingsScreen />} />

      {/* ==================== */}
      {/* Fallback: 未定義のパスはホームへ */}
      {/* ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default StaticUINavigator;

