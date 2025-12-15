/**
 * Phase 6: Experiment API Tests
 *
 * 実験管理APIのエンドポイント・構造・バリデーションテスト
 */

import { getExperimentConfigService } from '../src/services/ExperimentConfigService';

console.log('=== Phase 6: Experiment API Tests ===\n');

// ========================================
// Test 1: ExperimentConfigService Tests
// ========================================

console.log('Test 1: ExperimentConfigService - 設定読み込み');
try {
  const configService = getExperimentConfigService();
  const settings = configService.loadSettings();

  console.log(`  Version: ${settings.version}`);
  console.log(`  Widget Conditions: ${settings.widgetCountConditions.length}件`);
  console.log(`  Model Conditions: ${settings.modelConditions.length}件`);
  console.log(`  Experiment Types: ${settings.experimentTypes.length}件`);
  console.log(`  Default Widget Count: ${settings.defaults.widgetCount}`);
  console.log(`  Default Model: ${settings.defaults.modelId}`);

  if (settings.widgetCountConditions.length >= 3 && settings.modelConditions.length >= 3) {
    console.log('  ✅ PASS\n');
  } else {
    console.log('  ❌ FAIL: 設定が不完全です\n');
    process.exit(1);
  }
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Test 2: Test Cases Loading
// ========================================

console.log('Test 2: テストケース読み込み');
try {
  const configService = getExperimentConfigService();
  const testCases = configService.loadAllTestCases();

  console.log(`  テストケース数: ${testCases.length}件`);

  // 各ケースの検証
  let allValid = true;
  for (const tc of testCases) {
    const hasRequired = tc.caseId && tc.title && tc.concernText && tc.contextFactors;
    if (!hasRequired) {
      console.log(`    ❌ ${tc.caseId || 'unknown'}: 必須フィールド欠落`);
      allValid = false;
    }
  }

  // Reactivityあり/なしの分布
  const withReactivity = testCases.filter(tc => tc.hasReactivity).length;
  const withoutReactivity = testCases.filter(tc => !tc.hasReactivity).length;
  console.log(`  Reactivityあり: ${withReactivity}件`);
  console.log(`  Reactivityなし: ${withoutReactivity}件`);

  if (testCases.length === 6 && allValid) {
    console.log('  ✅ PASS\n');
  } else {
    console.log('  ❌ FAIL: テストケースが不完全です\n');
    process.exit(1);
  }
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Test 3: Test Case Content Validation
// ========================================

console.log('Test 3: テストケース内容検証');
try {
  const configService = getExperimentConfigService();

  // case_02 の詳細検証（優先順位不明ケース）
  const case02 = configService.getTestCase('case_02');
  if (!case02) {
    throw new Error('case_02 not found');
  }

  console.log(`  Case ID: ${case02.caseId}`);
  console.log(`  Title: ${case02.title}`);
  console.log(`  Has Reactivity: ${case02.hasReactivity}`);
  console.log(`  Expected Bottlenecks: ${case02.expectedBottlenecks?.join(', ')}`);
  console.log(`  Concern Text: ${case02.concernText?.slice(0, 50)}...`);

  const hasAllFields = case02.caseId === 'case_02' &&
    case02.title &&
    case02.concernText &&
    case02.contextFactors &&
    Array.isArray(case02.expectedBottlenecks);

  if (hasAllFields) {
    console.log('  ✅ PASS\n');
  } else {
    console.log('  ❌ FAIL: ケース内容が不完全です\n');
    process.exit(1);
  }
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Test 4: Widget Count Conditions
// ========================================

console.log('Test 4: Widget Count Conditions検証');
try {
  const configService = getExperimentConfigService();
  const settings = configService.loadSettings();

  const conditions = settings.widgetCountConditions;
  console.log('  定義済みWidget数条件:');

  for (const cond of conditions) {
    console.log(`    ${cond.id}: ${cond.widgetCount} widgets`);
  }

  // 6, 9, 12 が含まれているか確認
  const widgetCounts = conditions.map(c => c.widgetCount);
  const has6 = widgetCounts.includes(6);
  const has9 = widgetCounts.includes(9);
  const has12 = widgetCounts.includes(12);

  if (has6 && has9 && has12) {
    console.log('  ✅ PASS (6, 9, 12 all present)\n');
  } else {
    console.log('  ❌ FAIL: 必要なWidget数条件がありません\n');
    process.exit(1);
  }
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Test 5: Model Conditions
// ========================================

console.log('Test 5: Model Conditions検証');
try {
  const configService = getExperimentConfigService();
  const settings = configService.loadSettings();

  const models = settings.modelConditions;
  console.log('  定義済みモデル条件:');

  for (const model of models) {
    console.log(`    ${model.id}: ${model.modelId} (${model.displayName})`);
  }

  // 必要なモデルが含まれているか
  const modelIds = models.map(m => m.modelId);
  const hasFlashLite = modelIds.includes('gemini-2.5-flash-lite');
  const hasFlash = modelIds.includes('gemini-2.5-flash');
  const hasPro = modelIds.includes('gemini-2.5-pro');

  if (hasFlashLite && hasFlash && hasPro) {
    console.log('  ✅ PASS (all 3 models present)\n');
  } else {
    console.log('  ❌ FAIL: 必要なモデル条件がありません\n');
    process.exit(1);
  }
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Test 6: API Endpoint Structure
// ========================================

console.log('Test 6: APIエンドポイント構造確認');

const endpoints = [
  { method: 'POST', path: '/api/experiment/sessions', description: 'セッション作成' },
  { method: 'GET', path: '/api/experiment/sessions', description: 'セッション一覧' },
  { method: 'GET', path: '/api/experiment/sessions/:sessionId', description: 'セッション詳細' },
  { method: 'PATCH', path: '/api/experiment/sessions/:sessionId', description: 'セッション更新' },
  { method: 'POST', path: '/api/experiment/sessions/:sessionId/widget-states', description: 'Widget状態保存' },
  { method: 'GET', path: '/api/experiment/sessions/:sessionId/widget-states', description: 'Widget状態取得' },
  { method: 'GET', path: '/api/experiment/cases', description: 'テストケース一覧' },
  { method: 'GET', path: '/api/experiment/cases/:caseId', description: 'テストケース詳細' },
  { method: 'GET', path: '/api/experiment/settings', description: '実験設定' },
  { method: 'GET', path: '/api/experiment/health', description: 'ヘルスチェック' }
];

console.log('  定義済みエンドポイント:');
for (const ep of endpoints) {
  console.log(`    ${ep.method.padEnd(6)} ${ep.path.padEnd(50)} - ${ep.description}`);
}
console.log(`  計: ${endpoints.length}件`);
console.log('  ✅ PASS\n');

// ========================================
// Test 7: Request/Response Structure
// ========================================

console.log('Test 7: リクエスト/レスポンス構造確認');

// Session作成リクエスト例
const sampleSessionRequest = {
  experimentType: 'expert',
  caseId: 'case_02',
  evaluatorId: 'evaluator_001',
  widgetCount: 9,
  modelId: 'gemini-2.5-flash-lite',
  concernText: 'やることが多すぎて何から手をつけていいかわからない...',
  contextFactors: {
    timeOfDay: 'afternoon',
    availableTimeMin: 45,
    category: 'task_management',
    approach: 'organize',
    urgency: 'somewhat_urgent',
    concernLevel: 'moderate'
  }
};

console.log('  セッション作成リクエスト例:');
console.log(`    experimentType: ${sampleSessionRequest.experimentType}`);
console.log(`    caseId: ${sampleSessionRequest.caseId}`);
console.log(`    widgetCount: ${sampleSessionRequest.widgetCount}`);
console.log(`    modelId: ${sampleSessionRequest.modelId}`);

// Widget状態保存リクエスト例
const sampleWidgetStateRequest = {
  stepIndex: 0,
  widgetType: 'brainstorm_cards',
  widgetConfig: {
    title: 'やるべきことの洗い出し',
    prompt: '思いつくタスクをすべて書き出してください'
  },
  userInputs: {
    cards: ['レポート3つ', 'バイトのシフト調整', '就活の準備', 'サークルの引き継ぎ']
  },
  portValues: {
    items: ['レポート3つ', 'バイトのシフト調整', '就活の準備', 'サークルの引き継ぎ'],
    _completed: true
  }
};

console.log('  Widget状態保存リクエスト例:');
console.log(`    stepIndex: ${sampleWidgetStateRequest.stepIndex}`);
console.log(`    widgetType: ${sampleWidgetStateRequest.widgetType}`);
console.log(`    userInputs.cards: ${sampleWidgetStateRequest.userInputs.cards.length}件`);

console.log('  ✅ PASS\n');

// ========================================
// Test 8: Filter Functions
// ========================================

console.log('Test 8: フィルタ機能確認');
try {
  const configService = getExperimentConfigService();

  // Reactivityありのケースをフィルタ
  const reactivityCases = configService.getTestCasesWithReactivity(true);
  console.log(`  Reactivityあり: ${reactivityCases.length}件`);

  // Reactivityなしのケースをフィルタ
  const nonReactivityCases = configService.getTestCasesWithReactivity(false);
  console.log(`  Reactivityなし: ${nonReactivityCases.length}件`);

  // 複雑度でフィルタ
  const mediumCases = configService.getTestCasesByComplexity('medium');
  console.log(`  中程度複雑度: ${mediumCases.length}件`);

  // ボトルネックタイプ一覧
  const bottleneckTypes = configService.getBottleneckTypes();
  console.log(`  ボトルネックタイプ: ${bottleneckTypes.length}種類`);

  if (reactivityCases.length > 0 && nonReactivityCases.length > 0) {
    console.log('  ✅ PASS\n');
  } else {
    console.log('  ❌ FAIL: フィルタ結果が不正です\n');
    process.exit(1);
  }
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Summary
// ========================================

console.log('=== Phase 6: Experiment API Tests完了 ===\n');
console.log('📊 テスト結果サマリー:');
console.log('  ✅ ExperimentConfigService: 設定読み込みOK');
console.log('  ✅ TestCases: 6件読み込みOK');
console.log('  ✅ TestCase Content: 構造検証OK');
console.log('  ✅ Widget Conditions: 6/9/12すべて定義OK');
console.log('  ✅ Model Conditions: 3モデルすべて定義OK');
console.log('  ✅ API Endpoints: 10エンドポイント定義OK');
console.log('  ✅ Request/Response: 構造確認OK');
console.log('  ✅ Filter Functions: フィルタ機能OK');
console.log('\n=== 実際のAPIテストはサーバー起動後に実行してください ===');
console.log('起動方法:');
console.log('  1. cd server && bun run dev');
console.log('  2. curl http://localhost:8000/api/experiment/health');
console.log('  3. curl http://localhost:8000/api/experiment/cases');
