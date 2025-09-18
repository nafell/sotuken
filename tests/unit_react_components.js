#!/usr/bin/env node
/**
 * React コンポーネント単体テスト
 * UI関数・ロジック・状態管理の詳細単体テスト（DOM非依存）
 */

class ReactComponentTestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  test(description, testFn) {
    this.tests.push({ description, testFn });
  }

  async run() {
    console.log('⚛️ React コンポーネント単体テスト開始');
    console.log('=' .repeat(70));

    for (const { description, testFn } of this.tests) {
      this.results.total++;
      process.stdout.write(`  🧩 ${description}... `);
      
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
    console.log('\n' + '=' .repeat(70));
    console.log('🏆 React コンポーネント単体テスト結果');
    console.log('=' .repeat(70));
    
    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    
    console.log(`総テスト数: ${this.results.total}`);
    console.log(`成功: ${this.results.passed} ✅`);
    console.log(`失敗: ${this.results.failed} ❌`);
    console.log(`成功率: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 全React単体テスト成功！');
    } else {
      console.log(`\n⚠️ ${this.results.failed}件のReact単体テスト失敗`);
    }
  }
}

// モックReact機能（DOM非依存のロジックテスト用）
class MockReact {
  static useState(initialValue) {
    let state = initialValue;
    const setState = (newValue) => {
      if (typeof newValue === 'function') {
        state = newValue(state);
      } else {
        state = newValue;
      }
    };
    return [state, setState];
  }

  static useEffect(effectFn, dependencies) {
    // 簡易版：副作用関数を直接実行
    return effectFn();
  }

  static useNavigate() {
    const navigationHistory = [];
    return (path, options) => {
      navigationHistory.push({ path, options });
      return { navigationHistory };
    };
  }

  static useLocation() {
    return {
      pathname: '/test',
      search: '',
      state: { testMode: true }
    };
  }
}

// HomeScreen ロジック単体テスト
class HomeScreenLogic {
  constructor() {
    this.workingMemoryUsage = 60;
    this.showCompletionMessage = false;
    this.activeIssues = [
      { id: 'issue1', title: '卒業研究のテーマ決め', priority: 'high', color: '🔴' },
      { id: 'issue2', title: '友達との旅行計画', priority: 'medium', color: '🟡' },
      { id: 'issue3', title: 'ジム再開', priority: 'low', color: '🟢' }
    ];
  }

  // ワーキングメモリ使用率の色判定
  getMemoryUsageColor() {
    if (this.workingMemoryUsage >= 70) return 'bg-red-500';
    if (this.workingMemoryUsage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  // ワーキングメモリ使用率のメッセージ
  getMemoryUsageMessage() {
    if (this.workingMemoryUsage >= 70) return '思考の整理が必要かも';
    if (this.workingMemoryUsage >= 50) return 'バランス良い状態';
    return '頭がスッキリしています！';
  }

  // セッション完了後のメモリ使用率更新
  updateMemoryUsageAfterCompletion(improvement) {
    const newUsage = Math.max(10, this.workingMemoryUsage - improvement);
    this.workingMemoryUsage = newUsage;
    return newUsage;
  }

  // 関心事の優先度フィルタリング
  filterIssuesByPriority(priority) {
    return this.activeIssues.filter(issue => issue.priority === priority);
  }

  // 関心事の検索
  searchIssues(query) {
    if (!query) return this.activeIssues;
    return this.activeIssues.filter(issue => 
      issue.title.toLowerCase().includes(query.toLowerCase())
    );
  }
}

// ConcernInputScreen バリデーションロジック
class ConcernInputValidation {
  static validateConcernText(text) {
    if (!text) return { valid: false, error: '関心事を入力してください' };
    if (typeof text !== 'string') return { valid: false, error: '関心事は文字列である必要があります' };
    if (text.trim().length < 3) return { valid: false, error: '関心事は3文字以上で入力してください' };
    if (text.trim().length > 500) return { valid: false, error: '関心事は500文字以下で入力してください' };
    
    // HTMLタグのチェック
    if (/<[^>]*>/g.test(text)) return { valid: false, error: 'HTMLタグは使用できません' };
    
    return { valid: true };
  }

  static sanitizeConcernText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static getCharacterCount(text) {
    return text ? text.trim().length : 0;
  }

  static getWordsEstimate(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

// ConcernLevelScreen 測定ロジック
class ConcernLevelLogic {
  static mapSliderValueToLevel(value) {
    if (value <= 33) return 'low';
    if (value <= 66) return 'medium';
    return 'high';
  }

  static mapLevelToSliderValue(level) {
    switch (level) {
      case 'low': return 20;
      case 'medium': return 50;
      case 'high': return 80;
      default: return 50;
    }
  }

  static getLevelDescription(level) {
    switch (level) {
      case 'low': return 'そこまで気にならない';
      case 'medium': return 'まあまあ気になる';
      case 'high': return 'とても気になる';
      default: return '';
    }
  }

  static getUrgencyDescription(urgency) {
    switch (urgency) {
      case 'low': return '急ぎではない';
      case 'medium': return 'ぼちぼち';
      case 'high': return 'すぐにでも';
      default: return '';
    }
  }

  static calculateConcernScore(concernLevel, urgency) {
    const levelWeight = { low: 1, medium: 2, high: 3 };
    const urgencyWeight = { low: 1, medium: 2, high: 3 };
    
    return (levelWeight[concernLevel] || 1) * (urgencyWeight[urgency] || 1);
  }
}

// セッション管理ロジック
class SessionManagerLogic {
  constructor() {
    this.sessions = new Map();
  }

  generateSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  createSession(userId) {
    const sessionId = this.generateSessionId();
    const session = {
      sessionId,
      userId,
      startTime: new Date(),
      currentScreen: 'concern_input',
      completed: false,
      data: {}
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    Object.assign(session, updates);
    session.lastUpdated = new Date();
    
    this.sessions.set(sessionId, session);
    return session;
  }

  completeSession(sessionId, outcomes) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    session.completed = true;
    session.endTime = new Date();
    session.outcomes = outcomes;
    
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  getActiveSessions() {
    return Array.from(this.sessions.values()).filter(s => !s.completed);
  }

  calculateSessionDuration(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    
    const endTime = session.endTime || new Date();
    return Math.round((endTime - session.startTime) / 1000); // seconds
  }
}

// ユーティリティ関数テスト
class UIUtilities {
  static formatTimeAgo(date) {
    if (!(date instanceof Date)) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}日前`;
    if (diffHours > 0) return `${diffHours}時間前`;
    if (diffMinutes > 0) return `${diffMinutes}分前`;
    return 'たった今';
  }

  static truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  static generateGradientClass(priority) {
    const gradients = {
      'high': 'bg-gradient-to-r from-red-500 to-red-600',
      'medium': 'bg-gradient-to-r from-yellow-500 to-yellow-600',
      'low': 'bg-gradient-to-r from-green-500 to-green-600'
    };
    return gradients[priority] || gradients['medium'];
  }

  static calculateReadingTime(text) {
    if (!text || typeof text !== 'string') return 0;
    const wordsPerMinute = 200; // 平均的な読書速度
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }

  static isValidColorHex(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }
}

const runner = new ReactComponentTestRunner();

// ===== HomeScreen ロジックテスト =====
runner.test('HomeScreen - メモリ使用率の色判定', async () => {
  const homeScreen = new HomeScreenLogic();
  
  // 境界値テスト
  homeScreen.workingMemoryUsage = 69;
  if (homeScreen.getMemoryUsageColor() !== 'bg-yellow-500') {
    throw new Error('69%で黄色になるべきです');
  }
  
  homeScreen.workingMemoryUsage = 70;
  if (homeScreen.getMemoryUsageColor() !== 'bg-red-500') {
    throw new Error('70%で赤色になるべきです');
  }
  
  homeScreen.workingMemoryUsage = 49;
  if (homeScreen.getMemoryUsageColor() !== 'bg-green-500') {
    throw new Error('49%で緑色になるべきです');
  }
  
  homeScreen.workingMemoryUsage = 50;
  if (homeScreen.getMemoryUsageColor() !== 'bg-yellow-500') {
    throw new Error('50%で黄色になるべきです');
  }
});

runner.test('HomeScreen - メモリ使用率メッセージ', async () => {
  const homeScreen = new HomeScreenLogic();
  
  homeScreen.workingMemoryUsage = 80;
  if (!homeScreen.getMemoryUsageMessage().includes('思考の整理')) {
    throw new Error('80%で整理メッセージが表示されるべきです');
  }
  
  homeScreen.workingMemoryUsage = 60;
  if (!homeScreen.getMemoryUsageMessage().includes('バランス')) {
    throw new Error('60%でバランスメッセージが表示されるべきです');
  }
  
  homeScreen.workingMemoryUsage = 30;
  if (!homeScreen.getMemoryUsageMessage().includes('スッキリ')) {
    throw new Error('30%でスッキリメッセージが表示されるべきです');
  }
});

runner.test('HomeScreen - セッション完了後のメモリ更新', async () => {
  const homeScreen = new HomeScreenLogic();
  homeScreen.workingMemoryUsage = 70;
  
  const newUsage = homeScreen.updateMemoryUsageAfterCompletion(20);
  if (newUsage !== 50) {
    throw new Error(`期待値50、実際${newUsage}`);
  }
  
  // 最小値テスト
  homeScreen.workingMemoryUsage = 15;
  const minUsage = homeScreen.updateMemoryUsageAfterCompletion(20);
  if (minUsage !== 10) {
    throw new Error(`最小値10になるべき、実際${minUsage}`);
  }
});

runner.test('HomeScreen - 関心事フィルタリング', async () => {
  const homeScreen = new HomeScreenLogic();
  
  const highPriorityIssues = homeScreen.filterIssuesByPriority('high');
  if (highPriorityIssues.length !== 1 || highPriorityIssues[0].id !== 'issue1') {
    throw new Error('高優先度フィルタリング失敗');
  }
  
  const mediumPriorityIssues = homeScreen.filterIssuesByPriority('medium');
  if (mediumPriorityIssues.length !== 1 || mediumPriorityIssues[0].id !== 'issue2') {
    throw new Error('中優先度フィルタリング失敗');
  }
  
  const nonExistentPriority = homeScreen.filterIssuesByPriority('urgent');
  if (nonExistentPriority.length !== 0) {
    throw new Error('存在しない優先度で空配列になるべき');
  }
});

runner.test('HomeScreen - 関心事検索', async () => {
  const homeScreen = new HomeScreenLogic();
  
  const searchResults = homeScreen.searchIssues('研究');
  if (searchResults.length !== 1 || !searchResults[0].title.includes('研究')) {
    throw new Error('研究検索失敗');
  }
  
  const emptySearch = homeScreen.searchIssues('');
  if (emptySearch.length !== homeScreen.activeIssues.length) {
    throw new Error('空検索で全件返すべき');
  }
  
  const noResults = homeScreen.searchIssues('存在しないキーワード');
  if (noResults.length !== 0) {
    throw new Error('該当なし検索で空配列になるべき');
  }
});

// ===== ConcernInputScreen バリデーションテスト =====
runner.test('ConcernInput - 基本バリデーション', async () => {
  // 有効な入力
  const validResult = ConcernInputValidation.validateConcernText('有効な関心事です');
  if (!validResult.valid) {
    throw new Error('有効な入力が不正判定されました');
  }
  
  // 空文字
  const emptyResult = ConcernInputValidation.validateConcernText('');
  if (emptyResult.valid) {
    throw new Error('空文字が有効判定されました');
  }
  
  // 短すぎる
  const shortResult = ConcernInputValidation.validateConcernText('ab');
  if (shortResult.valid) {
    throw new Error('2文字が有効判定されました');
  }
  
  // 境界値（3文字）
  const boundaryResult = ConcernInputValidation.validateConcernText('abc');
  if (!boundaryResult.valid) {
    throw new Error('3文字が無効判定されました');
  }
});

runner.test('ConcernInput - 長さ制限テスト', async () => {
  const longText = 'a'.repeat(500);
  const validLongResult = ConcernInputValidation.validateConcernText(longText);
  if (!validLongResult.valid) {
    throw new Error('500文字が無効判定されました');
  }
  
  const tooLongText = 'a'.repeat(501);
  const invalidLongResult = ConcernInputValidation.validateConcernText(tooLongText);
  if (invalidLongResult.valid) {
    throw new Error('501文字が有効判定されました');
  }
});

runner.test('ConcernInput - HTMLタグ検証', async () => {
  const htmlInputs = [
    '<script>alert("xss")</script>',
    '<div>content</div>',
    '<img src="x">',
    'normal <b>bold</b> text'
  ];
  
  for (const htmlInput of htmlInputs) {
    const result = ConcernInputValidation.validateConcernText(htmlInput);
    if (result.valid) {
      throw new Error(`HTMLタグを含む入力が有効判定されました: ${htmlInput}`);
    }
  }
});

runner.test('ConcernInput - サニタイズ機能', async () => {
  const dangerousInput = '<script>alert("xss")</script>';
  const sanitized = ConcernInputValidation.sanitizeConcernText(dangerousInput);
  
  if (sanitized.includes('<script>')) {
    throw new Error('スクリプトタグが残っています');
  }
  
  if (!sanitized.includes('&lt;') || !sanitized.includes('&gt;')) {
    throw new Error('HTMLエスケープが正しく動作していません');
  }
  
  // 引用符のテスト
  const quotesInput = '"Hello\'s world"';
  const quotesResult = ConcernInputValidation.sanitizeConcernText(quotesInput);
  if (quotesResult.includes('"') || quotesResult.includes("'")) {
    throw new Error('引用符がエスケープされていません');
  }
});

runner.test('ConcernInput - 文字数・単語数カウント', async () => {
  const text = '  これは テスト の 関心事 です  ';
  const charCount = ConcernInputValidation.getCharacterCount(text);
  const wordCount = ConcernInputValidation.getWordsEstimate(text);
  
  if (charCount !== 14) { // 前後空白除去後
    throw new Error(`文字数カウント失敗: 期待14、実際${charCount}`);
  }
  
  if (wordCount !== 5) {
    throw new Error(`単語数カウント失敗: 期待5、実際${wordCount}`);
  }
  
  // 空文字テスト
  if (ConcernInputValidation.getCharacterCount('') !== 0) {
    throw new Error('空文字の文字数が0ではありません');
  }
  
  if (ConcernInputValidation.getWordsEstimate('') !== 0) {
    throw new Error('空文字の単語数が0ではありません');
  }
});

// ===== ConcernLevelScreen 測定ロジックテスト =====
runner.test('ConcernLevel - スライダー値とレベルマッピング', async () => {
  // 境界値テスト
  if (ConcernLevelLogic.mapSliderValueToLevel(33) !== 'low') {
    throw new Error('33は lowになるべき');
  }
  if (ConcernLevelLogic.mapSliderValueToLevel(34) !== 'medium') {
    throw new Error('34は mediumになるべき');
  }
  if (ConcernLevelLogic.mapSliderValueToLevel(66) !== 'medium') {
    throw new Error('66は mediumになるべき');
  }
  if (ConcernLevelLogic.mapSliderValueToLevel(67) !== 'high') {
    throw new Error('67は highになるべき');
  }
  
  // 逆マッピング
  if (ConcernLevelLogic.mapLevelToSliderValue('low') !== 20) {
    throw new Error('low は 20になるべき');
  }
  if (ConcernLevelLogic.mapLevelToSliderValue('medium') !== 50) {
    throw new Error('medium は 50になるべき');
  }
  if (ConcernLevelLogic.mapLevelToSliderValue('high') !== 80) {
    throw new Error('high は 80になるべき');
  }
  
  // デフォルト値
  if (ConcernLevelLogic.mapLevelToSliderValue('invalid') !== 50) {
    throw new Error('無効値はデフォルト50になるべき');
  }
});

runner.test('ConcernLevel - 説明文テスト', async () => {
  const levelDescriptions = {
    'low': 'そこまで気にならない',
    'medium': 'まあまあ気になる',
    'high': 'とても気になる'
  };
  
  for (const [level, expected] of Object.entries(levelDescriptions)) {
    const description = ConcernLevelLogic.getLevelDescription(level);
    if (description !== expected) {
      throw new Error(`レベル${level}の説明が違います: 期待「${expected}」、実際「${description}」`);
    }
  }
  
  // デフォルト値
  if (ConcernLevelLogic.getLevelDescription('invalid') !== '') {
    throw new Error('無効レベルは空文字になるべき');
  }
});

runner.test('ConcernLevel - 関心スコア計算', async () => {
  // 最小スコア
  const minScore = ConcernLevelLogic.calculateConcernScore('low', 'low');
  if (minScore !== 1) {
    throw new Error(`最小スコア失敗: 期待1、実際${minScore}`);
  }
  
  // 最大スコア
  const maxScore = ConcernLevelLogic.calculateConcernScore('high', 'high');
  if (maxScore !== 9) {
    throw new Error(`最大スコア失敗: 期待9、実際${maxScore}`);
  }
  
  // 中間スコア
  const mediumScore = ConcernLevelLogic.calculateConcernScore('medium', 'high');
  if (mediumScore !== 6) {
    throw new Error(`中間スコア失敗: 期待6、実際${mediumScore}`);
  }
  
  // 無効値テスト
  const invalidScore = ConcernLevelLogic.calculateConcernScore('invalid', 'invalid');
  if (invalidScore !== 1) {
    throw new Error(`無効値スコア失敗: 期待1、実際${invalidScore}`);
  }
});

// ===== セッション管理テスト =====
runner.test('SessionManager - セッション作成', async () => {
  const sessionManager = new SessionManagerLogic();
  const userId = 'test-user-123';
  
  const session = sessionManager.createSession(userId);
  
  if (!session.sessionId) throw new Error('セッションIDが生成されていません');
  if (session.userId !== userId) throw new Error('ユーザーIDが正しく設定されていません');
  if (!(session.startTime instanceof Date)) throw new Error('開始時間がDate型ではありません');
  if (session.completed !== false) throw new Error('初期状態で未完了になっていません');
  if (session.currentScreen !== 'concern_input') throw new Error('初期画面が正しく設定されていません');
});

runner.test('SessionManager - セッション更新', async () => {
  const sessionManager = new SessionManagerLogic();
  const session = sessionManager.createSession('test-user');
  
  const updates = {
    currentScreen: 'concern_level',
    data: { concernText: '更新されたデータ' }
  };
  
  const updatedSession = sessionManager.updateSession(session.sessionId, updates);
  
  if (updatedSession.currentScreen !== 'concern_level') {
    throw new Error('画面更新が反映されていません');
  }
  if (!updatedSession.data.concernText) {
    throw new Error('データ更新が反映されていません');
  }
  if (!(updatedSession.lastUpdated instanceof Date)) {
    throw new Error('更新時間が記録されていません');
  }
  
  // 存在しないセッションの更新
  try {
    sessionManager.updateSession('non-existent', {});
    throw new Error('存在しないセッションの更新でエラーが発生していません');
  } catch (error) {
    if (!error.message.includes('Session not found')) {
      throw new Error('期待されるエラーメッセージではありません');
    }
  }
});

runner.test('SessionManager - セッション完了', async () => {
  const sessionManager = new SessionManagerLogic();
  const session = sessionManager.createSession('test-user');
  
  const outcomes = {
    satisfaction: 'high',
    actionsTaken: ['メール送信', '資料作成']
  };
  
  const completedSession = sessionManager.completeSession(session.sessionId, outcomes);
  
  if (!completedSession.completed) throw new Error('完了フラグが設定されていません');
  if (!(completedSession.endTime instanceof Date)) throw new Error('終了時間が記録されていません');
  if (completedSession.outcomes !== outcomes) throw new Error('成果が記録されていません');
});

runner.test('SessionManager - セッション時間計算', async () => {
  const sessionManager = new SessionManagerLogic();
  const session = sessionManager.createSession('test-user');
  
  // 人工的に開始時間を過去に設定
  session.startTime = new Date(Date.now() - 120000); // 2分前
  sessionManager.sessions.set(session.sessionId, session);
  
  const duration = sessionManager.calculateSessionDuration(session.sessionId);
  
  if (duration < 110 || duration > 130) { // 120秒±10秒の範囲
    throw new Error(`時間計算が不正確: ${duration}秒`);
  }
  
  // 完了セッションのテスト
  const completedSession = sessionManager.completeSession(session.sessionId, {});
  completedSession.endTime = new Date(session.startTime.getTime() + 180000); // 開始から3分後に完了
  sessionManager.sessions.set(session.sessionId, completedSession);
  
  const completedDuration = sessionManager.calculateSessionDuration(session.sessionId);
  if (completedDuration !== 180) {
    throw new Error(`完了セッション時間計算失敗: ${completedDuration}秒`);
  }
});

// ===== ユーティリティ関数テスト =====
runner.test('UIUtilities - 時間表示フォーマット', async () => {
  const now = new Date();
  
  // 現在時刻
  const nowResult = UIUtilities.formatTimeAgo(now);
  if (nowResult !== 'たった今') {
    throw new Error(`現在時刻: 期待「たった今」、実際「${nowResult}」`);
  }
  
  // 30分前
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const minResult = UIUtilities.formatTimeAgo(thirtyMinAgo);
  if (minResult !== '30分前') {
    throw new Error(`30分前: 期待「30分前」、実際「${minResult}」`);
  }
  
  // 2時間前
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const hourResult = UIUtilities.formatTimeAgo(twoHoursAgo);
  if (hourResult !== '2時間前') {
    throw new Error(`2時間前: 期待「2時間前」、実際「${hourResult}」`);
  }
  
  // 3日前
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const dayResult = UIUtilities.formatTimeAgo(threeDaysAgo);
  if (dayResult !== '3日前') {
    throw new Error(`3日前: 期待「3日前」、実際「${dayResult}」`);
  }
  
  // 無効値
  const invalidResult = UIUtilities.formatTimeAgo('invalid');
  if (invalidResult !== '') {
    throw new Error('無効値で空文字になるべき');
  }
});

runner.test('UIUtilities - テキスト切り取り', async () => {
  const longText = 'これは非常に長いテキストです';
  
  // 切り取りなし
  const noTruncate = UIUtilities.truncateText(longText, 50);
  if (noTruncate !== longText) {
    throw new Error('長さ以下のテキストが変更されました');
  }
  
  // 切り取りあり
  const truncated = UIUtilities.truncateText(longText, 10);
  if (!truncated.endsWith('...')) {
    throw new Error('切り取り時に「...」が付加されていません');
  }
  if (truncated.length !== 10) {
    throw new Error(`切り取り長さが不正: ${truncated.length}`);
  }
  
  // 境界値（「...」含む）
  const boundary = UIUtilities.truncateText('abcdef', 6);
  if (boundary !== 'abcdef') {
    throw new Error('境界値で不適切な切り取りが発生');
  }
  
  // 無効値
  if (UIUtilities.truncateText(null, 10) !== '') {
    throw new Error('null値で空文字になるべき');
  }
  if (UIUtilities.truncateText(undefined, 10) !== '') {
    throw new Error('undefined値で空文字になるべき');
  }
});

runner.test('UIUtilities - グラデーションクラス生成', async () => {
  const priorities = {
    'high': 'bg-gradient-to-r from-red-500 to-red-600',
    'medium': 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    'low': 'bg-gradient-to-r from-green-500 to-green-600'
  };
  
  for (const [priority, expected] of Object.entries(priorities)) {
    const result = UIUtilities.generateGradientClass(priority);
    if (result !== expected) {
      throw new Error(`${priority}優先度: 期待「${expected}」、実際「${result}」`);
    }
  }
  
  // デフォルト値
  const defaultResult = UIUtilities.generateGradientClass('invalid');
  if (defaultResult !== priorities['medium']) {
    throw new Error('無効優先度でmediumデフォルトになるべき');
  }
});

runner.test('UIUtilities - 読書時間計算', async () => {
  // 短いテキスト
  const shortText = '短い文章です';
  const shortTime = UIUtilities.calculateReadingTime(shortText);
  if (shortTime !== 1) {
    throw new Error(`短文読書時間: 期待1、実際${shortTime}`);
  }
  
  // 長いテキスト（400文字≈200語）
  const longText = 'word '.repeat(400);
  const longTime = UIUtilities.calculateReadingTime(longText);
  if (longTime !== 2) {
    throw new Error(`長文読書時間: 期待2、実際${longTime}`);
  }
  
  // 空文字
  const emptyTime = UIUtilities.calculateReadingTime('');
  if (emptyTime !== 0) {
    throw new Error(`空文字読書時間: 期待0、実際${emptyTime}`);
  }
});

runner.test('UIUtilities - カラーHex検証', async () => {
  const validColors = ['#FF0000', '#ff0000', '#F00', '#f00', '#123456', '#ABC'];
  const invalidColors = ['#GG0000', '#FF00', '#FF00000', 'red', 'rgb(255,0,0)', ''];
  
  for (const color of validColors) {
    if (!UIUtilities.isValidColorHex(color)) {
      throw new Error(`有効な色${color}が無効判定されました`);
    }
  }
  
  for (const color of invalidColors) {
    if (UIUtilities.isValidColorHex(color)) {
      throw new Error(`無効な色${color}が有効判定されました`);
    }
  }
});

// テスト実行
async function main() {
  await runner.run();
  
  if (runner.results.failed === 0) {
    console.log('\n✅ React コンポーネント単体テスト完了');
    process.exit(0);
  } else {
    console.log('\n❌ React コンポーネント単体テスト完了（一部失敗）');
    process.exit(1);
  }
}

// Node.jsの場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
