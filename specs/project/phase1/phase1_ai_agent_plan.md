# Phase 1 AI実装計画書
**動的UI生成システム - AIエージェント向け実装指針**

---

## 📋 実装目標

LLMによる動的UI生成システムを実装する。2系統のDSL（思考整理・タスク推奨）が独立動作し、Reactコンポーネントで統一的にレンダリングできる基盤を完成させる。

### 核心仕様
- **思考整理DSL**: DataSchemaDSL → UISpecDSL → React UI（2層アーキテクチャ）
- **タスク推奨DSL**: 確定式スコアリング → TaskRecommendationDSL → React UI（1層）
- **Jelly論文準拠**: データ構造とUI表現の分離設計
- **LLM統合**: Gemini 2.5 mini による動的生成

---

## 🎯 Phase 1A: 思考整理DSL基盤

### A1. DataSchemaDSL実装
**目標**: 動的データ構造定義システム

**必須実装**:
- TypeScript型定義（`DataSchemaDSL`, `EntityDefinition`, `AttributeSpec`, `Dependency`）
- バリデーター（必須フィールド・循環依存・Entity構造チェック）
- 3ステージ対応（capture=限定動的、plan=フル動的、breakdown=ほぼ固定）

**技術制約**:
- 必須Entity: `CONCERN`（全ステージ共通）
- ステージ別Entity: `QUESTION`（capture）、`STRATEGY`（plan）、`ACTION`（breakdown）
- PNTR型使用は`ACTION.dependencies`のみ
- DICT型は原則不使用（例外: `tradeoffs`のみ）

### A2. LLM Schema生成サービス
**目標**: 関心事テキストからDataSchemaを生成

**必須実装**:
- Gemini 2.5 mini統合（JSON出力モード）
- ステージ別プロンプト設計（capture/plan/breakdown）
- 生成結果バリデーション・フォールバック処理
- 生成ID管理・DB記録

**重要ポイント**:
- planステージは最高創造性（Entity構造から自由設計）
- capture/breakdownは定型テンプレート＋部分調整
- 生成失敗時のフォールバック必須

### A3. UISpecDSL実装
**目標**: DataSchemaをUI表現に変換する仕様

**必須実装**:
- TypeScript型定義（`UISpecDSL`, `RenderSpec`, `LayoutSpec`, `RegenerationPolicy`）
- 9種render値対応（paragraph, shortText, number, radio, category, expanded, summary, custom）
- レイアウト仕様（singleColumn/twoColumn/grid）
- 再生成ポリシー（planのみ・debounce・trigger）

**技術制約**:
- capture: `singleColumn`固定
- plan: `twoColumn`or`grid`＋sections自由設計＋再生成ポリシー
- breakdown: `twoColumn`固定＋sections固定

### A4. LLM UISpec生成サービス
**目標**: DataSchemaを最適なUI表現に変換

**必須実装**:
- DataSchema→UISpec変換（ステージ別最適化）
- カスタムウィジェット指定（tradeoff_slider, counterfactual_toggles, strategy_preview_picker）
- UISpecバリデーション
- 再生成トリガー設定（planのみ）

### A5. Thought Organization API
**目標**: Schema生成とUISpec生成の統合エンドポイント

**必須実装**:
- `/v1/thought/generate` - 一括生成（Schema→UISpec）
- `/v1/thought/generate-schema` - Schema単独生成
- `/v1/thought/generate-uispec` - UISpec単独生成
- エラー処理・フォールバック・DB記録

---

## 🎯 Phase 1B: タスク推奨DSL基盤

### B1. TaskRecommendationDSL実装
**目標**: タスクランキング結果のDSL化

**必須実装**:
- TypeScript型定義（`TaskRecommendationDSL`, `ScoringSpec`, `TaskCardSpec`）
- スコアリング・ゲーティング・サリエンシー結果の構造化
- variant別カード仕様（task_card/micro_step_card/prepare_step_card）

**技術制約**:
- DataSchema不要（固定構造のため）
- saliencyレベル0-3（0=base, 1=emphasis, 2=primary, 3=urgent）

### B2. ScoreRankingService実装
**目標**: 確定式に基づくタスクスコアリング

**必須実装**:
- スコア計算（`0.4×importance + 0.3×urgency + 0.2×staleness + 0.1×contextFit`）
- ゲーティングルール（available_time vs estimate比較）
- サリエンシー決定（due_in_hours < 24 && importance ≥ 0.67 → urgent）
- context fit計算（時間帯・場所・利用可能時間考慮）

**技術制約**:
- 正規化関数: logistic関数使用
- urgency: `1 - logistic(due_in_hours, 48, 0.1)`
- staleness: `logistic(days_since_last_touch, 3, 1.5)`

### B3. Task Recommendation API
**目標**: タスクランキング結果のDSL出力

**必須実装**:
- `/v1/task/rank` エンドポイント
- 全タスクのスコアリング・ランキング・トップ選出
- TaskRecommendationDSL生成・DB記録

---

## 🎯 Phase 1C: Rule-based Rendering統合

### C1. ComponentMapper実装
**目標**: DSL render値をReact Component自動変換

**必須実装**:
- render値→React Component対応表
- サリエンシースタイル適用（CSS class自動付与）
- 動的props渡し（editable, placeholder, categories等）
- エラーハンドリング（未対応render値）

**技術制約**:
- サリエンシースタイル: `0=bg-neutral-50`, `1=bg-blue-50`, `2=bg-blue-100`, `3=bg-red-100+animate-pulse`

### C2. 9種Reactウィジェット実装
**目標**: DSL対応の基本UI部品

**必須ウィジェット**:
1. TextAreaWidget（paragraph）
2. InputWidget（shortText）
3. NumberInputWidget（number）
4. RadioGroupWidget（radio）
5. CategoryPickerWidget（category）
6. ListWidget（expanded）
7. SummaryListWidget（summary）
8. DynamicWidget（custom）
9. TaskCardWidget（タスク推奨用）

**共通仕様**:
- editable prop対応（true=入力可、false=表示のみ）
- onChange callback対応
- サリエンシースタイル適用
- Tailwind CSS使用

### C3. E2E統合テスト
**目標**: 2系統DSL完全独立動作確認

**必須テスト**:
- 思考整理フロー（capture→plan→breakdown）
- タスク推奨フロー（ランキング→DSL→React表示）
- 2系統独立性（同時動作・相互影響なし）
- パフォーマンス（Schema生成<500ms, UISpec生成<700ms, TaskRank<300ms）

---

## ✅ 完成判定基準

### 技術的完成（必須）
- [ ] 思考整理DSL: DataSchema+UISpec生成パイプライン動作
- [ ] タスク推奨DSL: スコアリング+DSL生成パイプライン動作
- [ ] 2系統完全独立（同時動作・相互干渉なし）
- [ ] Rule-based Rendering（DSL→React自動変換）
- [ ] 全API動作（`/v1/thought/*`, `/v1/task/rank`）

### パフォーマンス（必須）
- [ ] Schema生成: 500ms以内
- [ ] UISpec生成: 700ms以内  
- [ ] TaskRecommendation: 300ms以内

### 動作確認（必須）
- [ ] E2E統合テスト100%成功
- [ ] ステージ遷移（capture→plan→breakdown）正常動作
- [ ] planステージのフル動的UI（カスタムウィジェット・レイアウト・再生成）
- [ ] タスク推奨の確定式スコアリング正確性

---

## 📚 実装時の参照資料

### DSL仕様書（必読）
- `DSL_Overview_v1.0.md` - 全体設計思想
- `DataSchemaDSL_v1.0.md` - データ構造仕様
- `UISpecDSL_v1.0.md` - UI表現仕様
- `TaskRecommendationDSL_v1.0.md` - タスク推奨仕様

### 技術仕様
- `architecture_design.md` - システム全体構造
- 既存コード: `concern-app/src/services/`（API連携参考）
- 既存コード: `server/src/`（バックエンド構造参考）

### 重要な設計原則
- **Jelly論文準拠**: データとUI表現の分離
- **ステージ別動的化**: capture（限定）→plan（フル）→breakdown（固定）
- **フォールバック必須**: LLM生成失敗時の代替手段
- **パフォーマンス重視**: 各工程の応答時間制約
- **2系統独立**: 思考整理とタスク推奨は完全分離

---

**文書バージョン:** 1.0  
**対象:** AIエージェント実装  
**推定工期:** 2-3週間  
**ステータス:** 実装開始可能