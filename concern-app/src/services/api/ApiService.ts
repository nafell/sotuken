/**
 * ApiService - サーバーAPI連携
 * Phase 0 Day 9 - UI生成API・イベントトラッキング統合
 */

import type { FactorsDict } from '../context/ContextService';

export interface ApiConfig {
  configVersion: string;
  weightsVersion: string;
  experimentAssignment: {
    condition: string;
    assignedAt: string;
    experimentId: string;
  };
  weights: Record<string, number>;
  uiNoveltyPolicy: any;
  model: any;
}

export interface UIGenerationRequest {
  sessionId: string;
  userExplicitInput: {
    concernText: string;
    selectedCategory?: string;
    selectedApproach?: string;
    urgencyChoice?: string;
    concernLevel?: string;
  };
  contextFactors: FactorsDict;
  noveltyLevel?: string;
}

export interface UIGenerationResponse {
  sessionId: string;
  generationId: string;
  uiDsl: any;
  generation: {
    model: string;
    seed: number;
    generatedAt: string;
    processingTimeMs: number;
    fallbackUsed: boolean;
    promptTokens: number;
    responseTokens: number;
  };
}

export class ApiService {
  private static instance: ApiService | null = null;
  private baseUrl: string;
  private anonymousUserId: string;

  private constructor() {
    this.baseUrl = 'http://localhost:3000/v1';
    this.anonymousUserId = this.generateAnonymousUserId();
    
    console.log(`🔧 ApiService初期化完了 - UserID: ${this.anonymousUserId}`);
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // ========================================
  // 設定配布API
  // ========================================

  /**
   * 実験条件・重み設定の取得
   */
  async getConfig(): Promise<ApiConfig> {
    console.log('📥 設定取得リクエスト送信');

    try {
      const response = await fetch(`${this.baseUrl}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.anonymousUserId
        }
      });

      if (!response.ok) {
        throw new Error(`Config API failed: ${response.status} ${response.statusText}`);
      }

      const config = await response.json();
      console.log('✅ 設定取得成功:', config);
      
      return config;
      
    } catch (error) {
      console.error('❌ 設定取得エラー:', error);
      throw error;
    }
  }

  // ========================================
  // UI生成API
  // ========================================

  /**
   * 動的UI生成API
   */
  async generateUI(concernText: string, factors: FactorsDict, sessionId?: string): Promise<UIGenerationResponse> {
    console.log('🎨 UI生成リクエスト送信開始');
    console.log('📄 concernText:', concernText);
    console.log('📊 factors:', factors);

    const requestBody: UIGenerationRequest = {
      sessionId: sessionId || this.generateSessionId(),
      userExplicitInput: {
        concernText
      },
      contextFactors: factors,
      noveltyLevel: 'low' // Phase 0では固定
    };

    try {
      const response = await fetch(`${this.baseUrl}/ui/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.anonymousUserId
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ UI生成成功:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ UI生成エラー:', error);
      throw error;
    }
  }

  // ========================================
  // イベントログAPI
  // ========================================

  /**
   * バッチイベント送信API
   */
  async sendEvents(events: Array<{
    eventType: string;
    eventData: any;
    timestamp: string;
    sessionId?: string;
  }>): Promise<void> {
    console.log('📡 イベント送信開始:', events.length, 'events');

    try {
      const response = await fetch(`${this.baseUrl}/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.anonymousUserId
        },
        body: JSON.stringify({
          events,
          batchId: this.generateSessionId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ イベント送信成功:', result);
      
    } catch (error) {
      console.error('❌ イベント送信エラー:', error);
      throw error;
    }
  }

  /**
   * 単一イベント送信（バッチ送信のラッパー）
   */
  async sendEvent(eventType: string, eventData: any, sessionId?: string): Promise<void> {
    await this.sendEvents([{
      eventType,
      eventData,
      timestamp: new Date().toISOString(),
      sessionId
    }]);
  }

  // ========================================
  // ヘルスチェックAPI
  // ========================================

  /**
   * APIヘルスチェック
   */
  async healthCheck(): Promise<{status: string; timestamp: string}> {
    try {
      const response = await fetch('http://localhost:3000/health', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  // ========================================
  // ヘルパーメソッド
  // ========================================

  /**
   * セッションID生成
   */
  private generateSessionId(): string {
    return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 匿名ユーザーID生成
   */
  private generateAnonymousUserId(): string {
    const stored = localStorage.getItem('concern_app_anonymous_user_id');
    
    if (stored) {
      return stored;
    }

    // 新規生成
    const newId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem('concern_app_anonymous_user_id', newId);
    
    console.log(`🔑 Generated anonymous user ID: ${newId}`);
    return newId;
  }

  /**
   * 現在の匿名ユーザーID取得
   */
  getAnonymousUserId(): string {
    return this.anonymousUserId;
  }

  /**
   * APIベースURL取得
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * デバッグ情報
   */
  getDebugInfo() {
    return {
      baseUrl: this.baseUrl,
      anonymousUserId: this.anonymousUserId,
      timestamp: new Date().toISOString()
    };
  }
}

// シングルトンインスタンス
export const apiService = ApiService.getInstance();