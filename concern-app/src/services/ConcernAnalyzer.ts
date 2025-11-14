// ConcernAnalyzer.ts
// Phase 4: Analyze user's initial concern input to determine diagnostic level

import type { BottleneckType } from '../types/BottleneckTypes';

export type DiagnosticLevel = 'minimal' | 'standard' | 'detailed';
export type ConcernDepth = 'specific' | 'moderate' | 'vague';

export class ConcernAnalyzer {
  /**
   * 初期入力の深さを分析して診断レベルを決定
   *
   * Phase 4 修正: 判定ロジックを見直し
   * - 「具体的」= 期限・数値・固有名詞など客観的に具体的な要素
   * - 「診断必要」= 悩みの表現（不安、迷い、分からないなど）
   */
  static analyzeConcernDepth(initialInput: string): {
    depth: ConcernDepth;
    suggestedLevel: DiagnosticLevel;
    indicators: string[];
  } {
    const indicators: string[] = [];

    // 本当に具体的な記述のパターン（狭く定義）
    const specificPatterns = [
      /\d+[年月日週間ヶケ]/,       // 期限（例: 3ヶ月、来週、2年）
      /\d+[点円%個回時分]/,        // 数値目標（例: 800点、10万円、50%）
      /具体的に|明確に|はっきり/,  // メタ表現
      /[A-Z]{2,}/,                 // 固有名詞・略語（TOEIC, ITなど）
    ];

    // 診断が必要な記述のパターン（広く定義）
    const needsDiagnosticPatterns = [
      /選択肢|オプション|どちら|どれ/,  // 選択の悩み
      /不安|心配|怖い|恐れ/,            // 感情的ブロック
      /分からない|わからない|見当がつかない/, // 情報不足
      /複雑|絡み合って|関連/,          // 問題の複雑さ
      /迷っている|悩んでいる|困って/,  // 決断の困難
      /なんとなく|何となく/,           // 曖昧な表現
      /モヤモヤ/,                       // 曖昧な表現
      /よくわからない/,                // 曖昧な表現
      /漠然と/,                        // 曖昧な表現
      /気になる/                       // 曖昧な表現
    ];

    let specificCount = 0;
    let needsDiagnosticCount = 0;

    // パターンマッチング
    specificPatterns.forEach(pattern => {
      if (pattern.test(initialInput)) {
        specificCount++;
        indicators.push(`具体的要素: ${pattern.source}`);
      }
    });

    needsDiagnosticPatterns.forEach(pattern => {
      if (pattern.test(initialInput)) {
        needsDiagnosticCount++;
        indicators.push(`診断必要: ${pattern.source}`);
      }
    });

    // 文字数による判定
    const length = initialInput.length;
    if (length > 100) {
      specificCount++;
      indicators.push('詳細な記述（100文字超）');
    } else if (length < 20) {
      // 30文字 → 20文字に変更（より厳しく）
      needsDiagnosticCount++;
      indicators.push('簡潔な記述（20文字未満）');
    }

    // 深さの判定（修正版）
    let depth: ConcernDepth;
    let suggestedLevel: DiagnosticLevel;

    if (specificCount >= 3 && needsDiagnosticCount === 0) {
      // 非常に具体的（期限、数値、固有名詞が多い）かつ診断不要
      depth = 'specific';
      suggestedLevel = 'minimal';
      indicators.push('判定: 十分に具体的、診断スキップ');
    } else if (needsDiagnosticCount >= 1) {
      // 診断が必要なパターンが1つでもあれば診断実行
      depth = needsDiagnosticCount >= 3 ? 'vague' : 'moderate';
      suggestedLevel = 'standard';
      indicators.push(`判定: 診断が必要（${needsDiagnosticCount}個のシグナル）`);
    } else {
      // どちらでもない場合は診断実行（安全側に倒す）
      depth = 'moderate';
      suggestedLevel = 'standard';
      indicators.push('判定: デフォルトで診断実行');
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
