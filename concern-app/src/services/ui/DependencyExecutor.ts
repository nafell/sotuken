/**
 * DependencyExecutor.ts
 * 依存関係の実行エンジン
 *
 * Phase 4 - DSL v3
 * JavaScriptスニペットの安全な実行、組み込み変換関数の実行、バリデーション処理を担当
 */

import type {
  DependencySpec,
  RelationshipSpec,
  TransformFunction,
} from '../../types/ui-spec.types';
import type {
  UpdateResult,
  TransformResult,
  ValidationResult,
} from '../../types/dependency.types';
import type { RankingItem, MappingItem } from '../../types/result.types';

/**
 * DependencyExecutor
 * 依存関係の変換・実行を担当
 */
export class DependencyExecutor {
  /**
   * 依存関係を実行
   */
  public execute(dependency: DependencySpec, sourceValue: any): UpdateResult {
    try {
      if (dependency.mechanism === 'validate') {
        return this.executeValidation(dependency, sourceValue);
      } else {
        return this.executeUpdate(dependency, sourceValue);
      }
    } catch (error) {
      console.error('Dependency execution failed:', error);
      return {
        type: 'validation_error',
        target: dependency.target,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validation実行
   */
  private executeValidation(
    dependency: DependencySpec,
    sourceValue: any
  ): UpdateResult {
    const result = this.executeTransform(dependency.relationship, sourceValue);

    // 変換結果がbooleanの場合はバリデーション結果として扱う
    if (typeof result.value === 'boolean') {
      if (!result.value) {
        return {
          type: 'validation_error',
          target: dependency.target,
          message: `Validation failed for ${dependency.target}`,
        };
      }
    }

    if (!result.success) {
      return {
        type: 'validation_error',
        target: dependency.target,
        message: result.error || 'Validation failed',
      };
    }

    return {
      type: 'update',
      target: dependency.target,
      value: sourceValue,
    };
  }

  /**
   * Update実行
   */
  private executeUpdate(
    dependency: DependencySpec,
    sourceValue: any
  ): UpdateResult {
    const result = this.executeTransform(dependency.relationship, sourceValue);

    if (!result.success) {
      return {
        type: 'validation_error',
        target: dependency.target,
        message: result.error || 'Transform failed',
      };
    }

    return {
      type: 'update',
      target: dependency.target,
      value: result.value,
    };
  }

  /**
   * 変換関数を実行
   */
  public executeTransform(
    relationship: RelationshipSpec,
    sourceValue: any
  ): TransformResult {
    try {
      let value: any;

      switch (relationship.type) {
        case 'javascript':
          value = this.executeJavaScript(
            relationship.javascript!,
            sourceValue
          );
          break;

        case 'transform':
          value = this.executeBuiltInTransform(
            relationship.transform!,
            sourceValue
          );
          break;

        case 'llm':
          // LLM変換は非同期なので、ここでは対応しない
          throw new Error(
            'LLM transform not supported in synchronous execution'
          );

        default:
          value = sourceValue;
      }

      return {
        success: true,
        value,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * JavaScriptスニペットを安全に実行
   */
  private executeJavaScript(code: string, sourceValue: any): any {
    // セキュリティチェック
    this.validateJavaScriptCode(code);

    try {
      // Function constructorで実行
      // sourceはオブジェクト { value: sourceValue } として渡す
      const func = new Function('source', code);
      return func({ value: sourceValue });
    } catch (error) {
      throw new Error(
        `JavaScript execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 組み込み変換関数を実行
   */
  private executeBuiltInTransform(
    transform: TransformFunction,
    sourceValue: any
  ): any {
    if (typeof transform === 'function') {
      return transform(sourceValue);
    }

    // 名前付き変換関数
    switch (transform) {
      case 'calculate_ranking':
        return this.calculateRanking(sourceValue);

      case 'calculate_balance':
        return this.calculateBalance(sourceValue);

      case 'filter_high_priority':
        return this.filterHighPriority(sourceValue);

      case 'generate_summary':
        return this.generateSummary(sourceValue);

      case 'detect_gaps':
        return this.detectGaps(sourceValue);

      default:
        return sourceValue;
    }
  }

  /**
   * JavaScriptコードのセキュリティチェック
   */
  private validateJavaScriptCode(code: string): void {
    const blacklist = [
      'eval',
      'Function',
      'setTimeout',
      'setInterval',
      'import',
      'require',
      'process',
      'global',
      'window',
      'document',
      '__proto__',
      'constructor',
    ];

    const lowerCode = code.toLowerCase();
    for (const keyword of blacklist) {
      if (lowerCode.includes(keyword.toLowerCase())) {
        throw new Error(`Unsafe code detected: ${keyword}`);
      }
    }
  }

  // ===== 組み込み変換関数 =====

  /**
   * ランキング計算
   * スライダー値から総合スコアを計算してランキングを生成
   */
  private calculateRanking(
    sliderValues: Record<string, Record<string, number>>
  ): RankingItem[] {
    const items = Object.entries(sliderValues).map(([itemId, axisValues]) => {
      const totalScore = Object.values(axisValues).reduce(
        (sum, score) => sum + score,
        0
      );
      return {
        id: itemId,
        label: itemId,
        score: totalScore,
        metadata: { axisValues },
      };
    });

    return items.sort((a, b) => b.score - a.score);
  }

  /**
   * バランス計算
   * 天秤のバランスを計算（-1.0 ~ 1.0）
   */
  private calculateBalance(weights: Record<string, number>): number {
    const values = Object.values(weights);
    const midpoint = Math.floor(values.length / 2);

    const left = values.slice(0, midpoint).reduce((sum, w) => sum + w, 0);
    const right = values.slice(midpoint).reduce((sum, w) => sum + w, 0);

    const total = left + right;
    if (total === 0) return 0;

    return (right - left) / total;
  }

  /**
   * 高優先度フィルター
   * マトリックス右上象限（重要かつ緊急）のアイテムを抽出
   */
  private filterHighPriority(items: MappingItem[]): MappingItem[] {
    return items.filter((item) => {
      const pos = item.position;
      return pos && pos.x > 0.5 && pos.y > 0.5;
    });
  }

  /**
   * サマリー生成
   * データから要約文を生成
   */
  private generateSummary(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      return `${data.length}個のアイテム`;
    }

    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      return `${keys.length}個のプロパティ: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
    }

    return String(data);
  }

  /**
   * ギャップ検出
   * SWOT分析などで不足している情報を検出
   */
  private detectGaps(data: Record<string, any[]>): string[] {
    const gaps: string[] = [];

    // 4象限のデータをチェック
    const quadrants = ['strengths', 'weaknesses', 'opportunities', 'threats'];

    for (const quadrant of quadrants) {
      if (!data[quadrant] || data[quadrant].length === 0) {
        gaps.push(quadrant);
      }
    }

    return gaps;
  }
}
