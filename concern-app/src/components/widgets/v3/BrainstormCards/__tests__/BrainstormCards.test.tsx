/**
 * BrainstormCards.test.tsx
 * BrainstormCardsコンポーネントのテスト
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrainstormCards } from '../BrainstormCards';
import type { WidgetSpecObject } from '../../../../../types/widget.types';

describe('BrainstormCards Component', () => {
  const mockSpec: WidgetSpecObject = {
    id: 'brainstorm_widget_1',
    component: 'brainstorm_cards',
    position: 1,
    config: { maxCards: 20 },
    metadata: {
      timing: 0.2,
      versatility: 0.9,
      bottleneck: ['情報が整理されていない'],
    },
  };

  describe('レンダリング', () => {
    test('コンポーネントがレンダリングされる', () => {
      render(<BrainstormCards spec={mockSpec} />);

      expect(
        screen.getByText('アイデアを自由に書き出してください')
      ).toBeInTheDocument();
    });

    test('カウンターが表示される', () => {
      render(<BrainstormCards spec={mockSpec} />);

      expect(screen.getByText(/0 \/ 20 カード/)).toBeInTheDocument();
    });

    test('新規カード入力フォームが表示される', () => {
      render(<BrainstormCards spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      expect(input).toBeInTheDocument();
    });

    test('初期状態では完了ボタンが無効化されている', () => {
      render(<BrainstormCards spec={mockSpec} />);

      const completeButton = screen.getByRole('button', { name: '完了' });
      expect(completeButton).toBeDisabled();
    });
  });

  describe('カード追加', () => {
    test('テキストを入力してカードを追加できる', () => {
      render(<BrainstormCards spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      const addButton = screen.getByRole('button', { name: 'カードを追加' });

      fireEvent.change(input, { target: { value: '新しいアイデア' } });
      fireEvent.click(addButton);

      expect(screen.getByText('新しいアイデア')).toBeInTheDocument();
    });

    test('Enterキーでカードを追加できる', () => {
      render(<BrainstormCards spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイデアを入力...');

      fireEvent.change(input, { target: { value: 'アイデア' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(screen.getByText('アイデア')).toBeInTheDocument();
    });

    test('カード追加後にカウンターが更新される', () => {
      render(<BrainstormCards spec={mockSpec} />);

      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      const addButton = screen.getByRole('button', { name: 'カードを追加' });

      fireEvent.change(input, { target: { value: 'アイデア1' } });
      fireEvent.click(addButton);

      expect(screen.getByText(/1 \/ 20 カード/)).toBeInTheDocument();
    });

    test('カード追加後に入力フィールドがクリアされる', () => {
      render(<BrainstormCards spec={mockSpec} />);

      const input = screen.getByPlaceholderText(
        '新しいアイデアを入力...'
      ) as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: 'カードを追加' });

      fireEvent.change(input, { target: { value: 'アイデア' } });
      fireEvent.click(addButton);

      expect(input.value).toBe('');
    });

    test('空文字列では追加ボタンが無効化される', () => {
      render(<BrainstormCards spec={mockSpec} />);

      const addButton = screen.getByRole('button', { name: 'カードを追加' });

      expect(addButton).toBeDisabled();
    });

    test('onUpdateコールバックが呼ばれる', () => {
      const onUpdate = vi.fn();
      render(<BrainstormCards spec={mockSpec} onUpdate={onUpdate} />);

      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      const addButton = screen.getByRole('button', { name: 'カードを追加' });

      fireEvent.change(input, { target: { value: 'アイデア' } });
      fireEvent.click(addButton);

      expect(onUpdate).toHaveBeenCalledWith(
        mockSpec.id,
        expect.objectContaining({
          type: 'text',
        })
      );
    });
  });

  describe('カード編集', () => {
    test('カードの編集ボタンをクリックすると編集モードになる', () => {
      render(<BrainstormCards spec={mockSpec} />);

      // カードを追加
      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      fireEvent.change(input, { target: { value: 'テストアイデア' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 編集ボタンをクリック
      const editButton = screen.getByRole('button', {
        name: /テストアイデア.*を編集/,
      });
      fireEvent.click(editButton);

      // 編集用入力フィールドが表示される
      const editInput = screen.getByLabelText('カードを編集');
      expect(editInput).toBeInTheDocument();
    });

    test('編集して保存できる', () => {
      render(<BrainstormCards spec={mockSpec} />);

      // カードを追加
      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      fireEvent.change(input, { target: { value: '元のテキスト' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 編集開始
      const editButton = screen.getByRole('button', {
        name: /元のテキスト.*を編集/,
      });
      fireEvent.click(editButton);

      // テキストを変更
      const editInput = screen.getByLabelText('カードを編集');
      fireEvent.change(editInput, { target: { value: '編集後のテキスト' } });

      // 保存
      const saveButton = screen.getByRole('button', { name: '保存' });
      fireEvent.click(saveButton);

      // 新しいテキストが表示される
      expect(screen.getByText('編集後のテキスト')).toBeInTheDocument();
      expect(screen.queryByText('元のテキスト')).not.toBeInTheDocument();
    });

    test('編集をキャンセルできる', () => {
      render(<BrainstormCards spec={mockSpec} />);

      // カードを追加
      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      fireEvent.change(input, { target: { value: '元のテキスト' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 編集開始
      const editButton = screen.getByRole('button', {
        name: /元のテキスト.*を編集/,
      });
      fireEvent.click(editButton);

      // テキストを変更
      const editInput = screen.getByLabelText('カードを編集');
      fireEvent.change(editInput, { target: { value: '変更されたテキスト' } });

      // キャンセル
      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      fireEvent.click(cancelButton);

      // 元のテキストが表示される
      expect(screen.getByText('元のテキスト')).toBeInTheDocument();
      expect(screen.queryByText('変更されたテキスト')).not.toBeInTheDocument();
    });
  });

  describe('カード削除', () => {
    test('削除ボタンが表示される', () => {
      render(<BrainstormCards spec={mockSpec} />);

      // カードを追加
      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      fireEvent.change(input, { target: { value: 'テストアイデア' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 削除ボタンが表示される
      const deleteButton = screen.getByRole('button', {
        name: /テストアイデア.*を削除/,
      });
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('完了処理', () => {
    test('カードがある場合は完了ボタンが有効化される', () => {
      render(<BrainstormCards spec={mockSpec} />);

      // カードを追加
      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      fireEvent.change(input, { target: { value: 'アイデア' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 完了ボタンが有効化される
      const completeButton = screen.getByRole('button', { name: '完了' });
      expect(completeButton).not.toBeDisabled();
    });

    test('完了ボタンをクリックするとonCompleteが呼ばれる', () => {
      const onComplete = vi.fn();
      render(<BrainstormCards spec={mockSpec} onComplete={onComplete} />);

      // カードを追加
      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      fireEvent.change(input, { target: { value: 'アイデア' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 完了ボタンをクリック
      const completeButton = screen.getByRole('button', { name: '完了' });
      fireEvent.click(completeButton);

      expect(onComplete).toHaveBeenCalledWith(mockSpec.id);
    });
  });

  describe('サマリー表示', () => {
    test('カードがない場合はサマリーが表示されない', () => {
      render(<BrainstormCards spec={mockSpec} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('カードがある場合はサマリーが表示される', () => {
      render(<BrainstormCards spec={mockSpec} />);

      // カードを追加
      const input = screen.getByPlaceholderText('新しいアイデアを入力...');
      fireEvent.change(input, { target: { value: 'アイデア' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      const summary = screen.getByRole('status');
      expect(summary).toBeInTheDocument();
      expect(summary).toHaveTextContent('アイデア');
    });
  });
});
