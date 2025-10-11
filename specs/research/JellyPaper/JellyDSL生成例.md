# JellyDSL生成例

承知いたしました。Generative and Malleable User Interfaces (GMUI) のプロトタイプシステム「Jelly」において、ユーザーのプロンプトから生成される主要な構造、すなわち**オブジェクト指向関係スキーマ**、**依存関係グラフ**、そして**UI仕様（DSL）**の具体的な生成結果の例を、ソースに基づき出力します。

これらの例は、特に「夕食会（Dinner Party）」の計画タスクと「週単位の食事計画（Weekly Meal Plan）」の例示から抽出されています。

---

## 1. オブジェクト指向関係スキーマの生成結果の例

オブジェクト指向関係スキーマは、タスクに必要なエンティティ、属性、および関係を構造化して記述します。

### 例 1: 初期プロンプト「友人と夕食会を開く予定です (I am hosting a dinner party with my friends!)」に基づくスキーマの初期構造

この初期プロンプトに基づき、LLMが生成するスキーマの一部（Taskオブジェクトと主要エンティティ）の概念的な構造です。

```json
{
  "DINNER_PARTY": { // Taskオブジェクト
    "date": "string",
    "time": "string",
    "host": "__USER__", // PNTR (ポインタ)
    "guest_list": "[__USER__]", // ARRY of PNTR
    "menu": "[__DISH__]", // ARRY of PNTR
    "activity": "[__ACTIVITY__]" // ARRY of PNTR
  },
  "DISH": { // Entity
    "name": "string",
    "cuisine_type": "string",
    "ingredients": "[string]" // ARRY of SVAL
  }
}
```

### 例 2: フォローアッププロンプト「食材をどこで買うべきですか (Where to buy all the ingredients?)」による進化

ユーザーがタスクのスコープを拡大すると、スキーマは動的に進化し、新しいエンティティ（`STORE`, `INGREDIENT`）が追加され、既存のエンティティに新しい関係（PNTR）が設定されます。

**DINNER_PARTY オブジェクトへの追加:**

```json
"DINNER_PARTY": {
  // ... (既存の属性)
  "shopping_plan": {
    "stores": "[__STORE__]", // ARRY of PNTR
    "items": "[__INGREDIENT__]" // ARRY of PNTR
  }
},
"STORE": { // 新しいEntity
  "name": "string",
  "address": "string"
},
"INGREDIENT": { // 新しいEntity
  // ... (属性)
}
```

### 例 3: 週単位の食事計画のエンティティと属性の型（Figure 3より）

| オブジェクト | 属性名 | 型 | 説明 |
|------------|--------|----|----- |
| **WEEKLY_MEAL_PLAN (Task)** | `start_date` | SVAL (`string`) | タスク全体の開始日 |
| | `daily_meal_plans` | ARRY (`[__DAILY_MEAL_PLAN__]`) | DAILY_MEAL_PLANへの参照の配列 |
| **DAILY_MEAL_PLAN (Entity)** | `recipes` | ARRY (`[__RECIPE__]`) | RECIPEへの参照の配列 |
| | `total_calories` | SVAL (`number`) | 計算値 |
| **RECIPE (Entity)** | `nutrition_facts` | DICT | 栄養成分（カロリー、炭水化物など）のキーバリューペア |
| **INGREDIENT (Entity)** | `store` | PNTR (`__STORE__`) | STOREエンティティへの参照 |

---

## 2. 依存関係グラフの生成結果の例

依存関係グラフは、エンティティや属性間の制約や自動更新のロジックを定義します。これは、`{Source, Target, Mechanism, Relationship}`の構造を取ります。

### 例 1: Update (更新) メカニズム

ソースの変更がターゲットに自動的に伝播する例。

| 要素 | 値/説明 |
|------|---------|
| **Source** | `INGREDIENT.quantity` (食材の量) |
| **Target** | `RECIPE.total_calories` (料理の総カロリー) |
| **Mechanism** | `Update` |
| **Relationship** | JavaScriptスニペット：食材の量とカロリー計算に基づき、総カロリーを自動更新するコード。 |

### 例 2: Validate (検証) メカニズム

制約が満たされていることを確認する例。

| 要素 | 値/説明 |
|------|---------|
| **Source** | `TRIP.check_in_date` (チェックイン日) |
| **Target** | `TRIP.check_out_date` (チェックアウト日) |
| **Mechanism** | `Validate` |
| **Relationship** | JavaScriptスニペット：チェックアウト日がチェックイン日より後であることを確認するコード。 |

---

## 3. UI仕様（DSL）の生成結果の例

UI仕様は、スキーマの各属性に付与される注釈（ラベル）として表現されます。これにより、UIコンポーネントの種類、表示方法、および編集可能性が定義されます。

### 例 1: WEEKLY_MEAL_PLANのTask属性の仕様（Figure 3およびAppendix Aより）

タスクの開始日 (`start_date`) の仕様は以下の通りです。

| キー | 値 | 説明 |
|------|----|----- |
| `type` | `"string"` | データ型 |
| `function` | `"display"` | UIに表示すべき属性 |
| `editable` | `true` | ユーザーによる編集が可能 |
| `render` | `"time"` | カレンダーウィジェットとしてレンダリングされる |

**【JSON抜粋 (Figure 3d1/Appendix A L4)】**

```json
date: { type: "string", editable: true , render: "date", function: "display" }
```

### 例 2: ARRY属性の仕様（コレクションのレンダリング）

`DINNER_PLAN`タスク内の`menu`属性（`__DISH__`の配列）の仕様は以下の通りです。この例では、配列が「要約（summary）」形式でレンダリングされ、合計カロリーを算出するロジックが含まれています。

| キー | 値 | 説明 |
|------|----|----- |
| `type` | `"array"` | 配列型 |
| `render` | `"summary"` | 最小化されたサマリーボタンとして表示される |
| `item` | `{...}` | 配列アイテムの型とサムネイル情報 |
| `summary` | `{...}` | サマリー導出ロジック |

**【JSON抜粋 (Appendix A L13-22)】**

```json
menu: {
  type: "array",
  editable: true ,
  render: "summary",
  summary: {
    name: "total_calories", // サマリーの名称
    derived: { operation: "SUM", field: "calories" } // caloriesフィールドを集計（SUM）
  },
  item: { type: "__DISH__", thumbnail: ["name", "calories"] } // DISHエンティティへのポインタとして、名前とカロリーをサムネイル表示
}
```

### 例 3: PNTR属性の仕様（ポインタのレンダリング）

PNTR属性は、参照先のエンティティを最小化した形で表示するための`thumbnail`属性を持ちます。

| キー | 値 | 説明 |
|------|----|----- |
| `type` | `"__STORE__"` | 参照先エンティティの型 |
| `function` | `"display"` | UIに表示すべき属性 |
| `thumbnail` | `["name"]` | 参照先エンティティ（`STORE`）の属性のうち、サムネイル（最小表示）で表示すべき属性（例：店舗名のみ） |

**【JSON抜粋 (Figure 3d3の概念)】**

```json
store: {
  function: "display",
  thumbnail: [ "name" ], // Storeエンティティの名前属性のみを表示
  editable: true
}
```

### 例 4: カテゴリを持つSVAL属性の仕様

`DISH`エンティティの`cuisine_type`属性は、定義済みカテゴリからの選択を可能にする`category`レンダリングタイプを使用します。

**【JSON抜粋 (Appendix A L40-46)】**

```json
cuisine_type: {
  type: "string",
  editable: true ,
  render: "category", // カテゴリ選択ウィジェットとしてレンダリング
  function: "display",
  categories: ["American", "Italian", "Chinese", "Japanese", "French"] // 選択肢リスト
}
```