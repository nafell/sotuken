/**
 * TaskService（Phase 2）
 * タスク操作の抽象化サービス
 */

import { db } from './database/localDB';
import type { Task } from '../types/database';

/**
 * タスクサービス
 * LocalDatabaseとのインターフェース
 */
export class TaskService {
  /**
   * タスク作成
   */
  static async createTask(taskData: Omit<Task, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return await db.createTask(taskData);
  }

  /**
   * アクティブタスク取得
   */
  static async getActiveTasks(userId: string): Promise<Task[]> {
    return await db.getActiveTasks(userId);
  }

  /**
   * タスク更新
   */
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    return await db.updateTask(taskId, updates);
  }

  /**
   * タスク削除（論理削除）
   */
  static async deleteTask(taskId: string): Promise<void> {
    return await db.updateTask(taskId, {
      status: 'deleted',
      updatedAt: new Date()
    });
  }

  /**
   * タスク完了
   */
  static async completeTask(taskId: string): Promise<void> {
    return await db.completeTask(taskId);
  }

  /**
   * 放置タスク取得
   */
  static async getStaleTasks(userId: string, daysThreshold: number = 3): Promise<Task[]> {
    return await db.getStaleTasks(userId, daysThreshold);
  }

  /**
   * タスクID取得
   */
  static async getTaskById(taskId: string): Promise<Task | undefined> {
    return await db.tasks.get(taskId);
  }

  /**
   * 完了済みタスク取得
   */
  static async getCompletedTasks(userId: string): Promise<Task[]> {
    return await db.tasks
      .where('[userId+status]')
      .equals([userId, 'completed'])
      .toArray();
  }

  /**
   * アーカイブ済みタスク取得
   */
  static async getArchivedTasks(userId: string): Promise<Task[]> {
    return await db.tasks
      .where('[userId+status]')
      .equals([userId, 'archived'])
      .toArray();
  }
}

