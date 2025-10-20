/**
 * DynamicUINavigator
 * 
 * Phase 2 Step 3: 動的UI版のルーター
 * 思考整理フロー（capture/plan/breakdown）からタスク推奨までの完全なフロー
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Phase 0-1: 既存画面
import { HomeScreen } from '../components/screens/HomeScreen';
import { ConcernInputScreen } from '../components/screens/ConcernInputScreen';
import { CategorySelectionScreen } from '../components/screens/CategorySelectionScreen';
import { ConcernLevelScreen } from '../components/screens/ConcernLevelScreen';
import { ApproachScreen } from '../components/screens/ApproachScreen';
import { BreakdownScreen } from '../components/screens/BreakdownScreen';
import { FeedbackScreen } from '../components/screens/FeedbackScreen';

// Phase 1C: 動的思考整理画面
import { DynamicThoughtScreen } from '../components/screens/DynamicThoughtScreen';

// Phase 3: UISpec v2.0対応の動的思考整理画面
import { DynamicThoughtScreenV2 } from '../components/screens/DynamicThoughtScreenV2';

// Phase 2: タスク管理画面
import { TaskRecommendationScreen } from '../screens/TaskRecommendationScreen';
import { StaticTaskRecommendationScreen } from '../screens/StaticTaskRecommendationScreen';
import { TaskListScreen } from '../screens/TaskListScreen';
import { TaskCreateScreen } from '../screens/TaskCreateScreen';

// Phase 2 Step 5: 設定画面
import { SettingsScreen } from '../screens/SettingsScreen';

/**
 * DynamicUINavigator
 * 
 * 動的UI条件（dynamic_ui）用のルーティング設定
 * 
 * フロー:
 * 1. / → HomeScreen（スタート）
 * 2. /concern/input → ConcernInputScreen（関心事入力）
 * 3. /concern/capture → DynamicThoughtScreen (stage=capture)（思考整理：捕捉）
 * 4. /concern/plan → DynamicThoughtScreen (stage=plan)（思考整理：計画）
 * 5. /concern/breakdown → DynamicThoughtScreen (stage=breakdown)（思考整理：分解）
 * 6. /tasks/recommend → TaskRecommendationScreen（タスク推奨）
 * 7. /tasks → TaskListScreen（タスク一覧）
 * 8. /tasks/create → TaskCreateScreen（タスク作成）
 * 
 * 備考:
 * - 既存のPhase 0-1画面も互換性のために残す
 * - Phase 1Cの動的思考整理画面を統合
 * - Phase 2のタスク管理画面を統合
 */
export const DynamicUINavigator: React.FC = () => {
  // Phase 2: userIdを取得（localStorage から）
  const userId = localStorage.getItem('anonymousUserId') || 'anonymous';
  
  return (
    <Routes>
      {/* ==================== */}
      {/* ホーム */}
      {/* ==================== */}
      <Route path="/" element={<HomeScreen />} />

      {/* ==================== */}
      {/* 関心事入力フロー（Phase 0-1） */}
      {/* ==================== */}
      <Route path="/concern/input" element={<ConcernInputScreen />} />
      <Route path="/concern/category" element={<CategorySelectionScreen />} />
      <Route path="/concern/level" element={<ConcernLevelScreen />} />
      <Route path="/concern/approach" element={<ApproachScreen />} />
      <Route path="/concern/breakdown-static" element={<BreakdownScreen />} />
      <Route path="/concern/feedback" element={<FeedbackScreen />} />

      {/* ==================== */}
      {/* 思考整理フロー（Phase 1C + Phase 2） */}
      {/* ==================== */}
      
      {/* Capture Stage: 関心事の捕捉・明確化 - Phase 3: UISpec v2.0 */}
      <Route
        path="/concern/capture"
        element={<DynamicThoughtScreenV2 stage="capture" />}
      />

      {/* Plan Stage: 計画立案 - Phase 3: UISpec v2.0 */}
      <Route
        path="/concern/plan"
        element={<DynamicThoughtScreenV2 stage="plan" />}
      />

      {/* Breakdown Stage: タスク分解 - Phase 3: UISpec v2.0 */}
      <Route
        path="/concern/breakdown"
        element={<DynamicThoughtScreenV2 stage="breakdown" />}
      />

      {/* v1版（開発・デバッグ用） */}
      <Route
        path="/concern/capture/v1"
        element={
          <DynamicThoughtScreen
            stage="capture"
            concernId=""
            onComplete={(_result: any) => {
              console.log('[DynamicUINavigator] Capture completed:', _result);
            }}
          />
        }
      />
      <Route
        path="/concern/plan/v1"
        element={
          <DynamicThoughtScreen
            stage="plan"
            concernId=""
            onComplete={(_result: any) => {
              console.log('[DynamicUINavigator] Plan completed:', _result);
            }}
          />
        }
      />
      <Route
        path="/concern/breakdown/v1"
        element={
          <DynamicThoughtScreen
            stage="breakdown"
            concernId=""
            onComplete={(_result: any) => {
              console.log('[DynamicUINavigator] Breakdown completed:', _result);
            }}
          />
        }
      />

      {/* ==================== */}
      {/* タスク管理（Phase 2） */}
      {/* ==================== */}
      
      {/* タスク推奨画面（動的UI版） */}
      <Route path="/tasks/recommend" element={<TaskRecommendationScreen userId={userId} />} />
      
      {/* タスク推奨画面（固定UI版） - Phase 2 Step 4 */}
      <Route path="/tasks/recommend/static" element={<StaticTaskRecommendationScreen userId={userId} />} />
      
      {/* タスク一覧 */}
      <Route path="/tasks" element={<TaskListScreen userId={userId} />} />
      
      {/* タスク作成 */}
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

export default DynamicUINavigator;

