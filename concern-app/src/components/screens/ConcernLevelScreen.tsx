import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sessionManager } from '../../services/session/SessionManager';

interface LocationState {
  concernText: string;
}

type ConcernLevel = 'low' | 'medium' | 'high';
type Urgency = 'now' | 'this_week' | 'this_month' | 'someday' | 'unknown';

export const ConcernLevelScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [concernLevel, setConcernLevel] = useState<ConcernLevel | null>(null);
  const [urgency, setUrgency] = useState<Urgency | null>(null);

  const concernText = state?.concernText || '関心事が見つかりませんでした';

  const calculateMentalLoad = () => {
    if (!concernLevel) return 0;
    const baseLoad = {
      low: 30,
      medium: 60,
      high: 85
    };
    return baseLoad[concernLevel];
  };

  const handleNext = async () => {
    if (concernLevel && urgency) {
      try {
        // セッション更新
        await sessionManager.updateSession({
          concernLevel,
          urgency,
          mentalLoad: calculateMentalLoad(),
          currentScreen: 'concern_level'
        });
        console.log('💾 関心度・切迫度を記録');
      } catch (error) {
        console.error('❌ セッション更新エラー:', error);
      }

      navigate('/category', {
        state: {
          concernText,
          concernLevel,
          urgency,
          mentalLoad: calculateMentalLoad()
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
            🔍 この件について教えてください
          </h1>
        </div>

        {/* 関心事の表示 */}
        <div className="bg-white p-4 rounded-lg border mb-6">
          <p className="text-gray-800">📝「{concernText}」</p>
        </div>

        {/* 関心度選択 */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-800 mb-4">
            どれくらい気になっていますか？
          </h2>
          <div className="space-y-3">
            {[
              { value: 'low' as ConcernLevel, emoji: '🟢', label: 'ちょっと気になる程度', desc: 'たまに思い出す' },
              { value: 'medium' as ConcernLevel, emoji: '🟡', label: 'けっこう気になる', desc: 'よく頭に浮かぶ' },
              { value: 'high' as ConcernLevel, emoji: '🔴', label: 'かなり気になる', desc: 'いつも考えてしまう' }
            ].map(option => (
              <label
                key={option.value}
                className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                  concernLevel === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="concernLevel"
                  value={option.value}
                  checked={concernLevel === option.value}
                  onChange={(e) => setConcernLevel(e.target.value as ConcernLevel)}
                  className="sr-only"
                />
                <div className="flex items-start">
                  <span className="text-xl mr-3">{option.emoji}</span>
                  <div>
                    <div className="font-medium text-gray-800">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 時期選択 */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-800 mb-4">
            いつ頃に動き始めたいですか？
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'now' as Urgency, label: '今すぐ' },
              { value: 'this_week' as Urgency, label: '今週中' },
              { value: 'this_month' as Urgency, label: '今月中' },
              { value: 'someday' as Urgency, label: 'いずれ' },
              { value: 'unknown' as Urgency, label: 'まだ分からない' }
            ].slice(0, 4).map(option => (
              <label
                key={option.value}
                className={`block p-3 border rounded-lg cursor-pointer text-center transition-colors ${
                  urgency === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="urgency"
                  value={option.value}
                  checked={urgency === option.value}
                  onChange={(e) => setUrgency(e.target.value as Urgency)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
          {/* 残りの選択肢 */}
          <label
            className={`block p-3 border rounded-lg cursor-pointer text-center mt-3 transition-colors ${
              urgency === 'unknown'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="urgency"
              value="unknown"
              checked={urgency === 'unknown'}
              onChange={(e) => setUrgency(e.target.value as Urgency)}
              className="sr-only"
            />
            <span className="text-sm font-medium">まだ分からない</span>
          </label>
        </div>

        {/* 頭の使用率表示 */}
        {concernLevel && (
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <div className="mb-2">
              <span className="text-sm font-medium text-blue-800">
                📊 推定：頭の使用率 約{calculateMentalLoad()}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${calculateMentalLoad()}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              この件でかなり思考を使ってますね！
            </p>
          </div>
        )}

        {/* ボタンエリア */}
        <button
          onClick={handleNext}
          disabled={!concernLevel || !urgency}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            concernLevel && urgency
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          次へ進む
        </button>
      </div>
    </div>
  );
};
