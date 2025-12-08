/**
 * ORS Generation Prompt Template (Stage 2)
 *
 * 3段階LLM呼び出しの第2段階：ORS + DependencyGraph生成のプロンプト
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

export const ORS_GENERATION_PROMPT = `
あなたはCBTベースの思考整理アプリのORS生成AIです。
選定されたWidgetと悩みに基づいて、データ構造（ORS）を生成してください。

## ユーザーの悩み
{{concernText}}

## 現在のステージ
{{stage}}

## ステージの目的
{{stagePurpose}}

## ステージの対象
{{stageTarget}}

## 選定されたWidget
{{selectedWidgets}}

## Widget入出力ポート情報
{{widgetPortInfo}}

## 前ステージの結果
{{previousStageResult}}

## タスク
以下のデータ構造を生成してください：

### 1. Entityの定義
各Widgetが必要とするデータをEntity（データオブジェクト）として定義します。

**Entityの種類**:
- **concern**: ユーザーの元の悩みテキスト（必須）
- **stage_data**: このステージ固有のデータ（前ステージからの引き継ぎを含む）
- **widget_data**: Widget固有の入出力データ
- **shared_data**: Widget間で共有されるデータ

### 2. Attributeの定義
各Entityの属性（プロパティ）を定義します。

**構造型（structuralType）**:
- **SVAL**: スカラー値（単一の文字列、数値、真偽値など）
- **ARRY**: 配列（リスト形式のデータ）
- **PNTR**: ポインタ（他のEntity.Attributeへの参照）
- **DICT**: 辞書（キー・バリューペア）

**具体型（valueType）**: string, number, boolean, date, object

### 3. GenerationSpecの定義（オプション）
LLMによって生成される値の仕様を定義します。

**生成タイプ**:
- **label**: UIの「枠」を埋めるラベル・説明文
- **sample**: ユーザー入力の叩き台となるサンプルデータ

### 4. DependencyGraphの定義
Entity.Attribute間のデータ依存関係を定義します。

**メカニズム**:
- **validate**: ソースの変更時にターゲットの値を検証
- **update**: ソースの変更時にターゲットの値を更新

**関係仕様タイプ**:
- **javascript**: JavaScript式による変換/検証
- **transform**: 変換式
- **llm**: LLMによる処理

## 出力形式
以下のJSON形式で出力してください：

\`\`\`json
{
  "version": "4.0",
  "entities": [
    {
      "id": "concern",
      "type": "concern",
      "attributes": [
        {
          "name": "text",
          "structuralType": "SVAL",
          "valueType": "string",
          "description": "ユーザーの元の悩みテキスト"
        }
      ]
    },
    {
      "id": "diverge_data",
      "type": "stage_data",
      "attributes": [
        {
          "name": "items",
          "structuralType": "ARRY",
          "itemType": "SVAL",
          "itemValueType": "string",
          "description": "発散フェーズで出たアイデアのリスト",
          "generation": {
            "type": "sample",
            "prompt": "ユーザーの悩みに関連するアイデアを5つ生成",
            "context": ["concern.text"]
          }
        }
      ]
    },
    {
      "id": "brainstorm_widget",
      "type": "widget_data",
      "attributes": [
        {
          "name": "input_items",
          "structuralType": "ARRY",
          "itemType": "SVAL",
          "itemValueType": "string",
          "description": "ブレインストームの初期アイテム"
        },
        {
          "name": "output_items",
          "structuralType": "ARRY",
          "itemType": "SVAL",
          "itemValueType": "string",
          "description": "ユーザーが追加・編集したアイテム"
        }
      ]
    }
  ],
  "dependencyGraph": {
    "dependencies": [
      {
        "id": "dep_concern_to_brainstorm",
        "source": "diverge_data.items",
        "target": "brainstorm_widget.input_items",
        "mechanism": "update",
        "relationship": {
          "type": "javascript",
          "javascript": "source"
        }
      }
    ],
    "metadata": {
      "version": "4.0",
      "generatedAt": ${Date.now()}
    }
  },
  "metadata": {
    "generatedAt": ${Date.now()},
    "llmModel": "gemini-2.5-flash-lite",
    "sessionId": "{{sessionId}}",
    "stage": "{{stage}}"
  }
}
\`\`\`

## 重要な注意点
1. Widget入出力ポート情報を参照し、各WidgetのポートIDと型に合致する属性を定義してください
2. required=trueの入力ポートには必ず対応するEntity.Attributeを用意してください
3. 前ステージの結果がある場合は、それを引き継ぐEntity/Attributeを定義してください
4. generationを使用する場合は、contextに参照するEntity.Attributeを明記してください
`;

export default ORS_GENERATION_PROMPT;
