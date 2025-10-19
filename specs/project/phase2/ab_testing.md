# Phase 2 A/Bテスト機構仕様

**作成日**: 2025年10月18日  
**最終更新**: 2025年10月19日  
**研究目標**: 動的UI vs 固定UIの有用性比較

---

## 📋 A/Bテスト概要

### 研究仮説
**動的UI（LLM生成UI）は、固定UI（静的デザイン）と比較して、タスクへの着手率が高く、認知負荷軽減効果（スッキリ度）が大きい。**

### 実験設計

#### 独立変数（操作変数）
- **UI条件**: dynamic_ui vs static_ui

#### 従属変数（測定変数）
1. **主要指標**: タスクへの着手率
   - 計算式: `task_action_started / task_recommendation_shown`
2. **副次指標**: 認知負荷軽減効果（スッキリ度）
   - 計算式: 平均 `clarityImprovement` (1-3)

#### 統制変数
- タスク推奨ロジック（同じスコアリング式を使用）
- 行動報告ボタン（両条件で同じ）
- スッキリ度測定UI（両条件で同じ）

#### サンプルサイズ
- **想定被験者数**: 5名程度（少人数研究）
- **割り当て**: 手動で均等割り当て（dynamic_ui: 2-3名、static_ui: 2-3名）

---

## 🎯 実験条件の違い

### 動的UI条件（dynamic_ui）

```
┌─────────────────────────────────────────────┐
│                                             │
│  [思考整理フロー]                           │
│    DynamicThoughtScreen (capture/plan/...)  │
│    - LLM生成UI（DSL → UIRenderer）          │
│    - UIパターンが毎回変化                   │
│    - カスタムウィジェット使用可能           │
│                                             │
│  [タスク推奨]                               │
│    TaskRecommendationScreen                 │
│    - LLM生成TaskCard（variant・saliency）   │
│    - 動的レイアウト・配色                   │
│                                             │
│  [行動報告・スッキリ度測定]                 │
│    ActionReportModal（共通）                │
│    ClarityFeedbackModal（共通）             │
│                                             │
└─────────────────────────────────────────────┘
```

### 固定UI条件（static_ui）

```
┌─────────────────────────────────────────────┐
│                                             │
│  [思考整理フロー]                           │
│    ConcernInputScreen → CategorySelection...│
│    - 固定デザインテンプレート               │
│    - UIパターン不変                         │
│    - 標準ウィジェットのみ                   │
│                                             │
│  [タスク推奨]                               │
│    StaticTaskRecommendationScreen           │
│    - 固定デザインTaskCard                   │
│    - 静的レイアウト・配色                   │
│                                             │
│  [行動報告・スッキリ度測定]                 │
│    ActionReportModal（共通）                │
│    ClarityFeedbackModal（共通）             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔢 実験条件割り当て方式

### 採用方式: 手動割り当て（推奨）⭐️

**選定理由**:
- 被験者数が少ない（5名程度）ため、自動割り当てでは上振れ・下振れのリスクが高い
- 研究者が各条件に均等に割り当てることで、バランスの取れたデータ収集が可能
- 被験者の属性（技術スキル、使用頻度等）を考慮した割り当てが可能

**運用フロー**:

```
1. 被験者登録
   ↓
2. 管理者が AdminUserManagement 画面で条件を手動割り当て
   ↓
3. 被験者がアプリにアクセス
   ↓
4. サーバーから割り当てられた条件を取得
   ↓
5. 条件に応じたUIを表示
```

**実装**:

```typescript
// /server/src/services/ExperimentService.ts
class ExperimentService {
  /**
   * 管理者が特定ユーザーに条件を手動割り当て
   */
  async assignConditionManually(
    userId: string,
    condition: 'dynamic_ui' | 'static_ui',
    assignedBy: string,
    note?: string
  ): Promise<void> {
    const assignment: ExperimentAssignment = {
      userId,
      condition,
      assignedAt: new Date(),
      method: 'manual',
      experimentId: this.experimentId,
      assignedBy,
      note
    };
    
    // データベースに保存
    await this.saveAssignment(assignment);
  }
  
  /**
   * 全ユーザーの割り当て状況を取得
   */
  async getAllAssignments(): Promise<ExperimentAssignment[]> {
    const results = await db.query(
      'SELECT * FROM experiment_assignments WHERE experiment_id = ? ORDER BY assigned_at DESC',
      [this.experimentId]
    );
    
    return results;
  }
  
  /**
   * 条件別の人数を取得
   */
  async getAssignmentCounts(): Promise<{ dynamic_ui: number; static_ui: number; unassigned: number }> {
    const counts = await db.query(
      'SELECT condition, COUNT(*) as count FROM experiment_assignments WHERE experiment_id = ? GROUP BY condition',
      [this.experimentId]
    );
    
    const dynamicCount = counts.find(c => c.condition === 'dynamic_ui')?.count || 0;
    const staticCount = counts.find(c => c.condition === 'static_ui')?.count || 0;
    
    // 登録済みユーザー数を取得
    const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const unassignedCount = totalUsers[0].count - dynamicCount - staticCount;
    
    return {
      dynamic_ui: dynamicCount,
      static_ui: staticCount,
      unassigned: unassignedCount
    };
  }
}
```

**メリット**:
- 被験者数のバランスを完全制御
- 被験者属性を考慮した割り当て可能
- 研究計画に沿った柔軟な運用

**デメリット**:
- 管理者の手作業が必要
- 自動化されていない

---

## 🏗️ 実装アーキテクチャ

### サーバー側実装

```typescript
// /server/src/services/ExperimentService.ts

export interface ExperimentAssignment {
  userId: string;
  condition: 'dynamic_ui' | 'static_ui' | null;
  assignedAt: Date | null;
  method: 'manual';
  experimentId: string;
  assignedBy?: string;  // 割り当てを実施した管理者ID
  note?: string;        // 割り当て時のメモ
}

export class ExperimentService {
  private experimentId: string = 'exp_2025_10';
  
  /**
   * ユーザーの実験条件を取得（手動割り当て済みの場合のみ返す）
   */
  async getCondition(userId: string): Promise<ExperimentAssignment | null> {
    const assignment = await this.getExistingAssignment(userId);
    
    if (!assignment) {
      // 未割り当ての場合はnullを返す（デフォルト条件なし）
      return {
        userId,
        condition: null,
        assignedAt: null,
        method: 'manual',
        experimentId: this.experimentId
      };
    }
    
    return assignment;
  }
  
  /**
   * 管理者が条件を手動割り当て
   */
  async assignConditionManually(
    userId: string,
    condition: 'dynamic_ui' | 'static_ui',
    assignedBy: string,
    note?: string
  ): Promise<ExperimentAssignment> {
    // 既存の割り当てをチェック
    const existing = await this.getExistingAssignment(userId);
    
    if (existing) {
      // 更新
      await db.query(
        'UPDATE experiment_assignments SET condition = ?, assigned_by = ?, note = ?, assigned_at = ? WHERE user_id = ? AND experiment_id = ?',
        [condition, assignedBy, note, new Date(), userId, this.experimentId]
      );
    } else {
      // 新規作成
      await db.query(
        'INSERT INTO experiment_assignments (user_id, condition, assigned_at, method, experiment_id, assigned_by, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, condition, new Date(), 'manual', this.experimentId, assignedBy, note]
      );
    }
    
    return {
      userId,
      condition,
      assignedAt: new Date(),
      method: 'manual',
      experimentId: this.experimentId,
      assignedBy,
      note
    };
  }
  
  /**
   * 既存の割り当てを取得
   */
  private async getExistingAssignment(userId: string): Promise<ExperimentAssignment | null> {
    const result = await db.query(
      'SELECT * FROM experiment_assignments WHERE user_id = ? AND experiment_id = ?',
      [userId, this.experimentId]
    );
    
    return result[0] || null;
  }
  
  /**
   * 全ユーザーの割り当て状況を取得（管理画面用）
   */
  async getAllAssignments(): Promise<ExperimentAssignment[]> {
    const results = await db.query(
      'SELECT * FROM experiment_assignments WHERE experiment_id = ? ORDER BY assigned_at DESC',
      [this.experimentId]
    );
    
    return results;
  }
  
  /**
   * 条件別の人数を取得（管理画面用）
   */
  async getAssignmentCounts(): Promise<{
    dynamic_ui: number;
    static_ui: number;
    unassigned: number;
  }> {
    const counts = await db.query(
      `SELECT condition, COUNT(*) as count 
       FROM experiment_assignments 
       WHERE experiment_id = ? 
       GROUP BY condition`,
      [this.experimentId]
    );
    
    const dynamicCount = counts.find(c => c.condition === 'dynamic_ui')?.count || 0;
    const staticCount = counts.find(c => c.condition === 'static_ui')?.count || 0;
    
    // 全ユーザー数を取得
    const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const assignedCount = dynamicCount + staticCount;
    const unassignedCount = totalUsers[0].count - assignedCount;
    
    return {
      dynamic_ui: dynamicCount,
      static_ui: staticCount,
      unassigned: unassignedCount
    };
  }
  
  /**
   * 割り当てを削除（リセット用）
   */
  async removeAssignment(userId: string): Promise<void> {
    await db.query(
      'DELETE FROM experiment_assignments WHERE user_id = ? AND experiment_id = ?',
      [userId, this.experimentId]
    );
  }
}
```

---

### クライアント側実装

```typescript
// /concern-app/src/services/ExperimentService.ts
export class ClientExperimentService {
  private static instance: ClientExperimentService | null = null;
  private condition: 'dynamic_ui' | 'static_ui' | null = null;
  
  static getInstance(): ClientExperimentService {
    if (!ClientExperimentService.instance) {
      ClientExperimentService.instance = new ClientExperimentService();
    }
    return ClientExperimentService.instance;
  }
  
  /**
   * 実験条件を取得（サーバーから）
   */
  async fetchCondition(): Promise<'dynamic_ui' | 'static_ui' | null> {
    if (this.condition !== null) {
      return this.condition;
    }
    
    try {
      // `/v1/config` APIから取得
      const config = await apiService.getConfig();
      
      this.condition = config.experimentAssignment.condition;
      
      if (this.condition === null) {
        // 未割り当ての場合
        console.warn('実験条件が未割り当てです。管理者による割り当てを待ってください。');
        return null;
      }
      
      // ローカルDBに保存
      await db.userProfile.update(userId, {
        experimentCondition: this.condition,
        experimentAssignedAt: config.experimentAssignment.assignedAt 
          ? new Date(config.experimentAssignment.assignedAt) 
          : null
      });
      
      // イベント記録
      await eventLogger.log({
        eventType: 'experiment_condition_assigned',
        metadata: {
          experimentId: config.experimentId,
          condition: this.condition,
          assignmentMethod: config.experimentAssignment.method
        }
      });
      
      return this.condition;
      
    } catch (error) {
      console.error('Failed to fetch experiment condition:', error);
      
      // フォールバック: ローカルDBから取得
      const userProfile = await db.userProfile.toCollection().first();
      if (userProfile?.experimentCondition) {
        this.condition = userProfile.experimentCondition;
        return this.condition;
      }
      
      // 条件未割り当て
      return null;
    }
  }
  
  /**
   * キャッシュされた条件を取得
   */
  getCachedCondition(): 'dynamic_ui' | 'static_ui' | null {
    return this.condition;
  }
  
  /**
   * 条件を手動切り替え（ユーザー側デバッグ用）
   * 注意: 本番環境では使用禁止。管理画面で割り当てを変更すること。
   */
  async switchCondition(newCondition: 'dynamic_ui' | 'static_ui'): Promise<void> {
    const previousCondition = this.condition;
    this.condition = newCondition;
    
    // ローカルDB更新
    await db.userProfile.update(userId, {
      experimentCondition: newCondition,
      conditionOverriddenByUser: true
    });
    
    // イベント記録
    await eventLogger.log({
      eventType: 'experiment_condition_switched',
      metadata: {
        previousCondition,
        newCondition,
        reason: 'user_manual_switch_debug'
      }
    });
    
    // ページリロードを促す
    window.location.reload();
  }
}

export const experimentService = ClientExperimentService.getInstance();
```

---

### App.tsx での条件別ルーティング

```typescript
// /concern-app/src/App.tsx
import { experimentService } from './services/ExperimentService';

function App() {
  const [condition, setCondition] = useState<'dynamic_ui' | 'static_ui' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // アプリ起動時に実験条件を取得
    experimentService.fetchCondition()
      .then(setCondition)
      .finally(() => setIsLoading(false));
  }, []);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // 未割り当ての場合は待機画面を表示
  if (condition === null) {
    return <UnassignedScreen />;
  }
  
  return (
    <Router>
      {condition === 'dynamic_ui' ? (
        <DynamicUINavigator />
      ) : (
        <StaticUINavigator />
      )}
    </Router>
  );
}

// 未割り当てユーザー用の画面
function UnassignedScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          実験条件の割り当て待ち
        </h1>
        <p className="text-gray-600 mb-6">
          あなたのユーザーIDはまだ実験条件に割り当てられていません。
          研究者による割り当てが完了するまでお待ちください。
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg"
        >
          🔄 再読み込み
        </button>
      </div>
    </div>
  );
}

// 動的UI版ナビゲーター
function DynamicUINavigator() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      
      {/* 思考整理フロー（動的UI版） */}
      <Route path="/concern/capture" element={<DynamicThoughtScreen stage="capture" />} />
      <Route path="/concern/plan" element={<DynamicThoughtScreen stage="plan" />} />
      <Route path="/concern/breakdown" element={<DynamicThoughtScreen stage="breakdown" />} />
      
      {/* タスク推奨（動的UI版） */}
      <Route path="/tasks/recommend" element={<TaskRecommendationScreen />} />
      <Route path="/tasks" element={<TaskListScreen />} />
      <Route path="/tasks/create" element={<TaskCreateScreen />} />
      
      {/* 設定 */}
      <Route path="/settings" element={<SettingsScreen />} />
    </Routes>
  );
}

// 固定UI版ナビゲーター
function StaticUINavigator() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      
      {/* 思考整理フロー（固定UI版） */}
      <Route path="/concern/input" element={<ConcernInputScreen />} />
      <Route path="/concern/level" element={<ConcernLevelScreen />} />
      <Route path="/concern/category" element={<CategorySelectionScreen />} />
      <Route path="/concern/approach" element={<ApproachScreen />} />
      <Route path="/concern/breakdown" element={<BreakdownScreen />} />
      
      {/* タスク推奨（固定UI版） */}
      <Route path="/tasks/recommend" element={<StaticTaskRecommendationScreen />} />
      <Route path="/tasks" element={<TaskListScreen />} />
      <Route path="/tasks/create" element={<TaskCreateScreen />} />
      
      {/* 設定 */}
      <Route path="/settings" element={<SettingsScreen />} />
    </Routes>
  );
}
```

---

## 🛠️ 管理者用UI: ユーザー管理画面

### AdminUserManagement 画面設計

管理者が被験者の実験条件を手動で割り当てるための画面です。

```tsx
// /concern-app/src/screens/AdminUserManagement.tsx
export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<ExperimentAssignment[]>([]);
  const [counts, setCounts] = useState<AssignmentCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 全ユーザー一覧を取得
      const usersData = await apiService.getAllUsers();
      setUsers(usersData);
      
      // 割り当て状況を取得
      const assignmentsData = await apiService.getAllAssignments();
      setAssignments(assignmentsData);
      
      // 条件別の人数を取得
      const countsData = await apiService.getAssignmentCounts();
      setCounts(countsData);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAssign = async (userId: string, condition: 'dynamic_ui' | 'static_ui') => {
    const note = prompt('割り当てメモ（オプション）:');
    
    try {
      await apiService.assignConditionManually(userId, condition, 'admin', note || undefined);
      await loadData();  // データ再読み込み
      alert(`ユーザー ${userId} を「${condition === 'dynamic_ui' ? '動的UI' : '固定UI'}」に割り当てました`);
    } catch (error) {
      console.error('割り当てエラー:', error);
      alert('割り当てに失敗しました');
    }
  };
  
  const handleRemove = async (userId: string) => {
    if (!confirm('この割り当てを削除しますか？')) return;
    
    try {
      await apiService.removeAssignment(userId);
      await loadData();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };
  
  if (isLoading) {
    return <div className="p-6">読み込み中...</div>;
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">実験条件管理</h1>
      
      {/* 統計サマリー */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">動的UI群</p>
          <p className="text-3xl font-bold text-blue-600">{counts?.dynamic_ui || 0}名</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">固定UI群</p>
          <p className="text-3xl font-bold text-green-600">{counts?.static_ui || 0}名</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">未割り当て</p>
          <p className="text-3xl font-bold text-gray-600">{counts?.unassigned || 0}名</p>
        </div>
      </div>
      
      {/* ユーザー一覧テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ユーザーID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                実験条件
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                割り当て日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                メモ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => {
              const assignment = assignments.find(a => a.userId === user.userId);
              
              return (
                <tr key={user.userId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {user.userId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {assignment ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        assignment.condition === 'dynamic_ui' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {assignment.condition === 'dynamic_ui' ? '動的UI' : '固定UI'}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        未割り当て
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment?.assignedAt 
                      ? new Date(assignment.assignedAt).toLocaleString('ja-JP') 
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {assignment?.note || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssign(user.userId, 'dynamic_ui')}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                      >
                        動的UI
                      </button>
                      <button
                        onClick={() => handleAssign(user.userId, 'static_ui')}
                        className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                      >
                        固定UI
                      </button>
                      {assignment && (
                        <button
                          onClick={() => handleRemove(user.userId)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* 操作ガイド */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ 運用ガイド</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 被験者を均等に割り当ててください（動的UI: 2-3名、固定UI: 2-3名）</li>
          <li>• 割り当て後、被験者にアプリをリロードしてもらってください</li>
          <li>• 割り当て変更は慎重に行ってください（データの一貫性のため）</li>
        </ul>
      </div>
    </div>
  );
};
```

### 管理者用API実装

```typescript
// /server/src/routes/admin.ts
import { Hono } from 'hono';
import { ExperimentService } from '../services/ExperimentService';

const admin = new Hono();
const experimentService = new ExperimentService();

/**
 * 全ユーザーの割り当て状況を取得
 * GET /admin/assignments
 */
admin.get('/assignments', async (c) => {
  try {
    const assignments = await experimentService.getAllAssignments();
    return c.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * 条件別の人数を取得
 * GET /admin/assignments/counts
 */
admin.get('/assignments/counts', async (c) => {
  try {
    const counts = await experimentService.getAssignmentCounts();
    return c.json(counts);
  } catch (error) {
    console.error('Error fetching counts:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * 条件を手動割り当て
 * POST /admin/assignments
 */
admin.post('/assignments', async (c) => {
  try {
    const { userId, condition, assignedBy, note } = await c.req.json();
    
    if (!userId || !condition || !assignedBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    if (condition !== 'dynamic_ui' && condition !== 'static_ui') {
      return c.json({ error: 'Invalid condition' }, 400);
    }
    
    const assignment = await experimentService.assignConditionManually(
      userId,
      condition,
      assignedBy,
      note
    );
    
    return c.json({ success: true, assignment });
  } catch (error) {
    console.error('Error assigning condition:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * 割り当てを削除
 * DELETE /admin/assignments/:userId
 */
admin.delete('/assignments/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    await experimentService.removeAssignment(userId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error removing assignment:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default admin;
```

---

## 🧪 ユーザーテスト計画

### 参加者

**人数**: 5名程度

**割り当て**:
- **動的UI群**: 2-3名
- **固定UI群**: 2-3名

### 期間

**テスト期間**: 1週間

**使用頻度**: ユーザーのペースに任せる（強制なし）

### データ収集

**定量データ**:
- 着手率
- スッキリ度平均
- タスク作成数
- セッション数

**定性データ**:
- インタビュー（テスト終了後）
- 自由記述フィードバック

---

## 📊 分析手法

### 主要指標の比較

```typescript
// 着手率の比較
const engagementRate_dynamic = calculateEngagementRate('dynamic_ui');
const engagementRate_static = calculateEngagementRate('static_ui');

const improvement = (engagementRate_dynamic - engagementRate_static) / engagementRate_static * 100;

console.log(`着手率改善: ${improvement.toFixed(1)}%`);
```

### 統計的検定

**検定方法**: 二標本t検定（小サンプルサイズのため）

```python
# Python (scipy)
from scipy import stats

# 動的UI群の着手率
dynamic_rates = [0.75, 0.80, 0.70]  # 各ユーザー

# 固定UI群の着手率
static_rates = [0.60, 0.55, 0.65]  # 各ユーザー

# t検定
t_stat, p_value = stats.ttest_ind(dynamic_rates, static_rates)

print(f"t統計量: {t_stat:.3f}")
print(f"p値: {p_value:.3f}")

if p_value < 0.05:
    print("有意差あり（p < 0.05）")
```

---

## 🛠️ ユーザー用設定画面（SettingsScreen）

### 実験条件表示と統計情報

```tsx
// /concern-app/src/screens/SettingsScreen.tsx
export const SettingsScreen: React.FC = () => {
  const [condition, setCondition] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  
  useEffect(() => {
    loadConditionAndStats();
  }, []);
  
  const loadConditionAndStats = async () => {
    const userProfile = await db.userProfile.toCollection().first();
    setCondition(userProfile?.experimentCondition || null);
    setUserId(userProfile?.userId || '');
    
    const stats = await db.getStats();
    setStats(stats);
  };
  
  // デバッグ用の条件切り替え（開発時のみ使用）
  const handleDebugSwitch = async () => {
    if (!window.confirm('⚠️ 警告: この操作はデバッグ用です。\n実験データの一貫性が損なわれる可能性があります。\n続行しますか？')) {
      return;
    }
    
    const newCondition = condition === 'dynamic_ui' ? 'static_ui' : 'dynamic_ui';
    await experimentService.switchCondition(newCondition);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">設定</h1>
      
      {/* ユーザーID表示 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">ユーザーID</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-mono text-sm">{userId || '読み込み中...'}</p>
        </div>
      </section>
      
      {/* 実験条件表示 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">実験条件</h2>
        
        {condition ? (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-medium text-lg">
              {condition === 'dynamic_ui' ? '動的UI版' : '固定UI版'}
            </p>
            {stats?.experimentAssignedAt && (
              <p className="text-sm text-gray-600 mt-2">
                割り当て日時: {new Date(stats.experimentAssignedAt).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="font-medium text-yellow-800">未割り当て</p>
            <p className="text-sm text-yellow-700 mt-2">
              研究者による条件割り当てを待っています
            </p>
          </div>
        )}
      </section>
      
      {/* 統計情報 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">統計情報</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">タスク作成数</p>
            <p className="text-2xl font-bold">{stats?.totalTasksCreated || 0}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">着手回数</p>
            <p className="text-2xl font-bold">{stats?.totalActionsStarted || 0}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">完了回数</p>
            <p className="text-2xl font-bold">{stats?.totalActionsCompleted || 0}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">平均スッキリ度</p>
            <p className="text-2xl font-bold">{stats?.averageClarityImprovement?.toFixed(1) || '-'}</p>
          </div>
        </div>
      </section>
      
      {/* デバッグセクション（開発時のみ表示） */}
      {process.env.NODE_ENV === 'development' && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-red-600">🔧 デバッグ機能</h2>
          
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
            <p className="text-sm text-red-800 font-semibold">
              ⚠️ 開発環境専用
            </p>
            <p className="text-sm text-red-700 mt-1">
              以下の機能は開発時のテスト用です。本番環境では使用しないでください。
            </p>
          </div>
          
          <button
            onClick={handleDebugSwitch}
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
          >
            🔄 条件を切り替え（デバッグ）
          </button>
        </section>
      )}
    </div>
  );
};
```

---

## 📝 実装チェックリスト

### Step 4: A/Bテスト機構実装（手動割り当て版）

#### サーバー側実装

- [ ] `/server/src/services/ExperimentService.ts` 作成
  - [ ] `getCondition()` - ユーザーの条件取得
  - [ ] `assignConditionManually()` - 手動割り当て
  - [ ] `getAllAssignments()` - 全割り当て状況取得
  - [ ] `getAssignmentCounts()` - 条件別人数取得
  - [ ] `removeAssignment()` - 割り当て削除
  
- [ ] `/server/src/routes/config.ts` 実装
  - [ ] GET /v1/config エンドポイント
  - [ ] ExperimentService統合
  - [ ] 未割り当て時の処理
  
- [ ] `/server/src/routes/admin.ts` 作成（管理者API）
  - [ ] GET /admin/assignments - 割り当て一覧取得
  - [ ] GET /admin/assignments/counts - 条件別人数取得
  - [ ] POST /admin/assignments - 条件手動割り当て
  - [ ] DELETE /admin/assignments/:userId - 割り当て削除
  
- [ ] データベース
  - [ ] `experiment_assignments` テーブル作成
  - [ ] カラム: user_id, condition, assigned_at, method, experiment_id, assigned_by, note
  - [ ] マイグレーション

#### クライアント側実装

- [ ] `/concern-app/src/services/ExperimentService.ts` 作成
  - [ ] `fetchCondition()` - サーバーから条件取得
  - [ ] `getCachedCondition()` - キャッシュ取得
  - [ ] `switchCondition()` - デバッグ用切り替え
  - [ ] 未割り当て時の処理（null返却）
  
- [ ] `App.tsx` 更新
  - [ ] 条件別ルーティング実装
  - [ ] UnassignedScreen 実装（未割り当て画面）
  - [ ] DynamicUINavigator 実装
  - [ ] StaticUINavigator 実装
  
- [ ] `/concern-app/src/screens/SettingsScreen.tsx` 実装
  - [ ] ユーザーID表示
  - [ ] 実験条件表示
  - [ ] 統計情報表示
  - [ ] デバッグ用切り替えボタン（開発環境のみ）
  
- [ ] `/concern-app/src/screens/AdminUserManagement.tsx` 作成（管理画面）
  - [ ] ユーザー一覧テーブル
  - [ ] 条件別人数サマリー
  - [ ] 割り当てボタン（動的UI / 固定UI）
  - [ ] 割り当て削除ボタン
  - [ ] メモ入力機能

#### テスト項目

- [ ] 未割り当てユーザーがアクセスした場合、UnassignedScreen が表示される
- [ ] 管理画面でユーザーに条件を割り当てられる
- [ ] 割り当て後、ユーザーがリロードすると適切なUIが表示される
- [ ] 条件別の人数カウントが正確
- [ ] 割り当て削除が正常に動作する
- [ ] デバッグ用切り替えが開発環境でのみ表示される

---

## 📋 実装手順サマリー

### 手動割り当て運用フロー

1. **被験者登録**
   - 被験者にアプリにアクセスしてもらう
   - 自動的に匿名ユーザーIDが生成される
   - UnassignedScreen が表示される
   - ユーザーIDをメモしてもらう

2. **管理者による割り当て**
   - 管理者が AdminUserManagement 画面にアクセス
   - ユーザーID一覧を確認
   - 各ユーザーに条件を割り当て（動的UI / 固定UI）
   - 均等割り当てを心がける

3. **実験開始**
   - 被験者にアプリをリロードしてもらう
   - 割り当てられた条件のUIが表示される
   - 通常通り使用してもらう

4. **データ収集**
   - イベントログに条件情報が自動記録される
   - AdminDashboard で着手率・スッキリ度を確認

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**最終更新**: 2025年10月19日

