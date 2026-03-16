
# Role
You are a UI specification generator for a thought-organization app.
Generate a PlanUISpec with dynamic content and widget connections.

# CRITICAL REQUIREMENTS (READ FIRST)

## 1. generatedValue - MANDATORY for widgets with generationHints

For EACH widget in \"Widget Definitions\" that has \"generationHints\":
- Generate content in config using the field name from generationHints
- Content MUST relate to the user's concern: \"引越し先を検討中。候補地の長所短所を分類してから、最終的にトレードオフを比較したい\"
- Mark ALL items with isGenerated: true

CHECKLIST (verify before output):
[ ] swot_analysis: config.sampleItems (samples, 4-4 items)
[ ] tradeoff_balance: config.items (samples, 2-4 items)

Example for brainstorm_cards:
\"config\": {
  \"sampleCards\": {
    \"items\": [
      { \"id\": \"sample_1\", \"text\": \"Specific idea related to 引越し先を検討中。候補地の長所短所を分類してから、最終的にトレードオフを比較したい\", \"isGenerated\": true },
      { \"id\": \"sample_2\", \"text\": \"Another relevant thought\", \"isGenerated\": true }
    ],
    \"isGenerated\": true
  }
}

Example for emotion_palette:
\"config\": {
  \"emotions\": [
    { \"id\": \"emotion_1\", \"label\": \"不安\", \"color\": \"#9370DB\", \"category\": \"negative\", \"isGenerated\": true },
    { \"id\": \"emotion_2\", \"label\": \"焦り\", \"color\": \"#FF6B6B\", \"category\": \"negative\", \"isGenerated\": true }
  ]
}

## 2. ReactiveBindings - MANDATORY when enableReactivity=true

Define widget-to-widget connections across sections:

REQUIRED CONNECTIONS:
- mind_map_0.nodes → swot_analysis_0.items (diverge→organize)
- mind_map_0.connections → swot_analysis_0.items (diverge→organize)
- mind_map_0.depth → swot_analysis_0.items (diverge→organize)
- swot_analysis_0.placement → tradeoff_balance_0.items (organize→converge)
- swot_analysis_0.counts → tradeoff_balance_0.items (organize→converge)
- swot_analysis_0.isComplete → tradeoff_balance_0.items (organize→converge)

Format: \"widgetId.portId\" (e.g., \"brainstorm_cards_0.cards\")

Example binding (diverge → organize):
{
  \"id\": \"rb_diverge_to_organize\",
  \"source\": \"brainstorm_cards_0.cards\",
  \"target\": \"card_sorting_0.cards\",
  \"mechanism\": \"update\",
  \"relationship\": { \"type\": \"passthrough\" },
  \"updateMode\": \"realtime\"
}

Example binding (organize → converge with transform):
{
  \"id\": \"rb_organize_to_converge\",
  \"source\": \"card_sorting_0.categories\",
  \"target\": \"priority_slider_grid_0.items\",
  \"mechanism\": \"update\",
  \"relationship\": {
    \"type\": \"javascript\",
    \"javascript\": \"Object.values(source).flat().map(item => ({id: item.id, label: item.text, priority: 50}))\"
  },
  \"updateMode\": \"debounced\",
  \"debounceMs\": 300
}

# Input Context

## User Concern
引越し先を検討中。候補地の長所短所を分類してから、最終的にトレードオフを比較したい

## Selected Widgets by Section

### Diverge Section
1. mind_map - 引越し候補地に関して中心トピックから関連要素を放射状に展開し、各候補の特徴を洗い出すため
Purpose: 候補地に関する情報や特徴を幅広く発散させる
Target: 候補地の長所・短所や関連要因を網羅的に抽出する
Ports:
mind_map (complexity: 0.5):
  IN: centralTopic (string)
  OUT: nodes (object[])
  OUT: connections (object[])
  OUT: depth (number)

### Organize Section
1. swot_analysis - 各候補地の長所と短所、機会と脅威を整理し比較分析しやすくするため
Purpose: 発散した情報を構造化して整理する
Target: 候補地ごとに長所・短所・機会・脅威を明確化する
Ports:
swot_analysis (complexity: 0.6):
  IN: items (object[])
  OUT: placement (object)
  OUT: counts (object)
  OUT: isComplete (boolean)
  GENERATE: config.sampleItems

### Converge Section
1. tradeoff_balance - 分類された情報を元に各候補地を比較し、どちらを選ぶかの意思決定を支援するため
Purpose: 候補地間のトレードオフを評価し最終的な判断を行う
Target: 候補地間の重み付けとバランス比較
Ports:
tradeoff_balance (complexity: 0.5):
  IN: items (object[])
  OUT: balance (number)
  OUT: direction (string)
  OUT: recommendation (string)
  GENERATE: config.items

## Widget Definitions (with generationHints - IMPORTANT)
{
  \"diverge\": [
    {
      \"id\": \"mind_map\",
      \"name\": \"マインドマップ\",
      \"description\": \"中心トピックから放射状にアイデアを展開。\",
      \"complexity\": 0.5,
      \"inputs\": [
        {
          \"id\": \"centralTopic\",
          \"dataType\": \"string\",
          \"description\": \"中心トピック\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"nodes\",
          \"dataType\": \"object[]\",
          \"description\": \"マインドマップのノード\"
        },
        {
          \"id\": \"connections\",
          \"dataType\": \"object[]\",
          \"description\": \"ノード間の接続\"
        },
        {
          \"id\": \"depth\",
          \"dataType\": \"number\",
          \"description\": \"最大の深さ\"
        }
      ]
    }
  ],
  \"organize\": [
    {
      \"id\": \"swot_analysis\",
      \"name\": \"SWOT分析\",
      \"description\": \"強み(Strengths)・弱み(Weaknesses)・機会(Opportunities)・脅威(Threats)の4象限で状況を整理。\",
      \"complexity\": 0.6,
      \"inputs\": [
        {
          \"id\": \"items\",
          \"dataType\": \"object[]\",
          \"description\": \"SWOTアイテムリスト。各アイテムは {text: string, quadrant: string} の形式。\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"placement\",
          \"dataType\": \"object\",
          \"description\": \"象限ごとのアイテム配置 {strengths: Item[], weaknesses: Item[], opportunities: Item[], threats: Item[]}\"
        },
        {
          \"id\": \"counts\",
          \"dataType\": \"object\",
          \"description\": \"各象限のアイテム数\"
        },
        {
          \"id\": \"isComplete\",
          \"dataType\": \"boolean\",
          \"description\": \"全象限に最低1つ以上のアイテムがあるかどうか\"
        }
      ],
      \"generationHints\": {
        \"samples\": {
          \"field\": \"sampleItems\",
          \"instruction\": \"悩みに関連するSWOT要素を各象限1つずつ（計4つ）生成してください。ユーザーの具体的な状況に合わせた内容にしてください。\",
          \"count\": {
            \"min\": 4,
            \"max\": 4
          },
          \"schema\": {
            \"id\": \"string (sample_s, sample_w, sample_o, sample_t)\",
            \"text\": \"string (日本語、15-30文字)\",
            \"quadrant\": \"string (strengths|weaknesses|opportunities|threats)\"
          }
        }
      }
    }
  ],
  \"converge\": [
    {
      \"id\": \"tradeoff_balance\",
      \"name\": \"トレードオフ天秤\",
      \"description\": \"複数の選択肢を重み付けし、バランスを視覚的に表示。天秤のメタファーで直感的に比較可能。\",
      \"complexity\": 0.5,
      \"inputs\": [
        {
          \"id\": \"items\",
          \"dataType\": \"object[]\",
          \"description\": \"比較対象の項目リスト {text: string, side: \\\"left\\\"|\\\"right\\\", weight?: number}\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"balance\",
          \"dataType\": \"number\",
          \"description\": \"バランススコア（-100〜100）\"
        },
        {
          \"id\": \"direction\",
          \"dataType\": \"string\",
          \"description\": \"天秤の傾き方向\"
        },
        {
          \"id\": \"recommendation\",
          \"dataType\": \"string\",
          \"description\": \"判断の推奨テキスト\"
        }
      ],
      \"generationHints\": {
        \"samples\": {
          \"field\": \"items\",
          \"instruction\": \"悩みに関連する比較対象を生成してください。左右それぞれ1-2個ずつ、計2-4個を生成します。ユーザーの具体的な状況に応じた選択肢を示してください。\",
          \"count\": {
            \"min\": 2,
            \"max\": 4
          },
          \"schema\": {
            \"id\": \"string (item_1, item_2, ...)\",
            \"text\": \"string (日本語、10-20文字)\",
            \"side\": \"string (left|right)\",
            \"weight\": \"number (optional, 30-70程度の初期値)\"
          }
        }
      }
    }
  ]
}

## ORS Data Structure
{
  \"version\": \"5.0\",
  \"planMetadata\": {
    \"concernText\": \"引越し先を検討中。候補地の長所短所を分類してから、最終的にトレードオフを比較したい\",
    \"bottleneckType\": \"thought\",
    \"sections\": [
      \"diverge\",
      \"organize\",
      \"converge\"
    ]
  },
  \"entities\": [
    {
      \"id\": \"concern\",
      \"type\": \"concern\",
      \"attributes\": [
        {
          \"name\": \"text\",
          \"structuralType\": \"SVAL\",
          \"valueType\": \"string\",
          \"description\": \"ユーザーの元の悩みテキスト\"
        }
      ]
    }
  ],
  \"dependencyGraph\": {
    \"dependencies\": [],
    \"metadata\": {
      \"version\": \"5.0\",
      \"generatedAt\": 1765620555076
    }
  },
  \"metadata\": {
    \"generatedAt\": 1765620555076,
    \"llmModel\": \"fallback\",
    \"sessionId\": \"batch-772ca8db-4545-405b-a707-4bc221153420-5\",
    \"concernText\": \"引越し先を検討中。候補地の長所短所を分類してから、最終的にトレードオフを比較したい\",
    \"bottleneckType\": \"thought\",
    \"sections\": [
      \"diverge\",
      \"organize\",
      \"converge\"
    ]
  }
}

# Output JSON Structure

Generate valid JSON with:
- version: \"5.0\"
- sessionId: \"batch-772ca8db-4545-405b-a707-4bc221153420-5\"
- stage: \"plan\"
- sections: { diverge, organize, converge } - each with header and widgets array
- reactiveBindings: { bindings: [...] } - widget connections (REQUIRED when enableReactivity=true)
- layout: { type: \"sectioned\", sectionGap: 24, sectionOrder: [\"diverge\", \"organize\", \"converge\"] }

## Widget Structure
{
  \"id\": \"widgetType_sectionIndex\" (e.g., \"brainstorm_cards_0\"),
  \"component\": \"widgetType\",
  \"position\": 0,
  \"layout\": \"full\",
  \"config\": { /* include generatedValue here if widget has generationHints */ },
  \"dataBindings\": [{ \"portId\": \"...\", \"entityAttribute\": \"entity.attribute\", \"direction\": \"in|out\" }],
  \"metadata\": { \"purpose\": \"...\" }
}

# Rules Reference

## updateMode Selection
- \"realtime\": Both widgets have complexity <= 0.3
- \"debounced\" (300ms): Either widget has complexity > 0.3

## relationship.type Selection
- \"passthrough\": Same data structure (e.g., cards → cards)
- \"javascript\": Need transformation (e.g., categories → items)
