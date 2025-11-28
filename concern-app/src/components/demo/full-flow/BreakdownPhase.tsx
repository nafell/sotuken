/**
 * BreakdownPhase - タスクブレークダウンUI
 *
 * Phase 4 Full-Flow: Planフェーズ結果からタスクを生成・表示
 */

import { useState, useCallback } from 'react';
import type { StageResult, GeneratedTask, PlanStage } from './types';

interface BreakdownPhaseProps {
  sessionId: string;
  concernText: string;
  planResults: Partial<Record<PlanStage, StageResult>>;
  tasks: GeneratedTask[];
  onTasksGenerated: (tasks: GeneratedTask[]) => void;
  onComplete: () => void;
}

type BreakdownStep = 'summary' | 'generating' | 'review' | 'complete';

export function BreakdownPhase({
  concernText,
  planResults,
  tasks,
  onTasksGenerated,
  onComplete,
}: BreakdownPhaseProps) {
  const [step, setStep] = useState<BreakdownStep>(tasks.length > 0 ? 'review' : 'summary');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Planフェーズの結果サマリー作成
  const planSummary = useCallback(() => {
    const stages: PlanStage[] = ['diverge', 'organize', 'converge', 'summary'];
    return stages.map((stage) => {
      const result = planResults[stage];
      if (!result) return null;

      const widgetCount = result.widgetResults?.length || 0;
      const hasText = !!result.textSummary;
      const mode = result.mode || (widgetCount > 0 ? 'widget' : 'text');

      return {
        stage,
        mode,
        widgetCount,
        hasText,
        completed: !!result.completedAt,
      };
    }).filter(Boolean);
  }, [planResults]);

  // タスク生成（固定タスクを生成）
  const handleGenerateTasks = useCallback(() => {
    setStep('generating');

    // 簡易タスク生成ロジック（実際にはLLM呼び出しも可能）
    setTimeout(() => {
      const generatedTasks: GeneratedTask[] = [];

      // divergeの結果からアイデアを抽出
      const divergeResult = planResults['diverge'];
      if (divergeResult?.widgetResults) {
        divergeResult.widgetResults.forEach((widget, idx) => {
          if (widget.data?.cards || widget.data?.items) {
            const items = widget.data.cards || widget.data.items || [];
            items.slice(0, 3).forEach((item: any, itemIdx: number) => {
              generatedTasks.push({
                id: `task_diverge_${idx}_${itemIdx}`,
                title: item.text || item.label || `アイデア ${itemIdx + 1}`,
                description: `divergeフェーズで出た案`,
                priority: 'medium',
                status: 'pending',
                source: 'diverge',
              });
            });
          }
        });
      }

      // convergeの結果から優先タスクを抽出
      const convergeResult = planResults['converge'];
      if (convergeResult?.widgetResults) {
        convergeResult.widgetResults.forEach((widget, idx) => {
          if (widget.data?.placements || widget.data?.values) {
            // MatrixPlacement結果から高優先度アイテムを抽出
            if (widget.data.placements) {
              widget.data.placements
                .filter((p: any) => p.position?.x > 0.5 && p.position?.y > 0.5)
                .slice(0, 2)
                .forEach((p: any, pIdx: number) => {
                  generatedTasks.push({
                    id: `task_converge_matrix_${idx}_${pIdx}`,
                    title: p.label || `重要タスク ${pIdx + 1}`,
                    description: '重要度・緊急度が高いアイテム',
                    priority: 'high',
                    status: 'pending',
                    source: 'converge',
                  });
                });
            }
            // PrioritySlider結果から上位アイテムを抽出
            if (widget.data.values) {
              Object.entries(widget.data.values)
                .filter(([_, v]) => (v as number) >= 70)
                .slice(0, 2)
                .forEach(([key, _], vIdx: number) => {
                  generatedTasks.push({
                    id: `task_converge_slider_${idx}_${vIdx}`,
                    title: key,
                    description: '高優先度として評価されたアイテム',
                    priority: 'high',
                    status: 'pending',
                    source: 'converge',
                  });
                });
            }
          }
        });
      }

      // タスクが少ない場合はデフォルトタスクを追加
      if (generatedTasks.length < 3) {
        generatedTasks.push({
          id: 'task_default_1',
          title: '最初の一歩を決める',
          description: `「${concernText.slice(0, 20)}...」に対する最初のアクション`,
          priority: 'high',
          status: 'pending',
          source: 'default',
        });
        generatedTasks.push({
          id: 'task_default_2',
          title: '情報収集',
          description: '関連する情報を集める',
          priority: 'medium',
          status: 'pending',
          source: 'default',
        });
        generatedTasks.push({
          id: 'task_default_3',
          title: '振り返りの時間を設ける',
          description: '1週間後に進捗を確認する',
          priority: 'low',
          status: 'pending',
          source: 'default',
        });
      }

      onTasksGenerated(generatedTasks);
      setStep('review');
    }, 1500);
  }, [planResults, concernText, onTasksGenerated]);

  // タスク選択トグル
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // 完了処理
  const handleComplete = useCallback(() => {
    setStep('complete');
    onComplete();
  }, [onComplete]);

  const summary = planSummary();

  return (
    <div data-testid="breakdown-phase-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Planサマリー */}
      <div
        data-testid="breakdown-summary-section"
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1rem',
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#e2e8f0' }}>
          Plan Phase Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          {summary.map((s) => (
            <div
              key={s?.stage}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.25rem 0',
                  color: s?.completed ? '#22c55e' : '#64748b',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                }}
              >
                {s?.stage}
              </p>
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.875rem' }}>
                {s?.mode === 'widget' ? `${s?.widgetCount} widgets` : 'Text'}
              </p>
              {s?.completed && (
                <span style={{ color: '#22c55e', fontSize: '0.625rem' }}>completed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div
        data-testid="breakdown-main-content"
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          minHeight: '300px',
        }}
      >
        {/* サマリー確認 */}
        {step === 'summary' && (
          <div data-testid="breakdown-summary-state" style={{ textAlign: 'center', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#e2e8f0' }}>
              Planフェーズが完了しました
            </h3>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              結果をもとにアクションタスクを生成します
            </p>
            <button
              data-testid="breakdown-generate-btn"
              onClick={handleGenerateTasks}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              タスク生成
            </button>
          </div>
        )}

        {/* 生成中 */}
        {step === 'generating' && (
          <div data-testid="breakdown-generating-indicator" style={{ textAlign: 'center', padding: '2rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #334155',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <p style={{ color: '#94a3b8' }}>タスクを生成中...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* タスクレビュー */}
        {step === 'review' && tasks.length > 0 && (
          <div data-testid="breakdown-review-section">
            <h3 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1rem' }}>
              生成されたタスク
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.75rem' }}>
              実行するタスクを選択してください
            </p>
            <div data-testid="breakdown-task-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={selectedTaskIds.has(task.id)}
                  onToggle={() => toggleTaskSelection(task.id)}
                />
              ))}
            </div>
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span data-testid="breakdown-selection-count" style={{ color: '#64748b', fontSize: '0.75rem' }}>
                {selectedTaskIds.size} / {tasks.length} 選択中
              </span>
              <button
                data-testid="breakdown-complete-btn"
                onClick={handleComplete}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                フロー完了
              </button>
            </div>
          </div>
        )}

        {/* 完了 */}
        {step === 'complete' && (
          <div data-testid="breakdown-complete-indicator" style={{ textAlign: 'center', padding: '2rem' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#22c55e',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <span style={{ color: 'white', fontSize: '2rem' }}>✓</span>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#22c55e' }}>
              Full-Flow Complete!
            </h3>
            <p style={{ color: '#94a3b8', margin: 0 }}>
              {selectedTaskIds.size} 個のタスクが選択されました
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: GeneratedTask;
  selected: boolean;
  onToggle: () => void;
}

function TaskCard({ task, selected, onToggle }: TaskCardProps) {
  const priorityColors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e',
  };

  return (
    <div
      data-testid={`breakdown-task-${task.id}`}
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        backgroundColor: selected ? '#1e3a5f' : '#0f172a',
        border: selected ? '2px solid #3b82f6' : '2px solid transparent',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {/* チェックボックス */}
      <div
        data-testid={`breakdown-task-${task.id}-checkbox`}
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          border: `2px solid ${selected ? '#3b82f6' : '#475569'}`,
          backgroundColor: selected ? '#3b82f6' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {selected && <span style={{ color: 'white', fontSize: '0.75rem' }}>✓</span>}
      </div>

      {/* タスク内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#e2e8f0', fontSize: '0.875rem' }}>{task.title}</span>
          <span
            style={{
              padding: '0.125rem 0.375rem',
              backgroundColor: priorityColors[task.priority] || '#64748b',
              borderRadius: '9999px',
              fontSize: '0.625rem',
              color: 'white',
              textTransform: 'uppercase',
            }}
          >
            {task.priority}
          </span>
        </div>
        <p
          style={{
            margin: '0.25rem 0 0 0',
            color: '#64748b',
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {task.description}
        </p>
      </div>

      {/* ソースバッジ */}
      <span
        style={{
          padding: '0.125rem 0.5rem',
          backgroundColor: '#334155',
          borderRadius: '9999px',
          fontSize: '0.625rem',
          color: '#94a3b8',
        }}
      >
        {task.source}
      </span>
    </div>
  );
}
