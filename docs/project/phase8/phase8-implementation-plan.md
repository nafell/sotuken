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

### TASK-1.3: UISpec型定義改修（Server）

**ファイル**: `server/src/types/ui-spec.types.ts`（改修）

```typescript
// 既存のUISpec型を改修
export interface UISpec {
  sessionId: string;
  stage: StageType;
  widgets: WidgetSpec[];
  reactiveBindings: ReactiveBindingSpec;  // 追加: ReactiveBindingを含める
  layout: ScreenLayout;
  metadata: UISpecMetadata;
}

// WidgetSpecにdataBindings追加
export interface WidgetSpec {
  id: string;
  component: WidgetComponentType;
  position: number;
  layout?: LayoutType;
  config: WidgetConfig;
  dataBindings: DataBindingSpec[];  // 追加: ORSへのバインディング
  metadata: WidgetSpecMetadata;
}

export interface DataBindingSpec {
  portId: string;
  entityAttribute: string;  // "entityId.attributeName"
  direction: 'in' | 'out' | 'inout';
}
```

**受入基準**:
- [ ] 既存のUISpecとの後方互換性を維持
- [ ] ReactiveBindingSpecを含む形で型定義が完了

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

### TASK-1.5: WidgetSelectionResult型定義（Server）

**ファイル**: `server/src/types/widget-selection.types.ts`（新規）

```typescript
export interface WidgetSelectionResult {
  stages: {
    diverge: StageSelection;
    organize: StageSelection;
    converge: StageSelection;
    summary: StageSelection;
  };
  rationale: string;  // 全体の選定理由
  metadata: {
    generatedAt: number;
    llmModel: string;
    bottleneckType: string;
  };
}

export interface StageSelection {
  widgets: SelectedWidget[];
  purpose: string;   // このステージの分析目的
  target: string;    // 分析対象
}

export interface SelectedWidget {
  widgetId: WidgetComponentType;
  purpose: string;   // このWidgetの使用目的
  order: number;     // ステージ内での表示順序
  suggestedConfig?: Record<string, any>;  // 推奨設定
}
```

**受入基準**:
- [ ] 4ステージ分のWidget選定結果を格納可能
- [ ] 各Widget/ステージに目的・対象を含む

---

### TASK-1.6: Frontend型定義同期

**ファイル**: `concern-app/src/types/ui-spec.types.ts`（改修）

**作業内容**:
- Server側で定義した以下の型をFrontendにも反映
  - ORS, Entity, Attribute, StructuralType, ConcreteType
  - DependencyGraph, DataDependency, RelationshipSpec
  - ReactiveBindingSpec, ReactiveBinding
  - WidgetSelectionResult, StageSelection, SelectedWidget
  - UISpec改修（reactiveBindings, dataBindings追加）

**方針**:
- 共通型定義ファイルを作成し、Server/Frontendで共有する方法を検討
- 現状は手動同期（将来的にはmonorepo対応を検討）

**受入基準**:
- [ ] Server側とFrontend側で型定義が一致
- [ ] Frontendビルドがエラーなく完了

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

### TASK-2.1: LLMTaskConfig型定義

**ファイル**: `server/src/types/llm-task.types.ts`（新規）

```typescript
export interface LLMTaskConfig {
  taskType: LLMTaskType;
  model: ModelConfig;
  promptTemplate: string;
  outputSchema?: JSONSchema;
  maxRetries: number;
  timeout: number;
}

export type LLMTaskType =
  | 'capture_diagnosis'    // Captureフェーズ診断
  | 'widget_selection'     // Widget選定
  | 'ors_generation'       // ORS生成
  | 'uispec_generation'    // UISpec生成
  | 'summary_generation';  // まとめ生成

export interface ModelConfig {
  provider: 'gemini' | 'openai';
  modelId: string;
  temperature: number;
  maxTokens?: number;
}
```

**受入基準**:
- [ ] 5種類のLLMタスクタイプを定義
- [ ] モデル設定を柔軟に変更可能

---

### TASK-2.2: タスク別モデル切り替え基盤

**ファイル**: `server/src/services/LLMOrchestrator.ts`（新規）

```typescript
export class LLMOrchestrator {
  private taskConfigs: Map<LLMTaskType, LLMTaskConfig>;

  constructor(configPath: string) {
    this.taskConfigs = this.loadConfigs(configPath);
  }

  async execute<T>(taskType: LLMTaskType, input: string): Promise<T> {
    const config = this.taskConfigs.get(taskType);
    if (!config) throw new Error(`Unknown task type: ${taskType}`);

    const llmService = this.getLLMService(config.model);
    return llmService.generate(input, config);
  }

  private getLLMService(model: ModelConfig): LLMService {
    // provider に応じたサービスを返す
  }
}
```

**設定ファイル**: `config/llm-tasks.json`

```json
{
  "capture_diagnosis": {
    "model": { "provider": "gemini", "modelId": "gemini-2.5-flash", "temperature": 0.7 },
    "maxRetries": 3,
    "timeout": 30000
  },
  "widget_selection": {
    "model": { "provider": "gemini", "modelId": "gemini-2.5-flash", "temperature": 0.5 }
  },
  "ors_generation": {
    "model": { "provider": "gemini", "modelId": "gemini-2.5-flash", "temperature": 0.3 }
  }
}
```

**受入基準**:
- [ ] タスクごとに異なるモデル・パラメータを設定可能
- [ ] 設定ファイルでモデル設定を管理可能

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

### TASK-2.5: UISpecGeneratorV4実装

**ファイル**: `server/src/services/UISpecGeneratorV4.ts`（新規）

```typescript
export class UISpecGeneratorV4 {
  constructor(
    private widgetSelectionService: WidgetSelectionService,
    private orsGeneratorService: ORSGeneratorService,
    private llmOrchestrator: LLMOrchestrator
  ) {}

  async generate(
    concernText: string,
    bottleneckType: string,
    stage: StageType,
    previousStageResult?: StageResult
  ): Promise<UISpec> {
    // 1. Widget選定（初回のみ、以降はキャッシュ）
    const selectionResult = await this.widgetSelectionService.selectWidgets(
      concernText,
      bottleneckType,
      widgetDefinitions
    );

    // 2. ORS + DpG生成
    const ors = await this.orsGeneratorService.generateORS(
      concernText,
      selectionResult.stages[stage].widgets,
      previousStageResult
    );

    // 3. UISpec生成
    const uispec = await this.generateUISpec(ors, selectionResult.stages[stage]);

    return uispec;
  }

  private async generateUISpec(ors: ORS, stageSelection: StageSelection): Promise<UISpec> {
    const prompt = this.buildUISpecPrompt(ors, stageSelection);
    return this.llmOrchestrator.execute('uispec_generation', prompt);
  }
}
```

**受入基準**:
- [ ] 3段階LLM呼び出しを統合
- [ ] 既存のUISpecGeneratorV3と共存可能

---

### TASK-2.6: プロンプトテンプレート作成

**ファイル**: `server/src/prompts/v4/`（新規ディレクトリ）

| ファイル | 用途 |
|---------|------|
| `widget-selection.prompt.ts` | Widget選定用プロンプト |
| `ors-generation.prompt.ts` | ORS+DpG生成用プロンプト |
| `uispec-generation.prompt.ts` | UISpec生成用プロンプト |

**widget-selection.prompt.ts 例**:
```typescript
export const buildWidgetSelectionPrompt = (
  concernText: string,
  bottleneckType: string,
  widgetDefinitions: WidgetDefinition[]
): string => `
あなたはCBTベースの思考整理アプリのWidget選定AIです。

## ユーザーの悩み
${concernText}

## 診断されたボトルネック
${bottleneckType}

## 利用可能なWidget
${JSON.stringify(widgetDefinitions, null, 2)}

## タスク
4つのステージ（diverge, organize, converge, summary）それぞれに最適なWidgetを選定してください。
各Widgetの timing, versatility, complexity, bottleneck を考慮してください。

## 出力形式
JSON形式で WidgetSelectionResult を出力してください。
`;
```

**受入基準**:
- [ ] 3種類のプロンプトテンプレートが作成される
- [ ] 出力形式が明確に指定される

---

### TASK-2.7: バリデーション・エラーログ強化

**ファイル**: `server/src/services/ValidationService.ts`（新規）

```typescript
export class ValidationService {
  validateORS(ors: unknown): ValidationResult<ORS> {
    // JSON Schema バリデーション
  }

  validateUISpec(uispec: unknown): ValidationResult<UISpec> {
    // JSON Schema バリデーション
  }

  logValidationError(error: ValidationError): void {
    // エラーログ記録（論文分析用）
  }
}

export interface ValidationErrorLog {
  timestamp: number;
  sessionId: string;
  taskType: LLMTaskType;
  errorType: string;
  errorMessage: string;
  llmOutput?: string;
  context?: Record<string, any>;
}
```

**受入基準**:
- [ ] LLM出力のバリデーションが実行される
- [ ] エラーログがエクスポート可能

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

### TASK-3.2: UIRendererV4実装

**ファイル**: `concern-app/src/services/ui-generation/UIRendererV4.tsx`（新規）

```typescript
export class UIRendererV4 {
  private bindingEngine: ReactiveBindingEngine;

  constructor() {
    this.bindingEngine = new ReactiveBindingEngine();
  }

  render(uiSpec: UISpec, ors: ORS): React.ReactNode {
    // 1. ReactiveBindingを初期化
    this.bindingEngine.initialize(uiSpec.reactiveBindings);

    // 2. Widgetをレンダリング
    return (
      <div className="ui-renderer-v4">
        {uiSpec.widgets.map((widgetSpec) => (
          <WidgetRenderer
            key={widgetSpec.id}
            spec={widgetSpec}
            ors={ors}
            bindingEngine={this.bindingEngine}
          />
        ))}
      </div>
    );
  }
}
```

**受入基準**:
- [ ] ReactiveBindingSpec対応でWidgetをレンダリング
- [ ] UIRendererV3と共存可能

---

### TASK-3.3: DataBinding処理実装

**ファイル**: `concern-app/src/services/ui/DataBindingProcessor.ts`（新規）

```typescript
export class DataBindingProcessor {
  constructor(private ors: ORS) {}

  // ORSからWidget初期値を取得
  getInitialValue(binding: DataBindingSpec): unknown {
    const [entityId, attributeName] = binding.entityAttribute.split('.');
    const entity = this.ors.entities.find((e) => e.id === entityId);
    if (!entity) return undefined;

    const attribute = entity.attributes.find((a) => a.name === attributeName);
    return attribute?.defaultValue;
  }

  // Widget出力をORSに反映
  updateORS(binding: DataBindingSpec, value: unknown): void {
    // ORSエンティティの更新処理
  }

  // PNTRを解決して実際の値を取得
  resolvePNTR(ref: string): unknown {
    const [entityId, attributeName] = ref.split('.');
    // 参照先の値を取得
  }
}
```

**受入基準**:
- [ ] ORSとWidget間のデータバインディングが機能
- [ ] PNTR参照が正しく解決される

---

### TASK-3.4: complexity閾値チェック実装

**ファイル**: `concern-app/src/services/ui/ComplexityChecker.ts`（新規）

```typescript
export class ComplexityChecker {
  private rules: ComplexityRules;

  constructor(rulesPath: string) {
    this.rules = this.loadRules(rulesPath);
  }

  // ReactiveBindingのtargetが閾値以下かチェック
  validateBinding(
    binding: ReactiveBinding,
    widgetDefinitions: Map<string, WidgetDefinition>
  ): boolean {
    const targetWidgetId = binding.target.split('.')[0];
    const targetWidget = widgetDefinitions.get(targetWidgetId);

    if (!targetWidget) return false;

    return targetWidget.metadata.complexity <= this.rules.maxTargetComplexity;
  }

  // 1ステージ内のWidget組み合わせをチェック
  validateStageComplexity(widgets: WidgetSpec[]): boolean {
    const totalComplexity = widgets.reduce((sum, w) => {
      const def = widgetDefinitions.get(w.component);
      return sum + (def?.metadata.complexity ?? 0);
    }, 0);

    return totalComplexity <= this.rules.maxStageComplexitySum;
  }
}

interface ComplexityRules {
  maxTargetComplexity: number;      // 0.7
  maxStageComplexitySum: number;    // 1.5
  maxHighComplexityWidgets: number; // 1
}
```

**設定ファイル**: `config/complexity-rules.json`

```json
{
  "maxTargetComplexity": 0.7,
  "maxStageComplexitySum": 1.5,
  "maxHighComplexityWidgets": 1
}
```

**受入基準**:
- [ ] complexity閾値に基づくバリデーションが機能
- [ ] 閾値違反時にログ出力

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

### TASK-4.3: Widget操作言語化実装

**ファイル**: `server/src/services/WidgetSummarizationService.ts`（新規）

```typescript
export class WidgetSummarizationService {
  constructor(private llmOrchestrator: LLMOrchestrator) {}

  async summarizeWidgetInteraction(
    widgetType: WidgetComponentType,
    widgetState: WidgetState
  ): Promise<string> {
    const prompt = this.getSummarizationPrompt(widgetType);
    const filledPrompt = this.fillPrompt(prompt, widgetState);
    return this.llmOrchestrator.execute('summary_generation', filledPrompt);
  }

  private getSummarizationPrompt(widgetType: WidgetComponentType): string {
    const definition = widgetDefinitions.get(widgetType);
    return definition?.summarizationPrompt ?? '';
  }
}

// 言語化プロンプト例
const SUMMARIZATION_PROMPTS: Record<WidgetComponentType, string> = {
  emotion_palette: `
    選択された感情を「{emotion}({intensity}%)」形式でリスト化してください。
    強度が高い順に並べてください。
  `,
  brainstorm_cards: `
    作成されたカードの内容を箇条書きで列挙してください。
    カードの色情報は省略してください。
  `,
  card_sorting: `
    カテゴリごとに分類されたカードを以下の形式で出力してください：
    【{category}】: {items}
  `,
  // ... 他のWidget
};
```

**受入基準**:
- [ ] 全12種Widget（stage_summary除く）に言語化プロンプトが定義
- [ ] stage_summary Widgetで言語化結果が表示される

---

### TASK-4.4: ナビゲーション機能実装

**ファイル**: `concern-app/src/hooks/useStageNavigation.ts`（新規）

```typescript
export function useStageNavigation() {
  const [currentStage, setCurrentStage] = useState<StageType>('diverge');
  const [stageHistory, setStageHistory] = useState<StageResult[]>([]);

  const goToNextStage = () => {
    // 現在のステージ結果を保存
    const currentResult = captureCurrentStageResult();
    setStageHistory([...stageHistory, currentResult]);

    // 次のステージへ
    const nextStage = getNextStage(currentStage);
    setCurrentStage(nextStage);
  };

  const goToPreviousStage = () => {
    // 後続ステージのデータを破棄
    const previousStage = getPreviousStage(currentStage);
    const newHistory = stageHistory.slice(0, getStageIndex(previousStage));

    setStageHistory(newHistory);
    setCurrentStage(previousStage);
  };

  const skipCurrentStage = () => {
    // 空の結果で次へ
    const emptyResult: StageResult = { stage: currentStage, skipped: true, widgets: [] };
    setStageHistory([...stageHistory, emptyResult]);

    const nextStage = getNextStage(currentStage);
    setCurrentStage(nextStage);
  };

  return {
    currentStage,
    stageHistory,
    goToNextStage,
    goToPreviousStage,
    skipCurrentStage,
  };
}
```

**受入基準**:
- [ ] 「次へ」「戻る」「スキップ」が機能
- [ ] 戻り時に後続ステージのデータが破棄される
- [ ] ステージ履歴が保持される

---

### TASK-4.5: 進捗表示UI実装

**ファイル**: `concern-app/src/components/StageProgress.tsx`（新規）

```typescript
interface StageProgressProps {
  currentStage: StageType;
  stageHistory: StageResult[];
  widgetSelectionResult: WidgetSelectionResult;
}

export const StageProgress: React.FC<StageProgressProps> = ({
  currentStage,
  stageHistory,
  widgetSelectionResult,
}) => {
  const stages: StageType[] = ['diverge', 'organize', 'converge', 'summary'];

  return (
    <div className="stage-progress">
      {stages.map((stage, index) => (
        <div
          key={stage}
          className={`stage-item ${getStageStatus(stage, currentStage, stageHistory)}`}
        >
          <div className="stage-number">{index + 1}</div>
          <div className="stage-name">{getStageDisplayName(stage)}</div>
          <div className="stage-purpose">
            {widgetSelectionResult.stages[stage].purpose}
          </div>
        </div>
      ))}
    </div>
  );
};

function getStageStatus(
  stage: StageType,
  currentStage: StageType,
  stageHistory: StageResult[]
): 'completed' | 'current' | 'pending' | 'skipped' {
  // ステータス判定ロジック
}
```

**受入基準**:
- [ ] 4ステージの進捗が視覚的に表示
- [ ] 完了/現在/未着手/スキップが区別可能

---

### TASK-5.1: 単体テスト追加

**対象ファイル**:

| テストファイル | 対象 |
|---------------|------|
| `server/src/types/__tests__/ors.types.test.ts` | ORS型定義 |
| `server/src/services/__tests__/WidgetSelectionService.test.ts` | Widget選定サービス |
| `server/src/services/__tests__/ORSGeneratorService.test.ts` | ORS生成サービス |
| `server/src/services/__tests__/ValidationService.test.ts` | バリデーションサービス |
| `concern-app/src/services/__tests__/ReactiveBindingEngine.test.ts` | ReactiveBindingEngine |

**受入基準**:
- [ ] 主要サービスのテストカバレッジ80%以上
- [ ] 型定義の整合性テスト

---

### TASK-5.2: E2Eテスト追加

**ファイル**: `tests/e2e/v4-flow.test.ts`（新規）

```typescript
describe('DSL v4 E2E Flow', () => {
  it('should complete full flow with 3-stage LLM calls', async () => {
    // 1. Captureフェーズ
    const concernText = '転職すべきか悩んでいます';
    const diagnosis = await api.diagnose(concernText);

    // 2. Widget選定
    const selectionResult = await api.selectWidgets(concernText, diagnosis.bottleneckType);
    expect(selectionResult.stages.diverge.widgets.length).toBeGreaterThan(0);

    // 3. 各ステージのUI生成
    for (const stage of ['diverge', 'organize', 'converge', 'summary']) {
      const uiSpec = await api.generateUI(concernText, stage);
      expect(uiSpec.widgets.length).toBeGreaterThan(0);
    }
  });

  it('should handle navigation correctly', async () => {
    // 戻り/スキップ動作のテスト
  });
});
```

**受入基準**:
- [ ] フルフローのE2Eテストが成功
- [ ] ナビゲーション機能のテストが成功

---

### TASK-5.3: パフォーマンス検証

**検証項目**:

| 項目 | 目標値 | 測定方法 |
|------|--------|---------|
| Widget選定レイテンシ | < 5秒 | API応答時間 |
| ORS生成レイテンシ | < 10秒 | API応答時間 |
| UISpec生成レイテンシ | < 10秒 | API応答時間 |
| 3段階合計レイテンシ | < 30秒 | 全体応答時間 |
| Frontendレンダリング | < 500ms | ブラウザプロファイル |

**受入基準**:
- [ ] 目標レイテンシ以内で処理完了
- [ ] ボトルネック特定と改善案の文書化

---

### TASK-5.4: エラーケーステスト

**テストケース**:

| ケース | 期待動作 |
|--------|---------|
| LLM応答がJSON不正 | バリデーションエラー、リトライ |
| LLM応答がスキーマ不一致 | バリデーションエラー、ログ記録 |
| LLMタイムアウト | エラーハンドリング、ユーザー通知 |
| 不正なPNTR参照 | 参照解決エラー、フォールバック |
| complexity閾値超過 | 警告ログ、処理継続 |

**受入基準**:
- [ ] 全エラーケースでアプリがクラッシュしない
- [ ] エラーログが適切に記録される

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
| 1.1 | 2025-12-02 | 欠落タスク詳細追加（TASK-1.3, 1.5, 1.6, 2.1, 2.2, 2.5-2.7, 3.2-3.4, 4.3-4.5, 5.1-5.4） |
