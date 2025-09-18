/**
 * FactorsTest - factors辞書システムのテスト画面
 * Phase 0 Day 4 - Capacitor統合とfactors収集テスト用
 */

import React, { useState, useEffect } from 'react';
import { contextService } from '../services/context/ContextService';
import { capacitorIntegration } from '../services/context/CapacitorIntegration';
import { apiService } from '../services/api/ApiService';
import type { FactorsDict } from '../types/database';

export const FactorsTest: React.FC = () => {
  const [factors, setFactors] = useState<FactorsDict>({});
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [apiResult, setApiResult] = useState<any>(null);

  const collectFactors = async () => {
    setIsCollecting(true);
    setError(null);
    
    try {
      console.log('🔄 Starting factors collection test...');
      
      // factors収集実行
      const collectedFactors = await contextService.collectCurrentFactors();
      setFactors(collectedFactors);
      
      // デバッグ情報取得
      const contextDebugInfo = contextService.getDebugInfo();
      const capacitorDebugInfo = capacitorIntegration.getDebugInfo();
      
      setDebugInfo({
        context: contextDebugInfo,
        capacitor: capacitorDebugInfo,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Factors collection completed');
      
    } catch (err) {
      console.error('❌ Factors collection failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCollecting(false);
    }
  };

  // API連携テスト
  const testApiIntegration = async () => {
    setApiStatus('testing');
    setApiResult(null);
    
    try {
      console.log('🔄 Starting API integration test...');
      
      // 1. ヘルスチェック
      const health = await apiService.healthCheck();
      
      // 2. 設定取得
      const config = await apiService.getConfig();
      
      // 3. factors収集
      const currentFactors = await contextService.collectCurrentFactors();
      
      // 4. UI生成テスト
      const uiResponse = await apiService.generateUI({
        sessionId: 'test-session-' + Date.now(),
        uiVariant: 'dynamic',
        userExplicitInput: {
          concernText: 'factors辞書システムのテスト',
          selectedCategory: 'test',
          urgencyChoice: 'test'
        },
        systemInferredContext: {
          timeOfDay: currentFactors.time_of_day?.value as string || 'unknown',
          availableTimeMin: currentFactors.available_time_min?.value as number,
          factors: contextService.sanitizeForServer(currentFactors)
        },
        noveltyLevel: 'low'
      });
      
      // 5. イベント送信テスト
      await apiService.sendEvents({
        events: [{
          eventId: 'test-event-' + Date.now(),
          sessionId: 'test-session-' + Date.now(),
          anonymousUserId: apiService.getAnonymousUserId(),
          eventType: 'factors_test',
          timestamp: new Date().toISOString(),
          metadata: {
            factorCount: Object.keys(currentFactors).length,
            testType: 'api_integration'
          }
        }]
      });
      
      setApiResult({
        health,
        config,
        factors: currentFactors,
        uiGeneration: uiResponse,
        apiDebugInfo: apiService.getDebugInfo()
      });
      
      setApiStatus('success');
      console.log('✅ API integration test completed successfully');
      
    } catch (err) {
      console.error('❌ API integration test failed:', err);
      setApiResult({ error: err instanceof Error ? err.message : 'Unknown error' });
      setApiStatus('error');
    }
  };

  // 自動実行（初回読み込み時）
  useEffect(() => {
    collectFactors();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          📊 Factors辞書システム テスト
        </h1>
        
        <div className="flex space-x-4 mb-6 flex-wrap gap-2">
          <button
            onClick={collectFactors}
            disabled={isCollecting}
            className={`px-4 py-2 rounded-lg font-medium ${
              isCollecting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isCollecting ? '🔄 収集中...' : '🔍 Factors収集実行'}
          </button>

          <button
            onClick={testApiIntegration}
            disabled={apiStatus === 'testing' || isCollecting}
            className={`px-4 py-2 rounded-lg font-medium ${
              apiStatus === 'testing'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : apiStatus === 'success'
                ? 'bg-green-500 text-white hover:bg-green-600'
                : apiStatus === 'error'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            {apiStatus === 'testing' ? '🔄 API連携テスト中...' : 
             apiStatus === 'success' ? '✅ API連携成功' :
             apiStatus === 'error' ? '❌ API連携失敗' : 
             '🌐 API連携テスト'}
          </button>
          
          <button
            onClick={() => {
              setFactors({});
              setApiResult(null);
              setApiStatus('idle');
            }}
            className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600"
          >
            🗑️ クリア
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-red-800">❌ エラー</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}
      </div>

      {/* Factors表示 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          📋 収集されたFactors ({Object.keys(factors).length}件)
        </h2>
        
        {Object.keys(factors).length === 0 ? (
          <p className="text-gray-500">まだFactorsが収集されていません</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(factors).map(([key, factor]) => (
              <div key={key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-800">{key}</h3>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      (factor.confidence ?? 0) >= 0.8 ? 'bg-green-100 text-green-800' :
                      (factor.confidence ?? 0) >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      信頼度: {factor.confidence ? (factor.confidence * 100).toFixed(0) + '%' : 'N/A'}
                    </span>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                      {factor.source}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">値:</span>
                    <p className="text-gray-800 mt-1">
                      {typeof factor.value === 'object' 
                        ? JSON.stringify(factor.value, null, 2)
                        : String(factor.value)
                      }
                    </p>
                  </div>
                  
                  {factor.timestamp && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">取得時刻:</span>
                      <p className="text-gray-800 mt-1">
                        {new Date(factor.timestamp).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-sm font-medium text-gray-600">データソース:</span>
                    <p className="text-gray-800 mt-1">{factor.source || 'unknown'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API連携テスト結果 */}
      {apiResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {apiStatus === 'success' ? '🌐 API連携テスト結果' : '❌ API連携エラー'}
          </h2>
          
          {apiStatus === 'success' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">✅ ヘルスチェック</h3>
                  <p className="text-sm text-green-700">
                    {apiResult.health?.status}: {apiResult.health?.service || 'サーバー正常'}
                  </p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">📋 設定取得</h3>
                  <p className="text-sm text-blue-700">
                    Config v{apiResult.config?.configVersion}, 実験条件: {apiResult.config?.experimentAssignment?.condition}
                  </p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium text-purple-800 mb-2">🎨 UI生成</h3>
                  <p className="text-sm text-purple-700">
                    ID: {apiResult.uiGeneration?.generationId?.slice(0, 8)}...
                    (処理時間: {apiResult.uiGeneration?.generation?.processingTimeMs}ms)
                  </p>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-medium text-orange-800 mb-2">📊 イベント送信</h3>
                  <p className="text-sm text-orange-700">
                    ユーザーID: {apiResult.apiDebugInfo?.anonymousUserId?.slice(0, 15)}...
                  </p>
                </div>
              </div>
              
              <details className="border border-gray-200 rounded-lg">
                <summary className="px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 rounded-lg">
                  詳細データを表示
                </summary>
                <pre className="p-4 text-xs overflow-auto bg-gray-50">
                  {JSON.stringify(apiResult, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-red-700">{apiResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* デバッグ情報 */}
      {debugInfo && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🔧 デバッグ情報
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">ContextService</h3>
              <pre className="bg-gray-50 rounded p-3 text-sm overflow-auto">
                {JSON.stringify(debugInfo.context, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">CapacitorIntegration</h3>
              <pre className="bg-gray-50 rounded p-3 text-sm overflow-auto">
                {JSON.stringify(debugInfo.capacitor, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              テスト実行時刻: {debugInfo.timestamp}
            </p>
          </div>
        </div>
      )}

      {/* 統計情報 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          📈 統計情報
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(factors).length}
            </div>
            <div className="text-sm text-blue-800">総Factors数</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(factors).filter(f => (f.confidence ?? 0) >= 0.8).length}
            </div>
            <div className="text-sm text-green-800">高信頼度 (&ge;80%)</div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {Object.values(factors).filter(f => (f.confidence ?? 0) >= 0.5 && (f.confidence ?? 0) < 0.8).length}
            </div>
            <div className="text-sm text-yellow-800">中信頼度 (50-79%)</div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">
              {Object.values(factors).filter(f => (f.confidence ?? 0) < 0.5).length}
            </div>
            <div className="text-sm text-red-800">低信頼度 (&lt;50%)</div>
          </div>
        </div>
        
        <div className="mt-4">
          <h3 className="font-medium text-gray-700 mb-2">データソース別内訳</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {Array.from(new Set(Object.values(factors).map(f => f.source))).map(source => (
              <div key={source} className="bg-gray-50 rounded px-3 py-2">
                <span className="text-sm font-medium">{source}: </span>
                <span className="text-sm text-gray-600">
                  {Object.values(factors).filter(f => f.source === source).length}件
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
