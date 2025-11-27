# DataSchemaDSL v1.0 言語仕様書
**思考整理タスク特化型データモデル記述言語**

---

## 1. 概要

### 1.1 目的
DataSchemaDSLは、「頭の棚卸しノート」アプリにおいて、ユーザーの関心事に応じた**思考整理のデータ構造**をLLMが動的に生成するための記述言語です。

### 1.2 Jellyとの関係
本DSLは、CHI 2025 Jellyシステムの「Object-Relational Schema」を思考整理タスクに特化して簡略化したものです。

**主な差異:**
| 要素 | Jelly (汎用) | このアプリ (思考整理特化) |
|------|-------------|----------------------|
| 対象タスク | あらゆる情報タスク | 思考整理・タスク分解のみ |
| DICT型 | 使用（栄養成分表など） | **不使用**（全てEntityで表現） |
| PNTR型 | 頻繁に使用 | **限定使用**（ACTION依存のみ） |
| 依存関係 | Update + Validate | **Updateのみ**（Validateは将来） |
| 複雑度 | 高（任意のEntity構造） | 低（3パターンの定型構造） |

参考文献: [Cao et al., CHI 2025](https://arxiv.org/html/2503.04084v1)

---

## 2. 基本構造

### 2.1 最上位構造

```typescript
interface DataSchemaDSL {
  version: "1.0";
  generatedAt: string;  // ISO 8601
  generationId: string;  // UUID
  
  task: "CONCERN";  // ルートエンティティ名（固定）
  stage: "capture" | "plan" | "breakdown";
  
  entities: {
    CONCERN: ConcernEntity;  // 必須
    QUESTION?: QuestionEntity;  // captureで使用
    STRATEGY?: StrategyEntity;  // planで使用
    ACTION?: ActionEntity;  // breakdownで使用
  };
  
  dependencies: Dependency[];  // Entity/属性間の制約・自動更新
}
```

---

## 3. エンティティ定義

### 3.1 CONCERN（ルートエンティティ）

**役割:** 関心事全体の情報を保持するルートオブジェクト

```typescript
interface ConcernEntity {
  // 固定属性（全ステージ共通）
  id: AttributeSpec;  // { type: "string", function: "privateIdentifier" }
  concernText: AttributeSpec;  // { type: "string", function: "publicIdentifier" }
  category: AttributeSpec;  // { type: "string", function: "display" }
  urgency: AttributeSpec;  // { type: "number", function: "display" }
  
  // 動的属性（ステージごとに変化）
  [dynamicAttributeName: string]: AttributeSpec;
}
```

**ステージ別の動的属性例:**
```typescript
// capture段階
CONCERN: {
  // ... 固定属性
  clarificationQuestions: { type: "array", item: { type: "__QUESTION__" } };
}

// plan段階
CONCERN: {
  // ... 固定属性
  strategyCandidates: { type: "array", item: { type: "__STRATEGY__" } };
  selectedStrategy: { type: "__STRATEGY__" };  // PNTR
}

// breakdown段階
CONCERN: {
  // ... 固定属性
  actionSteps: { type: "array", item: { type: "__ACTION__" } };
  totalEstimate: { type: "number" };  // 依存関係で自動計算
}
```

---

### 3.2 QUESTION（問診エンティティ）

**使用ステージ:** capture（限定的動的）

**役割:** 関心事を掘り下げるための質問項目

```typescript
interface QuestionEntity {
  id: { type: "string", function: "privateIdentifier" };
  text: { type: "string", function: "publicIdentifier" };
  answerType: { type: "string", function: "display" };  // "choice" | "scale" | "text"
  
  // answerType="choice"の場合のみ
  choices?: { type: "array", item: { type: "string" } };
  
  // answerType="scale"の場合のみ
  scaleRange?: { type: "DICT" };  // { min: 1, max: 5, labels: ["低", "高"] }
}
```

**生成例（卒業研究）:**
```json
{
  "QUESTION": {
    "id": { "type": "string", "function": "privateIdentifier" },
    "text": { "type": "string", "function": "publicIdentifier" },
    "answerType": { "type": "string", "function": "display" },
    "choices": {
      "type": "array",
      "item": { "type": "string" }
    }
  }
}

// 実際のデータ例
[
  {
    "id": "q1",
    "text": "現在どの段階ですか？",
    "answerType": "choice",
    "choices": ["テーマ決め", "文献調査", "実験中", "論文執筆"]
  },
  {
    "id": "q2",
    "text": "指導教員との関係は？",
    "answerType": "scale",
    "scaleRange": { "min": 1, "max": 5, "labels": ["困難", "良好"] }
  }
]
```

---

### 3.3 STRATEGY（戦略エンティティ）

**使用ステージ:** plan（フル動的）

**役割:** 取り組み方針の候補

```typescript
interface StrategyEntity {
  id: { type: "string", function: "privateIdentifier" };
  approach: { type: "string", function: "publicIdentifier" };  // "情報整理" | "具体行動" | "計画・戦略"
  
  // planで動的生成される属性
  next3Steps: { type: "array", item: { type: "string" } };
  estimate: { type: "number" };  // 分単位
  expectedGain: { type: "string" };  // 期待効果の説明
  
  // トレードオフ指標（カスタムウィジェット用）
  tradeoffs: { type: "DICT" };  // { speed: 0.8, quality: 0.6, effort: 0.4 }
}
```

**生成例（卒業研究×情報整理アプローチ）:**
```json
{
  "id": "strat_1",
  "approach": "情報整理",
  "next3Steps": [
    "関連論文5本をピックアップ",
    "各論文の要点を1枚にまとめる",
    "研究の全体マップを作成"
  ],
  "estimate": 240,
  "expectedGain": "研究の全体像が明確になり、次に進むべき方向が見える",
  "tradeoffs": { "speed": 0.6, "quality": 0.9, "effort": 0.7 }
}
```

---

### 3.4 ACTION（アクションエンティティ）

**使用ステージ:** breakdown（ほぼ固定）

**役割:** 具体的な実行可能タスク

```typescript
interface ActionEntity {
  id: { type: "string", function: "privateIdentifier" };
  title: { type: "string", function: "publicIdentifier" };
  duration: { type: "number" };  // 分単位
  priority: { type: "number" };  // 依存関係で自動計算
  
  // PNTR: 他のACTIONへの依存（唯一のPNTR使用箇所）
  dependencies: { type: "array", item: { type: "__ACTION__" } };
  
  // ホーム推奨で使用される追加属性
  importance: { type: "number" };  // 0-1
  urgency: { type: "number" };  // 0-1
  due_in_hours: { type: "number" };
  estimate_min_chunk: { type: "number" };  // マイクロステップの最小単位（分）
}
```

**PNTR使用例:**
```json
{
  "ACTION": {
    "id": { "type": "string", "function": "privateIdentifier" },
    "title": { "type": "string", "function": "publicIdentifier" },
    "dependencies": {
      "type": "array",
      "item": { "type": "__ACTION__", "thumbnail": ["title"] }
    }
  }
}

// 実際のデータ
[
  { "id": "act_1", "title": "論文5本をピックアップ", "dependencies": [] },
  { "id": "act_2", "title": "各論文の要点をまとめる", "dependencies": ["act_1"] },
  { "id": "act_3", "title": "研究マップ作成", "dependencies": ["act_2"] }
]
```

---

## 4. 属性型（Attribute Types）

### 4.1 基本型（SVAL: Singular Value）

| 型 | 説明 | 使用例 |
|---|------|-------|
| `string` | 文字列 | `concernText`, `approach` |
| `number` | 数値 | `urgency`, `duration`, `priority` |

**Jellyとの差異:** `time`, `location`, `url` は使用しない（思考整理に不要）

---

### 4.2 配列型（ARRY: Array）

```typescript
interface ArrayAttribute {
  type: "array";
  item: {
    type: "string" | "number" | "__ENTITY_NAME__";
    thumbnail?: string[];  // Entity参照時のみ
  };
}
```

**例:**
```json
// 文字列の配列
"choices": {
  "type": "array",
  "item": { "type": "string" }
}

// Entity参照の配列
"actionSteps": {
  "type": "array",
  "item": { "type": "__ACTION__", "thumbnail": ["title", "duration"] }
}
```

---

### 4.3 ポインタ型（PNTR: Pointer）

**使用箇所:** ACTION間の依存関係のみ

```typescript
interface PointerAttribute {
  type: "__ENTITY_NAME__";
  thumbnail: string[];  // 参照先の表示属性
}
```

**なぜ限定使用か:**
- 思考整理タスクは基本的に階層構造（親子関係）が中心
- 横断的な参照はACTION依存のみで十分
- 過度な参照は認知負荷を高める

---

### 4.4 辞書型（DICT: Dictionary）

**使用方針:** 原則不使用

**理由:**
- Jellyでは栄養成分表（{calories: 200, protein: 10}）などで使用
- 思考整理タスクではキーバリューペアの動的生成が不要
- 構造化データは全てEntityで表現可能

**例外:** `tradeoffs`（トレードオフ指標）のみDICT使用
```json
"tradeoffs": {
  "type": "DICT",
  "keys": ["speed", "quality", "effort"],
  "valueType": "number"
}
```

---

## 5. 依存関係（Dependencies）

### 5.1 依存関係の構造

```typescript
interface Dependency {
  source: string;  // "ENTITY.attribute" 形式
  target: string;  // "ENTITY.attribute" 形式
  mechanism: "Update";  // Validateは将来拡張
  relationship: string | CodeSnippet;
}
```

### 5.2 Update（自動更新）

**使用例1: 集計計算**
```json
{
  "source": "ACTION.duration",
  "target": "CONCERN.totalEstimate",
  "mechanism": "Update",
  "relationship": "SUM(ACTION.duration)"
}
```

**使用例2: LLMベース更新**
```json
{
  "source": "STRATEGY.approach",
  "target": "CONCERN.actionSteps",
  "mechanism": "Update",
  "relationship": "LLM generates appropriate action steps based on selected strategy"
}
```

### 5.3 Validate（将来拡張）

現在は実装しないが、将来的に以下を追加予定:
```json
{
  "source": "ACTION.dependencies",
  "target": "ACTION.priority",
  "mechanism": "Validate",
  "relationship": "Cannot start if dependencies not completed"
}
```

---

## 6. ステージ別Schema生成パターン

### 6.1 capture（限定的動的）

**固定部分:** CONCERN, QUESTION構造
**動的部分:** 質問内容（text, choices）

```json
{
  "version": "1.0",
  "stage": "capture",
  "task": "CONCERN",
  "entities": {
    "CONCERN": {
      "id": { "type": "string", "function": "privateIdentifier" },
      "concernText": { "type": "string", "function": "publicIdentifier" },
      "category": { "type": "string", "function": "display" },
      "clarificationQuestions": {
        "type": "array",
        "item": { "type": "__QUESTION__" }
      }
    },
    "QUESTION": {
      "id": { "type": "string", "function": "privateIdentifier" },
      "text": { "type": "string", "function": "publicIdentifier" },
      "answerType": { "type": "string", "function": "display" },
      "choices": { "type": "array", "item": { "type": "string" } }
    }
  },
  "dependencies": []
}
```

**LLMの役割:** 質問内容・選択肢を関心事に応じて生成

---

### 6.2 plan（フル動的）🌟

**動的部分:** Entity構造全体、属性、依存関係

```json
{
  "version": "1.0",
  "stage": "plan",
  "task": "CONCERN",
  "entities": {
    "CONCERN": {
      "id": { "type": "string", "function": "privateIdentifier" },
      "concernText": { "type": "string", "function": "publicIdentifier" },
      "strategyCandidates": {
        "type": "array",
        "item": { "type": "__STRATEGY__" }
      },
      "selectedStrategy": { "type": "__STRATEGY__", "thumbnail": ["approach"] }
    },
    "STRATEGY": {
      "id": { "type": "string", "function": "privateIdentifier" },
      "approach": { "type": "string", "function": "publicIdentifier" },
      "next3Steps": { "type": "array", "item": { "type": "string" } },
      "estimate": { "type": "number", "function": "display" },
      "expectedGain": { "type": "string", "function": "display" },
      "tradeoffs": { "type": "DICT", "keys": ["speed", "quality", "effort"] }
    }
  },
  "dependencies": [
    {
      "source": "CONCERN.selectedStrategy",
      "target": "CONCERN.actionSteps",
      "mechanism": "Update",
      "relationship": "Generate actionSteps from strategy.next3Steps"
    }
  ]
}
```

**LLMの役割:** 関心事に応じて最適なEntity構造・属性・依存関係を自由設計

---

### 6.3 breakdown（ほぼ固定）

**固定部分:** 全体構造
**調整部分:** ACTION数・内容

```json
{
  "version": "1.0",
  "stage": "breakdown",
  "task": "CONCERN",
  "entities": {
    "CONCERN": {
      "id": { "type": "string", "function": "privateIdentifier" },
      "concernText": { "type": "string", "function": "publicIdentifier" },
      "actionSteps": {
        "type": "array",
        "item": { "type": "__ACTION__" }
      },
      "totalEstimate": { "type": "number", "function": "display" }
    },
    "ACTION": {
      "id": { "type": "string", "function": "privateIdentifier" },
      "title": { "type": "string", "function": "publicIdentifier" },
      "duration": { "type": "number", "function": "display" },
      "priority": { "type": "number", "function": "display" },
      "dependencies": { "type": "array", "item": { "type": "__ACTION__", "thumbnail": ["title"] } }
    }
  },
  "dependencies": [
    {
      "source": "ACTION.duration",
      "target": "CONCERN.totalEstimate",
      "mechanism": "Update",
      "relationship": "SUM(ACTION.duration)"
    }
  ]
}
```

**LLMの役割:** planで決まった方針に基づき、定型的にACTIONを生成

---

## 7. 実装ガイドライン

### 7.1 Schema生成プロンプト構造

```typescript
interface SchemaGenerationPrompt {
  systemPrompt: string;  // DataSchemaDSL v1.0仕様の説明
  userInput: {
    stage: "capture" | "plan" | "breakdown";
    concernText: string;
    category: string;
    previousSchema?: DataSchemaDSL;  // plan/breakdownの場合
  };
  constraints: {
    maxEntities: number;  // capture:2, plan:5, breakdown:2
    maxAttributesPerEntity: number;  // 10
    requiredEntities: string[];  // ["CONCERN"]
  };
}
```

### 7.2 検証ルール

生成されたSchemaは以下を満たす必要があります:
- [ ] `version: "1.0"`が存在
- [ ] `task: "CONCERN"`が存在
- [ ] `entities.CONCERN`が存在
- [ ] 全属性に`type`と`function`が指定
- [ ] PNTR型はACTION.dependenciesのみ
- [ ] 循環依存なし（dependencies検証）

---

## 8. 今後の拡張予定

### 8.1 短期（Phase 2）
- Validate機構の追加（制約チェック）
- より複雑な依存関係（多対多）

### 8.2 中長期（Phase 3以降）
- ユーザー固有のEntity定義（カスタムEntity）
- 外部データソース統合（Calendar Entity等）
- Entity間の複雑なリレーション（多対多、自己参照）

---

## 9. 参考資料

- [Jelly: Generative and Malleable User Interfaces (CHI 2025)](https://arxiv.org/html/2503.04084v1)
- UISpecDSL v1.0 仕様書（本DSLと組み合わせて使用）
- TaskRecommendationDSL v1.0 仕様書（ホーム推奨用の別系統）

---

**文書バージョン:** 1.0  
**最終更新:** 2025年10月12日  
**ステータス:** 確定（実装開始可能）

