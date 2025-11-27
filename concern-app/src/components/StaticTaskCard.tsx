/**
 * StaticTaskCard - 固定UI版タスクカードコンポーネント
 * 
 * Phase 2 Step 4: 固定UI版整備
 * 動的UI版（TaskCardWidget）とは異なり、固定デザインテンプレートを使用
 */

import React from 'react';
import type { Task } from '../types/database';
import {
  STATIC_TASK_CARD_TEMPLATE,
  STATIC_VARIANT_CONFIG,
  getStaticTaskCardStyle,
  getStaticButtonStyle,
} from '../styles/StaticTaskCardStyles';

interface StaticTaskCardProps {
  task: Task;
  variant: 'task_card' | 'micro_step_card' | 'prepare_step_card';
  saliency?: 0 | 1 | 2 | 3; // 受け取るがスタイルは固定
  onActionStart?: () => void;
  className?: string;
}

export const StaticTaskCard: React.FC<StaticTaskCardProps> = ({
  task,
  variant,
  saliency,
  onActionStart,
  className = '',
}) => {
  // 重要度に基づく視覚的強調レベルの決定
  const importanceLevel: 'low' | 'medium' | 'high' =
    task.importance >= 0.7 ? 'high' : task.importance >= 0.4 ? 'medium' : 'low';
  
  const variantConfig = STATIC_VARIANT_CONFIG[variant];
  const cardStyle = getStaticTaskCardStyle(variant, importanceLevel);
  const buttonStyle = getStaticButtonStyle('primary');
  const template = STATIC_TASK_CARD_TEMPLATE;
  
  return (
    <div
      className={className}
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = template.shadow.hover;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = template.shadow.default;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: template.spacing.gap,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontSize: template.icon.size,
              marginRight: template.icon.marginRight,
            }}
          >
            {variantConfig.icon}
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: variantConfig.accentColor,
            }}
          >
            {variantConfig.label}
          </span>
        </div>
        
        {/* 重要度表示 */}
        <span
          style={{
            fontSize: template.typography.meta.fontSize,
            fontWeight: template.typography.meta.fontWeight,
            color: template.typography.meta.color,
            fontFamily: 'monospace',
          }}
        >
          重要度: {(task.importance * 100).toFixed(0)}%
        </span>
      </div>
      
      {/* タイトル */}
      <h3
        style={{
          ...template.typography.title,
          marginTop: 0,
          marginBottom: template.spacing.gap,
        }}
      >
        {task.title}
      </h3>
      
      {/* 説明 */}
      {task.description && (
        <p
          style={{
            ...template.typography.description,
            marginTop: 0,
            marginBottom: template.spacing.gap,
          }}
        >
          {task.description}
        </p>
      )}
      
      {/* メタ情報 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: template.spacing.gap,
          fontSize: template.typography.meta.fontSize,
          color: template.typography.meta.color,
          fontFamily: 'monospace',
        }}
      >
        {/* 推定時間 */}
        <span>
          ⏱️ {task.estimateMin}分
        </span>
        
        {/* 緊急度 */}
        <span>
          🔥 緊急度: {(task.urgency * 100).toFixed(0)}%
        </span>
        
        {/* 締切 */}
        {task.dueInHours !== undefined && task.dueInHours !== null && (
          <span>
            ⏰ 残り{task.dueInHours}時間
          </span>
        )}
      </div>
      
      {/* アクションボタン */}
      {onActionStart && (
        <button
          onClick={onActionStart}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = template.button.backgroundColorHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = template.button.backgroundColor;
          }}
        >
          着手する
        </button>
      )}
      
      {/* デバッグ情報（開発環境のみ） */}
      {import.meta.env.DEV && (
        <div
          style={{
            marginTop: template.spacing.gap,
            padding: '8px',
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#6B7280',
          }}
        >
          <div>Variant: {variant}</div>
          <div>Saliency: {saliency}</div>
          <div>Importance Level: {importanceLevel}</div>
          <div>UI Condition: static_ui</div>
        </div>
      )}
    </div>
  );
};

