# 50テストケースコーパス設計書

## 1. 概要

本設計書は、バッチ実験用の50テストケースコーパスを作成するための仕様を定義する。

**目的:**
- Layer1（構造健全性）とLayer4（実用性）の自動評価実験
- 5モデル構成 × 50入力 = 250試行の定量比較
- Widget-to-Widget Reactivity (W2WR) 生成の複雑度バリエーション検証

---

## 2. 既存6ケースの概要

| ID | タイトル | W2WR有無 | 複雑度 | W2WRパターン |
|----|---------|----------|--------|-------------|
| case_01 | ベースライン | なし | simple | - |
| case_02 | Passthrough | あり | simple | passthrough |
| case_03 | JavaScript Transform | あり | simple | javascript (単純map) |
| case_04 | Debounced | あり | medium | javascript + debounced |
| case_05 | Category Transform | あり | medium | javascript (Object.entries) |
| case_06 | Timeline Transform | あり | simple | javascript (index計算) |

---

## 3. 50ケース分布設計

### 3.1 W2WR複雑度カテゴリ（均等分布: 各10件）

| カテゴリ | W2WR有無 | 件数 | case ID範囲 | 概要 |
|---------|----------|------|-------------|------|
| **A: No W2WR** | なし | 10件 | case_01, 07-15 | W2WR不要のベースライン |
| **B: Passthrough** | あり (単純) | 10件 | case_02, 16-24 | データ通過のみ |
| **C: JavaScript単純** | あり (単純変換) | 10件 | case_03, 06, 25-32 | 単純map/filter |
| **D: JavaScript複合** | あり (中程度) | 10件 | case_04, 05, 33-40 | 複合変換+debounced |
| **E: 複数Binding** | あり (複雑) | 10件 | case_41-50 | 2-3 Binding連鎖 |

**注:** 既存6ケースは該当カテゴリにカウント済み。新規44ケース (case_07〜50) を追加

### 3.2 悩みテキスト長バリエーション

| 長さカテゴリ | 文字数目安 | 件数 | 特徴 |
|-------------|-----------|------|------|
| **短文** | 20-50文字 | 10件 | 1文、核心のみ |
| **中文** | 51-120文字 | 25件 | 2-3文、状況説明付き |
| **長文** | 121-300文字 | 15件 | 3段落相当、詳細な背景 |

### 3.3 具体-曖昧スペクトラム

| 具体度 | 件数 | 特徴 | 例 |
|--------|------|------|-----|
| **具体的** | 15件 | 数値・期日・固有名詞あり | "3ヶ月後の転職", "TOEIC800点" |
| **中程度** | 20件 | 状況は明確だが数値なし | "キャリアに不安" |
| **曖昧** | 15件 | モヤモヤ系、感情的 | "なんとなく違う気がする" |

---

## 4. ボトルネックタイプ分布

8種類のボトルネックを均等に分布させる（各6-7件）:

| ボトルネックタイプ | 日本語名 | 想定件数 |
|------------------|---------|---------|
| too_many_options | 選択肢過多 | 6件 |
| emotional_block | 感情的ブロック | 6件 |
| multiple_issues | 複数問題絡み合い | 6件 |
| dont_know_where_to_start | 始め方不明 | 7件 |
| cannot_prioritize | 優先順位つけられない | 6件 |
| fear_of_decision | 決断への恐れ | 6件 |
| unorganized_info | 情報未整理 | 7件 |
| fixed_perspective | 視点固定 | 6件 |

---

## 5. カテゴリ（悩みの分野）分布

| カテゴリ | 件数 | 例 |
|---------|------|-----|
| キャリア | 10件 | 転職、副業、スキルアップ |
| 人間関係 | 8件 | 職場、家族、友人 |
| 生活 | 8件 | 引越し、買い物、習慣 |
| メンタルヘルス | 6件 | ストレス、不安、感情整理 |
| 仕事 | 8件 | プロジェクト、タスク管理 |
| 学習・自己啓発 | 5件 | 資格、勉強計画 |
| 人生選択 | 5件 | ライフプラン、重要な決断 |

---

## 6. Widget組み合わせパターン

### 6.1 使用可能Widget（11種、stage_summary除外）

**Diverge (4種):**
- emotion_palette (complexity: 0.3)
- brainstorm_cards (complexity: 0.2)
- mind_map (complexity: 0.5)
- question_card_chain (complexity: 0.3)

**Organize (5種):**
- card_sorting (complexity: 0.4)
- matrix_placement (complexity: 0.5)
- dependency_mapping (complexity: 0.7)
- swot_analysis (complexity: 0.6)
- timeline_slider (complexity: 0.4)

**Converge (2種):**
- priority_slider_grid (complexity: 0.3)
- tradeoff_balance (complexity: 0.5)

### 6.2 推奨Widget組み合わせ

各ステージ1-3個のWidgetを選定。以下は代表的パターン:

| パターン | Diverge | Organize | Converge | W2WR適性 |
|---------|---------|----------|----------|----------|
| P1 | brainstorm_cards | card_sorting | priority_slider_grid | Passthrough向き |
| P2 | brainstorm_cards | card_sorting | tradeoff_balance | JavaScript向き |
| P3 | emotion_palette | card_sorting | priority_slider_grid | JavaScript向き |
| P4 | mind_map | matrix_placement | priority_slider_grid | Debounced向き |
| P5 | brainstorm_cards | timeline_slider | priority_slider_grid | JavaScript向き |
| P6 | brainstorm_cards | dependency_mapping | priority_slider_grid | 複雑W2WR向き |
| P7 | question_card_chain | swot_analysis | tradeoff_balance | 複数Binding向き |

---

## 7. W2WR詳細設計

### 7.1 カテゴリA: No W2WR (10件)

**期待生成結果:** `reactiveBindings: []` または生成なし

**テスト観点:**
- W2WRが不要な場合に余計なBindingを生成しないこと
- 各Widget独立で完結するフロー

**想定悩みパターン:**
- 単発タスク（「部屋の掃除をしたい」）
- 振り返り系（「今週の反省をしたい」）
- 情報収集段階（「選択肢をまず洗い出したい」）

### 7.2 カテゴリB: Passthrough (10件)

**パターン例:**
```json
{
  "source": "brainstorm_cards.cards",
  "target": "card_sorting.cards",
  "relationship": { "type": "passthrough" },
  "updateMode": "realtime"
}
```

**バリエーション:**
- diverge → organize間 (brainstorm_cards → card_sorting)
- organize → converge間 (card_sorting → priority_slider_grid)
- 異なるWidget組み合わせ

**想定悩みパターン:**
- 整理・分類系（「アイデアを整理したい」「候補を分類したい」）
- リストアップ→優先度付け

### 7.3 カテゴリC: JavaScript単純 (10件)

**パターン例:**
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

**バリエーション:**
- 単純map変換 (プロパティリネーム)
- フィルタリング (filter)
- 配列→配列型変換
- index付与 (`(item, i) => ({...item, order: i})`)

**想定悩みパターン:**
- 感情→優先度系（「ストレスの原因を特定して対処したい」）
- 時系列変換系（「タスクに順番をつけたい」）

### 7.4 カテゴリD: JavaScript複合 (10件)

**パターン例:**
```json
{
  "source": "card_sorting.categories",
  "target": "tradeoff_balance.items",
  "relationship": {
    "type": "javascript",
    "javascript": "Object.entries(source).flatMap(([cat, items]) => items.map(i => ({text: i.text, side: cat === 'メリット' ? 'left' : 'right'})))"
  },
  "updateMode": "debounced",
  "debounceMs": 300
}
```

**バリエーション:**
- Object.entries + flatMap（ネスト解除）
- 条件分岐を含む変換（三項演算子）
- 集約計算 (reduce)
- debounced更新モード（300ms）

**想定悩みパターン:**
- メリット・デメリット比較系（「転職のリスクとメリットを比較したい」）
- 分類→評価系（「候補を整理してから比較したい」）

### 7.5 カテゴリE: 複数Binding (10件)

**パターン例:**
```json
{
  "bindings": [
    {
      "source": "brainstorm_cards.cards",
      "target": "card_sorting.cards",
      "relationship": { "type": "passthrough" },
      "updateMode": "realtime"
    },
    {
      "source": "card_sorting.categories",
      "target": "matrix_placement.items",
      "relationship": {
        "type": "javascript",
        "javascript": "Object.values(source).flat().map(i => ({...i, x: 50, y: 50}))"
      },
      "updateMode": "debounced",
      "debounceMs": 300
    }
  ]
}
```

**バリエーション:**
- 2 Binding (diverge→organize, organize→converge)
- 3 Binding (全ステージ連鎖: diverge→organize→converge)
- 複合型 (passthrough + javascript)
- 分岐型 (1つのsourceから2つのtargetへ)

**想定悩みパターン:**
- 複合的な意思決定（「アイデア出し→整理→評価→決定まで一気にやりたい」）
- 段階的フロー（「選択肢を洗い出して、分類して、最終的に優先順位をつけたい」）

---

## 8. テストケースJSONスキーマ

```typescript
interface TestCase {
  caseId: string;                    // "case_01" ~ "case_50"
  title: string;                     // 日本語タイトル
  complexity: "simple" | "medium";   // 全体複雑度
  hasReactivity: boolean;            // W2WRの有無

  // 悩みテキスト
  concernText: string;               // 20-300文字

  // コンテキスト要因
  contextFactors: {
    category: string;                // カテゴリ
    urgency: "low" | "medium" | "high";
    emotionalState: string;          // 感情状態
    timeAvailable: number;           // 分
  };

  // 期待ボトルネック（1-2個）
  expectedBottlenecks: string[];

  // 期待フロー
  expectedFlow: {
    diverge: { widgets: string[]; purpose: string; };
    organize: { widgets: string[]; purpose: string; };
    converge: { widgets: string[]; purpose: string; };
  };

  // W2WR期待値（hasReactivity=trueの場合）
  expectedW2WR?: {
    bindings: ReactiveBindingSpec[];
  };

  // 評価基準
  evaluationCriteria: string[];
}
```

---

## 9. 実装ファイル構成

```
config/test-cases/
├── case_01.json  (既存)
├── case_02.json  (既存)
├── case_03.json  (既存)
├── case_04.json  (既存)
├── case_05.json  (既存)
├── case_06.json  (既存)
├── case_07.json  (新規: No W2WR)
├── ...
└── case_50.json  (新規: 複数Binding)
```

---

## 10. 悩みテキスト生成ガイドライン（リアルな日本語表現）

**基本方針:**
- 実際のユーザー入力を想定したリアルな日本語表現
- 口語表現、略語、感情的表現を含む
- 文法的に完璧でない表現も許容

### 10.1 短文例（1文、20-50文字）

**具体的:**
- 「3月までに転職先決めないと」
- 「TOEIC800点取りたいけど勉強法わからん」
- 「来週の面接やばい」

**中程度:**
- 「転職するか迷ってる」
- 「部屋片付けたい」
- 「上司との関係がしんどい」

**曖昧:**
- 「なんかモヤモヤする」
- 「このままでいいのかな」
- 「最近調子悪い」

### 10.2 中文例（2-3文、51-120文字）

**具体的:**
- 「副業始めたいんだけど、何から手つければいいか分からん。プログラミングとか動画編集とか興味あるけど整理できてない」
- 「転職活動中。候補5社くらいあるんだけど、条件バラバラで比較できてない」
- 「来月の資格試験まであと30日。勉強計画立てたいけど何からやればいいか」

**曖昧:**
- 「最近仕事のモチベーションが上がらない。やりがいがないわけじゃないけど、なんか違う気がする」
- 「人間関係でちょっと悩んでて。具体的に何が問題かはっきりしないけどモヤモヤする」

### 10.3 長文例（3段落相当、121-300文字）

**具体的:**
- 「今の会社5年目なんだけど、最近成長感じなくなってきた。転職も考えてるけど、安定した今の環境捨てるリスクが怖い。かといってこのまま何もしないのも不安。自分のキャリアどう考えればいいのか整理したい。周りの意見も聞きたいけど、まずは自分の中で優先順位つけたい」

**感情的:**
- 「正直もう限界かも。仕事も私生活もうまくいってなくて、何から手をつければいいかわからない。親の介護も始まって、自分の時間なんて全然取れてない。誰かに話聞いてほしいけど、愚痴言ってるだけな気もするし。とりあえず頭の中整理したい」

### 10.4 リアルさを出すポイント

- **口語表現:** 「〜けど」「〜なんだけど」「〜かも」
- **略語:** 「わからん」「やばい」「しんどい」
- **感情語:** 「モヤモヤ」「なんとなく」「正直」
- **不完全文:** 「〜したいんだけど。」（理由なし）
- **繰り返し:** 「〜したい。でも〜したい」

---

## 11. 50ケース割り当てマトリックス

### 11.1 W2WRカテゴリ × テキスト長

|  | 短文 (10) | 中文 (25) | 長文 (15) | 計 |
|--|----------|----------|----------|-----|
| A: No W2WR | 3 | 4 | 3 | 10 |
| B: Passthrough | 2 | 5 | 3 | 10 |
| C: JS単純 | 2 | 5 | 3 | 10 |
| D: JS複合 | 2 | 5 | 3 | 10 |
| E: 複数Binding | 1 | 6 | 3 | 10 |
| **計** | **10** | **25** | **15** | **50** |

### 11.2 case ID割り当て（確定版）

| case ID | W2WRカテゴリ | テキスト長 | カテゴリ | ボトルネック |
|---------|-------------|----------|---------|------------|
| case_01 | A: No W2WR | 中 | キャリア | dont_know_where_to_start |
| case_02 | B: Passthrough | 中 | キャリア | unorganized_info |
| case_03 | C: JS単純 | 中 | メンタルヘルス | emotional_block |
| case_04 | D: JS複合 | 中 | 人生選択 | too_many_options |
| case_05 | D: JS複合 | 中 | 生活 | cannot_prioritize |
| case_06 | C: JS単純 | 中 | 仕事 | unorganized_info |
| case_07 | A: No W2WR | 短 | 生活 | dont_know_where_to_start |
| case_08 | A: No W2WR | 短 | メンタルヘルス | emotional_block |
| case_09 | A: No W2WR | 短 | 学習 | dont_know_where_to_start |
| case_10 | A: No W2WR | 中 | 人間関係 | fixed_perspective |
| case_11 | A: No W2WR | 中 | 仕事 | unorganized_info |
| case_12 | A: No W2WR | 長 | キャリア | fear_of_decision |
| case_13 | A: No W2WR | 長 | 人生選択 | multiple_issues |
| case_14 | A: No W2WR | 長 | 人間関係 | emotional_block |
| case_15 | A: No W2WR | 中 | 生活 | cannot_prioritize |
| case_16 | B: Passthrough | 短 | キャリア | unorganized_info |
| case_17 | B: Passthrough | 短 | 仕事 | unorganized_info |
| case_18 | B: Passthrough | 中 | 学習 | unorganized_info |
| case_19 | B: Passthrough | 中 | キャリア | too_many_options |
| case_20 | B: Passthrough | 中 | 生活 | unorganized_info |
| case_21 | B: Passthrough | 中 | 人間関係 | unorganized_info |
| case_22 | B: Passthrough | 中 | 仕事 | cannot_prioritize |
| case_23 | B: Passthrough | 長 | キャリア | too_many_options |
| case_24 | B: Passthrough | 長 | 人生選択 | unorganized_info |
| case_25 | B: Passthrough | 長 | 仕事 | multiple_issues |
| case_26 | C: JS単純 | 短 | メンタルヘルス | emotional_block |
| case_27 | C: JS単純 | 短 | 仕事 | cannot_prioritize |
| case_28 | C: JS単純 | 中 | キャリア | cannot_prioritize |
| case_29 | C: JS単純 | 中 | 生活 | too_many_options |
| case_30 | C: JS単純 | 中 | 人間関係 | cannot_prioritize |
| case_31 | C: JS単純 | 中 | 学習 | cannot_prioritize |
| case_32 | C: JS単純 | 長 | メンタルヘルス | emotional_block |
| case_33 | C: JS単純 | 長 | キャリア | fear_of_decision |
| case_34 | C: JS単純 | 長 | 人生選択 | fear_of_decision |
| case_35 | D: JS複合 | 短 | キャリア | too_many_options |
| case_36 | D: JS複合 | 短 | 生活 | too_many_options |
| case_37 | D: JS複合 | 中 | 人間関係 | multiple_issues |
| case_38 | D: JS複合 | 中 | 仕事 | multiple_issues |
| case_39 | D: JS複合 | 中 | 学習 | fixed_perspective |
| case_40 | D: JS複合 | 長 | 人生選択 | multiple_issues |
| case_41 | E: 複数Binding | 短 | 仕事 | multiple_issues |
| case_42 | E: 複数Binding | 中 | キャリア | too_many_options |
| case_43 | E: 複数Binding | 中 | 人生選択 | multiple_issues |
| case_44 | E: 複数Binding | 中 | 生活 | multiple_issues |
| case_45 | E: 複数Binding | 中 | 人間関係 | fixed_perspective |
| case_46 | E: 複数Binding | 中 | 学習 | dont_know_where_to_start |
| case_47 | E: 複数Binding | 中 | 仕事 | cannot_prioritize |
| case_48 | E: 複数Binding | 長 | キャリア | multiple_issues |
| case_49 | E: 複数Binding | 長 | メンタルヘルス | fear_of_decision |
| case_50 | E: 複数Binding | 長 | 人生選択 | fear_of_decision |

※ case_41-50がカテゴリE（複数Binding）10件

### 11.3 ボトルネック分布確認

| ボトルネック | 件数 |
|------------|------|
| too_many_options | 7 |
| emotional_block | 6 |
| multiple_issues | 9 |
| dont_know_where_to_start | 5 |
| cannot_prioritize | 7 |
| fear_of_decision | 6 |
| unorganized_info | 7 |
| fixed_perspective | 3 |
| **計** | **50** |

---

## 12. 次のステップ

1. **設計レビュー:** 本設計書の承認（今回のタスク）
2. **テンプレート作成:** case_07.jsonのテンプレート作成（別タスク）
3. **コンテンツ生成:** 44件の悩みテキスト・コンテキスト作成（別タスク）
4. **JSONファイル生成:** case_07.json ~ case_50.json（別タスク）
5. **バリデーション:** スキーマ検証・一貫性チェック
6. **バッチテスト:** 50件でのバッチ実験動作確認

---

## 13. ファイル参照

- 実験仕様: `/specs/system-design/experiment_spec_layer_1_layer_4.md`
- 既存テストケース: `/config/test-cases/case_01.json` ~ `case_06.json`
- 実験設定: `/config/experiment-settings.json`
- バッチ実行サービス: `/server/src/services/BatchExecutionService.ts`
- Widget定義: `/server/src/definitions/v4/widgets.ts`
