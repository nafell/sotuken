/**
 * ClientExperimentService（Phase 2 Step 5）
 * クライアント側の実験条件管理サービス
 * 
 * 責務:
 * - サーバーから実験条件を取得
 * - 実験条件をローカルにキャッシュ
 * - 未割り当てユーザーの検出
 * - デバッグ用の条件切り替え
 */

import { db } from './database/localDB';
import { eventLogger } from './EventLogger';

/**
 * 実験条件の型
 */
export type ExperimentCondition = 'dynamic_ui' | 'static_ui' | null;

/**
 * 実験条件割り当て情報
 */
export interface ExperimentAssignment {
  condition: ExperimentCondition;
  assignedAt: string | null;
  method: 'manual';
  experimentId: string;
  assignedBy?: string;
}

/**
 * ClientExperimentService
 * 
 * シングルトンパターンで実装
 */
export class ClientExperimentService {
  private static instance: ClientExperimentService | null = null;
  private condition: ExperimentCondition = null;
  private experimentId: string | null = null;

  private constructor() {
    // プライベートコンストラクタ
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): ClientExperimentService {
    if (!ClientExperimentService.instance) {
      ClientExperimentService.instance = new ClientExperimentService();
    }
    return ClientExperimentService.instance;
  }

  /**
   * 実験条件を取得（サーバーから）
   * 
   * @returns 実験条件（null = 未割り当て）
   */
  async fetchCondition(): Promise<ExperimentCondition> {
    // 既にキャッシュがある場合は返す
    if (this.condition !== null) {
      console.log('[ClientExperimentService] キャッシュから条件を返す:', this.condition);
      return this.condition;
    }

    try {
      // ユーザーIDを取得
      const userId = localStorage.getItem('anonymousUserId') || 'anonymous';

      // /v1/config APIから取得
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${serverUrl}/v1/config`, {
        method: 'GET',
        headers: {
          'X-User-ID': userId,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const config = await response.json();
      
      this.condition = config.experimentAssignment.condition;
      this.experimentId = config.experimentId;

      if (this.condition === null) {
        // 未割り当ての場合
        console.warn('[ClientExperimentService] 実験条件が未割り当てです。管理者による割り当てを待ってください。');
        return null;
      }

      console.log('[ClientExperimentService] 実験条件を取得:', {
        condition: this.condition,
        experimentId: this.experimentId,
        assignedAt: config.experimentAssignment.assignedAt
      });

      // ローカルDBに保存
      const userProfile = await db.userProfile.toCollection().first();
      if (userProfile) {
        await db.userProfile.update(userProfile.userId, {
          experimentCondition: this.condition,
          experimentAssignedAt: config.experimentAssignment.assignedAt 
            ? new Date(config.experimentAssignment.assignedAt) 
            : undefined
        });
      }

      // イベント記録
      await eventLogger.log({
        eventType: 'experiment_condition_assigned',
        screenId: 'app_init',
        metadata: {
          experimentId: this.experimentId,
          condition: this.condition,
          assignmentMethod: config.experimentAssignment.method,
          assignedBy: config.experimentAssignment.assignedBy
        }
      });

      return this.condition;

    } catch (error) {
      console.error('[ClientExperimentService] 実験条件の取得に失敗:', error);

      // フォールバック: ローカルDBから取得
      const userProfile = await db.userProfile.toCollection().first();
      if (userProfile?.experimentCondition) {
        this.condition = userProfile.experimentCondition;
        console.log('[ClientExperimentService] ローカルDBから条件を復元:', this.condition);
        return this.condition;
      }

      // 条件未割り当て
      console.warn('[ClientExperimentService] 実験条件が取得できませんでした（未割り当て）');
      return null;
    }
  }

  /**
   * キャッシュされた条件を取得
   * 
   * @returns 実験条件（null = 未割り当てまたは未取得）
   */
  getCachedCondition(): ExperimentCondition {
    return this.condition;
  }

  /**
   * 条件を手動切り替え（デバッグ用）
   * 
   * ⚠️ 注意: 開発環境専用
   * 本番環境では管理画面で割り当てを変更すること
   * 
   * @param newCondition 新しい条件
   */
  async switchCondition(newCondition: 'dynamic_ui' | 'static_ui'): Promise<void> {
    if (import.meta.env.PROD) {
      console.error('[ClientExperimentService] 本番環境では条件切り替えは禁止されています');
      return;
    }

    const previousCondition = this.condition;
    this.condition = newCondition;

    console.log('[ClientExperimentService] 条件を切り替え:', {
      previous: previousCondition,
      new: newCondition
    });

    // ローカルDB更新
    const userProfile = await db.userProfile.toCollection().first();
    if (userProfile) {
      await db.userProfile.update(userProfile.userId, {
        experimentCondition: newCondition,
        conditionOverriddenByUser: true
      });
    }

    // イベント記録
    await eventLogger.log({
      eventType: 'experiment_condition_switched',
      screenId: 'settings',
      metadata: {
        previousCondition,
        newCondition,
        reason: 'user_manual_switch_debug'
      }
    });

    // ページリロードを促す
    alert('実験条件を切り替えました。ページをリロードします。');
    window.location.reload();
  }

  /**
   * 実験IDを取得
   */
  getExperimentId(): string | null {
    return this.experimentId;
  }
}

// シングルトンインスタンスをエクスポート
export const experimentService = ClientExperimentService.getInstance();

