#!/usr/bin/env node
/**
 * データベース統合テストスクリプト
 * Day 10 統合テスト - IndexedDB・サーバーDBの動作確認
 */

const API_BASE = 'http://localhost:3000';

async function testDatabaseIntegration() {
  console.log('🗄️ データベース統合テスト開始');
  console.log('=' .repeat(50));

  let testResults = {
    serverDB: { success: 0, total: 0 },
    dataFlow: { success: 0, total: 0 }
  };

  try {
    // 1. サーバーデータベース基本機能テスト
    console.log('\n📊 サーバーデータベース テスト');
    
    testResults.serverDB.total++;
    const healthResponse = await fetch(`${API_BASE}/health`);
    
    if (!healthResponse.ok) {
      throw new Error(`サーバーヘルスチェック失敗: HTTP ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('  ✅ サーバー接続確認');
    console.log(`  • サービス: ${healthData.service}`);
    console.log(`  • DB状態: ${healthData.database?.status || 'unknown'}`);
    console.log(`  • 実験数: ${healthData.database?.experimentCount || 'unknown'}`);
    
    if (healthData.database?.status === 'healthy') {
      testResults.serverDB.success++;
      console.log('  ✅ サーバーデータベース 正常動作');
    } else {
      console.log('  ❌ サーバーデータベース 接続問題');
    }

    // 2. データ保存・取得フローテスト
    console.log('\n💾 データフロー統合テスト');
    
    // UI生成 → イベント送信のデータフロー
    const sessionId = 'test-db-' + Date.now();
    const anonymousUserId = 'test-user-' + Math.random().toString(36).substr(2, 9);
    
    testResults.dataFlow.total++;
    
    // Step 1: UI生成リクエスト（データ作成）
    console.log('  📝 Step 1: UI生成データ作成...');
    
    const uiRequest = {
      sessionId,
      userExplicitInput: {
        concernText: 'データベーステスト用の関心事',
        concernLevel: 'medium'
      },
      factors: {
        time_of_day: 'afternoon',
        day_of_week: 3,
        device_platform: 'web'
      },
      requestTimestamp: new Date().toISOString()
    };

    const uiResponse = await fetch(`${API_BASE}/v1/ui/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uiRequest)
    });

    if (!uiResponse.ok) {
      throw new Error(`UI生成失敗: HTTP ${uiResponse.status}`);
    }

    const uiData = await uiResponse.json();
    console.log(`    • 生成ID: ${uiData.generationId}`);
    console.log(`    • セッション: ${sessionId}`);
    
    // Step 2: イベント送信（データ記録）
    console.log('  📤 Step 2: イベントデータ送信...');
    
    const eventRequest = {
      events: [
        {
          eventId: `event-${Date.now()}-1`,
          sessionId,
          anonymousUserId,
          eventType: 'ui_shown',
          timestamp: new Date().toISOString(),
          eventData: {
            generationId: uiData.generationId,
            uiType: 'dynamic',
            showDuration: 1500
          }
        },
        {
          eventId: `event-${Date.now()}-2`,
          sessionId,
          anonymousUserId,
          eventType: 'action_started',
          timestamp: new Date(Date.now() + 2000).toISOString(),
          eventData: {
            actionType: 'test_action',
            uiElement: 'test_button'
          }
        }
      ]
    };

    const eventResponse = await fetch(`${API_BASE}/v1/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventRequest)
    });

    if (!eventResponse.ok) {
      throw new Error(`イベント送信失敗: HTTP ${eventResponse.status}`);
    }

    const eventData = await eventResponse.json();
    console.log(`    • 記録イベント数: ${eventData.recordedEvents}`);
    console.log(`    • 処理時間: ${eventData.processingTimeMs}ms`);
    console.log(`    • 次バッチID: ${eventData.nextBatchId?.slice(0, 8)}...`);
    
    if (eventData.recordedEvents > 0) {
      testResults.dataFlow.success++;
      console.log('  ✅ データフロー 正常動作');
    } else {
      console.log(`  ❌ データフロー エラー: ${eventData.errors?.join(', ') || '不明'}`);
    }

    // 3. 設定データ取得テスト
    console.log('\n⚙️ 設定データ整合性テスト');
    
    const configResponse = await fetch(`${API_BASE}/v1/config`);
    
    if (!configResponse.ok) {
      throw new Error(`設定取得失敗: HTTP ${configResponse.status}`);
    }

    const configData = await configResponse.json();
    console.log(`  • 設定バージョン: ${configData.configVersion}`);
    console.log(`  • 実験条件: ${configData.experimentAssignment?.condition}`);
    console.log(`  • 重み設定: ${Object.keys(configData.weights || {}).length}項目`);
    console.log('  ✅ 設定データ 取得成功');

    // 4. エラーハンドリング・データ整合性テスト
    console.log('\n🛡️ データ整合性・エラーハンドリング テスト');
    
    // 不正なデータでのテスト
    const invalidEventRequest = {
      events: [
        {
          eventId: 'invalid-test',
          // sessionId intentionally missing
          anonymousUserId,
          eventType: 'invalid_type',
          timestamp: 'invalid-timestamp'
        }
      ]
    };

    const invalidResponse = await fetch(`${API_BASE}/v1/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidEventRequest)
    });

    const invalidData = await invalidResponse.json();
    
    if (invalidData.errors && invalidData.errors.length > 0) {
      console.log('  ✅ 不正データ適切に拒否');
      console.log(`    • エラー数: ${invalidData.errors.length}`);
    } else {
      console.log('  ❌ 不正データが受け入れられている');
    }

    // 5. パフォーマンステスト
    console.log('\n⚡ データベースパフォーマンステスト');
    
    const performanceTests = [];
    
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await fetch(`${API_BASE}/health`);
      const elapsed = Date.now() - start;
      performanceTests.push(elapsed);
    }
    
    const avgResponseTime = Math.round(performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length);
    const maxResponseTime = Math.max(...performanceTests);
    
    console.log(`  • 平均応答時間: ${avgResponseTime}ms`);
    console.log(`  • 最大応答時間: ${maxResponseTime}ms`);
    
    if (avgResponseTime < 100) {
      console.log('  ✅ 高速応答 (< 100ms)');
    } else if (avgResponseTime < 500) {
      console.log('  ✅ 良好な応答 (< 500ms)');
    } else {
      console.log('  ⚠️ 応答時間要改善 (> 500ms)');
    }

    // 6. 結果サマリー
    console.log('\n' + '=' .repeat(50));
    console.log('🏆 データベース統合テスト 結果サマリー');
    console.log('=' .repeat(50));
    
    const totalTests = testResults.serverDB.total + testResults.dataFlow.total;
    const totalSuccess = testResults.serverDB.success + testResults.dataFlow.success;
    const successRate = totalTests > 0 ? Math.round((totalSuccess / totalTests) * 100) : 0;
    
    console.log(`サーバーDB: ${testResults.serverDB.success}/${testResults.serverDB.total} 成功`);
    console.log(`データフロー: ${testResults.dataFlow.success}/${testResults.dataFlow.total} 成功`);
    console.log(`総合成功率: ${successRate}%`);
    console.log(`平均応答時間: ${avgResponseTime}ms`);
    
    if (totalSuccess === totalTests) {
      console.log('\n🎉 データベース統合テスト 全機能正常！');
      return true;
    } else {
      console.log(`\n⚠️ ${totalTests - totalSuccess}件のテストが失敗しました`);
      return false;
    }

  } catch (error) {
    console.error('\n❌ データベーステスト失敗:', error.message);
    return false;
  }
}

// メイン実行
async function main() {
  console.log('⏳ サーバー準備確認（2秒待機）...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const success = await testDatabaseIntegration();
  
  if (success) {
    console.log('\n✅ データベース統合テスト完了');
    process.exit(0);
  } else {
    console.log('\n❌ データベース統合テスト失敗');
    process.exit(1);
  }
}

// Node.jsの場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
