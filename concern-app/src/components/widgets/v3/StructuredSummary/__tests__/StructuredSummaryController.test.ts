/**
 * StructuredSummaryController.test.ts
 * StructuredSummaryControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  StructuredSummaryController,
  DEFAULT_SECTIONS,
  SECTION_TYPE_CONFIG,
} from '../StructuredSummaryController';

describe('StructuredSummaryController', () => {
  let controller: StructuredSummaryController;

  beforeEach(() => {
    controller = new StructuredSummaryController();
  });

  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => {
      const state = controller.getState();

      expect(state.title).toBe('思考整理のまとめ');
      expect(state.sections).toHaveLength(DEFAULT_SECTIONS.length);
      expect(state.conclusion).toBe('');
    });

    test('カスタムタイトルで初期化できる', () => {
      const customController = new StructuredSummaryController('カスタムタイトル');
      const state = customController.getState();

      expect(state.title).toBe('カスタムタイトル');
    });

    test('デフォルトセクションが正しく初期化される', () => {
      const state = controller.getState();

      expect(state.sections[0].type).toBe('situation');
      expect(state.sections[1].type).toBe('problem');
      expect(state.sections[2].type).toBe('goal');
      expect(state.sections[3].type).toBe('decision');
      expect(state.sections[4].type).toBe('action_items');
    });
  });

  describe('タイトル設定', () => {
    test('タイトルを変更できる', () => {
      controller.setTitle('新しいタイトル');
      const state = controller.getState();

      expect(state.title).toBe('新しいタイトル');
    });
  });

  describe('セクション追加', () => {
    test('セクションを追加できる', () => {
      const initialCount = controller.getState().sections.length;
      const section = controller.addSection('concerns', '心配事');

      expect(section.type).toBe('concerns');
      expect(section.title).toBe('心配事');
      expect(controller.getState().sections).toHaveLength(initialCount + 1);
    });

    test('タイトルなしでもデフォルトラベルで追加できる', () => {
      const section = controller.addSection('options');

      expect(section.title).toBe(SECTION_TYPE_CONFIG.options.label);
    });

    test('内容付きで追加できる', () => {
      const section = controller.addSection('custom', 'カスタム', 'カスタム内容');

      expect(section.content).toBe('カスタム内容');
    });

    test('アイテム付きで追加できる', () => {
      const section = controller.addSection('next_steps', '次のステップ', '', [
        'ステップ1',
        'ステップ2',
      ]);

      expect(section.items).toHaveLength(2);
    });

    test('順序が正しく設定される', () => {
      const initialCount = controller.getState().sections.length;
      const section = controller.addSection('custom');

      expect(section.order).toBe(initialCount + 1);
    });
  });

  describe('セクション更新', () => {
    test('セクションの内容を更新できる', () => {
      const state = controller.getState();
      const sectionId = state.sections[0].id;

      controller.updateSection(sectionId, { content: '更新された内容' });

      const updatedState = controller.getState();
      expect(updatedState.sections[0].content).toBe('更新された内容');
    });

    test('セクションのタイトルを更新できる', () => {
      const state = controller.getState();
      const sectionId = state.sections[0].id;

      controller.updateSection(sectionId, { title: '新しいタイトル' });

      const updatedState = controller.getState();
      expect(updatedState.sections[0].title).toBe('新しいタイトル');
    });

    test('存在しないセクションの更新はエラー', () => {
      expect(() => {
        controller.updateSection('non_existent', { content: 'テスト' });
      }).toThrow('Section not found');
    });
  });

  describe('セクション内容設定', () => {
    test('setSectionContentで内容を更新できる', () => {
      const state = controller.getState();
      const sectionId = state.sections[0].id;

      controller.setSectionContent(sectionId, '直接設定した内容');

      const updatedState = controller.getState();
      expect(updatedState.sections[0].content).toBe('直接設定した内容');
    });
  });

  describe('セクションアイテム管理', () => {
    test('アイテムを追加できる', () => {
      const state = controller.getState();
      // action_itemsセクションを使用
      const actionSection = state.sections.find((s) => s.type === 'action_items');

      controller.addSectionItem(actionSection!.id, 'アクション1');
      controller.addSectionItem(actionSection!.id, 'アクション2');

      const updatedState = controller.getState();
      const updated = updatedState.sections.find((s) => s.type === 'action_items');
      expect(updated?.items).toHaveLength(2);
    });

    test('itemsがないセクションにもアイテムを追加できる', () => {
      const state = controller.getState();
      const situationSection = state.sections.find((s) => s.type === 'situation');

      controller.addSectionItem(situationSection!.id, '項目1');

      const updatedState = controller.getState();
      const updated = updatedState.sections.find((s) => s.type === 'situation');
      expect(updated?.items).toHaveLength(1);
    });

    test('存在しないセクションへのアイテム追加はエラー', () => {
      expect(() => {
        controller.addSectionItem('non_existent', 'アイテム');
      }).toThrow('Section not found');
    });

    test('アイテムを削除できる', () => {
      const state = controller.getState();
      const actionSection = state.sections.find((s) => s.type === 'action_items');

      controller.addSectionItem(actionSection!.id, 'アクション1');
      controller.addSectionItem(actionSection!.id, 'アクション2');
      controller.removeSectionItem(actionSection!.id, 0);

      const updatedState = controller.getState();
      const updated = updatedState.sections.find((s) => s.type === 'action_items');
      expect(updated?.items).toHaveLength(1);
      expect(updated?.items?.[0]).toBe('アクション2');
    });

    test('itemsがないセクションからの削除はエラー', () => {
      const state = controller.getState();
      const situationSection = state.sections.find((s) => s.type === 'situation');

      expect(() => {
        controller.removeSectionItem(situationSection!.id, 0);
      }).toThrow('Section not found or has no items');
    });
  });

  describe('セクション削除', () => {
    test('セクションを削除できる', () => {
      const state = controller.getState();
      const initialCount = state.sections.length;
      const sectionId = state.sections[0].id;

      controller.removeSection(sectionId);

      const updatedState = controller.getState();
      expect(updatedState.sections).toHaveLength(initialCount - 1);
    });

    test('削除後に順序が再計算される', () => {
      const state = controller.getState();
      controller.removeSection(state.sections[0].id);

      const updatedState = controller.getState();
      updatedState.sections.forEach((section, index) => {
        expect(section.order).toBe(index + 1);
      });
    });
  });

  describe('セクション順序変更', () => {
    test('セクションを上に移動できる', () => {
      const state = controller.getState();
      const secondSectionId = state.sections[1].id;
      const secondSectionType = state.sections[1].type;

      controller.moveSectionUp(secondSectionId);

      const updatedState = controller.getState();
      expect(updatedState.sections[0].type).toBe(secondSectionType);
    });

    test('最初のセクションは上に移動できない', () => {
      const state = controller.getState();
      const firstSectionId = state.sections[0].id;
      const firstSectionType = state.sections[0].type;

      controller.moveSectionUp(firstSectionId);

      const updatedState = controller.getState();
      expect(updatedState.sections[0].type).toBe(firstSectionType);
    });

    test('セクションを下に移動できる', () => {
      const state = controller.getState();
      const firstSectionId = state.sections[0].id;
      const firstSectionType = state.sections[0].type;

      controller.moveSectionDown(firstSectionId);

      const updatedState = controller.getState();
      expect(updatedState.sections[1].type).toBe(firstSectionType);
    });

    test('最後のセクションは下に移動できない', () => {
      const state = controller.getState();
      const lastIndex = state.sections.length - 1;
      const lastSectionId = state.sections[lastIndex].id;
      const lastSectionType = state.sections[lastIndex].type;

      controller.moveSectionDown(lastSectionId);

      const updatedState = controller.getState();
      expect(updatedState.sections[lastIndex].type).toBe(lastSectionType);
    });
  });

  describe('結論設定', () => {
    test('結論を設定できる', () => {
      controller.setConclusion('これが結論です');

      const state = controller.getState();
      expect(state.conclusion).toBe('これが結論です');
    });
  });

  describe('完了判定', () => {
    test('2つ以上のセクションに内容があれば完了', () => {
      const state = controller.getState();

      controller.setSectionContent(state.sections[0].id, '現状の説明');
      expect(controller.isComplete()).toBe(false);

      controller.setSectionContent(state.sections[1].id, '課題の説明');
      expect(controller.isComplete()).toBe(true);
    });

    test('アイテムも内容としてカウントされる', () => {
      const state = controller.getState();

      controller.setSectionContent(state.sections[0].id, '現状');
      const actionSection = state.sections.find((s) => s.type === 'action_items');
      controller.addSectionItem(actionSection!.id, 'アクション');

      expect(controller.isComplete()).toBe(true);
    });

    test('空白のみの内容はカウントされない', () => {
      const state = controller.getState();

      controller.setSectionContent(state.sections[0].id, '   ');
      controller.setSectionContent(state.sections[1].id, '   ');

      expect(controller.isComplete()).toBe(false);
    });
  });

  describe('文字数カウント', () => {
    test('総文字数を取得できる', () => {
      controller.setTitle('テスト'); // 3文字
      const state = controller.getState();
      controller.setSectionContent(state.sections[0].id, '内容'); // 2文字
      controller.setConclusion('結論'); // 2文字

      // タイトル(3) + セクションタイトルの合計 + 内容(2) + 結論(2)
      const charCount = controller.getTotalCharCount();
      expect(charCount).toBeGreaterThan(7);
    });

    test('アイテムも文字数に含まれる', () => {
      const beforeCount = controller.getTotalCharCount();

      const state = controller.getState();
      const actionSection = state.sections.find((s) => s.type === 'action_items');
      controller.addSectionItem(actionSection!.id, 'アイテム'); // 4文字

      expect(controller.getTotalCharCount()).toBe(beforeCount + 4);
    });
  });

  describe('サマリー生成', () => {
    test('内容がない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toBe('まとめを作成してください');
    });

    test('内容がある場合', () => {
      const state = controller.getState();
      controller.setSectionContent(state.sections[0].id, '現状の説明');
      controller.setSectionContent(state.sections[1].id, '課題の説明');

      const summary = controller.generateSummary();

      expect(summary).toContain('思考整理のまとめ');
      expect(summary).toContain('2セクション');
    });
  });

  describe('プレーンテキストエクスポート', () => {
    test('マークダウン形式でエクスポートできる', () => {
      const state = controller.getState();
      controller.setSectionContent(state.sections[0].id, '現状の説明');
      controller.setConclusion('最終的な結論');

      const text = controller.exportAsPlainText();

      expect(text).toContain('# 思考整理のまとめ');
      expect(text).toContain('現状の説明');
      expect(text).toContain('## 結論');
      expect(text).toContain('最終的な結論');
    });

    test('アイテムがリスト形式でエクスポートされる', () => {
      const state = controller.getState();
      const actionSection = state.sections.find((s) => s.type === 'action_items');
      controller.addSectionItem(actionSection!.id, 'アクション1');
      controller.addSectionItem(actionSection!.id, 'アクション2');

      const text = controller.exportAsPlainText();

      expect(text).toContain('- アクション1');
      expect(text).toContain('- アクション2');
    });
  });

  describe('WidgetResult生成', () => {
    test('基本的な結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('structured_summary');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('text');
    });

    test('セクション情報が含まれる', () => {
      const state = controller.getState();
      controller.setSectionContent(state.sections[0].id, 'テスト内容');

      const result = controller.getResult('widget_1');

      expect(result.data.text?.structured?.sections).toHaveLength(
        DEFAULT_SECTIONS.length
      );
      expect(result.data.composite?.statistics?.sectionCount).toBe(DEFAULT_SECTIONS.length);
    });

    test('統計情報が含まれる', () => {
      const state = controller.getState();
      controller.setSectionContent(state.sections[0].id, '内容');

      const result = controller.getResult('widget_1');

      expect(result.data.composite?.statistics?.filledSectionCount).toBe(1);
      expect(result.data.composite?.statistics?.totalCharCount).toBeGreaterThan(0);
    });

    test('メタデータが含まれる', () => {
      const result = controller.getResult('widget_1');

      expect(result.metadata?.sectionCount).toBe(DEFAULT_SECTIONS.length);
      expect(result.metadata?.totalCharCount).toBeDefined();
    });
  });

  describe('リセット', () => {
    test('リセット後はデフォルト状態に戻る', () => {
      const state = controller.getState();
      controller.setSectionContent(state.sections[0].id, '内容');
      controller.setConclusion('結論');
      controller.addSection('custom', 'カスタム');

      controller.reset();

      const resetState = controller.getState();
      expect(resetState.sections).toHaveLength(DEFAULT_SECTIONS.length);
      expect(resetState.conclusion).toBe('');
      expect(resetState.sections[0].content).toBe('');
    });
  });
});
