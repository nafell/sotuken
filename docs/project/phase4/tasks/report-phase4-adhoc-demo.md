# Phase 4 アドホックデモ環境構築報告書

**作成日**: 2025-01-26
**対象範囲**: Full-Flow デモページ（capture → plan(4 stages) → breakdown）
**アクセスURL**: `/dev-demo/full-flow`

---

## 📋 概要

Phase 4で実装した動的UI生成機能を統合テストするためのデモ環境を構築しました。このデモページは、将来的にアプリ本体の画面を置き換えるPoCとして設計されています。

### 目的
1. **フロー全体の検証**: capture → plan(4ステージ) → breakdown の完全フローをテスト
2. **LLMメトリクス計測**: トークン消費量、レスポンス時間をリアルタイムで可視化
3. **Widget制限テスト**: 実装済み4種Widgetのみを使用した生成の検証
4. **テキストモード検証**: Widget未実装ステージでのテキストサマリー生成

---

## 🏗️ 構築内容

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│ FullFlowDemoPage (/dev-demo/full-flow)                      │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│ │ FullFlowContainer           │ │ MetricsDashboard        │ │
│ │ ┌─────────────────────────┐ │ │ - Total Calls           │ │
│ │ │ CapturePhase            │ │ │ - Total Tokens          │ │
│ │ │ - テキスト入力          │ │ │ - Total Time            │ │
│ │ │ - ConcernAnalyzer       │ │ │ - Recent Calls          │ │
│ │ │ - DiagnosticQuestions   │ │ │                         │ │
│ │ └─────────────────────────┘ │ ├─────────────────────────┤ │
│ │ ┌─────────────────────────┐ │ │ Implementation Status   │ │
│ │ │ PlanPhase (4 stages)    │ │ │ - emotion_palette ✓     │ │
│ │ │ - diverge (Widget)      │ │ │ - brainstorm_cards ✓    │ │
│ │ │ - organize (Text)       │ │ │ - matrix_placement ✓    │ │
│ │ │ - converge (Widget)     │ │ │ - priority_slider_grid ✓│ │
│ │ │ - summary (Text)        │ │ │ - timeline_builder ✗    │ │
│ │ └─────────────────────────┘ │ │ - comparison_table ✗    │ │
│ │ ┌─────────────────────────┐ │ │ - mind_map ✗            │ │
│ │ │ BreakdownPhase          │ │ │ - decision_tree ✗       │ │
│ │ │ - Plan結果サマリー      │ │ └─────────────────────────┘ │
│ │ │ - タスク生成・選択      │ │                             │
│ │ └─────────────────────────┘ │                             │
│ └─────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

### フロー設計

| フェーズ | ステージ | モード | 使用Widget/機能 |
|---------|---------|--------|----------------|
| Capture | - | 固定UI | ConcernAnalyzer, DiagnosticQuestionService |
| Plan | diverge | Widget | emotion_palette, brainstorm_cards |
| Plan | organize | Text | LLMテキストサマリー生成 |
| Plan | converge | Widget | matrix_placement, priority_slider_grid |
| Plan | summary | Text | LLMテキストサマリー生成 |
| Breakdown | - | 固定UI | Plan結果からタスク生成 |

---

## 📁 作成ファイル一覧

### サーバー側

| ファイル | 変更内容 |
|---------|---------|
| `server/src/services/UISpecGeneratorV3.ts` | Widget制限オプション、テキストモード追加 |
| `server/src/routes/ui.ts` | オプションパラメータ対応 |

### クライアント側

| ファイル | 説明 |
|---------|------|
| `concern-app/src/components/demo/full-flow/types.ts` | 型定義 |
| `concern-app/src/services/FullFlowMetricsService.ts` | メトリクス収集・集計サービス |
| `concern-app/src/hooks/useFullFlowState.ts` | フロー状態管理フック |
| `concern-app/src/components/demo/full-flow/CapturePhase.tsx` | 入力+診断UI |
| `concern-app/src/components/demo/full-flow/PlanPhase.tsx` | 4ステージUI |
| `concern-app/src/components/demo/full-flow/BreakdownPhase.tsx` | タスク生成UI |
| `concern-app/src/components/demo/full-flow/MetricsDashboard.tsx` | メトリクス表示 |
| `concern-app/src/components/demo/full-flow/FullFlowContainer.tsx` | メインコンテナ |
| `concern-app/src/components/demo/full-flow/index.ts` | エクスポート |
| `concern-app/src/pages/dev-demo/FullFlowDemoPage.tsx` | デモページ |
| `concern-app/src/services/api/ApiService.ts` | V3オプション対応 |
| `concern-app/src/App.tsx` | ルート追加 |

---

## 🔧 技術的な実装詳細

### 1. Widget制限機能

**目的**: 実装済みの4種Widgetのみを使用してUI生成

```typescript
// server/src/services/UISpecGeneratorV3.ts
const IMPLEMENTED_WIDGETS: WidgetComponentType[] = [
  'emotion_palette',
  'brainstorm_cards',
  'matrix_placement',
  'priority_slider_grid',
];

// オプションで制限を有効化
if (options?.restrictToImplementedWidgets) {
  stageWidgets = stageWidgets.filter(w => IMPLEMENTED_WIDGETS.includes(w));
}
```

### 2. テキストモード

**目的**: Widget未実装ステージ（organize, summary）での代替手段

```typescript
// ステージにWidgetがない場合、テキストサマリーを生成
if (stageWidgets.length === 0 || options?.textOnlyMode) {
  return this.generateTextSummary(request);
}
```

**プロンプト例（organizeステージ）**:
```
あなたは思考整理のアシスタントです。
ユーザーの関心事を分析し、整理フェーズとして情報を構造化してください。

[関心事]
${concernText}

[前ステージの結果]
${previousStageResults}

回答は日本語で、構造化されたサマリーとして提供してください。
```

### 3. メトリクス収集

**FullFlowMetricsService**:
- LLM呼び出しごとにメトリクスを記録
- 累計値（トークン、時間、成功/失敗）をリアルタイム計算
- JSON形式でエクスポート可能

```typescript
interface StageMetrics {
  id: string;
  phase: Phase;
  stage?: PlanStage;
  operation: string;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
  processingTimeMs: number;
  model: string;
  timestamp: string;
  success: boolean;
  error?: string;
}
```

### 4. 状態管理フック

**useFullFlowState**:
- セッションID生成
- フェーズ/ステージ遷移管理
- Widget結果の保存
- 進捗率計算

```typescript
const {
  state,                    // 全体状態
  setConcernText,           // 関心事テキスト設定
  setBottleneckAnalysis,    // ボトルネック診断結果設定
  setPlanStageResult,       // Planステージ結果設定
  addWidgetResult,          // Widget結果追加
  goToNextPlanStage,        // 次のPlanステージへ
  progress,                 // 進捗情報
  resetFlow,                // フローリセット
} = useFullFlowState();
```

---

## 📊 Gitコミット履歴

| コミット | 内容 |
|---------|------|
| `85c1c0a` | feat: Add widget restriction and text mode to UISpecGeneratorV3 |
| `635e1e7` | feat: Add UISpecV3GenerationOptions to ApiService |
| `02483ee` | feat: Add Full-Flow demo infrastructure (types, services, hooks) |
| `831348a` | feat: Add Full-Flow demo UI components |
| `5a0ee51` | feat: Add Full-Flow demo page with /dev-demo/full-flow route |

---

## 🚀 使用方法

### 1. 開発サーバー起動

```bash
# ターミナル1: サーバー
cd server && bun run dev

# ターミナル2: フロントエンド
cd concern-app && bun run dev
```

### 2. デモページにアクセス

```
http://localhost:5173/dev-demo/full-flow
```

### 3. フロー実行

1. **Capture**: 関心事を入力 → 分析開始 → 診断質問に回答 → 診断完了
2. **Plan diverge**: UI生成 → Widgetに入力 → 次のステージ
3. **Plan organize**: UI生成 → テキストサマリー確認 → 次のステージ
4. **Plan converge**: UI生成 → Widgetに入力 → 次のステージ
5. **Plan summary**: UI生成 → テキストサマリー確認 → 次のステージ
6. **Breakdown**: タスク生成 → タスク選択 → フロー完了

### 4. メトリクスエクスポート

右側のMetrics Dashboardパネルの「Export JSON」ボタンでメトリクスをダウンロード。

---

## ⚠️ 既知の制限事項

### 1. 実装済みWidgetのみ使用
- 4種類: emotion_palette, brainstorm_cards, matrix_placement, priority_slider_grid
- 残り8種類は未実装のため、organize/summaryステージはテキストモードで代替

### 2. Breakdownフェーズの簡易実装
- 現在はクライアント側でダミータスクを生成
- 将来的にはLLMによるタスク生成を実装予定

### 3. セッション永続化なし
- ページリロードでフロー状態がリセット
- 将来的にはsessionStorageまたはサーバー側保存を検討

---

## 📈 今後の拡張案

1. **残りWidgetの実装**: timeline_builder, comparison_table, mind_map, decision_tree等
2. **LLMタスク生成**: Breakdownフェーズでのサーバー側タスク生成
3. **A/Bテスト統合**: 実験条件に応じたフロー分岐
4. **データ永続化**: フロー状態のサーバー側保存
5. **本番アプリへの統合**: デモ環境からアプリ本体への移行

---

## 🔗 関連ドキュメント

- `specs/project/phase4/phase4_plan.md`: Phase 4全体計画
- `specs/project/phase4/phase4_detailed_tasks.md`: 詳細タスク定義
- `specs/project/phase4/tasks/phase4_part2_handover.md`: Part 2引き継ぎ書
- `specs/dsl-design/widget-types-v3.md`: Widget仕様

---

**作成者**: Claude Code (AI Assistant)
**最終更新**: 2025-01-26
