/**
 * StageProgress.tsx
 * DSL v4 4ステージの進捗表示コンポーネント
 *
 * TASK-4.5: 進捗表示UI実装
 *
 * @since DSL v4.0
 */

import type { StageType } from '../../types/v4/ors.types';
import type { WidgetSelectionResult, StageSelection } from '../../types/v4/widget-selection.types';
import { STAGE_ORDER, STAGE_NAMES, STAGE_DISPLAY_NAMES, getStageIndex } from '../../types/v4/widget-selection.types';

// =============================================================================
// Types
// =============================================================================

/**
 * ステージ結果（簡易版）
 */
export interface StageResultSummary {
  stage: StageType;
  skipped?: boolean;
  completedAt?: string;
}

/**
 * ステージステータス
 */
export type StageStatus = 'completed' | 'current' | 'pending' | 'skipped';

/**
 * StageProgressProps
 */
export interface StageProgressProps {
  /** 現在のステージ */
  currentStage: StageType;
  /** ステージ履歴 */
  stageHistory: StageResultSummary[];
  /** Widget選定結果（オプション） */
  widgetSelectionResult?: WidgetSelectionResult;
  /** 表示モード */
  variant?: 'compact' | 'detailed';
  /** クリック可能かどうか */
  clickable?: boolean;
  /** ステージクリック時のコールバック */
  onStageClick?: (stage: StageType) => void;
  /** カスタムクラス名 */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * ステージのステータスを判定
 */
function getStageStatus(
  stage: StageType,
  currentStage: StageType,
  stageHistory: StageResultSummary[]
): StageStatus {
  const historyItem = stageHistory.find((h) => h.stage === stage);

  if (historyItem?.skipped) {
    return 'skipped';
  }

  if (historyItem?.completedAt) {
    return 'completed';
  }

  if (stage === currentStage) {
    return 'current';
  }

  const stageIndex = getStageIndex(stage);
  const currentIndex = getStageIndex(currentStage);

  if (stageIndex < currentIndex) {
    // 現在より前のステージで、履歴にない = スキップ扱い
    return historyItem ? 'completed' : 'skipped';
  }

  return 'pending';
}

/**
 * ステータスに応じた色を取得
 */
function getStatusColor(status: StageStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'completed':
      return { bg: '#22c55e', text: '#ffffff', border: '#22c55e' };
    case 'current':
      return { bg: '#3b82f6', text: '#ffffff', border: '#3b82f6' };
    case 'skipped':
      return { bg: '#6b7280', text: '#9ca3af', border: '#6b7280' };
    case 'pending':
    default:
      return { bg: '#1f2937', text: '#6b7280', border: '#374151' };
  }
}

/**
 * ステータスアイコンを取得
 */
function getStatusIcon(status: StageStatus): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'current':
      return '●';
    case 'skipped':
      return '○';
    case 'pending':
    default:
      return '○';
  }
}

// =============================================================================
// StageProgress Component
// =============================================================================

/**
 * StageProgress
 *
 * 4ステージの進捗を視覚的に表示
 */
export function StageProgress({
  currentStage,
  stageHistory,
  widgetSelectionResult,
  variant = 'compact',
  clickable = false,
  onStageClick,
  className = '',
}: StageProgressProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={`stage-progress ${className}`}
      style={{
        display: 'flex',
        flexDirection: isCompact ? 'row' : 'column',
        gap: isCompact ? '0.25rem' : '0.5rem',
        alignItems: isCompact ? 'center' : 'stretch',
        padding: '0.75rem',
        backgroundColor: '#111827',
        borderRadius: '0.5rem',
      }}
    >
      {STAGE_ORDER.map((stage, index) => {
        const status = getStageStatus(stage, currentStage, stageHistory);
        const colors = getStatusColor(status);
        const stageSelection = widgetSelectionResult?.stages[stage];
        const isClickable = Boolean(clickable && onStageClick && status !== 'pending');

        return (
          <div
            key={stage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCompact ? '0.5rem' : '0.75rem',
              flex: isCompact ? 'none' : 1,
            }}
          >
            {/* ステージインジケーター */}
            <StageIndicator
              stage={stage}
              index={index}
              status={status}
              colors={colors}
              isCompact={isCompact}
              isClickable={isClickable}
              stageSelection={stageSelection}
              onClick={() => isClickable && onStageClick?.(stage)}
            />

            {/* コネクター（コンパクトモードのみ） */}
            {isCompact && index < STAGE_ORDER.length - 1 && (
              <div
                style={{
                  width: '2rem',
                  height: '2px',
                  backgroundColor: status === 'completed' || status === 'current' ? '#3b82f6' : '#374151',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// StageIndicator Sub-Component
// =============================================================================

interface StageIndicatorProps {
  stage: StageType;
  index: number;
  status: StageStatus;
  colors: { bg: string; text: string; border: string };
  isCompact: boolean;
  isClickable: boolean;
  stageSelection?: StageSelection;
  onClick: () => void;
}

function StageIndicator({
  stage,
  index,
  status,
  colors,
  isCompact,
  isClickable,
  stageSelection,
  onClick,
}: StageIndicatorProps) {
  const icon = getStatusIcon(status);

  if (isCompact) {
    return (
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          cursor: isClickable ? 'pointer' : 'default',
          opacity: status === 'pending' ? 0.5 : 1,
        }}
        title={stageSelection?.purpose}
      >
        <div
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            backgroundColor: colors.bg,
            border: `2px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text,
            fontSize: '0.75rem',
            fontWeight: 'bold',
          }}
        >
          {status === 'completed' ? icon : index + 1}
        </div>
        <span
          style={{
            fontSize: '0.625rem',
            color: colors.text === '#ffffff' ? '#e5e7eb' : colors.text,
            textTransform: 'capitalize',
          }}
        >
          {STAGE_DISPLAY_NAMES[stage]}
        </span>
      </div>
    );
  }

  // 詳細モード
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem',
        backgroundColor: status === 'current' ? '#1e3a5f' : 'transparent',
        borderRadius: '0.5rem',
        cursor: isClickable ? 'pointer' : 'default',
        opacity: status === 'pending' ? 0.5 : 1,
        border: `1px solid ${status === 'current' ? colors.border : 'transparent'}`,
      }}
    >
      {/* 番号/アイコン */}
      <div
        style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '50%',
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.text,
          fontSize: '0.875rem',
          fontWeight: 'bold',
          flexShrink: 0,
        }}
      >
        {status === 'completed' ? icon : index + 1}
      </div>

      {/* テキスト情報 */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem',
          }}
        >
          <span
            style={{
              fontWeight: 'bold',
              color: '#e5e7eb',
              fontSize: '0.875rem',
            }}
          >
            {STAGE_NAMES[stage]}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
            }}
          >
            ({STAGE_DISPLAY_NAMES[stage]})
          </span>
          {status === 'skipped' && (
            <span
              style={{
                fontSize: '0.625rem',
                color: '#f59e0b',
                backgroundColor: '#422006',
                padding: '0.125rem 0.375rem',
                borderRadius: '0.25rem',
              }}
            >
              スキップ
            </span>
          )}
        </div>

        {stageSelection?.purpose && (
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: '#9ca3af',
              lineHeight: 1.4,
            }}
          >
            {stageSelection.purpose}
          </p>
        )}

        {stageSelection?.widgets && stageSelection.widgets.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              marginTop: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            {stageSelection.widgets.map((widget) => (
              <span
                key={widget.widgetId}
                style={{
                  fontSize: '0.625rem',
                  backgroundColor: '#374151',
                  color: '#d1d5db',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '0.25rem',
                }}
              >
                {widget.widgetId}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StageProgress;
