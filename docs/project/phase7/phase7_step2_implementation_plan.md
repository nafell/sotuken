# Phase 7 Step 2: 未実装機能の実装・統合 (Core) - 実装計画

## 目標
`/dev-demo/full-flow` の思考整理ロジックを移植し、データベース保存機能と実験モード制御を追加した `ExperimentExecutor` を実装する。

## 1. アーキテクチャ設計

### 1.1 コンポーネント構成
`src/components/experiment/` ディレクトリを新規作成し、以下の構成で実装する。

```
src/components/experiment/
├── ExperimentExecutor.tsx       # メインコンテナ (FullFlowContainer相当)
├── hooks/
│   └── useExperimentFlow.ts     # ロジック & DB連携 (useFullFlowState相当)
├── phases/
│   ├── ExperimentCapture.tsx    # CapturePhase移植版
│   ├── ExperimentPlan.tsx       # PlanPhase移植版
│   └── ExperimentBreakdown.tsx  # BreakdownPhase移植版
└── types.ts                     # 型定義
```

### 1.2 データフロー
1.  **初期化**: `CaseExecution` ページから `sessionId`, `mode`, `initialContext` を受け取る。
2.  **状態管理**: `useExperimentFlow` がオンメモリで状態を保持しつつ、各ステップ完了時に `experimentApi` を通じてDBへ非同期保存する。
3.  **UI生成**: `ExperimentPlan` 等が `apiService` を呼び出してLLM生成を行う（既存ロジック踏襲）。

## 2. 実装ステップ

### Step 2-1: 型定義とフックの作成 (`useExperimentFlow.ts`)
*   `useFullFlowState.ts` をベースに作成。
*   **追加機能**:
    *   `saveStageResult`: ステージ完了時に `experimentApi.updateSession` と `experimentApi.saveWidgetState` を呼び出す。
    *   `autoProceed`: 技術検証モード用の自動進行ロジック（`useEffect` で状態遷移を監視し、自動で次へ進む）。

### Step 2-2: フェーズコンポーネントの移植 (`phases/*.tsx`)
*   デモ用コンポーネント (`src/components/demo/full-flow/*`) をコピーして調整。
*   **変更点**:
    *   `ExperimentCapture.tsx`:
        *   Expert/Technicalモード時は、初期値 (`concernText`) があれば自動で分析開始、またはスキップしてPlanへ遷移。
        *   Userモード時は通常通り入力待ち。
    *   `ExperimentPlan.tsx`:
        *   Technicalモード時は、UIレンダリング完了を待たずに（あるいはレンダリングしつつ）自動で「次へ」ボタンを押す挙動をエミュレート。

### Step 2-3: エグゼキュータの実装 (`ExperimentExecutor.tsx`)
*   `FullFlowContainer.tsx` をベースに作成。
*   モードに応じたヘッダー表示（「技術検証: 自動実行中...」など）。
*   エラーハンドリングとリトライ機能の強化。

### Step 2-4: ページへの統合 (`CaseExecution.tsx`)
*   現在のモック実装を削除。
*   `ExperimentExecutor` をマウント。
*   完了時の画面（ResultView）への遷移処理。

## 3. モード別挙動の詳細

| 機能 | Technical (技術検証) | Expert (専門家評価) | User (ユーザー実験) |
|---|---|---|---|
| **Capture** | スキップ (Planから開始) | スキップ or 確認のみ | 手動入力 |
| **Plan** | 自動進行 (APIコール -> 待機 -> 次へ) | 手動進行 (生成結果を確認 -> 次へ) | 手動進行 |
| **Breakdown** | 自動進行 | 手動進行 | 手動進行 |
| **完了後** | 自動で次のケースへ遷移 (Batch処理) | 評価アンケート表示 (Forms) | 完了画面表示 |

## 4. 検証計画
1.  **Userモード**: 手動で一通りのフロー（Capture -> Plan -> Breakdown）が実施でき、DBにデータが残ることを確認。
2.  **Expertモード**: テストケースの内容が初期表示され、Planフェーズから開始できることを確認。
3.  **Technicalモード**: 自動実行ボタンでフローが勝手に進み、完了することを確認。
