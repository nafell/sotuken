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
import { flowStateManager } from '../../services/ConcernFlowStateManager';
import { taskGenerationService } from '../../services/TaskGenerationService';
import { uiCacheService } from '../../services/UIGenerationCacheService';
import { UIRenderer } from '../ui-generation/UIRenderer';
import type { UISpecDSL } from '../../../../server/src/types/UISpecDSL';
import type { DataSchemaDSL } from '../../../../server/src/types/DataSchemaDSL';

interface LocationState {
  concernText: string;
  stage?: 'capture' | 'plan' | 'breakdown';
  concernId?: string;
  userId?: string;
  [key: string]: any;
}

interface DynamicThoughtScreenProps {
  stage: 'capture' | 'plan' | 'breakdown';
  concernId?: string;
  onComplete?: (result: any) => void;
}

export const DynamicThoughtScreen: React.FC<DynamicThoughtScreenProps> = ({ 
  stage: propStage,
  concernId: _propConcernId,
  onComplete: _onComplete
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uiSpec, setUiSpec] = useState<UISpecDSL | null>(null);
  const [dataSchema, setDataSchema] = useState<DataSchemaDSL | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Phase 2 Step 3: propsまたはlocation.stateから取得（propsを優先）
  const stage = propStage || state?.stage || 'capture';
  // concernIdは将来の機能で使用予定（現在はflowStateManagerから取得）
  
  // ConcernFlowStateManagerから関心事情報を取得
  const flowState = flowStateManager.loadState();
  const concernText = state?.concernText || flowState?.concernText || '';

  /**
   * UI生成
   * Phase 2 Step 3.5: キャッシュチェック追加
   */
  useEffect(() => {
    const generateUI = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Phase 2 Step 3.5: キャッシュチェック ⭐️
        const concernInfo = flowStateManager.getConcernInfo();
        if (concernInfo) {
          const cachedUI = uiCacheService.loadCache(stage, concernInfo.concernId);
          
          if (cachedUI) {
            console.log('✅ キャッシュされたUIを使用:', stage);
            
            // キャッシュからUIを復元
            setDataSchema(cachedUI.dataSchema);
            setUiSpec(cachedUI.uiSpec);
            setFormData(cachedUI.formData);
            
            setIsLoading(false);
            return; // UI生成をスキップ
          }
        }
        
        // キャッシュがない場合は通常のUI生成を実行
        console.log('🔄 新規UI生成:', stage);

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

        // Phase 2 Step 3.5: キャッシュに保存 ⭐️
        const concernInfoAfterGen = flowStateManager.getConcernInfo();
        if (concernInfoAfterGen) {
          uiCacheService.saveCache({
            cacheId: `cache_${Date.now()}`,
            stage,
            concernId: concernInfoAfterGen.concernId,
            uiSpec: data.uiSpec,
            dataSchema: data.dataSchema,
            generationId: data.generationId,
            generatedAt: new Date(),
            lastAccessedAt: new Date(),
            formData: initialData
          });
          
          console.log('💾 UIキャッシュを保存しました:', stage);
        }

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
   * Phase 2 Step 3.5: キャッシュ更新追加
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
      
      // Phase 2 Step 3.5: キャッシュを更新 ⭐️
      const concernInfo = flowStateManager.getConcernInfo();
      if (concernInfo && uiSpec && dataSchema) {
        const cachedUI = uiCacheService.loadCache(stage, concernInfo.concernId);
        if (cachedUI) {
          // formDataのみ更新
          cachedUI.formData = newData;
          uiCacheService.saveCache(cachedUI);
        }
      }
      
      return newData;
    });
  }, [stage, uiSpec, dataSchema]);

  /**
   * 戻るボタンハンドラー
   * Phase 2 Step 3.5: キャッシュ保存してから前ステージへ戻る
   */
  const handleBack = () => {
    console.log('🔙 戻るボタンクリック:', stage);
    
    // Phase 2 Step 3.5: 現在のフォームデータをキャッシュに保存してから戻る
    const concernInfo = flowStateManager.getConcernInfo();
    if (concernInfo && uiSpec && dataSchema) {
      const cachedUI = uiCacheService.loadCache(stage, concernInfo.concernId);
      if (cachedUI) {
        cachedUI.formData = formData;
        uiCacheService.saveCache(cachedUI);
      }
    }
    
    // 前のステージへナビゲート
    if (stage === 'breakdown') {
      navigate('/concern/plan', { state });
    } else if (stage === 'plan') {
      navigate('/concern/capture', { state });
    } else if (stage === 'capture') {
      navigate('/concern/input', { state: { prefillConcern: concernText } });
    }
  };

  /**
   * 次へ進む
   * Phase 2 Step 3: ConcernFlowStateManagerと統合
   */
  const handleNext = async () => {
    console.log('🚀 フォームデータ送信:', formData);

    // セッションにデータを保存
    try {
      await apiService.sendEvent('thought_completion', {
        stage,
        formData
      }, sessionManager.getSessionId() || undefined);

      // Phase 2 Step 3: ConcernFlowStateManagerに各ステージの結果を保存
      if (stage === 'capture') {
        // Captureステージの結果を保存
        flowStateManager.updateCaptureResult({
          clarifiedConcern: formData.CONCERN?.clarifiedConcern || concernText,
          keyPoints: formData.CONCERN?.keyPoints || [],
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ Capture結果保存完了');
        
        // Planステージへ
        navigate('/concern/plan', { 
          state: { 
            ...state, 
            captureData: formData,
            concernText: formData.CONCERN?.clarifiedConcern || concernText
          } 
        });
        
      } else if (stage === 'plan') {
        // Planステージの結果を保存
        flowStateManager.updatePlanResult({
          approach: formData.PLAN?.approach || '',
          steps: formData.PLAN?.steps || [],
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ Plan結果保存完了');
        
        // Breakdownステージへ
        navigate('/concern/breakdown', { 
          state: { 
            ...state, 
            planData: formData 
          } 
        });
        
      } else if (stage === 'breakdown') {
        // Breakdownステージの結果を保存
        // actionStepsはCONCERN.actionSteps, BREAKDOWN.tasks, TASK.itemsのいずれかに入っている
        const tasks = formData.CONCERN?.actionSteps || formData.BREAKDOWN?.tasks || formData.TASK?.items || [];
        
        console.log('🔍 Breakdownで取得したタスク:', tasks);
        
        flowStateManager.updateBreakdownResult({
          tasks: tasks.map((task: any) => ({
            title: task.title || task.name || '',
            description: task.description || '',
            importance: task.importance || 3,
            urgency: task.urgency || 3,
            estimatedMinutes: task.estimatedMinutes || task.estimate || 30
          })),
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ Breakdown結果保存完了');
        
        // Phase 2 Step 3: タスク生成実行
        try {
          const generationResult = await taskGenerationService.generateTasksFromBreakdown();
          console.log('✅ タスク生成完了:', generationResult.tasks.length, '件');
          
          // Phase 2 Step 3.5: タスク生成完了後、キャッシュをクリア ⭐️
          const concernInfoForCleanup = flowStateManager.getConcernInfo();
          if (concernInfoForCleanup) {
            uiCacheService.clearCache(concernInfoForCleanup.concernId);
            console.log('🗑️ UIキャッシュをクリアしました');
          }
          
          // タスク推奨画面へ遷移
          navigate('/tasks/recommend', { 
            state: { 
              ...state, 
              breakdownData: formData,
              generatedTasks: generationResult.tasks,
              concernId: generationResult.concernId
            } 
          });
        } catch (error) {
          console.error('❌ タスク生成エラー:', error);
          
          // Phase 2 Step 3.5: エラー時もキャッシュをクリア
          const concernInfoForCleanup = flowStateManager.getConcernInfo();
          if (concernInfoForCleanup) {
            uiCacheService.clearCache(concernInfoForCleanup.concernId);
            console.log('🗑️ UIキャッシュをクリアしました（エラー時）');
          }
          
          // エラーが発生してもタスク推奨画面へ遷移（手動作成を促す）
          navigate('/tasks/recommend', { 
            state: { 
              ...state, 
              breakdownData: formData,
              taskGenerationError: String(error)
            } 
          });
        }
      } else {
        // 後方互換性のためfeedbackへ
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
            onClick={handleBack}
            className="text-gray-500 hover:text-gray-700 mb-4 flex items-center"
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

        {/* Phase 2 Step 3.5: キャッシュ情報表示（開発時のみ） */}
        {import.meta.env.DEV && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-4">
            <p className="text-xs font-mono font-semibold text-yellow-800 mb-2">
              🔧 デバッグ情報（キャッシュ）
            </p>
            <p className="text-xs font-mono text-yellow-700">
              Stage: {stage} | 
              キャッシュ: {(() => {
                const concernInfo = flowStateManager.getConcernInfo();
                if (concernInfo) {
                  return uiCacheService.loadCache(stage, concernInfo.concernId) ? '✅ あり' : '❌ なし';
                }
                return '⚠️ concernInfo未取得';
              })()}
            </p>
            <button
              onClick={() => {
                const concernInfo = flowStateManager.getConcernInfo();
                if (concernInfo) {
                  uiCacheService.clearCache(concernInfo.concernId);
                  window.location.reload();
                }
              }}
              className="text-xs text-yellow-700 hover:text-yellow-900 mt-2 underline"
            >
              キャッシュをクリアして再読み込み
            </button>
          </div>
        )}

        {/* デバッグ情報（開発時のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <details>
              <summary className="cursor-pointer font-semibold text-gray-700">
                🔍 デバッグ情報（詳細）
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

