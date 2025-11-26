/**
 * integration.test.tsx
 * Widget統合テスト
 *
 * Phase 4 - Day 3-4: 基本4種Widgetの統合テスト
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmotionPalette } from '../EmotionPalette/EmotionPalette';
import { BrainstormCards } from '../BrainstormCards/BrainstormCards';
import { MatrixPlacement } from '../MatrixPlacement/MatrixPlacement';
import { PrioritySliderGrid } from '../PrioritySliderGrid/PrioritySliderGrid';
import type { WidgetSpecObject } from '../../../../types/widget.types';

describe('Widget Integration Tests', () => {
  // テスト用のWidget spec定義
  const emotionSpec: WidgetSpecObject = {
    id: 'emotion_1',
    component: 'emotion_palette',
    position: 1,
    config: {},
    metadata: {
      timing: 0.1,
      versatility: 0.8,
      bottleneck: ['感情的ブロック'],
    },
  };

  const brainstormSpec: WidgetSpecObject = {
    id: 'brainstorm_1',
    component: 'brainstorm_cards',
    position: 2,
    config: { maxCards: 10 },
    metadata: {
      timing: 0.2,
      versatility: 0.9,
      bottleneck: ['情報不足'],
    },
  };

  const matrixSpec: WidgetSpecObject = {
    id: 'matrix_1',
    component: 'matrix_placement',
    position: 3,
    config: {
      xAxisLabel: '重要度',
      yAxisLabel: '緊急度',
      maxItems: 15,
    },
    metadata: {
      timing: 0.3,
      versatility: 0.7,
      bottleneck: ['選択肢が多すぎる'],
    },
  };

  const prioritySpec: WidgetSpecObject = {
    id: 'priority_1',
    component: 'priority_slider_grid',
    position: 4,
    config: { maxItems: 10 },
    metadata: {
      timing: 0.6,
      versatility: 0.7,
      bottleneck: ['優先順位がつけられない'],
    },
  };

  describe('Widget マウント/アンマウント', () => {
    test('EmotionPalette が正しくマウント/アンマウントできる', () => {
      const { unmount } = render(<EmotionPalette spec={emotionSpec} />);
      expect(screen.getByText('今の気持ちを選んでください')).toBeInTheDocument();
      unmount();
      expect(screen.queryByText('今の気持ちを選んでください')).not.toBeInTheDocument();
    });

    test('BrainstormCards が正しくマウント/アンマウントできる', () => {
      const { unmount } = render(<BrainstormCards spec={brainstormSpec} />);
      expect(screen.getByText('アイデアを自由に書き出してください')).toBeInTheDocument();
      unmount();
      expect(screen.queryByText('アイデアを自由に書き出してください')).not.toBeInTheDocument();
    });

    test('MatrixPlacement が正しくマウント/アンマウントできる', () => {
      const { unmount } = render(<MatrixPlacement spec={matrixSpec} />);
      expect(screen.getByText('アイテムをマトリックス上に配置してください')).toBeInTheDocument();
      unmount();
      expect(screen.queryByText('アイテムをマトリックス上に配置してください')).not.toBeInTheDocument();
    });

    test('PrioritySliderGrid が正しくマウント/アンマウントできる', () => {
      const { unmount } = render(<PrioritySliderGrid spec={prioritySpec} />);
      expect(screen.getByText('アイテムに優先度を設定してください')).toBeInTheDocument();
      unmount();
      expect(screen.queryByText('アイテムに優先度を設定してください')).not.toBeInTheDocument();
    });
  });

  describe('onUpdate コールバック', () => {
    test('EmotionPalette: 感情選択時にonUpdateが呼ばれる', () => {
      const onUpdate = vi.fn();
      render(<EmotionPalette spec={emotionSpec} onUpdate={onUpdate} />);

      const emotionButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(emotionButton);

      expect(onUpdate).toHaveBeenCalledWith(
        emotionSpec.id,
        expect.objectContaining({
          type: 'composite',
        })
      );
    });

    test('BrainstormCards: カード追加時にonUpdateが呼ばれる', () => {
      const onUpdate = vi.fn();
      render(<BrainstormCards spec={brainstormSpec} onUpdate={onUpdate} />);

      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      const addButton = screen.getByRole('button', { name: 'カードを追加' });

      fireEvent.change(input, { target: { value: 'テストカード' } });
      fireEvent.click(addButton);

      expect(onUpdate).toHaveBeenCalledWith(
        brainstormSpec.id,
        expect.objectContaining({
          type: 'text',
        })
      );
    });

    test('MatrixPlacement: アイテム追加時にonUpdateが呼ばれる', () => {
      const onUpdate = vi.fn();
      render(<MatrixPlacement spec={matrixSpec} onUpdate={onUpdate} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: 'テストタスク' } });
      fireEvent.click(addButton);

      expect(onUpdate).toHaveBeenCalledWith(
        matrixSpec.id,
        expect.objectContaining({
          type: 'mapping',
        })
      );
    });

    test('PrioritySliderGrid: アイテム追加時にonUpdateが呼ばれる', () => {
      const onUpdate = vi.fn();
      render(<PrioritySliderGrid spec={prioritySpec} onUpdate={onUpdate} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: 'テストタスク' } });
      fireEvent.click(addButton);

      expect(onUpdate).toHaveBeenCalledWith(
        prioritySpec.id,
        expect.objectContaining({
          type: 'ranking',
        })
      );
    });
  });

  describe('onComplete コールバック', () => {
    test('EmotionPalette: 完了時にonCompleteが呼ばれる', () => {
      const onComplete = vi.fn();
      render(<EmotionPalette spec={emotionSpec} onComplete={onComplete} />);

      // 感情を選択
      const emotionButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(emotionButton);

      // 完了ボタンをクリック
      const completeButton = screen.getByRole('button', { name: '選択を完了' });
      fireEvent.click(completeButton);

      expect(onComplete).toHaveBeenCalledWith(emotionSpec.id);
    });

    test('BrainstormCards: 完了時にonCompleteが呼ばれる', () => {
      const onComplete = vi.fn();
      render(<BrainstormCards spec={brainstormSpec} onComplete={onComplete} />);

      // カードを追加
      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      fireEvent.change(input, { target: { value: 'カード1' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 完了ボタンをクリック
      const completeButton = screen.getByRole('button', { name: '完了' });
      fireEvent.click(completeButton);

      expect(onComplete).toHaveBeenCalledWith(brainstormSpec.id);
    });

    test('MatrixPlacement: 完了時にonCompleteが呼ばれる', () => {
      const onComplete = vi.fn();
      render(<MatrixPlacement spec={matrixSpec} onComplete={onComplete} />);

      // アイテムを追加
      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 完了ボタンをクリック
      const completeButton = screen.getByRole('button', { name: '完了' });
      fireEvent.click(completeButton);

      expect(onComplete).toHaveBeenCalledWith(matrixSpec.id);
    });

    test('PrioritySliderGrid: 完了時にonCompleteが呼ばれる', () => {
      const onComplete = vi.fn();
      render(<PrioritySliderGrid spec={prioritySpec} onComplete={onComplete} />);

      // アイテムを追加
      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 完了ボタンをクリック
      const completeButton = screen.getByRole('button', { name: '完了' });
      fireEvent.click(completeButton);

      expect(onComplete).toHaveBeenCalledWith(prioritySpec.id);
    });
  });

  describe('WidgetResult生成', () => {
    test('EmotionPalette: composite型のWidgetResultを生成', () => {
      render(<EmotionPalette spec={emotionSpec} />);

      const emotionButton = screen.getByRole('radio', { name: /喜び/ });
      fireEvent.click(emotionButton);

      // Windowに登録されたgetResult関数を呼び出す
      const getResult = (window as any)[`widget_${emotionSpec.id}_getResult`];
      expect(getResult).toBeDefined();

      const result = getResult();
      expect(result.widgetId).toBe(emotionSpec.id);
      expect(result.component).toBe('emotion_palette');
      expect(result.data.type).toBe('composite');
      expect(result.data.composite?.emotion).toBeDefined();
    });

    test('BrainstormCards: text型のWidgetResultを生成', () => {
      render(<BrainstormCards spec={brainstormSpec} />);

      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      fireEvent.change(input, { target: { value: 'カード1' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const getResult = (window as any)[`widget_${brainstormSpec.id}_getResult`];
      const result = getResult();

      expect(result.widgetId).toBe(brainstormSpec.id);
      expect(result.component).toBe('brainstorm_cards');
      expect(result.data.type).toBe('text');
      expect(result.data.text?.items).toHaveLength(1);
    });

    test('MatrixPlacement: mapping型のWidgetResultを生成', () => {
      render(<MatrixPlacement spec={matrixSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const getResult = (window as any)[`widget_${matrixSpec.id}_getResult`];
      const result = getResult();

      expect(result.widgetId).toBe(matrixSpec.id);
      expect(result.component).toBe('matrix_placement');
      expect(result.data.type).toBe('mapping');
      expect(result.data.mapping?.items).toHaveLength(1);
    });

    test('PrioritySliderGrid: ranking型のWidgetResultを生成', () => {
      render(<PrioritySliderGrid spec={prioritySpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const getResult = (window as any)[`widget_${prioritySpec.id}_getResult`];
      const result = getResult();

      expect(result.widgetId).toBe(prioritySpec.id);
      expect(result.component).toBe('priority_slider_grid');
      expect(result.data.type).toBe('ranking');
      expect(result.data.ranking?.items).toHaveLength(1);
    });
  });

  describe('エラーハンドリング', () => {
    test('EmotionPalette: 感情未選択時の完了ボタンは無効', () => {
      render(<EmotionPalette spec={emotionSpec} />);

      const completeButton = screen.getByRole('button', { name: '選択を完了' });
      expect(completeButton).toBeDisabled();
    });

    test('BrainstormCards: カードなしでの完了ボタンは無効', () => {
      render(<BrainstormCards spec={brainstormSpec} />);

      const completeButton = screen.getByRole('button', { name: '完了' });
      expect(completeButton).toBeDisabled();
    });

    test('MatrixPlacement: アイテムなしでの完了ボタンは無効', () => {
      render(<MatrixPlacement spec={matrixSpec} />);

      const completeButton = screen.getByRole('button', { name: '完了' });
      expect(completeButton).toBeDisabled();
    });

    test('PrioritySliderGrid: アイテムなしでの完了ボタンは無効', () => {
      render(<PrioritySliderGrid spec={prioritySpec} />);

      const completeButton = screen.getByRole('button', { name: '完了' });
      expect(completeButton).toBeDisabled();
    });

    test('BrainstormCards: 最大数到達時の追加ボタン動作', () => {
      const limitSpec = { ...brainstormSpec, config: { maxCards: 2 } };
      render(<BrainstormCards spec={limitSpec} />);

      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      const addButton = screen.getByRole('button', { name: 'カードを追加' });

      // 2枚追加
      fireEvent.change(input, { target: { value: 'カード1' } });
      fireEvent.click(addButton);
      fireEvent.change(input, { target: { value: 'カード2' } });
      fireEvent.click(addButton);

      // カウンターが2/2になっていることを確認
      expect(screen.getByText(/2 \/ 2 カード/)).toBeInTheDocument();
    });
  });

  describe('複数Widget同時レンダリング', () => {
    test('複数のWidgetを同時にレンダリングできる', () => {
      const { container } = render(
        <>
          <EmotionPalette spec={emotionSpec} />
          <BrainstormCards spec={brainstormSpec} />
        </>
      );

      // containerにテキストが含まれていることを確認
      expect(container.textContent).toContain('今の気持ちを選んでください');
      expect(container.textContent).toContain('アイデアを自由に書き出してください');
    });

    test('4つのWidgetを同時にレンダリングできる', () => {
      const { container } = render(
        <>
          <EmotionPalette spec={emotionSpec} />
          <BrainstormCards spec={brainstormSpec} />
          <MatrixPlacement spec={matrixSpec} />
          <PrioritySliderGrid spec={prioritySpec} />
        </>
      );

      // containerにすべてのWidgetのテキストが含まれていることを確認
      expect(container.textContent).toContain('今の気持ちを選んでください');
      expect(container.textContent).toContain('アイデアを自由に書き出してください');
      expect(container.textContent).toContain('アイテムをマトリックス上に配置してください');
      expect(container.textContent).toContain('アイテムに優先度を設定してください');
    });
  });

  describe('config設定の反映', () => {
    test('EmotionPalette: デフォルトconfig', () => {
      const { container } = render(<EmotionPalette spec={emotionSpec} />);
      // 8つの感情が表示される（喜び、信頼、恐れ、驚き、悲しみ、嫌悪、怒り、期待）
      expect(container.textContent).toContain('喜び');
      expect(container.textContent).toContain('信頼');
      expect(container.textContent).toContain('恐れ');
      expect(container.textContent).toContain('驚き');
      expect(container.textContent).toContain('悲しみ');
      expect(container.textContent).toContain('嫌悪');
      expect(container.textContent).toContain('怒り');
      expect(container.textContent).toContain('期待');
    });

    test('BrainstormCards: maxCards設定が反映される', () => {
      const customSpec = { ...brainstormSpec, config: { maxCards: 5 } };
      render(<BrainstormCards spec={customSpec} />);
      expect(screen.getByText(/0 \/ 5 カード/)).toBeInTheDocument();
    });

    test('MatrixPlacement: 軸ラベル設定が反映される', () => {
      render(<MatrixPlacement spec={matrixSpec} />);
      expect(screen.getByText('重要度')).toBeInTheDocument();
      expect(screen.getByText('緊急度')).toBeInTheDocument();
    });

    test('PrioritySliderGrid: maxItems設定が反映される', () => {
      const customSpec = { ...prioritySpec, config: { maxItems: 15 } };
      render(<PrioritySliderGrid spec={customSpec} />);
      expect(screen.getByText(/0 \/ 15 アイテム/)).toBeInTheDocument();
    });
  });
});
