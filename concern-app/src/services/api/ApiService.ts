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

/**
 * UISpec v3生成オプション (Phase 4 Full-Flow)
 */
export interface UISpecV3GenerationOptions {
  /** 実装済みWidgetのみに制限 */
  restrictToImplementedWidgets?: boolean;
  /** テキストモード（Widget無しステージ用） */
  textOnlyMode?: boolean;
  /** 前ステージの結果（コンテキスト用） */
  previousStageResults?: Record<string, any>;
  /** ボトルネック情報 */
  bottleneckType?: string;
}

/**
 * UISpec v3生成リクエスト (Phase 4 Day 3-4)
 */
export interface UISpecV3GenerationRequest {
  sessionId: string;
  concernText: string;
  stage?: 'diverge' | 'organize' | 'converge' | 'summary';
  factors?: FactorsDict;
  options?: UISpecV3GenerationOptions;
}

/**
 * UISpec v3生成レスポンス (Phase 4 Day 3-4)
 */
export interface UISpecV3GenerationResponse {
  success: boolean;
  uiSpec?: any;
  textSummary?: string;
  mode?: 'widget' | 'text';
  generationId?: string;
  generation?: {
    model: string;
    generatedAt: string;
    processingTimeMs: number;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    retryCount: number;
  };
  error?: {
    code: string;
    message: string;
    retryCount?: number;
  };
  metrics?: any;
}

/**
 * UISpec v4生成オプション (DSL v4 Phase 8)
 */
export interface UISpecV4GenerationOptions {
  /** 前ステージの結果（コンテキスト用） */
  previousStageResults?: Record<string, any>;
  /** ボトルネック情報 */
  bottleneckType?: string;
  /** Reactivity有効化（デフォルト: true） */
  enableReactivity?: boolean;
}

/**
 * UISpec v4生成レスポンス (DSL v4 Phase 8)
 */
export interface UISpecV4GenerationResponse {
  success: boolean;
  uiSpec?: any;
  ors?: any;
  widgetSelectionResult?: any;
  mode?: 'widget';
  generationId?: string;
  generation?: {
    model: string;
    generatedAt: string;
    processingTimeMs: number;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    stages?: {
      widgetSelection: { latencyMs: number; cached: boolean };
      orsGeneration: { latencyMs: number };
      uispecGeneration: { latencyMs: number };
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export class ApiService {
  private static instance: ApiService | null = null;
  private baseUrl: string;
  private anonymousUserId: string;

  private constructor() {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    this.baseUrl = `${apiBaseUrl}/v1`;
    this.anonymousUserId = this.generateAnonymousUserId();

    console.log(`🔧 ApiService初期化完了 - UserID: ${this.anonymousUserId}`);
    console.log('🔧 VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('🔧 Resolved Base URL:', this.baseUrl);
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

  /**
   * UISpec v3生成API (Phase 4 Day 3-4)
   * LLMを使用して12種プリセットWidgetからUISpecを生成
   */
  async generateUIV3(
    concernText: string,
    stage: 'diverge' | 'organize' | 'converge' | 'summary' = 'diverge',
    sessionId?: string,
    factors?: FactorsDict,
    options?: UISpecV3GenerationOptions
  ): Promise<UISpecV3GenerationResponse> {
    console.log('🎨 UISpec v3生成リクエスト送信開始');
    console.log('📄 concernText:', concernText);
    console.log('🎯 stage:', stage);
    if (options?.restrictToImplementedWidgets) {
      console.log('🔒 Widget制限: 実装済みのみ');
    }

    const requestBody: UISpecV3GenerationRequest = {
      sessionId: sessionId || this.generateSessionId(),
      concernText,
      stage,
      factors,
      options,
    };

    try {
      const response = await fetch(`${this.baseUrl}/ui/generate-v3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.anonymousUserId,
        },
        body: JSON.stringify(requestBody),
      });

      const result: UISpecV3GenerationResponse = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ UISpec v3生成エラー:', result.error);
        return result;
      }

      console.log(`✅ UISpec v3生成成功 (mode: ${result.mode}):`, result);
      console.log('📊 メトリクス:', {
        mode: result.mode,
        model: result.generation?.model,
        processingTimeMs: result.generation?.processingTimeMs,
        promptTokens: result.generation?.promptTokens,
        responseTokens: result.generation?.responseTokens,
        totalTokens: result.generation?.totalTokens,
      });

      return result;
    } catch (error) {
      console.error('❌ UISpec v3生成ネットワークエラー:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * UISpec v4生成API (DSL v4 Phase 8)
   * 3段階LLM呼び出しによるUISpec生成
   */
  async generateUIV4(
    concernText: string,
    stage: 'diverge' | 'organize' | 'converge' | 'summary' = 'diverge',
    sessionId?: string,
    factors?: FactorsDict,
    options?: UISpecV4GenerationOptions
  ): Promise<UISpecV4GenerationResponse> {
    console.log('🎨 UISpec v4生成リクエスト送信開始');
    console.log('📄 concernText:', concernText);
    console.log('🎯 stage:', stage);
    if (options?.bottleneckType) {
      console.log('🔍 bottleneckType:', options.bottleneckType);
    }

    const requestBody = {
      sessionId: sessionId || this.generateSessionId(),
      concernText,
      stage,
      factors,
      options,
    };

    try {
      const response = await fetch(`${this.baseUrl}/ui/generate-v4`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.anonymousUserId,
        },
        body: JSON.stringify(requestBody),
      });

      const result: UISpecV4GenerationResponse = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ UISpec v4生成エラー:', result.error);
        return result;
      }

      console.log(`✅ UISpec v4生成成功:`, result);
      console.log('📊 メトリクス:', {
        mode: result.mode,
        model: result.generation?.model,
        processingTimeMs: result.generation?.processingTimeMs,
        promptTokens: result.generation?.promptTokens,
        responseTokens: result.generation?.responseTokens,
        totalTokens: result.generation?.totalTokens,
        stages: result.generation?.stages,
      });

      return result;
    } catch (error) {
      console.error('❌ UISpec v4生成ネットワークエラー:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
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
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const healthUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${healthUrl}/health`, {
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