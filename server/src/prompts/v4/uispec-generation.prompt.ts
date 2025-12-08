/**
 * UISpec Generation Prompt Template (Stage 3)
 *
 * 3段階LLM呼び出しの第3段階：UISpec + ReactiveBinding生成のプロンプト
 *
 * @see specs/dsl-design/v4/DSL-Spec-v4.0.md
 * @since DSL v4.0
 */

export const UISPEC_GENERATION_PROMPT = `
あなたはCBTベースの思考整理アプリのUISpec生成AIです。
ORS（データ構造）と選定Widgetに基づいて、UISpec（画面仕様）を生成してください。

## ORS（データ構造）
{{ors}}

## 選定されたWidget情報
{{stageSelection}}

## 現在のステージ
{{stage}}

## Widget定義情報
{{widgetDefinitions}}

## Reactivityモード
{{enableReactivity}}

## タスク
以下を生成してください：

### 1. WidgetSpecの定義
各Widgetの具体的な仕様を定義します。

**必須フィールド**:
- **id**: UISpec内で一意のWidget ID（例: "brainstorm_0", "card_sorting_1"）
- **component**: Widget種別（選定されたwidgetIdと一致）
- **position**: 表示順序（0から開始）
- **config**: Widget固有の設定
- **dataBindings**: ORSとのデータ連携

### 2. DataBindingの定義
WidgetのPortとORSのEntity.Attributeを対応付けます。

**バインディング方向**:
- **in**: ORSからWidgetへの入力（Widget初期化時）
- **out**: WidgetからORSへの出力（Widget操作時）
- **inout**: 双方向バインディング

### 3. ReactiveBindingの定義（Reactivity有効時）
Widget間のリアクティブなUI連携を定義します。

**メカニズム**:
- **update**: ソースの変更時にターゲットの値を更新
- **validate**: ソースの変更時にターゲットの値を検証

**関係仕様タイプ**:
- **passthrough**: 値をそのまま渡す
- **javascript**: JavaScript式による変換
- **transform**: 変換式による処理
- **llm**: LLMによる処理

**更新モード**:
- **realtime**: 即座に反映
- **debounced**: 遅延後に反映（連続入力の最適化）
- **on_confirm**: ユーザー確認後に反映

### 4. レイアウト設定
画面全体のレイアウトを定義します。

### 5. コンテンツ生成（generatedValue）【必須タスク】
Widget定義に**generationHints**がある場合、ユーザーの悩みに関連するコンテンツを動的に生成してconfig内に**必ず**配置してください。

**確認手順**:
1. Widget定義情報を確認し、generationHintsフィールドを持つWidgetを特定する
2. 該当Widgetのconfigに、generationHints.samples.fieldで指定されたキー（例: "sampleCards"）を追加する
3. ユーザーの悩みに関連した具体的なサンプルを生成する

**Type B: サンプルデータ（samples）**
generationHints.samplesが定義されている場合:
- fieldで指定されたキー（例: "sampleCards"）にGeneratedContentContainerを配置
- instructionに従い、countで指定された範囲の数のアイテムを生成
- 各アイテムには必ず**isGenerated: true**を付与
- コンテナにも**isGenerated: true**を付与

**生成例: BrainstormCards**
ユーザーの悩み: 「転職するか迷っている」

\`\`\`json
{
  "id": "brainstorm_0",
  "component": "brainstorm_cards",
  "config": {
    "title": "転職について考えてみましょう",
    "sampleCards": {
      "items": [
        { "id": "sample_1", "text": "現職で得られているもの・失うもの", "isGenerated": true },
        { "id": "sample_2", "text": "転職で実現したい理想の働き方", "isGenerated": true }
      ],
      "isGenerated": true
    }
  }
}
\`\`\`

**重要ルール**:
1. 生成内容はユーザーの**具体的な悩みの内容に関連**させる（一般的すぎる内容はNG）
2. サンプルは「考えるきっかけ」であり、**完成した答えではない**
3. **日本語で生成**する
4. **isGenerated: true**マーカーを必ず付与する
5. generationHintsがないWidgetには生成コンテンツを含めない

## 出力形式
以下のJSON形式で出力してください：

\`\`\`json
{
  "version": "4.0",
  "sessionId": "{{sessionId}}",
  "stage": "{{stage}}",
  "widgets": [
    {
      "id": "brainstorm_0",
      "component": "brainstorm_cards",
      "position": 0,
      "layout": "full",
      "config": {
        "title": "アイデアを出してみましょう",
        "placeholder": "思いついたことを書いてください",
        "minItems": 3,
        "maxItems": 10,
        "sampleCards": {
          "items": [
            { "id": "sample_1", "text": "現状の問題点を洗い出す", "isGenerated": true },
            { "id": "sample_2", "text": "理想の状態を具体的にイメージする", "isGenerated": true }
          ],
          "isGenerated": true
        }
      },
      "dataBindings": [
        {
          "portId": "input_items",
          "entityAttribute": "diverge_data.items",
          "direction": "in"
        },
        {
          "portId": "output_items",
          "entityAttribute": "brainstorm_widget.output_items",
          "direction": "out"
        }
      ],
      "metadata": {
        "purpose": "悩みに関連するアイデアを発散的に出す"
      }
    },
    {
      "id": "emotion_palette_1",
      "component": "emotion_palette",
      "position": 1,
      "layout": "half",
      "config": {
        "emotionSet": "basic",
        "multiSelect": true
      },
      "dataBindings": [
        {
          "portId": "selected_emotions",
          "entityAttribute": "emotion_widget.emotions",
          "direction": "out"
        }
      ],
      "metadata": {
        "purpose": "アイデアに対する感情を可視化"
      }
    }
  ],
  "reactiveBindings": {
    "bindings": [
      {
        "id": "binding_brainstorm_to_emotion",
        "source": "brainstorm_0.output_items",
        "target": "emotion_palette_1.context_items",
        "mechanism": "update",
        "relationship": {
          "type": "passthrough"
        },
        "updateMode": "debounced",
        "debounceMs": 500,
        "description": "ブレインストームの結果を感情パレットに連携",
        "enabled": true
      }
    ],
    "metadata": {
      "version": "4.0",
      "generatedAt": ${Date.now()}
    }
  },
  "layout": {
    "type": "single_column",
    "gap": 16,
    "padding": {
      "top": 16,
      "right": 16,
      "bottom": 16,
      "left": 16
    }
  },
  "metadata": {
    "generatedAt": ${Date.now()},
    "llmModel": "gemini-2.5-flash-lite"
  }
}
\`\`\`

## 重要な注意点

### generatedValue（必須）
**generationHintsを持つWidgetには必ずサンプルコンテンツを生成してください。**

1. Widget定義情報の中で**generationHints**フィールドがあるWidgetを確認してください
2. generationHints.samplesがある場合、**config内にsampleCardsフィールドを必ず追加**してください
3. サンプル内容は**ユーザーの具体的な悩み**（ORS内のconcern.textまたは文脈から推測）に関連させてください
4. 各アイテムと親コンテナに**isGenerated: true**を必ず付与してください

**例**: brainstorm_cardsにgenerationHints.samplesがある場合:
\`\`\`json
"config": {
  "title": "...",
  "sampleCards": {
    "items": [
      { "id": "sample_1", "text": "【悩みに関連する具体的なアイデア】", "isGenerated": true },
      { "id": "sample_2", "text": "【悩みに関連する具体的なアイデア】", "isGenerated": true }
    ],
    "isGenerated": true
  }
}
\`\`\`

### DataBinding
1. 各WidgetのポートIDはWidget定義のports.inputs/outputsを参照してください
2. entityAttributeは「entityId.attributeName」形式でORSと一致させてください
3. required=trueの入力ポートには必ずdirectionが'in'または'inout'のバインディングを定義してください

### ReactiveBinding（Reactivity有効時のみ）
1. source/targetは「widgetId.portId」形式で指定してください
2. complexityの高いWidget（0.4以上）をターゲットにする場合はdebounced/on_confirmを検討してください
3. 同一ソースから複数ターゲットへのバインディングは可能ですが、循環参照は避けてください
4. 前後のWidget間でデータを連携する場合はpassthroughが基本です
5. データ変換が必要な場合はjavascript関係を使用してください

### レイアウト
1. Widget数が少ない（2つ以下）場合は'single_column'を推奨
2. 関連性の高いWidgetは近い位置に配置してください
3. 主要なWidgetは'full'レイアウト、補助的なWidgetは'half'/'third'を検討してください
`;

export default UISPEC_GENERATION_PROMPT;
