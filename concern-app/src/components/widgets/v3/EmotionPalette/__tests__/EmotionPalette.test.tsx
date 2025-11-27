/**
 * EmotionPalette.test.tsx
 * EmotionPaletteコンポーネントのテスト
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmotionPalette } from '../EmotionPalette';
import type { WidgetSpecObject } from '../../../../../types/widget.types';

describe('EmotionPalette Component', () => {
  const mockSpec: WidgetSpecObject = {
    id: 'emotion_widget_1',
    component: 'emotion_palette',
    position: 1,
    config: {},
    metadata: {
      timing: 0.1,
      versatility: 0.8,
      bottleneck: ['感情的ブロック'],
    },
  };

  describe('レンダリング', () => {
    test('コンポーネントがレンダリングされる', () => {
      render(<EmotionPalette spec={mockSpec} />);

      expect(
        screen.getByText('今の気持ちを選んでください')
      ).toBeInTheDocument();
    });

    test('8つの感情ボタンが表示される', () => {
      render(<EmotionPalette spec={mockSpec} />);

      const buttons = screen.getAllByRole('radio');
      expect(buttons).toHaveLength(8);
    });

    test('初期状態では強度スライダーが表示されない', () => {
      render(<EmotionPalette spec={mockSpec} />);

      const slider = screen.queryByRole('slider');
      expect(slider).not.toBeInTheDocument();
    });

    test('初期状態では完了ボタンが無効化されている', () => {
      render(<EmotionPalette spec={mockSpec} />);

      const completeButton = screen.getByRole('button', { name: '選択を完了' });
      expect(completeButton).toBeDisabled();
    });
  });

  describe('感情選択', () => {
    test('感情ボタンをクリックすると選択状態になる', () => {
      render(<EmotionPalette spec={mockSpec} />);

      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      expect(joyButton).toHaveAttribute('aria-checked', 'true');
    });

    test('感情を選択すると強度スライダーが表示される', () => {
      render(<EmotionPalette spec={mockSpec} />);

      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });

    test('感情を選択するとサマリーが表示される', () => {
      render(<EmotionPalette spec={mockSpec} />);

      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      const summary = screen.getByRole('status');
      expect(summary).toBeInTheDocument();
      expect(summary).toHaveTextContent('喜び');
    });

    test('感情を選択すると完了ボタンが有効化される', () => {
      render(<EmotionPalette spec={mockSpec} />);

      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      const completeButton = screen.getByRole('button', { name: '選択を完了' });
      expect(completeButton).not.toBeDisabled();
    });

    test('onUpdateコールバックが呼ばれる', () => {
      const onUpdate = vi.fn();
      render(<EmotionPalette spec={mockSpec} onUpdate={onUpdate} />);

      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      expect(onUpdate).toHaveBeenCalledWith(
        mockSpec.id,
        expect.objectContaining({
          type: 'composite',
        })
      );
    });
  });

  describe('強度調整', () => {
    test('スライダーを動かすと強度が変わる', () => {
      render(<EmotionPalette spec={mockSpec} />);

      // 感情を選択
      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      // スライダーを操作
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '80' } });

      // 強度表示が更新される
      const intensityLabel = screen.getByLabelText('感情の強度');
      expect(intensityLabel).toHaveValue('80');
    });

    test('強度を変更するとonUpdateコールバックが呼ばれる', () => {
      const onUpdate = vi.fn();
      render(<EmotionPalette spec={mockSpec} onUpdate={onUpdate} />);

      // 感情を選択
      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      // onUpdateをリセット
      onUpdate.mockClear();

      // スライダーを操作
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '70' } });

      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe('完了処理', () => {
    test('感情未選択では完了ボタンが無効化されている', () => {
      render(<EmotionPalette spec={mockSpec} />);

      const completeButton = screen.getByRole('button', { name: '選択を完了' });
      expect(completeButton).toBeDisabled();
    });

    test('感情選択後に完了ボタンを押すとonCompleteが呼ばれる', () => {
      const onComplete = vi.fn();
      render(<EmotionPalette spec={mockSpec} onComplete={onComplete} />);

      // 感情を選択
      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      // 完了ボタンを押す
      const completeButton = screen.getByRole('button', { name: '選択を完了' });
      fireEvent.click(completeButton);

      expect(onComplete).toHaveBeenCalledWith(mockSpec.id);
    });
  });

  describe('アクセシビリティ', () => {
    test('感情選択にradiogroup roleが設定されている', () => {
      render(<EmotionPalette spec={mockSpec} />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toBeInTheDocument();
    });

    test('スライダーにaria属性が設定されている', () => {
      render(<EmotionPalette spec={mockSpec} />);

      // 感情を選択
      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('aria-valuenow');
      expect(slider).toHaveAttribute('aria-label');
    });

    test('サマリーにaria-live属性が設定されている', () => {
      render(<EmotionPalette spec={mockSpec} />);

      // 感情を選択
      const joyButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(joyButton);

      const summary = screen.getByRole('status');
      expect(summary).toHaveAttribute('aria-live', 'polite');
    });
  });
});
