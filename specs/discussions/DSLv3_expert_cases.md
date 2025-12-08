## W2WR テストケース設計（6ケース版）

このドキュメントは、LLMがWidget-to-Widget Reactivity (W2WR) を正確に設定できるかを検証するためのテストケース設計を記述します。

### 設計原則

1. **6ケースに削減** - 効率的な評価
2. **正確性+多様性** - 様々なwidget組み合わせとrelationshipタイプを網羅
3. **実在するwidgetIDとportIDのみ使用**
4. **低〜中complexity widgetの組み合わせ**（0.5以下推奨）

---

## Case 1: ベースライン（W2WRなし）

**検証目的**: W2WRなしの基本UIフロー生成

**ユーザーの悩み**:
「副業を始めたいが、何から手をつければいいか分からない。アイデアはいくつかあるが整理できていない」

**想定ボトルネック**: unorganized_info, cannot_start

**期待されるUIフロー**:
```
Stage 1（発散）:
- brainstorm_cards
  → 副業アイデアを自由に書き出す

Stage 2（整理）:
- card_sorting
  → アイデアをカテゴリ別に分類

Stage 3（収束）:
- matrix_placement
  → 実現可能性×興味度で優先順位を可視化
```

**Widget-to-Widget Reactivity**: なし

**評価基準**:
- 適切なwidget選択
- ステージ遷移の論理性
- W2WRが不要な場合に生成しないこと

---

## Case 2: Passthrough W2WR（最も単純）

**検証目的**: passthrough relationship の正確な生成

**ユーザーの悩み**:
「転職活動中。候補企業をリストアップしたが、分類して整理したい」

**想定ボトルネック**: unorganized_info

**期待されるUIフロー**:
```
Stage 1（発散）:
- brainstorm_cards
  → 候補企業をカードとして書き出す

Stage 2（整理）:
- card_sorting
  → 企業を業界・条件別に分類

Stage 3（収束）:
- priority_slider_grid
  → 分類結果をもとに優先度を設定
```

**Widget-to-Widget Reactivity**:
```json
{
  "source": "brainstorm_cards.cards",
  "target": "card_sorting.cards",
  "relationship": { "type": "passthrough" },
  "updateMode": "realtime"
}
```

**評価基準**:
- source/target portの正確性
- passthrough relationshipの適切な選択
- updateMode: realtimeの設定

---

## Case 3: JavaScript Transform W2WR

**検証目的**: javascript relationship（データ変換）の生成

**ユーザーの悩み**:
「感情的に仕事のストレスを整理したい。今の気持ちを可視化してから優先度を決めたい」

**想定ボトルネック**: emotional_block, cannot_prioritize

**期待されるUIフロー**:
```
Stage 1（発散）:
- emotion_palette
  → 現在の感情を色と強度で可視化

Stage 2（整理）:
- card_sorting
  → 感情に関連するストレス要因を分類

Stage 3（収束）:
- priority_slider_grid
  → 感情の強度に基づいて対処優先度を設定
```

**Widget-to-Widget Reactivity**:
```json
{
  "source": "emotion_palette.selectedEmotions",
  "target": "priority_slider_grid.items",
  "relationship": {
    "type": "javascript",
    "javascript": "source.map(e => ({id: e.emotion, label: e.emotion, priority: e.intensity}))"
  },
  "updateMode": "realtime"
}
```

**評価基準**:
- javascript relationshipの適切な生成
- データ変換ロジックの妥当性
- emotion → priority_itemのデータ型マッピング

---

## Case 4: 中複雑度Widget間のW2WR（debounced）

**検証目的**: complexity 0.5のwidget間連携、debounced updateMode

**ユーザーの悩み**:
「人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい」

**想定ボトルネック**: unorganized_info, cannot_prioritize

**期待されるUIフロー**:
```
Stage 1（発散）:
- mind_map
  → 人生の選択肢を放射状に展開

Stage 2（整理）:
- matrix_placement
  → 選択肢を重要度×実現可能性の2軸で配置

Stage 3（収束）:
- priority_slider_grid
  → 配置結果をもとに優先度を調整
```

**Widget-to-Widget Reactivity**:
```json
{
  "source": "mind_map.nodes",
  "target": "matrix_placement.items",
  "relationship": {
    "type": "javascript",
    "javascript": "source.map(n => ({id: n.id, text: n.label, x: 50, y: 50}))"
  },
  "updateMode": "debounced",
  "debounceMs": 300
}
```

**評価基準**:
- updateMode: debouncedの適切な選択
- debounceMs設定の有無
- 中複雑度widget間のデータ変換

---

## Case 5: Converge WidgetへのW2WR

**検証目的**: organize → converge ステージ間連携

**ユーザーの悩み**:
「引越し先を検討中。候補地の長所短所を分類してから、最終的にトレードオフを比較したい」

**想定ボトルネック**: cannot_prioritize, fear_of_decision

**期待されるUIフロー**:
```
Stage 1（発散）:
- brainstorm_cards
  → 候補地のメリット・デメリットを書き出す

Stage 2（整理）:
- card_sorting
  → メリット/デメリットにカテゴリ分け

Stage 3（収束）:
- tradeoff_balance
  → 分類結果を天秤で比較
```

**Widget-to-Widget Reactivity**:
```json
{
  "source": "card_sorting.categories",
  "target": "tradeoff_balance.items",
  "relationship": {
    "type": "javascript",
    "javascript": "Object.entries(source).flatMap(([cat, items]) => items.map(i => ({text: i.text, side: cat === 'メリット' ? 'left' : 'right'})))"
  },
  "updateMode": "realtime"
}
```

**評価基準**:
- organize → converge ステージ間連携
- カテゴリ→side変換の論理性
- tradeoff_balanceのitems形式への適合

---

## Case 6: Timeline連携W2WR

**検証目的**: 時系列データへの変換

**ユーザーの悩み**:
「プロジェクトのタスクを洗い出した。これを時系列に並べて計画を立てたい」

**想定ボトルネック**: unorganized_info

**期待されるUIフロー**:
```
Stage 1（発散）:
- brainstorm_cards
  → プロジェクトタスクを書き出す

Stage 2（整理）:
- timeline_slider
  → タスクを時系列に配置

Stage 3（収束）:
- priority_slider_grid
  → タスクの優先度を調整
```

**Widget-to-Widget Reactivity**:
```json
{
  "source": "brainstorm_cards.cards",
  "target": "timeline_slider.events",
  "relationship": {
    "type": "javascript",
    "javascript": "source.map((c, i) => ({id: c.id, label: c.text, position: i * 10}))"
  },
  "updateMode": "realtime"
}
```

**評価基準**:
- cards → events変換の妥当性
- position計算ロジック
- timeline_sliderのevents形式への適合

---

## W2WRパターン網羅性

| パターン | Case | Widgets | Relationship | UpdateMode |
|---------|------|---------|--------------|------------|
| W2WRなし | 1 | brainstorm → card_sorting → matrix | - | - |
| passthrough | 2 | brainstorm → card_sorting | passthrough | realtime |
| javascript (simple) | 3 | emotion → priority | javascript | realtime |
| javascript (debounced) | 4 | mind_map → matrix | javascript | debounced |
| javascript (category) | 5 | card_sorting → tradeoff | javascript | realtime |
| javascript (timeline) | 6 | brainstorm → timeline | javascript | realtime |

**網羅項目**:
- ✅ W2WRなしケース（Case 1）
- ✅ passthrough relationship（Case 2）
- ✅ javascript relationship（Case 3-6）
- ✅ realtime updateMode（Case 2, 3, 5, 6）
- ✅ debounced updateMode（Case 4）
- ✅ diverge → organize 連携（Case 2, 4, 6）
- ✅ organize → converge 連携（Case 5）
- ✅ 低complexity widget（0.2-0.3）
- ✅ 中complexity widget（0.4-0.5）

---

## 使用Widget一覧（complexity順）

| Widget ID | Stage | Complexity | Output Ports |
|-----------|-------|------------|--------------|
| brainstorm_cards | diverge | 0.2 | cards, cardCount |
| emotion_palette | diverge | 0.3 | selectedEmotions, dominantEmotion |
| priority_slider_grid | converge | 0.3 | priorities, ranking |
| card_sorting | organize | 0.4 | categories, uncategorized |
| timeline_slider | organize | 0.4 | timeline, currentPosition |
| mind_map | diverge | 0.5 | nodes, connections, depth |
| matrix_placement | organize | 0.5 | placements, quadrantCounts |
| tradeoff_balance | converge | 0.5 | balance, direction, recommendation |

**注**: dependency_mapping (0.7)、swot_analysis (0.6) は高complexityのため、本テストケースでは使用していません。
