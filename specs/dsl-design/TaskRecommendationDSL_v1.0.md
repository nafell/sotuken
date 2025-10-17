# TaskRecommendationDSL v1.0 仕様書
**ホーム推奨タスク表示用DSL（DataSchema不要の簡易版）**

---

## 1. 概要

### 1.1 目的
TaskRecommendationDSLは、ホーム画面で「今やるべき最優先タスク1件」を選出・表示するための仕様です。

### 1.2 思考整理DSLとの違い

| 項目 | 思考整理DSL (DataSchema+UISpec) | TaskRecommendationDSL |
|------|-------------------------------|---------------------|
| **用途** | ユーザーが「考える」フロー | システムが「推す」UI |
| **DataSchema** | 必要（Entity構造を動的生成） | **不要**（構造固定） |
| **UI柔軟性** | planで高度にカスタマイズ | **固定構造**のみ |
| **動的要素** | Entity、属性、レイアウト | saliency制御のみ |
| **LLMの役割** | 構造とUI設計 | スコアリングのみ（将来拡張） |

**設計判断の理由:**
- タスクカードの構造は常に固定（`title`, `estimate`, `due_in_hours`）
- 変化するのは「どのタスクを選ぶか」と「どう目立たせるか」だけ
- DataSchemaを挟むと複雑化するだけで利点なし
- 将来的にミニ実行画面を追加する際も、構造を変えずに拡張可能

---

## 2. 基本構造

### 2.1 最上位構造

```typescript
interface TaskRecommendationDSL {
  version: "1.0";
  generatedAt: string;  // ISO 8601
  recommendationId: string;  // UUID
  
  type: "task_recommendation";  // 識別子
  
  // 推奨タスク情報
  selectedTask: {
    taskId: string;
    variant: "task_card" | "micro_step_card" | "prepare_step_card";
    saliency: 0 | 1 | 2 | 3;
  };
  
  // タスクカード表示仕様（固定構造）
  taskCard: TaskCardSpec;
  
  // スコアリング・選出ルール
  scoring: ScoringSpec;
  
  // 将来拡張: ミニ実行画面
  embeddedExecution?: EmbeddedExecutionSpec;
}
```

---

## 3. タスクカード仕様（TaskCardSpec）

### 3.1 固定構造

タスクカードの構造は**常に固定**で、以下のフィールドのみを表示:

```typescript
interface TaskCardSpec {
  // 表示フィールド（固定）
  fields: ["title", "estimate", "due_in_hours"];
  
  // variant別の表示内容調整
  variants: {
    task_card: TaskCardVariant;
    micro_step_card: MicroStepCardVariant;
    prepare_step_card: PrepareStepCardVariant;
  };
  
  // saliencyレベル別のスタイル
  saliencyStyles: {
    0: SaliencyStyle;
    1: SaliencyStyle;
    2: SaliencyStyle;
    3: SaliencyStyle;
  };
}
```

### 3.2 Variant（カード種別）

#### 3.2.1 task_card（本体タスク）

**使用条件:** `available_time >= estimate`

```typescript
interface TaskCardVariant {
  title: string;  // タスク名
  estimate: number;  // 見積時間（分）
  due_in_hours: number;  // 締切までの時間
  
  // 表示ラベル
  label: "今すぐ始められます";
  actionButton: "開始";
}
```

**レンダリング例（saliency=2）:**
```
┌────────────────────────────┐
│ 📋 今すぐ始められます         │
├────────────────────────────┤
│ 論文5本をピックアップ          │
│ 見積: 30分                   │
│ 締切: 6時間後                 │
│                            │
│        [開始] ボタン          │
└────────────────────────────┘
```

#### 3.2.2 micro_step_card（マイクロステップ）

**使用条件:** `available_time >= estimate_min_chunk AND has_independent_micro_step`

```typescript
interface MicroStepCardVariant {
  title: string;  // マイクロステップ名
  duration: number;  // 所要時間（分）
  parentTaskTitle: string;  // 元のタスク名
  
  // 表示ラベル
  label: "少しだけ進められます";
  actionButton: "10分だけやる";
}
```

**レンダリング例（saliency=2）:**
```
┌────────────────────────────┐
│ ⏱️ 少しだけ進められます        │
├────────────────────────────┤
│ 論文タイトル一覧を確認         │
│ 所要: 10分                   │
│ (論文5本ピックアップの一部)     │
│                            │
│    [10分だけやる] ボタン       │
└────────────────────────────┘
```

#### 3.2.3 prepare_step_card（準備ステップ）

**使用条件:** `available_time < estimate_min_chunk`

```typescript
interface PrepareStepCardVariant {
  title: string;  // 準備ステップ名
  duration: number;  // 所要時間（分）
  parentTaskTitle: string;  // 元のタスク名
  
  // 表示ラベル
  label: "準備だけでもしておきましょう";
  actionButton: "準備する";
}
```

**レンダリング例（saliency=1）:**
```
┌────────────────────────────┐
│ 🔧 準備だけでもしておきましょう  │
├────────────────────────────┤
│ 論文検索サイトを開く           │
│ 所要: 2分                    │
│ (論文5本ピックアップの準備)     │
│                            │
│      [準備する] ボタン         │
└────────────────────────────┘
```

---

### 3.3 Saliencyスタイル（視覚的強調）

```typescript
interface SaliencyStyle {
  backgroundColor: string;  // Tailwind CSSクラス
  fontSize: string;
  elevation: number;  // shadow-sm/md/lg/xl
  icon?: string;
  animation?: string;
}
```

#### 3.3.1 スタイル定義表

| Level | 名称 | 背景色 | フォント | 影 | アイコン | アニメ | 使用シーン |
|-------|------|--------|---------|-----|---------|---------|-----------|
| **0** | base | `bg-neutral-50` | `text-base` | `shadow-none` | - | - | 通常タスク（ほぼ使用しない） |
| **1** | emphasis | `bg-blue-50` | `text-md` | `shadow-sm` | - | - | 準備ステップ |
| **2** | primary | `bg-blue-100` | `text-lg font-semibold` | `shadow-md` | - | - | **推奨タスク（標準）** |
| **3** | urgent | `bg-red-100` | `text-lg font-bold` | `shadow-lg` | ⚠️ | `animate-pulse` | 緊急タスク（稀） |

**運用ルール:**
- Level 2が主力（通常の推奨タスク）
- Level 3は稀に発動（締切<24h かつ 重要度≥高）
- Level 1はマイクロステップ・準備ステップで使用
- Level 0は実質使用しない（推奨に入った時点でLevel 1以上）

---

## 4. スコアリング仕様（ScoringSpec）

### 4.1 基本構造

```typescript
interface ScoringSpec {
  // スコア計算式
  formula: string;  // "0.4*importance + 0.3*urgency + 0.2*staleness + 0.1*contextFit"
  
  // 各要素の正規化方法
  normalization: {
    importance: NormalizationRule;
    urgency: NormalizationRule;
    staleness: NormalizationRule;
    contextFit: NormalizationRule;
  };
  
  // ゲーティングルール（variant決定）
  gating: GatingRule[];
  
  // サリエンシー決定ルール
  saliencyRule: string;  // "if(due_in_hours<24 && importance>=0.67, 3, 2)"
}
```

### 4.2 スコア計算式（確定版）

```
最終スコア = 0.4 × importance + 0.3 × urgency + 0.2 × staleness + 0.1 × contextFit
```

**重み配分の理由:**
- **importance (40%)**: 長期的価値を最重視
- **urgency (30%)**: 締切圧にも反応するが、重要度より軽く
- **staleness (20%)**: 放置タスクの再浮上
- **contextFit (10%)**: センサー推定誤差を考慮して控えめ

---

### 4.3 正規化ルール

#### 4.3.1 importance（重要度）

```typescript
interface ImportanceNormalization {
  method: "discrete_3level";
  mapping: {
    low: 0.33,
    medium: 0.67,
    high: 1.0
  };
}
```

**理由:** 3段階なら直感的に判断でき、かつ十分な差別化が可能

---

#### 4.3.2 urgency（緊急度）

```typescript
interface UrgencyNormalization {
  method: "logistic";
  formula: "1 - logistic(due_in_hours, mid=48, k=0.1)";
}
```

**理由:**
- 締切が近いほど高スコア
- 48時間を境に急激に上昇
- 線形では締切直前の変化が小さすぎる

---

#### 4.3.3 staleness（陳腐化度）

```typescript
interface StalenessNormalization {
  method: "logistic";
  formula: "logistic(days_since_last_touch, mid=3, k=1.5)";
}
```

**理由:**
- 放置期間が長いほど高スコア
- 3日を境に上昇（1-2日は正常範囲）
- 放置タスクを再浮上させる

---

#### 4.3.4 contextFit（状況適合度）

```typescript
interface ContextFitNormalization {
  method: "additive";
  formula: "min(1, time_of_day_match*0.2 + location_match*0.3 + time_available_match*0.5)";
  
  components: {
    time_of_day_match: "task.preferred_time === factors.time_of_day ? 1 : 0";
    location_match: "task.preferred_location === factors.location_category ? 1 : 0";
    time_available_match: "factors.available_time >= task.estimate ? 1 : 0";
  };
}
```

**理由:**
- 時間が足りる（+0.5）: 最重要
- 場所が合う（+0.3）: 次点
- 時間帯が合う（+0.2）: 補助

---

### 4.4 ゲーティングルール

```typescript
interface GatingRule {
  condition: string;
  variant: "task_card" | "micro_step_card" | "prepare_step_card";
}
```

**ルール定義:**
```json
{
  "gating": [
    {
      "condition": "available_time >= estimate",
      "variant": "task_card"
    },
    {
      "condition": "available_time >= estimate_min_chunk && has_independent_micro_step",
      "variant": "micro_step_card"
    },
    {
      "condition": "true",
      "variant": "prepare_step_card"
    }
  ]
}
```

**評価順序:** 上から順に評価し、最初にマッチしたvariantを採用

**なぜこの3段階か:**
- 時間が足りないからと「何も表示しない」のは最悪
- 「今できる何か」を必ず提示して、少しでも前進させる
- 小さな着手の積み重ねが完了率を高める

---

### 4.5 サリエンシールール

```typescript
interface SaliencyRule {
  formula: string;  // "if(due_in_hours<24 && importance>=0.67, 3, 2)"
}
```

**ルール解説:**
```javascript
function calculateSaliency(task) {
  if (task.due_in_hours < 24 && task.importance >= 0.67) {
    return 3;  // urgent: 緊急（稀）
  } else {
    return 2;  // primary: 標準推奨
  }
}
```

**なぜLevel 3が稀か:**
- 多用すると慣れて効果が薄れる
- 「重要かつ締切直前」という2条件を満たす場合のみ最大強調

---

## 5. 将来拡張: ミニ実行画面（EmbeddedExecutionSpec）

### 5.1 概要

**目的:** めちゃくちゃ重要かつすぐ完了できそうなタスクは、カード内に小さい実行画面を埋め込んで直接実行可能にする

**現状:** Phase 1では実装しない（構造だけ定義）

### 5.2 構造定義

```typescript
interface EmbeddedExecutionSpec {
  enabled: boolean;
  condition: string;  // "importance >= 0.9 && estimate <= 5"
  
  miniUI: {
    component: "quick_action_panel";
    layout: "compact";
    actions: ["start", "snooze", "complete"];
  };
}
```

**発動条件例:**
- 重要度≥0.9（超重要）
- 見積≤5分（超短時間）
- 締切<6時間（超緊急）

**レンダリング例（将来）:**
```
┌────────────────────────────┐
│ ⚡ 超重要・すぐ終わります      │
├────────────────────────────┤
│ 指導教員にメール返信           │
│ 見積: 3分                    │
│ 締切: 2時間後                 │
├────────────────────────────┤
│ [即実行] [スヌーズ] [完了]     │  ← ミニ実行画面
└────────────────────────────┘
```

---

## 6. API仕様

### 6.1 エンドポイント

**`POST /v1/score/rank`**

### 6.2 リクエスト

```typescript
interface RankingRequest {
  available_time: number;  // 分単位
  factors: {
    time_of_day: "morning" | "afternoon" | "evening" | "night";
    location_category: "home" | "work" | "other";
    [key: string]: any;  // 将来のfactors拡張
  };
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  estimate: number;  // 分
  estimate_min_chunk: number;  // 分
  importance: number;  // 0-1
  urgency: number;  // 0-1（内部でdue_in_hoursから計算）
  due_in_hours: number;
  days_since_last_touch: number;
  has_independent_micro_step: boolean;
  
  // contextFit計算用
  preferred_time?: string;
  preferred_location?: string;
}
```

### 6.3 レスポンス

```typescript
interface RankingResponse {
  recommendation: {
    taskId: string;
    variant: "task_card" | "micro_step_card" | "prepare_step_card";
    saliency: 0 | 1 | 2 | 3;
    score: number;
  };
  
  // デバッグ情報
  debug?: {
    allScores: Array<{ taskId: string; score: number }>;
    normalizedFactors: {
      importance: number;
      urgencyN: number;
      stalenessN: number;
      contextFitN: number;
    };
  };
}
```

---

## 7. 実装例

### 7.1 スコアリング実装

```typescript
class TaskRecommendationService {
  calculateScore(task: Task, factors: FactorsDict): number {
    // 正規化
    const importance = task.importance;  // 既に0-1
    const urgencyN = 1 - this.logistic(task.due_in_hours, 48, 0.1);
    const stalenessN = this.logistic(task.days_since_last_touch, 3, 1.5);
    const contextFitN = this.calculateContextFit(task, factors);
    
    // スコア計算
    return 0.4 * importance + 0.3 * urgencyN + 0.2 * stalenessN + 0.1 * contextFitN;
  }
  
  private logistic(x: number, mid: number, k: number): number {
    return 1 / (1 + Math.exp(-k * (x - mid)));
  }
  
  private calculateContextFit(task: Task, factors: FactorsDict): number {
    let fit = 0;
    
    if (task.preferred_time === factors.time_of_day) fit += 0.2;
    if (task.preferred_location === factors.location_category) fit += 0.3;
    if (factors.available_time >= task.estimate) fit += 0.5;
    
    return Math.min(1, fit);
  }
  
  applyGating(task: Task, available_time: number): string {
    if (available_time >= task.estimate) {
      return "task_card";
    } else if (available_time >= task.estimate_min_chunk && task.has_independent_micro_step) {
      return "micro_step_card";
    } else {
      return "prepare_step_card";
    }
  }
  
  calculateSaliency(task: Task): number {
    if (task.due_in_hours < 24 && task.importance >= 0.67) {
      return 3;  // urgent
    } else {
      return 2;  // primary
    }
  }
}
```

---

## 8. 受け入れテスト

### 8.1 テストケース

| # | 条件 | 期待結果 |
|---|------|---------|
| 1 | available=30, estimate=20 | variant=task_card, saliency=2 |
| 2 | available=10, estimate=25, micro_step=true | variant=micro_step_card, saliency=2 |
| 3 | available=5, estimate_min_chunk=10 | variant=prepare_step_card, saliency=1 |
| 4 | due_in_hours=8, importance=high | saliency=3 (urgent) |
| 5 | days_since_last_touch=7 vs 1 | 7日放置タスクのスコアが高い |

---

## 9. 今後の拡張予定

### 9.1 短期（Phase 2）
- 実際のタスクデータでのA/Bテスト
- スコア重みの調整（実験結果に基づく）

### 9.2 中長期（Phase 3以降）
- ミニ実行画面の実装
- 機械学習ベースのスコア最適化
- 複数タスクの同時推奨（優先度順リスト）

---

## 10. 参考資料

- DataSchemaDSL v1.0 仕様書（思考整理用の別系統）
- UISpecDSL v1.0 仕様書（思考整理用の別系統）
- 動的UI仕様書 v0.5（スコア計算式の詳細説明）

---

**文書バージョン:** 1.0  
**最終更新:** 2025年10月12日  
**ステータス:** 確定（実装開始可能）

