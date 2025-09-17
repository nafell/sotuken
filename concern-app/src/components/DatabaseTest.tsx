/**
 * データベーステスト用コンポーネント
 * Phase 0 Day 2 - 動作確認用
 */

import React, { useState, useEffect } from 'react';
import { db } from '../services/database/localDB';
import { contextService } from '../services/context/ContextService';
import type { UserProfile, ConcernSession, ContextData } from '../types/database.js';

export const DatabaseTest: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentSession, setCurrentSession] = useState<ConcernSession | null>(null);
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [stats, setStats] = useState<any>({});
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    initializeTest();
  }, []);

  const initializeTest = async () => {
    try {
      // ユーザー初期化
      const userProfile = await db.initializeUser();
      setUser(userProfile);

      // 統計情報取得
      const dbStats = await db.getStats();
      setStats(dbStats);

      // コンテキスト情報収集
      const factors = await contextService.collectCurrentFactors();
      setDebugInfo(contextService.getDebugInfo());

    } catch (error) {
      console.error('Database test initialization failed:', error);
    }
  };

  const startNewSession = async () => {
    if (!user) return;

    try {
      const session = await db.startSession(user.userId);
      setCurrentSession(session);

      // コンテキストデータを収集・保存
      const context = await contextService.saveContextForSession(session.sessionId);
      setContextData(context);

      // テストイベント記録
      await db.recordEvent({
        sessionId: session.sessionId,
        eventType: 'ui_shown',
        screenId: 'database_test',
        metadata: {
          uiVariant: 'static'
        }
      });

      // 統計更新
      const newStats = await db.getStats();
      setStats(newStats);

    } catch (error) {
      console.error('Session creation failed:', error);
    }
  };

  const completeSession = async () => {
    if (!currentSession) return;

    try {
      await db.completeSession(currentSession.sessionId, {
        actionStarted: true,
        actionCompleted: false,
        satisfactionLevel: 'somewhat_clear',
        workingMemoryBefore: 70,
        workingMemoryAfter: 40,
        cognitiveReliefScore: 60,
        totalTimeSpentMin: 5,
        screenTransitions: 3
      });

      setCurrentSession(null);

      // 統計更新
      const newStats = await db.getStats();
      setStats(newStats);

    } catch (error) {
      console.error('Session completion failed:', error);
    }
  };

  const clearData = async () => {
    try {
      await db.clearAllData();
      setUser(null);
      setCurrentSession(null);
      setContextData(null);
      setStats({});
      setDebugInfo({});
    } catch (error) {
      console.error('Data clearing failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          📊 データベーステスト - Phase 0 Day 2
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ユーザー情報 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">👤 ユーザープロファイル</h3>
            {user ? (
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>ID:</strong> {user.userId.slice(0, 8)}...</p>
                <p><strong>匿名ID:</strong> {user.anonymousId}</p>
                <p><strong>実験条件:</strong> {user.experimentCondition}</p>
                <p><strong>設定バージョン:</strong> {user.configVersion}</p>
              </div>
            ) : (
              <p className="text-blue-600">未初期化</p>
            )}
          </div>

          {/* セッション情報 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">🎯 現在のセッション</h3>
            {currentSession ? (
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>ID:</strong> {currentSession.sessionId.slice(0, 8)}...</p>
                <p><strong>開始時刻:</strong> {currentSession.startTime.toLocaleTimeString()}</p>
                <p><strong>画面:</strong> {currentSession.currentScreen}</p>
                <p><strong>完了:</strong> {currentSession.completed ? 'はい' : 'いいえ'}</p>
              </div>
            ) : (
              <p className="text-green-600">セッションなし</p>
            )}
          </div>

          {/* コンテキストデータ */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">📍 コンテキスト情報</h3>
            {contextData ? (
              <div className="text-sm text-purple-700 space-y-1">
                <p><strong>時間帯:</strong> {contextData.timeOfDay}</p>
                <p><strong>曜日:</strong> {['日', '月', '火', '水', '木', '金', '土'][contextData.dayOfWeek]}</p>
                <p><strong>利用可能時間:</strong> {contextData.availableTimeMin}分</p>
                <p><strong>factors数:</strong> {Object.keys(contextData.factors).length}</p>
              </div>
            ) : (
              <p className="text-purple-600">データなし</p>
            )}
          </div>

          {/* 統計情報 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">📈 データベース統計</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p><strong>ユーザー数:</strong> {stats.userCount || 0}</p>
              <p><strong>セッション数:</strong> {stats.sessionCount || 0}</p>
              <p><strong>イベント数:</strong> {stats.eventCount || 0}</p>
              <p><strong>最終活動:</strong> {stats.lastActivity?.toLocaleString() || '未記録'}</p>
            </div>
          </div>
        </div>

        {/* factors辞書デバッグ情報 */}
        {debugInfo.factors && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">🔧 factors辞書デバッグ</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>収集factors:</strong> {debugInfo.factors.join(', ')}</p>
              <p><strong>最終収集時刻:</strong> {debugInfo.lastCollected?.toLocaleString()}</p>
              <div>
                <strong>信頼度スコア:</strong>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {Object.entries(debugInfo.confidenceScores || {}).map(([key, score]) => (
                    <div key={key} className="text-xs">
                      {key}: {score as number}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={initializeTest}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            🔄 初期化
          </button>
          
          <button
            onClick={startNewSession}
            disabled={!user}
            className={`px-4 py-2 rounded-lg transition-colors ${
              user 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            ▶️ セッション開始
          </button>

          <button
            onClick={completeSession}
            disabled={!currentSession}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentSession
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            ✅ セッション完了
          </button>

          <button
            onClick={clearData}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            🗑️ データ削除
          </button>
        </div>
      </div>
    </div>
  );
};
