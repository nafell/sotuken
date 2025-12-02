# DSL v4.0 仕様書体系

**Version**: 4.0
**Date**: 2025-12-02
**Status**: Draft

## 概要

DSL v4.0は、Jelly Framework準拠の3層DSL構造と3段階LLM呼び出しを実装し、v3の課題を解決する改訂版です。

## ディレクトリ構造

```
v4/
├── README.md                           # 本ファイル
├── DSL-Spec-v4.0.md                   # DSL仕様書
├── requirements.md                     # 要件定義書
└── (今後追加予定)
    ├── widget-definitions/            # Widget定義詳細
    ├── prompt-templates/              # LLMプロンプトテンプレート
    └── examples/                      # 実装例
```

## v3からの主要変更点

| 観点 | v3 | v4 |
|------|-----|-----|
| LLM呼び出し | 1段階（一括生成） | 3段階（Widget選定→ORS/DpG→UISpec） |
| データモデル | OODM（形骸化） | ORS（活用強化） |
| DpG | UISpec内に配置 | TDDM層に移動 |
| Widget選定 | ステージ固定振り分け | timing/versatility/complexityベース動的選定 |
| ReactiveBinding | DpGと混在 | UISpec層に分離 |
| Widget数 | 12種 | 13種（stage_summary追加） |

**用語変更**: v3までの「OODM」はv4で「ORS」（Object-Relational Schema）に変更。データモデル層は「TDDM」（Task-Driven Data Model）と呼称。詳細は[DSL-Spec-v4.0.md 付録A](./DSL-Spec-v4.0.md#11-付録a-用語対応表v3v4)を参照。

## 関連ドキュメント

- [DSLv4レビュー議事録](../../discussions/DSLv4_review_minutes.md) - v4設計の背景と議論
- [動的UI生成システム仕様書](../v3/dynamic-ui-generation-system-spec.md) - v3時点の全体像
- [Jelly Framework論文](https://arxiv.org/html/2503.04084v1) - 設計の基盤

## 実装優先度

### Must（必須）
- 3層DSL構造の実装
- ORS活用強化
- DpG/ReactiveBinding分離
- 3段階LLM呼び出し
- 4ステージ一括Widget選定
- complexity追加
- 計画提示画面
- エラーログ

### Should（推奨）
- 型システム層別使い分け
- タスク別モデル切り替え
- stage_summary Widget
- Widget操作言語化
- ナビゲーション機能

### Nice to have
- configでの実験パターン編集
- フォールバックUI表示

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 2025-12-02 | 初版作成 |
| 4.0.1 | 2025-12-02 | OODM→ORS/TDDM用語変更 |
