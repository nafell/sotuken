/**
 * MatrixPlacementController.ts
 * マトリックス配置Widgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * 2軸のマトリックス上にアイテムを配置するWidgetのコントローラー
 */

import type { WidgetResult, MappingItem } from '../../../../types/result.types';

/**
 * マトリックス軸の定義
 */
export interface MatrixAxis {
  id: string;
  label: string;
  lowLabel: string;
  highLabel: string;
}

/**
 * マトリックスアイテム
 */
export interface MatrixItem {
  id: string;
  label: string;
  position: {
    x: number; // 0.0 ~ 1.0
    y: number; // 0.0 ~ 1.0
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * MatrixPlacementの状態
 */
export interface MatrixPlacementState {
  xAxis: MatrixAxis;
  yAxis: MatrixAxis;
  items: MatrixItem[];
  maxItems?: number;
}

/**
 * MatrixPlacementController
 * マトリックス配置のロジック
 */
export class MatrixPlacementController {
  private state: MatrixPlacementState;
  private nextId: number = 1;

  constructor(initialState?: Partial<MatrixPlacementState>) {
    this.state = {
      xAxis: initialState?.xAxis || {
        id: 'x',
        label: '横軸',
        lowLabel: '低',
        highLabel: '高',
      },
      yAxis: initialState?.yAxis || {
        id: 'y',
        label: '縦軸',
        lowLabel: '低',
        highLabel: '高',
      },
      items: initialState?.items || [],
      maxItems: initialState?.maxItems || 20,
    };

    // 既存アイテムからnextIdを設定
    if (this.state.items.length > 0) {
      const maxId = Math.max(
        ...this.state.items.map((item) =>
          parseInt(item.id.replace('item_', ''), 10)
        )
      );
      this.nextId = maxId + 1;
    }
  }

  /**
   * アイテムを追加（デフォルト位置: 中央）
   */
  public addItem(label: string): MatrixItem {
    if (label.trim() === '') {
      throw new Error('Item label cannot be empty');
    }

    if (
      this.state.maxItems &&
      this.state.maxItems > 0 &&
      this.state.items.length >= this.state.maxItems
    ) {
      throw new Error(
        `Maximum number of items (${this.state.maxItems}) reached`
      );
    }

    const now = Date.now();
    const newItem: MatrixItem = {
      id: `item_${this.nextId++}`,
      label: label.trim(),
      position: { x: 0.5, y: 0.5 }, // 中央に配置
      createdAt: now,
      updatedAt: now,
    };

    this.state.items.push(newItem);
    return newItem;
  }

  /**
   * アイテムの位置を更新
   */
  public updateItemPosition(
    itemId: string,
    x: number,
    y: number
  ): void {
    // 範囲チェック
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      throw new Error('Position must be between 0 and 1');
    }

    const item = this.state.items.find((item) => item.id === itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    item.position.x = x;
    item.position.y = y;
    item.updatedAt = Date.now();
  }

  /**
   * アイテムを削除
   */
  public deleteItem(itemId: string): void {
    const index = this.state.items.findIndex((item) => item.id === itemId);
    if (index === -1) {
      throw new Error(`Item not found: ${itemId}`);
    }

    this.state.items.splice(index, 1);
  }

  /**
   * 全アイテムを取得
   */
  public getItems(): MatrixItem[] {
    return [...this.state.items];
  }

  /**
   * 象限別アイテム数を取得
   */
  public getQuadrantCounts(): {
    topRight: number;
    topLeft: number;
    bottomRight: number;
    bottomLeft: number;
  } {
    const counts = {
      topRight: 0,    // 高×高（重要かつ緊急）
      topLeft: 0,     // 低×高（緊急だが重要でない）
      bottomRight: 0, // 高×低（重要だが緊急でない）
      bottomLeft: 0,  // 低×低（重要でも緊急でもない）
    };

    this.state.items.forEach((item) => {
      const { x, y } = item.position;
      if (x > 0.5 && y > 0.5) {
        counts.topRight++;
      } else if (x <= 0.5 && y > 0.5) {
        counts.topLeft++;
      } else if (x > 0.5 && y <= 0.5) {
        counts.bottomRight++;
      } else {
        counts.bottomLeft++;
      }
    });

    return counts;
  }

  /**
   * 高優先度アイテムを取得（右上象限）
   */
  public getHighPriorityItems(): MatrixItem[] {
    return this.state.items.filter(
      (item) => item.position.x > 0.5 && item.position.y > 0.5
    );
  }

  /**
   * 現在の状態を取得
   */
  public getState(): MatrixPlacementState {
    return {
      xAxis: { ...this.state.xAxis },
      yAxis: { ...this.state.yAxis },
      items: [...this.state.items],
      maxItems: this.state.maxItems,
    };
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const count = this.state.items.length;

    if (count === 0) {
      return 'アイテムがまだ配置されていません';
    }

    const counts = this.getQuadrantCounts();
    const highPriority = counts.topRight;

    if (highPriority === 0) {
      return `${count}個のアイテムを配置（高優先度: なし）`;
    }

    return `${count}個のアイテムを配置（高優先度: ${highPriority}個）`;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    const mappingItems: MappingItem[] = this.state.items.map((item) => ({
      id: item.id,
      label: item.label,
      position: { ...item.position },
      metadata: {
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    }));

    return {
      widgetId,
      component: 'matrix_placement',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'mapping',
        mapping: {
          items: mappingItems,
          axes: {
            x: {
              label: this.state.xAxis.label,
              min: this.state.xAxis.lowLabel,
              max: this.state.xAxis.highLabel,
            },
            y: {
              label: this.state.yAxis.label,
              min: this.state.yAxis.lowLabel,
              max: this.state.yAxis.highLabel,
            },
          },
        },
      },
      interactions: [],
      metadata: {
        itemCount: this.state.items.length,
        maxItems: this.state.maxItems,
        quadrantCounts: this.getQuadrantCounts(),
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.items = [];
    this.nextId = 1;
  }
}
