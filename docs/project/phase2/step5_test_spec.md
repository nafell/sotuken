# Phase 2 Step 5: A/Bテスト手動割り当て機構 - テスト仕様書

**作成日**: 2025年10月19日  
**バージョン**: 1.0.0  
**テスト担当**: AI Agent  

---

## 📋 目次

1. [テスト概要](#テスト概要)
2. [テスト環境](#テスト環境)
3. [テストカテゴリー](#テストカテゴリー)
4. [単体テスト](#単体テスト)
5. [統合テスト](#統合テスト)
6. [E2Eテスト](#e2eテスト)
7. [テストシナリオ](#テストシナリオ)
8. [性能テスト](#性能テスト)
9. [セキュリティテスト](#セキュリティテスト)
10. [テストチェックリスト](#テストチェックリスト)

---

## テスト概要

### テスト目的
Phase 2 Step 5で実装したA/Bテスト手動割り当て機構が、設計仕様通りに動作することを確認する。

### テスト対象
- サーバー側ExperimentService
- 管理者用API (`/admin/*`)
- クライアント側ClientExperimentService
- 条件別ルーティング（App.tsx）
- UnassignedScreen
- SettingsScreen
- AdminUserManagement

### テストレベル
1. **単体テスト（Unit Test）**: 個別のメソッド・関数のテスト
2. **統合テスト（Integration Test）**: コンポーネント間の連携テスト
3. **E2Eテスト（End-to-End Test）**: ユーザーフロー全体のテスト

### 成功基準
- ✅ 全単体テストが成功
- ✅ 全統合テストが成功
- ✅ 全E2Eシナリオが成功
- ✅ 未割り当てユーザーが適切に案内される
- ✅ 条件割り当て後に適切なUIが表示される
- ✅ デバッグ用機能が開発環境でのみ動作
- ✅ 管理者画面で割り当て・削除が正常動作

---

## テスト環境

### 開発環境
- OS: Linux 5.15.0-157-generic
- Node.js: v20.x
- Bun: v1.x
- ブラウザ: Chrome/Firefox最新版

### テストツール
- **サーバー側**: Bun Test（予定）
- **クライアント側**: Vitest（予定）
- **E2Eテスト**: Playwright（予定）
- **手動テスト**: ブラウザ・DevTools

### テストデータ
```typescript
// テスト用ユーザー
const testUsers = [
  { userId: 'test_user_001', name: 'テストユーザー1' },
  { userId: 'test_user_002', name: 'テストユーザー2' },
  { userId: 'test_user_003', name: 'テストユーザー3' },
];

// テスト用割り当て
const testAssignments = [
  { userId: 'test_user_001', condition: 'dynamic_ui' },
  { userId: 'test_user_002', condition: 'static_ui' },
  // test_user_003 は未割り当て
];
```

---

## テストカテゴリー

### 機能テスト
- [ ] ExperimentServiceの各メソッドが正常動作
- [ ] 管理者APIが正常動作
- [ ] ClientExperimentServiceが正常動作
- [ ] 条件別ルーティングが正常動作
- [ ] 各画面が正常表示

### 境界値テスト
- [ ] 未割り当てユーザー（condition: null）
- [ ] サーバーエラー時のフォールバック
- [ ] 不正な条件値（invalid condition）

### 異常系テスト
- [ ] ネットワークエラー
- [ ] APIタイムアウト
- [ ] 不正なリクエスト

### ユーザビリティテスト
- [ ] UnassignedScreen の視認性
- [ ] AdminUserManagement の操作性
- [ ] エラーメッセージの分かりやすさ

---

## 単体テスト

### 1. ExperimentService

#### 1.1 getCondition()

**テストケース1: 未割り当てユーザー**
```typescript
describe('ExperimentService.getCondition', () => {
  it('should return null condition for unassigned user', async () => {
    const service = new ExperimentService();
    const result = await service.getCondition('new_user_123');
    
    expect(result.userId).toBe('new_user_123');
    expect(result.condition).toBeNull();
    expect(result.assignedAt).toBeNull();
    expect(result.method).toBe('manual');
  });
});
```

**期待結果**:
- `condition` が `null`
- `assignedAt` が `null`
- `method` が `'manual'`
- `experimentId` が `'exp_2025_10'`

---

**テストケース2: 割り当て済みユーザー（キャッシュあり）**
```typescript
it('should return cached condition for assigned user', async () => {
  const service = new ExperimentService();
  
  // 事前に割り当て
  await service.assignConditionManually('user_001', 'dynamic_ui', 'admin');
  
  // 取得
  const result = await service.getCondition('user_001');
  
  expect(result.userId).toBe('user_001');
  expect(result.condition).toBe('dynamic_ui');
  expect(result.assignedAt).toBeInstanceOf(Date);
  expect(result.assignedBy).toBe('admin');
});
```

**期待結果**:
- `condition` が `'dynamic_ui'`
- `assignedAt` が Date型
- `assignedBy` が `'admin'`

---

#### 1.2 assignConditionManually()

**テストケース1: 正常な割り当て**
```typescript
it('should assign condition manually', async () => {
  const service = new ExperimentService();
  
  const result = await service.assignConditionManually(
    'user_001',
    'dynamic_ui',
    'admin',
    'テスト被験者1'
  );
  
  expect(result.userId).toBe('user_001');
  expect(result.condition).toBe('dynamic_ui');
  expect(result.assignedBy).toBe('admin');
  expect(result.note).toBe('テスト被験者1');
  expect(result.assignedAt).toBeInstanceOf(Date);
});
```

**期待結果**:
- 割り当て情報が正しく作成される
- キャッシュに保存される
- コンソールログが出力される

---

**テストケース2: 上書き割り当て**
```typescript
it('should overwrite existing assignment', async () => {
  const service = new ExperimentService();
  
  // 最初の割り当て
  await service.assignConditionManually('user_001', 'dynamic_ui', 'admin');
  
  // 上書き
  const result = await service.assignConditionManually('user_001', 'static_ui', 'admin2');
  
  expect(result.condition).toBe('static_ui');
  expect(result.assignedBy).toBe('admin2');
});
```

**期待結果**:
- 新しい条件で上書きされる

---

#### 1.3 getAllAssignments()

**テストケース1: 複数の割り当て取得**
```typescript
it('should return all assignments', async () => {
  const service = new ExperimentService();
  
  await service.assignConditionManually('user_001', 'dynamic_ui', 'admin');
  await service.assignConditionManually('user_002', 'static_ui', 'admin');
  
  const result = await service.getAllAssignments();
  
  expect(result).toHaveLength(2);
  expect(result[0].userId).toBe('user_001');
  expect(result[1].userId).toBe('user_002');
});
```

**期待結果**:
- 全割り当て情報が配列で返される

---

#### 1.4 getAssignmentCounts()

**テストケース1: 条件別カウント**
```typescript
it('should count assignments by condition', async () => {
  const service = new ExperimentService();
  
  await service.assignConditionManually('user_001', 'dynamic_ui', 'admin');
  await service.assignConditionManually('user_002', 'dynamic_ui', 'admin');
  await service.assignConditionManually('user_003', 'static_ui', 'admin');
  
  const result = await service.getAssignmentCounts();
  
  expect(result.dynamic_ui).toBe(2);
  expect(result.static_ui).toBe(1);
  expect(result.unassigned).toBe(0); // TODO: 正確な値は全ユーザー数取得後
});
```

**期待結果**:
- 条件別の人数が正しくカウントされる

---

#### 1.5 removeAssignment()

**テストケース1: 割り当て削除**
```typescript
it('should remove assignment', async () => {
  const service = new ExperimentService();
  
  await service.assignConditionManually('user_001', 'dynamic_ui', 'admin');
  
  await service.removeAssignment('user_001');
  
  const result = await service.getCondition('user_001');
  expect(result.condition).toBeNull();
});
```

**期待結果**:
- 割り当てが削除される
- 再取得時は未割り当て状態になる

---

### 2. ClientExperimentService

#### 2.1 fetchCondition()

**テストケース1: 正常な条件取得**
```typescript
it('should fetch condition from server', async () => {
  const service = ClientExperimentService.getInstance();
  
  // モック: /v1/config が dynamic_ui を返す
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      experimentId: 'exp_2025_10',
      experimentAssignment: {
        condition: 'dynamic_ui',
        assignedAt: '2025-10-19T03:00:00.000Z',
        method: 'manual'
      }
    })
  });
  
  const condition = await service.fetchCondition();
  
  expect(condition).toBe('dynamic_ui');
  expect(service.getCachedCondition()).toBe('dynamic_ui');
});
```

**期待結果**:
- サーバーから条件を取得
- キャッシュに保存される
- イベントログが記録される

---

**テストケース2: 未割り当てユーザー**
```typescript
it('should handle unassigned user', async () => {
  const service = ClientExperimentService.getInstance();
  
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      experimentAssignment: { condition: null }
    })
  });
  
  const condition = await service.fetchCondition();
  
  expect(condition).toBeNull();
  // 警告ログが出力される
});
```

**期待結果**:
- `null` が返される
- 警告ログが出力される

---

**テストケース3: ネットワークエラー時のフォールバック**
```typescript
it('should fallback to local DB on network error', async () => {
  const service = ClientExperimentService.getInstance();
  
  // ローカルDBに条件を保存
  await db.userProfile.put({
    userId: 'user_001',
    experimentCondition: 'static_ui'
  });
  
  // ネットワークエラーをシミュレート
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  
  const condition = await service.fetchCondition();
  
  expect(condition).toBe('static_ui');
});
```

**期待結果**:
- ローカルDBから条件を復元
- エラーログが出力される

---

#### 2.2 switchCondition() (デバッグ用)

**テストケース1: 開発環境での条件切り替え**
```typescript
it('should switch condition in dev environment', async () => {
  import.meta.env.DEV = true;
  
  const service = ClientExperimentService.getInstance();
  
  // dynamic_ui に切り替え
  await service.switchCondition('dynamic_ui');
  
  expect(service.getCachedCondition()).toBe('dynamic_ui');
  // ページリロードが呼ばれることを確認
  expect(window.location.reload).toHaveBeenCalled();
});
```

**期待結果**:
- 条件が切り替わる
- ローカルDBに保存される
- イベントログが記録される
- ページリロードが実行される

---

**テストケース2: 本番環境での実行拒否**
```typescript
it('should reject switch in production', async () => {
  import.meta.env.PROD = true;
  
  const service = ClientExperimentService.getInstance();
  const originalCondition = service.getCachedCondition();
  
  await service.switchCondition('static_ui');
  
  // 条件は変わらない
  expect(service.getCachedCondition()).toBe(originalCondition);
});
```

**期待結果**:
- 条件が変わらない
- エラーログが出力される

---

## 統合テスト

### 1. サーバー側統合テスト

#### 1.1 /v1/config と ExperimentService

**テストケース1: 未割り当てユーザーへの設定配布**
```typescript
it('should return config with null condition for unassigned user', async () => {
  const response = await fetch('http://localhost:3000/v1/config', {
    headers: { 'X-User-ID': 'new_user_999' }
  });
  
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(data.experimentAssignment.condition).toBeNull();
  expect(data.experimentId).toBe('exp_2025_10');
});
```

**期待結果**:
- ステータスコード 200
- `condition: null`
- `experimentId` が含まれる

---

**テストケース2: 割り当て済みユーザーへの設定配布**
```typescript
it('should return config with assigned condition', async () => {
  // 事前に割り当て
  await fetch('http://localhost:3000/admin/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user_001',
      condition: 'dynamic_ui',
      assignedBy: 'admin'
    })
  });
  
  // 設定取得
  const response = await fetch('http://localhost:3000/v1/config', {
    headers: { 'X-User-ID': 'user_001' }
  });
  
  const data = await response.json();
  
  expect(data.experimentAssignment.condition).toBe('dynamic_ui');
  expect(data.experimentAssignment.assignedBy).toBe('admin');
});
```

**期待結果**:
- `condition` が `'dynamic_ui'`
- `assignedBy` が `'admin'`

---

#### 1.2 管理者API統合テスト

**テストケース1: 割り当て → 取得 → 削除のフロー**
```typescript
it('should handle full assignment lifecycle', async () => {
  // 1. 割り当て
  const assignResponse = await fetch('http://localhost:3000/admin/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user_002',
      condition: 'static_ui',
      assignedBy: 'admin',
      note: 'テスト'
    })
  });
  expect(assignResponse.status).toBe(200);
  
  // 2. 取得
  const getResponse = await fetch('http://localhost:3000/admin/assignments');
  const getData = await getResponse.json();
  const assignment = getData.assignments.find(a => a.userId === 'user_002');
  expect(assignment.condition).toBe('static_ui');
  
  // 3. カウント確認
  const countResponse = await fetch('http://localhost:3000/admin/assignments/counts');
  const countData = await countResponse.json();
  expect(countData.static_ui).toBeGreaterThan(0);
  
  // 4. 削除
  const deleteResponse = await fetch('http://localhost:3000/admin/assignments/user_002', {
    method: 'DELETE'
  });
  expect(deleteResponse.status).toBe(200);
  
  // 5. 削除確認
  const getResponse2 = await fetch('http://localhost:3000/admin/assignments');
  const getData2 = await getResponse2.json();
  const assignment2 = getData2.assignments.find(a => a.userId === 'user_002');
  expect(assignment2).toBeUndefined();
});
```

**期待結果**:
- 全てのステップが成功する
- データの一貫性が保たれる

---

### 2. クライアント側統合テスト

#### 2.1 App.tsx と ClientExperimentService

**テストケース1: 未割り当てユーザーのルーティング**
```typescript
it('should show UnassignedScreen for unassigned user', async () => {
  // モック: サーバーがnullを返す
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      experimentAssignment: { condition: null }
    })
  });
  
  render(<App />);
  
  await waitFor(() => {
    expect(screen.getByText('実験条件の割り当て待ち')).toBeInTheDocument();
  });
});
```

**期待結果**:
- UnassignedScreenが表示される

---

**テストケース2: 動的UI条件のルーティング**
```typescript
it('should show DynamicUINavigator for dynamic_ui user', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      experimentAssignment: { condition: 'dynamic_ui' }
    })
  });
  
  render(<App />);
  
  await waitFor(() => {
    // DynamicUINavigatorの特徴的な要素が表示される
    expect(screen.getByText(/動的UI/)).toBeInTheDocument();
  });
});
```

**期待結果**:
- DynamicUINavigatorが表示される

---

**テストケース3: 固定UI条件のルーティング**
```typescript
it('should show StaticUINavigator for static_ui user', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      experimentAssignment: { condition: 'static_ui' }
    })
  });
  
  render(<App />);
  
  await waitFor(() => {
    // StaticUINavigatorの特徴的な要素が表示される
    expect(screen.getByText(/固定UI/)).toBeInTheDocument();
  });
});
```

**期待結果**:
- StaticUINavigatorが表示される

---

## E2Eテスト

### シナリオ1: 未割り当てユーザーから割り当てまでの完全フロー

**ステップ**:
1. 新規ユーザーとしてアプリにアクセス
2. UnassignedScreenが表示される
3. ユーザーIDをコピー
4. 管理者がAdminUserManagement画面にアクセス
5. ユーザーに「動的UI」を割り当て
6. ユーザーがページをリロード
7. DynamicUINavigatorが表示される

**期待結果**:
- ✅ UnassignedScreenが正しく表示される
- ✅ ユーザーIDがコピーできる
- ✅ 管理者画面で割り当てができる
- ✅ リロード後に動的UI版が表示される

---

### シナリオ2: 条件切り替え（デバッグ用）

**ステップ**:
1. 開発環境でアプリにアクセス（動的UI条件）
2. 設定画面を開く
3. 「🔧 デバッグ機能」セクションが表示される
4. 「🔄 条件を切り替え」ボタンをクリック
5. 警告ダイアログで「OK」
6. 自動的にリロード
7. 固定UI版が表示される

**期待結果**:
- ✅ デバッグセクションが開発環境でのみ表示される
- ✅ 警告ダイアログが表示される
- ✅ 条件が切り替わる
- ✅ リロード後に固定UI版が表示される

---

### シナリオ3: 管理者による複数ユーザー管理

**ステップ**:
1. 管理者がAdminUserManagement画面にアクセス
2. 統計サマリーが表示される（動的UI: 0名、固定UI: 0名、未割り当て: 1名）
3. user_001に「動的UI」を割り当て（メモ: 被験者A）
4. user_002に「固定UI」を割り当て（メモ: 被験者B）
5. user_003に「動的UI」を割り当て
6. 統計サマリーが更新される（動的UI: 2名、固定UI: 1名、未割り当て: 0名）
7. user_003の割り当てを削除
8. 統計サマリーが更新される（動的UI: 1名、固定UI: 1名、未割り当て: 1名）

**期待結果**:
- ✅ 全ての割り当て操作が成功する
- ✅ 統計サマリーがリアルタイムに更新される
- ✅ メモが正しく保存・表示される
- ✅ 削除が正常に動作する

---

### シナリオ4: SettingsScreen統計情報表示

**ステップ**:
1. ユーザーがいくつかタスクを作成・着手・完了
2. 設定画面を開く
3. 統計情報が表示される

**期待結果**:
- ✅ タスク作成数が正しく表示される
- ✅ 着手回数が正しく表示される
- ✅ 完了回数が正しく表示される
- ✅ 平均スッキリ度が正しく計算・表示される

---

## テストシナリオ

### 手動テストシナリオ一覧

| ID | シナリオ名 | 優先度 | 実施者 | 結果 |
|----|----------|--------|--------|------|
| TS-001 | 未割り当てユーザーの初回アクセス | 高 | - | - |
| TS-002 | 管理者による条件割り当て | 高 | - | - |
| TS-003 | 割り当て後のユーザーアクセス | 高 | - | - |
| TS-004 | デバッグ用条件切り替え | 中 | - | - |
| TS-005 | 本番環境でのデバッグ機能非表示 | 中 | - | - |
| TS-006 | ネットワークエラー時のフォールバック | 中 | - | - |
| TS-007 | 複数ユーザーの同時割り当て | 低 | - | - |
| TS-008 | 割り当て変更（上書き） | 低 | - | - |
| TS-009 | 割り当て削除とリセット | 中 | - | - |
| TS-010 | 統計情報の精度確認 | 低 | - | - |

---

### 詳細テストシナリオ: TS-001

**シナリオ**: 未割り当てユーザーの初回アクセス

**前提条件**:
- サーバーが起動している
- クライアントが起動している
- ブラウザのlocalStorageがクリアされている

**テスト手順**:
1. ブラウザで `http://localhost:5173` にアクセス
2. ローディング画面が表示されることを確認
3. UnassignedScreenが表示されることを確認
4. ユーザーIDが表示されることを確認
5. 「📋 IDをコピー」ボタンをクリック
6. クリップボードにユーザーIDがコピーされることを確認（alert表示）
7. DevToolsのlocalStorageを確認、`anonymousUserId`が保存されていることを確認
8. 「🔄 再読み込み」ボタンをクリック
9. ページがリロードされることを確認
10. 再度UnassignedScreenが表示されることを確認（同じユーザーID）

**期待結果**:
- ✅ UnassignedScreenが適切に表示される
- ✅ ユーザーIDが自動生成される
- ✅ コピー機能が動作する
- ✅ リロード機能が動作する
- ✅ ユーザーIDが永続化される

**実際の結果**: （テスト実施後に記入）

**合否**: （テスト実施後に記入）

---

### 詳細テストシナリオ: TS-002

**シナリオ**: 管理者による条件割り当て

**前提条件**:
- サーバーが起動している
- TS-001でユーザーIDが生成されている

**テスト手順**:
1. 新しいブラウザタブで `http://localhost:5173/admin/users` にアクセス（TODO: 実際のパス確認）
   - または AdminUserManagement.tsx を直接開く
2. 統計サマリーが表示されることを確認
3. ユーザー一覧テーブルが表示されることを確認
4. TS-001で生成されたユーザーIDが一覧に表示されることを確認
5. 「動的UI」ボタンをクリック
6. メモ入力ダイアログが表示されることを確認
7. 「テスト被験者1」と入力して「OK」
8. 成功メッセージが表示されることを確認
9. ユーザーの条件が「動的UI」に更新されることを確認
10. メモが「テスト被験者1」と表示されることを確認
11. 統計サマリーが更新されることを確認（動的UI: 1名）

**期待結果**:
- ✅ 管理者画面が正常に表示される
- ✅ ユーザー一覧が表示される
- ✅ 割り当てが成功する
- ✅ UIが即座に更新される
- ✅ メモが保存・表示される

**実際の結果**: （テスト実施後に記入）

**合否**: （テスト実施後に記入）

---

## 性能テスト

### 1. 条件取得の応答時間

**テスト内容**: `/v1/config` APIの応答時間を測定

**目標値**: 100ms以内

**測定方法**:
```bash
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/v1/config \
  -H "X-User-ID: test_user_001"
```

**期待結果**:
- ✅ 平均応答時間 < 100ms
- ✅ 99パーセンタイル < 200ms

---

### 2. 管理者API応答時間

**テスト内容**: `/admin/assignments` APIの応答時間を測定

**目標値**: 100ms以内

**期待結果**:
- ✅ GET /admin/assignments < 100ms
- ✅ POST /admin/assignments < 150ms
- ✅ DELETE /admin/assignments/:userId < 100ms

---

### 3. キャッシュ効率

**テスト内容**: ClientExperimentServiceのキャッシュヒット率を確認

**測定方法**:
1. 初回アクセス時の`fetchCondition()`時間を測定
2. 2回目以降の`getCachedCondition()`時間を測定
3. キャッシュヒット時は即座に返る（< 1ms）ことを確認

**期待結果**:
- ✅ キャッシュヒット時は即座に返る
- ✅ ネットワークアクセスが発生しない

---

## セキュリティテスト

### 1. 管理者API認証なしアクセス（脆弱性）

**テスト内容**: 認証なしで管理者APIにアクセスできることを確認

**現状**:
- ⚠️ 認証・認可機構が未実装
- ⚠️ 誰でも管理者APIにアクセス可能

**リスク**: 高

**対策**: Phase 2 Step 6以降で認証機構を実装

---

### 2. XSS対策

**テスト内容**: 割り当て時のメモ欄にスクリプトを注入

**テスト手順**:
1. 管理者画面で割り当て時にメモ欄に `<script>alert('XSS')</script>` を入力
2. ユーザー一覧を表示
3. スクリプトが実行されないことを確認

**期待結果**:
- ✅ スクリプトがエスケープされる
- ✅ テキストとして表示される

---

### 3. CSRF対策

**テスト内容**: CSRF攻撃の可能性を確認

**現状**:
- ⚠️ CSRF対策なし

**リスク**: 中

**対策**: Phase 2 Step 6以降でCSRFトークンを実装

---

## テストチェックリスト

### サーバー側

- [ ] ExperimentService.getCondition() - 未割り当てユーザー
- [ ] ExperimentService.getCondition() - 割り当て済みユーザー
- [ ] ExperimentService.assignConditionManually() - 正常な割り当て
- [ ] ExperimentService.assignConditionManually() - 上書き割り当て
- [ ] ExperimentService.getAllAssignments() - 複数割り当て取得
- [ ] ExperimentService.getAssignmentCounts() - 条件別カウント
- [ ] ExperimentService.removeAssignment() - 削除
- [ ] GET /v1/config - 未割り当てユーザー
- [ ] GET /v1/config - 割り当て済みユーザー
- [ ] GET /admin/assignments - 全割り当て取得
- [ ] GET /admin/assignments/counts - カウント取得
- [ ] POST /admin/assignments - 正常な割り当て
- [ ] POST /admin/assignments - バリデーションエラー
- [ ] DELETE /admin/assignments/:userId - 削除成功
- [ ] DELETE /admin/assignments/:userId - 存在しないユーザー

### クライアント側

- [ ] ClientExperimentService.fetchCondition() - 正常取得
- [ ] ClientExperimentService.fetchCondition() - 未割り当て
- [ ] ClientExperimentService.fetchCondition() - ネットワークエラー
- [ ] ClientExperimentService.getCachedCondition() - キャッシュ取得
- [ ] ClientExperimentService.switchCondition() - 開発環境での切り替え
- [ ] ClientExperimentService.switchCondition() - 本番環境での拒否
- [ ] App.tsx - 未割り当てユーザーのルーティング
- [ ] App.tsx - 動的UI条件のルーティング
- [ ] App.tsx - 固定UI条件のルーティング
- [ ] App.tsx - ローディング状態
- [ ] UnassignedScreen - 表示
- [ ] UnassignedScreen - ユーザーIDコピー
- [ ] UnassignedScreen - 再読み込み
- [ ] SettingsScreen - ユーザーID表示
- [ ] SettingsScreen - 実験条件表示
- [ ] SettingsScreen - 統計情報表示
- [ ] SettingsScreen - デバッグ機能（開発環境のみ）
- [ ] AdminUserManagement - データ読み込み
- [ ] AdminUserManagement - 統計サマリー表示
- [ ] AdminUserManagement - ユーザー一覧表示
- [ ] AdminUserManagement - 条件割り当て
- [ ] AdminUserManagement - 割り当て削除

### E2Eシナリオ

- [ ] シナリオ1: 未割り当てユーザーから割り当てまでの完全フロー
- [ ] シナリオ2: 条件切り替え（デバッグ用）
- [ ] シナリオ3: 管理者による複数ユーザー管理
- [ ] シナリオ4: SettingsScreen統計情報表示

### 境界値・異常系

- [ ] 不正な条件値（'invalid_condition'）の処理
- [ ] 存在しないユーザーIDへの割り当て
- [ ] ネットワークタイムアウト時の挙動
- [ ] サーバーダウン時の挙動
- [ ] localStorageが無効な場合の挙動

### 性能

- [ ] /v1/config の応答時間（< 100ms）
- [ ] /admin/assignments の応答時間（< 100ms）
- [ ] キャッシュヒット時の取得時間（< 1ms）

### セキュリティ

- [ ] 管理者API認証（現状: 未実装）
- [ ] XSS対策（メモ欄）
- [ ] CSRF対策（現状: 未実装）

---

## テスト実施記録

### テスト実施日: （記入予定）

**テスト実施者**: （記入予定）

**テスト環境**:
- サーバー: （記入予定）
- クライアント: （記入予定）
- ブラウザ: （記入予定）

### テスト結果サマリー

| カテゴリー | 合格 | 不合格 | 未実施 |
|----------|------|--------|--------|
| サーバー側単体テスト | - | - | - |
| クライアント側単体テスト | - | - | - |
| 統合テスト | - | - | - |
| E2Eテスト | - | - | - |
| 性能テスト | - | - | - |
| セキュリティテスト | - | - | - |

### 不具合一覧

| ID | 重要度 | 内容 | 状態 | 担当者 |
|----|--------|------|------|--------|
| - | - | - | - | - |

---

## 付録: テストデータ準備

### テストユーザー作成スクリプト

```bash
#!/bin/bash
# test-users-setup.sh

SERVER_URL="http://localhost:3000"

# テストユーザー1: 動的UI
curl -X POST "$SERVER_URL/admin/assignments" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_001",
    "condition": "dynamic_ui",
    "assignedBy": "test_admin",
    "note": "テストユーザー1 - 動的UI"
  }'

# テストユーザー2: 固定UI
curl -X POST "$SERVER_URL/admin/assignments" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_002",
    "condition": "static_ui",
    "assignedBy": "test_admin",
    "note": "テストユーザー2 - 固定UI"
  }'

# テストユーザー3: 未割り当て（割り当てしない）

echo "テストユーザー作成完了"
```

### テストデータクリーンアップスクリプト

```bash
#!/bin/bash
# test-users-cleanup.sh

SERVER_URL="http://localhost:3000"

# テストユーザー削除
curl -X DELETE "$SERVER_URL/admin/assignments/test_user_001"
curl -X DELETE "$SERVER_URL/admin/assignments/test_user_002"
curl -X DELETE "$SERVER_URL/admin/assignments/test_user_003"

echo "テストデータクリーンアップ完了"
```

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**参照**: `specs/project/phase2/step5_implementation_spec.md`  
**最終更新**: 2025年10月19日

