# Jellyプロンプト例

*Exported on: 2025/10/11 20:03:25*

この論文のソースには、パイプラインの**各ステップでLLMに与えられる具体的なシステムプロンプトやFew-shotの例**は明示されていませんが、ユーザーがシステムに入力し、LLMの処理をトリガーする**ユーザープロンプト（初期およびフォローアップ）の具体的な例**が豊富に示されています。

LLMはこれらのユーザープロンプトを解析し、指定されたJSON応答フォーマットに従ってタスク駆動型データモデルやUI更新操作を生成するよう指示されています。

以下に、パイプラインの各呼び出しをトリガーするプロンプトの例を、その役割に応じて分類して出力します。

---

## 1. 初期プロンプト (Initial Prompt)

これは、システムにタスクを定義し、最初のタスク駆動型データモデル（オブジェクト関係スキーマ、依存関係グラフ、構造化データ）の生成を開始させるために使われるプロンプトです。

| プロンプトの例 | 役割 | 関連する生成結果 |
|---|---|---|
| **I am hosting a dinner party with my friends!** (友人たちと夕食会を開く予定です！) | 夕食会の計画タスク全体を定義する。 | `DINNER_PARTY` タスクオブジェクト、`DISH` エンティティ、ゲストリスト、メニューなどの初期スキーマ構造を生成する。 |
| **I want to plan a trip to Tokyo with my friends.** (友達と東京への旅行を計画したい) | 比較的詳細度の低い旅行計画タスクを定義する。 | 旅行先、期間、予定などの基本的なエンティティを生成する。 |
| **I want to plan a 7-day trip to Tokyo with my friends, for food and cultural experiences.** (友達と東京で7日間のグルメと文化体験旅行を計画したい) | 比較的詳細度の高い旅行計画タスクを定義する。 | より具体的な属性（例：食事関連のエンティティ、文化施設エンティティ）を生成する可能性が高い。 |
| **give me a weekly meal plan.** (週単位の食事計画を立てて) | 週単位の食事計画タスクを定義する。 | `WEEKLY_MEAL_PLAN` タスクオブジェクト、`RECIPE`、`INGREDIENT` などのエンティティを生成する。 |

## 2. フォローアッププロンプト (Follow-up Prompts)

これらは、タスクの進行に伴ってユーザーのニーズが変化した際に、UIやデータモデルを動的にカスタマイズ・進化させるために使用されるプロンプトです。これらのプロンプトは、LLMによって `Updater := {Target, Action, Specifications}` の形式の操作シーケンスに解析されます。

### 2.1. スキーマおよびデータ構造の変更を要求するプロンプト（Schema Modification）

エンティティや属性の追加、削除、更新などを要求します。

| プロンプトの例 | 意図される変更 (Action) | 関連する結果 |
|---|---|---|
| **Alice and I are both vegan.** (アリスと私はビーガンです) | スキーマ更新 (`Add`): ゲスト全員に「食事制限」属性を追加。データ更新 (`Update`): アリスとユーザーの制限に「ビーガン」を設定。 | 各料理に「食事の適合性」属性が追加され、制限に違反する料理にフラグが立てられる。 |
| **Sarah prefers gluten-free food.** (サラはグルテンフリーの食べ物が好きです) | データ更新 (`Update`) およびスキーマ更新 (`Update`): サラに対する食事制限属性を更新し、それに応じて UI を調整する。 |  |
| **Where to buy all the ingredients?** (食材をどこで買うべきですか？) | スキーマ追加 (`Add`): `SHOPPING_PLAN`、`STORE`、`INGREDIENT` のエンティティを追加する。 | 買い物リストパネルが生成され、地図ビューで店舗が表示される。 |
| **Add weather to the homepage.** (ホームページに天気を追加して) (P8) | スキーマ追加 (`Add`): ホームページ（Taskオブジェクト）に天気情報を表示するための属性を追加する。 |  |
| **I don't need to see the total budget.** (合計予算は見たくない) (P4) | スキーマ削除 (`Remove`): 予算表示属性を削除する。 |  |
| **Have different categories of activities in different rows - like food, history, museums, seasonal, etc.** (活動を食事、歴史、美術館、季節ものなど、別々の行にカテゴリ分けして) (P4) | スキーマ更新 (`Update` / `Add`): 複数のリスト構造の作成を試みる。 | (このプロンプトは、システムが意図した結果（リスト構造の作成）を生成できず失敗した例として挙げられている) |

### 2.2. データのみの操作を要求するプロンプト（Data Modification）

既存のスキーマ構造内でデータ要素の追加、削除、フィルタリングなどを要求します。

| プロンプトの例 | 意図される変更 (Action) | 説明 |
|---|---|---|
| **Delete trivia questions about The Great Gatsby** (グレート・ギャツビーに関するトリビアの質問を削除して) (P8) | データ削除 (`Remove`): 特定のデータインスタンス（アクティビティ）を削除する。 |  |
| **Can you update the quantity & type of furniture, and add justifications for each one?** (家具の量と種類を更新し、それぞれに根拠を追加できますか？) (P7) | データ更新 (`Update`) およびスキーマ追加 (`Add`): データと、データに付随する新しい属性（根拠）の両方の変更を要求する。 |  |

### 2.3. 詳細度の低いプロンプト（Underspecified / Unspecified Prompts）

これらのプロンプトは、LLMがコンテキストから意図を推論する必要があるプロンプトです。

| プロンプトの例 | 詳細度 | 意図される結果 |
|---|---|---|
| **Give me weather information.** (天気情報をください) (P6) | Underspecified (不足している) | 天気情報を取得・表示するためのスキーマ変更。 |
| **This is a solo trip by the way.** (ちなみにこれは一人旅です) (P4) | Unspecified (指定なし) | コンテキスト情報の提供のみ。スキーマの直接的な変更は示唆されていない。 |
| **What should I write about in my personal statement?** (志望理由書に何を書くべきですか？) (P5) | Unspecified (指定なし) | 戦略やガイダンスの提供（LLMが情報タスクのデータモデルを生成するための材料として使用）。 |
| **I want to go to the east coast - is there anything there?** (東海岸に行きたいのですが、何かありますか？) (P4) | Underspecified (不足している) | 東海岸の旅行先やアクティビティのリスト生成を要求していると推測される。 |
