/**
 * FallbackUI - UI生成失敗時のフォールバック画面
 *
 * Phase 3実装
 */

import React from 'react';
import type { UIStage } from '../../../../server/src/types/UISpecV2';

interface FallbackUIProps {
  concernText: string;
  stage: UIStage;
  error?: string;
  onRetry: () => void;
}

export const FallbackUI: React.FC<FallbackUIProps> = ({
  concernText,
  stage,
  error,
  onRetry
}) => {
  // ステージ別の静的コンテンツ
  const getStageContent = () => {
    switch (stage) {
      case 'capture':
        return {
          title: '関心事を記録しましょう',
          description: '気になっていることを教えてください',
          fields: [
            { label: '関心事', placeholder: '例：卒業研究のテーマが決まらない', type: 'textarea' },
            { label: 'カテゴリー', options: ['仕事・学業', '個人的なこと', '健康・生活'], type: 'select' },
            { label: '緊急度（0-10）', type: 'number' }
          ]
        };

      case 'plan':
        return {
          title: '取り組み方を考えましょう',
          description: 'どのように進めるか計画を立てます',
          fields: [
            { label: '優先したいこと', options: ['スピード', 'バランス', '品質'], type: 'select' },
            { label: '力の入れ方', placeholder: '1-10で入力', type: 'number' }
          ]
        };

      case 'breakdown':
        return {
          title: '具体的な行動に分解しましょう',
          description: '実行可能なタスクに分けます',
          fields: [
            { label: '最初の一歩', placeholder: '5分でできることを入力', type: 'text' },
            { label: '次にやること', placeholder: '2つ目のタスク', type: 'text' },
            { label: '3つ目のタスク', placeholder: '3つ目のタスク', type: 'text' }
          ]
        };
    }
  };

  const content = getStageContent();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-400 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-red-800">
                  UI生成に失敗しました
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {error}
                </p>
                <button
                  onClick={onRetry}
                  className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                >
                  🔄 再試行
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 静的フォーム */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{content.title}</h1>
            <p className="text-gray-600 mt-2">{content.description}</p>
            {concernText && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">関心事:</p>
                <p className="text-blue-800 mt-1">{concernText}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {content.fields.map((field, index) => (
              <div key={index}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label}
                </label>

                {field.type === 'textarea' && (
                  <textarea
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    defaultValue={concernText}
                  />
                )}

                {field.type === 'text' && (
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    placeholder={field.placeholder}
                    min={0}
                    max={10}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}

                {field.type === 'select' && field.options && (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((option, optIndex) => (
                      <button
                        key={optIndex}
                        type="button"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* アクション */}
          <div className="mt-8 flex gap-3 justify-end">
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              動的UIで再試行
            </button>
            <button
              type="button"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              この内容で進む
            </button>
          </div>
        </div>

        {/* サポート情報 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>ヒント:</strong> 一時的な問題の可能性があります。しばらく待ってから再試行してください。
          </p>
        </div>
      </div>
    </div>
  );
};
