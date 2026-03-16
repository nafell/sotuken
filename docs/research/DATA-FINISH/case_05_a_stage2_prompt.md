# Role
You are a data structure generator for a thought-organization app.
Generate an ORS (Object-Relational Schema) defining data flow across 3 sections.

# CRITICAL: DependencyGraph is MANDATORY
You MUST define dependencies between sections:
- diverge_data.output → organize_data.input
- organize_data.output → converge_data.input

# Input

## User Concern
引越し先を検討中。候補地の長所短所を分類してから、最終的にトレードオフを比較したい

## Bottleneck Type
thought

## Selected Widgets

### Diverge Section
1. mind_map - 引越し候補地に関して中心トピックから関連要素を放射状に展開し、各候補の特徴を洗い出すため

### Organize Section
1. swot_analysis - 各候補地の長所と短所、機会と脅威を整理し比較分析しやすくするため

### Converge Section
1. tradeoff_balance - 分類された情報を元に各候補地を比較し、どちらを選ぶかの意思決定を支援するため

## Widget Port Information
[
  {
    \"widgetId\": \"mind_map\",
    \"purpose\": \"引越し候補地に関して中心トピックから関連要素を放射状に展開し、各候補の特徴を洗い出すため\",
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
  },
  {
    \"widgetId\": \"swot_analysis\",
    \"purpose\": \"各候補地の長所と短所、機会と脅威を整理し比較分析しやすくするため\",
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
    ]
  },
  {
    \"widgetId\": \"tradeoff_balance\",
    \"purpose\": \"分類された情報を元に各候補地を比較し、どちらを選ぶかの意思決定を支援するため\",
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
    ]
  }
]

# Output JSON Structure

Generate valid JSON with this structure:
- version: \"5.0\"
- planMetadata: { concernText, bottleneckType, sections }
- entities: Array of Entity objects
- dependencyGraph: { dependencies: Array of Dependency objects }

## Entity Structure
- id: string (e.g., \"diverge_data\", \"organize_data\", \"converge_data\")
- type: string (\"concern\" | \"section_data\")
- attributes: Array of Attribute objects

## Attribute Types (structuralType)
- SVAL: Scalar value (string, number, boolean)
- ARRY: Array
- PNTR: Pointer to another entity.attribute (use \"ref\" field)
- DICT: Dictionary/Object

## Dependency Structure (REQUIRED)
{
  \"id\": \"dep_diverge_to_organize\",
  \"source\": \"diverge_data.output\",
  \"target\": \"organize_data.input\",
  \"mechanism\": \"update\",
  \"relationship\": { \"type\": \"passthrough\" }
}

# Minimal Example
{
  \"version\": \"5.0\",
  \"planMetadata\": {
    \"concernText\": \"引越し先を検討中。候補地の長所短所を分類してから、最終的にトレードオフを比較したい\",
    \"bottleneckType\": \"thought\",
    \"sections\": [\"diverge\", \"organize\", \"converge\"]
  },
  \"entities\": [
    { \"id\": \"concern\", \"type\": \"concern\", \"attributes\": [{ \"name\": \"text\", \"structuralType\": \"SVAL\", \"valueType\": \"string\" }] },
    { \"id\": \"diverge_data\", \"type\": \"section_data\", \"attributes\": [{ \"name\": \"output\", \"structuralType\": \"ARRY\", \"itemType\": \"DICT\" }] },
    { \"id\": \"organize_data\", \"type\": \"section_data\", \"attributes\": [
      { \"name\": \"input\", \"structuralType\": \"PNTR\", \"ref\": \"diverge_data.output\" },
      { \"name\": \"output\", \"structuralType\": \"DICT\", \"itemType\": \"ARRY\" }
    ]},
    { \"id\": \"converge_data\", \"type\": \"section_data\", \"attributes\": [
      { \"name\": \"input\", \"structuralType\": \"PNTR\", \"ref\": \"organize_data.output\" },
      { \"name\": \"output\", \"structuralType\": \"ARRY\", \"itemType\": \"DICT\" }
    ]}
  ],
  \"dependencyGraph\": {
    \"dependencies\": [
      { \"id\": \"dep_diverge_to_organize\", \"source\": \"diverge_data.output\", \"target\": \"organize_data.input\", \"mechanism\": \"update\", \"relationship\": { \"type\": \"passthrough\" } },
      { \"id\": \"dep_organize_to_converge\", \"source\": \"organize_data.output\", \"target\": \"converge_data.input\", \"mechanism\": \"update\", \"relationship\": { \"type\": \"javascript\", \"javascript\": \"Object.values(source).flat()\" } }
    ],
    \"metadata\": { \"version\": \"5.0\" }
  },
  \"metadata\": { \"generatedAt\": 1765618938119, \"sessionId\": \"batch-772ca8db-4545-405b-a707-4bc221153420-5\" }
}
