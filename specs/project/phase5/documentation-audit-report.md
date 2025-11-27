# ドキュメント・コード整理調査報告書

**作成日**: 2025-11-28
**Phase**: 5 - ドキュメント整理

---

## 1. 調査概要

### 目的
- プロジェクト全体のドキュメント・コード構造を把握
- 最新版（DSLv3、Full-Flow PoC）と旧版の関係を明確化
- 整理・再構成の方針を決定

### 調査結果サマリー
- 発見されたMarkdownファイル: **96件**
- Discussionファイル: **6件**
- DSLバージョン: v0.5, v1.0（旧）、**v3.0（現行）**
- コードバージョン: Legacy（root route）、**Full-Flow PoC（現行）**

---

## 2. ドキュメント構造

### 2.1 DSL関連ドキュメント

#### 現行版（DSLv3）

**仕様書（LLM向け）**: `specs/dsl-design/v3/`
```
v3/
├── README.md                      # 仕様書体系の説明
├── DSL-Core-Spec-v3.0.md          # Layer 1: 基盤言語仕様
├── capture-requirements-v3.0.md   # Layer 2: Capture要求仕様
├── plan-requirements-v3.0.md      # Layer 2: Plan要求仕様
├── breakdown-requirements-v3.0.md # Layer 2: Breakdown要求仕様
├── ReactiveWidget-design.md       # ReactiveWidget設計
├── ReactiveWidget-Discussion.md   # ReactiveWidget議論
└── examples/                      # Layer 3: 実装例
```

**設計書（実装向け）**: `specs/project/phase4/DSLv3-design/`
```
DSLv3-design/
├── README.md                          # 設計書概要
├── basic_design.md                    # 基本設計（概念/外部設計）
├── detailed_design.md                 # 詳細設計（内部設計）
├── DSLv3-integration-mapping.md       # 統合マッピング
└── Jelly-DependencyGraph-comparison.md # Jellyとの比較
```

#### 旧版（アーカイブ対象）

`specs/dsl-design/` 直下:
- `dsl_specification_v0.5.md` - 初期仕様
- `DSL_Overview_v1.0.md` - v1.0概要
- `DataSchemaDSL_v1.0.md` - DataSchema仕様v1.0
- `UISpecDSL_v1.0.md` - UISpec仕様v1.0
- `TaskRecommendationDSL_v1.0.md` - TaskRecommendation仕様v1.0
- `discussion_dsl_specs_v1.md` - v1仕様議論

### 2.2 Phaseドキュメント

```
specs/project/
├── mvp_requirements.md
├── discussion_p4_plan.md
├── vps-setup-log.md
├── phase0/                # 4件
├── phase1/                # 5件
├── phase2/                # 13件
├── phase3/                # 11件
├── phase4/                # 12件 + DSLv3-design/
└── phase5/                # 2件（CI/CD関連）
```

### 2.3 Discussionファイル（分散状態）

| ファイル | 現在位置 | 内容 |
|---------|---------|------|
| `discussion_p4_plan.md` | `specs/project/` | Planフェーズ設計決定 |
| `discussion_dsl_specs_v1.md` | `specs/dsl-design/` | DSL v1仕様議論 |
| `DSLv3_discussion_1.md` | `specs/research/Thoughts_Discussions/DSLv3-Discussion/` | DSLv3研究スコープ |
| `DSLv3_discussion_2.md` | 同上 | DSLv3技術議論 |
| `DSLv3_discussion_3.md` | 同上 | DSLv3詳細議論 |
| `purpose-of-research_medama.md` | `specs/research/Thoughts_Discussions/` | 研究の目玉・位置付け |

### 2.4 その他のドキュメント

```
specs/
├── api-schema/          # API仕様
├── development/         # 開発者ガイド
├── research/            # 研究関連（Jelly論文解説含む）
├── system-design/       # システム設計
├── testing/             # テスト仕様
└── ui-design/           # UI設計
```

---

## 3. コード構造

### 3.1 現行版（Full-Flow PoC）

**メインページ**: `/dev-demo/full-flow`
- `concern-app/src/pages/dev-demo/FullFlowDemoPage.tsx`

**Full-Flowコンポーネント**: `concern-app/src/components/demo/full-flow/`
```
full-flow/
├── index.ts
├── types.ts
├── FullFlowContainer.tsx    # メインコンテナ
├── CapturePhase.tsx         # Captureフェーズ
├── PlanPhase.tsx            # Planフェーズ（4ステージ）
├── BreakdownPhase.tsx       # Breakdownフェーズ
└── MetricsDashboard.tsx     # メトリクス表示
```

**Reactive Widgets（v3）**: `concern-app/src/components/widgets/v3/`
```
v3/
├── BrainstormCards/      # テストあり
├── CardSorting/          # テストなし
├── DependencyMapping/    # テストなし
├── EmotionPalette/       # テストあり
├── MatrixPlacement/      # テストあり
├── MindMap/              # テストなし
├── PrioritySliderGrid/   # テストあり
├── QuestionCardChain/    # テストなし
├── StructuredSummary/    # テストなし
├── SwotAnalysis/         # テストなし
├── TimelineSlider/       # テストなし
├── TradeoffBalance/      # テストなし
└── __tests__/            # 統合テスト
```

**Reactive Binding Engine**: `concern-app/src/services/ui/`
```
ui/
├── ReactiveBindingEngine.ts  # リアクティブバインディング
├── DependencyGraph.ts        # 依存関係グラフ
├── DependencyExecutor.ts     # 依存関係実行
└── __tests__/                # テスト（4件）
```

**UIレンダラー（V3が現行）**: `concern-app/src/services/ui-generation/`
```
ui-generation/
├── UIRenderer.tsx       # V1（旧）
├── UIRendererV2.tsx     # V2（旧）
├── UIRendererV3.tsx     # V3（現行）
├── ComponentMapper.ts
└── ExpressionEngine.ts
```

### 3.2 旧版（Legacy - root route）

**ナビゲーター**: `concern-app/src/navigators/`
- `DynamicUINavigator.tsx` - 動的UI版（実験条件: dynamic_ui）
- `StaticUINavigator.tsx` - 固定UI版（実験条件: static_ui）

**旧スクリーン**: `concern-app/src/components/screens/`
- `DynamicThoughtScreen.tsx` - 動的思考整理（V1）
- `DynamicThoughtScreenV2.tsx` - 動的思考整理（V2）
- 他10件

**旧Widgets**: `concern-app/src/components/ui/widgets/`
```
widgets/
├── (v1 widgets)     # 旧版
├── custom/          # カスタムウィジェット
└── v2/              # V2ウィジェット
```

### 3.3 サーバーサイド

**現行**: `server/src/services/`
- `UISpecGeneratorV3.ts` - V3仕様生成
- `GeminiService.ts` - Gemini API連携

**旧版**:
- `UISpecGenerator.ts` - V1
- `UISpecGeneratorV2.ts` - V2

---

## 4. 問題点・整理対象

### 4.1 ドキュメント

1. **DSL旧バージョンが混在**: v0.5, v1.0がdsl-design/直下に存在
2. **Discussionファイルが分散**: 3箇所に点在
3. **関連性が不明確**: Discussion → ドキュメント → コードの対応が不明

### 4.2 コード

1. **命名の不統一**: V1/V2/V3が混在、legacyの明示なし
2. **ルート構造**: root routeが旧版を使用（実験用に必要だが混乱の元）
3. **テスト不足**: Widgets v3の半数以上にテストなし

### 4.3 仕様書の不足

- Full-Flowコンポーネント群の設計仕様書
- widgets/v3の個別Widget仕様
- Server側V3 Generatorの仕様

---

## 5. 整理方針（決定事項）

### 5.1 DSL旧バージョン
→ `specs/dsl-design/archive/` に移動

### 5.2 旧コード
→ ファイル名・ディレクトリ名に`legacy`を含める
→ route構造を`/legacy/*`に変更
→ 動作可能な状態を維持

### 5.3 Discussionファイル
→ `specs/discussions/` に集約
→ 関連ドキュメント/コードとの対応表を作成

---

## 6. 次のステップ

1. [x] 現状記録ドキュメント作成（本ファイル）
2. [ ] 古いDSLをarchiveディレクトリに移動
3. [ ] 古いコードのlegacy化（命名・route変更）
4. [ ] Discussionファイルの集約
5. [ ] Discussion関連表の作成
6. [ ] 不足ドキュメントリストの作成
