
あなたはCBTベースの思考整理アプリのWidget選定AIです。
ユーザーの悩みとボトルネック種別に基づいて、4ステージ分のWidgetを選定してください。

## ユーザーの悩み
引越し先を検討中。候補地の長所短所を分類してから、最終的にトレードオフを比較したい

## 診断されたボトルネック種別
thought

## 利用可能なWidget
[
  {
    \"id\": \"emotion_palette\",
    \"name\": \"感情パレット\",
    \"description\": \"感情をカラーパレットから選択し、強度を調整する。\",
    \"stage\": \"diverge\",
    \"metadata\": {
      \"timing\": 0.15,
      \"versatility\": 0.6,
      \"complexity\": 0.3,
      \"bottleneck\": [
        \"emotion\",
        \"feeling\",
        \"mood\"
      ]
    },
    \"ports\": {
      \"inputs\": [],
      \"outputs\": [
        {
          \"id\": \"selectedEmotions\",
          \"dataType\": \"object[]\",
          \"description\": \"選択された感情リスト {emotion: string, intensity: number}\"
        },
        {
          \"id\": \"dominantEmotion\",
          \"dataType\": \"string\",
          \"description\": \"最も強い感情\"
        }
      ]
    }
  },
  {
    \"id\": \"brainstorm_cards\",
    \"name\": \"ブレインストームカード\",
    \"description\": \"自由にアイデアをカードとして追加し、視覚的に整理する。\",
    \"stage\": \"diverge\",
    \"metadata\": {
      \"timing\": 0.1,
      \"versatility\": 0.95,
      \"complexity\": 0.2,
      \"bottleneck\": [
        \"ideation\",
        \"brainstorm\",
        \"collection\"
      ]
    },
    \"ports\": {
      \"inputs\": [],
      \"outputs\": [
        {
          \"id\": \"cards\",
          \"dataType\": \"object[]\",
          \"description\": \"カードリスト {id: string, text: string, color?: string}\"
        },
        {
          \"id\": \"cardCount\",
          \"dataType\": \"number\",
          \"description\": \"カードの総数\"
        }
      ]
    }
  },
  {
    \"id\": \"mind_map\",
    \"name\": \"マインドマップ\",
    \"description\": \"中心トピックから放射状にアイデアを展開。\",
    \"stage\": \"diverge\",
    \"metadata\": {
      \"timing\": 0.2,
      \"versatility\": 0.9,
      \"complexity\": 0.5,
      \"bottleneck\": [
        \"ideation\",
        \"association\",
        \"exploration\"
      ]
    },
    \"ports\": {
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
  },
  {
    \"id\": \"question_card_chain\",
    \"name\": \"質問カードチェーン\",
    \"description\": \"質問に対する回答を連鎖的に記録し、思考の流れを可視化。\",
    \"stage\": \"diverge\",
    \"metadata\": {
      \"timing\": 0.2,
      \"versatility\": 0.8,
      \"complexity\": 0.3,
      \"bottleneck\": [
        \"exploration\",
        \"questioning\",
        \"deep-dive\"
      ]
    },
    \"ports\": {
      \"inputs\": [
        {
          \"id\": \"questions\",
          \"dataType\": \"string[]\",
          \"description\": \"提示する質問リスト\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"answers\",
          \"dataType\": \"object[]\",
          \"description\": \"回答リスト {questionId: string, answer: string}\"
        },
        {
          \"id\": \"completedCount\",
          \"dataType\": \"number\",
          \"description\": \"回答済みの質問数\"
        }
      ]
    }
  },
  {
    \"id\": \"card_sorting\",
    \"name\": \"カードソート\",
    \"description\": \"カードをカテゴリにドラッグ&ドロップで分類。\",
    \"stage\": \"organize\",
    \"metadata\": {
      \"timing\": 0.35,
      \"versatility\": 0.85,
      \"complexity\": 0.4,
      \"bottleneck\": [
        \"categorization\",
        \"grouping\",
        \"classification\"
      ]
    },
    \"ports\": {
      \"inputs\": [
        {
          \"id\": \"cards\",
          \"dataType\": \"object[]\",
          \"description\": \"ソートするカードリスト\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"categories\",
          \"dataType\": \"object\",
          \"description\": \"カテゴリごとのカード配置\"
        },
        {
          \"id\": \"uncategorized\",
          \"dataType\": \"object[]\",
          \"description\": \"未分類のカード\"
        }
      ]
    }
  },
  {
    \"id\": \"matrix_placement\",
    \"name\": \"マトリクス配置\",
    \"description\": \"2軸のマトリクス上にアイテムを配置し、位置関係を可視化。\",
    \"stage\": \"organize\",
    \"metadata\": {
      \"timing\": 0.5,
      \"versatility\": 0.85,
      \"complexity\": 0.5,
      \"bottleneck\": [
        \"prioritization\",
        \"comparison\",
        \"positioning\"
      ]
    },
    \"ports\": {
      \"inputs\": [
        {
          \"id\": \"items\",
          \"dataType\": \"object[]\",
          \"description\": \"配置するアイテムリスト\",
          \"required\": false
        },
        {
          \"id\": \"axisLabels\",
          \"dataType\": \"object\",
          \"description\": \"軸のラベル {xAxis: {low: string, high: string}, yAxis: {low: string, high: string}}\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"placements\",
          \"dataType\": \"object[]\",
          \"description\": \"アイテムの配置情報 {id: string, x: number, y: number}\"
        },
        {
          \"id\": \"quadrantCounts\",
          \"dataType\": \"object\",
          \"description\": \"各象限のアイテム数\"
        }
      ]
    }
  },
  {
    \"id\": \"dependency_mapping\",
    \"name\": \"依存関係マップ\",
    \"description\": \"タスクや要素間の依存関係をノードとエッジで可視化。クリティカルパスや循環依存を自動検出。\",
    \"stage\": \"organize\",
    \"metadata\": {
      \"timing\": 0.4,
      \"versatility\": 0.8,
      \"complexity\": 0.7,
      \"bottleneck\": [
        \"dependency\",
        \"sequence\",
        \"blocking\",
        \"ordering\"
      ]
    },
    \"ports\": {
      \"inputs\": [
        {
          \"id\": \"nodes\",
          \"dataType\": \"object[]\",
          \"description\": \"ノードリスト。各ノードは {id: string, label: string, x?: number, y?: number} の形式。\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"edges\",
          \"dataType\": \"object[]\",
          \"description\": \"接続エッジリスト。各エッジは {sourceId: string, targetId: string, type: string} の形式。\"
        },
        {
          \"id\": \"criticalPath\",
          \"dataType\": \"string[]\",
          \"description\": \"クリティカルパス（最長依存チェーン）のノードID配列\"
        },
        {
          \"id\": \"hasLoop\",
          \"dataType\": \"boolean\",
          \"description\": \"循環依存が存在するかどうか\"
        }
      ]
    }
  },
  {
    \"id\": \"swot_analysis\",
    \"name\": \"SWOT分析\",
    \"description\": \"強み(Strengths)・弱み(Weaknesses)・機会(Opportunities)・脅威(Threats)の4象限で状況を整理。\",
    \"stage\": \"organize\",
    \"metadata\": {
      \"timing\": 0.3,
      \"versatility\": 0.9,
      \"complexity\": 0.6,
      \"bottleneck\": [
        \"analysis\",
        \"categorization\",
        \"evaluation\",
        \"strategy\"
      ]
    },
    \"ports\": {
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
    }
  },
  {
    \"id\": \"timeline_slider\",
    \"name\": \"タイムラインスライダー\",
    \"description\": \"時間軸に沿ってイベントや計画を配置。\",
    \"stage\": \"organize\",
    \"metadata\": {
      \"timing\": 0.5,
      \"versatility\": 0.7,
      \"complexity\": 0.4,
      \"bottleneck\": [
        \"planning\",
        \"scheduling\",
        \"timeline\"
      ]
    },
    \"ports\": {
      \"inputs\": [
        {
          \"id\": \"events\",
          \"dataType\": \"object[]\",
          \"description\": \"イベントリスト\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"timeline\",
          \"dataType\": \"object[]\",
          \"description\": \"時系列に並んだイベント\"
        },
        {
          \"id\": \"currentPosition\",
          \"dataType\": \"number\",
          \"description\": \"現在のスライダー位置\"
        }
      ]
    }
  },
  {
    \"id\": \"priority_slider_grid\",
    \"name\": \"優先度スライダー\",
    \"description\": \"複数の項目に対してスライダーで優先度を設定。\",
    \"stage\": \"converge\",
    \"metadata\": {
      \"timing\": 0.7,
      \"versatility\": 0.75,
      \"complexity\": 0.3,
      \"bottleneck\": [
        \"prioritization\",
        \"ranking\",
        \"scoring\"
      ]
    },
    \"ports\": {
      \"inputs\": [
        {
          \"id\": \"items\",
          \"dataType\": \"object[]\",
          \"description\": \"優先度を設定する項目リスト\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"priorities\",
          \"dataType\": \"object[]\",
          \"description\": \"優先度情報 {id: string, label: string, priority: number}\"
        },
        {
          \"id\": \"ranking\",
          \"dataType\": \"string[]\",
          \"description\": \"優先度順のID配列\"
        }
      ]
    }
  },
  {
    \"id\": \"tradeoff_balance\",
    \"name\": \"トレードオフ天秤\",
    \"description\": \"複数の選択肢を重み付けし、バランスを視覚的に表示。天秤のメタファーで直感的に比較可能。\",
    \"stage\": \"converge\",
    \"metadata\": {
      \"timing\": 0.6,
      \"versatility\": 0.7,
      \"complexity\": 0.5,
      \"bottleneck\": [
        \"comparison\",
        \"decision\",
        \"tradeoff\"
      ]
    },
    \"ports\": {
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
  },
  {
    \"id\": \"structured_summary\",
    \"name\": \"構造化サマリー\",
    \"description\": \"入力された情報を構造化して要約表示。\",
    \"stage\": \"summary\",
    \"metadata\": {
      \"timing\": 0.9,
      \"versatility\": 0.6,
      \"complexity\": 0.2,
      \"bottleneck\": [
        \"summary\",
        \"conclusion\",
        \"synthesis\"
      ]
    },
    \"ports\": {
      \"inputs\": [
        {
          \"id\": \"data\",
          \"dataType\": \"object\",
          \"description\": \"要約対象のデータ\",
          \"required\": false
        }
      ],
      \"outputs\": [
        {
          \"id\": \"summary\",
          \"dataType\": \"string\",
          \"description\": \"生成されたサマリーテキスト\"
        },
        {
          \"id\": \"keyPoints\",
          \"dataType\": \"string[]\",
          \"description\": \"主要ポイントのリスト\"
        }
      ]
    }
  }
]

## タスク
4つのステージ（diverge, organize, converge, summary）それぞれに最適なWidgetを選定してください。

### 各ステージの役割
- **diverge**: 発散フェーズ。アイデア・感情・考えを広げる。ブレインストーミング、感情の洗い出しなど。
- **organize**: 整理フェーズ。発散した要素を分類・構造化する。カード分類、マトリクス配置など。
- **converge**: 収束フェーズ。優先順位付け、決断、アクション化。スライダー、決断バランスなど。
- **summary**: まとめフェーズ。整理結果のレビューと次のステップ確認。

### 選定時の考慮事項
1. **ボトルネック種別との適合性**: Widget定義のmetadata.bottleneck値を参照
2. **ステージとの適合性**: Widget定義のstage値を参照
3. **complexity値**: 1ステージあたりの総complexityが0.8以下が望ましい
4. **timing値**: ステージ順序との整合性（early→middle→late）
5. **versatility値**: 汎用性の高いWidgetは多くの場面で有効

### 制約
- 各ステージに最低1つ、最大3つのWidgetを選定
- 同一Widget種別は1ステージにつき1回まで
- summary ステージには summary_view または stage_summary を含める

## 出力形式
以下のJSON形式で出力してください：

```json
{
  \"version\": \"4.0\",
  \"stages\": {
    \"diverge\": {
      \"widgets\": [
        {
          \"widgetId\": \"Widget種別ID\",
          \"purpose\": \"このWidgetを選んだ目的\",
          \"order\": 0,
          \"suggestedConfig\": {
            \"任意の設定キー\": \"値\"
          },
          \"suggestedBindings\": [
            {
              \"sourceWidgetType\": \"前Widgetの種別\",
              \"outputPort\": \"出力ポートID\",
              \"inputPort\": \"入力ポートID\"
            }
          ]
        }
      ],
      \"purpose\": \"このステージの目的\",
      \"target\": \"ユーザーの悩みに対してこのステージで取り組む対象\",
      \"description\": \"このステージでの具体的なアプローチ\",
      \"estimatedDuration\": 300
    },
    \"organize\": { ... },
    \"converge\": { ... },
    \"summary\": { ... }
  },
  \"rationale\": \"全体的な選定理由\",
  \"flowDescription\": \"4ステージを通じた思考整理フローの説明\",
  \"totalEstimatedDuration\": 1200,
}
```
