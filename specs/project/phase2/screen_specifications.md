# Phase 2 画面仕様書

**作成日**: 2025年10月18日  
**対象**: React + TypeScript (Capacitor PWA)

---

## 📋 画面一覧

### 動的UI版（DynamicUINavigator）
1. **TaskRecommendationScreen** - タスク推奨画面 ⭐️最重要
2. **TaskListScreen** - タスク一覧画面
3. **TaskCreateScreen** - タスク作成画面
4. **TaskEditScreen** - タスク編集画面
5. **ActionReportModal** - 行動報告モーダル ⭐️着手測定
6. **ClarityFeedbackModal** - スッキリ度測定モーダル ⭐️

### 固定UI版（StaticUINavigator）
7. **StaticTaskRecommendationScreen** - 固定UI版タスク推奨画面

### 共通
8. **SettingsScreen** - 設定画面（実験条件切り替え）

---

## ⭐️ 1. TaskRecommendationScreen（タスク推奨画面）

### 概要
`/v1/task/rank` APIから推奨タスクを取得し、TaskCardWidgetで表示。「着手する」ボタンが着手率測定の核心。

### ファイルパス
`/concern-app/src/screens/TaskRecommendationScreen.tsx`

### 画面構成

```
┌────────────────────────────────────────┐
│  ⬅️  タスク推奨                        │ ← ヘッダー
├────────────────────────────────────────┤
│                                        │
│  📍 場所: [自宅 ▼]                     │ ← factors入力
│  🕐 時間帯: [朝 ▼]                     │
│  ⏱️ 利用可能時間: [30] 分              │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  [推奨タスク更新]                 │ │
│  └──────────────────────────────────┘ │
│                                        │
├────────────────────────────────────────┤
│  🎯 今やるべきこと                     │ ← タスクカードセクション
│                                        │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│  ┃  📚 論文を読む                   ┃ │
│  ┃                                  ┃ │
│  ┃  推定時間: 30分                  ┃ │
│  ┃  重要度: ★★★★☆                ┃ │
│  ┃  締切: あと24時間                ┃ │
│  ┃                                  ┃ │
│  ┃  この論文を読むと、研究の全体像  ┃ │
│  ┃  が見えてきます。                ┃ │
│  ┃                                  ┃ │
│  ┃  ┌────────────────────────┐  ┃ │
│  ┃  │  ✅ 着手する              │  ┃ │ ← ⭐️着手ボタン
│  ┃  └────────────────────────┘  ┃ │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                        │
│  [他のタスクを見る]                   │
│                                        │
├────────────────────────────────────────┤
│  [ホーム] [タスク] [統計] [設定]      │ ← ボトムナビゲーション
└────────────────────────────────────────┘
```

### コンポーネント構造

```tsx
<TaskRecommendationScreen>
  <Header title="タスク推奨" />
  
  <FactorsInput>
    <Select label="場所" options={['自宅', '職場', '移動中', 'その他']} />
    <Select label="時間帯" options={['朝', '昼', '夕方', '夜']} />
    <NumberInput label="利用可能時間" unit="分" />
  </FactorsInput>
  
  <Button onPress={handleRefresh}>推奨タスク更新</Button>
  
  {isLoading ? (
    <LoadingSpinner />
  ) : recommendedTask ? (
    <TaskCardWidget
      task={recommendedTask}
      variant={variant}
      saliency={saliency}
      onActionStart={handleActionStart} // ⭐️着手ボタンのハンドラー
    />
  ) : (
    <EmptyState>
      推奨できるタスクがありません。
      タスクを追加してください。
    </EmptyState>
  )}
  
  <Button variant="secondary" onPress={() => navigate('/tasks')}>
    他のタスクを見る
  </Button>
  
  <BottomNavigation />
</TaskRecommendationScreen>
```

### State管理

```typescript
interface TaskRecommendationState {
  // factors入力
  location: 'home' | 'work' | 'transit' | 'other';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  availableTime: number; // 分
  
  // 推奨結果
  recommendedTask: Task | null;
  variant: 'task_card' | 'micro_step_card' | 'prepare_step_card' | null;
  saliency: 0 | 1 | 2 | 3 | null;
  score: number | null;
  generationId: string | null;
  
  // UI状態
  isLoading: boolean;
  error: string | null;
  
  // 着手測定用
  recommendationShownAt: Date | null; // UI表示時刻
}
```

### ライフサイクル

```typescript
useEffect(() => {
  // 画面表示時に自動でタスク推奨取得
  fetchRecommendation();
  
  // イベント記録: task_recommendation_shown
  eventLogger.log({
    eventType: 'task_recommendation_shown',
    metadata: {
      uiCondition: experimentCondition,
      taskId: recommendedTask?.taskId,
      variant,
      saliency,
      score
    }
  });
  
  // recommendationShownAt を記録
  setRecommendationShownAt(new Date());
}, []);
```

### ハンドラー実装

```typescript
const handleActionStart = async () => {
  if (!recommendedTask || !recommendationShownAt) return;
  
  try {
    // ⭐️着手の定義：このボタンをタップした瞬間
    
    // 1. ActionReport作成
    const report = await db.startAction(
      recommendedTask.taskId,
      userId,
      recommendationShownAt,
      experimentCondition,
      {
        timeOfDay,
        location,
        availableTimeMin: availableTime,
        factorsSnapshot: currentFactors
      }
    );
    
    // 2. イベント記録
    await eventLogger.log({
      eventType: 'task_action_started',
      metadata: {
        uiCondition: experimentCondition,
        taskId: recommendedTask.taskId,
        timeToActionSec: (new Date().getTime() - recommendationShownAt.getTime()) / 1000
      }
    });
    
    // 3. ActionReportModalを表示（タイマー機能等）
    setActionReportId(report.reportId);
    setShowActionReportModal(true);
    
  } catch (error) {
    console.error('Failed to start action:', error);
    // エラーハンドリング
  }
};
```

---

## ⭐️ 2. ActionReportModal（行動報告モーダル）

### 概要
「着手する」ボタンをタップした後に表示。タイマー機能と「完了しました」ボタンを提供。

### 画面構成

```
┌────────────────────────────────────────┐
│  📚 論文を読む                         │
│  ────────────────────────────────────  │
│                                        │
│           🕐 25:00                     │ ← タイマー表示
│                                        │
│  経過時間: 5分                         │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  ✅ 完了しました                  │ │ ← 完了ボタン
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  ⏸️ 中断                          │ │ ← 中断ボタン
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

### コンポーネント構造

```tsx
<ActionReportModal
  isOpen={showActionReportModal}
  onClose={handleCloseModal}
  task={recommendedTask}
  reportId={actionReportId}
>
  <TaskTitle>{task.title}</TaskTitle>
  
  <Timer
    initialTime={task.estimateMin * 60}
    onTick={handleTimerTick}
  />
  
  <ElapsedTime>{formatElapsedTime(elapsedSec)}</ElapsedTime>
  
  <Button
    variant="primary"
    onPress={handleComplete}
  >
    ✅ 完了しました
  </Button>
  
  <Button
    variant="secondary"
    onPress={handlePause}
  >
    ⏸️ 中断
  </Button>
</ActionReportModal>
```

### ハンドラー実装

```typescript
const handleComplete = async () => {
  // ClarityFeedbackModalを表示
  setShowClarityFeedbackModal(true);
  setShowActionReportModal(false);
};

const handlePause = async () => {
  // 中断処理（ActionReportは保存するが、completedAtは未設定）
  setShowActionReportModal(false);
  
  // イベント記録
  await eventLogger.log({
    eventType: 'task_action_paused',
    metadata: {
      taskId: task.taskId,
      durationMin: elapsedSec / 60
    }
  });
};
```

---

## ⭐️ 3. ClarityFeedbackModal（スッキリ度測定モーダル）

### 概要
タスク完了後にスッキリ度を測定。研究の副次測定指標。

### 画面構成

```
┌────────────────────────────────────────┐
│  頭のスッキリ度を教えてください         │
│  ────────────────────────────────────  │
│                                        │
│  このタスクを終えて、頭の中は          │
│  どれくらいスッキリしましたか？        │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  😐 あまりスッキリしない (1)      │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  🙂 少しスッキリ (2)              │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  😊 かなりスッキリ (3)            │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌────────────────────────────────┐   │
│  │ メモ（任意）                    │   │
│  │                                 │   │
│  └────────────────────────────────┘   │
│                                        │
│  [送信]                                │
│                                        │
└────────────────────────────────────────┘
```

### コンポーネント構造

```tsx
<ClarityFeedbackModal
  isOpen={showClarityFeedbackModal}
  onClose={handleCloseFeedback}
  reportId={actionReportId}
>
  <Title>頭のスッキリ度を教えてください</Title>
  
  <Description>
    このタスクを終えて、頭の中はどれくらいスッキリしましたか？
  </Description>
  
  <RadioGroup
    value={clarityImprovement}
    onChange={setClarityImprovement}
  >
    <RadioButton value={1}>
      😐 あまりスッキリしない
    </RadioButton>
    <RadioButton value={2}>
      🙂 少しスッキリ
    </RadioButton>
    <RadioButton value={3}>
      😊 かなりスッキリ
    </RadioButton>
  </RadioGroup>
  
  <TextArea
    placeholder="メモ（任意）"
    value={notes}
    onChange={setNotes}
  />
  
  <Button
    variant="primary"
    onPress={handleSubmit}
    disabled={!clarityImprovement}
  >
    送信
  </Button>
</ClarityFeedbackModal>
```

### ハンドラー実装

```typescript
const handleSubmit = async () => {
  if (!clarityImprovement || !actionReportId) return;
  
  try {
    // 1. ActionReport完了処理
    await db.completeAction(
      actionReportId,
      clarityImprovement,
      notes
    );
    
    // 2. イベント記録
    await eventLogger.log({
      eventType: 'task_action_completed',
      metadata: {
        taskId: task.taskId,
        durationMin: elapsedSec / 60,
        clarityImprovement
      }
    });
    
    await eventLogger.log({
      eventType: 'clarity_feedback_submitted',
      metadata: {
        clarityImprovement,
        hasNotes: !!notes
      }
    });
    
    // 3. モーダルを閉じて完了画面へ
    setShowClarityFeedbackModal(false);
    
    // 成功メッセージ表示
    showToast('お疲れ様でした！スッキリ度を記録しました。');
    
    // タスク推奨画面を更新（次のタスクを表示）
    fetchRecommendation();
    
  } catch (error) {
    console.error('Failed to complete action:', error);
    // エラーハンドリング
  }
};
```

---

## 4. TaskListScreen（タスク一覧画面）

### 概要
全タスクを一覧表示。追加・編集・削除機能を提供。

### 画面構成

```
┌────────────────────────────────────────┐
│  ⬅️  マイタスク                   [+]  │ ← ヘッダー
├────────────────────────────────────────┤
│                                        │
│  [アクティブ] [完了] [アーカイブ]      │ ← タブ
│  ───────────                           │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 📚 論文を読む               ⋮   │ │
│  │ 推定30分 | 締切: あと24時間      │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 💪 ジムに行く               ⋮   │ │
│  │ 推定60分 | 締切: なし            │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 📝 レポート作成             ⋮   │ │
│  │ 推定120分 | 締切: あと3日        │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

### コンポーネント構造

```tsx
<TaskListScreen>
  <Header
    title="マイタスク"
    rightButton={
      <IconButton icon="plus" onPress={() => navigate('/task/create')} />
    }
  />
  
  <TabBar
    tabs={['アクティブ', '完了', 'アーカイブ']}
    activeTab={activeTab}
    onChange={setActiveTab}
  />
  
  <FlatList
    data={filteredTasks}
    renderItem={({ item }) => (
      <TaskListItem
        task={item}
        onPress={() => navigate(`/task/${item.taskId}`)}
        onMenuPress={() => showTaskMenu(item)}
      />
    )}
    ListEmptyComponent={
      <EmptyState>
        タスクがありません。
        <Button onPress={() => navigate('/task/create')}>
          タスクを追加
        </Button>
      </EmptyState>
    }
  />
</TaskListScreen>
```

---

## 5. TaskCreateScreen（タスク作成画面）

### 画面構成

```
┌────────────────────────────────────────┐
│  ⬅️  新しいタスク                      │
├────────────────────────────────────────┤
│                                        │
│  タイトル *                            │
│  ┌────────────────────────────────┐   │
│  │ 論文を読む                      │   │
│  └────────────────────────────────┘   │
│                                        │
│  説明（任意）                          │
│  ┌────────────────────────────────┐   │
│  │ この論文を読むと...             │   │
│  │                                 │   │
│  └────────────────────────────────┘   │
│                                        │
│  重要度 *                              │
│  [────●────────] 80%                  │
│                                        │
│  推定時間 *                            │
│  [30] 分                               │
│                                        │
│  締切（任意）                          │
│  [📅 2025-10-20]                      │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  作成                             │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

### フォーム検証

```typescript
const validation = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 100
  },
  importance: {
    required: true,
    min: 0,
    max: 1
  },
  estimateMin: {
    required: true,
    min: 1,
    max: 480 // 8時間
  }
};
```

---

## 7. StaticTaskRecommendationScreen（固定UI版）

### 概要
動的UI版と同じ機能だが、UIパターンが固定。DSL生成なし。

### 設計方針

```typescript
// 固定デザインテンプレート
const STATIC_TASK_CARD_TEMPLATE = {
  layout: 'vertical',
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  titleFontSize: 20,
  titleFontWeight: 'bold',
  descriptionFontSize: 14,
  iconSize: 24,
  buttonStyle: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12
  }
};
```

### 実装差異

| 機能 | 動的UI版 | 固定UI版 |
|------|---------|---------|
| UI生成 | `/v1/thought/generate` | 固定テンプレート |
| タスク推奨 | `/v1/task/rank` | `/v1/task/rank`（同じ） |
| 行動報告 | ActionReportModal | ActionReportModal（同じ） |
| スッキリ度測定 | ClarityFeedbackModal | ClarityFeedbackModal（同じ） |
| イベントログ | uiCondition='dynamic_ui' | uiCondition='static_ui' |

---

## 8. SettingsScreen（設定画面）

### 概要
デバッグ用の実験条件切り替えUI。

### 画面構成

```
┌────────────────────────────────────────┐
│  ⬅️  設定                              │
├────────────────────────────────────────┤
│                                        │
│  実験条件                              │
│  ────────────────────────────────────  │
│                                        │
│  現在の条件: 動的UI                    │
│  割り当て日時: 2025-10-18 10:00       │
│                                        │
│  ⚠️ デバッグモード                     │
│  実験条件を手動で切り替えることができます │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  🔄 固定UIに切り替え              │ │
│  └──────────────────────────────────┘ │
│                                        │
│  統計情報                              │
│  ────────────────────────────────────  │
│                                        │
│  タスク作成数: 12                      │
│  着手回数: 25                          │
│  完了回数: 20                          │
│  平均スッキリ度: 2.4                   │
│                                        │
└────────────────────────────────────────┘
```

---

## 📊 画面遷移図

### 動的UI版フロー

```
[HomeScreen]
    │
    ├─→ [TaskRecommendationScreen] ⭐️
    │       │
    │       ├─ [ActionReportModal] ⭐️
    │       │       │
    │       │       └─→ [ClarityFeedbackModal] ⭐️
    │       │
    │       └─→ [TaskListScreen]
    │               │
    │               ├─→ [TaskCreateScreen]
    │               └─→ [TaskEditScreen]
    │
    ├─→ [DynamicThoughtScreen (capture)]
    │       │
    │       └─→ [DynamicThoughtScreen (plan)]
    │               │
    │               └─→ [DynamicThoughtScreen (breakdown)]
    │                       │
    │                       └─→ [TaskRecommendationScreen]
    │
    └─→ [SettingsScreen]
```

### 固定UI版フロー

```
[HomeScreen]
    │
    ├─→ [StaticTaskRecommendationScreen]
    │       │
    │       ├─ [ActionReportModal]（共通）
    │       │       │
    │       │       └─→ [ClarityFeedbackModal]（共通）
    │       │
    │       └─→ [TaskListScreen]（共通）
    │
    ├─→ [ConcernInputScreen]
    │       │
    │       └─→ [CategorySelectionScreen]
    │               │
    │               └─→ [BreakdownScreen]
    │                       │
    │                       └─→ [StaticTaskRecommendationScreen]
    │
    └─→ [SettingsScreen]（共通）
```

---

## 🎨 デザインシステム

### カラーパレット

```typescript
const colors = {
  // Saliency対応
  saliency: {
    base: '#F3F4F6',      // neutral-50
    emphasis: '#DBEAFE',  // blue-50
    primary: '#BFDBFE',   // blue-100
    urgent: '#FECACA'     // red-100
  },
  
  // 基本色
  primary: '#3B82F6',     // blue-500
  secondary: '#6B7280',   // gray-500
  success: '#10B981',     // green-500
  warning: '#F59E0B',     // amber-500
  danger: '#EF4444',      // red-500
  
  // テキスト
  text: {
    primary: '#111827',   // gray-900
    secondary: '#6B7280', // gray-500
    tertiary: '#9CA3AF'   // gray-400
  },
  
  // 背景
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB', // gray-50
    tertiary: '#F3F4F6'   // gray-100
  }
};
```

### タイポグラフィ

```typescript
const typography = {
  h1: { fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: 'bold', lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 16, fontWeight: 'normal', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: 'normal', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: 'normal', lineHeight: 16 }
};
```

---

## 📝 実装チェックリスト

### Step 2: タスク推奨画面実装

- [ ] `/concern-app/src/screens/TaskRecommendationScreen.tsx`
  - [ ] factors入力UI
  - [ ] `/v1/task/rank` API統合
  - [ ] TaskCardWidget表示
  - [ ] 着手ボタンハンドラー
  - [ ] イベントログ記録
- [ ] `/concern-app/src/components/ActionReportModal.tsx`
  - [ ] タイマー機能
  - [ ] 完了ボタン
  - [ ] 中断ボタン
- [ ] `/concern-app/src/components/ClarityFeedbackModal.tsx`
  - [ ] ラジオボタングループ
  - [ ] メモ入力欄
  - [ ] 送信処理
- [ ] `/concern-app/src/screens/TaskListScreen.tsx`
  - [ ] タスク一覧表示
  - [ ] フィルタリング・ソート
- [ ] `/concern-app/src/screens/TaskCreateScreen.tsx`
  - [ ] フォーム実装
  - [ ] バリデーション

### Step 5: 固定UI版実装

- [ ] `/concern-app/src/screens/StaticTaskRecommendationScreen.tsx`
  - [ ] 固定デザインテンプレート
  - [ ] 同じAPI統合
  - [ ] 共通コンポーネント使用

### 共通

- [ ] `/concern-app/src/screens/SettingsScreen.tsx`
  - [ ] 実験条件表示
  - [ ] 切り替えボタン
  - [ ] 統計情報表示

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**最終更新**: 2025年10月18日

