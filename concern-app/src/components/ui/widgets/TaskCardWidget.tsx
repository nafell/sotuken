/**
 * TaskCardWidget - タスクカード表示ウィジェット
 * TaskRecommendationDSLのタスクカードをレンダリング
 */

import React from 'react';
import { SALIENCY_STYLES } from '../../../services/ui-generation/ComponentMapper';

interface TaskCardWidgetProps {
  variant: 'task_card' | 'micro_step_card' | 'prepare_step_card';
  saliency: number;
  title: string;
  description?: string;
  estimate?: number;
  importance?: number;
  dueInHours?: number;
  onStart?: () => void;
  className?: string;
}

export const TaskCardWidget: React.FC<TaskCardWidgetProps> = ({
  variant,
  saliency,
  title,
  description,
  estimate,
  importance,
  dueInHours,
  onStart,
  className = ''
}) => {
  // バリアント別のアイコンとラベル
  const variantInfo = {
    task_card: { icon: '📋', label: 'タスク実行' },
    micro_step_card: { icon: '⚡', label: 'マイクロステップ' },
    prepare_step_card: { icon: '🔧', label: '準備ステップ' }
  };

  const { icon, label } = variantInfo[variant];
  const saliencyStyle = SALIENCY_STYLES[saliency] || SALIENCY_STYLES[2];

  return (
    <div
      className={`p-6 rounded-lg border-2 shadow-md ${saliencyStyle} ${className}`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-sm font-semibold uppercase tracking-wide">
            {label}
          </span>
        </div>
        {importance !== undefined && (
          <span className="text-sm font-mono">
            重要度: {(importance * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* タイトル */}
      <h3 className="text-xl font-bold mb-2">{title}</h3>

      {/* 説明 */}
      {description && (
        <p className="text-sm mb-4 opacity-90">{description}</p>
      )}

      {/* メタ情報 */}
      <div className="flex items-center space-x-4 text-sm mb-4">
        {estimate !== undefined && (
          <span className="font-mono">⏱️ {estimate}分</span>
        )}
        {dueInHours !== undefined && (
          <span className="font-mono">
            ⏰ 残り{dueInHours}時間
          </span>
        )}
      </div>

      {/* アクションボタン */}
      {onStart && (
        <button
          onClick={onStart}
          className="w-full py-3 bg-white text-gray-800 font-bold rounded-md hover:bg-gray-100 transition-colors shadow-sm"
        >
          開始する
        </button>
      )}
    </div>
  );
};

