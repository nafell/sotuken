# DSL v4 レビュー議事録

**Date**: 2025-12-02
**Topic**: DSL v3仕様レビューとv4改修計画
**Status**: 議論完了、要件定義へ移行

---

## 1. 背景と目的

### 1.1 背景
DSL v3.1（仮呼称、v4に組み込み）改修の前に、現在実装されているDSLを見直す必要が出てきた。

### 1.2 目的
- Jelly論文のDSLを曲解していないか確認
- 相違点がある場合、オリジナリティとして妥当か判断
- 「Jellyシステムの正統な発展系になっているか」を評価
- Widget-to-Widget ReactivityやgeneratedValueの仕様をどう落とし込むか検討

### 1.3 参考文献
- [Jelly Framework論文](https://arxiv.org/html/2503.04084v1)

---

## 2. 議論トピックと決定事項

### トピック1: OODMの役割とLLM呼び出し段階構成

#### 問題点
- 現在OODMが形骸化（`entities: []`で返される）
- 1回のLLM呼び出しでWidget選定からUI仕様まで一括生成
- Widget選定が`stageWidgets`で4ステージに固定振り分けされ、動的生成の印象が薄い
- Jelly論文では3段階のLLM呼び出し構成

#### 決定事項

**1. 3段階LLM呼び出し構成への変更**

| 段階 | タスク | 入力 | 出力 |
|------|--------|------|------|
| 第1段階 | Widget選定（4ステージ一括） | ConcernText, BottleneckType, 全Widget Definitions | 各ステージのWidget + 分析目的 + 分析対象 |
| 第2段階 | OODM + DpG生成 | ConcernText, 選定Widget, 前ステージ結果 | OODM Instance + DependencyGraph Instance |
| 第3段階 | UISpec生成 | OODM + DpG + 選定Widget | UISpec Instance（widgets + reactiveBindings） |

**2. complexity メタデータの導入**

| メタデータ | 役割 | 値域 |
|-----------|------|------|
| `timing` | 思考フロー上の適用タイミング | 0.0-1.0 |
| `versatility` | 汎用性 | 0.0-1.0 |
| `bottleneck` | 解消可能な思考障壁 | string[] |
| **`complexity`** (新規) | 認知負荷・複雑度 | 0.0（シンプル）-1.0（複雑） |

- W2W Reactivityのtarget選定制限に使用（複雑すぎるWidgetをtargetにしない）
- 1ステージ内のWidget組み合わせ制御
- ルールベースで閾値を設定（具体的な数値は全Widget設定後に決定）

**3. generatedValueの分類**

| 分類 | 説明 | 例 |
|------|------|-----|
| A. ラベル・説明文 | UIの「枠」を埋めるもの | 感情ラベル、象限説明文 |
| B. サンプルデータ | ユーザー入力の叩き台 | 初期カード、サンプル項目 |

- OODMへの落とし込み方は継続検討（Attributeのメタデータ拡張の方向性）

---

### トピック2: Dependency Graphの責任範囲

#### 問題点
- 現在DpGがUI仕様（UISpec）に組み込まれている
- Jelly論文ではDpGはデータモデル層（ORS）と同時に生成される
- 参照形式が「widgetId.portId」でWidget間関係を記述（Jellyでは「Attribute間」）

#### 決定事項

**1. DpGとReactiveBindingの分離**

| 概念 | 責務 | 定義場所 | 参照形式 | 性質 |
|------|------|---------|---------|------|
| **DependencyGraph** | データ間の依存関係 | OODM層 | `entityId.attributeId` | 要件的（What） |
| **ReactiveBinding** | Widget間のUI連携 | UISpec層 | `widgetId.portId` | 実装的（How） |

**2. レンダラー改修方針**
- 現在の`DependencyGraphSpec`を`ReactiveBindingSpec`として再定義
- ReactiveBindingEngineは`ReactiveBindingSpec`を受け取る形に変更
- OODM層のDpGは別途データ変換ロジックとして機能

**3. 判断根拠**
- OODM層は要件の側面が強く、UISpec層は実装の側面が強い
- 分離することで責務が明確になる
- 精度・コストのトレードオフは将来的に計測で判断（現時点ではスペック重視）

---

### トピック3: 型定義の二系統整理

#### 問題点
- DSL Core Specでは抽象型（SVAL/ARRY/PNTR/DICT）を定義
- WidgetDefinitionではTypeScript具体型（string/object[]等）を使用
- 役割分担が不明確

#### 決定事項

**1. 層ごとの型使い分け**

| 層 | 型系統 | 用途 | 理由 |
|---|--------|------|------|
| **OODM層** | 抽象型（SVAL/ARRY/PNTR/DICT） | データモデルの構造定義 | LLMが生成しやすい、参照関係を明示できる |
| **UISpec層** | 具体型（string/object[]等） | Widget Portの入出力型 | レンダラーが直接扱える |

**2. PNTRの活用**
- Widget間のデータ参照にPNTRを活用
- 例: `card_sorting.inputCards`が`brainstorm_cards.cards`を参照する場合、OODMでPNTRとして表現
- 論文としての妥当性向上にも寄与

**3. 変換層の担当**
- LLMがOODM（抽象型）とUISpec（具体型）の両方を生成
- システムによる変換層を挟まない（point of failure回避）

---

### トピック4: タスクごとのモデル切り替え

#### 背景
- 3段階LLM呼び出しでタスクの性質が異なる
- 実験設計上、モデル比較が必要

#### 決定事項

**1. LLMタスク分類**

| タスク | 性質 | 分類 |
|--------|------|------|
| 1. Captureフェーズ診断 | 判断・分析 | 汎用タスク |
| 2. Widget選定 | 判断・選択 | 汎用タスク |
| 3. OODM生成 | 構造的出力 | 構造化タスク |
| 4. UISpec生成 | 構造的出力 | 構造化タスク |
| 5. まとめ | 文章生成 | 汎用タスク |

**2. 実験パターン**

| パターン | 汎用タスク(1,2,5) | 構造化タスク(3,4) | 目的 |
|---------|------------------|------------------|------|
| A | GPT-5 | GPT-5 | ベースライン |
| B | GPT-5-mini | GPT-5-mini | 低コスト全体 |
| C | GPT-5 | GPT-5-Codex | 構造化特化の効果検証 |
| D | GPT-5 | GPT-5-mini | 構造化タスクのコスト削減可能性 |

**3. 実装優先度**
- Must: タスク別モデル切り替えの基本機能
- Nice to have: configでのパターン編集機能

**4. Widget選定の出力標準化**
- モック・再現性のために出力形式を標準化する

---

### トピック5: Rule-based renderer

#### 確認事項
- 現在のUIRendererV3は概念的にはDSLインタプリタ
- 本格的な構文チェック機構は実装が重い

#### 決定事項

**1. v4スコープでの対応**
- 現状の簡易バリデーション維持
- JSON Schemaバリデーション追加
- 本格的な構文チェック機構は将来検討

**2. 命名**
- 現状維持（UIRendererV3等）
- 名称変更は不要

**3. エラーログ強化**
- バリデーションエラーや例外の内容をログに記録
- 論文での分析に活用（失敗パターンの傾向など）

---

### トピック6: アプリフロー再設計

#### 決定事項

**1. 新フロー構成**

```
Capture
  └── 【LLMタスク1】ボトルネック診断
        ↓
計画提示
  └── 【LLMタスク2】4ステージ分Widget選定（一括）
  └── ユーザーにフロー全体像を提示
  └── 確認のみ（修正機能はv4スコープ外）
        ↓
Plan（ステージ順次実行）
  ├── diverge
  │     ├── stage_summary Widget（前ステージの要約）
  │     ├── 【LLMタスク3】OODM + DpG生成
  │     ├── 【LLMタスク4】UISpec生成
  │     └── ユーザー操作
  ├── organize（同様）
  ├── converge（同様）
  └── summary（同様）
        ↓
Breakdown
  └── 【LLMタスク5】まとめ生成
```

**2. stage_summary Widget（新規追加）**
- Planフェーズ各ステージの先頭に必ず表示
- 前ステージまでのユーザー入力内容を要約
- Widgetごとに「操作内容をどう言語化するか」のプロンプトが必要

| Widget | 言語化プロンプト例 |
|--------|-------------------|
| `emotion_palette` | 選択された感情と強度を「{emotion}({intensity}%)」形式でリスト化 |
| `brainstorm_cards` | カードの内容を箇条書きで列挙 |
| `card_sorting` | カテゴリごとに分類されたカードを「{category}: {items}」形式で |
| `matrix_placement` | 各象限に配置されたアイテムを象限名と共に |
| `priority_slider_grid` | 優先度順にソートしたリスト |

**3. ナビゲーション**
- **戻り**: 前回生成したUI + 操作内容を保持して再表示。戻った先より後のステージのUI/操作結果は破棄
- **スキップ**: 「次へ」ボタンの隣に「スキップ」ボタンを配置
- フロー実行時にWidget単位で空欄/スキップ可能

---

## 3. Jellyとの比較まとめ

| 観点 | Jelly | 本システム（v4） | 判断 |
|------|-------|-----------------|------|
| LLM呼び出し段階 | 3段階 | 3段階（Widget選定→OODM/DpG→UISpec） | 準拠 |
| データモデル | ORS | OODM（活用強化） | 準拠 |
| DpGの位置 | データモデル層 | OODM層に移動（ReactiveBindingと分離） | 準拠 |
| 抽象型 | SVAL/ARRY/PNTR/DICT | OODM層で使用 | 準拠 |
| UI粒度 | 最小単位（input/button等） | Widget（複合UI） | **オリジナル** |
| W2W Reactivity | なし | ReactiveBinding（UISpec層） | **オリジナル** |
| complexity | なし | Widget選定・Reactivity制御 | **オリジナル** |
| generatedValue | なし | ラベル・サンプル生成 | **オリジナル** |
| stage_summary | なし | ステージ間データ引き継ぎ | **オリジナル** |

**結論**: Jelly論文のコアコンセプト（3層DSL、3段階LLM呼び出し）を踏襲しつつ、Widget単位のUIとCBT特化の思考支援フローというオリジナリティを持つ「正統な発展系」と評価できる。

---

## 4. 次のステップ

1. **v4要件定義書の作成**
   - 本議事録の決定事項を要件として整理
   - 優先度・実装順序の決定

2. **システム改修計画**
   - 影響範囲の特定
   - 実装タスクの分解

3. **継続検討事項**
   - generatedValueのOODMへの落とし込み詳細設計
   - 各Widgetのcomplexity値設定
   - Widget操作言語化プロンプトの詳細設計

---

## 変更履歴

| Date | Changes |
|------|---------|
| 2025-12-02 | 初版作成。6トピックの議論完了 |
