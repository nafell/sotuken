/**
 * DynamicThoughtScreen - 動的思考整理画面
 * Phase 1C - C7タスク
 * 
 * UISpecDSLを使った動的UI生成画面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/api/ApiService';
import { ContextService } from '../../services/context/ContextService';
import { sessionManager } from '../../services/session/SessionManager';
import { UIRenderer } from '../../services/ui-generation/UIRenderer';
import type { UISpecDSL } from '../../../../server/src/types/UISpecDSL';
import type { DataSchemaDSL } from '../../../../server/src/types/DataSchemaDSL';

interface LocationState {
  concernText: string;
  stage?: 'capture' | 'plan' | 'breakdown';
  [key: string]: any;
}

export const DynamicThoughtScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uiSpec, setUiSpec] = useState<UISpecDSL | null>(null);
  const [dataSchema, setDataSchema] = useState<DataSchemaDSL | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const concernText = state?.concernText || '';
  const stage = state?.stage || 'capture';

  /**
   * UI生成
   */
  useEffect(() => {
    const generateUI = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // イベント記録
        await apiService.sendEvent('dynamic_ui_generation_start', {
          stage,
          concernText: concernText.slice(0, 100)
        }, sessionManager.getSessionId() || undefined);

        // factors収集
        const contextService = new ContextService();
        const factors = await contextService.collectCurrentFactors();

        console.log(`🔄 動的UI生成開始 [${stage}]:`, Object.keys(factors));

        // 思考整理API呼び出し
        const response = await fetch('http://localhost:3000/v1/thought/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage,
            concernText,
            factors,
            sessionId: sessionManager.getSessionId()
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ UI生成完了:', data);

        setDataSchema(data.dataSchema);
        setUiSpec(data.uiSpec);

        // 初期データを設定
        const initialData = initializeFormData(data.dataSchema);
        setFormData(initialData);

        // イベント記録
        await apiService.sendEvent('dynamic_ui_generation_complete', {
          generationId: data.generationId,
          stage
        }, sessionManager.getSessionId() || undefined);

      } catch (err) {
        console.error('❌ 動的UI生成エラー:', err);
        setError(err instanceof Error ? err.message : '不明なエラー');

        // エラーイベント記録
        await apiService.sendEvent('dynamic_ui_generation_error', {
          error: String(err),
          stage
        }, sessionManager.getSessionId() || undefined);
      } finally {
        setIsLoading(false);
      }
    };

    generateUI();
  }, [concernText, stage]);

  /**
   * DataSchemaから初期フォームデータを生成
   */
  const initializeFormData = (schema: DataSchemaDSL): Record<string, any> => {
    const data: Record<string, any> = {};

    for (const [entityName, entityDef] of Object.entries(schema.entities)) {
      data[entityName] = {};
      
      for (const [attrName, attrSpec] of Object.entries(entityDef)) {
        // 初期値設定
        if (attrSpec.type === 'string') {
          data[entityName][attrName] = '';
        } else if (attrSpec.type === 'number') {
          data[entityName][attrName] = 0;
        } else if (attrSpec.type === 'boolean') {
          data[entityName][attrName] = false;
        } else if (attrSpec.type === 'array') {
          data[entityName][attrName] = [];
        }
      }
    }

    // CONCERN.concernTextには初期値を設定
    if (data.CONCERN && concernText) {
      data.CONCERN.concernText = concernText;
    }

    return data;
  };

  /**
   * データ変更ハンドラー
   */
  const handleDataChange = useCallback((path: string, value: any) => {
    console.log('📝 データ変更:', path, value);

    setFormData((prev) => {
      const newData = { ...prev };
      const parts = path.split('.');
      
      let current: any = newData;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
      
      return newData;
    });
  }, []);

  /**
   * 次へ進む
   */
  const handleNext = async () => {
    console.log('🚀 フォームデータ送信:', formData);

    // セッションにデータを保存
    try {
      await apiService.sendEvent('thought_completion', {
        stage,
        formData
      }, sessionManager.getSessionId() || undefined);

      // ステージに応じた次の画面へ
      if (stage === 'capture') {
        navigate('/plan', { state: { ...state, captureData: formData } });
      } else if (stage === 'plan') {
        navigate('/breakdown', { state: { ...state, planData: formData } });
      } else {
        navigate('/feedback', { state: { ...state, breakdownData: formData } });
      }
    } catch (err) {
      console.error('❌ データ送信エラー:', err);
    }
  };

  /**
   * ローディング表示
   */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">UI生成中...</p>
          <p className="text-sm text-gray-500 mt-2">ステージ: {stage}</p>
        </div>
      </div>
    );
  }

  /**
   * エラー表示
   */
  if (error || !uiSpec || !dataSchema) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-3">
              ⚠️ UI生成エラー
            </h2>
            <p className="text-red-700 mb-4">
              {error || 'UIを生成できませんでした'}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * メイン表示
   */
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 mb-4"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {stage === 'capture' && '📝 関心事の整理'}
            {stage === 'plan' && '💭 アプローチの計画'}
            {stage === 'breakdown' && '🚀 具体的なアクション'}
          </h1>
          <p className="text-gray-600">
            {concernText}
          </p>
        </div>

        {/* 動的UI */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <UIRenderer
            uiSpec={uiSpec}
            dataSchema={dataSchema}
            data={formData}
            onChange={handleDataChange}
          />
        </div>

        {/* アクションボタン */}
        <div className="flex space-x-3">
          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            次へ進む
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            スキップ
          </button>
        </div>

        {/* デバッグ情報（開発時のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <details>
              <summary className="cursor-pointer font-semibold text-gray-700">
                🔍 デバッグ情報
              </summary>
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <strong>Stage:</strong> {stage}
                </div>
                <div>
                  <strong>Generation ID:</strong> {uiSpec.generationId}
                </div>
                <div>
                  <strong>Mappings:</strong> {Object.keys(uiSpec.mappings).length}個
                </div>
                <div>
                  <strong>Form Data:</strong>
                  <pre className="mt-1 p-2 bg-white rounded overflow-auto max-h-40">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

