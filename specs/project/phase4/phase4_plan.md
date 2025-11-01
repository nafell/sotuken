# Phase 4: DSL v3.0 実装計画

議事録まとめ

現状の課題

1. Plan/Breakdown: UI生成の意味が薄い（項目生成と変わらない）
2. Capture: 良好だが、ボトルネック診断機能の追加が必要
3. 全体: 1つの汎用DSLで全フェーズをカバーしているため非効率

解決方針：3層構造DSL体系への移行

- Layer 1: 基盤言語仕様（Generic）
- Layer 2: フェーズ別要求仕様（Purpose-Specific）
- Layer 3: 実装例とパターン

フェーズ別の改善方針

- Capture: 2段階構造（具体化 + ボトルネック診断）
- Plan: フル動的化（UIコンポーネントライブラリ活用）
- Breakdown: 固定UI化（LLMは内容のみ生成）

実装タスクリスト (tasks.md)

## Part1: DSL仕様書の3層分割 (Day 1-2)

### Task 1.1: 基盤言語仕様の抽出

- 既存のDSL v2.1から基本型定義を抽出
- specs/dsl-design/v3/DSL-Core-Spec-v3.0.mdを作成
- 内容: SVAL, ARRY, PNTR, DICT型定義、Entity/Attribute構造、構文ルール

### Task 1.2: Capture要求仕様書の作成

- specs/dsl-design/v3/capture-requirements-v3.0.mdを作成
- 2段階構造（Stage 1: 具体化、Stage 2: 診断）の定義
- 診断質問パターンの設計（3-5問の最小構成）

### Task 1.3: Plan要求仕様書の作成（議事録から移行）

- specs/dsl-design/v3/plan-requirements-v3.0.mdを作成
- discussion_p4_plan.mdのL279-303をUIコンポーネントライブラリとして移行
- ボトルネックタイプ定義（L307-390）を整理
- 3段階フローモデル（L15-22）を定義

### Task 1.4: Breakdown要求仕様書の作成

- specs/dsl-design/v3/breakdown-requirements-v3.0.mdを作成
- 固定UIテンプレート定義
- LLM生成範囲を「内容のみ」に限定

git commit: "feat: DSL v3.0 3層構造仕様書を作成"

## Part2: Captureフェーズの拡張実装 (Day 3-4)

### Task 2.1: ボトルネック診断ロジックの設計

- concern-app/src/types/BottleneckTypes.tsを作成
- 8種類のボトルネックタイプを定義
- 診断結果インターフェースを定義

### Task 2.2: 初期入力解析関数の実装

- concern-app/src/services/ConcernAnalyzer.tsを作成
- analyzeConcernDepth関数を実装
- 具体性/曖昧さの判定ロジック

### Task 2.3: 診断質問生成サービスの実装

- concern-app/src/services/DiagnosticQuestionService.tsを作成
- ボトルネック別の診断質問セット定義
- 適応的質問選択ロジック（3-5問）

### Task 2.4: CaptureコンポーネントへのStage 2統合

- concern-app/src/components/capture/CapturePhase.tsxを修正
- Stage 2の条件付き表示ロジック追加
- 診断結果のstate管理

git commit: "feat: Captureフェーズにボトルネック診断機能を追加"

## Part3: Capture→Plan連携の強化 (Day 4)

### Task 3.1: 情報受け渡しインターフェースの拡張

- concern-app/src/types/PhaseTransition.tsを作成
- CaptureOutput型にbottleneckAnalysisを追加
- userCharacteristics型を定義

### Task 3.2: SessionManagerの更新

- concern-app/src/services/SessionManager.tsを修正
- 診断結果の保存ロジック追加
- Plan phase への情報伝達

git commit: "feat: Capture→Plan フェーズ間の情報連携を強化"

## Part4: Planフェーズのプロンプト最適化 (Day 5)

### Task 4.1: UIコンポーネント選択アルゴリズム実装

- concern-app/src/services/UIComponentSelector.tsを作成
- ボトルネック診断結果に基づく選択ロジック
- timing × versatility の最適化関数

### Task 4.2: LLMプロンプトテンプレートの更新

- concern-app/src/prompts/plan-phase-prompt.tsを作成
- Layer 2仕様を参照する形式に変更
- ボトルネック情報を含むコンテキスト生成

### Task 4.3: Plan UIGenerationServiceの修正

- concern-app/src/services/UIGenerationService.tsを修正
- 新プロンプトテンプレートの適用
- コンポーネントライブラリ参照の実装

git commit: "feat: Planフェーズのプロンプトを最適化"

## Part5: Breakdownフェーズの簡略化 (Day 6)

### Task 5.1: 固定UIテンプレートの実装

- concern-app/src/templates/breakdown-fixed-ui.jsonを作成
- sortable-list, time-estimate, dependency-graphの定義

### Task 5.2: Breakdown生成ロジックの簡略化

- concern-app/src/services/BreakdownService.tsを修正
- UI生成を削除、コンテンツ生成のみに
- 固定テンプレート適用ロジック

### Task 5.3: LLMプロンプトの簡略化

- concern-app/src/prompts/breakdown-prompt.tsを修正
- UISpec生成部分を削除
- タスク内容のみの生成に限定

git commit: "feat: Breakdownフェーズを固定UI化"

## Part6: テストとデバッグ (Day 7)

### Task 6.1: ユニットテストの追加

- tests/unit/BottleneckAnalyzer.test.tsを作成
- tests/unit/DiagnosticQuestionService.test.tsを作成
- 各診断ロジックのテスト

### Task 6.2: 統合テストの実装

- tests/integration/phase-transition.test.tsを作成
- Capture→Plan→Breakdownの通しテスト

### Task 6.3: エッジケースの処理

- 診断失敗時のフォールバック
- 空回答への対応
- エラーハンドリングの強化

git commit: "test: DSL v3.0実装のテストを追加"

## Part7: ドキュメントと実験準備 (Day 8)

### Task 7.1: 実装ドキュメントの作成

- docs/dsl-v3-implementation.mdを作成
- アーキテクチャ図の追加
- 各フェーズの処理フロー図

### Task 7.2: 実験設定の準備

- A/Bテストグループの設定コード
- ユーザアンケート項目の実装準備
- ログ収集の強化

### Task 7.3: デプロイメント準備

- 環境変数の設定
- フィーチャーフラグの実装
- ロールバック計画の策定

git commit: "docs: DSL v3.0のドキュメントと実験準備"

各タスク後のテストポイント

- Part 1後: 仕様書が正しく分割され、参照可能か確認
- Part 2後: Captureフェーズで診断質問が表示されるか確認
- Part 3後: 診断結果がPlanフェーズに渡されるか確認
- Part 4後: Planフェーズが診断結果に基づいてUI生成するか確認
- Part 5後: Breakdownが固定UIで正しく表示されるか確認
- Part 6後: 全テストが通ることを確認
- Part 7後: ドキュメントの完成度とデプロイ準備状況を確認

完成度向上施策（実験前に実施可能）

1. プロンプトの最適化: 各フェーズのプロンプトを反復的に改善
2. UIコンポーネントの充実: 議事録のライブラリを実装
3. 診断精度の向上: 初期実装後、内部テストで精度改善
4. エラーハンドリング: フォールバック機能の充実
5. パフォーマンス最適化: トークン消費量の削減

これらのタスクは独立性が高く、各タスク後にテスト可能な粒度になっています。