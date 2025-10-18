/**
 * ActionReportModal（Phase 2）
 * 行動報告モーダル - タイマー機能付き
 */

import React, { useState, useEffect } from 'react';
import type { Task } from '../types/database';

interface ActionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  reportId: string;
  onComplete: (elapsedSec: number) => void;
}

export const ActionReportModal: React.FC<ActionReportModalProps> = ({
  isOpen,
  onClose,
  task,
  reportId,
  onComplete,
}) => {
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // タイマー
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // 経過時間を分:秒形式に変換
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = () => {
    onComplete(elapsedSec);
  };

  const handleCancel = () => {
    if (confirm('作業を中断しますか？')) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>作業中</h2>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '18px', color: '#555' }}>{task.title}</h3>
          {task.description && (
            <p style={{ color: '#777', fontSize: '14px' }}>{task.description}</p>
          )}
        </div>

        {/* タイマー表示 */}
        <div
          style={{
            textAlign: 'center',
            padding: '30px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#4caf50' }}>
            {formatTime(elapsedSec)}
          </div>
          <div style={{ color: '#777', marginTop: '10px' }}>経過時間</div>
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleComplete}
            style={{
              flex: 1,
              padding: '15px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            完了しました
          </button>

          <button
            onClick={handleCancel}
            style={{
              padding: '15px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            中断
          </button>
        </div>
      </div>
    </div>
  );
};

