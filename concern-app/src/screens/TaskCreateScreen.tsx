/**
 * TaskCreateScreen（Phase 2）
 * タスク作成フォーム画面
 */

import React, { useState } from 'react';
import { TaskService } from '../services/TaskService';
import { eventLogger } from '../services/EventLogger';

interface TaskCreateScreenProps {
  userId: string;
  onTaskCreated?: () => void;
}

export const TaskCreateScreen: React.FC<TaskCreateScreenProps> = ({ userId, onTaskCreated }) => {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [importance, setImportance] = useState<number>(0.5);
  const [urgency, setUrgency] = useState<number>(0.5);
  const [estimateMin, setEstimateMin] = useState<number>(30);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    setSubmitting(true);

    try {
      // タスク作成
      const task = await TaskService.createTask({
        userId,
        title: title.trim(),
        description: description.trim() || undefined,
        importance,
        urgency,
        estimateMin,
        hasIndependentMicroStep: false,
        status: 'active',
        progress: 0,
        source: 'manual',
        totalActionsStarted: 0,
        totalActionsCompleted: 0,
        syncedToServer: false,
      });

      // task_created イベント記録
      await eventLogger.log({
        eventType: 'task_created',
        screenId: 'task_create',
        metadata: {
          taskId: task.taskId,
          source: 'manual',
        },
      });

      console.log('✅ Task created:', task.taskId);
      alert('タスクを作成しました！');

      // フォームリセット
      setTitle('');
      setDescription('');
      setImportance(0.5);
      setUrgency(0.5);
      setEstimateMin(30);

      // コールバック実行
      if (onTaskCreated) {
        onTaskCreated();
      }

    } catch (error) {
      console.error('❌ Task creation failed:', error);
      alert('タスクの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>新しいタスク</h1>

      <form onSubmit={handleSubmit}>
        {/* タイトル */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            タイトル *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 英語の勉強をする"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '16px',
            }}
          />
        </div>

        {/* 説明 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            説明（任意）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="タスクの詳細を記入できます"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* 重要度 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            重要度: {(importance * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={importance}
            onChange={(e) => setImportance(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#777' }}>
            <span>低</span>
            <span>高</span>
          </div>
        </div>

        {/* 緊急度 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            緊急度: {(urgency * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={urgency}
            onChange={(e) => setUrgency(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#777' }}>
            <span>低</span>
            <span>高</span>
          </div>
        </div>

        {/* 推定時間 */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            推定所要時間（分）
          </label>
          <input
            type="number"
            value={estimateMin}
            onChange={(e) => setEstimateMin(parseInt(e.target.value) || 0)}
            min={5}
            max={240}
            step={5}
            style={{
              width: '150px',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '16px',
            }}
          />
        </div>

        {/* 送信ボタン */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            style={{
              flex: 1,
              padding: '15px',
              backgroundColor: submitting || !title.trim() ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: submitting || !title.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '作成中...' : 'タスクを作成'}
          </button>
        </div>
      </form>
    </div>
  );
};

