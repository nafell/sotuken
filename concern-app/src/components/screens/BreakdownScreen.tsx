import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/api/ApiService';
import { ContextService } from '../../services/context/ContextService';
import { sessionManager } from '../../services/session/SessionManager';

interface LocationState {
  concernText: string;
  concernLevel: 'low' | 'medium' | 'high';
  urgency: string;
  mentalLoad: number;
  category: string;
  categoryLabel: string;
  approach: string;
}

export const BreakdownScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [customAction, setCustomAction] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [isLoadingUI, setIsLoadingUI] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const concernText = state?.concernText || '';
  const approach = state?.approach || '';

  // フォールバック用の固定アクション
  const fallbackActions = [
    `${concernText.includes('研究') ? '研究分野をGoogleで3つ検索' : 
      concernText.includes('旅行') ? '行きたい場所を3つリストアップ' : 
      concernText.includes('ジム') ? '近くのジムの営業時間をチェック' : 
      '関連する情報をGoogle検索'}`,
    `${concernText.includes('研究') ? '興味のあるキーワードをメモ' : 
      concernText.includes('旅行') ? '予算の大まかな目安を考える' : 
      concernText.includes('ジム') ? '運動着が揃っているか確認' : 
      'やることリストを3つ書き出す'}`,
    `${concernText.includes('研究') ? '指導教員のメールアドレス確認' : 
      concernText.includes('旅行') ? '一緒に行く人に希望を聞く' : 
      concernText.includes('ジム') ? '体験レッスンの予約を検索' : 
      '詳しい人に相談のメッセージを送る'}`,
    `${concernText.includes('研究') ? '先輩に「研究について相談したい」とLINEを送る' : 
      concernText.includes('旅行') ? '旅行サイトで相場をサッと調べる' : 
      concernText.includes('ジム') ? '運動用のプレイリストを作る' : 
      '小さな第一歩をひとつ実行'}`
  ];

  // UI生成API統合
  useEffect(() => {
    const generateDynamicUI = async () => {
      setIsLoadingUI(true);
      setApiError(null);

      try {
        // イベント記録: UI生成開始
        await apiService.sendEvent('ui_generation_start', {
          screen: 'breakdown',
          concernText: concernText.slice(0, 100),
          approach
        }, sessionManager.getSessionId());

        // factors辞書収集
        const contextService = new ContextService();
        const factors = await contextService.collectCurrentFactors();
        
        console.log('🔄 動的UI生成開始 - factors収集完了:', Object.keys(factors));

        // UI生成API呼び出し
        const uiResponse = await apiService.generateUI(
          concernText, 
          factors, 
          sessionManager.getSessionId()
        );

        console.log('✅ UI生成完了:', uiResponse);
        setGenerationId(uiResponse.generationId);

        // UI DSLからアクション提案を抽出
        const actions = extractActionsFromDSL(uiResponse.uiDsl) || fallbackActions;
        setSuggestedActions(actions);

        // イベント記録: UI生成完了
        await apiService.sendEvent('ui_generation_complete', {
          generationId: uiResponse.generationId,
          actionsCount: actions.length,
          fallbackUsed: uiResponse.generation?.fallbackUsed || false
        }, sessionManager.getSessionId());

      } catch (error) {
        console.error('❌ 動的UI生成エラー:', error);
        setApiError(error instanceof Error ? error.message : '不明なエラー');
        
        // フォールバックを使用
        setSuggestedActions(fallbackActions);
        
        // エラーイベント記録
        await apiService.sendEvent('ui_generation_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fallbackUsed: true
        }, sessionManager.getSessionId()).catch(console.error);
        
      } finally {
        setIsLoadingUI(false);
      }
    };

    if (concernText) {
      generateDynamicUI();
    }
  }, [concernText, approach]);

  // UI DSLからアクション提案を抽出する関数
  const extractActionsFromDSL = (uiDsl: any): string[] | null => {
    try {
      const sections = uiDsl?.layout?.sections || [];
      const cardSection = sections.find((section: any) => section.type === 'cards');
      const cardItems = cardSection?.items || [];
      
      // 簡単な例：カードのタイトルをアクションとして使用
      const actions = cardItems
        .map((item: any) => item.title || item.subtitle)
        .filter(Boolean);
        
      return actions.length > 0 ? actions : null;
    } catch (error) {
      console.warn('⚠️ UI DSL解析エラー:', error);
      return null;
    }
  };

  const handleStart = async () => {
    const actionText = selectedAction === 'custom' ? customAction : selectedAction;
    if (actionText) {
      try {
        // セッション更新: アクション開始
        await sessionManager.updateSession({
          selectedAction: actionText,
          currentScreen: 'breakdown'
        });

        // イベント記録: アクション開始
        await apiService.sendEvent('action_start', {
          selectedAction: actionText,
          generationId: generationId,
          isCustomAction: selectedAction === 'custom'
        }, sessionManager.getSessionId());

        console.log('🚀 アクション開始:', actionText);
        
      } catch (error) {
        console.error('❌ アクション開始記録エラー:', error);
      }

      navigate('/feedback', {
        state: {
          ...state,
          selectedAction: actionText,
          startTime: new Date().toISOString(),
          generationId
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 mb-4"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            🔥 最初の2分でできることは？
          </h1>
        </div>

        {/* 関心事・アプローチの表示 */}
        <div className="bg-white p-4 rounded-lg border mb-6">
          <p className="text-gray-800 mb-2">📝「{concernText}」</p>
          <p className="text-sm text-blue-600">🎯「{approach}」</p>
        </div>

        {/* AI提案 */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">
            今すぐ2分でできそうなことは：
          </h2>
          
          {isLoadingUI ? (
            /* ローディング表示 */
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm font-medium text-blue-700">🤖 あなたに最適なアクションを生成中...</p>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-blue-100 h-10 rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : (
            /* AI提案表示 */
            <div className="bg-purple-50 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-purple-700">
                  {apiError ? '🔄 フォールバック提案:' : '🤖 動的AI提案:'}
                </p>
                {generationId && (
                  <span className="text-xs text-purple-500">ID: {generationId.slice(0, 8)}</span>
                )}
              </div>
              
              {apiError && (
                <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-700">
                  ⚠️ API接続エラー: {apiError}
                </div>
              )}
              
              <div className="space-y-3">
                {suggestedActions.map((action, index) => (
                  <label
                    key={index}
                    className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAction === action
                        ? 'border-purple-500 bg-purple-100'
                        : 'border-purple-200 hover:border-purple-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="action"
                      value={action}
                      checked={selectedAction === action}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <span className="text-sm text-purple-800">• {action}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* カスタム入力 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            ✏️ または、自分で思いつくもの：
          </h3>
          <div className="space-y-3">
            <textarea
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value)}
              placeholder="他に思いついたアクションがあれば..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            {customAction.trim() && (
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="custom"
                  checked={selectedAction === 'custom'}
                  onChange={() => setSelectedAction('custom')}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700">カスタムアクションを使用</span>
              </label>
            )}
          </div>
        </div>

        {/* 質問 */}
        <div className="mb-6">
          <p className="text-lg font-medium text-gray-800 mb-4">
            どれから始めてみますか？
          </p>
        </div>

        {/* ボタンエリア */}
        <div className="flex space-x-3 mb-4">
          <button
            onClick={handleStart}
            disabled={isLoadingUI || (!selectedAction && !customAction.trim())}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoadingUI 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : (selectedAction || customAction.trim())
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoadingUI ? '⏳ 生成中...' : '✨ 今すぐやってみる'}
          </button>
          <button
            onClick={() => navigate('/feedback', {
              state: {
                ...state,
                selectedAction: selectedAction === 'custom' ? customAction : selectedAction,
                skipped: true
              }
            })}
            disabled={isLoadingUI}
            className={`px-4 py-3 transition-colors border border-gray-300 rounded-lg ${
              isLoadingUI
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 後でやる
          </button>
        </div>

        {/* タイマー案内 */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-700">
            ⏰ 2分タイマーも使えます（次の画面で設定可能）
          </p>
        </div>
      </div>
    </div>
  );
};
