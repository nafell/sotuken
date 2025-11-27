// BottleneckTypes.ts
// Phase 4: Bottleneck diagnosis types for Capture phase enhancement

export type BottleneckType =
  | 'tooManyOptions'      // 選択肢が多すぎる
  | 'emotionalBlock'      // 感情的ブロック
  | 'noStartingPoint'     // 何から考えればいいか分からない
  | 'entangledProblems'   // 複数の問題が絡んでいる
  | 'lackOfInformation'   // 情報不足
  | 'fearOfDecision'      // 決断への恐れ
  | 'fixedPerspective'    // 視点固定
  | 'noPrioritization';   // 優先順位がつけられない

export interface BottleneckAnalysis {
  primaryType: BottleneckType;
  secondaryTypes: BottleneckType[];
  confidence: number;  // 0.0-1.0
  diagnosticResponses: Record<string, any>;
}

export interface DiagnosticQuestion {
  id: string;
  question: string;
  type: 'radio' | 'select' | 'text' | 'scale';
  options?: string[];
  bottleneckIndicators: {
    type: BottleneckType;
    responsePattern: string | number | RegExp;
    weight: number;
  }[];
}

export const BOTTLENECK_DESCRIPTIONS: Record<BottleneckType, string> = {
  tooManyOptions: '選択肢が多すぎて決められない',
  emotionalBlock: '感情的なブロックがある',
  noStartingPoint: '何から考えればいいか分からない',
  entangledProblems: '複数の問題が絡み合っている',
  lackOfInformation: '情報が不足している',
  fearOfDecision: '決断することへの恐れがある',
  fixedPerspective: '視点が固定されている',
  noPrioritization: '優先順位がつけられない'
};
