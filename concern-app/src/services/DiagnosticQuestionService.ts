// DiagnosticQuestionService.ts
// Phase 4: Diagnostic question generation service for bottleneck identification

import type {
  BottleneckType,
  DiagnosticQuestion,
  BottleneckAnalysis
} from '../types/BottleneckTypes';
import type { DiagnosticLevel } from './ConcernAnalyzer';

export class DiagnosticQuestionService {
  private static diagnosticQuestions: Record<BottleneckType, DiagnosticQuestion[]> = {
    tooManyOptions: [
      {
        id: 'opt_count',
        question: '検討している選択肢はいくつくらいありますか？',
        type: 'select',
        options: ['2-3個', '4-5個', '6個以上', 'はっきりしない'],
        bottleneckIndicators: [{
          type: 'tooManyOptions',
          responsePattern: '6個以上',
          weight: 0.8
        }]
      },
      {
        id: 'opt_similar',
        question: 'どの選択肢も同じくらい魅力的に見えますか？',
        type: 'radio',
        options: ['はい', 'いいえ', 'わからない'],
        bottleneckIndicators: [{
          type: 'tooManyOptions',
          responsePattern: 'はい',
          weight: 0.6
        }]
      }
    ],
    emotionalBlock: [
      {
        id: 'emotion_type',
        question: 'この悩みを考えるとき、どんな感情を感じますか？',
        type: 'select',
        options: ['不安', '恐れ', 'イライラ', '無力感', 'その他'],
        bottleneckIndicators: [{
          type: 'emotionalBlock',
          responsePattern: /不安|恐れ/,
          weight: 0.7
        }]
      },
      {
        id: 'emotion_impact',
        question: '感情が判断を妨げていると感じますか？',
        type: 'scale',
        options: ['1', '2', '3', '4', '5'],  // 1:全くない - 5:とても感じる
        bottleneckIndicators: [{
          type: 'emotionalBlock',
          responsePattern: 4,  // 4以上
          weight: 0.8
        }]
      }
    ],
    noStartingPoint: [
      {
        id: 'start_clarity',
        question: '何から手をつければいいか見当がつきますか？',
        type: 'radio',
        options: ['はっきりしている', 'なんとなくある', '全くわからない'],
        bottleneckIndicators: [{
          type: 'noStartingPoint',
          responsePattern: '全くわからない',
          weight: 0.9
        }]
      },
      {
        id: 'framework_need',
        question: '考える枠組みや手がかりが欲しいと感じますか？',
        type: 'radio',
        options: ['とても欲しい', '少し欲しい', 'あまり必要ない'],
        bottleneckIndicators: [{
          type: 'noStartingPoint',
          responsePattern: 'とても欲しい',
          weight: 0.7
        }]
      }
    ],
    entangledProblems: [
      {
        id: 'problem_count',
        question: 'この悩みには複数の問題が含まれていると感じますか？',
        type: 'radio',
        options: ['はい、いくつも絡んでいる', 'いいえ、一つの問題', 'わからない'],
        bottleneckIndicators: [{
          type: 'entangledProblems',
          responsePattern: 'はい、いくつも絡んでいる',
          weight: 0.9
        }]
      },
      {
        id: 'separation_difficulty',
        question: '問題を切り分けて考えることができますか？',
        type: 'radio',
        options: ['できる', '難しい', 'できない'],
        bottleneckIndicators: [{
          type: 'entangledProblems',
          responsePattern: /難しい|できない/,
          weight: 0.7
        }]
      }
    ],
    lackOfInformation: [
      {
        id: 'info_sufficiency',
        question: '判断するための情報は十分にありますか？',
        type: 'radio',
        options: ['十分にある', 'やや不足', '大きく不足'],
        bottleneckIndicators: [{
          type: 'lackOfInformation',
          responsePattern: /不足/,
          weight: 0.8
        }]
      },
      {
        id: 'info_source',
        question: '必要な情報をどこで得られるか見当がつきますか？',
        type: 'radio',
        options: ['わかる', 'なんとなく', 'わからない'],
        bottleneckIndicators: [{
          type: 'lackOfInformation',
          responsePattern: 'わからない',
          weight: 0.6
        }]
      }
    ],
    fearOfDecision: [
      {
        id: 'decision_anxiety',
        question: '決断することへの不安や恐れを感じますか？',
        type: 'scale',
        options: ['1', '2', '3', '4', '5'],  // 1:感じない - 5:強く感じる
        bottleneckIndicators: [{
          type: 'fearOfDecision',
          responsePattern: 4,  // 4以上
          weight: 0.9
        }]
      },
      {
        id: 'regret_worry',
        question: '決断した後に後悔するのではないかと心配ですか？',
        type: 'radio',
        options: ['とても心配', 'やや心配', 'あまり心配でない'],
        bottleneckIndicators: [{
          type: 'fearOfDecision',
          responsePattern: /とても心配|やや心配/,
          weight: 0.7
        }]
      }
    ],
    fixedPerspective: [
      {
        id: 'perspective_flexibility',
        question: '別の視点から考えることができますか？',
        type: 'radio',
        options: ['できる', '難しい', 'できない'],
        bottleneckIndicators: [{
          type: 'fixedPerspective',
          responsePattern: /難しい|できない/,
          weight: 0.8
        }]
      },
      {
        id: 'alternative_thinking',
        question: '「〜しかない」「〜すべき」という考えに囚われていますか？',
        type: 'radio',
        options: ['はい', 'ややそう', 'いいえ'],
        bottleneckIndicators: [{
          type: 'fixedPerspective',
          responsePattern: /はい|ややそう/,
          weight: 0.7
        }]
      }
    ],
    noPrioritization: [
      {
        id: 'priority_clarity',
        question: '何が重要で何が重要でないか判断できますか？',
        type: 'radio',
        options: ['できる', 'やや難しい', 'できない'],
        bottleneckIndicators: [{
          type: 'noPrioritization',
          responsePattern: /難しい|できない/,
          weight: 0.9
        }]
      },
      {
        id: 'criteria_presence',
        question: '優先順位をつける基準がありますか？',
        type: 'radio',
        options: ['明確にある', 'なんとなくある', 'ない'],
        bottleneckIndicators: [{
          type: 'noPrioritization',
          responsePattern: 'ない',
          weight: 0.7
        }]
      }
    ]
  };

  /**
   * 診断レベルに応じて質問を選択
   */
  static selectQuestions(
    level: DiagnosticLevel,
    inferredType: BottleneckType | null
  ): DiagnosticQuestion[] {
    const questionCount = {
      minimal: 2,
      standard: 4,
      detailed: 6
    }[level];

    const questions: DiagnosticQuestion[] = [];

    // 推定されたタイプがある場合、その質問を優先
    if (inferredType && this.diagnosticQuestions[inferredType]) {
      questions.push(...this.diagnosticQuestions[inferredType].slice(0, 2));
    }

    // 残りは汎用的な質問を追加
    if (questions.length < questionCount) {
      // 複数のタイプから均等に選択
      const types = Object.keys(this.diagnosticQuestions) as BottleneckType[];
      for (const type of types) {
        if (questions.length >= questionCount) break;
        if (type !== inferredType) {
          const typeQuestions = this.diagnosticQuestions[type];
          if (typeQuestions.length > 0) {
            questions.push(typeQuestions[0]);
          }
        }
      }
    }

    return questions.slice(0, questionCount);
  }

  /**
   * 回答からボトルネックを分析
   */
  static analyzeResponses(
    questions: DiagnosticQuestion[],
    responses: Record<string, any>
  ): BottleneckAnalysis {
    const scores: Record<BottleneckType, number> = {} as any;

    // 各質問の回答をスコア化
    questions.forEach(question => {
      const response = responses[question.id];
      if (response === undefined) return;

      question.bottleneckIndicators.forEach(indicator => {
        if (!scores[indicator.type]) scores[indicator.type] = 0;

        // パターンマッチング
        let matches = false;
        if (typeof indicator.responsePattern === 'string') {
          matches = response === indicator.responsePattern;
        } else if (indicator.responsePattern instanceof RegExp) {
          matches = indicator.responsePattern.test(response);
        } else if (typeof indicator.responsePattern === 'number') {
          matches = Number(response) >= indicator.responsePattern;
        }

        if (matches) {
          scores[indicator.type] += indicator.weight;
        }
      });
    });

    // スコアでソート
    const sortedTypes = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .map(([type]) => type as BottleneckType);

    // 最高スコアを確信度として使用
    const maxScore = scores[sortedTypes[0]] || 0;
    const confidence = Math.min(maxScore / 2, 1.0);  // 正規化

    return {
      primaryType: sortedTypes[0] || 'noStartingPoint',
      secondaryTypes: sortedTypes.slice(1, 3),
      confidence,
      diagnosticResponses: responses
    };
  }
}
