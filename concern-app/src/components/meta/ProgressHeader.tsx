/**
 * ProgressHeader - フロー進捗表示ヘッダー
 *
 * Phase 3 v2.1: メタUI層
 * 画面上部に固定表示し、現在のステージと進捗を表示
 */

import React from 'react';
import type { UIStage } from '../../../../server/src/types/UISpecV2';

interface ProgressHeaderProps {
  stage: UIStage;
  className?: string;
}

interface StageInfo {
  step: number;
  label: string;
  description: string;
}

const STAGE_INFO: Record<UIStage, StageInfo> = {
  capture: {
    step: 1,
    label: '関心事の把握',
    description: '気になっていることを整理しましょう'
  },
  plan: {
    step: 2,
    label: '計画の立案',
    description: '取り組み方を考えましょう'
  },
  breakdown: {
    step: 3,
    label: 'タスク分解',
    description: '具体的な行動に落とし込みましょう'
  }
};

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  stage,
  className = ''
}) => {
  const currentInfo = STAGE_INFO[stage];
  const totalSteps = 3;

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* プログレスバー */}
        <div className="flex items-center justify-between mb-3">
          {(['capture', 'plan', 'breakdown'] as UIStage[]).map((s, index) => {
            const info = STAGE_INFO[s];
            const isActive = s === stage;
            const isCompleted = info.step < currentInfo.step;
            const isLast = index === totalSteps - 1;

            return (
              <React.Fragment key={s}>
                {/* ステップ円 */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      font-semibold text-sm transition-all
                      ${isActive
                        ? 'bg-blue-600 text-white scale-110'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {isCompleted ? '✓' : info.step}
                  </div>
                  <span
                    className={`
                      text-xs mt-1 font-medium
                      ${isActive ? 'text-blue-600' : 'text-gray-500'}
                    `}
                  >
                    {info.label}
                  </span>
                </div>

                {/* 接続線 */}
                {!isLast && (
                  <div
                    className={`
                      flex-1 h-1 mx-2 rounded transition-all
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                    style={{ marginBottom: '20px' }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 現在のステージ情報 */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">
            Step {currentInfo.step}/{totalSteps}: {currentInfo.label}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {currentInfo.description}
          </p>
        </div>
      </div>
    </div>
  );
};
