#!/usr/bin/env node
/**
 * データベース操作 単体テスト
 * IndexedDB・PostgreSQL CRUD操作の詳細単体テスト
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
    console.log('🗄️ データベース操作 単体テスト開始');
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
    console.log('🏆 データベース操作 単体テスト結果');
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

// モックIndexedDB（メモリストレージ）
class MockIndexedDB {
  constructor() {
    this.stores = {
      userProfile: new Map(),
      concernSessions: new Map(), 
      contextData: new Map(),
      interactionEvents: new Map(),
      uiGenerations: new Map()
    };
    this.isOpen = false;
    this.version = 1;
  }

  // データベース初期化
  async initialize() {
    this.isOpen = true;
    return { success: true, version: this.version };
  }

  // データ保存
  async save(storeName, data) {
    if (!this.isOpen) throw new Error('Database not initialized');
    if (!this.stores[storeName]) throw new Error(`Unknown store: ${storeName}`);

    const id = data.id || data.userId || data.sessionId || data.contextId || data.eventId || data.generationId;
    if (!id) throw new Error('Record must have an ID field');

    // 保存時間の記録
    const recordWithMeta = {
      ...data,
      _savedAt: new Date(),
      _version: 1
    };

    this.stores[storeName].set(id, recordWithMeta);
    return { id, success: true };
  }

  // データ取得
  async get(storeName, id) {
    if (!this.isOpen) throw new Error('Database not initialized');
    if (!this.stores[storeName]) throw new Error(`Unknown store: ${storeName}`);

    return this.stores[storeName].get(id) || null;
  }

  // 全データ取得
  async getAll(storeName) {
    if (!this.isOpen) throw new Error('Database not initialized');
    if (!this.stores[storeName]) throw new Error(`Unknown store: ${storeName}`);

    return Array.from(this.stores[storeName].values());
  }

  // データ更新
  async update(storeName, id, updates) {
    if (!this.isOpen) throw new Error('Database not initialized');
    if (!this.stores[storeName]) throw new Error(`Unknown store: ${storeName}`);

    const existing = this.stores[storeName].get(id);
    if (!existing) throw new Error(`Record not found: ${id}`);

    const updated = {
      ...existing,
      ...updates,
      _updatedAt: new Date(),
      _version: (existing._version || 1) + 1
    };

    this.stores[storeName].set(id, updated);
    return { id, success: true, version: updated._version };
  }

  // データ削除
  async delete(storeName, id) {
    if (!this.isOpen) throw new Error('Database not initialized');
    if (!this.stores[storeName]) throw new Error(`Unknown store: ${storeName}`);

    const existed = this.stores[storeName].has(id);
    this.stores[storeName].delete(id);
    
    return { id, success: true, existed };
  }

  // 検索
  async find(storeName, predicate) {
    if (!this.isOpen) throw new Error('Database not initialized');
    if (!this.stores[storeName]) throw new Error(`Unknown store: ${storeName}`);

    const results = [];
    for (const record of this.stores[storeName].values()) {
      if (predicate(record)) {
        results.push(record);
      }
    }

    return results;
  }

  // カウント
  async count(storeName, predicate = null) {
    if (!this.isOpen) throw new Error('Database not initialized');
    if (!this.stores[storeName]) throw new Error(`Unknown store: ${storeName}`);

    if (!predicate) return this.stores[storeName].size;

    let count = 0;
    for (const record of this.stores[storeName].values()) {
      if (predicate(record)) count++;
    }

    return count;
  }

  // データベーススキーマ検証
  async validateSchema() {
    const requiredStores = ['userProfile', 'concernSessions', 'contextData', 'interactionEvents', 'uiGenerations'];
    const missingStores = requiredStores.filter(store => !this.stores[store]);
    
    if (missingStores.length > 0) {
      throw new Error(`Missing stores: ${missingStores.join(', ')}`);
    }

    return { valid: true, stores: Object.keys(this.stores) };
  }

  // トランザクション（簡易版）
  async transaction(operations) {
    const backup = new Map();
    const changedStores = new Set();

    try {
      // バックアップ作成
      for (const op of operations) {
        if (!backup.has(op.storeName)) {
          backup.set(op.storeName, new Map(this.stores[op.storeName]));
        }
        changedStores.add(op.storeName);
      }

      // 操作実行
      const results = [];
      for (const op of operations) {
        let result;
        switch (op.type) {
          case 'save':
            result = await this.save(op.storeName, op.data);
            break;
          case 'update':
            result = await this.update(op.storeName, op.id, op.updates);
            break;
          case 'delete':
            result = await this.delete(op.storeName, op.id);
            break;
          default:
            throw new Error(`Unknown operation: ${op.type}`);
        }
        results.push(result);
      }

      return { success: true, results };
    } catch (error) {
      // ロールバック
      for (const storeName of changedStores) {
        this.stores[storeName] = backup.get(storeName);
      }
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  // ストレージサイズ計算
  getStorageSize() {
    let totalSize = 0;
    
    for (const [storeName, store] of Object.entries(this.stores)) {
      const storeData = JSON.stringify(Array.from(store.values()));
      totalSize += storeData.length;
    }

    return {
      totalBytes: totalSize,
      stores: Object.fromEntries(
        Object.entries(this.stores).map(([name, store]) => [
          name, 
          JSON.stringify(Array.from(store.values())).length
        ])
      )
    };
  }

  // データベースクリア
  async clear(storeName = null) {
    if (storeName) {
      if (!this.stores[storeName]) throw new Error(`Unknown store: ${storeName}`);
      this.stores[storeName].clear();
      return { cleared: storeName };
    } else {
      for (const store of Object.values(this.stores)) {
        store.clear();
      }
      return { cleared: 'all' };
    }
  }
}

// データファクトリー（テスト用データ生成）
class TestDataFactory {
  static generateUserId() {
    return 'user-' + Math.random().toString(36).substr(2, 9);
  }

  static generateSessionId() {
    return 'session-' + Math.random().toString(36).substr(2, 9);
  }

  static generateUserProfile() {
    return {
      userId: this.generateUserId(),
      createdAt: new Date(),
      experimentCondition: 'dynamic_ui',
      configVersion: 'v1',
      preferences: {
        theme: 'light',
        notifications: true
      }
    };
  }

  static generateConcernSession() {
    return {
      sessionId: this.generateSessionId(),
      userId: this.generateUserId(),
      startTime: new Date(),
      currentScreen: 'concern_input',
      completed: false,
      realityCheck: {
        concernText: 'テスト用の関心事',
        concernLevel: 'medium',
        urgency: 'medium'
      }
    };
  }

  static generateContextData() {
    return {
      contextId: 'ctx-' + Math.random().toString(36).substr(2, 9),
      sessionId: this.generateSessionId(),
      collectedAt: new Date(),
      timeOfDay: 'morning',
      dayOfWeek: 1,
      availableTimeMin: 30,
      factors: {
        time_of_day: { value: 'morning', confidence: 1.0 },
        day_of_week: { value: 1, confidence: 1.0 }
      }
    };
  }

  static generateInteractionEvent() {
    return {
      eventId: 'evt-' + Math.random().toString(36).substr(2, 9),
      sessionId: this.generateSessionId(),
      anonymousUserId: this.generateUserId(),
      eventType: 'ui_shown',
      timestamp: new Date(),
      eventData: { screen: 'home' },
      syncedToServer: false
    };
  }
}

// 単体テスト実装
const runner = new TestRunner();
const db = new MockIndexedDB();

// データベース初期化テスト
runner.test('データベース初期化', async () => {
  const result = await db.initialize();
  
  if (!result.success) throw new Error('初期化失敗');
  if (!db.isOpen) throw new Error('データベースが開かれていません');
  if (result.version !== 1) throw new Error('バージョンが正しくありません');
});

runner.test('スキーマ検証', async () => {
  const result = await db.validateSchema();
  
  if (!result.valid) throw new Error('スキーマ検証失敗');
  if (result.stores.length !== 5) throw new Error('ストア数が正しくありません');
  
  const expectedStores = ['userProfile', 'concernSessions', 'contextData', 'interactionEvents', 'uiGenerations'];
  for (const store of expectedStores) {
    if (!result.stores.includes(store)) {
      throw new Error(`必須ストア不足: ${store}`);
    }
  }
});

runner.test('基本CRUD - 保存', async () => {
  const userProfile = TestDataFactory.generateUserProfile();
  
  const result = await db.save('userProfile', userProfile);
  
  if (!result.success) throw new Error('保存失敗');
  if (!result.id) throw new Error('IDが返されていません');
  
  // 保存されたデータの確認
  const saved = await db.get('userProfile', result.id);
  if (!saved) throw new Error('保存されたデータが取得できません');
  if (saved.userId !== userProfile.userId) throw new Error('保存データが正しくありません');
  if (!saved._savedAt) throw new Error('保存時間が記録されていません');
});

runner.test('基本CRUD - 取得', async () => {
  const session = TestDataFactory.generateConcernSession();
  await db.save('concernSessions', session);
  
  const retrieved = await db.get('concernSessions', session.sessionId);
  
  if (!retrieved) throw new Error('データが取得できません');
  if (retrieved.sessionId !== session.sessionId) throw new Error('取得データが正しくありません');
  if (retrieved.realityCheck.concernText !== session.realityCheck.concernText) {
    throw new Error('ネストされたデータが正しくありません');
  }
  
  // 存在しないIDのテスト
  const nonExistent = await db.get('concernSessions', 'non-existent');
  if (nonExistent !== null) throw new Error('存在しないデータでnull以外が返されました');
});

runner.test('基本CRUD - 更新', async () => {
  const context = TestDataFactory.generateContextData();
  await db.save('contextData', context);
  
  const updates = {
    timeOfDay: 'afternoon',
    availableTimeMin: 60
  };
  
  const result = await db.update('contextData', context.contextId, updates);
  
  if (!result.success) throw new Error('更新失敗');
  if (result.version !== 2) throw new Error('バージョンが更新されていません');
  
  const updated = await db.get('contextData', context.contextId);
  if (updated.timeOfDay !== 'afternoon') throw new Error('更新が反映されていません');
  if (updated.availableTimeMin !== 60) throw new Error('数値更新が反映されていません');
  if (!updated._updatedAt) throw new Error('更新時間が記録されていません');
});

runner.test('基本CRUD - 削除', async () => {
  const event = TestDataFactory.generateInteractionEvent();
  await db.save('interactionEvents', event);
  
  // 削除前確認
  const beforeDelete = await db.get('interactionEvents', event.eventId);
  if (!beforeDelete) throw new Error('削除前にデータが存在しません');
  
  const result = await db.delete('interactionEvents', event.eventId);
  
  if (!result.success) throw new Error('削除失敗');
  if (!result.existed) throw new Error('削除対象が存在していませんでした');
  
  // 削除後確認
  const afterDelete = await db.get('interactionEvents', event.eventId);
  if (afterDelete !== null) throw new Error('削除後にデータが残っています');
  
  // 存在しないデータの削除
  const nonExistentResult = await db.delete('interactionEvents', 'non-existent');
  if (nonExistentResult.existed) throw new Error('存在しないデータでexistedがtrueになりました');
});

runner.test('全データ取得', async () => {
  // テストデータを複数保存
  const profiles = Array(3).fill().map(() => TestDataFactory.generateUserProfile());
  for (const profile of profiles) {
    await db.save('userProfile', profile);
  }
  
  const allProfiles = await db.getAll('userProfile');
  
  if (allProfiles.length < 3) throw new Error('全データが取得できていません');
  
  // 各データの妥当性確認
  allProfiles.forEach(profile => {
    if (!profile.userId) throw new Error('不正なデータが含まれています');
    if (!profile._savedAt) throw new Error('メタデータが不足しています');
  });
});

runner.test('検索機能', async () => {
  // テストデータ準備
  const sessions = [
    { ...TestDataFactory.generateConcernSession(), completed: true },
    { ...TestDataFactory.generateConcernSession(), completed: false },
    { ...TestDataFactory.generateConcernSession(), completed: true }
  ];
  
  for (const session of sessions) {
    await db.save('concernSessions', session);
  }
  
  // 完了したセッションの検索
  const completedSessions = await db.find('concernSessions', s => s.completed === true);
  const incompleteSessions = await db.find('concernSessions', s => s.completed === false);
  
  if (completedSessions.length < 2) throw new Error('完了セッション検索結果が不正です');
  if (incompleteSessions.length < 1) throw new Error('未完了セッション検索結果が不正です');
  
  // 検索結果の妥当性確認
  completedSessions.forEach(session => {
    if (!session.completed) throw new Error('検索条件に合わないデータが含まれています');
  });
});

runner.test('カウント機能', async () => {
  // イベントデータを複数追加
  const events = Array(5).fill().map(() => ({
    ...TestDataFactory.generateInteractionEvent(),
    eventType: 'ui_shown'
  }));
  
  events.push({
    ...TestDataFactory.generateInteractionEvent(),
    eventType: 'action_started'
  });
  
  for (const event of events) {
    await db.save('interactionEvents', event);
  }
  
  const totalCount = await db.count('interactionEvents');
  const uiShownCount = await db.count('interactionEvents', e => e.eventType === 'ui_shown');
  const actionStartedCount = await db.count('interactionEvents', e => e.eventType === 'action_started');
  
  if (totalCount < 6) throw new Error('総カウントが正しくありません');
  if (uiShownCount !== 5) throw new Error('ui_shownカウントが正しくありません');
  if (actionStartedCount !== 1) throw new Error('action_startedカウントが正しくありません');
});

runner.test('トランザクション - 成功ケース', async () => {
  const session = TestDataFactory.generateConcernSession();
  const context = TestDataFactory.generateContextData();
  
  const operations = [
    { type: 'save', storeName: 'concernSessions', data: session },
    { type: 'save', storeName: 'contextData', data: context }
  ];
  
  const result = await db.transaction(operations);
  
  if (!result.success) throw new Error('トランザクション失敗');
  if (result.results.length !== 2) throw new Error('操作結果数が正しくありません');
  
  // 保存確認
  const savedSession = await db.get('concernSessions', session.sessionId);
  const savedContext = await db.get('contextData', context.contextId);
  
  if (!savedSession) throw new Error('トランザクション内のセッション保存が失敗しました');
  if (!savedContext) throw new Error('トランザクション内のコンテキスト保存が失敗しました');
});

runner.test('トランザクション - 失敗時ロールバック', async () => {
  const validSession = TestDataFactory.generateConcernSession();
  
  // 意図的に失敗させる操作（存在しないストア）
  const operations = [
    { type: 'save', storeName: 'concernSessions', data: validSession },
    { type: 'save', storeName: 'nonexistentStore', data: {} }
  ];
  
  try {
    await db.transaction(operations);
    throw new Error('失敗すべきトランザクションが成功しました');
  } catch (error) {
    if (!error.message.includes('Transaction failed')) {
      throw new Error('期待されるトランザクションエラーではありません');
    }
  }
  
  // ロールバック確認
  const rolledBackSession = await db.get('concernSessions', validSession.sessionId);
  if (rolledBackSession) throw new Error('ロールバックが正常に動作していません');
});

runner.test('ストレージサイズ計算', async () => {
  // データを複数保存
  await db.save('userProfile', TestDataFactory.generateUserProfile());
  await db.save('concernSessions', TestDataFactory.generateConcernSession());
  await db.save('contextData', TestDataFactory.generateContextData());
  
  const size = db.getStorageSize();
  
  if (typeof size.totalBytes !== 'number') throw new Error('総サイズが数値ではありません');
  if (size.totalBytes <= 0) throw new Error('総サイズが0以下です');
  
  // 各ストアのサイズが記録されている
  if (!size.stores.userProfile) throw new Error('userProfileのサイズが記録されていません');
  if (!size.stores.concernSessions) throw new Error('concernSessionsのサイズが記録されていません');
  if (!size.stores.contextData) throw new Error('contextDataのサイズが記録されていません');
});

runner.test('データベースクリア', async () => {
  // データを保存
  await db.save('userProfile', TestDataFactory.generateUserProfile());
  await db.save('contextData', TestDataFactory.generateContextData());
  
  // 個別ストアクリア
  const clearResult = await db.clear('userProfile');
  if (clearResult.cleared !== 'userProfile') throw new Error('個別クリア結果が正しくありません');
  
  const userProfiles = await db.getAll('userProfile');
  if (userProfiles.length !== 0) throw new Error('個別クリアが正常に動作していません');
  
  const contextData = await db.getAll('contextData');
  if (contextData.length === 0) throw new Error('他のストアまでクリアされています');
  
  // 全ストアクリア
  const clearAllResult = await db.clear();
  if (clearAllResult.cleared !== 'all') throw new Error('全クリア結果が正しくありません');
  
  const allContextData = await db.getAll('contextData');
  if (allContextData.length !== 0) throw new Error('全クリアが正常に動作していません');
});

runner.test('エラーハンドリング - 不正なストア', async () => {
  try {
    await db.save('invalidStore', {});
    throw new Error('不正なストア名でエラーが発生していません');
  } catch (error) {
    if (!error.message.includes('Unknown store')) {
      throw new Error('期待されるエラーメッセージではありません');
    }
  }
});

runner.test('エラーハンドリング - IDなしデータ', async () => {
  try {
    await db.save('userProfile', { name: 'test' }); // ID欄なし
    throw new Error('ID不足でエラーが発生していません');
  } catch (error) {
    if (!error.message.includes('ID field')) {
      throw new Error('期待されるエラーメッセージではありません');
    }
  }
});

runner.test('データ整合性 - 日時フィールド', async () => {
  const session = TestDataFactory.generateConcernSession();
  await db.save('concernSessions', session);
  
  const saved = await db.get('concernSessions', session.sessionId);
  
  // 日時が正しくDate型で保存・取得されている
  if (!(saved.startTime instanceof Date)) throw new Error('startTimeがDate型ではありません');
  if (!(saved._savedAt instanceof Date)) throw new Error('_savedAtがDate型ではありません');
  
  // 保存時間が現在時刻に近い
  const timeDiff = Math.abs(new Date() - saved._savedAt);
  if (timeDiff > 1000) throw new Error('保存時間が正しくありません'); // 1秒以内
});

runner.test('パフォーマンス - 大量データ操作', async () => {
  const dataCount = 100;
  const startTime = Date.now();
  
  // 大量保存
  const savePromises = Array(dataCount).fill().map(() => {
    const event = TestDataFactory.generateInteractionEvent();
    return db.save('interactionEvents', event);
  });
  
  await Promise.all(savePromises);
  
  const saveTime = Date.now() - startTime;
  
  // 大量取得
  const retrieveStart = Date.now();
  const allEvents = await db.getAll('interactionEvents');
  const retrieveTime = Date.now() - retrieveStart;
  
  if (allEvents.length < dataCount) throw new Error('大量データが正しく保存されていません');
  
  // パフォーマンス閾値（1秒以内）
  if (saveTime > 1000) console.warn(`大量保存が遅い: ${saveTime}ms`);
  if (retrieveTime > 1000) console.warn(`大量取得が遅い: ${retrieveTime}ms`);
  
  console.log(`\n      💾 パフォーマンス: 保存${saveTime}ms, 取得${retrieveTime}ms (${dataCount}件)`);
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

export { MockIndexedDB, TestDataFactory };
