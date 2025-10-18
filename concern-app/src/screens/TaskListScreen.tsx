/**
 * TaskListScreen（Phase 2）
 * タスク一覧表示画面
 */

import React, { useState, useEffect } from 'react';
import { TaskService } from '../services/TaskService';
import type { Task } from '../types/database';

interface TaskListScreenProps {
  userId: string;
}

type TabType = 'active' | 'completed' | 'archived';

export const TaskListScreen: React.FC<TaskListScreenProps> = ({ userId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadTasks();
  }, [activeTab, userId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      let loadedTasks: Task[] = [];
      
      switch (activeTab) {
        case 'active':
          loadedTasks = await TaskService.getActiveTasks(userId);
          break;
        case 'completed':
          loadedTasks = await TaskService.getCompletedTasks(userId);
          break;
        case 'archived':
          loadedTasks = await TaskService.getArchivedTasks(userId);
          break;
      }
      
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    if (confirm('このタスクを完了しますか？')) {
      try {
        await TaskService.completeTask(taskId);
        loadTasks();
      } catch (error) {
        console.error('Failed to complete task:', error);
        alert('タスクの完了に失敗しました');
      }
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (confirm('このタスクを削除しますか？')) {
      try {
        await TaskService.deleteTask(taskId);
        loadTasks();
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('タスクの削除に失敗しました');
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>タスク一覧</h1>

      {/* タブ切り替え */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'active' ? '3px solid #4caf50' : 'none',
            color: activeTab === 'active' ? '#4caf50' : '#777',
            fontWeight: activeTab === 'active' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          アクティブ ({tasks.filter(t => t.status === 'active').length})
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'completed' ? '3px solid #4caf50' : 'none',
            color: activeTab === 'completed' ? '#4caf50' : '#777',
            fontWeight: activeTab === 'completed' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          完了
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'archived' ? '3px solid #4caf50' : 'none',
            color: activeTab === 'archived' ? '#4caf50' : '#777',
            fontWeight: activeTab === 'archived' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          アーカイブ
        </button>
      </div>

      {/* Loading状態 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>読み込み中...</p>
        </div>
      )}

      {/* Empty状態 */}
      {!loading && tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <p>タスクがありません</p>
          {activeTab === 'active' && (
            <p style={{ color: '#777', fontSize: '14px' }}>新しいタスクを作成してください</p>
          )}
        </div>
      )}

      {/* タスクリスト */}
      {!loading && tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {tasks.map((task) => (
            <div
              key={task.taskId}
              style={{
                padding: '20px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: 'white',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#333' }}>{task.title}</h3>
              
              {task.description && (
                <p style={{ color: '#777', fontSize: '14px', marginBottom: '10px' }}>{task.description}</p>
              )}

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontSize: '14px', color: '#555' }}>
                <span>⏱ {task.estimateMin}分</span>
                <span>🔥 重要度: {(task.importance * 100).toFixed(0)}%</span>
                <span>⚡ 緊急度: {(task.urgency * 100).toFixed(0)}%</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#999' }}>
                <span>着手: {task.totalActionsStarted}回</span>
                <span>完了: {task.totalActionsCompleted}回</span>
                <span>進捗: {task.progress}%</span>
              </div>

              {activeTab === 'active' && (
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleTaskComplete(task.taskId)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    完了
                  </button>

                  <button
                    onClick={() => handleTaskDelete(task.taskId)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

