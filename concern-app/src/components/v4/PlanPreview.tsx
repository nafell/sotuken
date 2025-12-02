/**
 * PlanPreview.tsx
 * DSL v4 計画提示画面コンポーネント
 *
 * TASK-4.1: 計画提示画面実装
 *
 * WidgetSelectionResultを表示し、ユーザーに4ステージの計画を提示する。
 * ユーザーは計画を確認して開始するか、キャンセルすることができる。
 *
 * @since DSL v4.0
 */

import { useState } from 'react';
import type { StageType } from '../../types/v4/ors.types';
import type {
  WidgetSelectionResult,
  StageSelection,
  SelectedWidget,
} from '../../types/v4/widget-selection.types';
import { STAGE_ORDER, STAGE_NAMES, STAGE_DISPLAY_NAMES } from '../../types/v4/widget-selection.types';

// =============================================================================
// Types
// =============================================================================

/**
 * PlanPreviewProps
 */
export interface PlanPreviewProps {
  /** Widget選定結果 */
  selectionResult: WidgetSelectionResult;
  /** ユーザーの悩みテキスト */
  concernText?: string;
  /** 開始ボタンクリック時のコールバック */
  onConfirm: () => void;
  /** キャンセルボタンクリック時のコールバック */
  onCancel?: () => void;
  /** 再生成ボタンクリック時のコールバック */
  onRegenerate?: () => void;
  /** ローディング状態 */
  isLoading?: boolean;
  /** 詳細表示モード */
  showDetails?: boolean;
  /** カスタムクラス名 */
  className?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

/**
 * ステージカード
 */
interface StageCardProps {
  stage: StageType;
  index: number;
  selection: StageSelection;
  isExpanded: boolean;
  onToggle: () => void;
}

function StageCard({ stage, index, selection, isExpanded, onToggle }: StageCardProps) {
  const stageColors: Record<StageType, string> = {
    diverge: '#8b5cf6',   // purple
    organize: '#3b82f6',  // blue
    converge: '#10b981',  // green
    summary: '#f59e0b',   // amber
  };

  const color = stageColors[stage];

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        border: `1px solid ${color}33`,
      }}
    >
      {/* ヘッダー */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '1rem',
          backgroundColor: `${color}15`,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          textAlign: 'left',
        }}
      >
        {/* ステージ番号 */}
        <div
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            backgroundColor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1rem',
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>

        {/* ステージ情報 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 'bold', color: '#f1f5f9', fontSize: '1rem' }}>
              {STAGE_NAMES[stage]}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              ({STAGE_DISPLAY_NAMES[stage]})
            </span>
          </div>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              color: '#94a3b8',
              fontSize: '0.75rem',
              lineHeight: 1.4,
            }}
          >
            {selection.purpose}
          </p>
        </div>

        {/* 展開/折りたたみアイコン */}
        <span
          style={{
            color: '#94a3b8',
            fontSize: '0.875rem',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          ▼
        </span>
      </button>

      {/* 詳細コンテンツ */}
      {isExpanded && (
        <div style={{ padding: '1rem', borderTop: `1px solid ${color}22` }}>
          {/* 分析対象 */}
          {selection.target && (
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>分析対象:</span>
              <p style={{ margin: '0.25rem 0 0 0', color: '#e2e8f0', fontSize: '0.875rem' }}>
                {selection.target}
              </p>
            </div>
          )}

          {/* 説明 */}
          {selection.description && (
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>説明:</span>
              <p style={{ margin: '0.25rem 0 0 0', color: '#e2e8f0', fontSize: '0.875rem' }}>
                {selection.description}
              </p>
            </div>
          )}

          {/* 使用Widget */}
          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>使用するWidget:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {selection.widgets.map((widget, widgetIndex) => (
                <WidgetCard key={widget.widgetId} widget={widget} index={widgetIndex} color={color} />
              ))}
            </div>
          </div>

          {/* 所要時間 */}
          {selection.estimatedDuration && (
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                推定所要時間: 約{selection.estimatedDuration}分
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Widgetカード
 */
interface WidgetCardProps {
  widget: SelectedWidget;
  index: number;
  color: string;
}

function WidgetCard({ widget, index, color }: WidgetCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        borderRadius: '0.5rem',
        padding: '0.75rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}
    >
      {/* 順番 */}
      <div
        style={{
          width: '1.5rem',
          height: '1.5rem',
          borderRadius: '50%',
          backgroundColor: `${color}33`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>

      <div style={{ flex: 1 }}>
        {/* Widget名 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#e2e8f0', fontWeight: '500', fontSize: '0.875rem' }}>
            {formatWidgetName(widget.widgetId)}
          </span>
          <span
            style={{
              backgroundColor: '#374151',
              color: '#9ca3af',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              fontSize: '0.625rem',
              fontFamily: 'monospace',
            }}
          >
            {widget.widgetId}
          </span>
        </div>

        {/* 使用目的 */}
        <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.4 }}>
          {widget.purpose}
        </p>
      </div>
    </div>
  );
}

/**
 * Widget IDを表示名に変換
 */
function formatWidgetName(widgetId: string): string {
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
  };
  return nameMap[widgetId] || widgetId;
}

// =============================================================================
// PlanPreview Component
// =============================================================================

/**
 * PlanPreview
 *
 * WidgetSelectionResultを表示し、ユーザーに計画を提示する
 */
export function PlanPreview({
  selectionResult,
  concernText,
  onConfirm,
  onCancel,
  onRegenerate,
  isLoading = false,
  showDetails = true,
  className = '',
}: PlanPreviewProps) {
  const [expandedStages, setExpandedStages] = useState<Set<StageType>>(
    new Set(showDetails ? STAGE_ORDER : [])
  );

  const toggleStage = (stage: StageType) => {
    setExpandedStages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stage)) {
        newSet.delete(stage);
      } else {
        newSet.add(stage);
      }
      return newSet;
    });
  };

  const expandAll = () => setExpandedStages(new Set(STAGE_ORDER));
  const collapseAll = () => setExpandedStages(new Set());

  return (
    <div
      className={`plan-preview ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '1.5rem',
        backgroundColor: '#0f172a',
        borderRadius: '1rem',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* ヘッダー */}
      <div style={{ textAlign: 'center' }}>
        <h2
          style={{
            margin: 0,
            color: '#f1f5f9',
            fontSize: '1.5rem',
            fontWeight: 'bold',
          }}
        >
          あなたの悩みを整理するプランを作成しました
        </h2>
        <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
          4つのステップで思考を整理していきます
        </p>
      </div>

      {/* 悩みテキスト */}
      {concernText && (
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '0.75rem',
            padding: '1rem',
            borderLeft: '4px solid #3b82f6',
          }}
        >
          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>あなたの悩み:</span>
          <p style={{ margin: '0.25rem 0 0 0', color: '#e2e8f0', fontSize: '0.875rem', lineHeight: 1.5 }}>
            {concernText}
          </p>
        </div>
      )}

      {/* 全体の説明 */}
      {selectionResult.flowDescription && (
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '0.75rem',
            padding: '1rem',
          }}
        >
          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>プランの概要:</span>
          <p style={{ margin: '0.25rem 0 0 0', color: '#e2e8f0', fontSize: '0.875rem', lineHeight: 1.5 }}>
            {selectionResult.flowDescription}
          </p>
        </div>
      )}

      {/* 展開/折りたたみボタン */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button
          onClick={expandAll}
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor: 'transparent',
            border: '1px solid #475569',
            borderRadius: '0.375rem',
            color: '#94a3b8',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          すべて展開
        </button>
        <button
          onClick={collapseAll}
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor: 'transparent',
            border: '1px solid #475569',
            borderRadius: '0.375rem',
            color: '#94a3b8',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          すべて折りたたむ
        </button>
      </div>

      {/* ステージリスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {STAGE_ORDER.map((stage, index) => (
          <StageCard
            key={stage}
            stage={stage}
            index={index}
            selection={selectionResult.stages[stage]}
            isExpanded={expandedStages.has(stage)}
            onToggle={() => toggleStage(stage)}
          />
        ))}
      </div>

      {/* 合計所要時間 */}
      {selectionResult.totalEstimatedDuration && (
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
            合計推定所要時間: 約{selectionResult.totalEstimatedDuration}分
          </span>
        </div>
      )}

      {/* ボタン */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          paddingTop: '0.5rem',
        }}
      >
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              border: '1px solid #475569',
              borderRadius: '0.5rem',
              color: '#94a3b8',
              fontSize: '0.875rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
        )}

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#e2e8f0',
              fontSize: '0.875rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            別のプランを作成
          </button>
        )}

        <button
          onClick={onConfirm}
          disabled={isLoading}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '0.5rem',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {isLoading ? (
            <>
              <span
                style={{
                  width: '1rem',
                  height: '1rem',
                  border: '2px solid #ffffff44',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              処理中...
            </>
          ) : (
            'この計画で始める'
          )}
        </button>
      </div>

      {/* アニメーション用CSS */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default PlanPreview;
