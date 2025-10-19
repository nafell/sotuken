/**
 * SettingsScreen（Phase 2 Step 5）
 * ユーザー用設定画面
 * 
 * 機能:
 * - ユーザーID表示
 * - 実験条件表示
 * - 統計情報表示
 * - デバッグ用の条件切り替えボタン（開発環境のみ）
 */

import React, { useState, useEffect } from 'react';
import { experimentService } from '../services/ClientExperimentService';
import { db } from '../services/database/localDB';

interface UserStats {
  totalTasksCreated: number;
  totalActionsStarted: number;
  totalActionsCompleted: number;
  averageClarityImprovement: number | null;
}

export const SettingsScreen: React.FC = () => {
  const [userId, setUserId] = useState<string>('');
  const [condition, setCondition] = useState<string | null>(null);
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [assignedAt, setAssignedAt] = useState<Date | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConditionAndStats();
  }, []);

  const loadConditionAndStats = async () => {
    setIsLoading(true);
    
    try {
      // ユーザーIDを取得
      const storedUserId = localStorage.getItem('anonymousUserId') || 'unknown';
      setUserId(storedUserId);

      // 実験条件を取得
      const currentCondition = experimentService.getCachedCondition();
      setCondition(currentCondition);

      const currentExperimentId = experimentService.getExperimentId();
      setExperimentId(currentExperimentId);

      // ユーザープロファイルから割り当て日時を取得
      const userProfile = await db.userProfile.toCollection().first();
      if (userProfile?.experimentAssignedAt) {
        setAssignedAt(userProfile.experimentAssignedAt);
      }

      // 統計情報を計算
      const tasks = await db.tasks.where('userId').equals(storedUserId).toArray();
      const actionReports = await db.actionReports.where('userId').equals(storedUserId).toArray();

      const completedReports = actionReports.filter(r => r.clarityImprovement !== undefined);
      const avgClarity = completedReports.length > 0
        ? completedReports.reduce((sum, r) => sum + (r.clarityImprovement || 0), 0) / completedReports.length
        : null;

      setStats({
        totalTasksCreated: tasks.length,
        totalActionsStarted: actionReports.length,
        totalActionsCompleted: completedReports.length,
        averageClarityImprovement: avgClarity
      });

    } catch (error) {
      console.error('[SettingsScreen] データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // デバッグ用の条件切り替え
  const handleDebugSwitch = async () => {
    if (import.meta.env.PROD) {
      alert('本番環境では条件切り替えはできません');
      return;
    }

    if (!window.confirm('⚠️ 警告: この操作はデバッグ用です。\n実験データの一貫性が損なわれる可能性があります。\n続行しますか？')) {
      return;
    }

    const newCondition = condition === 'dynamic_ui' ? 'static_ui' : 'dynamic_ui';
    await experimentService.switchCondition(newCondition);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>設定</h1>

      {/* ユーザーID表示 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>ユーザーID</h2>
        <div style={{ padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '8px' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all', margin: 0 }}>
            {userId}
          </p>
        </div>
        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
          ℹ️ このIDは実験データの識別に使用されます
        </p>
      </section>

      {/* 実験条件表示 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>実験条件</h2>

        {condition ? (
          <div style={{ padding: '16px', backgroundColor: '#EFF6FF', border: '1px solid #3B82F6', borderRadius: '8px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', color: '#1E40AF', margin: '0 0 8px 0' }}>
              {condition === 'dynamic_ui' ? '動的UI版' : '固定UI版'}
            </p>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
              {condition === 'dynamic_ui' 
                ? 'LLMによる動的UI生成を使用しています' 
                : '固定デザインテンプレートを使用しています'}
            </p>
            {assignedAt && (
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px', margin: 0 }}>
                割り当て日時: {assignedAt.toLocaleString('ja-JP')}
              </p>
            )}
            {experimentId && (
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px', fontFamily: 'monospace', margin: 0 }}>
                実験ID: {experimentId}
              </p>
            )}
          </div>
        ) : (
          <div style={{ padding: '16px', backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '8px' }}>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#92400E', margin: '0 0 8px 0' }}>
              未割り当て
            </p>
            <p style={{ fontSize: '14px', color: '#78350F', margin: 0 }}>
              研究者による条件割り当てを待っています
            </p>
          </div>
        )}
      </section>

      {/* 統計情報 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>統計情報</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>タスク作成数</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{stats?.totalTasksCreated || 0}</p>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>着手回数</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{stats?.totalActionsStarted || 0}</p>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>完了回数</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{stats?.totalActionsCompleted || 0}</p>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>平均スッキリ度</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
              {stats?.averageClarityImprovement?.toFixed(1) || '-'}
            </p>
          </div>
        </div>
      </section>

      {/* デバッグセクション（開発環境のみ表示） */}
      {import.meta.env.DEV && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#EF4444', marginBottom: '16px' }}>
            🔧 デバッグ機能
          </h2>

          <div style={{ padding: '16px', backgroundColor: '#FEF2F2', border: '2px solid #EF4444', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#991B1B', margin: '0 0 8px 0' }}>
              ⚠️ 開発環境専用
            </p>
            <p style={{ fontSize: '12px', color: '#7F1D1D', margin: 0 }}>
              以下の機能は開発時のテスト用です。本番環境では使用しないでください。
            </p>
          </div>

          <button
            onClick={handleDebugSwitch}
            style={{
              padding: '12px 24px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444';
            }}
          >
            🔄 条件を切り替え（デバッグ）
          </button>
        </section>
      )}
    </div>
  );
};

