/**
 * EmotionPaletteController.test.ts
 * EmotionPaletteControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  EmotionPaletteController,
  EMOTIONS,
} from '../EmotionPaletteController';

describe('EmotionPaletteController', () => {
  let controller: EmotionPaletteController;

  beforeEach(() => {
    controller = new EmotionPaletteController();
  });

  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => {
      const state = controller.getState();

      expect(state.selectedEmotion).toBeNull();
      expect(state.intensity).toBe(0.5);
    });

    test('初期値を指定して初期化できる', () => {
      const customController = new EmotionPaletteController({
        selectedEmotion: 'joy',
        intensity: 0.8,
      });

      const state = customController.getState();

      expect(state.selectedEmotion).toBe('joy');
      expect(state.intensity).toBe(0.8);
    });
  });

  describe('感情選択', () => {
    test('感情を選択できる', () => {
      controller.selectEmotion('joy');

      const state = controller.getState();
      expect(state.selectedEmotion).toBe('joy');
    });

    test('存在しない感情を選択するとエラーをthrow', () => {
      expect(() => {
        controller.selectEmotion('invalid_emotion');
      }).toThrow('Unknown emotion: invalid_emotion');
    });

    test('全ての感情を選択できる', () => {
      EMOTIONS.forEach((emotion) => {
        expect(() => {
          controller.selectEmotion(emotion.id);
        }).not.toThrow();
      });
    });
  });

  describe('強度設定', () => {
    test('強度を設定できる', () => {
      controller.setIntensity(0.7);

      const state = controller.getState();
      expect(state.intensity).toBe(0.7);
    });

    test('強度0を設定できる', () => {
      controller.setIntensity(0);

      const state = controller.getState();
      expect(state.intensity).toBe(0);
    });

    test('強度1を設定できる', () => {
      controller.setIntensity(1);

      const state = controller.getState();
      expect(state.intensity).toBe(1);
    });

    test('強度が0未満の場合はエラーをthrow', () => {
      expect(() => {
        controller.setIntensity(-0.1);
      }).toThrow('Intensity must be between 0 and 1');
    });

    test('強度が1より大きい場合はエラーをthrow', () => {
      expect(() => {
        controller.setIntensity(1.1);
      }).toThrow('Intensity must be between 0 and 1');
    });
  });

  describe('感情情報取得', () => {
    test('感情IDから感情情報を取得できる', () => {
      const emotion = controller.getEmotionById('joy');

      expect(emotion).toBeDefined();
      expect(emotion?.id).toBe('joy');
      expect(emotion?.label).toBe('喜び');
      expect(emotion?.category).toBe('positive');
    });

    test('存在しない感情IDはundefinedを返す', () => {
      const emotion = controller.getEmotionById('invalid');

      expect(emotion).toBeUndefined();
    });
  });

  describe('強度レベル判定', () => {
    test('0 ~ 0.33は"low"', () => {
      expect(controller.getIntensityLevel(0)).toBe('low');
      expect(controller.getIntensityLevel(0.2)).toBe('low');
      expect(controller.getIntensityLevel(0.32)).toBe('low');
    });

    test('0.33 ~ 0.67は"medium"', () => {
      expect(controller.getIntensityLevel(0.33)).toBe('medium');
      expect(controller.getIntensityLevel(0.5)).toBe('medium');
      expect(controller.getIntensityLevel(0.66)).toBe('medium');
    });

    test('0.67 ~ 1.0は"high"', () => {
      expect(controller.getIntensityLevel(0.67)).toBe('high');
      expect(controller.getIntensityLevel(0.8)).toBe('high');
      expect(controller.getIntensityLevel(1.0)).toBe('high');
    });
  });

  describe('強度テキスト変換', () => {
    test('low → "少し"', () => {
      expect(controller.getIntensityText(0.2)).toBe('少し');
    });

    test('medium → "やや"', () => {
      expect(controller.getIntensityText(0.5)).toBe('やや');
    });

    test('high → "強く"', () => {
      expect(controller.getIntensityText(0.8)).toBe('強く');
    });
  });

  describe('サマリー生成', () => {
    test('感情が選択されていない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toBe('感情が選択されていません');
    });

    test('感情と強度が設定されている場合', () => {
      controller.selectEmotion('joy');
      controller.setIntensity(0.7);

      const summary = controller.generateSummary();

      expect(summary).toContain('喜び');
      expect(summary).toContain('強く');
      expect(summary).toContain('70%');
    });

    test('低強度の場合', () => {
      controller.selectEmotion('sadness');
      controller.setIntensity(0.2);

      const summary = controller.generateSummary();

      expect(summary).toContain('悲しみ');
      expect(summary).toContain('少し');
      expect(summary).toContain('20%');
    });
  });

  describe('WidgetResult生成', () => {
    test('感情が選択されていない場合でも結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('emotion_palette');
      expect(result.summary).toBe('感情が選択されていません');
      expect(result.data.type).toBe('composite');
      expect(result.data.composite?.emotion).toBeNull();
    });

    test('感情と強度が設定されている場合の結果', () => {
      controller.selectEmotion('fear');
      controller.setIntensity(0.7);

      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('emotion_palette');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('composite');
      expect(result.data.composite?.emotion).toBe('fear');
      expect(result.data.composite?.emotionLabel).toBe('恐れ');
      expect(result.data.composite?.intensity).toBe(0.7);
      expect(result.data.composite?.intensityLevel).toBe('high');
      expect(result.data.composite?.emotionCategory).toBe('negative');
    });

    test('結果にメタデータが含まれる', () => {
      controller.selectEmotion('joy');

      const result = controller.getResult('widget_1');

      expect(result.metadata?.emotionCount).toBe(8);
      expect(result.metadata?.intensityRange).toEqual([0, 1]);
    });
  });

  describe('リセット', () => {
    test('リセット後は初期状態に戻る', () => {
      controller.selectEmotion('anger');
      controller.setIntensity(0.9);

      controller.reset();

      const state = controller.getState();
      expect(state.selectedEmotion).toBeNull();
      expect(state.intensity).toBe(0.5);
    });
  });

  describe('感情定義', () => {
    test('8種類の感情が定義されている', () => {
      expect(EMOTIONS).toHaveLength(8);
    });

    test('全ての感情に必須フィールドがある', () => {
      EMOTIONS.forEach((emotion) => {
        expect(emotion.id).toBeDefined();
        expect(emotion.label).toBeDefined();
        expect(emotion.category).toBeDefined();
        expect(emotion.color).toBeDefined();
        expect(emotion.description).toBeDefined();
      });
    });

    test('カテゴリはpositive/negative/neutralのいずれか', () => {
      const validCategories = ['positive', 'negative', 'neutral'];

      EMOTIONS.forEach((emotion) => {
        expect(validCategories).toContain(emotion.category);
      });
    });

    test('色コードは#から始まる', () => {
      EMOTIONS.forEach((emotion) => {
        expect(emotion.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });
});
