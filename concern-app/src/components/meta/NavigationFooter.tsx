/**
 * NavigationFooter - フローナビゲーションフッター
 *
 * Phase 3 v2.1: メタUI層
 * 画面下部に固定表示し、戻る/保存/次へボタンを提供
 */

import React from 'react';
import type { UIStage } from '../../../../server/src/types/UISpecV2';

interface NavigationFooterProps {
  stage: UIStage;
  onBack?: () => void;
  onSave: () => void;
  onNext: () => void;
  isNextEnabled: boolean;
  isSaving?: boolean;
  className?: string;
}

export const NavigationFooter: React.FC<NavigationFooterProps> = ({
  stage,
  onBack,
  onSave,
  onNext,
  isNextEnabled,
  isSaving = false,
  className = ''
}) => {
  // captureステージでは戻るボタンを表示しない
  const showBackButton = stage !== 'capture' && onBack;

  return (
    <div className={`bg-white border-t border-gray-200 ${className}`}>
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* 戻るボタン */}
          {showBackButton ? (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <span>←</span>
              <span>戻る</span>
            </button>
          ) : (
            <div /> // スペーサー
          )}

          {/* 中央のアクション */}
          <div className="flex gap-3">
            {/* 下書き保存ボタン */}
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>💾</span>
              <span>{isSaving ? '保存中...' : '下書き保存'}</span>
            </button>
          </div>

          {/* 次へボタン */}
          <button
            type="button"
            onClick={onNext}
            disabled={!isNextEnabled}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>次へ</span>
            <span>→</span>
          </button>
        </div>

        {/* バリデーションメッセージ */}
        {!isNextEnabled && (
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-500">
              ✋ 必須項目を入力してから次へ進めます
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
