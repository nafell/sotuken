/**
 * EmotionPalette.tsx
 * 感情カラーパレットWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 8種類の感情から選択し、強度を調整するWidget
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  EmotionPaletteController,
  EMOTIONS,
  type Emotion,
} from './EmotionPaletteController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import { GeneratedBadge } from '../../../ui/GeneratedBadge';
import styles from './EmotionPalette.module.css';

/** 動的生成された感情ラベル型 */
interface GeneratedEmotion {
  id: string;
  label: string;
  color: string;
  category?: 'positive' | 'negative' | 'neutral';
  description?: string;
  isGenerated?: true;
}

/**
 * EmotionPalette Component
 */
export const EmotionPalette: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
  onPortChange,
  getPortValue,
  initialPortValues,
}) => {
  // Reactive Ports
  const { emitPort, setCompleted, setError } = useReactivePorts({
    widgetId: spec.id,
    onPortChange,
    getPortValue,
    initialPortValues,
  });

  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<number>(0.5);
  const controllerRef = useRef<EmotionPaletteController>(
    new EmotionPaletteController()
  );

  // 動的に生成された感情ラベル（config.emotionsから取得）またはデフォルトのEMOTIONSを使用
  const emotionsList: Emotion[] = useMemo(() => {
    const configEmotions = spec.config?.emotions as GeneratedEmotion[] | undefined;
    if (configEmotions && configEmotions.length > 0) {
      // 動的生成された感情をEmotion型に変換
      return configEmotions.map((e) => ({
        id: e.id,
        label: e.label,
        category: e.category || 'neutral',
        color: e.color,
        description: e.description || e.label,
        isGenerated: e.isGenerated,
      }));
    }
    // デフォルトの固定感情を使用
    return EMOTIONS;
  }, [spec.config?.emotions]);

  // 生成された感情かどうかを追跡
  const hasGeneratedEmotions = useMemo(() => {
    const configEmotions = spec.config?.emotions as GeneratedEmotion[] | undefined;
    return configEmotions && configEmotions.length > 0 && configEmotions.some((e) => e.isGenerated);
  }, [spec.config?.emotions]);

  // Controllerにカスタム感情リストを設定
  useEffect(() => {
    if (emotionsList !== EMOTIONS) {
      controllerRef.current.setCustomEmotions(emotionsList);
    }
  }, [emotionsList]);

  /**
   * 感情選択ハンドラー
   */
  const handleEmotionSelect = useCallback((emotionId: string) => {
    setSelectedEmotion(emotionId);
    controllerRef.current.selectEmotion(emotionId);

    // Reactive Port出力
    emitPort('selected_emotion', emotionId);
    emitPort('summary', controllerRef.current.generateSummary());

    // 親コンポーネントに通知（後方互換性）
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [emitPort, onUpdate, spec.id]);

  /**
   * 強度変更ハンドラー
   */
  const handleIntensityChange = useCallback((value: number) => {
    setIntensity(value);
    controllerRef.current.setIntensity(value);

    // Reactive Port出力
    emitPort('intensity', value);
    emitPort('summary', controllerRef.current.generateSummary());

    // 親コンポーネントに通知（後方互換性）
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [emitPort, onUpdate, spec.id]);

  /**
   * 完了ハンドラー
   */
  const handleComplete = useCallback(() => {
    if (!selectedEmotion) {
      setError(true, ['感情を選択してください']);
      alert('感情を選択してください');
      return;
    }

    setError(false);
    setCompleted(true);

    if (onComplete) {
      onComplete(spec.id);
    }
  }, [selectedEmotion, setError, setCompleted, onComplete, spec.id]);

  /**
   * 結果取得メソッド（外部から呼び出し可能）
   */
  /**
   * 結果取得メソッド（外部から呼び出し可能）
   */
  const getResult = useCallback((): WidgetResult => {
    return controllerRef.current.getResult(spec.id);
  }, [spec.id]);

  // 外部から結果を取得できるようにrefを設定
  useEffect(() => {
    (window as any)[`widget_${spec.id}_getResult`] = getResult;
    return () => {
      delete (window as any)[`widget_${spec.id}_getResult`];
    };
  }, [spec.id, getResult]);

  return (
    <div className={styles.container} role="region" aria-label="感情選択" data-testid="emotion-palette-container">
      <div className={styles.header}>
        <h2 className={styles.title}>今の気持ちを選んでください</h2>
        <p className={styles.description}>
          一番近い感情を選び、その強さを調整してください
        </p>
      </div>

      {/* 生成された感情の場合はバッジを表示 */}
      {hasGeneratedEmotions && (
        <div className={styles.generatedHeader}>
          <GeneratedBadge tooltip="この悩みに関連する感情をAIが提案しました" />
        </div>
      )}

      {/* 感情選択パレット */}
      <div
        className={styles.emotionGrid}
        role="radiogroup"
        aria-label="感情選択"
        data-testid="emotion-palette-options"
      >
        {emotionsList.map((emotion) => (
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
            data-testid="emotion-palette-intensity-slider"
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
        <div className={styles.summary} role="status" aria-live="polite" data-testid="emotion-palette-selected-display">
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
          data-testid="emotion-palette-complete-btn"
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
      className={`${styles.emotionButton} ${isSelected ? styles.emotionButtonSelected : ''
        }`}
      style={{
        backgroundColor: emotion.color,
        opacity: isSelected ? 1 : 0.7,
      }}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${emotion.label} - ${emotion.description}`}
      title={emotion.description}
      data-testid={`emotion-palette-btn-${emotion.id}`}
    >
      <span className={styles.emotionLabel}>{emotion.label}</span>
    </button>
  );
};

export default EmotionPalette;
