# Playwright MCP テスト定義書

## Overview

12種Widget個別のPlaywright MCPテストシナリオ定義。
Widget Showcase環境（`/dev-demo/widgets/:widgetType`）を使用し、各Widgetの機能・完了条件をテスト。

**前提条件**:
- Widget Showcase環境は構築済み
- Playwright MCPによるインタラクティブテスト実施
- 各Widget内部にdata-testid属性なし → aria-label/role/textで要素特定

---

## テスト共通フロー

```
1. browser_navigate → /dev-demo/widgets/{widget_type}
2. browser_snapshot → 初期状態確認
3. (インタラクション実行)
4. browser_snapshot → 状態変化確認
5. Debug Panel確認 → widget-data, completion-status
6. browser_take_screenshot → 証跡保存
```

---

## Widget別テスト定義

### DIVERGE STAGE (発散フェーズ)

#### 1. emotion_palette（感情カラーパレット）
**対象ボトルネック**: 感情的ブロック、決断への恐れ

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| EP-01 | 感情選択 | 8色ボタンの1つをクリック | 選択状態になる、強度スライダー表示 |
| EP-02 | 強度調整 | スライダーをドラッグ | intensity値が変化（0-100%） |
| EP-03 | 感情切替 | 別の感情ボタンをクリック | 選択が切り替わる |
| EP-04 | 完了確認 | 感情選択後にDebug Panel確認 | completion-status: Yes |
| EP-05 | データ出力 | widget-data確認 | emotion, intensity, emotionLabelが出力 |

**Playwright MCP操作例**:
```
browser_click → role=radio + 感情名（例: "怒り"）
browser_click → slider要素
browser_snapshot → completion-status確認
```

---

#### 2. brainstorm_cards（ブレインストームカード）
**対象ボトルネック**: 何から考えればいいか分からない、情報不足

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| BC-01 | カード追加 | テキスト入力 → 追加ボタン | カードリストに追加 |
| BC-02 | 複数カード | 3枚以上追加 | カウント更新、リスト表示 |
| BC-03 | カード編集 | 編集ボタン → テキスト変更 → 保存 | カード内容が更新 |
| BC-04 | カード削除 | 削除ボタンクリック | カードがリストから消える |
| BC-05 | 完了確認 | 1枚以上追加後にDebug Panel確認 | completion-status: Yes |
| BC-06 | 最大枚数 | 20枚追加を試行 | 20枚で追加ボタン無効化 |

**Playwright MCP操作例**:
```
browser_type → textbox + アイデアテキスト
browser_click → "追加" or "Add" ボタン
browser_snapshot → カード追加確認
```

---

#### 3. question_card_chain（質問カード連鎖）
**対象ボトルネック**: 情報不足、何から考えればいいか分からない

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| QC-01 | 質問表示 | 初期状態確認 | 最初の質問が表示 |
| QC-02 | 回答入力 | textareaに回答入力 | 入力値が保持される |
| QC-03 | 次へ進む | Nextボタンクリック | 次の質問に遷移 |
| QC-04 | 戻る | Previousボタンクリック | 前の質問に戻る、回答保持 |
| QC-05 | ドット操作 | ナビゲーションドットクリック | 該当質問にジャンプ |
| QC-06 | 全問回答 | 全質問に回答 | completion-status: Yes |
| QC-07 | 部分回答 | 一部質問のみ回答 | completion-status: No |

**Playwright MCP操作例**:
```
browser_type → textarea + 回答テキスト
browser_click → "次へ" or "Next" ボタン
(繰り返し)
browser_snapshot → progress確認
```

---

### ORGANIZE STAGE (整理フェーズ)

#### 4. card_sorting（カード仕分け）
**対象ボトルネック**: 選択肢が多すぎる、情報が整理されていない

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| CS-01 | 初期表示 | 未分類カードとカテゴリ確認 | 全カード未分類、4カテゴリ表示 |
| CS-02 | ドラッグ配置 | カードをカテゴリにドラッグ | カードがカテゴリに移動 |
| CS-03 | 複数分類 | 全カードを各カテゴリに配置 | 進捗100% |
| CS-04 | カード移動 | 分類済みカードを別カテゴリへ | カードが移動 |
| CS-05 | 完了確認 | 全カード分類後 | completion-status: Yes |
| CS-06 | リセット | リセットボタン | 全カード未分類に戻る |

**Playwright MCP操作例**:
```
browser_drag → startRef: カード, endRef: カテゴリ
browser_snapshot → 分類状態確認
```

---

#### 5. dependency_mapping（依存関係マッピング）
**対象ボトルネック**: 複数の問題が絡んでいる、優先順位がつけられない

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| DM-01 | ノード追加 | Add Nodeボタン | 新ノードが追加 |
| DM-02 | ノード編集 | ノードダブルクリック → テキスト変更 | ラベル更新 |
| DM-03 | ノード移動 | ノードをドラッグ | 位置が更新 |
| DM-04 | 接続作成 | Connectモード → 2ノードクリック | エッジが描画 |
| DM-05 | エッジ削除 | エッジをクリック | エッジが削除 |
| DM-06 | ノード削除 | ノード選択 → Deleteボタン | ノードと関連エッジ削除 |
| DM-07 | 完了確認 | 1エッジ以上作成後 | completion-status: Yes |

**Playwright MCP操作例**:
```
browser_click → "Add Node" ボタン
browser_click → "Connect" ボタン (トグル)
browser_click → ノード1
browser_click → ノード2
browser_snapshot → エッジ確認
```

---

#### 6. swot_analysis（SWOT分析）
**対象ボトルネック**: 情報が整理されていない、視点固定

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| SW-01 | 4象限確認 | 初期表示 | S/W/O/T 4象限表示 |
| SW-02 | 項目追加 | 各象限にテキスト入力 → 追加 | 項目がリストに追加 |
| SW-03 | 重要度設定 | 項目の重要度ボタンクリック | 重要度が切り替わる |
| SW-04 | 項目削除 | 削除ボタンクリック | 項目が消える |
| SW-05 | 完了確認 | 4象限全てに1項目以上 | completion-status: Yes |
| SW-06 | 部分入力 | 一部象限のみ入力 | completion-status: No |

**Playwright MCP操作例**:
```
browser_type → Strengths象限のtextbox + テキスト
browser_click → "追加" ボタン
(他3象限も同様)
browser_snapshot → 完了確認
```

---

#### 7. mind_map（マインドマップ）
**対象ボトルネック**: 複数の問題が絡んでいる、情報が整理されていない

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| MM-01 | 中心トピック | 中心トピック編集 | テキストが更新 |
| MM-02 | ルートノード追加 | Add rootボタン | 第1階層ノード追加 |
| MM-03 | 子ノード追加 | ノードの+ボタン | 子ノードが追加 |
| MM-04 | ノード編集 | ダブルクリック → テキスト変更 | ラベル更新 |
| MM-05 | ノード展開/折畳 | 展開/折畳ボタン | 子ノード表示切替 |
| MM-06 | ノード削除 | ×ボタン | ノードと子孫削除 |
| MM-07 | 完了確認 | 1ノード以上追加後 | completion-status: Yes |

**Playwright MCP操作例**:
```
browser_type → 中心トピックinput + テーマ
browser_click → "Add root" or "+" ボタン
browser_snapshot → ツリー構造確認
```

---

### CONVERGE STAGE (収束フェーズ)

#### 8. matrix_placement（マトリックス配置）
**対象ボトルネック**: 選択肢が多すぎる、優先順位がつけられない

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| MP-01 | 軸ラベル確認 | 初期表示 | X軸/Y軸ラベル表示 |
| MP-02 | アイテム追加 | テキスト入力 → 追加 | アイテムがマトリックス中央に配置 |
| MP-03 | アイテム移動 | アイテムをドラッグ | 位置が更新（x, y座標） |
| MP-04 | 象限確認 | 各象限にアイテム配置 | 象限分布がwidget-dataに反映 |
| MP-05 | アイテム削除 | 削除ボタン | アイテムが消える |
| MP-06 | 完了確認 | 1アイテム以上配置後 | completion-status: Yes |

**Playwright MCP操作例**:
```
browser_type → textbox + アイテム名
browser_click → "追加" ボタン
browser_drag → アイテム to マトリックス内位置
browser_snapshot → 座標確認
```

---

#### 9. priority_slider_grid（優先度スライダーグリッド）
**対象ボトルネック**: 優先順位がつけられない、選択肢が多すぎる

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| PS-01 | 項目追加 | テキスト入力 → 追加 | 項目がグリッドに追加 |
| PS-02 | スライダー操作 | スライダーをドラッグ | 優先度（0-100%）が変化 |
| PS-03 | 統計確認 | 複数項目追加後 | 平均値、high/medium/low分布表示 |
| PS-04 | 項目削除 | 削除ボタン | 項目が消える、統計更新 |
| PS-05 | 完了確認 | 1項目以上追加後 | completion-status: Yes |

**Playwright MCP操作例**:
```
browser_type → textbox + 項目名
browser_click → "追加" ボタン
browser_click → slider要素（位置調整）
browser_snapshot → 優先度確認
```

---

#### 10. tradeoff_balance（トレードオフ天秤）
**対象ボトルネック**: 決断への恐れ、選択肢が多すぎる

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| TB-01 | ラベル編集 | 左右選択肢ラベル編集 | ラベルが更新 |
| TB-02 | 左側項目追加 | 左側フォームで項目追加 | 左側リストに追加 |
| TB-03 | 右側項目追加 | 右側フォームで項目追加 | 右側リストに追加 |
| TB-04 | 重み調整 | スライダーでweight変更 | 天秤バランスが変化 |
| TB-05 | 項目削除 | 削除ボタン | 項目削除、バランス再計算 |
| TB-06 | 完了確認 | 左右各1項目以上 | completion-status: Yes |
| TB-07 | 部分入力 | 片側のみ項目追加 | completion-status: No |

**Playwright MCP操作例**:
```
browser_type → 左側textbox + 項目名
browser_click → 左側"追加" ボタン
browser_type → 右側textbox + 項目名
browser_click → 右側"追加" ボタン
browser_snapshot → バランス確認
```

---

#### 11. timeline_slider（時間軸スライダー）
**対象ボトルネック**: 視点固定、選択肢が少ない

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| TL-01 | 時間単位切替 | days/weeks/months等ボタン | 単位表示が切り替わる |
| TL-02 | イベント追加 | テキスト+位置+優先度 → 追加 | タイムラインにマーカー追加 |
| TL-03 | 位置調整 | イベントのスライダー操作 | マーカー位置が移動 |
| TL-04 | マーカー選択 | タイムラインのマーカークリック | イベント詳細表示 |
| TL-05 | イベント削除 | 削除ボタン | イベント削除 |
| TL-06 | 完了確認 | 1イベント以上追加後 | completion-status: Yes |

**Playwright MCP操作例**:
```
browser_click → "weeks" ボタン（時間単位）
browser_type → textbox + イベント名
browser_click → "追加" ボタン
browser_snapshot → タイムライン確認
```

---

### SUMMARY STAGE (まとめフェーズ)

#### 12. structured_summary（構造化文章まとめ）
**対象ボトルネック**: 全ボトルネック（最終確認）

| テストID | テスト内容 | 操作手順 | 期待結果 |
|----------|-----------|----------|----------|
| SS-01 | タイトル編集 | タイトル入力欄編集 | タイトルが更新 |
| SS-02 | セクション追加 | セクション追加ボタン | 新セクションが追加 |
| SS-03 | セクション編集 | セクションタイトル・内容編集 | 内容が更新 |
| SS-04 | セクション並替 | 上下ボタンで順序変更 | セクション順序が変化 |
| SS-05 | セクション削除 | 削除ボタン | セクションが消える |
| SS-06 | 結論入力 | 結論textarea入力 | 結論が更新 |
| SS-07 | プレビュー | プレビューボタン | エクスポートビュー表示 |
| SS-08 | 完了確認 | 2セクション以上入力後 | completion-status: Yes |

**Playwright MCP操作例**:
```
browser_type → タイトルinput + タイトル
browser_click → セクション追加ボタン
browser_type → セクションtextarea + 内容
browser_snapshot → 統計確認
```

---

## テスト優先度

| 優先度 | Widget | 理由 |
|--------|--------|------|
| 高 | emotion_palette | シンプル、基本操作確認に最適 |
| 高 | brainstorm_cards | 頻出パターン（追加/編集/削除） |
| 高 | card_sorting | ドラッグ&ドロップの検証 |
| 中 | question_card_chain | シーケンシャル操作 |
| 中 | swot_analysis | 4象限の複合入力 |
| 中 | matrix_placement | 2軸配置の検証 |
| 中 | priority_slider_grid | スライダー操作 |
| 中 | tradeoff_balance | バランス計算の検証 |
| 低 | dependency_mapping | SVG操作の複雑さ |
| 低 | mind_map | 再帰構造の複雑さ |
| 低 | timeline_slider | 複合UI |
| 低 | structured_summary | 最も複雑なUI |

---

## data-testid属性定義

12 Widget全てに安定したテスト用data-testid属性を追加する。

### 命名規則
```
{widget-type}-{element-name}
```

例: `emotion-palette-select-angry`, `brainstorm-cards-add-button`

---

### Widget別 data-testid定義

#### 1. emotion_palette
| 要素 | data-testid | 用途 |
|------|-------------|------|
| 感情ボタン（8種） | `emotion-palette-btn-{emotion}` | 各感情の選択 |
| 強度スライダー | `emotion-palette-intensity-slider` | 強度調整 |
| 選択表示 | `emotion-palette-selected-display` | 現在の選択確認 |

#### 2. brainstorm_cards
| 要素 | data-testid | 用途 |
|------|-------------|------|
| テキスト入力 | `brainstorm-cards-input` | 新規カード入力 |
| 追加ボタン | `brainstorm-cards-add-btn` | カード追加 |
| カードリスト | `brainstorm-cards-list` | カード一覧 |
| 各カード | `brainstorm-cards-item-{index}` | 個別カード |
| 編集ボタン | `brainstorm-cards-edit-btn-{index}` | カード編集 |
| 削除ボタン | `brainstorm-cards-delete-btn-{index}` | カード削除 |
| カウント | `brainstorm-cards-count` | 枚数表示 |

#### 3. question_card_chain
| 要素 | data-testid | 用途 |
|------|-------------|------|
| 質問テキスト | `qcc-question-text` | 現在の質問表示 |
| 回答入力 | `qcc-answer-textarea` | 回答入力欄 |
| 前へボタン | `qcc-prev-btn` | 前の質問へ |
| 次へボタン | `qcc-next-btn` | 次の質問へ |
| ナビドット | `qcc-nav-dot-{index}` | 質問ジャンプ |
| 進捗バー | `qcc-progress-bar` | 進捗表示 |
| 進捗テキスト | `qcc-progress-text` | "2/5" 等 |

#### 4. card_sorting
| 要素 | data-testid | 用途 |
|------|-------------|------|
| 未分類エリア | `card-sorting-unsorted` | 未分類カード置き場 |
| カテゴリ | `card-sorting-category-{id}` | 各カテゴリ |
| カード | `card-sorting-card-{id}` | ドラッグ対象カード |
| 進捗バー | `card-sorting-progress` | 進捗表示 |
| リセットボタン | `card-sorting-reset-btn` | リセット |

#### 5. dependency_mapping
| 要素 | data-testid | 用途 |
|------|-------------|------|
| キャンバス | `dep-map-canvas` | SVG描画領域 |
| ノード追加ボタン | `dep-map-add-node-btn` | ノード追加 |
| 接続モードボタン | `dep-map-connect-btn` | 接続モード切替 |
| 削除ボタン | `dep-map-delete-btn` | 選択要素削除 |
| ノード | `dep-map-node-{id}` | 各ノード |
| エッジタイプ選択 | `dep-map-edge-type-select` | エッジ種別 |

#### 6. swot_analysis
| 要素 | data-testid | 用途 |
|------|-------------|------|
| 象限コンテナ | `swot-{quadrant}` | S/W/O/T各象限 |
| 入力欄 | `swot-{quadrant}-input` | 項目入力 |
| 追加ボタン | `swot-{quadrant}-add-btn` | 項目追加 |
| 項目 | `swot-{quadrant}-item-{index}` | 各項目 |
| 重要度ボタン | `swot-importance-btn-{level}` | 重要度選択 |
| 削除ボタン | `swot-{quadrant}-delete-{index}` | 項目削除 |

#### 7. mind_map
| 要素 | data-testid | 用途 |
|------|-------------|------|
| 中心トピック入力 | `mindmap-center-input` | 中心トピック編集 |
| ルート追加ボタン | `mindmap-add-root-btn` | 第1階層追加 |
| ノード | `mindmap-node-{id}` | 各ノード |
| 子追加ボタン | `mindmap-add-child-{id}` | 子ノード追加 |
| 削除ボタン | `mindmap-delete-{id}` | ノード削除 |
| 展開/折畳ボタン | `mindmap-toggle-{id}` | 展開/折畳 |

#### 8. matrix_placement
| 要素 | data-testid | 用途 |
|------|-------------|------|
| マトリックス領域 | `matrix-grid` | 配置領域 |
| X軸ラベル | `matrix-x-axis-label` | X軸名 |
| Y軸ラベル | `matrix-y-axis-label` | Y軸名 |
| アイテム入力 | `matrix-item-input` | 新規アイテム入力 |
| 追加ボタン | `matrix-add-btn` | アイテム追加 |
| アイテム | `matrix-item-{id}` | 配置済みアイテム |
| 削除ボタン | `matrix-delete-{id}` | アイテム削除 |

#### 9. priority_slider_grid
| 要素 | data-testid | 用途 |
|------|-------------|------|
| 入力欄 | `psg-input` | 新規項目入力 |
| 追加ボタン | `psg-add-btn` | 項目追加 |
| 項目リスト | `psg-item-list` | 項目一覧 |
| 項目 | `psg-item-{id}` | 各項目 |
| スライダー | `psg-slider-{id}` | 優先度スライダー |
| 削除ボタン | `psg-delete-{id}` | 項目削除 |
| 統計表示 | `psg-stats` | 平均・分布 |

#### 10. tradeoff_balance
| 要素 | data-testid | 用途 |
|------|-------------|------|
| 左ラベル入力 | `tradeoff-left-label` | 左選択肢名 |
| 右ラベル入力 | `tradeoff-right-label` | 右選択肢名 |
| 左入力欄 | `tradeoff-left-input` | 左側項目入力 |
| 左追加ボタン | `tradeoff-left-add-btn` | 左側追加 |
| 右入力欄 | `tradeoff-right-input` | 右側項目入力 |
| 右追加ボタン | `tradeoff-right-add-btn` | 右側追加 |
| 項目 | `tradeoff-{side}-item-{id}` | 各項目 |
| 重みスライダー | `tradeoff-weight-{id}` | 重み調整 |
| 天秤表示 | `tradeoff-balance-beam` | バランス可視化 |
| バランススコア | `tradeoff-balance-score` | 数値表示 |

#### 11. timeline_slider
| 要素 | data-testid | 用途 |
|------|-------------|------|
| 時間単位ボタン | `timeline-unit-{unit}` | days/weeks/months等 |
| タイムライン | `timeline-track` | 時間軸表示 |
| イベント入力 | `timeline-event-input` | イベント名入力 |
| 位置スライダー | `timeline-position-slider` | 位置設定 |
| 優先度選択 | `timeline-priority-select` | 優先度選択 |
| 追加ボタン | `timeline-add-btn` | イベント追加 |
| イベントマーカー | `timeline-marker-{id}` | タイムライン上マーカー |
| イベント項目 | `timeline-event-{id}` | リスト内イベント |
| 削除ボタン | `timeline-delete-{id}` | イベント削除 |

#### 12. structured_summary
| 要素 | data-testid | 用途 |
|------|-------------|------|
| タイトル入力 | `summary-title-input` | タイトル編集 |
| セクション追加ボタン | `summary-add-section-{type}` | 各種セクション追加 |
| セクションリスト | `summary-sections` | セクション一覧 |
| セクション | `summary-section-{index}` | 各セクション |
| セクションタイトル | `summary-section-title-{index}` | セクション名 |
| セクション内容 | `summary-section-content-{index}` | 内容textarea |
| 上移動ボタン | `summary-move-up-{index}` | 順序変更 |
| 下移動ボタン | `summary-move-down-{index}` | 順序変更 |
| セクション削除 | `summary-delete-section-{index}` | セクション削除 |
| 結論入力 | `summary-conclusion-textarea` | 結論 |
| プレビューボタン | `summary-preview-btn` | プレビュー表示 |
| 統計表示 | `summary-stats` | 文字数等 |

---

## 実施手順

### Step 1: data-testid属性追加（実装作業）
各Widgetコンポーネントに上記定義のdata-testid属性を追加する。

**対象ファイル（12ファイル）**:
```
concern-app/src/components/widgets/v3/
├── EmotionPalette/EmotionPalette.tsx
├── BrainstormCards/BrainstormCards.tsx
├── QuestionCardChain/QuestionCardChain.tsx
├── CardSorting/CardSorting.tsx
├── DependencyMapping/DependencyMapping.tsx
├── SwotAnalysis/SwotAnalysis.tsx
├── MindMap/MindMap.tsx
├── MatrixPlacement/MatrixPlacement.tsx
├── PrioritySliderGrid/PrioritySliderGrid.tsx
├── TradeoffBalance/TradeoffBalance.tsx
├── TimelineSlider/TimelineSlider.tsx
└── StructuredSummary/StructuredSummary.tsx
```

### Step 2: Playwright MCPテスト実施（優先度順）

**Phase 2-1: 高優先度Widget**
1. emotion_palette - シンプル、基本操作確認
2. brainstorm_cards - CRUD操作パターン
3. card_sorting - ドラッグ&ドロップ検証

**Phase 2-2: 中優先度Widget**
4. question_card_chain - シーケンシャル操作
5. swot_analysis - 4象限複合入力
6. matrix_placement - 2軸配置
7. priority_slider_grid - スライダー操作
8. tradeoff_balance - バランス計算

**Phase 2-3: 低優先度Widget**
9. dependency_mapping - SVG操作
10. mind_map - 再帰構造
11. timeline_slider - 複合UI
12. structured_summary - 最複雑UI

### Step 3: 結果整理・ドキュメント作成
- テスト実行結果の記録
- 発見した問題点のリスト化
- 改善提案

---

## 成果物

**実装成果物**:
- [ ] 12 Widget × data-testid属性追加完了

**テスト成果物**:
- [ ] 12 Widget × テストシナリオ実行記録
- [ ] スクリーンショット証跡
- [ ] 問題点・改善点リスト

---

## 修正対象ファイル一覧

| Widget | ファイルパス |
|--------|-------------|
| emotion_palette | `src/components/widgets/v3/EmotionPalette/EmotionPalette.tsx` |
| brainstorm_cards | `src/components/widgets/v3/BrainstormCards/BrainstormCards.tsx` |
| question_card_chain | `src/components/widgets/v3/QuestionCardChain/QuestionCardChain.tsx` |
| card_sorting | `src/components/widgets/v3/CardSorting/CardSorting.tsx` |
| dependency_mapping | `src/components/widgets/v3/DependencyMapping/DependencyMapping.tsx` |
| swot_analysis | `src/components/widgets/v3/SwotAnalysis/SwotAnalysis.tsx` |
| mind_map | `src/components/widgets/v3/MindMap/MindMap.tsx` |
| matrix_placement | `src/components/widgets/v3/MatrixPlacement/MatrixPlacement.tsx` |
| priority_slider_grid | `src/components/widgets/v3/PrioritySliderGrid/PrioritySliderGrid.tsx` |
| tradeoff_balance | `src/components/widgets/v3/TradeoffBalance/TradeoffBalance.tsx` |
| timeline_slider | `src/components/widgets/v3/TimelineSlider/TimelineSlider.tsx` |
| structured_summary | `src/components/widgets/v3/StructuredSummary/StructuredSummary.tsx` |
