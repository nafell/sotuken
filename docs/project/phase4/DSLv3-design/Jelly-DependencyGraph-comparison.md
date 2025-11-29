# Jelly Dependency Graph vs Phase4 DependencyGraph 比較

**作成日**: 2025-01-17
**目的**: JellyのDependency GraphとPhase4設計のDependencyGraphの違いを明確化

---

## 1. 構造比較

### Jellyの Dependency 定義

```
Dependency := {Source, Target, Mechanism, Relationship}
```

| 要素 | Jelly仕様 | Phase4設計書 | 差分 |
|------|----------|------------|-----|
| **Source** | エンティティまたは属性 | **Widget ID + プロパティ名** | ✅ 拡張 |
| **Target** | エンティティまたは属性 | **Widget ID + プロパティ名** | ✅ 拡張 |
| **Mechanism** | Validate / Update | Validate / Update | ✅ 同じ |
| **Relationship** | JavaScript / 自然言語 | **JavaScript / Transform / LLM** | ✅ 拡張 |
| **UpdateMode** | ❌ なし | **realtime / debounced / on_confirm** | ⭐ 新規 |

---

## 2. 詳細比較表

### 2.1 Source / Target の粒度

| 観点 | Jelly | Phase4 | 説明 |
|------|-------|--------|-----|
| **粒度** | **Item-to-Item** | **Widget-to-Widget** | Phase4は画面上のUI要素間 |
| **記法** | エンティティパス | `"widgetId.propertyName"` | Phase4は明示的なWidget参照 |
| **スコープ** | 単一タスク内 | **複数ステップ跨ぎ可能** | Phase4は段階間の依存も表現 |

#### Jellyの例（Item-to-Item）
```typescript
// 食材の量が変更 → 料理の総カロリーが自動更新
{
  source: "ingredient.amount",    // エンティティの属性
  target: "recipe.total_calories", // エンティティの属性
  mechanism: "update",
  relationship: "target = sum(ingredients.calories * ingredients.amount)"
}
```

#### Phase4の例（Widget-to-Widget）
```typescript
// EmotionPaletteの出力 → MatrixPlacementの設定に反映
{
  source: "emotion_widget.data.emotion",   // Widget の出力
  target: "matrix_widget.config.xAxisLabel", // Widget の設定
  mechanism: "update",
  relationship: {
    type: "transform",
    transform: (emotion) => `${emotion}への対処の実現性`
  },
  updateMode: "realtime"  // ← Phase4の拡張
}
```

---

### 2.2 Mechanism（メカニズム）

| Mechanism | Jelly | Phase4 | 互換性 |
|-----------|-------|--------|--------|
| **Validate** | ✅ 制約が守られているか検証<br>違反時に更新拒否、UI上でハイライト | ✅ 同じ仕様 | ✅ 完全互換 |
| **Update** | ✅ 変更を自動的に伝播<br>（例：食材量変更→総カロリー更新） | ✅ 同じ仕様 | ✅ 完全互換 |

**Phase4での実装**:
```typescript
export type MechanismType = 'validate' | 'update';
```

✅ **Jellyと完全に互換**

---

### 2.3 Relationship（関係定義）

| Relationship Type | Jelly | Phase4 | 拡張内容 |
|------------------|-------|--------|---------|
| **JavaScript** | ✅ JavaScriptスニペット | ✅ JavaScriptスニペット | ✅ 同じ |
| **自然言語** | ✅ LLMが処理 | ✅ `llmPrompt` フィールド | ✅ 明示的に定義 |
| **Transform** | ❌ なし | ⭐ **組み込み変換関数** | ⭐ Phase4の新規追加 |

#### Jellyの Relationship 仕様

```typescript
// JavaScriptスニペット（コード表現可能な場合）
relationship: "target.value = source.value * 2"

// 自然言語（コード化できない場合）
relationship: "チェックアウト日はチェックイン日より後であること"
```

#### Phase4の Relationship 仕様（拡張版）

```typescript
export interface RelationshipSpec {
  type: 'javascript' | 'transform' | 'llm';

  // JavaScript スニペット
  javascript?: string;

  // 組み込み変換関数（Phase4の拡張）
  transform?: TransformFunction;

  // LLM プロンプト（自然言語を明示的に定義）
  llmPrompt?: string;
}

export type TransformFunction =
  | 'calculate_ranking'      // ランキング計算
  | 'calculate_balance'      // バランス計算
  | 'filter_high_priority'   // 高優先度フィルタ
  | 'generate_summary'       // サマリー生成
  | 'detect_gaps'            // ギャップ検出
  | ((source: any) => any);  // カスタム関数
```

**Phase4の拡張理由**:
- ✅ **再利用可能な変換関数**をプリセットとして提供
- ✅ JavaScriptスニペットの安全性向上（組み込み関数優先）
- ✅ LLMプロンプトを明示的に定義（Jellyは暗黙的）

---

### 2.4 UpdateMode（更新モード）

⭐ **Phase4の独自拡張**（Jellyにはない概念）

```typescript
export type UpdateMode = 'realtime' | 'debounced' | 'on_confirm';
```

| Mode | 説明 | 使用例 |
|------|------|--------|
| **realtime** | 操作毎に即座に更新 | スライダー調整→ランキングが即座に変化 |
| **debounced** | 300ms待機後に更新 | テキスト入力→サジェスト表示（打鍵中は待機） |
| **on_confirm** | ユーザーが明示的に確定した時のみ更新 | フォーム送信ボタン押下時 |

**Phase4の拡張理由**:
- ✅ **Widget-to-Widget Reactivity**のパフォーマンス最適化
- ✅ ユーザー体験の向上（不要な更新を抑制）
- ✅ 同一画面上の複雑な連動を制御

---

## 3. 実装例の比較

### 3.1 Jelly の Dependency 例

**シナリオ**: 食事計画の総カロリー計算

```json
{
  "source": "ingredient.amount",
  "target": "recipe.total_calories",
  "mechanism": "update",
  "relationship": "target = sum(ingredients.map(i => i.calories * i.amount))"
}
```

**特徴**:
- ✅ Entity属性間の依存
- ✅ JavaScriptスニペットで計算ロジックを記述
- ✅ メカニズムは`update`（自動更新）

---

### 3.2 Phase4 の DependencySpec 例

**シナリオ1**: 優先度スライダー → ランキング表示（同一画面内）

```typescript
{
  source: "priority_sliders.values",
  target: "ranking_display.items",
  mechanism: "update",
  relationship: {
    type: "transform",
    transform: "calculate_ranking"  // 組み込み変換関数
  },
  updateMode: "realtime"  // リアルタイム更新
}
```

**シナリオ2**: 感情選択 → 次段階のMatrix設定（段階間）

```typescript
{
  source: "step1_emotion.data.emotion",
  target: "step2_matrix.config.xAxisLabel",
  mechanism: "update",
  relationship: {
    type: "javascript",
    javascript: "return `${source}への対処の実現性`;"
  },
  updateMode: "on_confirm"  // 確定時のみ更新
}
```

**シナリオ3**: LLMによる不足情報推論

```typescript
{
  source: "swot_analysis.data.mapping",
  target: "gap_list.items",
  mechanism: "update",
  relationship: {
    type: "llm",
    llmPrompt: "SWOT分析結果から不足している情報を推論してください"
  },
  updateMode: "debounced"  // デバウンス
}
```

**Phase4の特徴**:
- ✅ Widget間の依存を明示的に記述
- ✅ 組み込み変換関数で安全性向上
- ✅ UpdateModeで更新タイミングを制御
- ✅ LLMプロンプトを明示的に定義

---

## 4. アーキテクチャ上の違い

### 4.1 Jelly のアーキテクチャ

```
Task (Root)
  ├─ Entity 1
  │   ├─ Attribute A
  │   └─ Attribute B
  └─ Entity 2
      └─ Attribute C

Dependency: Entity1.AttributeA → Entity2.AttributeC
```

**特徴**:
- ✅ Entity/Attribute 中心のデータモデル
- ✅ 単一タスク内の属性間依存
- ✅ Item-to-Item のリアクティブ更新

---

### 4.2 Phase4 のアーキテクチャ

```
UISpec (画面全体)
  ├─ OODM (データモデル)
  │   └─ Entity/Attribute (Jellyと同じ構造)
  ├─ DpG (Dependency Graph)
  │   └─ Widget間の依存関係定義
  └─ WidgetSpec[] (複数Widget)
      ├─ Widget 1 (emotion_palette)
      ├─ Widget 2 (matrix_placement)
      └─ Widget 3 (priority_slider_grid)

Dependency: Widget1.output → Widget2.config
```

**特徴**:
- ✅ Widget 中心のUI構造
- ✅ 複数ステップ跨ぎの依存も可能
- ✅ **Widget-to-Widget Reactivity**（画面上のUI要素間）
- ✅ OODMでJellyのEntity/Attribute構造を継承

---

## 5. Phase4の拡張がもたらす新規性

### 5.1 研究上の新規性

| 観点 | Jelly | Phase4 | 新規性 |
|------|-------|--------|--------|
| **粒度** | Item-to-Item | **Widget-to-Widget** | ⭐ UI要素間の連動 |
| **スコープ** | 単一タスク内 | **複数ステップ跨ぎ** | ⭐ 段階的思考支援 |
| **更新制御** | なし | **UpdateMode** | ⭐ パフォーマンス最適化 |
| **変換関数** | JavaScriptのみ | **組み込み変換関数** | ⭐ 安全性と再利用性 |
| **LLM統合** | 暗黙的 | **明示的なllmPrompt** | ⭐ 透明性と制御性 |

### 5.2 実装上の利点

1. ✅ **Widget-to-Widget Reactivity**により、同一画面上の複雑なUI連動を実現
2. ✅ **UpdateMode**でパフォーマンスとUXを最適化
3. ✅ **組み込み変換関数**で安全性と保守性を向上
4. ✅ **段階間の依存**で、思考整理の段階的フローを支援

### 5.3 Domain-Specific最適化

| 最適化 | 説明 |
|--------|------|
| **思考整理特化** | diverge → organize → converge の段階的フロー |
| **ボトルネック対応** | 8種のボトルネックタイプに応じたWidget選定 |
| **12種のプリセットWidget** | 汎用（Jelly）→ Domain-Specific（Phase4） |
| **トークン削減** | Jellyより30%削減目標 |

---

## 6. 互換性の評価

### 6.1 Jellyとの後方互換性

| 要素 | 互換性 | 備考 |
|------|--------|------|
| **Mechanism** | ✅ 完全互換 | validate/update そのまま使用可能 |
| **JavaScript Relationship** | ✅ 完全互換 | JavaScriptスニペットそのまま使用可能 |
| **自然言語 Relationship** | ✅ 互換（拡張） | `llmPrompt`フィールドで明示化 |
| **Source/Target記法** | ⚠️ 拡張 | Entity.Attribute → widgetId.propertyName |
| **UpdateMode** | ⭐ 新規 | Jellyにはない概念（Phase4の独自拡張） |

**結論**:
- ✅ Jellyの**コア概念は完全に継承**
- ✅ Phase4は**上位互換として拡張**（Widget-to-Widget Reactivity）
- ✅ Jellyの依存関係定義を**そのまま使用可能**

---

## 7. 実装上の考慮事項

### 7.1 Jellyから引用する要素

✅ **そのまま使用**:
- Mechanism（validate/update）
- JavaScript Relationship
- Entity/Attribute構造（OODMの内部）

✅ **明示的に定義**:
- 自然言語 Relationship → `llmPrompt`
- Source/Target記法 → `"widgetId.propertyName"`

### 7.2 Phase4で追加実装が必要な要素

⭐ **新規実装**:
- `UpdateMode`の実装（realtime/debounced/on_confirm）
- 組み込み変換関数のライブラリ
- Widget間の依存関係管理（DependencyGraphクラス）
- Jotaiによるリアクティブ更新

### 7.3 安全性の考慮

| リスク | Jelly | Phase4 | 対策 |
|--------|-------|--------|------|
| **JavaScriptインジェクション** | ⚠️ あり | ✅ 軽減 | 組み込み変換関数を優先 |
| **無限ループ** | ⚠️ あり | ✅ 検出 | 循環依存検出（DFS） |
| **パフォーマンス劣化** | ⚠️ あり | ✅ 制御 | UpdateModeでデバウンス |

---

## 8. まとめ

### Jellyの Dependency Graph
- ✅ Item-to-Item のリアクティブ更新
- ✅ Validate/Update メカニズム
- ✅ JavaScript/自然言語 による Relationship定義
- ✅ 汎用的なタスク駆動型データモデル

### Phase4の DependencyGraph（拡張版）
- ⭐ **Widget-to-Widget Reactivity**（研究の核心）
- ⭐ **UpdateMode**による更新制御
- ⭐ **組み込み変換関数**による安全性向上
- ⭐ **段階間の依存**による思考整理支援
- ✅ Jellyのコア概念を**完全に継承**

### 研究の新規性
1. ⭐ Widget-to-Widget Reactivity（同一画面上のUI要素間連動）
2. ⭐ 複数ステップ跨ぎの依存関係（段階的思考支援）
3. ⭐ UpdateModeによるパフォーマンス最適化
4. ⭐ Domain-Specific最適化（思考整理に特化）

---

**作成者**: TK
**参照文献**:
- Jelly論文（Generative and Malleable User Interfaces）
- specs/research/JellyPaper/JellyDSL技術詳細.md
- specs/research/JellyPaper/Jelly技術概要解説.md

**最終更新**: 2025-01-17




  🎓 結論

  Jellyからの継承 ✅

  - ✅ Mechanism（validate/update）
  - ✅ JavaScript Relationship
  - ✅ Entity/Attribute構造（OODM）
  - ✅ コア概念を完全に互換

  Phase4の独自拡張 ⭐

  1. Widget-to-Widget Reactivity（研究の核心）
  2. UpdateMode（パフォーマンス最適化）
  3. 組み込み変換関数（安全性向上）
  4. 段階間の依存（思考整理支援）

  研究上の位置づけ

  - ✅ Jellyの上位互換として設計
  - ✅ Domain-Specific最適化（思考整理に特化）
  - ✅ Widget-to-Widget Reactivityが主要な新規性
  - ✅ トークン削減率30%目標（12種のプリセットWidget）

  ---
  📚 統合完了したドキュメント一覧

  1. ✅ basic_design.md - プリセットWidget選定、12種のWidget表
  2. ✅ detailed_design.md - OODM/Entity/Attribute型定義、DependencyGraphSpec
  3. ✅ README.md - DSLv3統合記録、統合方針
  4. ✅ DSLv3-integration-mapping.md - DSLv3との対応表
  5. ✅ Jelly-DependencyGraph-comparison.md - Jellyとの詳細比較 ⭐ 新規作成

  ---
  これで、Phase4設計書の整合性確認と統合作業が完全に完了しました。

  - ✅ DSLv3仕様書との統合
  - ✅ Jelly Dependency Graphとの比較
  - ✅ 研究の新規性の明確化
  - ✅ 12種のプリセットWidget確定
  - ✅ 用語統一（Widget、organize）
  - ✅ 包括的なドキュメント作成