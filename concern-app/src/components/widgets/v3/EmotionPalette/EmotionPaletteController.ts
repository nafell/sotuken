/**
 * EmotionPaletteController.ts
 * 感情カラーパレットWidgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * 8種類の感情から選択し、強度を調整するWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * 感情の定義
 */
export interface Emotion {
  id: string;
  label: string;
  category: 'positive' | 'negative' | 'neutral';
  color: string;
  description: string;
}

/**
 * 強度レベル
 */
export type IntensityLevel = 'low' | 'medium' | 'high';

/**
 * EmotionPaletteの状態
 */
export interface EmotionPaletteState {
  selectedEmotion: string | null;
  intensity: number; // 0.0 ~ 1.0
}

/**
 * 8種類の感情定義
 */
export const EMOTIONS: Emotion[] = [
  {
    id: 'joy',
    label: '喜び',
    category: 'positive',
    color: '#FFD700',
    description: '嬉しい、楽しい、幸せ',
  },
  {
    id: 'trust',
    label: '信頼',
    category: 'positive',
    color: '#90EE90',
    description: '安心、信用できる',
  },
  {
    id: 'fear',
    label: '恐れ',
    category: 'negative',
    color: '#9370DB',
    description: '怖い、不安、心配',
  },
  {
    id: 'surprise',
    label: '驚き',
    category: 'neutral',
    color: '#87CEEB',
    description: '意外、びっくり',
  },
  {
    id: 'sadness',
    label: '悲しみ',
    category: 'negative',
    color: '#4169E1',
    description: '寂しい、辛い、苦しい',
  },
  {
    id: 'disgust',
    label: '嫌悪',
    category: 'negative',
    color: '#8B4513',
    description: '嫌だ、不快',
  },
  {
    id: 'anger',
    label: '怒り',
    category: 'negative',
    color: '#DC143C',
    description: '腹が立つ、イライラ',
  },
  {
    id: 'anticipation',
    label: '期待',
    category: 'positive',
    color: '#FFA500',
    description: '楽しみ、ワクワク',
  },
];

/**
 * EmotionPaletteController
 * 感情選択と強度管理のロジック
 */
export class EmotionPaletteController {
  private state: EmotionPaletteState;

  constructor(initialState?: Partial<EmotionPaletteState>) {
    this.state = {
      selectedEmotion: initialState?.selectedEmotion || null,
      intensity: initialState?.intensity || 0.5,
    };
  }

  /**
   * 感情を選択
   */
  public selectEmotion(emotionId: string): void {
    const emotion = EMOTIONS.find((e) => e.id === emotionId);
    if (!emotion) {
      throw new Error(`Unknown emotion: ${emotionId}`);
    }
    this.state.selectedEmotion = emotionId;
  }

  /**
   * 強度を設定
   * @param intensity 0.0 ~ 1.0
   */
  public setIntensity(intensity: number): void {
    if (intensity < 0 || intensity > 1) {
      throw new Error('Intensity must be between 0 and 1');
    }
    this.state.intensity = intensity;
  }

  /**
   * 現在の状態を取得
   */
  public getState(): EmotionPaletteState {
    return { ...this.state };
  }

  /**
   * 感情IDから感情情報を取得
   */
  public getEmotionById(emotionId: string): Emotion | undefined {
    return EMOTIONS.find((e) => e.id === emotionId);
  }

  /**
   * 強度レベルを判定
   */
  public getIntensityLevel(intensity: number): IntensityLevel {
    if (intensity < 0.33) return 'low';
    if (intensity < 0.67) return 'medium';
    return 'high';
  }

  /**
   * 強度を日本語表現に変換
   */
  public getIntensityText(intensity: number): string {
    const level = this.getIntensityLevel(intensity);
    switch (level) {
      case 'low':
        return '少し';
      case 'medium':
        return 'やや';
      case 'high':
        return '強く';
    }
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    if (!this.state.selectedEmotion) {
      return '感情が選択されていません';
    }

    const emotion = this.getEmotionById(this.state.selectedEmotion);
    if (!emotion) {
      return '不明な感情';
    }

    const intensityText = this.getIntensityText(this.state.intensity);
    const percentage = Math.round(this.state.intensity * 100);

    return `${emotion.label}を${intensityText}感じています（${percentage}%）`;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    const emotion = this.state.selectedEmotion
      ? this.getEmotionById(this.state.selectedEmotion)
      : null;

    return {
      widgetId,
      component: 'emotion_palette',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'composite',
        composite: {
          emotion: this.state.selectedEmotion,
          emotionLabel: emotion?.label || null,
          intensity: this.state.intensity,
          intensityLevel: this.getIntensityLevel(this.state.intensity),
          emotionCategory: emotion?.category || null,
        },
      },
      interactions: [],
      metadata: {
        emotionCount: EMOTIONS.length,
        intensityRange: [0, 1],
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state = {
      selectedEmotion: null,
      intensity: 0.5,
    };
  }
}
