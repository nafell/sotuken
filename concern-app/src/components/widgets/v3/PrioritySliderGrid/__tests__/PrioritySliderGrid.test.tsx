/**
 * PrioritySliderGrid.test.tsx
 * PrioritySliderGridコンポーネントのテスト
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrioritySliderGrid } from '../PrioritySliderGrid';
import type { WidgetSpecObject } from '../../../../../types/widget.types';

describe('PrioritySliderGrid Component', () => {
  const mockSpec: WidgetSpecObject = {
    id: 'priority_widget_1',
    component: 'priority_slider_grid',
    position: 1,
    config: {
      maxItems: 20,
    },
    metadata: {
      timing: 0.6,
      versatility: 0.7,
      bottleneck: ['優先順位がつけられない', '選択肢が多すぎる'],
    },
  };

  describe('レンダリング', () => {
    test('コンポーネントがレンダリングされる', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      expect(
        screen.getByText('アイテムに優先度を設定してください')
      ).toBeInTheDocument();
    });

    test('アイテムカウンターが表示される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      expect(screen.getByText(/0 \/ 20 アイテム/)).toBeInTheDocument();
    });

    test('新規アイテム入力フォームが表示される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      expect(input).toBeInTheDocument();
    });

    test('初期状態では完了ボタンが無効化されている', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const completeButton = screen.getByRole('button', { name: '完了' });
      expect(completeButton).toBeDisabled();
    });

    test('初期状態では空状態メッセージが表示される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      expect(
        screen.getByText('アイテムを追加して優先度を設定しましょう')
      ).toBeInTheDocument();
    });
  });

  describe('アイテム追加', () => {
    test('テキストを入力してアイテムを追加できる', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: '新しいタスク' } });
      fireEvent.click(addButton);

      expect(screen.getByText('新しいタスク')).toBeInTheDocument();
    });

    test('Enterキーでアイテムを追加できる', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');

      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(screen.getByText('タスク')).toBeInTheDocument();
    });

    test('アイテム追加後にカウンターが更新される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.click(addButton);

      expect(screen.getByText(/1 \/ 20 アイテム/)).toBeInTheDocument();
    });

    test('アイテム追加後に入力フィールドがクリアされる', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText(
        '新しいアイテムを入力...'
      ) as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.click(addButton);

      expect(input.value).toBe('');
    });

    test('空文字列では追加ボタンが無効化される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      expect(addButton).toBeDisabled();
    });

    test('アイテム追加後にランク番号が表示される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.click(addButton);

      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    test('onUpdateコールバックが呼ばれる', () => {
      const onUpdate = vi.fn();
      render(<PrioritySliderGrid spec={mockSpec} onUpdate={onUpdate} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.click(addButton);

      expect(onUpdate).toHaveBeenCalledWith(
        mockSpec.id,
        expect.objectContaining({
          type: 'ranking',
        })
      );
    });
  });

  describe('優先度スライダー', () => {
    test('アイテムに優先度スライダーが表示される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });

    test('初期優先度は50%', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('50');
    });

    test('スライダーを動かすと優先度が変更される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '80' } });

      // 優先度ラベル内の80%をチェック
      const priorityLabel = screen.getByText(/優先度:/);
      expect(priorityLabel.textContent).toContain('80%');
    });
  });

  describe('削除機能', () => {
    test('削除ボタンが表示される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'テストタスク' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const deleteButton = screen.getByRole('button', {
        name: 'テストタスクを削除',
      });
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('統計情報', () => {
    test('アイテムがない場合は統計が表示されない', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      expect(screen.queryByText('平均優先度')).not.toBeInTheDocument();
    });

    test('アイテムがある場合は統計が表示される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.getByText('平均優先度')).toBeInTheDocument();
      expect(screen.getByText('高優先度')).toBeInTheDocument();
      expect(screen.getByText('中優先度')).toBeInTheDocument();
      expect(screen.getByText('低優先度')).toBeInTheDocument();
    });
  });

  describe('完了処理', () => {
    test('アイテムがある場合は完了ボタンが有効化される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const completeButton = screen.getByRole('button', { name: '完了' });
      expect(completeButton).not.toBeDisabled();
    });

    test('完了ボタンをクリックするとonCompleteが呼ばれる', () => {
      const onComplete = vi.fn();
      render(<PrioritySliderGrid spec={mockSpec} onComplete={onComplete} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const completeButton = screen.getByRole('button', { name: '完了' });
      fireEvent.click(completeButton);

      expect(onComplete).toHaveBeenCalledWith(mockSpec.id);
    });
  });

  describe('サマリー表示', () => {
    test('アイテムがない場合はサマリーが表示されない', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('アイテムがある場合はサマリーが表示される', () => {
      render(<PrioritySliderGrid spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const summary = screen.getByRole('status');
      expect(summary).toBeInTheDocument();
      expect(summary).toHaveTextContent('アイテム');
    });
  });
});
