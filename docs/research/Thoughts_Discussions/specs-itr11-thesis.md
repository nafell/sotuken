# 論文執筆用：動的UI生成システム実装仕様書 (itr10)

**作成日**: 2025-12-11
**用途**: 卒業論文「実装章」「実験章」執筆のための技術仕様リファレンス
**前版**: specs-itr9.md (53コミット前)
**主要変更**: DSL v5 Plan統合生成、バッチ実験システム、評価指標拡張

---

## 目次

1. [システム概要](#1-システム概要)
2. [DSL仕様（v4/v5）](#2-dsl仕様v4v5)
3. [UI生成パイプライン実装](#3-ui生成パイプライン実装)
4. [Widget-to-Widget Reactivity](#4-widget-to-widget-reactivity)
5. [generatedValue](#5-generatedvalue)
6. [バッチ実験システム](#6-バッチ実験システム)
7. [評価指標](#7-評価指標)
8. [主要ファイル一覧](#8-主要ファイル一覧)

---

## 1. システム概要

### 1.1 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React + TypeScript + Capacitor (PWA) |
| 状態管理 | Jotai（Widget単位のatom） |
| バックエンド | Bun + Hono + Drizzle ORM |
| データベース | IndexedDB (クライアント) + PostgreSQL (サーバー) |
| LLM | Google Gemini 2.5 flash-lite |

### 1.2 アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                    DSL Definition（静的定義）                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Widget Definitions                                    │
│    - 13種プリセットWidgetのメタデータ・ポート定義                  │
│    - complexity, timing, versatility, bottleneck                │
└─────────────────────────────────────────────────────────────────┘
                              ↓ LLMプロンプトに含める
┌─────────────────────────────────────────────────────────────────┐
│                    DSL Instance（動的生成）                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: ORS + DpG（TDDM層）                                    │
│    - Entity/Attributeによるデータ構造定義                         │
│    - DependencyGraphによるデータ間依存関係                        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: UISpec + ReactiveBinding（UI仕様層）                   │
│    - WidgetSpec配列によるUI構成                                  │
│    - ReactiveBindingによるWidget間連携                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. DSL仕様（v4/v5）

### 2.1 v4からv5への主要変更点

| 観点 | v4 | v5 |
|------|-----|-----|
| Planフェーズ構造 | 4ステージ別ページ | 3セクション統合1ページ + summaryページ |
| StageType | `diverge \| organize \| converge \| summary` | `+ 'plan'` を追加 |
| UISpec構造 | `widgets: WidgetSpec[]` | plan時は`sections: SectionMap` |
| W2WR動作範囲 | 同一ステージ内のみ | planページ全体（セクション横断） |
| LLM呼び出し回数 | 9回 | 5回（44%削減） |
| ユーザー待機回数 | 4回 | 2回（50%削減） |

### 2.2 ORS（Object-Relational Schema）

#### v4: ステージ単位ORS

```typescript
interface ORS {
  version: string;                    // "4.0"
  entities: Entity[];                 // ステージ単位のEntity
  dependencyGraph: DependencyGraph;   // ステージ内依存
  metadata?: DICT<SVAL>;
}
```

#### v5: Plan統合ORS

```typescript
interface PlanORS extends ORS {
  version: "5.0";
  planMetadata: {                     // 新規追加
    concernText: string;
    bottleneckType: string;
    sections: ['diverge', 'organize', 'converge'];
  };
  entities: Entity[];                 // 3セクション分
  dependencyGraph: DependencyGraph;   // セクション横断依存
}
```

### 2.3 UISpec

#### v4: フラットWidgetSpec配列

```typescript
interface UISpec {
  sessionId: string;
  stage: StageType;
  widgets: WidgetSpec[];
  reactiveBindings: ReactiveBindingSpec;
  layout: ScreenLayout;
  metadata: UISpecMetadata;
}
```

#### v5: PlanUISpec（セクション構造）

```typescript
interface PlanUISpec {
  version: string;                         // "5.0"
  sessionId: string;
  stage: 'plan';                           // 固定値
  sections: {
    diverge: SectionSpec;
    organize: SectionSpec;
    converge: SectionSpec;
  };
  reactiveBindings: ReactiveBindingSpec;   // セクション横断W2WR
  layout: PlanLayout;
  metadata: UISpecMetadata;
}

interface SectionSpec {
  widgets: WidgetSpec[];
  header: {
    title: string;
    description: string;
  };
}
```

### 2.4 抽象型（TDDM層）

```typescript
type SVAL = string | number | boolean | null;
type ARRY<T> = T[];
type PNTR = { ref: string };          // entityId.attributeName への参照
type DICT<T> = { [key: string]: T };
```

---

## 3. UI生成パイプライン実装

### 3.1 3段階LLM呼び出し構成

```
ユーザー入力（悩みテキスト）
        ↓
[Stage 1] Widget選定 (LLM)
    入力: ConcernText, BottleneckType, Widget Definitions
    出力: WidgetSelectionResult（4ステージ分）
    実装: WidgetSelectionService.ts
        ↓
[Stage 2] ORS + DependencyGraph生成 (LLM)
    入力: ConcernText, SelectedWidgets, PreviousResult
    出力: ORS Instance (v4) または PlanORS (v5)
    実装: ORSGeneratorService.ts
        ↓
[Stage 3] UISpec + ReactiveBinding生成 (LLM)
    入力: ORS Instance, SelectedWidgets, generationHints
    出力: UISpec Instance (v4) または PlanUISpec (v5)
    実装: UISpecGeneratorV4.ts
        ↓
[フロントエンド] DSL Parse → Jotai Atom化 → React Rendering
    実装: UIRendererV4.tsx, ReactiveBindingEngineV4.ts
```

### 3.2 Stage 1: Widget選定

**責務**: ユーザーの悩みとボトルネック診断結果に基づき、4ステージ分のWidgetを一括選定

**出力形式**:
```typescript
interface WidgetSelectionResult {
  version: "4.0";
  stages: {
    diverge: StageSelection;
    organize: StageSelection;
    converge: StageSelection;
    summary: StageSelection;
  };
  rationale: string;
  metadata: {
    bottleneckType: string;
    sessionId: string;
    generatedAt: number;
  };
}

interface StageSelection {
  widgets: SelectedWidget[];
  purpose: string;
  target: string;
}
```

### 3.3 Stage 2: ORS生成

**責務**: Widget選定結果とユーザーの悩みに基づき、Entity・Attribute・DependencyGraphを生成

**v5 Plan統合ORS生成時の特徴**:
- 3セクション分のEntityを1回のLLM呼び出しで生成
- セクション間のPNTR参照を明示的に定義
- planMetadataで問題文脈を保持

### 3.4 Stage 3: UISpec生成

**責務**: ORSとWidget選定結果を対応付け、UISpec・ReactiveBinding・generatedValueを生成

**v5.1での改善**:
- W2WRヒント生成: `generateW2WRHints()` - セクション間接続パターンを明示
- generatedValueチェックリスト: `generateGeneratedValueChecklist()` - 生成要件を列挙
- 生成後検証: `validateGeneratedContent()` - isGeneratedマーカー確認

### 3.5 フォールバック機構

各Stageで以下のフォールバックを実装:
- LLM呼び出し失敗時: ルールベースのデフォルト値生成
- バリデーション失敗時: 自動修復または再生成

---

## 4. Widget-to-Widget Reactivity

### 4.1 概念

Widget-to-Widget Reactivity（W2WR）は、同一画面上に配置された複数のWidget間でリアルタイムにデータを連動させる機構。ユーザーがあるWidgetを操作すると、関連する他のWidgetがLLMを介さずに自動更新される。

### 4.2 v4とv5の違い

| 観点 | v4 | v5 |
|------|-----|-----|
| 連動範囲 | 同一ステージ内 | セクション横断（plan全体） |
| ページ遷移 | ステージ遷移でデータ引継ぎ | 1ページ内でリアルタイム連動 |

### 4.3 ReactiveBinding定義

```typescript
interface ReactiveBinding {
  id: string;
  source: WidgetPortPath;       // "widgetId.outputPort"
  target: WidgetPortPath;       // "widgetId.inputPort"
  mechanism: 'validate' | 'update';
  relationship: RelationshipSpec;
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
  debounceMs?: number;
}

type RelationshipSpec =
  | { type: 'passthrough' }                    // データをそのまま渡す
  | { type: 'javascript'; javascript: string } // JavaScriptで変換
  | { type: 'transform'; transform: string }   // 組み込み変換
  | { type: 'llm'; llmPrompt: string };        // LLMで変換（将来拡張）
```

### 4.4 実装アーキテクチャ

```
Widget A (ソース)
    │ emitPort(portId, value)
    ▼
┌─────────────────────────────────────┐
│ ReactiveBindingEngineV4             │
│  - updatePort(): Port値キャッシュ   │
│  - scheduleDebounce(): タイマー管理 │
│  - executePropagation(): 伝播実行   │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ DependencyGraph                      │
│  - 循環依存検出（DFSアルゴリズム）  │
│  - トポロジカルソート               │
└─────────────────────────────────────┘
    │
    ▼
Widget B (ターゲット)
    - Jotai atom更新 → 再レンダリング
```

### 4.5 Jotai Atom化

```typescript
// Widget IDごとにJotai atomを動的生成
const widgetAtomMap = new Map<string, Atom<any>>();

export function createWidgetAtom<T>(widgetId: string, initialValue: T): Atom<T> {
  if (widgetAtomMap.has(widgetId)) {
    return widgetAtomMap.get(widgetId) as Atom<T>;
  }
  const newAtom = atom<T>(initialValue);
  widgetAtomMap.set(widgetId, newAtom);
  return newAtom;
}
```

---

## 5. generatedValue

### 5.1 概念

generatedValueは、UIそのものではなく**UI内のコンテンツ**をLLMが生成する仕組み。Cold Start Problem（空のWidgetから始める認知負荷）を解決する。

### 5.2 分類

| タイプ | 説明 | 例 |
|--------|------|-----|
| Type A: labels | UIの「枠」を埋めるラベル・説明文 | 感情ラベル（EmotionPalette） |
| Type B: samples | ユーザー入力の叩き台 | 初期カード（BrainstormCards） |

### 5.3 Widget定義でのgenerationHints

```typescript
const BrainstormCardsDefinition: WidgetDefinitionV4 = {
  id: 'brainstorm_cards',
  generationHints: {
    samples: {
      field: 'sampleCards',
      instruction: 'ユーザーの悩みに関連するアイデアの種を2-3個生成',
      count: { min: 2, max: 3 },
      schema: { id: 'string', text: 'string', isGenerated: 'true' }
    }
  }
};
```

### 5.4 UISpec内での配置

```json
{
  "id": "brainstorm_0",
  "component": "brainstorm_cards",
  "config": {
    "title": "転職について考えてみましょう",
    "sampleCards": {
      "items": [
        { "id": "sample_1", "text": "現職で得られるスキル", "isGenerated": true },
        { "id": "sample_2", "text": "転職先に求める条件", "isGenerated": true }
      ],
      "isGenerated": true
    }
  }
}
```

### 5.5 設計原則

1. **追加LLM呼び出しなし**: UISpec生成時（Stage 3）に同時生成
2. **明示的マーキング**: `isGenerated: true`で生成コンテンツを識別
3. **後方互換性**: generationHintsがないWidgetは従来通り動作
4. **編集可能性**: 生成コンテンツはユーザーが自由に編集・削除可能

---

## 6. バッチ実験システム

### 6.1 概要

Layer1（構造健全性）およびLayer4（実用性）を対象とした完全自動評価実験システム。

### 6.2 実験対象モデル構成

| ID | 構成名 | Stage 1 | Stage 2 | Stage 3 |
|----|--------|---------|----------|----------|
| A | All-5-Chat | GPT-5-Chat | GPT-5-Chat | GPT-5-Chat |
| B | All-5-mini | GPT-5-mini | GPT-5-mini | GPT-5-mini |
| C | Hybrid-5Chat/4.1 | GPT-5-Chat | GPT-4.1 | GPT-4.1 |
| D | Hybrid-5Chat/5mini | GPT-5-Chat | GPT-5-mini | GPT-5-mini |
| E | Router-based | model-router | model-router | model-router |

### 6.3 バッチ実行フロー

```
startBatch()
  ↓
executeBatch() [非同期実行開始]
  ├── 並列ワーカー起動 (parallelism数)
  │    ├── processTaskQueue() [各ワーカー]
  │    │    ├── getNextTask() [排他制御]
  │    │    ├── executeTrial()
  │    │    │    ├── Stage 1: Widget Selection
  │    │    │    ├── Stage 2: Plan ORS Generation
  │    │    │    ├── Stage 3: Plan UISpec Generation
  │    │    │    └── logTrialStage() [各ステージ]
  │    │    └── DBに進捗を記録
  └── 全ワーカー完了後、バッチ終了
```

### 6.4 データベーススキーマ（experimentTrialLogs）

```typescript
experimentTrialLogs = pgTable('experiment_trial_logs', {
  // 基本識別情報
  id: uuid('id').primaryKey(),
  experimentId: text('experiment_id'),
  batchId: uuid('batch_id'),
  trialNumber: integer('trial_number'),
  inputId: text('input_id'),

  // モデル構成
  modelConfig: text('model_config'),  // 'A', 'B', 'C', 'D', 'E'
  modelRouterSelection: jsonb('model_router_selection'),

  // ステージ情報
  stage: integer('stage'),  // 1, 2, 3

  // トークンメトリクス
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  latencyMs: integer('latency_ms'),

  // エラー追跡
  dslErrors: jsonb('dsl_errors'),                    // string[] | null
  renderErrors: jsonb('render_errors'),              // string[] | null
  w2wrErrors: jsonb('w2wr_errors'),                  // string[] | null ⭐
  reactComponentErrors: jsonb('react_component_errors'),  // string[] | null ⭐
  jotaiAtomErrors: jsonb('jotai_atom_errors'),      // string[] | null ⭐

  // カウント系
  typeErrorCount: integer('type_error_count'),
  referenceErrorCount: integer('reference_error_count'),
  cycleDetected: boolean('cycle_detected'),
  regenerated: boolean('regenerated'),
  runtimeError: boolean('runtime_error'),

  // 生成データ保存
  generatedData: jsonb('generated_data'),
  promptData: text('prompt_data'),
  inputVariables: jsonb('input_variables'),

  timestamp: timestamp('timestamp')
});
```

### 6.5 エラータイプ定義

#### DSLエラー（バックエンド検出）

```typescript
const DSL_ERROR_TYPES = [
  'JSON_PARSE_ERROR',
  'ZOD_SCHEMA_MISMATCH',
  'UNKNOWN_WIDGET',
  'UNKNOWN_ENTITY',
  'UNKNOWN_ATTRIBUTE',
  'INVALID_PATH',
  'CIRCULAR_DEPENDENCY',
  'REFERENCE_ERROR',
  'DUPLICATE_ID',
  'MISSING_REQUIRED_FIELD',
  'INVALID_BINDING',
  'TYPE_MISMATCH',
  'COMPLEXITY_VIOLATION',
  'INVALID_VERSION',
  'NO_WIDGETS',
  'DUPLICATE_WIDGET',
  'SELF_REFERENCE',
  'INVALID_RELATIONSHIP',
  'INVALID_UISPEC',
  'INVALID_UISPEC_STRUCTURE',
];
```

#### W2WRエラー（バックエンド検出）

```typescript
const W2WR_ERROR_TYPES = [
  'CIRCULAR_DEPENDENCY',
  'SELF_REFERENCE',
  'INVALID_BINDING',
  'UNKNOWN_SOURCE_WIDGET',
  'UNKNOWN_TARGET_WIDGET',
];
```

#### フロントエンドエラー

```typescript
// React Component変換エラー
const REACT_COMPONENT_ERROR_TYPES = [
  'UNKNOWN_WIDGET',
  'INVALID_PROPS',
  'RENDER_EXCEPTION',
];

// Jotai Atomエラー
const JOTAI_ATOM_ERROR_TYPES = [
  'ATOM_CREATION_FAILED',
  'MISSING_WIDGET_ID',
  'DUPLICATE_ATOM',
];
```

---

## 7. 評価指標

### 7.1 Layer1（構造健全性）

| 記号 | 指標名 | 定義 | 算出方法 |
|------|--------|------|----------|
| VR | DSL妥当率 | JSONパース・スキーマ検証・レンダリング成功率 | `dsl_errors == null && render_errors == null` |
| TCR | 型整合率 | TypeScript/Zod検証で型エラーが0の割合 | `type_error_count == 0` |
| RRR | 参照整合率 | PNTR・dataBindings等の参照解決成功率 | `reference_error_count == 0` |
| CDR | 循環依存率 | DependencyGraphで循環検出された割合 | `cycle_detected == true` |
| RGR | 再生成率 | バリデーション失敗による再生成発生率 | `regenerated == true` |
| **W2WR** | W2WR成功率 | Widget-to-Widget Reactivity DSL生成成功率 | `w2wr_errors == null` ⭐ |
| **RCR** | React変換成功率 | React Component変換成功率 | `react_component_errors == null` ⭐ |
| **JAR** | Jotai Atom成功率 | Jotai Atom生成成功率 | `jotai_atom_errors == null` ⭐ |

### 7.2 Layer4（実用性）

| 記号 | 指標名 | 定義 |
|------|--------|------|
| LAT | 平均レイテンシ | 各Stageおよび全体処理時間（ms） |
| COST | 推定APIコスト | 1セッションあたりの推定APIコスト（JPY） |
| FR | 異常終了率 | タイムアウト・JSON破損・API失敗の割合 |

### 7.3 統計解析仕様

**成功率系（VR, TCR, RRR, CDR, RGR, W2WR, RCR, JAR, FR）**:
- 使用検定: 2標本比例検定（z検定）
- 有意水準: α = 0.05

**実数値系（LAT, COST）**:
- 使用検定: Mann–Whitney U 検定（ノンパラメトリック）

---

## 8. 主要ファイル一覧

### 8.1 バックエンド

| ファイル | 責務 |
|---------|------|
| `server/src/services/v4/WidgetSelectionService.ts` | Widget選定（Stage 1） |
| `server/src/services/v4/ORSGeneratorService.ts` | ORS生成（Stage 2） |
| `server/src/services/v4/UISpecGeneratorV4.ts` | UISpec生成（Stage 3） |
| `server/src/services/v4/ValidationService.ts` | DSL検証・W2WR検証 |
| `server/src/services/v4/LLMOrchestrator.ts` | LLM統合管理 |
| `server/src/services/BatchExecutionService.ts` | バッチ実験実行 |
| `server/src/routes/ui.ts` | UI生成エンドポイント |

### 8.2 フロントエンド

| ファイル | 責務 |
|---------|------|
| `concern-app/src/services/ui-generation/UIRendererV4.tsx` | UIレンダリング |
| `concern-app/src/services/ui/ReactiveBindingEngineV4.ts` | W2WRエンジン |
| `concern-app/src/services/ui/DataBindingProcessor.ts` | ORS↔Widgetバインディング |

### 8.3 プロンプト

| ファイル | 用途 |
|---------|------|
| `server/src/prompts/v4/widget-selection.prompt.ts` | Stage 1 |
| `server/src/prompts/v4/ors-generation.prompt.ts` | Stage 2 (v4) |
| `server/src/prompts/v4/uispec-generation.prompt.ts` | Stage 3 (v4) |
| `server/src/prompts/v4/plan-unified.prompt.ts` | Stage 2&3 (v5) |

### 8.4 DSL仕様書

| ファイル | 内容 |
|---------|------|
| `specs/dsl-design/v4/DSL-Spec-v4.0.md` | DSL v4.0仕様 |
| `specs/dsl-design/v5/DSL-Spec-v5.0.md` | DSL v5.0仕様 |
| `specs/system-design/experiment_spec_layer_1_layer_4.md` | 実験仕様 |

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| itr9 | 2025-11-xx | 初版（specs-itr9.md） |
| itr10 | 2025-12-11 | DSL v5対応、バッチ実験システム、評価指標拡張 |
