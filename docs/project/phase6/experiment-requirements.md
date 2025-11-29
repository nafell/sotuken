# 実験・評価環境 開発要件定義書

> 作成日: 2025-11-28
> ステータス: Draft
> 関連文書: thesis-outline-rev2.md, DSLv3_discussion_2.md, DSLv3_discussion_3.md

## 1. 概要

本文書は、論文執筆に必要な実験・評価を実施するための環境構築およびUI作成の要件を定義する。

### 1.1 目的

- 技術性能評価の実施環境構築
- 専門家評価の実施環境構築
- ユーザー検証の実施環境構築
- 実験データの記録・閲覧・リプレイ機能の実装

### 1.2 関連するリサーチクエスチョン

| RQ | 内容 | 対応する実験 |
|----|------|-------------|
| RQ1 | Widget-to-Widget Reactivityは適切に生成されるか？ | 専門家評価 |
| RQ2 | 生成されるUIフローは思考整理に適切か？ | 専門家評価 + ユーザー検証 |
| RQ3 | Widget数とコンテキストウィンドウのトレードオフ | 技術評価 |
| RQ4 | LLMモデルの違いは生成品質にどう影響するか？ | モデル比較 |

---

## 2. 決定事項サマリー

| 項目 | 決定内容 | 議論経緯セクション |
|------|---------|-------------------|
| 実験優先順位 | 技術検証 > 専門家評価 > ユーザー検証 | 2.1 |
| 専門家評価方式 | 本人操作・評価者観察（リアルタイム） | 2.2 |
| 評価者 | 指導教員（情報工学）+ 第三者学生（情報工学） | 2.2 |
| データ保存先 | PostgreSQL（サーバー保存） | 2.3 |
| 評価シート | Microsoft Forms | 2.4 |
| テストケース形式 | JSONファイル | 2.5 |
| 管理画面パス | /research-experiment/ | 2.6 |
| Widget数条件 | 6/9/12個（15個は余裕があれば追加実装） | 2.7 |

### 2.1 実験優先順位の決定

**決定**: 技術検証（実験1-2）を最優先、ユーザー検証は低優先

**議論経緯**:
- 論文アウトラインでは5つの実験が計画されている
- 限られた時間で全て実施するには優先順位付けが必要
- 技術性能評価（トークン数、生成時間、成功率）は客観的データとして論文の根幹
- Widget数トレードオフ評価はRQ3に直接対応
- ユーザー検証は参加者募集・スケジュール調整のオーバーヘッドが大きい

**結論**: 全実験を実施予定だが、Phase分けで技術検証を先行

### 2.2 専門家評価方式の決定

**決定**: 本人操作・評価者観察方式（リアルタイム評価）

**議論経緯**:
- 選択肢として以下を検討：
  - A) オンライン評価（スクリーンショット/動画）
  - B) リアルタイム評価（本人操作）
  - C) リアルタイム評価（評価者操作）

- 本人操作方式の妥当性検討：
  - 本研究の評価対象は「生成されたUIの品質」であり「ユーザビリティ」ではない
  - RQ1, RQ2はいずれも「LLMが生成したもの」を評価
  - 操作の上手さは評価に影響しない
  - 操作説明の手間が省ける
  - 一貫した操作で公平な比較が可能

**結論**: 本人が操作し、評価者は観察して評価する方式を採用。評価シートには「生成されたUIフロー」が評価対象であることを明記。

**評価者の選定**:
- 指導教員（情報工学専門）：システム設計の観点からの評価
- 第三者学生（情報工学）：ユーザー視点に近い客観的評価

### 2.3 データ保存先の決定

**決定**: PostgreSQL（サーバー保存）

**議論経緯**:
- 選択肢として以下を検討：
  - A) ローカルのみ（IndexedDB + ファイルエクスポート）
  - B) サーバー保存（PostgreSQL）
  - C) ハイブリッド

- PostgreSQL採用の理由：
  - 既にDrizzle ORMでPostgreSQLを使用中（移行コスト低）
  - 集約管理でデータ損失リスク低減
  - バックアップ自動化可能
  - 複数端末からのアクセス可能（評価時に便利）

**結論**: 既存のPostgreSQL環境を拡張してスキーマ追加

### 2.4 評価シートの決定

**決定**: Microsoft Forms使用

**議論経緯**:
- 選択肢として以下を検討：
  - A) Googleフォーム
  - B) Microsoft Forms
  - C) 内蔵フォーム
  - D) 紙の評価シート

- Microsoft Forms採用の理由：
  - 大学のMicrosoft 365環境で利用可能
  - 実装工数ゼロ
  - 集計・エクスポート機能あり
  - セッションIDは手動入力で連携

**連携方式**: システム完了時にセッションIDを画面表示 → Formsで手動入力 → 後日CSVとDBを突合

### 2.5 テストケース形式の決定

**決定**: JSONファイル（config/test-cases/case_XX.json）

**議論経緯**:
- 選択肢として以下を検討：
  - A) JSONファイル
  - B) データベースのseedデータ
  - C) 設定ファイル内に埋め込み

- JSONファイル採用の理由：
  - 可読性が高い
  - バージョン管理しやすい
  - 個別ケースの編集が容易
  - フロントエンド・バックエンド両方から参照可能

### 2.6 管理画面パスの決定

**決定**: /research-experiment/

**議論経緯**:
- 選択肢として以下を検討：
  - A) 既存アプリ内に組み込み（/replay/:sessionId）
  - B) 別の管理画面として作成（/admin/replay）
  - C) 独立したビューアアプリ

- /research-experiment/ 採用の理由：
  - 研究・実験用途であることが明確
  - 通常のユーザーフローと分離
  - 将来的に実験関連機能を集約可能

### 2.7 Widget数条件の決定

**決定**: 6/9/12個の3条件（15個は余裕があれば追加実装）

**議論経緯**:
- 論文アウトラインでは6/9/12/15個の4条件を想定
- 現在の実装は12種類で完了
- 15個条件には追加Widget 3個の実装が必要
- 時間的制約を考慮し、追加実装は余裕があれば行う

**15個条件用の追加Widget計画**:
| Widget | カテゴリ | 目的 |
|--------|---------|------|
| scenario_tree | Converge | シナリオ分岐の可視化 |
| pairwise_comparison | Converge | 二択比較のトーナメント |
| resource_pie | Converge | リソース配分のパイチャート |

---

## 3. 実験構成

### 3.1 実験一覧と優先順位

| 優先度 | 実験 | RQ対応 | 内容 |
|-------|------|--------|------|
| **高** | 1. 技術性能評価 | RQ1, RQ3, RQ4 | トークン数、生成時間、成功率の計測 |
| **高** | 2. Widget数トレードオフ | RQ3 | 6/9/12個での比較評価 |
| **中** | 3. モデル比較 | RQ4 | 複数LLMモデルでの生成品質比較 |
| **中** | 4. 専門家評価 | RQ1, RQ2 | 10ケースでの品質評価 |
| **低** | 5. ユーザー検証 | RQ2 | 5名×2-3セッションでの実利用評価 |

### 3.2 計測対象メトリクス

```
技術メトリクス:
├── トークン使用量
│   ├── OODM生成: promptTokens, responseTokens
│   ├── DSL生成: promptTokens, responseTokens
│   └── 合計: totalTokens
├── レスポンス時間
│   ├── OODM生成: latencyMs
│   ├── DSL生成: latencyMs
│   └── 合計: totalLatencyMs
├── 生成成功率
│   ├── 構文エラー率
│   ├── 実行エラー率
│   └── Reactivity定義の妥当性
└── 設定情報
    ├── widgetCount: 6 | 9 | 12 | 15
    └── modelId: 使用LLMモデル
```

---

## 4. システム要件

### 4.1 現状の実装状況

#### Widget実装状況（12種類全て実装済み）

| カテゴリ | Widget | コンポーネント | Port定義 | テスト |
|---------|--------|--------------|----------|--------|
| Diverge | emotion_palette | ✅ | ✅ | ✅ |
| Diverge | brainstorm_cards | ✅ | ✅ | ✅ |
| Diverge | question_card_chain | ✅ | ✅ | - |
| Organize | card_sorting | ✅ | ✅ | - |
| Organize | dependency_mapping | ✅ | ✅ | - |
| Organize | swot_analysis | ✅ | ✅ | - |
| Organize | mind_map | ✅ | ✅ | - |
| Converge | matrix_placement | ✅ | ✅ | ✅ |
| Converge | priority_slider_grid | ✅ | ✅ | ✅ |
| Converge | tradeoff_balance | ✅ | ✅ | - |
| Converge | timeline_slider | ✅ | ✅ | - |
| Summary | structured_summary | ✅ | ✅ | - |

#### 既存インフラ

| 項目 | 状態 | 備考 |
|------|------|------|
| PostgreSQL | ✅ 導入済み | Drizzle ORM使用 |
| メトリクス収集 | ✅ 実装済み | GeminiServiceでトークン数、処理時間を収集 |
| 生成結果保存 | ⚠️ 部分的 | ui_generation_requestsにDSLのみ保存 |
| モデル切り替え | ❌ 未実装 | gemini-2.5-flash-lite固定 |

### 4.2 追加実装が必要な機能

#### 4.2.1 モデル切り替え機能

**対応モデル（初期）**:
```typescript
const SUPPORTED_MODELS = {
  'gemini-2.5-flash-lite': { provider: 'google', tier: 'lite' },
  'gemini-2.5-flash': { provider: 'google', tier: 'standard' },
  'gemini-2.5-pro': { provider: 'google', tier: 'pro' },
};
```

**GeminiService拡張**:
```typescript
// 現状: モデル固定
constructor(apiKey: string) {
  this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
}

// 拡張後: モデル指定可能
constructor(apiKey: string, modelId?: string) {
  const targetModel = modelId || "gemini-2.5-flash-lite";
  this.modelId = targetModel;
  this.model = this.genAI.getGenerativeModel({ model: targetModel });
}
```

#### 4.2.2 生成結果の分離保存

OODM、DependencyGraph、UISpec DSLを個別に保存し、リプレイ時に復元可能にする。

#### 4.2.3 リプレイ機能

- 読み取り専用モードでUIフローを再表示
- ステップ間ナビゲーション
- Widget状態の復元

#### 4.2.4 メトリクスダッシュボード

- セッション一覧（フィルタ機能付き）
- セッション詳細表示
- 集計・比較表示

---

## 5. データベーススキーマ

### 5.1 新規テーブル

#### experiment_sessions（実験セッション）

```sql
CREATE TABLE experiment_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_type TEXT NOT NULL,        -- 'technical' | 'expert' | 'user'
  case_id TEXT NOT NULL,                -- 'case_01' ~ 'case_10'
  evaluator_id TEXT,                    -- 評価者ID（匿名化）

  -- 設定
  widget_count INTEGER NOT NULL,        -- 6 | 9 | 12 | 15
  model_id TEXT NOT NULL,               -- 使用モデル

  -- 入力データ
  concern_text TEXT NOT NULL,
  context_factors JSONB NOT NULL,

  -- 生成結果（分離保存）
  generated_oodm JSONB,                 -- OODM
  generated_dpg JSONB,                  -- DependencyGraph
  generated_dsl JSONB,                  -- UISpec DSL

  -- メトリクス
  oodm_metrics JSONB,                   -- {promptTokens, responseTokens, latencyMs}
  dsl_metrics JSONB,                    -- {promptTokens, responseTokens, latencyMs}
  total_tokens INTEGER,
  total_latency_ms INTEGER,
  generation_success BOOLEAN,
  error_message TEXT,

  -- タイムスタンプ
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Microsoft Forms連携
  forms_response_id TEXT               -- FormsレスポンスIDとの紐付け
);

CREATE INDEX idx_exp_sessions_type_case ON experiment_sessions(experiment_type, case_id);
CREATE INDEX idx_exp_sessions_evaluator ON experiment_sessions(evaluator_id);
```

#### widget_states（リプレイ用Widget状態）

```sql
CREATE TABLE widget_states (
  state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES experiment_sessions(session_id),
  step_index INTEGER NOT NULL,
  widget_type TEXT NOT NULL,

  -- Widget状態
  widget_config JSONB NOT NULL,         -- DSLのconfig部分
  user_inputs JSONB,                    -- ユーザー入力データ
  port_values JSONB,                    -- Reactive Port値

  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_widget_states_session ON widget_states(session_id, step_index);
```

### 5.2 Drizzleスキーマ定義

```typescript
// server/src/database/schema.ts に追加

import { pgTable, text, integer, timestamp, uuid, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const experimentSessions = pgTable('experiment_sessions', {
  sessionId: uuid('session_id').primaryKey().default(sql`gen_random_uuid()`),
  experimentType: text('experiment_type').notNull(),
  caseId: text('case_id').notNull(),
  evaluatorId: text('evaluator_id'),

  widgetCount: integer('widget_count').notNull(),
  modelId: text('model_id').notNull(),

  concernText: text('concern_text').notNull(),
  contextFactors: jsonb('context_factors').notNull(),

  generatedOodm: jsonb('generated_oodm'),
  generatedDpg: jsonb('generated_dpg'),
  generatedDsl: jsonb('generated_dsl'),

  oodmMetrics: jsonb('oodm_metrics'),
  dslMetrics: jsonb('dsl_metrics'),
  totalTokens: integer('total_tokens'),
  totalLatencyMs: integer('total_latency_ms'),
  generationSuccess: boolean('generation_success'),
  errorMessage: text('error_message'),

  startedAt: timestamp('started_at', { withTimezone: true }).default(sql`now()`),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  formsResponseId: text('forms_response_id')
}, (table) => ({
  typeCaseIdx: index('idx_exp_sessions_type_case').on(table.experimentType, table.caseId),
  evaluatorIdx: index('idx_exp_sessions_evaluator').on(table.evaluatorId)
}));

export const widgetStates = pgTable('widget_states', {
  stateId: uuid('state_id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid('session_id').notNull().references(() => experimentSessions.sessionId),
  stepIndex: integer('step_index').notNull(),
  widgetType: text('widget_type').notNull(),

  widgetConfig: jsonb('widget_config').notNull(),
  userInputs: jsonb('user_inputs'),
  portValues: jsonb('port_values'),

  recordedAt: timestamp('recorded_at', { withTimezone: true }).default(sql`now()`)
}, (table) => ({
  sessionStepIdx: index('idx_widget_states_session').on(table.sessionId, table.stepIndex)
}));

// 型エクスポート
export type ExperimentSession = typeof experimentSessions.$inferSelect;
export type NewExperimentSession = typeof experimentSessions.$inferInsert;
export type WidgetState = typeof widgetStates.$inferSelect;
export type NewWidgetState = typeof widgetStates.$inferInsert;
```

---

## 6. テストケース設計

### 6.1 10ケース構成

DSLv3_discussion_3.mdの設計に基づく。

| Case | ボトルネック | Reactivity | 概要 |
|------|-------------|------------|------|
| 1 | 感情的混乱 | なし | 漠然とした不安の整理 |
| 2 | 優先順位不明 | あり | 複数タスクの優先度決定 |
| 3 | 依存関係複雑 | あり | タスク間の順序決定 |
| 4 | 比較困難 | あり | 2つの選択肢の比較 |
| 5 | 分類不能 | なし | 情報のカテゴリ分け |
| 6 | 視点不足 | なし | SWOT的な多角的分析 |
| 7 | 時間軸不明 | あり | スケジュール整理 |
| 8 | 深掘り不足 | なし | 問題の根本原因探索 |
| 9 | 複合ボトルネック | あり | 複数の問題が絡む |
| 10 | 総合ケース | あり | 全要素を含む複雑ケース |

### 6.2 JSONファイル形式

```json
// config/test-cases/case_02.json
{
  "caseId": "case_02",
  "title": "優先順位不明ケース",
  "description": "複数タスクの優先度を決定する必要がある状況",
  "expectedBottleneck": ["prioritization", "comparison"],
  "hasReactivity": true,

  "input": {
    "concernText": "やることが多すぎて何から手をつけていいかわからない。レポート3つ、バイトのシフト調整、就活の準備、サークルの引き継ぎ...",
    "contextFactors": {
      "timeOfDay": "afternoon",
      "availableTimeMin": 45,
      "category": "task_management",
      "approach": "organize",
      "urgency": "somewhat_urgent",
      "concernLevel": "moderate"
    }
  },

  "expectedWidgets": [
    "brainstorm_cards",
    "priority_slider_grid",
    "matrix_placement"
  ],

  "evaluationFocus": [
    "優先度設定Widgetの選択適切性",
    "BrainstormCards → PrioritySliderGridのReactivity"
  ]
}
```

### 6.3 ファイル配置

```
config/
└── test-cases/
    ├── case_01.json
    ├── case_02.json
    ├── case_03.json
    ├── case_04.json
    ├── case_05.json
    ├── case_06.json
    ├── case_07.json
    ├── case_08.json
    ├── case_09.json
    └── case_10.json
```

---

## 7. UI要件

### 7.1 研究実験管理画面（/research-experiment/）

```
/research-experiment/
├── /                       # ダッシュボード（セッション一覧、集計）
├── /cases                  # テストケース一覧・選択
├── /execute/:caseId        # ケース実行画面
├── /sessions               # セッション一覧
├── /sessions/:sessionId    # セッション詳細
├── /replay/:sessionId      # リプレイ画面
└── /settings               # 実験設定（Widget数、モデル選択）
```

### 7.2 ダッシュボード

```
┌─────────────────────────────────────────────────────────────────┐
│ 研究実験ダッシュボード                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [実験タイプ選択] ● 技術評価  ○ 専門家評価  ○ ユーザー検証      │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ セッション数  │  │ 平均トークン │  │ 平均レイテンシ│              │
│  │     42      │  │   12,345    │  │   2.3秒     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  最近のセッション                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ セッションID | ケース | Widget数 | モデル | 成功 | 日時      ││
│  │ abc123...   | case_02| 12      | flash | ✓   | 11/28 14:30 ││
│  │ def456...   | case_05| 9       | flash | ✓   | 11/28 14:15 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [新規セッション開始] [全セッション表示] [設定]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 ケース実行画面

```
┌─────────────────────────────────────────────────────────────────┐
│ ケース実行: Case 02 - 優先順位不明ケース                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  設定                                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Widget数: [6] [9] [●12]                                   │  │
│  │ モデル:   [●flash-lite] [flash] [pro]                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ケース情報                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 悩み: やることが多すぎて何から手をつけていいかわからない...│  │
│  │ 想定ボトルネック: prioritization, comparison              │  │
│  │ Reactivity: あり                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│                    [実行開始]                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 リプレイ画面

```
┌─────────────────────────────────────────────────────────────────┐
│ リプレイ: セッション abc123...                    [読み取り専用] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  メタ情報                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ケース: Case 02 | Widget数: 12 | モデル: flash-lite      │  │
│  │ トークン: 12,345 | レイテンシ: 2.3秒 | 成功: ✓           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │              [Widget表示エリア]                           │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ステップ: [◀ 前へ] Step 2 / 4 [次へ ▶]                        │
│                                                                  │
│  Port値表示（デバッグ用）                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ brainstorm_cards.cards: [{id: "1", text: "レポート"}...] │  │
│  │ priority_slider_grid.items: (← connected)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Microsoft Forms連携

### 8.1 連携フロー

```
1. システムでセッション開始
   → sessionId生成（UUID）

2. セッション完了時
   → 画面にsessionIdを表示
   → 「評価シートを開く」ボタン表示

3. Microsoft Formsで評価入力
   → フォーム冒頭でsessionIdを手動入力

4. データ突合（後日）
   → FormsのCSVエクスポート
   → sessionIdでDBと突合
   → forms_response_idを更新
```

### 8.2 専門家評価用Forms構成

```
■ セクション0: セッション情報
Q0-1: セッションID（短いテキスト）
      説明: 「画面に表示されたセッションIDを入力してください」
Q0-2: ケース番号（ドロップダウン: Case1〜Case10）
Q0-3: 評価日時（自動記録）

■ セクション1: Part A - ボトルネック診断
Q1: 悩みの本質的なボトルネックは正確に特定されていましたか？
    (5段階: 全く特定できていない ← → 完全に特定できていた)
Q2: 特定されたボトルネックの種類は適切でしたか？
    (5段階)
Q3: （自由記述）ボトルネック診断について気づいた点

■ セクション2: Part B - コンポーネント選択
Q4: 選択されたWidgetはボトルネック解消に適切でしたか？
    (5段階)
Q5: Widgetの組み合わせは論理的でしたか？
    (5段階)
Q6: 不足していると感じたWidgetはありましたか？
    (複数選択 + 自由記述)
Q7: 過剰だと感じたWidgetはありましたか？
    (複数選択 + 自由記述)

■ セクション3: Part C - フロー構成
Q8: Widgetの表示順序は思考の流れに沿っていましたか？
    (5段階)
Q9: 全体のステップ数は適切でしたか？
    (3択: 少なすぎる / 適切 / 多すぎる)
Q10: フロー構成について改善点があれば記述してください
    (自由記述)

■ セクション4: Part D - Reactivity（該当ケースのみ）
Q11: Widget間のデータ連携は直感的でしたか？
    (5段階 + 該当しない)
Q12: 連携によって入力の手間は軽減されていましたか？
    (5段階 + 該当しない)
Q13: 連携の挙動で混乱した点はありましたか？
    (自由記述)
Q14: Reactivityの有用性を総合的にどう評価しますか？
    (5段階 + 該当しない)

■ セクション5: Part E - カスタマイズ
Q15: Widgetの設定（軸ラベル等）は適切でしたか？
    (5段階)
Q16: 設定について改善点があれば記述してください
    (自由記述)

■ セクション6: Part F - 総合評価
Q17: このUIフローは思考整理に役立つと思いますか？
    (5段階)
Q18: 同様の悩みを持つ人に勧められますか？
    (5段階)
Q19: 全体を通しての感想・改善提案
    (自由記述)
```

### 8.3 ユーザー検証用Forms構成

```
■ 事前アンケート（初回のみ）
Q1: 学年を教えてください（選択式）
Q2: 専攻分野を教えてください（選択式）
Q3: 普段、悩みや考えを整理するときどうしていますか？（複数選択）
Q4: スマートフォン・PCの利用頻度（選択式）
Q5: AIツール（ChatGPT等）の利用経験（選択式）

■ 事後アンケート（毎セッション後）
セッションID入力欄

Q1: 生成されたUIは悩みの整理に役立ちましたか？（5段階）
Q2: Widgetの操作は直感的でしたか？（5段階）
Q3: フローの長さは適切でしたか？（3択）
Q4: 思考の流れに沿っていると感じましたか？（5段階）
Q5: また使いたいと思いますか？（5段階）
Q6: 改善してほしい点があれば教えてください（自由記述）
Q7: その他感想（自由記述）

■ 最終アンケート（全セッション終了後）
Q1: 複数回使用して、使いやすさは向上しましたか？（5段階）
Q2: 生成されるUIに一貫性を感じましたか？（5段階）
Q3: 最も役立ったWidgetはどれですか？（複数選択）
Q4: 最も使いにくかったWidgetはどれですか？（複数選択）
Q5: 全体を通しての改善提案（自由記述）
```

---

## 9. 実施プロトコル

### 9.1 専門家評価プロトコル

```
■ 評価概要
- 評価者: 指導教員（情報工学）、第三者学生（情報工学）
- ケース数: 10ケース
- 評価方式: 本人操作・評価者観察（リアルタイム）
- 所要時間: 約90-120分（10ケース全体）

■ 事前準備（評価日前）
1. 10ケースのJSONデータを準備
2. Microsoft Forms評価シートを作成
3. 実験環境の動作確認
4. 評価者への説明資料準備

■ 評価当日の流れ

0. オープニング（5分）
   - 研究概要の説明
   - 評価の目的・観点の説明
   - 「生成されたUIの品質」を評価対象と明示

1. ケース実行（各ケース約8-10分）× 10ケース
   [ケース開始]
   a. ケース概要の説明（悩み内容、想定ボトルネック）
   b. システムで生成実行
   c. 生成されたUIフローを操作して見せる
   d. Reactivity発動時は「ここで連携が起きた」と解説
   e. セッションID確認
   [ケース終了]
   f. 評価者がMicrosoft Formsに評価入力（3-5分）

2. クロージング（10分）
   - 全体を通しての感想ヒアリング
   - 改善提案の確認
   - 質疑応答
```

### 9.2 ユーザー検証プロトコル

```
■ 検証概要
- 参加者: 5名（大学生想定）
- セッション数: 各2-3セッション
- 検証方式: 参加者自身が操作
- 所要時間: 初回60分、2回目以降30-40分

■ 参加者募集・事前準備
1. 参加者募集（同意書取得）
2. 参加者IDの発行（匿名化）
3. 事前アンケートの準備

■ 初回セッション（約60分）

1. オープニング（10分）
   - 研究概要・目的の説明
   - プライバシー配慮の説明
   - 操作方法の説明

2. 事前アンケート（5分）
   - 基本属性（学年、専攻）
   - 普段の悩み整理方法
   - ITリテラシー自己評価

3. 実タスク（30-40分）
   - 参加者自身の実際の悩みを入力
   - 生成されたUIフローを自由に操作
   - 操作ログは自動収集
   - 必要に応じてサポート（最小限）

4. 事後アンケート（5分）
   - Microsoft Forms: 7問

■ 2回目以降セッション（約30-40分）
- 操作説明は省略
- 新たな悩みで実施
- 事後アンケートのみ

■ 最終インタビュー（全セッション終了後、15-20分）
- 半構造化インタビュー
- 5カテゴリの質問
```

### 9.3 インタビューガイド

```
1. 全体的な印象
   - 「全体を通して、このツールをどう思いましたか？」
   - 「既存の悩み整理方法と比べてどうでしたか？」

2. UI生成について
   - 「生成されたUIは期待通りでしたか？」
   - 「驚いた点や意外だった点はありますか？」

3. 個別Widgetについて
   - 「特に使いやすかったWidgetはありますか？」
   - 「逆に使いにくかったものは？」

4. Reactivityについて
   - 「Widget間でデータが連携する機能に気づきましたか？」
   - 「連携は便利でしたか？混乱しましたか？」

5. 改善提案
   - 「こういう機能があったら良いと思うものはありますか？」
   - 「友人に勧めるとしたら、どう説明しますか？」
```

---

## 10. 実装フェーズ

### Phase 1（最優先）

| タスク | 詳細 | 見積 |
|--------|------|------|
| PostgreSQLスキーマ拡張 | experiment_sessions, widget_statesテーブル追加 | - |
| マイグレーション実行 | bun run db:generate && bun run db:migrate | - |
| メトリクス記録API | セッション保存エンドポイント | - |
| 生成結果保存機能 | OODM/DpG/DSL分離保存 | - |
| モデル切り替え機能 | GeminiService拡張、設定ファイル | - |
| Widget数切替設定 | config/experiment-settings.json | - |

### Phase 2

| タスク | 詳細 | 見積 |
|--------|------|------|
| リプレイ機能（UI） | /research-experiment/replay/:sessionId | - |
| ケース選択UI | /research-experiment/cases | - |
| メトリクスダッシュボード | /research-experiment/ | - |
| 10ケースJSONデータ作成 | config/test-cases/ | - |
| Microsoft Forms作成 | 専門家評価用、ユーザー検証用 | - |

### Phase 3（余裕があれば）

| タスク | 詳細 | 見積 |
|--------|------|------|
| 追加Widget 3個 | scenario_tree, pairwise_comparison, resource_pie | - |
| ユーザー検証用ログ収集 | 操作ログ詳細記録 | - |
| Forms自動連携スクリプト | CSVインポート、突合処理 | - |

---

## 11. 設定ファイル

### 11.1 実験設定（config/experiment-settings.json）

```json
{
  "widgetCountConditions": [
    {
      "id": "condition_6",
      "widgetCount": 6,
      "widgets": [
        "brainstorm_cards",
        "card_sorting",
        "matrix_placement",
        "emotion_palette",
        "priority_slider_grid",
        "structured_summary"
      ]
    },
    {
      "id": "condition_9",
      "widgetCount": 9,
      "widgets": [
        "brainstorm_cards",
        "card_sorting",
        "matrix_placement",
        "emotion_palette",
        "priority_slider_grid",
        "structured_summary",
        "question_card_chain",
        "dependency_mapping",
        "tradeoff_balance"
      ]
    },
    {
      "id": "condition_12",
      "widgetCount": 12,
      "widgets": [
        "brainstorm_cards",
        "card_sorting",
        "matrix_placement",
        "emotion_palette",
        "priority_slider_grid",
        "structured_summary",
        "question_card_chain",
        "dependency_mapping",
        "tradeoff_balance",
        "swot_analysis",
        "mind_map",
        "timeline_slider"
      ]
    },
    {
      "id": "condition_15",
      "widgetCount": 15,
      "widgets": [
        "brainstorm_cards",
        "card_sorting",
        "matrix_placement",
        "emotion_palette",
        "priority_slider_grid",
        "structured_summary",
        "question_card_chain",
        "dependency_mapping",
        "tradeoff_balance",
        "swot_analysis",
        "mind_map",
        "timeline_slider",
        "scenario_tree",
        "pairwise_comparison",
        "resource_pie"
      ],
      "status": "planned"
    }
  ],
  "modelConditions": [
    { "id": "lite", "modelId": "gemini-2.5-flash-lite", "tier": "lite" },
    { "id": "standard", "modelId": "gemini-2.5-flash", "tier": "standard" },
    { "id": "pro", "modelId": "gemini-2.5-pro", "tier": "pro" }
  ],
  "defaultWidgetCount": 12,
  "defaultModel": "gemini-2.5-flash-lite"
}
```

---

## 12. 参考文書

- [thesis-outline-rev2.md](../research/Thoughts_Discussions/thesis-outline-rev2.md) - 論文アウトライン
- [DSLv3_discussion_2.md](./DSLv3_discussion_2.md) - ユーザー検証設計（L331-438）
- [DSLv3_discussion_3.md](./DSLv3_discussion_3.md) - 専門家評価設計（10ケース詳細）
- [widget-v3-specifications.md](../dsl-design/v3/widgets/widget-v3-specifications.md) - Widget仕様
- [ReactiveWidget-design.md](../dsl-design/v3/ReactiveWidget-design.md) - Reactivityシステム設計
