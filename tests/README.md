# Tests Directory

このディレクトリはプロジェクト全体の統合テスト・E2Eテストを含みます。

## テスト実行

### 全テスト実行
```bash
node tests/run_all_tests.js
```

### オプション
```bash
node tests/run_all_tests.js --parallel      # 並列実行
node tests/run_all_tests.js --category=unit # カテゴリ指定
node tests/run_all_tests.js --priority=high # 優先度指定
node tests/run_all_tests.js --fail-fast     # 最初の失敗で停止
```

## ファイル一覧

### テストランナー
| ファイル | 説明 |
|---------|------|
| run_all_tests.js | 統合テストスイートランナー |

### 単体テスト (Unit)
| ファイル | 対象 |
|---------|------|
| unit_context_service.js | ContextService |
| unit_api_service.js | ApiService |
| unit_database_operations.js | データベース操作 |
| unit_react_components.js | Reactコンポーネント |

### 詳細テスト
| ファイル | 対象 |
|---------|------|
| detailed_api_tests.js | API詳細テスト |
| security_tests.js | セキュリティテスト |
| performance_tests.js | パフォーマンステスト |

### Legacyテスト
| ファイル | 対象 | 備考 |
|---------|------|------|
| phase1c_e2e_test.js | Phase 1C | DSL v1対象 |
| phase3_e2e_test.js | Phase 3 | DSL v2対象 |

### 評価用
| ディレクトリ | 説明 |
|-------------|------|
| evaluation/ | 研究評価用テスト |

## 他のテスト場所

### サーバーテスト
```bash
cd server && bun test
```
- `server/test/` - APIテスト、DSLテスト等
- `server/src/*/__tests__/` - 型・ジェネレーターテスト

### フロントエンドテスト
```bash
cd concern-app && bun run test
```
- `concern-app/src/*/__tests__/` - サービス・型・フックテスト
- `concern-app/src/components/widgets/v3/__tests__/` - Widget E2Eテスト
- `concern-app/src/components/widgets/v3/*/__tests__/` - Widget単体テスト

## 備考

- Legacyテストは実験再現性確認のため保持
- 現行版は Full-Flow Demo (DSL v3)
- 詳細は `specs/project/phase5/test-organization-report.md` を参照
