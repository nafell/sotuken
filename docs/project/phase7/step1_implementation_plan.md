# Phase 7 Step 1: ページ構造/機能階層の見直し - 実装計画

## 目標
実験環境 (`/research-experiment`) のページ構造を、使用者の目的（実験実施、データ閲覧、設定）に基づいて再編する。

## 1. ルーティング定義の変更 (`src/App.tsx`)

`App.tsx` の `/research-experiment` 配下のルーティングを以下のように更新する。

```typescript
// Phase 7: Research Experiment Pages
const ExperimentDashboard = lazy(() => import('./pages/research-experiment/ExperimentDashboard'));
const ExperimentLauncher = lazy(() => import('./pages/research-experiment/ExperimentLauncher')); // 新規
const TechnicalModeConfig = lazy(() => import('./pages/research-experiment/modes/TechnicalModeConfig')); // 新規
const ExpertModeConfig = lazy(() => import('./pages/research-experiment/modes/ExpertModeConfig')); // 新規
const UserModeConfig = lazy(() => import('./pages/research-experiment/modes/UserModeConfig')); // 新規
const CaseExecution = lazy(() => import('./pages/research-experiment/CaseExecution'));
const SessionList = lazy(() => import('./pages/research-experiment/SessionList'));
const SessionDetail = lazy(() => import('./pages/research-experiment/SessionDetail'));
const ReplayView = lazy(() => import('./pages/research-experiment/ReplayView'));

// Routes
<Route path="/research-experiment" element={<ExperimentDashboard />} />
<Route path="/research-experiment/new" element={<ExperimentLauncher />} />
<Route path="/research-experiment/new/technical" element={<TechnicalModeConfig />} />
<Route path="/research-experiment/new/expert" element={<ExpertModeConfig />} />
<Route path="/research-experiment/new/user" element={<UserModeConfig />} />
<Route path="/research-experiment/execute/:sessionId" element={<CaseExecution />} />
<Route path="/research-experiment/data/sessions" element={<SessionList />} />
<Route path="/research-experiment/data/sessions/:sessionId" element={<SessionDetail />} />
<Route path="/research-experiment/data/replay/:sessionId" element={<ReplayView />} />
```

## 2. ダッシュボードUIの刷新 (`src/pages/research-experiment/ExperimentDashboard.tsx`)

現在のダッシュボードを、目的別ナビゲーション中心のデザインに変更する。

### 変更点
- **ナビゲーションカード**: 以下の3つの大きなカードを配置。
    1.  **実験を行う (Run Experiment)**: `/research-experiment/new` へ遷移
    2.  **データを見る (View Data)**: `/research-experiment/data/sessions` へ遷移
    3.  **設定 (Settings)**: `/research-experiment/settings` へ遷移（今回はプレースホルダー）
- **クイックアクセス**: 最新のセッション履歴を簡易表示。

## 3. ランチャーページの実装 (`src/pages/research-experiment/ExperimentLauncher.tsx`)

実験モードを選択するランディングページを作成する。

### 機能
- 3つのモード（Technical, Expert, User）を選択するカードを表示。
- 各モードの説明と、推奨される用途を表示。

## 4. モード別設定ページの実装 (`src/pages/research-experiment/modes/*`)

各モードの開始前設定画面を作成する。

### 4.1 TechnicalModeConfig.tsx
- **目的**: 技術検証用（自動実行）
- **設定項目**:
    - テストケース選択（複数選択可、または「全ケース」）
    - Widget数条件（6/9/12）
    - モデル選択
- **アクション**: 「自動実行開始」ボタン → `/execute/:sessionId` へ遷移（自動実行フラグ付き）

### 4.2 ExpertModeConfig.tsx
- **目的**: 専門家評価用（手動操作・観察）
- **設定項目**:
    - 評価者ID
    - テストケース選択（単一）
    - Widget数条件
    - モデル選択
- **アクション**: 「評価開始」ボタン → `/execute/:sessionId` へ遷移

### 4.3 UserModeConfig.tsx
- **目的**: ユーザー実験用（被験者利用）
- **設定項目**:
    - 被験者ID（自動生成または手動入力）
    - Widget数条件（ランダム割り当て機能も検討だが、今回は手動選択）
- **アクション**: 「実験開始」ボタン → `/execute/:sessionId` へ遷移（空の状態でスタート）

## 検証計画
1.  **ルーティング確認**: 各URLに直接アクセスしてページが表示されるか。
2.  **ナビゲーション確認**: ダッシュボードから各モードの設定画面まで遷移できるか。
3.  **パラメータ引き継ぎ**: 設定画面から実行画面へ遷移する際、設定値が正しく渡されるか（コンソールログ等で確認）。
