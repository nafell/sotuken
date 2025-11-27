/**
 * StaticTaskRecommendationScreen（Phase 2 Step 4）
 * タスク推奨画面 - 固定UI版
 * 
 * 動的UI版と同じ機能だが、UIパターンは固定
 * DSL生成なし、固定デザインテンプレートを使用
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TaskService } from '../services/TaskService';
import { eventLogger } from '../services/EventLogger';
import { db } from '../services/database/localDB';
import { ContextService } from '../services/context/ContextService';
import { ActionReportModal } from '../components/ActionReportModal';
import { ClarityFeedbackModal } from '../components/ClarityFeedbackModal';
import { StaticTaskCard } from '../components/StaticTaskCard';
import type { Task } from '../types/database';

interface LocationState {
  generatedTasks?: Task[];
  concernId?: string;
  taskGenerationError?: string;
  [key: string]: any;
}

interface StaticTaskRecommendationScreenProps {
  userId?: string;
}

interface RecommendationResult {
  task: Task | null;
  variant: 'task_card' | 'micro_step_card' | 'prepare_step_card';
  saliency: 0 | 1 | 2 | 3;
  score: number;
  generationId?: string;
}

export const StaticTaskRecommendationScreen: React.FC<StaticTaskRecommendationScreenProps> = ({ userId: propUserId }) => {
  const routeLocation = useLocation();
  const locationState = routeLocation.state as LocationState;
  
  const userId = propUserId || localStorage.getItem('anonymousUserId') || '';

  // State管理
  const [location, setLocation] = useState<'home' | 'work' | 'transit' | 'other'>('home');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [availableTime, setAvailableTime] = useState<number>(30);
  const [mood, setMood] = useState<'happy' | 'neutral' | 'stressed' | 'tired'>('neutral');
  const [energyLevel, setEnergyLevel] = useState<number>(5);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [recommendationShownAt, setRecommendationShownAt] = useState<Date | null>(null);

  // Modal state
  const [showActionModal, setShowActionModal] = useState<boolean>(false);
  const [showClarityModal, setShowClarityModal] = useState<boolean>(false);
  const [currentReportId, setCurrentReportId] = useState<string>('');
  const [actionElapsedSec, setActionElapsedSec] = useState<number>(0);

  const [showGeneratedTasksMessage, setShowGeneratedTasksMessage] = useState<boolean>(false);

  // 初期化：ContextServiceからfactorsを自動取得
  useEffect(() => {
    const initializeFactors = async () => {
      const contextService = new ContextService();
      const factors = await contextService.collectCurrentFactors();

      console.log('[StaticTaskRecommendationScreen] 自動取得したfactors:', factors);

      // factorsから値を設定
      if (factors.time_of_day?.value) {
        setTimeOfDay(factors.time_of_day.value as any);
      }
      if (factors.location_category?.value) {
        setLocation(factors.location_category.value as any);
      }
      if (factors.available_time_min?.value) {
        setAvailableTime(factors.available_time_min.value as number);
      }
      if (factors.mood?.value) {
        setMood(factors.mood.value as any);
      }
      if (factors.energy_level?.value) {
        setEnergyLevel(factors.energy_level.value as number);
      }
    };

    initializeFactors();
  }, []);
  
  // 思考整理フローから遷移した場合の処理
  useEffect(() => {
    if (locationState?.generatedTasks && locationState.generatedTasks.length > 0) {
      console.log('[StaticTaskRecommendationScreen] 思考整理フローからのタスク生成:', locationState.generatedTasks.length, '件');
      setShowGeneratedTasksMessage(true);
      
      setTimeout(() => {
        fetchRecommendation();
      }, 1000);
    }
    
    if (locationState?.taskGenerationError) {
      console.error('[StaticTaskRecommendationScreen] タスク生成エラー:', locationState.taskGenerationError);
      setError(`タスクの自動生成に失敗しました: ${locationState.taskGenerationError}`);
    }
  }, [locationState]);

  // タスク推奨取得
  const fetchRecommendation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const tasks = await TaskService.getActiveTasks(userId);
      
      if (tasks.length === 0) {
        setError('推奨できるタスクがありません。タスクを作成してください。');
        setLoading(false);
        return;
      }

      // /v1/task/rank API呼び出し
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${serverUrl}/v1/task/rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          tasks: tasks.map(t => ({
            id: t.taskId,
            title: t.title,
            estimate: t.estimateMin || 30,
            estimate_min_chunk: Math.min(10, t.estimateMin || 10),
            importance: t.importance / 5.0,  // 1-5 → 0-1に正規化
            due_in_hours: t.dueInHours || 999,
            days_since_last_touch: t.lastTouchAt
              ? Math.floor((Date.now() - t.lastTouchAt.getTime()) / (1000 * 60 * 60 * 24))
              : 0,
            has_independent_micro_step: t.hasIndependentMicroStep || false,
            preferred_time: t.preferredTimeOfDay,
            preferred_location: t.preferredLocation,
          })),
          factors: {
            time_of_day: { value: timeOfDay },
            location_category: { value: location },
            available_time_min: { value: availableTime },
            mood: { value: mood },
            energy_level: { value: energyLevel },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      // APIレスポンス形式: { recommendation: { taskId, variant, saliency, score } }
      const recommendedTaskId = result.recommendation?.taskId || result.recommendedTaskId || result.topTask?.taskId;
      const recommendedTask = tasks.find(t => t.taskId === recommendedTaskId) || tasks[0];

      const recResult = {
        task: recommendedTask,
        variant: result.recommendation?.variant || result.uiVariant || result.topTask?.variant || 'task_card',
        saliency: result.recommendation?.saliency ?? result.saliency ?? result.topTask?.saliency ?? 2,
        score: result.recommendation?.score ?? result.topScore ?? result.topTask?.score ?? 0,
        generationId: result.generationId,
      };
      
      setRecommendation(recResult);
      
      const shownAt = new Date();
      setRecommendationShownAt(shownAt);
      
      // task_recommendation_shown イベント記録 ⭐️ uiCondition='static_ui'
      await eventLogger.log({
        eventType: 'task_recommendation_shown',
        screenId: 'static_task_recommendation',
        metadata: {
          uiCondition: 'static_ui', // ⭐️固定UI版
          taskId: recommendedTask.taskId,
          taskVariant: recResult.variant,
          saliency: recResult.saliency,
          score: recResult.score,
          factorsSnapshot: {
            time_of_day: timeOfDay,
            location_category: location,
            available_time: availableTime,
          },
        },
      });
      
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      setError('タスク推奨の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 着手ハンドラー ⭐️着手の定義
  const handleActionStart = async () => {
    if (!recommendation || !recommendation.task || !recommendationShownAt) {
      console.error('Invalid state for action start');
      return;
    }

    try {
      // ActionReport作成（uiCondition='static_ui'）
      const report = await db.startAction(
        recommendation.task.taskId,
        userId,
        recommendationShownAt,
        'static_ui', // ⭐️固定UI版
        {
          timeOfDay,
          location,
          availableTimeMin: availableTime,
          factorsSnapshot: {
            time_of_day: timeOfDay,
            location_category: location,
            available_time: availableTime,
          },
        }
      );

      // task_action_started イベント記録 ⭐️
      await eventLogger.log({
        eventType: 'task_action_started',
        screenId: 'static_task_recommendation',
        metadata: {
          uiCondition: 'static_ui', // ⭐️固定UI版
          taskId: recommendation.task.taskId,
          timeToActionSec: report.timeToStartSec,
        },
      });

      console.log('✅ [StaticUI] Action started:', {
        reportId: report.reportId,
        timeToStartSec: report.timeToStartSec,
      });

      setCurrentReportId(report.reportId);
      setShowActionModal(true);

    } catch (error) {
      console.error('❌ Action start failed:', error);
      alert('着手の記録に失敗しました');
    }
  };

  // ActionReport完了ハンドラー
  const handleActionComplete = (elapsedSec: number) => {
    setActionElapsedSec(elapsedSec);
    setShowActionModal(false);
    setShowClarityModal(true);
  };

  // ClarityFeedback完了ハンドラー
  const handleClarityComplete = () => {
    setShowClarityModal(false);
    setRecommendation(null);
    setRecommendationShownAt(null);
    setCurrentReportId('');
    setActionElapsedSec(0);
  };

  return (
    <div className="static-task-recommendation-screen" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>タスク推奨（固定UI版）</h1>
      
      {/* 開発環境でのバージョン表示 */}
      {import.meta.env.DEV && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: '#FEF3C7', 
          border: '1px solid #F59E0B',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#92400E'
        }}>
          🔧 開発モード: 固定UI版（uiCondition='static_ui'）
        </div>
      )}
      
      {/* 思考整理フローからの成功メッセージ */}
      {showGeneratedTasksMessage && locationState?.generatedTasks && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb', 
          borderRadius: '8px',
          color: '#155724'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>✅ タスク生成完了！</h3>
          <p style={{ margin: 0 }}>
            思考整理から {locationState.generatedTasks.length} 件のタスクを生成しました。
            以下で最適なタスクを推奨します。
          </p>
          <button 
            onClick={() => setShowGeneratedTasksMessage(false)}
            style={{ 
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: 'transparent',
              border: '1px solid #155724',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#155724'
            }}
          >
            閉じる
          </button>
        </div>
      )}
      
      {/* 自動取得されたFactors情報（参考表示のみ） */}
      <div className="factors-display" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '10px', color: '#495057' }}>📍 自動取得された現在の状況</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '14px', color: '#6c757d' }}>
          <div>
            <strong>場所:</strong> {location === 'home' ? '自宅' : location === 'work' ? '職場' : location === 'transit' ? '移動中' : 'その他'}
          </div>
          <div>
            <strong>時間帯:</strong> {timeOfDay === 'morning' ? '朝' : timeOfDay === 'afternoon' ? '午後' : timeOfDay === 'evening' ? '夕方' : '夜'}
          </div>
          <div>
            <strong>利用可能時間:</strong> {availableTime}分
          </div>
          <div>
            <strong>気分:</strong> {mood === 'happy' ? '良い' : mood === 'neutral' ? '普通' : mood === 'stressed' ? 'ストレス' : '疲れ'}
          </div>
          <div>
            <strong>エネルギー:</strong> {energyLevel}/10
          </div>
        </div>

        <button
          onClick={fetchRecommendation}
          disabled={loading}
          style={{
            marginTop: '15px',
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? '推奨中...' : 'タスクを推奨'}
        </button>
      </div>

      {/* Loading状態 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>タスクを推奨しています...</p>
        </div>
      )}

      {/* Error状態 */}
      {error && (
        <div style={{ padding: '15px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ color: '#d32f2f', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Empty状態 */}
      {!loading && !error && !recommendation && (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <p>上記の情報を入力して「タスクを推奨」ボタンをクリックしてください。</p>
        </div>
      )}

      {/* 推奨結果表示（StaticTaskCard使用） */}
      {recommendation && recommendation.task && (
        <div style={{ marginTop: '20px' }}>
          <h2 style={{ marginBottom: '15px' }}>推奨タスク</h2>
          <StaticTaskCard
            task={recommendation.task}
            variant={recommendation.variant}
            saliency={recommendation.saliency}
            onActionStart={handleActionStart}
          />
        </div>
      )}

      {/* ActionReportModal（共通コンポーネント） */}
      {recommendation && recommendation.task && (
        <ActionReportModal
          isOpen={showActionModal}
          onClose={() => setShowActionModal(false)}
          task={recommendation.task}
          reportId={currentReportId}
          onComplete={handleActionComplete}
        />
      )}

      {/* ClarityFeedbackModal（共通コンポーネント） */}
      {recommendation && recommendation.task && (
        <ClarityFeedbackModal
          isOpen={showClarityModal}
          onClose={handleClarityComplete}
          reportId={currentReportId}
          task={recommendation.task}
          elapsedSec={actionElapsedSec}
        />
      )}
    </div>
  );
};

