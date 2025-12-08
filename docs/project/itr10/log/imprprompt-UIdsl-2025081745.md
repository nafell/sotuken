{
  "stage": "plan",
  "layout": {
    "type": "sectioned",
    "sectionGap": 24,
    "sectionOrder": [
      "diverge",
      "organize",
      "converge"
    ]
  },
  "version": "5.0",
  "metadata": {
    "llmModel": "fallback",
    "generatedAt": 1765178234087
  },
  "sections": {
    "diverge": {
      "header": {
        "title": "発散",
        "description": "アイデアを広げましょう"
      },
      "widgets": [
        {
          "id": "emotion_palette_diverge_0",
          "config": {},
          "metadata": {
            "purpose": "研究活動に没頭しすぎるあまり、睡眠時間を削ってしまうという感情的な側面を可視化する。"
          },
          "position": 0,
          "component": "emotion_palette",
          "dataBindings": []
        },
        {
          "id": "brainstorm_cards_diverge_1",
          "config": {},
          "metadata": {
            "purpose": "研究活動のどの部分が特に楽しく、時間を忘れてしまうのか、具体的な活動内容や思考を洗い出す。"
          },
          "position": 1,
          "component": "brainstorm_cards",
          "dataBindings": []
        }
      ]
    },
    "converge": {
      "header": {
        "title": "収束",
        "description": "優先順位をつけましょう"
      },
      "widgets": [
        {
          "id": "priority_slider_grid_converge_0",
          "config": {},
          "metadata": {
            "purpose": "整理された要因やSWOT分析の結果に基づき、「睡眠時間を確保する」という目標に対して、各要素の重要度や緊急度を相対的に評価・決定する。"
          },
          "position": 0,
          "component": "priority_slider_grid",
          "dataBindings": []
        },
        {
          "id": "tradeoff_balance_converge_1",
          "config": {},
          "metadata": {
            "purpose": "「研究の楽しさ」と「健康的な生活（睡眠）」というトレードオフの関係にある要素について、バランスを取りながら意思決定を支援する。"
          },
          "position": 1,
          "component": "tradeoff_balance",
          "dataBindings": []
        }
      ]
    },
    "organize": {
      "header": {
        "title": "整理",
        "description": "情報を整理しましょう"
      },
      "widgets": [
        {
          "id": "card_sorting_organize_0",
          "config": {},
          "metadata": {
            "purpose": "ブレインストームカードで洗い出した「時間を忘れる要因」を、関連性や影響度に基づいて分類・整理する。"
          },
          "position": 0,
          "component": "card_sorting",
          "dataBindings": []
        },
        {
          "id": "swot_analysis_organize_1",
          "config": {},
          "metadata": {
            "purpose": "「研究活動への没頭」をテーマに、強み（例：高い集中力、探求心）、弱み（例：睡眠不足、他のタスクへの影響）、機会（例：深い洞察、成果）、脅威（例：健康問題、燃え尽き）を分析する。"
          },
          "position": 1,
          "component": "swot_analysis",
          "dataBindings": []
        }
      ]
    }
  },
  "sessionId": "908db37b-5647-49e4-90e4-0cdf306ede50",
  "reactiveBindings": {
    "bindings": [
      {
        "id": "rb_diverge_to_organize",
        "source": "brainstorm_cards_diverge_1.cards",
        "target": "card_sorting_organize_0.cards",
        "enabled": true,
        "mechanism": "update",
        "updateMode": "realtime",
        "description": "発散→整理のデータ連携",
        "relationship": {
          "type": "passthrough"
        }
      },
      {
        "id": "rb_organize_to_converge",
        "source": "swot_analysis_organize_1.placement",
        "target": "priority_slider_grid_converge_0.items",
        "enabled": true,
        "mechanism": "update",
        "debounceMs": 300,
        "updateMode": "debounced",
        "description": "整理→収束のデータ連携",
        "relationship": {
          "type": "javascript",
          "javascript": "Object.values(source).flat()"
        }
      }
    ],
    "metadata": {
      "version": "4.0",
      "generatedAt": 1765178234087
    }
  }
}