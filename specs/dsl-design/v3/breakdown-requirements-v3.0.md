# Breakdown Phase Requirements v3.0
## Breakdownフェーズ要求仕様書

**Version**: 3.0
**Date**: 2025-11-14
**Base Spec**: [DSL Core Spec v3.0](./DSL-Core-Spec-v3.0.md)
**Purpose**: 固定UIによる効率的なタスク分解

---

## 1. フェーズ概要

### 1.1 目的

Breakdownフェーズは、Planフェーズで決定された方針を具体的なタスクに分解し、実行可能な行動計画を作成する。

### 1.2 動的化レベル

- **レベル**: 固定UI
- **動的範囲**: コンテンツ（タスク内容）のみ
- **固定要素**: UIレイアウト、コンポーネント構成、インタラクション

### 1.3 設計方針

**理由**: Planフェーズで適切な思考整理が完了していれば、Breakdownは定型的なタスク分解作業となる。UIの動的生成は不要で、むしろ一貫性のある固定UIの方が効率的。

---

## 2. 固定UIテンプレート

### 2.1 レイアウト構造

```typescript
interface BreakdownLayout {
  type: "fixed-three-panel";
  panels: {
    left: {
      id: "task-list",
      title: "タスクリスト",
      component: "sortable-list",
      width: "40%"
    };
    center: {
      id: "task-details",
      title: "タスク詳細",
      component: "detail-editor",
      width: "35%"
    };
    right: {
      id: "dependencies",
      title: "依存関係",
      component: "dependency-graph",
      width: "25%"
    };
  };
  footer: {
    component: "action-bar",
    actions: ["save", "export", "complete"]
  };
}
```

### 2.2 UIコンポーネント定義

#### 2.2.1 Sortable List（タスクリスト）

```json
{
  "component": "sortable-list",
  "config": {
    "features": {
      "drag_drop": true,
      "nesting": true,
      "checkbox": true,
      "priority_badge": true
    },
    "max_depth": 3,
    "item_template": {
      "title": "{task_name}",
      "subtitle": "{estimated_time}",
      "badge": "{priority}",
      "icon": "{status_icon}"
    }
  }
}
```

#### 2.2.2 Time Estimate（時間見積もり）

```json
{
  "component": "time-estimate",
  "config": {
    "units": ["minutes", "hours", "days"],
    "presets": [15, 30, 60, 120, 480],
    "allow_custom": true,
    "show_total": true,
    "buffer_percentage": 20
  }
}
```

#### 2.2.3 Dependency Graph（依存関係グラフ）

```json
{
  "component": "dependency-graph",
  "config": {
    "view_modes": ["list", "tree", "timeline"],
    "relationship_types": [
      "blocks",
      "requires",
      "optional"
    ],
    "auto_layout": true,
    "highlight_critical_path": true
  }
}
```

#### 2.2.4 Detail Editor（詳細エディタ）

```json
{
  "component": "detail-editor",
  "config": {
    "fields": [
      {"name": "description", "type": "textarea"},
      {"name": "success_criteria", "type": "checklist"},
      {"name": "resources", "type": "tags"},
      {"name": "risks", "type": "list"},
      {"name": "notes", "type": "markdown"}
    ]
  }
}
```

---

## 3. LLM生成範囲

### 3.1 生成対象（コンテンツのみ）

LLMは以下の内容のみを生成する：

```typescript
interface BreakdownContent {
  tasks: Task[];
  summary: {
    total_time: number;
    critical_path: string[];
    key_milestones: Milestone[];
  };
}

interface Task {
  id: string;
  name: string;
  description: string;
  estimated_time: number;
  priority: "high" | "medium" | "low";
  dependencies: string[];  // task IDs
  success_criteria: string[];
  resources_needed: string[];
  potential_risks: string[];
  parent_id?: string;  // for nested tasks
}

interface Milestone {
  name: string;
  tasks: string[];  // task IDs
  target_date?: string;
  success_metric: string;
}
```

### 3.2 生成しない要素

以下はLLMが生成せず、システムが固定で提供：

- UIレイアウト
- コンポーネントの種類と配置
- インタラクション方式
- スタイリング
- アニメーション

---

## 4. 入力仕様（Plan フェーズから）

### 4.1 PlanOutput の受け取り

```typescript
interface PlanOutput {
  summary: string;  // Planフェーズの構造化テキスト
  decisions: {
    primary: string;
    alternatives: string[];
    constraints: string[];
  };
  recommendations: {
    task_complexity: "simple" | "moderate" | "complex";
    breakdown_approach: "sequential" | "parallel" | "hierarchical";
    estimated_steps: number;
  };
}
```

### 4.2 入力解析

```typescript
function analyzeInput(planOutput: PlanOutput): BreakdownContext {
  return {
    main_goal: extractGoal(planOutput.summary),
    complexity_level: planOutput.recommendations.task_complexity,
    suggested_structure: planOutput.recommendations.breakdown_approach,
    constraints: planOutput.decisions.constraints,
    available_options: planOutput.decisions.alternatives
  };
}
```

---

## 5. タスク分解戦略

### 5.1 分解アプローチ

#### Sequential（順次実行）
```
タスク1 → タスク2 → タスク3 → ... → 完了
```
- 依存関係が強い場合
- リスクを最小化したい場合

#### Parallel（並行実行）
```
     ├→ タスク1 →┤
開始 →├→ タスク2 →├→ 完了
     └→ タスク3 →┘
```
- 独立したタスクが多い場合
- 時間を短縮したい場合

#### Hierarchical（階層的）
```
メインタスク
├── サブタスク1
│   ├── 詳細タスク1-1
│   └── 詳細タスク1-2
└── サブタスク2
    └── 詳細タスク2-1
```
- 複雑な問題の場合
- チーム作業の場合

### 5.2 タスク粒度の基準

```typescript
const granularityRules = {
  simple: {
    max_tasks: 5,
    max_depth: 1,
    time_unit: "hours"
  },
  moderate: {
    max_tasks: 15,
    max_depth: 2,
    time_unit: "hours_to_days"
  },
  complex: {
    max_tasks: 30,
    max_depth: 3,
    time_unit: "days_to_weeks"
  }
};
```

---

## 6. LLMプロンプト設計

### 6.1 タスク生成プロンプト

```
## 入力情報
決定事項: {plan_decision}
制約条件: {constraints}
推奨アプローチ: {breakdown_approach}

## タスク
上記の決定を実行可能なタスクに分解してください。

## 分解ルール
- 複雑度レベル: {complexity_level}
- 最大タスク数: {max_tasks}
- 階層深度: {max_depth}
- 各タスクは具体的で測定可能な成果物を持つこと

## 出力形式
{
  "tasks": [
    {
      "name": "タスク名（動詞で始める）",
      "description": "具体的な説明",
      "estimated_time": 数値（分単位）,
      "priority": "high|medium|low",
      "dependencies": ["依存するタスクID"],
      "success_criteria": ["完了基準1", "完了基準2"],
      "resources_needed": ["必要なリソース"],
      "potential_risks": ["想定されるリスク"]
    }
  ]
}

## 注意事項
- UIに関する指定は不要（固定UIを使用）
- タスクの内容と関係性のみに集中
- 実行可能性を重視
```

### 6.2 依存関係の推論

```
## タスクリスト
{generated_tasks}

## タスク
各タスク間の依存関係を特定してください。

## 依存関係の種類
- blocks: 完了しないと次が開始できない
- requires: 開始前に必要
- optional: あると望ましいが必須ではない

## 判定基準
1. 論理的順序（情報収集→分析→決定）
2. リソース競合（同じリソースを使う）
3. 成果物の利用（前タスクの出力を使う）
```

---

## 7. 出力仕様

### 7.1 BreakdownOutput

```typescript
interface BreakdownOutput {
  // タスクリスト
  tasks: Task[];

  // 実行計画
  execution_plan: {
    phases: ExecutionPhase[];
    critical_path: string[];
    total_duration: number;
    parallel_tracks: string[][];
  };

  // エクスポート用
  exports: {
    markdown: string;
    json: object;
    gantt_chart_data: object;
  };

  // 次のアクション
  next_actions: {
    immediate: string[];  // すぐに始められるタスク
    blockers: string[];   // 解決が必要な課題
    preparations: string[]; // 必要な準備
  };
}
```

### 7.2 エクスポート形式

#### Markdown形式
```markdown
# 実行計画: [メインゴール]

## フェーズ1: [フェーズ名]
- [ ] タスク1: [タスク名] (推定: 2時間)
  - 成功基準: ...
  - 必要リソース: ...
- [ ] タスク2: [タスク名] (推定: 1時間)

## フェーズ2: [フェーズ名]
...

## 合計推定時間: X時間
```

---

## 8. エラーハンドリング

### 8.1 エラーケース

```typescript
const errorHandling = {
  no_tasks_generated: {
    fallback: "汎用タスクテンプレートを提供",
    message: "タスクの生成に失敗しました。テンプレートを使用します。"
  },

  too_many_tasks: {
    fallback: "タスクをグループ化して削減",
    message: "タスクが多すぎます。主要なタスクに絞り込みます。"
  },

  circular_dependency: {
    fallback: "依存関係を自動解消",
    message: "循環依存を検出しました。自動的に解消します。"
  },

  invalid_time_estimate: {
    fallback: "デフォルト時間を設定",
    message: "時間見積もりが不正です。標準値を使用します。"
  }
};
```

### 8.2 テンプレートフォールバック

```json
{
  "simple_template": {
    "tasks": [
      {"name": "情報収集", "time": 60},
      {"name": "分析", "time": 120},
      {"name": "実行", "time": 180},
      {"name": "確認", "time": 30}
    ]
  },

  "complex_template": {
    "tasks": [
      {"name": "現状分析", "subtasks": ["データ収集", "問題特定"]},
      {"name": "計画立案", "subtasks": ["選択肢検討", "リスク評価"]},
      {"name": "実装", "subtasks": ["準備", "実行", "テスト"]},
      {"name": "評価", "subtasks": ["結果測定", "改善点抽出"]}
    ]
  }
}
```

---

## 9. パフォーマンス指標

### 9.1 効率性指標

| 指標 | 目標値 | 測定方法 |
|------|--------|---------|
| タスク生成時間 | < 3秒 | API応答時間 |
| タスク完了率 | 70% | 実際に完了したタスクの割合 |
| 時間見積もり精度 | ±30% | 実時間との差分 |
| 依存関係の妥当性 | 90% | ユーザー修正率から逆算 |

### 9.2 ユーザビリティ指標

- タスクの明確性（5段階評価）
- 分解の適切さ（5段階評価）
- 実行可能性（はい/いいえ）
- 修正の必要性（修正項目数）

---

## 10. 実装チェックリスト

- [ ] 固定UIテンプレートの実装
- [ ] Plan出力の解析ロジック
- [ ] タスク生成プロンプト
- [ ] 依存関係の推論
- [ ] 時間見積もりロジック
- [ ] エクスポート機能
- [ ] エラーハンドリング
- [ ] フォールバックテンプレート

---

## 11. 将来の拡張

### 11.1 短期的改善

- タスクテンプレートライブラリの充実
- 時間見積もりの学習による精度向上
- よく使うタスクパターンの保存

### 11.2 長期的拡張

- チームコラボレーション機能
- 外部タスク管理ツールとの連携
- 進捗トラッキング機能
- AIによる実行支援

---

## 付録: 実装例

### A.1 入力例（Planフェーズから）

```json
{
  "summary": "転職活動を3ヶ月計画で進める。スキルアップと並行して企業リサーチを行い、2ヶ月目から応募を開始する。",
  "decisions": {
    "primary": "現職を続けながら転職活動",
    "constraints": ["平日夜と週末のみ活動", "年収は下げない"]
  },
  "recommendations": {
    "task_complexity": "moderate",
    "breakdown_approach": "parallel",
    "estimated_steps": 12
  }
}
```

### A.2 生成されるタスク例

```json
{
  "tasks": [
    {
      "id": "t1",
      "name": "スキル棚卸しを行う",
      "description": "現在のスキルセットを整理し、強みと改善点を明確化",
      "estimated_time": 120,
      "priority": "high",
      "dependencies": [],
      "success_criteria": ["スキルマップ完成", "強み3つ特定"]
    },
    {
      "id": "t2",
      "name": "履歴書・職務経歴書を更新",
      "estimated_time": 180,
      "priority": "high",
      "dependencies": ["t1"],
      "success_criteria": ["最新情報反映", "実績を数値化"]
    },
    {
      "id": "t3",
      "name": "ターゲット企業リストを作成",
      "estimated_time": 240,
      "priority": "medium",
      "dependencies": ["t1"],
      "success_criteria": ["20社以上リストアップ", "優先順位付け完了"]
    }
  ]
}
```