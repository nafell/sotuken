# UISpecDSL v1.0 言語仕様書
**思考整理タスク特化型UI仕様記述言語**

---

## 1. 概要

### 1.1 目的
UISpecDSLは、DataSchemaDSLで定義された**データ構造を画面上にどう表示するか**を記述する言語です。

### 1.2 設計思想（Jellyの2層アーキテクチャ）

```
DataSchemaDSL (何を表示するか)
      ↓
UISpecDSL (どう表示するか)  ← この仕様書
      ↓
Rule-based Rendering (Reactコンポーネント生成)
```

**分離の利点:**
- データ構造とUIの関心分離
- 同じSchemaを複数のUI表現に変換可能
- UI変更時にデータ構造を変更不要

参考文献: [Cao et al., CHI 2025](https://arxiv.org/html/2503.04084v1)

---

## 2. 基本構造

### 2.1 最上位構造

```typescript
interface UISpecDSL {
  version: "1.0";
  generatedAt: string;  // ISO 8601
  generationId: string;  // UUID
  
  schemaRef: string;  // DataSchemaDSLのgenerationId
  stage: "capture" | "plan" | "breakdown";
  
  // Entity/属性ごとのレンダリング指定
  mappings: {
    [entityPath: string]: RenderSpec;
  };
  
  // ステージ別のレイアウト（planのみ自由度高）
  layout?: LayoutSpec;
  
  // 再生成ポリシー（planのみ）
  regenerationPolicy?: RegenerationPolicy;
}
```

---

## 3. レンダリング仕様（RenderSpec）

### 3.1 基本型（SVAL）のレンダリング

```typescript
interface SVALRenderSpec {
  render: "paragraph" | "shortText" | "number" | "radio" | "category" | "hidden";
  editable: boolean;
  placeholder?: string;  // 入力欄のプレースホルダー
  
  // category時のみ必須
  categories?: string[];
  
  // 表示順序・グルーピング
  displayOrder?: number;
  group?: string;
}
```

#### 3.1.1 レンダリングタイプ詳細

| `render`値 | HTML要素 | 使用例 | editable考慮 |
|-----------|---------|-------|------------|
| `paragraph` | `<textarea rows={4}>` | 関心事の自由入力 | true: 編集可、false: 読み取り専用 |
| `shortText` | `<input type="text">` | アクションタイトル | true: 編集可、false: 表示のみ |
| `number` | `<input type="number">` | 見積時間、優先度 | true: 編集可、false: 計算結果表示 |
| `radio` | `<input type="radio">` | 単一選択質問 | true: 選択可、false: 選択結果表示 |
| `category` | `<RadioGroup>` or `<select>` | アプローチ選択 | true: 選択可、false: 選択結果表示 |
| `hidden` | レンダリングしない | システム内部ID | （常にfalse） |

**例:**
```json
{
  "mappings": {
    "CONCERN.concernText": {
      "render": "paragraph",
      "editable": true,
      "placeholder": "今気になっていることを自由に書いてください",
      "displayOrder": 1
    },
    "CONCERN.category": {
      "render": "category",
      "editable": true,
      "categories": ["学習系", "イベント系", "習慣系", "仕事系"],
      "displayOrder": 2
    },
    "ACTION.priority": {
      "render": "number",
      "editable": false,
      "displayOrder": 5
    }
  }
}
```

---

### 3.2 配列型（ARRY）のレンダリング

```typescript
interface ARRYRenderSpec {
  render: "expanded" | "summary";
  editable: boolean;
  reorderable?: boolean;  // ドラッグ&ドロップ可能か
  
  // アイテムのレンダリング
  item: {
    render: string;  // アイテムが文字列ならSVALのrender、EntityならPNTRのrender
    thumbnail?: string[];  // Entity参照時の表示属性
  };
  
  // summary時のみ
  summary?: {
    name: string;  // 要約の名称
    derived: {
      operation: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";
      field?: string;  // 集計対象フィールド（COUNTは不要）
    };
  };
}
```

#### 3.2.1 expanded（完全展開）

**使用シーン:** 全アイテムを一覧表示したい場合

```json
{
  "CONCERN.clarificationQuestions": {
    "render": "expanded",
    "editable": true,
    "item": {
      "render": "radio",
      "thumbnail": ["text"]
    }
  }
}
```

**レンダリング結果:**
```
質問1: 現在どの段階ですか？
  ○ テーマ決め
  ○ 文献調査
  ○ 実験中
  
質問2: 指導教員との関係は？
  ○ 困難
  ○ 普通
  ○ 良好
```

#### 3.2.2 summary（要約表示）

**使用シーン:** 一覧が長い場合、クリックで展開

```json
{
  "CONCERN.actionSteps": {
    "render": "summary",
    "editable": false,
    "summary": {
      "name": "タスク数",
      "derived": { "operation": "COUNT" }
    },
    "item": {
      "render": "shortText",
      "thumbnail": ["title", "duration"]
    }
  }
}
```

**レンダリング結果:**
```
[📋 タスク数: 5個] ← クリックで展開
  ↓ クリック後
  1. 論文5本ピックアップ (30分)
  2. 要点をまとめる (60分)
  3. 研究マップ作成 (45分)
  ...
```

---

### 3.3 ポインタ型（PNTR）のレンダリング

```typescript
interface PNTRRenderSpec {
  render: "link" | "inline" | "card";
  editable: boolean;
  thumbnail: string[];  // 参照先の表示属性
}
```

**使用例: ACTION依存関係**
```json
{
  "ACTION.dependencies": {
    "render": "link",
    "editable": false,
    "thumbnail": ["title"]
  }
}
```

**レンダリング結果:**
```
依存タスク: [論文5本ピックアップ] ← リンク（クリックで詳細表示）
```

---

### 3.4 カスタムウィジェット（CUSTOM）

planステージの高度なUIで使用

```typescript
interface CUSTOMRenderSpec {
  render: "custom";
  component: string;  // ウィジェット名
  props?: Record<string, any>;  // ウィジェットへの追加パラメータ
}
```

**定義済みカスタムウィジェット:**

| `component`名 | 用途 | 対象属性 |
|--------------|------|---------|
| `tradeoff_slider` | トレードオフ2軸スライダー | `STRATEGY.tradeoffs` |
| `counterfactual_toggles` | 反実仮想条件チップ | `CONCERN.constraints` |
| `strategy_preview_picker` | プレビュー付き戦略選択 | `CONCERN.strategyCandidates` |

**例: トレードオフスライダー**
```json
{
  "STRATEGY.tradeoffs": {
    "render": "custom",
    "component": "tradeoff_slider",
    "props": {
      "axes": ["speed", "quality"],
      "labels": { "speed": "速度", "quality": "質" }
    }
  }
}
```

---

## 4. レイアウト仕様（LayoutSpec）

### 4.1 基本構造

```typescript
interface LayoutSpec {
  type: "singleColumn" | "twoColumn" | "grid";
  sections?: LayoutSection[];
}

interface LayoutSection {
  id: string;
  title?: string;
  widgets: string[];  // entityPath のリスト
  span?: number;  // grid時のカラム幅
}
```

### 4.2 ステージ別の自由度

| ステージ | レイアウト自由度 | 説明 |
|---------|--------------|------|
| **capture** | 固定 | `singleColumn`のみ、sectionsなし |
| **plan** | 🌟高 | `twoColumn` or `grid`、sections自由設計 |
| **breakdown** | 低 | `twoColumn`固定、sections固定 |

### 4.3 plan用の動的レイアウト例

```json
{
  "layout": {
    "type": "twoColumn",
    "sections": [
      {
        "id": "left_panel",
        "title": "戦略候補",
        "widgets": [
          "CONCERN.strategyCandidates"
        ]
      },
      {
        "id": "right_panel",
        "title": "詳細調整",
        "widgets": [
          "STRATEGY.tradeoffs",
          "CONCERN.constraints"
        ]
      }
    ]
  }
}
```

**レンダリング結果:**
```
┌─────────────────┬─────────────────┐
│ 戦略候補         │ 詳細調整         │
│                 │                 │
│ ○ 情報整理       │ [スライダー]     │
│ ○ 具体行動       │   速度 ─●─ 質   │
│ ○ 計画・戦略     │                 │
│                 │ [制約チップ]     │
│                 │ ☑ 時間30分のみ   │
└─────────────────┴─────────────────┘
```

---

## 5. 再生成ポリシー（RegenerationPolicy）

planステージのみ使用

```typescript
interface RegenerationPolicy {
  debounceMs: number;  // 連続操作時の遅延（デフォルト300ms）
  triggers: RegenerationTrigger[];
}

interface RegenerationTrigger {
  source: string;  // entityPath
  action: "change" | "toggle" | "slide";
  regenerateTarget: string[];  // 再生成対象のentityPath
}
```

**例: トレードオフスライダー操作で戦略候補を再生成**
```json
{
  "regenerationPolicy": {
    "debounceMs": 300,
    "triggers": [
      {
        "source": "STRATEGY.tradeoffs",
        "action": "slide",
        "regenerateTarget": ["CONCERN.strategyCandidates"]
      },
      {
        "source": "CONCERN.constraints",
        "action": "toggle",
        "regenerateTarget": ["CONCERN.strategyCandidates", "STRATEGY.next3Steps"]
      }
    ]
  }
}
```

**動作:**
1. ユーザーがスライダーを動かす
2. 300ms待機（連続操作中は再生成しない）
3. 操作が止まったら、LLMに再生成リクエスト
4. 新しい`strategyCandidates`を取得してUI更新

---

## 6. ステージ別UISpec生成パターン

### 6.1 capture（限定的動的）

**固定部分:** レイアウト、主要ウィジェット
**動的部分:** 質問内容のみ

```json
{
  "version": "1.0",
  "schemaRef": "schema_abc123",
  "stage": "capture",
  
  "mappings": {
    "CONCERN.concernText": {
      "render": "paragraph",
      "editable": true,
      "placeholder": "今気になっていることを自由に書いてください",
      "displayOrder": 1
    },
    "CONCERN.clarificationQuestions": {
      "render": "expanded",
      "editable": true,
      "item": {
        "render": "radio",
        "thumbnail": ["text"]
      },
      "displayOrder": 2
    }
  },
  
  "layout": {
    "type": "singleColumn"
  }
}
```

**LLMの役割:** 質問項目の`mappings`調整のみ

---

### 6.2 plan（フル動的）🌟

**動的部分:** レイアウト、ウィジェット種類、再生成ルール

```json
{
  "version": "1.0",
  "schemaRef": "schema_def456",
  "stage": "plan",
  
  "mappings": {
    "CONCERN.strategyCandidates": {
      "render": "expanded",
      "editable": true,
      "item": {
        "render": "custom",
        "component": "strategy_preview_picker",
        "thumbnail": ["approach", "next3Steps", "estimate"]
      }
    },
    "STRATEGY.tradeoffs": {
      "render": "custom",
      "component": "tradeoff_slider",
      "props": {
        "axes": ["speed", "quality"],
        "labels": { "speed": "速度優先", "quality": "質優先" }
      }
    },
    "CONCERN.constraints": {
      "render": "custom",
      "component": "counterfactual_toggles",
      "props": {
        "chips": ["時間30分のみ", "締切未確定", "集中度低"]
      }
    }
  },
  
  "layout": {
    "type": "twoColumn",
    "sections": [
      {
        "id": "strategies",
        "title": "戦略を選ぶ",
        "widgets": ["CONCERN.strategyCandidates"]
      },
      {
        "id": "adjustments",
        "title": "条件を調整",
        "widgets": ["STRATEGY.tradeoffs", "CONCERN.constraints"]
      }
    ]
  },
  
  "regenerationPolicy": {
    "debounceMs": 300,
    "triggers": [
      {
        "source": "STRATEGY.tradeoffs",
        "action": "slide",
        "regenerateTarget": ["CONCERN.strategyCandidates"]
      }
    ]
  }
}
```

**LLMの役割:** 関心事に最適なUI構成を自由設計

---

### 6.3 breakdown（ほぼ固定）

**固定部分:** 全体構造
**調整部分:** 表示順序のみ

```json
{
  "version": "1.0",
  "schemaRef": "schema_ghi789",
  "stage": "breakdown",
  
  "mappings": {
    "CONCERN.actionSteps": {
      "render": "expanded",
      "editable": true,
      "reorderable": true,
      "item": {
        "render": "shortText",
        "thumbnail": ["title", "duration", "priority"]
      }
    },
    "ACTION.title": {
      "render": "shortText",
      "editable": true
    },
    "ACTION.duration": {
      "render": "number",
      "editable": true
    },
    "ACTION.priority": {
      "render": "number",
      "editable": false
    }
  },
  
  "layout": {
    "type": "twoColumn",
    "sections": [
      {
        "id": "actions",
        "title": "具体的なタスク",
        "widgets": ["CONCERN.actionSteps"]
      },
      {
        "id": "summary",
        "title": "全体サマリー",
        "widgets": ["CONCERN.totalEstimate"]
      }
    ]
  }
}
```

**LLMの役割:** 最小限（displayOrderの調整程度）

---

## 7. Rule-based Renderingへのマッピング

### 7.1 React Component対応表

| UISpec `render` | React Component | Props |
|----------------|-----------------|-------|
| `paragraph` | `<TextAreaWidget>` | `value`, `editable`, `placeholder`, `onChange` |
| `shortText` | `<InputWidget>` | `value`, `editable`, `placeholder`, `onChange` |
| `number` | `<NumberInputWidget>` | `value`, `editable`, `min`, `max`, `onChange` |
| `radio` | `<RadioGroupWidget>` | `options`, `selected`, `onChange` |
| `category` | `<CategoryPickerWidget>` | `categories`, `selected`, `editable`, `onChange` |
| `expanded` | `<ListWidget>` | `items`, `itemRender`, `reorderable`, `onReorder` |
| `summary` | `<SummaryListWidget>` | `items`, `summary`, `collapsed`, `onToggle` |
| `link` | `<EntityLinkWidget>` | `entityId`, `thumbnail`, `onClick` |
| `custom` | `<DynamicWidget>` | `component`, `props` |

### 7.2 レンダリングアルゴリズム

```typescript
function renderUISpec(uiSpec: UISpecDSL, dataSchema: DataSchemaDSL): React.ReactElement {
  const rootEntity = dataSchema.entities[dataSchema.task];
  
  return (
    <Layout type={uiSpec.layout.type}>
      {uiSpec.layout.sections.map(section => (
        <Section key={section.id} title={section.title}>
          {section.widgets.map(entityPath => {
            const renderSpec = uiSpec.mappings[entityPath];
            const Component = getComponentForRender(renderSpec.render);
            const data = getDataForPath(entityPath, rootEntity);
            
            return <Component key={entityPath} spec={renderSpec} data={data} />;
          })}
        </Section>
      ))}
    </Layout>
  );
}
```

---

## 8. 検証ルール

生成されたUISpecは以下を満たす必要があります:
- [ ] `version: "1.0"`が存在
- [ ] `schemaRef`が有効なDataSchemaDSLを参照
- [ ] 全`mappings`キーがDataSchema内の有効なentityPath
- [ ] `render`値がサポートされているタイプ
- [ ] `category`時に`categories`配列が存在
- [ ] `summary`時に`summary.derived`が存在
- [ ] `custom`時に`component`名がサポートリストに存在

---

## 9. 今後の拡張予定

### 9.1 短期（Phase 2）
- アニメーション仕様の追加
- バリデーションルールの追加（入力制約）
- アクセシビリティ属性の追加

### 9.2 中長期（Phase 3以降）
- 条件付きレンダリング（if/else）
- 動的スタイリング（テーマ切替）
- 高度なカスタムウィジェット（グラフ、タイムライン等）

---

## 10. 参考資料

- [Jelly: Generative and Malleable User Interfaces (CHI 2025)](https://arxiv.org/html/2503.04084v1)
- DataSchemaDSL v1.0 仕様書（データ構造定義）
- TaskRecommendationDSL v1.0 仕様書（ホーム推奨用の別系統）
- Component Mapping Guide（実装時のReact対応表）

---

**文書バージョン:** 1.0  
**最終更新:** 2025年10月12日  
**ステータス:** 確定（実装開始可能）

