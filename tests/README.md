# Tests Directory

このディレクトリはプロジェクト全体の統合テスト・E2Eテストを含みます。

## テスト構成概要

| カテゴリ | 場所 | ランナー | ファイル数 |
|---------|------|---------|-----------|
| Widget単体テスト | `concern-app/src/**/__tests__/*.test.ts` | Vitest | 27 |
| Widget E2Eテスト | `concern-app/src/**/__tests__/*.spec.ts` | Playwright | 13 |
| サーバーテスト | `server/test/` | Bun | 18 |
| 統合テスト | `tests/` | Node.js | 7 |
| レガシーテスト | `tests/legacy/` | Node.js | 6 |

## テスト実行

### 全テスト実行
```bash
node tests/run_all_tests.js
```

### オプション
```bash
node tests/run_all_tests.js --parallel       # 並列実行
node tests/run_all_tests.js --category=unit  # カテゴリ指定
node tests/run_all_tests.js --priority=high  # 優先度指定
node tests/run_all_tests.js --fail-fast      # 最初の失敗で停止
node tests/run_all_tests.js --include-legacy # レガシーテスト含む
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

### レガシーテスト
詳細は `tests/legacy/README.md` を参照。

### 評価用
| ディレクトリ | 説明 |
|-------------|------|
| evaluation/ | 研究評価用テスト |

---

## 他のテスト場所

### フロントエンドテスト（concern-app）

**重要**: `bun test`ではなく`bun run test`を使用（Vitestを実行するため）

```bash
cd concern-app

# 全Vitestテスト実行（617テスト）
bun run test

# Widget Controllerテストのみ
bun run test src/components/widgets/v3/*/__tests__/*Controller.test.ts

# 統合テスト
bun run test src/components/widgets/v3/__tests__/integration.test.tsx

# Playwright E2Eテスト
bun run test:e2e
```

#### Vitest テストファイル（27ファイル）

| カテゴリ | ディレクトリ | 内容 |
|---------|-------------|------|
| Widget Controller | `src/components/widgets/v3/*/__tests__/` | 12コントローラー（374テスト） |
| Widget Integration | `src/components/widgets/v3/__tests__/` | コンポーネント統合（27テスト） |
| Services | `src/services/**/__tests__/` | サービス層テスト |
| Types | `src/types/__tests__/` | 型定義テスト |
| Store | `src/store/__tests__/` | Jotai状態管理テスト |

#### Playwright E2Eテストファイル（13ファイル）

| ディレクトリ | 内容 |
|-------------|------|
| `src/components/widgets/v3/*/__tests__/*.spec.ts` | Widget E2Eテスト |

### サーバーテスト

```bash
cd server && bun test
```

- `server/test/` - APIテスト、DSLテスト等（18ファイル）
- `server/src/*/__tests__/` - 型・ジェネレーターテスト

---

## 参考資料

- `specs/testing/test-strategy-v3.md` - テスト戦略ドキュメント
- `specs/testing/test-improvement-report.md` - テスト改善作業報告書
- `tests/legacy/README.md` - レガシーテスト説明

---

*最終更新: 2025-11-28*
