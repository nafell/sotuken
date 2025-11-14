// ConcernAnalyzer.ts
// Phase 4: Analyze user's initial concern input to determine diagnostic level

import type { BottleneckType } from '../types/BottleneckTypes';

export type DiagnosticLevel = 'minimal' | 'standard' | 'detailed';
export type ConcernDepth = 'specific' | 'moderate' | 'vague';

export class ConcernAnalyzer {
  /**
   * 初期入力の深さを分析して診断レベルを決定
   */
  static analyzeConcernDepth(initialInput: string): {
    depth: ConcernDepth;
    suggestedLevel: DiagnosticLevel;
    indicators: string[];
  } {
    const indicators: string[] = [];

    // 具体的な記述のパターン
    const specificPatterns = [
      /選択肢|オプション|どちら/,
      /不安|心配|怖い/,
      /分からない|見当がつかない/,
      /複雑|絡み合って|関連/,
      /迷っている|悩んでいる/
    ];

    // 曖昧な記述のパターン
    const vaguePatterns = [
      /なんとなく/,
      /モヤモヤ/,
      /よくわからない/,
      /漠然と/,
      /気になる/
    ];

    let specificCount = 0;
    let vagueCount = 0;

    // パターンマッチング
    specificPatterns.forEach(pattern => {
      if (pattern.test(initialInput)) {
        specificCount++;
        indicators.push(`具体的: ${pattern.source}`);
      }
    });

    vaguePatterns.forEach(pattern => {
      if (pattern.test(initialInput)) {
        vagueCount++;
        indicators.push(`曖昧: ${pattern.source}`);
      }
    });

    // 文字数による判定
    const length = initialInput.length;
    if (length > 100) {
      specificCount++;
      indicators.push('詳細な記述');
    } else if (length < 30) {
      vagueCount++;
      indicators.push('簡潔すぎる記述');
    }

    // 深さの判定
    let depth: ConcernDepth;
    let suggestedLevel: DiagnosticLevel;

    if (specificCount >= 2) {
      depth = 'specific';
      suggestedLevel = 'minimal';  // 具体的なら追加診断は最小限
    } else if (vagueCount >= 2) {
      depth = 'vague';
      suggestedLevel = 'standard';  // 曖昧なら標準的な診断
    } else {
      depth = 'moderate';
      suggestedLevel = 'standard';
    }

    return {
      depth,
      suggestedLevel,
      indicators
    };
  }

  /**
   * 初期分析からボトルネックタイプを推定
   */
  static inferBottleneckType(
    input: string
  ): BottleneckType | null {
    // キーワードベースの簡易推定
    const typePatterns: Record<BottleneckType, RegExp[]> = {
      tooManyOptions: [/選択肢/, /どれを選べば/, /迷って/],
      emotionalBlock: [/不安/, /怖/, /心配/],
      noStartingPoint: [/何から/, /どこから/, /手がかり/],
      entangledProblems: [/複雑/, /絡/, /関連/],
      lackOfInformation: [/分からない/, /情報/, /知らない/],
      fearOfDecision: [/決め/, /踏み出/, /後悔/],
      fixedPerspective: [/しか/, /だけ/, /べき/],
      noPrioritization: [/優先/, /重要/, /順番/]
    };

    for (const [type, patterns] of Object.entries(typePatterns)) {
      if (patterns.some(p => p.test(input))) {
        return type as BottleneckType;
      }
    }

    return null;
  }
}
