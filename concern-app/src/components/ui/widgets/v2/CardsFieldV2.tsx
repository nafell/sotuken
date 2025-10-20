/**
 * CardsFieldV2 - カード選択ウィジェット
 */

import React from 'react';
import type { UIField } from '../../../../../../server/src/types/UISpecV2';

interface CardsFieldV2Props {
  field: UIField;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
}

export const CardsFieldV2: React.FC<CardsFieldV2Props> = ({
  field,
  value = '',
  onChange,
  disabled = false
}) => {
  const options = field.options || {};
  const cards = options.cards || [];
  const allowMultiple = options.allowMultiple || false;
  const isReadonly = options.readonly || disabled;

  const handleCardClick = (cardId: string) => {
    if (isReadonly) return;

    if (allowMultiple) {
      const currentValues = (value as string[]) || [];
      const newValues = currentValues.includes(cardId)
        ? currentValues.filter(v => v !== cardId)
        : [...currentValues, cardId];
      onChange(newValues);
    } else {
      onChange(cardId);
    }
  };

  const isSelected = (cardId: string) => {
    if (allowMultiple) {
      return ((value as string[]) || []).includes(cardId);
    }
    return value === cardId;
  };

  return (
    <div className="space-y-3">
      {/* ラベル */}
      <label className="block text-sm font-semibold text-gray-700">
        {field.label}
        {options.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* カードグリッド */}
      <div className="space-y-3">
        {cards.map((card) => {
          const selected = isSelected(card.id);
          const isDisabled = isReadonly || card.disabled;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card.id)}
              disabled={isDisabled}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3">
                {/* アイコン */}
                {card.icon && (
                  <div className="text-3xl flex-shrink-0">
                    {card.icon}
                  </div>
                )}

                {/* コンテンツ */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-base">
                      {card.title}
                    </h3>
                    {card.badge && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full flex-shrink-0">
                        {card.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    {card.description}
                  </p>
                </div>

                {/* 選択インジケーター */}
                {selected && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ヘルプテキスト */}
      {options.helperText && (
        <p className="text-xs text-gray-500">{options.helperText}</p>
      )}
    </div>
  );
};
