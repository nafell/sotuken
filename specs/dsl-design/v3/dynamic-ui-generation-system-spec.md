# 動的UI生成システム仕様書

**Version**: 3.0.1
**Date**: 2025-12-02
**Status**: Active
**Purpose**: LLM-Hardened DSLを活用した動的UI生成システムの包括的仕様

---

## 目次

1. [概要](#1-概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [DSL Definition層（静的定義）](#3-dsl-definition層静的定義)
4. [DSL Instance層（動的生成）](#4-dsl-instance層動的生成)
5. [動的UI生成パイプライン](#5-動的ui生成パイプライン)
6. [Widget体系](#6-widget体系)
7. [Reactive連携システム](#7-reactive連携システム)
8. [思考整理フロー](#8-思考整理フロー)
9. [現状の課題と検討事項](#9-現状の課題と検討事項)
10. [v3.1拡張計画](#10-v31拡張計画)
11. [用語集](#11-用語集)
12. [付録: 関連ファイル一覧](#12-付録-関連ファイル一覧)

---

## 1. 概要

### 1.1 システムの目的

本システムは、ユーザーの悩み（Concern）に対して**LLMが動的にUI構造を生成**し、CBT（認知行動療法）ベースの思考整理を支援するシステムである。

### 1.2 設計思想

本システムは[Jelly Framework](https://arxiv.org/html/2503.04084v1)の設計思想を踏襲し、3層のDSL構造を採用している：

| Jelly Framework | 本システム | 役割 |
|-----------------|-----------|------|
| ORS (Object-Relational Schema) | **OODM** (Object-Oriented Data Model) | データモデル定義 |
| DpG (Dependency Graph) | **DpG** (Dependency Graph) | 依存関係・リアクティビティ定義 |
| UI Specification | **UISpec** | UI構造定義 |

### 1.3 Jellyとの差異

| 観点 | Jelly | 本システム |
|------|-------|-----------|
| UI粒度 | input/button等の最小単位から構築 | **Widget**（複合UIコンポーネント）を基本単位 |
| DpGの対象 | 最小UI要素間のリアクティビティ | **Widget-to-Widget Reactivity** |
| 生成対象 | 汎用タスク管理UI | CBT特化の思考整理UI |

### 1.4 DSLの2側面

本システムのDSLは**Definition（静的定義）**と**Instance（動的生成）**の2層で構成される：

```
┌─────────────────────────────────────────────────────────────┐
│                    DSL Definition層                          │
│  （静的定義：プロンプトに含める仕様・制約）                      │
├─────────────────────────────────────────────────────────────┤
│  • DSL Core Spec v3.0    - 基本型・構文ルール                 │
│  • Widget Definitions    - 12種Widgetのメタデータ・ポート定義  │
│  • Phase Requirements    - フェーズ別要求仕様                 │
└─────────────────────────────────────────────────────────────┘
                              ↓ LLM生成
┌─────────────────────────────────────────────────────────────┐
│                    DSL Instance層                            │
│  （動的生成：LLMが出力するJSON）                               │
├─────────────────────────────────────────────────────────────┤
│  • OODM Instance         - データモデルインスタンス            │
│  • DpG Instance          - 依存関係グラフインスタンス          │
│  • UISpec Instance       - UI仕様インスタンス                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Client (React PWA)                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  UIRendererV3   │◄───│ ReactiveBinding │◄───│   Widget群       │  │
│  │                 │    │    Engine       │    │  (12種)         │  │
│  └────────▲────────┘    └─────────────────┘    └─────────────────┘  │
│           │                                                          │
│           │ UISpec Instance (JSON)                                   │
│           │                                                          │
└───────────┼──────────────────────────────────────────────────────────┘
            │
            │ API Response
            │
┌───────────┼──────────────────────────────────────────────────────────┐
│           │                 Server (Bun + Hono)                      │
├───────────┴──────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ UISpecGenerator │───►│  GeminiService  │───►│   Gemini 2.5    │  │
│  │      V3         │    │                 │    │     mini        │  │
│  └────────▲────────┘    └─────────────────┘    └─────────────────┘  │
│           │                                                          │
│           │ DSL Definitions                                          │
│           │                                                          │
│  ┌────────┴────────┐                                                 │
│  │ Widget          │                                                 │
│  │ Definitions     │                                                 │
│  │ Registry        │                                                 │
│  └─────────────────┘                                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 データフロー

```
[User Input: ConcernText]
        │
        ▼
┌───────────────────────────┐
│ 1. プロンプト構築          │
│    - Widget Definitions   │
│    - Stage情報            │
│    - ユーザー悩み          │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│ 2. LLM呼び出し            │
│    Gemini 2.5 mini        │
│    → JSON生成              │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│ 3. 後処理                  │
│    - デフォルト値補完      │
│    - バリデーション        │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│ 4. UISpec Instance        │
│    (OODM + DpG + Widgets) │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│ 5. UIレンダリング          │
│    - Widget配置           │
│    - Reactive連携初期化   │
└───────────────────────────┘
```

---

## 3. DSL Definition層（静的定義）

DSL Definition層は、LLMに渡すプロンプトに含める静的な仕様定義である。

### 3.1 DSL Core Spec

基盤となる言語仕様。全フェーズで共通使用される。

**基本型（プリミティブ型）:**

| 型名 | 説明 | TypeScript定義 |
|------|------|----------------|
| SVAL | スカラー値 | `string \| number \| boolean \| null` |
| ARRY | 配列 | `T[]` |
| PNTR | 参照（ポインタ） | `{ ref: string; type: 'entity' \| 'attribute' }` |
| DICT | 辞書 | `{ [key: string]: T }` |

**構造定義:**

```typescript
interface Entity {
  id: string;                    // 一意識別子
  type: string;                  // エンティティタイプ
  attributes: Attribute[];       // 属性リスト
  metadata?: DICT<SVAL>;         // メタデータ
}

interface Attribute {
  name: string;
  value: SVAL | ARRY<SVAL> | PNTR | DICT<SVAL>;
  type: 'sval' | 'arry' | 'pntr' | 'dict';
  constraints?: Constraint[];
}
```

**詳細**: [DSL-Core-Spec-v3.0.md](./DSL-Core-Spec-v3.0.md)

### 3.2 Widget Definitions

12種のプリセットWidgetのメタデータとポート定義。LLMプロンプト生成とDependencyGraph検証に使用。

**Widget定義構造:**

```typescript
interface WidgetDefinition {
  id: string;                    // Widget ID（システム全体で一意）
  name: string;                  // 表示名
  description: string;           // 説明（LLMプロンプト用）
  stage: WidgetStage;            // 対応ステージ
  ports: {
    inputs: ReactivePortDefinition[];
    outputs: ReactivePortDefinition[];
  };
  configSchema?: Record<string, unknown>;
  metadata: WidgetMetadata;
}

interface ReactivePortDefinition {
  id: string;                    // ポートID
  direction: 'in' | 'out';       // 方向
  dataType: PortDataType;        // データ型
  description: string;           // 説明
  defaultValue?: unknown;
  constraints?: PortConstraint[];
  required?: boolean;
}

interface WidgetMetadata {
  timing: number;      // 0.0-1.0（思考フロー上の適用タイミング）
  versatility: number; // 0.0-1.0（汎用性）
  bottleneck: string[]; // 解消可能なボトルネック
}
```

**実装**: `server/src/definitions/widgets.ts`

### 3.3 Phase Requirements

フェーズ別の要求仕様。各フェーズの目的・動的化レベル・UI選択基準を定義。

| フェーズ | 動的化レベル | 目的 |
|---------|-------------|------|
| Capture | 限定的動的 | 悩みの具体化とボトルネック診断 |
| Plan | フル動的 | ボトルネックに応じた思考支援UI生成 |
| Breakdown | 固定UI | コンテンツのみ動的生成 |

**詳細**:
- [capture-requirements-v3.0.md](./capture-requirements-v3.0.md)
- [plan-requirements-v3.0.md](./plan-requirements-v3.0.md)
- [breakdown-requirements-v3.0.md](./breakdown-requirements-v3.0.md)

---

## 4. DSL Instance層（動的生成）

DSL Instance層は、LLMが生成するJSON形式の出力である。

### 4.1 UISpec Instance

LLMが生成する画面全体のUI仕様。

```typescript
interface UISpec {
  sessionId: string;
  stage: StageType;
  oodm: OODM;                    // データモデル
  dpg: DependencyGraphSpec;      // 依存関係グラフ
  widgets: WidgetSpec[];         // Widget仕様配列
  layout: ScreenLayout;
  metadata: UISpecMetadata;
}
```

### 4.2 OODM Instance

ユーザーの悩みに関するデータ構造のインスタンス。

```typescript
interface OODM {
  version: string;
  entities: Entity[];
  metadata?: DICT<SVAL>;
}
```

**現状**: 現在の実装では`entities: []`（空）で返されることが多い。[検討事項](#91-oodmの活用)を参照。

### 4.3 DpG Instance

Widget間の依存関係を定義するグラフのインスタンス。

```typescript
interface DependencyGraphSpec {
  dependencies: DependencySpec[];
  metadata?: {
    version: string;
    generatedAt: number;
  };
}

interface DependencySpec {
  source: string;             // "widgetId.portId" 形式
  target: string;             // "widgetId.portId" 形式
  mechanism: 'validate' | 'update';
  relationship: RelationshipSpec;
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
}

interface RelationshipSpec {
  type: 'javascript' | 'transform' | 'llm';
  javascript?: string;        // JavaScriptコード
  transform?: TransformFunction;
  llmPrompt?: string;
}
```

### 4.4 WidgetSpec Instance

個別Widgetの仕様インスタンス。プリセットWidgetへの参照と設定を含む。

```typescript
interface WidgetSpec {
  id: string;
  component: WidgetComponentType; // プリセットWidgetのID
  position: number;               // 表示順序
  layout?: LayoutType;
  config: WidgetConfig;           // Widget固有の設定
  inputs?: DataBinding[];
  outputs?: DataBinding[];
  reactiveBindings?: ReactiveBinding[];
  metadata: WidgetMetadata;
}
```

### 4.5 UISpec Instanceの例

```json
{
  "sessionId": "session_001",
  "stage": "diverge",
  "oodm": {
    "version": "3.0",
    "entities": [],
    "metadata": {}
  },
  "dpg": {
    "dependencies": [],
    "metadata": { "version": "3.0", "generatedAt": 1733100000000 }
  },
  "widgets": [
    {
      "id": "widget_1",
      "component": "emotion_palette",
      "position": 1,
      "layout": "single",
      "config": {
        "prompt": "転職を考える時、どんな感情が湧いていますか？"
      },
      "inputs": [],
      "outputs": [],
      "reactiveBindings": [],
      "metadata": {
        "timing": 0.1,
        "versatility": 0.6,
        "bottleneck": ["emotion"],
        "description": "感情の可視化"
      }
    }
  ],
  "layout": {
    "type": "sequential",
    "config": { "spacing": "comfortable", "responsive": true }
  },
  "metadata": {
    "generatedAt": 1733100000000,
    "llmModel": "gemini-2.5-mini",
    "tokenCount": 0,
    "version": "3.0"
  }
}
```

---

## 5. 動的UI生成パイプライン

### 5.1 Server側処理

#### 5.1.1 UISpecGeneratorV3

UISpec Instance生成の中核サービス。

**処理フロー:**

1. **プロンプト構築** (`buildPrompt`)
   - Widget Definitionsの説明文を生成
   - ステージ情報とユーザー悩みを組み込み

2. **LLM呼び出し** (`GeminiService.generateJSON`)
   - Gemini 2.5 miniでJSON生成
   - 最大3回のリトライ

3. **後処理** (`fillRequiredFields`)
   - 必須フィールドのデフォルト値補完
   - sessionId, stage, oodm, dpg, widgetsの補完

4. **バリデーション** (`validateUISpec`)
   - 必須フィールドの存在確認
   - Widgetコンポーネントの妥当性検証

**実装**: `server/src/services/UISpecGeneratorV3.ts`

#### 5.1.2 ステージ別Widget選択

```typescript
const stageWidgets: Record<StageType, WidgetComponentType[]> = {
  diverge: ['emotion_palette', 'brainstorm_cards', 'question_card_chain'],
  organize: ['card_sorting', 'dependency_mapping', 'swot_analysis', 'mind_map'],
  converge: ['matrix_placement', 'tradeoff_balance', 'priority_slider_grid', 'timeline_slider'],
  summary: ['structured_summary'],
};
```

### 5.2 Frontend側処理

#### 5.2.1 UIRendererV3

UISpec InstanceからWidgetをレンダリングするReactコンポーネント。

**処理フロー:**

1. **ReactiveBindingEngine初期化**
   - DpG Instanceから依存グラフ構築
   - 循環依存チェック

2. **Widget配列ソート**
   - position順にソート

3. **Widgetレンダリング**
   - WIDGET_COMPONENTSレジストリから取得
   - BaseWidgetPropsを渡してレンダリング

**実装**: `concern-app/src/services/ui-generation/UIRendererV3.tsx`

#### 5.2.2 Widget Component Registry

```typescript
const WIDGET_COMPONENTS: Record<string, React.FC<BaseWidgetProps>> = {
  // diverge
  emotion_palette: EmotionPalette,
  brainstorm_cards: BrainstormCards,
  question_card_chain: QuestionCardChain,
  // organize
  card_sorting: CardSorting,
  dependency_mapping: DependencyMapping,
  swot_analysis: SwotAnalysis,
  mind_map: MindMap,
  // converge
  matrix_placement: MatrixPlacement,
  tradeoff_balance: TradeoffBalance,
  priority_slider_grid: PrioritySliderGrid,
  timeline_slider: TimelineSlider,
  // summary
  structured_summary: StructuredSummary,
};
```

---

## 6. Widget体系

### 6.1 12種プリセットWidget一覧

| ID | 名称 | ステージ | 目的 | timing | versatility |
|----|------|---------|------|--------|-------------|
| **発散フェーズ（探索・発散）** |
| `emotion_palette` | 感情パレット | diverge | 感情の可視化と認識 | 0.15 | 0.6 |
| `brainstorm_cards` | ブレインストームカード | diverge | 自由なアイデア発散 | 0.1 | 0.95 |
| `question_card_chain` | 質問カードチェーン | diverge | 深掘り質問による探索 | 0.2 | 0.8 |
| **整理フェーズ（評価・整理）** |
| `card_sorting` | カードソート | organize | カテゴリ分類 | 0.35 | 0.85 |
| `dependency_mapping` | 依存関係マップ | organize | 要素間の依存関係可視化 | 0.4 | 0.8 |
| `swot_analysis` | SWOT分析 | organize | 4象限での状況整理 | 0.3 | 0.9 |
| `mind_map` | マインドマップ | organize | 関連性の視覚化 | 0.2 | 0.9 |
| **収束フェーズ（決定・収束）** |
| `matrix_placement` | マトリクス配置 | converge | 2軸評価による優先順位付け | 0.5 | 0.85 |
| `tradeoff_balance` | トレードオフ天秤 | converge | 選択肢のバランス可視化 | 0.6 | 0.7 |
| `priority_slider_grid` | 優先度スライダー | converge | 複数項目の優先度設定 | 0.7 | 0.75 |
| `timeline_slider` | タイムラインスライダー | converge | 時間軸での計画配置 | 0.5 | 0.7 |
| **まとめフェーズ（統合・確認）** |
| `structured_summary` | 構造化サマリー | summary | 結果の構造化表示 | 0.9 | 0.6 |

### 6.2 Widget階層

```
Widget（12種プリセット）
├── 発散系 Widget
│   ├── emotion_palette
│   ├── brainstorm_cards
│   └── question_card_chain
├── 整理系 Widget
│   ├── card_sorting
│   ├── dependency_mapping
│   ├── swot_analysis
│   └── mind_map
├── 収束系 Widget
│   ├── matrix_placement
│   ├── tradeoff_balance
│   ├── priority_slider_grid
│   └── timeline_slider
└── まとめ系 Widget
    └── structured_summary
```

### 6.3 Widgetメタデータの意味

| プロパティ | 説明 | 範囲 |
|-----------|------|------|
| `timing` | 思考フロー上の適用タイミング。0.0=発散初期、1.0=収束後期 | 0.0-1.0 |
| `versatility` | 汎用性。0.0=特定ボトルネック特化、1.0=万能型 | 0.0-1.0 |
| `bottleneck` | このWidgetが解消可能なボトルネックタイプの配列 | string[] |

---

## 7. Reactive連携システム

### 7.1 ReactiveBindingEngine

Widget間のリアクティブなデータ連携を管理するエンジン。

**主要機能:**
- Debounce付きのPort値伝播（デフォルト300ms）
- 循環依存の検出・防止
- FlowValidationState（完了状態追跡）
- Transform関数の実行

**実装**: `concern-app/src/services/ui/ReactiveBindingEngine.ts`

### 7.2 Port システム

**PortKey形式**: `"widgetId.portId"`

**予約Port:**
- `_error`: エラー状態通知用
- `_completed`: 完了状態通知用

### 7.3 伝播メカニズム

```
Widget A (source)
    │
    │ Port値変更
    ▼
┌─────────────────┐
│ Debounce        │
│ (300ms)         │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ DependencyGraph │
│ 依存関係探索     │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Transform実行    │
│ (JS/組込み/LLM) │
└─────────────────┘
    │
    ▼
Widget B (target)
```

---

## 8. 思考整理フロー

### 8.1 3フェーズ構成

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Capture │ ──► │  Plan   │ ──► │Breakdown│
│ (収集)  │     │ (計画)  │     │ (分解)  │
└─────────┘     └─────────┘     └─────────┘
```

### 8.2 Planフェーズの4ステージ

コード上のステージ名と実際のユーザー向け機能の対応：

| コード上の名称 | ユーザー向け機能 | 目的 |
|---------------|-----------------|------|
| `diverge` | **探索・発散** | 制約なく可能性を広げる |
| `organize` | **評価・整理** | アイデアを構造化・関連付け |
| `converge` | **決定・収束** | 優先順位をつけて方針確定 |
| `summary` | **まとめ確認** | 結果の構造化表示と修正機会 |

**注**: コード上の`organize`は、仕様書上の「評価・整理（evaluate/organize）」の両方を含む概念である。

### 8.3 フロー状態管理

```typescript
interface FlowState {
  stages: {
    diverge: { ideas: string[]; themes: string[]; emotions?: EmotionalState };
    organize: { categories: Category[]; relationships: Relationship[] };
    converge: { decisions: Decision[]; rationale: string[]; confidence: number };
  };
  insights: {
    key_factors: string[];
    eliminated_options: string[];
    discovered_constraints: string[];
  };
}
```

---

## 9. 現状の課題と検討事項

### 9.1 OODMの活用

**現状**: 現在の実装では`OODM`の`entities`フィールドは基本的に空で返されており、実質的に活用されていない。

**背景**:
Jelly Frameworkでは、ORS（本システムのOODMに相当）は、UIを最小単位（input/button等）から構築する際の**データモデル**として機能し、DpGはその最小単位間のリアクティビティを定義する役割を担う。

しかし本システムでは、UIの基本単位が**Widget**（複合UIコンポーネント）であり、DpGは**Widget-to-Widget Reactivity**を定義する用途に転用されている。

**検討事項**:
v3.1で導入予定の`generatedValue`（LLMに生成させる値）や、より細粒度のリアクティビティを実現するためには、OODMが再び必要になる可能性がある。

具体的には：
- Widget内部のUI要素（editable-list等）のデータモデル定義
- generatedValueのスキーマ定義
- Widget間だけでなく、Widget内部要素間のリアクティビティ定義

**参考**: [Jelly Framework論文](https://arxiv.org/html/2503.04084v1)

### 9.2 Captureフェーズの未実装

**現状**:
仕様書（`capture-requirements-v3.0.md`）では2段階構造（具体化 + ボトルネック診断）が定義されているが、現在の実装では未実装。

**影響**:
- ボトルネック診断機能がない
- Planフェーズでの最適Widget選択の精度低下

### 9.3 ステージ名の不整合

**現状**:
- 仕様書: `diverge`, `evaluate`, `converge`, `summary`
- 実装: `diverge`, `organize`, `converge`, `summary`

**方針**:
コード上の名称変更は影響範囲が大きいため、実装の名称は便宜上の呼称として維持し、仕様書で目的を明確化する。

---

## 10. v3.1拡張計画

### 10.1 コンテンツ生成の改善

**課題**:
現在のWidgetは「空箱」として提示されることが多く、ユーザーの認知負荷が高い（Cold Start Problem）。

**提案される改善**:
- `generatedValue`: LLMに生成させる単一値（ラベル等）
- `sampleItemSpec`: サンプルアイテムの生成仕様
- コンテキスト依存のカスタマイズ

**詳細**: [v3.1-content-generation-enhancement.md](../discussions/v3.1-content-generation-enhancement.md)

### 10.2 UI Atomの導入（名称検討中）

Widget内部のUI構成要素を抽象化する概念の導入を検討中。

**検討中の用語**:
- UI Atom（現在の仮称）
- UIComponent（既存概念との衝突の可能性）
- UIElement
- その他

**用途**:
- `editable-list`: 編集可能なアイテムリスト
- 将来的な細粒度リアクティビティの対象

### 10.3 OODMの活用再検討

v3.1の機能拡張（generatedValue、UI Atom等）に伴い、OODMの活用方法を再検討する。

---

## 11. 用語集

### 11.1 DSL関連

| 用語 | 定義 |
|------|------|
| **DSL Definition** | 静的に定義される仕様（Widget Definitions、DSL Core Spec等）。LLMプロンプトに含める |
| **DSL Instance** | LLMが動的に生成するJSON出力（OODM、DpG、UISpec等） |
| **OODM** | Object-Oriented Data Model。データ構造の定義 |
| **DpG** | Dependency Graph。依存関係とリアクティビティの定義 |
| **UISpec** | UI Specification。画面全体のUI仕様 |

### 11.2 Widget関連

| 用語 | 定義 |
|------|------|
| **Widget** | 本システムのUI基本単位。12種のプリセットが存在 |
| **WidgetDefinition** | サーバー側で静的に定義されるWidgetのメタデータ・ポート定義 |
| **WidgetSpec** | LLMが生成する個別Widgetの仕様インスタンス |
| **ReactivePort** | Widgetの入出力ポート。Widget間のデータ連携に使用 |
| **PortKey** | ポートの識別子。`"widgetId.portId"`形式 |

### 11.3 フロー関連

| 用語 | 定義 |
|------|------|
| **Stage** | Planフェーズ内のステージ。diverge/organize/converge/summary |
| **Phase** | 思考整理の大フェーズ。Capture/Plan/Breakdown |
| **Bottleneck** | 思考を妨げる要因。8種類定義（too_many_options, emotional_block等） |
| **timing** | Widget適用タイミング。0.0=発散初期、1.0=収束後期 |
| **versatility** | Widgetの汎用性。0.0=特化型、1.0=万能型 |

### 11.4 システム関連

| 用語 | 定義 |
|------|------|
| **ReactiveBindingEngine** | Widget間のリアクティブデータ連携を管理するエンジン |
| **UIRendererV3** | UISpec InstanceからWidgetをレンダリングするReactコンポーネント |
| **FlowValidationState** | 全Widgetの完了状態を追跡する状態オブジェクト |

---

## 12. 付録: 関連ファイル一覧

### 12.1 仕様書（specs/）

| パス | 内容 |
|------|------|
| `specs/dsl-design/v3/README.md` | DSL v3.0仕様書体系の概要 |
| `specs/dsl-design/v3/DSL-Core-Spec-v3.0.md` | Layer 1: 基盤言語仕様 |
| `specs/dsl-design/v3/capture-requirements-v3.0.md` | Layer 2: Captureフェーズ要求仕様 |
| `specs/dsl-design/v3/plan-requirements-v3.0.md` | Layer 2: Planフェーズ要求仕様 |
| `specs/dsl-design/v3/breakdown-requirements-v3.0.md` | Layer 2: Breakdownフェーズ要求仕様 |
| `specs/dsl-design/v3/widget-definition-spec.md` | WidgetDefinition仕様 |
| `specs/dsl-design/v3/widgets/widget-v3-specifications.md` | 12種Widget仕様 |
| `specs/dsl-design/v3/ReactiveWidget-design.md` | ReactiveWidget設計仕様 |
| `specs/dsl-design/v3/reactive-engine-spec.md` | ReactiveBindingEngine詳細仕様 |
| `specs/discussions/v3.1-content-generation-enhancement.md` | v3.1コンテンツ生成改善設計 |

### 12.2 サーバー実装（server/src/）

| パス | 内容 |
|------|------|
| `server/src/services/UISpecGeneratorV3.ts` | UISpec v3生成サービス |
| `server/src/services/GeminiService.ts` | Gemini LLM呼び出しサービス |
| `server/src/types/WidgetDefinition.ts` | WidgetDefinition型定義 |
| `server/src/definitions/widgets.ts` | 12種Widget定義レジストリ |
| `server/src/generators/WidgetDefinitionGenerator.ts` | LLMプロンプト用Widget説明生成 |

### 12.3 フロントエンド実装（concern-app/src/）

| パス | 内容 |
|------|------|
| `concern-app/src/services/ui-generation/UIRendererV3.tsx` | UISpec→Widget レンダラー |
| `concern-app/src/services/ui/ReactiveBindingEngine.ts` | リアクティブ連携エンジン |
| `concern-app/src/services/ui/DependencyGraph.ts` | 依存グラフ管理 |
| `concern-app/src/services/ui/DependencyExecutor.ts` | 変換実行エンジン |
| `concern-app/src/types/ui-spec.types.ts` | UISpec/OODM/DpG型定義 |
| `concern-app/src/types/widget.types.ts` | BaseWidgetProps型定義 |
| `concern-app/src/hooks/useReactivePorts.ts` | Widget用Reactフック |
| `concern-app/src/components/widgets/v3/` | 12種Widgetコンポーネント群 |

### 12.4 設定ファイル

| パス | 内容 |
|------|------|
| `config/config.v1.json` | システム設定テンプレート |
| `config/experiment-settings.json` | 実験設定 |
| `config/test-cases/*.json` | テストケース |

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| 3.0.1 | 2025-12-02 | 初版作成。動的UI生成システムの包括的仕様書 |
