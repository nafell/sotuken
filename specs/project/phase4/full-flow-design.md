# Full-Flow 統合設計書

**Phase**: 4
**Version**: 1.0
**最終更新**: 2025-11-28

---

## 1. 概要

Full-Flowは、ユーザーの関心事を構造化し、具体的なタスクに分解するための3フェーズ統合フローです。

### 1.1 フロー構造

```
Capture → Plan (4 stages) → Breakdown
```

| フェーズ | 目的 | モード |
|---------|------|--------|
| Capture | 関心事入力・ボトルネック診断 | 固定UI |
| Plan | 思考の発散・整理・収束・まとめ | Widget (LLM生成) |
| Breakdown | タスク分解・スケジュール化 | 固定UI |

---

## 2. アーキテクチャ

### 2.1 コンポーネント構成

```
FullFlowDemoPage.tsx          # エントリーページ
├── FullFlowContainer.tsx     # メインコンテナ（状態管理）
│   ├── CapturePhase.tsx      # Captureフェーズ
│   ├── PlanPhase.tsx         # Planフェーズ（4ステージ）
│   └── BreakdownPhase.tsx    # Breakdownフェーズ
├── MetricsDashboard.tsx      # メトリクス表示
└── types.ts                  # 型定義
```

### 2.2 状態管理

`useFullFlowState` フックで全体状態を管理:

```typescript
interface FullFlowState {
  sessionId: string;
  phase: Phase;                    // 'capture' | 'plan' | 'breakdown' | 'complete'
  planStage: PlanStage | null;     // 'diverge' | 'organize' | 'converge' | 'summary'

  // Captureデータ
  concernText: string;
  bottleneckAnalysis: BottleneckAnalysis | null;
  diagnosticResponses: Record<string, any>;

  // Planデータ
  planStageResults: Partial<Record<PlanStage, StageResult>>;

  // Breakdownデータ
  breakdownTasks: GeneratedTask[];

  // タイムスタンプ
  startedAt: string;
  completedAt?: string;
}
```

---

## 3. Captureフェーズ

### 3.1 機能

1. **関心事テキスト入力**: ユーザーが悩み・課題を自由記述
2. **ボトルネック診断**: 8タイプから自動判定
3. **診断質問**: 判定されたボトルネックに応じた深掘り質問

### 3.2 ボトルネックタイプ

| タイプ | 説明 | 推奨Widget |
|--------|------|-----------|
| tooManyOptions | 選択肢が多すぎる | matrix_placement, priority_slider_grid |
| emotionalBlock | 感情的なブロック | emotion_palette, brainstorm_cards |
| noStartingPoint | 何から始めればいいか不明 | brainstorm_cards, mind_map |
| entangledProblems | 問題が絡み合っている | dependency_mapping, swot_analysis |
| lackOfInformation | 情報不足 | question_card_chain, mind_map |
| fearOfDecision | 決断への恐れ | emotion_palette, tradeoff_balance |
| fixedPerspective | 視点の固定化 | brainstorm_cards, swot_analysis |
| noPrioritization | 優先順位がつかない | priority_slider_grid, matrix_placement |

---

## 4. Planフェーズ（4ステージ）

### 4.1 ステージ構成

| ステージ | モード | 利用可能Widget | 目的 |
|---------|--------|----------------|------|
| diverge | widget | emotion_palette, brainstorm_cards, question_card_chain | 発散（アイデア展開） |
| organize | widget | card_sorting, dependency_mapping, swot_analysis, mind_map | 整理（構造化） |
| converge | widget | matrix_placement, priority_slider_grid, tradeoff_balance, timeline_slider | 収束（優先順位付け） |
| summary | widget | structured_summary | まとめ（結論出力） |

### 4.2 Widget選択ロジック

1. ボトルネックタイプに基づく推奨Widget
2. ステージごとの利用可能Widget制約
3. LLMによる最適Widget選定

### 4.3 ステージ遷移

```
diverge → organize → converge → summary
```

- 各ステージでWidget操作を完了後、次のステージへ遷移
- 前のステージへの戻りも可能

---

## 5. Breakdownフェーズ

### 5.1 機能

1. **タスク自動生成**: Planの結果からLLMがタスクを生成
2. **優先度設定**: high / medium / low
3. **時間見積もり**: 各タスクの所要時間
4. **ステータス管理**: pending / in_progress / completed

### 5.2 タスク構造

```typescript
interface GeneratedTask {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  source: string;        // 生成元ステージ
  estimatedMinutes?: number;
}
```

---

## 6. メトリクス収集

### 6.1 収集項目

| 項目 | 説明 |
|------|------|
| promptTokens | プロンプトのトークン数 |
| responseTokens | レスポンスのトークン数 |
| totalTokens | 合計トークン数 |
| processingTimeMs | 処理時間（ミリ秒） |
| model | 使用モデル名 |
| success | 成功/失敗 |

### 6.2 累積メトリクス

```typescript
interface CumulativeMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalPromptTokens: number;
  totalResponseTokens: number;
  totalTokens: number;
  totalTimeMs: number;
  avgTimePerCall: number;
}
```

### 6.3 エクスポート

JSON形式でエクスポート可能:
- セッションID
- 関心事テキスト
- 各ステージのメトリクス
- 累積メトリクス

---

## 7. 関連ファイル

### 7.1 コンポーネント

| ファイル | 説明 |
|---------|------|
| `concern-app/src/pages/dev-demo/FullFlowDemoPage.tsx` | エントリーページ |
| `concern-app/src/components/demo/full-flow/FullFlowContainer.tsx` | メインコンテナ |
| `concern-app/src/components/demo/full-flow/CapturePhase.tsx` | Captureフェーズ |
| `concern-app/src/components/demo/full-flow/PlanPhase.tsx` | Planフェーズ |
| `concern-app/src/components/demo/full-flow/BreakdownPhase.tsx` | Breakdownフェーズ |
| `concern-app/src/components/demo/full-flow/MetricsDashboard.tsx` | メトリクス表示 |
| `concern-app/src/components/demo/full-flow/types.ts` | 型定義 |

### 7.2 フック・サービス

| ファイル | 説明 |
|---------|------|
| `concern-app/src/hooks/useFullFlowState.ts` | 状態管理フック |
| `concern-app/src/services/FullFlowMetricsService.ts` | メトリクスサービス |

### 7.3 型定義

| ファイル | 説明 |
|---------|------|
| `concern-app/src/types/BottleneckTypes.ts` | ボトルネック型定義 |

---

## 8. ルーティング

| パス | コンポーネント |
|------|---------------|
| `/` | FullFlowDemoPage（メインエントリー） |
| `/dev-demo/full-flow` | FullFlowDemoPage（開発用パス） |

---

## 9. 今後の拡張

1. **Widget追加**: timeline_builder, comparison_table等
2. **マルチセッション**: 複数フローの保存・復元
3. **カスタムフロー**: ステージ構成のカスタマイズ
4. **協調編集**: 複数ユーザーでの共同作業
