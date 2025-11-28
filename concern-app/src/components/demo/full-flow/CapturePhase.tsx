/**
 * CapturePhase - 関心事入力とボトルネック診断
 *
 * Phase 4 Full-Flow: Capture フェーズUI
 */

import { useState, useCallback } from 'react';
import { ConcernAnalyzer, type ConcernDepth, type DiagnosticLevel } from '../../../services/ConcernAnalyzer';
import { DiagnosticQuestionService } from '../../../services/DiagnosticQuestionService';
import type { BottleneckAnalysis, BottleneckType, DiagnosticQuestion } from '../../../types/BottleneckTypes';
import { BOTTLENECK_DESCRIPTIONS } from '../../../types/BottleneckTypes';

interface CapturePhaseProps {
  concernText: string;
  onConcernTextChange: (text: string) => void;
  onComplete: (analysis: BottleneckAnalysis, responses: Record<string, any>) => void;
}

type CaptureStep = 'input' | 'analyzing' | 'diagnostic' | 'complete';

interface AnalysisResult {
  depth: ConcernDepth;
  suggestedLevel: DiagnosticLevel;
  indicators: string[];
  inferredType: BottleneckType | null;
}

export function CapturePhase({ concernText, onConcernTextChange, onComplete }: CapturePhaseProps) {
  const [step, setStep] = useState<CaptureStep>('input');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const handleAnalyze = useCallback(() => {
    if (!concernText.trim()) return;

    setStep('analyzing');

    // 分析を実行
    const depthAnalysis = ConcernAnalyzer.analyzeConcernDepth(concernText);
    const inferredType = ConcernAnalyzer.inferBottleneckType(concernText);

    const result: AnalysisResult = {
      depth: depthAnalysis.depth,
      suggestedLevel: depthAnalysis.suggestedLevel,
      indicators: depthAnalysis.indicators,
      inferredType,
    };

    setAnalysisResult(result);

    // 診断質問を取得
    const selectedQuestions = DiagnosticQuestionService.selectQuestions(
      depthAnalysis.suggestedLevel,
      inferredType
    );
    setQuestions(selectedQuestions);

    // 診断が必要な場合は診断ステップへ、そうでなければ完了
    if (depthAnalysis.suggestedLevel !== 'minimal' && selectedQuestions.length > 0) {
      setStep('diagnostic');
    } else {
      // 診断スキップ - デフォルト分析結果で完了
      const defaultAnalysis: BottleneckAnalysis = {
        primaryType: inferredType || 'noStartingPoint',
        secondaryTypes: [],
        confidence: 0.5,
        diagnosticResponses: {},
      };
      setStep('complete');
      onComplete(defaultAnalysis, {});
    }
  }, [concernText, onComplete]);

  const handleResponseChange = useCallback((questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleDiagnosticComplete = useCallback(() => {
    // 回答を分析
    const analysis = DiagnosticQuestionService.analyzeResponses(questions, responses);
    setStep('complete');
    onComplete(analysis, responses);
  }, [questions, responses, onComplete]);

  const handleSkipDiagnostic = useCallback(() => {
    // 診断スキップ - 推定結果で完了
    const defaultAnalysis: BottleneckAnalysis = {
      primaryType: analysisResult?.inferredType || 'noStartingPoint',
      secondaryTypes: [],
      confidence: 0.3,
      diagnosticResponses: {},
    };
    setStep('complete');
    onComplete(defaultAnalysis, {});
  }, [analysisResult, onComplete]);

  const allQuestionsAnswered = questions.every((q) => responses[q.id]);

  return (
    <div data-testid="capture-phase-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Step 1: テキスト入力 */}
      <div
        data-testid="capture-input-section"
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#e2e8f0' }}>
          Step 1: 関心事を入力
        </h2>
        <textarea
          data-testid="capture-concern-input"
          value={concernText}
          onChange={(e) => onConcernTextChange(e.target.value)}
          placeholder="今抱えている悩みや関心事を自由に書いてください..."
          rows={4}
          disabled={step !== 'input'}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            color: '#e2e8f0',
            fontSize: '1rem',
            resize: 'vertical',
            opacity: step !== 'input' ? 0.6 : 1,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.75rem',
          }}
        >
          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
            {concernText.length} 文字
          </span>
          {step === 'input' && (
            <button
              data-testid="capture-analyze-btn"
              onClick={handleAnalyze}
              disabled={!concernText.trim() || concernText.length < 3}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: concernText.trim() && concernText.length >= 3 ? '#3b82f6' : '#475569',
                border: 'none',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: concernText.trim() && concernText.length >= 3 ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
              }}
            >
              分析開始
            </button>
          )}
        </div>
      </div>

      {/* Step 2: 分析結果 */}
      {analysisResult && (
        <div
          data-testid="capture-analysis-result"
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '0.75rem',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#e2e8f0' }}>
            Step 2: 初期分析結果
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <InfoBadge label="深さ" value={analysisResult.depth} />
              <InfoBadge label="診断レベル" value={analysisResult.suggestedLevel} />
              {analysisResult.inferredType && (
                <InfoBadge
                  label="推定ボトルネック"
                  value={BOTTLENECK_DESCRIPTIONS[analysisResult.inferredType]}
                />
              )}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ margin: '0 0 0.25rem 0', color: '#64748b', fontSize: '0.75rem' }}>
                検出されたシグナル:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                {analysisResult.indicators.map((indicator, index) => (
                  <li key={index}>{indicator}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: 診断質問 */}
      {step === 'diagnostic' && questions.length > 0 && (
        <div
          data-testid="capture-diagnostic-section"
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '0.75rem',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#e2e8f0' }}>
            Step 3: 診断質問
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            より適切なサポートのため、いくつかの質問に答えてください。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                value={responses[question.id] || ''}
                onChange={(value) => handleResponseChange(question.id, value)}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #334155',
            }}
          >
            <button
              data-testid="capture-diagnostic-skip-btn"
              onClick={handleSkipDiagnostic}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              スキップ
            </button>
            <button
              data-testid="capture-complete-btn"
              onClick={handleDiagnosticComplete}
              disabled={!allQuestionsAnswered}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: allQuestionsAnswered ? '#10b981' : '#475569',
                border: 'none',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: allQuestionsAnswered ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
              }}
            >
              診断完了
            </button>
          </div>
        </div>
      )}

      {/* 完了状態 */}
      {step === 'complete' && (
        <div
          data-testid="capture-complete-indicator"
          style={{
            backgroundColor: '#14532d',
            borderRadius: '0.75rem',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <span style={{ color: '#22c55e', fontSize: '1rem' }}>
            Capture フェーズ完了
          </span>
        </div>
      )}
    </div>
  );
}

interface InfoBadgeProps {
  label: string;
  value: string;
}

function InfoBadge({ label, value }: InfoBadgeProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0.75rem',
        backgroundColor: '#0f172a',
        borderRadius: '9999px',
        fontSize: '0.75rem',
      }}
    >
      <span style={{ color: '#64748b' }}>{label}:</span>
      <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}

interface QuestionCardProps {
  question: DiagnosticQuestion;
  index: number;
  value: string;
  onChange: (value: string) => void;
}

function QuestionCard({ question, index, value, onChange }: QuestionCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        borderRadius: '0.5rem',
        padding: '1rem',
      }}
    >
      <p style={{ margin: '0 0 0.75rem 0', color: '#e2e8f0', fontSize: '0.875rem' }}>
        Q{index + 1}. {question.question}
      </p>
      {question.type === 'radio' || question.type === 'select' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {question.options?.map((option) => (
            <label
              key={option}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                backgroundColor: value === option ? '#3b82f6' : '#1e293b',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: value === option ? 'white' : '#94a3b8',
              }}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={value === option}
                onChange={(e) => onChange(e.target.value)}
                style={{ display: 'none' }}
              />
              {option}
            </label>
          ))}
        </div>
      ) : question.type === 'scale' ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {question.options?.map((option) => (
            <label
              key={option}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: value === option ? '#3b82f6' : '#1e293b',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                color: value === option ? 'white' : '#94a3b8',
              }}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={value === option}
                onChange={(e) => onChange(e.target.value)}
                style={{ display: 'none' }}
              />
              {option}
            </label>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="回答を入力..."
          style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            color: '#e2e8f0',
            fontSize: '0.875rem',
          }}
        />
      )}
    </div>
  );
}
