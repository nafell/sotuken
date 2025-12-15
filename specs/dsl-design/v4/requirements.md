# DSL v4 要件定義書

**Version**: 4.0
**Date**: 2025-12-02
**Status**: Draft
**Based on**: [DSLv4_review_minutes.md](../../discussions/DSLv4_review_minutes.md)

---

## 目次

1. [概要](#1-概要)
2. [機能要件](#2-機能要件)
3. [非機能要件](#3-非機能要件)
4. [実装優先度](#4-実装優先度)
5. [継続検討事項](#5-継続検討事項)

---

## 1. 概要

### 1.1 目的

DSL v4は、v3の課題を解決し、Jelly論文の設計思想により忠実に準拠しつつ、本システム固有のオリジナリティを維持・強化することを目的とする。

### 1.2 v3からの主要変更点

| 観点 | v3 | v4 |
|------|-----|-----|
| LLM呼び出し | 1段階（一括生成） | 3段階（Widget選定→ORS/DpG→UISpec） |
| データモデル | OODM（形骸化） | ORS（活用強化） |
| DpG | UISpec内に配置 | TDDM層に移動 |
| Widget選定 | ステージ固定振り分け | timing/versatility/complexityベース動的選定 |
| ReactiveBinding | DpGと混在 | UISpec層に分離 |
| 型システム | 混在 | 層別使い分け（抽象型/具体型） |

**用語変更**: v3までの「OODM」はv4で「ORS」に変更。詳細は[DSL-Spec-v4.0.md 付録A](./DSL-Spec-v4.0.md#11-付録a-用語対応表v3v4)を参照。

### 1.3 Jellyとの関係

- **準拠**: 3層DSL構造、3段階LLM呼び出し、ORS/DpGの責務分離
- **オリジナル拡張**: Widget単位UI、W2W ReactiveBinding、complexity、generatedValue、stage_summary

---

## 2. 機能要件

### 2.1 DSL構造

#### REQ-DSL-001: 3層DSL構造の実装

**概要**: Jelly論文に準拠した3層DSL構造を実装する。

**詳細**:

| 層 | 名称 | 責務 | 型系統 |
|----|------|------|--------|
| Layer 1 | ORS + DpG（TDDM層） | データモデル・依存関係定義 | 抽象型（SVAL/ARRY/PNTR/DICT） |
| Layer 2 | UISpec + ReactiveBinding | UI仕様・Widget間連携 | 具体型（string/object[]等） |
| Layer 3 | Widget Definitions | プリセットWidget定義 | 具体型 |

**受入基準**:
- [ ] ORS InstanceがEntity/Attributeを含む形で生成される
- [ ] DpGがTDDM層で定義され、`entityId.attributeId`形式で参照する
- [ ] ReactiveBindingがUISpec層で定義され、`widgetId.portId`形式で参照する

---

#### REQ-DSL-002: ORS活用強化

**概要**: ORS（Object-Relational Schema）をデータモデル定義として活用する。

**詳細**:
```typescript
interface ORS {
  version: string;
  entities: Entity[];
  dependencyGraph: DependencyGraph;  // DpGをORS内に配置
  metadata?: DICT<SVAL>;
}

interface Entity {
  id: string;
  type: string;
  attributes: Attribute[];
  metadata?: DICT<SVAL>;
}

interface Attribute {
  name: string;
  structuralType: 'SVAL' | 'ARRY' | 'PNTR' | 'DICT';
  valueType?: string;           // 具体型（string, number等）
  itemType?: string;            // ARRY/DICTの場合の要素型
  schema?: Record<string, any>; // 複合型の場合のスキーマ
  constraints?: Constraint[];
  generation?: GenerationSpec;  // generatedValue用（将来拡張）
}
```

**受入基準**:
- [ ] LLMがORS Instanceを生成できる
- [ ] Entity/Attributeが悩みの内容に応じて動的に構成される
- [ ] PNTRによるWidget間データ参照が機能する

---

#### REQ-DSL-003: DpGとReactiveBindingの分離

**概要**: データ間依存（DpG）とUI連携（ReactiveBinding）を分離する。

**詳細**:

| 概念 | 責務 | 定義場所 | 参照形式 |
|------|------|---------|---------|
| DependencyGraph | データ間の依存関係（ビジネスロジック） | TDDM層（ORS内） | `entityId.attributeId` |
| ReactiveBinding | Widget間のUI連携（表示更新） | UISpec層 | `widgetId.portId` |

```typescript
// TDDM層（ORS内）
interface DependencyGraph {
  dependencies: DataDependency[];
}

interface DataDependency {
  source: string;  // "entityId.attributeId"
  target: string;  // "entityId.attributeId"
  mechanism: 'validate' | 'update';
  relationship: RelationshipSpec;
}

// UISpec層
interface ReactiveBindingSpec {
  bindings: ReactiveBinding[];
}

interface ReactiveBinding {
  source: string;  // "widgetId.portId"
  target: string;  // "widgetId.portId"
  mechanism: 'validate' | 'update';
  relationship: RelationshipSpec;
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
}
```

**受入基準**:
- [ ] DpGがORS内（TDDM層）で定義される
- [ ] ReactiveBindingがUISpec内で定義される
- [ ] ReactiveBindingEngineがReactiveBindingSpecを処理する

---

#### REQ-DSL-004: 型システムの層別使い分け

**概要**: TDDM層（ORS）は抽象型、UISpec層は具体型を使用する。

**詳細**:

| 層 | 型系統 | 使用場所 |
|----|--------|---------|
| TDDM層（ORS） | SVAL, ARRY, PNTR, DICT | Attribute.structuralType |
| UISpec層 | string, number, object[], etc. | Port.dataType |

**受入基準**:
- [ ] ORS生成時に抽象型が使用される
- [ ] UISpec生成時に具体型が使用される
- [ ] LLMが両方を適切に生成する

---

### 2.2 LLM呼び出し

#### REQ-LLM-001: 3段階LLM呼び出し構成

**概要**: Widget選定、ORS/DpG生成、UISpec生成の3段階でLLMを呼び出す。

**詳細**:

| 段階 | タスク | 入力 | 出力 | タスク分類 |
|------|--------|------|------|-----------|
| 1 | Widget選定 | ConcernText, BottleneckType, Widget Definitions | WidgetSelectionResult | 汎用タスク |
| 2 | ORS + DpG生成 | ConcernText, SelectedWidgets, PreviousStageResult | ORS Instance | 構造化タスク |
| 3 | UISpec生成 | ORS, SelectedWidgets | UISpec Instance | 構造化タスク |

**受入基準**:
- [ ] 3段階の呼び出しが順次実行される
- [ ] 各段階の出力が次段階の入力として使用される
- [ ] 各段階で個別にエラーハンドリングされる

---

#### REQ-LLM-002: タスク別モデル切り替え

**概要**: タスクの性質に応じて使用するLLMモデルを切り替え可能にする。

**詳細**:

| タスク | 性質 | 分類 |
|--------|------|------|
| Captureフェーズ診断 | 判断・分析 | 汎用タスク |
| Widget選定 | 判断・選択 | 汎用タスク |
| ORS生成 | 構造的出力 | 構造化タスク |
| UISpec生成 | 構造的出力 | 構造化タスク |
| まとめ | 文章生成 | 汎用タスク |

```typescript
interface LLMTaskConfig {
  taskType: string;
  model: ModelConfig;
  prompt: PromptTemplate;
  outputSchema?: JSONSchema;
}

interface ModelConfig {
  provider: string;
  modelId: string;
  temperature: number;
}
```

**受入基準**:
- [ ] タスクごとに異なるモデルを設定可能
- [ ] 設定ファイルでモデル設定を管理可能
- [ ] 実験パターン（A/B/C/D）を切り替え可能

---

#### REQ-LLM-003: Widget選定の4ステージ一括実行

**概要**: Planフェーズ開始前に4ステージ分のWidget選定を一括で実行する。

**詳細**:
```typescript
interface WidgetSelectionResult {
  stages: {
    diverge: StageSelection;
    organize: StageSelection;
    converge: StageSelection;
    summary: StageSelection;
  };
  rationale: string;  // 全体の選定理由
}

interface StageSelection {
  widgets: SelectedWidget[];
  purpose: string;     // このステージの分析目的
  target: string;      // 分析対象
}

interface SelectedWidget {
  widgetId: string;
  purpose: string;     // このWidgetの使用目的
  order: number;       // ステージ内での表示順序
}
```

**受入基準**:
- [ ] 4ステージ分のWidget選定が一括で実行される
- [ ] 各Widget/ステージに目的・対象が設定される
- [ ] 選定結果がユーザーに計画として提示される

---

### 2.3 Widget体系

#### REQ-WDG-001: complexity メタデータの追加

**概要**: Widgetの認知負荷を表すcomplexityメタデータを追加する。

**詳細**:
```typescript
interface WidgetMetadata {
  timing: number;      // 0.0-1.0
  versatility: number; // 0.0-1.0
  bottleneck: string[];
  complexity: number;  // 0.0（シンプル）-1.0（複雑）【新規】
}
```

**用途**:
- W2W Reactivityのtarget選定制限（複雑すぎるWidgetをtargetにしない）
- 1ステージ内のWidget組み合わせ制御
- ユーザー認知負荷の考慮

**受入基準**:
- [ ] 全12種Widgetにcomplexity値が設定される
- [ ] Widget選定時にcomplexityが考慮される
- [ ] ReactiveBinding生成時にcomplexity閾値ルールが適用される

---

#### REQ-WDG-002: stage_summary Widgetの追加

**概要**: ステージ間のデータ引き継ぎを表示するstage_summary Widgetを追加する。

**詳細**:
- Planフェーズの各ステージ先頭に必ず表示
- 前ステージまでのユーザー入力内容を要約
- 各Widgetの操作内容を言語化

```typescript
interface StageSummaryConfig {
  previousStages: StageSummaryItem[];
}

interface StageSummaryItem {
  stageName: string;
  widgets: WidgetSummaryItem[];
}

interface WidgetSummaryItem {
  widgetId: string;
  widgetType: string;
  summary: string;  // LLMが生成した操作内容の要約
}
```

**受入基準**:
- [ ] stage_summary Widgetが実装される
- [ ] 各ステージ開始時に前ステージの要約が表示される
- [ ] 各Widgetの操作内容が適切に言語化される

---

#### REQ-WDG-003: Widget操作言語化プロンプト

**概要**: 各Widgetの操作内容を言語化するためのプロンプトを定義する。

**詳細**:

| Widget | 言語化ルール |
|--------|-------------|
| `emotion_palette` | 選択された感情と強度を「{emotion}({intensity}%)」形式でリスト化 |
| `brainstorm_cards` | カードの内容を箇条書きで列挙 |
| `card_sorting` | カテゴリごとに分類されたカードを「{category}: {items}」形式で |
| `matrix_placement` | 各象限に配置されたアイテムを象限名と共に |
| `priority_slider_grid` | 優先度順にソートしたリスト |
| `swot_analysis` | 各象限の項目を列挙 |
| `dependency_mapping` | ノードと接続関係を記述 |
| `mind_map` | 中心トピックと関連ノードを階層的に |
| `tradeoff_balance` | 両側の項目とバランス結果 |
| `timeline_slider` | 時系列順にイベントを列挙 |
| `question_card_chain` | 質問と回答のペアを列挙 |
| `structured_summary` | サマリー内容をそのまま |

**受入基準**:
- [ ] 全Widgetに言語化ルールが定義される
- [ ] LLMが言語化ルールに従って要約を生成する

---

### 2.4 アプリフロー

#### REQ-FLW-001: 計画提示画面

**概要**: Planフェーズ開始前にWidget選定結果を計画として提示する。

**詳細**:
- 4ステージ分のWidget選定結果を表示
- 各ステージの目的・対象を説明
- 各Widgetの使用目的を説明
- 「この計画で始める」ボタンで確認

**受入基準**:
- [ ] 計画提示画面が実装される
- [ ] 全ステージの概要が表示される
- [ ] 各Widgetの目的が表示される

---

#### REQ-FLW-002: ナビゲーション機能

**概要**: ステージ間の戻り・スキップ機能を実装する。

**詳細**:
- **戻り**: 前回生成したUI + 操作内容を保持して再表示。戻った先より後のステージのUI/操作結果は破棄
- **スキップ**: 「次へ」ボタンの隣に「スキップ」ボタンを配置
- Widget単位で空欄/スキップ可能

**受入基準**:
- [ ] 戻りボタンが機能する
- [ ] スキップボタンが機能する
- [ ] 戻り時に後続ステージのデータが破棄される

---

### 2.5 エラーハンドリング

#### REQ-ERR-001: バリデーションエラーログ

**概要**: バリデーションエラーや例外の内容をログに記録する。

**詳細**:
- LLM生成結果のバリデーションエラーを記録
- 例外発生時のスタックトレースを記録
- 論文分析用にエクスポート可能

```typescript
interface ValidationErrorLog {
  timestamp: number;
  sessionId: string;
  taskType: string;
  errorType: string;
  errorMessage: string;
  llmOutput?: string;  // 生成された不正なJSON
  context?: Record<string, any>;
}
```

**受入基準**:
- [ ] バリデーションエラーがログに記録される
- [ ] エラーログがエクスポート可能
- [ ] 失敗パターンの分析に使用可能

---

## 3. 非機能要件

### 3.1 パフォーマンス

#### REQ-NFR-001: LLM呼び出しレイテンシ

- 各LLM呼び出しのタイムアウト: 60秒
- 3段階合計の目標レイテンシ: 30秒以内

### 3.2 信頼性

#### REQ-NFR-002: リトライ機構

- 各LLM呼び出しで最大3回のリトライ
- リトライ間隔: 指数バックオフ

### 3.3 保守性

#### REQ-NFR-003: 設定ファイル管理

- モデル設定はconfigファイルで管理
- Widget Definitionsは独立したファイルで管理

---

## 4. 実装優先度

### 4.1 Must（必須）

| ID | 要件 | 理由 |
|----|------|------|
| REQ-DSL-001 | 3層DSL構造 | アーキテクチャの基盤 |
| REQ-DSL-002 | ORS活用強化 | Jelly準拠の核心 |
| REQ-DSL-003 | DpG/ReactiveBinding分離 | 責務明確化 |
| REQ-LLM-001 | 3段階LLM呼び出し | 生成品質向上 |
| REQ-LLM-003 | 4ステージ一括Widget選定 | UX改善 |
| REQ-WDG-001 | complexity追加 | Widget選定精度向上 |
| REQ-FLW-001 | 計画提示画面 | UX改善 |
| REQ-ERR-001 | エラーログ | 論文分析用 |

### 4.2 Should（推奨）

| ID | 要件 | 理由 |
|----|------|------|
| REQ-DSL-004 | 型システム層別使い分け | 設計の明確化 |
| REQ-LLM-002 | タスク別モデル切り替え | 実験設計対応 |
| REQ-WDG-002 | stage_summary Widget | ステージ間連携 |
| REQ-WDG-003 | Widget操作言語化 | stage_summary用 |
| REQ-FLW-002 | ナビゲーション機能 | UX改善 |

### 4.3 Nice to have（あれば良い）

| ID | 要件 | 理由 |
|----|------|------|
| - | configでの実験パターン編集 | 実験の柔軟性 |
| - | フォールバックUI表示 | エラー時UX |

---

## 5. 継続検討事項

### 5.1 generatedValueのORS落とし込み

**課題**: generatedValue（LLM生成値）をORSのAttributeにどう組み込むか

**検討方向**:
- Attributeのメタデータ拡張として`generation`フィールドを追加
- A（ラベル・説明文）とB（サンプルデータ）で異なる扱いが必要か

### 5.2 各Widgetのcomplexity値設定

**課題**: 12種Widget全てにcomplexity値を設定する必要がある

**検討方向**:
- ユーザビリティテストに基づく設定
- 暫定値を設定し、実験で調整

### 5.3 complexity閾値ルールの詳細

**課題**: W2W ReactivityやWidget組み合わせの具体的な閾値ルール

**検討方向**:
- complexity値設定後に数値ルールを決定
- 例: 「complexity > 0.7のWidgetはReactiveBindingのtargetにしない」

---

## 付録: 用語対応表

本要件定義書および関連ドキュメントにおける用語変更については、[DSL-Spec-v4.0.md 付録A](./DSL-Spec-v4.0.md#11-付録a-用語対応表v3v4)を参照のこと。

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 2025-12-02 | 初版作成 |
| 4.0.1 | 2025-12-02 | OODM→ORS/TDDM用語変更 |
