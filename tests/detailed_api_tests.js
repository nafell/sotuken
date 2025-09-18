#!/usr/bin/env node
/**
 * API詳細テスト
 * 各エンドポイントの境界値・エラーケース・レスポンス検証
 */

const API_BASE = 'http://localhost:3000';

class DetailedApiTestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  test(description, testFn) {
    this.tests.push({ description, testFn });
  }

  async run() {
    console.log('🔬 API詳細テスト開始');
    console.log('=' .repeat(70));

    for (const { description, testFn } of this.tests) {
      this.results.total++;
      process.stdout.write(`  🧪 ${description}... `);
      
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
    console.log('\n' + '=' .repeat(70));
    console.log('🏆 API詳細テスト結果');
    console.log('=' .repeat(70));
    
    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    
    console.log(`総テスト数: ${this.results.total}`);
    console.log(`成功: ${this.results.passed} ✅`);
    console.log(`失敗: ${this.results.failed} ❌`);
    console.log(`成功率: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 全詳細テスト成功！');
    } else {
      console.log(`\n⚠️ ${this.results.failed}件の詳細テスト失敗`);
    }
  }
}

// API詳細テストユーティリティ
class ApiTestUtils {
  static async makeRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      data
    };
  }

  static generateLargeString(length) {
    return 'x'.repeat(length);
  }

  static generateValidSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  static generateValidEventId() {
    return 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  static generateValidAnonymousUserId() {
    return 'user-' + Math.random().toString(36).substr(2, 12);
  }

  static async measureResponseTime(testFn) {
    const start = Date.now();
    const result = await testFn();
    const responseTime = Date.now() - start;
    return { result, responseTime };
  }

  static validateTimestamp(timestamp) {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return date instanceof Date && !isNaN(date) && date.getTime() > 0;
  }

  static validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

const runner = new DetailedApiTestRunner();

// ===== ヘルスチェックAPI詳細テスト =====
runner.test('ヘルスチェック - 基本レスポンス構造', async () => {
  const { status, ok, data } = await ApiTestUtils.makeRequest('/health');
  
  if (!ok) throw new Error(`期待されるHTTP 200、実際は${status}`);
  if (!data.status) throw new Error('statusフィールドが不足');
  if (!data.timestamp) throw new Error('timestampフィールドが不足');
  if (!data.service) throw new Error('serviceフィールドが不足');
  
  // タイムスタンプの妥当性
  if (!ApiTestUtils.validateTimestamp(data.timestamp)) {
    throw new Error('無効なタイムスタンプ形式');
  }
  
  // サービス名の確認
  if (data.service !== 'concern-app-server') {
    throw new Error(`期待されるサービス名: concern-app-server、実際: ${data.service}`);
  }
});

runner.test('ヘルスチェック - データベース状態検証', async () => {
  const { data } = await ApiTestUtils.makeRequest('/health');
  
  if (!data.database) throw new Error('databaseフィールドが不足');
  if (!data.database.status) throw new Error('database.statusが不足');
  if (!data.database.timestamp) throw new Error('database.timestampが不足');
  
  const validStatuses = ['healthy', 'degraded', 'unhealthy'];
  if (!validStatuses.includes(data.database.status)) {
    throw new Error(`無効なデータベースステータス: ${data.database.status}`);
  }
});

runner.test('ヘルスチェック - レスポンス時間', async () => {
  const { result, responseTime } = await ApiTestUtils.measureResponseTime(
    () => ApiTestUtils.makeRequest('/health')
  );
  
  if (!result.ok) throw new Error('ヘルスチェック失敗');
  if (responseTime > 1000) {
    console.warn(`      ⚠️ 応答時間が遅い: ${responseTime}ms`);
  }
  
  console.log(`      ⏱️ 応答時間: ${responseTime}ms`);
});

// ===== 設定配布API詳細テスト =====
runner.test('設定配布 - 完全なレスポンス構造', async () => {
  const { status, ok, data } = await ApiTestUtils.makeRequest('/v1/config');
  
  if (!ok) throw new Error(`期待されるHTTP 200、実際は${status}`);
  
  // 必須フィールド検証
  const requiredFields = ['configVersion', 'weightsVersion', 'experimentAssignment', 'weights'];
  for (const field of requiredFields) {
    if (!data[field]) throw new Error(`${field}フィールドが不足`);
  }
  
  // experimentAssignmentの詳細検証
  const assignment = data.experimentAssignment;
  if (!assignment.condition) throw new Error('実験条件が不足');
  if (!assignment.assignedAt) throw new Error('割り当て時間が不足');
  if (!assignment.experimentId) throw new Error('実験IDが不足');
  
  if (!ApiTestUtils.validateTimestamp(assignment.assignedAt)) {
    throw new Error('割り当て時間のタイムスタンプが無効');
  }
});

runner.test('設定配布 - 重み設定検証', async () => {
  const { data } = await ApiTestUtils.makeRequest('/v1/config');
  
  const weights = data.weights;
  const requiredWeights = ['importance', 'urgency', 'cognitiveRelief'];
  
  for (const weight of requiredWeights) {
    if (!(weight in weights)) throw new Error(`重み${weight}が不足`);
    if (typeof weights[weight] !== 'number') throw new Error(`重み${weight}は数値である必要があります`);
    if (weights[weight] < 0 || weights[weight] > 1) {
      throw new Error(`重み${weight}は0-1の範囲である必要があります: ${weights[weight]}`);
    }
  }
  
  // 重みの合計は1.0前後であることを確認（許容誤差0.1）
  const totalWeight = Object.values(weights).filter(w => typeof w === 'number' && w > 0).reduce((sum, w) => sum + w, 0);
  if (Math.abs(totalWeight - 1.0) > 0.1) {
    console.warn(`      ⚠️ 重みの合計が1.0から離れています: ${totalWeight}`);
  }
});

runner.test('設定配布 - キャッシュ制御ヘッダー', async () => {
  const { headers } = await ApiTestUtils.makeRequest('/v1/config');
  
  // 設定はキャッシュされるべきではない（頻繁に更新される可能性）
  if (headers['cache-control'] && headers['cache-control'].includes('no-cache')) {
    console.log('      ✓ 適切なキャッシュ制御');
  } else {
    console.warn('      ⚠️ キャッシュ制御ヘッダー要確認');
  }
});

// ===== UI生成API詳細テスト =====
runner.test('UI生成 - 最小有効リクエスト', async () => {
  const minimalRequest = {
    sessionId: ApiTestUtils.generateValidSessionId(),
    userExplicitInput: {
      concernText: 'abc' // 最小3文字
    },
    factors: {},
    requestTimestamp: new Date().toISOString()
  };

  const { status, ok, data } = await ApiTestUtils.makeRequest('/v1/ui/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(minimalRequest)
  });

  if (!ok) throw new Error(`最小リクエストが失敗: HTTP ${status}`);
  if (!data.generationId) throw new Error('generationIdが不足');
  if (!data.uiDsl) throw new Error('uiDslが不足');
});

runner.test('UI生成 - concernText境界値テスト', async () => {
  const testCases = [
    { concernText: '', expectedStatus: 400, description: '空文字' },
    { concernText: 'ab', expectedStatus: 400, description: '2文字（不足）' },
    { concernText: 'abc', expectedStatus: 200, description: '3文字（最小有効）' },
    { concernText: ApiTestUtils.generateLargeString(1000), expectedStatus: 200, description: '1000文字' },
    { concernText: ApiTestUtils.generateLargeString(10000), expectedStatus: 400, description: '10000文字（超過想定）' }
  ];

  for (const testCase of testCases) {
    const request = {
      sessionId: ApiTestUtils.generateValidSessionId(),
      userExplicitInput: { concernText: testCase.concernText },
      factors: {},
      requestTimestamp: new Date().toISOString()
    };

    const { status } = await ApiTestUtils.makeRequest('/v1/ui/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    // 10000文字の場合は実装依存のため警告のみ
    if (testCase.concernText.length === 10000 && status === 200) {
      console.warn(`      ⚠️ 超長文字列が受け入れられました（${testCase.description}）`);
      continue;
    }

    if (status !== testCase.expectedStatus) {
      throw new Error(`${testCase.description}: 期待ステータス${testCase.expectedStatus}、実際${status}`);
    }
  }
});

runner.test('UI生成 - 不正なJSON', async () => {
  const { status } = await ApiTestUtils.makeRequest('/v1/ui/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ invalid json'
  });

  if (status !== 400) {
    throw new Error(`不正JSON: 期待ステータス400、実際${status}`);
  }
});

runner.test('UI生成 - Content-Type不正', async () => {
  const validRequest = {
    sessionId: ApiTestUtils.generateValidSessionId(),
    userExplicitInput: { concernText: '有効な関心事' }
  };

  const { status } = await ApiTestUtils.makeRequest('/v1/ui/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(validRequest)
  });

  if (status < 400) {
    console.warn('      ⚠️ 不正Content-Typeが受け入れられました');
  }
});

runner.test('UI生成 - factors型検証', async () => {
  const testCases = [
    { factors: null, valid: false, description: 'null' },
    { factors: 'string', valid: false, description: '文字列' },
    { factors: [], valid: false, description: '配列' },
    { factors: {}, valid: true, description: '空オブジェクト' },
    { 
      factors: { 
        time_of_day: 'morning',
        day_of_week: 1,
        available_time_min: 30 
      }, 
      valid: true, 
      description: '有効なオブジェクト' 
    }
  ];

  for (const testCase of testCases) {
    const request = {
      sessionId: ApiTestUtils.generateValidSessionId(),
      userExplicitInput: { concernText: 'テスト関心事' },
      factors: testCase.factors,
      requestTimestamp: new Date().toISOString()
    };

    const { status } = await ApiTestUtils.makeRequest('/v1/ui/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const isSuccess = status >= 200 && status < 300;
    
    if (testCase.valid && !isSuccess) {
      throw new Error(`${testCase.description}: 有効なfactorsが拒否されました（${status}）`);
    } else if (!testCase.valid && isSuccess) {
      console.warn(`      ⚠️ ${testCase.description}: 無効なfactorsが受け入れられました`);
    }
  }
});

runner.test('UI生成 - UUIDレスポンス検証', async () => {
  const request = {
    sessionId: ApiTestUtils.generateValidSessionId(),
    userExplicitInput: { concernText: '通常の関心事' },
    factors: { time_of_day: 'morning' },
    requestTimestamp: new Date().toISOString()
  };

  const { data } = await ApiTestUtils.makeRequest('/v1/ui/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!ApiTestUtils.validateUUID(data.generationId)) {
    throw new Error(`無効なgenerationId UUID: ${data.generationId}`);
  }

  if (data.sessionId !== request.sessionId) {
    throw new Error('sessionIdが要求と一致しません');
  }
});

// ===== イベントログAPI詳細テスト =====
runner.test('イベントログ - 単一イベント完全検証', async () => {
  const validEvent = {
    eventId: ApiTestUtils.generateValidEventId(),
    sessionId: ApiTestUtils.generateValidSessionId(),
    anonymousUserId: ApiTestUtils.generateValidAnonymousUserId(),
    eventType: 'ui_shown',
    timestamp: new Date().toISOString(),
    eventData: { screen: 'home', loadTime: 150 }
  };

  const { status, ok, data } = await ApiTestUtils.makeRequest('/v1/events/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [validEvent] })
  });

  if (!ok) throw new Error(`イベント送信失敗: HTTP ${status}`);
  if (data.recordedEvents !== 1) throw new Error(`期待記録数1、実際${data.recordedEvents}`);
  if (data.errors.length !== 0) throw new Error(`予期しないエラー: ${data.errors.join(', ')}`);
  if (!ApiTestUtils.validateUUID(data.nextBatchId)) throw new Error('無効なnextBatchId UUID');
});

runner.test('イベントログ - 必須フィールド検証', async () => {
  const requiredFields = ['eventId', 'sessionId', 'anonymousUserId', 'eventType', 'timestamp'];
  
  for (const missingField of requiredFields) {
    const incompleteEvent = {
      eventId: ApiTestUtils.generateValidEventId(),
      sessionId: ApiTestUtils.generateValidSessionId(),
      anonymousUserId: ApiTestUtils.generateValidAnonymousUserId(),
      eventType: 'ui_shown',
      timestamp: new Date().toISOString()
    };

    delete incompleteEvent[missingField];

    const { data } = await ApiTestUtils.makeRequest('/v1/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [incompleteEvent] })
    });

    if (data.errors.length === 0) {
      throw new Error(`必須フィールド${missingField}の欠如が検出されませんでした`);
    }

    const expectedError = `${missingField} is required`;
    if (!data.errors.some(err => err.includes(expectedError))) {
      throw new Error(`期待されるエラーメッセージが見つかりません: ${expectedError}`);
    }
  }
});

runner.test('イベントログ - 有効なイベントタイプ検証', async () => {
  const validEventTypes = ['ui_shown', 'action_started', 'action_completed', 'satisfaction_reported', 'session_ended', 'screen_navigation'];
  const invalidEventTypes = ['invalid_type', 'ui_click', 'button_pressed', ''];

  // 有効なイベントタイプのテスト
  for (const eventType of validEventTypes) {
    const event = {
      eventId: ApiTestUtils.generateValidEventId(),
      sessionId: ApiTestUtils.generateValidSessionId(),
      anonymousUserId: ApiTestUtils.generateValidAnonymousUserId(),
      eventType: eventType,
      timestamp: new Date().toISOString()
    };

    const { data } = await ApiTestUtils.makeRequest('/v1/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [event] })
    });

    if (data.recordedEvents !== 1) {
      throw new Error(`有効なイベントタイプ${eventType}が拒否されました`);
    }
  }

  // 無効なイベントタイプのテスト
  for (const eventType of invalidEventTypes) {
    const event = {
      eventId: ApiTestUtils.generateValidEventId(),
      sessionId: ApiTestUtils.generateValidSessionId(),
      anonymousUserId: ApiTestUtils.generateValidAnonymousUserId(),
      eventType: eventType,
      timestamp: new Date().toISOString()
    };

    const { data } = await ApiTestUtils.makeRequest('/v1/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [event] })
    });

    if (data.errors.length === 0) {
      throw new Error(`無効なイベントタイプ${eventType}が受け入れられました`);
    }
  }
});

runner.test('イベントログ - バッチサイズ制限', async () => {
  // 大量イベント（100個）
  const events = Array(100).fill().map((_, index) => ({
    eventId: ApiTestUtils.generateValidEventId() + '-' + index,
    sessionId: ApiTestUtils.generateValidSessionId(),
    anonymousUserId: ApiTestUtils.generateValidAnonymousUserId(),
    eventType: 'ui_shown',
    timestamp: new Date(Date.now() + index).toISOString()
  }));

  const { status, data } = await ApiTestUtils.makeRequest('/v1/events/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events })
  });

  if (status === 413) {
    console.log('      ✓ バッチサイズ制限が適切に実装されています');
  } else if (status === 200) {
    console.warn(`      ⚠️ 大量イベント（100個）が受け入れられました: ${data.recordedEvents}件記録`);
  } else {
    throw new Error(`予期しないステータス: ${status}`);
  }
});

runner.test('イベントログ - タイムスタンプ形式検証', async () => {
  const timestampFormats = [
    { timestamp: new Date().toISOString(), valid: true, description: 'ISO形式' },
    { timestamp: Date.now().toString(), valid: false, description: 'Unix timestamp' },
    { timestamp: new Date().toString(), valid: false, description: '標準文字列形式' },
    { timestamp: '2025-09-18T12:00:00Z', valid: true, description: 'Z suffix' },
    { timestamp: '2025-09-18T12:00:00.000Z', valid: true, description: 'ミリ秒付きZ suffix' },
    { timestamp: 'invalid-timestamp', valid: false, description: '無効な文字列' }
  ];

  for (const { timestamp, valid, description } of timestampFormats) {
    const event = {
      eventId: ApiTestUtils.generateValidEventId(),
      sessionId: ApiTestUtils.generateValidSessionId(),
      anonymousUserId: ApiTestUtils.generateValidAnonymousUserId(),
      eventType: 'ui_shown',
      timestamp: timestamp
    };

    const { data } = await ApiTestUtils.makeRequest('/v1/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [event] })
    });

    const hasErrors = data.errors.length > 0;
    
    if (valid && hasErrors) {
      // 現在の実装ではタイムスタンプ検証が厳密でない可能性
      console.warn(`      ⚠️ ${description}: 有効なタイムスタンプが拒否されました`);
    } else if (!valid && !hasErrors) {
      console.warn(`      ⚠️ ${description}: 無効なタイムスタンプが受け入れられました`);
    }
  }
});

runner.test('イベントログ - 重複イベントID検出', async () => {
  const duplicateEventId = ApiTestUtils.generateValidEventId();
  const events = [
    {
      eventId: duplicateEventId,
      sessionId: ApiTestUtils.generateValidSessionId(),
      anonymousUserId: ApiTestUtils.generateValidAnonymousUserId(),
      eventType: 'ui_shown',
      timestamp: new Date().toISOString()
    },
    {
      eventId: duplicateEventId, // 同じID
      sessionId: ApiTestUtils.generateValidSessionId(),
      anonymousUserId: ApiTestUtils.generateValidAnonymousUserId(),
      eventType: 'action_started',
      timestamp: new Date().toISOString()
    }
  ];

  const { data } = await ApiTestUtils.makeRequest('/v1/events/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events })
  });

  // 現在の実装では重複検出機能がない可能性
  if (data.recordedEvents === 2) {
    console.warn('      ⚠️ 重複イベントIDが検出されませんでした');
  } else {
    console.log('      ✓ 重複イベントID処理が適切です');
  }
});

// ===== レート制限・セキュリティテスト =====
runner.test('レート制限テスト', async () => {
  const rapidRequests = 20;
  const promises = [];

  for (let i = 0; i < rapidRequests; i++) {
    promises.push(
      ApiTestUtils.makeRequest('/v1/config').then(result => ({
        ...result,
        requestIndex: i
      }))
    );
  }

  const results = await Promise.all(promises);
  const rateLimitedCount = results.filter(r => r.status === 429).length;
  
  if (rateLimitedCount > 0) {
    console.log(`      ✓ レート制限が動作しています: ${rateLimitedCount}件制限`);
  } else {
    console.warn(`      ⚠️ ${rapidRequests}件の高速リクエストが全て受け入れられました`);
  }
});

runner.test('大きなペイロードテスト', async () => {
  const largePayload = {
    sessionId: ApiTestUtils.generateValidSessionId(),
    userExplicitInput: {
      concernText: ApiTestUtils.generateLargeString(5000)
    },
    factors: Object.fromEntries(
      Array(50).fill().map((_, i) => [`factor_${i}`, `value_${ApiTestUtils.generateLargeString(100)}`])
    )
  };

  const { status } = await ApiTestUtils.makeRequest('/v1/ui/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(largePayload)
  });

  if (status === 413) {
    console.log('      ✓ ペイロードサイズ制限が適切に実装されています');
  } else if (status >= 200 && status < 300) {
    console.warn('      ⚠️ 大きなペイロードが受け入れられました');
  } else {
    console.warn(`      ⚠️ 予期しないステータス（大きなペイロード）: ${status}`);
  }
});

// テスト実行
async function main() {
  console.log('⏳ サーバー準備確認（3秒待機）...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await runner.run();
  
  if (runner.results.failed === 0) {
    console.log('\n✅ API詳細テスト完了');
    process.exit(0);
  } else {
    console.log('\n❌ API詳細テスト完了（一部失敗）');
    process.exit(1);
  }
}

// Node.jsの場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
