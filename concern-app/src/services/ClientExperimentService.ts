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
   * ユーザーIDを取得または生成
   * 
   * @returns ユーザーID
   */
  getUserId(): string {
    let userId = localStorage.getItem('anonymousUserId');
    
    if (!userId) {
      // ユーザーIDが存在しない場合は生成
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('anonymousUserId', userId);
      console.log('[ClientExperimentService] 新規ユーザーID生成:', userId);
    }
    
    return userId;
  }

  /**
   * 実験条件を取得（サーバーから）
   * 
   * @returns 実験条件（null = 未割り当て）
   */
  async fetchCondition(): Promise<ExperimentCondition> {
    // 緊急対応: 動的UIに固定（2025-10-19）
    // A/Bテスト機構に問題があるため、一時的に動的UIに固定
    console.warn('[ClientExperimentService] 緊急対応: 動的UIに固定されています');
    
    this.condition = 'dynamic_ui';
    this.experimentId = 'exp_2025_10_emergency';
    
    // ローカルDBに保存
    const userProfile = await db.userProfile.toCollection().first();
    if (userProfile) {
      await db.userProfile.update(userProfile.userId, {
        experimentCondition: this.condition,
        experimentAssignedAt: new Date(),
        conditionOverriddenByUser: false
      });
    }

    // イベント記録
    await eventLogger.log({
      eventType: 'experiment_condition_assigned',
      screenId: 'app_init',
      metadata: {
        experimentId: this.experimentId,
        condition: this.condition,
        assignmentMethod: 'emergency_fix',
        assignedBy: 'system',
        note: '緊急対応: 動的UI固定'
      }
    });

    return this.condition;
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

