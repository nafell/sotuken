# DSL v5 要件定義書

**Version**: 5.0
**Date**: 2025-12-08
**Status**: Draft
**Based on**: [DSL v4 要件定義書](../v4/requirements.md), [W2WRテストケース設計](../../discussions/DSLv3_expert_cases.md)

---

## 目次

1. [概要](#1-概要)
2. [機能要件](#2-機能要件)
3. [非機能要件](#3-非機能要件)
4. [実装優先度](#4-実装優先度)
5. [W2WRテストケース対応](#5-w2wrテストケース対応)

---

## 1. 概要

### 1.1 目的

DSL v5は、Widget-to-Widget Reactivity（W2WR）を同一ページ内でリアルタイムに動作させるため、planフェーズを1ページ化する仕様拡張である。

### 1.2 背景

v4では、planフェーズが4ステージ（diverge/organize/converge/summary）に分かれており、各ステージが別ページとして表示されていた。この構造では：

- W2WRがステージをまたいで動作できない（ページ遷移時にデータ引き継ぎのみ）
- LLMが生成するW2WRの正確性を評価しにくい
- ユーザーが思考プロセス全体を俯瞰できない

v5では、diverge/organize/convergeを1ページに統合し、W2WRがリアルタイムで動作する環境を実現する。

### 1.3 v4からの主要変更点

| 観点 | v4 | v5 |
|------|-----|-----|
| Planフェーズ構造 | 4ステージ別ページ | 3セクション統合1ページ + summaryページ |
| StageType | `diverge \| organize \| converge \| summary` | `plan \| summary` を追加 |
| UISpec構造 | `widgets: WidgetSpec[]` | `sections: SectionSpec[]`（plan時） |
| W2WR動作範囲 | 同一ステージ内のみ | planページ全体（セクション横断） |
| LLM呼び出し | ステージごとに2回（ORS+UISpec） | plan全体で2回（ORS+UISpec） |

---

## 2. 機能要件

### 2.1 Plan統合UISpec

#### REQ-V5-001: PlanUISpec型の追加

**概要**: planフェーズ用の統合UISpec構造を定義する。

**詳細**:
```typescript
interface PlanUISpec {
  version: string;
  sessionId: string;
  stage: 'plan';                           // 固定値
  sections: {
    diverge: SectionSpec;
    organize: SectionSpec;
    converge: SectionSpec;
  };
  reactiveBindings: ReactiveBindingSpec;   // セクション横断W2WR
  layout: {
    type: 'sectioned';
    sectionGap: number;
  };
  metadata: UISpecMetadata;
}

interface SectionSpec {
  widgets: WidgetSpec[];
  header: {
    title: string;
    description: string;
  };
}
```

**受入基準**:
- [ ] PlanUISpec型が定義される
- [ ] `stage: 'plan'`のUISpecが生成可能
- [ ] 3セクション（diverge/organize/converge）が含まれる

---

#### REQ-V5-002: セクション横断ReactiveBinding

**概要**: diverge/organize/converge間でW2WRが動作する。

**詳細**:
```typescript
// ReactiveBindingの例（diverge → organize）
{
  id: "rb_001",
  source: "brainstorm_cards_0.cards",      // divergeセクション
  target: "card_sorting_0.cards",           // organizeセクション
  mechanism: "update",
  relationship: {
    type: "passthrough"
  },
  updateMode: "realtime"
}

// ReactiveBindingの例（organize → converge）
{
  id: "rb_002",
  source: "card_sorting_0.categories",      // organizeセクション
  target: "priority_slider_grid_0.items",   // convergeセクション
  mechanism: "update",
  relationship: {
    type: "javascript",
    javascript: "Object.values(source).flat()"
  },
  updateMode: "debounced",
  debounceMs: 300
}
```

**受入基準**:
- [ ] diverge → organize間のW2WRが動作する
- [ ] organize → converge間のW2WRが動作する
- [ ] diverge → converge間のW2WRが動作する（必要な場合）
- [ ] updateMode（realtime/debounced）が正しく適用される

---

### 2.2 LLM呼び出し構成

#### REQ-V5-003: Plan統合ORS生成

**概要**: planフェーズ全体のORSを1回のLLM呼び出しで生成する。

**詳細**:
```typescript
interface PlanORSGeneratorInput {
  concernText: string;
  widgetSelectionResult: WidgetSelectionResult;  // 4ステージ分
  sessionId: string;
}

// 出力ORSに含まれるEntity例
{
  entities: [
    { id: "diverge_data", type: "stage_data", attributes: [...] },
    { id: "organize_data", type: "stage_data", attributes: [...] },
    { id: "converge_data", type: "stage_data", attributes: [...] },
    { id: "brainstorm_widget_data", type: "widget_data", attributes: [...] },
    { id: "card_sorting_widget_data", type: "widget_data", attributes: [...] },
    // ...
  ],
  dependencyGraph: {
    dependencies: [
      // セクション間のデータ依存関係
    ]
  }
}
```

**受入基準**:
- [ ] 3セクション分のEntityが1つのORSに含まれる
- [ ] DependencyGraphがセクション間の依存を表現する
- [ ] 1回のLLM呼び出しで完了する

---

#### REQ-V5-004: Plan統合UISpec生成

**概要**: planフェーズ全体のUISpecを1回のLLM呼び出しで生成する。

**詳細**:
```typescript
interface PlanUISpecGeneratorInput {
  ors: ORS;                                // Plan統合ORS
  widgetSelectionResult: WidgetSelectionResult;
  sessionId: string;
  enableReactivity: boolean;
}
```

**受入基準**:
- [ ] 3セクション分のWidgetSpecが生成される
- [ ] セクション横断ReactiveBindingが生成される
- [ ] 1回のLLM呼び出しで完了する

---

### 2.3 アプリケーションフロー

#### REQ-V5-005: Planフェーズ1ページ表示

**概要**: diverge/organize/convergeを1ページに縦に配置する。

**詳細**:
```
┌─────────────────────────────────────────┐
│ ■ 発散 (Diverge)                        │
│   アイデアを広げる                      │
│ ┌─────────────────────────────────────┐ │
│ │ brainstorm_cards                    │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ■ 整理 (Organize)                       │
│   構造化する                            │
│ ┌─────────────────────────────────────┐ │
│ │ card_sorting                        │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ■ 収束 (Converge)                       │
│   優先順位をつける                      │
│ ┌─────────────────────────────────────┐ │
│ │ priority_slider_grid                │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│                    [次へ（まとめ）]     │
└─────────────────────────────────────────┘
```

**受入基準**:
- [ ] 3セクションが縦に配置される
- [ ] 各セクションにヘッダー（タイトル+説明）が表示される
- [ ] 「次へ」ボタンでsummaryページへ遷移する

---

#### REQ-V5-006: Summaryフェーズ維持

**概要**: summaryは従来通り別ページとして表示する。

**詳細**:
- planフェーズ完了後にsummaryページへ遷移
- structured_summary Widgetを表示
- planフェーズの結果をまとめとして表示

**受入基準**:
- [ ] summaryが別ページとして表示される
- [ ] planフェーズの結果が引き継がれる

---

### 2.4 UIレンダリング

#### REQ-V5-007: UIRendererV4のセクション対応

**概要**: UIRendererV4がPlanUISpec（sections構造）をレンダリングできる。

**詳細**:
```typescript
interface UIRendererV4Props {
  uiSpec: UISpec | PlanUISpec;
  ors: ORS;
  renderMode?: 'single' | 'sectioned';  // 新規追加
  onWidgetUpdate: (widgetId: string, data: unknown) => void;
  // ...
}
```

**受入基準**:
- [ ] `renderMode: 'sectioned'`でセクション表示が可能
- [ ] セクションヘッダーが表示される
- [ ] セクション間のW2WRが動作する

---

### 2.5 実験管理画面

#### REQ-V5-008: SessionDetail/ReplayViewの新形式対応

**概要**: セッション詳細・リプレイ画面がPlanUISpecを表示できる。

**詳細**:
- stage='plan'のgenerationを認識
- 3セクション分のUISpecを展開表示
- W2WR解析セクションでセクション横断の依存関係を表示

**受入基準**:
- [ ] SessionDetailで新形式データが表示される
- [ ] ReplayViewで新形式データが再生される
- [ ] W2WR解析がセクション横断依存を表示する

---

#### REQ-V5-009: ステージskip UI非表示

**概要**: PlanPreviewのステージskipチェックボックスを非表示にする。

**詳細**:
- 1ページ統合により個別ステージskipは不可
- API側のskip仕様は残す（後方互換性）
- UIのみ非表示

**受入基準**:
- [ ] skipチェックボックスが非表示になる
- [ ] API側のskip処理は維持される

---

## 3. 非機能要件

### 3.1 パフォーマンス

#### REQ-V5-NFR-001: LLM呼び出しレイテンシ

- Plan統合ORS生成: 目標15秒以内
- Plan統合UISpec生成: 目標15秒以内
- 合計: 目標30秒以内（v4と同等）

### 3.2 互換性

#### REQ-V5-NFR-002: 新形式のみ対応

- 旧形式（ステージ別）のセッションデータは閲覧不可
- 新規セッションはすべて新形式で保存
- API側はv4エンドポイントを維持（summaryステージ用）

---

## 4. 実装優先度

### 4.1 Must（必須）

| ID | 要件 | 理由 |
|----|------|------|
| REQ-V5-001 | PlanUISpec型 | 新構造の基盤 |
| REQ-V5-002 | セクション横断ReactiveBinding | W2WR検証の核心 |
| REQ-V5-003 | Plan統合ORS生成 | LLM呼び出し統合 |
| REQ-V5-004 | Plan統合UISpec生成 | LLM呼び出し統合 |
| REQ-V5-005 | Planフェーズ1ページ表示 | UI変更の核心 |

### 4.2 Should（推奨）

| ID | 要件 | 理由 |
|----|------|------|
| REQ-V5-006 | Summaryフェーズ維持 | 既存機能維持 |
| REQ-V5-007 | UIRendererV4セクション対応 | レンダリング対応 |
| REQ-V5-008 | SessionDetail/ReplayView対応 | データ閲覧 |
| REQ-V5-009 | ステージskip UI非表示 | UI整合性 |

---

## 5. W2WRテストケース対応

### 5.1 対象テストケース

[W2WRテストケース設計](../../discussions/DSLv3_expert_cases.md)の6ケースに対応:

| Case | 検証目的 | W2WRパターン |
|------|---------|-------------|
| 1 | ベースライン（W2WRなし） | なし |
| 2 | Passthrough W2WR | passthrough + realtime |
| 3 | JavaScript Transform | javascript + realtime |
| 4 | 中複雑度Widget間 | javascript + debounced |
| 5 | Converge WidgetへのW2WR | javascript + realtime（organize→converge） |
| 6 | Timeline連携 | javascript + realtime |

### 5.2 W2WRパターン網羅性

v5では以下のパターンがすべて同一ページ内で動作する:

- **Relationship Type**:
  - `passthrough`: データをそのまま渡す（Case 2）
  - `javascript`: JavaScriptでデータ変換（Case 3-6）

- **UpdateMode**:
  - `realtime`: 即時更新（Case 2, 3, 5, 6）
  - `debounced`: 遅延更新（Case 4）

- **セクション間連携**:
  - diverge → organize（Case 2, 4, 6）
  - organize → converge（Case 5）
  - diverge → converge（必要に応じて）

### 5.3 評価基準

W2WRテストケースの評価基準:

1. **Widget選択の正確性**: 期待されるWidgetが選択されるか
2. **W2WR生成の正確性**: 期待されるReactiveBindingが生成されるか
3. **データ変換の妥当性**: javascriptコードがデータ型を正しく変換するか
4. **リアルタイム動作**: W2WRが同一ページ内でリアルタイムに動作するか

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| 5.0 | 2025-12-08 | 初版作成 |
