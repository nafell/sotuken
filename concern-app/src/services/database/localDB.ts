/**
 * ローカルデータベース（IndexedDB + Dexie）
 * Phase 0 Day 2 - 午前実装
 * @see specs/system-design/database_schema.md
 */

import Dexie, { Table } from 'dexie';
import { 
  UserProfile, 
  ConcernSession, 
  ContextData, 
  InteractionEvent, 
  UIGeneration,
  ServerSyncStatus 
} from '../../types/database';

export class LocalDatabase extends Dexie {
  // テーブル定義
  userProfile!: Table<UserProfile>;
  concernSessions!: Table<ConcernSession>;
  contextData!: Table<ContextData>;
  interactionEvents!: Table<InteractionEvent>;
  uiGenerations!: Table<UIGeneration>;

  constructor() {
    super('ConcernApp');
    
    // バージョン1のスキーマ定義
    this.version(1).stores({
      userProfile: 'userId',
      concernSessions: 'sessionId, userId, startTime, completed',
      contextData: 'contextId, sessionId, collectedAt',
      interactionEvents: 'eventId, sessionId, timestamp, syncedToServer',
      uiGenerations: 'generationId, sessionId, generatedAt'
    });

    // インデックス最適化（specsに基づく）
    this.version(1).stores({
      userProfile: 'userId',
      concernSessions: 'sessionId, userId, [userId+startTime], completed',
      contextData: 'contextId, sessionId, collectedAt',
      interactionEvents: 'eventId, sessionId, [sessionId+timestamp], [syncedToServer+timestamp]',
      uiGenerations: 'generationId, sessionId, generatedAt'
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
      userId: crypto.randomUUID(),
      anonymousId: this.generateAnonymousId(),
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
    const sessionId = crypto.randomUUID();
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
      .where({ userId })
      .orderBy('startTime')
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * イベント記録
   */
  async recordEvent(event: Omit<InteractionEvent, 'eventId' | 'timestamp' | 'syncedToServer'>): Promise<void> {
    const fullEvent: InteractionEvent = {
      ...event,
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      syncedToServer: false
    };

    await this.interactionEvents.add(fullEvent);
  }

  async getUnsyncedEvents(limit: number = 50): Promise<InteractionEvent[]> {
    return await this.interactionEvents
      .where('syncedToServer')
      .equals(false)
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
      .equals(false)
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
  // プライベートメソッド
  // ========================================

  private generateAnonymousId(): string {
    // 匿名ID生成（研究用）
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `anon_${timestamp}_${random}`;
  }

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
