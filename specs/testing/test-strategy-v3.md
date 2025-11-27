# テスト戦略 V3

**Version**: 3.0
**最終更新**: 2025-11-28

---

## 1. 概要

DSL v3およびFull-Flowシステムのテスト戦略。

### 1.1 テスト分類

| カテゴリ | 目的 | ツール |
|---------|------|--------|
| Unit | 関数・クラス単体 | Vitest |
| Integration | コンポーネント連携 | Vitest |
| E2E | Widget操作・UIフロー | Playwright |

### 1.2 テスト配置方針

```
src/
├── component/
│   └── __tests__/
│       ├── Component.test.tsx    # Vitestユニット
│       └── Component.spec.ts     # Playwright E2E
├── services/
│   └── __tests__/
│       └── Service.test.ts       # Vitestユニット
└── hooks/
    └── __tests__/
        └── useHook.test.tsx      # Vitestユニット
```

---

## 2. Widget v3テスト

### 2.1 テスト対象一覧

| Widget | Unit | Controller | E2E | ステータス |
|--------|------|------------|-----|-----------|
| BrainstormCards | ✅ | ✅ | ✅ | 完了 |
| CardSorting | - | - | ✅ | E2Eのみ |
| DependencyMapping | - | - | ✅ | E2Eのみ |
| EmotionPalette | ✅ | ✅ | ✅ | 完了 |
| MatrixPlacement | ✅ | ✅ | ✅ | 完了 |
| MindMap | - | - | ✅ | E2Eのみ |
| PrioritySliderGrid | ✅ | ✅ | ✅ | 完了 |
| QuestionCardChain | - | - | ✅ | E2Eのみ |
| StructuredSummary | - | - | ✅ | E2Eのみ |
| SwotAnalysis | - | - | ✅ | E2Eのみ |
| TimelineSlider | - | - | ✅ | E2Eのみ |
| TradeoffBalance | - | - | ✅ | E2Eのみ |

### 2.2 ファイル構成

```
concern-app/src/components/widgets/v3/
├── BrainstormCards/
│   └── __tests__/
│       ├── BrainstormCards.test.tsx        # Vitest: React
│       ├── BrainstormCardsController.test.ts # Vitest: Controller
│       └── BrainstormCards.spec.ts         # Playwright: E2E
├── __tests__/
│   ├── integration.test.tsx                # 統合テスト
│   └── ReactivePort.spec.ts                # リアクティブポートE2E
└── ...
```

### 2.3 テストパターン

#### Unitテスト（Vitest）

```typescript
// BrainstormCards.test.tsx
describe('BrainstormCards', () => {
  it('renders with default props', () => {
    render(<BrainstormCards spec={mockSpec} onComplete={vi.fn()} />);
    expect(screen.getByText('アイデアを追加')).toBeInTheDocument();
  });

  it('adds card on button click', async () => {
    const onUpdate = vi.fn();
    render(<BrainstormCards spec={mockSpec} onComplete={vi.fn()} onUpdate={onUpdate} />);

    await userEvent.click(screen.getByText('追加'));
    expect(onUpdate).toHaveBeenCalled();
  });
});
```

#### Controllerテスト（Vitest）

```typescript
// BrainstormCardsController.test.ts
describe('BrainstormCardsController', () => {
  it('initializes with empty cards', () => {
    const controller = new BrainstormCardsController();
    expect(controller.getCards()).toEqual([]);
  });

  it('adds card correctly', () => {
    const controller = new BrainstormCardsController();
    controller.addCard('テストアイデア');
    expect(controller.getCards()).toHaveLength(1);
  });
});
```

#### E2Eテスト（Playwright）

```typescript
// BrainstormCards.spec.ts
test.describe('BrainstormCards E2E', () => {
  test('user can add and remove cards', async ({ page }) => {
    await page.goto('/dev-demo/widget-showcase');

    await page.click('[data-testid="add-card"]');
    await page.fill('[data-testid="card-input"]', 'テストカード');
    await page.click('[data-testid="save-card"]');

    await expect(page.locator('.card')).toHaveCount(1);
  });
});
```

---

## 3. ReactiveBindingEngineテスト

### 3.1 テストファイル

| ファイル | 内容 |
|---------|------|
| `DependencyGraph.test.ts` | グラフ構造・循環検出 |
| `DependencyExecutor.test.ts` | 変換実行 |
| `ReactiveBindingEngine.test.ts` | エンジン統合 |
| `ReactiveIntegration.test.ts` | Widget連携統合 |

### 3.2 テスト項目

```typescript
describe('ReactiveBindingEngine', () => {
  // 基本操作
  it('initializes port values');
  it('updates port with debounce');
  it('propagates values to dependent ports');

  // 依存関係
  it('detects circular dependencies');
  it('respects max propagation depth');

  // バリデーション
  it('tracks widget completion state');
  it('aggregates validation errors');

  // ライフサイクル
  it('flushes pending updates');
  it('disposes resources on cleanup');
});
```

---

## 4. Hooksテスト

### 4.1 テストファイル

| ファイル | 対象Hook |
|---------|----------|
| `useFlowValidation.test.tsx` | useFlowValidation |
| `useReactivePorts.test.tsx` | useReactivePorts |

### 4.2 テストパターン

```typescript
// useFlowValidation.test.tsx
describe('useFlowValidation', () => {
  it('returns canProceed=true when all widgets complete');
  it('returns canProceed=false when widget has error');
  it('lists incomplete widgets');
});

// useReactivePorts.test.tsx
describe('useReactivePorts', () => {
  it('initializes port values from spec');
  it('provides updatePort function');
  it('syncs with engine updates');
});
```

---

## 5. サーバーテスト

### 5.1 テストファイル構成

```
server/
├── src/
│   ├── definitions/__tests__/
│   │   └── widgets.test.ts            # Widget定義
│   ├── generators/__tests__/
│   │   └── WidgetDefinitionGenerator.test.ts  # プロンプト生成
│   └── types/__tests__/
│       └── WidgetDefinition.test.ts   # 型定義
└── test/
    ├── gemini_service.test.ts         # LLMサービス
    ├── uispec_generation.test.ts      # UISpec生成
    ├── thought_api.test.ts            # Thought API
    └── task_api.test.ts               # Task API
```

### 5.2 テスト項目

```typescript
// Widget定義テスト
describe('Widget Definitions', () => {
  it('all widgets have required fields');
  it('port definitions are valid');
  it('metadata constraints are in range');
});

// UISpec生成テスト
describe('UISpecGeneratorV3', () => {
  it('generates valid UISpec for diverge stage');
  it('handles bottleneck-based widget selection');
  it('falls back on generation failure');
});
```

---

## 6. E2Eテストシナリオ

### 6.1 Full-Flowシナリオ

```typescript
test.describe('Full-Flow E2E', () => {
  test('complete flow: capture → plan → breakdown', async ({ page }) => {
    // 1. Capture
    await page.goto('/');
    await page.fill('[data-testid="concern-input"]', 'テスト関心事');
    await page.click('[data-testid="submit-concern"]');

    // 2. Plan - Diverge
    await expect(page.locator('[data-testid="stage-diverge"]')).toBeVisible();
    // Widget操作...
    await page.click('[data-testid="next-stage"]');

    // 3. Plan - Organize
    await expect(page.locator('[data-testid="stage-organize"]')).toBeVisible();
    // ...

    // 4. Plan - Converge
    // ...

    // 5. Plan - Summary
    // ...

    // 6. Breakdown
    await expect(page.locator('[data-testid="tasks-list"]')).toBeVisible();
  });
});
```

### 6.2 Widget連携シナリオ

```typescript
test.describe('Widget Integration', () => {
  test('data flows between widgets via dependencies', async ({ page }) => {
    await page.goto('/dev-demo/reactive-demo');

    // Widget Aに入力
    await page.fill('[data-testid="widget-a-input"]', 'テスト値');

    // Widget Bに伝播確認
    await expect(page.locator('[data-testid="widget-b-output"]'))
      .toHaveText('テスト値');
  });
});
```

---

## 7. テスト実行

### 7.1 コマンド

```bash
# Frontend (concern-app/)
bun run test                 # Vitest全実行
bun run test:watch           # ウォッチモード
bun run test:e2e             # Playwright E2E

# Server (server/)
bun run test                 # 全テスト
bun run test -- --watch      # ウォッチモード

# 特定テスト実行
bun run test -- BrainstormCards
bun run test -- --grep "Widget"
```

### 7.2 CI/CD連携

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Server Tests
        run: |
          cd server
          bun install
          bun run test

      - name: Frontend Tests
        run: |
          cd concern-app
          bun install
          bun run test

      - name: E2E Tests
        run: |
          cd concern-app
          bun run test:e2e
```

---

## 8. カバレッジ目標

| カテゴリ | 目標 | 現状 |
|---------|------|------|
| ReactiveBindingEngine | 80% | 〜80% |
| Widget Controllers | 70% | 〜40% |
| Widget Components | 60% | 〜30% |
| Server Services | 70% | 〜50% |
| E2E Flows | 全フロー | 部分的 |

---

## 9. 今後の課題

### 9.1 追加すべきテスト

- [ ] Widget Controller テスト（8件未実装）
- [ ] Widget Component ユニットテスト（8件未実装）
- [ ] Full-Flow E2Eテスト
- [ ] パフォーマンステスト

### 9.2 改善項目

- [ ] テストデータのファクトリ化
- [ ] モック共通化
- [ ] CI実行時間の最適化

---

## 10. 関連ファイル

| ファイル | 説明 |
|---------|------|
| `concern-app/vitest.config.ts` | Vitest設定 |
| `concern-app/playwright.config.ts` | Playwright設定 |
| `server/bunfig.toml` | Bun test設定 |
| `specs/project/phase5/test-organization-report.md` | テスト整理報告 |
