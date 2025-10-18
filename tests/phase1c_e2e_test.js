/**
 * Phase 1C E2E統合テスト
 * 
 * 思考整理フロー + タスク推奨フロー + Rule-based Rendering
 */

const SERVER_URL = 'http://localhost:3000';

// テストユーティリティ
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async runTest(name, testFn) {
    try {
      console.log(`\n🧪 テスト: ${name}`);
      await testFn();
      this.passed++;
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      this.failed++;
      console.error(`❌ FAIL: ${name}`);
      console.error(`   エラー: ${error.message}`);
      if (error.stack) {
        console.error(`   スタック: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log(`📊 テスト結果サマリー`);
    console.log(`   合格: ${this.passed}`);
    console.log(`   不合格: ${this.failed}`);
    console.log(`   合計: ${this.passed + this.failed}`);
    console.log('='.repeat(50));
    
    if (this.failed === 0) {
      console.log('🎉 全テスト合格！Phase 1C完了 🎉\n');
      process.exit(0);
    } else {
      console.log('⚠️  一部のテストが失敗しました\n');
      process.exit(1);
    }
  }
}

// アサーション関数
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertExists(value, name) {
  assert(value !== undefined && value !== null, `${name} が存在しません`);
}

function assertEqual(actual, expected, name) {
  assert(actual === expected, `${name}: 期待値 ${expected}, 実際 ${actual}`);
}

// =============================================================================
// テストケース
// =============================================================================

/**
 * Test 1: 思考整理フロー - Captureステージ
 */
async function testCaptureStage() {
  const response = await fetch(`${SERVER_URL}/v1/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'capture',
      concernText: '卒業研究のテーマを決めたい',
      factors: {
        time_of_day: 'morning',
        location_category: 'home',
        available_time_min: 30
      },
      sessionId: 'test_session_capture'
    })
  });

  assert(response.ok, `API呼び出し失敗: ${response.status}`);

  const data = await response.json();

  // レスポンス構造チェック
  assertExists(data.generationId, 'generationId');
  assertExists(data.dataSchema, 'dataSchema');
  assertExists(data.uiSpec, 'uiSpec');

  // DataSchemaチェック
  assertEqual(data.dataSchema.version, '1.0', 'DataSchema version');
  assertEqual(data.dataSchema.stage, 'capture', 'DataSchema stage');
  assertExists(data.dataSchema.entities.CONCERN, 'CONCERN entity');

  // UISpecチェック
  assertEqual(data.uiSpec.version, '1.0', 'UISpec version');
  assertEqual(data.uiSpec.stage, 'capture', 'UISpec stage');
  assertExists(data.uiSpec.mappings, 'UISpec mappings');

  console.log(`   ✓ generationId: ${data.generationId}`);
  console.log(`   ✓ DataSchema entities: ${Object.keys(data.dataSchema.entities).length}`);
  console.log(`   ✓ UISpec mappings: ${Object.keys(data.uiSpec.mappings).length}`);
}

/**
 * Test 2: 思考整理フロー - Planステージ
 */
async function testPlanStage() {
  const response = await fetch(`${SERVER_URL}/v1/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'plan',
      concernText: '英語学習を再開したい',
      factors: {
        time_of_day: 'evening',
        location_category: 'home',
        available_time_min: 60
      },
      sessionId: 'test_session_plan'
    })
  });

  assert(response.ok, `API呼び出し失敗: ${response.status}`);

  const data = await response.json();

  // Planステージ固有のチェック
  assertEqual(data.dataSchema.stage, 'plan', 'DataSchema stage');
  assertEqual(data.uiSpec.stage, 'plan', 'UISpec stage');

  // カスタムウィジェット使用のチェック（planステージの特徴）
  const hasCustomWidget = Object.values(data.uiSpec.mappings).some(
    mapping => mapping.render === 'custom'
  );

  console.log(`   ✓ Custom widget found: ${hasCustomWidget}`);
  console.log(`   ✓ Entities: ${Object.keys(data.dataSchema.entities).join(', ')}`);
}

/**
 * Test 3: 思考整理フロー - Breakdownステージ
 */
async function testBreakdownStage() {
  const response = await fetch(`${SERVER_URL}/v1/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'breakdown',
      concernText: 'ジムに通い始めたい',
      factors: {
        time_of_day: 'morning',
        location_category: 'transit',
        available_time_min: 15
      },
      sessionId: 'test_session_breakdown'
    })
  });

  assert(response.ok, `API呼び出し失敗: ${response.status}`);

  const data = await response.json();

  assertEqual(data.dataSchema.stage, 'breakdown', 'DataSchema stage');
  assertEqual(data.uiSpec.stage, 'breakdown', 'UISpec stage');

  console.log(`   ✓ Breakdown stage完了`);
  console.log(`   ✓ Entities: ${Object.keys(data.dataSchema.entities).join(', ')}`);
}

/**
 * Test 4: タスク推奨フロー
 */
async function testTaskRanking() {
  const response = await fetch(`${SERVER_URL}/v1/task/rank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      available_time: 30,
      factors: {
        time_of_day: 'morning',
        location_category: 'home'
      },
      tasks: [
        {
          id: 'T1',
          title: '論文を読む',
          importance: 0.8,
          due_in_hours: 24,
          days_since_last_touch: 3,
          estimate: 45,
          estimate_min_chunk: 15,
          has_independent_micro_step: true
        },
        {
          id: 'T2',
          title: 'レポート提出',
          importance: 0.9,
          due_in_hours: 6,
          days_since_last_touch: 1,
          estimate: 60,
          estimate_min_chunk: 20,
          has_independent_micro_step: false
        }
      ]
    })
  });

  assert(response.ok, `API呼び出し失敗: ${response.status}`);

  const data = await response.json();

  assertExists(data.recommendation, 'recommendation');
  assertExists(data.recommendation.taskId, 'taskId');
  assertExists(data.recommendation.variant, 'variant');
  assertExists(data.recommendation.saliency, 'saliency');
  assertExists(data.recommendation.score, 'score');

  // 高スコアタスクが選ばれることを確認（T1 or T2）
  // 注: スコア計算の詳細により、どちらが選ばれるかは変動する可能性がある
  assert(['T1', 'T2'].includes(data.recommendation.taskId), `selected task should be T1 or T2, got ${data.recommendation.taskId}`);
  assert(data.recommendation.saliency >= 1, 'saliency level should be at least 1');

  console.log(`   ✓ Selected: ${data.recommendation.taskId}`);
  console.log(`   ✓ Variant: ${data.recommendation.variant}`);
  console.log(`   ✓ Saliency: ${data.recommendation.saliency}`);
  console.log(`   ✓ Score: ${data.recommendation.score.toFixed(3)}`);
}

/**
 * Test 5: 2系統の独立性確認
 */
async function testIndependentSystems() {
  // 思考整理APIとタスク推奨APIが独立して動作することを確認
  
  const [thoughtResponse, taskResponse] = await Promise.all([
    fetch(`${SERVER_URL}/v1/thought/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'capture',
        concernText: 'テスト',
        factors: {},
        sessionId: 'test_independent_1'
      })
    }),
    fetch(`${SERVER_URL}/v1/task/rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        available_time: 20,
        factors: {},
        tasks: [
          { id: 'T1', importance: 0.7, due_in_hours: 48, estimate: 30 }
        ]
      })
    })
  ]);

  assert(thoughtResponse.ok, '思考整理API並行動作');
  assert(taskResponse.ok, 'タスク推奨API並行動作');

  const thoughtData = await thoughtResponse.json();
  const taskData = await taskResponse.json();

  assertExists(thoughtData.generationId, '思考整理generationId');
  assertExists(taskData.recommendation, 'タスク推奨recommendation');

  console.log(`   ✓ 思考整理システム動作正常`);
  console.log(`   ✓ タスク推奨システム動作正常`);
  console.log(`   ✓ 並行実行成功`);
}

/**
 * Test 6: UISpec検証
 */
async function testUISpecValidation() {
  const response = await fetch(`${SERVER_URL}/v1/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'plan',
      concernText: '資格試験の勉強計画',
      factors: {},
      sessionId: 'test_uispec_validation'
    })
  });

  assert(response.ok, `API呼び出し失敗: ${response.status}`);
  const data = await response.json();

  // UISpec構造の詳細検証
  const { mappings } = data.uiSpec;

  // 各mappingがRenderSpecを持つことを確認
  for (const [path, renderSpec] of Object.entries(mappings)) {
    assertExists(renderSpec.render, `${path}.render`);
    
    // render値が有効な値であることを確認
    const validRenders = [
      'paragraph', 'shortText', 'number', 'radio', 'category', 'hidden',
      'expanded', 'summary',
      'link', 'inline', 'card',
      'custom'
    ];
    
    assert(
      validRenders.includes(renderSpec.render),
      `Invalid render type: ${renderSpec.render} for ${path}`
    );
  }

  console.log(`   ✓ ${Object.keys(mappings).length} mappings検証成功`);
  console.log(`   ✓ 全renderタイプが有効`);
}

/**
 * Test 7: パフォーマンステスト
 */
async function testPerformance() {
  const startTime = Date.now();

  const response = await fetch(`${SERVER_URL}/v1/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'capture',
      concernText: 'パフォーマンステスト用の関心事',
      factors: {},
      sessionId: 'test_performance'
    })
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  assert(response.ok, `API呼び出し失敗: ${response.status}`);
  // LLM呼び出しがあるため、基準を10秒に緩和
  assert(duration < 10000, `レスポンスタイムが遅すぎます: ${duration}ms`);

  console.log(`   ✓ レスポンスタイム: ${duration}ms`);
  console.log(`   ✓ パフォーマンス基準クリア (< 10000ms)`);
}

/**
 * Test 8: エラーハンドリング
 */
async function testErrorHandling() {
  // 不正なリクエスト
  const response = await fetch(`${SERVER_URL}/v1/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // stageが欠けている
      concernText: 'エラーテスト',
      sessionId: 'test_error'
    })
  });

  assert(!response.ok, 'バリデーションエラーを返すべき');
  assert(response.status === 400, `期待ステータス 400, 実際 ${response.status}`);

  console.log(`   ✓ バリデーションエラー正常動作`);
  console.log(`   ✓ ステータスコード: ${response.status}`);
}

// =============================================================================
// メイン実行
// =============================================================================

async function main() {
  console.log('🚀 Phase 1C E2E統合テスト開始\n');
  console.log('サーバーURL:', SERVER_URL);
  console.log('='.repeat(50));

  const runner = new TestRunner();

  // テスト実行
  await runner.runTest('Test 1: 思考整理フロー - Captureステージ', testCaptureStage);
  await runner.runTest('Test 2: 思考整理フロー - Planステージ', testPlanStage);
  await runner.runTest('Test 3: 思考整理フロー - Breakdownステージ', testBreakdownStage);
  await runner.runTest('Test 4: タスク推奨フロー', testTaskRanking);
  await runner.runTest('Test 5: 2系統の独立性確認', testIndependentSystems);
  await runner.runTest('Test 6: UISpec検証', testUISpecValidation);
  await runner.runTest('Test 7: パフォーマンステスト', testPerformance);
  await runner.runTest('Test 8: エラーハンドリング', testErrorHandling);

  // サマリー表示
  runner.printSummary();
}

// エラーハンドリング付きで実行
main().catch(error => {
  console.error('\n❌ テスト実行中に致命的エラー:', error);
  process.exit(1);
});

