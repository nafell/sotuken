{
  "ors": "{
  \"version\": \"5.0\",
  \"planMetadata\": {
    \"concernText\": \"副業を始めたいが、何から手をつければいいか分からない。アイデアはいくつかあるが整理できていない\",
    \"bottleneckType\": \"{{bottleneckType}}\",
    \"sections\": [
      \"diverge\",
      \"organize\",
      \"converge\"
    ],
    \"selectedWidgets\": {
      \"diverge\": \"{{divergeWidgets}}\",
      \"organize\": \"{{organizeWidgets}}\",
      \"converge\": \"{{convergeWidgets}}\"
    }
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
          \"value\": \"副業を始めたいが、何から手をつければいいか分からない。アイデアはいくつかあるが整理できていない\"
        },
        {
          \"name\": \"bottleneckType\",
          \"structuralType\": \"SVAL\",
          \"valueType\": \"string\",
          \"value\": \"{{bottleneckType}}\"
        }
      ]
    },
    {
      \"id\": \"diverge_data\",
      \"type\": \"section_data\",
      \"attributes\": [
        {
          \"name\": \"output\",
          \"structuralType\": \"ARRY\",
          \"itemType\": \"DICT\",
          \"description\": \"ブレインストーミングで出た副業アイデアのリスト。各アイデアはメタデータ（カテゴリ、期待収益、時間投資、リスク）を持つ。\",
          \"exampleItemSchema\": {
            \"idea\": \"string\",
            \"category\": \"string\",
            \"expectedMonthlyRevenue\": \"number\",
            \"weeklyHours\": \"number\",
            \"riskLevel\": \"string\",
            \"notes\": \"string\"
          }
        },
        {
          \"name\": \"widgets\",
          \"structuralType\": \"ARRY\",
          \"itemType\": \"SVAL\",
          \"value\": \"{{divergeWidgets}}\",
          \"description\": \"このセクションで使われるウィジェットの一覧\"
        }
      ]
    },
    {
      \"id\": \"organize_data\",
      \"type\": \"section_data\",
      \"attributes\": [
        {
          \"name\": \"input\",
          \"structuralType\": \"PNTR\",
          \"ref\": \"diverge_data.output\",
          \"description\": \"diverge の出力を受け取り、分類・評価のために利用する。\"
        },
        {
          \"name\": \"output\",
          \"structuralType\": \"DICT\",
          \"itemType\": \"ARRY\",
          \"description\": \"分類・評価されたアイデア群。キーは分類軸（例: 優先度, 実行容易性, 収益見込み）で、値は該当するアイデアの配列。\",
          \"exampleStructure\": {
            \"byPriority\": [
              {
                \"idea\": \"string\",
                \"score\": \"number\",
                \"rationale\": \"string\"
              }
            ],
            \"byEffort\": [
              {
                \"idea\": \"string\",
                \"effortCategory\": \"string\"
              }
            ],
            \"byRevenuePotential\": [
              {
                \"idea\": \"string\",
                \"estimatedMonthly\": \"number\"
              }
            ]
          }
        },
        {
          \"name\": \"widgets\",
          \"structuralType\": \"ARRY\",
          \"itemType\": \"SVAL\",
          \"value\": \"{{organizeWidgets}}\",
          \"description\": \"このセクションで使われるウィジェットの一覧\"
        }
      ]
    },
    {
      \"id\": \"converge_data\",
      \"type\": \"section_data\",
      \"attributes\": [
        {
          \"name\": \"input\",
          \"structuralType\": \"PNTR\",
          \"ref\": \"organize_data.output\",
          \"description\": \"整理されたアイデア群を受け取り、最終的なアクションプランや優先タスクに変換する。\"
        },
        {
          \"name\": \"output\",
          \"structuralType\": \"ARRY\",
          \"itemType\": \"DICT\",
          \"description\": \"最終決定された副業プランのリスト（優先順）。各プランにはステップ、タイムライン、必要リソース、最初のタスクが含まれる。\",
          \"exampleItemSchema\": {
            \"selectedIdea\": \"string\",
            \"priorityRank\": \"number\",
            \"first30DaysPlan\": [
              \"string\"
            ],
            \"requiredResources\": [
              \"string\"
            ],
            \"estimatedBreakEvenMonths\": \"number\",
            \"nextAction\": {
              \"task\": \"string\",
              \"due\": \"string\",
              \"owner\": \"string\"
            }
          }
        },
        {
          \"name\": \"widgets\",
          \"structuralType\": \"ARRY\",
          \"itemType\": \"SVAL\",
          \"value\": \"{{convergeWidgets}}\",
          \"description\": \"このセクションで使われるウィジェットの一覧\"
        }
      ]
    }
  ],
  \"dependencyGraph\": {
    \"dependencies\": [
      {
        \"id\": \"dep_diverge_to_organize\",
        \"source\": \"diverge_data.output\",
        \"target\": \"organize_data.input\",
        \"mechanism\": \"update\",
        \"relationship\": {
          \"type\": \"passthrough\"
        }
      },
      {
        \"id\": \"dep_organize_to_converge\",
        \"source\": \"organize_data.output\",
        \"target\": \"converge_data.input\",
        \"mechanism\": \"update\",
        \"relationship\": {
          \"type\": \"passthrough\"
        }
      }
    ],
    \"metadata\": {
      \"version\": \"5.0\"
    }
  },
  \"metadata\": {
    \"generatedAt\": 1765405890846,
    \"sessionId\": \"{{sessionId}}\",
    \"widgetPortInfo\": \"{{widgetPortInfo}}\"
  }
}",
  "concernText": "副業を始めたいが、何から手をつければいいか分からない。アイデアはいくつかあるが整理できていない",
  "contextFactors": {
    "urgency": "low",
    "category": "キャリア",
    "timeAvailable": "30",
    "emotionalState": "confused"
  }
}