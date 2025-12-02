# Phase 4: UI・フロー改修 完了報告

**Date**: 2025-12-02
**Status**: Complete

---

## 概要

DSL v4対応のUI/フロー機能を実装。計画提示画面、stage_summaryWidget、ナビゲーション機能、進捗表示UI、Widget操作言語化サービスを含む。

---

## 完了タスク

### TASK-4.1: 計画提示画面実装

**ファイル**: `concern-app/src/components/v4/PlanPreview.tsx`

- PlanPreview コンポーネント
  - WidgetSelectionResultの表示
  - 4ステージのWidget計画提示
  - 展開/折りたたみUI
  - 確認/キャンセル/再生成ボタン
- StageCard サブコンポーネント（ステージ詳細表示）
- WidgetCard サブコンポーネント（Widget詳細表示）

### TASK-4.2: stage_summary Widget実装

**ファイル**: `concern-app/src/components/widgets/v4/StageSummary/StageSummary.tsx`

- StageSummary コンポーネント
  - 前ステージまでの操作内容要約表示
  - スキップ状態の表示
  - Widget操作サマリー表示
- StageSummaryItem / WidgetSummaryItem 型定義
- StageBlock / WidgetSummaryBlock サブコンポーネント

### TASK-4.3: Widget操作言語化実装

**ファイル**: `server/src/services/v4/WidgetSummarizationService.ts`

- WidgetSummarizationService クラス
  - 単一Widget言語化（summarizeWidgetInteraction）
  - バッチ言語化（summarizeBatch）
  - ステージ全体要約（summarizeStage）
- Widget別言語化プロンプト（SUMMARIZATION_PROMPTS）
- フォールバック要約（LLM不使用時）

### TASK-4.4: ナビゲーション機能実装

**ファイル**: `concern-app/src/hooks/v4/useStageNavigation.ts`

- useStageNavigation カスタムフック
  - goToNextStage（次ステージ進行）
  - goToPreviousStage（前ステージ戻り）
  - skipCurrentStage（ステージスキップ）
  - goToStage（任意ステージ移動）
- ステージ結果管理（StageResult）
- Widget結果追加・テキストサマリー設定

### TASK-4.5: 進捗表示UI実装

**ファイル**: `concern-app/src/components/v4/StageProgress.tsx`

- StageProgress コンポーネント
  - コンパクト/詳細表示モード
  - ステージステータス表示（completed/current/pending/skipped）
  - クリック可能なステージナビゲーション
- StageIndicator サブコンポーネント
- ステータス判定・色分けロジック

---

## ファイル一覧

### 新規ファイル

```
concern-app/src/components/v4/
├── PlanPreview.tsx              # 計画提示画面
└── StageProgress.tsx            # 進捗表示UI

concern-app/src/components/widgets/v4/
└── StageSummary/
    └── StageSummary.tsx         # ステージサマリーWidget

concern-app/src/hooks/v4/
└── useStageNavigation.ts        # ナビゲーションフック

server/src/services/v4/
└── WidgetSummarizationService.ts  # Widget言語化サービス
```

### 更新ファイル

```
server/src/services/v4/index.ts  # WidgetSummarizationService追加
```

---

## アーキテクチャ

### UI階層

```
PlanPreview (計画確認)
    │
    └── WidgetSelectionResult表示
            │
            └── 4ステージのWidget計画

StageProgress (進捗表示)
    │
    └── ステージインジケーター
            │
            └── completed/current/pending/skipped

StageSummary (操作要約)
    │
    └── 前ステージの操作内容
            │
            └── Widget別サマリー
```

### ナビゲーションフロー

```
useStageNavigation
    │
    ├── currentStage (現在のステージ)
    │
    ├── stageHistory (履歴)
    │       │
    │       └── StageResult[]
    │
    ├── goToNextStage()
    │       │
    │       └── 現在の結果を履歴に保存 → 次ステージへ
    │
    ├── goToPreviousStage()
    │       │
    │       └── 後続ステージの履歴削除 → 前ステージへ
    │
    └── skipCurrentStage()
            │
            └── スキップとして記録 → 次ステージへ
```

### 言語化フロー

```
WidgetSummarizationService
    │
    ├── summarizeWidgetInteraction()
    │       │
    │       ├── Widget定義からプロンプト取得
    │       │
    │       ├── LLM呼び出し（summary_generation）
    │       │
    │       └── フォールバック要約（失敗時）
    │
    ├── summarizeBatch()
    │       │
    │       └── 並列処理で複数Widget要約
    │
    └── summarizeStage()
            │
            └── ステージ全体の統合要約
```

---

## コンポーネント仕様

### PlanPreview

```typescript
interface PlanPreviewProps {
  selectionResult: WidgetSelectionResult;
  concernText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
  showDetails?: boolean;
}
```

### StageProgress

```typescript
interface StageProgressProps {
  currentStage: StageType;
  stageHistory: StageResultSummary[];
  widgetSelectionResult?: WidgetSelectionResult;
  variant?: 'compact' | 'detailed';
  clickable?: boolean;
  onStageClick?: (stage: StageType) => void;
}
```

### useStageNavigation

```typescript
interface UseStageNavigationReturn {
  // State
  currentStage: StageType;
  stageHistory: StageResult[];
  currentStageIndex: number;
  totalStages: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  isComplete: boolean;
  // Actions
  goToNextStage: (result?: Partial<StageResult>) => void;
  goToPreviousStage: () => void;
  skipCurrentStage: () => void;
  goToStage: (stage: StageType) => void;
  addWidgetResult: (result: WidgetResultData) => void;
  setTextSummary: (summary: string) => void;
  getCurrentStageResult: () => StageResult | undefined;
  reset: () => void;
}
```

---

## Widget言語化プロンプト

各Widgetに固有の言語化プロンプトを定義:

| Widget | 出力形式 |
|--------|---------|
| emotion_palette | 感情リスト（強度付き） |
| brainstorm_cards | アイデア箇条書き |
| concern_map | 階層的な関心構造 |
| free_writing | 主要ポイントの抽出 |
| card_sorting | カテゴリ別分類 |
| matrix_placement | 象限別要約 |
| timeline_view | 時系列順要約 |
| priority_slider_grid | 優先度順リスト |
| decision_balance | メリット/デメリット比較 |
| action_cards | アクション項目リスト |

---

## フォールバック処理

LLMが使用できない場合のフォールバック要約:

- **emotion_palette**: `選択された感情: {感情名} ({強度}%)`
- **brainstorm_cards**: `作成されたアイデア: - {カード内容}`
- **card_sorting**: `カテゴリ分類: 【{カテゴリ}】: {件数}件`
- **priority_slider_grid**: `優先度（上位）: - {項目}: {優先度}`
- **free_writing**: `記述内容: {テキスト（100文字まで）}`

---

## 次のステップ

Phase 5: 統合テスト
- TASK-5.1: 単体テスト追加
- TASK-5.2: E2Eテスト追加
- TASK-5.3: パフォーマンス検証
- TASK-5.4: エラーケーステスト

---

## 変更履歴

| Date | Changes |
|------|---------|
| 2025-12-02 | Phase 4完了 |
