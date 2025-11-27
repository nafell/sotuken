/**
 * Phase 3 E2E Test - UISpec v2.0
 *
 * v2 APIとUIRendererの統合テスト
 */

const SERVER_URL = 'http://localhost:3000';

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
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
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Phase 3テスト結果`);
    console.log(`   合格: ${this.passed}`);
    console.log(`   不合格: ${this.failed}`);
    console.log('='.repeat(50));

    if (this.failed === 0) {
      console.log('🎉 全テスト合格！Phase 3完了 🎉\n');
      process.exit(0);
    } else {
      console.log('⚠️  一部のテストが失敗しました\n');
      process.exit(1);
    }
  }
}

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
 * Test 1: v2 API Health Check
 */
async function testV2HealthCheck() {
  const response = await fetch(`${SERVER_URL}/v2/thought/health`);
  assert(response.ok, `Health check failed: ${response.status}`);

  const data = await response.json();
  assertEqual(data.status, 'ok', 'status');
  assertEqual(data.version, '2.0', 'version');
  assertExists(data.features, 'features');

  console.log(`   ✓ v2 API is healthy`);
  console.log(`   ✓ Features: ${Object.keys(data.features).join(', ')}`);
}

/**
 * Test 2: Capture Stage - UISpec v2.0 Generation
 */
async function testCaptureStageV2() {
  const response = await fetch(`${SERVER_URL}/v2/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'capture',
      concernText: '卒業研究のテーマが決まらない',
      factors: {
        time_of_day: 'morning',
        location_category: 'home'
      },
      sessionId: 'test_v2_capture'
    })
  });

  assert(response.ok, `API呼び出し失敗: ${response.status}`);

  const data = await response.json();

  // レスポンス構造チェック
  assertExists(data.success, 'success');
  assertEqual(data.version, '2.0', 'version');
  assertExists(data.uiSpec, 'uiSpec');

  // UISpec v2.0構造チェック
  const { uiSpec } = data;
  assertEqual(uiSpec.version, '2.0', 'uiSpec.version');
  assertEqual(uiSpec.stage, 'capture', 'uiSpec.stage');
  assertExists(uiSpec.sections, 'sections');
  assertExists(uiSpec.actions, 'actions');

  // sectionsチェック
  assert(Array.isArray(uiSpec.sections), 'sections must be array');
  assert(uiSpec.sections.length > 0, 'sections must not be empty');

  const firstSection = uiSpec.sections[0];
  assertExists(firstSection.id, 'section.id');
  assertExists(firstSection.title, 'section.title');
  assertExists(firstSection.fields, 'section.fields');
  assert(Array.isArray(firstSection.fields), 'fields must be array');

  // fieldsチェック
  const firstField = firstSection.fields[0];
  assertExists(firstField.id, 'field.id');
  assertExists(firstField.label, 'field.label');
  assertExists(firstField.type, 'field.type');

  // フィールドタイプの検証
  const validTypes = ['text', 'number', 'select', 'list', 'slider', 'toggle', 'cards'];
  assert(validTypes.includes(firstField.type), `Invalid field type: ${firstField.type}`);

  // actionsチェック
  assert(Array.isArray(uiSpec.actions), 'actions must be array');
  assert(uiSpec.actions.length > 0, 'actions must not be empty');

  const firstAction = uiSpec.actions[0];
  assertExists(firstAction.id, 'action.id');
  assertExists(firstAction.type, 'action.type');
  assertExists(firstAction.label, 'action.label');

  console.log(`   ✓ UISpec v2.0 generated successfully`);
  console.log(`   ✓ Sections: ${uiSpec.sections.length}`);
  console.log(`   ✓ Actions: ${uiSpec.actions.length}`);
  console.log(`   ✓ Field types: ${[...new Set(uiSpec.sections.flatMap(s => s.fields.map(f => f.type)))].join(', ')}`);
}

/**
 * Test 3: Plan Stage - カスタムウィジェット（Cards）
 */
async function testPlanStageV2() {
  const response = await fetch(`${SERVER_URL}/v2/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'plan',
      concernText: '英語学習を再開したい',
      sessionId: 'test_v2_plan'
    })
  });

  assert(response.ok, `API呼び出し失敗: ${response.status}`);

  const data = await response.json();
  const { uiSpec } = data;

  assertEqual(uiSpec.stage, 'plan', 'stage');

  // cardsフィールドの存在確認
  const hasCardsField = uiSpec.sections.some(section =>
    section.fields.some(field => field.type === 'cards')
  );
  assert(hasCardsField, 'Plan stage should have cards field');

  // sliderフィールドの存在確認
  const hasSliderField = uiSpec.sections.some(section =>
    section.fields.some(field => field.type === 'slider')
  );
  assert(hasSliderField, 'Plan stage should have slider field');

  console.log(`   ✓ Plan stage UISpec generated`);
  console.log(`   ✓ Has cards field: ${hasCardsField}`);
  console.log(`   ✓ Has slider field: ${hasSliderField}`);
}

/**
 * Test 4: Breakdown Stage - List Widget
 */
async function testBreakdownStageV2() {
  const response = await fetch(`${SERVER_URL}/v2/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'breakdown',
      concernText: 'ジムに通い始めたい',
      sessionId: 'test_v2_breakdown'
    })
  });

  assert(response.ok, `API呼び出し失敗: ${response.status}`);

  const data = await response.json();
  const { uiSpec } = data;

  assertEqual(uiSpec.stage, 'breakdown', 'stage');

  // listフィールドの存在確認
  const listField = uiSpec.sections
    .flatMap(s => s.fields)
    .find(f => f.type === 'list');

  assertExists(listField, 'list field');

  // optionsがある場合はitemTemplateをチェック
  if (listField.options) {
    assertExists(listField.options.itemTemplate, 'list itemTemplate');
    console.log(`   ✓ Item template keys: ${Object.keys(listField.options.itemTemplate).join(', ')}`);
  }

  // 初期値の確認
  assert(Array.isArray(listField.value), 'list value must be array');
  assert(listField.value.length > 0, 'list should have initial items');

  console.log(`   ✓ Breakdown stage UISpec generated`);
  console.log(`   ✓ List field with ${listField.value.length} initial items`);
}

/**
 * Test 5: UISpec Validation Endpoint
 */
async function testValidationEndpoint() {
  // 正常なUISpec
  const validUISpec = {
    version: '2.0',
    stage: 'capture',
    sections: [{
      id: 'main',
      title: 'テストセクション',
      fields: [{
        id: 'test_field',
        label: 'テストフィールド',
        type: 'text'
      }]
    }],
    actions: [{
      id: 'submit',
      type: 'submit',
      label: '送信'
    }]
  };

  const response = await fetch(`${SERVER_URL}/v2/thought/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uiSpec: validUISpec })
  });

  assert(response.ok, `Validation failed: ${response.status}`);

  const data = await response.json();
  assertEqual(data.valid, true, 'valid');
  assertExists(data.uiSpec, 'validated uiSpec');

  console.log(`   ✓ Validation endpoint works`);
  console.log(`   ✓ Valid UISpec accepted`);
}

/**
 * Test 6: 日本語ラベルの確認
 */
async function testJapaneseLabels() {
  const response = await fetch(`${SERVER_URL}/v2/thought/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: 'capture',
      concernText: 'テスト',
      sessionId: 'test_japanese'
    })
  });

  const data = await response.json();
  const { uiSpec } = data;

  // すべてのラベルが日本語を含むか確認
  const hasJapanese = (text) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);

  const allLabels = [
    ...uiSpec.sections.map(s => s.title),
    ...uiSpec.sections.flatMap(s => s.fields.map(f => f.label)),
    ...uiSpec.actions.map(a => a.label)
  ];

  const japaneseCount = allLabels.filter(hasJapanese).length;
  const japaneseRatio = japaneseCount / allLabels.length;

  assert(japaneseRatio > 0.8, `日本語ラベルの割合が低い: ${(japaneseRatio * 100).toFixed(0)}%`);

  console.log(`   ✓ 日本語ラベル: ${japaneseCount}/${allLabels.length} (${(japaneseRatio * 100).toFixed(0)}%)`);
}

// =============================================================================
// テスト実行
// =============================================================================

async function main() {
  console.log('🚀 Phase 3 E2E Test - UISpec v2.0\n');

  const runner = new TestRunner();

  await runner.runTest('v2 API Health Check', testV2HealthCheck);
  await runner.runTest('Capture Stage - UISpec v2.0 Generation', testCaptureStageV2);
  await runner.runTest('Plan Stage - Cards & Slider Widgets', testPlanStageV2);
  await runner.runTest('Breakdown Stage - List Widget', testBreakdownStageV2);
  await runner.runTest('Validation Endpoint', testValidationEndpoint);
  await runner.runTest('日本語ラベルの確認', testJapaneseLabels);

  runner.printSummary();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
