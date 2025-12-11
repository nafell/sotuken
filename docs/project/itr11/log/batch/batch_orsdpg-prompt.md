{
  "concernText": "副業を始めたいが、何から手をつければいいか分からない。アイデアはいくつかあるが整理できていない",
  "contextFactors": {
    "urgency": "low",
    "category": "キャリア",
    "timeAvailable": "30",
    "emotionalState": "confused"
  },
  "widgetSelection": {
    "stages": {
      "diverge": {
        "target": "ユーザーが持っている複数のアイデアとそれに対する感情的な障壁",
        "purpose": "可能な副業案とそれに伴う感情を幅広く洗い出す",
        "widgets": [
          {
            "order": 0,
            "purpose": "副業アイデアを量出しして思考の幅を広げるため",
            "widgetId": "brainstorm_list",
            "suggestedConfig": {
              "prompt": "副業に関する思いつくアイデアを制限なく書き出してください。スキル、興味、時間、初期費用なども含める",
              "maxItems": 50,
              "allowQuickTags": true
            },
            "suggestedBindings": []
          },
          {
            "order": 1,
            "purpose": "アイデアに対する感情や不安を洗い出し、意思決定の障害を明確にするため",
            "widgetId": "emotion_check",
            "suggestedConfig": {
              "scales": [
                {
                  "max": 10,
                  "min": 0,
                  "label": "興味"
                },
                {
                  "max": 10,
                  "min": 0,
                  "label": "不安"
                },
                {
                  "max": 10,
                  "min": 0,
                  "label": "自信"
                }
              ],
              "freeTextPrompt": "各アイデアに対する具体的な感情や懸念を書いてください"
            },
            "suggestedBindings": [
              {
                "inputPort": "targets",
                "outputPort": "items",
                "sourceWidgetType": "brainstorm_list"
              }
            ]
          }
        ],
        "description": "まずは数を出してから、各アイデアに対する興味・不安・自信といった感情を可視化することで、整理の材料を揃える。ブレインストーミングで出たアイデアをemotion_checkで評価の基礎データにする。",
        "estimatedDuration": 300
      },
      "summary": {
        "target": "選んだ副業案と最初の具体的タスク（期限・リソース）",
        "purpose": "決定内容と初期アクションを確認し、実行に移す準備を整える",
        "widgets": [
          {
            "order": 0,
            "purpose": "今回の整理結果と次のステップを一画面で確認するため",
            "widgetId": "stage_summary",
            "suggestedConfig": {
              "includeDecisions": true,
              "nextActionsTemplate": [
                "タスク",
                "期限",
                "必要リソース",
                "見込み時間"
              ],
              "includeEmotionalNotes": true
            },
            "suggestedBindings": [
              {
                "inputPort": "selectedPlan",
                "outputPort": "finalDecision",
                "sourceWidgetType": "decision_balance"
              },
              {
                "inputPort": "summaryCandidates",
                "outputPort": "topCandidates",
                "sourceWidgetType": "priority_slider"
              }
            ]
          }
        ],
        "description": "stage_summaryでこれまでの成果（アイデアリスト、感情メモ、マトリクス位置、決定）をまとめ、次のアクション（具体的タスクと期限）を設定する。ユーザーが迷わず着手できる状態を作る。",
        "estimatedDuration": 300
      },
      "converge": {
        "target": "着手すべき具体的な副業案とその優先度、初期アクション",
        "purpose": "候補を絞り込み、実行可能な最初の1〜2案と優先アクションを決める",
        "widgets": [
          {
            "order": 0,
            "purpose": "候補の優先順位を数値で決め、最初に取り組む案を絞るため",
            "widgetId": "priority_slider",
            "suggestedConfig": {
              "criteria": [
                "期待収益",
                "実現しやすさ",
                "個人の興味"
              ],
              "scaleMax": 10,
              "scaleMin": 1,
              "autoSuggestFromMatrix": true
            },
            "suggestedBindings": [
              {
                "inputPort": "candidates",
                "outputPort": "plottedItems",
                "sourceWidgetType": "matrix_sort"
              }
            ]
          },
          {
            "order": 1,
            "purpose": "複数基準を天秤にかけて最終決定を支援するため",
            "widgetId": "decision_balance",
            "suggestedConfig": {
              "leftLabel": "短期着手に適した案",
              "rightLabel": "長期リターン重視の案",
              "weightableCriteria": [
                "初期コスト",
                "時間投下",
                "成長可能性"
              ]
            },
            "suggestedBindings": [
              {
                "inputPort": "options",
                "outputPort": "rankedList",
                "sourceWidgetType": "priority_slider"
              }
            ]
          }
        ],
        "description": "matrix_sortの可視化とemotion_checkの感情スコアを踏まえ、priority_sliderで定量的に順位付けし、decision_balanceで最終判断（短期実行 vs 長期投資）を行う。ここで具体的な最初のタスクを決定する。",
        "estimatedDuration": 300
      },
      "organize": {
        "target": "多数の案を見やすく分類し、比較可能な構造に変えること",
        "purpose": "発散したアイデアを意味あるカテゴリと評価軸で整理する",
        "widgets": [
          {
            "order": 0,
            "purpose": "出したアイデアをカテゴリ別に整理して構造を作るため",
            "widgetId": "card_sort",
            "suggestedConfig": {
              "columns": [
                "スキル型",
                "時間型",
                "資本型",
                "趣味型",
                "その他"
              ],
              "compactView": false,
              "allowReassign": true
            },
            "suggestedBindings": [
              {
                "inputPort": "cards",
                "outputPort": "items",
                "sourceWidgetType": "brainstorm_list"
              }
            ]
          },
          {
            "order": 1,
            "purpose": "重要度（期待収益）と実現しやすさ（時間/コスト）でマッピングするため",
            "widgetId": "matrix_sort",
            "suggestedConfig": {
              "xLabel": "実現しやすさ",
              "yLabel": "期待収益/インパクト",
              "snapToGrid": true,
              "defaultScale": 5
            },
            "suggestedBindings": [
              {
                "inputPort": "items",
                "outputPort": "groupedCards",
                "sourceWidgetType": "card_sort"
              },
              {
                "inputPort": "contextScores",
                "outputPort": "scoredEmotions",
                "sourceWidgetType": "emotion_check"
              }
            ]
          }
        ],
        "description": "card_sortで性質別に分け、matrix_sortで実現性と収益性の観点から可視化する。これにより次段階の優先付けがしやすくなる。",
        "estimatedDuration": 300
      }
    },
    "version": "4.0",
    "metadata": {
      "llmModel": "gemini-2.5-flash-lite",
      "generatedAt": 1765405890845,
      "bottleneckType": "{{bottleneckType}}"
    },
    "rationale": "ユーザーは副業を始めたいがアイデア整理ができていないという課題で、発散→整理→収束→まとめの順で段階的に進めるのが適切。divergeでは量を出して感情的障壁も可視化するwidgetを、organizeではカテゴリ分けと実現性×収益のマトリクスで構造化するwidgetを、convergeでは優先度付けと意思決定支援widgetで具体的案を絞り、summaryで実行可能なタスクに落とし込むためsummary系widgetを配置した。各widgetは診断されたボトルネック種別に合うmetadata.bottleneckを参照して選定している（発散系は発想欠如、整理系は構造化不足、収束系は優先付け不足に対応）。また各ステージの合計complexityが過度にならないよう控えめな組合せとし、timingとversatilityも考慮して汎用性の高いものを中心に選んだ。",
    "flowDescription": "1) diverge: brainstorm_listでアイデアを量出し、emotion_checkで各案に対する感情や不安を記録。 2) organize: card_sortで性質ごとに分類し、matrix_sortで実現しやすさと期待収益で可視化。 3) converge: matrixの結果をpriority_sliderで数値化して優先順位を付け、decision_balanceで短期/長期の観点から最終案を決定。 4) summary: stage_summaryで決定内容・感情メモ・上位候補・具体的な次アクション（期限と必要リソース）をまとめ、すぐ着手できる計画を提示する。",
    "totalEstimatedDuration": 1200
  }
}