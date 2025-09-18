import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sessionManager } from '../../services/session/SessionManager';

interface LocationState {
  concernText: string;
  concernLevel: 'low' | 'medium' | 'high';
  urgency: string;
  mentalLoad: number;
  category: string;
  categoryLabel: string;
  approach: string;
  selectedAction: string;
  skipped?: boolean;
}

type SatisfactionLevel = 'very_clear' | 'somewhat_clear' | 'still_foggy';

export const FeedbackScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [satisfactionLevel, setSatisfactionLevel] = useState<SatisfactionLevel | null>(null);
  const [nextConcern, setNextConcern] = useState('');
  const [executionMemo, setExecutionMemo] = useState('');

  const selectedAction = state?.selectedAction || '';
  const initialMentalLoad = state?.mentalLoad || 70;
  const skipped = state?.skipped || false;

  const calculateNewMentalLoad = () => {
    if (skipped) return initialMentalLoad;
    if (!satisfactionLevel) return initialMentalLoad;
    
    const reduction = {
      very_clear: 30,
      somewhat_clear: 15,
      still_foggy: 5
    };
    
    return Math.max(10, initialMentalLoad - reduction[satisfactionLevel]);
  };

  const getMentalLoadChange = () => {
    return initialMentalLoad - calculateNewMentalLoad();
  };

  const handleComplete = async () => {
    try {
      // セッション完了を記録
      await sessionManager.completeSession({
        satisfactionLevel: satisfactionLevel || undefined,
        executionMemo,
        nextConcern,
        mentalLoadChange: getMentalLoadChange()
      });
      console.log('✅ セッション完了を記録');
    } catch (error) {
      console.error('❌ セッション完了エラー:', error);
    }
    
    navigate('/', {
      state: {
        sessionCompleted: true,
        mentalLoadImprovement: getMentalLoadChange()
      }
    });
  };

  const handleContinue = () => {
    // TODO: 次のセッションを開始
    navigate('/');
  };

  if (skipped) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              📋 後でやる設定完了
            </h1>
          </div>

          <div className="bg-white p-6 rounded-lg border mb-6">
            <div className="text-center">
              <div className="text-4xl mb-4">💤</div>
              <p className="text-lg text-gray-800 mb-2">
                「{selectedAction}」を後でやるリストに追加しました
              </p>
              <p className="text-gray-600">
                また気になった時にトライしてみてください
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              🎯 他の関心事も整理
            </button>
            <button
              onClick={handleComplete}
              className="w-full py-3 px-4 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              🏠 ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            ✨ お疲れさまでした！
          </h1>
        </div>

        {/* 完了したアクション */}
        <div className="bg-white p-6 rounded-lg border mb-6">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              アクション完了！
            </h2>
            <p className="text-gray-700">
              「{selectedAction}」
            </p>
          </div>

          {/* 実行メモ */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 実行メモ（任意）：
            </label>
            <textarea
              value={executionMemo}
              onChange={(e) => setExecutionMemo(e.target.value)}
              placeholder="何を見つけた？感想は？"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        </div>

        {/* スッキリ度評価 */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">
            🧠 頭のスッキリ度は？
          </h2>
          
          <div className="space-y-3">
            {[
              { value: 'very_clear' as SatisfactionLevel, emoji: '😊', label: 'だいぶスッキリした！' },
              { value: 'somewhat_clear' as SatisfactionLevel, emoji: '🙂', label: '少し整理できた' },
              { value: 'still_foggy' as SatisfactionLevel, emoji: '😐', label: 'まだちょっとモヤモヤ' }
            ].map(option => (
              <label
                key={option.value}
                className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                  satisfactionLevel === option.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="satisfaction"
                  value={option.value}
                  checked={satisfactionLevel === option.value}
                  onChange={(e) => setSatisfactionLevel(e.target.value as SatisfactionLevel)}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{option.emoji}</span>
                  <span className="font-medium text-gray-800">{option.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 次の関心事 */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800 mb-3">
            💭 次に気になることはありますか？
          </h2>
          <textarea
            value={nextConcern}
            onChange={(e) => setNextConcern(e.target.value)}
            placeholder="他に気になることがあれば..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* 頭の使用率変化表示 */}
        {satisfactionLevel && (
          <div className="mb-8 p-4 bg-green-50 rounded-lg">
            <div className="mb-2">
              <span className="text-sm font-medium text-green-800">
                📊 更新された頭の使用率：
              </span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-3 mb-2">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${calculateNewMentalLoad()}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-green-700">
              <span>{calculateNewMentalLoad()}%</span>
              <span className="font-medium">
                {getMentalLoadChange() > 0 ? '-' : ''}{getMentalLoadChange()}%
              </span>
            </div>
            {getMentalLoadChange() > 0 && (
              <p className="text-sm text-green-700 mt-2">
                ワーキングメモリに余裕ができました！
              </p>
            )}
          </div>
        )}

        {/* ボタンエリア */}
        <div className="space-y-3">
          {nextConcern.trim() && (
            <button
              onClick={() => navigate('/', { 
                state: { 
                  prefillConcern: nextConcern.trim(),
                  fromCompletion: true
                }
              })}
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              🎯 この関心事を整理する
            </button>
          )}
          <button
            onClick={handleContinue}
            className="w-full py-3 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            🎯 他の関心事も整理
          </button>
          <button
            onClick={handleComplete}
            className="w-full py-3 px-4 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            🏠 ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
};
