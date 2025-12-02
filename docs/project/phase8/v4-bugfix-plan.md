# DSL v4 バグ修正・統合計画

> 作成日: 2024-12-02
> ステータス: 計画中

## 背景

Phase 8でDSL v4を実装しアプリに統合したが、以下の問題が発見された:
1. Widgetが表示されない（空配列）
2. Plan Previewページが表示されない

また、V4の3段階LLMパイプラインに対応するためDBスキーマの更新が必要。

---

## タスク一覧

### タスク0: DBスキーマ移行（最優先）

**目的**: V4の3段階LLMパイプライン（Widget Selection → ORS Generation → UISpec Generation）に対応

**手順**:
1. 既存テーブルのデータを削除（TRUNCATEまたはDROP）
2. `experiment_generations`テーブルを更新

**スキーマ変更内容** (`server/src/database/schema.ts`):

```typescript
// experimentGenerations テーブル
// 旧カラム（削除またはリネーム）
// - generatedOodm → 削除
// - generatedDsl → 削除

// 新カラム（V4対応）
generatedWidgetSelection: jsonb('generated_widget_selection'), // Stage 1: Widget選定結果
generatedOrs: jsonb('generated_ors'),                          // Stage 2: ORS
generatedUiSpec: jsonb('generated_ui_spec'),                   // Stage 3: UISpec v4

// メトリクス拡張
widgetSelectionTokens: integer('widget_selection_tokens'),
widgetSelectionDuration: integer('widget_selection_duration'),
orsTokens: integer('ors_tokens'),
orsDuration: integer('ors_duration'),
uiSpecTokens: integer('ui_spec_tokens'),
uiSpecDuration: integer('ui_spec_duration'),
```

**実行コマンド**:
```bash
# 1. PostgreSQLでデータ削除
psql -c "TRUNCATE experiment_generations, widget_states, experiment_sessions CASCADE;"

# 2. Drizzle migration生成
cd server && bun run db:generate

# 3. Migration適用
cd server && bun run db:migrate
```

---

### タスク1: プロンプトテンプレートの修正

**問題**: Widgetが表示されない（空配列）

**症状**: `uiSpec.widgets` が `[]` で返される

**根本原因**: `createLLMOrchestratorWithDefaultPrompts()` で登録されるインラインプロンプトが簡易版で、詳細な出力例や必須フィールド（`version: "4.0"`等）の指示がない。専用プロンプトファイル（`prompts/v4/widget-selection.prompt.ts`）は存在するが使用されていない。

**ファイル**: `server/src/services/v4/LLMOrchestrator.ts`

**変更内容**:
1. `prompts/v4/` から実際のプロンプトをインポート
2. `createLLMOrchestratorWithDefaultPrompts()` でインラインプロンプトを削除し、専用ファイルを使用

```typescript
// インポート追加
import {
  WIDGET_SELECTION_PROMPT,
  ORS_GENERATION_PROMPT,
  UISPEC_GENERATION_PROMPT,
  // etc.
} from '../../prompts/v4';

// registerTemplate で専用プロンプトを使用
promptManager.registerTemplate('widget-selection', WIDGET_SELECTION_PROMPT);
```

**参照ファイル**:
- `server/src/prompts/v4/widget-selection.prompt.ts`
- `server/src/prompts/v4/ors-generation.prompt.ts`
- `server/src/prompts/v4/uispec-generation.prompt.ts`
- `server/src/prompts/v4/index.ts` (エクスポート確認)

---

### タスク2: デバッグログ追加

**ファイル**: `server/src/routes/ui.ts`

**変更内容**: V4サービス初期化時に `debug: true` を設定し、問題発生時のログを確認可能に

---

### タスク3: PlanPreview統合

**問題**: 流れを提示するページが表示されない

**症状**: PlanPhase開始前に計画プレビューが表示されない

**根本原因**: `PlanPreview` コンポーネントは実装済みだが、`ExperimentExecutor` に統合されていない

**統合方式**: Capture → **Plan Preview** → Plan Execution の3段階

**変更ファイル**:

1. **`concern-app/src/components/experiment/ExperimentExecutor.tsx`**
   - `FlowPhase` に `'plan-preview'` を追加
   - PlanPreview表示フェーズを挿入

2. **`concern-app/src/components/experiment/hooks/useExperimentFlow.ts`**
   - `widgetSelectionResult` を状態に追加
   - Plan Preview → Plan Execution の遷移ロジック

3. **新規 `ExperimentPlanPreview.tsx`** または **ExperimentPlan内統合**
   - Widget選定APIを呼び出し（最初のステージ生成時）
   - `widgetSelectionResult` を取得して `PlanPreview` に渡す
   - 「この計画で始める」ボタンで次フェーズへ

---

## 実装順序

1. **タスク0** (最優先): DBスキーマ移行 → データ削除 → migration
2. **タスク1**: プロンプト修正 → Widgetが生成されるように
3. **タスク2**: デバッグログ追加
4. **タスク3**: PlanPreview統合

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `server/src/database/schema.ts` | V4対応スキーマ変更 |
| `server/src/services/v4/LLMOrchestrator.ts` | プロンプトファイルからインポート |
| `server/src/prompts/v4/index.ts` | エクスポート確認・追加 |
| `server/src/routes/ui.ts` | デバッグ有効化 |
| `concern-app/src/components/experiment/ExperimentExecutor.tsx` | PlanPreviewフェーズ追加 |
| `concern-app/src/components/experiment/hooks/useExperimentFlow.ts` | widgetSelectionResult状態追加 |

---

## 完了条件

1. V4 API呼び出しで `uiSpec.widgets` に1個以上のWidgetが含まれる
2. Captureフェーズ完了後、PlanPreviewが表示される
3. PlanPreviewで「開始」後、4ステージのWidget表示が開始される
