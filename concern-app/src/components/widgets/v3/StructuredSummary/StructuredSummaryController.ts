/**
 * StructuredSummaryController.ts
 * 構造化文章まとめWidgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * 思考整理の結果を構造化して表示・編集するWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * サマリーセクションの種類
 */
export type SectionType =
  | 'situation'      // 現状
  | 'problem'        // 問題
  | 'goal'           // 目標
  | 'options'        // 選択肢
  | 'decision'       // 決断
  | 'action_items'   // アクションアイテム
  | 'concerns'       // 懸念点
  | 'next_steps'     // 次のステップ
  | 'custom';        // カスタム

/**
 * サマリーセクション
 */
export interface SummarySection {
  id: string;
  type: SectionType;
  title: string;
  content: string;
  items?: string[];  // リスト形式の場合
  order: number;
  isEditing?: boolean;
}

/**
 * StructuredSummaryの状態
 */
export interface StructuredSummaryState {
  title: string;
  sections: SummarySection[];
  conclusion: string;
}

/**
 * セクションタイプの設定
 */
export const SECTION_TYPE_CONFIG: Record<
  SectionType,
  { label: string; icon: string; color: string; placeholder: string }
> = {
  situation: {
    label: '現状',
    icon: '📍',
    color: '#3b82f6',
    placeholder: '現在の状況を記述...',
  },
  problem: {
    label: '問題',
    icon: '⚠️',
    color: '#ef4444',
    placeholder: '課題や問題点を記述...',
  },
  goal: {
    label: '目標',
    icon: '🎯',
    color: '#22c55e',
    placeholder: '達成したい目標を記述...',
  },
  options: {
    label: '選択肢',
    icon: '🔀',
    color: '#f59e0b',
    placeholder: '検討可能な選択肢を記述...',
  },
  decision: {
    label: '決断',
    icon: '✅',
    color: '#8b5cf6',
    placeholder: '決定事項を記述...',
  },
  action_items: {
    label: 'アクション',
    icon: '📋',
    color: '#06b6d4',
    placeholder: '具体的なアクションを記述...',
  },
  concerns: {
    label: '懸念点',
    icon: '🤔',
    color: '#ec4899',
    placeholder: '心配な点や考慮事項を記述...',
  },
  next_steps: {
    label: '次のステップ',
    icon: '👣',
    color: '#14b8a6',
    placeholder: '次に行うことを記述...',
  },
  custom: {
    label: 'その他',
    icon: '📝',
    color: '#6b7280',
    placeholder: '自由に記述...',
  },
};

/**
 * デフォルトのセクション構成
 */
export const DEFAULT_SECTIONS: Omit<SummarySection, 'id'>[] = [
  { type: 'situation', title: '現状', content: '', order: 1 },
  { type: 'problem', title: '課題', content: '', order: 2 },
  { type: 'goal', title: '目標', content: '', order: 3 },
  { type: 'decision', title: '決断', content: '', order: 4 },
  { type: 'action_items', title: 'アクションアイテム', content: '', items: [], order: 5 },
];

/**
 * StructuredSummaryController
 * 構造化文章まとめのロジック管理
 */
export class StructuredSummaryController {
  private state: StructuredSummaryState;
  private sectionIdCounter: number = 0;

  constructor(title: string = '思考整理のまとめ') {
    this.state = {
      title,
      sections: [],
      conclusion: '',
    };
    this.initializeDefaultSections();
  }

  /**
   * デフォルトセクションを初期化
   */
  private initializeDefaultSections(): void {
    DEFAULT_SECTIONS.forEach((section) => {
      this.addSection(section.type, section.title, section.content, section.items);
    });
  }

  /**
   * タイトルを設定
   */
  public setTitle(title: string): void {
    this.state.title = title;
  }

  /**
   * セクションを追加
   */
  public addSection(
    type: SectionType,
    title?: string,
    content: string = '',
    items?: string[]
  ): SummarySection {
    const config = SECTION_TYPE_CONFIG[type];
    const section: SummarySection = {
      id: `summary_section_${++this.sectionIdCounter}`,
      type,
      title: title || config.label,
      content,
      items: items ? [...items] : undefined,
      order: this.state.sections.length + 1,
    };
    this.state.sections.push(section);
    return section;
  }

  /**
   * セクションを更新
   */
  public updateSection(
    sectionId: string,
    updates: Partial<Omit<SummarySection, 'id'>>
  ): void {
    const section = this.state.sections.find((s) => s.id === sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }
    Object.assign(section, updates);
  }

  /**
   * セクションの内容を更新
   */
  public setSectionContent(sectionId: string, content: string): void {
    this.updateSection(sectionId, { content });
  }

  /**
   * セクションにアイテムを追加
   */
  public addSectionItem(sectionId: string, item: string): void {
    const section = this.state.sections.find((s) => s.id === sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }
    if (!section.items) {
      section.items = [];
    }
    section.items.push(item);
  }

  /**
   * セクションからアイテムを削除
   */
  public removeSectionItem(sectionId: string, itemIndex: number): void {
    const section = this.state.sections.find((s) => s.id === sectionId);
    if (!section || !section.items) {
      throw new Error(`Section not found or has no items: ${sectionId}`);
    }
    section.items.splice(itemIndex, 1);
  }

  /**
   * セクションを削除
   */
  public removeSection(sectionId: string): void {
    this.state.sections = this.state.sections.filter((s) => s.id !== sectionId);
    this.reorderSections();
  }

  /**
   * セクションの順序を変更
   */
  public moveSectionUp(sectionId: string): void {
    const index = this.state.sections.findIndex((s) => s.id === sectionId);
    if (index > 0) {
      const temp = this.state.sections[index];
      this.state.sections[index] = this.state.sections[index - 1];
      this.state.sections[index - 1] = temp;
      this.reorderSections();
    }
  }

  public moveSectionDown(sectionId: string): void {
    const index = this.state.sections.findIndex((s) => s.id === sectionId);
    if (index < this.state.sections.length - 1) {
      const temp = this.state.sections[index];
      this.state.sections[index] = this.state.sections[index + 1];
      this.state.sections[index + 1] = temp;
      this.reorderSections();
    }
  }

  /**
   * セクション順序を再計算
   */
  private reorderSections(): void {
    this.state.sections.forEach((section, index) => {
      section.order = index + 1;
    });
  }

  /**
   * 結論を設定
   */
  public setConclusion(conclusion: string): void {
    this.state.conclusion = conclusion;
  }

  /**
   * 現在の状態を取得
   */
  public getState(): StructuredSummaryState {
    return { ...this.state };
  }

  /**
   * 内容が十分かどうか
   */
  public isComplete(): boolean {
    // 少なくとも2つのセクションに内容がある
    const filledSections = this.state.sections.filter(
      (s) => s.content.trim() || (s.items && s.items.length > 0)
    );
    return filledSections.length >= 2;
  }

  /**
   * 総文字数を取得
   */
  public getTotalCharCount(): number {
    let count = this.state.title.length + this.state.conclusion.length;
    this.state.sections.forEach((section) => {
      count += section.title.length + section.content.length;
      if (section.items) {
        section.items.forEach((item) => {
          count += item.length;
        });
      }
    });
    return count;
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const filledSections = this.state.sections.filter(
      (s) => s.content.trim() || (s.items && s.items.length > 0)
    );

    if (filledSections.length === 0) {
      return 'まとめを作成してください';
    }

    return `「${this.state.title}」: ${filledSections.length}セクション、${this.getTotalCharCount()}文字`;
  }

  /**
   * プレーンテキスト形式でエクスポート
   */
  public exportAsPlainText(): string {
    let text = `# ${this.state.title}\n\n`;

    this.state.sections.forEach((section) => {
      const config = SECTION_TYPE_CONFIG[section.type];
      text += `## ${config.icon} ${section.title}\n`;
      if (section.content) {
        text += `${section.content}\n`;
      }
      if (section.items && section.items.length > 0) {
        section.items.forEach((item) => {
          text += `- ${item}\n`;
        });
      }
      text += '\n';
    });

    if (this.state.conclusion) {
      text += `## 結論\n${this.state.conclusion}\n`;
    }

    return text;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    return {
      widgetId,
      component: 'structured_summary',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'text',
        text: {
          content: this.exportAsPlainText(),
          structured: {
            title: this.state.title,
            sections: this.state.sections.map((s) => ({
              type: s.type,
              title: s.title,
              content: s.content,
              items: s.items,
            })),
            conclusion: this.state.conclusion,
          },
        },
        composite: {
          title: this.state.title,
          sections: this.state.sections,
          conclusion: this.state.conclusion,
          statistics: {
            sectionCount: this.state.sections.length,
            filledSectionCount: this.state.sections.filter(
              (s) => s.content.trim() || (s.items && s.items.length > 0)
            ).length,
            totalCharCount: this.getTotalCharCount(),
            actionItemCount: this.state.sections
              .filter((s) => s.type === 'action_items')
              .reduce((sum, s) => sum + (s.items?.length || 0), 0),
          },
        },
      },
      interactions: [],
      metadata: {
        sectionCount: this.state.sections.length,
        totalCharCount: this.getTotalCharCount(),
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.sections = [];
    this.state.conclusion = '';
    this.sectionIdCounter = 0;
    this.initializeDefaultSections();
  }
}
