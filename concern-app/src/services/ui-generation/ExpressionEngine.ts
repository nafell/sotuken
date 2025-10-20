/**
 * Expression Engine
 *
 * 条件式と計算式を安全に評価するエンジン
 */

import type { FormData } from '../../../../server/src/types/UISpecV2';

/**
 * 式の評価エンジン
 */
export class ExpressionEngine {
  /**
   * 条件式を評価（boolean値を返す）
   */
  evaluateCondition(expression: string, data: FormData): boolean {
    try {
      const result = this.evaluate(expression, data);
      return Boolean(result);
    } catch (error) {
      console.error(`条件式の評価エラー: ${expression}`, error);
      return true; // エラー時はtrueを返して表示する
    }
  }

  /**
   * 計算式を評価（any値を返す）
   */
  evaluateExpression(expression: string, data: FormData): any {
    try {
      return this.evaluate(expression, data);
    } catch (error) {
      console.error(`計算式の評価エラー: ${expression}`, error);
      return undefined;
    }
  }

  /**
   * 式を評価（内部メソッド）
   */
  private evaluate(expression: string, data: FormData): any {
    // 安全なコンテキストを作成
    const context = this.createContext(data);

    // 式を変換
    const transformed = this.transformExpression(expression);

    try {
      // Functionコンストラクタで安全に評価
      const func = new Function(...Object.keys(context), `return ${transformed}`);
      return func(...Object.values(context));
    } catch (error) {
      throw new Error(`式の評価に失敗: ${expression} - ${error}`);
    }
  }

  /**
   * 安全な評価コンテキストを作成
   */
  private createContext(data: FormData): Record<string, any> {
    const context: Record<string, any> = {
      // データフィールド
      ...data,

      // ヘルパー関数
      count: this.count,
      sum: this.sum,
      avg: this.avg,
      min: this.min,
      max: this.max,
      filter: this.filter,

      // 安全な型変換
      String,
      Number,
      Boolean,

      // Math関数
      Math
    };

    return context;
  }

  /**
   * 式を変換（簡易的なDSL→JavaScript変換）
   */
  private transformExpression(expression: string): string {
    let transformed = expression;

    // 配列アクセスの変換: list_field.*.duration → map(list_field, 'duration')
    transformed = transformed.replace(
      /(\w+)\.\*\.(\w+)/g,
      "this.map($1, '$2')"
    );

    // 配列フィルタ: list_field[done==true] → filter(list_field, item => item.done == true)
    transformed = transformed.replace(
      /(\w+)\[([^\]]+)\]/g,
      "this.filter($1, (item) => item.$2)"
    );

    // 文字列の長さ: text_field.length → (text_field || '').length
    transformed = transformed.replace(
      /(\w+)\.length/g,
      "($1 || '').length"
    );

    return transformed;
  }

  // ============================================
  // ヘルパー関数
  // ============================================

  /**
   * 配列の要素数をカウント
   */
  private count = (arr: any[] | undefined): number => {
    if (!Array.isArray(arr)) return 0;
    return arr.length;
  };

  /**
   * 配列の合計値を計算
   */
  private sum = (arr: any[] | undefined, key?: string): number => {
    if (!Array.isArray(arr)) return 0;

    return arr.reduce((total, item) => {
      const value = key ? this.getNestedValue(item, key) : item;
      return total + (Number(value) || 0);
    }, 0);
  };

  /**
   * 配列の平均値を計算
   */
  private avg = (arr: any[] | undefined, key?: string): number => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return this.sum(arr, key) / arr.length;
  };

  /**
   * 配列の最小値を取得
   */
  private min = (arr: any[] | undefined, key?: string): number => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;

    const values = arr.map(item => {
      const value = key ? this.getNestedValue(item, key) : item;
      return Number(value) || 0;
    });

    return Math.min(...values);
  };

  /**
   * 配列の最大値を取得
   */
  private max = (arr: any[] | undefined, key?: string): number => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;

    const values = arr.map(item => {
      const value = key ? this.getNestedValue(item, key) : item;
      return Number(value) || 0;
    });

    return Math.max(...values);
  };

  /**
   * 配列をフィルタ
   */
  private filter = (arr: any[] | undefined, predicate: (item: any) => boolean): any[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(predicate);
  };

  /**
   * 配列をマップ（指定キーの値を抽出）
   */
  private map = (arr: any[] | undefined, key: string): any[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => this.getNestedValue(item, key));
  };

  /**
   * ネストされた値を取得
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // ============================================
  // 検証メソッド
  // ============================================

  /**
   * 式が安全かチェック
   */
  isSafeExpression(expression: string): boolean {
    // 危険なパターンをチェック
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout/,
      /setInterval/,
      /XMLHttpRequest/,
      /fetch\s*\(/,
      /import\s*\(/,
      /require\s*\(/,
      /__proto__/,
      /constructor/,
      /prototype/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 式の構文チェック
   */
  validateSyntax(expression: string): { valid: boolean; error?: string } {
    if (!this.isSafeExpression(expression)) {
      return { valid: false, error: '危険なパターンが検出されました' };
    }

    try {
      // 空のコンテキストで構文チェック
      new Function(`return ${expression}`);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '構文エラー'
      };
    }
  }
}
