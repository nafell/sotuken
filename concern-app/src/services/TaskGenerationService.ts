/**
 * TaskGenerationService
 * 
 * Phase 2 Step 3: Breakdown結果からTask生成
 * 
 * 責務:
 * - ConcernFlowStateManagerからBreakdown結果を取得
 * - IndexedDBにTaskエンティティとして保存
 * - Task IDを生成
 * - 生成されたTaskをConcernFlowStateManagerに記録
 */

import { db } from './database/localDB';
import type { Task } from '../types/database';
import { flowStateManager } from './ConcernFlowStateManager';
import { generateId } from '../utils/uuid';

export interface TaskGenerationResult {
  tasks: Task[];
  concernId: string;
  generatedAt: string;
}

/**
 * TaskGenerationService
 * 
 * Breakdown結果からタスクを生成するサービス
 * 
 * 使い方:
 * ```typescript
 * const service = new TaskGenerationService();
 * 
 * // Breakdown結果からタスク生成
 * const result = await service.generateTasksFromBreakdown();
 * 
 * console.log('生成されたタスク:', result.tasks);
 * ```
 */
export class TaskGenerationService {
  /**
   * Breakdown結果からタスク生成
   * 
   * @returns 生成されたタスクのリスト
   * @throws Error - フロー状態がない、またはBreakdown結果がない場合
   */
  async generateTasksFromBreakdown(): Promise<TaskGenerationResult> {
    console.log('[TaskGenerationService] タスク生成開始');
    
    // 1. ConcernFlowStateManagerからフロー状態を取得
    const flowState = flowStateManager.loadState();
    
    if (!flowState) {
      throw new Error('フロー状態が見つかりません。関心事入力から始めてください。');
    }
    
    if (!flowState.breakdownResult) {
      throw new Error('Breakdown結果が見つかりません。思考整理を完了してください。');
    }
    
    const { concernId, userId, breakdownResult } = flowState;
    
    console.log('[TaskGenerationService] Breakdown結果:', breakdownResult);
    
    // 2. Breakdown結果からTaskエンティティを生成
    const tasks: Task[] = [];
    
    for (const taskData of breakdownResult.tasks) {
      const task: Task = {
        taskId: generateId('task'),
        userId,
        concernId,
        
        // タスクの基本情報
        title: taskData.title,
        description: taskData.description || '',
        
        // 優先度
        importance: this.normalizeScore(taskData.importance, 1, 5),
        urgency: this.normalizeScore(taskData.urgency, 1, 5),
        
        // 時間見積もり
        estimateMin: taskData.estimatedMinutes || 30,
        
        // マイクロステップ情報
        hasIndependentMicroStep: false,
        
        // ステータス
        status: 'active',
        
        // 行動履歴
        actionHistory: [],
        totalActionsStarted: 0,
        totalActionsCompleted: 0,
        
        // タイムスタンプ
        createdAt: new Date(),
        updatedAt: new Date(),
        lastTouchAt: new Date(),
        
        // メタデータ
        tags: this.extractTags(taskData.title, taskData.description || ''),
        priority: this.calculatePriority(taskData.importance || 3, taskData.urgency || 3),
        
        // ステータス管理（追加フィールド）
        progress: 0,
        
        // タスク生成元
        source: 'breakdown_flow',
        
        // 同期管理
        syncedToServer: false
      };
      
      tasks.push(task);
    }
    
    console.log('[TaskGenerationService] 生成されたタスク:', tasks.length, '件');
    
    // 3. IndexedDBに保存
    await this.saveTasks(tasks);
    
    // 4. ConcernFlowStateManagerに記録
    flowStateManager.saveGeneratedTasks(tasks);
    
    const result: TaskGenerationResult = {
      tasks,
      concernId,
      generatedAt: new Date().toISOString()
    };
    
    console.log('[TaskGenerationService] タスク生成完了:', result);
    
    return result;
  }
  
  /**
   * スコアを正規化（1-5の範囲に収める）
   */
  private normalizeScore(score: number | undefined, min: number, max: number): number {
    if (score === undefined) {
      return 3; // デフォルト: 中間値
    }
    
    // 範囲チェック
    if (score < min) return min;
    if (score > max) return max;
    
    return Math.round(score);
  }
  
  /**
   * 重要度と緊急度から優先度を計算
   */
  private calculatePriority(importance: number, urgency: number): 'low' | 'medium' | 'high' {
    const score = importance + urgency;
    
    if (score >= 8) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }
  
  /**
   * タイトルと説明からタグを抽出
   */
  private extractTags(title: string, description: string): string[] {
    const tags: string[] = [];
    const text = `${title} ${description}`.toLowerCase();
    
    // キーワードベースのタグ抽出（簡易版）
    const keywords: Record<string, string[]> = {
      '学習': ['学習', '勉強', '読書', '調べる', '学ぶ'],
      '運動': ['運動', 'ジム', '筋トレ', 'ランニング', 'ウォーキング'],
      '家事': ['掃除', '洗濯', '料理', '買い物', '片付け'],
      '仕事': ['仕事', '作業', 'プロジェクト', '会議', 'タスク'],
      '趣味': ['趣味', '楽しむ', 'リラックス', '遊び'],
      '健康': ['健康', '病院', '診察', '薬', '睡眠'],
      '人間関係': ['友達', '家族', '連絡', '会う', '話す']
    };
    
    for (const [tag, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (text.includes(word)) {
          tags.push(tag);
          break;
        }
      }
    }
    
    // 重複削除
    return Array.from(new Set(tags));
  }
  
  /**
   * タスクをIndexedDBに保存
   */
  private async saveTasks(tasks: Task[]): Promise<void> {
    try {
      for (const task of tasks) {
        await db.tasks.add(task);
        console.log('[TaskGenerationService] タスク保存:', task.taskId, task.title);
      }
    } catch (error) {
      console.error('[TaskGenerationService] タスク保存エラー:', error);
      throw error;
    }
  }
  
  /**
   * 特定の関心事から生成されたタスクを取得
   */
  async getTasksByConcern(concernId: string, userId: string): Promise<Task[]> {
    try {
      const tasks = await db.tasks
        .where('[userId+concernId]')
        .equals([userId, concernId])
        .toArray();
      
      console.log('[TaskGenerationService] 関心事のタスク取得:', tasks.length, '件');
      return tasks;
    } catch (error) {
      console.error('[TaskGenerationService] タスク取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * タスク生成が必要かチェック
   */
  isGenerationNeeded(): boolean {
    const flowState = flowStateManager.loadState();
    
    if (!flowState) {
      return false;
    }
    
    // Breakdown完了かつタスク未生成
    return !!flowState.breakdownResult && !flowState.generatedTasks;
  }
  
  /**
   * デバッグ用: 生成予定のタスクをプレビュー
   */
  previewTasks(): Array<{ title: string; importance: number; urgency: number }> {
    const flowState = flowStateManager.loadState();
    
    if (!flowState || !flowState.breakdownResult) {
      return [];
    }
    
    return flowState.breakdownResult.tasks.map(task => ({
      title: task.title,
      importance: this.normalizeScore(task.importance, 1, 5),
      urgency: this.normalizeScore(task.urgency, 1, 5)
    }));
  }
}

// シングルトンインスタンス
export const taskGenerationService = new TaskGenerationService();

export default TaskGenerationService;

