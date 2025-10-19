/**
 * StaticTaskCardStyles - 固定UI版タスクカードのデザインテンプレート
 * 
 * Phase 2 Step 4: 固定UI版整備
 * 動的UI版とは異なり、DSL生成なしで一貫したデザインを提供
 */

/**
 * 固定デザインテンプレート定数
 * すべてのタスクカードで統一されたスタイルを使用
 */
export const STATIC_TASK_CARD_TEMPLATE = {
  // レイアウト
  layout: 'vertical' as const,
  
  // カラースキーム
  colors: {
    background: '#FFFFFF',
    border: '#E0E0E0',
    borderHover: '#3B82F6',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
    },
    accent: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
  
  // スペーシング
  spacing: {
    padding: '16px',
    gap: '12px',
    borderRadius: '12px',
  },
  
  // タイポグラフィ
  typography: {
    title: {
      fontSize: '20px',
      fontWeight: 'bold' as const,
      lineHeight: '28px',
      color: '#111827',
    },
    description: {
      fontSize: '14px',
      fontWeight: 'normal' as const,
      lineHeight: '20px',
      color: '#6B7280',
    },
    meta: {
      fontSize: '14px',
      fontWeight: 'normal' as const,
      lineHeight: '20px',
      color: '#9CA3AF',
    },
  },
  
  // アイコン
  icon: {
    size: '24px',
    marginRight: '8px',
  },
  
  // ボタンスタイル
  button: {
    backgroundColor: '#3B82F6',
    backgroundColorHover: '#2563EB',
    color: '#FFFFFF',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
  },
  
  // シャドウ
  shadow: {
    default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    hover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  
  // トランジション
  transition: {
    duration: '200ms',
    timing: 'ease-in-out',
  },
} as const;

/**
 * バリアント別の設定
 * 固定UI版でも最低限のバリアントを識別
 */
export const STATIC_VARIANT_CONFIG = {
  task_card: {
    icon: '📋',
    label: 'タスク実行',
    accentColor: '#3B82F6', // blue-500
  },
  micro_step_card: {
    icon: '⚡',
    label: 'マイクロステップ',
    accentColor: '#10B981', // green-500
  },
  prepare_step_card: {
    icon: '🔧',
    label: '準備ステップ',
    accentColor: '#F59E0B', // amber-500
  },
} as const;

/**
 * 重要度に応じた視覚的強調レベル（固定）
 * 動的UI版のsaliencyに相当するが、スタイルは固定
 */
export const STATIC_IMPORTANCE_STYLES = {
  low: {
    borderColor: '#E5E7EB', // gray-200
    backgroundColor: '#FFFFFF',
  },
  medium: {
    borderColor: '#3B82F6', // blue-500
    backgroundColor: '#EFF6FF', // blue-50
  },
  high: {
    borderColor: '#EF4444', // red-500
    backgroundColor: '#FEF2F2', // red-50
  },
} as const;

/**
 * CSSスタイルオブジェクトを生成するヘルパー
 */
export const getStaticTaskCardStyle = (
  _variant: keyof typeof STATIC_VARIANT_CONFIG,
  importanceLevel: 'low' | 'medium' | 'high' = 'medium'
): React.CSSProperties => {
  const template = STATIC_TASK_CARD_TEMPLATE;
  const importanceStyle = STATIC_IMPORTANCE_STYLES[importanceLevel];
  
  return {
    backgroundColor: importanceStyle.backgroundColor,
    border: `2px solid ${importanceStyle.borderColor}`,
    borderRadius: template.spacing.borderRadius,
    padding: template.spacing.padding,
    boxShadow: template.shadow.default,
    transition: `all ${template.transition.duration} ${template.transition.timing}`,
    cursor: 'default',
  };
};

/**
 * ボタンスタイル生成ヘルパー
 */
export const getStaticButtonStyle = (
  variant: 'primary' | 'secondary' = 'primary'
): React.CSSProperties => {
  const button = STATIC_TASK_CARD_TEMPLATE.button;
  
  if (variant === 'primary') {
    return {
      backgroundColor: button.backgroundColor,
      color: button.color,
      border: 'none',
      borderRadius: button.borderRadius,
      padding: button.padding,
      fontSize: button.fontSize,
      fontWeight: button.fontWeight,
      cursor: 'pointer',
      width: '100%',
      transition: `background-color ${STATIC_TASK_CARD_TEMPLATE.transition.duration} ${STATIC_TASK_CARD_TEMPLATE.transition.timing}`,
    };
  }
  
  return {
    backgroundColor: 'transparent',
    color: STATIC_TASK_CARD_TEMPLATE.colors.text.secondary,
    border: `1px solid ${STATIC_TASK_CARD_TEMPLATE.colors.border}`,
    borderRadius: button.borderRadius,
    padding: button.padding,
    fontSize: button.fontSize,
    fontWeight: 'normal',
    cursor: 'pointer',
    width: '100%',
    transition: `all ${STATIC_TASK_CARD_TEMPLATE.transition.duration} ${STATIC_TASK_CARD_TEMPLATE.transition.timing}`,
  };
};

