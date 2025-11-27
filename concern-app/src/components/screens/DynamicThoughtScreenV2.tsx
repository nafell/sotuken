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
// Phase 4: Diagnostic imports
import { ConcernAnalyzer } from '../../services/ConcernAnalyzer';
import { DiagnosticQuestionService } from '../../services/DiagnosticQuestionService';
import type { DiagnosticQuestion } from '../../types/BottleneckTypes'; // BottleneckAnalysis used in handleNext

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

  // Phase 4: Diagnostic Stage State
  const [isStage2Active, setIsStage2Active] = useState(false);
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<DiagnosticQuestion[]>([]);
  const [diagnosticResponses, setDiagnosticResponses] = useState<Record<string, any>>({});
  const [showDiagnosticUI, setShowDiagnosticUI] = useState(false);
  const [skipDiagnostic, setSkipDiagnostic] = useState(false);

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
   * Phase 4: Stage 1完了時の処理
   * Captureステージのみ、診断質問への遷移を判定
   */
  const handleStage1Complete = useCallback(async () => {
    console.log('=== DEBUG: handleStage1Complete called ===');
    console.log('Current stage:', stage);

    // Capture以外は既存フロー
    if (stage !== 'capture') {
      console.log('Not capture stage, skipping diagnostic');
      return false; // 診断不要
    }

    // concernTextを取得
    const concernInput = (formData['concern_text'] as string) || concernText;
    console.log('Concern input:', concernInput);
    console.log('Input length:', concernInput?.length);

    if (!concernInput || concernInput.length < 10) {
      console.log('⚠️ Concern text too short, skipping diagnostic');
      return false;
    }

    // ConcernAnalyzerで分析
    const analysis = ConcernAnalyzer.analyzeConcernDepth(concernInput);
    const inferredType = ConcernAnalyzer.inferBottleneckType(concernInput);

    console.log('📊 Concern Analysis:', analysis);
    console.log('🔍 Inferred Bottleneck:', inferredType);
    console.log('suggestedLevel:', analysis.suggestedLevel);
    console.log('skipDiagnostic:', skipDiagnostic);

    // TODO: 研究用に一時的にauto-skipを無効化（常に診断を表示）
    // 本来のロジック: analysis.suggestedLevel === 'minimal' でスキップ
    // ユーザーによる手動スキップは引き続き有効
    if (skipDiagnostic) {
      console.log('⏭️ User manually skipped diagnostic');
      return false;
    }

    // 研究用: minimalレベルでも診断を表示（詳細なデータ収集のため）
    console.log('🔬 Research mode: Showing diagnostic regardless of level');

    // 診断質問を選択
    const questions = DiagnosticQuestionService.selectQuestions(
      analysis.suggestedLevel,
      inferredType
    );

    if (questions.length === 0) {
      console.log('⚠️ No diagnostic questions available');
      return false;
    }

    setDiagnosticQuestions(questions);
    setDiagnosticResponses({});
    setIsStage2Active(true);
    setShowDiagnosticUI(true);

    // イベント記録
    await apiService.sendEvent('diagnostic_stage2_start', {
      suggestedLevel: analysis.suggestedLevel,
      inferredType,
      questionCount: questions.length
    }, sessionManager.getSessionId() || undefined);

    return true; // 診断実行
  }, [stage, formData, concernText, skipDiagnostic]);

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
   * 次へボタン（Phase 4: 2段階対応）
   */
  const handleNext = useCallback(async () => {
    // --- Step 1: バリデーション ---
    if (!isFormValid) {
      alert('⚠️ 必須項目を入力してください');
      return;
    }

    // --- Step 2: Stage 2診断UI中の場合 ---
    if (isStage2Active && showDiagnosticUI) {
      // 診断回答の完了チェック
      const allAnswered = diagnosticQuestions.every(q =>
        diagnosticResponses[q.id] !== undefined &&
        diagnosticResponses[q.id] !== ''
      );

      if (!allAnswered) {
        alert('⚠️ すべての診断質問にお答えください');
        return;
      }

      // 診断結果を分析
      const bottleneckAnalysis = DiagnosticQuestionService.analyzeResponses(
        diagnosticQuestions,
        diagnosticResponses
      );

      console.log('📊 Bottleneck Analysis Result:', bottleneckAnalysis);

      // flowStateManagerに保存
      flowStateManager.saveBottleneckAnalysis(bottleneckAnalysis);

      // イベント記録
      await apiService.sendEvent('diagnostic_stage2_complete', {
        primaryType: bottleneckAnalysis.primaryType,
        confidence: bottleneckAnalysis.confidence,
        questionCount: diagnosticQuestions.length
      }, sessionManager.getSessionId() || undefined);

      // Stage 2完了、診断UIを隠す
      setShowDiagnosticUI(false);
      setIsStage2Active(false);

      // ここで次のステージへ遷移（既存フローと同じ）
      flowStateManager.saveStageFormData(stage, formData);

      const nextPath = STAGE_NAVIGATION[stage].next;
      navigate(nextPath, { state: { concernText, ...formData } });

      return;
    }

    // --- Step 3: Stage 1完了時（Captureステージのみ）---
    if (stage === 'capture' && !isStage2Active) {
      const shouldShowDiagnostic = await handleStage1Complete();

      if (shouldShowDiagnostic) {
        // Stage 2へ遷移（画面内で診断UI表示）
        console.log('🔄 Transitioning to Stage 2 (Diagnostic)');
        // formDataは保存するが、まだ次の画面へは進まない
        flowStateManager.saveStageFormData(stage, formData);
        return; // ここで止まる
      }

      // 診断不要の場合は既存フローへ
      console.log('⏭️ Skipping diagnostic, proceeding to Plan');
    }

    // --- Step 4: 既存の次へ処理（Plan/Breakdownステージ or 診断スキップ時）---
    flowStateManager.saveStageFormData(stage, formData);

    await apiService.sendEvent('stage_completed', {
      stage,
      formData
    }, sessionManager.getSessionId() || undefined);

    const nextPath = STAGE_NAVIGATION[stage].next;
    navigate(nextPath, { state: { concernText, ...formData } });

  }, [
    stage,
    formData,
    concernText,
    navigate,
    isFormValid,
    isStage2Active,
    showDiagnosticUI,
    diagnosticQuestions,
    diagnosticResponses,
    handleStage1Complete
  ]);

  /**
   * Phase 4: 診断質問への回答を保存
   */
  const handleDiagnosticResponse = useCallback((questionId: string, value: any) => {
    setDiagnosticResponses(prev => ({
      ...prev,
      [questionId]: value
    }));

    console.log(`📝 Diagnostic response: ${questionId} = ${value}`);
  }, []);

  /**
   * Phase 4: 診断をスキップ
   */
  const handleSkipDiagnostic = useCallback(() => {
    setSkipDiagnostic(true);
    setShowDiagnosticUI(false);
    setIsStage2Active(false);

    console.log('⏭️ User skipped diagnostic');

    // スキップイベント記録
    apiService.sendEvent('diagnostic_stage2_skipped', {
      stage
    }, sessionManager.getSessionId() || undefined);
  }, [stage]);

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

  /**
   * Phase 4: Stage 2診断UIコンポーネント
   */
  const renderDiagnosticUI = () => {
    if (!showDiagnosticUI || diagnosticQuestions.length === 0) {
      return null;
    }

    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-blue-900 mb-2">
            📋 詳しくお聞きします
          </h3>
          <p className="text-sm text-blue-700">
            より良い解決策を提案するため、いくつか質問にお答えください。
            （{diagnosticQuestions.length}問）
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {diagnosticQuestions.map((question, index) => (
            <div key={question.id} className="bg-white p-4 rounded-lg shadow-sm">
              <label className="block mb-3">
                <span className="font-semibold text-gray-900">
                  {index + 1}. {question.question}
                </span>
              </label>

              {/* Radio buttons */}
              {question.type === 'radio' && question.options && (
                <div className="space-y-2">
                  {question.options.map(option => (
                    <label key={option} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={diagnosticResponses[question.id] === option}
                        onChange={(e) => handleDiagnosticResponse(question.id, e.target.value)}
                        className="mr-3 w-4 h-4"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Select dropdown */}
              {question.type === 'select' && question.options && (
                <select
                  value={diagnosticResponses[question.id] || ''}
                  onChange={(e) => handleDiagnosticResponse(question.id, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {question.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}

              {/* Scale */}
              {question.type === 'scale' && question.options && (
                <div className="flex items-center space-x-4">
                  {question.options.map(option => (
                    <label key={option} className="flex flex-col items-center cursor-pointer">
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={diagnosticResponses[question.id] === option}
                        onChange={(e) => handleDiagnosticResponse(question.id, e.target.value)}
                        className="mb-1"
                      />
                      <span className="text-sm text-gray-600">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Text input */}
              {question.type === 'text' && (
                <input
                  type="text"
                  value={diagnosticResponses[question.id] || ''}
                  onChange={(e) => handleDiagnosticResponse(question.id, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="回答を入力してください"
                />
              )}
            </div>
          ))}
        </div>

        {/* Skip button */}
        <div className="mt-6 text-center">
          <button
            onClick={handleSkipDiagnostic}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            スキップする
          </button>
        </div>
      </div>
    );
  };

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
          {/* Stage 1: 通常のUISpec */}
          {!showDiagnosticUI && (
            <UIRendererV2
              uiSpec={uiSpec}
              data={formData}
              onChange={handleFieldChange}
              onAction={handleAction}
            />
          )}

          {/* Stage 2: 診断UI（Captureステージのみ） */}
          {stage === 'capture' && renderDiagnosticUI()}
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
