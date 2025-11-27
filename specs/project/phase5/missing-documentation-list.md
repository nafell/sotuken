# 不足ドキュメント一覧

**作成日**: 2025-11-28
**更新日**: 2025-11-28
**Phase**: 5 - ドキュメント整理

このドキュメントは、現在不足している仕様書・設計書を整理したものです。

---

## 1. 高優先度（研究・論文に必要）

### 1.1 Full-Flow統合設計書

**状態**: ✅ 完了
**場所**: `specs/project/phase4/full-flow-design.md`

### 1.2 Widget v3個別仕様書

**状態**: ✅ 完了
**場所**: `specs/dsl-design/v3/widgets/widget-v3-specifications.md`

**残タスク**: Playwrightテストファイルの移動（`__tests__/`に集約 → 各コンポーネントディレクトリへ）

### 1.3 LLMプロンプト仕様書（V3版）

**状態**: ✅ 完了
**場所**: `specs/ui-design/prompt/ui_generation_prompt_v3.md`

---

## 2. 中優先度（開発効率向上）

### 2.1 ReactiveBindingEngine詳細仕様

**状態**: ✅ 完了
**場所**: `specs/dsl-design/v3/reactive-engine-spec.md`

### 2.2 WidgetDefinition仕様

**状態**: ✅ 完了
**場所**: `specs/dsl-design/v3/widget-definition-spec.md`

### 2.3 メトリクス設計書

**状態**: ✅ 完了
**場所**: `specs/project/phase4/metrics-design.md`

### 2.4 各種README.md

**状態**: ✅ 完了
- README.md (root) - 更新済み
- server/README.md - 更新済み
- concern-app/README.md - 更新済み
- 調査報告書: `specs/project/phase5/readme-survey-report.md`

---

## 3. 低優先度（将来的に必要）

### 3.1 デプロイメント設計書

**状態**: ✅ 完了
**場所**: `specs/system-design/deployment-design.md`

### 3.2 API V3仕様書

**状態**: ✅ 完了
**場所**: `specs/api-schema/api_specification_v3.md`

### 3.3 テスト戦略更新

**状態**: ✅ 完了
**場所**: `specs/testing/test-strategy-v3.md`

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
