/**
 * GeneratedBadge.tsx
 * AIが生成したコンテンツを示すバッジコンポーネント
 *
 * @since DSL v4.1
 */

import React from 'react';
import styles from './GeneratedBadge.module.css';

export interface GeneratedBadgeProps {
  /** バッジのサイズ */
  size?: 'small' | 'medium';
  /** ホバー時のツールチップテキスト */
  tooltip?: string;
}

/**
 * GeneratedBadge Component
 *
 * AI生成コンテンツであることをユーザーに視覚的に伝えるバッジ。
 * サンプルカードやラベルなどのgeneratedValueコンテンツに付与する。
 */
export const GeneratedBadge: React.FC<GeneratedBadgeProps> = ({
  size = 'small',
  tooltip = 'AIが生成したサンプルです',
}) => {
  return (
    <span
      className={`${styles.badge} ${styles[size]}`}
      title={tooltip}
      data-testid="generated-badge"
    >
      <span className={styles.icon} aria-hidden="true">✨</span>
      <span className={styles.text}>AI提案</span>
    </span>
  );
};

export default GeneratedBadge;
