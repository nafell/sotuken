# 4. Implementation

本章では、提案手法を具体化した思考整理支援アプリケーションの実装について述べる。まずアプリケーションの全体構成を説明し、次にUI生成パイプラインの詳細、DSL仕様、Widget-to-Widget Reactivityの実装、そしてgeneratedValueによるコンテンツ生成について順に解説する。

---

## 4.1 思考整理支援アプリケーションの概要

### 4.1.1 なぜ思考整理を題材としたか

思考整理は、ドメイン特化型動的UI生成の価値を実証するのに適した題材である。その理由を以下に述べる。

1. **悩みの多様性**: ユーザーの悩みは内容・状況・背景が多様であり、状況に応じて刻々と変化する
2. **認知特性の個人差**: ユーザーの認知思考特性は多岐に渡り、有効な思考整理手法も異なる
3. **固定UIの限界**: 上記の多様性に対し、固定UIでは対応困難である
4. **ユーザー主導カスタマイズの困難さ**: 悩みは漠然としているため、ユーザー自身が最適なUIを選択・設定することも困難である

これらの特性により、LLMがユーザーの悩みを分析し、適切なUI（思考整理手法）を動的に選択・構成することの価値が高い。

### 4.1.2 アプリケーション構成

本アプリケーションは3つのフェーズで構成される。

```
Capture Phase: 悩みの入力・コンテキスト収集
    ↓
Plan Phase: 思考整理（本研究の主対象）
    ↓
Breakdown Phase: タスク分解・結果出力
```

**Capture Phase**では、ユーザーが悩みをテキストで入力し、LLMがボトルネック（思考の障壁）を診断する。

**Plan Phase**では、診断結果に基づいてUIを動的生成し、ユーザーの思考整理を支援する。本研究の主対象であり、Widget-to-Widget Reactivityによる動的UI生成が行われる。

**Breakdown Phase**では、思考整理の結果を構造化して提示する。

### 4.1.3 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React + TypeScript + Capacitor (PWA) |
| 状態管理 | Jotai（Widget単位のatom） |
| バックエンド | Bun + Hono + Drizzle ORM |
| データベース | IndexedDB (クライアント) + SQLite (サーバー) |
| LLM | Google Gemini 2.5 flash-lite |

---

## 4.2 Plan Phaseの設計

### 4.2.1 4ステージ構造（半固定のフロー構造）

Plan Phaseは、思考整理のドメイン知識に基づき4つのステージで構成される。この構造は半固定であり、各ステージ内でどのWidgetを使用するかは動的に決定される。

| ステージ | 名称 | 目的 |
|---------|------|------|
| **Diverge** | 発散・探索 | 可能性を広げ、選択肢を増やす |
| **Organize** | 整理・評価 | 選択肢を構造化し、関係性を把握する |
| **Converge** | 収束・決定 | 優先順位をつけ、方針を確定する |
| **Summary** | まとめ | 構造化された結果を確認・修正する |

### 4.2.2 ボトルネック診断

LLMはCapture Phaseで収集した情報から、ユーザーの思考の障壁（ボトルネック）を診断する。診断結果はWidget選定の重要な入力となる。

**8種類のボトルネックタイプ:**

1. **too_many_options**: 選択肢が多すぎて整理できない
2. **unclear_start**: 何から考えればいいか分からない
3. **intertwined_problems**: 複数の問題が絡み合っている
4. **emotional_block**: 感情的なブロックがある
5. **information_shortage**: 情報が不足している
6. **fear_of_decision**: 決断への恐れがある
7. **fixed_perspective**: 視点が固定されている
8. **priority_confusion**: 優先順位がつけられない

---

## 4.3 UI生成パイプライン

### 4.3.1 3段階LLM呼び出し構成

本システムでは、Jelly Frameworkの3層アーキテクチャを踏襲しつつ、ドメイン特化のために3段階のLLM呼び出しパイプラインを採用した。

```
ユーザー入力（悩みテキスト）
        ↓
[Stage 1] Widget選定 (LLM)
    入力: ConcernText, BottleneckType, Widget Definitions
    出力: WidgetSelectionResult（4ステージ分のWidget選定）
        ↓
[Stage 2] ORS + DependencyGraph生成 (LLM)
    入力: ConcernText, SelectedWidgets, PreviousStageResult
    出力: ORS Instance（データ構造定義 + データ間依存関係）
        ↓
[Stage 3] UISpec + ReactiveBinding生成 (LLM)
    入力: ORS Instance, SelectedWidgets, generationHints
    出力: UISpec Instance（Widget仕様 + Widget間リアクティブ連携 + 生成コンテンツ）
        ↓
[フロントエンド] DSL Parse → Jotai Atom化 → React Rendering
```

この3段階構成により、以下の利点が得られる。

1. **段階的具体化**: 抽象度の高いWidget選定から、具体的なUISpec生成まで段階的に詳細化する
2. **文脈の維持**: 各段階の出力が次段階の入力として使用され、一貫した文脈を維持する
3. **検証可能性**: 各段階の出力を個別に検証・デバッグできる

### 4.3.2 Stage 1: Widget選定

LLMは、ユーザーの悩みとボトルネック診断結果に基づき、4ステージ分のWidgetを一括で選定する。

**入力:**
- ConcernText: ユーザーの悩みテキスト
- BottleneckType: 診断されたボトルネック種別
- Widget Definitions: 13種のWidget定義（メタデータ・ポート情報）

**出力: WidgetSelectionResult**

```json
{
  "version": "4.0",
  "stages": {
    "diverge": {
      "widgets": [
        { "widgetId": "emotion_palette", "purpose": "感情の識別と可視化", "order": 0 },
        { "widgetId": "brainstorm_cards", "purpose": "アイデアの発散", "order": 1 }
      ],
      "purpose": "悩みに関連する感情とアイデアの発散",
      "target": "転職への不安と期待を整理する"
    },
    "organize": { ... },
    "converge": { ... },
    "summary": { ... }
  },
  "rationale": "感情的ブロックが検出されたため、まず感情の可視化から開始する",
  "metadata": {
    "generatedAt": 1733140800000,
    "bottleneckType": "emotional_block"
  }
}
```

### 4.3.3 Stage 2: ORS + DependencyGraph生成

選定されたWidgetに基づき、データ構造（ORS）とデータ間の依存関係（DependencyGraph）を生成する。

**ORS（Object-Relational Schema）の構造:**

```typescript
interface ORS {
  version: string;
  entities: Entity[];           // データエンティティ群
  dependencyGraph: DependencyGraph;  // データ間依存関係
  metadata?: DICT<SVAL>;
}

interface Entity {
  id: string;
  type: 'concern' | 'stage_data' | 'widget_data' | 'shared_data';
  attributes: Attribute[];
}

interface Attribute {
  name: string;
  structuralType: 'SVAL' | 'ARRY' | 'PNTR' | 'DICT';  // 抽象型
  valueType?: 'string' | 'number' | 'boolean' | 'date' | 'object';
  generation?: GenerationSpec;  // generatedValue用
}
```

**抽象型の定義:**

| 型 | 説明 | 例 |
|----|------|-----|
| SVAL | スカラー値 | string, number, boolean |
| ARRY | 配列 | string[], object[] |
| PNTR | 参照（ポインタ） | 他のEntity.Attributeへの参照 |
| DICT | 辞書 | { [key: string]: T } |

**ORS Instance例:**

```json
{
  "version": "4.0",
  "entities": [
    {
      "id": "brainstorm_data",
      "type": "widget_data",
      "attributes": [
        {
          "name": "ideas",
          "structuralType": "ARRY",
          "itemType": "DICT",
          "schema": { "id": "string", "text": "string", "color": "string" }
        }
      ]
    },
    {
      "id": "sorting_data",
      "type": "widget_data",
      "attributes": [
        {
          "name": "source_ideas",
          "structuralType": "PNTR",
          "ref": "brainstorm_data.ideas"
        }
      ]
    }
  ],
  "dependencyGraph": {
    "dependencies": [
      {
        "id": "dep_001",
        "source": "brainstorm_data.ideas",
        "target": "sorting_data.source_ideas",
        "mechanism": "update",
        "relationship": { "type": "javascript", "javascript": "return source;" }
      }
    ]
  }
}
```

### 4.3.4 Stage 3: UISpec + ReactiveBinding生成

ORSに基づき、具体的なWidget仕様（UISpec）とWidget間のリアクティブ連携（ReactiveBinding）を生成する。このステージでgeneratedValue（LLM生成コンテンツ）も同時に生成される。

**UISpecの構造:**

```typescript
interface UISpec {
  sessionId: string;
  stage: StageType;
  widgets: WidgetSpec[];              // Widget仕様配列
  reactiveBindings: ReactiveBindingSpec;  // Widget間連携
  layout: ScreenLayout;
  metadata: UISpecMetadata;
}

interface WidgetSpec {
  id: string;
  component: WidgetComponentType;     // プリセットWidget ID
  position: number;
  config: WidgetConfig;               // Widget固有設定 + generatedValue
  dataBindings: DataBindingSpec[];    // ORSへのバインディング
  metadata?: { purpose?: string };
}
```

**UISpec Instance例（generatedValue含む）:**

```json
{
  "sessionId": "session_001",
  "stage": "diverge",
  "widgets": [
    {
      "id": "brainstorm_0",
      "component": "brainstorm_cards",
      "position": 0,
      "config": {
        "title": "転職について考えてみましょう",
        "sampleCards": {
          "items": [
            { "id": "sample_1", "text": "現職のメリット・デメリット", "isGenerated": true },
            { "id": "sample_2", "text": "転職で実現したいこと", "isGenerated": true }
          ],
          "isGenerated": true
        }
      },
      "dataBindings": [
        { "portId": "cards", "entityAttribute": "brainstorm_data.ideas", "direction": "out" }
      ],
      "metadata": { "purpose": "転職に関するアイデアを自由に発散させる" }
    },
    {
      "id": "card_sorting_0",
      "component": "card_sorting",
      "position": 1,
      "config": { "categories": ["重要", "検討中", "保留"] },
      "dataBindings": [
        { "portId": "inputCards", "entityAttribute": "sorting_data.source_ideas", "direction": "in" }
      ]
    }
  ],
  "reactiveBindings": {
    "bindings": [
      {
        "id": "rb_001",
        "source": "brainstorm_0.cards",
        "target": "card_sorting_0.inputCards",
        "mechanism": "update",
        "relationship": { "type": "passthrough" },
        "updateMode": "debounced",
        "debounceMs": 300
      }
    ]
  }
}
```

---

## 4.4 DSL仕様

### 4.4.1 Jelly Frameworkとの対応

本システムのDSLは、Jelly Frameworkの3層アーキテクチャを踏襲しつつ、ドメイン特化のための拡張を行っている。

| 層 | Jelly Framework | 本システム | 変更点 |
|----|-----------------|-----------|--------|
| Layer 1 | ORS (Object-Relational Schema) | ORS | 概念を継承 |
| Layer 1 | DpG (Dependency Graph) | DependencyGraph | データ間依存関係 |
| Layer 2 | UI Specification | UISpec + ReactiveBinding | Widget間連携を分離 |
| Layer 3 | - | Widget Definitions | 13種プリセットWidget（独自拡張） |

### 4.4.2 オリジナル拡張

Jelly Frameworkには存在しない、本システム独自の拡張を以下に示す。

| 拡張 | 説明 |
|------|------|
| **Widget単位UI** | JellyはAtom（input, button等）単位だが、本システムは複合Widget（13種）を基本単位とする |
| **Widget-to-Widget Reactivity** | Widget間のリアクティブ連携（詳細は4.5節） |
| **complexity** | Widget認知負荷の数値化（0.0-1.0）。組み合わせ制約に使用 |
| **generatedValue** | LLM生成コンテンツ（詳細は4.6節） |
| **stage_summary** | ステージ間データ引き継ぎWidget |

### 4.4.3 Widget Definitions

13種のプリセットWidgetを定義し、LLMプロンプトに含める。各Widgetは以下のメタデータを持つ。

```typescript
interface WidgetDefinition {
  id: string;                    // Widget ID
  name: string;                  // 表示名
  description: string;           // LLMプロンプト用説明
  stage: WidgetStage[];          // 対応ステージ（複数可）
  ports: {
    inputs: PortDefinition[];    // 入力ポート
    outputs: PortDefinition[];   // 出力ポート
  };
  metadata: {
    timing: number;              // 推奨タイミング（0.0-1.0）
    versatility: number;         // 汎用性（0.0-1.0）
    complexity: number;          // 認知負荷（0.0-1.0）
    bottleneck: string[];        // 対応ボトルネック
  };
  generationHints?: WidgetGenerationHints;  // generatedValue用
}
```

**Widget一覧（13種）:**

| ID | 名称 | ステージ | complexity |
|----|------|---------|------------|
| stage_summary | ステージサマリー | all | 0.1 |
| emotion_palette | 感情パレット | diverge | 0.3 |
| brainstorm_cards | ブレインストームカード | diverge | 0.2 |
| question_card_chain | 質問カードチェーン | diverge | 0.5 |
| card_sorting | カードソート | organize | 0.4 |
| dependency_mapping | 依存関係マップ | organize | 0.8 |
| swot_analysis | SWOT分析 | organize | 0.5 |
| mind_map | マインドマップ | organize | 0.7 |
| matrix_placement | マトリクス配置 | converge | 0.5 |
| tradeoff_balance | トレードオフ天秤 | converge | 0.6 |
| priority_slider_grid | 優先度スライダー | converge | 0.4 |
| timeline_slider | タイムラインスライダー | converge | 0.5 |
| structured_summary | 構造化サマリー | summary | 0.3 |

---

## 4.5 Widget-to-Widget Reactivity

### 4.5.1 概念

Widget-to-Widget Reactivityは、同一画面上に配置された複数のWidget間でリアルタイムにデータを連動させる機構である。ユーザーがあるWidgetを操作すると、関連する他のWidgetがLLMを介さずに自動更新される。

これは本研究の中心的な技術的貢献であり、「JSONでWidget選択結果を出せば十分」「固定UIでいい」という反論に対する回答となる。Widget間の連動関係は文脈依存で動的に決まるため、事前に全パターンを定義することは非現実的である。

### 4.5.2 ReactiveBinding定義（DSL）

```typescript
interface ReactiveBinding {
  id: string;
  source: WidgetPortPath;       // "widgetId.outputPort"
  target: WidgetPortPath;       // "widgetId.inputPort"
  mechanism: 'validate' | 'update';
  relationship: WidgetRelationshipSpec;
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
  debounceMs?: number;
}

type WidgetRelationshipSpec =
  | { type: 'passthrough' }                    // そのまま伝播
  | { type: 'javascript'; javascript: string } // JS式で変換
  | { type: 'transform'; transform: string }   // 組み込み変換
  | { type: 'llm'; llmPrompt: string }        // LLM変換（非同期）
```

**updateModeの種類:**

| モード | 説明 | ユースケース |
|--------|------|-------------|
| realtime | 即座に伝播 | 軽量な変換、即時フィードバックが必要な場合 |
| debounced | 300msのDebounce後に伝播 | 連続入力がある場合（デフォルト） |
| on_confirm | ユーザー確認後に伝播 | 重要な変更、LLM変換を含む場合 |

### 4.5.3 実装アーキテクチャ

Widget-to-Widget Reactivityは、以下の3つのコンポーネントで実装される。

```
Widget A (ソース)
    │
    │ emitPort(portId, value)
    ▼
┌─────────────────────────────────────┐
│ ReactiveBindingEngine               │
│  - updatePort(): Port値キャッシュ   │
│  - scheduleDebounce(): タイマー管理 │
│  - executePropagation(): 伝播実行   │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ DependencyGraph                      │
│  - 依存関係グラフ管理               │
│  - detectCycle(): 循環依存検出（DFS）│
│  - getUpdateOrder(): トポロジカルソート│
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ DependencyExecutor                   │
│  - executeTransform(): 変換実行     │
│  - JavaScript式の安全な評価         │
│  - 組み込み変換関数の実行           │
└─────────────────────────────────────┘
    │
    ▼
Widget B (ターゲット)
    - Jotai atom更新 → 再レンダリング
```

### 4.5.4 Jotai Atomによる状態管理

Widget毎にJotai atomを動的生成し、リアクティブな状態管理を実現する。

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

// React Hookでの使用
export function useWidgetState<T>(widgetId: string, initialValue: T) {
  const atom = createWidgetAtom<T>(widgetId, initialValue);
  return useAtom(atom);  // [value, setValue]
}
```

### 4.5.5 循環依存の検出と防止

ReactiveBindingEngineは、依存関係グラフの循環を検出し、無限ループを防止する。

```typescript
// DFSによる循環検出
public detectCycle(): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  const dfs = (node: string): boolean => {
    if (recStack.has(node)) return true;  // 循環検出
    if (visited.has(node)) return false;

    visited.add(node);
    recStack.add(node);

    const deps = this.dependencies.get(node) || [];
    for (const dep of deps) {
      if (dfs(dep.target)) return true;
    }

    recStack.delete(node);
    return false;
  };

  for (const node of this.nodes) {
    if (dfs(node)) return true;
  }
  return false;
}
```

### 4.5.6 実装例: 優先度スライダー → ランキング表示

```
[左側] 複数軸スライダー（PrioritySliderGrid）
  - 緊急度: ●━━━━━━━━━
  - 重要度: ━━━━━●━━━━
  - 工数:   ━━━━━━━●━━
       ↓ ReactiveBinding（debounced, 300ms）
       ↓ transform: calculate_ranking
[右側] 優先順位ランキング
  1. プロジェクトA（スコア: 78）
  2. プロジェクトB（スコア: 65）
  3. プロジェクトC（スコア: 52）
```

対応するReactiveBinding定義:

```json
{
  "id": "rb_priority_ranking",
  "source": "priority_slider_0.weights",
  "target": "ranking_display_0.scores",
  "mechanism": "update",
  "relationship": {
    "type": "transform",
    "transform": "calculate_ranking"
  },
  "updateMode": "debounced",
  "debounceMs": 300
}
```

---

## 4.6 generatedValue

### 4.6.1 概念

generatedValueは、UIそのものではなく**UI内のコンテンツ**をLLMが生成する仕組みである。これにより、Cold Start Problem（空のWidgetから始める認知負荷）を解決し、ユーザーの思考を促すきっかけを提供する。

重要な設計原則として、generatedValueは**UISpec生成時（Stage 3）に同時生成**され、追加のLLM呼び出しは発生しない。

### 4.6.2 分類

| タイプ | 説明 | 例 |
|--------|------|-----|
| **Type A: labels** | UIの「枠」を埋めるラベル・説明文 | 感情ラベル（EmotionPalette） |
| **Type B: samples** | ユーザー入力の叩き台となるサンプルデータ | 初期カード（BrainstormCards） |

### 4.6.3 Widget定義でのgenerationHints

各Widgetは、generatedValueの生成方法を`generationHints`として定義する。

```typescript
interface WidgetGenerationHints {
  labels?: {
    field: string;              // config内の配置先フィールド
    instruction: string;        // LLMへの生成指示
    count?: number;             // 生成数
    schema: Record<string, string>;
  };
  samples?: {
    field: string;
    instruction: string;
    count: { min: number; max: number };
    schema: Record<string, string>;
  };
}
```

**BrainstormCardsの例:**

```typescript
generationHints: {
  samples: {
    field: 'sampleCards',
    instruction: 'ユーザーの悩みに関連するアイデアの種となるカードを2-3個生成してください。ユーザーの思考を促すきっかけとなる具体的な内容にしてください。',
    count: { min: 2, max: 3 },
    schema: {
      id: 'string (sample_1, sample_2, ...)',
      text: 'string (日本語、15-30文字程度)',
      color: 'string (optional, hex color)'
    }
  }
}
```

### 4.6.4 生成されたコンテンツの構造

生成コンテンツは`isGenerated: true`マーカーで識別される。

```json
{
  "config": {
    "sampleCards": {
      "items": [
        { "id": "sample_1", "text": "現職のメリット・デメリット", "isGenerated": true },
        { "id": "sample_2", "text": "転職で実現したいこと", "isGenerated": true }
      ],
      "isGenerated": true
    }
  }
}
```

### 4.6.5 フロントエンドでの表示と操作

生成コンテンツは視覚的に区別され、ユーザーは「採用」「却下」を選択できる。

```typescript
const BrainstormCards: React.FC<WidgetProps> = ({ spec }) => {
  const sampleCards = spec.config?.sampleCards as GeneratedContentContainer;
  const [cards, setCards] = useState<Card[]>([]);

  const handleAdoptSample = (sample: GeneratedSampleItem) => {
    // isGeneratedマーカーを除去して通常カードとして採用
    const newCard = { ...sample, isGenerated: undefined };
    setCards(prev => [...prev, newCard]);
  };

  return (
    <div>
      {sampleCards?.items.map(sample => (
        <div key={sample.id} className={styles.sampleCard}>
          <GeneratedBadge />  {/* ✨AI提案 */}
          <span>{sample.text}</span>
          <button onClick={() => handleAdoptSample(sample)}>使う</button>
          <button onClick={() => handleDismiss(sample.id)}>却下</button>
        </div>
      ))}
    </div>
  );
};
```

### 4.6.6 実装済みWidget

| Widget | タイプ | 生成内容 |
|--------|--------|----------|
| BrainstormCards | Type B (samples) | アイデアカード2-3個 |
| SwotAnalysis | Type B (samples) | 各象限に1つずつサンプル項目 |
| TradeoffBalance | Type B (samples) | 左右それぞれ1-2個の比較項目 |
| EmotionPalette | Type A (labels) | 悩みに関連する感情ラベル8個 |

---

## 4.7 フロントエンド実装

### 4.7.1 UIRendererV4

UISpec InstanceからReact UIを動的レンダリングするコンポーネント。

```typescript
export const UIRendererV4: React.FC<UIRendererV4Props> = ({
  uiSpec, ors, onWidgetUpdate, debug = false
}) => {
  // 1. DataBindingProcessor初期化（ORS → Widget初期値変換）
  const dataBindingProcessor = useMemo(() => {
    return createDataBindingProcessor(ors, { debug });
  }, [ors, debug]);

  // 2. ReactiveBindingEngine初期化
  const engine = useMemo(() => {
    return createReactiveBindingEngine(uiSpec.reactiveBindings, { debug });
  }, [uiSpec.reactiveBindings, debug]);

  // 3. Widgetレンダリング
  return (
    <div className={styles.container}>
      {uiSpec.widgets
        .sort((a, b) => a.position - b.position)
        .map((spec) => (
          <WidgetRenderer
            key={spec.id}
            widgetSpec={spec}
            component={WIDGET_COMPONENTS[spec.component]}
            initialValue={dataBindingProcessor.getInitialValue(spec)}
            engine={engine}
          />
        ))}
    </div>
  );
};
```

### 4.7.2 Widget Component Registry

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
  stage_summary: StageSummary,
};
```

---

## 4.8 実装ファイル一覧

### バックエンド（server/src/）

| ファイル | 役割 |
|---------|------|
| services/v4/WidgetSelectionService.ts | Widget選定（Stage 1） |
| services/v4/ORSGeneratorService.ts | ORS生成（Stage 2） |
| services/v4/UISpecGeneratorV4.ts | UISpec生成（Stage 3） |
| definitions/v4/widgets.ts | Widget定義（13種） |
| prompts/v4/*.prompt.ts | 各ステージのLLMプロンプト |
| routes/ui.ts | API エンドポイント |

### フロントエンド（concern-app/src/）

| ファイル | 役割 |
|---------|------|
| services/ui-generation/UIRendererV4.tsx | UISpec → React レンダラー |
| services/ui/ReactiveBindingEngine.ts | Reactivity エンジン |
| services/ui/DependencyGraph.ts | 依存グラフ管理 |
| services/ui/DependencyExecutor.ts | 変換実行 |
| services/ui/DataBindingProcessor.ts | ORS ↔ Widget データ連携 |
| store/widgetAtoms.ts | Jotai atom管理 |
| hooks/useReactivePorts.ts | Port操作Hook |
| hooks/useWidgetState.ts | Widget状態管理Hook |
| components/widgets/v3/*.tsx | Widgetコンポーネント群 |

---

## 4.9 まとめ

本章では、提案手法を具体化した思考整理支援アプリケーションの実装について述べた。

1. **3段階LLM呼び出しパイプライン**: Widget選定 → ORS+DpG生成 → UISpec生成の段階的具体化により、一貫した文脈を維持しながら高品質なUI生成を実現した

2. **Widget-to-Widget Reactivity**: Jotai atomベースの状態管理とReactiveBindingEngineにより、LLMを介さないリアルタイムなWidget間連動を実現した。循環依存検出とDebounceにより安定性を確保している

3. **generatedValue**: UISpec生成と同時にコンテンツを生成することで、追加LLM呼び出しなしにCold Start Problemを解決した。`isGenerated`マーカーによる明示的識別と、ユーザーによる採用/却下の選択を可能にした

4. **DSL仕様**: Jelly Frameworkの3層アーキテクチャを踏襲しつつ、Widget単位UI、complexity、generatedValue等のドメイン特化拡張を行った

これらの実装により、動的UI度Stage 4（Widget間インタラクションの動的定義）を実現し、「JSONで十分」「固定UIでいい」という反論に対する具体的な回答を示すことができた。
