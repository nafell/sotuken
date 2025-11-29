# Phase 2 実装計画：動的UIシステムのアプリ統合

**作成日**: 2025年10月18日  
**対象期間**: 3.5-4.5週間（17-23日）  
**前提条件**: Phase 1（DSL基盤・動的UIレンダリング）完了

---

## 📋 Phase 2の目的

Phase 1で実装したLLM動的UIシステムを、実際のアプリケーションに統合し、**研究目標である「動的UIの有用性測定」**を可能にする。

### 研究目標
- **独自性A**: UIの動的新規性制御による介入受容性向上
- **主要測定指標**: タスクへの着手率（動的UI版 vs 固定UI版）
- **副次測定指標**: 認知負荷軽減の自己評価（頭のスッキリ度）

---

## 🎯 Phase 2の成果物

### 1. タスク推奨システム（最重要）
- タスクカード表示画面
- **行動報告ボタン**（着手測定の核心）
- スッキリ度測定UI
- タスクDB・CRUD機能

### 2. 思考整理フローの統合
- 既存固定UI画面をDynamicThoughtScreenに統合
- capture → plan → breakdown フロー
- データフロー統合（concern → tasks）

### 3. A/Bテスト機構
- ユーザー固定割り当て（動的UI群 vs 固定UI群）
- 条件別ルーティング
- 実験条件管理API・UI

### 4. 測定・ログシステム
- イベントログ定義・収集
- 着手率計算エンジン
- 簡易ダッシュボード

---

## 🏗️ アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                    Concern-App (Frontend)                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          App.tsx (条件別ルーティング)                │   │
│  │  • experimentCondition取得                           │   │
│  │  • dynamic_ui → DynamicUINavigator                  │   │
│  │  • static_ui → StaticUINavigator                    │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │     DynamicUINavigator (動的UI版フロー)              │   │
│  │  • DynamicThoughtScreen (capture/plan/breakdown)    │   │
│  │  • TaskRecommendationScreen (タスク推奨)            │   │
│  │  • ActionReportModal (行動報告)                     │   │
│  │  • ClarityFeedbackModal (スッキリ度測定)           │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │     StaticUINavigator (固定UI版フロー)               │   │
│  │  • ConcernInputScreen → CategorySelection...        │   │
│  │  • StaticTaskRecommendationScreen                   │   │
│  │  • ActionReportModal (共通)                         │   │
│  │  • ClarityFeedbackModal (共通)                      │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │           Services Layer                              │   │
│  │  • ExperimentService (A/B条件管理)                   │   │
│  │  • EventLogger (イベントログ収集)                   │   │
│  │  • TaskService (タスクCRUD)                          │   │
│  │  • ApiService (サーバー連携)                        │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │          LocalDatabase (IndexedDB)                    │   │
│  │  • tasks テーブル                                    │   │
│  │  • event_logs テーブル                               │   │
│  │  • userProfile.experimentCondition                   │   │
│  └───────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────────┘
                        │ HTTP API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server (Backend)                        │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │   /v1/config (実験条件配布)                          │   │
│  │   • ユーザーID → 条件割り当て                       │   │
│  │   • experimentCondition: "dynamic_ui" | "static_ui" │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │   /v1/thought/generate (思考整理UI生成)              │   │
│  │   • Phase 1で実装済み                                │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │   /v1/task/rank (タスク推奨)                         │   │
│  │   • Phase 1Bで実装済み                               │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │   /v1/events/batch (イベントログ収集)                │   │
│  │   • 着手率計算のためのログ蓄積                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │   /v1/metrics/engagement (着手率取得)                │   │
│  │   • 条件別着手率の計算                               │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 実装ステップ

### **Step 1: データモデル・API統合**（2-3日）⭐️基盤
- タスクDBスキーマ追加
- イベントログスキーマ拡張
- `/v1/config` API実装（実験条件配布）
- `/v1/events/batch` API拡張
- `/v1/metrics/engagement` API実装

**成果物**:
- `Task` entity追加（IndexedDB + サーバーDB）
- `EventLog` 型定義拡張
- ExperimentService（サーバー側）

---

### **Step 2: タスク推奨画面（動的UI版）**（3-4日）⭐️最重要

**2-1. TaskRecommendationScreen作成**
- `/v1/task/rank` API呼び出し
- TaskCardWidget表示（Phase 1Cで実装済み）
- factors手動入力UI

**2-2. 行動報告ボタン実装**
```typescript
// 着手の定義：「着手する」ボタンをタップした瞬間
onActionStart() → task_action_started イベント記録
onActionComplete() → ClarityFeedbackModal表示
```

**2-3. スッキリ度測定UI**
- 3段階スケール（1: あまりスッキリしない / 2: 少しスッキリ / 3: かなりスッキリ）
- task_action_completed イベント記録

**2-4. タスク一覧・管理画面**
- TaskListScreen（全タスク表示）
- TaskCreateScreen（手動タスク追加）
- TaskEditScreen（タスク編集）

**成果物**:
- `/concern-app/src/screens/TaskRecommendationScreen.tsx`
- `/concern-app/src/components/ActionReportModal.tsx`
- `/concern-app/src/components/ClarityFeedbackModal.tsx`
- `/concern-app/src/screens/TaskListScreen.tsx`
- `/concern-app/src/services/TaskService.ts`

---

### **Step 3: 思考整理フロー統合（動的UI版）**（4-5日）

**3-1. ルーティング更新**
- DynamicThoughtScreenを既存ルートに接続
- 画面遷移フロー調整

**3-2. データフロー統合**
```
ConcernInputScreen (concernText)
  ↓
DynamicThoughtScreen (capture)
  ↓
DynamicThoughtScreen (plan)
  ↓
DynamicThoughtScreen (breakdown) → タスク生成
  ↓
TaskRecommendationScreen
```

**3-3. タスク生成ロジック**
- breakdownステージの結果 → Task entity変換
- IndexedDB保存
- タスク推奨システムとの連携

**成果物**:
- App.tsx更新（DynamicUINavigator）
- concernText → tasks の完全フロー

---

### **Step 4: A/Bテスト機構**（3-4日）⭐️研究の核心

**4-1. 実験条件管理サービス（サーバー側）**
```typescript
// /server/src/services/ExperimentService.ts
- assignCondition(userId): ユーザー固定割り当て
- getCurrentCondition(userId): 条件取得
- overrideCondition(userId, condition): 手動上書き（デバッグ用）
```

**4-2. 実験条件管理サービス（クライアント側）**
```typescript
// /concern-app/src/services/ExperimentService.ts
- fetchCondition(): サーバーから条件取得
- getCachedCondition(): ローカルキャッシュ
- switchCondition(): 手動切り替え（デバッグ用）
```

**4-3. 条件別ルーティング**
```typescript
// App.tsx
if (condition === "dynamic_ui") {
  return <DynamicUINavigator />;
} else {
  return <StaticUINavigator />;
}
```

**4-4. 設定画面（デバッグ用）**
- SettingsScreen: 実験条件の表示・切り替え
- 条件のリセット機能

**成果物**:
- `/server/src/services/ExperimentService.ts`
- `/concern-app/src/services/ExperimentService.ts`
- App.tsx更新（条件別ルーティング）
- SettingsScreen（デバッグUI）

---

### **Step 5: 固定UI版の整備**（3-4日）⏰時間次第

**5-1. 固定UI版のタスク推奨画面**
- StaticTaskRecommendationScreen（DSL生成なし、固定デザイン）
- 動的UI版と同じ機能（行動報告ボタン、スッキリ度測定）

**5-2. 固定UI版フローの機能統一**
- 既存画面のデータフロー調整
- イベントログ統一
- タスク生成ロジック統合

**5-3. デザイン固定化**
- 静的デザインテンプレート定義
- UIパターンの固定化（レイアウト、色、フォント等）

**成果物**:
- `/concern-app/src/screens/StaticTaskRecommendationScreen.tsx`
- StaticUINavigator完成

**優先度**: 最悪の場合、動的UI版だけ完成すれば研究は進められる

---

### **Step 6: 測定・ログシステム**（2-3日）

**6-1. イベントログ収集**
- EventLogger（クライアント側バッファリング）
- バッチ送信（10イベントごと or 30秒ごと）

**6-2. 着手率計算エンジン**
```typescript
// /server/src/services/MetricsService.ts
- calculateEngagementRate(condition): 着手率計算
- getClarityImprovement(condition): スッキリ度平均
```

**6-3. 簡易ダッシュボード**
- AdminDashboard: 着手率・スッキリ度の可視化
- 条件別比較グラフ

**成果物**:
- `/concern-app/src/services/EventLogger.ts`
- `/server/src/services/MetricsService.ts`
- `/server/src/routes/metrics.ts`
- AdminDashboard（Web UI）

---

## 📅 工数見積もり

| Step | 内容 | 工数 | 重要度 | 依存関係 |
|------|------|------|--------|----------|
| Step 1 | データモデル・API | 2-3日 | ⭐️⭐️⭐️ | - |
| Step 2 | タスク推奨画面（動的） | 3-4日 | ⭐️⭐️⭐️ | Step 1 |
| Step 3 | 思考整理フロー統合 | 4-5日 | ⭐️⭐️⭐️ | Step 1 |
| Step 4 | A/Bテスト機構 | 3-4日 | ⭐️⭐️⭐️ | Step 1, 2, 3 |
| Step 5 | 固定UI版整備 | 3-4日 | ⭐️⭐️ | Step 1, 4 |
| Step 6 | 測定・ログ | 2-3日 | ⭐️⭐️⭐️ | Step 1 |

**合計**: 17-23日（3.5-4.5週間）

**最優先パス（動的UIのみ）**: Step 1→2→3→4→6 = 14-19日（3-4週間）

---

## ✅ 完了基準

### 技術的完了基準
- [x] 動的UI版フローが完全動作
- [x] タスク推奨システムが動作
- [x] 行動報告ボタンが機能
- [x] スッキリ度測定が動作
- [x] A/B条件切り替えが動作
- [x] イベントログが正しく記録
- [x] 着手率が計算可能

### 研究的完了基準
- [x] 動的UI vs 固定UI の比較実験が可能
- [x] 着手率が測定可能
- [x] スッキリ度が測定可能
- [x] ユーザーテスト実施準備完了

---

## 🎯 次のステップ（Phase 3）

Phase 2完了後：
1. **ユーザーテスト実施**（5名程度、1週間）
2. センサーデータ統合（factors自動収集）
3. パフォーマンス最適化
4. フィードバック反映・改善

---

## 📚 関連ドキュメント

- `/specs/project/mvp_requirements.md` - MVP要件定義
- `/specs/project/task/PHASE1C_COMPLETION_REPORT.md` - Phase 1完了報告
- `/specs/project/phase2/data_models.md` - データモデル詳細
- `/specs/project/phase2/api_specification.md` - API仕様書
- `/specs/project/phase2/screen_specifications.md` - 画面仕様書
- `/specs/project/phase2/event_logging.md` - イベントログ定義
- `/specs/project/phase2/ab_testing.md` - A/Bテスト機構
- `/specs/project/phase2/implementation_tasks.md` - 実装タスク詳細

---

**作成者**: AI Agent (Claude Sonnet 4.5)  
**最終更新**: 2025年10月18日

