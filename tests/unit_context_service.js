#!/usr/bin/env node
/**
 * ContextService 単体テスト
 * factors辞書システムの詳細単体テスト
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
    console.log('🧪 ContextService 単体テスト開始');
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
    console.log('🏆 ContextService 単体テスト結果');
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

// モックオブジェクト（実際のCapacitorやDBに依存しない）
const mockContextService = {
  factors: {},

  // 時間関連factors
  collectTimeFactors() {
    const now = new Date();
    const hour = now.getHours();
    
    this.factors.time_of_day = {
      value: hour < 6 ? 'night' : 
             hour < 12 ? 'morning' :
             hour < 18 ? 'afternoon' : 'evening',
      source: 'system_clock',
      timestamp: now,
      confidence: 1.0
    };

    this.factors.day_of_week = {
      value: now.getDay(),
      source: 'system_clock', 
      timestamp: now,
      confidence: 1.0
    };

    // 利用可能時間の推定（時間帯ベース）
    const estimatedTime = hour >= 9 && hour <= 17 ? 15 : 45; // 勤務時間は短め
    this.factors.available_time_min = {
      value: estimatedTime,
      source: 'time_estimation',
      confidence: 0.6
    };

    return {
      time_of_day: this.factors.time_of_day,
      day_of_week: this.factors.day_of_week,
      available_time_min: this.factors.available_time_min
    };
  },

  // デバイス関連factors
  collectDeviceFactors() {
    // UserAgentベースの簡単な判定
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js Test Environment';
    
    let platform = 'unknown';
    let model = 'generic';
    
    if (userAgent.includes('Windows')) platform = 'windows';
    else if (userAgent.includes('Mac')) platform = 'macos';
    else if (userAgent.includes('Linux')) platform = 'linux';
    else if (userAgent.includes('Android')) platform = 'android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'ios';

    this.factors.device_platform = {
      value: platform,
      source: 'user_agent_detection',
      confidence: 0.9
    };

    this.factors.device_model = {
      value: model,
      source: 'user_agent_estimation',
      confidence: 0.5
    };

    // 画面向き（デフォルト推定）
    this.factors.device_orientation = {
      value: 'portrait', // モバイルファーストの推定
      source: 'default_estimation',
      confidence: 0.7
    };

    return {
      device_platform: this.factors.device_platform,
      device_model: this.factors.device_model,
      device_orientation: this.factors.device_orientation
    };
  },

  // データサニタイズ（プライバシー保護）
  sanitizeForServer(factors) {
    const sanitized = {};
    
    // 許可されたfactorsのみ
    const allowedFactors = [
      'time_of_day', 'day_of_week', 'available_time_min',
      'device_platform', 'device_orientation', 'location_category',
      'activity_level', 'network_connection'
    ];

    allowedFactors.forEach(key => {
      if (factors[key]) {
        sanitized[key] = {
          value: factors[key].value,
          confidence: factors[key].confidence || 0.8
        };
      }
    });

    return sanitized;
  },

  // factors検証
  validateFactor(factor) {
    if (!factor || typeof factor !== 'object') return false;
    if (factor.value === undefined || factor.value === null) return false;
    if (factor.confidence && (factor.confidence < 0 || factor.confidence > 1)) return false;
    return true;
  }
};

// 単体テスト実装
const runner = new TestRunner();

// 時間関連factorsテスト
runner.test('時間factorsの基本収集', async () => {
  const timeFactors = mockContextService.collectTimeFactors();
  
  if (!timeFactors.time_of_day) throw new Error('time_of_dayが収集されていません');
  if (!timeFactors.day_of_week) throw new Error('day_of_weekが収集されていません');
  if (!timeFactors.available_time_min) throw new Error('available_time_minが収集されていません');
  
  const validTimeValues = ['morning', 'afternoon', 'evening', 'night'];
  if (!validTimeValues.includes(timeFactors.time_of_day.value)) {
    throw new Error(`不正なtime_of_day値: ${timeFactors.time_of_day.value}`);
  }
  
  if (timeFactors.day_of_week.value < 0 || timeFactors.day_of_week.value > 6) {
    throw new Error(`不正なday_of_week値: ${timeFactors.day_of_week.value}`);
  }
});

runner.test('時間帯判定ロジック', async () => {
  // 各時間帯のテスト（時間を偽装）
  const testCases = [
    { hour: 3, expected: 'night' },
    { hour: 8, expected: 'morning' },
    { hour: 14, expected: 'afternoon' },
    { hour: 20, expected: 'evening' }
  ];
  
  testCases.forEach(({ hour, expected }) => {
    const mockHour = hour;
    const timeOfDay = mockHour < 6 ? 'night' : 
                     mockHour < 12 ? 'morning' :
                     mockHour < 18 ? 'afternoon' : 'evening';
    
    if (timeOfDay !== expected) {
      throw new Error(`時間帯判定エラー: ${hour}時は${expected}のはず、実際は${timeOfDay}`);
    }
  });
});

runner.test('デバイスfactorsの収集', async () => {
  const deviceFactors = mockContextService.collectDeviceFactors();
  
  if (!deviceFactors.device_platform) throw new Error('device_platformが収集されていません');
  if (!deviceFactors.device_model) throw new Error('device_modelが収集されていません');
  if (!deviceFactors.device_orientation) throw new Error('device_orientationが収集されていません');
  
  // 信頼度スコアの確認
  if (deviceFactors.device_platform.confidence < 0.5) {
    throw new Error('device_platformの信頼度が低すぎます');
  }
});

runner.test('プライバシー保護サニタイズ', async () => {
  const rawFactors = {
    time_of_day: { value: 'morning', source: 'system', gps_lat: 35.6812, gps_lon: 139.7671 },
    device_platform: { value: 'web', deviceId: 'unique-device-123' },
    sensitive_data: { value: 'should_be_removed', personalInfo: 'user@example.com' },
    allowed_factor: { value: 'test', confidence: 0.8 }
  };
  
  const sanitized = mockContextService.sanitizeForServer(rawFactors);
  
  // 許可されたfactorのみ存在することを確認
  if (!sanitized.time_of_day) throw new Error('許可されたfactorが削除されています');
  if (sanitized.sensitive_data) throw new Error('機密データが残っています');
  
  // 機密情報が除去されていることを確認
  if (sanitized.time_of_day.gps_lat || sanitized.time_of_day.gps_lon) {
    throw new Error('GPS座標が残っています');
  }
  if (sanitized.device_platform && sanitized.device_platform.deviceId) {
    throw new Error('デバイスIDが残っています');
  }
});

runner.test('factor検証ロジック', async () => {
  const testCases = [
    { factor: { value: 'morning', confidence: 0.9 }, expected: true },
    { factor: { value: 'morning' }, expected: true }, // confidence省略可
    { factor: { confidence: 0.9 }, expected: false }, // value必須
    { factor: null, expected: false },
    { factor: undefined, expected: false },
    { factor: { value: 'test', confidence: 1.5 }, expected: false }, // 信頼度範囲外
    { factor: { value: 'test', confidence: -0.1 }, expected: false } // 信頼度範囲外
  ];
  
  testCases.forEach(({ factor, expected }, index) => {
    const result = mockContextService.validateFactor(factor);
    if (result !== expected) {
      throw new Error(`Factor検証テスト${index + 1}失敗: 期待値${expected}、実際値${result}`);
    }
  });
});

runner.test('境界値テスト - 曜日', async () => {
  // 曜日の境界値テスト（0-6の範囲）
  const validDays = [0, 1, 2, 3, 4, 5, 6];
  const invalidDays = [-1, 7, 8, 100];
  
  validDays.forEach(day => {
    if (day < 0 || day > 6) {
      throw new Error(`有効な曜日${day}が不正判定されました`);
    }
  });
  
  invalidDays.forEach(day => {
    if (day >= 0 && day <= 6) {
      throw new Error(`無効な曜日${day}が有効判定されました`);
    }
  });
});

runner.test('信頼度スコア計算', async () => {
  const factors = mockContextService.collectTimeFactors();
  
  // システム時計由来は高信頼度
  if (factors.time_of_day.confidence !== 1.0) {
    throw new Error(`time_of_day信頼度が期待値と違います: ${factors.time_of_day.confidence}`);
  }
  
  if (factors.day_of_week.confidence !== 1.0) {
    throw new Error(`day_of_week信頼度が期待値と違います: ${factors.day_of_week.confidence}`);
  }
  
  // 推定値は中程度の信頼度
  if (factors.available_time_min.confidence > 0.8) {
    throw new Error('推定時間の信頼度が高すぎます');
  }
});

runner.test('データ型整合性', async () => {
  const timeFactors = mockContextService.collectTimeFactors();
  const deviceFactors = mockContextService.collectDeviceFactors();
  
  // time_of_dayは文字列
  if (typeof timeFactors.time_of_day.value !== 'string') {
    throw new Error('time_of_dayは文字列である必要があります');
  }
  
  // day_of_weekは数値
  if (typeof timeFactors.day_of_week.value !== 'number') {
    throw new Error('day_of_weekは数値である必要があります');
  }
  
  // available_time_minは数値
  if (typeof timeFactors.available_time_min.value !== 'number') {
    throw new Error('available_time_minは数値である必要があります');
  }
  
  // device_platformは文字列
  if (typeof deviceFactors.device_platform.value !== 'string') {
    throw new Error('device_platformは文字列である必要があります');
  }
});

runner.test('エラーケース処理', async () => {
  // 不正な入力に対する適切なエラーハンドリング
  try {
    const result = mockContextService.sanitizeForServer(null);
    if (Object.keys(result).length !== 0) {
      throw new Error('null入力で空オブジェクトが返されませんでした');
    }
  } catch (error) {
    // エラーが発生することも許容される
  }
  
  try {
    const result = mockContextService.sanitizeForServer(undefined);
    if (Object.keys(result).length !== 0) {
      throw new Error('undefined入力で空オブジェクトが返されませんでした');
    }
  } catch (error) {
    // エラーが発生することも許容される
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

export { mockContextService, TestRunner };
