# Phase 2 Step 3.5 詳細実装タスク計画
**UI保持・入力保持機能の実装**

**作成日**: 2025年10月18日  
**対象**: DynamicThoughtScreen の戻る機能改善  
**工数**: 1-2日  
**優先度**: ⭐️⭐️

---

## 📋 実装概要

### 🎯 目標

DynamicThoughtScreenで「戻る」ボタンを押した際に：
1. **UI再生成を回避**: 一度生成したUIをキャッシュし、再利用する
2. **入力内容を保持**: ユーザーが入力した内容を失わない
3. **パフォーマンス向上**: 不要なAPI呼び出しを削減

### 背景

現状の問題点：
- 戻るボタンで前ステージに戻ると、UIが再生成される（5-10秒かかる）
- ユーザーが入力した内容が消去される
- 不要なAPI呼び出しが発生し、コストとレイテンシが増加

改善後の動作：
- 戻るボタンでキャッシュされたUIを即座に表示
- 入力内容が復元される
- スムーズなユーザー体験

---

## 🔨 実装タスク

### タスク 3.5.1: UIGenerationCache型定義

**目標**: UI生成結果のキャッシュ型を定義  
**ファイル**: `/concern-app/src/types/cache.ts` （新規作成）

**実装内容**:
```typescript
// UIGenerationCache interface定義
interface UIGenerationCache {
  cacheId: string;              // キャッシュID
  stage: 'capture' | 'plan' | 'breakdown';
  concernId: string;            // 関連する関心事ID
  
  // 生成されたUI（Phase 1Cの成果物）
  uiSpec: UISpecDSL;
  dataSchema: DataSchemaDSL;
  generationId: string;
  
  // メタデータ
  generatedAt: Date;
  lastAccessedAt: Date;
  
  // 入力内容
  formData: Record<string, any>;
}

// CacheEntry interface定義
interface CacheEntry {
  cache: UIGenerationCache;
  expiresAt: Date;              // 有効期限（1時間）
}
```

**成功基準**:
- TypeScriptコンパイルエラーなし
- 全フィールドに型注釈あり

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

**注意点**: 実装ロジックは含めない（型定義のみ）

---

### タスク 3.5.2: UIGenerationCacheService骨格作成

**目標**: UIキャッシュ管理サービスの基本構造  
**ファイル**: `/concern-app/src/services/UIGenerationCacheService.ts` （新規作成）

**実装内容**:
```typescript
class UIGenerationCacheService {
  private cacheKey = 'uiGenerationCache';
  private cacheExpiration = 60 * 60 * 1000; // 1時間
  
  // メソッドシグネチャのみ（空実装）
  saveCache(cache: UIGenerationCache): void {}
  loadCache(stage: string, concernId: string): UIGenerationCache | null {}
  clearCache(concernId: string): void {}
  clearExpiredCaches(): void {}
}

// シングルトンインスタンス
export const uiCacheService = new UIGenerationCacheService();
```

**成功基準**:
- TypeScriptコンパイルエラーなし
- クラスがインスタンス化可能

**テスト方法**:
```bash
cd /home/tk220307/sotuken/concern-app
bun run build
```

---

### タスク 3.5.3: saveCache実装

**目標**: UI生成結果をSessionStorageに保存  
**ファイル**: `/concern-app/src/services/UIGenerationCacheService.ts`

**実装内容**:
```typescript
saveCache(cache: UIGenerationCache): void {
  try {
    // 既存のキャッシュを読み込み
    const stored = sessionStorage.getItem(this.cacheKey);
    const caches: Record<string, CacheEntry> = stored ? JSON.parse(stored) : {};
    
    // 新しいキャッシュを追加
    const key = `${cache.stage}_${cache.concernId}`;
    caches[key] = {
      cache,
      expiresAt: new Date(Date.now() + this.cacheExpiration)
    };
    
    // 保存
    sessionStorage.setItem(this.cacheKey, JSON.stringify(caches));
    
    console.log('[UIGenerationCacheService] Cache saved:', key);
  } catch (error) {
    console.error('[UIGenerationCacheService] Failed to save cache:', error);
  }
}
```

**成功基準**:
- UIキャッシュがSessionStorageに保存される
- 有効期限が設定される

**テスト方法**:
```typescript
// Consoleでテスト
import { uiCacheService } from '../services/UIGenerationCacheService';

const testCache = {
  cacheId: 'cache_001',
  stage: 'capture',
  concernId: 'concern_123',
  uiSpec: { /* テストデータ */ },
  dataSchema: { /* テストデータ */ },
  generationId: 'gen_001',
  generatedAt: new Date(),
  lastAccessedAt: new Date(),
  formData: {}
};

uiCacheService.saveCache(testCache);

// SessionStorageを確認
const stored = sessionStorage.getItem('uiGenerationCache');
console.log('Cached data:', JSON.parse(stored));
// キャッシュが保存されていることを確認
```

---

### タスク 3.5.4: loadCache実装

**目標**: SessionStorageからUIキャッシュを読み込み  
**ファイル**: `/concern-app/src/services/UIGenerationCacheService.ts`

**実装内容**:
```typescript
loadCache(stage: string, concernId: string): UIGenerationCache | null {
  try {
    const stored = sessionStorage.getItem(this.cacheKey);
    if (!stored) {
      console.log('[UIGenerationCacheService] No cache found');
      return null;
    }
    
    const caches: Record<string, CacheEntry> = JSON.parse(stored);
    const key = `${stage}_${concernId}`;
    const entry = caches[key];
    
    if (!entry) {
      console.log('[UIGenerationCacheService] Cache not found for key:', key);
      return null;
    }
    
    // 有効期限チェック
    if (new Date() > new Date(entry.expiresAt)) {
      console.log('[UIGenerationCacheService] Cache expired:', key);
      delete caches[key];
      sessionStorage.setItem(this.cacheKey, JSON.stringify(caches));
      return null;
    }
    
    // lastAccessedAtを更新
    entry.cache.lastAccessedAt = new Date();
    caches[key] = entry;
    sessionStorage.setItem(this.cacheKey, JSON.stringify(caches));
    
    console.log('[UIGenerationCacheService] Cache loaded:', key);
    return entry.cache;
    
  } catch (error) {
    console.error('[UIGenerationCacheService] Failed to load cache:', error);
    return null;
  }
}
```

**成功基準**:
- キャッシュが正しく読み込まれる
- 有効期限切れのキャッシュは削除される
- lastAccessedAtが更新される

**テスト方法**:
```typescript
// 保存したキャッシュを読み込み
const loaded = uiCacheService.loadCache('capture', 'concern_123');
console.log('Loaded cache:', loaded);
// キャッシュが読み込まれることを確認

// 存在しないキャッシュを読み込み
const notFound = uiCacheService.loadCache('plan', 'concern_999');
console.log('Not found:', notFound);
// null が返されることを確認
```

---

### タスク 3.5.5: clearCache実装

**目標**: 特定の関心事のキャッシュをクリア  
**ファイル**: `/concern-app/src/services/UIGenerationCacheService.ts`

**実装内容**:
```typescript
clearCache(concernId: string): void {
  try {
    const stored = sessionStorage.getItem(this.cacheKey);
    if (!stored) return;
    
    const caches: Record<string, CacheEntry> = JSON.parse(stored);
    
    // 指定されたconcernIdのキャッシュを削除
    const keysToDelete = Object.keys(caches).filter(key => 
      caches[key].cache.concernId === concernId
    );
    
    keysToDelete.forEach(key => delete caches[key]);
    
    sessionStorage.setItem(this.cacheKey, JSON.stringify(caches));
    
    console.log('[UIGenerationCacheService] Cache cleared for concernId:', concernId, 
                'Deleted keys:', keysToDelete.length);
  } catch (error) {
    console.error('[UIGenerationCacheService] Failed to clear cache:', error);
  }
}

clearAllCaches(): void {
  try {
    sessionStorage.removeItem(this.cacheKey);
    console.log('[UIGenerationCacheService] All caches cleared');
  } catch (error) {
    console.error('[UIGenerationCacheService] Failed to clear all caches:', error);
  }
}
```

**成功基準**:
- 指定された関心事のキャッシュが削除される
- 全キャッシュクリアが動作する

**テスト方法**:
```typescript
// キャッシュを複数保存
uiCacheService.saveCache({ /* concern_123のcaptureキャッシュ */ });
uiCacheService.saveCache({ /* concern_123のplanキャッシュ */ });
uiCacheService.saveCache({ /* concern_456のcaptureキャッシュ */ });

// 特定の関心事のキャッシュをクリア
uiCacheService.clearCache('concern_123');

// 残っているキャッシュを確認
const loaded456 = uiCacheService.loadCache('capture', 'concern_456');
console.log('Cache for concern_456:', loaded456);
// concern_456のキャッシュは残っている

const loaded123 = uiCacheService.loadCache('capture', 'concern_123');
console.log('Cache for concern_123:', loaded123);
// null が返される（削除された）
```

---

### ✅ タスク 3.5.6: Commit - UIGenerationCacheService実装

**コミット内容**:
```bash
git add concern-app/src/types/cache.ts concern-app/src/services/UIGenerationCacheService.ts
git commit -m "feat(phase2): Implement UIGenerationCacheService for UI preservation

- Add UIGenerationCache type definition
- Implement cache save/load/clear operations
- Use SessionStorage for temporary cache storage
- Add 1-hour expiration for cache entries
- Ref: Phase 2 Step 3.5 - UI preservation"
```

---

### タスク 3.5.7: DynamicThoughtScreen キャッシュチェック追加

**目標**: UI生成前にキャッシュを確認  
**ファイル**: `/concern-app/src/components/screens/DynamicThoughtScreen.tsx`

**実装内容**:
```typescript
// import追加
import { uiCacheService } from '../../services/UIGenerationCacheService';

// useEffect内の最初でキャッシュチェック
useEffect(() => {
  const generateUI = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Phase 2 Step 3.5: キャッシュチェック ⭐️
      const concernInfo = flowStateManager.getConcernInfo();
      if (concernInfo) {
        const cachedUI = uiCacheService.loadCache(stage, concernInfo.concernId);
        
        if (cachedUI) {
          console.log('✅ キャッシュされたUIを使用:', stage);
          
          // キャッシュからUIを復元
          setDataSchema(cachedUI.dataSchema);
          setUiSpec(cachedUI.uiSpec);
          setFormData(cachedUI.formData);
          
          setIsLoading(false);
          return; // UI生成をスキップ
        }
      }
      
      // キャッシュがない場合は通常のUI生成を実行
      console.log('🔄 新規UI生成:', stage);
      
      // 既存のUI生成ロジック...
      
    } catch (err) {
      // エラー処理...
    }
  };

  generateUI();
}, [concernText, stage]);
```

**成功基準**:
- キャッシュがある場合、UI生成をスキップする
- キャッシュがない場合、通常通りUI生成する

**テスト方法**:
```typescript
// 1. capture画面を初回表示（UI生成）
// Console: "🔄 新規UI生成: capture"

// 2. plan画面へ進む

// 3. 戻るボタンでcapture画面へ戻る
// Console: "✅ キャッシュされたUIを使用: capture"
// → UI生成がスキップされ、即座に表示される
```

---

### タスク 3.5.8: UI生成完了時のキャッシュ保存

**目標**: UI生成成功時にキャッシュに保存  
**ファイル**: `/concern-app/src/components/screens/DynamicThoughtScreen.tsx`

**実装内容**:
```typescript
// UI生成成功後にキャッシュ保存
const data = await response.json();
console.log('✅ UI生成完了:', data);

setDataSchema(data.dataSchema);
setUiSpec(data.uiSpec);

// 初期データを設定
const initialData = initializeFormData(data.dataSchema);
setFormData(initialData);

// Phase 2 Step 3.5: キャッシュに保存 ⭐️
const concernInfo = flowStateManager.getConcernInfo();
if (concernInfo) {
  uiCacheService.saveCache({
    cacheId: `cache_${Date.now()}`,
    stage,
    concernId: concernInfo.concernId,
    uiSpec: data.uiSpec,
    dataSchema: data.dataSchema,
    generationId: data.generationId,
    generatedAt: new Date(),
    lastAccessedAt: new Date(),
    formData: initialData
  });
  
  console.log('💾 UIキャッシュを保存しました:', stage);
}

// イベント記録...
```

**成功基準**:
- UI生成成功時にキャッシュが保存される
- SessionStorageに保存される

**テスト方法**:
```typescript
// 1. capture画面を表示（UI生成）
// 2. SessionStorageを確認
const stored = sessionStorage.getItem('uiGenerationCache');
console.log('Cached UIs:', JSON.parse(stored));
// capture_concern_123 のキャッシュが保存されていることを確認
```

---

### タスク 3.5.9: フォームデータ変更時のキャッシュ更新

**目標**: ユーザーが入力した内容をキャッシュに反映  
**ファイル**: `/concern-app/src/components/screens/DynamicThoughtScreen.tsx`

**実装内容**:
```typescript
// handleDataChange メソッドを更新
const handleDataChange = useCallback((path: string, value: any) => {
  console.log('📝 データ変更:', path, value);

  setFormData((prev) => {
    const newData = { ...prev };
    const parts = path.split('.');
    
    let current: any = newData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    
    // Phase 2 Step 3.5: キャッシュを更新 ⭐️
    const concernInfo = flowStateManager.getConcernInfo();
    if (concernInfo && uiSpec && dataSchema) {
      const cachedUI = uiCacheService.loadCache(stage, concernInfo.concernId);
      if (cachedUI) {
        // formDataのみ更新
        cachedUI.formData = newData;
        uiCacheService.saveCache(cachedUI);
      }
    }
    
    return newData;
  });
}, [stage, uiSpec, dataSchema]);
```

**成功基準**:
- フォーム入力時にキャッシュが更新される
- 入力内容が失われない

**テスト方法**:
```typescript
// 1. capture画面でテキストを入力
// 2. plan画面へ進む
// 3. 戻るボタンでcapture画面へ戻る
// 4. 入力したテキストが復元されていることを確認
```

---

### タスク 3.5.10: 戻るボタンの実装

**目標**: 前のステージへ戻るボタンを追加  
**ファイル**: `/concern-app/src/components/screens/DynamicThoughtScreen.tsx`

**実装内容**:
```typescript
// 戻るボタンハンドラー
const handleBack = () => {
  console.log('🔙 戻るボタンクリック:', stage);
  
  // Phase 2 Step 3.5: 現在のフォームデータをキャッシュに保存してから戻る
  const concernInfo = flowStateManager.getConcernInfo();
  if (concernInfo && uiSpec && dataSchema) {
    const cachedUI = uiCacheService.loadCache(stage, concernInfo.concernId);
    if (cachedUI) {
      cachedUI.formData = formData;
      uiCacheService.saveCache(cachedUI);
    }
  }
  
  // 前のステージへナビゲート
  if (stage === 'breakdown') {
    navigate('/concern/plan', { state });
  } else if (stage === 'plan') {
    navigate('/concern/capture', { state });
  } else if (stage === 'capture') {
    navigate('/concern/input', { state: { prefillConcern: concernText } });
  }
};

// JSX内にボタン追加
<div className="mb-6">
  <button
    onClick={handleBack}
    className="text-gray-500 hover:text-gray-700 mb-4 flex items-center"
  >
    ← 戻る
  </button>
  <h1 className="text-2xl font-bold text-gray-800 mb-2">
    {/* タイトル */}
  </h1>
</div>
```

**成功基準**:
- 戻るボタンが表示される
- クリックすると前のステージへ戻る
- 入力内容が保持される

**テスト方法**:
```typescript
// 1. capture画面でテキスト入力
// 2. 次へボタンでplan画面へ
// 3. plan画面でテキスト入力
// 4. 戻るボタンをクリック
// 5. capture画面に戻り、入力内容が復元されている
// 6. もう一度次へボタンでplan画面へ
// 7. plan画面の入力内容も復元されている
```

---

### ✅ タスク 3.5.11: Commit - DynamicThoughtScreen キャッシュ統合

**コミット内容**:
```bash
git add concern-app/src/components/screens/DynamicThoughtScreen.tsx
git commit -m "feat(phase2): Integrate UI cache in DynamicThoughtScreen

- Check cache before UI generation
- Save generated UI to cache
- Update cache on form data change
- Implement back button with cache preservation
- Restore form data from cache
- Ref: Phase 2 Step 3.5 - UI preservation"
```

---

### タスク 3.5.12: キャッシュクリアタイミング実装

**目標**: 関心事フロー完了時にキャッシュをクリア  
**ファイル**: `/concern-app/src/components/screens/DynamicThoughtScreen.tsx`

**実装内容**:
```typescript
// handleNext メソッド内、breakdownステージ完了時
} else if (stage === 'breakdown') {
  // Breakdownステージの結果を保存
  // ...既存の処理...
  
  // Phase 2 Step 3: タスク生成実行
  try {
    const generationResult = await taskGenerationService.generateTasksFromBreakdown();
    console.log('✅ タスク生成完了:', generationResult.tasks.length, '件');
    
    // Phase 2 Step 3.5: タスク生成完了後、キャッシュをクリア ⭐️
    const concernInfo = flowStateManager.getConcernInfo();
    if (concernInfo) {
      uiCacheService.clearCache(concernInfo.concernId);
      console.log('🗑️ UIキャッシュをクリアしました');
    }
    
    // タスク推奨画面へ遷移
    navigate('/tasks/recommend', { 
      state: { 
        ...state, 
        breakdownData: formData,
        generatedTasks: generationResult.tasks,
        concernId: generationResult.concernId
      } 
    });
  } catch (error) {
    // エラー処理...
  }
}
```

**成功基準**:
- フロー完了時にキャッシュがクリアされる
- 新しい関心事を開始時にクリーンな状態

**テスト方法**:
```typescript
// 1. 関心事フロー全体を実行（capture → plan → breakdown）
// 2. breakdown完了後、SessionStorageを確認
const stored = sessionStorage.getItem('uiGenerationCache');
console.log('Remaining caches:', JSON.parse(stored));
// 当該concernIdのキャッシュが削除されていることを確認

// 3. 新しい関心事を開始
// 4. 前回のキャッシュが残っていないことを確認
```

---

### タスク 3.5.13: ConcernInputScreen キャッシュクリア

**目標**: 新しい関心事開始時に全キャッシュをクリア  
**ファイル**: `/concern-app/src/components/screens/ConcernInputScreen.tsx`

**実装内容**:
```typescript
// import追加
import { uiCacheService } from '../../services/UIGenerationCacheService';

// handleNext メソッド内
const handleNext = async () => {
  if (concernText.trim().length >= 3) {
    try {
      // Phase 2 Step 3.5: 新しい関心事開始時に全キャッシュをクリア ⭐️
      uiCacheService.clearAllCaches();
      console.log('🗑️ 全UIキャッシュをクリアしました（新規関心事開始）');
      
      // セッション開始
      const sessionId = await sessionManager.startSession(concernText.trim());
      console.log('✅ セッション開始:', sessionId);
      
      // 既存の処理...
    } catch (error) {
      // エラー処理...
    }
  }
};
```

**成功基準**:
- 新しい関心事開始時に全キャッシュがクリアされる
- 前回のキャッシュが残らない

**テスト方法**:
```typescript
// 1. 関心事フローを途中まで実行（capture → plan）
// 2. SessionStorageにキャッシュが存在することを確認
// 3. ホームに戻って新しい関心事を開始
// 4. SessionStorageのキャッシュが全てクリアされることを確認
```

---

### ✅ タスク 3.5.14: Commit - キャッシュクリア処理

**コミット内容**:
```bash
git add concern-app/src/components/screens/DynamicThoughtScreen.tsx concern-app/src/components/screens/ConcernInputScreen.tsx
git commit -m "feat(phase2): Add cache clearing on flow completion

- Clear cache after breakdown completion
- Clear all caches on new concern start
- Prevent stale cache from interfering
- Ref: Phase 2 Step 3.5 - UI preservation"
```

---

### タスク 3.5.15: デバッグ用キャッシュ情報表示

**目標**: 開発環境でキャッシュ状態を確認できるUI  
**ファイル**: `/concern-app/src/components/screens/DynamicThoughtScreen.tsx`

**実装内容**:
```typescript
// 開発環境でのみキャッシュ情報を表示
{import.meta.env.DEV && (
  <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-4">
    <p className="text-xs font-mono">
      🔧 デバッグ情報:
    </p>
    <p className="text-xs font-mono">
      Stage: {stage} | 
      キャッシュ: {uiCacheService.loadCache(stage, flowStateManager.getConcernInfo()?.concernId || '') ? '✅' : '❌'}
    </p>
    <button
      onClick={() => {
        const concernInfo = flowStateManager.getConcernInfo();
        if (concernInfo) {
          uiCacheService.clearCache(concernInfo.concernId);
          window.location.reload();
        }
      }}
      className="text-xs text-yellow-700 hover:text-yellow-900 mt-1"
    >
      キャッシュをクリアして再読み込み
    </button>
  </div>
)}
```

**成功基準**:
- 開発環境でキャッシュ状態が表示される
- 手動でキャッシュクリア可能

**テスト方法**:
```typescript
// 開発環境（bun run dev）で画面を開く
// デバッグ情報が表示される
// キャッシュ状態を確認
// 「キャッシュをクリアして再読み込み」ボタンで強制再生成
```

---

### タスク 3.5.16: パフォーマンス検証

**目標**: キャッシュ有無でのパフォーマンス比較

**テストシナリオ**:

**ケース1: キャッシュなし（初回）**
1. 関心事を入力してcapture画面へ
2. UI生成開始から表示までの時間を計測
3. 期待値: 5-10秒

**ケース2: キャッシュあり（2回目）**
1. capture画面からplan画面へ進む
2. 戻るボタンでcapture画面に戻る
3. UI表示までの時間を計測
4. 期待値: < 500ms（0.5秒以内）

**計測方法**:
```typescript
// DynamicThoughtScreen.tsx の useEffect 内
const startTime = performance.now();

// キャッシュチェック
if (cachedUI) {
  const endTime = performance.now();
  console.log('⚡ キャッシュ復元時間:', (endTime - startTime).toFixed(2), 'ms');
  // 期待値: < 100ms
}

// UI生成完了後
const endTime = performance.now();
console.log('⏱️ UI生成時間:', (endTime - startTime).toFixed(2), 'ms');
// 期待値: 5000-10000ms
```

**成功基準**:
- [ ] キャッシュありの場合、500ms以内に表示
- [ ] キャッシュなしの場合、5-10秒で表示
- [ ] 入力内容が完全に復元される
- [ ] 戻る→進むを繰り返しても正常動作

---

### タスク 3.5.17: 統合テスト - フルフロー確認

**目標**: UI保持・入力保持機能の完全動作確認

**テストシナリオ**:

1. **関心事入力**
   - 「英語学習の継続」と入力
   - 次へボタンクリック

2. **Captureステージ**
   - UI生成（5-10秒）
   - テキストフィールドに「毎日30分学習したい」と入力
   - 次へボタンクリック

3. **Planステージ**
   - UI生成（5-10秒）
   - 計画を入力
   - **戻るボタンクリック** ⭐️

4. **Captureステージ（2回目）**
   - **即座に表示される（< 500ms）** ⭐️
   - **入力内容が復元されている** ⭐️
   - 再度次へボタンクリック

5. **Planステージ（2回目）**
   - **即座に表示される（< 500ms）** ⭐️
   - **入力内容が復元されている** ⭐️
   - 次へボタンクリック

6. **Breakdownステージ**
   - UI生成（5-10秒、初回のみ）
   - タスク分解を入力
   - 完了ボタンクリック

7. **タスク生成**
   - タスクが生成される
   - キャッシュがクリアされる
   - TaskRecommendationScreenへ遷移

8. **検証**
   - SessionStorageを確認
   - 当該concernIdのキャッシュが削除されている

**成功基準**:
- [ ] 戻るボタンで即座に前画面表示（< 500ms）
- [ ] 入力内容が完全に復元される
- [ ] 戻る→進むを繰り返しても正常動作
- [ ] フロー完了後、キャッシュがクリアされる
- [ ] 新しい関心事開始時、クリーンな状態

**検証データ**:
```typescript
// SessionStorageを確認
const cacheData = JSON.parse(sessionStorage.getItem('uiGenerationCache') || '{}');
console.log('Cache entries:', Object.keys(cacheData).length);
console.log('Cache details:', cacheData);

// 各キャッシュの内容を確認
Object.entries(cacheData).forEach(([key, entry]) => {
  console.log(`${key}:`, {
    stage: entry.cache.stage,
    hasFormData: !!entry.cache.formData,
    formDataKeys: Object.keys(entry.cache.formData || {}),
    expiresAt: entry.expiresAt
  });
});
```

---

### ✅ タスク 3.5.18: Commit - デバッグUI追加と最終テスト

**コミット内容**:
```bash
git add concern-app/src/components/screens/DynamicThoughtScreen.tsx
git commit -m "feat(phase2): Add debug UI for cache state and complete Step 3.5

- Add cache state display in development mode
- Add manual cache clear button
- Complete UI preservation and form data retention
- Performance: < 500ms for cached UI restoration
- Tested full flow with back navigation
- Ref: Phase 2 Step 3.5 - UI preservation (completed)"
```

---

## ✅ Step 3.5 完了基準チェックリスト

### 技術的完了基準

- [ ] UIGenerationCacheServiceが実装されている
- [ ] キャッシュの保存・読み込み・削除が動作する
- [ ] 戻るボタンが実装されている
- [ ] キャッシュがある場合、UI生成をスキップする
- [ ] フォーム入力内容がキャッシュに保存される
- [ ] キャッシュから入力内容が復元される
- [ ] フロー完了時にキャッシュがクリアされる
- [ ] TypeScriptコンパイルエラーなし

### パフォーマンス基準

- [ ] キャッシュありの場合、500ms以内に画面表示
- [ ] キャッシュなしの場合、5-10秒でUI生成
- [ ] 戻る→進むを10回繰り返しても正常動作
- [ ] メモリリークなし

### ユーザー体験基準

- [ ] 戻るボタンで即座に前画面が表示される
- [ ] 入力した内容が失われない
- [ ] スムーズなナビゲーション体験
- [ ] 不要なUI再生成が発生しない

---

## 📊 実装統計

| 項目 | 数値 |
|------|------|
| 新規作成ファイル | 2ファイル |
| 更新ファイル | 2ファイル |
| 総タスク数 | 18タスク |
| コミット数 | 4コミット |
| 推定実装時間 | 1-2日 |

---

## 🎯 次のステップ

Phase 2 Step 3.5完了後：
- **Step 4**: A/Bテスト機構（3-4日）
- **Step 5**: 固定UI版整備（3-4日）
- **Step 6**: 測定・ログシステム（2-3日）

---

**文書バージョン**: 1.0  
**対象**: LLM実装エージェント  
**作成日**: 2025年10月18日  
**参照**: `phase2_detailed_tasks.md` (Step 3)

