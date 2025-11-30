# Phase 7 Step 2: 未実装機能の実装・統合 (Core) - 実装計画 (Updated)

## 目標
`/dev-demo/full-flow` の思考整理ロジックを移植し、データベース保存機能と実験モード制御を追加した `ExperimentExecutor` を実装する。
**追加要件**:
1.  プロンプト、ルールベースレンダリング時間などの詳細メトリクスを記録する。
2.  **RDBの利点を活かし、生成履歴を別テーブル (`experiment_generations`) で 1-to-N 管理する。**

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
2.  **状態管理**: `useExperimentFlow` がオンメモリで状態を保持。
3.  **UI生成**: `ExperimentPlan` が `apiService.generateUIV3` を呼び出す（`sessionId` を渡す）。
4.  **サーバー側処理**:
    *   `UISpecGeneratorV3` がプロンプトを生成・実行し、呼び出し元 (`uiRoutes`) にプロンプトを返す。
    *   `uiRoutes` が `sessionId` を検証。
    *   **DB保存**: `experiment_generations` テーブルに新規レコードを作成し、**生成結果（OODM, DSL）、プロンプト、生成メトリクス** を保存する。
    *   **レスポンス**: クライアントに **UIスペック** と **`generationId`** を返す（プロンプトは返さない）。
5.  **クライアント側処理**:
    *   UIを受け取りレンダリング。
    *   レンダリング時間を計測。
    *   `experimentApi.updateGeneration` (New) を呼び出し、`generationId` を指定して **レンダリング時間 (`render_duration`)** を保存する。

## 2. 実装ステップ

### Step 2-0: データベーススキーマ更新 (New Table)
*   `server/src/database/schema.ts` に `experiment_generations` テーブルを追加。
    *   `id`: UUID (PK)
    *   `sessionId`: UUID (FK -> experiment_sessions.sessionId)
    *   `stage`: text (diverge, organize, etc.)
    *   `modelId`: text
    *   `prompt`: text
    *   `generatedOodm`: jsonb
    *   `generatedDsl`: jsonb
    *   `promptTokens`: integer
    *   `responseTokens`: integer
    *   `generateDuration`: integer (ms)
    *   `renderDuration`: integer (ms, nullable)
    *   `createdAt`: timestamp

### Step 2-1: バックエンド改修
*   **`server/src/services/UISpecGeneratorV3.ts`**:
    *   `generateUISpec` の戻り値に `prompt` を追加。
*   **`server/src/routes/ui.ts`**:
    *   `POST /generate-v3` ハンドラ内で、`experiment_generations` テーブルへの INSERT を実装。
    *   レスポンスに `generationId` を含める。
*   **`server/src/routes/experiment.ts`**:
    *   `PATCH /generations/:generationId` エンドポイントを追加（レンダリング時間更新用）。

### Step 2-2: フロントエンドAPIサービス更新 (`ExperimentApiService.ts`)
*   `updateGeneration(generationId: string, updates: { renderDuration: number })` メソッドを追加。

### Step 2-3: 型定義とフックの作成 (`useExperimentFlow.ts`)
*   `useFullFlowState.ts` をベースに作成。
*   **追加機能**:
    *   `saveStageResult`: ステージ完了時に `experimentApi.updateGeneration` を呼び出し、**レンダリング時間** を保存。
    *   `autoProceed`: 技術検証モード用の自動進行ロジック。

### Step 2-4: フェーズコンポーネントの移植 (`phases/*.tsx`)
*   デモ用コンポーネントをコピーして調整。
*   **変更点**:
    *   `ExperimentPlan.tsx`:
        *   APIレスポンスから `generationId` を受け取る。
        *   `UIRendererV3` のレンダリング時間を計測し、`useExperimentFlow` 経由で保存。

### Step 2-5: エグゼキュータの実装 (`ExperimentExecutor.tsx`)
*   `FullFlowContainer.tsx` をベースに作成。
*   モードに応じたヘッダー表示。

### Step 2-6: ページへの統合 (`CaseExecution.tsx`)
*   `ExperimentExecutor` をマウント。

## 3. 記録されるデータ一覧 (Updated)

| カテゴリ | テーブル | カラム | 説明 | 保存タイミング | 保存主体 |
|---|---|---|---|---|---|
| **セッション** | `experiment_sessions` | `sessionId` | セッションID | 作成時 | Client -> Server |
| | | `caseId`, `mode`... | 基本情報 | 作成時 | Client -> Server |
| **生成履歴** | `experiment_generations` | `id` | 生成ID | 生成時 | **Server** |
| | | `sessionId` | セッションID (FK) | 生成時 | **Server** |
| | | `stage` | ステージ名 | 生成時 | **Server** |
| | | `prompt` | **プロンプト全文** | 生成時 | **Server** |
| | | `generatedOodm` | OODM JSON | 生成時 | **Server** |
| | | `generatedDsl` | UI Spec DSL JSON | 生成時 | **Server** |
| | | `generateDuration` | **生成時間 (ms)** | 生成時 | **Server** |
| | | `renderDuration` | **レンダリング時間 (ms)** | レンダリング後 | **Client** |

## 4. 検証計画
1.  **データ記録確認**: フロー実行後、`experiment_generations` テーブルを確認し、各ステージのレコードが作成され、`prompt` (Server保存) と `renderDuration` (Client保存) が正しく記録されていることを確認する。
