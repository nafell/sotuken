/**
 * Plan Unified Prompt Templates (DSL v5.0)
 *
 * Planフェーズ全体（diverge/organize/converge）を1回のLLM呼び出しで生成するプロンプト
 *
 * @see specs/dsl-design/v5/DSL-Spec-v5.0.md
 * @since DSL v5.0
 */

// =============================================================================
// Plan統合ORS生成プロンプト
// =============================================================================

export const PLAN_ORS_GENERATION_PROMPT = `
あなたはCBTベースの思考整理アプリのORS生成AIです。
Planフェーズ全体（発散/整理/収束の3セクション）のデータ構造を1つのORSとして生成してください。

## ユーザーの悩み
{{concernText}}

## ボトルネックタイプ
{{bottleneckType}}

## 選定されたWidget（3セクション分）

### 発散セクション（diverge）
{{divergeWidgets}}

### 整理セクション（organize）
{{organizeWidgets}}

### 収束セクション（converge）
{{convergeWidgets}}

## Widget入出力ポート情報
{{widgetPortInfo}}

## タスク
以下のデータ構造を生成してください：

### 1. Entityの定義
3セクション分のデータをEntity（データオブジェクト）として定義します。

**Entityの種類**:
- **concern**: ユーザーの元の悩みテキスト（必須）
- **diverge_data**: 発散セクションのデータ
- **organize_data**: 整理セクションのデータ
- **converge_data**: 収束セクションのデータ
- **{widget}_data**: 各Widget固有のデータ

### 2. Attributeの定義
各Entityの属性（プロパティ）を定義します。

**構造型（structuralType）**:
- **SVAL**: スカラー値（単一の文字列、数値、真偽値など）
- **ARRY**: 配列（リスト形式のデータ）
- **PNTR**: ポインタ（他のEntity.Attributeへの参照）
- **DICT**: 辞書（キー・バリューペア）

### 3. DependencyGraphの定義
セクション間のデータ依存関係を定義します。
発散→整理→収束の順でデータが流れるように設計してください。

**メカニズム**:
- **update**: ソースの変更時にターゲットの値を更新

**関係仕様タイプ**:
- **javascript**: JavaScript式による変換
- **passthrough**: 値をそのまま渡す

## 出力形式
以下のJSON形式で出力してください：

\`\`\`json
{
  "version": "5.0",
  "planMetadata": {
    "concernText": "{{concernText}}",
    "bottleneckType": "{{bottleneckType}}",
    "sections": ["diverge", "organize", "converge"]
  },
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
      "type": "section_data",
      "attributes": [
        {
          "name": "output",
          "structuralType": "ARRY",
          "itemType": "DICT",
          "schema": { "id": "string", "text": "string" },
          "description": "発散セクションの出力データ"
        }
      ]
    },
    {
      "id": "organize_data",
      "type": "section_data",
      "attributes": [
        {
          "name": "input",
          "structuralType": "PNTR",
          "ref": "diverge_data.output",
          "description": "発散セクションからの入力"
        },
        {
          "name": "output",
          "structuralType": "DICT",
          "itemType": "ARRY",
          "description": "整理セクションの出力データ"
        }
      ]
    },
    {
      "id": "converge_data",
      "type": "section_data",
      "attributes": [
        {
          "name": "input",
          "structuralType": "PNTR",
          "ref": "organize_data.output",
          "description": "整理セクションからの入力"
        },
        {
          "name": "output",
          "structuralType": "ARRY",
          "itemType": "DICT",
          "schema": { "id": "string", "label": "string", "priority": "number" },
          "description": "収束セクションの出力データ"
        }
      ]
    }
  ],
  "dependencyGraph": {
    "dependencies": [
      {
        "id": "dep_diverge_to_organize",
        "source": "diverge_data.output",
        "target": "organize_data.input",
        "mechanism": "update",
        "relationship": {
          "type": "javascript",
          "javascript": "source"
        }
      },
      {
        "id": "dep_organize_to_converge",
        "source": "organize_data.output",
        "target": "converge_data.input",
        "mechanism": "update",
        "relationship": {
          "type": "javascript",
          "javascript": "Object.values(source).flat()"
        }
      }
    ],
    "metadata": {
      "version": "5.0",
      "generatedAt": ${Date.now()}
    }
  },
  "metadata": {
    "generatedAt": ${Date.now()},
    "llmModel": "gemini-2.5-flash-lite",
    "sessionId": "{{sessionId}}"
  }
}
\`\`\`

## 重要な注意点
1. 3セクション全てのデータを1つのORSに含めてください
2. セクション間のデータ継承はPNTRで表現してください
3. DependencyGraphはセクション間の依存（diverge→organize→converge）を定義してください
4. 各Widgetの入出力ポートに対応するAttributeを定義してください
`;

// =============================================================================
// Plan統合UISpec生成プロンプト
// =============================================================================

export const PLAN_UISPEC_GENERATION_PROMPT = `
あなたはCBTベースの思考整理アプリのUISpec生成AIです。
Planフェーズ全体（発散/整理/収束の3セクション）のUISpecを1つのPlanUISpecとして生成してください。

## ORS（データ構造）
{{ors}}

## ユーザーの悩み
{{concernText}}

## 選定されたWidget（3セクション分）

### 発散セクション（diverge）
{{divergeSelection}}
目的: {{divergePurpose}}
対象: {{divergeTarget}}

### 整理セクション（organize）
{{organizeSelection}}
目的: {{organizePurpose}}
対象: {{organizeTarget}}

### 収束セクション（converge）
{{convergeSelection}}
目的: {{convergePurpose}}
対象: {{convergeTarget}}

## Widget定義情報
{{widgetDefinitions}}

## Reactivityモード
{{enableReactivity}}

## タスク
3セクションを含むPlanUISpecを生成してください：

### 1. セクション構造
各セクション（diverge/organize/converge）にヘッダーとWidget配列を含めます。

**セクションヘッダー**:
- **diverge**: title="発散", description="アイデアを広げる"（選定目的に応じて調整）
- **organize**: title="整理", description="構造化する"（選定目的に応じて調整）
- **converge**: title="収束", description="優先順位をつける"（選定目的に応じて調整）

### 2. WidgetSpecの定義
各セクション内のWidgetを定義します。

**必須フィールド**:
- **id**: UISpec内で一意のWidget ID（例: "brainstorm_cards_0"）
- **component**: Widget種別
- **position**: セクション内での表示順序（0から開始）
- **config**: Widget固有の設定（generatedValueを含む）
- **dataBindings**: ORSとのデータ連携

### 3. ReactiveBindingの定義（セクション横断）
**重要**: enableReactivity=trueの場合、セクション間のWidget連携を定義してください。

**W2WRパターン**:
- **diverge → organize**: 発散出力を整理入力に連携
- **organize → converge**: 整理出力を収束入力に連携
- **diverge → converge**: 必要に応じて発散から収束への直接連携

**関係仕様タイプ**:
- **passthrough**: 値をそのまま渡す（同一データ構造の場合）
- **javascript**: JavaScript式による変換（データ構造が異なる場合）

**更新モード**:
- **realtime**: 低complexityのWidget間（complexity <= 0.3）
- **debounced**: 中complexityのWidget間（complexity > 0.3）
  - debounceMs: 300を推奨

### 4. コンテンツ生成（generatedValue）【必須】
Widget定義にgenerationHintsがある場合、ユーザーの悩みに関連するコンテンツを生成してください。

**Type A: ラベル生成（labels）**
\`\`\`json
"emotions": [
  { "id": "emotion_1", "label": "不安", "color": "#9370DB", "isGenerated": true }
]
\`\`\`

**Type B: サンプルデータ（samples）**
\`\`\`json
"sampleCards": {
  "items": [
    { "id": "sample_1", "text": "悩みに関連するアイデア", "isGenerated": true }
  ],
  "isGenerated": true
}
\`\`\`

## 出力形式
以下のJSON形式で出力してください：

\`\`\`json
{
  "version": "5.0",
  "sessionId": "{{sessionId}}",
  "stage": "plan",
  "sections": {
    "diverge": {
      "header": {
        "title": "発散",
        "description": "アイデアを広げる"
      },
      "widgets": [
        {
          "id": "brainstorm_cards_0",
          "component": "brainstorm_cards",
          "position": 0,
          "layout": "full",
          "config": {
            "title": "アイデアを出してみましょう",
            "sampleCards": {
              "items": [
                { "id": "sample_1", "text": "悩みに関連する具体的なアイデア", "isGenerated": true }
              ],
              "isGenerated": true
            }
          },
          "dataBindings": [
            {
              "portId": "cards",
              "entityAttribute": "diverge_data.output",
              "direction": "out"
            }
          ],
          "metadata": {
            "purpose": "アイデアを発散的に出す"
          }
        }
      ]
    },
    "organize": {
      "header": {
        "title": "整理",
        "description": "構造化する"
      },
      "widgets": [
        {
          "id": "card_sorting_0",
          "component": "card_sorting",
          "position": 0,
          "layout": "full",
          "config": {
            "categories": ["カテゴリA", "カテゴリB", "その他"]
          },
          "dataBindings": [
            {
              "portId": "cards",
              "entityAttribute": "organize_data.input",
              "direction": "in"
            },
            {
              "portId": "categories",
              "entityAttribute": "organize_data.output",
              "direction": "out"
            }
          ],
          "metadata": {
            "purpose": "アイデアをカテゴリ別に整理"
          }
        }
      ]
    },
    "converge": {
      "header": {
        "title": "収束",
        "description": "優先順位をつける"
      },
      "widgets": [
        {
          "id": "priority_slider_grid_0",
          "component": "priority_slider_grid",
          "position": 0,
          "layout": "full",
          "config": {
            "title": "優先度を設定"
          },
          "dataBindings": [
            {
              "portId": "items",
              "entityAttribute": "converge_data.input",
              "direction": "in"
            },
            {
              "portId": "priorities",
              "entityAttribute": "converge_data.output",
              "direction": "out"
            }
          ],
          "metadata": {
            "purpose": "優先順位を決定"
          }
        }
      ]
    }
  },
  "reactiveBindings": {
    "bindings": [
      {
        "id": "rb_diverge_to_organize",
        "source": "brainstorm_cards_0.cards",
        "target": "card_sorting_0.cards",
        "mechanism": "update",
        "relationship": {
          "type": "passthrough"
        },
        "updateMode": "realtime",
        "description": "発散→整理のデータ連携"
      },
      {
        "id": "rb_organize_to_converge",
        "source": "card_sorting_0.categories",
        "target": "priority_slider_grid_0.items",
        "mechanism": "update",
        "relationship": {
          "type": "javascript",
          "javascript": "Object.values(source).flat().map(item => ({id: item.id, label: item.text, priority: 50}))"
        },
        "updateMode": "debounced",
        "debounceMs": 300,
        "description": "整理→収束のデータ連携"
      }
    ],
    "metadata": {
      "version": "5.0",
      "generatedAt": ${Date.now()}
    }
  },
  "layout": {
    "type": "sectioned",
    "sectionGap": 24,
    "sectionOrder": ["diverge", "organize", "converge"]
  },
  "metadata": {
    "generatedAt": ${Date.now()},
    "llmModel": "gemini-2.5-flash-lite"
  }
}
\`\`\`

## 重要な注意点

### セクション横断ReactiveBinding（最重要）
1. enableReactivity=trueの場合、セクション間のW2WRを必ず定義してください
2. source/targetは「widgetId.portId」形式で指定（例: "brainstorm_cards_0.cards"）
3. 発散→整理→収束の順でデータが流れるように設計してください

### W2WRパターン選択基準
| パターン | 条件 | relationship |
|---------|------|-------------|
| passthrough | 同一データ構造（cards → cards等） | { "type": "passthrough" } |
| javascript | データ変換が必要（categories → items等） | { "type": "javascript", "javascript": "..." } |

### updateMode選択基準
| Widget complexity | updateMode |
|------------------|------------|
| 両方 <= 0.3 | realtime |
| どちらか > 0.3 | debounced (debounceMs: 300) |

### generatedValue
1. generationHintsを持つWidgetには必ずサンプルを生成
2. ユーザーの悩みに関連した具体的な内容にする
3. isGenerated: trueを必ず付与
`;

export default {
  PLAN_ORS_GENERATION_PROMPT,
  PLAN_UISPEC_GENERATION_PROMPT,
};
