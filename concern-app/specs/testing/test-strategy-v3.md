# テスト戦略 v3

**作成日**: 2025-11-28
**対象**: DSL v3 + Full-Flow PoC

---

## 概要

本ドキュメントは、DSL v3アーキテクチャおよびFull-Flow PoCに対応したテスト戦略を定義する。

## テストピラミッド

```
        /\
       /  \     E2E Tests (Playwright)
      /----\    - ユーザーフロー検証
     /      \   - 13ファイル
    /--------\
   /          \ Integration Tests (Vitest)
  /------------\- コンポーネント連携
 /              \- 27テスト
/----------------\
|                | Unit Tests (Vitest)
|                | - Controller/Service
|                | - 590+ テスト
------------------
```

## テストカテゴリ

### 1. Widget Controller単体テスト

**目的**: 各Widgetのロジック層（Controller）の動作検証

**対象**: 12個のWidget Controller

| Controller | テストファイル | テスト数 |
|------------|---------------|---------|
| BrainstormCardsController | `BrainstormCards/__tests__/BrainstormCardsController.test.ts` | 28 |
| CardSortingController | `CardSorting/__tests__/CardSortingController.test.ts` | 28 |
| DependencyMappingController | `DependencyMapping/__tests__/DependencyMappingController.test.ts` | 35 |
| EmotionPaletteController | `EmotionPalette/__tests__/EmotionPaletteController.test.ts` | 28 |
| MatrixPlacementController | `MatrixPlacement/__tests__/MatrixPlacementController.test.ts` | 35 |
| MindMapController | `MindMap/__tests__/MindMapController.test.ts` | 32 |
| PrioritySliderGridController | `PrioritySliderGrid/__tests__/PrioritySliderGridController.test.ts` | 28 |
| QuestionCardChainController | `QuestionCardChain/__tests__/QuestionCardChainController.test.ts` | 28 |
| StructuredSummaryController | `StructuredSummary/__tests__/StructuredSummaryController.test.ts` | 35 |
| SwotAnalysisController | `SwotAnalysis/__tests__/SwotAnalysisController.test.ts` | 28 |
| TimelineSliderController | `TimelineSlider/__tests__/TimelineSliderController.test.ts` | 35 |
| TradeoffBalanceController | `TradeoffBalance/__tests__/TradeoffBalanceController.test.ts` | 34 |

**テスト項目**:
- 初期化（デフォルト値、カスタム値）
- CRUD操作（追加、更新、削除）
- 状態管理（getState(), 選択状態）
- バリデーション（不正入力、エラーハンドリング）
- WidgetResult生成（getResult()）
- サマリー生成（generateSummary()）
- リセット（reset()）

### 2. Widget統合テスト

**目的**: Widgetコンポーネントの統合動作検証

**ファイル**: `src/components/widgets/v3/__tests__/integration.test.tsx`

**テスト項目**:
- マウント/アンマウント
- onUpdate/onCompleteコールバック
- WidgetResult生成
- エラーハンドリング
- 複数Widget同時レンダリング
- config反映

### 3. Widget E2Eテスト

**目的**: ブラウザ上でのエンドツーエンド動作検証

**ランナー**: Playwright

**対象**: 各Widget（13ファイル）

### 4. サービス層テスト

**目的**: フロントエンドサービスの動作検証

**対象**:
- `DependencyExecutor` - 依存関係実行エンジン
- `DependencyGraph` - 依存グラフ管理
- その他サービス

### 5. 型定義テスト

**目的**: TypeScript型定義の整合性検証

**対象**:
- `ui-spec.types.test.ts` - UISpec型
- `widget.types.test.ts` - Widget型
- `result.types.test.ts` - Result型

---

## テスト実行方法

### フロントエンド（Vitest）

**重要**: `bun test`ではなく`bun run test`を使用

```bash
cd concern-app

# 全テスト実行
bun run test

# 特定ファイル
bun run test src/components/widgets/v3/*/__tests__/*Controller.test.ts

# ウォッチモード
bun run test:watch

# カバレッジ
bun run test:coverage
```

### フロントエンド（Playwright）

```bash
cd concern-app
bun run test:e2e
```

### サーバー

```bash
cd server
bun test
```

### 統合テスト

```bash
node tests/run_all_tests.js
```

---

## テストファイル配置規則

### 単体テスト
```
src/components/widgets/v3/{WidgetName}/__tests__/{WidgetName}Controller.test.ts
```

### E2Eテスト
```
src/components/widgets/v3/{WidgetName}/__tests__/{WidgetName}.spec.ts
```

### サービステスト
```
src/services/{ServiceName}/__tests__/{ServiceName}.test.ts
```

---

## 命名規則

### テストファイル
- 単体テスト: `*.test.ts` / `*.test.tsx`
- E2Eテスト: `*.spec.ts`

### テストケース
- 日本語で記述
- `describe`でグループ化
- 期待動作を明確に記述

```typescript
describe('ControllerName', () => {
  describe('初期化', () => {
    test('デフォルト値で初期化できる', () => { ... });
    test('カスタム値で初期化できる', () => { ... });
  });
});
```

---

## カバレッジ目標

| カテゴリ | 目標 | 現状 |
|---------|-----|------|
| Widget Controller | 100% | 100% |
| Widget Component | 80% | - |
| Services | 80% | - |
| Types | 100% | 100% |

---

## CI/CD統合

### GitHub Actions

```yaml
- name: Run Tests
  run: |
    cd concern-app
    bun run test
```

---

## 参考資料

- `specs/testing/test-improvement-report.md` - テスト改善作業報告書
- `tests/README.md` - テストディレクトリ説明
- `tests/legacy/README.md` - レガシーテスト説明

---

*最終更新: 2025-11-28*
