# DSL v3 設計書

**作成日**: 2025-01-17
**バージョン**: 3.0

## 📋 設計書の構成

### 1. 基本設計書（概念設計/外部設計）
**ファイル**: `basic_design.md`

**内容**:
- システム全体アーキテクチャ
- DSLと実装の明確な分離
- 3層DSLアーキテクチャ（OODM/DpG/UISpec）
- UISpec/WidgetSpecの階層構造
- 完全なパイプライン図
- 外部インターフェース定義
- 非機能要求

### 2. 詳細設計書（内部設計）
**ファイル**: `detailed_design.md`

**内容**:
- DSL型と実装型の完全な型定義
- クラス設計（BaseWidgetController、DependencyGraph、DependencyExecutor）
- アルゴリズム詳細（循環依存検出、トポロジカルソート）
- State管理実装（Jotai）
- Widget実装パターン
- エラーハンドリング
- テスト戦略

## 🎯 重要なコンセプト

### DSLと実装の分離

システムは**DSL層**と**実装層**に明確に分離されています：

#### DSL層（LLM生成される抽象仕様）

1. **OODM (Object-Oriented Data Model)**
   - データ構造定義
   - LLMが生成するDSL

2. **DpG (Dependency Graph)**
   - Widget間の依存関係定義
   - **LLMの主要な動的生成対象**
   - LLMが生成するDSL

3. **UISpec (UI Specification)**
   - 画面全体の構成
   - 複数のWidgetSpecを内包
   - LLMが生成するDSL

4. **WidgetSpec (Widget Specification)**
   - **プリセットWidgetへの参照と設定**
   - UISpecに内包される
   - **LLMはWidget自体を生成せず、プリセット（8-12種）から選定**
   - LLMが選定+設定を生成するDSL

#### 実装層（ルールベースレンダリング）

1. **DSL Parser**
   - DSL → TypeScriptオブジェクトに変換

2. **UISpecObject / WidgetSpecObject**
   - パース後のTypeScriptオブジェクト

3. **Widget (React Component)**
   - 実際のUIコンポーネント
   - BaseWidgetControllerを継承

4. **DependencyGraph (Class)**
   - DpGを実行する実装クラス

5. **State Manager (Jotai)**
   - リアクティブなState管理

## 🔄 パイプライン概要

```
ユーザーの悩み（自然言語）
    ↓
[Captureフェーズ]
    ↓
Captureデータ
    ↓
【LLM生成 Step 1: OODM + DpG + Widget選定】
    Input: Captureデータ + プリセットWidget一覧（8-12種）
    ↓
OODM + DpG + Widget選定結果（DSL、TOON記法）
    ↓
【LLM生成 Step 2: UISpec生成】
    Input: OODM + DpG + 選定Widget ID[]
    ↓
UISpec（DSL、TOON記法）
  └─ WidgetSpec[] (選定されたWidgetの設定)
    ↓
【ルールベースレンダリング】
    ↓
DSL Parser → TypeScriptオブジェクト
    ↓
Widget Registry（プリセット8-12種から取得） → React Component
    ↓
【ユーザー操作】
    ↓
Widget Results
    ↓
【結果集約】
    ↓
Planフェーズ記録
```

## 📐 UISpec/WidgetSpecの階層

```
UISpec (画面全体、DSL)
  ├─ sessionId
  ├─ stage
  ├─ oodm (OODM、DSL)
  ├─ dpg (DependencyGraph、DSL)
  └─ widgets[] (複数のWidgetSpec、DSL)
       ├─ WidgetSpec 1
       │   ├─ component: 'emotion_palette'
       │   ├─ config: {...}
       │   └─ reactiveBindings: [...]
       ├─ WidgetSpec 2
       │   ├─ component: 'matrix_placement'
       │   └─ ...
       └─ WidgetSpec 3
           └─ ...
```

## 🔑 用語の対応関係

| DSL（抽象仕様） | 実装（具象コード） | 生成元 |
|----------------|-------------------|--------|
| **OODM** | OODMObject | LLM → Parser |
| **DpG** | DependencyGraph (Class) | LLM → Parser |
| **UISpec** | UISpecObject | LLM → Parser |
| **WidgetSpec** (選定+設定) | WidgetSpecObject | LLM（選定） → Parser |
| - | **プリセットWidget** (8-12種) | 実装（事前登録） |
| - | Widget (React Component) | Widget Registry（選定結果から取得） |
| - | BaseWidgetController | 実装 |
| - | WidgetResult | 実装 |

## 🎓 設計のポイント

### 1. Jellyからの継承

- 3層DSLアーキテクチャ（OODM/DpG/UISpec）
- ルールベースレンダリング
- Dependency Graphによる依存関係管理

### 2. Domain-Specificな改良

- **プリセットWidgetを8-12種類に限定**（LLMは生成ではなく選定）
- 思考整理特有のデータ構造
- トークン削減（30%以上）
- **Widget選定 + DpG生成がLLMの主要タスク**

### 3. Widget-to-Widget Reactivity

- **LLMの主要な動的生成対象**（Widgetそのものではない）
- 同一画面上のWidget間連動
- **DpGで定義**、Jotai + DependencyExecutorで実装
- リアルタイム/デバウンス/確定時の3モード

### 4. 構造化された結果出力

- 各WidgetがWidgetResultを返す
- 人間が読める要約（summary）
- 構造化データ（data）
- インタラクション記録（interactions）

## 📚 関連ドキュメント

### Phase 4 関連
- [タスク計画書](../phase4_detailed_tasks_rev2.md)
- [Jelly技術概要](../../../research/JellyPaper/Jelly技術概要解説.md)
- [JellyDSL技術詳細](../../../research/JellyPaper/JellyDSL技術詳細.md)
- [DSLv3議論記録](../../../research/Thoughts_Discussions/DSLv3-Discussion/)

### DSLv3 仕様書
- [DSL Core Spec v3.0](../../dsl-design/v3/DSL-Core-Spec-v3.0.md)
- [Plan Requirements v3.0](../../dsl-design/v3/plan-requirements-v3.0.md)

---

## 🔄 DSLv3仕様書との統合

**統合日**: 2025-01-17

### 統合方針
**Phase4設計書（Jellyベース）を主軸**とし、DSLv3仕様書の有用な要素を統合。

### 主要な統合内容

#### 1. 用語統一
- **UIComponent** → **Widget**（命名の明確化）
- **evaluate** → **organize**（ステージ名統一）
- **DataSchema** → **OODM**（Jellyとの一貫性）

#### 2. Widget数の確定
- **12種のプリセットWidget**をDSLv3 Plan Requirements v3.0（UC01-UC18）から選定
- 発散3種、整理4種、収束4種、まとめ1種

#### 3. OODM構造の詳細化
- DSLv3 Core Spec v3.0の**Entity/Attribute構造**を統合
- OODMの内部構造としてEntity/Attributeを明示

#### 4. DependencyGraphの強調
- **Widget-to-Widget Reactivity**の中核として位置づけ
- LLMの主要な動的生成対象として明確化

### 統合の理由
1. ✅ **DependencyGraph と Widget-to-Widget Reactivity**が研究の核心
2. ✅ DSLv3ではこれらの概念が十分に考慮されていない
3. ✅ Jellyベースの設計が研究の新規性を明確に示す

---

**作成者**: TK
**最終更新**: 2025-01-17
