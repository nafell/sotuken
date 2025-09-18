/**
 * ApiService - サーバーAPI連携
 * Phase 0 Day 4 - クライアント・サーバー統合
 */

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
  anonymousUserId: string;
  uiVariant: string;
  userExplicitInput: {
    concernText: string;
    selectedCategory?: string;
    selectedApproach?: string;
    urgencyChoice?: string;
    concernLevel?: string;
  };
  systemInferredContext: {
    timeOfDay: string;
    availableTimeMin?: number;
    factors: Record<string, any>;
  };
  noveltyLevel: string;
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

export interface EventBatch {
  events: Array<{
    eventId: string;
    sessionId: string;
    anonymousUserId: string;
    eventType: string;
    timestamp: string;
    metadata: Record<string, any>;
  }>;
}

export class ApiService {
  private baseUrl: string;
  private anonymousUserId: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/v1';
    this.anonymousUserId = this.generateAnonymousUserId();
    
    console.log(`🌐 API Service initialized: ${this.baseUrl}`);
  }

  /**
   * 設定取得API
   */
  async getConfig(): Promise<ApiConfig> {
    try {
      console.log('📡 Fetching config from server...');
      
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
      console.log(`✅ Config received: v${config.configVersion}`);
      
      return config;
      
    } catch (error) {
      console.error('❌ Failed to fetch config:', error);
      throw error;
    }
  }

  /**
   * UI生成API
   */
  async generateUI(request: Omit<UIGenerationRequest, 'anonymousUserId'>): Promise<UIGenerationResponse> {
    try {
      console.log('🎨 Requesting UI generation...');
      
      const fullRequest: UIGenerationRequest = {
        ...request,
        anonymousUserId: this.anonymousUserId
      };

      const response = await fetch(`${this.baseUrl}/ui/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullRequest)
      });

      if (!response.ok) {
        throw new Error(`UI Generation API failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ UI generated: ${result.generationId}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ UI generation failed:', error);
      throw error;
    }
  }

  /**
   * イベントログ送信API
   */
  async sendEvents(eventBatch: EventBatch): Promise<void> {
    try {
      console.log(`📊 Sending ${eventBatch.events.length} events...`);
      
      const response = await fetch(`${this.baseUrl}/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBatch)
      });

      if (!response.ok) {
        throw new Error(`Events API failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Events recorded: ${result.recordedEvents} events`);
      
    } catch (error) {
      console.error('❌ Event logging failed:', error);
      throw error;
    }
  }

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
export const apiService = new ApiService();
