#!/usr/bin/env node
/**
 * Day 10 統合テストスクリプト
 * 「頭の棚卸しノート」アプリの全機能テスト
 */

import { setTimeout } from 'node:timers/promises';

const API_BASE = 'http://localhost:3000';
const CLIENT_BASE = 'http://localhost:5173';

class IntegrationTester {
  constructor() {
    this.testResults = [];
  }

  async test(name, testFn) {
    process.stdout.write(`📋 ${name}... `);
    try {
      await testFn();
      process.stdout.write('✅ 成功\n');
      this.testResults.push({ name, status: 'success' });
    } catch (error) {
      process.stdout.write(`❌ 失敗: ${error.message}\n`);
      this.testResults.push({ name, status: 'error', error: error.message });
    }
  }

  async runAllTests() {
    console.log('🚀 Day 10 統合テスト開始');
    console.log('=' .repeat(50));

    // 1. API基本機能テスト
    console.log('\n📡 API基本機能テスト');
    await this.test('サーバーヘルスチェック', async () => {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.status !== 'ok') throw new Error('サーバーステータスが正常ではありません');
      if (data.database?.status !== 'healthy') throw new Error('データベースが正常ではありません');
    });

    await this.test('設定配布API', async () => {
      const response = await fetch(`${API_BASE}/v1/config`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.configVersion) throw new Error('設定バージョンが取得できません');
      if (!data.experimentAssignment) throw new Error('実験条件が割り当てられていません');
      if (!data.weights) throw new Error('重み設定が取得できません');
    });

    await this.test('UI生成API（基本テスト）', async () => {
      const requestBody = {
        sessionId: 'test-session-' + Date.now(),
        userExplicitInput: {
          concernText: 'テスト用の関心事です',
          concernLevel: 'medium',
          urgency: 'medium'
        },
        factors: {
          time_of_day: 'morning',
          day_of_week: 1,
          available_time_min: 30
        },
        requestTimestamp: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE}/v1/ui/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.uiDsl) throw new Error('UI DSLが生成されていません');
      if (!data.generationId) throw new Error('生成IDが取得できません');
    });

    await this.test('イベントログAPI', async () => {
      const sessionId = 'test-session-' + Date.now();
      const anonymousUserId = 'test-user-' + Math.random().toString(36).substr(2, 9);
      
      const requestBody = {
        events: [
          {
            eventId: 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            sessionId: sessionId,
            anonymousUserId: anonymousUserId,
            eventType: 'ui_shown', // API仕様の有効なイベントタイプを使用
            timestamp: new Date().toISOString(),
            eventData: { screen: 'home', action: 'load' }
          }
        ]
      };

      const response = await fetch(`${API_BASE}/v1/events/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // recordedEventsが0より大きいか、エラーが空であることを確認
      if (data.recordedEvents === 0 && data.errors && data.errors.length > 0) {
        throw new Error(`イベント処理エラー: ${data.errors.join(', ')}`);
      }
    });

    // 2. フロントエンド基本確認
    console.log('\n💻 フロントエンド基本確認');
    await this.test('ホーム画面アクセス', async () => {
      const response = await fetch(`${CLIENT_BASE}/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      // ReactアプリのHTMLの基本構造を確認（実際のコンテンツは動的に生成される）
      if (!html.includes('<div id="root">')) {
        throw new Error('Reactアプリの基本構造が確認できません');
      }
      if (!html.includes('/src/main.tsx')) {
        throw new Error('Reactアプリのエントリーポイントが確認できません');
      }
    });

    await this.test('デバッグ画面アクセス（データベーステスト）', async () => {
      const response = await fetch(`${CLIENT_BASE}/dev/database`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    });

    await this.test('デバッグ画面アクセス（factorsテスト）', async () => {
      const response = await fetch(`${CLIENT_BASE}/dev/factors`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    });

    // 3. エラーハンドリングテスト
    console.log('\n🛡️ エラーハンドリング・フォールバック機能テスト');
    await this.test('存在しないAPIエンドポイント', async () => {
      const response = await fetch(`${API_BASE}/v1/nonexistent`);
      if (response.status === 200) {
        throw new Error('存在しないエンドポイントが200を返している');
      }
      // 404やそれ以外のエラーが返ることを期待
    });

    await this.test('不正なUI生成リクエスト', async () => {
      const response = await fetch(`${API_BASE}/v1/ui/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'request' })
      });
      if (response.status === 200) {
        throw new Error('不正なリクエストが200を返している');
      }
    });

    // 4. CORS設定確認
    await this.test('CORS設定確認', async () => {
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: { 'Origin': CLIENT_BASE }
      });
      
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      if (!corsHeader) {
        throw new Error('CORS設定が確認できません');
      }
    });

    // 5. レスポンス時間テスト
    console.log('\n⚡ パフォーマンステスト');
    await this.test('API応答時間（<1秒）', async () => {
      const start = Date.now();
      const response = await fetch(`${API_BASE}/health`);
      const elapsed = Date.now() - start;
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (elapsed > 1000) {
        throw new Error(`応答時間が遅すぎます: ${elapsed}ms`);
      }
    });

    // テスト結果サマリー
    this.printResults();
  }

  printResults() {
    console.log('\n' + '=' .repeat(50));
    console.log('🏆 統合テスト結果サマリー');
    console.log('=' .repeat(50));
    
    const successCount = this.testResults.filter(r => r.status === 'success').length;
    const errorCount = this.testResults.filter(r => r.status === 'error').length;
    const total = this.testResults.length;

    console.log(`総テスト数: ${total}`);
    console.log(`成功: ${successCount} ✅`);
    console.log(`失敗: ${errorCount} ❌`);
    console.log(`成功率: ${Math.round((successCount / total) * 100)}%`);

    if (errorCount > 0) {
      console.log('\n❌ 失敗したテスト:');
      this.testResults
        .filter(r => r.status === 'error')
        .forEach(r => console.log(`  • ${r.name}: ${r.error}`));
    }

    if (errorCount === 0) {
      console.log('\n🎉 すべてのテストが成功しました！');
      console.log('✅ Phase 0 Day 10 統合テスト完了');
    } else {
      console.log('\n⚠️ 一部のテストが失敗しました。修正が必要です。');
      process.exit(1);
    }
  }
}

// メイン実行
async function main() {
  try {
    console.log('⏳ サーバー準備待機（3秒）...');
    await setTimeout(3000);
    
    const tester = new IntegrationTester();
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    process.exit(1);
  }
}

// Node.jsの場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { IntegrationTester };
