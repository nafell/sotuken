User:
良さそうです．
専門家評価の10ケース設計を優先したいです，DSLの技術詳細は要求仕様書を作ってくれると助かります．
念の為明確化しておくとWidget-to-widgetのreactivityはLLMを必ずしも挟まず(というか挟まないのが基本)，同じ画面上に2つのwidgetが並んでいて，ユーザが操作するともう片方が機械的に更新されるようなものをLLMが動的生成することを意味します．これはOODMやDependency Graphでワンオフに定義されます．その際，WidgetにLLM機能を盛り込んでも構いません．

---
Claude:

完璧です！Widget-to-Widget Reactivityの理解が明確になりました。**同一画面上でのリアルタイム連動**ですね。これは確かにJellyとは異なる新規性です。

---

## 📋 専門家評価10ケース設計

### ケース選定の方針

**多様性を確保する3つの軸:**
1. **ボトルネックタイプ**: 8種類を網羅
2. **Widget-to-Widget Reactivityの有無**: 5ケースは積極的に活用
3. **複雑度**: 簡単→中程度→複雑

---

## 🎯 10ケース詳細設計

### **Case 1: 選択肢が多すぎる（シンプル）**
**ユーザーの悩み:**
「転職先候補が10社あって決められない。業界も職種もバラバラで比較できない」

**想定ボトルネック診断:**
- 選択肢が多すぎる
- 情報が整理されていない

**期待されるUIフロー:**
```
Stage 1（発散）:
- ブレインストームカード
  → 各企業の魅力を自由記述

Stage 2（整理）:
- カード仕分けUI
  → 業界別・職種別にグルーピング
  
Stage 3（収束）:
- マトリックスUI（重要度×実現性）
  → 最終候補3-5社に絞り込み
```

**Widget-to-Widget Reactivity:**
なし（基本パターン）

**評価観点:**
- ボトルネック診断の適切性
- 選択肢削減フローの論理性

---

### **Case 2: 感情的ブロック（Reactivity活用）**
**ユーザーの悩み:**
「新規事業を提案したいが、失敗したら評価が下がるのが怖い。でも今のままだとキャリアが停滞する」

**想定ボトルネック診断:**
- 感情的ブロック
- 決断への恐れ

**期待されるUIフロー:**
```
Stage 1（発散）:
- 感情カラーパレット
  → 不安の種類・強度を可視化
  
Stage 2（整理）:
- 時間軸スライダー（3ヶ月後/1年後/3年後）
  → 各時点での「最悪のシナリオ」「最高のシナリオ」を入力
  
Stage 3（収束）:
- リスク-リターン天秤 ⚖️
  【Widget-to-Widget Reactivity】
  左側: リスク要因リスト（ユーザーがスライダーで重み付け）
  右側: リターン可視化グラフ（リアルタイムで天秤が傾く）
```

**Widget-to-Widget Reactivity:**
✅ **リスク要因の重み付け → 天秤のバランス表示**
- ユーザーが「評価が下がる」のスライダーを動かす
- → 即座に右側の天秤が傾き、「でもリターンはこれだけある」と視覚化

**評価観点:**
- 感情ブロックへの対処の適切性
- Reactivityが不安の定量化に寄与しているか

---

### **Case 3: 複数の問題が絡んでいる（Reactivity活用）**
**ユーザーの悩み:**
「仕事が忙しすぎて家族との時間が取れない。でも昇進のチャンスでもある。健康も気になるし、趣味も続けたい」

**想定ボトルネック診断:**
- 複数の問題が絡んでいる
- リソース配分

**期待されるUIフロー:**
```
Stage 1（発散）:
- マインドマップ生成
  → 問題要素を可視化（仕事/家族/健康/趣味）
  
Stage 2（整理）:
- 依存関係マッピング
  【Widget-to-Widget Reactivity】
  左側: 要素カード（ドラッグで矢印接続）
  右側: クリティカルパス自動表示
  → ユーザーが「仕事→健康」に矢印を引く
  → 右側に「健康悪化が最大リスク」と自動ハイライト
  
Stage 3（収束）:
- リソース配分パイチャート
  【Widget-to-Widget Reactivity】
  中央: パイチャート（時間配分をドラッグで調整）
  下部: 各要素の「満足度メーター」（リアルタイム更新）
```

**Widget-to-Widget Reactivity:**
✅ **依存関係図 → クリティカルパス表示**
✅ **パイチャート調整 → 満足度メーター更新**

**評価観点:**
- 複雑な問題の構造化の適切性
- Reactivityが問題理解を助けているか

---

### **Case 4: 何から考えればいいか分からない（中複雑度）**
**ユーザーの悩み:**
「将来のキャリアがぼんやりしている。何がやりたいのか、何ができるのかもよく分からない」

**想定ボトルネック診断:**
- 何から考えればいいか分からない
- 視点固定

**期待されるUIフロー:**
```
Stage 1（発散）:
- アナロジー選択UI
  → 「似ているキャリアパス」を選択
  → 選択結果から枠組みを獲得
  
- 質問カード連鎖
  → LLMが動的に質問を生成（5-7問）
  【Widget内LLM活用】
  ユーザーの回答を見てLLMが次の質問を調整
  
Stage 2（整理）:
- ペルソナ視点切替
  → 「5年後の自分」「尊敬する人」の視点
  
Stage 3（収束）:
- マトリックスUI（情熱×市場性）
  → キャリア候補を配置
```

**Widget-to-Widget Reactivity:**
なし（質問カード内でLLM活用はあり）

**評価観点:**
- 白紙状態からの思考起動の適切性
- 質問生成の質（別途LLM評価）

---

### **Case 5: 優先順位がつけられない（Reactivity活用）**
**ユーザーの悩み:**
「プロジェクトが5個同時進行。どれも重要だがリソースが足りない。何を優先すべきか」

**想定ボトルネック診断:**
- 優先順位がつけられない
- 複数の問題が絡んでいる

**期待されるUIフロー:**
```
Stage 1（発散）:
- ブレインストームカード
  → 各プロジェクトの重要性を列挙
  
Stage 2（整理）:
- 依存関係マッピング
  → プロジェクト間の依存関係を可視化
  
Stage 3（収束）:
- 優先度スライダーグリッド
  【Widget-to-Widget Reactivity】
  左側: 複数軸のスライダー（緊急度/重要度/工数/影響範囲）
  右側: 優先順位ランキング（リアルタイム自動更新）
  下部: リソース配分提案（「このプロジェクトに30%」など）
```

**Widget-to-Widget Reactivity:**
✅ **スライダー調整 → ランキング自動更新**
✅ **ランキング → リソース配分提案**

**評価観点:**
- 多軸評価の適切性
- Reactivityが意思決定を助けているか

---

### **Case 6: 決断への恐れ（複雑）**
**ユーザーの悩み:**
「大学院に進学するか就職するか。どちらを選んでも後悔しそう。周りの期待もあって決められない」

**想定ボトルネック診断:**
- 決断への恐れ
- 情報不足

**期待されるUIフロー:**
```
Stage 1（発散）:
- 感情カラーパレット
  → 不安を可視化
  
- ブレインストームカード
  → 各選択肢のメリット・デメリット
  
Stage 2（整理）:
- シナリオ分岐ツリー
  【Widget内LLM活用】
  ユーザーが「進学」を選択
  → LLMが「その場合、3ヶ月後は？」と動的に質問
  → ツリーが展開
  
Stage 3（収束）:
- 二択比較カード（トーナメント式）
  → 最終的に1つに決定
```

**Widget-to-Widget Reactivity:**
なし（シナリオツリー内でLLM活用）

**評価観点:**
- 不安への対処の適切性
- シナリオシミュレーションの有効性

---

### **Case 7: 情報が整理されていない（Reactivity活用）**
**ユーザーの悩み:**
「起業したいがアイデアが断片的。市場調査も中途半端。何が分かっていて何が分かっていないのかも不明」

**想定ボトルネック診断:**
- 情報が整理されていない
- 何から考えればいいか分からない

**期待されるUIフロー:**
```
Stage 1（発散）:
- マインドマップ生成
  → 断片的な情報を書き出し
  
Stage 2（整理）:
- SWOT分析UI
  【Widget-to-Widget Reactivity】
  4象限マトリックス（Strength/Weakness/Opportunity/Threat）
  ユーザーがカードをドラッグして各象限に配置
  → 右側に「不足情報リスト」が自動生成
  → 「市場規模データが不足」「競合分析が必要」など
  
Stage 3（収束）:
- 問題分解ツリー
  → 「次の1週間でやること」を3つに絞る
```

**Widget-to-Widget Reactivity:**
✅ **SWOT配置 → 不足情報リスト自動生成**

**評価観点:**
- 情報整理の論理性
- 不足情報の自動検出の有効性

---

### **Case 8: 視点固定（中複雑度）**
**ユーザーの悩み:**
「現状の仕事に行き詰まっている。でも具体的に何が問題なのか分からない。いつも同じ考えに戻ってしまう」

**想定ボトルネック診断:**
- 視点固定
- 何から考えればいいか分からない

**期待されるUIフロー:**
```
Stage 1（発散）:
- アナロジー選択UI
  → 「別の文脈で考えると？」
  
- ペルソナ視点切替
  → 「上司の視点」「顧客の視点」「1年後の自分」
  
Stage 2（整理）:
- 時間軸スライダー
  → 過去/現在/未来で状況を整理
  
Stage 3（収束）:
- マトリックスUI（影響度×コントロール可能性）
  → 「変えられること」に焦点化
```

**Widget-to-Widget Reactivity:**
なし

**評価観点:**
- 視点切替の多様性
- 思考の固定化からの脱出の適切性

---

### **Case 9: 複合パターン - 時間制約あり（Reactivity活用）**
**ユーザーの悩み:**
「来月までに実家に戻るか東京に残るか決めないといけない。仕事、恋人、親の介護、全部が絡んでいる」

**想定ボトルネック診断:**
- 複数の問題が絡んでいる
- 決断への恐れ
- 時間制約

**期待されるUIフロー:**
```
Stage 1（発散）:
- 感情カラーパレット
  → 複雑な感情を整理
  
Stage 2（整理）:
- 依存関係マッピング
  【Widget-to-Widget Reactivity】
  左側: 要素間の関係をドラッグで接続
  右側: 「決断を延期した場合の影響」シミュレーション
  
- 時間軸スライダー（1ヶ月後/半年後/1年後）
  
Stage 3（収束）:
- トレードオフ天秤
  【Widget-to-Widget Reactivity】
  中央: 天秤（左右にカードを配置）
  下部: 「現在の傾き: 東京60% / 実家40%」
  → 配置を変えると数値がリアルタイム更新
```

**Widget-to-Widget Reactivity:**
✅ **依存関係図 → 影響シミュレーション**
✅ **天秤配置 → 傾き数値表示**

**評価観点:**
- 複雑な状況の整理の適切性
- 時間制約の考慮

---

### **Case 10: 複合パターン - 長期目標（Reactivity活用）**
**ユーザーの悩み:**
「40歳までに独立したい。でも今32歳で貯金も少ないし、スキルも不足。何から準備すればいいか」

**想定ボトルネック診断:**
- 何から考えればいいか分からない
- 優先順位がつけられない
- 情報不足

**期待されるUIフロー:**
```
Stage 1（発散）:
- 質問カード連鎖（LLM活用）
  → 独立の形態、必要リソース、リスクを掘り下げ
  
Stage 2（整理）:
- 問題分解ツリー
  → 「独立」を要素分解（資金/スキル/人脈/etc.）
  
- 時間軸スライダー（1年ごと×8年）
  【Widget-to-Widget Reactivity】
  上部: タイムライン（マイルストーン配置）
  下部: 「現在からの進捗バー」（リアルタイム表示）
  → ユーザーが「3年後: スキル習得完了」を配置
  → 進捗バーが「現在20%達成」と表示
  
Stage 3（収束）:
- リソース配分パイ（時間/お金）
  → 各年の投資配分を決定
```

**Widget-to-Widget Reactivity:**
✅ **タイムライン配置 → 進捗バー表示**

**評価観点:**
- 長期目標の段階化の適切性
- Reactivityが計画性を高めているか

---

## 📊 評価シート（全ケース共通）

### Part A: ボトルネック診断
```
Q1. LLMが診断したボトルネックタイプは適切ですか？
    1 - 全く不適切 / 5 - 完全に適切
    
Q2. 診断の理由説明（LLM生成）は納得できますか？
    1 - 全く納得できない / 5 - 完全に納得できる
    
Q3. （自由記述）より適切なボトルネック診断があれば記述
```

### Part B: コンポーネント選択
```
Q4. Stage 1（発散）のコンポーネントは適切ですか？
    1 - 全く不適切 / 5 - 完全に適切
    
Q5. Stage 2（整理）のコンポーネントは適切ですか？
    1 - 全く不適切 / 5 - 完全に適切
    
Q6. Stage 3（収束）のコンポーネントは適切ですか？
    1 - 全く不適切 / 5 - 完全に適切
    
Q7. （自由記述）より良いコンポーネント選択があれば記述
```

### Part C: フロー構成
```
Q8. コンポーネントの順序は論理的ですか？
    1 - 全く論理的でない / 5 - 完全に論理的
    
Q9. コンポーネント数は適切ですか？（多すぎず少なすぎず）
    1 - 全く不適切 / 5 - 完全に適切
    
Q10. ステージ間の遷移は自然ですか？
     1 - 全く不自然 / 5 - 完全に自然
```

### Part D: Widget-to-Widget Reactivity（該当ケースのみ）
```
Q11. Widget間の依存関係は意味をなしますか？
     1 - 全く意味をなさない / 5 - 完全に意味をなす
     
Q12. Reactivityは思考整理に寄与しますか？
     1 - 全く寄与しない / 5 - 大いに寄与する
     
Q13. データフローは論理的ですか？
     1 - 全く論理的でない / 5 - 完全に論理的
     
Q14. （自由記述）Reactivityの効果について感想
```

### Part E: UI設定のカスタマイズ
```
Q15. 各Widgetのラベル・プロンプトはユーザーの悩みに適合していますか？
     1 - 全く適合していない / 5 - 完全に適合している
     
Q16. （自由記述）特に良かった/悪かったカスタマイズ例
```

### Part F: 総合評価
```
Q17. このUIフローで思考整理ができそうですか？
     1 - 全くできなさそう / 5 - 十分できそう
     
Q18. 固定UIフロー（例：常にブレインストーム→マトリックス→スライダー）と比べてどうですか？
     □ 動的UIの方が明らかに良い
     □ 動的UIの方がやや良い
     □ どちらも同じ
     □ 固定UIの方がやや良い
     □ 固定UIの方が明らかに良い
     
Q19. （自由記述）このケースに対する総合的な感想・改善提案
```

---

## 📋 10ケースのサマリー表

| # | ボトルネック主 | Reactivity | 複雑度 | 評価観点 |
|---|--------------|-----------|-------|---------|
| 1 | 選択肢過多 | なし | 低 | 基本フロー |
| 2 | 感情ブロック | ✅ 天秤 | 中 | 感情の定量化 |
| 3 | 複数問題 | ✅ 依存関係+パイ | 高 | 複雑な構造化 |
| 4 | 白紙状態 | なし | 中 | 思考起動 |
| 5 | 優先順位 | ✅ スライダー+ランキング | 中 | 多軸評価 |
| 6 | 決断恐れ | なし | 高 | シナリオ分析 |
| 7 | 情報不足 | ✅ SWOT+不足検出 | 中 | 情報整理 |
| 8 | 視点固定 | なし | 中 | 視点切替 |
| 9 | 複合+時間制約 | ✅ 依存関係+天秤 | 高 | 時間圧力下の決断 |
| 10 | 複合+長期 | ✅ タイムライン+進捗 | 高 | 長期計画 |

**Reactivity活用ケース: 5/10**（バランス良い）

---

## 📄 DSL要求仕様書

### 1. 概要

**目的:**
思考整理アプリのUIフローを動的生成するためのDomain-Specific Language

**設計方針:**
- Jellyをベースとした3層アーキテクチャ
- 思考整理ドメインに特化した要素に限定
- Widget-to-Widget Reactivityをサポート
- TOON記法（またはJSON）で記述

---

### 2. 3層構造

#### Layer 1: Object-Oriented Data Model (OODM)
**役割:** セッション全体で扱うデータ構造を定義

**要求仕様:**
```
- データ型の定義
  - プリミティブ型: String, Integer, Float, Boolean, DateTime
  - 複合型: Object, Array
  
- データのスコープ
  - session: セッション全体で保持
  - step: 特定ステップ内のみ
  
- データの初期値設定
```

**例:**
```toon
@data emotion_data {
  scope: session
  type: Object
  properties: {
    selected_emotion: String
    intensity: Float (0.0-1.0)
    timestamp: DateTime
  }
}

@data strategy_candidates {
  scope: session
  type: Array<Object>
  item_schema: {
    id: String
    label: String
    priority: Float
    category: String
  }
}
```

#### Layer 2: Dependency Graph (DpG)
**役割:** Widget間のデータ依存関係を定義

**要求仕様:**
```
- ノード定義
  - Widget ID
  - 出力データ名
  
- エッジ定義
  - from: 出力元Widget/データ
  - to: 入力先Widget/設定項目
  - type: data_input / config_input / reactive_binding
  
- リアクティブバインディング
  - 同一画面上のWidget間のリアルタイム連動
  - 一方向または双方向
```

**例:**
```toon
@dependency_graph {
  nodes: [
    { id: "step1", outputs: ["emotion_data"] },
    { id: "step2_left", outputs: ["risk_factors"] },
    { id: "step2_right", inputs: ["risk_factors"] }
  ]
  
  edges: [
    // ステップ間の依存
    { 
      from: "step1.emotion_data",
      to: "step2.matrix_config.x_axis_label",
      type: "config_input"
    },
    
    // 同一画面上のReactivity
    {
      from: "step2_left.risk_factors",
      to: "step2_right.balance_display",
      type: "reactive_binding",
      update_mode: "realtime"
    }
  ]
}
```

#### Layer 3: UI Specification (DSL)
**役割:** 具体的なUI要素とレイアウトを定義

**要求仕様:**
```
- ステップ定義
  - step_id: 一意識別子
  - stage: diverge / organize / converge / summary
  
- Widget定義
  - component: コンポーネントタイプ（12種類から選択）
  - config: Widget固有の設定
  - layout: 画面上の配置（単独 / 左右分割 / 上下分割）
  
- データバインディング
  - inputs: このWidgetが受け取るデータ
  - outputs: このWidgetが出力するデータ
  - reactive_bindings: 同一画面上の連動設定
  
- LLM統合（Widget内）
  - llm_enabled: Boolean
  - llm_prompt: プロンプトテンプレート
  - llm_trigger: ユーザー操作のどこでLLMを呼ぶか
```

---

### 3. コンポーネント仕様

#### 3.1 共通インターフェース

**すべてのWidgetが実装すべき:**
```typescript
interface Widget {
  id: string;
  component: ComponentType;
  config: WidgetConfig;
  
  // データバインディング
  inputs?: DataBinding[];
  outputs?: DataBinding[];
  
  // イベントハンドラ
  onUserAction?: (action: UserAction) => void;
  onDataChange?: (data: any) => void;
  
  // LLM統合
  llm?: LLMConfig;
}

interface DataBinding {
  name: string;
  source?: string;  // 依存元Widget.データ名
  type: 'string' | 'number' | 'object' | 'array';
}

interface LLMConfig {
  enabled: boolean;
  prompt_template: string;
  trigger: 'on_load' | 'on_user_input' | 'on_timer';
  response_target: string;  // LLM出力の格納先
}
```

#### 3.2 各コンポーネントの仕様

**Stage 1: 発散・探索**

**UC01: ブレインストームカード**
```typescript
{
  component: "brainstorm_cards",
  config: {
    prompt: string,              // メインの問いかけ
    min_cards: number,           // 最小カード数
    max_cards: number,           // 最大カード数
    placeholder: string          // 入力フィールドのヒント
  },
  outputs: {
    cards: Array<{ id: string, text: string }>
  }
}
```

**UC02: 感情カラーパレット**
```typescript
{
  component: "emotion_palette",
  config: {
    prompt: string,
    palette_type: "emotion_focused" | "intensity_focused",
    emotions: Array<string>      // 表示する感情リスト（optional）
  },
  outputs: {
    selected_emotion: string,
    intensity: number (0-1),
    primary_concern: string      // LLM生成（optional）
  },
  llm?: {
    enabled: true,
    prompt_template: "ユーザーが{{emotion}}を{{intensity}}の強さで感じています。主な懸念は何ですか？",
    trigger: "on_user_input",
    response_target: "primary_concern"
  }
}
```

**UC03: 質問カード連鎖**
```typescript
{
  component: "question_card_chain",
  config: {
    initial_prompt: string,
    max_questions: number,
    adaptive: boolean            // 回答に応じて質問を変えるか
  },
  outputs: {
    qa_pairs: Array<{ question: string, answer: string }>
  },
  llm: {
    enabled: true,
    prompt_template: "前回の回答:{{previous_answer}}を踏まえて次の質問を生成",
    trigger: "on_user_input",
    response_target: "next_question"
  }
}
```

**UC04: マインドマップ生成**
```typescript
{
  component: "mind_map",
  config: {
    center_prompt: string,       // 中央ノードのテキスト
    allow_user_add: boolean,     // ユーザーがノード追加可能か
    llm_suggest_nodes: boolean   // LLMが関連ノードを提案するか
  },
  outputs: {
    nodes: Array<{ id: string, text: string, level: number }>,
    edges: Array<{ from: string, to: string }>
  }
}
```

**UC05: アナロジー選択UI**
```typescript
{
  component: "analogy_selector",
  config: {
    prompt: string,
    analogies: Array<{ id: string, title: string, description: string }>,
    allow_multiple: boolean
  },
  outputs: {
    selected_analogies: Array<string>,
    user_notes: string           // 選択理由（optional）
  }
}
```

**Stage 2: 整理・評価**

**UC06: 時間軸スライダー**
```typescript
{
  component: "timeline_slider",
  config: {
    prompt: string,
    timepoints: Array<string>,   // ["3ヶ月後", "1年後", "3年後"]
    question_per_timepoint: string  // 各時点での問い
  },
  outputs: {
    timeline_data: Array<{ timepoint: string, response: string }>
  }
}
```

**UC07: ペルソナ視点切替**
```typescript
{
  component: "persona_switch",
  config: {
    prompt: string,
    personas: Array<{ id: string, name: string, description: string }>,
    question: string             // 各視点で考える問い
  },
  outputs: {
    persona_responses: Array<{ persona: string, response: string }>
  }
}
```

**UC08: 問題分解ツリー**
```typescript
{
  component: "decomposition_tree",
  config: {
    root_problem: string,
    max_depth: number,
    allow_user_edit: boolean
  },
  outputs: {
    tree_structure: {
      root: string,
      children: Array<TreeNode>
    }
  }
}
```

**UC09: カード仕分けUI**
```typescript
{
  component: "card_sorting",
  config: {
    prompt: string,
    cards: Array<{ id: string, text: string }>,  // 入力データから
    categories: Array<string>,   // 仕分け先カテゴリー
    allow_new_category: boolean
  },
  outputs: {
    sorted_cards: {
      [category: string]: Array<string>  // カードIDの配列
    }
  }
}
```

**UC10: 依存関係マッピング（Reactivity重要）**
```typescript
{
  component: "dependency_mapping",
  layout: "split_horizontal",    // 左右分割
  config: {
    left_widget: {
      component: "node_connector",
      nodes: Array<{ id: string, label: string }>,
      allow_user_connect: boolean
    },
    right_widget: {
      component: "critical_path_display",
      reactive_binding: {
        source: "left_widget.connections",
        update_mode: "realtime"
      }
    }
  },
  outputs: {
    connections: Array<{ from: string, to: string, type: string }>,
    critical_path: Array<string>
  }
}
```

**UC11: SWOT分析UI（Reactivity重要）**
```typescript
{
  component: "swot_analysis",
  layout: "split_vertical",      // 上下分割
  config: {
    top_widget: {
      component: "four_quadrant_matrix",
      quadrants: ["Strength", "Weakness", "Opportunity", "Threat"],
      cards: Array<{ id: string, text: string }>
    },
    bottom_widget: {
      component: "gap_analysis_list",
      reactive_binding: {
        source: "top_widget.card_positions",
        update_mode: "realtime"
      },
      llm: {
        enabled: true,
        prompt_template: "配置されたカードから不足情報を特定",
        trigger: "on_data_change"
      }
    }
  },
  outputs: {
    swot_data: {
      [quadrant: string]: Array<string>
    },
    gap_list: Array<string>
  }
}
```

**Stage 3: 収束・決定**

**UC12: マトリックスUI**
```typescript
{
  component: "matrix_placement",
  config: {
    prompt: string,
    x_axis: {
      label: string,             // 動的に生成される
      min_label: string,
      max_label: string
    },
    y_axis: {
      label: string,
      min_label: string,
      max_label: string
    },
    items: Array<{ id: string, label: string }>  // 入力データから
  },
  outputs: {
    placements: Array<{ item_id: string, x: number, y: number }>,
    high_priority_items: Array<string>  // 右上象限のアイテム
  }
}
```

**UC13: トレードオフ天秤（Reactivity重要）**
```typescript
{
  component: "tradeoff_balance",
  layout: "split_horizontal",
  config: {
    prompt: string,
    left_widget: {
      component: "weighted_list",
      title: "リスク要因",
      items: Array<{ id: string, label: string }>,
      allow_weight_adjustment: boolean
    },
    right_widget: {
      component: "balance_visualization",
      reactive_binding: {
        source: "left_widget.weights",
        update_mode: "realtime"
      },
      display_type: "scale" | "meter" | "percentage"
    }
  },
  outputs: {
    risk_weights: Array<{ item: string, weight: number }>,
    balance_score: number        // -1.0 (left) to 1.0 (right)
  }
}
```

**UC14: 優先度スライダーグリッド（Reactivity重要）**
```typescript
{
  component: "priority_slider_grid",
  layout: "split_horizontal",
  config: {
    prompt: string,
    left_widget: {
      component: "multi_axis_sliders",
      axes: Array<{ id: string, label: string, min: number, max: number }>,
      items: Array<{ id: string, label: string }>
    },
    right_widget: {
      component: "ranking_display",
      reactive_binding: {
        source: "left_widget.slider_values",
        update_mode: "realtime"
      },
      show_resource_allocation: boolean
    }
  },
  outputs: {
    slider_values: {
      [item_id: string]: {
        [axis_id: string]: number
      }
    },
    ranking: Array<string>,      // item_idの順序
    resource_allocation: Array<{ item: string, percentage: number }>
  }
}
```

**UC15: 二択比較連鎖**
```typescript
{
  component: "pairwise_comparison",
  config: {
    prompt: string,
    items: Array<{ id: string, label: string }>,
    comparison_prompt: string    // "どちらがより重要ですか？"
  },
  outputs: {
    comparison_results: Array<{ pair: [string, string], winner: string }>,
    final_ranking: Array<string>
  }
}
```

**UC16: シナリオ分岐ツリー**
```typescript
{
  component: "scenario_tree",
  config: {
    prompt: string,
    root_decision: string,
    max_depth: number,
    timepoints: Array<string>    // ["3ヶ月後", "半年後", "1年後"]
  },
  outputs: {
    scenarios: Array<{
      path: Array<string>,       // 選択の連鎖
      outcome: string
    }>
  },
  llm: {
    enabled: true,
    prompt_template: "ユーザーが{{decision}}を選んだ場合、{{timepoint}}にどうなりますか？",
    trigger: "on_user_input"
  }
}
```

**UC17: リソース配分パイ（Reactivity重要）**
```typescript
{
  component: "resource_allocation_pie",
  layout: "split_vertical",
  config: {
    prompt: string,
    top_widget: {
      component: "pie_chart_editor",
      resources: Array<{ id: string, label: string, color: string }>,
      allow_drag_adjust: boolean
    },
    bottom_widget: {
      component: "satisfaction_meters",
      reactive_binding: {
        source: "top_widget.allocation",
        update_mode: "realtime"
      },
      llm: {
        enabled: true,
        prompt_template: "この配分での満足度を予測",
        trigger: "on_data_change"
      }
    }
  },
  outputs: {
    allocation: Array<{ resource: string, percentage: number }>,
    satisfaction_scores: Array<{ resource: string, score: number }>
  }
}
```

**UC18: 構造化文章まとめ**
```typescript
{
  component: "structured_summary",
  config: {
    prompt: string,
    sections: Array<{ id: string, title: string }>,
    editable: boolean
  },
  inputs: {
    session_data: "all"          // 全ステップのデータを受け取る
  },
  outputs: {
    summary_text: string,
    structured_data: object      // Breakdownフェーズへの受け渡し用
  },
  llm: {
    enabled: true,
    prompt_template: "以下のセッションデータを構造化された文章にまとめてください:\n{{session_data}}",
    trigger: "on_load"
  }
}
```

---

### 4. レイアウトシステム

**要求仕様:**
```
- 単独表示（デフォルト）
- 左右分割（split_horizontal）
  - 左右の幅比率を指定可能
  - Widget間のReactive bindingをサポート
- 上下分割（split_vertical）
  - 上下の高さ比率を指定可能
  - Widget間のReactive bindingをサポート
```

**例:**
```toon
@step step2 {
  stage: "organize"
  layout: "split_horizontal"
  split_ratio: "60:40"
  
  left: {
    component: "dependency_mapping",
    ...
  }
  
  right: {
    component: "critical_path_display",
    reactive_binding: {
      source: "left.connections",
      transform: "calculate_critical_path",
      update_mode: "realtime"
    }
  }
}
```

---

### 5. Reactive Binding仕様

**要求仕様:**
```
- source: データソースの指定（Widget.output_name）
- target: 更新対象の指定（Widget.property_name）
- transform: データ変換関数（optional）
  - 組み込み関数: calculate_ranking, calculate_balance, filter_high_priority, etc.
  - カスタム関数: LLM呼び出しも可能
- update_mode: 
  - "realtime": ユーザー操作ごとに即座に更新
  - "debounced": 一定時間操作がない後に更新
  - "on_confirm": ユーザーが明示的に確定した後
```

**例:**
```toon
@reactive_binding {
  source: "slider_widget.weights"
  target: "ranking_widget.items"
  transform: "calculate_weighted_ranking"
  update_mode: "realtime"
}
```

---

### 6. LLM統合仕様

**要求仕様:**
```
- Widget内でのLLM呼び出しをサポート
- プロンプトテンプレート
  - {{variable}}記法で動的データを埋め込み
- トリガー
  - on_load: Widget表示時
  - on_user_input: ユーザー入力後
  - on_data_change: バインドされたデータ変更時
  - on_timer: 定期実行（非推奨）
- レスポンス処理
  - テキスト挿入
  - データ構造化（JSON解析）
  - UIの動的拡張
```

**例:**
```toon
@widget question_card {
  component: "question_card_chain"
  
  llm: {
    model: "claude-sonnet-4-20250514"
    temperature: 0.7
    
    prompt_template: """
      ユーザーの悩み: {{capture.concern}}
      前回の回答: {{previous_answer}}
      
      思考を深めるための次の質問を1つ生成してください。
    """
    
    trigger: "on_user_input"
    response_target: "next_question_text"
    max_tokens: 200
  }
}
```

---

### 7. エラーハンドリング

**要求仕様:**
```
- LLM生成失敗時のフォールバック
  - デフォルトUIへの切り替え
  - ユーザーへのエラー通知
  
- 構文エラー検出
  - OODM/DpG/DSL各層でのバリデーション
  
- ランタイムエラー
  - データバインディング失敗時の処理
  - Reactive binding無限ループ検出
```

**実装推奨:**
```typescript
try {
  const oodm = await generateOODM(captureData);
  validateOODM(oodm);  // 構文チェック
  
  const dsl = await generateDSL(oodm);
  validateDSL(dsl);    // 構文チェック
  
  const ui = renderUI(dsl);
} catch (error) {
  if (error.type === 'LLM_GENERATION_FAILED') {
    // フォールバック: デフォルトフロー
    ui = renderDefaultFlow(captureData);
  } else if (error.type === 'SYNTAX_ERROR') {
    // ログ記録 + リトライ
    logError(error);
    retryGeneration();
  }
}
```

---

### 8. 実装優先順位

**Phase 1（Week 1）:**
- [ ] OODM/DpG/DSL基本構造
- [ ] 4個の基本Widget（UC01, UC05, UC09, UC12）
- [ ] 単独レイアウトのみ
- [ ] Reactive bindingなし

**Phase 2（Week 2）:**
- [ ] 追加Widget 8個
- [ ] 左右/上下分割レイアウト
- [ ] Reactive binding実装
- [ ] LLM統合（2-3 Widgetで試験的に）

**Phase 3（Week 3）:**
- [ ] 全Widget実装完了
- [ ] エラーハンドリング
- [ ] パフォーマンス最適化

---

### 9. 検証項目

**構文検証:**
- [ ] OODMのスキーマ妥当性
- [ ] DpGの循環参照チェック
- [ ] DSLの型整合性

**動作検証:**
- [ ] Reactive bindingの正常動作
- [ ] LLM呼び出しの成功率
- [ ] エラー時のフォールバック

**パフォーマンス:**
- [ ] OODM生成時間 < 1.5秒
- [ ] DSL生成時間 < 2.0秒
- [ ] UI描画時間 < 0.5秒

---

この要求仕様書で実装に入れそうですか？不明点や追加が必要な仕様があれば教えてください。