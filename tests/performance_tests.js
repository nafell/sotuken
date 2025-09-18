#!/usr/bin/env node
/**
 * パフォーマンス単体テスト
 * 各機能の応答時間・スループット・リソース使用量測定
 */

const API_BASE = 'http://localhost:3000';

class PerformanceTestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
    this.metrics = [];
  }

  test(description, testFn) {
    this.tests.push({ description, testFn });
  }

  async run() {
    console.log('⚡ パフォーマンス単体テスト開始');
    console.log('=' .repeat(70));

    for (const { description, testFn } of this.tests) {
      this.results.total++;
      process.stdout.write(`  📊 ${description}... `);
      
      try {
        const metric = await testFn();
        console.log('✅ 成功');
        this.results.passed++;
        if (metric) this.metrics.push({ test: description, ...metric });
      } catch (error) {
        console.log(`❌ 失敗: ${error.message}`);
        this.results.failed++;
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '=' .repeat(70));
    console.log('🏆 パフォーマンステスト結果');
    console.log('=' .repeat(70));
    
    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    
    console.log(`総テスト数: ${this.results.total}`);
    console.log(`成功: ${this.results.passed} ✅`);
    console.log(`失敗: ${this.results.failed} ❌`);
    console.log(`成功率: ${successRate}%`);

    // パフォーマンスメトリクス表示
    if (this.metrics.length > 0) {
      console.log('\n📈 パフォーマンスメトリクス:');
      console.log('-'.repeat(60));
      this.metrics.forEach(metric => {
        console.log(`${metric.test}:`);
        if (metric.avgResponseTime) console.log(`  • 平均応答時間: ${metric.avgResponseTime}ms`);
        if (metric.maxResponseTime) console.log(`  • 最大応答時間: ${metric.maxResponseTime}ms`);
        if (metric.minResponseTime) console.log(`  • 最小応答時間: ${metric.minResponseTime}ms`);
        if (metric.throughput) console.log(`  • スループット: ${metric.throughput} req/sec`);
        if (metric.memoryUsage) console.log(`  • メモリ使用量: ${Math.round(metric.memoryUsage / 1024 / 1024)}MB`);
        if (metric.successRate !== undefined) console.log(`  • 成功率: ${metric.successRate}%`);
        console.log('');
      });
    }

    if (this.results.failed === 0) {
      console.log('🎉 全パフォーマンステスト成功！');
    } else {
      console.log(`⚠️ ${this.results.failed}件のパフォーマンステスト失敗`);
    }
  }
}

// パフォーマンス測定ユーティリティ
class PerformanceUtils {
  static async measureApiCall(url, options = {}) {
    const start = process.hrtime.bigint();
    const memBefore = process.memoryUsage().heapUsed;
    
    const response = await fetch(url, options);
    const data = await response.text();
    
    const end = process.hrtime.bigint();
    const memAfter = process.memoryUsage().heapUsed;
    
    const responseTimeMs = Number(end - start) / 1000000; // ナノ秒からミリ秒
    const memoryDelta = memAfter - memBefore;
    
    return {
      responseTime: Math.round(responseTimeMs * 100) / 100, // 小数点2桁
      memoryDelta,
      success: response.ok,
      statusCode: response.status,
      responseSize: data.length
    };
  }

  static async measureConcurrentRequests(requestFn, concurrency, totalRequests) {
    const results = [];
    const startTime = Date.now();
    
    // 同時実行制御
    const executeRequest = async (requestId) => {
      try {
        const result = await requestFn(requestId);
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };

    // バッチごとに実行
    for (let i = 0; i < totalRequests; i += concurrency) {
      const batch = [];
      const batchSize = Math.min(concurrency, totalRequests - i);
      
      for (let j = 0; j < batchSize; j++) {
        batch.push(executeRequest(i + j));
      }
      
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const successCount = results.filter(r => r.success).length;
    const responseTimes = results.filter(r => r.responseTime).map(r => r.responseTime);
    
    return {
      totalTime,
      totalRequests,
      successCount,
      successRate: Math.round((successCount / totalRequests) * 100),
      throughput: Math.round((totalRequests / totalTime) * 1000 * 100) / 100, // req/sec
      avgResponseTime: responseTimes.length > 0 ? 
        Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 100) / 100 : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0
    };
  }

  static async measureMemoryUsage(testFn) {
    const memBefore = process.memoryUsage();
    
    await testFn();
    
    // ガベージコレクション（可能なら）
    if (global.gc) {
      global.gc();
    }
    
    const memAfter = process.memoryUsage();
    
    return {
      heapUsedDelta: memAfter.heapUsed - memBefore.heapUsed,
      heapTotalDelta: memAfter.heapTotal - memBefore.heapTotal,
      rss: memAfter.rss,
      external: memAfter.external
    };
  }

  static async measureCpuUsage(testFn, duration = 1000) {
    const startUsage = process.cpuUsage();
    const start = Date.now();
    
    await testFn();
    
    const endUsage = process.cpuUsage(startUsage);
    const end = Date.now();
    const elapsed = end - start;
    
    return {
      user: endUsage.user / 1000, // マイクロ秒からミリ秒
      system: endUsage.system / 1000,
      total: (endUsage.user + endUsage.system) / 1000,
      elapsed,
      cpuPercent: ((endUsage.user + endUsage.system) / 1000 / elapsed) * 100
    };
  }
}

const runner = new PerformanceTestRunner();

// ===== API応答時間テスト =====
runner.test('API応答時間 - ヘルスチェック', async () => {
  const results = [];
  const iterations = 10;
  
  for (let i = 0; i < iterations; i++) {
    const result = await PerformanceUtils.measureApiCall(`${API_BASE}/health`);
    results.push(result);
    
    // 過負荷を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const avgResponseTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length * 100) / 100;
  const maxResponseTime = Math.max(...results.map(r => r.responseTime));
  const minResponseTime = Math.min(...results.map(r => r.responseTime));
  const successRate = Math.round((results.filter(r => r.success).length / results.length) * 100);
  
  // 基準値チェック（ヘルスチェックは100ms以下であるべき）
  if (avgResponseTime > 100) {
    throw new Error(`ヘルスチェック応答時間が遅い: ${avgResponseTime}ms`);
  }
  
  return { avgResponseTime, maxResponseTime, minResponseTime, successRate };
});

runner.test('API応答時間 - 設定取得', async () => {
  const results = [];
  const iterations = 10;
  
  for (let i = 0; i < iterations; i++) {
    const result = await PerformanceUtils.measureApiCall(`${API_BASE}/v1/config`);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const avgResponseTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length * 100) / 100;
  const maxResponseTime = Math.max(...results.map(r => r.responseTime));
  const minResponseTime = Math.min(...results.map(r => r.responseTime));
  const successRate = Math.round((results.filter(r => r.success).length / results.length) * 100);
  
  // 基準値チェック（設定取得は200ms以下であるべき）
  if (avgResponseTime > 200) {
    throw new Error(`設定取得応答時間が遅い: ${avgResponseTime}ms`);
  }
  
  return { avgResponseTime, maxResponseTime, minResponseTime, successRate };
});

runner.test('API応答時間 - UI生成', async () => {
  const results = [];
  const iterations = 5; // UI生成は重いため少なめ
  
  for (let i = 0; i < iterations; i++) {
    const requestBody = JSON.stringify({
      sessionId: `perf-test-${Date.now()}-${i}`,
      userExplicitInput: {
        concernText: 'パフォーマンステスト用の関心事です'
      },
      factors: {
        time_of_day: 'morning',
        day_of_week: 1
      },
      requestTimestamp: new Date().toISOString()
    });
    
    const result = await PerformanceUtils.measureApiCall(`${API_BASE}/v1/ui/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    });
    
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 100)); // UI生成間隔を長めに
  }
  
  const avgResponseTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length * 100) / 100;
  const maxResponseTime = Math.max(...results.map(r => r.responseTime));
  const minResponseTime = Math.min(...results.map(r => r.responseTime));
  const successRate = Math.round((results.filter(r => r.success).length / results.length) * 100);
  
  // 基準値チェック（UI生成は2000ms以下であるべき）
  if (avgResponseTime > 2000) {
    throw new Error(`UI生成応答時間が遅い: ${avgResponseTime}ms`);
  }
  
  return { avgResponseTime, maxResponseTime, minResponseTime, successRate };
});

// ===== 並行処理性能テスト =====
runner.test('並行処理性能 - ヘルスチェック', async () => {
  const requestFn = async (requestId) => {
    return await PerformanceUtils.measureApiCall(`${API_BASE}/health`);
  };
  
  const result = await PerformanceUtils.measureConcurrentRequests(requestFn, 10, 50);
  
  // 同時10リクエスト・計50リクエストで性能チェック
  if (result.successRate < 95) {
    throw new Error(`並行処理成功率が低い: ${result.successRate}%`);
  }
  
  if (result.avgResponseTime > 150) {
    throw new Error(`並行処理時の平均応答時間が遅い: ${result.avgResponseTime}ms`);
  }
  
  return {
    throughput: result.throughput,
    avgResponseTime: result.avgResponseTime,
    maxResponseTime: result.maxResponseTime,
    successRate: result.successRate
  };
});

runner.test('並行処理性能 - 設定取得', async () => {
  const requestFn = async (requestId) => {
    return await PerformanceUtils.measureApiCall(`${API_BASE}/v1/config`);
  };
  
  const result = await PerformanceUtils.measureConcurrentRequests(requestFn, 5, 25);
  
  if (result.successRate < 95) {
    throw new Error(`設定取得並行処理成功率が低い: ${result.successRate}%`);
  }
  
  return {
    throughput: result.throughput,
    avgResponseTime: result.avgResponseTime,
    maxResponseTime: result.maxResponseTime,
    successRate: result.successRate
  };
});

// ===== メモリ使用量テスト =====
runner.test('メモリ使用量 - 大量データ処理', async () => {
  const memoryUsage = await PerformanceUtils.measureMemoryUsage(async () => {
    // 大量のオブジェクトを作成・処理してメモリ使用量を測定
    const largeData = [];
    
    for (let i = 0; i < 10000; i++) {
      largeData.push({
        id: `item-${i}`,
        data: 'x'.repeat(100), // 100文字のダミーデータ
        timestamp: new Date(),
        factors: {
          time_of_day: 'morning',
          value: Math.random(),
          nested: {
            level1: { level2: { level3: 'deep data' } }
          }
        }
      });
    }
    
    // データの処理（ソート・フィルタリング）
    const processed = largeData
      .filter(item => item.factors.value > 0.5)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(item => ({
        id: item.id,
        processed: true,
        summary: item.data.length
      }));
    
    // 結果を利用（最適化で削除されないように）
    if (processed.length === 0) {
      throw new Error('処理結果が空です');
    }
  });
  
  const memoryUsageMB = Math.round(memoryUsage.heapUsedDelta / 1024 / 1024 * 100) / 100;
  
  // メモリ使用量が50MB以下であることを確認
  if (memoryUsageMB > 50) {
    throw new Error(`メモリ使用量が多すぎます: ${memoryUsageMB}MB`);
  }
  
  return { memoryUsage: memoryUsage.heapUsedDelta };
});

runner.test('メモリ使用量 - API呼び出し', async () => {
  const memoryUsage = await PerformanceUtils.measureMemoryUsage(async () => {
    // 大量のAPI呼び出しによるメモリリーク検証
    const promises = [];
    
    for (let i = 0; i < 20; i++) {
      promises.push(
        PerformanceUtils.measureApiCall(`${API_BASE}/health`)
      );
    }
    
    await Promise.all(promises);
  });
  
  const memoryUsageMB = Math.round(memoryUsage.heapUsedDelta / 1024 / 1024 * 100) / 100;
  
  // API呼び出しのメモリ使用量が10MB以下であることを確認
  if (memoryUsageMB > 10) {
    console.warn(`      ⚠️ API呼び出しメモリ使用量が多い: ${memoryUsageMB}MB`);
  }
  
  return { memoryUsage: memoryUsage.heapUsedDelta };
});

// ===== CPU使用率テスト =====
runner.test('CPU使用率 - factors計算処理', async () => {
  const cpuUsage = await PerformanceUtils.measureCpuUsage(async () => {
    // factors計算処理の模擬
    for (let i = 0; i < 1000; i++) {
      const factors = {};
      
      // 時間計算
      const now = new Date();
      factors.time_of_day = now.getHours() < 12 ? 'morning' : 'afternoon';
      factors.day_of_week = now.getDay();
      
      // 複雑な計算
      factors.calculated_value = Math.sqrt(Math.sin(i) * Math.cos(i) + Math.random());
      
      // オブジェクト操作
      const processed = JSON.parse(JSON.stringify(factors));
      processed.processed_at = new Date();
      
      // 文字列処理
      const serialized = JSON.stringify(processed);
      if (serialized.length < 10) {
        throw new Error('処理結果が不正です');
      }
    }
  });
  
  // CPU使用率が50%以下であることを確認
  if (cpuUsage.cpuPercent > 50) {
    console.warn(`      ⚠️ CPU使用率が高い: ${cpuUsage.cpuPercent.toFixed(2)}%`);
  }
  
  return { 
    cpuPercent: Math.round(cpuUsage.cpuPercent * 100) / 100,
    totalCpuTime: Math.round(cpuUsage.total * 100) / 100
  };
});

// ===== レスポンスサイズ効率テスト =====
runner.test('レスポンスサイズ効率', async () => {
  const endpoints = [
    { path: '/health', expectedMaxSize: 500 },
    { path: '/v1/config', expectedMaxSize: 2000 }
  ];
  
  const results = [];
  
  for (const { path, expectedMaxSize } of endpoints) {
    const result = await PerformanceUtils.measureApiCall(`${API_BASE}${path}`);
    
    if (result.responseSize > expectedMaxSize) {
      console.warn(`      ⚠️ ${path}のレスポンスサイズが大きい: ${result.responseSize}bytes`);
    }
    
    results.push({
      endpoint: path,
      size: result.responseSize,
      efficient: result.responseSize <= expectedMaxSize
    });
  }
  
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const efficientCount = results.filter(r => r.efficient).length;
  
  return {
    totalResponseSize: totalSize,
    efficientEndpoints: `${efficientCount}/${results.length}`,
    avgSize: Math.round(totalSize / results.length)
  };
});

// ===== キャッシュ効率テスト =====
runner.test('キャッシュ効率 - 同一リクエスト', async () => {
  // 同じリクエストを複数回実行してキャッシュ効果を測定
  const url = `${API_BASE}/v1/config`;
  const iterations = 5;
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await PerformanceUtils.measureApiCall(url);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  const firstResponse = results[0].responseTime;
  const subsequentResponses = results.slice(1);
  const avgSubsequent = subsequentResponses.reduce((sum, r) => sum + r.responseTime, 0) / subsequentResponses.length;
  
  // キャッシュ効果の判定（後続リクエストが初回より早い場合）
  const cacheEffective = avgSubsequent < firstResponse * 0.8;
  
  return {
    firstResponseTime: Math.round(firstResponse * 100) / 100,
    avgSubsequentTime: Math.round(avgSubsequent * 100) / 100,
    cacheEffective: cacheEffective,
    improvement: Math.round(((firstResponse - avgSubsequent) / firstResponse) * 100)
  };
});

// ===== データベース性能テスト =====
runner.test('データベース性能 - 複数クエリ', async () => {
  // データベースヘルスチェックを通じた間接的な性能測定
  const results = [];
  const iterations = 10;
  
  for (let i = 0; i < iterations; i++) {
    const result = await PerformanceUtils.measureApiCall(`${API_BASE}/health`);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  const successRate = (results.filter(r => r.success).length / results.length) * 100;
  
  // データベース接続を含むヘルスチェックが安定していることを確認
  if (successRate < 100) {
    throw new Error(`データベース接続が不安定: 成功率${successRate}%`);
  }
  
  if (avgResponseTime > 50) {
    console.warn(`      ⚠️ データベース込み応答時間が遅い: ${avgResponseTime.toFixed(2)}ms`);
  }
  
  return {
    avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    successRate: Math.round(successRate),
    dbStability: successRate === 100 ? 'excellent' : 'needs_improvement'
  };
});

// ===== エラー時のパフォーマンステスト =====
runner.test('エラー処理性能', async () => {
  // 不正なリクエストに対する応答時間測定
  const errorRequests = [
    { path: '/v1/nonexistent', expectedStatus: 404 },
    { 
      path: '/v1/ui/generate',
      method: 'POST',
      body: '{"invalid": "request"}',
      expectedStatus: 400
    }
  ];
  
  const results = [];
  
  for (const req of errorRequests) {
    const result = await PerformanceUtils.measureApiCall(`${API_BASE}${req.path}`, {
      method: req.method || 'GET',
      headers: req.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      body: req.body || undefined
    });
    
    // エラー処理も高速であることを確認
    if (result.responseTime > 200) {
      console.warn(`      ⚠️ エラー処理が遅い (${req.path}): ${result.responseTime}ms`);
    }
    
    results.push({
      path: req.path,
      responseTime: result.responseTime,
      statusCode: result.statusCode
    });
  }
  
  const avgErrorResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  return {
    avgErrorResponseTime: Math.round(avgErrorResponseTime * 100) / 100,
    errorHandlingEfficient: avgErrorResponseTime < 200
  };
});

// テスト実行
async function main() {
  console.log('⏳ サーバー準備確認（3秒待機）...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await runner.run();
  
  if (runner.results.failed === 0) {
    console.log('\n✅ パフォーマンステスト完了');
    process.exit(0);
  } else {
    console.log('\n❌ パフォーマンステスト完了（一部失敗）');
    process.exit(1);
  }
}

// Node.jsの場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
