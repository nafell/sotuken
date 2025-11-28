# Discussions

このディレクトリには、プロジェクトの設計や研究方針に関する議論記録を集約しています。

## ファイル一覧

| ファイル | 内容 | 作成時期 |
|---------|------|---------|
| `discussion_dsl_specs_v1.md` | DSL v1仕様の設計議論 | Phase 1-2 |
| `discussion_p4_plan.md` | Planフェーズ設計決定（3段階フロー、UIコンポーネント設計） | Phase 4開始前 |
| `DSLv3_discussion_1.md` | DSLv3研究スコープ・核心的主張 | Phase 4 |
| `DSLv3_discussion_2.md` | DSLv3技術的議論 | Phase 4 |
| `DSLv3_discussion_3.md` | DSLv3詳細設計議論 | Phase 4 |

## 関連ドキュメント・コード対応表

### discussion_dsl_specs_v1.md

| 関連カテゴリ | パス |
|-------------|------|
| **アーカイブ仕様** | `specs/dsl-design/archive/DataSchemaDSL_v1.0.md` |
| **アーカイブ仕様** | `specs/dsl-design/archive/UISpecDSL_v1.0.md` |
| **アーカイブ仕様** | `specs/dsl-design/archive/TaskRecommendationDSL_v1.0.md` |
| **Legacyコード** | `concern-app/src/legacy/screens/DynamicThoughtScreen.tsx` |

### discussion_p4_plan.md

| 関連カテゴリ | パス |
|-------------|------|
| **DSLv3仕様** | `specs/dsl-design/v3/plan-requirements-v3.0.md` |
| **DSLv3設計** | `specs/project/phase4/DSLv3-design/basic_design.md` |
| **現行コード** | `concern-app/src/components/demo/full-flow/PlanPhase.tsx` |
| **現行コード** | `concern-app/src/components/widgets/v3/` |

### DSLv3_discussion_1.md（研究スコープ）

| 関連カテゴリ | パス |
|-------------|------|
| **研究目玉** | `specs/research/Thoughts_Discussions/purpose-of-research_medama.md` |
| **DSLv3設計** | `specs/project/phase4/DSLv3-design/README.md` |
| **Jelly参考** | `specs/research/JellyPaper/` |

### DSLv3_discussion_2.md（技術議論）

| 関連カテゴリ | パス |
|-------------|------|
| **DSLv3仕様** | `specs/dsl-design/v3/DSL-Core-Spec-v3.0.md` |
| **設計書** | `specs/project/phase4/DSLv3-design/detailed_design.md` |
| **現行コード** | `concern-app/src/services/ui/ReactiveBindingEngine.ts` |
| **現行コード** | `concern-app/src/services/ui/DependencyGraph.ts` |

### DSLv3_discussion_3.md（詳細設計）

| 関連カテゴリ | パス |
|-------------|------|
| **Widget仕様** | `specs/dsl-design/v3/ReactiveWidget-design.md` |
| **設計書** | `specs/project/phase4/DSLv3-design/Jelly-DependencyGraph-comparison.md` |
| **現行コード** | `concern-app/src/components/widgets/v3/` |
| **サーバー** | `server/src/services/UISpecGeneratorV3.ts` |

## 別途保管しているDiscussion

| ファイル | 場所 | 理由 |
|---------|------|------|
| `purpose-of-research_medama.md` | `specs/research/Thoughts_Discussions/` | 研究の核心文書として別管理 |

## 議論から生まれた成果物

```
Discussions
    │
    ├─→ discussion_dsl_specs_v1.md
    │       ↓
    │   DSL v1.0仕様書（アーカイブ済み）
    │
    ├─→ discussion_p4_plan.md
    │       ↓
    │   3段階フローモデル → plan-requirements-v3.0.md
    │   UIコンポーネント設計 → widgets/v3/
    │
    └─→ DSLv3_discussion_*.md
            ↓
        DSLv3仕様書（specs/dsl-design/v3/）
        DSLv3設計書（specs/project/phase4/DSLv3-design/）
        ReactiveBindingEngine実装
        Widget v3実装
```
