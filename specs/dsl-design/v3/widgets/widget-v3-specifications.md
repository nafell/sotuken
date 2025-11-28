# Widget v3 仕様書

**Version**: 3.0
**最終更新**: 2025-11-28

---

## 1. 概要

DSL v3で使用する12種のReactive Widgetの仕様。

### 1.1 Widget一覧

| カテゴリ | Widget | 目的 |
|---------|--------|------|
| Diverge | emotion_palette | 感情の可視化 |
| Diverge | brainstorm_cards | アイデア発散 |
| Diverge | question_card_chain | 深掘り質問 |
| Organize | card_sorting | カード仕分け |
| Organize | dependency_mapping | 依存関係マッピング |
| Organize | swot_analysis | SWOT分析 |
| Organize | mind_map | マインドマップ |
| Converge | matrix_placement | 2軸マトリックス配置 |
| Converge | priority_slider_grid | 優先度スライダー |
| Converge | tradeoff_balance | トレードオフ天秤 |
| Converge | timeline_slider | タイムライン配置 |
| Summary | structured_summary | 構造化まとめ |

### 1.2 共通インターフェース

```typescript
interface BaseWidgetProps {
  spec: WidgetSpec;
  onComplete: (result: WidgetResult) => void;
  onUpdate?: (data: any) => void;
  onPortChange?: (portId: string, value: any) => void;
  getPortValue?: (portId: string) => any;
  initialPortValues?: Record<string, any>;
}
```

---

## 2. Diverge Widgets

### 2.1 emotion_palette

**目的**: 8種類の感情から選択し、強度を調整

**Config**:
```typescript
{
  prompt?: string;  // 表示するプロンプト
}
```

**Output Ports**:
- `emotions`: 選択された感情と強度の配列
- `_completed`: 完了フラグ

**状態**:
```typescript
interface EmotionSelection {
  emotion: string;
  intensity: number;  // 0-100
  timestamp: number;
}
```

---

### 2.2 brainstorm_cards

**目的**: 自由にアイデアを書き出すカード形式

**Config**:
```typescript
{
  prompt?: string;
  maxCards?: number;  // デフォルト: 20
  categories?: string[];
}
```

**Output Ports**:
- `cards`: カード配列
- `_completed`: 完了フラグ

**状態**:
```typescript
interface BrainstormCard {
  id: string;
  content: string;
  color?: string;
  category?: string;
  timestamp: number;
}
```

---

### 2.3 question_card_chain

**目的**: 連続的な質問で思考を深める

**Config**:
```typescript
{
  questions?: QuestionCard[];  // カスタム質問
}
```

**Output Ports**:
- `answers`: 回答配列
- `current_question`: 現在の質問インデックス
- `_completed`: 完了フラグ

**状態**:
```typescript
interface QuestionCard {
  id: string;
  question: string;
  hint?: string;
  category: 'why' | 'what' | 'how' | 'when' | 'who' | 'where';
  depth: number;
}

interface Answer {
  questionId: string;
  text: string;
  timestamp: number;
}
```

---

## 3. Organize Widgets

### 3.1 card_sorting

**目的**: カードをカテゴリにドラッグ＆ドロップで仕分け

**Config**:
```typescript
{
  cards?: SortingCard[];
  categories?: SortingCategory[];
}
```

**Output Ports**:
- `placements`: カード配置配列
- `sorted_count`: 仕分け済みカード数
- `_completed`: 完了フラグ

**状態**:
```typescript
interface SortingCard {
  id: string;
  label: string;
  description?: string;
  color?: string;
}

interface SortingCategory {
  id: string;
  label: string;
  description?: string;
  color: string;
  maxCards?: number;
}

interface CardPlacement {
  cardId: string;
  categoryId: string | null;
  timestamp: number;
}
```

**デフォルトカテゴリ**:
- 重要かつ緊急（赤）
- 重要だが緊急でない（オレンジ）
- 緊急だが重要でない（青）
- 重要でも緊急でもない（グレー）

---

### 3.2 dependency_mapping

**目的**: 要素間の依存関係を可視化・編集

**Config**:
```typescript
{
  nodes?: DependencyNode[];
}
```

**Output Ports**:
- `nodes`: ノード配列
- `edges`: エッジ配列
- `critical_path`: クリティカルパス
- `has_cycle`: 循環検出フラグ
- `_completed`: 完了フラグ

**状態**:
```typescript
interface DependencyNode {
  id: string;
  label: string;
  x: number;
  y: number;
  description?: string;
}

interface DependencyEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'requires' | 'blocks' | 'enables' | 'affects';
}
```

**エッジタイプ**:
| タイプ | 説明 | 色 |
|--------|------|-----|
| requires | 必要とする | 青 |
| blocks | ブロックする | 赤 |
| enables | 可能にする | 緑 |
| affects | 影響する | オレンジ |

---

### 3.3 swot_analysis

**目的**: SWOT分析の4象限にアイテム配置

**Config**:
```typescript
{
  items?: SwotItem[];
}
```

**Output Ports**:
- `strengths`: 強み配列
- `weaknesses`: 弱み配列
- `opportunities`: 機会配列
- `threats`: 脅威配列
- `_completed`: 完了フラグ

**状態**:
```typescript
interface SwotItem {
  id: string;
  text: string;
  quadrant: 'strengths' | 'weaknesses' | 'opportunities' | 'threats';
  importance: 'high' | 'medium' | 'low';
  timestamp: number;
}
```

**象限設定**:
| 象限 | 日本語 | 色 | 説明 |
|------|--------|-----|------|
| strengths | 強み | 緑 | 内部のポジティブな要素 |
| weaknesses | 弱み | 赤 | 内部のネガティブな要素 |
| opportunities | 機会 | 青 | 外部のポジティブな要素 |
| threats | 脅威 | オレンジ | 外部のネガティブな要素 |

---

### 3.4 mind_map

**目的**: マインドマップで関連性を視覚化

**Config**:
```typescript
{
  centerTopic?: string;
  nodes?: MindMapNode[];
}
```

**Output Ports**:
- `nodes`: ノード配列（階層構造）
- `node_count`: ノード数
- `max_depth`: 最大深度
- `_completed`: 完了フラグ

**状態**:
```typescript
interface MindMapNode {
  id: string;
  text: string;
  parentId: string | null;
  children: MindMapNode[];
  level: number;
  color?: string;
}
```

---

## 4. Converge Widgets

### 4.1 matrix_placement

**目的**: 2軸マトリックスにアイテムを配置

**Config**:
```typescript
{
  xAxisLabel?: string;  // X軸ラベル
  yAxisLabel?: string;  // Y軸ラベル
  maxItems?: number;    // 最大アイテム数
  items?: MatrixItem[];
}
```

**Output Ports**:
- `items`: 配置されたアイテム配列
- `quadrant_counts`: 象限ごとのカウント
- `_completed`: 完了フラグ

**状態**:
```typescript
interface MatrixItem {
  id: string;
  label: string;
  x: number;  // 0-100
  y: number;  // 0-100
}
```

---

### 4.2 priority_slider_grid

**目的**: 複数項目の優先度をスライダーで設定

**Config**:
```typescript
{
  maxItems?: number;
  items?: PriorityItem[];
}
```

**Output Ports**:
- `priorities`: 優先度配列
- `rankings`: ランキング配列
- `_completed`: 完了フラグ

**状態**:
```typescript
interface PriorityItem {
  id: string;
  label: string;
  value: number;  // 0-100
}
```

---

### 4.3 tradeoff_balance

**目的**: トレードオフを天秤で可視化

**Config**:
```typescript
{
  leftLabel?: string;   // 左側ラベル
  rightLabel?: string;  // 右側ラベル
  items?: TradeoffItem[];
}
```

**Output Ports**:
- `balance`: バランス値（-1〜1）
- `direction`: 傾き方向
- `recommendation`: 推奨テキスト
- `_completed`: 完了フラグ

**状態**:
```typescript
interface TradeoffItem {
  id: string;
  text: string;
  side: 'left' | 'right';
  weight: number;  // 1-5
}
```

---

### 4.4 timeline_slider

**目的**: 時間軸でイベントを配置

**Config**:
```typescript
{
  startLabel?: string;
  endLabel?: string;
  events?: TimelineEvent[];
}
```

**Output Ports**:
- `events`: イベント配列
- `_completed`: 完了フラグ

**状態**:
```typescript
interface TimelineEvent {
  id: string;
  label: string;
  position: number;  // 0-100
  color?: string;
}
```

---

## 5. Summary Widgets

### 5.1 structured_summary

**目的**: 思考整理の結果を構造化して表示・編集

**Config**:
```typescript
{
  title?: string;
  sections?: SummarySection[];
}
```

**Output Ports**:
- `title`: タイトル
- `sections`: セクション配列
- `conclusion`: 結論テキスト
- `_completed`: 完了フラグ

**状態**:
```typescript
type SectionType =
  | 'situation'    // 現状
  | 'problem'      // 問題
  | 'goal'         // 目標
  | 'options'      // 選択肢
  | 'decision'     // 決断
  | 'action_items' // アクションアイテム
  | 'concerns'     // 懸念点
  | 'next_steps'   // 次のステップ
  | 'custom';      // カスタム

interface SummarySection {
  id: string;
  type: SectionType;
  title: string;
  content: string;
  items?: string[];
  order: number;
}
```

**セクションタイプ設定**:
| タイプ | 日本語 | アイコン | 色 |
|--------|--------|---------|-----|
| situation | 現状 | 📍 | 青 |
| problem | 問題 | ⚠️ | 赤 |
| goal | 目標 | 🎯 | 緑 |
| options | 選択肢 | 🔀 | オレンジ |
| decision | 決断 | ✅ | 緑 |
| action_items | アクション | 📋 | 青 |
| concerns | 懸念点 | 💭 | オレンジ |
| next_steps | 次のステップ | ➡️ | 紫 |

---

## 6. ファイル構成

各Widgetは以下の構成:

```
concern-app/src/components/widgets/v3/{WidgetName}/
├── {WidgetName}.tsx           # Reactコンポーネント
├── {WidgetName}Controller.ts  # ロジック層
├── {WidgetName}.module.css    # スタイル
├── index.ts                   # エクスポート
└── __tests__/                 # テスト（一部）
```

---

## 7. 関連ドキュメント

- [DSL v3概要](../README.md)
- [ReactiveWidget設計](../../v3/ReactiveWidget-design.md)
- [Full-Flow設計](../../../project/phase4/full-flow-design.md)
