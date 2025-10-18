/**
 * ExperimentService（Phase 2）
 * 実験条件管理サービス - ハッシュベース条件割り当て
 */

import crypto from 'crypto';

/**
 * 実験条件割り当て結果
 */
export interface ExperimentAssignment {
  condition: 'dynamic_ui' | 'static_ui';
  assignedAt: string;          // ISO 8601 date string
  method: 'hash' | 'manual';
  userId: string;
}

/**
 * 実験条件管理サービス
 */
export class ExperimentService {
  private assignmentCache: Map<string, ExperimentAssignment>;

  constructor() {
    this.assignmentCache = new Map();
  }

  /**
   * ユーザーの実験条件を取得または割り当て
   * @param userId ユーザーID
   * @returns 実験条件割り当て結果
   */
  async getOrAssignCondition(userId: string): Promise<ExperimentAssignment> {
    // キャッシュチェック
    if (this.assignmentCache.has(userId)) {
      return this.assignmentCache.get(userId)!;
    }

    // TODO: データベースから既存割り当てをチェック
    // const existingAssignment = await db.getExperimentAssignment(userId);
    // if (existingAssignment) {
    //   this.assignmentCache.set(userId, existingAssignment);
    //   return existingAssignment;
    // }

    // 新規割り当て（ハッシュベース）
    const condition = this.assignConditionByHash(userId);
    const assignment: ExperimentAssignment = {
      condition,
      assignedAt: new Date().toISOString(),
      method: 'hash',
      userId
    };

    // TODO: データベースに保存
    // await db.saveExperimentAssignment(assignment);

    // キャッシュに保存
    this.assignmentCache.set(userId, assignment);

    return assignment;
  }

  /**
   * ハッシュベース条件割り当て
   * SHA-256ハッシュの最下位ビットで判定（50:50の確率）
   * @param userId ユーザーID
   * @returns 実験条件
   */
  assignConditionByHash(userId: string): 'dynamic_ui' | 'static_ui' {
    const hash = crypto.createHash('sha256').update(userId).digest('hex');
    const lastByte = parseInt(hash.slice(-2), 16);
    
    // 偶数 → dynamic_ui, 奇数 → static_ui
    return lastByte % 2 === 0 ? 'dynamic_ui' : 'static_ui';
  }

  /**
   * 手動条件切り替え（デバッグ用）
   * @param userId ユーザーID
   * @param condition 新しい条件
   */
  async switchCondition(userId: string, condition: 'dynamic_ui' | 'static_ui'): Promise<ExperimentAssignment> {
    const assignment: ExperimentAssignment = {
      condition,
      assignedAt: new Date().toISOString(),
      method: 'manual',
      userId
    };

    // TODO: データベースに保存
    // await db.updateExperimentAssignment(userId, assignment);

    // キャッシュ更新
    this.assignmentCache.set(userId, assignment);

    return assignment;
  }

  /**
   * 割り当て統計を取得
   */
  getAssignmentStats(): { dynamicCount: number; staticCount: number; total: number } {
    let dynamicCount = 0;
    let staticCount = 0;

    for (const assignment of this.assignmentCache.values()) {
      if (assignment.condition === 'dynamic_ui') {
        dynamicCount++;
      } else {
        staticCount++;
      }
    }

    return {
      dynamicCount,
      staticCount,
      total: dynamicCount + staticCount
    };
  }
}

