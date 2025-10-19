/**
 * ExperimentService（Phase 2 Step 5）
 * 実験条件管理サービス - 手動割り当て方式
 * 
 * Phase 2 Step 5の設計変更:
 * - 被験者数が少ない（5名程度）ため、ハッシュベース自動割り当てから手動割り当てに変更
 * - 管理者がAdminUserManagement画面で各被験者に条件を割り当て
 */

/**
 * 実験条件割り当て結果
 */
export interface ExperimentAssignment {
  userId: string;
  condition: 'dynamic_ui' | 'static_ui' | null;  // null = 未割り当て
  assignedAt: Date | null;
  method: 'manual';
  experimentId: string;
  assignedBy?: string;  // 割り当てを実施した管理者ID
  note?: string;        // 割り当て時のメモ
}

/**
 * 実験条件管理サービス（手動割り当て方式）
 */
export class ExperimentService {
  private experimentId: string = 'exp_2025_10';
  private assignmentCache: Map<string, ExperimentAssignment>;

  constructor() {
    this.assignmentCache = new Map();
  }

  /**
   * ユーザーの実験条件を取得
   * 未割り当ての場合はnullを含むオブジェクトを返す
   * 
   * @param userId ユーザーID
   * @returns 実験条件割り当て結果（未割り当ての場合 condition = null）
   */
  async getCondition(userId: string): Promise<ExperimentAssignment> {
    // キャッシュチェック
    if (this.assignmentCache.has(userId)) {
      return this.assignmentCache.get(userId)!;
    }

    // TODO Phase 2 Step 5.2: データベースから既存割り当てをチェック
    // const existingAssignment = await db.getExperimentAssignment(userId);
    // if (existingAssignment) {
    //   this.assignmentCache.set(userId, existingAssignment);
    //   return existingAssignment;
    // }

    // 未割り当ての場合
    const assignment: ExperimentAssignment = {
      userId,
      condition: null,
      assignedAt: null,
      method: 'manual',
      experimentId: this.experimentId
    };

    return assignment;
  }

  /**
   * 管理者が条件を手動割り当て
   * 
   * @param userId ユーザーID
   * @param condition 実験条件
   * @param assignedBy 割り当てを実施した管理者ID
   * @param note 割り当て時のメモ（オプション）
   * @returns 割り当て結果
   */
  async assignConditionManually(
    userId: string,
    condition: 'dynamic_ui' | 'static_ui',
    assignedBy: string,
    note?: string
  ): Promise<ExperimentAssignment> {
    const assignment: ExperimentAssignment = {
      userId,
      condition,
      assignedAt: new Date(),
      method: 'manual',
      experimentId: this.experimentId,
      assignedBy,
      note
    };

    // TODO Phase 2 Step 5.2: データベースに保存
    // await db.saveExperimentAssignment(assignment);

    // キャッシュ更新
    this.assignmentCache.set(userId, assignment);

    console.log(`[ExperimentService] 条件割り当て完了: ${userId} → ${condition}`);

    return assignment;
  }

  /**
   * 全ユーザーの割り当て状況を取得（管理画面用）
   * 
   * @returns 全割り当て状況のリスト
   */
  async getAllAssignments(): Promise<ExperimentAssignment[]> {
    // TODO Phase 2 Step 5.2: データベースから取得
    // const assignments = await db.getAllExperimentAssignments(this.experimentId);
    // return assignments;

    // 現状はキャッシュから返す
    return Array.from(this.assignmentCache.values());
  }

  /**
   * 条件別の人数を取得（管理画面用）
   * 
   * @returns 条件別人数
   */
  async getAssignmentCounts(): Promise<{
    dynamic_ui: number;
    static_ui: number;
    unassigned: number;
  }> {
    // TODO Phase 2 Step 5.2: データベースからカウント
    // const counts = await db.getAssignmentCounts(this.experimentId);
    // return counts;

    // 現状はキャッシュからカウント
    let dynamicCount = 0;
    let staticCount = 0;

    for (const assignment of this.assignmentCache.values()) {
      if (assignment.condition === 'dynamic_ui') {
        dynamicCount++;
      } else if (assignment.condition === 'static_ui') {
        staticCount++;
      }
    }

    return {
      dynamic_ui: dynamicCount,
      static_ui: staticCount,
      unassigned: 0  // TODO: 全ユーザー数から計算
    };
  }

  /**
   * 割り当てを削除（リセット用）
   * 
   * @param userId ユーザーID
   */
  async removeAssignment(userId: string): Promise<void> {
    // TODO Phase 2 Step 5.2: データベースから削除
    // await db.deleteExperimentAssignment(userId, this.experimentId);

    // キャッシュから削除
    this.assignmentCache.delete(userId);

    console.log(`[ExperimentService] 割り当て削除: ${userId}`);
  }
}

