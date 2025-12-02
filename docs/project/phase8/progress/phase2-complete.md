# Phase 2: LLM呼び出し改修 完了報告

**Date**: 2025-12-02
**Status**: Complete

---

## 概要

DSL v4の3段階LLM呼び出しシステムを実装。タスク別モデル切り替え、プロンプトテンプレート、検証サービスを含む。

---

## 完了タスク

### TASK-2.1: LLMTaskConfig型定義

**ファイル**: `server/src/types/v4/llm-task.types.ts`

- LLMTaskType（5種類のタスク種別）
- LLMTaskCategory（general/structured）
- ModelConfig、LLMTaskConfig型
- ExperimentPattern（実験パターン設定）
- LLMCallMetrics、LLMCallResult型
- DEFAULT_LLM_TASK_CONFIGS

### TASK-2.2: タスク別モデル切り替え基盤

**ファイル**: `server/src/services/v4/LLMOrchestrator.ts`

- LLMOrchestrator クラス
  - タスク種別に応じたモデル選択
  - リトライ・タイムアウト処理
  - メトリクス収集コールバック
- InMemoryPromptTemplateManager
- LLMServiceInterface（プロバイダー抽象化）

### TASK-2.3: WidgetSelectionService実装

**ファイル**: `server/src/services/v4/WidgetSelectionService.ts`

- WidgetSelectionService クラス
  - 4ステージ分のWidget一括選定
  - Complexity閾値検証
  - フォールバック選定（ルールベース）
- ボトルネック種別に応じたデフォルトWidget

### TASK-2.4: ORSGeneratorService実装

**ファイル**: `server/src/services/v4/ORSGeneratorService.ts`

- ORSGeneratorService クラス
  - Widget入出力ポートからEntity/Attribute生成
  - DependencyGraph生成
  - 前ステージからのコンテキスト引き継ぎ
  - フォールバックORS生成

### TASK-2.5: UISpecGeneratorV4実装

**ファイル**: `server/src/services/v4/UISpecGeneratorV4.ts`

- UISpecGeneratorV4 クラス
  - WidgetSpec生成（DataBinding含む）
  - ReactiveBinding生成（Reactivityモード対応）
  - ORS-Widget間の型マッピング
  - フォールバックUISpec生成

### TASK-2.6: プロンプトテンプレート作成

**ディレクトリ**: `server/src/prompts/v4/`

- `capture-diagnosis.prompt.ts`: ボトルネック診断
- `widget-selection.prompt.ts`: Widget選定
- `ors-generation.prompt.ts`: ORS + DpG生成
- `uispec-generation.prompt.ts`: UISpec + ReactiveBinding生成
- `summary-generation.prompt.ts`: まとめ生成
- `index.ts`: プロンプトテンプレートマップ

### TASK-2.7: バリデーション・エラーログ強化

**ファイル**: `server/src/services/v4/ValidationService.ts`

- ValidationService クラス
  - WidgetSelectionResult検証
  - ORS検証（Entity, Attribute, DependencyGraph）
  - UISpec検証（WidgetSpec, DataBinding, ReactiveBinding）
  - 循環参照検出
  - 厳格モード対応

---

## ファイル一覧

### 新規ファイル

```
server/src/types/v4/
└── llm-task.types.ts          # LLMタスク設定型

server/src/services/v4/
├── index.ts                   # サービスエクスポート
├── LLMOrchestrator.ts         # LLM呼び出しオーケストレーター
├── WidgetSelectionService.ts  # Stage 1: Widget選定
├── ORSGeneratorService.ts     # Stage 2: ORS生成
├── UISpecGeneratorV4.ts       # Stage 3: UISpec生成
└── ValidationService.ts       # 検証サービス

server/src/prompts/v4/
├── index.ts
├── capture-diagnosis.prompt.ts
├── widget-selection.prompt.ts
├── ors-generation.prompt.ts
├── uispec-generation.prompt.ts
└── summary-generation.prompt.ts
```

---

## アーキテクチャ

### 3段階LLM呼び出しフロー

```
Capture Phase
    │
    ├─ [LLM] capture_diagnosis → BottleneckType
    │
Breakdown Phase (4 stages)
    │
    ├─ [LLM] Stage 1: widget_selection → WidgetSelectionResult
    │
    │  For each stage (diverge → organize → converge → summary):
    │
    ├─ [LLM] Stage 2: ors_generation → ORS + DependencyGraph
    │
    ├─ [LLM] Stage 3: uispec_generation → UISpec + ReactiveBindingSpec
    │
    └─ [LLM] summary_generation → Summary
```

### タスクカテゴリとモデル設定

| カテゴリ | タスク | モデル | Temperature |
|---------|--------|--------|-------------|
| general | capture_diagnosis, widget_selection, summary_generation | gemini-2.5-flash | 0.7 |
| structured | ors_generation, uispec_generation | gemini-2.5-flash | 0.3 |

### サービス依存関係

```
LLMOrchestrator
    │
    ├── WidgetSelectionService
    │       │
    │       └── getAllWidgetDefinitionsV4()
    │
    ├── ORSGeneratorService
    │       │
    │       └── getWidgetDefinitionV4()
    │
    └── UISpecGeneratorV4
            │
            └── getWidgetDefinitionV4()
```

---

## プロンプトテンプレート変数

### widget-selection
- `{{concernText}}`: ユーザーの悩み
- `{{bottleneckType}}`: ボトルネック種別
- `{{widgetDefinitions}}`: Widget定義JSON

### ors-generation
- `{{concernText}}`: ユーザーの悩み
- `{{stage}}`: ステージ種別
- `{{stagePurpose}}`: ステージの目的
- `{{stageTarget}}`: ステージの対象
- `{{selectedWidgets}}`: 選定Widget JSON
- `{{widgetPortInfo}}`: Widget入出力ポート情報
- `{{previousStageResult}}`: 前ステージ結果

### uispec-generation
- `{{ors}}`: ORS JSON
- `{{stageSelection}}`: ステージ選定情報
- `{{stage}}`: ステージ種別
- `{{widgetDefinitions}}`: Widget定義JSON
- `{{enableReactivity}}`: Reactivity有効フラグ

---

## 検証項目

### WidgetSelectionResult
- バージョンチェック（4.0）
- 各ステージのWidget数（1-3推奨）
- Complexity閾値
- Widget定義存在確認
- ステージ適合性

### ORS
- バージョンチェック（4.0）
- Entity ID重複
- Attribute名重複
- structuralType妥当性
- DependencyGraphのsource/target参照
- concernエンティティ存在

### UISpec
- バージョンチェック（4.0）
- Widget ID重複
- ポート存在確認
- DataBinding整合性（ORS参照）
- ReactiveBinding循環参照検出
- complexity警告

---

## 次のステップ

Phase 3: レンダラー改修
- TASK-3.1: UIRendererV4の実装
- TASK-3.2: DataBindingHandler実装
- TASK-3.3: ReactiveBindingHandler実装
- TASK-3.4: Widgetコンポーネント改修

---

## 変更履歴

| Date | Changes |
|------|---------|
| 2025-12-02 | Phase 2完了 |
