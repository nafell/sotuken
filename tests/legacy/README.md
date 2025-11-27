# Legacy Tests

このディレクトリには、DSL v3 および Full-flow PoC 移行以前のレガシーテストが保管されています。

## 移動理由

これらのテストは以下の理由でレガシーとして分類されました：

1. **DSL バージョンの不一致**: DSL v1/v2 用に作成されたテストであり、現在の DSL v3 アーキテクチャと互換性がない
2. **コードベースの変更**: 対象となるコンポーネントやサービスが大幅に変更または削除された
3. **テスト戦略の更新**: 新しいテスト戦略（test-strategy-v3）に基づく構成に移行

## ディレクトリ構成

```
legacy/
├── README.md                    # このファイル
├── root-level/                  # プロジェクトルートから移動
│   ├── test_database.js         # Day 10時代のDB統合テスト
│   ├── test_factors.js          # ContextService の古いテスト
│   ├── test_pwa.js              # PWA機能テスト
│   └── integration_test.js      # 古い統合テスト
└── dsl-versions/                # DSLバージョン別E2Eテスト
    ├── phase1c_e2e_test.js      # Phase 1C (DSL v1)
    └── phase3_e2e_test.js       # Phase 3 (DSL v2)
```

## 各ファイルの説明

### root-level/

| ファイル | 説明 | 元の場所 |
|---------|------|---------|
| `test_database.js` | Day 10時代のデータベース統合テスト。IndexedDB/SQLite の基本操作を検証 | `/test_database.js` |
| `test_factors.js` | ContextService のコンテキスト要因収集テスト | `/test_factors.js` |
| `test_pwa.js` | PWA機能（オフライン、キャッシュ等）のテスト | `/test_pwa.js` |
| `integration_test.js` | フロントエンド・バックエンド統合テスト | `/integration_test.js` |

### dsl-versions/

| ファイル | DSL Version | 説明 | 元の場所 |
|---------|-------------|------|---------|
| `phase1c_e2e_test.js` | v1 | Phase 1C の E2E テスト。旧 DataSchema/UISpec 形式を使用 | `/tests/phase1c_e2e_test.js` |
| `phase3_e2e_test.js` | v2 | Phase 3 の E2E テスト。UISpec v2 形式を使用 | `/tests/phase3_e2e_test.js` |

## レガシーテストの実行

レガシーテストは通常のテスト実行から除外されています。
必要に応じて `--include-legacy` フラグを使用して実行できます：

```bash
# レガシーテストを含めて実行
node tests/run_all_tests.js --include-legacy

# レガシーテストのみ実行
node tests/run_all_tests.js --category=legacy
```

## 注意事項

- これらのテストは現在のコードベースでは動作しない可能性があります
- 参照目的で保管されています
- 新しいテストは `specs/testing/test-strategy-v3.md` に従って作成してください

## 移行日

2025-11-28
