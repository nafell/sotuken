# DSL v3 詳細設計書（内部設計）

**作成日**: 2025-01-17
**バージョン**: 3.0
**対象システム**: 思考整理アプリ動的UI生成システム
**設計者**: TK

---

## 📋 目次

1. [型定義](#1-型定義)
2. [クラス設計](#2-クラス設計)
3. [Dependency Graph実装](#3-dependency-graph実装)
4. [State管理実装](#4-state管理実装)
5. [Widget実装パターン](#5-widget実装パターン)
6. [アルゴリズム詳細](#6-アルゴリズム詳細)
7. [エラーハンドリング](#7-エラーハンドリング)
8. [テスト戦略](#8-テスト戦略)

---

## 1. 型定義

### 1.0 DSLと実装の型定義の区別

**重要**: このセクションでは以下の2種類の型を定義します：

1. **DSL型**（LLM生成される抽象仕様）
   - `UISpec`, `WidgetSpec`, `OODM`, `DpG`
   - TOON記法で記述され、LLMが生成
   - コメントに `(DSL)` と記載

2. **実装型**（TypeScript、ルールベースレンダリング）
   - `UISpecObject`, `WidgetSpecObject`, `WidgetResult`
   - TypeScriptコードとして実装
   - DSL Parserがパースして生成、または実装コードが生成

### 1.1 UISpec関連型（DSL）

#### UISpec（画面全体の仕様、DSL）

LLMが生成する画面全体の仕様。

```typescript
// concern-app/src/types/ui-spec.types.ts

/**
 * UISpec (DSL)
 * LLMが生成する画面全体のUI仕様
 */
export interface UISpec {
  sessionId: string;
  stage: StageType;
  oodm: OODM;                    // データモデル（DSL）
  dpg: DependencyGraphSpec;      // 依存関係グラフ（DSL）
  widgets: WidgetSpec[];         // Widget仕様の配列（DSL）
  layout: ScreenLayout;
  metadata: UISpecMetadata;
}

export interface UISpecMetadata {
  generatedAt: number;
  llmModel: string;
  tokenCount: number;
  version: string;               // DSLバージョン
}

export interface ScreenLayout {
  type: 'sequential' | 'grid' | 'custom';
  config?: Record<string, any>;
}

export type StageType = 'diverge' | 'organize' | 'converge' | 'summary';
```

#### WidgetSpec（個別Widget仕様、DSL）

**LLMが生成する、プリセットWidgetへの参照と設定**。

**重要**: WidgetSpecはWidget自体を記述するのではなく、**プリセットWidgetのどれを使うか（component）とその設定（config）を指定する**。

```typescript
/**
 * WidgetSpec (DSL)
 * LLMが生成する個別Widgetの仕様（プリセットWidgetへの参照+設定）
 */
export interface WidgetSpec {
  id: string;
  component: WidgetComponentType; // プリセットWidgetのID
  position: number;              // 表示順序
  layout?: LayoutType;
  config: WidgetConfig;          // プリセットWidgetへの設定
  inputs?: DataBinding[];
  outputs?: DataBinding[];
  reactiveBindings?: ReactiveBinding[];
  metadata: WidgetMetadata;
}

/**
 * WidgetComponentType
 * プリセットWidget（12種）のID
 * Widget Registryに事前登録されている
 *
 * DSLv3 Plan Requirements v3.0 (UC01-UC18) から選定
 */
export type WidgetComponentType =
  // 発散フェーズ (diverge) - 3種
  | 'brainstorm_cards'        // UC01: ブレインストームカード
  | 'question_card_chain'     // UC03: 質問カード連鎖
  | 'emotion_palette'         // UC05: 感情カラーパレット

  // 整理フェーズ (organize) - 4種
  | 'card_sorting'            // UC09: カード仕分けUI
  | 'dependency_mapping'      // UC10: 依存関係マッピング
  | 'swot_analysis'           // UC11: SWOT分析UI
  | 'mind_map'                // UC04: マインドマップ生成

  // 収束フェーズ (converge) - 4種
  | 'matrix_placement'        // UC12: マトリックス配置
  | 'tradeoff_balance'        // UC13: トレードオフ天秤
  | 'priority_slider_grid'    // UC14: 優先度スライダーグリッド
  | 'timeline_slider'         // UC06: 時間軸スライダー

  // まとめフェーズ (summary) - 1種
  | 'structured_summary';     // UC18: 構造化文章まとめ

export type LayoutType = 'single' | 'split_horizontal' | 'split_vertical';

export interface WidgetConfig {
  prompt?: string;
  [key: string]: any; // Widget固有の設定を許可
}

export interface WidgetMetadata {
  timing: number;        // 0.0-1.0
  versatility: number;   // 0.0-1.0
  bottleneck: string[];
  description?: string;
}
```

#### OODM（Object-Oriented Data Model、DSL）

**DSLv3 Core Spec v3.0のEntity/Attribute構造を統合**。

LLMが生成するデータ構造の定義。

```typescript
/**
 * OODM (DSL)
 * Object-Oriented Data Model
 * ユーザーの悩みに関するデータ構造を定義
 *
 * DSLv3 Core Spec v3.0のDataSchemaに相当
 */
export interface OODM {
  version: string;           // スキーマバージョン
  entities: Entity[];        // エンティティリスト
  metadata?: DICT<SVAL>;     // メタデータ
}

/**
 * Entity（エンティティ）
 * データの基本単位。UIコンポーネントや情報の塊を表現
 *
 * DSLv3 Core Spec v3.0から引用
 */
export interface Entity {
  id: string;                // 一意識別子
  type: string;              // エンティティタイプ
  attributes: Attribute[];   // 属性リスト
  metadata?: DICT<SVAL>;     // メタデータ（オプション）
}

/**
 * Attribute（属性）
 * エンティティの特性を定義
 *
 * DSLv3 Core Spec v3.0から引用
 */
export interface Attribute {
  name: string;              // 属性名
  value: SVAL | ARRY<SVAL> | PNTR | DICT<SVAL>;
  type: 'sval' | 'arry' | 'pntr' | 'dict';
  constraints?: Constraint[];  // 制約（オプション）
}

/**
 * プリミティブ型（DSLv3 Core Spec v3.0）
 */
export type SVAL = string | number | boolean | null;
export type ARRY<T> = T[];
export type DICT<T> = { [key: string]: T };

export interface PNTR {
  ref: string;               // 参照先のID
  type: 'entity' | 'attribute';
}

export interface Constraint {
  type: 'required' | 'min' | 'max' | 'pattern' | 'enum';
  value: any;
  message?: string;          // エラーメッセージ
}
```

#### DependencyGraphSpec（依存関係グラフ、DSL）

LLMが生成するWidget間の依存関係定義。

```typescript
/**
 * DependencyGraphSpec (DSL)
 * Widget間の依存関係を定義
 * LLMの主要な動的生成対象
 */
export interface DependencyGraphSpec {
  dependencies: DependencySpec[];
  metadata?: {
    version: string;
    generatedAt: number;
  };
}

export interface DependencySpec {
  source: string;           // "widgetId.propertyName"
  target: string;           // "widgetId.propertyName"
  mechanism: 'validate' | 'update';
  relationship: RelationshipSpec;
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
}
```

### 1.2 実装型（TypeScript、パース後）

#### OODMObject（パース後のOODM）

DSL ParserがOODM（DSL）をパースして生成。

```typescript
/**
 * OODMObject (実装)
 * DSL ParserがOODM（DSL）をパースして生成
 */
export interface OODMObject {
  version: string;
  entities: Entity[];        // パース済みEntity
  metadata?: Record<string, any>;
}

// Entity, Attribute等はDSL層と同じ構造を使用
```

#### DependencyGraph（依存関係グラフ実装クラス）

DependencyGraphSpec（DSL）を実行する実装クラス。

```typescript
/**
 * DependencyGraph (実装クラス)
 * DpG（DSL）を解釈して依存関係を管理・実行
 *
 * 詳細はセクション3「Dependency Graph実装」を参照
 */
export class DependencyGraph {
  private dependencies: Map<string, DependencySpec[]>;
  private nodes: Set<string>;

  addDependency(spec: DependencySpec): void;
  detectCycle(): boolean;
  getUpdateOrder(): string[];
  getDependents(nodeId: string): string[];
  // ... 詳細はセクション3
}
```

#### UISpecObject（パース後のTypeScriptオブジェクト）

DSL Parserが生成するTypeScriptオブジェクト。

```typescript
/**
 * UISpecObject (実装)
 * DSL ParserがUISpec（DSL）をパースして生成
 */
export interface UISpecObject {
  sessionId: string;
  stage: StageType;
  oodm: OODMObject;              // パース済みOODM
  dpg: DependencyGraph;          // 実装クラスのインスタンス
  widgets: WidgetSpecObject[];   // パース済みWidget仕様
  layout: ScreenLayout;
  metadata: UISpecMetadata;
}
```

#### WidgetSpecObject（パース後のTypeScriptオブジェクト）

DSL Parserが生成するWidgetの実装用オブジェクト。

```typescript
/**
 * WidgetSpecObject (実装)
 * DSL ParserがWidgetSpec（DSL）をパースして生成
 */
export interface WidgetSpecObject {
  id: string;
  component: WidgetComponentType;
  position: number;
  layout?: LayoutType;
  config: Record<string, any>;   // パース済み設定
  inputs?: DataBindingObject[];
  outputs?: DataBindingObject[];
  reactiveBindings?: ReactiveBindingObject[];
  metadata: WidgetMetadata;
}
```

#### DataBinding（データバインディング）

```typescript
export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'string[]'
  | 'number[]'
  | 'object[]';

export interface DataBinding {
  name: string;
  type: DataType;
  source?: string;      // "widgetId.outputName" 形式
  required?: boolean;
  defaultValue?: any;
  description?: string;
}
```

#### ReactiveBinding（リアクティブ連動）

```typescript
export type UpdateMode = 'realtime' | 'debounced' | 'on_confirm';

export type MechanismType = 'validate' | 'update';

export interface ReactiveBinding {
  source: string;       // "widgetId.propertyName"
  target: string;       // "widgetId.propertyName"
  mechanism: MechanismType;
  relationship: RelationshipSpec;
  updateMode: UpdateMode;
}

export interface RelationshipSpec {
  type: 'javascript' | 'transform' | 'llm';
  javascript?: string;
  transform?: TransformFunction;
  llmPrompt?: string;
}

export type TransformFunction =
  | 'calculate_ranking'
  | 'calculate_balance'
  | 'filter_high_priority'
  | 'generate_summary'
  | 'detect_gaps'
  | ((source: any) => any);
```

### 1.2 結果型

#### WidgetResult

```typescript
// concern-app/src/types/result.types.ts

export interface WidgetResult {
  widgetId: string;
  component: string;
  timestamp: number;
  summary: string;          // 人間が読める要約
  data: StructuredData;     // 構造化データ
  interactions?: UserInteraction[];
  metadata?: Record<string, any>;
}

export interface UserInteraction {
  timestamp: number;
  action: 'click' | 'input' | 'drag' | 'select' | 'adjust';
  target: string;
  value?: any;
  duration?: number;
}
```

#### StructuredData

```typescript
export type StructuredDataType = 'selection' | 'ranking' | 'mapping' | 'text' | 'composite';

export interface StructuredData {
  type: StructuredDataType;
  selection?: SelectionData;
  ranking?: RankingData;
  mapping?: MappingData;
  text?: TextData;
  composite?: Record<string, any>;
}

export interface SelectionData {
  selected: string | string[];
  options: string[];
  metadata?: Record<string, any>;
}

export interface RankingData {
  items: RankingItem[];
}

export interface RankingItem {
  id: string;
  label: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface MappingData {
  items: MappingItem[];
}

export interface MappingItem {
  id: string;
  label: string;
  position?: Position;
  category?: string;
  relations?: string[];
}

export interface Position {
  x: number;
  y: number;
}

export interface TextData {
  content: string;
  structured?: Record<string, any>;
}
```

### 1.3 Dependency Graph型

```typescript
// concern-app/src/types/dependency.types.ts

export interface DependencyGraphSpec {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;          // Widget ID
  type: 'widget';
  outputs?: string[];  // 出力プロパティ名のリスト
  inputs?: string[];   // 入力プロパティ名のリスト
}

export interface DependencyEdge {
  id: string;
  source: string;      // "widgetId.propertyName"
  target: string;      // "widgetId.propertyName"
  mechanism: MechanismType;
  relationship: RelationshipSpec;
  updateMode: UpdateMode;
}

export interface UpdateResult {
  type: 'update' | 'validation_error';
  target: string;
  value?: any;
  message?: string;
}
```

---

## 2. クラス設計

### 2.1 BaseWidgetController（抽象クラス）

```typescript
// concern-app/src/components/widgets/base/BaseWidgetController.ts

import { atom, Atom } from 'jotai';

export abstract class BaseWidgetController<T = any> {
  protected spec: WidgetSpec;
  protected dataAtom: Atom<T>;
  protected interactions: UserInteraction[] = [];

  constructor(spec: WidgetSpec, initialData?: any) {
    this.spec = spec;
    this.dataAtom = atom<T>(this.getInitialValue(initialData));
  }

  // ===== 抽象メソッド（サブクラスで必須実装） =====

  /**
   * 初期値を取得する
   * @param initialData 前のWidgetからのデータ
   * @returns 初期値
   */
  protected abstract getInitialValue(initialData?: any): T;

  /**
   * Widget結果を生成する
   * @returns WidgetResult
   */
  public abstract getResult(): WidgetResult;

  /**
   * データの妥当性を検証する
   * @param data 検証するデータ
   * @returns 妥当ならtrue
   */
  protected abstract validateData(data: T): boolean;

  // ===== 共通メソッド（オーバーライド可能） =====

  /**
   * 人間が読める要約を生成
   * @param data Widgetデータ
   * @returns 要約文字列
   */
  protected generateSummary(data: T): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * 構造化データを生成
   * @param data Widgetデータ
   * @returns StructuredData
   */
  protected generateStructuredData(data: T): StructuredData {
    return {
      type: 'composite',
      composite: data as any
    };
  }

  /**
   * ユーザーインタラクションを記録
   * @param interaction インタラクション
   */
  protected recordInteraction(interaction: Omit<UserInteraction, 'timestamp'>): void {
    this.interactions.push({
      ...interaction,
      timestamp: Date.now()
    });
  }

  /**
   * 基本的な結果を生成（getResult内で使用）
   * @param data 現在のWidgetデータ
   * @returns WidgetResult
   */
  protected getBaseResult(data: T): WidgetResult {
    return {
      widgetId: this.spec.id,
      component: this.spec.component,
      timestamp: Date.now(),
      summary: this.generateSummary(data),
      data: this.generateStructuredData(data),
      interactions: [...this.interactions],
      metadata: this.spec.metadata
    };
  }

  /**
   * Atomゲッター（Reactコンポーネントで使用）
   */
  public getAtom(): Atom<T> {
    return this.dataAtom;
  }
}
```

**使用例**:

```typescript
// EmotionPaletteController.ts
class EmotionPaletteController extends BaseWidgetController<EmotionPaletteData> {
  protected getInitialValue(): EmotionPaletteData {
    return { selectedEmotion: '', intensity: 0.5, concern: '' };
  }

  protected validateData(data: EmotionPaletteData): boolean {
    return data.selectedEmotion !== '' && data.intensity >= 0 && data.intensity <= 1;
  }

  public getResult(): WidgetResult {
    const currentData = /* Atomから取得 */;
    if (!this.validateData(currentData)) {
      throw new Error('Invalid widget data');
    }
    return this.getBaseResult(currentData);
  }

  protected generateSummary(data: EmotionPaletteData): string {
    const percent = Math.round(data.intensity * 100);
    return `${data.selectedEmotion}を${percent}%の強さで感じています`;
  }

  protected generateStructuredData(data: EmotionPaletteData): StructuredData {
    return {
      type: 'composite',
      composite: {
        emotion: data.selectedEmotion,
        intensity: data.intensity,
        intensityLevel: this.getIntensityLevel(data.intensity),
        emotionCategory: this.categorizeEmotion(data.selectedEmotion),
        concern: data.concern
      }
    };
  }

  // Widget固有のヘルパーメソッド
  private getIntensityLevel(intensity: number): 'low' | 'medium' | 'high' {
    if (intensity < 0.33) return 'low';
    if (intensity < 0.67) return 'medium';
    return 'high';
  }

  private categorizeEmotion(emotion: string): 'positive' | 'negative' | 'neutral' {
    // 実装...
  }
}
```

### 2.2 DependencyGraph（クラス）

```typescript
// concern-app/src/services/ui/DependencyGraph.ts

export class DependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();
  private edges: Map<string, DependencyEdge[]> = new Map();

  constructor(spec?: DependencyGraphSpec) {
    if (spec) {
      this.buildFromSpec(spec);
    }
  }

  /**
   * 仕様からグラフを構築
   */
  private buildFromSpec(spec: DependencyGraphSpec): void {
    spec.nodes.forEach(node => this.addNode(node));
    spec.edges.forEach(edge => this.addEdge(edge));
  }

  /**
   * ノードを追加
   */
  public addNode(node: DependencyNode): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, []);
    }
  }

  /**
   * エッジを追加（依存関係を登録）
   * @throws {Error} 循環依存が検出された場合
   */
  public addEdge(edge: DependencyEdge): void {
    const sourceId = this.extractWidgetId(edge.source);
    const targetId = this.extractWidgetId(edge.target);

    // 循環依存チェック
    if (this.hasCycle(sourceId, targetId)) {
      throw new Error(
        `Circular dependency detected: ${edge.source} -> ${edge.target}`
      );
    }

    // エッジを追加
    if (!this.edges.has(sourceId)) {
      this.edges.set(sourceId, []);
    }
    this.edges.get(sourceId)!.push(edge);
  }

  /**
   * 循環依存の検出（DFS）
   */
  private hasCycle(source: string, target: string): boolean {
    const visited = new Set<string>();

    const dfs = (node: string): boolean => {
      if (node === source) {
        return true; // 循環検出
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);

      const edges = this.edges.get(node) || [];
      for (const edge of edges) {
        const nextNode = this.extractWidgetId(edge.target);
        if (dfs(nextNode)) {
          return true;
        }
      }

      return false;
    };

    return dfs(target);
  }

  /**
   * トポロジカルソート（更新順序を決定）
   */
  public getUpdateOrder(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // 入次数を初期化
    this.nodes.forEach((_, nodeId) => {
      inDegree.set(nodeId, 0);
    });

    // 入次数を計算
    this.edges.forEach(edgeList => {
      edgeList.forEach(edge => {
        const targetId = this.extractWidgetId(edge.target);
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
      });
    });

    // 入次数0のノードをキューに追加
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    // BFS
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const edges = this.edges.get(node) || [];
      edges.forEach(edge => {
        const targetId = this.extractWidgetId(edge.target);
        const newDegree = (inDegree.get(targetId) || 0) - 1;
        inDegree.set(targetId, newDegree);

        if (newDegree === 0) {
          queue.push(targetId);
        }
      });
    }

    return result;
  }

  /**
   * 指定したソースの依存関係を取得
   */
  public getDependencies(sourceKey: string): DependencyEdge[] {
    const widgetId = this.extractWidgetId(sourceKey);
    const allEdges = this.edges.get(widgetId) || [];

    return allEdges.filter(edge => edge.source === sourceKey);
  }

  /**
   * Widget IDを抽出（"widgetId.propertyName" → "widgetId"）
   */
  private extractWidgetId(key: string): string {
    return key.split('.')[0];
  }

  /**
   * エッジ数を取得（テスト用）
   */
  public getEdgeCount(): number {
    let count = 0;
    this.edges.forEach(edgeList => {
      count += edgeList.length;
    });
    return count;
  }
}
```

### 2.3 DependencyExecutor（クラス）

```typescript
// concern-app/src/services/ui/DependencyExecutor.ts

export class DependencyExecutor {
  /**
   * 依存関係を実行
   */
  public execute(edge: DependencyEdge, sourceValue: any): UpdateResult {
    try {
      if (edge.mechanism === 'validate') {
        return this.executeValidation(edge, sourceValue);
      } else {
        return this.executeUpdate(edge, sourceValue);
      }
    } catch (error) {
      console.error('Dependency execution failed:', error);
      return {
        type: 'validation_error',
        target: edge.target,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validation実行
   */
  private executeValidation(edge: DependencyEdge, sourceValue: any): UpdateResult {
    const isValid = this.executeTransform(edge.relationship, sourceValue);

    if (!isValid) {
      return {
        type: 'validation_error',
        target: edge.target,
        message: `Validation failed for ${edge.target}`
      };
    }

    return {
      type: 'update',
      target: edge.target,
      value: sourceValue
    };
  }

  /**
   * Update実行
   */
  private executeUpdate(edge: DependencyEdge, sourceValue: any): UpdateResult {
    const newValue = this.executeTransform(edge.relationship, sourceValue);

    return {
      type: 'update',
      target: edge.target,
      value: newValue
    };
  }

  /**
   * 変換関数を実行
   */
  public executeTransform(relationship: RelationshipSpec, sourceValue: any): any {
    switch (relationship.type) {
      case 'javascript':
        return this.executeJavaScript(relationship.javascript!, sourceValue);

      case 'transform':
        return this.executeBuiltInTransform(relationship.transform!, sourceValue);

      case 'llm':
        // LLM変換は非同期なので、ここでは対応しない
        throw new Error('LLM transform not supported in synchronous execution');

      default:
        return sourceValue;
    }
  }

  /**
   * JavaScriptスニペットを安全に実行
   */
  private executeJavaScript(code: string, sourceValue: any): any {
    // セキュリティチェック
    this.validateJavaScriptCode(code);

    try {
      // Function constructorで実行
      const func = new Function('source', `return ${code}`);
      return func({ value: sourceValue });
    } catch (error) {
      throw new Error(`JavaScript execution failed: ${error}`);
    }
  }

  /**
   * 組み込み変換関数を実行
   */
  private executeBuiltInTransform(
    transform: TransformFunction,
    sourceValue: any
  ): any {
    if (typeof transform === 'function') {
      return transform(sourceValue);
    }

    // 名前付き変換関数
    switch (transform) {
      case 'calculate_ranking':
        return this.calculateRanking(sourceValue);

      case 'calculate_balance':
        return this.calculateBalance(sourceValue);

      case 'filter_high_priority':
        return this.filterHighPriority(sourceValue);

      default:
        return sourceValue;
    }
  }

  /**
   * JavaScriptコードのセキュリティチェック
   */
  private validateJavaScriptCode(code: string): void {
    const blacklist = [
      'eval',
      'Function',
      'setTimeout',
      'setInterval',
      'import',
      'require',
      'process',
      'global',
      'window',
      'document'
    ];

    for (const keyword of blacklist) {
      if (code.includes(keyword)) {
        throw new Error(`Unsafe code detected: ${keyword}`);
      }
    }
  }

  // ===== 組み込み変換関数 =====

  private calculateRanking(sliderValues: Record<string, Record<string, number>>): RankingItem[] {
    const items = Object.entries(sliderValues).map(([itemId, axisValues]) => {
      const totalScore = Object.values(axisValues).reduce((sum, score) => sum + score, 0);
      return {
        id: itemId,
        label: itemId, // 実際はラベルをどこかから取得
        score: totalScore,
        metadata: { axisValues }
      };
    });

    return items.sort((a, b) => b.score - a.score);
  }

  private calculateBalance(weights: Record<string, number>): number {
    // 天秤のバランス計算（-1.0 ~ 1.0）
    const left = Object.values(weights).slice(0, Math.floor(Object.keys(weights).length / 2))
      .reduce((sum, w) => sum + w, 0);
    const right = Object.values(weights).slice(Math.floor(Object.keys(weights).length / 2))
      .reduce((sum, w) => sum + w, 0);

    const total = left + right;
    if (total === 0) return 0;

    return (right - left) / total;
  }

  private filterHighPriority(items: MappingItem[]): MappingItem[] {
    // 右上象限のアイテムを抽出
    return items.filter(item => {
      const pos = item.position;
      return pos && pos.x > 0.5 && pos.y > 0.5;
    });
  }
}
```

---

## 3. Dependency Graph実装

### 3.1 初期化フロー

```typescript
// グラフの構築
const dpgSpec: DependencyGraphSpec = {
  nodes: [
    { id: 'widget1', type: 'widget', outputs: ['emotion', 'intensity'] },
    { id: 'widget2', type: 'widget', inputs: ['xAxisLabel'], outputs: ['placements'] }
  ],
  edges: [
    {
      id: 'edge1',
      source: 'widget1.emotion',
      target: 'widget2.xAxisLabel',
      mechanism: 'update',
      relationship: {
        type: 'transform',
        transform: (emotion) => `${emotion}への対処の実現性`
      },
      updateMode: 'realtime'
    }
  ]
};

const graph = new DependencyGraph(dpgSpec);
```

### 3.2 実行時フロー

```typescript
// concern-app/src/hooks/useReactiveBinding.ts

export function useReactiveBinding(
  graph: DependencyGraph,
  executor: DependencyExecutor
) {
  const updateDependents = useCallback(
    (sourceKey: string, sourceValue: any) => {
      const dependencies = graph.getDependencies(sourceKey);

      dependencies.forEach(edge => {
        const result = executor.execute(edge, sourceValue);

        if (result.type === 'update') {
          // ターゲットAtomを更新
          updateTargetAtom(result.target, result.value);
        } else if (result.type === 'validation_error') {
          // エラー表示
          showValidationError(result.message);
        }
      });
    },
    [graph, executor]
  );

  return updateDependents;
}
```

---

## 4. State管理実装

### 4.1 Atom管理

```typescript
// concern-app/src/store/widgetAtoms.ts

import { atom, Atom } from 'jotai';

// Atom管理Map
export const widgetAtomsMap = new Map<string, Atom<any>>();

/**
 * Widget用のAtomを作成または取得
 */
export function createWidgetAtom<T>(
  widgetId: string,
  initialValue: T
): Atom<T> {
  const key = `widget_${widgetId}`;

  if (widgetAtomsMap.has(key)) {
    return widgetAtomsMap.get(key) as Atom<T>;
  }

  const newAtom = atom<T>(initialValue);
  widgetAtomsMap.set(key, newAtom);

  return newAtom;
}

/**
 * 派生Atomを作成
 */
export function createDerivedAtom<T, R>(
  sourceAtom: Atom<T>,
  transform: (value: T) => R
): Atom<R> {
  return atom((get) => transform(get(sourceAtom)));
}

/**
 * Atomをクリーンアップ（unmount時）
 */
export function cleanupWidgetAtom(widgetId: string): void {
  const key = `widget_${widgetId}`;
  widgetAtomsMap.delete(key);
}
```

### 4.2 カスタムフック

```typescript
// concern-app/src/hooks/useWidgetState.ts

import { useAtom } from 'jotai';
import { createWidgetAtom } from '@/store/widgetAtoms';

/**
 * Widget用のState管理フック
 */
export function useWidgetState<T>(
  widgetId: string,
  initialValue: T
): [T, (value: T) => void] {
  const atom = createWidgetAtom(widgetId, initialValue);
  const [state, setState] = useAtom(atom);

  return [state, setState];
}
```

```typescript
// concern-app/src/hooks/useReactiveBinding.ts

import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { widgetAtomsMap } from '@/store/widgetAtoms';

/**
 * Reactive Bindingを設定するフック
 */
export function useReactiveBinding(
  sourceKey: string,     // "widgetId.property"
  targetKey: string,     // "widgetId.property"
  transform: (source: any) => any,
  updateMode: UpdateMode = 'realtime'
) {
  const sourceAtom = widgetAtomsMap.get(sourceKey.split('.')[0]);
  const targetAtom = widgetAtomsMap.get(targetKey.split('.')[0]);

  const sourceValue = useAtomValue(sourceAtom!);
  const setTargetValue = useSetAtom(targetAtom!);

  useEffect(() => {
    if (updateMode === 'realtime') {
      // 即座に更新
      const newValue = transform(sourceValue);
      setTargetValue(newValue);
    } else if (updateMode === 'debounced') {
      // デバウンス（300ms）
      const timer = setTimeout(() => {
        const newValue = transform(sourceValue);
        setTargetValue(newValue);
      }, 300);

      return () => clearTimeout(timer);
    }
    // on_confirmの場合は何もしない
  }, [sourceValue, updateMode]);
}
```

---

## 5. Widget実装パターン

### 5.1 基本的なWidget実装

```typescript
// EmotionPalette.tsx

interface EmotionPaletteData {
  selectedEmotion: string;
  intensity: number;
  concern?: string;
}

export const EmotionPalette: React.FC<BaseWidgetProps> = ({
  spec,
  initialData,
  onComplete
}) => {
  // Controller初期化
  const controller = useMemo(
    () => new EmotionPaletteController(spec, initialData),
    [spec, initialData]
  );

  // State管理
  const [data, setData] = useAtom(controller.getAtom());

  // イベントハンドラ
  const handleEmotionSelect = (emotion: string) => {
    setData({ ...data, selectedEmotion: emotion });
    controller.recordInteraction({
      action: 'select',
      target: 'emotion',
      value: emotion
    });
  };

  const handleIntensityChange = (intensity: number) => {
    setData({ ...data, intensity });
    controller.recordInteraction({
      action: 'adjust',
      target: 'intensity',
      value: intensity
    });
  };

  const handleComplete = () => {
    try {
      const result = controller.getResult();
      onComplete?.(result);
    } catch (error) {
      console.error('Failed to generate result:', error);
    }
  };

  return (
    <div className="emotion-palette">
      <h3>{spec.config.prompt}</h3>

      {/* 感情選択 */}
      <div className="emotion-grid">
        {EMOTIONS.map(emotion => (
          <button
            key={emotion}
            className={data.selectedEmotion === emotion ? 'selected' : ''}
            onClick={() => handleEmotionSelect(emotion)}
          >
            {emotion}
          </button>
        ))}
      </div>

      {/* 強度スライダー */}
      <div className="intensity-slider">
        <label>強度: {Math.round(data.intensity * 100)}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={data.intensity * 100}
          onChange={(e) => handleIntensityChange(parseInt(e.target.value) / 100)}
        />
      </div>

      <button onClick={handleComplete}>次へ</button>
    </div>
  );
};
```

### 5.2 Reactive Widgetの実装

```typescript
// PrioritySliderGrid.tsx

export const PrioritySliderGrid: React.FC<BaseWidgetProps> = ({ spec }) => {
  const controller = useMemo(
    () => new PrioritySliderController(spec),
    [spec]
  );

  const [data, setData] = useAtom(controller.getAtom());

  // 派生Atom（ランキング計算）
  const rankingAtom = useMemo(
    () => atom((get) => {
      const sliderData = get(controller.getAtom());
      return calculateRanking(sliderData);
    }),
    [controller]
  );

  const ranking = useAtomValue(rankingAtom);

  return (
    <div className="priority-slider-grid grid grid-cols-2 gap-4">
      {/* 左側: スライダー */}
      <div className="sliders-panel">
        {spec.config.items.map(item => (
          <SliderGroup
            key={item.id}
            item={item}
            axes={spec.config.axes}
            values={data.items.find(i => i.id === item.id)?.scores}
            onChange={(scores) => updateItemScores(item.id, scores)}
          />
        ))}
      </div>

      {/* 右側: ランキング（自動更新） */}
      <div className="ranking-panel">
        <h4>優先順位</h4>
        <ol>
          {ranking.map((item, index) => (
            <li key={item.id}>
              {index + 1}. {item.label} ({item.score.toFixed(1)})
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
```

---

## 6. アルゴリズム詳細

### 6.1 循環依存検出（DFS）

```typescript
/**
 * 深さ優先探索による循環依存検出
 *
 * @param graph 依存関係グラフ
 * @param source ソースノード
 * @param target ターゲットノード
 * @returns 循環が存在する場合true
 *
 * 時間計算量: O(V + E) V=ノード数, E=エッジ数
 * 空間計算量: O(V) （visitedセット + 再帰スタック）
 */
function hasCycle(graph: Graph, source: string, target: string): boolean {
  const visited = new Set<string>();

  function dfs(node: string): boolean {
    // ソースに戻ってきたら循環検出
    if (node === source) {
      return true;
    }

    // 既に訪問済みならスキップ
    if (visited.has(node)) {
      return false;
    }

    visited.add(node);

    // 隣接ノードを探索
    const edges = graph.getEdges(node);
    for (const edge of edges) {
      const nextNode = extractNodeId(edge.target);
      if (dfs(nextNode)) {
        return true;
      }
    }

    return false;
  }

  return dfs(target);
}
```

### 6.2 トポロジカルソート（Kahn's Algorithm）

```typescript
/**
 * トポロジカルソートによる更新順序決定
 *
 * @param graph 依存関係グラフ
 * @returns 更新順序のノードIDリスト
 *
 * 時間計算量: O(V + E)
 * 空間計算量: O(V)
 */
function topologicalSort(graph: Graph): string[] {
  const inDegree = new Map<string, number>();
  const queue: string[] = [];
  const result: string[] = [];

  // 1. 入次数を初期化
  for (const node of graph.nodes.values()) {
    inDegree.set(node.id, 0);
  }

  // 2. 入次数を計算
  for (const edgeList of graph.edges.values()) {
    for (const edge of edgeList) {
      const targetId = extractNodeId(edge.target);
      inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    }
  }

  // 3. 入次数0のノードをキューに追加
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // 4. BFSで順序決定
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    // 隣接ノードの入次数を減らす
    const edges = graph.edges.get(node) || [];
    for (const edge of edges) {
      const targetId = extractNodeId(edge.target);
      const newDegree = (inDegree.get(targetId) || 0) - 1;
      inDegree.set(targetId, newDegree);

      if (newDegree === 0) {
        queue.push(targetId);
      }
    }
  }

  // 全ノードが処理されたかチェック
  if (result.length !== graph.nodes.size) {
    throw new Error('Graph contains a cycle');
  }

  return result;
}
```

### 6.3 ランキング計算アルゴリズム

```typescript
/**
 * 複数軸のスライダー値から総合ランキングを計算
 *
 * @param sliderValues { itemId: { axisId: score } }
 * @param axes 評価軸の定義
 * @returns ランキング（降順）
 */
function calculateRanking(
  sliderValues: Record<string, Record<string, number>>,
  axes: Axis[]
): RankingItem[] {
  const items = Object.entries(sliderValues).map(([itemId, axisValues]) => {
    // 重み付き合計スコアを計算
    const totalScore = axes.reduce((sum, axis) => {
      const score = axisValues[axis.id] || 0;
      const weight = axis.weight || 1;
      return sum + (score * weight);
    }, 0);

    return {
      id: itemId,
      label: getItemLabel(itemId),
      score: totalScore,
      metadata: {
        axisValues,
        normalizedScore: totalScore / axes.length
      }
    };
  });

  // スコア降順でソート
  return items.sort((a, b) => b.score - a.score);
}
```

---

## 7. エラーハンドリング

### 7.1 エラー階層

```typescript
// concern-app/src/types/error.types.ts

export class WidgetError extends Error {
  constructor(message: string, public widgetId: string) {
    super(message);
    this.name = 'WidgetError';
  }
}

export class DependencyError extends Error {
  constructor(message: string, public source: string, public target: string) {
    super(message);
    this.name = 'DependencyError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field: string, public value: any) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 7.2 エラーハンドリング戦略

```typescript
// Widget実装でのエラーハンドリング
export const EmotionPalette: React.FC<BaseWidgetProps> = ({ spec, onComplete, onError }) => {
  const handleComplete = () => {
    try {
      // データ検証
      if (!controller.validateData(data)) {
        throw new ValidationError(
          '感情が選択されていません',
          'selectedEmotion',
          data.selectedEmotion
        );
      }

      // 結果生成
      const result = controller.getResult();
      onComplete?.(result);

    } catch (error) {
      if (error instanceof ValidationError) {
        // バリデーションエラー: ユーザーにフィードバック
        showErrorMessage(error.message);
        onError?.(error);
      } else {
        // その他のエラー: ログ送信 + フォールバック
        logError(error);
        onError?.(error);
      }
    }
  };
};
```

### 7.3 Dependency実行時のエラーハンドリング

```typescript
export class DependencyExecutor {
  public execute(edge: DependencyEdge, sourceValue: any): UpdateResult {
    try {
      return this.executeInternal(edge, sourceValue);
    } catch (error) {
      // エラーログ
      console.error('Dependency execution failed:', {
        edge,
        sourceValue,
        error
      });

      // エラー結果を返す
      return {
        type: 'validation_error',
        target: edge.target,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

---

## 8. テスト戦略

### 8.1 単体テスト

#### Widget Controllerのテスト

```typescript
// EmotionPaletteController.test.ts

describe('EmotionPaletteController', () => {
  let controller: EmotionPaletteController;

  beforeEach(() => {
    const spec: WidgetSpec = {
      id: 'test_emotion_1',
      component: 'emotion_palette',
      stage: 'diverge',
      config: { prompt: 'テスト' },
      metadata: { timing: 0.1, versatility: 0.8, bottleneck: [] }
    };
    controller = new EmotionPaletteController(spec);
  });

  test('初期値が正しく設定される', () => {
    const initialValue = controller['getInitialValue']();
    expect(initialValue.selectedEmotion).toBe('');
    expect(initialValue.intensity).toBe(0.5);
  });

  test('有効なデータを検証できる', () => {
    const validData = { selectedEmotion: '不安', intensity: 0.7 };
    expect(controller['validateData'](validData)).toBe(true);
  });

  test('無効なデータを検証できる', () => {
    const invalidData = { selectedEmotion: '', intensity: 0.7 };
    expect(controller['validateData'](invalidData)).toBe(false);
  });

  test('要約を生成できる', () => {
    const data = { selectedEmotion: '不安', intensity: 0.7 };
    const summary = controller['generateSummary'](data);
    expect(summary).toContain('不安');
    expect(summary).toContain('70%');
  });
});
```

#### Dependency Graphのテスト

```typescript
// DependencyGraph.test.ts

describe('DependencyGraph', () => {
  test('循環依存を検出する', () => {
    const graph = new DependencyGraph();
    graph.addNode({ id: 'A', type: 'widget' });
    graph.addNode({ id: 'B', type: 'widget' });
    graph.addNode({ id: 'C', type: 'widget' });

    graph.addEdge({
      id: 'e1',
      source: 'A.out',
      target: 'B.in',
      mechanism: 'update',
      relationship: { type: 'javascript', javascript: 'return source;' },
      updateMode: 'realtime'
    });
    graph.addEdge({
      id: 'e2',
      source: 'B.out',
      target: 'C.in',
      /* ... */
    });

    expect(() => {
      graph.addEdge({
        id: 'e3',
        source: 'C.out',
        target: 'A.in',
        /* ... */
      });
    }).toThrow(/Circular dependency/);
  });

  test('トポロジカルソートで正しい順序を返す', () => {
    // テスト実装...
  });
});
```

### 8.2 統合テスト

```typescript
// Widget間データフローのテスト

describe('Widget Data Flow Integration', () => {
  test('EmotionPalette → MatrixPlacement のデータ伝播', async () => {
    const { getByRole, findByText } = render(
      <TestWidgetFlow>
        <EmotionPalette spec={emotionSpec} />
        <MatrixPlacement spec={matrixSpec} />
      </TestWidgetFlow>
    );

    // 感情選択
    fireEvent.click(getByRole('button', { name: '不安' }));

    // MatrixのX軸ラベルに反映されることを確認
    const xAxisLabel = await findByText(/不安への対処/);
    expect(xAxisLabel).toBeInTheDocument();
  });
});
```

### 8.3 パフォーマンステスト

```typescript
describe('Performance Tests', () => {
  test('100個の依存関係を50ms以内に処理', () => {
    const graph = new DependencyGraph();

    // 100個のノードとエッジを追加
    for (let i = 0; i < 100; i++) {
      graph.addNode({ id: `widget${i}`, type: 'widget' });
    }
    for (let i = 0; i < 99; i++) {
      graph.addEdge({
        id: `edge${i}`,
        source: `widget${i}.out`,
        target: `widget${i+1}.in`,
        mechanism: 'update',
        relationship: { type: 'javascript', javascript: 'return source;' },
        updateMode: 'realtime'
      });
    }

    const startTime = performance.now();
    const order = graph.getUpdateOrder();
    const endTime = performance.now();

    expect(order).toHaveLength(100);
    expect(endTime - startTime).toBeLessThan(50);
  });

  test('Reactive更新が100ms以内', async () => {
    // テスト実装...
  });
});
```

---

**作成者**: TK
**レビュアー**: ___________
**承認者**: ___________
**承認日**: ___________
