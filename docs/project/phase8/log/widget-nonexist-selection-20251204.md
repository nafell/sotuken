{
  "stages": {
    "diverge": {
      "target": "研究への没頭が生み出すポジティブな側面、ネガティブな側面、具体的な状況、およびそれに伴う感情。",
      "purpose": "ユーザーの悩みである「研究活動への過度な没頭と自己管理の欠如」に対し、まず関連する思考、感情、具体的な行動を自由に発散させ、問題の全体像を表面化させる。",
      "widgets": [
        {
          "order": 0,
          "purpose": "ユーザーの「研究活動が楽しすぎて寝食を忘れる」という現状について、頭の中にある漠然とした思考や感情を制限なく書き出し、外部化する。思考の堰き止めを解消し、言語化の足がかりとする。",
          "widgetId": "free_writing",
          "suggestedConfig": {
            "prompt": "研究活動の楽しさ、没頭する状況、寝食を忘れた時の感覚、そしてその後に感じることについて、自由に書き出してください。",
            "timerDuration": 300
          },
          "suggestedBindings": []
        },
        {
          "order": 1,
          "purpose": "フリーライティングで書き出した内容の中から、特にキーワードとなる事柄（研究の魅力、寝食を忘れる具体的な行動、身体的・精神的影響など）をカードとして抽出し、視覚的に洗い出してアイデアを広げる。",
          "widgetId": "brainstorm_cards",
          "suggestedConfig": {
            "initialCards": []
          },
          "suggestedBindings": []
        }
      ],
      "description": "タイマー付きのフリーライティングで頭の中の情報を全て吐き出し、次にその中から気になる事柄をカードとして視覚的に整理・追加することで、問題の要素を洗い出し、思考の広がりを促します。",
      "estimatedDuration": 450
    },
    "summary": {
      "target": "思考整理プロセスの主要な成果、洞察、次の行動ステップ。",
      "purpose": "一連の思考整理プロセス全体を振り返り、重要な発見や決定事項、具体的な行動計画を統合して確認する。今後の行動へのモチベーションと方向性を明確にする。",
      "widgets": [
        {
          "order": 0,
          "purpose": "これまでの発散、整理、収束の各ステージでどのような思考整理プロセスを経て、どのような情報が集まり、どのような決定がなされたかを簡潔に振り返り、全体像を把握する。",
          "widgetId": "stage_summary",
          "suggestedConfig": {},
          "suggestedBindings": [
            {
              "inputPort": "previousStages",
              "outputPort": "stageResults",
              "sourceWidgetType": "all"
            }
          ]
        },
        {
          "order": 1,
          "purpose": "全ステージを通して得られた主要な洞察、意思決定結果、具体的なアクション計画などを構造化された形で表示し、ユーザーが内容を深く理解し、今後の行動に活かせるようにする。",
          "widgetId": "summary_view",
          "suggestedConfig": {},
          "suggestedBindings": [
            {
              "inputPort": "stageResults",
              "outputPort": "stageResults",
              "sourceWidgetType": "all"
            }
          ]
        }
      ],
      "description": "これまでの各ステージの操作内容を要約し、その上で全体の思考整理プロセスから得られた結論、意思決定、そして具体的な行動計画を一つのビューで確認することで、学びと実践への準備を整えます。",
      "estimatedDuration": 300
    },
    "converge": {
      "target": "課題解決のための明確な意思決定と、具体的な行動計画。",
      "purpose": "整理ステージで明確になった課題と優先順位に基づき、具体的な行動への意思決定を行い、実行可能な計画を策定する。思考の停滞を解消し、行動への移行を促進する。",
      "widgets": [
        {
          "order": 0,
          "purpose": "研究への没頭を続けることと、生活習慣を見直すことのそれぞれのメリット・デメリットを比較し、天秤のバランスを視覚化することで、より健全な選択肢への意思決定をサポートする。",
          "widgetId": "decision_balance",
          "suggestedConfig": {
            "leftSideLabel": "研究に没頭し続ける",
            "rightSideLabel": "自己管理（生活習慣の改善）を優先する"
          },
          "suggestedBindings": []
        },
        {
          "order": 1,
          "purpose": "意思決定バランスで導き出された結論に基づき、具体的な行動計画をカード形式で作成する。「いつ、何を、どのように」行うかを明確にし、実行可能なタスクとして落とし込む。",
          "widgetId": "action_cards",
          "suggestedConfig": {},
          "suggestedBindings": []
        }
      ],
      "description": "研究活動と自己管理という二項対立のメリット・デメリットを比較し、最適なバランスを見つけます。その上で、具体的なアクションカードを作成し、決定事項を実行可能な計画に落とし込みます。",
      "estimatedDuration": 600
    },
    "organize": {
      "target": "問題の要素間の関係性、重要性、パターン。",
      "purpose": "発散ステージで洗い出された情報（研究のメリット、生活への影響、自己管理の課題、対策案など）を分類・構造化し、問題の本質と優先順位を明確にする。漠然とした思考に秩序を与える。",
      "widgets": [
        {
          "order": 0,
          "purpose": "発散フェーズで抽出したカードを「研究のメリット」「生活への影響（デメリット）」「自己管理の課題」「考えられる対策」といったカテゴリに分類し、問題の要素を構造化して理解を深める。",
          "widgetId": "card_sorting",
          "suggestedConfig": {
            "initialCategories": [
              {
                "id": "research_benefits",
                "name": "研究のポジティブな側面"
              },
              {
                "id": "life_impacts",
                "name": "生活への影響（デメリット）"
              },
              {
                "id": "self_management_issues",
                "name": "自己管理の課題"
              },
              {
                "id": "potential_solutions",
                "name": "考えられる対策"
              }
            ]
          },
          "suggestedBindings": [
            {
              "inputPort": "cards",
              "outputPort": "cards",
              "sourceWidgetType": "brainstorm_cards"
            }
          ]
        },
        {
          "order": 1,
          "purpose": "分類された「生活への影響」や「自己管理の課題」のカードを、『緊急度』と『重要度』の2軸マトリクスに配置することで、対処すべき問題の優先順位を視覚的に特定する。",
          "widgetId": "matrix_placement",
          "suggestedConfig": {
            "axisLabels": {
              "xAxis": {
                "low": "緊急度が低い",
                "high": "緊急度が高い"
              },
              "yAxis": {
                "low": "重要度が低い",
                "high": "重要度が高い"
              }
            }
          },
          "suggestedBindings": [
            {
              "inputPort": "items",
              "outputPort": "categories",
              "sourceWidgetType": "card_sorting"
            }
          ]
        }
      ],
      "description": "ブレインストームカードから連携された要素をカテゴリに分類し、次にその中から課題や対策を『緊急度』と『重要度』のマトリクスに配置することで、問題の全体像と具体的な対処ポイントを可視化します。",
      "estimatedDuration": 600
    }
  },
  "version": "4.0",
  "metadata": {
    "llmModel": "gemini-2.5-flash",
    "sessionId": "4ab37af6-dbca-4c19-af73-66e46d3077cc",
    "generatedAt": 1764744340402,
    "bottleneckType": "thought"
  },
  "rationale": "ユーザーの悩み「研究活動が楽しすぎて夢中になるあまり寝食を忘れてしまう」に対し、診断されたボトルネック種別が『thought（思考）』であることから、思考を外部化し、整理し、意思決定と行動に繋げるCBTベースのフローを構築しました。\n\n**Diverge:** 漠然とした思考や感情を自由に書き出し、具体化することで問題の要素を洗い出す段階です。フリーライティングとブレインストームカードで思考の可視化を促します。\n**Organize:** 洗い出した要素を分類・構造化し、問題の全体像と優先順位を明確にする段階です。カードソートで情報を整理し、マトリクス配置で重要度を評価します。特に『研究活動』と『自己管理』のバランスという課題に対し、優先順位付けは重要です。\n**Converge:** 整理された情報に基づいて、具体的な意思決定と行動計画を立てる段階です。意思決定バランスで二つの選択肢（研究没頭 vs 自己管理）のメリット・デメリットを比較検討し、アクションカードで具体的な行動ステップへと落とし込みます。これにより、思考が行き詰まることなく、具体的な解決策へと繋がります。\n**Summary:** 全プロセスを振り返り、得られた結論と行動計画を確認する最終段階です。ステージサマリーとサマリービューで、これまでの思考整理の成果を統合的に把握し、行動への意識付けを行います。\n\n各ステージのWidget選定は、ボトルネック種別『thought』に強く適合し、complexityは『organize』ステージでやや高めですが、問題の性質上、整理・優先順位付けが重要であるため、許容範囲と判断しました。全体を通して、ユーザーが自身の思考パターンを理解し、具体的な行動変容へと繋がるように設計されています。",
  "flowDescription": "この思考整理フローは、まず『diverge』ステージで、研究活動への没頭とそれに伴う自己管理の課題について、心の中にある思考や感情を全て外部に発散させます。次に、『organize』ステージで、発散された様々な要素を分類し、問題点や解決策のアイデアを構造的に整理し、優先順位を明確にします。これにより、漠然とした悩みが具体的な課題として認識されます。続いて、『converge』ステージでは、研究への集中と自己管理のバランスに関する意思決定を支援し、具体的な行動計画を策定します。最後に、『summary』ステージで、これまでのプロセス全体を振り返り、得られた洞察と決定事項、行動計画を再確認することで、ユーザーが次のステップへ自信を持って進めるよう促します。",
  "totalEstimatedDuration": 1950
}