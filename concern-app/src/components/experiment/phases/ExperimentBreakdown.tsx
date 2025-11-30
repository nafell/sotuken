import { useState, useEffect } from 'react';
import { TaskGenerationService } from '../../../services/TaskGenerationService';

interface ExperimentBreakdownProps {
    sessionId: string;
    concernText: string;
    planStageResults: Record<string, any>;
    onComplete: (tasks: any[]) => void;
    mode: 'user' | 'expert' | 'technical';
}

export function ExperimentBreakdown({
    sessionId: _sessionId,
    concernText,
    planStageResults,
    onComplete,
    mode
}: ExperimentBreakdownProps) {
    const [tasks, setTasks] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generateTasks = async () => {
            setIsGenerating(true);
            try {
                // Planフェーズの結果からタスクを生成
                // ここでは簡易的にTaskGenerationServiceを使用（実際はLLM呼び出しを含むかも）
                const generatedTasks = await TaskGenerationService.generateTasksFromPlan(
                    concernText,
                    planStageResults
                );
                setTasks(generatedTasks);

                // Technicalモードなら自動完了
                if (mode === 'technical') {
                    setTimeout(() => onComplete(generatedTasks), 1000);
                }
            } catch (err) {
                console.error('Task generation failed:', err);
                setError('Failed to generate tasks');
            } finally {
                setIsGenerating(false);
            }
        };

        generateTasks();
    }, [concernText, planStageResults, mode, onComplete]);

    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p>タスクを分解中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6">アクションプラン</h2>

            <div className="space-y-4">
                {tasks.map((task, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                        <h3 className="font-bold text-lg mb-2">{task.title}</h3>
                        <p className="text-gray-600 mb-2">{task.description}</p>
                        <div className="flex gap-2 text-sm text-gray-500">
                            <span>目安時間: {task.estimatedMin}分</span>
                            <span>難易度: {task.difficulty}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={() => onComplete(tasks)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-lg"
                >
                    実験を終了する
                </button>
            </div>
        </div>
    );
}
