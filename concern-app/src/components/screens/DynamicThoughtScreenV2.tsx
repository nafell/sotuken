/**
 * DynamicThoughtScreenV2 - UISpec v2.0対応の動的思考整理画面
 *
 * Phase 3実装
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/api/ApiService';
import { ContextService } from '../../services/context/ContextService';
import { sessionManager } from '../../services/session/SessionManager';
import { flowStateManager } from '../../services/ConcernFlowStateManager';
import { UIRendererV2 } from '../../services/ui-generation/UIRendererV2';
import { FallbackUI } from './FallbackUI';
import type { UISpecV2, UIStage, FormData } from '../../../../server/src/types/UISpecV2';

interface LocationState {
  concernText: string;
  stage?: UIStage;
  [key: string]: any;
}

interface DynamicThoughtScreenV2Props {
  stage: UIStage;
}

export const DynamicThoughtScreenV2: React.FC<DynamicThoughtScreenV2Props> = ({ stage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<'analyzing' | 'generating' | 'rendering'>('analyzing');
  const [error, setError] = useState<string | null>(null);
  const [uiSpec, setUiSpec] = useState<UISpecV2 | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [showFallback, setShowFallback] = useState(false);

  // ConcernFlowStateManagerから関心事情報を取得
  const flowState = flowStateManager.loadState();
  const concernText = state?.concernText || flowState?.concernText || '';

  /**
   * UI生成
   */
  useEffect(() => {
    const generateUI = async () => {
      setIsLoading(true);
      setLoadingStage('analyzing');
      setError(null);

      try {
        // イベント記録
        await apiService.sendEvent('dynamic_ui_v2_generation_start', {
          stage,
          concernText: concernText.slice(0, 100)
        }, sessionManager.getSessionId() || undefined);

        // factors収集
        setLoadingStage('generating');
        const contextService = new ContextService();
        const factors = await contextService.collectCurrentFactors();

        console.log(`🔄 [v2] 動的UI生成開始 [${stage}]:`, Object.keys(factors));

        // v2 API呼び出し
        const response = await fetch('http://localhost:3000/v2/thought/generate', {
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
        console.log('✅ [v2] UI生成完了:', data);

        setLoadingStage('rendering');
        setUiSpec(data.uiSpec);

        // 初期フォームデータを設定
        const initialData = initializeFormData(data.uiSpec);
        setFormData(initialData);

        // イベント記録
        await apiService.sendEvent('dynamic_ui_v2_generation_complete', {
          generationId: data.generationId,
          stage
        }, sessionManager.getSessionId() || undefined);

      } catch (err) {
        console.error('❌ [v2] 動的UI生成エラー:', err);
        setError(err instanceof Error ? err.message : '不明なエラー');
        setShowFallback(true);

        // エラーイベント記録
        await apiService.sendEvent('dynamic_ui_v2_generation_error', {
          error: String(err),
          stage
        }, sessionManager.getSessionId() || undefined);
      } finally {
        setIsLoading(false);
      }
    };

    if (concernText) {
      generateUI();
    } else {
      setError('関心事が指定されていません');
      setIsLoading(false);
    }
  }, [concernText, stage]);

  /**
   * UISpecから初期フォームデータを生成
   */
  const initializeFormData = (spec: UISpecV2): FormData => {
    const data: FormData = {};

    spec.sections.forEach(section => {
      section.fields.forEach(field => {
        // 初期値を設定
        if (field.value !== undefined) {
          data[field.id] = field.value;
        } else {
          // デフォルト値
          switch (field.type) {
            case 'text':
              data[field.id] = '';
              break;
            case 'number':
              data[field.id] = 0;
              break;
            case 'toggle':
              data[field.id] = false;
              break;
            case 'list':
              data[field.id] = [];
              break;
            case 'select':
              data[field.id] = field.options?.multiple ? [] : '';
              break;
            case 'slider':
              data[field.id] = field.options?.min ?? 0;
              break;
            case 'cards':
              data[field.id] = field.options?.allowMultiple ? [] : '';
              break;
          }
        }
      });
    });

    // CONCERN.concernTextには関心事を設定
    if (concernText) {
      data['concern_text'] = concernText;
    }

    return data;
  };

  /**
   * データ変更ハンドラー
   */
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  /**
   * アクションハンドラー
   */
  const handleAction = useCallback(async (actionId: string) => {
    if (!uiSpec) return;

    const action = uiSpec.actions.find(a => a.id === actionId);
    if (!action) {
      console.warn(`Action not found: ${actionId}`);
      return;
    }

    // 確認メッセージ
    if (action.confirmation && !window.confirm(action.confirmation)) {
      return;
    }

    console.log(`🎬 Action executed: ${actionId} (${action.type})`);

    // アクションタイプに応じた処理
    switch (action.type) {
      case 'submit':
        // 次の画面へ遷移
        if (action.target === 'plan') {
          navigate('/plan', { state: { ...formData, concernText } });
        } else if (action.target === 'breakdown') {
          navigate('/breakdown', { state: { ...formData, concernText } });
        } else if (action.target === 'execution') {
          navigate('/execution', { state: { ...formData, concernText } });
        }
        break;

      case 'save':
        // 保存処理
        console.log('💾 Saving data:', formData);
        // TODO: 実際の保存処理
        break;

      case 'navigate':
        // 画面遷移
        if (action.target === 'capture') {
          navigate('/capture');
        } else if (action.target) {
          navigate(action.target);
        }
        break;

      case 'compute':
        // 再計算/再生成
        console.log('🔄 Recomputing...');
        // TODO: 再生成処理
        break;

      case 'validate':
        // バリデーション実行
        console.log('✅ Validating...');
        // TODO: バリデーション処理
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }, [uiSpec, formData, concernText, navigate]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {loadingStage === 'analyzing' && '関心事を分析中...'}
            {loadingStage === 'generating' && 'UIを生成中...'}
            {loadingStage === 'rendering' && '画面を準備中...'}
          </h2>
          <p className="text-sm text-gray-600">
            しばらくお待ちください
          </p>
        </div>
      </div>
    );
  }

  // エラーまたはフォールバック
  if (error || showFallback) {
    return (
      <FallbackUI
        concernText={concernText}
        stage={stage}
        error={error || undefined}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // UIレンダリング
  if (!uiSpec) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-yellow-50 border border-yellow-400 rounded-lg p-6">
          <p className="text-yellow-800 font-semibold">
            ⚠️ UIが生成されませんでした
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <UIRendererV2
          uiSpec={uiSpec}
          data={formData}
          onChange={handleFieldChange}
          onAction={handleAction}
        />
      </div>
    </div>
  );
};
