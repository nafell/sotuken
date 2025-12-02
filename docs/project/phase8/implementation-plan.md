# DSL v4 システム改修計画

**Version**: 1.0
**Date**: 2025-12-02
**Status**: Draft

---

## 目次

1. [概要](#1-概要)
2. [影響範囲分析](#2-影響範囲分析)
3. [実装フェーズ](#3-実装フェーズ)
4. [タスク詳細](#4-タスク詳細)
5. [リスクと対策](#5-リスクと対策)

---

## 1. 概要

### 1.1 目的

DSL v4要件定義書に基づき、システム改修を計画・実行する。

### 1.2 改修規模

| カテゴリ | 新規 | 改修 | 削除 |
|---------|------|------|------|
| 型定義 | 5 | 8 | 2 |
| サービス | 3 | 4 | 0 |
| コンポーネント | 2 | 3 | 0 |
| 設定ファイル | 2 | 1 | 0 |

### 1.3 依存関係

```
Phase 1: 型定義・基盤
    ↓
Phase 2: LLM呼び出し改修
    ↓
Phase 3: レンダラー改修
    ↓
Phase 4: UI・フロー改修
    ↓
Phase 5: 統合テスト
```

---

## 2. 影響範囲分析

### 2.1 Server側

| ファイル | 影響度 | 変更内容 |
|---------|--------|---------|
| `src/types/` | 高 | ORS, DpG, UISpec, ReactiveBinding型定義の追加・改修 |
| `src/services/UISpecGeneratorV3.ts` | 高 | 3段階LLM呼び出しへの改修（UISpecGeneratorV4として新規作成推奨） |
| `src/services/GeminiService.ts` | 中 | タスク別モデル切り替え対応 |
| `src/definitions/widgets.ts` | 中 | complexity追加、stage_summary Widget追加 |
| `src/routes.ts` | 中 | 新API追加（Widget選定、計画提示） |

### 2.2 Frontend側

| ファイル | 影響度 | 変更内容 |
|---------|--------|---------|
| `src/types/ui-spec.types.ts` | 高 | ORS, DpG, UISpec, ReactiveBinding型定義の追加・改修 |
| `src/services/ui-generation/UIRendererV3.tsx` | 高 | ReactiveBindingSpec対応（UIRendererV4として新規作成推奨） |
| `src/services/ui/ReactiveBindingEngine.ts` | 高 | ReactiveBindingSpec対応 |
| `src/components/widgets/v3/` | 中 | summarizationPrompt対応 |
| `src/components/widgets/v4/` | 新規 | stage_summary Widget |
| `src/pages/` | 中 | 計画提示画面、ナビゲーション機能 |

### 2.3 設定ファイル

| ファイル | 影響度 | 変更内容 |
|---------|--------|---------|
| `config/llm-tasks.json` | 新規 | タスク別モデル設定 |
| `config/experiment-patterns.json` | 新規 | 実験パターン設定 |
| `config/complexity-rules.json` | 新規 | complexity閾値ルール |

---

## 3. 実装フェーズ

### Phase 1: 型定義・基盤（推定: 3日）

**目標**: v4型定義の実装と既存コードとの共存確認

| タスク | 優先度 | 依存 |
|--------|--------|------|
| TASK-1.1: ORS型定義（Server） | Must | - |
| TASK-1.2: DependencyGraph型定義（Server） | Must | 1.1 |
| TASK-1.3: UISpec型定義改修（Server） | Must | 1.1, 1.2 |
| TASK-1.4: ReactiveBindingSpec型定義（Server） | Must | - |
| TASK-1.5: WidgetSelectionResult型定義（Server） | Must | - |
| TASK-1.6: Frontend型定義同期 | Must | 1.1-1.5 |
| TASK-1.7: Widget Definition改修（complexity追加） | Must | - |

### Phase 2: LLM呼び出し改修（推定: 5日）

**目標**: 3段階LLM呼び出しの実装

| タスク | 優先度 | 依存 |
|--------|--------|------|
| TASK-2.1: LLMTaskConfig型定義 | Must | Phase 1 |
| TASK-2.2: タスク別モデル切り替え基盤 | Should | 2.1 |
| TASK-2.3: WidgetSelectionService実装 | Must | 2.1 |
| TASK-2.4: ORSGeneratorService実装 | Must | 2.1 |
| TASK-2.5: UISpecGeneratorV4実装 | Must | 2.3, 2.4 |
| TASK-2.6: プロンプトテンプレート作成 | Must | 2.3-2.5 |
| TASK-2.7: バリデーション・エラーログ強化 | Must | 2.5 |

### Phase 3: レンダラー改修（推定: 4日）

**目標**: ReactiveBindingSpec対応のレンダラー実装

| タスク | 優先度 | 依存 |
|--------|--------|------|
| TASK-3.1: ReactiveBindingEngine改修 | Must | Phase 1 |
| TASK-3.2: UIRendererV4実装 | Must | 3.1 |
| TASK-3.3: DataBinding処理実装 | Must | 3.2 |
| TASK-3.4: complexity閾値チェック実装 | Should | 3.1 |

### Phase 4: UI・フロー改修（推定: 5日）

**目標**: 計画提示画面、stage_summary、ナビゲーション実装

| タスク | 優先度 | 依存 |
|--------|--------|------|
| TASK-4.1: 計画提示画面実装 | Must | Phase 2 |
| TASK-4.2: stage_summary Widget実装 | Should | Phase 3 |
| TASK-4.3: Widget操作言語化実装 | Should | 4.2 |
| TASK-4.4: ナビゲーション機能実装 | Should | Phase 3 |
| TASK-4.5: 進捗表示UI実装 | Should | 4.1 |

### Phase 5: 統合テスト（推定: 3日）

**目標**: E2Eテスト、パフォーマンス検証

| タスク | 優先度 | 依存 |
|--------|--------|------|
| TASK-5.1: 単体テスト追加 | Must | Phase 1-4 |
| TASK-5.2: E2Eテスト追加 | Must | 5.1 |
| TASK-5.3: パフォーマンス検証 | Should | 5.2 |
| TASK-5.4: エラーケーステスト | Must | 5.2 |

---

## 4. タスク詳細

### TASK-1.1: ORS型定義（Server）

**ファイル**: `server/src/types/ors.types.ts`（新規）

```typescript
// 新規作成
export interface ORS {
  version: string;
  entities: Entity[];
  dependencyGraph: DependencyGraph;
  metadata?: DICT<SVAL>;
}

export interface Entity {
  id: string;
  type: string;
  attributes: Attribute[];
  metadata?: DICT<SVAL>;
}

export interface Attribute {
  name: string;
  structuralType: StructuralType;
  valueType?: ConcreteType;
  itemType?: StructuralType;
  itemValueType?: ConcreteType;
  ref?: string;
  schema?: Record<string, any>;
  constraints?: Constraint[];
  generation?: GenerationSpec;
}

export type StructuralType = 'SVAL' | 'ARRY' | 'PNTR' | 'DICT';
export type ConcreteType = 'string' | 'number' | 'boolean' | 'date' | 'object';
```

**受入基準**:
- [ ] 型定義がコンパイルエラーなく完了
- [ ] 既存コードに影響なし

---

### TASK-1.2: DependencyGraph型定義（Server）

**ファイル**: `server/src/types/dependency-graph.types.ts`（新規）

```typescript
export interface DependencyGraph {
  dependencies: DataDependency[];
  metadata?: {
    version: string;
    generatedAt: number;
  };
}

export interface DataDependency {
  id: string;
  source: string;  // "entityId.attributeName"
  target: string;
  mechanism: 'validate' | 'update';
  relationship: RelationshipSpec;
}

export interface RelationshipSpec {
  type: 'javascript' | 'transform' | 'llm';
  javascript?: string;
  transform?: string;
  llmPrompt?: string;
}
```

---

### TASK-1.4: ReactiveBindingSpec型定義（Server）

**ファイル**: `server/src/types/reactive-binding.types.ts`（新規）

```typescript
export interface ReactiveBindingSpec {
  bindings: ReactiveBinding[];
  metadata?: {
    version: string;
    generatedAt: number;
  };
}

export interface ReactiveBinding {
  id: string;
  source: string;  // "widgetId.portId"
  target: string;
  mechanism: 'validate' | 'update';
  relationship: RelationshipSpec;
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
  complexityCheck?: boolean;
}
```

---

### TASK-1.7: Widget Definition改修

**ファイル**: `server/src/definitions/widgets.ts`

```typescript
// 既存のWidgetMetadataにcomplexity追加
export interface WidgetMetadata {
  timing: number;
  versatility: number;
  complexity: number;  // 追加
  bottleneck: string[];
}

// 各Widget定義にcomplexity値を追加
export const EmotionPaletteDefinition: WidgetDefinition = {
  // ...
  metadata: {
    timing: 0.15,
    versatility: 0.6,
    complexity: 0.3,  // 追加
    bottleneck: ['emotion', 'feeling', 'mood'],
  },
};

// stage_summary Widget定義を追加
export const StageSummaryDefinition: WidgetDefinition = {
  id: 'stage_summary',
  name: 'ステージサマリー',
  description: '前ステージまでの操作内容を要約表示',
  stage: 'all',
  ports: {
    inputs: [
      {
        id: 'previousStages',
        direction: 'in',
        dataType: 'object[]',
        description: '前ステージの要約データ',
        required: true,
      },
    ],
    outputs: [],
  },
  metadata: {
    timing: 0,
    versatility: 1.0,
    complexity: 0.1,
    bottleneck: [],
  },
  summarizationPrompt: '',  // 自身は要約不要
};
```

---

### TASK-2.3: WidgetSelectionService実装

**ファイル**: `server/src/services/WidgetSelectionService.ts`（新規）

```typescript
export class WidgetSelectionService {
  constructor(private llmService: LLMService) {}

  async selectWidgets(
    concernText: string,
    bottleneckType: string,
    widgetDefinitions: WidgetDefinition[]
  ): Promise<WidgetSelectionResult> {
    const prompt = this.buildPrompt(concernText, bottleneckType, widgetDefinitions);
    const result = await this.llmService.generate('widget_selection', prompt);
    return this.parseResult(result);
  }

  private buildPrompt(...): string {
    // プロンプト構築
  }

  private parseResult(result: string): WidgetSelectionResult {
    // 結果パース・バリデーション
  }
}
```

---

### TASK-2.4: ORSGeneratorService実装

**ファイル**: `server/src/services/ORSGeneratorService.ts`（新規）

```typescript
export class ORSGeneratorService {
  constructor(private llmService: LLMService) {}

  async generateORS(
    concernText: string,
    selectedWidgets: SelectedWidget[],
    previousStageResult?: StageResult
  ): Promise<ORS> {
    const prompt = this.buildPrompt(concernText, selectedWidgets, previousStageResult);
    const result = await this.llmService.generate('ors_generation', prompt);
    return this.parseAndValidate(result);
  }
}
```

---

### TASK-3.1: ReactiveBindingEngine改修

**ファイル**: `concern-app/src/services/ui/ReactiveBindingEngine.ts`

```typescript
// 変更点:
// 1. DependencyGraphSpec → ReactiveBindingSpec への変更
// 2. complexityチェック機能の追加

export class ReactiveBindingEngine {
  constructor(
    spec: ReactiveBindingSpec,  // 型変更
    config?: Partial<EngineConfig>
  ) {
    // ...
  }

  // complexity閾値チェック（新規）
  private validateComplexity(binding: ReactiveBinding): boolean {
    // targetのcomplexityが閾値以下かチェック
  }
}
```

---

### TASK-4.1: 計画提示画面実装

**ファイル**: `concern-app/src/pages/PlanPreview.tsx`（新規）

```typescript
interface PlanPreviewProps {
  selectionResult: WidgetSelectionResult;
  onConfirm: () => void;
}

export const PlanPreview: React.FC<PlanPreviewProps> = ({
  selectionResult,
  onConfirm,
}) => {
  return (
    <div>
      <h1>あなたの悩みを整理するプランを作成しました</h1>
      {Object.entries(selectionResult.stages).map(([stageId, stage]) => (
        <StagePreview key={stageId} stage={stage} />
      ))}
      <button onClick={onConfirm}>この計画で始める</button>
    </div>
  );
};
```

---

### TASK-4.2: stage_summary Widget実装

**ファイル**: `concern-app/src/components/widgets/v4/StageSummary/StageSummary.tsx`（新規）

```typescript
interface StageSummaryProps extends BaseWidgetProps {
  config: {
    previousStages: StageSummaryItem[];
  };
}

export const StageSummary: React.FC<StageSummaryProps> = ({ config }) => {
  return (
    <div className="stage-summary">
      <h3>これまでの整理内容</h3>
      {config.previousStages.map((stage) => (
        <div key={stage.stageId}>
          <h4>{stage.stageName}</h4>
          {stage.widgets.map((widget) => (
            <div key={widget.widgetId}>
              <strong>{widget.widgetName}</strong>
              <p>{widget.summary}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

---

## 5. リスクと対策

### 5.1 技術的リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 3段階LLM呼び出しによるレイテンシ増加 | 高 | 並列呼び出し検討、キャッシュ活用 |
| ORS/DpG生成品質のばらつき | 高 | プロンプト最適化、バリデーション強化 |
| 既存コードとの互換性問題 | 中 | v3/v4共存期間を設ける |

### 5.2 スケジュールリスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Phase 2の工数超過 | 高 | プロンプト作成を並行作業化 |
| 統合テストでの不具合多発 | 中 | 各Phase終了時に簡易テスト実施 |

### 5.3 マイグレーション戦略

```
Step 1: v4型定義・サービスを追加（v3と共存）
Step 2: 新規セッションをv4で処理
Step 3: v3コードを非推奨化
Step 4: v3コード削除
```

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-02 | 初版作成 |
| 1.0.1 | 2025-12-02 | OODM→ORS/TDDM用語変更 |
