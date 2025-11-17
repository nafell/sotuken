/**
 * EmotionPalette.tsx
 * 感情カラーパレットWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 8種類の感情から選択し、強度を調整するWidget
 */

import React, { useEffect, useRef, useState } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  EmotionPaletteController,
  EMOTIONS,
  type Emotion,
} from './EmotionPaletteController';
import styles from './EmotionPalette.module.css';

/**
 * EmotionPalette Component
 */
export const EmotionPalette: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
}) => {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<number>(0.5);
  const controllerRef = useRef<EmotionPaletteController>(
    new EmotionPaletteController()
  );

  /**
   * 感情選択ハンドラー
   */
  const handleEmotionSelect = (emotionId: string) => {
    setSelectedEmotion(emotionId);
    controllerRef.current.selectEmotion(emotionId);

    // 親コンポーネントに通知
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  };

  /**
   * 強度変更ハンドラー
   */
  const handleIntensityChange = (value: number) => {
    setIntensity(value);
    controllerRef.current.setIntensity(value);

    // 親コンポーネントに通知
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  };

  /**
   * 完了ハンドラー
   */
  const handleComplete = () => {
    if (!selectedEmotion) {
      alert('感情を選択してください');
      return;
    }

    if (onComplete) {
      onComplete(spec.id);
    }
  };

  /**
   * 結果取得メソッド（外部から呼び出し可能）
   */
  const getResult = (): WidgetResult => {
    return controllerRef.current.getResult(spec.id);
  };

  // 外部から結果を取得できるようにrefを設定
  useEffect(() => {
    (window as any)[`widget_${spec.id}_getResult`] = getResult;
    return () => {
      delete (window as any)[`widget_${spec.id}_getResult`];
    };
  }, [spec.id, selectedEmotion, intensity]);

  return (
    <div className={styles.container} role="region" aria-label="感情選択">
      <div className={styles.header}>
        <h2 className={styles.title}>今の気持ちを選んでください</h2>
        <p className={styles.description}>
          一番近い感情を選び、その強さを調整してください
        </p>
      </div>

      {/* 感情選択パレット */}
      <div
        className={styles.emotionGrid}
        role="radiogroup"
        aria-label="感情選択"
      >
        {EMOTIONS.map((emotion) => (
          <EmotionButton
            key={emotion.id}
            emotion={emotion}
            isSelected={selectedEmotion === emotion.id}
            onSelect={handleEmotionSelect}
          />
        ))}
      </div>

      {/* 強度スライダー */}
      {selectedEmotion && (
        <div className={styles.intensitySection}>
          <label htmlFor="intensity-slider" className={styles.intensityLabel}>
            強さ: {Math.round(intensity * 100)}%
          </label>
          <input
            id="intensity-slider"
            type="range"
            min="0"
            max="100"
            value={Math.round(intensity * 100)}
            onChange={(e) => handleIntensityChange(Number(e.target.value) / 100)}
            className={styles.intensitySlider}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(intensity * 100)}
            aria-label="感情の強度"
          />
          <div className={styles.intensityMarkers}>
            <span>弱い</span>
            <span>中程度</span>
            <span>強い</span>
          </div>
        </div>
      )}

      {/* サマリー表示 */}
      {selectedEmotion && (
        <div className={styles.summary} role="status" aria-live="polite">
          <p>{controllerRef.current.generateSummary()}</p>
        </div>
      )}

      {/* 完了ボタン */}
      <div className={styles.actions}>
        <button
          onClick={handleComplete}
          disabled={!selectedEmotion}
          className={styles.completeButton}
          aria-label="選択を完了"
        >
          完了
        </button>
      </div>
    </div>
  );
};

/**
 * 感情ボタンコンポーネント
 */
interface EmotionButtonProps {
  emotion: Emotion;
  isSelected: boolean;
  onSelect: (emotionId: string) => void;
}

const EmotionButton: React.FC<EmotionButtonProps> = ({
  emotion,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      onClick={() => onSelect(emotion.id)}
      className={`${styles.emotionButton} ${
        isSelected ? styles.emotionButtonSelected : ''
      }`}
      style={{
        backgroundColor: emotion.color,
        opacity: isSelected ? 1 : 0.7,
      }}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${emotion.label} - ${emotion.description}`}
      title={emotion.description}
    >
      <span className={styles.emotionLabel}>{emotion.label}</span>
    </button>
  );
};

export default EmotionPalette;
