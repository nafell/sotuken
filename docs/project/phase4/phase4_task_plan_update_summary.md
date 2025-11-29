# Phase4タスク計画書 更新サマリー

**更新日**: 2025-01-17
**対象ファイル**: `phase4_detailed_tasks_rev2.md`
**目的**: DSLv3仕様書統合に伴う12-Widget仕様への準拠

---

## 📝 更新内容一覧

### 1. 成果物セクションの更新（行18-24）

**変更前**:
```markdown
- [ ] 最低8個のWidget実装
```

**変更後**:
```markdown
- [ ] **12個のプリセットWidget実装**（DSLv3 Plan Requirements v3.0から選定）
```

---

### 2. タスク1.1 型定義の拡張（行40-75）

**追加内容**:
- `UISpec`階層構造の明確化
- `OODM`: DSLv3 Core Spec v3.0のEntity/Attribute構造を統合
- `DependencyGraphSpec`: Widget間依存関係定義
- `WidgetComponentType`: 12種のプリセットWidget ID

**新規型定義**:
```typescript
- Entity: データエンティティ（DSLv3から統合）
- Attribute: エンティティの属性
- SVAL, ARRY, DICT, PNTR: プリミティブ型
- Constraint: 制約定義
```

---

### 3. タスク2.1 Widget実装の詳細化（行395-416）

**変更前**:
```markdown
### 🎯 タスク2.1: 基本Widget実装（4種）
1. EmotionPalette
2. BrainstormCards
3. MatrixPlacement
4. PrioritySliderGrid
```

**変更後**:
```markdown
### 🎯 タスク2.1: プリセットWidget実装（12種）

#### フェーズ1: PoC用基本4種（優先実装）
1. `emotion_palette` - 感情カラーパレット（diverge）
2. `brainstorm_cards` - ブレインストームカード（diverge）
3. `matrix_placement` - マトリックス配置（converge）
4. `priority_slider_grid` - 優先度スライダーグリッド（converge）

#### フェーズ2: 追加8種
5. `question_card_chain` - 質問カード連鎖（diverge）
6. `card_sorting` - カード仕分けUI（organize）
7. `dependency_mapping` - 依存関係マッピング（organize）
8. `swot_analysis` - SWOT分析UI（organize）
9. `mind_map` - マインドマップ生成（organize）
10. `tradeoff_balance` - トレードオフ天秤（converge）
11. `timeline_slider` - 時間軸スライダー（converge）
12. `structured_summary` - 構造化文章まとめ（summary）
```

**変更のポイント**:
- ✅ Widget数を4種 → 12種に拡張
- ✅ 2フェーズに分けて段階的実装
- ✅ 各Widgetに対応するDSLv3 UCを明記（統合対応表と一致）
- ✅ Widget IDをsnake_case形式で統一
- ✅ ステージ名を`organize`に統一（`evaluate`ではない）

---

### 4. 全体受け入れ基準の更新（行925-932）

**変更前**:
```markdown
- [ ] 最低8個のWidget実装済み
```

**変更後**:
```markdown
- [ ] **12個のプリセットWidget実装済み**（DSLv3 Plan Requirements v3.0から選定）
```

---

## ✅ 検証済み事項

### Widget ID整合性チェック
タスク計画書内の全Widget参照が12選定Widget一覧と一致することを確認:

| タスク | Widget ID | 12選定Widgetに含まれるか |
|-------|-----------|----------------------|
| 2.1 フェーズ1 | `emotion_palette` | ✅ (UC05) |
| 2.1 フェーズ1 | `brainstorm_cards` | ✅ (UC01) |
| 2.1 フェーズ1 | `matrix_placement` | ✅ (UC12) |
| 2.1 フェーズ1 | `priority_slider_grid` | ✅ (UC14) |
| 2.1 フェーズ2 | `question_card_chain` | ✅ (UC03) |
| 2.1 フェーズ2 | `card_sorting` | ✅ (UC09) |
| 2.1 フェーズ2 | `dependency_mapping` | ✅ (UC10) |
| 2.1 フェーズ2 | `swot_analysis` | ✅ (UC11) |
| 2.1 フェーズ2 | `mind_map` | ✅ (UC04) |
| 2.1 フェーズ2 | `tradeoff_balance` | ✅ (UC13) |
| 2.1 フェーズ2 | `timeline_slider` | ✅ (UC06) |
| 2.1 フェーズ2 | `structured_summary` | ✅ (UC18) |
| 2.2 Reactive | `tradeoff_balance` | ✅ (UC13) |
| 2.2 Reactive | `dependency_mapping` | ✅ (UC10) |
| 2.2 Reactive | `swot_analysis` | ✅ (UC11) |
| 3.1 テストケース | `brainstorm_cards` | ✅ (UC01) |
| 3.1 テストケース | `card_sorting` | ✅ (UC09) |
| 3.1 テストケース | `matrix_placement` | ✅ (UC12) |
| 3.1 テストケース | `emotion_palette` | ✅ (UC05) |
| 3.1 テストケース | `timeline_slider` | ✅ (UC06) |

**結果**: 全20箇所のWidget参照が12選定Widget一覧と完全一致 ✅

---

## 📊 変更影響範囲

### 修正された主要セクション
1. ✅ プロジェクト概要 → 成果物（12個明記）
2. ✅ タスク1.1 → OODM/Entity/Attribute型追加
3. ✅ タスク2.1 → 12 Widget実装計画
4. ✅ 全体受け入れ基準 → 12個実装要求

### 未変更セクション（既に正しい）
- ✅ タスク1.2: Dependency Graph実装（変更不要）
- ✅ タスク1.3: State管理システム（変更不要）
- ✅ タスク2.2: Reactive Widget実装（既に正しいWidget ID使用）
- ✅ タスク3.1: 専門家評価（Widget IDが正しい）
- ✅ タスク3.2: ユーザー評価（変更不要）
- ✅ タスク4.1: データ分析（変更不要）

---

## 🔗 関連ドキュメント

この更新により、以下のドキュメント群が完全に整合:

1. ✅ [DSLv3統合対応表](DSLv3-design/DSLv3-integration-mapping.md)
   - 12 Widget選定一覧と完全一致

2. ✅ [DSLv3基本設計書](DSLv3-design/basic_design.md)
   - Widget Registry（12種）と一致

3. ✅ [DSLv3詳細設計書](DSLv3-design/detailed_design.md)
   - `WidgetComponentType`定義と一致

4. ✅ [タスク計画書](phase4_detailed_tasks_rev2.md)
   - 本ドキュメント

---

## 📌 今後のアクション

### Phase4設計書群の整合性確保
- [x] 基本設計書の更新（Widget 12種明記）
- [x] 詳細設計書の更新（型定義拡張）
- [x] 統合対応表の作成（DSLv3とPhase4の対応）
- [x] タスク計画書の更新（本ドキュメント）

### 実装時の注意事項
1. **Widget Registry実装時**: 12種全てを事前登録
2. **型定義実装時**: `ui-spec.types.ts`にOODM/Entity/Attributeを含める
3. **テスト実装時**: 12種全てに対する単体テストを作成
4. **LLM統合時**: プリセット12種のリストをプロンプトに含める

---

**作成者**: TK
**最終更新**: 2025-01-17
