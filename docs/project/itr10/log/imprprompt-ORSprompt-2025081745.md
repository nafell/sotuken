
あなたはCBTベースの思考整理アプリのORS生成AIです。
Planフェーズ全体（発散/整理/収束の3セクション）のデータ構造を1つのORSとして生成してください。

## ユーザーの悩み
研究活動が楽しすぎて寝るのを忘れてしまう

## ボトルネックタイプ
thought

## 選定されたWidget（3セクション分）

### 発散セクション（diverge）
1. emotion_palette - 研究活動に没頭しすぎるあまり、睡眠時間を削ってしまうという感情的な側面を可視化する。
2. brainstorm_cards - 研究活動のどの部分が特に楽しく、時間を忘れてしまうのか、具体的な活動内容や思考を洗い出す。

### 整理セクション（organize）
1. card_sorting - ブレインストームカードで洗い出した「時間を忘れる要因」を、関連性や影響度に基づいて分類・整理する。
2. swot_analysis - 「研究活動への没頭」をテーマに、強み（例：高い集中力、探求心）、弱み（例：睡眠不足、他のタスクへの影響）、機会（例：深い洞察、成果）、脅威（例：健康問題、燃え尽き）を分析する。

### 収束セクション（converge）
1. priority_slider_grid - 整理された要因やSWOT分析の結果に基づき、「睡眠時間を確保する」という目標に対して、各要素の重要度や緊急度を相対的に評価・決定する。
2. tradeoff_balance - 「研究の楽しさ」と「健康的な生活（睡眠）」というトレードオフの関係にある要素について、バランスを取りながら意思決定を支援する。

## Widget入出力ポート情報
[
  {
    "widgetId": "emotion_palette",
    "purpose": "研究活動に没頭しすぎるあまり、睡眠時間を削ってしまうという感情的な側面を可視化する。",
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
    ]
  },
  {
    "widgetId": "brainstorm_cards",
    "purpose": "研究活動のどの部分が特に楽しく、時間を忘れてしまうのか、具体的な活動内容や思考を洗い出す。",
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
    ]
  },
  {
    "widgetId": "card_sorting",
    "purpose": "ブレインストームカードで洗い出した「時間を忘れる要因」を、関連性や影響度に基づいて分類・整理する。",
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
    "widgetId": "swot_analysis",
    "purpose": "「研究活動への没頭」をテーマに、強み（例：高い集中力、探求心）、弱み（例：睡眠不足、他のタスクへの影響）、機会（例：深い洞察、成果）、脅威（例：健康問題、燃え尽き）を分析する。",
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
    ]
  },
  {
    "widgetId": "priority_slider_grid",
    "purpose": "整理された要因やSWOT分析の結果に基づき、「睡眠時間を確保する」という目標に対して、各要素の重要度や緊急度を相対的に評価・決定する。",
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
    "widgetId": "tradeoff_balance",
    "purpose": "「研究の楽しさ」と「健康的な生活（睡眠）」というトレードオフの関係にある要素について、バランスを取りながら意思決定を支援する。",
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
    ]
  }
]

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

```json
{
  "version": "5.0",
  "planMetadata": {
    "concernText": "研究活動が楽しすぎて寝るのを忘れてしまう",
    "bottleneckType": "thought",
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
      "generatedAt": 1765178137239
    }
  },
  "metadata": {
    "generatedAt": 1765178137239,
    "llmModel": "gemini-2.5-flash-lite",
    "sessionId": "908db37b-5647-49e4-90e4-0cdf306ede50"
  }
}
```

## 重要な注意点
1. 3セクション全てのデータを1つのORSに含めてください
2. セクション間のデータ継承はPNTRで表現してください
3. DependencyGraphはセクション間の依存（diverge→organize→converge）を定義してください
4. 各Widgetの入出力ポートに対応するAttributeを定義してください