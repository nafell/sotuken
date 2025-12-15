# 研究論文用：動的UI生成システム実装詳細

**用途**: 論文「実装章」(Implementation / System Design)
**詳細度**: 設計レベル（DSL構造・型定義・データフロー図 + 具体的なJSON/TypeScript例）

## 概要

本プロジェクトは「LLM-Hardened DSL」を用いた特定ドメイン向けアプリの動的UI生成システムです。ユーザーがアプリを利用するタイミングでUIを生成するパイプラインを実装しています。

**主要な技術的貢献**:
1. 3段階LLM呼び出しによる段階的DSL生成パイプライン
2. Widget-to-Widget Reactivity機構（独自開発）
3. generatedValue（UIコンテンツのLLM生成）

---

## 1. UI生成パイプライン

### 1.1 3段階LLM呼び出し構成

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
    出力: UISpec Instance（Widget仕様 + Widget間リアクティブ連携）
        ↓
[フロントエンド] DSL Parse → Jotai Atom化 → React Rendering
```

### 1.2 主要実装ファイル

| フェーズ | バックエンド | フロントエンド |
|---------|-------------|---------------|
| Widget選定 | `server/src/services/v4/WidgetSelectionService.ts` | - |
| ORS生成 | `server/src/services/v4/ORSGeneratorService.ts` | - |
| UISpec生成 | `server/src/services/v4/UISpecGeneratorV4.ts` | - |
| レンダリング | - | `concern-app/src/services/ui-generation/UIRendererV4.tsx` |
| Reactivity | - | `concern-app/src/services/ui/ReactiveBindingEngineV4.ts` |

### 1.3 API エンドポイント

- `POST /v1/ui/generate-v4`: 3段階統合API
- `POST /v1/ui/generate-v4-widgets`: Widget選定のみ
- `POST /v1/ui/generate-v4-stage`: ステージ単位実行

---

## 2. DSL仕様（Jelly Framework準拠）

### 2.1 3層DSL構造

| 層 | 名称 | 役割 | Jelly対応 |
|---|------|------|-----------|
| Layer 1 | TDDM（ORS + DpG） | データ構造 + データ間依存関係 | ORS + DpG |
| Layer 2 | UISpec + ReactiveBinding | Widget仕様 + Widget間連携 | UI Specification |
| Layer 3 | Widget Definitions | 13種プリセットWidgetのメタデータ | - (オリジナル拡張) |

### 2.2 ORS（Object-Relational Schema）

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

### 2.3 UISpec

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
}
```

---

## 3. Widget-to-Widget Reactivity（独自拡張）

### 3.1 概念

Jelly Frameworkには存在しない**Widget間のリアクティブ連携**機構を独自開発。Widget Aの出力がWidget Bの入力に自動伝播する。

### 3.2 ReactiveBinding定義（DSL）

```typescript
interface ReactiveBinding {
  id: string;
  source: WidgetPortPath;       // "widgetId.outputPort"
  target: WidgetPortPath;       // "widgetId.inputPort"
  mechanism: 'validate' | 'update';
  relationship: WidgetRelationshipSpec;  // 変換ロジック
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
  debounceMs?: number;
}

type WidgetRelationshipSpec =
  | { type: 'passthrough' }                           // そのまま伝播
  | { type: 'javascript'; javascript: string }        // JS式で変換
  | { type: 'transform'; transform: string }          // 組み込み変換
  | { type: 'llm'; llmPrompt: string }               // LLM変換
```

### 3.3 実装アーキテクチャ

```
Widget A (ソース)
    │
    │ emitPort(portId, value)
    ▼
┌─────────────────────────────────────┐
│ ReactiveBindingEngine               │
│  - updatePort() でPort値キャッシュ  │
│  - Debounceタイマー管理             │
│  - executePropagation() で伝播実行  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ DependencyGraph                      │
│  - 依存関係グラフ管理               │
│  - 循環依存検出（DFSアルゴリズム）  │
│  - トポロジカルソート               │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ DependencyExecutor                   │
│  - JavaScript式の安全な評価         │
│  - 組み込み変換関数の実行           │
│  - validate/update メカニズム実行   │
└─────────────────────────────────────┘
    │
    ▼
Widget B (ターゲット)
    - Jotai atom更新 → 再レンダリング
```

### 3.4 Jotai Atom化

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

### 3.5 主要実装ファイル

| ファイル | 役割 |
|---------|------|
| `concern-app/src/services/ui/ReactiveBindingEngine.ts` | メインエンジン（476行） |
| `concern-app/src/services/ui/DependencyGraph.ts` | グラフ管理（273行） |
| `concern-app/src/services/ui/DependencyExecutor.ts` | 変換実行（323行） |
| `concern-app/src/store/widgetAtoms.ts` | Jotai atom管理（80行） |
| `concern-app/src/hooks/useReactivePorts.ts` | Port操作Hook（258行） |

---

## 4. generatedValue（独自拡張）

### 4.1 概念

UIそのものではなく、**UI内のコンテンツ**をLLMが生成する仕組み。Cold Start Problem（空のWidgetから始める認知負荷）を解決。

### 4.2 分類

| タイプ | 説明 | 例 |
|--------|------|-----|
| Type A | ラベル・説明文 | 感情ラベル（EmotionPalette） |
| Type B | サンプルデータ | 初期カード（BrainstormCards） |

### 4.3 Widget定義でのgenerationHints

```typescript
// BrainstormCardsの例
const BrainstormCardsDefinitionV4: WidgetDefinitionV4 = {
  id: 'brainstorm_cards',
  generationHints: {
    samples: {
      field: 'sampleCards',      // config内の配置先
      instruction: 'ユーザーの悩みに関連するアイデアの種となるカードを2-3個生成',
      count: { min: 2, max: 3 },
      schema: { id: 'string', text: 'string', color: 'string (optional)' },
    },
  },
};
```

### 4.4 生成されたUISpec内での配置

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

### 4.5 フロントエンドでの表示

- `isGenerated: true` のアイテムは `GeneratedBadge` (✨AI提案) で視覚的に区別
- ユーザーは「使う」「却下」を選択可能
- 採用されたサンプルは `isGenerated` マーカー除去 → 通常のユーザー入力として扱う

### 4.6 設計原則

1. **追加LLM呼び出しなし**: UISpec生成時（第3段階）に同時生成
2. **明示的マーキング**: `isGenerated: true` で生成コンテンツを識別
3. **後方互換性**: generationHintsがないWidgetは従来通り動作

---

## 5. 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React + TypeScript + Capacitor (PWA) |
| 状態管理 | Jotai（Widget単位のatom） |
| バックエンド | Bun + Hono + Drizzle ORM |
| データベース | IndexedDB (クライアント) + SQLite (サーバー) |
| LLM | Google Gemini 2.5 mini |
| DSL | 3層構造（ORS + DpG / UISpec + ReactiveBinding / Widget Definitions） |

---

## 6. Jelly Frameworkとの対応・差異

### 6.1 採用した概念

| Jelly | 本システム |
|-------|-----------|
| ORS (Object-Relational Schema) | ORS |
| DpG (Dependency Graph) | DependencyGraph |
| UI Specification | UISpec |
| SVAL/ARRY/PNTR/DICT | SVAL/ARRY/PNTR/DICT |

### 6.2 オリジナル拡張

| 拡張 | 説明 |
|------|------|
| Widget単位UI | JellyはinputやbuttonなどのUIプリミティブ単位、本システムは複合Widget（13種）を基本単位 |
| Widget-to-Widget Reactivity | Widget間のリアクティブ連携（Jellyにはない概念） |
| complexity | Widget認知負荷の数値化（0.0-1.0） |
| generatedValue | LLM生成コンテンツ（ラベル・サンプルデータ） |
| stage_summary | ステージ間データ引き継ぎWidget |

---

## 7. 論文「実装章」用の具体的記述例

### 7.1 アーキテクチャ図（Figure用）

```
┌─────────────────────────────────────────────────────────────────┐
│                         ユーザー入力                             │
│                    (悩みテキスト入力)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              3段階LLM呼び出しパイプライン                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Stage 1       │→│ Stage 2       │→│ Stage 3       │       │
│  │ Widget選定    │  │ ORS+DpG生成   │  │ UISpec生成     │       │
│  │               │  │               │  │(+generatedValue)│      │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│         ↓                  ↓                  ↓                │
│  WidgetSelection    ORS Instance      UISpec Instance          │
│  Result (JSON)        (JSON)            (JSON)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   DSL → React変換層                              │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ UIRendererV4                                           │     │
│  │  1. UISpec JSON Parse                                  │     │
│  │  2. Widget毎にJotai Atom生成                          │     │
│  │  3. ReactiveBindingEngine初期化                       │     │
│  │  4. Widget Component動的レンダリング                   │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 動的生成されたReact UI                           │
│  ┌─────────┐   ReactiveBinding   ┌─────────┐                   │
│  │Widget A │ ─────────────────→ │Widget B │                   │
│  │ output  │  (Jotai atom連携)   │  input  │                   │
│  └─────────┘                     └─────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 具体的なDSL Instance例（論文掲載用）

#### Stage 1出力: WidgetSelectionResult

```json
{
  "version": "4.0",
  "stages": {
    "diverge": {
      "widgets": [
        { "widgetId": "emotion_palette", "purpose": "感情の識別", "order": 0 },
        { "widgetId": "brainstorm_cards", "purpose": "アイデア発散", "order": 1 }
      ],
      "purpose": "悩みに関連する感情とアイデアの発散"
    },
    "organize": { ... },
    "converge": { ... },
    "summary": { ... }
  }
}
```

#### Stage 2出力: ORS Instance

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
        "source": "brainstorm_data.ideas",
        "target": "sorting_data.source_ideas",
        "mechanism": "update",
        "relationship": { "type": "javascript", "javascript": "return source;" }
      }
    ]
  }
}
```

#### Stage 3出力: UISpec Instance（generatedValue含む）

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
      ]
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

### 7.3 Widget-to-Widget Reactivityの実装例（論文掲載用）

```typescript
// ReactiveBindingの宣言（DSLレベル）
interface ReactiveBinding {
  source: WidgetPortPath;       // "brainstorm_0.cards"
  target: WidgetPortPath;       // "card_sorting_0.inputCards"
  mechanism: 'update' | 'validate';
  relationship: RelationshipSpec;
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
}

// Jotai atomによる状態管理
function createWidgetAtom<T>(widgetId: string, initialValue: T): Atom<T> {
  const newAtom = atom<T>(initialValue);
  widgetAtomMap.set(widgetId, newAtom);
  return newAtom;
}

// Reactivityの実行フロー
class ReactiveBindingEngine {
  updatePort(portKey: string, value: unknown): void {
    this.portValues.set(portKey, value);
    this.scheduleDebounce(portKey);  // 300ms debounce
  }

  private executePropagation(sourcePortKey: string): void {
    const dependencies = this.graph.getDependencies(sourcePortKey);
    for (const dep of dependencies) {
      const transformedValue = this.executor.executeTransform(
        dep.relationship,
        this.portValues.get(sourcePortKey)
      );
      this.portValues.set(dep.target, transformedValue);
      this.onPropagateCallback?.([{ source: sourcePortKey, target: dep.target, value: transformedValue }]);
    }
  }
}
```

### 7.4 generatedValueの実装例（論文掲載用）

```typescript
// Widget定義にgenerationHintsを追加
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

// フロントエンドでの表示
const BrainstormCards: React.FC<WidgetProps> = ({ spec }) => {
  const sampleCards = spec.config?.sampleCards as GeneratedContentContainer;
  const [cards, setCards] = useState(sampleCards?.items || []);

  const handleAdoptSample = (sample: GeneratedSampleItem) => {
    // isGeneratedマーカーを除去して通常カードとして採用
    setCards(prev => [...prev, { ...sample, isGenerated: undefined }]);
  };

  return (
    <div>
      {sampleCards?.items.map(sample => (
        <div key={sample.id}>
          <GeneratedBadge /> {/* ✨AI提案 */}
          <span>{sample.text}</span>
          <button onClick={() => handleAdoptSample(sample)}>使う</button>
        </div>
      ))}
    </div>
  );
};
```

---

## 8. 論文記述のポイント

### 8.1 強調すべき技術的貢献

1. **3段階LLM呼び出しによる段階的具体化**
   - 抽象度の高いWidget選定から、具体的なUISpec生成まで段階的に詳細化
   - 各段階の出力が次段階の入力として使用され、文脈を維持

2. **Widget-to-Widget Reactivity（Jelly Frameworkにない独自拡張）**
   - DSLレベルで宣言的にWidget間連携を定義
   - Jotai atomによる細粒度リアクティブ状態管理
   - 循環依存検出（DFSアルゴリズム）とDebounceによる安定性

3. **generatedValue（Cold Start Problem解決）**
   - UISpec生成と同時にコンテンツを生成（追加LLM呼び出しなし）
   - `isGenerated`マーカーによる生成コンテンツの明示的識別
   - ユーザーが「採用/却下」を選択可能

### 8.2 Jelly Frameworkとの差異の説明

| 観点 | Jelly Framework | 本システム |
|------|-----------------|-----------|
| UI粒度 | input/button等の最小単位 | Widget（複合コンポーネント） |
| リアクティビティ | UI要素間 | Widget間（Widget-to-Widget） |
| コンテンツ生成 | なし | generatedValue |
| LLM呼び出し | 未規定 | 3段階パイプライン |
