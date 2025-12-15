# Phase 1: 型定義・基盤 完了報告

**Date**: 2025-12-02
**Status**: Complete

---

## 概要

DSL v4の型定義・基盤実装を完了。Jelly Framework準拠の3層DSL構造に対応した新しい型システムを構築。

---

## 完了タスク

### TASK-1.1: ORS型定義（Server）

**ファイル**: `server/src/types/v4/ors.types.ts`

- 抽象型（SVAL, ARRY, PNTR, DICT）の定義
- Entity, Attribute, Constraint, GenerationSpecの型定義
- ORS（Object-Relational Schema）の型定義
- 型ガード関数の実装

### TASK-1.2: DependencyGraph型定義（Server）

**ファイル**: `server/src/types/v4/dependency-graph.types.ts`

- DataDependency型（entityId.attributeName形式）
- RelationshipSpec型（javascript, transform, llm）
- DependencyGraph型
- グラフ解析ユーティリティ（トポロジカルソート等）

### TASK-1.3: UISpec型定義改修（Server）

**ファイル**: `server/src/types/v4/ui-spec.types.ts`

- UISpec型（ReactiveBindingSpec含む）
- WidgetSpec型（DataBindingSpec含む）
- DataBindingSpec型（portId, entityAttribute, direction）
- ScreenLayout, UISpecMetadata型

### TASK-1.4: ReactiveBindingSpec型定義（Server）

**ファイル**: `server/src/types/v4/reactive-binding.types.ts`

- ReactiveBinding型（widgetId.portId形式）
- WidgetRelationshipSpec型
- UpdateMode型（realtime, debounced, on_confirm）
- バインディング解析ユーティリティ

### TASK-1.5: WidgetSelectionResult型定義（Server）

**ファイル**: `server/src/types/v4/widget-selection.types.ts`

- WidgetSelectionResult型
- StageSelection型（4ステージ分）
- SelectedWidget型
- STAGE_ORDER, STAGE_NAMES定数

### TASK-1.6: Frontend型定義同期

**ディレクトリ**: `concern-app/src/types/v4/`

- Server側型定義をFrontendに同期
- widget-definition.types.tsは自己完結型に修正
- index.tsで全型をエクスポート

### TASK-1.7: Widget Definition改修（complexity追加）

**ファイル**:
- `server/src/types/v4/widget-definition.types.ts`
- `server/src/definitions/v4/widgets.ts`

- WidgetMetadataV4型（complexity追加）
- WidgetDefinitionV4型（summarizationPrompt追加）
- 13種のWidget定義（stage_summary含む）
- ComplexityRulesとバリデーション関数

---

## ファイル一覧

### Server側新規ファイル

```
server/src/types/v4/
├── index.ts
├── ors.types.ts
├── dependency-graph.types.ts
├── reactive-binding.types.ts
├── widget-selection.types.ts
├── ui-spec.types.ts
└── widget-definition.types.ts

server/src/definitions/v4/
└── widgets.ts
```

### Frontend側新規ファイル

```
concern-app/src/types/v4/
├── index.ts
├── ors.types.ts
├── dependency-graph.types.ts
├── reactive-binding.types.ts
├── widget-selection.types.ts
├── ui-spec.types.ts
└── widget-definition.types.ts
```

---

## 型システム概要

### 3層DSL構造

| 層 | 責務 | 主要型 |
|---|------|--------|
| TDDM層（ORS） | データモデル・依存関係 | ORS, Entity, Attribute, DependencyGraph |
| UISpec層 | Widget構成・連携 | UISpec, WidgetSpec, ReactiveBindingSpec |
| Widget Definitions | Widgetメタデータ | WidgetDefinitionV4, WidgetMetadataV4 |

### 型の使い分け

| 層 | 型系統 | 参照形式 |
|---|--------|---------|
| TDDM層 | 抽象型（SVAL/ARRY/PNTR/DICT） | `entityId.attributeName` |
| UISpec層 | 具体型（string/number等） | `widgetId.portId` |

### DpG/ReactiveBinding分離

| 概念 | 責務 | 定義場所 |
|------|------|---------|
| DependencyGraph | データ間依存 | TDDM層（ORS内） |
| ReactiveBinding | Widget間連携 | UISpec層 |

---

## complexity値一覧

| Widget | complexity | 分類 |
|--------|-----------|------|
| free_writing | 0.1 | シンプル |
| stage_summary | 0.1 | シンプル |
| export_options | 0.1 | シンプル |
| brainstorm_cards | 0.2 | シンプル |
| summary_view | 0.2 | シンプル |
| emotion_palette | 0.3 | シンプル |
| action_cards | 0.3 | シンプル |
| priority_slider_grid | 0.3 | シンプル |
| card_sorting | 0.4 | 中程度 |
| timeline_view | 0.4 | 中程度 |
| concern_map | 0.5 | 中程度 |
| matrix_placement | 0.5 | 中程度 |
| decision_balance | 0.5 | 中程度 |

---

## 次のステップ

Phase 2: LLM呼び出し改修
- TASK-2.1: LLMTaskConfig型定義
- TASK-2.2: タスク別モデル切り替え基盤
- TASK-2.3: WidgetSelectionService実装
- TASK-2.4: ORSGeneratorService実装
- TASK-2.5: UISpecGeneratorV4実装
- TASK-2.6: プロンプトテンプレート作成
- TASK-2.7: バリデーション・エラーログ強化

---

## 変更履歴

| Date | Changes |
|------|---------|
| 2025-12-02 | Phase 1完了 |
