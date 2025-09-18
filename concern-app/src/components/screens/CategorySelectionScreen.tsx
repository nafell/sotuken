import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LocationState {
  concernText: string;
  concernLevel: 'low' | 'medium' | 'high';
  urgency: string;
  mentalLoad: number;
}

type Category = 'learning_research' | 'event_planning' | 'lifestyle_habits' | 'work_project' | 'other';

export const CategorySelectionScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const concernText = state?.concernText || '';
  const concernLevel = state?.concernLevel || 'medium';
  const urgency = state?.urgency || '';

  const categories = [
    {
      value: 'learning_research' as Category,
      emoji: '📚',
      label: '学習・研究・スキル系',
      desc: '卒業研究、資格勉強、新技術習得等',
      approaches: ['information_gathering', 'strategic_planning']
    },
    {
      value: 'event_planning' as Category,
      emoji: '🎪',
      label: 'イベント・計画系',
      desc: '旅行、引越し、就活、転職等',
      approaches: ['strategic_planning', 'concrete_action']
    },
    {
      value: 'lifestyle_habits' as Category,
      emoji: '🏃‍♂️',
      label: '習慣・ライフスタイル系',
      desc: '運動、睡眠、食事、掃除等',
      approaches: ['concrete_action', 'strategic_planning']
    },
    {
      value: 'work_project' as Category,
      emoji: '💼',
      label: '仕事・プロジェクト系',
      desc: '業務、会議準備、提出物等',
      approaches: ['strategic_planning', 'information_gathering']
    },
    {
      value: 'other' as Category,
      emoji: '🤔',
      label: 'その他・複合的なもの',
      desc: '上記に当てはまらないもの',
      approaches: ['information_gathering']
    }
  ];

  const handleNext = () => {
    if (selectedCategory) {
      const category = categories.find(cat => cat.value === selectedCategory);
      navigate('/approach', {
        state: {
          ...state,
          category: selectedCategory,
          categoryLabel: category?.label,
          suggestedApproaches: category?.approaches
        }
      });
    }
  };

  const getLevelColor = () => {
    switch (concernLevel) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getLevelEmoji = () => {
    switch (concernLevel) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
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
            🎯 どんな種類の関心事かな？
          </h1>
        </div>

        {/* 関心事の情報表示 */}
        <div className="bg-white p-4 rounded-lg border mb-6">
          <p className="text-gray-800 mb-2">📝「{concernText}」</p>
          <p className={`text-sm ${getLevelColor()}`}>
            {getLevelEmoji()} {concernLevel === 'low' ? 'ちょっと気になる' : 
              concernLevel === 'medium' ? 'けっこう気になる' : 'かなり気になる'} ・ {urgency}
          </p>
        </div>

        {/* 説明 */}
        <div className="mb-6">
          <p className="text-gray-600">一番近いものを選んでください：</p>
        </div>

        {/* カテゴリ選択 */}
        <div className="space-y-4 mb-8">
          {categories.map(category => (
            <label
              key={category.value}
              className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedCategory === category.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="category"
                value={category.value}
                checked={selectedCategory === category.value}
                onChange={(e) => setSelectedCategory(e.target.value as Category)}
                className="sr-only"
              />
              <div className="flex items-start">
                <span className="text-xl mr-3">{category.emoji}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 mb-1">
                    {category.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {category.desc}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* ヒント */}
        <div className="bg-blue-50 p-3 rounded-lg mb-8">
          <p className="text-sm text-blue-700">
            💡 分類によって最適なアプローチが変わります
          </p>
        </div>

        {/* ボタンエリア */}
        <button
          onClick={handleNext}
          disabled={!selectedCategory}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            selectedCategory
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
