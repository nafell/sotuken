/**
 * ClarityFeedbackModal（Phase 2）
 * スッキリ度測定モーダル
 */

import React, { useState } from 'react';
import { db } from '../services/database/localDB';
import { eventLogger } from '../services/EventLogger';
import type { Task } from '../types/database';

interface ClarityFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  task: Task;
  elapsedSec: number;
}

export const ClarityFeedbackModal: React.FC<ClarityFeedbackModalProps> = ({
  isOpen,
  onClose,
  reportId,
  task,
  elapsedSec,
}) => {
  const [clarityImprovement, setClarityImprovement] = useState<1 | 2 | 3 | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!clarityImprovement) {
      alert('スッキリ度を選択してください');
      return;
    }

    setSubmitting(true);

    try {
      // ActionReport完了記録
      await db.completeAction(reportId, clarityImprovement, notes);

      // task_action_completed イベント記録 ⭐️
      await eventLogger.log({
        eventType: 'task_action_completed',
        screenId: 'task_recommendation',
        metadata: {
          taskId: task.taskId,
          durationMin: elapsedSec / 60,
          clarityImprovement,
        },
      });

      // clarity_feedback_submitted イベント記録
      await eventLogger.log({
        eventType: 'clarity_feedback_submitted',
        screenId: 'clarity_feedback',
        metadata: {
          taskId: task.taskId,
          clarityImprovement,
          notes: notes || undefined,
        },
      });

      console.log('✅ Clarity feedback submitted:', {
        reportId,
        clarityImprovement,
        durationMin: elapsedSec / 60,
      });

      alert('記録しました！お疲れさまでした 🎉');
      onClose();

    } catch (error) {
      console.error('❌ Clarity feedback submission failed:', error);
      alert('記録に失敗しました');
    } finally {
      setSubmitting(false);
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
        zIndex: 1001,
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
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>作業完了</h2>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#555', fontSize: '16px', marginBottom: '10px' }}>
            <strong>{task.title}</strong> の作業、お疲れさまでした！
          </p>
          <p style={{ color: '#777', fontSize: '14px' }}>
            所要時間: {Math.floor(elapsedSec / 60)}分{elapsedSec % 60}秒
          </p>
        </div>

        {/* スッキリ度選択 */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
            この作業でどれくらいスッキリしましたか？
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: `2px solid ${clarityImprovement === 1 ? '#4caf50' : '#e0e0e0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: clarityImprovement === 1 ? '#f1f8f4' : 'white',
              }}
            >
              <input
                type="radio"
                name="clarity"
                value="1"
                checked={clarityImprovement === 1}
                onChange={() => setClarityImprovement(1)}
                style={{ marginRight: '10px' }}
              />
              <span style={{ fontSize: '24px', marginRight: '10px' }}>😐</span>
              <span>あまりスッキリしない</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: `2px solid ${clarityImprovement === 2 ? '#4caf50' : '#e0e0e0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: clarityImprovement === 2 ? '#f1f8f4' : 'white',
              }}
            >
              <input
                type="radio"
                name="clarity"
                value="2"
                checked={clarityImprovement === 2}
                onChange={() => setClarityImprovement(2)}
                style={{ marginRight: '10px' }}
              />
              <span style={{ fontSize: '24px', marginRight: '10px' }}>🙂</span>
              <span>少しスッキリ</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: `2px solid ${clarityImprovement === 3 ? '#4caf50' : '#e0e0e0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: clarityImprovement === 3 ? '#f1f8f4' : 'white',
              }}
            >
              <input
                type="radio"
                name="clarity"
                value="3"
                checked={clarityImprovement === 3}
                onChange={() => setClarityImprovement(3)}
                style={{ marginRight: '10px' }}
              />
              <span style={{ fontSize: '24px', marginRight: '10px' }}>😊</span>
              <span>かなりスッキリ</span>
            </label>
          </div>
        </div>

        {/* メモ入力 */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: '#555' }}>
            メモ（任意）
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="気づいたことや感想を記録できます"
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* 送信ボタン */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSubmit}
            disabled={!clarityImprovement || submitting}
            style={{
              flex: 1,
              padding: '15px',
              backgroundColor: !clarityImprovement || submitting ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: !clarityImprovement || submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '送信中...' : '記録する'}
          </button>
        </div>
      </div>
    </div>
  );
};

