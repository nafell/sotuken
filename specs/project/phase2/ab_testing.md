# Phase 2 A/Bテスト機構仕様

**作成日**: 2025年10月18日  
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

### 方式A: ハッシュベース割り当て（推奨）⭐️

**特徴**:
- ユーザーIDから決定論的に条件を割り当て
- 同じユーザーは常に同じ条件
- 再現性あり

**実装**:

```typescript
// /server/src/services/ExperimentService.ts
class ExperimentService {
  /**
   * ユーザーIDのハッシュ値から条件を決定
   */
  assignConditionByHash(userId: string): 'dynamic_ui' | 'static_ui' {
    // SHA-256ハッシュ計算
    const hash = crypto.createHash('sha256').update(userId).digest('hex');
    
    // ハッシュ値の最初の8文字を数値化
    const hashValue = parseInt(hash.substring(0, 8), 16);
    
    // 偶数なら dynamic_ui、奇数なら static_ui
    return hashValue % 2 === 0 ? 'dynamic_ui' : 'static_ui';
  }
}
```

**割り当て比率**: ほぼ 50:50（ハッシュ関数の均等性により）

**メリット**:
- 完全に再現可能
- サーバー側で管理
- ユーザー体験の一貫性

**デメリット**:
- 割り当て比率を細かく調整できない

---

### 方式B: ランダム割り当て

**特徴**:
- 初回アクセス時にランダムに割り当て
- 割り当て比率を自由に調整可能

**実装**:

```typescript
class ExperimentService {
  /**
   * ランダム割り当て（splitRatio指定可能）
   */
  assignConditionRandomly(splitRatio: number = 0.5): 'dynamic_ui' | 'static_ui' {
    return Math.random() < splitRatio ? 'dynamic_ui' : 'static_ui';
  }
}
```

**メリット**:
- 割り当て比率を柔軟に調整
- 真のランダム化

**デメリット**:
- 再現性なし（同じユーザーIDでも条件が変わる可能性）

---

### 方式C: 手動割り当て（デバッグ用）

**特徴**:
- 管理者が手動で条件を指定
- テスト・デバッグに使用

**実装**:

```typescript
class ExperimentService {
  private overrides: Map<string, 'dynamic_ui' | 'static_ui'> = new Map();
  
  /**
   * 特定ユーザーの条件を手動上書き
   */
  overrideCondition(userId: string, condition: 'dynamic_ui' | 'static_ui'): void {
    this.overrides.set(userId, condition);
    
    // データベースに記録
    db.saveConditionOverride({
      userId,
      condition,
      overriddenAt: new Date(),
      reason: 'manual_override'
    });
  }
  
  /**
   * 上書きされた条件を取得（なければ通常の割り当て）
   */
  getCondition(userId: string): 'dynamic_ui' | 'static_ui' {
    if (this.overrides.has(userId)) {
      return this.overrides.get(userId)!;
    }
    
    return this.assignConditionByHash(userId);
  }
}
```

---

## 🏗️ 実装アーキテクチャ

### サーバー側実装

```typescript
// /server/src/services/ExperimentService.ts
import crypto from 'crypto';

export interface ExperimentAssignment {
  userId: string;
  condition: 'dynamic_ui' | 'static_ui';
  assignedAt: Date;
  method: 'hash' | 'random' | 'manual';
  experimentId: string;
}

export class ExperimentService {
  private experimentId: string = 'exp_2025_10';
  
  /**
   * ユーザーの実験条件を取得（既存 or 新規割り当て）
   */
  async getOrAssignCondition(userId: string): Promise<ExperimentAssignment> {
    // 既存の割り当てをチェック
    const existing = await this.getExistingAssignment(userId);
    if (existing) {
      return existing;
    }
    
    // 新規割り当て
    const condition = this.assignConditionByHash(userId);
    
    const assignment: ExperimentAssignment = {
      userId,
      condition,
      assignedAt: new Date(),
      method: 'hash',
      experimentId: this.experimentId
    };
    
    // データベースに保存
    await this.saveAssignment(assignment);
    
    return assignment;
  }
  
  /**
   * ハッシュベース割り当て
   */
  private assignConditionByHash(userId: string): 'dynamic_ui' | 'static_ui' {
    const hash = crypto.createHash('sha256').update(userId).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    return hashValue % 2 === 0 ? 'dynamic_ui' : 'static_ui';
  }
  
  /**
   * 既存の割り当てを取得
   */
  private async getExistingAssignment(userId: string): Promise<ExperimentAssignment | null> {
    // データベースから取得
    const result = await db.query(
      'SELECT * FROM experiment_assignments WHERE user_id = ? AND experiment_id = ?',
      [userId, this.experimentId]
    );
    
    return result[0] || null;
  }
  
  /**
   * 割り当てを保存
   */
  private async saveAssignment(assignment: ExperimentAssignment): Promise<void> {
    await db.query(
      'INSERT INTO experiment_assignments (user_id, condition, assigned_at, method, experiment_id) VALUES (?, ?, ?, ?, ?)',
      [assignment.userId, assignment.condition, assignment.assignedAt, assignment.method, assignment.experimentId]
    );
  }
  
  /**
   * 条件を手動上書き（デバッグ用）
   */
  async overrideCondition(
    userId: string,
    condition: 'dynamic_ui' | 'static_ui',
    reason: string
  ): Promise<void> {
    await db.query(
      'UPDATE experiment_assignments SET condition = ?, method = ?, overridden_at = ?, override_reason = ? WHERE user_id = ? AND experiment_id = ?',
      [condition, 'manual', new Date(), reason, userId, this.experimentId]
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
  async fetchCondition(): Promise<'dynamic_ui' | 'static_ui'> {
    if (this.condition) {
      return this.condition;
    }
    
    try {
      // `/v1/config` APIから取得
      const config = await apiService.getConfig();
      
      this.condition = config.experimentAssignment.condition;
      
      // ローカルDBに保存
      await db.userProfile.update(userId, {
        experimentCondition: this.condition,
        experimentAssignedAt: new Date(config.experimentAssignment.assignedAt)
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
      
      // デフォルト: dynamic_ui
      this.condition = 'dynamic_ui';
      return this.condition;
    }
  }
  
  /**
   * キャッシュされた条件を取得
   */
  getCachedCondition(): 'dynamic_ui' | 'static_ui' | null {
    return this.condition;
  }
  
  /**
   * 条件を手動切り替え（デバッグ用）
   */
  async switchCondition(newCondition: 'dynamic_ui' | 'static_ui'): Promise<void> {
    const previousCondition = this.condition;
    this.condition = newCondition;
    
    // ローカルDB更新
    await db.userProfile.update(userId, {
      experimentCondition: newCondition,
      conditionOverridden: true
    });
    
    // イベント記録
    await eventLogger.log({
      eventType: 'experiment_condition_switched',
      metadata: {
        previousCondition,
        newCondition,
        reason: 'user_manual_switch'
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

## 🛠️ デバッグUI（SettingsScreen）

### 実験条件表示・切り替え

```tsx
// /concern-app/src/screens/SettingsScreen.tsx
export const SettingsScreen: React.FC = () => {
  const [condition, setCondition] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  
  useEffect(() => {
    loadConditionAndStats();
  }, []);
  
  const loadConditionAndStats = async () => {
    const userProfile = await db.userProfile.toCollection().first();
    setCondition(userProfile?.experimentCondition || null);
    
    const stats = await db.getStats();
    setStats(stats);
  };
  
  const handleSwitch = async () => {
    const newCondition = condition === 'dynamic_ui' ? 'static_ui' : 'dynamic_ui';
    
    if (confirm(`実験条件を「${newCondition}」に切り替えますか？\nアプリがリロードされます。`)) {
      await experimentService.switchCondition(newCondition);
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">設定</h1>
      
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">実験条件</h2>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="font-medium">
            現在の条件: {condition === 'dynamic_ui' ? '動的UI' : '固定UI'}
          </p>
          {stats?.experimentAssignedAt && (
            <p className="text-sm text-gray-600">
              割り当て日時: {new Date(stats.experimentAssignedAt).toLocaleString()}
            </p>
          )}
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-yellow-800">
            ⚠️ デバッグモード
          </p>
          <p className="text-sm text-yellow-700">
            実験条件を手動で切り替えることができます
          </p>
        </div>
        
        <button
          onClick={handleSwitch}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg"
        >
          🔄 {condition === 'dynamic_ui' ? '固定UI' : '動的UI'}に切り替え
        </button>
      </section>
      
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
    </div>
  );
};
```

---

## 📝 実装チェックリスト

### Step 4: A/Bテスト機構実装

- [ ] `/server/src/services/ExperimentService.ts` 作成
  - [ ] ハッシュベース割り当て
  - [ ] 既存割り当て取得
  - [ ] 手動上書き機能
- [ ] `/server/src/routes/config.ts` 実装
  - [ ] GET /v1/config エンドポイント
  - [ ] ExperimentService統合
- [ ] `/concern-app/src/services/ExperimentService.ts` 作成
  - [ ] 条件取得・キャッシュ
  - [ ] 手動切り替え機能
- [ ] App.tsx更新
  - [ ] 条件別ルーティング
  - [ ] DynamicUINavigator実装
  - [ ] StaticUINavigator実装
- [ ] SettingsScreen実装
  - [ ] 実験条件表示
  - [ ] 切り替えボタン
  - [ ] 統計情報表示
- [ ] データベース
  - [ ] experiment_assignments テーブル作成
  - [ ] マイグレーション

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**最終更新**: 2025年10月18日

