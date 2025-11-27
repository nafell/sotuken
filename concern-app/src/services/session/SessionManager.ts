import { db } from '../database/localDB';
import type { ConcernSession } from '../../types/database';
import { generateUUID } from '../../utils/uuid';

export interface SessionData {
  sessionId: string;
  concernText: string;
  concernLevel?: 'low' | 'medium' | 'high';
  urgency?: string;
  category?: string;
  categoryLabel?: string;
  approach?: string;
  selectedAction?: string;
  mentalLoad?: number;
  startTime: Date;
  currentScreen: string;
}

export class SessionManager {
  private static instance: SessionManager | null = null;
  private currentSession: SessionData | null = null;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async startSession(concernText: string): Promise<string> {
    const sessionId = generateUUID();
    
    this.currentSession = {
      sessionId,
      concernText,
      startTime: new Date(),
      currentScreen: 'concern_input'
    };

    // IndexedDBに保存
    const dbSession: ConcernSession = {
      sessionId,
      userId: await this.getUserId(),
      startTime: new Date(),
      currentScreen: 'concern_input',
      completed: false,
      realityCheck: {
        rawInput: concernText,
        inputTime: new Date()
      },
      planning: {},
      breakdown: {},
      outcomes: {}
    };

    try {
      await db.concernSessions.add(dbSession);
      console.log('📝 新しいセッション開始:', sessionId);
    } catch (error) {
      console.error('❌ セッション保存エラー:', error);
    }

    return sessionId;
  }

  async updateSession(updates: Partial<SessionData>): Promise<void> {
    if (!this.currentSession) {
      console.warn('⚠️ アクティブなセッションがありません');
      return;
    }

    // メモリ内のセッション更新
    Object.assign(this.currentSession, updates);

    // IndexedDB更新用のデータ準備
    const dbUpdates: Partial<ConcernSession> = {};

    if (updates.concernLevel || updates.urgency) {
      dbUpdates.realityCheck = {
        concernLevel: updates.concernLevel,
        urgency: updates.urgency as 'now' | 'this_week' | 'this_month' | 'someday' | undefined,
        estimatedMentalLoad: updates.mentalLoad
      };
    }

    if (updates.category || updates.approach) {
      dbUpdates.planning = {
        category: updates.category as 'learning_research' | 'event_planning' | 'lifestyle_habits' | 'work_project' | 'other' | undefined,
        approach: updates.approach as 'information_gathering' | 'concrete_action' | 'strategic_planning' | undefined
      };
    }

    if (updates.selectedAction) {
      dbUpdates.breakdown = {
        selectedActionId: updates.selectedAction
      };
    }

    if (updates.currentScreen) {
      dbUpdates.currentScreen = updates.currentScreen;
    }

    try {
      await db.concernSessions.update(this.currentSession.sessionId, dbUpdates);
      console.log('💾 セッション更新:', this.currentSession.sessionId);
    } catch (error) {
      console.error('❌ セッション更新エラー:', error);
    }
  }

  async completeSession(outcomes: {
    satisfactionLevel?: string;
    executionMemo?: string;
    nextConcern?: string;
    mentalLoadChange?: number;
  }): Promise<void> {
    if (!this.currentSession) {
      console.warn('⚠️ 完了するセッションがありません');
      return;
    }

    const completionData: Partial<ConcernSession> = {
      completed: true,
      endTime: new Date(),
      outcomes: {
        satisfactionLevel: outcomes.satisfactionLevel as 'very_clear' | 'somewhat_clear' | 'still_foggy' | undefined,
        executionMemo: outcomes.executionMemo,
        nextConcern: outcomes.nextConcern,
        mentalLoadChange: outcomes.mentalLoadChange,
        completionTime: new Date()
      }
    };

    try {
      await db.concernSessions.update(this.currentSession.sessionId, completionData);
      console.log('✅ セッション完了:', this.currentSession.sessionId);
      
      // 現在のセッションをクリア
      this.currentSession = null;
    } catch (error) {
      console.error('❌ セッション完了エラー:', error);
    }
  }

  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  getSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }

  private async getUserId(): Promise<string> {
    // シンプルな匿名ユーザーID生成
    const STORAGE_KEY = 'concern_app_user_id';
    let userId = localStorage.getItem(STORAGE_KEY);
    
    if (!userId) {
      userId = generateUUID();
      localStorage.setItem(STORAGE_KEY, userId);
    }
    
    return userId;
  }

  // デバッグ用メソッド
  async getRecentSessions(limit: number = 5): Promise<ConcernSession[]> {
    try {
      return await db.concernSessions
        .orderBy('startTime')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ セッション履歴取得エラー:', error);
      return [];
    }
  }

  // セッション統計
  async getSessionStats(): Promise<{
    totalSessions: number;
    completedSessions: number;
    avgMentalLoadImprovement: number;
  }> {
    try {
      const allSessions = await db.concernSessions.toArray();
      const completedSessions = allSessions.filter(s => s.completed);
      
      const mentalLoadImprovements = completedSessions
        .map(s => s.outcomes?.mentalLoadChange || 0)
        .filter(change => change > 0);
      
      const avgMentalLoadImprovement = mentalLoadImprovements.length > 0
        ? mentalLoadImprovements.reduce((a, b) => a + b, 0) / mentalLoadImprovements.length
        : 0;

      return {
        totalSessions: allSessions.length,
        completedSessions: completedSessions.length,
        avgMentalLoadImprovement
      };
    } catch (error) {
      console.error('❌ 統計取得エラー:', error);
      return { totalSessions: 0, completedSessions: 0, avgMentalLoadImprovement: 0 };
    }
  }
}

// シングルトンインスタンスをエクスポート
export const sessionManager = SessionManager.getInstance();
