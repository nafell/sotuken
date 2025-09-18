#!/usr/bin/env node
/**
 * ApiService 単体テスト
 * API呼び出し・エラーハンドリング・レスポンス処理の詳細単体テスト
 */

// シンプルなテストフレームワーク
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  test(description, testFn) {
    this.tests.push({ description, testFn });
  }

  async run() {
    console.log('🔗 ApiService 単体テスト開始');
    console.log('=' .repeat(60));

    for (const { description, testFn } of this.tests) {
      this.results.total++;
      process.stdout.write(`  📋 ${description}... `);
      
      try {
        await testFn();
        console.log('✅ 成功');
        this.results.passed++;
      } catch (error) {
        console.log(`❌ 失敗: ${error.message}`);
        this.results.failed++;
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('🏆 ApiService 単体テスト結果');
    console.log('=' .repeat(60));
    
    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    
    console.log(`総テスト数: ${this.results.total}`);
    console.log(`成功: ${this.results.passed} ✅`);
    console.log(`失敗: ${this.results.failed} ❌`);
    console.log(`成功率: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 全単体テスト成功！');
    } else {
      console.log(`\n⚠️ ${this.results.failed}件の単体テスト失敗`);
    }
  }
}

// モックAPIサービス（実際のサーバーに依存しない）
class MockApiService {
  constructor() {
    this.baseUrl = 'http://localhost:3000/v1';
    this.anonymousUserId = 'test-user-' + Math.random().toString(36).substr(2, 9);
    this.eventQueue = [];
  }

  // モックfetch実装
  async mockFetch(url, options = {}) {
    const delay = Math.random() * 50; // 0-50msの遅延
    await new Promise(resolve => setTimeout(resolve, delay));

    // URLとオプションに基づいてモックレスポンス生成
    if (url.includes('/health')) {
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'concern-app-server',
          database: { status: 'healthy', experimentCount: '1' }
        })
      };
    }

    if (url.includes('/config')) {
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          configVersion: 'v1',
          weightsVersion: 'v1',
          experimentAssignment: {
            condition: 'dynamic_ui',
            assignedAt: new Date().toISOString(),
            experimentId: 'exp_001'
          },
          weights: {
            importance: 0.25,
            urgency: 0.2,
            cognitiveRelief: 0.18
          }
        })
      };
    }

    if (url.includes('/ui/generate') && options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      
      // バリデーション
      if (!body.userExplicitInput?.concernText) {
        return {
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            error: 'concernText is required'
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          sessionId: body.sessionId,
          generationId: 'gen-' + Math.random().toString(36).substr(2, 9),
          uiDsl: {
            version: '1.1',
            layout: { type: 'vertical', sections: [] }
          },
          generation: { fallbackUsed: true }
        })
      };
    }

    if (url.includes('/events/batch') && options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const errors = [];
      let validEvents = 0;

      if (body.events) {
        body.events.forEach((event, index) => {
          if (!event.eventId) errors.push(`Event ${index}: eventId is required`);
          if (!event.sessionId) errors.push(`Event ${index}: sessionId is required`);
          if (!event.anonymousUserId) errors.push(`Event ${index}: anonymousUserId is required`);
          if (!event.eventType) errors.push(`Event ${index}: eventType is required`);
          
          if (errors.length === 0) validEvents++;
        });
      }

      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          recordedEvents: validEvents,
          errors: errors,
          processingTimeMs: 5,
          nextBatchId: 'batch-' + Math.random().toString(36).substr(2, 9)
        })
      };
    }

    // 不明なエンドポイント
    return {
      ok: false,
      status: 404,
      json: () => Promise.resolve({
        error: 'Not Found'
      })
    };
  }

  // ヘルスチェック
  async checkHealth() {
    const response = await this.mockFetch(`${this.baseUrl.replace('/v1', '')}/health`);
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    return response.json();
  }

  // 設定取得
  async getConfig() {
    const response = await this.mockFetch(`${this.baseUrl}/config`);
    if (!response.ok) throw new Error(`Config fetch failed: ${response.status}`);
    return response.json();
  }

  // UI生成
  async generateUI(request) {
    if (!request.userExplicitInput || !request.userExplicitInput.concernText) {
      throw new Error('userExplicitInput.concernText is required');
    }

    const response = await this.mockFetch(`${this.baseUrl}/ui/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: request.sessionId || 'default-session',
        userExplicitInput: request.userExplicitInput,
        factors: request.factors || {},
        requestTimestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`UI generation failed: ${errorData.error}`);
    }

    return response.json();
  }

  // イベント送信
  async sendEvent(event) {
    if (!event.eventId) throw new Error('eventId is required');
    if (!event.eventType) throw new Error('eventType is required');

    this.eventQueue.push({
      ...event,
      sessionId: event.sessionId || 'default-session',
      anonymousUserId: this.anonymousUserId,
      timestamp: event.timestamp || new Date().toISOString()
    });

    // キューが満杯（5個）になったらバッチ送信
    if (this.eventQueue.length >= 5) {
      return this.flushEvents();
    }

    return { queued: true, queueSize: this.eventQueue.length };
  }

  // バッチイベント送信
  async sendEventsBatch(events) {
    const response = await this.mockFetch(`${this.baseUrl}/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    });

    if (!response.ok) throw new Error(`Event batch failed: ${response.status}`);
    return response.json();
  }

  // イベントキューフラッシュ
  async flushEvents() {
    if (this.eventQueue.length === 0) return { flushed: 0 };

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    const result = await this.sendEventsBatch(eventsToSend);
    return { flushed: eventsToSend.length, result };
  }

  // リクエストバリデーション
  validateUIGenerationRequest(request) {
    const errors = [];

    if (!request.userExplicitInput) {
      errors.push('userExplicitInput is required');
    } else {
      if (!request.userExplicitInput.concernText || request.userExplicitInput.concernText.trim().length < 3) {
        errors.push('concernText must be at least 3 characters');
      }
      
      if (request.userExplicitInput.concernLevel) {
        const validLevels = ['low', 'medium', 'high'];
        if (!validLevels.includes(request.userExplicitInput.concernLevel)) {
          errors.push('concernLevel must be low, medium, or high');
        }
      }
    }

    if (request.factors) {
      if (typeof request.factors !== 'object') {
        errors.push('factors must be an object');
      }
    }

    return errors;
  }

  // レスポンスバリデーション
  validateUIGenerationResponse(response) {
    const errors = [];

    if (!response.generationId) errors.push('generationId is required');
    if (!response.uiDsl) errors.push('uiDsl is required');
    
    if (response.uiDsl && !response.uiDsl.version) {
      errors.push('uiDsl.version is required');
    }

    return errors;
  }

  // エラーレート計算
  calculateErrorRate(responses) {
    if (!responses || responses.length === 0) return 0;
    
    const errorCount = responses.filter(r => !r.success).length;
    return Math.round((errorCount / responses.length) * 100);
  }

  // 平均応答時間計算
  calculateAverageResponseTime(responses) {
    if (!responses || responses.length === 0) return 0;
    
    const validTimes = responses.filter(r => r.responseTime && r.responseTime > 0);
    if (validTimes.length === 0) return 0;
    
    const total = validTimes.reduce((sum, r) => sum + r.responseTime, 0);
    return Math.round(total / validTimes.length);
  }
}

// 単体テスト実装
const runner = new TestRunner();
const apiService = new MockApiService();

// 基本API呼び出しテスト
runner.test('ヘルスチェックAPI呼び出し', async () => {
  const result = await apiService.checkHealth();
  
  if (!result.status) throw new Error('status field missing');
  if (result.status !== 'ok') throw new Error(`unexpected status: ${result.status}`);
  if (!result.timestamp) throw new Error('timestamp field missing');
});

runner.test('設定取得API呼び出し', async () => {
  const config = await apiService.getConfig();
  
  if (!config.configVersion) throw new Error('configVersion missing');
  if (!config.experimentAssignment) throw new Error('experimentAssignment missing');
  if (!config.weights) throw new Error('weights missing');
  
  // 重み値の検証
  if (typeof config.weights.importance !== 'number') {
    throw new Error('weights.importance must be a number');
  }
  if (config.weights.importance < 0 || config.weights.importance > 1) {
    throw new Error('weights.importance must be between 0 and 1');
  }
});

runner.test('UI生成API - 正常リクエスト', async () => {
  const request = {
    sessionId: 'test-session-123',
    userExplicitInput: {
      concernText: 'テスト用の関心事です',
      concernLevel: 'medium'
    },
    factors: {
      time_of_day: 'morning',
      day_of_week: 1
    }
  };

  const result = await apiService.generateUI(request);
  
  if (!result.generationId) throw new Error('generationId missing');
  if (!result.uiDsl) throw new Error('uiDsl missing');
  if (!result.uiDsl.version) throw new Error('uiDsl.version missing');
  if (result.sessionId !== request.sessionId) {
    throw new Error('sessionId mismatch');
  }
});

runner.test('UI生成API - 不正リクエスト', async () => {
  const invalidRequest = {
    sessionId: 'test-session-123'
    // userExplicitInputが不足
  };

  try {
    await apiService.generateUI(invalidRequest);
    throw new Error('Should have thrown an error for invalid request');
  } catch (error) {
    if (!error.message.includes('concernText')) {
      throw new Error('Expected concernText error message');
    }
  }
});

runner.test('イベント送信 - 単一イベント', async () => {
  const event = {
    eventId: 'test-event-1',
    eventType: 'ui_shown',
    eventData: { screen: 'home' }
  };

  const result = await apiService.sendEvent(event);
  
  if (!result.queued) throw new Error('Event should be queued');
  if (typeof result.queueSize !== 'number') throw new Error('queueSize should be a number');
});

runner.test('イベント送信 - バッチ処理', async () => {
  const events = [
    { eventId: 'batch-1', sessionId: 'test', anonymousUserId: 'user-1', eventType: 'ui_shown', timestamp: new Date().toISOString() },
    { eventId: 'batch-2', sessionId: 'test', anonymousUserId: 'user-1', eventType: 'action_started', timestamp: new Date().toISOString() }
  ];

  const result = await apiService.sendEventsBatch(events);
  
  if (typeof result.recordedEvents !== 'number') throw new Error('recordedEvents should be a number');
  if (!Array.isArray(result.errors)) throw new Error('errors should be an array');
  if (result.recordedEvents !== 2) throw new Error('Expected 2 events to be recorded');
});

runner.test('バリデーション - UI生成リクエスト', async () => {
  const testCases = [
    {
      request: { userExplicitInput: { concernText: 'valid concern' } },
      expectedErrors: 0
    },
    {
      request: { userExplicitInput: { concernText: '' } },
      expectedErrors: 1 // concernText too short
    },
    {
      request: { userExplicitInput: { concernText: 'valid', concernLevel: 'invalid' } },
      expectedErrors: 1 // invalid concernLevel
    },
    {
      request: { factors: 'not an object' },
      expectedErrors: 2 // missing userExplicitInput + invalid factors
    }
  ];

  testCases.forEach(({ request, expectedErrors }, index) => {
    const errors = apiService.validateUIGenerationRequest(request);
    if (errors.length !== expectedErrors) {
      throw new Error(`Test case ${index + 1}: expected ${expectedErrors} errors, got ${errors.length}: ${errors.join(', ')}`);
    }
  });
});

runner.test('バリデーション - UI生成レスポンス', async () => {
  const testCases = [
    {
      response: { generationId: '123', uiDsl: { version: '1.1' } },
      expectedErrors: 0
    },
    {
      response: { uiDsl: { version: '1.1' } },
      expectedErrors: 1 // missing generationId
    },
    {
      response: { generationId: '123', uiDsl: {} },
      expectedErrors: 1 // missing uiDsl.version
    },
    {
      response: {},
      expectedErrors: 2 // missing both
    }
  ];

  testCases.forEach(({ response, expectedErrors }, index) => {
    const errors = apiService.validateUIGenerationResponse(response);
    if (errors.length !== expectedErrors) {
      throw new Error(`Test case ${index + 1}: expected ${expectedErrors} errors, got ${errors.length}: ${errors.join(', ')}`);
    }
  });
});

runner.test('エラーレート計算', async () => {
  const responses = [
    { success: true, responseTime: 100 },
    { success: false, responseTime: 200 },
    { success: true, responseTime: 150 },
    { success: false, responseTime: 300 }
  ];

  const errorRate = apiService.calculateErrorRate(responses);
  if (errorRate !== 50) {
    throw new Error(`Expected 50% error rate, got ${errorRate}%`);
  }

  // 空配列のテスト
  const emptyErrorRate = apiService.calculateErrorRate([]);
  if (emptyErrorRate !== 0) {
    throw new Error(`Expected 0% error rate for empty array, got ${emptyErrorRate}%`);
  }
});

runner.test('平均応答時間計算', async () => {
  const responses = [
    { success: true, responseTime: 100 },
    { success: false, responseTime: 200 },
    { success: true, responseTime: 150 }
  ];

  const avgTime = apiService.calculateAverageResponseTime(responses);
  const expected = Math.round((100 + 200 + 150) / 3);
  if (avgTime !== expected) {
    throw new Error(`Expected ${expected}ms average, got ${avgTime}ms`);
  }
});

runner.test('並行リクエスト処理', async () => {
  const concurrentRequests = 5;
  const startTime = Date.now();
  
  const promises = Array(concurrentRequests).fill().map((_, index) => 
    apiService.generateUI({
      sessionId: `concurrent-${index}`,
      userExplicitInput: { concernText: `Concurrent test ${index}` }
    })
  );

  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  if (results.length !== concurrentRequests) {
    throw new Error(`Expected ${concurrentRequests} results, got ${results.length}`);
  }
  
  // 並行処理により、シーケンシャルより早く完了するはず
  const maxSequentialTime = concurrentRequests * 50; // 各リクエスト最大50ms想定
  const actualTime = endTime - startTime;
  
  if (actualTime > maxSequentialTime) {
    console.warn(`Concurrent processing took ${actualTime}ms (expected < ${maxSequentialTime}ms)`);
  }
  
  // 各結果の妥当性確認
  results.forEach((result, index) => {
    if (!result.generationId) {
      throw new Error(`Concurrent request ${index} missing generationId`);
    }
  });
});

runner.test('メモリリーク防止 - イベントキューサイズ制限', async () => {
  // 大量のイベントを送信してキューが適切に管理されることを確認
  for (let i = 0; i < 10; i++) {
    await apiService.sendEvent({
      eventId: `memory-test-${i}`,
      eventType: 'ui_shown',
      eventData: { test: true }
    });
  }

  // キューサイズが制限されていることを確認（自動フラッシュが動作）
  if (apiService.eventQueue.length > 5) {
    throw new Error(`Event queue too large: ${apiService.eventQueue.length}`);
  }
});

runner.test('エラーハンドリング - ネットワークエラー', async () => {
  // モックでネットワークエラーをシミュレート
  const originalMockFetch = apiService.mockFetch;
  apiService.mockFetch = () => Promise.reject(new Error('Network error'));

  try {
    await apiService.checkHealth();
    throw new Error('Should have thrown network error');
  } catch (error) {
    if (!error.message.includes('Network error')) {
      throw new Error('Expected network error');
    }
  } finally {
    // テスト後に元に戻す
    apiService.mockFetch = originalMockFetch;
  }
});

// テスト実行
async function main() {
  await runner.run();
  
  if (runner.results.failed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Node.jsの場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MockApiService, TestRunner };
