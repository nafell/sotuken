/**
 * MatrixPlacement.test.tsx
 * MatrixPlacementコンポーネントのテスト
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatrixPlacement } from '../MatrixPlacement';
import type { WidgetSpecObject } from '../../../../../types/widget.types';

describe('MatrixPlacement Component', () => {
  const mockSpec: WidgetSpecObject = {
    id: 'matrix_widget_1',
    component: 'matrix_placement',
    position: 1,
    config: {
      xAxisLabel: '重要度',
      yAxisLabel: '緊急度',
      maxItems: 20,
    },
    metadata: {
      timing: 0.3,
      versatility: 0.7,
      bottleneck: ['選択肢が多すぎる'],
    },
  };

  describe('レンダリング', () => {
    test('コンポーネントがレンダリングされる', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      expect(
        screen.getByText('アイテムをマトリックス上に配置してください')
      ).toBeInTheDocument();
    });

    test('マトリックスグリッドが表示される', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      const matrix = screen.getByRole('grid');
      expect(matrix).toBeInTheDocument();
    });

    test('軸ラベルが表示される', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      expect(screen.getByText('重要度')).toBeInTheDocument();
      expect(screen.getByText('緊急度')).toBeInTheDocument();
    });

    test('アイテムカウンターが表示される', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      expect(screen.getByText(/0 \/ 20 アイテム/)).toBeInTheDocument();
    });

    test('新規アイテム入力フォームが表示される', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      expect(input).toBeInTheDocument();
    });

    test('初期状態では完了ボタンが無効化されている', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      const completeButton = screen.getByRole('button', { name: '完了' });
      expect(completeButton).toBeDisabled();
    });
  });

  describe('アイテム追加', () => {
    test('テキストを入力してアイテムを追加できる', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: '新しいタスク' } });
      fireEvent.click(addButton);

      expect(screen.getByText('新しいタスク')).toBeInTheDocument();
    });

    test('Enterキーでアイテムを追加できる', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');

      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(screen.getByText('タスク')).toBeInTheDocument();
    });

    test('アイテム追加後にカウンターが更新される', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: 'タスク1' } });
      fireEvent.click(addButton);

      expect(screen.getByText(/1 \/ 20 アイテム/)).toBeInTheDocument();
    });

    test('アイテム追加後に入力フィールドがクリアされる', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      const input = screen.getByPlaceholderText(
        '新しいアイテムを入力...'
      ) as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.click(addButton);

      expect(input.value).toBe('');
    });

    test('空文字列では追加ボタンが無効化される', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      expect(addButton).toBeDisabled();
    });

    test('onUpdateコールバックが呼ばれる', () => {
      const onUpdate = vi.fn();
      render(<MatrixPlacement spec={mockSpec} onUpdate={onUpdate} />);

      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      const addButton = screen.getByRole('button', { name: 'アイテムを追加' });

      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.click(addButton);

      expect(onUpdate).toHaveBeenCalledWith(
        mockSpec.id,
        expect.objectContaining({
          type: 'mapping',
        })
      );
    });
  });

  describe('アイテム削除', () => {
    test('削除ボタンが表示される', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      // アイテムを追加
      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'テストタスク' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 削除ボタンが表示される
      const deleteButton = screen.getByRole('button', {
        name: 'テストタスクを削除',
      });
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('完了処理', () => {
    test('アイテムがある場合は完了ボタンが有効化される', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      // アイテムを追加
      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 完了ボタンが有効化される
      const completeButton = screen.getByRole('button', { name: '完了' });
      expect(completeButton).not.toBeDisabled();
    });

    test('完了ボタンをクリックするとonCompleteが呼ばれる', () => {
      const onComplete = vi.fn();
      render(<MatrixPlacement spec={mockSpec} onComplete={onComplete} />);

      // アイテムを追加
      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 完了ボタンをクリック
      const completeButton = screen.getByRole('button', { name: '完了' });
      fireEvent.click(completeButton);

      expect(onComplete).toHaveBeenCalledWith(mockSpec.id);
    });
  });

  describe('サマリー表示', () => {
    test('アイテムがない場合はサマリーが表示されない', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('アイテムがある場合はサマリーが表示される', () => {
      render(<MatrixPlacement spec={mockSpec} />);

      // アイテムを追加
      const input = screen.getByPlaceholderText('新しいアイテムを入力...');
      fireEvent.change(input, { target: { value: 'タスク' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const summary = screen.getByRole('status');
      expect(summary).toBeInTheDocument();
      expect(summary).toHaveTextContent('アイテム');
    });
  });
});
