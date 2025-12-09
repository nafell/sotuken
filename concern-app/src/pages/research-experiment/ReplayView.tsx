/**
 * ReplayView
 * 実験セッションのリプレイ表示
 *
 * Phase 6: 実験・評価環境構築
 * Phase 7: Generationsデータを使用したリプレイ
 * - 保存されたセッションの読み取り専用再生
 * - ステップバイステップナビゲーション
 * - 生成されたウィジェットの実体表示
 * - メタ情報・メトリクス表示
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  experimentApi,
  type ExperimentSession,
  type ExperimentGeneration
} from '../../services/ExperimentApiService';
import UIRendererV3 from '../../services/ui-generation/UIRendererV3';
import { analyzeW2WRFromUISpec, type W2WRAnalysis } from '../../utils/w2wrAnalyzer';
import { flattenPlanUISpecToUISpec, isPlanUISpec } from '../../types/v4/ui-spec.types';

type ViewMode = 'widget' | 'data';

export default function ReplayView() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [generations, setGenerations] = useState<ExperimentGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current step index for navigation
  const [currentStep, setCurrentStep] = useState(0);

  // Panel visibility toggles
  const [showMetaPanel, setShowMetaPanel] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('widget');
  const [showPrompt, setShowPrompt] = useState(false);

  // Load session and generations
  useEffect(() => {
    async function loadData() {
      if (!sessionId) return;
      try {
        const [sessionData, generationsData] = await Promise.all([
          experimentApi.getSession(sessionId),
          experimentApi.getGenerations(sessionId)
        ]);
        setSession(sessionData);
        setGenerations(generationsData);
        if (generationsData.length > 0) {
          setCurrentStep(0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load replay data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sessionId]);

  // Navigation handlers
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < generations.length) {
      setCurrentStep(step);
    }
  }, [generations.length]);

  const goToPrevStep = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const goToNextStep = useCallback(() => {
    goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'j') {
        goToPrevStep();
      } else if (e.key === 'ArrowRight' || e.key === 'k') {
        goToNextStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevStep, goToNextStep]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP');
  };

  const formatJson = (obj: unknown) => {
    return JSON.stringify(obj, null, 2);
  };

  // 2段階プロンプトデータ（ORS/DpG + UISpec）のパース用型定義
  interface ParsedPromptData {
    widgetSelection?: {
      prompt: string | null;
      inputParams?: Record<string, unknown>;
    };
    ors?: {
      prompt: string | null;
      inputParams?: {
        concernText?: string;
        stage?: string;
        stageSelection?: unknown;
      };
    };
    uiSpec?: {
      prompt: string | null;
      inputParams?: {
        stage?: string;
        enableReactivity?: boolean;
        stageSelection?: unknown;
      };
    };
    // DSL v5 Plan統合用
    planOrs?: {
      prompt: string | null;
      inputParams?: {
        concernText?: string;
        bottleneckType?: string;
        widgetSelection?: unknown;
      };
    };
    planUiSpec?: {
      prompt: string | null;
      inputParams?: {
        concernText?: string;
        enableReactivity?: boolean;
        widgetSelection?: unknown;
      };
    };
  }

  // プロンプトデータをパースするヘルパー
  const parsePromptData = (prompt: string | undefined): ParsedPromptData | null => {
    if (!prompt) return null;
    try {
      if (typeof prompt === 'string' && prompt.startsWith('{')) {
        return JSON.parse(prompt) as ParsedPromptData;
      }
    } catch {
      // パースに失敗した場合はnullを返す
    }
    return null;
  };

  // 各段階のプロンプト展開状態
  const [expandedPromptStages, setExpandedPromptStages] = useState<{ widgetSelection: boolean; ors: boolean; uiSpec: boolean }>({ widgetSelection: false, ors: false, uiSpec: false });

  const togglePromptStage = (stage: 'widgetSelection' | 'ors' | 'uiSpec') => {
    setExpandedPromptStages(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  // W2WR展開状態
  const [w2wrExpanded, setW2wrExpanded] = useState(true);
  const [expandedDependencies, setExpandedDependencies] = useState<Set<number>>(new Set());

  const toggleW2wrSection = () => setW2wrExpanded(prev => !prev);
  const toggleDependency = (index: number) => {
    setExpandedDependencies(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Get current generation
  const currentGeneration = generations[currentStep];

  // W2WR解析結果（現在のgenerationのUISpecから）
  const w2wrAnalysis = useMemo<W2WRAnalysis | null>(() => {
    if (!currentGeneration?.generatedUiSpec) return null;
    return analyzeW2WRFromUISpec(currentGeneration.generatedUiSpec);
  }, [currentGeneration?.generatedUiSpec]);

  // Calculate aggregated metrics from generations (V4対応)
  const aggregatedMetrics = {
    totalTokens: generations.reduce((sum, g) =>
      sum + (g.totalPromptTokens || g.promptTokens || 0) + (g.totalResponseTokens || g.responseTokens || 0), 0),
    totalPromptTokens: generations.reduce((sum, g) => sum + (g.totalPromptTokens || g.promptTokens || 0), 0),
    totalResponseTokens: generations.reduce((sum, g) => sum + (g.totalResponseTokens || g.responseTokens || 0), 0),
    totalGenerateDuration: generations.reduce((sum, g) => sum + (g.totalGenerateDuration || g.generateDuration || 0), 0),
    totalRenderDuration: generations.reduce((sum, g) => sum + (g.renderDuration || 0), 0),
  };

  // Stage display names
  const stageNames: Record<string, string> = {
    widget_selection: 'Widget選定 (Selection)',
    diverge: '発散 (Diverge)',
    organize: '整理 (Organize)',
    converge: '収束 (Converge)',
    summary: 'まとめ (Summary)',
    plan: '📋 Plan統合 (Unified)'
  };

  // Dummy handlers for UIRendererV3 (read-only mode)
  const handleWidgetUpdate = useCallback((widgetId: string, data: unknown) => {
    console.log('[ReplayView] Widget update (read-only):', widgetId, data);
  }, []);

  const handleWidgetComplete = useCallback((widgetId: string) => {
    console.log('[ReplayView] Widget complete (read-only):', widgetId);
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.spinner} />
          <p>Loading replay data...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <h2>Error Loading Replay</h2>
          <p>{error || 'Session not found'}</p>
          <Link to="/research-experiment/data/sessions" style={styles.backLink}>
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h2>No Generation Data</h2>
          <p>This session has no recorded generations to replay.</p>
          <Link to={`/research-experiment/data/sessions/${sessionId}`} style={styles.backLink}>
            View Session Details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* In Progress Banner */}
      {!session.completedAt && (
        <div style={styles.inProgressBanner}>
          This session is still in progress. Some stages may not be available yet.
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to={`/research-experiment/data/sessions/${sessionId}`} style={styles.backButton}>
            Back
          </Link>
          <div>
            <h1 style={styles.title}>
              Session Replay
              {!session.completedAt && (
                <span style={styles.inProgressTitleBadge}>In Progress</span>
              )}
            </h1>
            <p style={styles.sessionInfo}>
              {session.caseId} | {session.modelId} | {session.widgetCount} widgets
            </p>
          </div>
        </div>
        <div style={styles.headerControls}>
          {/* View Mode Toggle */}
          <div style={styles.viewModeToggle}>
            <button
              onClick={() => setViewMode('widget')}
              style={{
                ...styles.viewModeButton,
                ...(viewMode === 'widget' ? styles.viewModeButtonActive : {})
              }}
            >
              Widget
            </button>
            <button
              onClick={() => setViewMode('data')}
              style={{
                ...styles.viewModeButton,
                ...(viewMode === 'data' ? styles.viewModeButtonActive : {})
              }}
            >
              Data
            </button>
          </div>
          <button
            onClick={() => setShowMetaPanel(!showMetaPanel)}
            style={{
              ...styles.toggleButton,
              backgroundColor: showMetaPanel ? '#3B82F6' : '#E5E7EB'
            }}
          >
            {showMetaPanel ? 'Hide Info' : 'Show Info'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Meta Panel (collapsible) */}
        {showMetaPanel && (
          <aside style={styles.metaPanel}>
            <div style={styles.metaSection}>
              <h3 style={styles.metaSectionTitle}>Session Info</h3>
              <div style={styles.metaGrid}>
                <MetaItem label="Type" value={session.experimentType} />
                <MetaItem label="Case" value={session.caseId} />
                <MetaItem label="Model" value={session.modelId} />
                <MetaItem label="Widgets" value={String(session.widgetCount)} />
              </div>
            </div>

            <div style={styles.metaSection}>
              <h3 style={styles.metaSectionTitle}>Metrics</h3>
              <div style={styles.metaGrid}>
                <MetaItem
                  label="Total Tokens"
                  value={aggregatedMetrics.totalTokens.toLocaleString()}
                />
                <MetaItem
                  label="Prompt"
                  value={aggregatedMetrics.totalPromptTokens.toLocaleString()}
                />
                <MetaItem
                  label="Response"
                  value={aggregatedMetrics.totalResponseTokens.toLocaleString()}
                />
                <MetaItem
                  label="Generate Time"
                  value={`${aggregatedMetrics.totalGenerateDuration.toLocaleString()}ms`}
                />
                <MetaItem
                  label="Render Time"
                  value={`${aggregatedMetrics.totalRenderDuration.toLocaleString()}ms`}
                />
                <MetaItem
                  label="Stages"
                  value={`${generations.length}`}
                />
                <MetaItem
                  label="Status"
                  value={session.generationSuccess ? 'Success' : session.completedAt ? 'Completed' : 'In Progress'}
                  highlight={session.generationSuccess ? 'success' : undefined}
                />
              </div>
            </div>

            <div style={styles.metaSection}>
              <h3 style={styles.metaSectionTitle}>Concern</h3>
              <p style={styles.concernText}>{session.concernText}</p>
            </div>

            <div style={styles.metaSection}>
              <h3 style={styles.metaSectionTitle}>Timestamps</h3>
              <div style={styles.metaGrid}>
                <MetaItem label="Started" value={formatDate(session.startedAt)} />
                <MetaItem
                  label="Completed"
                  value={session.completedAt ? formatDate(session.completedAt) : '-'}
                />
              </div>
            </div>
          </aside>
        )}

        {/* Generation Display Area */}
        <main style={styles.widgetArea}>
          {/* Progress Bar */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${((currentStep + 1) / generations.length) * 100}%`
                }}
              />
            </div>
            <span style={styles.progressText}>
              Stage {currentStep + 1} of {generations.length}
            </span>
          </div>

          {/* Step Indicator Pills */}
          <div style={styles.stepIndicators}>
            {generations.map((gen, idx) => {
              const isPlanUnified = gen.stage === 'plan';
              const isWidgetSelection = gen.stage === 'widget_selection';
              const getBackgroundColor = () => {
                if (idx === currentStep) {
                  return isPlanUnified ? '#0ea5e9' : isWidgetSelection ? '#7c3aed' : '#3B82F6';
                }
                if (idx < currentStep) return '#10B981';
                return '#E5E7EB';
              };
              return (
                <button
                  key={gen.id}
                  onClick={() => goToStep(idx)}
                  style={{
                    ...styles.stepPill,
                    backgroundColor: getBackgroundColor(),
                    color: idx <= currentStep ? '#fff' : '#6B7280'
                  }}
                  title={`Stage ${idx + 1}: ${stageNames[gen.stage] || gen.stage}`}
                >
                  {isPlanUnified ? '📋' : idx + 1}
                </button>
              );
            })}
          </div>

          {/* Current Generation Display */}
          {currentGeneration && (
            <div style={styles.widgetCard}>
              <div style={styles.widgetHeader}>
                <div>
                  <span style={styles.widgetStep}>Stage {currentStep + 1}</span>
                  <h2 style={styles.widgetType}>{stageNames[currentGeneration.stage] || currentGeneration.stage}</h2>
                </div>
                <div style={styles.headerRight}>
                  <span style={styles.widgetTime}>
                    {formatDate(currentGeneration.createdAt)}
                  </span>
                </div>
              </div>

              {/* Generation Metrics (V4対応) */}
              <div style={styles.metricsBar}>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Model:</span>
                  <span style={styles.metricValue}>
                    {currentGeneration.modelId}
                    {currentGeneration.modelId === 'mock' && (
                      <span style={styles.mockBadge}>Mock</span>
                    )}
                  </span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Prompt:</span>
                  <span style={styles.metricValue}>{currentGeneration.totalPromptTokens || currentGeneration.promptTokens || '-'}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Response:</span>
                  <span style={styles.metricValue}>{currentGeneration.totalResponseTokens || currentGeneration.responseTokens || '-'}</span>
                </div>
                {/* V4: 各段階の時間 */}
                {currentGeneration.widgetSelectionDuration && (
                  <div style={styles.metricItem}>
                    <span style={styles.metricLabel}>WS:</span>
                    <span style={styles.metricValue}>{currentGeneration.widgetSelectionDuration}ms</span>
                  </div>
                )}
                {currentGeneration.orsDuration && (
                  <div style={styles.metricItem}>
                    <span style={styles.metricLabel}>ORS:</span>
                    <span style={styles.metricValue}>{currentGeneration.orsDuration}ms</span>
                  </div>
                )}
                {currentGeneration.uiSpecDuration && (
                  <div style={styles.metricItem}>
                    <span style={styles.metricLabel}>UI:</span>
                    <span style={styles.metricValue}>{currentGeneration.uiSpecDuration}ms</span>
                  </div>
                )}
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Total:</span>
                  <span style={styles.metricValue}>{currentGeneration.totalGenerateDuration || currentGeneration.generateDuration ? `${currentGeneration.totalGenerateDuration || currentGeneration.generateDuration}ms` : '-'}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Render:</span>
                  <span style={styles.metricValue}>{currentGeneration.renderDuration ? `${currentGeneration.renderDuration}ms` : '-'}</span>
                </div>
              </div>

              {/* Widget View Mode - V4: generatedUiSpec を優先, fallback to generatedDsl */}
              {/* DSL v5: PlanUISpecの場合はflattenしてからUIRendererV3に渡す */}
              {viewMode === 'widget' && (currentGeneration.generatedUiSpec || currentGeneration.generatedDsl) && (() => {
                const rawUiSpec = currentGeneration.generatedUiSpec || currentGeneration.generatedDsl;
                const uiSpecForRenderer = isPlanUISpec(rawUiSpec)
                  ? flattenPlanUISpecToUISpec(rawUiSpec)
                  : rawUiSpec;
                return (
                  <div style={styles.widgetRenderArea}>
                    <div style={styles.readOnlyBanner}>
                      Read-Only Preview - Interactions are disabled
                    </div>
                    <div style={styles.widgetContainer}>
                      <UIRendererV3
                        uiSpec={uiSpecForRenderer}
                        onWidgetUpdate={handleWidgetUpdate}
                        onWidgetComplete={handleWidgetComplete}
                      />
                    </div>
                  </div>
                );
              })()}

              {viewMode === 'widget' && !currentGeneration.generatedUiSpec && !currentGeneration.generatedDsl && (
                <div style={styles.noWidgetMessage}>
                  No widget data available for this stage
                </div>
              )}

              {/* Data View Mode (V4対応) */}
              {viewMode === 'data' && (
                <>
                  {/* 2段階プロンプト表示 (ORS/DpG + UISpec / Plan ORS + Plan UISpec) */}
                  {(() => {
                    const parsedPrompt = parsePromptData(currentGeneration.prompt);

                    // Widget Selectionモード (widgetSelection)
                    if (parsedPrompt && parsedPrompt.widgetSelection) {
                      return (
                        <div style={styles.promptStagesContainer}>
                          <div style={styles.promptStageCard}>
                            <div
                              style={styles.promptStageHeader}
                              onClick={() => togglePromptStage('widgetSelection')}
                            >
                              <div style={styles.promptStageHeaderLeft}>
                                <span style={styles.promptStageIcon}>
                                  {expandedPromptStages.widgetSelection ? '▼' : '▶'}
                                </span>
                                <span style={styles.promptStageBadgeWidgetSelection}>Widget Selection</span>
                                <span style={styles.promptStageTitle}>Generation Prompt</span>
                              </div>
                              <div style={styles.promptStageHeaderRight}>
                                {currentGeneration.widgetSelectionDuration && (
                                  <span style={styles.promptStageMetric}>{currentGeneration.widgetSelectionDuration}ms</span>
                                )}
                              </div>
                            </div>
                            {expandedPromptStages.widgetSelection && (
                              <div style={styles.promptStageBody}>
                                {parsedPrompt.widgetSelection.inputParams && (
                                  <div style={styles.inputParamsBox}>
                                    <div style={styles.inputParamsTitle}>Input Parameters</div>
                                    <div style={styles.inputParamsGrid}>
                                      {Object.entries(parsedPrompt.widgetSelection.inputParams).map(([key, value]) => (
                                        <div key={key}><span style={styles.inputParamLabel}>{key}:</span> {String(value ?? '-')}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <pre style={styles.promptPreWidgetSelection}>
                                  {parsedPrompt.widgetSelection.prompt || 'Prompt not available'}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // DSL v5 Plan統合モード (planOrs + planUiSpec)
                    if (parsedPrompt && (parsedPrompt.planOrs || parsedPrompt.planUiSpec)) {
                      return (
                        <div style={styles.promptStagesContainer}>
                          {/* Plan ORS Generation Prompt */}
                          {parsedPrompt.planOrs && (
                            <div style={styles.promptStageCard}>
                              <div
                                style={styles.promptStageHeader}
                                onClick={() => togglePromptStage('ors')}
                              >
                                <div style={styles.promptStageHeaderLeft}>
                                  <span style={styles.promptStageIcon}>
                                    {expandedPromptStages.ors ? '▼' : '▶'}
                                  </span>
                                  <span style={styles.promptStageBadgeOrs}>Plan ORS</span>
                                  <span style={styles.promptStageTitle}>Generation Prompt</span>
                                </div>
                                <div style={styles.promptStageHeaderRight}>
                                  {currentGeneration.orsDuration && (
                                    <span style={styles.promptStageMetric}>{currentGeneration.orsDuration}ms</span>
                                  )}
                                </div>
                              </div>
                              {expandedPromptStages.ors && (
                                <div style={styles.promptStageBody}>
                                  {parsedPrompt.planOrs.inputParams && (
                                    <div style={styles.inputParamsBox}>
                                      <div style={styles.inputParamsTitle}>Input Parameters</div>
                                      <div style={styles.inputParamsGrid}>
                                        <div><span style={styles.inputParamLabel}>bottleneckType:</span> {parsedPrompt.planOrs.inputParams.bottleneckType || '-'}</div>
                                      </div>
                                    </div>
                                  )}
                                  <pre style={styles.promptPreOrs}>
                                    {parsedPrompt.planOrs.prompt || 'Prompt not available'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Plan UISpec Generation Prompt */}
                          {parsedPrompt.planUiSpec && (
                            <div style={styles.promptStageCard}>
                              <div
                                style={styles.promptStageHeader}
                                onClick={() => togglePromptStage('uiSpec')}
                              >
                                <div style={styles.promptStageHeaderLeft}>
                                  <span style={styles.promptStageIcon}>
                                    {expandedPromptStages.uiSpec ? '▼' : '▶'}
                                  </span>
                                  <span style={styles.promptStageBadgeUiSpec}>Plan UISpec</span>
                                  <span style={styles.promptStageTitle}>Generation Prompt</span>
                                </div>
                                <div style={styles.promptStageHeaderRight}>
                                  {currentGeneration.uiSpecDuration && (
                                    <span style={styles.promptStageMetric}>{currentGeneration.uiSpecDuration}ms</span>
                                  )}
                                </div>
                              </div>
                              {expandedPromptStages.uiSpec && (
                                <div style={styles.promptStageBody}>
                                  {parsedPrompt.planUiSpec.inputParams && (
                                    <div style={styles.inputParamsBox}>
                                      <div style={styles.inputParamsTitle}>Input Parameters</div>
                                      <div style={styles.inputParamsGrid}>
                                        <div><span style={styles.inputParamLabel}>enableReactivity:</span> {String(parsedPrompt.planUiSpec.inputParams.enableReactivity ?? '-')}</div>
                                      </div>
                                    </div>
                                  )}
                                  <pre style={styles.promptPreUiSpec}>
                                    {parsedPrompt.planUiSpec.prompt || 'Prompt not available'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // 通常モード (ors + uiSpec)
                    if (parsedPrompt && (parsedPrompt.ors || parsedPrompt.uiSpec)) {
                      return (
                        <div style={styles.promptStagesContainer}>
                          {/* ORS/DpG Generation Prompt */}
                          {parsedPrompt.ors && (
                            <div style={styles.promptStageCard}>
                              <div
                                style={styles.promptStageHeader}
                                onClick={() => togglePromptStage('ors')}
                              >
                                <div style={styles.promptStageHeaderLeft}>
                                  <span style={styles.promptStageIcon}>
                                    {expandedPromptStages.ors ? '▼' : '▶'}
                                  </span>
                                  <span style={styles.promptStageBadgeOrs}>ORS/DpG</span>
                                  <span style={styles.promptStageTitle}>Generation Prompt</span>
                                </div>
                                <div style={styles.promptStageHeaderRight}>
                                  {currentGeneration.orsDuration && (
                                    <span style={styles.promptStageMetric}>{currentGeneration.orsDuration}ms</span>
                                  )}
                                </div>
                              </div>
                              {expandedPromptStages.ors && (
                                <div style={styles.promptStageBody}>
                                  {parsedPrompt.ors.inputParams && (
                                    <div style={styles.inputParamsBox}>
                                      <div style={styles.inputParamsTitle}>Input Parameters</div>
                                      <div style={styles.inputParamsGrid}>
                                        <div><span style={styles.inputParamLabel}>stage:</span> {parsedPrompt.ors.inputParams.stage || '-'}</div>
                                      </div>
                                    </div>
                                  )}
                                  <pre style={styles.promptPreOrs}>
                                    {parsedPrompt.ors.prompt || 'Prompt not available'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {/* UISpec Generation Prompt */}
                          {parsedPrompt.uiSpec && (
                            <div style={styles.promptStageCard}>
                              <div
                                style={styles.promptStageHeader}
                                onClick={() => togglePromptStage('uiSpec')}
                              >
                                <div style={styles.promptStageHeaderLeft}>
                                  <span style={styles.promptStageIcon}>
                                    {expandedPromptStages.uiSpec ? '▼' : '▶'}
                                  </span>
                                  <span style={styles.promptStageBadgeUiSpec}>UISpec</span>
                                  <span style={styles.promptStageTitle}>Generation Prompt</span>
                                </div>
                                <div style={styles.promptStageHeaderRight}>
                                  {currentGeneration.uiSpecDuration && (
                                    <span style={styles.promptStageMetric}>{currentGeneration.uiSpecDuration}ms</span>
                                  )}
                                </div>
                              </div>
                              {expandedPromptStages.uiSpec && (
                                <div style={styles.promptStageBody}>
                                  {parsedPrompt.uiSpec.inputParams && (
                                    <div style={styles.inputParamsBox}>
                                      <div style={styles.inputParamsTitle}>Input Parameters</div>
                                      <div style={styles.inputParamsGrid}>
                                        <div><span style={styles.inputParamLabel}>stage:</span> {parsedPrompt.uiSpec.inputParams.stage || '-'}</div>
                                        <div><span style={styles.inputParamLabel}>enableReactivity:</span> {String(parsedPrompt.uiSpec.inputParams.enableReactivity ?? '-')}</div>
                                      </div>
                                    </div>
                                  )}
                                  <pre style={styles.promptPreUiSpec}>
                                    {parsedPrompt.uiSpec.prompt || 'Prompt not available'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Legacy: 旧形式のプロンプト
                    if (currentGeneration.prompt) {
                      return (
                        <div style={styles.widgetSection}>
                          <div style={styles.sectionHeader}>
                            <h4 style={styles.sectionTitle}>Prompt (Legacy)</h4>
                            <button
                              onClick={() => setShowPrompt(!showPrompt)}
                              style={styles.expandButton}
                            >
                              {showPrompt ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          {showPrompt && (
                            <pre style={styles.promptPre}>{currentGeneration.prompt}</pre>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* V4: Widget Selection Result */}
                  {currentGeneration.generatedWidgetSelection && (
                    <div style={styles.widgetSection}>
                      <h4 style={styles.sectionTitle}>Widget Selection (Stage 1)</h4>
                      <pre style={styles.jsonPre}>
                        {formatJson(currentGeneration.generatedWidgetSelection)}
                      </pre>
                    </div>
                  )}

                  {/* V4: ORS */}
                  {currentGeneration.generatedOrs && (
                    <div style={styles.widgetSection}>
                      <h4 style={styles.sectionTitle}>ORS (Stage 2)</h4>
                      <pre style={styles.jsonPre}>
                        {formatJson(currentGeneration.generatedOrs)}
                      </pre>
                    </div>
                  )}

                  {/* V4: UISpec */}
                  {currentGeneration.generatedUiSpec && (
                    <div style={styles.widgetSection}>
                      <h4 style={styles.sectionTitle}>UISpec (Stage 3)</h4>
                      <pre style={styles.jsonPre}>
                        {formatJson(currentGeneration.generatedUiSpec)}
                      </pre>
                    </div>
                  )}

                  {/* W2WR Reactivity Analysis */}
                  {w2wrAnalysis && (
                    <div style={styles.w2wrSection}>
                      {/* W2WR Header */}
                      <div
                        style={styles.w2wrHeader}
                        onClick={toggleW2wrSection}
                      >
                        <div style={styles.w2wrHeaderLeft}>
                          <span style={styles.w2wrIcon}>
                            {w2wrExpanded ? '\u25BC' : '\u25B6'}
                          </span>
                          <span style={styles.w2wrBadge}>W2WR</span>
                          <span style={styles.w2wrTitle}>Reactivity Analysis</span>
                        </div>
                        <div style={styles.w2wrHeaderRight}>
                          <span style={styles.w2wrMetric}>
                            {w2wrAnalysis.totalCount} dependencies
                          </span>
                        </div>
                      </div>

                      {/* W2WR Content */}
                      {w2wrExpanded && (
                        <div style={styles.w2wrBody}>
                          {/* Source Info */}
                          <div style={styles.w2wrSourceInfo}>
                            <span style={styles.w2wrSourceLabel}>Source:</span>
                            <span style={{
                              ...styles.w2wrSourceBadge,
                              backgroundColor: w2wrAnalysis.source === 'reactiveBindings' ? '#3B82F6' :
                                              w2wrAnalysis.source === 'dpg' ? '#8B5CF6' : '#6B7280'
                            }}>
                              {w2wrAnalysis.source === 'reactiveBindings' ? 'reactiveBindings (v4/v5)' :
                               w2wrAnalysis.source === 'dpg' ? 'dpg (v3)' : 'none'}
                            </span>
                            {w2wrAnalysis.dslVersion && (
                              <span style={styles.w2wrVersionBadge}>v{w2wrAnalysis.dslVersion}</span>
                            )}
                          </div>

                          {/* Summary */}
                          <div style={styles.w2wrSummary}>
                            <div style={styles.w2wrSummaryRow}>
                              <span style={styles.w2wrSummaryLabel}>Total:</span>
                              <span style={styles.w2wrSummaryValue}>{w2wrAnalysis.totalCount}</span>
                            </div>
                            <div style={styles.w2wrSummaryRow}>
                              <span style={styles.w2wrSummaryLabel}>Valid:</span>
                              <span style={{
                                ...styles.w2wrSummaryValue,
                                color: '#10B981'
                              }}>
                                {w2wrAnalysis.validCount}
                              </span>
                            </div>
                            <div style={styles.w2wrSummaryRow}>
                              <span style={styles.w2wrSummaryLabel}>Errors:</span>
                              <span style={{
                                ...styles.w2wrSummaryValue,
                                color: w2wrAnalysis.errorCount > 0 ? '#EF4444' : '#6B7280'
                              }}>
                                {w2wrAnalysis.errorCount}
                              </span>
                            </div>
                            <div style={styles.w2wrSummaryRow}>
                              <span style={styles.w2wrSummaryLabel}>Cycle:</span>
                              {w2wrAnalysis.hasCycle ? (
                                <span style={styles.w2wrBadgeError}>Detected</span>
                              ) : (
                                <span style={styles.w2wrBadgeOk}>OK</span>
                              )}
                            </div>
                          </div>

                          {/* Cycle Error Message */}
                          {w2wrAnalysis.cycleError && (
                            <div style={styles.w2wrCycleError}>
                              {w2wrAnalysis.cycleError}
                            </div>
                          )}

                          {/* Dependencies List */}
                          {w2wrAnalysis.dependencies.length > 0 && (
                            <div style={styles.w2wrDependenciesList}>
                              <div style={styles.w2wrListHeader}>Dependencies</div>
                              {w2wrAnalysis.dependencies.map((dep, index) => (
                                <div key={index} style={styles.w2wrDependencyItem}>
                                  {/* Dependency Header */}
                                  <div
                                    style={styles.w2wrDepHeader}
                                    onClick={() => toggleDependency(index)}
                                  >
                                    <div style={styles.w2wrDepHeaderLeft}>
                                      <span style={styles.w2wrDepIcon}>
                                        {expandedDependencies.has(index) ? '\u25BC' : '\u25B6'}
                                      </span>
                                      <span style={styles.w2wrDepIndex}>#{index + 1}</span>
                                      <span style={styles.w2wrDepPath}>
                                        {dep.source} <span style={styles.w2wrDepArrow}>\u2192</span> {dep.target}
                                      </span>
                                    </div>
                                    <div style={styles.w2wrDepHeaderRight}>
                                      {dep.validation.isValid ? (
                                        <span style={styles.w2wrBadgeOk}>OK</span>
                                      ) : (
                                        <span style={styles.w2wrBadgeError}>Error</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Dependency Details */}
                                  {expandedDependencies.has(index) && (
                                    <div style={styles.w2wrDepDetails}>
                                      <div style={styles.w2wrDepDetailRow}>
                                        <span style={styles.w2wrDepDetailLabel}>Mechanism:</span>
                                        <span style={styles.w2wrDepDetailValue}>{dep.mechanism || '-'}</span>
                                      </div>
                                      <div style={styles.w2wrDepDetailRow}>
                                        <span style={styles.w2wrDepDetailLabel}>Update Mode:</span>
                                        <span style={styles.w2wrDepDetailValue}>{dep.updateMode || '-'}</span>
                                      </div>
                                      <div style={styles.w2wrDepDetailRow}>
                                        <span style={styles.w2wrDepDetailLabel}>Relationship:</span>
                                        <span style={styles.w2wrDepDetailValue}>{dep.relationshipType || '-'}</span>
                                      </div>
                                      {dep.javascriptCode && (
                                        <div style={styles.w2wrDepCodeBlock}>
                                          <div style={styles.w2wrDepCodeLabel}>JavaScript:</div>
                                          <pre style={styles.w2wrDepCode}>{dep.javascriptCode}</pre>
                                        </div>
                                      )}
                                      {dep.transformFunction && (
                                        <div style={styles.w2wrDepDetailRow}>
                                          <span style={styles.w2wrDepDetailLabel}>Transform:</span>
                                          <code style={styles.w2wrDepDetailCode}>{dep.transformFunction}</code>
                                        </div>
                                      )}
                                      {dep.llmPrompt && (
                                        <div style={styles.w2wrDepCodeBlock}>
                                          <div style={styles.w2wrDepCodeLabel}>LLM Prompt:</div>
                                          <pre style={styles.w2wrDepCode}>{dep.llmPrompt}</pre>
                                        </div>
                                      )}
                                      {/* Validation Errors */}
                                      {!dep.validation.isValid && dep.validation.errors.length > 0 && (
                                        <div style={styles.w2wrDepErrors}>
                                          <div style={styles.w2wrDepErrorsLabel}>Validation Errors:</div>
                                          <ul style={styles.w2wrDepErrorsList}>
                                            {dep.validation.errors.map((err, errIdx) => (
                                              <li key={errIdx} style={styles.w2wrDepErrorItem}>{err}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* No Dependencies Message */}
                          {w2wrAnalysis.dependencies.length === 0 && (
                            <div style={styles.w2wrNoDeps}>
                              No W2WR dependencies defined in this stage.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legacy: Generated OODM (backward compatibility) */}
                  {currentGeneration.generatedOodm && !currentGeneration.generatedOrs && (
                    <div style={styles.widgetSection}>
                      <h4 style={styles.sectionTitle}>Generated OODM (Legacy)</h4>
                      <pre style={styles.jsonPre}>
                        {formatJson(currentGeneration.generatedOodm)}
                      </pre>
                    </div>
                  )}

                  {/* Legacy: Generated DSL (backward compatibility) */}
                  {currentGeneration.generatedDsl && !currentGeneration.generatedUiSpec && (
                    <div style={styles.widgetSection}>
                      <h4 style={styles.sectionTitle}>Generated DSL (Legacy)</h4>
                      <pre style={styles.jsonPre}>
                        {formatJson(currentGeneration.generatedDsl)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div style={styles.navControls}>
            <button
              onClick={goToPrevStep}
              disabled={currentStep === 0}
              style={{
                ...styles.navButton,
                opacity: currentStep === 0 ? 0.5 : 1
              }}
            >
              Previous
            </button>
            <div style={styles.navInfo}>
              <span style={styles.navKeys}>Use arrow keys to navigate</span>
            </div>
            <button
              onClick={goToNextStep}
              disabled={currentStep === generations.length - 1}
              style={{
                ...styles.navButton,
                opacity: currentStep === generations.length - 1 ? 0.5 : 1
              }}
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

// Meta Item Component
interface MetaItemProps {
  label: string;
  value: string;
  highlight?: 'success' | 'error';
}

function MetaItem({ label, value, highlight }: MetaItemProps) {
  const valueStyle = {
    ...styles.metaValue,
    ...(highlight === 'success' && { color: '#10B981' }),
    ...(highlight === 'error' && { color: '#EF4444' })
  };

  return (
    <div style={styles.metaItem}>
      <span style={styles.metaLabel}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F3F4F6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  inProgressBanner: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: 500,
    textAlign: 'center',
    borderBottom: '1px solid #FCD34D'
  },
  inProgressTitleBadge: {
    marginLeft: '12px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: '#F59E0B',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    verticalAlign: 'middle'
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#6B7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E7EB',
    borderTopColor: '#3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#EF4444',
    textAlign: 'center'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#6B7280',
    textAlign: 'center'
  },
  backLink: {
    color: '#3B82F6',
    textDecoration: 'none',
    marginTop: '16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #E5E7EB'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px'
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    margin: 0
  },
  sessionInfo: {
    fontSize: '12px',
    color: '#6B7280',
    margin: '4px 0 0 0'
  },
  headerControls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  viewModeToggle: {
    display: 'flex',
    backgroundColor: '#E5E7EB',
    borderRadius: '6px',
    padding: '2px'
  },
  viewModeButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#6B7280'
  },
  viewModeButtonActive: {
    backgroundColor: '#fff',
    color: '#111827',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  toggleButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#fff'
  },
  mainContent: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    maxWidth: '1600px',
    margin: '0 auto'
  },
  metaPanel: {
    width: '300px',
    flexShrink: 0,
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    padding: '16px',
    height: 'fit-content',
    position: 'sticky',
    top: '24px'
  },
  metaSection: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #F3F4F6'
  },
  metaSectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 12px 0'
  },
  metaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  metaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metaLabel: {
    fontSize: '13px',
    color: '#6B7280'
  },
  metaValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 500
  },
  concernText: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.5,
    margin: 0
  },
  widgetArea: {
    flex: 1,
    minWidth: 0
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '13px',
    color: '#6B7280',
    whiteSpace: 'nowrap'
  },
  stepIndicators: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '20px'
  },
  stepPill: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  widgetCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    marginBottom: '20px'
  },
  widgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB'
  },
  widgetStep: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  widgetType: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '8px 0 0 0'
  },
  widgetTime: {
    fontSize: '12px',
    color: '#6B7280'
  },
  metricsBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '12px 20px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB'
  },
  metricItem: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6B7280'
  },
  metricValue: {
    fontSize: '12px',
    color: '#111827',
    fontWeight: 500,
    fontFamily: 'monospace'
  },
  mockBadge: {
    marginLeft: '8px',
    padding: '2px 8px',
    backgroundColor: '#FCD34D',
    color: '#92400E',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  widgetRenderArea: {
    padding: '0'
  },
  readOnlyBanner: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 500,
    textAlign: 'center',
    borderBottom: '1px solid #FCD34D'
  },
  widgetContainer: {
    padding: '20px',
    minHeight: '200px',
    backgroundColor: '#FAFAFA'
  },
  noWidgetMessage: {
    padding: '40px',
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: '14px'
  },
  widgetSection: {
    padding: '16px 20px',
    borderBottom: '1px solid #F3F4F6'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    margin: 0
  },
  expandButton: {
    padding: '4px 8px',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#6B7280',
    cursor: 'pointer'
  },
  promptPre: {
    backgroundColor: '#FEF3C7',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '300px',
    margin: '8px 0 0 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid #FCD34D'
  },
  jsonPre: {
    backgroundColor: '#F9FAFB',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '400px',
    margin: '8px 0 0 0'
  },
  navControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  navButton: {
    padding: '12px 24px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  navInfo: {
    textAlign: 'center'
  },
  navKeys: {
    fontSize: '12px',
    color: '#9CA3AF'
  },
  // 2段階プロンプト表示用スタイル
  promptStagesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px 20px'
  },
  promptStageCard: {
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  promptStageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#F9FAFB',
    cursor: 'pointer',
    userSelect: 'none'
  },
  promptStageHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  promptStageHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  promptStageIcon: {
    fontSize: '10px',
    color: '#6B7280',
    width: '12px'
  },
  promptStageBadgeWidgetSelection: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  promptStageBadgeOrs: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  promptStageBadgeUiSpec: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  promptStageTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151'
  },
  promptStageMetric: {
    fontSize: '12px',
    color: '#6B7280',
    fontFamily: 'monospace'
  },
  promptStageBody: {
    padding: '12px 14px',
    borderTop: '1px solid #E5E7EB'
  },
  inputParamsBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
    padding: '10px 12px',
    marginBottom: '12px'
  },
  inputParamsTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6B7280',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  inputParamsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 16px',
    fontSize: '12px',
    color: '#374151'
  },
  inputParamLabel: {
    fontWeight: 500,
    color: '#6B7280'
  },
  promptPreWidgetSelection: {
    backgroundColor: '#FAF5FF',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '400px',
    margin: 0,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid #DDD6FE'
  },
  promptPreOrs: {
    backgroundColor: '#F0F9FF',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '400px',
    margin: 0,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid #BAE6FD'
  },
  promptPreUiSpec: {
    backgroundColor: '#FAF5FF',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '400px',
    margin: 0,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid #DDD6FE'
  },
  // W2WR Reactivity Analysis スタイル
  w2wrSection: {
    margin: '16px 20px',
    border: '1px solid #F59E0B',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#FFFBEB'
  },
  w2wrHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#FEF3C7',
    cursor: 'pointer',
    userSelect: 'none'
  },
  w2wrHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  w2wrHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  w2wrIcon: {
    fontSize: '10px',
    color: '#92400E',
    width: '12px'
  },
  w2wrBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#92400E',
    backgroundColor: '#FCD34D',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  w2wrTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#92400E'
  },
  w2wrMetric: {
    fontSize: '12px',
    color: '#92400E',
    fontFamily: 'monospace'
  },
  w2wrBody: {
    padding: '12px 14px',
    borderTop: '1px solid #FCD34D',
    backgroundColor: '#FFFBEB'
  },
  w2wrSourceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: '#F3F4F6',
    borderRadius: '6px'
  },
  w2wrSourceLabel: {
    fontSize: '12px',
    color: '#4B5563',
    fontWeight: 500
  },
  w2wrSourceBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#FFFFFF',
    padding: '3px 10px',
    borderRadius: '4px'
  },
  w2wrVersionBadge: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  w2wrSummary: {
    display: 'flex',
    gap: '24px',
    padding: '10px 12px',
    backgroundColor: '#FEF3C7',
    borderRadius: '6px',
    marginBottom: '12px'
  },
  w2wrSummaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  w2wrSummaryLabel: {
    fontSize: '12px',
    color: '#92400E',
    fontWeight: 500
  },
  w2wrSummaryValue: {
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'monospace'
  },
  w2wrBadgeOk: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  w2wrBadgeError: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#991B1B',
    backgroundColor: '#FEE2E2',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  w2wrCycleError: {
    padding: '10px 12px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '12px',
    border: '1px solid #FECACA'
  },
  w2wrDependenciesList: {
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  w2wrListHeader: {
    padding: '8px 12px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
    fontSize: '11px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  w2wrDependencyItem: {
    borderBottom: '1px solid #E5E7EB'
  },
  w2wrDepHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: '#fff'
  },
  w2wrDepHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  w2wrDepHeaderRight: {
    display: 'flex',
    alignItems: 'center'
  },
  w2wrDepIcon: {
    fontSize: '10px',
    color: '#6B7280',
    width: '12px'
  },
  w2wrDepIndex: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  w2wrDepPath: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#374151'
  },
  w2wrDepArrow: {
    color: '#9CA3AF',
    margin: '0 4px'
  },
  w2wrDepDetails: {
    padding: '12px',
    backgroundColor: '#F9FAFB',
    borderTop: '1px solid #E5E7EB'
  },
  w2wrDepDetailRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
    fontSize: '12px'
  },
  w2wrDepDetailLabel: {
    fontWeight: 500,
    color: '#6B7280',
    minWidth: '100px'
  },
  w2wrDepDetailValue: {
    color: '#374151',
    fontFamily: 'monospace'
  },
  w2wrDepDetailCode: {
    backgroundColor: '#E5E7EB',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px'
  },
  w2wrDepCodeBlock: {
    marginTop: '8px',
    marginBottom: '8px'
  },
  w2wrDepCodeLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#6B7280',
    marginBottom: '4px'
  },
  w2wrDepCode: {
    backgroundColor: '#1F2937',
    color: '#F3F4F6',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '200px',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  w2wrDepErrors: {
    marginTop: '8px',
    padding: '10px 12px',
    backgroundColor: '#FEE2E2',
    borderRadius: '6px',
    border: '1px solid #FECACA'
  },
  w2wrDepErrorsLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#991B1B',
    marginBottom: '6px'
  },
  w2wrDepErrorsList: {
    margin: 0,
    paddingLeft: '20px'
  },
  w2wrDepErrorItem: {
    fontSize: '12px',
    color: '#991B1B',
    marginBottom: '2px'
  },
  w2wrNoDeps: {
    padding: '20px',
    textAlign: 'center',
    color: '#6B7280',
    fontSize: '13px'
  }
};
