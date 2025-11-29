# Phase 6 詳細実装タスク計画
**LLM実装エージェント向け - ステップバイステップガイド**

---

## 📋 実行前の確認事項

### 前提条件
- [ ] Phase 1-5完了済み（動的UI生成、Reactive Widget、E2Eテスト）
- [ ] `specs/project/phase6/experiment-requirements.md` を読んで要件を理解済み
- [ ] `specs/discussions/DSLv3_discussion_3.md` を読んで専門家評価設計を理解済み
- [ ] 既存のPostgreSQLスキーマを理解済み

### 実行ルール
1. **1タスクずつ実行** - 次に進む前に必ずテストを実行
2. **テスト失敗時は停止** - 人間に相談してから進行
3. **コミットタイミング** - 各Partの最後にコミット
4. **質問タイミング** - 不明点があれば実装前に人間に確認
5. **既存コードの尊重** - 既存実装を壊さないよう慎重に変更

---

## 🎯 Phase 6 実装サマリー

| Part | タスク数 | 優先度 | 内容 |
|------|---------|--------|------|
| Part 1: DBスキーマ・マイグレーション | 3 | ⭐️⭐️⭐️ | experiment_sessions, widget_states |
| Part 2: モデル切り替え機能 | 3 | ⭐️⭐️⭐️ | GeminiService拡張 |
| Part 3: 実験設定・テストケース | 3 | ⭐️⭐️⭐️ | 設定ファイル、10ケースJSON |
| Part 4: メトリクス記録API | 4 | ⭐️⭐️⭐️ | セッション保存、生成結果分離 |
| Part 5: 管理画面UI | 5 | ⭐️⭐️ | ダッシュボード、ケース選択 |
| Part 6: リプレイ機能 | 4 | ⭐️⭐️ | 読み取り専用UI、ステップナビ |
| Part 7: テスト・ドキュメント | 3 | ⭐️⭐️ | 統合テスト |

**合計**: 25タスク

---

## 🔨 Part 1: DBスキーマ・マイグレーション

### 🎯 目標
実験セッションとWidget状態を保存するためのテーブルを追加する。

---

### 1.1 experiment_sessionsテーブル追加

**目標**: 実験セッションのメタデータと生成結果を保存するテーブル
**ファイル**: `server/src/database/schema.ts`

**実装内容**:
```typescript
// 既存のimportに boolean を追加
import { pgTable, text, integer, timestamp, uuid, jsonb, boolean, index } from 'drizzle-orm/pg-core';

// ========================================
// 実験セッションテーブル
// ========================================

export const experimentSessions = pgTable('experiment_sessions', {
  sessionId: uuid('session_id').primaryKey().default(sql`gen_random_uuid()`),
  experimentType: text('experiment_type').notNull(), // 'technical' | 'expert' | 'user'
  caseId: text('case_id').notNull(),                 // 'case_01' ~ 'case_10' or 'custom'
  evaluatorId: text('evaluator_id'),                 // 評価者ID（匿名化）

  // 実験設定
  widgetCount: integer('widget_count').notNull(),    // 6 | 9 | 12 | 15
  modelId: text('model_id').notNull(),               // 使用モデル

  // 入力データ
  concernText: text('concern_text').notNull(),
  contextFactors: jsonb('context_factors').notNull(),

  // 生成結果（分離保存）
  generatedOodm: jsonb('generated_oodm'),            // OODM
  generatedDpg: jsonb('generated_dpg'),              // DependencyGraph
  generatedDsl: jsonb('generated_dsl'),              // UISpec DSL

  // メトリクス
  oodmMetrics: jsonb('oodm_metrics'),                // {promptTokens, responseTokens, latencyMs}
  dslMetrics: jsonb('dsl_metrics'),                  // {promptTokens, responseTokens, latencyMs}
  totalTokens: integer('total_tokens'),
  totalLatencyMs: integer('total_latency_ms'),
  generationSuccess: boolean('generation_success'),
  errorMessage: text('error_message'),

  // タイムスタンプ
  startedAt: timestamp('started_at', { withTimezone: true }).default(sql`now()`),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Microsoft Forms連携
  formsResponseId: text('forms_response_id')
}, (table) => ({
  typeCaseIdx: index('idx_exp_sessions_type_case').on(table.experimentType, table.caseId),
  evaluatorIdx: index('idx_exp_sessions_evaluator').on(table.evaluatorId),
  startedAtIdx: index('idx_exp_sessions_started').on(table.startedAt)
}));
```

**成功基準**:
- テーブル定義が追加されている
- インデックスが正しく定義されている

**テスト方法**:
```bash
# TypeScript型チェック
cd server && bun run build
```

---

### 1.2 widget_statesテーブル追加

**目標**: リプレイ用のWidget状態を保存するテーブル
**ファイル**: `server/src/database/schema.ts`

**実装内容**:
```typescript
// experiment_sessionsの後に追加

export const widgetStates = pgTable('widget_states', {
  stateId: uuid('state_id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid('session_id').notNull().references(() => experimentSessions.sessionId),
  stepIndex: integer('step_index').notNull(),
  widgetType: text('widget_type').notNull(),

  // Widget状態
  widgetConfig: jsonb('widget_config').notNull(),    // DSLのconfig部分
  userInputs: jsonb('user_inputs'),                  // ユーザー入力データ
  portValues: jsonb('port_values'),                  // Reactive Port値

  recordedAt: timestamp('recorded_at', { withTimezone: true }).default(sql`now()`)
}, (table) => ({
  sessionStepIdx: index('idx_widget_states_session').on(table.sessionId, table.stepIndex)
}));

// 型エクスポート追加
export type ExperimentSession = typeof experimentSessions.$inferSelect;
export type NewExperimentSession = typeof experimentSessions.$inferInsert;
export type WidgetState = typeof widgetStates.$inferSelect;
export type NewWidgetState = typeof widgetStates.$inferInsert;
```

**成功基準**:
- テーブル定義が追加されている
- 外部キー制約が正しい
- 型エクスポートが追加されている

---

### 1.3 マイグレーション実行

**目標**: スキーマ変更をデータベースに反映
**コマンド**:
```bash
cd server
bun run db:generate
bun run db:migrate
```

**成功基準**:
- マイグレーションが正常に完了
- テーブルが作成されている

**テスト方法**:
```bash
# Drizzle Studioで確認
bun run db:studio
```

**✅ Part 1 完了後にコミット**

---

## 🔨 Part 2: モデル切り替え機能

### 🎯 目標
GeminiServiceを拡張し、実験時に異なるLLMモデルを使用できるようにする。

---

### 2.1 GeminiService拡張

**目標**: モデルIDをパラメータとして受け取れるように拡張
**ファイル**: `server/src/services/GeminiService.ts`

**実装内容**:

1. クラスプロパティの追加:
```typescript
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelId: string;  // 追加
```

2. コンストラクタの拡張:
```typescript
  constructor(apiKey: string, modelId?: string) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelId = modelId || "gemini-2.5-flash-lite";
    this.model = this.genAI.getGenerativeModel({ model: this.modelId });
  }
```

3. getModelName()の更新:
```typescript
  getModelName(): string {
    return this.modelId;
  }
```

**成功基準**:
- モデルIDを指定できる
- デフォルトは "gemini-2.5-flash-lite"

---

### 2.2 サービスファクトリ更新

**目標**: createGeminiService関数でモデルIDを指定可能にする
**ファイル**: `server/src/services/GeminiService.ts`

**実装内容**:
```typescript
export function createGeminiService(modelId?: string): GeminiService {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  return new GeminiService(apiKey, modelId);
}
```

**成功基準**:
- オプションでモデルIDを受け取れる

---

### 2.3 UISpecGeneratorV3への適用

**目標**: UISpecGeneratorV3でモデルIDを使用できるようにする
**ファイル**: `server/src/services/UISpecGeneratorV3.ts`

**実装内容**:
UISpecGeneratorV3のコンストラクタまたはgenerate()メソッドで、GeminiServiceを生成する際にモデルIDを渡せるように拡張。

**注意点**:
- 既存の動作を壊さないよう、デフォルト値を設定
- 呼び出し元（routes）からモデルIDを受け取れるように

**テスト方法**:
```bash
cd server && bun run test
```

**✅ Part 2 完了後にコミット**

---

## 🔨 Part 3: 実験設定・テストケース

### 🎯 目標
実験設定ファイルと10ケースのテストデータを作成する。

---

### 3.1 実験設定ファイル作成

**目標**: Widget数条件とモデル条件を定義する設定ファイル
**ファイル**: `config/experiment-settings.json` (新規)

**実装内容**:
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
    }
  ],
  "modelConditions": [
    { "id": "lite", "modelId": "gemini-2.5-flash-lite", "displayName": "Gemini Flash Lite" },
    { "id": "standard", "modelId": "gemini-2.5-flash", "displayName": "Gemini Flash" },
    { "id": "pro", "modelId": "gemini-2.5-pro", "displayName": "Gemini Pro" }
  ],
  "defaultWidgetCount": 12,
  "defaultModel": "gemini-2.5-flash-lite"
}
```

---

### 3.2 テストケースディレクトリ作成

**目標**: 10ケースのテストデータを作成
**ディレクトリ**: `config/test-cases/` (新規)

**ファイル一覧**:
- `case_01.json` - 感情的混乱（Reactivityなし）
- `case_02.json` - 優先順位不明（Reactivityあり）
- `case_03.json` - 依存関係複雑（Reactivityあり）
- `case_04.json` - 比較困難（Reactivityあり）
- `case_05.json` - 分類不能（Reactivityなし）
- `case_06.json` - 視点不足（Reactivityなし）
- `case_07.json` - 時間軸不明（Reactivityあり）
- `case_08.json` - 深掘り不足（Reactivityなし）
- `case_09.json` - 複合ボトルネック（Reactivityあり）
- `case_10.json` - 総合ケース（Reactivityあり）

**テンプレート** (`case_02.json`の例):
```json
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

**参照**: `specs/discussions/DSLv3_discussion_3.md` の10ケース設計

---

### 3.3 設定読み込みサービス

**目標**: 設定ファイルを読み込むサービス
**ファイル**: `server/src/services/ExperimentConfigService.ts` (新規)

**実装内容**:
```typescript
import experimentSettings from '../../../config/experiment-settings.json';
import type { ExperimentSettings, TestCase } from '../types/experiment.types';

export class ExperimentConfigService {
  getWidgetConditions() {
    return experimentSettings.widgetCountConditions;
  }

  getModelConditions() {
    return experimentSettings.modelConditions;
  }

  getWidgetsByCount(count: number): string[] {
    const condition = experimentSettings.widgetCountConditions.find(c => c.widgetCount === count);
    return condition?.widgets || [];
  }

  async getTestCase(caseId: string): Promise<TestCase> {
    const testCase = await import(`../../../config/test-cases/${caseId}.json`);
    return testCase.default;
  }

  async getAllTestCases(): Promise<TestCase[]> {
    const caseIds = Array.from({ length: 10 }, (_, i) => `case_${String(i + 1).padStart(2, '0')}`);
    return Promise.all(caseIds.map(id => this.getTestCase(id)));
  }
}

export const experimentConfigService = new ExperimentConfigService();
```

**型定義** (`server/src/types/experiment.types.ts`):
```typescript
export interface WidgetCondition {
  id: string;
  widgetCount: number;
  widgets: string[];
}

export interface ModelCondition {
  id: string;
  modelId: string;
  displayName: string;
}

export interface ExperimentSettings {
  widgetCountConditions: WidgetCondition[];
  modelConditions: ModelCondition[];
  defaultWidgetCount: number;
  defaultModel: string;
}

export interface TestCase {
  caseId: string;
  title: string;
  description: string;
  expectedBottleneck: string[];
  hasReactivity: boolean;
  input: {
    concernText: string;
    contextFactors: Record<string, any>;
  };
  expectedWidgets: string[];
  evaluationFocus: string[];
}
```

**✅ Part 3 完了後にコミット**

---

## 🔨 Part 4: メトリクス記録API

### 🎯 目標
実験セッションの作成・取得・更新を行うAPIエンドポイントを実装する。

---

### 4.1 実験セッションルート

**目標**: セッションCRUD操作のエンドポイント
**ファイル**: `server/src/routes/experiment.ts` (新規)

**実装内容**:
```typescript
import { Hono } from 'hono';
import { db } from '../database';
import { experimentSessions, widgetStates } from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import { experimentConfigService } from '../services/ExperimentConfigService';

const experiment = new Hono();

// POST /api/experiment/sessions - セッション作成
experiment.post('/sessions', async (c) => {
  const body = await c.req.json();
  const session = await db.insert(experimentSessions).values({
    experimentType: body.experimentType,
    caseId: body.caseId,
    evaluatorId: body.evaluatorId,
    widgetCount: body.widgetCount,
    modelId: body.modelId,
    concernText: body.concernText,
    contextFactors: body.contextFactors,
  }).returning();
  return c.json(session[0]);
});

// GET /api/experiment/sessions - セッション一覧
experiment.get('/sessions', async (c) => {
  const sessions = await db.select().from(experimentSessions).orderBy(desc(experimentSessions.startedAt));
  return c.json(sessions);
});

// GET /api/experiment/sessions/:id - セッション詳細
experiment.get('/sessions/:id', async (c) => {
  const id = c.req.param('id');
  const session = await db.select().from(experimentSessions).where(eq(experimentSessions.sessionId, id));
  if (session.length === 0) {
    return c.json({ error: 'Session not found' }, 404);
  }
  return c.json(session[0]);
});

// PATCH /api/experiment/sessions/:id - セッション更新（完了時）
experiment.patch('/sessions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const updated = await db.update(experimentSessions)
    .set({
      ...body,
      completedAt: body.completedAt || new Date(),
    })
    .where(eq(experimentSessions.sessionId, id))
    .returning();
  return c.json(updated[0]);
});

export default experiment;
```

---

### 4.2 Widget状態保存エンドポイント

**ファイル**: `server/src/routes/experiment.ts` に追加

```typescript
// POST /api/experiment/sessions/:id/widget-states - Widget状態保存
experiment.post('/sessions/:id/widget-states', async (c) => {
  const sessionId = c.req.param('id');
  const body = await c.req.json();
  const state = await db.insert(widgetStates).values({
    sessionId,
    stepIndex: body.stepIndex,
    widgetType: body.widgetType,
    widgetConfig: body.widgetConfig,
    userInputs: body.userInputs,
    portValues: body.portValues,
  }).returning();
  return c.json(state[0]);
});

// GET /api/experiment/sessions/:id/widget-states - Widget状態取得（リプレイ用）
experiment.get('/sessions/:id/widget-states', async (c) => {
  const sessionId = c.req.param('id');
  const states = await db.select()
    .from(widgetStates)
    .where(eq(widgetStates.sessionId, sessionId))
    .orderBy(widgetStates.stepIndex);
  return c.json(states);
});
```

---

### 4.3 テストケースエンドポイント

**ファイル**: `server/src/routes/experiment.ts` に追加

```typescript
// GET /api/experiment/cases - ケース一覧
experiment.get('/cases', async (c) => {
  const cases = await experimentConfigService.getAllTestCases();
  return c.json(cases);
});

// GET /api/experiment/cases/:caseId - ケース詳細
experiment.get('/cases/:caseId', async (c) => {
  const caseId = c.req.param('caseId');
  try {
    const testCase = await experimentConfigService.getTestCase(caseId);
    return c.json(testCase);
  } catch {
    return c.json({ error: 'Case not found' }, 404);
  }
});

// GET /api/experiment/config - 実験設定
experiment.get('/config', async (c) => {
  return c.json({
    widgetConditions: experimentConfigService.getWidgetConditions(),
    modelConditions: experimentConfigService.getModelConditions(),
  });
});
```

---

### 4.4 ルート登録

**ファイル**: `server/src/index.ts` または `server/src/routes/index.ts`

```typescript
import experiment from './routes/experiment';

// 既存のルートに追加
app.route('/api/experiment', experiment);
```

**テスト方法**:
```bash
# サーバー起動
cd server && bun run dev

# API確認
curl http://localhost:3001/api/experiment/config
curl http://localhost:3001/api/experiment/cases
```

**✅ Part 4 完了後にコミット**

---

## 🔨 Part 5: 管理画面UI

### 🎯 目標
実験管理用のReactコンポーネントを作成する。

---

### 5.1 ルーティング設定

**ファイル**: `concern-app/src/App.tsx`

```typescript
// import追加
import ExperimentDashboard from './pages/research-experiment/ExperimentDashboard';
import CaseSelection from './pages/research-experiment/CaseSelection';
import CaseExecution from './pages/research-experiment/CaseExecution';
import SessionList from './pages/research-experiment/SessionList';
import SessionDetail from './pages/research-experiment/SessionDetail';
import ReplayView from './pages/research-experiment/ReplayView';

// Routes内に追加
<Route path="/research-experiment" element={<ExperimentDashboard />} />
<Route path="/research-experiment/cases" element={<CaseSelection />} />
<Route path="/research-experiment/execute/:caseId" element={<CaseExecution />} />
<Route path="/research-experiment/sessions" element={<SessionList />} />
<Route path="/research-experiment/sessions/:sessionId" element={<SessionDetail />} />
<Route path="/research-experiment/replay/:sessionId" element={<ReplayView />} />
```

---

### 5.2 ダッシュボードコンポーネント

**ファイル**: `concern-app/src/pages/research-experiment/ExperimentDashboard.tsx` (新規)

主な機能:
- セッション統計表示
- 最近のセッション一覧
- ナビゲーションボタン（新規セッション、全セッション表示、設定）

---

### 5.3 ケース選択コンポーネント

**ファイル**: `concern-app/src/pages/research-experiment/CaseSelection.tsx` (新規)

主な機能:
- 10ケースの一覧表示
- ケース詳細（悩み内容、想定ボトルネック）の表示
- Widget数・モデル選択
- 実行ボタン

---

### 5.4 ケース実行コンポーネント

**ファイル**: `concern-app/src/pages/research-experiment/CaseExecution.tsx` (新規)

主な機能:
- 選択したケースの実行
- 既存のWidgetFlowを埋め込み
- メトリクスの自動記録
- 完了後のセッションID表示

---

### 5.5 セッション一覧/詳細コンポーネント

**ファイル**: `concern-app/src/pages/research-experiment/SessionList.tsx` (新規)
**ファイル**: `concern-app/src/pages/research-experiment/SessionDetail.tsx` (新規)

主な機能:
- フィルタリング（実験タイプ、ケースID、日付）
- ページネーション
- 詳細表示（メトリクス、生成結果）
- リプレイ画面へのリンク

**✅ Part 5 完了後にコミット**

---

## 🔨 Part 6: リプレイ機能

### 🎯 目標
保存されたセッションを読み取り専用で再生する機能を実装する。

---

### 6.1 リプレイビューコンポーネント

**ファイル**: `concern-app/src/pages/research-experiment/ReplayView.tsx` (新規)

主な機能:
- セッションデータの取得
- Widget状態の復元
- 読み取り専用モードでの表示

---

### 6.2 読み取り専用WidgetFlow

既存のWidgetFlowコンポーネントに`readOnly`プロップを追加。

**影響ファイル**:
- `concern-app/src/components/widgets/v3/` 以下の各Widget

---

### 6.3 ステップナビゲーション

前へ/次へボタンでステップを切り替える機能。

---

### 6.4 メタ情報表示パネル

- セッションメタデータ（ケース、設定）
- メトリクス（トークン数、レイテンシ）
- Port値（デバッグ用）

**✅ Part 6 完了後にコミット**

---

## 🔨 Part 7: テスト・ドキュメント

### 7.1 APIテスト

**ファイル**: `server/src/routes/__tests__/experiment.test.ts` (新規)

テスト対象:
- セッションCRUD操作
- Widget状態保存・取得
- テストケース取得

---

### 7.2 統合テスト

**ファイル**: `tests/experiment-flow.test.ts` (新規)

テスト対象:
- ケース選択→実行→保存の一連の流れ
- リプレイ機能の動作確認

---

### 7.3 ドキュメント更新

- `README.md` に実験機能の説明追加
- `CLAUDE.md` に実験関連コマンド追加

**✅ Part 7 完了後にコミット**

---

## 📝 完了チェックリスト

- [ ] Part 1: DBスキーマ・マイグレーション
- [ ] Part 2: モデル切り替え機能
- [ ] Part 3: 実験設定・テストケース
- [ ] Part 4: メトリクス記録API
- [ ] Part 5: 管理画面UI
- [ ] Part 6: リプレイ機能
- [ ] Part 7: テスト・ドキュメント

---

## 参考文書

- [experiment-requirements.md](./experiment-requirements.md) - 要件定義書
- [DSLv3_discussion_3.md](../../discussions/DSLv3_discussion_3.md) - 専門家評価10ケース設計
- [DSLv3_discussion_2.md](../../discussions/DSLv3_discussion_2.md) - ユーザー検証設計
- [widget-v3-specifications.md](../../dsl-design/v3/widgets/widget-v3-specifications.md) - Widget仕様
