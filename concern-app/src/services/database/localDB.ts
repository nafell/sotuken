/**
 * ローカルデータベース（IndexedDB + Dexie）
 * Phase 0 Day 2 - 午前実装
 * @see specs/system-design/database_schema.md
 */

import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { 
  UserProfile, 
  ConcernSession, 
  ContextData, 
  InteractionEvent, 
  UIGeneration,
  ServerSyncStatus,
  Task,
  ActionReport
} from '../../types/database.js';
import { generateUUID, generateAnonymousId } from '../../utils/uuid';

export class LocalDatabase extends Dexie {
  // テーブル定義
  userProfile!: Table<UserProfile>;
  concernSessions!: Table<ConcernSession>;
  contextData!: Table<ContextData>;
  interactionEvents!: Table<InteractionEvent>;
  uiGenerations!: Table<UIGeneration>;
  tasks!: Table<Task>;
  actionReports!: Table<ActionReport>;

  constructor() {
    super('ConcernApp');
    
    // バージョン1のスキーマ定義（インデックス最適化済み）
    this.version(1).stores({
      userProfile: 'userId',
      concernSessions: 'sessionId, userId, startTime, completed, [userId+startTime]',
      contextData: 'contextId, sessionId, collectedAt',
      interactionEvents: 'eventId, sessionId, timestamp, syncedToServer, [sessionId+timestamp], [syncedToServer+timestamp]',
      uiGenerations: 'generationId, sessionId, generatedAt'
    });
    
    // バージョン2のスキーマ定義（Phase 2: Task & ActionReport追加）
    this.version(2).stores({
      userProfile: 'userId',
      concernSessions: 'sessionId, userId, startTime, completed, [userId+startTime]',
      contextData: 'contextId, sessionId, collectedAt',
      interactionEvents: 'eventId, sessionId, timestamp, syncedToServer, [sessionId+timestamp], [syncedToServer+timestamp]',
      uiGenerations: 'generationId, sessionId, generatedAt',
      tasks: 'taskId, userId, status, dueInHours, lastTouchAt, syncedToServer, [userId+status], [userId+lastTouchAt]',
      actionReports: 'reportId, taskId, userId, actionStartedAt, uiCondition, syncedToServer, [taskId+actionStartedAt], [userId+actionStartedAt], [uiCondition+actionStartedAt]'
    });
  }

  /**
   * ユーザープロファイル管理
   */
  async initializeUser(): Promise<UserProfile> {
    const existingUser = await this.userProfile.toCollection().first();
    
    if (existingUser) {
      return existingUser;
    }

    // 新規ユーザー作成
    const newUser: UserProfile = {
      userId: generateUUID(),
      anonymousId: generateAnonymousId(),
      createdAt: new Date(),
      experimentCondition: Math.random() > 0.5 ? 'dynamic_ui' : 'static_ui',
      configVersion: 'v1',
      settings: {
        notifications: true,
        timerSound: true,
        dataCollection: true
      }
    };

    await this.userProfile.add(newUser);
    return newUser;
  }

  /**
   * 関心事セッション管理
   */
  async startSession(userId: string): Promise<ConcernSession> {
    const sessionId = generateUUID();
    const newSession: ConcernSession = {
      sessionId,
      userId,
      startTime: new Date(),
      currentScreen: 'concern_input',
      completed: false,
      realityCheck: {},
      planning: {},
      breakdown: {},
      outcomes: {}
    };

    await this.concernSessions.add(newSession);
    return newSession;
  }

  async updateSession(sessionId: string, updates: Partial<ConcernSession>): Promise<void> {
    await this.concernSessions.update(sessionId, updates);
  }

  async completeSession(sessionId: string, outcomes: ConcernSession['outcomes']): Promise<void> {
    await this.concernSessions.update(sessionId, {
      outcomes,
      completed: true,
      endTime: new Date()
    });
  }

  async getSessionHistory(userId: string, limit: number = 10): Promise<ConcernSession[]> {
    return await this.concernSessions
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('startTime')
      .then(sessions => sessions.slice(0, limit));
  }

  /**
   * イベント記録
   */
  async recordEvent(event: Omit<InteractionEvent, 'eventId' | 'timestamp' | 'syncedToServer'>): Promise<void> {
    const fullEvent: InteractionEvent = {
      ...event,
      eventId: generateUUID(),
      timestamp: new Date(),
      syncedToServer: false
    };

    await this.interactionEvents.add(fullEvent);
  }

  async getUnsyncedEvents(limit: number = 50): Promise<InteractionEvent[]> {
    return await this.interactionEvents
      .where('syncedToServer')
      .equals(0)
      .limit(limit)
      .toArray();
  }

  async markEventsSynced(eventIds: string[]): Promise<void> {
    await this.interactionEvents
      .where('eventId')
      .anyOf(eventIds)
      .modify({ 
        syncedToServer: true, 
        syncedAt: new Date() 
      });
  }

  /**
   * コンテキストデータ管理
   */
  async saveContextData(contextData: ContextData): Promise<void> {
    await this.contextData.add(contextData);
  }

  async getContextData(sessionId: string): Promise<ContextData[]> {
    return await this.contextData
      .where({ sessionId })
      .toArray();
  }

  /**
   * UI生成データ管理
   */
  async saveUIGeneration(uiGeneration: UIGeneration): Promise<void> {
    await this.uiGenerations.add(uiGeneration);
  }

  async getUIGeneration(generationId: string): Promise<UIGeneration | undefined> {
    return await this.uiGenerations.get(generationId);
  }

  /**
   * 同期状態管理
   */
  async getSyncStatus(): Promise<ServerSyncStatus> {
    const pendingEventCount = await this.interactionEvents
      .where('syncedToServer')
      .equals(0)
      .count();

    return {
      pendingEventCount,
      syncInProgress: false // 実際の実装では状態管理が必要
    };
  }

  /**
   * データクリーンアップ（開発用）
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.userProfile.clear(),
      this.concernSessions.clear(),
      this.contextData.clear(),
      this.interactionEvents.clear(),
      this.uiGenerations.clear()
    ]);
  }

  /**
   * 統計情報取得
   */
  async getStats() {
    const [userCount, sessionCount, eventCount] = await Promise.all([
      this.userProfile.count(),
      this.concernSessions.count(),
      this.interactionEvents.count()
    ]);

    return {
      userCount,
      sessionCount,
      eventCount,
      lastActivity: await this.getLastActivityTime()
    };
  }

  // ========================================
  // Task管理（Phase 2）
  // ========================================

  /**
   * タスク作成
   */
  async createTask(task: Omit<Task, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const fullTask: Task = {
      ...task,
      taskId: generateUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      syncedToServer: false
    };
    
    await this.tasks.add(fullTask);
    return fullTask;
  }

  /**
   * タスク取得（アクティブのみ）
   */
  async getActiveTasks(userId: string): Promise<Task[]> {
    return await this.tasks
      .where('[userId+status]')
      .equals([userId, 'active'])
      .toArray();
  }

  /**
   * タスク更新
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    await this.tasks.update(taskId, {
      ...updates,
      updatedAt: new Date(),
      syncedToServer: false
    });
  }

  /**
   * タスク完了
   */
  async completeTask(taskId: string): Promise<void> {
    await this.tasks.update(taskId, {
      status: 'completed',
      completedAt: new Date(),
      progress: 100,
      updatedAt: new Date(),
      syncedToServer: false
    });
  }

  /**
   * 放置タスク検出
   */
  async getStaleTasks(userId: string, daysThreshold: number = 3): Promise<Task[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    return await this.tasks
      .where('[userId+status]')
      .equals([userId, 'active'])
      .filter(task => task.lastTouchAt !== undefined && task.lastTouchAt < thresholdDate)
      .toArray();
  }

  /**
   * 未同期タスク取得
   */
  async getUnsyncedTasks(limit: number = 50): Promise<Task[]> {
    return await this.tasks
      .where('syncedToServer')
      .equals(0)
      .limit(limit)
      .toArray();
  }

  // ========================================
  // ActionReport管理（Phase 2）
  // ========================================

  /**
   * 行動開始記録
   */
  async startAction(
    taskId: string,
    userId: string,
    recommendationShownAt: Date,
    uiCondition: 'dynamic_ui' | 'static_ui',
    contextSnapshot: any
  ): Promise<ActionReport> {
    const now = new Date();
    const timeToStartSec = (now.getTime() - recommendationShownAt.getTime()) / 1000;
    
    const report: ActionReport = {
      reportId: generateUUID(),
      taskId,
      userId,
      recommendationShownAt,
      actionStartedAt: now,
      timeToStartSec,
      uiCondition,
      contextAtStart: contextSnapshot,
      createdAt: now,
      syncedToServer: false
    };
    
    await this.actionReports.add(report);
    
    // タスクの着手回数を更新
    await this.tasks.where('taskId').equals(taskId).modify((task) => {
      task.totalActionsStarted++;
      task.lastTouchAt = now;
      task.updatedAt = now;
    });
    
    return report;
  }

  /**
   * 行動完了記録
   */
  async completeAction(
    reportId: string,
    clarityImprovement: 1 | 2 | 3,
    notes?: string
  ): Promise<void> {
    const report = await this.actionReports.get(reportId);
    if (!report) throw new Error('Report not found');
    
    const now = new Date();
    const durationMin = (now.getTime() - report.actionStartedAt.getTime()) / 1000 / 60;
    
    await this.actionReports.update(reportId, {
      actionCompletedAt: now,
      durationMin,
      clarityImprovement,
      notes,
      syncedToServer: false
    });
    
    // タスクの完了回数を更新
    await this.tasks.where('taskId').equals(report.taskId).modify((task) => {
      task.totalActionsCompleted++;
      task.updatedAt = now;
    });
  }

  /**
   * 条件別着手率計算（クライアント側）
   */
  async calculateEngagementRate(userId: string, condition: 'dynamic_ui' | 'static_ui'): Promise<number> {
    // 推奨表示イベント数
    const shownCount = await this.interactionEvents
      .where('eventType')
      .equals('task_recommendation_shown')
      .filter(e => e.metadata.uiCondition === condition)
      .count();
    
    // 着手報告数
    const startedCount = await this.actionReports
      .where('uiCondition')
      .equals(condition)
      .count();
    
    return shownCount > 0 ? startedCount / shownCount : 0;
  }

  // ========================================
  // プライベートメソッド
  // ========================================


  private async getLastActivityTime(): Promise<Date | null> {
    const lastEvent = await this.interactionEvents
      .orderBy('timestamp')
      .reverse()
      .first();
    
    return lastEvent?.timestamp || null;
  }
}

// シングルトンインスタンス
export const db = new LocalDatabase();
