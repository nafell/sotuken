/**
 * TradeoffBalanceController.ts
 * トレードオフ天秤Widgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * 2つの選択肢の重み付けを視覚化するWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * 天秤の項目
 */
export interface BalanceItem {
  id: string;
  text: string;
  weight: number; // 0-100
  side: 'left' | 'right';
}

/**
 * TradeoffBalanceの状態
 */
export interface TradeoffBalanceState {
  leftLabel: string;
  rightLabel: string;
  items: BalanceItem[];
  balanceScore: number; // -100 to 100 (negative = left, positive = right)
}

/**
 * TradeoffBalanceController
 * トレードオフ天秤のロジック管理
 */
export class TradeoffBalanceController {
  private state: TradeoffBalanceState;
  private itemIdCounter: number = 0;

  constructor(leftLabel: string = '選択肢A', rightLabel: string = '選択肢B') {
    this.state = {
      leftLabel,
      rightLabel,
      items: [],
      balanceScore: 0,
    };
  }

  /**
   * ラベルを設定
   */
  public setLabels(leftLabel: string, rightLabel: string): void {
    this.state.leftLabel = leftLabel;
    this.state.rightLabel = rightLabel;
  }

  /**
   * 項目を追加
   */
  public addItem(text: string, side: 'left' | 'right', weight: number = 50): BalanceItem {
    const item: BalanceItem = {
      id: `balance_item_${++this.itemIdCounter}`,
      text,
      weight: Math.max(0, Math.min(100, weight)),
      side,
    };
    this.state.items.push(item);
    this.recalculateBalance();
    return item;
  }

  /**
   * 項目を更新
   */
  public updateItem(
    itemId: string,
    updates: Partial<Omit<BalanceItem, 'id'>>
  ): void {
    const item = this.state.items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }
    if (updates.weight !== undefined) {
      updates.weight = Math.max(0, Math.min(100, updates.weight));
    }
    Object.assign(item, updates);
    this.recalculateBalance();
  }

  /**
   * 項目の重みを更新
   */
  public setItemWeight(itemId: string, weight: number): void {
    this.updateItem(itemId, { weight });
  }

  /**
   * 項目を削除
   */
  public removeItem(itemId: string): void {
    this.state.items = this.state.items.filter((i) => i.id !== itemId);
    this.recalculateBalance();
  }

  /**
   * 側の項目を取得
   */
  public getItemsBySide(side: 'left' | 'right'): BalanceItem[] {
    return this.state.items.filter((i) => i.side === side);
  }

  /**
   * バランススコアを再計算
   */
  private recalculateBalance(): void {
    const leftItems = this.getItemsBySide('left');
    const rightItems = this.getItemsBySide('right');

    const leftTotal = leftItems.reduce((sum, item) => sum + item.weight, 0);
    const rightTotal = rightItems.reduce((sum, item) => sum + item.weight, 0);

    const total = leftTotal + rightTotal;
    if (total === 0) {
      this.state.balanceScore = 0;
    } else {
      // -100（完全に左）から100（完全に右）の範囲
      this.state.balanceScore = Math.round(
        ((rightTotal - leftTotal) / total) * 100
      );
    }
  }

  /**
   * バランススコアを取得
   */
  public getBalanceScore(): number {
    return this.state.balanceScore;
  }

  /**
   * 傾きの方向を取得
   */
  public getBalanceDirection(): 'left' | 'right' | 'balanced' {
    if (Math.abs(this.state.balanceScore) < 10) return 'balanced';
    return this.state.balanceScore < 0 ? 'left' : 'right';
  }

  /**
   * 傾きの角度を取得（視覚化用）
   */
  public getTiltAngle(): number {
    // -15度から15度の範囲
    return (this.state.balanceScore / 100) * 15;
  }

  /**
   * 側の合計を取得
   */
  public getSideTotal(side: 'left' | 'right'): number {
    return this.getItemsBySide(side).reduce((sum, item) => sum + item.weight, 0);
  }

  /**
   * 現在の状態を取得
   */
  public getState(): TradeoffBalanceState {
    return { ...this.state };
  }

  /**
   * 判断の推奨を取得
   */
  public getRecommendation(): string {
    const score = this.state.balanceScore;
    const direction = this.getBalanceDirection();

    if (direction === 'balanced') {
      return '両方の選択肢がほぼ均衡しています。追加の視点を検討してみてください。';
    }

    const winner = direction === 'left' ? this.state.leftLabel : this.state.rightLabel;
    const strength =
      Math.abs(score) > 50 ? '大きく' : Math.abs(score) > 25 ? 'やや' : 'わずかに';

    return `「${winner}」が${strength}優勢です。`;
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const leftTotal = this.getSideTotal('left');
    const rightTotal = this.getSideTotal('right');
    const direction = this.getBalanceDirection();

    if (this.state.items.length === 0) {
      return '項目を追加して比較してください';
    }

    if (direction === 'balanced') {
      return `${this.state.leftLabel} と ${this.state.rightLabel} は均衡（左:${leftTotal} / 右:${rightTotal}）`;
    }

    const winner =
      direction === 'left' ? this.state.leftLabel : this.state.rightLabel;
    return `「${winner}」が優勢（左:${leftTotal} / 右:${rightTotal}）`;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    const leftItems = this.getItemsBySide('left');
    const rightItems = this.getItemsBySide('right');

    return {
      widgetId,
      component: 'tradeoff_balance',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'composite',
        composite: {
          leftLabel: this.state.leftLabel,
          rightLabel: this.state.rightLabel,
          leftItems: leftItems.map((i) => ({
            text: i.text,
            weight: i.weight,
          })),
          rightItems: rightItems.map((i) => ({
            text: i.text,
            weight: i.weight,
          })),
          leftTotal: this.getSideTotal('left'),
          rightTotal: this.getSideTotal('right'),
          balanceScore: this.state.balanceScore,
          balanceDirection: this.getBalanceDirection(),
          tiltAngle: this.getTiltAngle(),
          recommendation: this.getRecommendation(),
        },
        ranking: {
          items: this.state.items
            .map((item) => ({
              id: item.id,
              label: `[${item.side === 'left' ? this.state.leftLabel : this.state.rightLabel}] ${item.text}`,
              score: item.weight,
              metadata: { side: item.side },
            }))
            .sort((a, b) => b.score - a.score),
        },
      },
      interactions: [],
      metadata: {
        itemCount: this.state.items.length,
        leftCount: leftItems.length,
        rightCount: rightItems.length,
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.items = [];
    this.state.balanceScore = 0;
    this.itemIdCounter = 0;
  }
}
