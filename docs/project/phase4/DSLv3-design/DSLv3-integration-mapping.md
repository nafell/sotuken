# DSLv3仕様書との統合対応表

**作成日**: 2025-01-17
**目的**: Phase4設計書とDSLv3仕様書の対応関係を明確化

---

## 1. 用語対応表

| DSLv3用語 | Phase4統一用語 | 説明 |
|---------|--------------|-----|
| **UIComponent** | **Widget** | プリセットのUIコンポーネント本体 |
| UIComponent (spec) | **WidgetSpec** | LLM生成のWidget仕様（DSL） |
| DataSchema | **OODM** | Object-Oriented Data Model |
| Dependency[] | **DpG** | Dependency Graph Specification |
| Entity/Attribute | **OODM内部構造** | データエンティティ・属性定義 |
| evaluate (stage) | **organize** | 整理・評価ステージ |

---

## 2. Widget選定マッピング（12種）

DSLv3 Plan Requirements v3.0（UC01-UC18）から12種を選定。

### 発散フェーズ (diverge) - 3種

| Phase4 Widget ID | DSLv3 UC | 名称 | 対象ボトルネック |
|-----------------|---------|------|----------------|
| `brainstorm_cards` | UC01 | ブレインストームカード | 何から考えればいいか分からない、情報不足 |
| `question_card_chain` | UC03 | 質問カード連鎖 | 情報不足、何から考えればいいか分からない |
| `emotion_palette` | UC05 | 感情カラーパレット | 感情的ブロック、決断への恐れ |

### 整理フェーズ (organize) - 4種

| Phase4 Widget ID | DSLv3 UC | 名称 | 対象ボトルネック |
|-----------------|---------|------|----------------|
| `card_sorting` | UC09 | カード仕分けUI | 選択肢が多すぎる、情報が整理されていない |
| `dependency_mapping` | UC10 | 依存関係マッピング | 複数の問題が絡んでいる、優先順位がつけられない |
| `swot_analysis` | UC11 | SWOT分析UI | 情報が整理されていない、視点固定 |
| `mind_map` | UC04 | マインドマップ生成 | 複数の問題が絡んでいる、情報が整理されていない |

### 収束フェーズ (converge) - 4種

| Phase4 Widget ID | DSLv3 UC | 名称 | 対象ボトルネック |
|-----------------|---------|------|----------------|
| `matrix_placement` | UC12 | マトリックス配置 | 選択肢が多すぎる、優先順位がつけられない |
| `tradeoff_balance` | UC13 | トレードオフ天秤 | 決断への恐れ、選択肢が多すぎる |
| `priority_slider_grid` | UC14 | 優先度スライダーグリッド | 優先順位がつけられない、選択肢が多すぎる |
| `timeline_slider` | UC06 | 時間軸スライダー | 視点固定、選択肢が少ない |

### まとめフェーズ (summary) - 1種

| Phase4 Widget ID | DSLv3 UC | 名称 | 対象ボトルネック |
|-----------------|---------|------|----------------|
| `structured_summary` | UC18 | 構造化文章まとめ | 全ボトルネック（最終確認） |

### 未採用のDSLv3コンポーネント（UC02, 07, 08, 15, 16, 17）

今回のPoC範囲外。将来的に追加検討可能。

---

## 3. データ構造対応

### DSLv3 DataSchema → Phase4 OODM

```typescript
// DSLv3 Core Spec v3.0
interface DataSchema {
  version: string;
  phase: "capture" | "plan" | "breakdown";
  entities: Entity[];
  dependencies?: Dependency[];
  metadata?: DICT<SVAL>;
}

// Phase4統合版 OODM
interface OODM {
  version: string;
  entities: Entity[];      // DSLv3のEntity構造をそのまま使用
  metadata?: DICT<SVAL>;
}
```

**統合内容**:
- DSLv3の`Entity/Attribute/Constraint`構造を**そのまま採用**
- `phase`フィールドは`UISpec.stage`に移動
- `dependencies`は`DpG (DependencyGraphSpec)`として独立

---

## 4. ステージ構造対応

### DSLv3 Plan Requirements v3.0

```typescript
stages: [
  { id: "diverge", name: "探索・発散" },
  { id: "evaluate", name: "評価・整理" },  // ← 注目
  { id: "converge", name: "決定・収束" },
  { id: "summary", name: "まとめ確認" }
]
```

### Phase4統合版

```typescript
export type StageType = 'diverge' | 'organize' | 'converge' | 'summary';
//                                   ^^^^^^^^
//                                   evaluate → organize に統一
```

**変更理由**: 日本語UIで「整理」の方が理解しやすい

---

## 5. Dependency構造対応

### DSLv3 Core Spec v3.0

```typescript
interface Dependency {
  source: PNTR;
  target: PNTR;
  type: DependencyType;  // update | visibility | validation | calculation
  condition?: Condition;
}
```

### Phase4統合版（DpG）

```typescript
interface DependencySpec {
  source: string;        // "widgetId.propertyName" 形式に拡張
  target: string;
  mechanism: 'validate' | 'update';
  relationship: RelationshipSpec;  // JavaScript/Transform/LLM
  updateMode: 'realtime' | 'debounced' | 'on_confirm';
}
```

**拡張内容**:
- ✅ **Widget-to-Widget Reactivity**のための詳細化
- ✅ `relationship`に変換関数とLLMプロンプトを追加
- ✅ `updateMode`でリアルタイム性を制御

---

## 6. メタデータ対応

### DSLv3 Plan Requirements v3.0

```typescript
interface UIComponent {
  timing: number;         // 0.0 - 1.0
  versatility: number;    // 0.0 - 1.0
  cognitive_mode: CognitiveMode[];
  bottlenecks: BottleneckType[];
}
```

### Phase4統合版

```typescript
interface WidgetMetadata {
  timing: number;        // 0.0-1.0 ← DSLv3から採用
  versatility: number;   // 0.0-1.0 ← DSLv3から採用
  bottleneck: string[];  // ← DSLv3のbottlenecksに相当
  description?: string;
}
```

**統合内容**: DSLv3の`timing`と`versatility`概念を完全採用

---

## 7. 統合の優先順位

### Phase4設計書を主軸とした理由

1. 🔴 **高優先度**: DependencyGraph と Widget-to-Widget Reactivity
   - 研究の核心的新規性
   - DSLv3では十分に考慮されていない

2. 🟡 **中優先度**: Jellyとの関係性
   - 3層DSLアーキテクチャの継承
   - 研究文脈の明確化

3. 🟢 **低優先度**: DSLv3の汎用性
   - Entity/Attribute構造は有用なので統合
   - UIComponentメタデータ（timing/versatility）も採用

---

## 8. 今後の統合作業

### 必要な作業

- [ ] DSLv3 Plan Requirements v3.0を更新
  - [ ] 用語を「Widget」に統一
  - [ ] `evaluate` → `organize`に変更
  - [ ] Phase4設計書へのリンク追加

- [ ] DSLv3 Core Spec v3.0を更新
  - [ ] OODMとの関係を明記
  - [ ] DependencyGraphの拡張を記載

### 保留事項

- TOON記法の詳細仕様（Phase4では未定義）
- LLMプロンプトの具体的な記述方法
- Widget実装の詳細パターン

---

**作成者**: TK
**承認**: _________
**最終更新**: 2025-01-17
