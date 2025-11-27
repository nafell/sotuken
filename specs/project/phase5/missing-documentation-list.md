# 不足ドキュメント一覧

**作成日**: 2025-11-28
**Phase**: 5 - ドキュメント整理

このドキュメントは、現在不足している仕様書・設計書を整理したものです。

---

## 1. 高優先度（研究・論文に必要）

### 1.1 Full-Flow統合設計書

**状態**: 未作成
**場所**: `specs/project/phase4/full-flow-design.md`（提案）

**必要な内容**:
- Full-Flow全体アーキテクチャ
- 3フェーズ（Capture → Plan → Breakdown）の連携
- FullFlowContainer, CapturePhase, PlanPhase, BreakdownPhaseの設計
- メトリクス収集設計

**関連コード**:
- `concern-app/src/pages/dev-demo/FullFlowDemoPage.tsx`
- `concern-app/src/components/demo/full-flow/`

### 1.2 Widget v3個別仕様書

**状態**: 部分的に存在（ReactiveWidget-design.mdに概要のみ）
**場所**: `specs/dsl-design/v3/widgets/`（提案）

**不足しているWidget仕様**:

| Widget | 仕様書 | テスト | 優先度 |
|--------|--------|--------|--------|
| BrainstormCards | - | あり | 中 |
| CardSorting | - | なし | 高 |
| DependencyMapping | - | なし | 高 |
| EmotionPalette | - | あり | 中 |
| MatrixPlacement | - | あり | 中 |
| MindMap | - | なし | 高 |
| PrioritySliderGrid | - | あり | 中 |
| QuestionCardChain | - | なし | 高 |
| StructuredSummary | - | なし | 高 |
| SwotAnalysis | - | なし | 中 |
| TimelineSlider | - | なし | 中 |
| TradeoffBalance | - | なし | 中 |

### 1.3 LLMプロンプト仕様書（V3版）

**状態**: 未作成
**場所**: `specs/ui-design/prompt/ui_generation_prompt_v3.md`（提案）

**必要な内容**:
- DSLv3用プロンプトテンプレート
- Widget選定ロジック
- DpG生成ガイドライン
- 出力フォーマット仕様

**関連コード**:
- `server/src/services/UISpecGeneratorV3.ts`
- `server/src/services/GeminiService.ts`

---

## 2. 中優先度（開発効率向上）

### 2.1 ReactiveBindingEngine詳細仕様

**状態**: 設計書あり、詳細仕様不足
**場所**: `specs/dsl-design/v3/reactive-engine-spec.md`（提案）

**必要な内容**:
- バインディングAPI仕様
- 依存関係解決アルゴリズム
- デバウンス/スロットル設定
- エラーハンドリング

**関連コード**:
- `concern-app/src/services/ui/ReactiveBindingEngine.ts`
- `concern-app/src/services/ui/DependencyGraph.ts`
- `concern-app/src/services/ui/DependencyExecutor.ts`

### 2.2 WidgetDefinition仕様

**状態**: 型定義のみ存在
**場所**: `specs/dsl-design/v3/widget-definition-spec.md`（提案）

**必要な内容**:
- WidgetDefinitionの構造
- プリセットWidget登録方法
- LLM向けWidget説明フォーマット

**関連コード**:
- `server/src/definitions/widgets.ts`
- `server/src/types/WidgetDefinition.ts`

### 2.3 メトリクス設計書

**状態**: 未作成
**場所**: `specs/project/phase4/metrics-design.md`（提案）

**必要な内容**:
- 収集するメトリクス一覧
- ステージ別計測項目
- データ形式
- エクスポート仕様

**関連コード**:
- `concern-app/src/services/FullFlowMetricsService.ts`
- `concern-app/src/components/demo/full-flow/MetricsDashboard.tsx`
- `server/src/utils/metricsLogger.ts`

---

## 3. 低優先度（将来的に必要）

### 3.1 デプロイメント設計書

**状態**: VPSセットアップログのみ
**場所**: `specs/system-design/deployment-design.md`（提案）

**必要な内容**:
- 本番環境構成
- CI/CDパイプライン詳細
- スケーリング設計

**関連**: `specs/project/phase5/ci-cd-design.md`は作成済み

### 3.2 API V3仕様書

**状態**: V1仕様のみ存在
**場所**: `specs/api-schema/api_specification_v3.md`（提案）

**必要な内容**:
- 新規エンドポイント（/api/ui/v3/*）
- リクエスト/レスポンススキーマ
- エラーコード

**関連コード**:
- `server/src/routes/ui.ts`

### 3.3 テスト戦略更新

**状態**: Phase 2のテスト仕様のみ
**場所**: `specs/testing/test-strategy-v3.md`（提案）

**必要な内容**:
- Widget v3テスト方針
- 統合テストシナリオ
- E2Eテスト計画

---

## 4. 作成優先順位（推奨）

1. **Full-Flow統合設計書** - 研究の核心部分
2. **LLMプロンプト仕様書（V3版）** - 再現性確保
3. **Widget v3個別仕様書**（テストなしの6件優先）
4. **ReactiveBindingEngine詳細仕様**
5. **メトリクス設計書**
6. その他

---

## 5. 備考

- 既存の設計書（`specs/project/phase4/DSLv3-design/`）は充実している
- 不足しているのは主に「実装詳細」と「運用関連」
- 論文執筆時に必要な仕様書を優先すべき
