import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LocationState {
  concernText: string;
  concernLevel: 'low' | 'medium' | 'high';
  urgency: string;
  mentalLoad: number;
  category: string;
  categoryLabel: string;
  suggestedApproaches: string[];
}

type Approach = 'information_gathering' | 'concrete_action' | 'strategic_planning';

export const ApproachScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [selectedApproach, setSelectedApproach] = useState<Approach | null>(null);

  const concernText = state?.concernText || '';
  const categoryLabel = state?.categoryLabel || '';

  const approaches = [
    {
      value: 'information_gathering' as Approach,
      emoji: '🎯',
      label: '情報整理から始める',
      points: [
        '必要な情報をリストアップ',
        '調べる・相談する・学ぶ'
      ],
      recommendation: '研究系にはこれが一番効果的！',
      suitable: ['learning_research', 'other']
    },
    {
      value: 'concrete_action' as Approach,
      emoji: '🚀',
      label: '具体的行動から始める',
      points: [
        '準備・連絡・手続きを進める',
        '小さな一歩から実行'
      ],
      recommendation: '習慣系・実行系にピッタリ！',
      suitable: ['lifestyle_habits', 'work_project']
    },
    {
      value: 'strategic_planning' as Approach,
      emoji: '💭',
      label: '計画・戦略から始める',
      points: [
        'スケジュール・手順を考える',
        '目標設定・優先順位を決める'
      ],
      recommendation: 'イベント系・プロジェクト系に最適！',
      suitable: ['event_planning', 'work_project']
    }
  ];

  const getRecommendedApproach = () => {
    const category = state?.category;
    if (!category) return null;
    
    const recommendations = {
      'learning_research': 'information_gathering',
      'event_planning': 'strategic_planning',
      'lifestyle_habits': 'concrete_action',
      'work_project': 'strategic_planning',
      'other': 'information_gathering'
    };
    
    return recommendations[category as keyof typeof recommendations];
  };

  const handleNext = () => {
    if (selectedApproach) {
      const approach = approaches.find(app => app.value === selectedApproach);
      navigate('/breakdown', {
        state: {
          ...state,
          approach: approach?.label
        }
      });
    }
  };

  const recommendedApproach = getRecommendedApproach();

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
            ⚡ おすすめのアプローチ
          </h1>
        </div>

        {/* 関心事・カテゴリの表示 */}
        <div className="bg-white p-4 rounded-lg border mb-6">
          <p className="text-gray-800 mb-2">📝「{concernText}」</p>
          <p className="text-sm text-blue-600">📚「{categoryLabel}」</p>
        </div>

        {/* 説明 */}
        <div className="mb-6">
          <p className="text-gray-600">
            このタイプには、こんな進め方が効果的です：
          </p>
        </div>

        {/* アプローチ選択 */}
        <div className="space-y-4 mb-8">
          {approaches.map(approach => {
            const isRecommended = approach.value === recommendedApproach;
            
            return (
              <label
                key={approach.value}
                className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedApproach === approach.value
                    ? 'border-blue-500 bg-blue-50'
                    : isRecommended
                    ? 'border-green-400 bg-green-50 hover:border-green-500'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="approach"
                  value={approach.value}
                  checked={selectedApproach === approach.value}
                  onChange={(e) => setSelectedApproach(e.target.value as Approach)}
                  className="sr-only"
                />
                <div className="flex items-start">
                  <span className="text-xl mr-3">{approach.emoji}</span>
                  <div className="flex-1">
                    <div className={`font-medium mb-2 ${
                      selectedApproach === approach.value ? 'text-blue-800' :
                      isRecommended ? 'text-green-800' : 'text-gray-800'
                    }`}>
                      【{approach.label}】
                      {isRecommended && (
                        <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                          おすすめ
                        </span>
                      )}
                    </div>
                    <div className={`text-sm mb-2 space-y-1 ${
                      selectedApproach === approach.value ? 'text-blue-700' :
                      isRecommended ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      {approach.points.map((point, index) => (
                        <div key={index}>✓ {point}</div>
                      ))}
                    </div>
                    {isRecommended && (
                      <div className="text-sm text-green-600 font-medium">
                        👍 {approach.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* ヒント */}
        <div className="bg-blue-50 p-3 rounded-lg mb-8">
          <p className="text-sm text-blue-700">
            💡 あなたの状況で最も始めやすいものを選んでください
          </p>
        </div>

        {/* ボタンエリア */}
        <button
          onClick={handleNext}
          disabled={!selectedApproach}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            selectedApproach
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
