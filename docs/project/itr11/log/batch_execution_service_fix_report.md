# BatchExecutionService プロンプト変数不足修正レポート

**日付:** 2025-12-11
**対象ファイル:** `server/src/services/BatchExecutionService.ts`

---

## 問題概要

バッチ実験で以下のエラーが継続発生：
- **INVALID_UISPEC** - UISpecの`widgets`プロパティが存在しない
- **UNKNOWN_WIDGET** - 未知のWidgetが選定される
- **INVALID_ORS** - ORSの構造が不正

---

## 根本原因

`BatchExecutionService.buildPromptVariables()` が各ステージに必要なプロンプト変数を提供していなかった。

### 問題のあったコード

```typescript
// BatchExecutionService（修正前）
private buildPromptVariables(taskType, input, previousStages) {
  const base = { concernText, contextFactors };

  switch (taskType) {
    case 'widget_selection':
      return base;  // ❌ bottleneckType, widgetDefinitions が不足

    case 'plan_ors_generation':
      return { ...base, widgetSelection };  // ❌ 多数不足

    case 'plan_uispec_generation':
      return { ...base, ors };  // ❌ 多数不足
  }
}
```

### 正しい実装（/research-experiment/new）

`/research-experiment/new`ページはv4サービス群を使用し、各サービスが適切な変数構築を行う：

```
POST /ui/generate-v4-widgets
  → WidgetSelectionService.selectWidgets({ concernText, bottleneckType, sessionId })
    → 内部でwidgetDefinitionsを取得

POST /ui/generate-v4-plan
  → ORSGeneratorService.generatePlanORS({
      concernText, bottleneckType, widgetSelectionResult, sessionId
    })
    → 内部でdivergeWidgets, organizeWidgets, convergeWidgets, widgetPortInfoを構築

  → UISpecGeneratorV4.generatePlanUISpec({
      planORS, concernText, widgetSelectionResult, sessionId, enableReactivity
    })
    → 内部でセクション別定義、ポート情報、W2WRヒント等を構築
```

---

## 修正内容

### 方針（A案採用）

BatchExecutionServiceから**v4サービス群を直接利用**するように変更。

**メリット:**
- `/research-experiment/new`と完全に同じ処理パス
- 変数構築ロジックの重複を避ける
- 保守性が高い（サービス更新時に自動追従）

### 変更詳細

#### 1. インポート追加

```typescript
import { WidgetSelectionService } from './v4/WidgetSelectionService';
import { ORSGeneratorService } from './v4/ORSGeneratorService';
import { UISpecGeneratorV4 } from './v4/UISpecGeneratorV4';
import { LLMOrchestrator } from './v4/LLMOrchestrator';
import type { WidgetSelectionResult } from '../types/v4/widget-selection.types';
import type { PlanORS } from '../types/v4/ors.types';
import type { PlanUISpec } from '../types/v4/ui-spec.types';
```

#### 2. 新規メソッド追加

| メソッド | 説明 |
|---------|------|
| `createV4Services()` | モデル構成に応じたv4サービス群を作成 |
| `executeWidgetSelection()` | Stage 1: Widget選定 |
| `executePlanORSGeneration()` | Stage 2: PlanORS生成 |
| `executePlanUISpecGeneration()` | Stage 3: PlanUISpec生成 |
| `inferBottleneckType()` | emotionalStateからボトルネックタイプ推定 |
| `updateStageProgress()` | ステージ進捗更新 |
| `incrementCompletedStages()` | 完了ステージ数インクリメント |
| `createErrorStageResult()` | エラーステージ結果作成 |
| `createTrialResult()` | 試行結果作成 |

#### 3. 削除したメソッド

| メソッド | 理由 |
|---------|------|
| `buildPromptVariables()` | v4サービス群が内部で変数構築 |
| `executeStage()` | ステージ別メソッドに分割 |
| `validateStageOutput()` | 各ステージ実行メソッド内で検証 |

#### 4. executeTrial() 書き換え

```typescript
private async executeTrial(context, input): Promise<TrialResult> {
  // モデル構成に応じたOrchestratorを作成
  const orchestrator = createExperimentOrchestrator(modelConfigId);

  // v4サービス群を作成
  const services = this.createV4Services(orchestrator);

  // bottleneckType推定
  const bottleneckType = this.inferBottleneckType(input.contextFactors);
  const sessionId = `batch-${batchId}-${trialNumber}`;

  // Stage 1: Widget Selection
  const stage1Result = await this.executeWidgetSelection(services, concernText, bottleneckType, sessionId);

  // Stage 2: Plan ORS Generation
  const stage2Result = await this.executePlanORSGeneration(services, concernText, bottleneckType, widgetSelectionResult, sessionId);

  // Stage 3: Plan UISpec Generation
  const stage3Result = await this.executePlanUISpecGeneration(services, concernText, widgetSelectionResult, planORS, sessionId);
}
```

---

## ボトルネックタイプ推定ロジック

`contextFactors.emotionalState`からボトルネックタイプを推定：

| emotionalState | bottleneckType |
|----------------|----------------|
| `confused` | `information` |
| `anxious` | `emotional` |
| `overwhelmed` | `planning` |
| `stuck` | `thought` |
| `neutral` | `thought` |
| (その他) | `thought` |

---

## 修正前後の比較

### Stage 1: Widget Selection

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| 呼び出し方法 | `orchestrator.execute('widget_selection', variables)` | `widgetSelectionService.selectWidgets(input)` |
| concernText | ✅ | ✅ |
| bottleneckType | ❌ 不足 | ✅ |
| widgetDefinitions | ❌ 不足 | ✅（サービス内部で取得） |

### Stage 2: Plan ORS Generation

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| 呼び出し方法 | `orchestrator.execute('plan_ors_generation', variables)` | `orsGeneratorService.generatePlanORS(input)` |
| concernText | ✅ | ✅ |
| bottleneckType | ❌ 不足 | ✅ |
| divergeWidgets | ❌ 不足 | ✅（サービス内部で構築） |
| organizeWidgets | ❌ 不足 | ✅（サービス内部で構築） |
| convergeWidgets | ❌ 不足 | ✅（サービス内部で構築） |
| widgetPortInfo | ❌ 不足 | ✅（サービス内部で構築） |
| sessionId | ❌ 不足 | ✅ |

### Stage 3: Plan UISpec Generation

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| 呼び出し方法 | `orchestrator.execute('plan_uispec_generation', variables)` | `uiSpecGeneratorService.generatePlanUISpec(input)` |
| ors | ✅（生データ） | ✅（JSON文字列化） |
| concernText | ✅ | ✅ |
| divergeSelection | ❌ 不足 | ✅（サービス内部で構築） |
| divergePurpose | ❌ 不足 | ✅（サービス内部で構築） |
| divergeTarget | ❌ 不足 | ✅（サービス内部で構築） |
| divergePortInfo | ❌ 不足 | ✅（サービス内部で構築） |
| (organize/converge同様) | ❌ 不足 | ✅ |
| widgetDefinitions | ❌ 不足 | ✅（サービス内部で構築） |
| enableReactivity | ❌ 不足 | ✅ |
| w2wrHints | ❌ 不足 | ✅（サービス内部で生成） |
| generatedValueChecklist | ❌ 不足 | ✅（サービス内部で生成） |
| sessionId | ❌ 不足 | ✅ |

---

## ログ分析（修正前の問題）

### batch_widget-selection-prompt.md

```json
{
  "concernText": "副業を始めたいが...",
  "contextFactors": {...}
}
```
**問題:** `bottleneckType`, `widgetDefinitions` が不足

### batch_orsdpg-prompt.md

Stage1出力に`{{bottleneckType}}`が未解決で残っている。
**問題:** Stage1で変数が渡されなかったため、出力にプレースホルダーが残った

### batch_uispec-prompt.md

ORSに`{{bottleneckType}}`, `{{divergeWidgets}}`, `{{sessionId}}`等が未解決。
**問題:** Stage2でも変数が渡されなかったため、連鎖的にエラー発生

---

## 検証結果

### ビルド

```bash
$ bun run build
Bundled 383 modules in 89ms
```

### テスト

全テスト通過

---

## 今後の検証

修正後、以下を確認する必要がある：

1. Stage1出力にプレースホルダー`{{...}}`が残っていないこと
2. Stage2 ORS出力が正しいPlanORS構造（v5.0）であること
3. Stage3 UISpecがPlanUISpec構造（`sections`プロパティを含む）であること
4. INVALID_UISPEC, UNKNOWN_WIDGET, INVALID_ORSエラーが解消されること

バッチ実験を再実行して結果を確認することを推奨。
