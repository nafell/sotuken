/**
 * StageSummary.tsx
 * DSL v4 ステージサマリーWidget
 *
 * TASK-4.2: stage_summary Widget実装
 *
 * 前ステージまでの操作内容を要約表示するWidget。
 * 各WidgetのsummarizationPromptを使用して言語化された結果を表示。
 *
 * @since DSL v4.0
 */

import { useMemo } from 'react';
import type { StageType } from '../../../../types/v4/ors.types';
import { STAGE_NAMES, STAGE_DISPLAY_NAMES } from '../../../../types/v4/widget-selection.types';

// =============================================================================
// Types
// =============================================================================

/**
 * Widget操作サマリー
 */
export interface WidgetSummaryItem {
  /** Widget ID */
  widgetId: string;
  /** Widgetコンポーネント種別 */
  widgetComponent: string;
  /** Widget表示名 */
  widgetName: string;
  /** 言語化されたサマリー */
  summary: string;
  /** 元データ（オプション） */
  rawData?: unknown;
}

/**
 * ステージサマリーアイテム
 */
export interface StageSummaryItem {
  /** ステージID */
  stageId: StageType;
  /** ステージ名 */
  stageName: string;
  /** ステージの目的 */
  stagePurpose?: string;
  /** Widget操作サマリーリスト */
  widgets: WidgetSummaryItem[];
  /** スキップされたか */
  skipped?: boolean;
  /** 完了日時 */
  completedAt?: string;
}

/**
 * StageSummaryProps
 */
export interface StageSummaryProps {
  /** 設定 */
  config: {
    /** 前ステージのサマリーデータ */
    previousStages: StageSummaryItem[];
    /** タイトル */
    title?: string;
    /** 空の場合のメッセージ */
    emptyMessage?: string;
  };
  /** Widget ID */
  widgetId?: string;
  /** カスタムクラス名 */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Widget IDを表示名に変換
 */
function getWidgetDisplayName(component: string): string {
  const nameMap: Record<string, string> = {
    emotion_palette: '感情パレット',
    brainstorm_cards: 'ブレインストームカード',
    concern_map: '関心マップ',
    free_writing: 'フリーライティング',
    card_sorting: 'カード分類',
    matrix_placement: 'マトリクス配置',
    timeline_view: 'タイムラインビュー',
    priority_slider_grid: '優先度スライダー',
    decision_balance: '判断バランス',
    action_cards: 'アクションカード',
    summary_view: 'サマリービュー',
    export_options: 'エクスポート',
    stage_summary: 'ステージサマリー',
    // 追加のWidget名
    mind_map: 'マインドマップ',
    structured_summary: '構造化サマリー',
    question_card_chain: '質問カードチェーン',
  };
  return nameMap[component] || component;
}

/**
 * ステージの色を取得
 */
function getStageColor(stage: StageType): string {
  const colorMap: Record<StageType, string> = {
    diverge: '#8b5cf6',   // purple
    organize: '#3b82f6',  // blue
    converge: '#10b981',  // green
    summary: '#f59e0b',   // amber
  };
  return colorMap[stage] || '#6b7280';
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * 単一ステージの表示
 */
interface StageBlockProps {
  stage: StageSummaryItem;
  isLast: boolean;
}

function StageBlock({ stage, isLast }: StageBlockProps) {
  const color = getStageColor(stage.stageId);

  if (stage.skipped) {
    return (
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '0.75rem',
          padding: '1rem',
          opacity: 0.6,
          borderLeft: `4px solid #6b7280`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#9ca3af', fontWeight: 'bold', fontSize: '0.875rem' }}>
            {STAGE_NAMES[stage.stageId]}
          </span>
          <span
            style={{
              backgroundColor: '#374151',
              color: '#9ca3af',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.625rem',
            }}
          >
            スキップ
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '0.75rem',
        padding: '1rem',
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* ステージヘッダー */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: color, fontWeight: 'bold', fontSize: '0.875rem' }}>
            {STAGE_NAMES[stage.stageId]}
          </span>
          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
            ({STAGE_DISPLAY_NAMES[stage.stageId]})
          </span>
        </div>
        {stage.stagePurpose && (
          <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>
            {stage.stagePurpose}
          </p>
        )}
      </div>

      {/* Widgetサマリーリスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {stage.widgets.map((widget, index) => (
          <WidgetSummaryBlock key={`${widget.widgetId}-${index}`} widget={widget} color={color} />
        ))}
      </div>

      {/* 完了時刻 */}
      {stage.completedAt && (
        <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
          <span style={{ color: '#64748b', fontSize: '0.625rem' }}>
            完了: {new Date(stage.completedAt).toLocaleTimeString('ja-JP')}
          </span>
        </div>
      )}

      {/* コネクター */}
      {!isLast && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '0.75rem',
          }}
        >
          <div
            style={{
              width: '2px',
              height: '1rem',
              backgroundColor: '#374151',
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 単一Widgetサマリーの表示
 */
interface WidgetSummaryBlockProps {
  widget: WidgetSummaryItem;
  color: string;
}

function WidgetSummaryBlock({ widget, color }: WidgetSummaryBlockProps) {
  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        borderRadius: '0.5rem',
        padding: '0.75rem',
      }}
    >
      {/* Widget名 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <div
          style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
        <span style={{ color: '#e2e8f0', fontWeight: '500', fontSize: '0.75rem' }}>
          {widget.widgetName || getWidgetDisplayName(widget.widgetComponent)}
        </span>
      </div>

      {/* サマリーテキスト */}
      <div
        style={{
          color: '#d1d5db',
          fontSize: '0.75rem',
          lineHeight: 1.5,
          paddingLeft: '1rem',
          whiteSpace: 'pre-wrap',
        }}
      >
        {widget.summary}
      </div>
    </div>
  );
}

// =============================================================================
// StageSummary Component
// =============================================================================

/**
 * StageSummary
 *
 * 前ステージまでの操作内容を要約表示
 */
export function StageSummary({ config, widgetId, className = '' }: StageSummaryProps) {
  const { previousStages, title = 'これまでの整理内容', emptyMessage = 'まだ整理内容がありません' } = config;

  // 空でないステージをフィルタ
  const nonEmptyStages = useMemo(
    () => previousStages.filter((s) => s.skipped || s.widgets.length > 0),
    [previousStages]
  );

  return (
    <div
      id={widgetId}
      className={`stage-summary-widget ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: '#111827',
        borderRadius: '0.75rem',
      }}
    >
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid #374151', paddingBottom: '0.75rem' }}>
        <h3
          style={{
            margin: 0,
            color: '#f1f5f9',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          {title}
        </h3>
      </div>

      {/* コンテンツ */}
      {nonEmptyStages.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#64748b',
            fontSize: '0.875rem',
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {nonEmptyStages.map((stage, index) => (
            <StageBlock
              key={stage.stageId}
              stage={stage}
              isLast={index === nonEmptyStages.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default StageSummary;
