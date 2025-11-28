# ドキュメント整理完了報告

**実施日**: 2025-11-28
**Phase**: 5

---

## 1. 実施内容サマリー

| 項目 | 状態 |
|------|------|
| 現状調査・記録 | 完了 |
| DSL旧バージョンのアーカイブ | 完了 |
| 古いコードのlegacy化 | 完了 |
| Discussionファイルの集約 | 完了 |
| 関連表の作成 | 完了 |
| 不足ドキュメントリストの作成 | 完了 |

---

## 2. 変更内容詳細

### 2.1 DSLドキュメントの整理

**移動したファイル**: `specs/dsl-design/` → `specs/dsl-design/archive/`
- `dsl_specification_v0.5.md`
- `DSL_Overview_v1.0.md`
- `DataSchemaDSL_v1.0.md`
- `UISpecDSL_v1.0.md`
- `TaskRecommendationDSL_v1.0.md`

**作成したファイル**:
- `specs/dsl-design/archive/README.md`

### 2.2 コードのlegacy化

**作成したディレクトリ**: `concern-app/src/legacy/`

**移動したファイル**:
```
concern-app/src/navigators/
  → concern-app/src/legacy/navigators/
    ├── DynamicUINavigator.tsx
    └── StaticUINavigator.tsx

concern-app/src/components/screens/DynamicThoughtScreen*.tsx
  → concern-app/src/legacy/screens/
    ├── DynamicThoughtScreen.tsx
    └── DynamicThoughtScreenV2.tsx

concern-app/src/services/ui-generation/UIRenderer*.tsx
  → concern-app/src/legacy/ui-generation/
    ├── UIRenderer.tsx
    └── UIRendererV2.tsx
```

**変更したファイル**:
- `concern-app/src/App.tsx` - ルーティング構造変更
  - `/` → Full-Flow Demo（現行メイン）
  - `/legacy/*` → 旧実験条件別ルーティング
- `concern-app/src/legacy/navigators/*.tsx` - importパス修正、LEGACYコメント追加

**作成したファイル**:
- `concern-app/src/legacy/README.md`

### 2.3 Discussionファイルの集約

**移動したファイル**: → `specs/discussions/`
- `specs/dsl-design/discussion_dsl_specs_v1.md`
- `specs/project/discussion_p4_plan.md`
- `specs/research/Thoughts_Discussions/DSLv3-Discussion/DSLv3_discussion_1.md`
- `specs/research/Thoughts_Discussions/DSLv3-Discussion/DSLv3_discussion_2.md`
- `specs/research/Thoughts_Discussions/DSLv3-Discussion/DSLv3_discussion_3.md`

**そのまま保持**:
- `specs/research/Thoughts_Discussions/purpose-of-research_medama.md`

**作成したファイル**:
- `specs/discussions/README.md`（関連表含む）

---

## 3. 新しいディレクトリ構造

```
specs/
├── api-schema/
├── development/
├── discussions/              # NEW: Discussion集約
│   ├── README.md             # 関連表含む
│   ├── discussion_dsl_specs_v1.md
│   ├── discussion_p4_plan.md
│   └── DSLv3_discussion_*.md
├── dsl-design/
│   ├── archive/              # NEW: 旧DSLアーカイブ
│   │   ├── README.md
│   │   └── (v0.5, v1.0ファイル)
│   └── v3/                   # 現行DSLv3仕様
├── project/
│   ├── phase0-4/
│   └── phase5/
│       ├── ci-cd-design.md
│       ├── ci-cd-implementation-report.md
│       ├── documentation-audit-report.md
│       ├── documentation-reorganization-report.md  # 本ファイル
│       └── missing-documentation-list.md
├── research/
├── system-design/
├── testing/
└── ui-design/

concern-app/src/
├── legacy/                   # NEW: 旧コード
│   ├── README.md
│   ├── navigators/
│   ├── screens/
│   └── ui-generation/
├── pages/
│   └── dev-demo/
│       └── FullFlowDemoPage.tsx  # 現行メイン
├── components/
│   ├── demo/full-flow/       # 現行Full-Flowコンポーネント
│   ├── screens/              # 現行スクリーン（非legacy）
│   └── widgets/v3/           # 現行Widget
└── services/
    ├── ui/                   # ReactiveBindingEngine
    └── ui-generation/
        └── UIRendererV3.tsx  # 現行レンダラー
```

---

## 4. ルーティング構造（変更後）

| パス | コンポーネント | 用途 |
|------|--------------|------|
| `/` | FullFlowDemoPage | 現行メイン（Full-Flow PoC） |
| `/dev-demo/*` | 各種デモページ | 開発用 |
| `/legacy/*` | DynamicUI/StaticUINavigator | 旧実験用（動作可能） |
| `/admin/*` | 管理画面 | 管理者用 |

---

## 5. 作成したドキュメント一覧

| ファイル | 内容 |
|---------|------|
| `specs/project/phase5/documentation-audit-report.md` | 整理前の現状記録 |
| `specs/project/phase5/documentation-reorganization-report.md` | 整理完了報告（本ファイル） |
| `specs/project/phase5/missing-documentation-list.md` | 不足ドキュメント一覧 |
| `specs/dsl-design/archive/README.md` | アーカイブ説明 |
| `specs/discussions/README.md` | Discussion関連表 |
| `concern-app/src/legacy/README.md` | Legacyコード説明 |

---

## 6. 次のステップ（推奨）

1. **ビルド確認**: `cd concern-app && bun run build` でビルドエラーがないことを確認
2. **動作確認**: `/` と `/legacy/` の両方が動作することを確認
3. **不足ドキュメント作成**: `missing-documentation-list.md` の優先順位に従って作成
4. **テスト整頓**: 各所に点在しているテストを整理する．legacyのコードを対象としているものはlegacyであることを明記．１箇所にまとめる必要はなく，リポジトリ全体のテストのディレクトリを作成する．テストのないWidget v3にテストを追加

---

## 7. 備考

- 旧コードは `/legacy/*` で引き続きアクセス可能
- 実験データの再現性は維持
- 新規開発は現行版（Full-Flow）に対して行う
