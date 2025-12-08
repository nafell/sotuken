
あなたはCBTベースの思考整理アプリのUISpec生成AIです。
Planフェーズ全体（発散/整理/収束の3セクション）のUISpecを1つのPlanUISpecとして生成してください。

## ORS（データ構造）
{
  "version": "5.0",
  "planMetadata": {
    "concernText": "研究活動が楽しすぎて寝るのを忘れてしまう",
    "bottleneckType": "thought",
    "sections": [
      "diverge",
      "organize",
      "converge"
    ]
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
    }
  ],
  "dependencyGraph": {
    "dependencies": [],
    "metadata": {
      "version": "5.0",
      "generatedAt": 1765178216500
    }
  },
  "metadata": {
    "generatedAt": 1765178216500,
    "llmModel": "fallback",
    "sessionId": "908db37b-5647-49e4-90e4-0cdf306ede50",
    "concernText": "研究活動が楽しすぎて寝るのを忘れてしまう",
    "bottleneckType": "thought",
    "sections": [
      "diverge",
      "organize",
      "converge"
    ]
  }
}

## ユーザーの悩み
研究活動が楽しすぎて寝るのを忘れてしまう

## 選定されたWidget（3セクション分）

### 発散セクション（diverge）
1. emotion_palette - 研究活動に没頭しすぎるあまり、睡眠時間を削ってしまうという感情的な側面を可視化する。
2. brainstorm_cards - 研究活動のどの部分が特に楽しく、時間を忘れてしまうのか、具体的な活動内容や思考を洗い出す。
目的: 研究活動への没頭がもたらす感情と、具体的な行動・思考を多角的に洗い出す。
対象: 研究活動の楽しさ、時間を忘れる具体的な要因、それに伴う感情。

### 整理セクション（organize）
1. card_sorting - ブレインストームカードで洗い出した「時間を忘れる要因」を、関連性や影響度に基づいて分類・整理する。
2. swot_analysis - 「研究活動への没頭」をテーマに、強み（例：高い集中力、探求心）、弱み（例：睡眠不足、他のタスクへの影響）、機会（例：深い洞察、成果）、脅威（例：健康問題、燃え尽き）を分析する。
目的: 時間忘却の要因を分類し、没頭のメリット・デメリットを多角的に評価する。
対象: 時間を忘れる活動の要因、没頭のメリット・デメリット。

### 収束セクション（converge）
1. priority_slider_grid - 整理された要因やSWOT分析の結果に基づき、「睡眠時間を確保する」という目標に対して、各要素の重要度や緊急度を相対的に評価・決定する。
2. tradeoff_balance - 「研究の楽しさ」と「健康的な生活（睡眠）」というトレードオフの関係にある要素について、バランスを取りながら意思決定を支援する。
目的: 「研究の没頭」と「健康的な生活」のバランスを取り、具体的な行動目標を設定する。
対象: 睡眠時間を確保するための具体的なアクションプラン、優先順位。

## Widget定義情報
{
  "diverge": [
    {
      "id": "emotion_palette",
      "name": "感情パレット",
      "description": "感情をカラーパレットから選択し、強度を調整する。",
      "complexity": 0.3,
      "inputs": [],
      "outputs": [
        {
          "id": "selectedEmotions",
          "dataType": "object[]",
          "description": "選択された感情リスト {emotion: string, intensity: number}"
        },
        {
          "id": "dominantEmotion",
          "dataType": "string",
          "description": "最も強い感情"
        }
      ],
      "generationHints": {
        "labels": {
          "field": "emotions",
          "instruction": "ユーザーの悩みの状況で抱きがちな感情を8個生成してください。各感情には適切な色（暖色＝ポジティブ、寒色＝ネガティブなど）を設定してください。",
          "count": 8,
          "schema": {
            "id": "string (emotion_1, emotion_2, ...)",
            "label": "string (日本語、2-4文字、例: 不安、焦り、期待)",
            "color": "string (hex color, e.g., #FF6B6B)",
            "category": "string (positive|negative|neutral)",
            "description": "string (日本語、感情の説明、5-15文字)"
          }
        }
      }
    },
    {
      "id": "brainstorm_cards",
      "name": "ブレインストームカード",
      "description": "自由にアイデアをカードとして追加し、視覚的に整理する。",
      "complexity": 0.2,
      "inputs": [],
      "outputs": [
        {
          "id": "cards",
          "dataType": "object[]",
          "description": "カードリスト {id: string, text: string, color?: string}"
        },
        {
          "id": "cardCount",
          "dataType": "number",
          "description": "カードの総数"
        }
      ],
      "generationHints": {
        "samples": {
          "field": "sampleCards",
          "instruction": "ユーザーの悩みに関連するアイデアの種となるカードを2-3個生成してください。ユーザーの思考を促すきっかけとなる具体的な内容にしてください。",
          "count": {
            "min": 2,
            "max": 3
          },
          "schema": {
            "id": "string (sample_1, sample_2, ...)",
            "text": "string (日本語、15-30文字程度)",
            "color": "string (optional, hex color)"
          }
        }
      }
    }
  ],
  "organize": [
    {
      "id": "card_sorting",
      "name": "カードソート",
      "description": "カードをカテゴリにドラッグ&ドロップで分類。",
      "complexity": 0.4,
      "inputs": [
        {
          "id": "cards",
          "dataType": "object[]",
          "description": "ソートするカードリスト",
          "required": false
        }
      ],
      "outputs": [
        {
          "id": "categories",
          "dataType": "object",
          "description": "カテゴリごとのカード配置"
        },
        {
          "id": "uncategorized",
          "dataType": "object[]",
          "description": "未分類のカード"
        }
      ]
    },
    {
      "id": "swot_analysis",
      "name": "SWOT分析",
      "description": "強み(Strengths)・弱み(Weaknesses)・機会(Opportunities)・脅威(Threats)の4象限で状況を整理。",
      "complexity": 0.6,
      "inputs": [
        {
          "id": "items",
          "dataType": "object[]",
          "description": "SWOTアイテムリスト。各アイテムは {text: string, quadrant: string} の形式。",
          "required": false
        }
      ],
      "outputs": [
        {
          "id": "placement",
          "dataType": "object",
          "description": "象限ごとのアイテム配置 {strengths: Item[], weaknesses: Item[], opportunities: Item[], threats: Item[]}"
        },
        {
          "id": "counts",
          "dataType": "object",
          "description": "各象限のアイテム数"
        },
        {
          "id": "isComplete",
          "dataType": "boolean",
          "description": "全象限に最低1つ以上のアイテムがあるかどうか"
        }
      ],
      "generationHints": {
        "samples": {
          "field": "sampleItems",
          "instruction": "悩みに関連するSWOT要素を各象限1つずつ（計4つ）生成してください。ユーザーの具体的な状況に合わせた内容にしてください。",
          "count": {
            "min": 4,
            "max": 4
          },
          "schema": {
            "id": "string (sample_s, sample_w, sample_o, sample_t)",
            "text": "string (日本語、15-30文字)",
            "quadrant": "string (strengths|weaknesses|opportunities|threats)"
          }
        }
      }
    }
  ],
  "converge": [
    {
      "id": "priority_slider_grid",
      "name": "優先度スライダー",
      "description": "複数の項目に対してスライダーで優先度を設定。",
      "complexity": 0.3,
      "inputs": [
        {
          "id": "items",
          "dataType": "object[]",
          "description": "優先度を設定する項目リスト",
          "required": false
        }
      ],
      "outputs": [
        {
          "id": "priorities",
          "dataType": "object[]",
          "description": "優先度情報 {id: string, label: string, priority: number}"
        },
        {
          "id": "ranking",
          "dataType": "string[]",
          "description": "優先度順のID配列"
        }
      ]
    },
    {
      "id": "tradeoff_balance",
      "name": "トレードオフ天秤",
      "description": "複数の選択肢を重み付けし、バランスを視覚的に表示。天秤のメタファーで直感的に比較可能。",
      "complexity": 0.5,
      "inputs": [
        {
          "id": "items",
          "dataType": "object[]",
          "description": "比較対象の項目リスト {text: string, side: \"left\"|\"right\", weight?: number}",
          "required": false
        }
      ],
      "outputs": [
        {
          "id": "balance",
          "dataType": "number",
          "description": "バランススコア（-100〜100）"
        },
        {
          "id": "direction",
          "dataType": "string",
          "description": "天秤の傾き方向"
        },
        {
          "id": "recommendation",
          "dataType": "string",
          "description": "判断の推奨テキスト"
        }
      ],
      "generationHints": {
        "samples": {
          "field": "items",
          "instruction": "悩みに関連する比較対象を生成してください。左右それぞれ1-2個ずつ、計2-4個を生成します。ユーザーの具体的な状況に応じた選択肢を示してください。",
          "count": {
            "min": 2,
            "max": 4
          },
          "schema": {
            "id": "string (item_1, item_2, ...)",
            "text": "string (日本語、10-20文字)",
            "side": "string (left|right)",
            "weight": "number (optional, 30-70程度の初期値)"
          }
        }
      }
    }
  ]
}

## Reactivityモード
true

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
```json
"emotions": [
  { "id": "emotion_1", "label": "不安", "color": "#9370DB", "isGenerated": true }
]
```

**Type B: サンプルデータ（samples）**
```json
"sampleCards": {
  "items": [
    { "id": "sample_1", "text": "悩みに関連するアイデア", "isGenerated": true }
  ],
  "isGenerated": true
}
```

## 出力形式
以下のJSON形式で出力してください：

```json
{
  "version": "5.0",
  "sessionId": "908db37b-5647-49e4-90e4-0cdf306ede50",
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
      "generatedAt": 1765178137239
    }
  },
  "layout": {
    "type": "sectioned",
    "sectionGap": 24,
    "sectionOrder": ["diverge", "organize", "converge"]
  },
  "metadata": {
    "generatedAt": 1765178137239,
    "llmModel": "gemini-2.5-flash-lite"
  }
}
```

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