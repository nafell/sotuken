# DSL体系概要 v1.0
**「頭の棚卸しノート」動的UI生成システム全体像**

---

## 📋 文書の目的

このドキュメントは、5つの詳細仕様書を横断する**鳥瞰図**を提供します。

### 関連仕様書
1. [DataSchemaDSL v1.0](./DataSchemaDSL_v1.0.md) - データ構造定義
2. [UISpecDSL v1.0](./UISpecDSL_v1.0.md) - UI表現定義
3. [TaskRecommendationDSL v1.0](./TaskRecommendationDSL_v1.0.md) - タスク推奨仕様
4. [アーキテクチャ設計書 v2.0](../system-design/architecture_design.md) - システム全体設計
5. [Phase 1改訂ロードマップ](../project/task/phase1_revised_roadmap.md) - 実装計画

---

## 🎯 2系統DSL設計の全体像

### なぜ2系統に分離したか

| 判断基準 | 思考整理 (capture/plan/breakdown) | タスク推奨 (home) |
|---------|--------------------------------|------------------|
| **タスク性質** | ユーザーが「考える」 | システムが「推す」 |
| **UI柔軟性** | 高（特にplan） | 低（固定構造） |
| **データモデル** | 動的（LLMが構造決定） | 固定（変化なし） |
| **LLMの役割** | 構造+内容+UI設計 | スコアリングのみ |
| **設計複雑度** | 高（2層パイプライン） | 低（直接生成） |

**結論:** 別々のDSL体系にすることで、各々の最適化が可能

**参考文献:** [Jelly: Generative and Malleable User Interfaces (CHI 2025)](https://arxiv.org/html/2503.04084v1)

---

## 📐 系統1: 思考整理DSL（2層アーキテクチャ）

### パイプライン

```
ユーザー入力
    ↓
【Layer 1】 DataSchemaDSL生成
    ├─ LLMがEntity構造を決定
    ├─ 依存関係グラフ生成
    └─ ステージ別の動的化レベル
    ↓
【Layer 2】 UISpecDSL生成
    ├─ 各属性のレンダリング方法
    ├─ レイアウト設計
    └─ 再生成ポリシー（planのみ）
    ↓
【Rendering】 Rule-based Renderer
    ├─ ComponentMapper
    ├─ 9種類のReactウィジェット
    └─ サリエンシースタイル適用
    ↓
React UI表示
```

### ステージ別の動的化レベル

| ステージ | DataSchema | UISpec | 説明 |
|---------|-----------|--------|------|
| **capture** | 簡易動的 | 限定動的 | 固定Schema + 質問内容調整 |
| **plan** | 🌟フル動的 | 🌟フル動的 | Entity構造から自由設計 |
| **breakdown** | ほぼ固定 | ほぼ固定 | 固定Template使用 |

### 主要な型定義

```typescript
// DataSchemaDSL
interface DataSchemaDSL {
  version: "1.0";
  task: "CONCERN";
  stage: "capture" | "plan" | "breakdown";
  entities: Record<string, EntityDefinition>;
  dependencies: Dependency[];
}

// UISpecDSL
interface UISpecDSL {
  version: "1.0";
  schemaRef: string;
  stage: "capture" | "plan" | "breakdown";
  mappings: Record<string, RenderSpec>;
  layout?: LayoutSpec;
  regenerationPolicy?: RegenerationPolicy;
}
```

### API

```
POST /v1/thought/generate        - DataSchema + UISpec一括生成
POST /v1/thought/generate-schema - DataSchemaのみ
POST /v1/thought/generate-uispec - UISpecのみ
```

---

## 🎯 系統2: タスク推奨DSL（Schema不要の簡易版）

### パイプライン

```
factors収集 + tasks[]
    ↓
【Scoring】 ScoreRankingService
    ├─ スコア計算（確定式）
    ├─ ゲーティング（variant決定）
    └─ サリエンシー決定
    ↓
【DSL生成】 TaskRecommendationDSL
    ├─ selectedTask情報
    ├─ taskCard固定構造
    └─ scoring仕様
    ↓
【Rendering】 TaskCard Renderer
    ├─ variant別カード表示
    └─ サリエンシースタイル適用
    ↓
React UI表示
```

### なぜDataSchema不要か

- タスクカード構造は常に固定（`title`, `estimate`, `due_in_hours`）
- 変化するのは「どのタスクを選ぶか」と「どう目立たせるか」だけ
- DataSchemaを挟むと複雑化するだけ

### スコア計算式（確定）

```
最終スコア = 0.4 × importance + 0.3 × urgency + 0.2 × staleness + 0.1 × contextFit
```

### ゲーティングルール

```
if (available_time >= estimate)
  → task_card
elif (available_time >= estimate_min_chunk && micro_step存在)
  → micro_step_card
else
  → prepare_step_card
```

### サリエンシーレベル

| Level | 名称 | 使用シーン | 頻度 |
|-------|------|-----------|------|
| 0 | base | （ほぼ使用しない） | 0% |
| 1 | emphasis | 準備ステップ | 10% |
| 2 | primary | **標準推奨** | 85% |
| 3 | urgent | 緊急（締切<24h & 重要度≥高） | 5% |

### API

```
POST /v1/task/rank - TaskRecommendationDSL生成
```

---

## 🔄 2系統の比較表

| 項目 | 思考整理DSL | タスク推奨DSL |
|------|-----------|-------------|
| **DataSchema** | ✅ 必要 | ❌ 不要 |
| **UISpec** | ✅ 必要 | ✅ 簡易版（固定構造） |
| **LLM使用** | 2回（Schema + UISpec） | 0回（ルールベース） |
| **生成時間** | 500-700ms | 100-300ms |
| **柔軟性** | 高（Entity構造から変更） | 低（saliencyのみ） |
| **実装複雑度** | 高 | 低 |
| **拡張方向** | より複雑なEntity構造 | ミニ実行画面埋め込み |

---

## 🏗️ Rule-based Rendering（共通基盤）

### ComponentMapper

両系統のDSLを統一的にReactコンポーネントに変換

```typescript
// 思考整理DSL
UISpec.mappings["CONCERN.concernText"] = { render: "paragraph" }
  ↓
<TextAreaWidget />

// タスク推奨DSL
TaskRecommendationDSL.selectedTask.saliency = 2
  ↓
<TaskCardWidget className="bg-blue-100 text-lg shadow-md" />
```

### 主要ウィジェット（9種類）

| ウィジェット | render値 | 使用箇所 |
|------------|---------|---------|
| TextAreaWidget | paragraph | capture: 関心事入力 |
| InputWidget | shortText | breakdown: タスクタイトル |
| NumberInputWidget | number | breakdown: 見積時間 |
| RadioGroupWidget | radio | capture: 問診質問 |
| CategoryPickerWidget | category | plan: アプローチ選択 |
| ListWidget | expanded | breakdown: タスクリスト |
| SummaryListWidget | summary | plan: 戦略候補（要約表示） |
| DynamicWidget | custom | plan: カスタムウィジェット |
| TaskCardWidget | - | home: タスクカード |

### サリエンシートークン

```typescript
const SALIENCY_STYLES = {
  0: "bg-neutral-50 text-base shadow-none",
  1: "bg-blue-50 text-md shadow-sm",
  2: "bg-blue-100 text-lg font-semibold shadow-md",
  3: "bg-red-100 text-lg font-bold shadow-lg animate-pulse"
};
```

---

## 📊 実装ロードマップ

### Phase 1A: 思考整理DSL基盤（Week 7-8）
- DataSchemaDSL実装
- UISpecDSL実装
- LLMService統合
- API実装（`/v1/thought/*`）

### Phase 1B: タスク推奨DSL基盤（Week 9）
- TaskRecommendationDSL実装
- ScoreRankingService実装
- API実装（`/v1/task/rank`）

### Phase 1C: Rule-based Rendering統合（Week 10）
- ComponentMapper実装
- 9種類のReactウィジェット実装
- E2E統合テスト

---

## 🎓 設計思想の由来（Jelly論文）

### Jellyからの採用要素

| Jelly概念 | このアプリでの実装 |
|----------|-----------------|
| **Task-Driven Data Model** | DataSchemaDSL |
| **Object-Relational Schema** | Entity + Attribute定義 |
| **Dependency Graph** | Update/Validate依存関係 |
| **UI Specification** | UISpecDSL |
| **Rule-based Rendering** | ComponentMapper |

### このアプリ特有の差異

| 要素 | Jelly（汎用） | このアプリ（思考整理特化） |
|------|-------------|----------------------|
| **対象タスク** | あらゆる情報タスク | 思考整理・タスク分解のみ |
| **DICT型** | 頻繁に使用 | **ほぼ不使用** |
| **PNTR型** | 頻繁に使用 | **ACTION依存のみ** |
| **依存関係** | Update + Validate | **Updateのみ** |
| **UIレイアウト** | 高度に動的 | **planのみ動的** |

**参考文献:** [Cao, Y., Jiang, P., & Xia, H. (2025). Generative and Malleable User Interfaces. CHI 2025.](https://arxiv.org/html/2503.04084v1)

---

## 🚀 今後の拡張予定

### 短期（Phase 2: ユーザー評価後）
- A/Bテスト結果に基づくスコア重み調整
- planステージのUI生成品質向上
- より複雑な依存関係（Validate追加）

### 中長期（Phase 3以降）
- ミニ実行画面（TaskRecommendationDSL拡張）
- 外部データ統合（Calendar Entity等）
- ユーザー固有Entity定義
- 機械学習ベースのスコア最適化

---

## 📚 ナビゲーションガイド

### 理解したい内容に応じて読むべき仕様書

| 知りたいこと | 読むべきドキュメント |
|-----------|------------------|
| **データ構造の定義方法** | [DataSchemaDSL v1.0](./DataSchemaDSL_v1.0.md) |
| **UI表現の指定方法** | [UISpecDSL v1.0](./UISpecDSL_v1.0.md) |
| **タスク推奨の仕組み** | [TaskRecommendationDSL v1.0](./TaskRecommendationDSL_v1.0.md) |
| **システム全体の構造** | [アーキテクチャ設計書 v2.0](../system-design/architecture_design.md) |
| **実装の進め方** | [Phase 1改訂ロードマップ](../project/task/phase1_revised_roadmap.md) |
| **全体像の把握** | このドキュメント（DSL_Overview） |

### 役割別の推奨読書順序

**フロントエンド開発者:**
1. DSL_Overview（このドキュメント）
2. UISpecDSL v1.0
3. TaskRecommendationDSL v1.0
4. アーキテクチャ設計書のRendering部分

**バックエンド開発者:**
1. DSL_Overview（このドキュメント）
2. DataSchemaDSL v1.0
3. TaskRecommendationDSL v1.0
4. アーキテクチャ設計書のサービス層部分

**プロジェクトマネージャー:**
1. DSL_Overview（このドキュメント）
2. Phase 1改訂ロードマップ
3. アーキテクチャ設計書の概要部分

---

**文書バージョン:** 1.0  
**最終更新:** 2025年10月12日  
**ステータス:** 確定（全仕様書の統合ビュー）

