#!/usr/bin/env node
/**
 * 統合テストスイート
 * 全単体テスト・詳細テスト・セキュリティテスト・パフォーマンステストの実行
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

class TestSuiteRunner {
  constructor() {
    this.testSuites = [
      {
        name: 'ContextService単体テスト',
        file: 'unit_context_service.js',
        category: 'unit',
        priority: 'high',
        timeout: 30000
      },
      {
        name: 'ApiService単体テスト',
        file: 'unit_api_service.js',
        category: 'unit',
        priority: 'high',
        timeout: 30000
      },
      {
        name: 'データベース操作単体テスト',
        file: 'unit_database_operations.js',
        category: 'unit',
        priority: 'high',
        timeout: 60000
      },
      {
        name: 'React コンポーネント単体テスト',
        file: 'unit_react_components.js',
        category: 'unit',
        priority: 'medium',
        timeout: 45000
      },
      {
        name: 'API詳細テスト',
        file: 'detailed_api_tests.js',
        category: 'detailed',
        priority: 'high',
        timeout: 120000
      },
      {
        name: 'セキュリティテスト',
        file: 'security_tests.js',
        category: 'security',
        priority: 'high',
        timeout: 180000
      },
      {
        name: 'パフォーマンステスト',
        file: 'performance_tests.js',
        category: 'performance',
        priority: 'medium',
        timeout: 300000
      }
    ];

    // レガシーテスト（DSL v1/v2時代のテスト）
    // --include-legacy フラグで有効化
    this.legacySuites = [
      {
        name: '[LEGACY] Phase 1C E2E (DSL v1)',
        file: 'legacy/dsl-versions/phase1c_e2e_test.js',
        category: 'legacy',
        priority: 'low',
        timeout: 180000
      },
      {
        name: '[LEGACY] Phase 3 E2E (DSL v2)',
        file: 'legacy/dsl-versions/phase3_e2e_test.js',
        category: 'legacy',
        priority: 'low',
        timeout: 180000
      },
      {
        name: '[LEGACY] データベース統合テスト',
        file: 'legacy/root-level/test_database.js',
        category: 'legacy',
        priority: 'low',
        timeout: 60000
      },
      {
        name: '[LEGACY] コンテキスト要因テスト',
        file: 'legacy/root-level/test_factors.js',
        category: 'legacy',
        priority: 'low',
        timeout: 60000
      },
      {
        name: '[LEGACY] PWA機能テスト',
        file: 'legacy/root-level/test_pwa.js',
        category: 'legacy',
        priority: 'low',
        timeout: 60000
      },
      {
        name: '[LEGACY] 統合テスト',
        file: 'legacy/root-level/integration_test.js',
        category: 'legacy',
        priority: 'low',
        timeout: 120000
      }
    ];

    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  async runTestSuite(testSuite) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const testProcess = spawn('node', [`${__dirname}/${testSuite.file}`], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: dirname(__dirname)
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // タイムアウト処理
      const timeout = setTimeout(() => {
        testProcess.kill('SIGTERM');
      }, testSuite.timeout);

      testProcess.on('close', (code) => {
        clearTimeout(timeout);
        const endTime = Date.now();
        const duration = endTime - startTime;

        resolve({
          name: testSuite.name,
          category: testSuite.category,
          priority: testSuite.priority,
          file: testSuite.file,
          exitCode: code,
          success: code === 0,
          duration,
          stdout,
          stderr,
          timedOut: duration >= testSuite.timeout
        });
      });

      testProcess.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          name: testSuite.name,
          category: testSuite.category,
          priority: testSuite.priority,
          file: testSuite.file,
          exitCode: -1,
          success: false,
          duration: Date.now() - startTime,
          stdout: '',
          stderr: error.message,
          error: error.message
        });
      });
    });
  }

  async runAll(options = {}) {
    this.startTime = Date.now();
    
    console.log('🚀 統合テストスイート開始');
    console.log('=' .repeat(80));
    console.log(`実行予定テスト数: ${this.testSuites.length}`);
    console.log(`実行順序: ${options.parallel ? '並行実行' : '順次実行'}`);
    console.log('');

    if (options.parallel) {
      // 並行実行
      console.log('⚡ 並行実行モード');
      const promises = this.testSuites.map(testSuite => this.runTestSuite(testSuite));
      this.results = await Promise.all(promises);
    } else {
      // 順次実行（デフォルト）
      console.log('🔄 順次実行モード');
      for (const testSuite of this.testSuites) {
        console.log(`\n📋 実行中: ${testSuite.name}`);
        const result = await this.runTestSuite(testSuite);
        this.results.push(result);
        
        if (result.success) {
          console.log(`✅ 成功 (${result.duration}ms)`);
        } else {
          console.log(`❌ 失敗 (${result.duration}ms) - 終了コード: ${result.exitCode}`);
          if (options.failFast) {
            console.log('⏹️  fail-fast オプションにより実行中止');
            break;
          }
        }
      }
    }
    
    this.endTime = Date.now();
    return this.generateReport();
  }

  generateReport() {
    const totalDuration = this.endTime - this.startTime;
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.filter(r => !r.success).length;
    const timedOutCount = this.results.filter(r => r.timedOut).length;
    
    const report = {
      summary: {
        totalTests: this.results.length,
        successCount,
        failureCount,
        timedOutCount,
        successRate: Math.round((successCount / this.results.length) * 100),
        totalDuration,
        averageDuration: Math.round(totalDuration / this.results.length)
      },
      categories: this.generateCategoryReport(),
      priorities: this.generatePriorityReport(),
      details: this.results,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateCategoryReport() {
    const categories = {};
    
    this.results.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = {
          total: 0,
          success: 0,
          failure: 0,
          totalDuration: 0
        };
      }
      
      const cat = categories[result.category];
      cat.total++;
      cat.totalDuration += result.duration;
      
      if (result.success) {
        cat.success++;
      } else {
        cat.failure++;
      }
    });

    // 成功率とパフォーマンス情報を追加
    Object.keys(categories).forEach(key => {
      const cat = categories[key];
      cat.successRate = Math.round((cat.success / cat.total) * 100);
      cat.averageDuration = Math.round(cat.totalDuration / cat.total);
    });

    return categories;
  }

  generatePriorityReport() {
    const priorities = {};
    
    this.results.forEach(result => {
      if (!priorities[result.priority]) {
        priorities[result.priority] = {
          total: 0,
          success: 0,
          failure: 0
        };
      }
      
      const pri = priorities[result.priority];
      pri.total++;
      
      if (result.success) {
        pri.success++;
      } else {
        pri.failure++;
      }
    });

    // 成功率を追加
    Object.keys(priorities).forEach(key => {
      const pri = priorities[key];
      pri.successRate = Math.round((pri.success / pri.total) * 100);
    });

    return priorities;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // 失敗したテストの分析
    const failedTests = this.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push({
        type: 'error',
        message: `${failedTests.length}件のテストが失敗しています`,
        details: failedTests.map(t => t.name),
        action: '失敗したテストの詳細を確認し、修正してください'
      });
    }
    
    // タイムアウトしたテストの分析
    const timedOutTests = this.results.filter(r => r.timedOut);
    if (timedOutTests.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${timedOutTests.length}件のテストがタイムアウトしています`,
        details: timedOutTests.map(t => t.name),
        action: 'テストの実行時間を最適化するか、タイムアウト値を調整してください'
      });
    }
    
    // 低優先度テストの成功率チェック
    const highPriorityFailed = failedTests.filter(t => t.priority === 'high');
    if (highPriorityFailed.length > 0) {
      recommendations.push({
        type: 'critical',
        message: '高優先度テストが失敗しています',
        details: highPriorityFailed.map(t => t.name),
        action: '高優先度テストの修正を最優先で行ってください'
      });
    }
    
    // パフォーマンス関連の推奨事項
    const longRunningTests = this.results.filter(r => r.duration > 60000); // 1分以上
    if (longRunningTests.length > 0) {
      recommendations.push({
        type: 'performance',
        message: '実行時間が長いテストがあります',
        details: longRunningTests.map(t => `${t.name} (${Math.round(t.duration/1000)}s)`),
        action: 'テスト効率化を検討してください'
      });
    }
    
    // 全体成功時の推奨事項
    if (failedTests.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'すべてのテストが成功しました！',
        details: ['コード品質が高く維持されています'],
        action: 'この品質レベルを継続してください'
      });
    }

    return recommendations;
  }

  printReport(report) {
    console.log('\n' + '=' .repeat(80));
    console.log('🏆 統合テストスイート 実行結果レポート');
    console.log('=' .repeat(80));
    
    // サマリー
    console.log('📊 実行サマリー:');
    console.log(`  • 総テスト数: ${report.summary.totalTests}`);
    console.log(`  • 成功: ${report.summary.successCount} ✅`);
    console.log(`  • 失敗: ${report.summary.failureCount} ❌`);
    console.log(`  • タイムアウト: ${report.summary.timedOutCount} ⏱️`);
    console.log(`  • 成功率: ${report.summary.successRate}%`);
    console.log(`  • 総実行時間: ${Math.round(report.summary.totalDuration / 1000)}秒`);
    console.log(`  • 平均実行時間: ${Math.round(report.summary.averageDuration / 1000)}秒`);
    
    // カテゴリ別結果
    console.log('\n📂 カテゴリ別結果:');
    Object.entries(report.categories).forEach(([category, data]) => {
      console.log(`  ${category}:`);
      console.log(`    • 成功率: ${data.successRate}% (${data.success}/${data.total})`);
      console.log(`    • 平均実行時間: ${Math.round(data.averageDuration / 1000)}秒`);
    });
    
    // 優先度別結果
    console.log('\n🎯 優先度別結果:');
    Object.entries(report.priorities).forEach(([priority, data]) => {
      console.log(`  ${priority}:`);
      console.log(`    • 成功率: ${data.successRate}% (${data.success}/${data.total})`);
    });
    
    // 詳細結果
    if (report.summary.failureCount > 0) {
      console.log('\n❌ 失敗したテスト詳細:');
      report.details.filter(r => !r.success).forEach(result => {
        console.log(`  • ${result.name}:`);
        console.log(`    - 実行時間: ${Math.round(result.duration / 1000)}秒`);
        console.log(`    - 終了コード: ${result.exitCode}`);
        if (result.stderr) {
          console.log(`    - エラー: ${result.stderr.split('\n')[0]}`);
        }
      });
    }
    
    // 推奨事項
    console.log('\n💡 推奨事項:');
    report.recommendations.forEach((rec, index) => {
      const icon = rec.type === 'error' ? '❌' : 
                   rec.type === 'warning' ? '⚠️' : 
                   rec.type === 'critical' ? '🚨' : 
                   rec.type === 'performance' ? '⚡' : '✅';
      
      console.log(`  ${index + 1}. ${icon} ${rec.message}`);
      console.log(`     アクション: ${rec.action}`);
    });
  }

  async saveReport(report, filename = `test-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`) {
    const reportPath = `${dirname(__dirname)}/${filename}`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 詳細レポート保存: ${filename}`);
  }
}

// CLI実行機能
async function main() {
  const args = process.argv.slice(2);
  const options = {
    parallel: args.includes('--parallel'),
    failFast: args.includes('--fail-fast'),
    saveReport: !args.includes('--no-report'),
    includeLegacy: args.includes('--include-legacy'),
    category: args.find(arg => arg.startsWith('--category='))?.split('=')[1],
    priority: args.find(arg => arg.startsWith('--priority='))?.split('=')[1]
  };

  console.log('📋 統合テストスイート設定:');
  console.log(`  • 並行実行: ${options.parallel ? 'ON' : 'OFF'}`);
  console.log(`  • 失敗時中止: ${options.failFast ? 'ON' : 'OFF'}`);
  console.log(`  • レポート保存: ${options.saveReport ? 'ON' : 'OFF'}`);
  console.log(`  • レガシーテスト: ${options.includeLegacy ? 'ON' : 'OFF'}`);
  if (options.category) console.log(`  • カテゴリ絞込: ${options.category}`);
  if (options.priority) console.log(`  • 優先度絞込: ${options.priority}`);

  const runner = new TestSuiteRunner();

  // レガシーテストの追加（--include-legacy または --category=legacy の場合）
  if (options.includeLegacy || options.category === 'legacy') {
    runner.testSuites = [...runner.testSuites, ...runner.legacySuites];
  }

  // フィルタリング
  if (options.category) {
    runner.testSuites = runner.testSuites.filter(t => t.category === options.category);
  }
  if (options.priority) {
    runner.testSuites = runner.testSuites.filter(t => t.priority === options.priority);
  }
  
  try {
    const report = await runner.runAll(options);
    runner.printReport(report);
    
    if (options.saveReport) {
      await runner.saveReport(report);
    }
    
    // 終了コード設定
    const exitCode = report.summary.failureCount > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ 統合テストスイート実行エラー:', error.message);
    process.exit(1);
  }
}

// ヘルプ表示
function showHelp() {
  console.log(`
🧪 統合テストスイート

使用方法:
  node run_all_tests.js [options]

オプション:
  --parallel         並行実行モード（高速だが、リソース消費多）
  --fail-fast        最初の失敗でテスト中止
  --no-report        詳細レポートを保存しない
  --include-legacy   レガシーテスト（DSL v1/v2時代）を含める
  --category=TYPE    指定カテゴリのみ実行（unit|detailed|security|performance|legacy）
  --priority=LEVEL   指定優先度のみ実行（high|medium|low）
  --help            このヘルプを表示

例:
  node run_all_tests.js                      # 全テスト順次実行（レガシー除外）
  node run_all_tests.js --parallel           # 全テスト並行実行
  node run_all_tests.js --category=unit      # 単体テストのみ実行
  node run_all_tests.js --priority=high      # 高優先度テストのみ実行
  node run_all_tests.js --include-legacy     # レガシーテストを含めて実行
  node run_all_tests.js --category=legacy    # レガシーテストのみ実行

レガシーテスト:
  DSL v1/v2時代のテストは tests/legacy/ に移動されています。
  これらのテストは現在のコードベースでは動作しない可能性があります。
  詳細は tests/legacy/README.md を参照してください。
  `);
}

// Node.jsの場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help')) {
    showHelp();
  } else {
    main();
  }
}

export { TestSuiteRunner };
