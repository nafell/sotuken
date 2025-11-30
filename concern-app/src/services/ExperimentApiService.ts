/**
 * ExperimentApiService
 * 実験API呼び出しサービス
 *
 * Phase 6: 実験・評価環境構築
 */

// 開発環境では8000、本番環境では3000を使用
const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

console.log('[ExperimentApiService] DEV:', import.meta.env.DEV);
console.log('[ExperimentApiService] API_BASE_URL:', API_BASE_URL);

// ========================================
// 型定義
// ========================================

export interface TestCaseSummary {
  caseId: string;
  title: string;
  complexity: string;
  hasReactivity: boolean;
  category: string;
}

export interface TestCase {
  caseId: string;
  title: string;
  complexity: 'simple' | 'medium' | 'complex';
  hasReactivity: boolean;
  concernText: string;
  contextFactors: {
    category: string;
    urgency: string;
    emotionalState: string;
    timeAvailable: number;
  };
  expectedBottlenecks: string[];
  expectedFlow: any;
  evaluationCriteria: string[];
}

export interface ExperimentSession {
  sessionId: string;
  experimentType: string;
  caseId: string;
  evaluatorId?: string;
  widgetCount: number;
  modelId: string;
  concernText: string;
  contextFactors: any;
  generatedOodm?: any;
  generatedDpg?: any;
  generatedDsl?: any;
  oodmMetrics?: any;
  dslMetrics?: any;
  totalTokens?: number;
  totalLatencyMs?: number;
  generationSuccess?: boolean;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  formsResponseId?: string;
  status?: string; // Added for completion status
}

export interface WidgetState {
  stateId: string;
  sessionId: string;
  stepIndex: number;
  widgetType: string;
  widgetConfig: any;
  userInputs?: any;
  portValues?: any;
  recordedAt: string;
}

export interface ExperimentSettings {
  version: string;
  widgetCountConditions: Array<{
    id: string;
    widgetCount: number;
    description: string;
    widgets: string[];
  }>;
  modelConditions: Array<{
    id: string;
    modelId: string;
    description: string;
  }>;
  experimentTypes: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  defaults: {
    widgetCount: number;
    modelId: string;
    experimentType: string;
  };
}

// ========================================
// Service Class
// ========================================

class ExperimentApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * ヘルスチェック
   */
  async checkHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/experiment/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 実験設定を取得
   */
  async getSettings(): Promise<ExperimentSettings> {
    const response = await fetch(`${this.baseUrl}/api/experiment/settings`);
    if (!response.ok) {
      throw new Error(`Failed to get settings: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get settings');
    }
    return data.settings;
  }

  /**
   * テストケース一覧を取得
   */
  async getTestCases(): Promise<TestCaseSummary[]> {
    const response = await fetch(`${this.baseUrl}/api/experiment/cases`);
    if (!response.ok) {
      throw new Error(`Failed to get test cases: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get test cases');
    }
    return data.cases;
  }

  /**
   * テストケース詳細を取得
   */
  async getTestCase(caseId: string): Promise<TestCase> {
    const response = await fetch(`${this.baseUrl}/api/experiment/cases/${caseId}`);
    if (!response.ok) {
      throw new Error(`Failed to get test case: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get test case');
    }
    return data.testCase;
  }

  /**
   * セッション作成
   */
  async createSession(params: {
    experimentType: string;
    caseId: string;
    evaluatorId?: string;
    widgetCount: number;
    modelId: string;
    concernText: string;
    contextFactors: any;
  }): Promise<ExperimentSession> {
    const response = await fetch(`${this.baseUrl}/api/experiment/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create session');
    }
    return data.session;
  }

  /**
   * セッション一覧を取得
   */
  async getSessions(params?: {
    experimentType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ sessions: ExperimentSession[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.experimentType) queryParams.set('experimentType', params.experimentType);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const url = `${this.baseUrl}/api/experiment/sessions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get sessions: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get sessions');
    }
    return { sessions: data.sessions, pagination: data.pagination };
  }

  /**
   * セッション詳細を取得
   */
  async getSession(sessionId: string): Promise<ExperimentSession> {
    const response = await fetch(`${this.baseUrl}/api/experiment/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get session');
    }
    return data.session;
  }

  /**
   * セッション更新
   */
  async updateSession(sessionId: string, updates: Partial<ExperimentSession>): Promise<ExperimentSession> {
    const response = await fetch(`${this.baseUrl}/api/experiment/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      throw new Error(`Failed to update session: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to update session');
    }
    return data.session;
  }

  /**
   * Widget状態を保存
   */
  async saveWidgetState(sessionId: string, state: {
    stepIndex: number;
    widgetType: string;
    widgetConfig: any;
    userInputs?: any;
    portValues?: any;
  }): Promise<WidgetState> {
    const response = await fetch(`${this.baseUrl}/api/experiment/sessions/${sessionId}/widget-states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!response.ok) {
      throw new Error(`Failed to save widget state: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to save widget state');
    }
    return data.state;
  }

  /**
   * Widget状態一覧を取得
   */
  async getWidgetStates(sessionId: string): Promise<WidgetState[]> {
    const response = await fetch(`${this.baseUrl}/api/experiment/sessions/${sessionId}/widget-states`);
    if (!response.ok) {
      throw new Error(`Failed to get widget states: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get widget states');
    }
    return data.states;
  }

  /**
   * 生成履歴の更新（レンダリング時間など）
   */
  async updateGeneration(generationId: string, updates: { renderDuration: number }): Promise<void> {
    console.log(`💾 Updating generation ${generationId}:`, updates);
    try {
      const response = await fetch(`${this.baseUrl}/api/experiment/generations/${generationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update generation: ${response.statusText}`);
      }
      console.log(`✅ Generation updated: ${generationId}`);
    } catch (error) {
      console.error('❌ Failed to update generation:', error);
      throw error;
    }
  }
}

export const experimentApi = new ExperimentApiService(API_BASE_URL);
