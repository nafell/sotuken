import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sessionManager } from '../../services/session/SessionManager';
import { flowStateManager } from '../../services/ConcernFlowStateManager';
import { uiCacheService } from '../../services/UIGenerationCacheService';
import { generateId } from '../../utils/uuid';

interface LocationState {
  prefillConcern?: string;
}

export const ConcernInputScreen: React.FC = () => {
  const location = useLocation();
  const state = location.state as LocationState;
  const [concernText, setConcernText] = useState(state?.prefillConcern || '');
  const navigate = useNavigate();

  const handleNext = async () => {
    if (concernText.trim().length >= 3) {
      try {
        // Phase 2 Step 3.5: 新しい関心事開始時に全キャッシュをクリア ⭐️
        uiCacheService.clearAllCaches();
        console.log('🗑️ 全UIキャッシュをクリアしました（新規関心事開始）');
        
        // セッション開始
        const sessionId = await sessionManager.startSession(concernText.trim());
        console.log('✅ セッション開始:', sessionId);
        
        // Phase 2 Step 3: ConcernFlowStateManager を使ってフロー開始
        const concernId = generateId('concern');
        const userId = localStorage.getItem('anonymousUserId') || generateId('user');
        
        // ユーザーIDを保存（初回のみ）
        if (!localStorage.getItem('anonymousUserId')) {
          localStorage.setItem('anonymousUserId', userId);
        }
        
        // 実験条件を取得（/v1/config から取得済みの場合）
        const uiCondition = localStorage.getItem('experimentCondition') as 'dynamic_ui' | 'static_ui' | null;
        
        // フロー状態を初期化
        flowStateManager.startNewFlow(
          concernId,
          concernText.trim(),
          userId,
          uiCondition || 'dynamic_ui'
        );
        
        console.log('✅ ConcernFlow開始:', { concernId, userId, uiCondition });
        
        // Phase 2 Step 3: captureステージへ遷移
        navigate('/concern/capture', { 
          state: { 
            concernText: concernText.trim(),
            concernId,
            userId
          }
        });
      } catch (error) {
        console.error('❌ セッション開始エラー:', error);
        // エラーが発生してもナビゲーションは続行（後方互換性のため/concern-levelへ）
        navigate('/concern-level', { 
          state: { concernText: concernText.trim() }
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            📝 関心事の書き出し
          </h1>
          <p className="text-gray-600">
            今、頭の中で気になっていることをそのまま書き出してみましょう
          </p>
        </div>

        {/* 例示セクション */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-sm font-medium text-blue-700 mb-2">💡 例：こんなことでもOK！</p>
          <ul className="text-sm text-blue-600 space-y-1">
            <li>• 卒業研究のテーマを決めたい</li>
            <li>• 来月の友達との旅行どうしよう</li>
            <li>• 部屋探しをそろそろ始めないと...</li>
            <li>• ジムに久しぶりに行きたいけど...</li>
            <li>• 英語の勉強を再開したい</li>
          </ul>
        </div>

        {/* 入力エリア */}
        <div className="space-y-4">
          <div>
            <textarea
              value={concernText}
              onChange={(e) => setConcernText(e.target.value)}
              placeholder="気になっていることを自由に..."
              className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              maxLength={200}
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {concernText.length}/200
            </div>
          </div>

          {/* 励ましメッセージ */}
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-700">
              💭 完璧に書く必要はありません！思いついたままでOKです
            </p>
          </div>

          {/* ボタンエリア */}
          <div className="flex space-x-3">
            <button
              onClick={handleNext}
              disabled={concernText.trim().length < 3}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                concernText.trim().length >= 3
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              次へ進む
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              スキップ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
