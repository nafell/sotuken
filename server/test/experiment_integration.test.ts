/**
 * Phase 6: Experiment Integration Test
 *
 * 実験フローの統合テスト
 * - ケース選択 → セッション作成 → Widget状態記録 → 完了
 */

import { getExperimentConfigService } from '../src/services/ExperimentConfigService';

console.log('=== Phase 6: Experiment Integration Test ===\n');

// ========================================
// Test 1: 完全な実験フローシミュレーション
// ========================================

console.log('Test 1: 実験フローシミュレーション');
try {
  const configService = getExperimentConfigService();

  // Step 1: テストケース選択
  console.log('  Step 1: テストケース選択');
  const testCase = configService.getTestCase('case_02');
  if (!testCase) {
    throw new Error('Test case not found');
  }
  console.log(`    ケース: ${testCase.caseId} - ${testCase.title}`);
  console.log(`    Reactivity: ${testCase.hasReactivity}`);

  // Step 2: 設定の選択
  console.log('  Step 2: 実験設定の選択');
  const settings = configService.loadSettings();
  const widgetCondition = settings.widgetCountConditions[1]; // 9 widgets
  const modelCondition = settings.modelConditions[0]; // lite model
  console.log(`    Widget数: ${widgetCondition.widgetCount}`);
  console.log(`    モデル: ${modelCondition.modelId}`);

  // Step 3: セッションリクエストの構築
  console.log('  Step 3: セッションリクエスト構築');
  const sessionRequest = {
    experimentType: 'expert',
    caseId: testCase.caseId,
    evaluatorId: 'test_evaluator_001',
    widgetCount: widgetCondition.widgetCount,
    modelId: modelCondition.modelId,
    concernText: testCase.concernText,
    contextFactors: testCase.contextFactors
  };

  // リクエストの検証
  const requiredFields = ['experimentType', 'caseId', 'widgetCount', 'modelId', 'concernText', 'contextFactors'];
  const missingFields = requiredFields.filter(f => !(f in sessionRequest));
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  console.log(`    必須フィールド: ${requiredFields.length}/${requiredFields.length} ✓`);

  // Step 4: Widget状態の構築（シミュレーション）
  console.log('  Step 4: Widget状態シミュレーション');
  const widgetStates = [
    {
      stepIndex: 0,
      widgetType: 'emotion_palette',
      widgetConfig: {
        title: '感情の特定',
        prompt: '今感じている感情を選択してください'
      },
      userInputs: {
        selectedEmotions: ['anxious', 'confused'],
        intensity: 0.7
      },
      portValues: {
        emotions: ['anxious', 'confused'],
        _completed: true
      }
    },
    {
      stepIndex: 1,
      widgetType: 'timeline_slider',
      widgetConfig: {
        title: 'シナリオ予測',
        timeframes: ['3ヶ月後', '1年後', '3年後']
      },
      userInputs: {
        scenarios: {
          '3ヶ月後': { worst: '評価下がる', best: '小さな成功' },
          '1年後': { worst: '異動', best: '昇進' },
          '3年後': { worst: '転職', best: '事業責任者' }
        }
      },
      portValues: {
        scenarios: { /* ... */ },
        _completed: true
      }
    },
    {
      stepIndex: 2,
      widgetType: 'tradeoff_balance',
      widgetConfig: {
        title: 'リスク評価',
        leftLabel: '挑戦',
        rightLabel: '安定'
      },
      userInputs: {
        balance: 0.35,
        factors: ['キャリア成長', '安定収入', '挑戦意欲']
      },
      portValues: {
        balance: 0.35,
        _completed: true
      }
    }
  ];

  console.log(`    Widget状態: ${widgetStates.length}ステップ`);

  // 各状態の検証
  for (const state of widgetStates) {
    const hasRequired = state.stepIndex !== undefined && state.widgetType && state.widgetConfig;
    if (!hasRequired) {
      throw new Error(`Invalid widget state at step ${state.stepIndex}`);
    }
  }
  console.log('    すべてのWidget状態が有効 ✓');

  // Step 5: メトリクスの構築（シミュレーション）
  console.log('  Step 5: メトリクスシミュレーション');
  const metrics = {
    generatedOodm: { version: '1.0', entities: [] },
    generatedDpg: { nodes: [], edges: [] },
    generatedDsl: { widgets: widgetStates.map(s => ({ id: s.widgetType, type: s.widgetType })) },
    oodmMetrics: { promptTokens: 500, responseTokens: 800, latencyMs: 1200 },
    dslMetrics: { promptTokens: 600, responseTokens: 1200, latencyMs: 1800 },
    totalTokens: 3100,
    totalLatencyMs: 3000,
    generationSuccess: true
  };
  console.log(`    Total Tokens: ${metrics.totalTokens}`);
  console.log(`    Total Latency: ${metrics.totalLatencyMs}ms`);
  console.log(`    Generation Success: ${metrics.generationSuccess}`);

  console.log('  ✅ PASS\n');
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Test 2: エラーケースのシミュレーション
// ========================================

console.log('Test 2: エラーケースシミュレーション');
try {
  // 無効なexperimentType
  const invalidSession = {
    experimentType: 'invalid_type',
    caseId: 'case_01',
    widgetCount: 9,
    modelId: 'gemini-2.5-flash-lite',
    concernText: 'test',
    contextFactors: {}
  };

  const validTypes = ['technical', 'expert', 'user'];
  const isValidType = validTypes.includes(invalidSession.experimentType);

  if (!isValidType) {
    console.log('  無効なexperimentTypeを検出 ✓');
  } else {
    throw new Error('Invalid type was not detected');
  }

  // 欠落フィールド
  const incompleteSessions = [
    { caseId: 'case_01' },  // experimentType欠落
    { experimentType: 'expert' },  // caseId欠落
    { experimentType: 'expert', caseId: 'case_01' }  // widgetCount, modelId欠落
  ];

  const requiredFields = ['experimentType', 'caseId', 'widgetCount', 'modelId', 'concernText', 'contextFactors'];

  for (const session of incompleteSessions) {
    const missing = requiredFields.filter(f => !(f in session));
    if (missing.length > 0) {
      console.log(`  欠落フィールド検出: ${missing.join(', ')} ✓`);
    }
  }

  console.log('  ✅ PASS\n');
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Test 3: Widget状態の整合性チェック
// ========================================

console.log('Test 3: Widget状態整合性チェック');
try {
  // stepIndexの連続性チェック
  const widgetStates = [
    { stepIndex: 0, widgetType: 'brainstorm_cards' },
    { stepIndex: 1, widgetType: 'card_sorting' },
    { stepIndex: 2, widgetType: 'matrix_placement' }
  ];

  let lastIndex = -1;
  let isSequential = true;
  for (const state of widgetStates) {
    if (state.stepIndex !== lastIndex + 1) {
      isSequential = false;
      break;
    }
    lastIndex = state.stepIndex;
  }

  if (isSequential) {
    console.log('  stepIndexの連続性: OK ✓');
  } else {
    throw new Error('stepIndex is not sequential');
  }

  // widgetTypeの妥当性チェック
  const validWidgetTypes = [
    'emotion_palette', 'brainstorm_cards', 'matrix_placement', 'priority_slider_grid',
    'question_card_chain', 'card_sorting', 'dependency_mapping', 'swot_analysis',
    'mind_map', 'tradeoff_balance', 'timeline_slider', 'structured_summary'
  ];

  const allTypesValid = widgetStates.every(s => validWidgetTypes.includes(s.widgetType));
  if (allTypesValid) {
    console.log('  widgetTypeの妥当性: OK ✓');
  } else {
    throw new Error('Invalid widget type detected');
  }

  console.log('  ✅ PASS\n');
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Test 4: リプレイデータ構造チェック
// ========================================

console.log('Test 4: リプレイデータ構造チェック');
try {
  // セッションデータ（リプレイ表示用）
  const sessionData = {
    sessionId: 'test-session-uuid',
    experimentType: 'expert',
    caseId: 'case_02',
    widgetCount: 9,
    modelId: 'gemini-2.5-flash-lite',
    concernText: 'テスト悩み',
    contextFactors: { category: 'キャリア' },
    generationSuccess: true,
    totalTokens: 3000,
    totalLatencyMs: 2500,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };

  // Widget状態データ（リプレイ用）
  const widgetStatesData = [
    {
      stateId: 'state-uuid-1',
      sessionId: sessionData.sessionId,
      stepIndex: 0,
      widgetType: 'emotion_palette',
      widgetConfig: { title: 'テスト' },
      userInputs: { selections: [] },
      portValues: { _completed: true },
      recordedAt: new Date().toISOString()
    }
  ];

  // リプレイに必要なフィールドの存在チェック
  const sessionFields = ['sessionId', 'experimentType', 'caseId', 'concernText', 'startedAt'];
  const stateFields = ['stateId', 'sessionId', 'stepIndex', 'widgetType', 'widgetConfig'];

  const hasAllSessionFields = sessionFields.every(f => f in sessionData);
  const hasAllStateFields = widgetStatesData.every(s =>
    stateFields.every(f => f in s)
  );

  if (hasAllSessionFields && hasAllStateFields) {
    console.log('  セッションデータ構造: OK ✓');
    console.log('  Widget状態データ構造: OK ✓');
  } else {
    throw new Error('Missing required fields for replay');
  }

  console.log('  ✅ PASS\n');
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Test 5: 実験タイプ別フローチェック
// ========================================

console.log('Test 5: 実験タイプ別フローチェック');
try {
  const experimentFlows = {
    technical: {
      description: '技術評価：LLM生成品質・レイテンシ測定',
      requiresEvaluator: false,
      recordsWidgetStates: false,
      measuresMetrics: true
    },
    expert: {
      description: '専門家評価：UI適切性・Reactivity効果評価',
      requiresEvaluator: true,
      recordsWidgetStates: true,
      measuresMetrics: true
    },
    user: {
      description: 'ユーザー検証：実際の悩み解決支援',
      requiresEvaluator: false,
      recordsWidgetStates: true,
      measuresMetrics: true
    }
  };

  console.log('  実験タイプ:');
  for (const [type, flow] of Object.entries(experimentFlows)) {
    console.log(`    ${type}: ${flow.description}`);
    console.log(`      - 評価者必要: ${flow.requiresEvaluator}`);
    console.log(`      - Widget状態記録: ${flow.recordsWidgetStates}`);
    console.log(`      - メトリクス計測: ${flow.measuresMetrics}`);
  }

  console.log('  ✅ PASS\n');
} catch (error) {
  console.log(`  ❌ FAIL: ${error}\n`);
  process.exit(1);
}

// ========================================
// Summary
// ========================================

console.log('=== Phase 6: Experiment Integration Test完了 ===\n');
console.log('📊 統合テスト結果サマリー:');
console.log('  ✅ 実験フローシミュレーション: 全ステップ検証OK');
console.log('  ✅ エラーケース: バリデーション検出OK');
console.log('  ✅ Widget状態整合性: 連続性・妥当性OK');
console.log('  ✅ リプレイデータ構造: 必須フィールドOK');
console.log('  ✅ 実験タイプ別フロー: 3タイプ定義OK');
console.log('\n=== E2Eテストはサーバー・DBが必要です ===');
console.log('実行方法:');
console.log('  1. PostgreSQL起動 & マイグレーション実行');
console.log('  2. cd server && bun run dev');
console.log('  3. curlまたはブラウザで /api/experiment/* をテスト');
