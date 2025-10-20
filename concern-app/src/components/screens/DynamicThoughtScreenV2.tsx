/**
 * DynamicThoughtScreenV2 - UISpec v2.1対応の動的思考整理画面
 *
 * Phase 3 v2.1: メタUI層統合版
 *
 * 主な変更:
 * - ProgressHeader / NavigationFooter の統合
 * - フローステート管理の強化
 * - バリデーション機能
 * - 自動保存（debounce）
 * - actionsはステージ内補助機能のみ
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/api/ApiService';
import { ContextService } from '../../services/context/ContextService';
import { sessionManager } from '../../services/session/SessionManager';
import { flowStateManager } from '../../services/ConcernFlowStateManager';
import { UIRendererV2 } from '../../services/ui-generation/UIRendererV2';
import { FallbackUI } from './FallbackUI';
import { ProgressHeader } from '../meta/ProgressHeader';
import { NavigationFooter } from '../meta/NavigationFooter';
import type { UISpecV2, UIStage, FormData } from '../../../../server/src/types/UISpecV2';

interface LocationState {
  concernText: string;
  stage?: UIStage;
  [key: string]: any;
}

interface DynamicThoughtScreenV2Props {
  stage: UIStage;
}

// ステージ遷移マップ
const STAGE_NAVIGATION: Record<UIStage, { next: string; prev?: string }> = {
  capture: { next: '/concern/plan' },
  plan: { next: '/concern/breakdown', prev: '/concern/capture' },
  breakdown: { next: '/tasks/recommend', prev: '/concern/plan' }
};

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
  const [isSaving, setIsSaving] = useState(false);

  // ConcernFlowStateManagerから関心事情報を取得
  const flowState = flowStateManager.loadState();
  const concernText = state?.concernText || flowState?.concernText || '';

  /**
   * フローの初期化
   */
  useEffect(() => {
    // フローステートがなければ初期化
    if (!flowState && concernText) {
      const userId = sessionManager.getSessionId() || 'anonymous';
      flowStateManager.startNewFlow(
        `concern_${Date.now()}`,
        concernText,
        userId,
        'dynamic_ui'
      );
    }

    // 現在のステージを更新
    if (flowState) {
      flowStateManager.updateCurrentStage(stage);
    }
  }, [stage, concernText, flowState]);

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

        console.log(`🔄 [v2.1] 動的UI生成開始 [${stage}]:`, Object.keys(factors));

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
        console.log('✅ [v2.1] UI生成完了:', data);

        setLoadingStage('rendering');
        setUiSpec(data.uiSpec);

        // 保存されたフォームデータを読み込み、なければ初期化
        const savedData = flowStateManager.loadStageFormData(stage);
        const initialData = savedData || initializeFormData(data.uiSpec);
        setFormData(initialData);

        // イベント記録
        await apiService.sendEvent('dynamic_ui_v2_generation_complete', {
          generationId: data.generationId,
          stage
        }, sessionManager.getSessionId() || undefined);

      } catch (err) {
        console.error('❌ [v2.1] 動的UI生成エラー:', err);
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

    // concernTextを必ず含める
    if (concernText) {
      data['concern_text'] = concernText;
    }

    return data;
  };

  /**
   * データ変更ハンドラー（debounced自動保存付き）
   */
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [fieldId]: value
      };

      // debounced自動保存（500ms）
      setTimeout(() => {
        flowStateManager.saveStageFormData(stage, newData);
      }, 500);

      return newData;
    });
  }, [stage]);

  /**
   * バリデーション
   */
  const isFormValid = useMemo(() => {
    if (!uiSpec) return false;

    // 必須フィールドのチェック
    for (const section of uiSpec.sections) {
      for (const field of section.fields) {
        if (field.options?.required) {
          const value = formData[field.id];

          // 空チェック
          if (value === undefined || value === null || value === '') {
            return false;
          }

          // 配列の場合
          if (Array.isArray(value) && value.length === 0) {
            return false;
          }

          // 文字列の最小長チェック
          if (field.type === 'text' && field.options?.minLength) {
            if (typeof value === 'string' && value.length < field.options.minLength) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }, [uiSpec, formData]);

  /**
   * 戻るボタン
   */
  const handleBack = useCallback(() => {
    const prevPath = STAGE_NAVIGATION[stage].prev;
    if (prevPath) {
      navigate(prevPath, { state: { concernText } });
    }
  }, [stage, navigate, concernText]);

  /**
   * 下書き保存ボタン
   */
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // フォームデータを保存
      flowStateManager.saveStageFormData(stage, formData);

      // LocalStorageに永続化
      flowStateManager.saveDraft();

      console.log('💾 下書き保存完了:', formData);

      // イベント記録
      await apiService.sendEvent('draft_saved', {
        stage,
        fieldCount: Object.keys(formData).length
      }, sessionManager.getSessionId() || undefined);

      // フィードバック表示（オプション）
      alert('💾 下書きを保存しました');
    } catch (error) {
      console.error('下書き保存エラー:', error);
      alert('⚠️ 保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [stage, formData]);

  /**
   * 次へボタン
   */
  const handleNext = useCallback(async () => {
    if (!isFormValid) {
      alert('⚠️ 必須項目を入力してください');
      return;
    }

    // フォームデータを保存
    flowStateManager.saveStageFormData(stage, formData);

    // イベント記録
    await apiService.sendEvent('stage_completed', {
      stage,
      formData
    }, sessionManager.getSessionId() || undefined);

    // 次の画面へ遷移
    const nextPath = STAGE_NAVIGATION[stage].next;
    navigate(nextPath, { state: { concernText, ...formData } });
  }, [stage, formData, concernText, navigate, isFormValid]);

  /**
   * 補助アクション（ステージ内機能）
   * v2.1: actionsはステージ内で完結する機能のみ
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

    console.log(`🎬 Auxiliary Action: ${actionId} (${action.type})`);

    // アクションタイプに応じた処理
    switch (action.type) {
      case 'compute':
        // 再計算・再生成
        console.log('🔄 Recomputing...');
        // TODO: 実際の再生成処理
        alert('🔄 この機能は実装中です');
        break;

      case 'validate':
        // バリデーション実行
        console.log('✅ Validating...');
        if (isFormValid) {
          alert('✅ 入力内容に問題ありません');
        } else {
          alert('⚠️ 必須項目を入力してください');
        }
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }, [uiSpec, isFormValid]);

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* メタUI層: ProgressHeader */}
      <ProgressHeader stage={stage} />

      {/* コンテンツ層: 動的UI */}
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <UIRendererV2
            uiSpec={uiSpec}
            data={formData}
            onChange={handleFieldChange}
            onAction={handleAction}
          />
        </div>
      </div>

      {/* メタUI層: NavigationFooter */}
      <NavigationFooter
        stage={stage}
        onBack={STAGE_NAVIGATION[stage].prev ? handleBack : undefined}
        onSave={handleSave}
        onNext={handleNext}
        isNextEnabled={isFormValid}
        isSaving={isSaving}
      />
    </div>
  );
};
