import { useState, useCallback, useEffect } from 'react';
import { ConcernAnalyzer } from '../../../services/ConcernAnalyzer';

interface ExperimentCaptureProps {
    onComplete: (concernText: string, bottleneckType: string) => void;
    initialText?: string;
    mode: 'user' | 'expert' | 'technical';
}

export function ExperimentCapture({ onComplete, initialText = '', mode }: ExperimentCaptureProps) {
    const [text, setText] = useState(initialText);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Technicalモードで初期テキストがある場合、自動的に次へ進む
    useEffect(() => {
        if (mode === 'technical' && initialText) {
            const autoProceed = async () => {
                setIsAnalyzing(true);
                try {
                    // 簡易的な解析（実際はLLMを呼ぶかもしれないが、ここではモック的に処理）
                    // Technicalモードではボトルネックも既知の前提だが、一応解析フローを通す
                    const bottleneck = await ConcernAnalyzer.inferBottleneckType(initialText);
                    onComplete(initialText, bottleneck || '');
                } catch (err) {
                    console.error('Auto-proceed failed:', err);
                    setError('Auto-proceed failed');
                    setIsAnalyzing(false);
                }
            };
            autoProceed();
        }
    }, [mode, initialText, onComplete]);

    const handleSubmit = useCallback(async () => {
        if (!text.trim()) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            // 1. 悩み深度分析 (Phase 0 logic) - depth variable is not used
            await ConcernAnalyzer.analyzeConcernDepth(text);

            // 2. ボトルネック推定
            const bottleneck = await ConcernAnalyzer.inferBottleneckType(text);

            // 3. 診断質問 (省略: Phase 7ではシンプルに進行)
            // 必要ならここで DiagnosticQuestionService を呼ぶ

            onComplete(text, bottleneck || '');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
            setIsAnalyzing(false);
        }
    }, [text, onComplete]);

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6">何に悩んでいますか？</h2>

            <div className="space-y-4">
                <textarea
                    className="w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="今の悩みを書き出してください..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={isAnalyzing}
                />

                {error && (
                    <div className="text-red-500 text-sm">{error}</div>
                )}

                <div className="flex justify-end">
                    <button
                        className={`px-6 py-2 rounded-lg text-white font-medium transition-colors
              ${isAnalyzing || !text.trim()
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'}`}
                        onClick={handleSubmit}
                        disabled={isAnalyzing || !text.trim()}
                    >
                        {isAnalyzing ? '分析中...' : '次へ'}
                    </button>
                </div>
            </div>
        </div>
    );
}
