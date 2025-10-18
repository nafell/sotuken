/**
 * TaskRecommendationScreen（Phase 2）
 * タスク推奨画面 - 動的UI版
 */

import React, { useState, useEffect } from 'react';
import { TaskService } from '../services/TaskService';
import type { Task } from '../types/database';

interface TaskRecommendationScreenProps {
  userId: string;
}

interface RecommendationResult {
  task: Task | null;
  variant: 'task_card' | 'micro_step_card' | 'prepare_step_card';
  saliency: 0 | 1 | 2 | 3;
  score: number;
  generationId?: string;
}

export const TaskRecommendationScreen: React.FC<TaskRecommendationScreenProps> = ({ userId }) => {
  // State管理
  const [location, setLocation] = useState<'home' | 'work' | 'transit' | 'other'>('home');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [availableTime, setAvailableTime] = useState<number>(30);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [recommendationShownAt, setRecommendationShownAt] = useState<Date | null>(null);

  // 初期化：時間帯を自動設定
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeOfDay('morning');
    else if (hour >= 12 && hour < 17) setTimeOfDay('afternoon');
    else if (hour >= 17 && hour < 21) setTimeOfDay('evening');
    else setTimeOfDay('night');
  }, []);

  // タスク推奨取得
  const fetchRecommendation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // アクティブタスク取得
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
            taskId: t.taskId,
            title: t.title,
            importance: t.importance,
            urgency: t.urgency,
            dueInHours: t.dueInHours,
            estimateMin: t.estimateMin,
            hasIndependentMicroStep: t.hasIndependentMicroStep,
            lastTouchAt: t.lastTouchAt?.toISOString(),
            preferredTimeOfDay: t.preferredTimeOfDay,
            preferredLocation: t.preferredLocation,
          })),
          factors: {
            time_of_day: { value: timeOfDay },
            location_category: { value: location },
            available_time_min: { value: availableTime },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      // 推奨タスクを取得
      const recommendedTaskId = result.recommendedTaskId || result.topTask?.taskId;
      const recommendedTask = tasks.find(t => t.taskId === recommendedTaskId) || tasks[0];
      
      setRecommendation({
        task: recommendedTask,
        variant: result.uiVariant || result.topTask?.variant || 'task_card',
        saliency: result.saliency || result.topTask?.saliency || 2,
        score: result.topScore || result.topTask?.score || 0,
        generationId: result.generationId,
      });
      
      setRecommendationShownAt(new Date());
      
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      setError('タスク推奨の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 着手ハンドラー（タスク2.9で実装）
  const handleActionStart = () => {
    console.log('Action started - will implement in task 2.9');
  };

  return (
    <div className="task-recommendation-screen" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>タスク推奨</h1>
      
      {/* Factors入力欄（タスク2.3で詳細実装） */}
      <div className="factors-input" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>現在の状況</h2>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            場所：
            <select value={location} onChange={(e) => setLocation(e.target.value as any)} style={{ marginLeft: '10px', padding: '5px' }}>
              <option value="home">自宅</option>
              <option value="work">職場</option>
              <option value="transit">移動中</option>
              <option value="other">その他</option>
            </select>
          </label>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            時間帯：
            <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as any)} style={{ marginLeft: '10px', padding: '5px' }}>
              <option value="morning">朝</option>
              <option value="afternoon">午後</option>
              <option value="evening">夕方</option>
              <option value="night">夜</option>
            </select>
          </label>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            利用可能時間（分）：
            <input 
              type="number" 
              value={availableTime} 
              onChange={(e) => setAvailableTime(Number(e.target.value))}
              min={5}
              max={180}
              style={{ marginLeft: '10px', padding: '5px', width: '80px' }}
            />
          </label>
        </div>
        
        <button 
          onClick={fetchRecommendation}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: loading ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '取得中...' : 'タスクを推奨'}
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

      {/* 推奨結果表示（タスク2.8でTaskCardWidget統合） */}
      {recommendation && recommendation.task && (
        <div style={{ padding: '20px', border: '2px solid #4caf50', borderRadius: '8px', backgroundColor: '#f1f8f4' }}>
          <h2>推奨タスク</h2>
          <h3>{recommendation.task.title}</h3>
          {recommendation.task.description && <p>{recommendation.task.description}</p>}
          <p>推定時間: {recommendation.task.estimateMin}分</p>
          <p>重要度: {(recommendation.task.importance * 100).toFixed(0)}%</p>
          <p>緊急度: {(recommendation.task.urgency * 100).toFixed(0)}%</p>
          <p>スコア: {(recommendation.score * 100).toFixed(1)}%</p>
          
          <button 
            onClick={handleActionStart}
            style={{ 
              padding: '15px 30px', 
              backgroundColor: '#4caf50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '15px'
            }}
          >
            着手する
          </button>
        </div>
      )}
    </div>
  );
};

