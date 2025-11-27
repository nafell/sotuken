/**
 * UnassignedScreen（Phase 2 Step 5）
 * 未割り当てユーザー用の待機画面
 * 
 * 管理者が実験条件を割り当てるまで表示される画面
 */

import React from 'react';
import { experimentService } from '../services/ClientExperimentService';

export const UnassignedScreen: React.FC = () => {
  // ユーザーIDを取得（存在しない場合は自動生成）
  const userId = experimentService.getUserId();

  const handleReload = () => {
    window.location.reload();
  };

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userId);
    alert('ユーザーIDをコピーしました');
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#F9FAFB',
        padding: '20px'
      }}
    >
      <div 
        style={{
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        {/* アイコン */}
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>
          ⏳
        </div>

        {/* タイトル */}
        <h1 
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '16px'
          }}
        >
          実験条件の割り当て待ち
        </h1>

        {/* 説明 */}
        <p 
          style={{
            fontSize: '16px',
            color: '#6B7280',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}
        >
          あなたのユーザーIDはまだ実験条件に割り当てられていません。
          研究者による割り当てが完了するまでお待ちください。
        </p>

        {/* ユーザーID表示 */}
        <div 
          style={{
            padding: '16px',
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
            marginBottom: '24px'
          }}
        >
          <p 
            style={{
              fontSize: '12px',
              color: '#6B7280',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            あなたのユーザーID
          </p>
          <p 
            style={{
              fontSize: '14px',
              fontFamily: 'monospace',
              color: '#111827',
              fontWeight: '600',
              wordBreak: 'break-all'
            }}
          >
            {userId}
          </p>
          <button
            onClick={handleCopyUserId}
            style={{
              marginTop: '12px',
              padding: '6px 12px',
              fontSize: '12px',
              color: '#3B82F6',
              backgroundColor: 'transparent',
              border: '1px solid #3B82F6',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EFF6FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            📋 IDをコピー
          </button>
        </div>

        {/* 案内 */}
        <p 
          style={{
            fontSize: '14px',
            color: '#9CA3AF',
            marginBottom: '24px'
          }}
        >
          研究者にこのユーザーIDを伝えてください。
          条件が割り当てられたら、下のボタンで再読み込みしてください。
        </p>

        {/* 再読み込みボタン */}
        <button
          onClick={handleReload}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3B82F6';
          }}
        >
          🔄 再読み込み
        </button>

        {/* ヘルプテキスト */}
        <p 
          style={{
            fontSize: '12px',
            color: '#9CA3AF',
            marginTop: '24px'
          }}
        >
          ℹ️ 割り当てには通常1-2分かかります。
          しばらく待ってから再読み込みしてください。
        </p>
      </div>
    </div>
  );
};

