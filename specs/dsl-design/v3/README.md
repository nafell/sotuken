# DSL v3.0 仕様書体系

**Version**: 3.0
**Date**: 2025-11-14
**Status**: Draft

## 概要

DSL v3.0は、思考整理アプリケーションのための3層構造の仕様書体系です。基盤言語仕様、フェーズ別要求仕様、実装例の3つの層に分離することで、LLMの理解度向上とコンテキスト削減を実現します。

## ディレクトリ構造

```
v3/
├── README.md                           # 本ファイル
├── DSL-Core-Spec-v3.0.md              # Layer 1: 基盤言語仕様
├── capture-requirements-v3.0.md       # Layer 2: Capture要求仕様
├── plan-requirements-v3.0.md          # Layer 2: Plan要求仕様
├── breakdown-requirements-v3.0.md     # Layer 2: Breakdown要求仕様
└── examples/                          # Layer 3: 実装例とパターン
    ├── capture-examples.json
    ├── plan-creative-patterns.json
    └── breakdown-templates.json
```

## 3層構造の説明

### Layer 1: 基盤言語仕様
- **ファイル**: `DSL-Core-Spec-v3.0.md`
- **内容**:
  - 基本型定義（SVAL, ARRY, PNTR, DICT）
  - 構造定義（Entity, Attribute, Dependency）
  - 構文ルール
  - エラーハンドリング基盤
- **特徴**: すべてのフェーズで共通利用される言語仕様

### Layer 2: フェーズ別要求仕様
各フェーズごとに独立した要求仕様書を定義：

#### Capture Phase
- **ファイル**: `capture-requirements-v3.0.md`
- **動的化レベル**: 限定的動的
- **特徴**: 2段階構造（具体化 + ボトルネック診断）

#### Plan Phase
- **ファイル**: `plan-requirements-v3.0.md`
- **動的化レベル**: フル動的
- **特徴**: 3段階フロー + UIコンポーネントライブラリ

#### Breakdown Phase
- **ファイル**: `breakdown-requirements-v3.0.md`
- **動的化レベル**: 固定UI
- **特徴**: コンテンツのみ動的生成

### Layer 3: 実装例とパターン
- **ディレクトリ**: `examples/`
- **内容**:
  - 具体的な使用例
  - クリエイティブパターン
  - フォールバックテンプレート
- **形式**: JSON形式で機械可読

## 主な改善点

### 1. LLM理解度の向上
- 各フェーズの意図が明確化
- 生成すべき範囲が限定的で明確
- 不要な複雑性の排除

### 2. コンテキスト削減
- 必要な仕様のみをプロンプトに含める
- トークン消費量30-40%削減見込み
- フェーズごとに最適化された指示

### 3. 品質向上
- **Capture**: 診断機能追加による的確な問題把握
- **Plan**: クリエイティブUIパターンによる効果的な思考支援
- **Breakdown**: 固定UIによる安定した出力

## 使用方法

### LLMプロンプトでの参照

```
# Captureフェーズ
参照仕様：
- Layer 1: DSL-Core-Spec-v3.0.md（基本型定義のみ）
- Layer 2: capture-requirements-v3.0.md（全体）
- Layer 3: capture-examples.json（類似ケース）

# Planフェーズ
参照仕様：
- Layer 1: DSL-Core-Spec-v3.0.md（基本型定義のみ）
- Layer 2: plan-requirements-v3.0.md（全体）
- Layer 3: plan-creative-patterns.json（ボトルネック別パターン）

# Breakdownフェーズ
参照仕様：
- Layer 1: DSL-Core-Spec-v3.0.md（基本型定義のみ）
- Layer 2: breakdown-requirements-v3.0.md（全体）
- Layer 3: breakdown-templates.json（テンプレート）
```

### 実装チェックリスト

- [ ] 基盤言語仕様の実装
- [ ] Capture: ボトルネック診断機能
- [ ] Capture: 2段階フロー制御
- [ ] Plan: UIコンポーネントライブラリ
- [ ] Plan: 3段階フロー管理
- [ ] Plan: ボトルネック別UI選択
- [ ] Breakdown: 固定UIテンプレート
- [ ] Breakdown: コンテンツ生成
- [ ] フェーズ間連携インターフェース

## パフォーマンス目標

| フェーズ | 完了率目標 | 所要時間目標 | 主要指標 |
|---------|-----------|-------------|---------|
| Capture | 85% | 3分 | 診断精度70% |
| Plan | 80% | 10-15分 | UI適合度75% |
| Breakdown | 70% | 5分 | タスク実行可能性90% |

## 今後の拡張

### 短期（3ヶ月）
- 実験データに基づくパターンの最適化
- 診断精度の向上
- UIコンポーネントの追加

### 中期（6ヶ月）
- 機械学習による診断自動化
- ユーザーセグメント別カスタマイズ
- 外部ツール連携

### 長期（1年）
- マルチモーダル対応（音声、画像）
- 協調的思考支援
- AIパートナー機能

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| 3.0 | 2025-11-14 | 初版作成（3層構造導入） |

## 関連文書

- [議事録: Planフェーズ設計](../../project/discussion_p4_plan.md)
- [議事録: DSL仕様v1](../discussion_dsl_specs_v1.md)
- [DSL v2.1仕様](../dsl_ui_specs_v2_1.md)

## お問い合わせ

本仕様書に関する質問や提案は、プロジェクトのIssueトラッカーまでお願いします。