# Phase 4 詳細タスク計画書 Rev.2

**作成日**: 2025-01-17
**目的**: DSL v3実装とWidget-to-Widget Reactivityの実現
**期間**: 7日間
**責任者**: TK

---

## 📋 プロジェクト概要

### 目標
1. Domain-Specific動的UI生成システムの完成（v2→v3移行）
2. Widget-to-Widget Reactivityの実装と検証
3. トークン削減率30%以上の達成
4. 評価実験データの収集と分析

### 成果物
- [ ] DSL v3パーサー実装
- [ ] **12個のプリセットWidget実装**（DSLv3 Plan Requirements v3.0から選定）
- [ ] Dependency Graph実装
- [ ] 専門家評価レポート（10ケース）
- [ ] ユーザー評価レポート（5名×2セッション）
- [ ] 論文用エビデンス（グラフ、表、統計データ）

---

## 📅 Day 1-2: コアシステム実装

### 🎯 タスク1.1: Widget共通インターフェース定義

**要求**
全Widgetが統一されたインターフェースを持ち、結果を構造化して出力できるようにする。

**開始条件**
- [ ] DSL v3仕様が確定している
- [ ] TypeScript環境が整っている
- [ ] 既存システム（v2）が動作している

**実装ファイル**
```
concern-app/src/types/
├── ui-spec.types.ts        # UISpec/OODM/DpG型定義（DSL層）
├── widget.types.ts         # Widget仕様・設定の型定義
├── result.types.ts         # Widget結果の型定義
└── __tests__/
    ├── ui-spec.types.test.ts
    └── widget.types.test.ts
```

**実装内容**
1. **UISpec階層構造（DSL層）** - `ui-spec.types.ts`
   - `UISpec`: 画面全体の仕様
   - `WidgetSpec`: 個別Widgetの仕様（プリセットWidgetへの参照+設定）
   - `OODM`: Object-Oriented Data Model（DSLv3のEntity/Attribute構造を統合）
   - `DependencyGraphSpec`: Widget間の依存関係定義
   - `WidgetComponentType`: 12種のプリセットWidget ID

2. **OODM/Entity/Attribute構造** - `ui-spec.types.ts`
   - `Entity`: データエンティティ（DSLv3 Core Spec v3.0から統合）
   - `Attribute`: エンティティの属性
   - `SVAL`, `ARRY`, `DICT`, `PNTR`: プリミティブ型
   - `Constraint`: 制約定義

3. **Widget仕様（DSL）** - `widget.types.ts`
   - `WidgetSpec`: id, component, stage, config, reactiveBindings, metadata
   - `WidgetConfig`: Widget固有の設定
   - `WidgetMetadata`: timing, versatility, bottleneck
   - `ReactiveBinding`: Widget間の依存関係

4. **Widget結果（実装）** - `result.types.ts`
   - `WidgetResult`: widgetId, component, timestamp, summary, data, interactions
   - `StructuredData`: selection/ranking/mapping/text/composite型
   - `UserInteraction`: ユーザー操作記録

**成功条件**
- [ ] 全ての型定義がコンパイルエラーなし
- [ ] JSDocコメントが全ての公開型に記載
- [ ] 型の使用例がテストコードに含まれる
- [ ] 循環参照がない

**テスト項目**
```typescript
// concern-app/src/types/__tests__/widget.types.test.ts

describe('WidgetSpec型', () => {
  test('必須フィールドを持つ有効なWidgetSpecを作成できる', () => {
    const spec: WidgetSpec = {
      id: 'test_widget_1',
      component: 'emotion_palette',
      stage: 'diverge',
      config: { prompt: 'テスト' },
      metadata: { timing: 0.1, versatility: 0.8, bottleneck: ['感情的ブロック'] }
    };
    expect(spec.id).toBe('test_widget_1');
  });

  test('ReactiveBindingを含むWidgetSpecを作成できる', () => {
    const spec: WidgetSpec = {
      // ... 基本フィールド
      reactiveBindings: [{
        source: 'widget1.value',
        target: 'widget2.config',
        mechanism: 'update',
        relationship: { type: 'transform' },
        updateMode: 'realtime'
      }]
    };
    expect(spec.reactiveBindings).toHaveLength(1);
  });
});

describe('WidgetResult型', () => {
  test('構造化されたselection型の結果を作成できる', () => {
    const result: WidgetResult = {
      widgetId: 'test_1',
      component: 'emotion_palette',
      timestamp: Date.now(),
      summary: '不安を70%の強さで感じています',
      data: {
        type: 'selection',
        selection: {
          selected: '不安',
          options: ['不安', '喜び', '怒り'],
          metadata: { intensity: 0.7 }
        }
      }
    };
    expect(result.data.type).toBe('selection');
  });
});
```

**受け入れ基準**
- [ ] `npm run type-check` がエラーなし
- [ ] `npm test -- widget.types.test.ts` が全項目PASS
- [ ] コードレビュー完了

---

### 🎯 タスク1.2: Dependency Graph実装

**要求**
Widget間の依存関係を管理し、循環依存の検出、更新順序の決定、リアクティブな値の伝播を実現する。

**開始条件**
- [ ] Widget共通インターフェースが定義済み
- [ ] Jotai（v2.10+）がインストール済み

**実装ファイル**
```
concern-app/src/services/ui/
├── DependencyGraph.ts
├── DependencyExecutor.ts      # 依存関係の実行エンジン
└── __tests__/
    ├── DependencyGraph.test.ts
    └── DependencyExecutor.test.ts
```

**実装内容**

1. **DependencyGraph.ts**
   - 依存関係の追加/削除
   - 循環依存の検出（DFS）
   - トポロジカルソート（更新順序計算）
   - 依存関係の可視化（デバッグ用）

2. **DependencyExecutor.ts**
   - JavaScriptスニペットの安全な実行
   - 組み込み変換関数の実行
   - バリデーション処理
   - エラーハンドリング

**成功条件**
- [ ] 依存関係の追加・削除が正常動作
- [ ] 循環依存を検出してエラーをthrow
- [ ] トポロジカルソートで正しい更新順序を返す
- [ ] JavaScriptスニペットを安全に実行できる
- [ ] 100個の依存関係を処理しても50ms以内

**テスト項目**
```typescript
// concern-app/src/services/ui/__tests__/DependencyGraph.test.ts

describe('DependencyGraph', () => {
  test('依存関係を追加できる', () => {
    const graph = new DependencyGraph();
    graph.addDependency({
      source: 'widget1.output',
      target: 'widget2.input',
      mechanism: 'update',
      relationship: { type: 'javascript', javascript: 'target.value = source.value * 2' },
      updateMode: 'realtime'
    });

    expect(graph.getEdgeCount()).toBe(1);
  });

  test('循環依存を検出する', () => {
    const graph = new DependencyGraph();
    graph.addDependency({ source: 'A.out', target: 'B.in', /* ... */ });
    graph.addDependency({ source: 'B.out', target: 'C.in', /* ... */ });

    expect(() => {
      graph.addDependency({ source: 'C.out', target: 'A.in', /* ... */ });
    }).toThrow(/Circular dependency detected/);
  });

  test('トポロジカルソートで更新順序を計算する', () => {
    const graph = new DependencyGraph();
    graph.addDependency({ source: 'A.out', target: 'B.in', /* ... */ });
    graph.addDependency({ source: 'B.out', target: 'C.in', /* ... */ });

    const order = graph.getUpdateOrder();

    // Aが最初、Cが最後であることを確認
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'));
  });

  test('JavaScriptスニペットを安全に実行する', () => {
    const executor = new DependencyExecutor();
    const result = executor.executeTransform(
      { type: 'javascript', javascript: 'return source.value * 2;' },
      { value: 10 }
    );

    expect(result).toBe(20);
  });

  test('悪意のあるコードを実行しない', () => {
    const executor = new DependencyExecutor();

    expect(() => {
      executor.executeTransform(
        { type: 'javascript', javascript: 'eval("alert(1)")' },
        { value: 10 }
      );
    }).toThrow(/Unsafe code detected/);
  });
});
```

**パフォーマンステスト**
```typescript
test('100個の依存関係を高速処理できる', () => {
  const graph = new DependencyGraph();

  // 100個の依存関係を追加
  for (let i = 0; i < 99; i++) {
    graph.addDependency({
      source: `widget${i}.out`,
      target: `widget${i+1}.in`,
      mechanism: 'update',
      relationship: { type: 'javascript', javascript: 'return source;' },
      updateMode: 'realtime'
    });
  }

  const startTime = performance.now();
  const order = graph.getUpdateOrder();
  const endTime = performance.now();

  expect(order).toHaveLength(100);
  expect(endTime - startTime).toBeLessThan(50); // 50ms以内
});
```

**受け入れ基準**
- [ ] 全単体テストPASS
- [ ] パフォーマンステストPASS
- [ ] セキュリティテストPASS（悪意のあるコード実行防止）
- [ ] コードカバレッジ80%以上

---

### 🎯 タスク1.3: State管理システム構築

**要求**
Jotaiを使用してWidget間のリアクティブなデータフローを実現し、State管理を一元化する。

**開始条件**
- [ ] Widget共通インターフェース定義済み
- [ ] Dependency Graph実装済み
- [ ] Jotai導入済み

**実装ファイル**
```
concern-app/src/store/
├── widgetAtoms.ts           # Widget atomの動的生成
├── derivedAtoms.ts          # 派生atom管理
└── __tests__/
    ├── widgetAtoms.test.ts
    └── reactiveFlow.test.ts

concern-app/src/hooks/
├── useReactiveBinding.ts    # Reactive Binding用フック
├── useWidgetState.ts        # Widget State管理フック
└── __tests__/
    └── hooks.test.ts
```

**実装内容**

1. **widgetAtoms.ts**
   - Widget IDをキーとしたatom管理Map
   - atomの動的生成関数
   - atomのクリーンアップ

2. **useReactiveBinding.ts**
   ```typescript
   export function useReactiveBinding(
     sourceAtomKey: string,
     targetAtomKey: string,
     transform: (source: any) => any,
     updateMode: 'realtime' | 'debounced' | 'on_confirm'
   ): void
   ```

3. **useWidgetState.ts**
   ```typescript
   export function useWidgetState<T>(
     widgetId: string,
     initialValue: T
   ): [T, (value: T) => void]
   ```

**成功条件**
- [ ] Widget毎に独立したatomが生成される
- [ ] 派生atomが自動更新される
- [ ] Reactive Bindingがリアルタイムで動作
- [ ] デバウンス機能が正常動作（300ms）
- [ ] メモリリークがない（unmount時にatomをクリーンアップ）

**テスト項目**
```typescript
// concern-app/src/store/__tests__/widgetAtoms.test.ts

describe('widgetAtoms', () => {
  test('Widget atomを動的生成できる', () => {
    const atom = createWidgetAtom('test_widget_1', { value: 10 });
    expect(atom).toBeDefined();
  });

  test('同じIDで2回呼ぶと同じatomを返す', () => {
    const atom1 = createWidgetAtom('test_widget_1', { value: 10 });
    const atom2 = createWidgetAtom('test_widget_1', { value: 20 });
    expect(atom1).toBe(atom2);
  });
});

describe('Reactive Binding', () => {
  test('ソースの変更がターゲットに伝播する', async () => {
    const { result } = renderHook(() => {
      const [source, setSource] = useWidgetState('source_widget', 10);
      const [target] = useWidgetState('target_widget', 0);

      useReactiveBinding(
        'source_widget',
        'target_widget',
        (val) => val * 2,
        'realtime'
      );

      return { source, setSource, target };
    });

    // sourceを更新
    act(() => {
      result.current.setSource(20);
    });

    // targetが自動更新されることを確認
    await waitFor(() => {
      expect(result.current.target).toBe(40);
    });
  });

  test('デバウンスモードで300ms待機する', async () => {
    // ... デバウンステスト
  });
});
```

**受け入れ基準**
- [ ] 全単体テストPASS
- [ ] メモリリークテストPASS
- [ ] Jotai DevToolsで状態確認可能
- [ ] コードカバレッジ75%以上

---

## 📅 Day 3-4: Widget開発

### 🎯 タスク2.1: プリセットWidget実装（12種）

**要求**
12種のプリセットWidgetを段階的に実装する。まず基本4種でPoCを確認後、残り8種を実装。

**12種のプリセットWidget**（DSLv3 Plan Requirements v3.0から選定）

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

**実装ファイル構造**
```
concern-app/src/components/widgets/v3/
├── EmotionPalette/
│   ├── EmotionPalette.tsx
│   ├── EmotionPaletteController.ts
│   ├── EmotionPalette.module.css
│   └── __tests__/EmotionPalette.test.tsx
├── BrainstormCards/
│   └── ...（同様の構造）
├── MatrixPlacement/
│   └── ...
├── PrioritySliderGrid/
│   └── ...
└── [残り8種も同様の構造]
```

**各Widgetの成功条件**

#### EmotionPalette
- [ ] 8種類の感情から選択可能
- [ ] 強度スライダー（0-100%）が動作
- [ ] `getResult()`が以下を返す：
  ```typescript
  {
    summary: "不安を70%の強さで感じています",
    data: {
      type: 'composite',
      composite: {
        emotion: "不安",
        intensity: 0.7,
        intensityLevel: "high",
        emotionCategory: "negative"
      }
    }
  }
  ```
- [ ] UI操作がスムーズ（ラグなし）
- [ ] アクセシビリティ対応（キーボード操作可能）

#### PrioritySliderGrid
- [ ] 複数項目×複数軸のスライダー表示
- [ ] ランキングがリアルタイム更新
- [ ] リソース配分が自動計算
- [ ] Widget-to-Widget Reactivityが動作
- [ ] 100回の更新が1秒以内

**統合テスト**
```typescript
// concern-app/src/components/widgets/v3/__tests__/integration.test.tsx

describe('Widget間データフロー', () => {
  test('EmotionPalette → MatrixPlacement のデータ伝播', async () => {
    const { getByRole, findByText } = render(
      <WidgetFlow>
        <EmotionPalette spec={emotionSpec} />
        <MatrixPlacement spec={matrixSpec} />
      </WidgetFlow>
    );

    // 感情選択
    const emotionButton = getByRole('button', { name: '不安' });
    fireEvent.click(emotionButton);

    // MatrixのX軸ラベルに反映されることを確認
    const xAxisLabel = await findByText(/不安への対処/);
    expect(xAxisLabel).toBeInTheDocument();
  });

  test('PrioritySliderGrid のReactive更新', async () => {
    const { getByLabelText, findByText } = render(
      <PrioritySliderGrid spec={sliderSpec} />
    );

    // スライダーを調整
    const slider = getByLabelText('重要度: プロジェクトA');
    fireEvent.change(slider, { target: { value: 90 } });

    // ランキングが即座に更新されることを確認
    const ranking = await findByText(/1\. プロジェクトA/);
    expect(ranking).toBeInTheDocument();
  });
});
```

**受け入れ基準**
- [ ] 全Widget単体テストPASS
- [ ] 統合テストPASS
- [ ] パフォーマンステストPASS
- [ ] ビジュアルリグレッションテストPASS
- [ ] アクセシビリティテストPASS（WCAG 2.1 AA準拠）

---

### 🎯 タスク2.2: Reactive Widget追加実装

**要求**
Widget-to-Widget Reactivityの3つのパターンを実装する。

**実装するReactiveパターン**
1. TradeoffBalance（重み付けリスト → 天秤バランス表示）
2. DependencyMapping（ノード接続 → クリティカルパス表示）
3. SWOTAnalysis（SWOT配置 → 不足情報リスト生成）

**各パターンの成功条件**

#### TradeoffBalance
- [ ] 左側でリスク要因の重み付け可能
- [ ] 右側の天秤が即座に傾く
- [ ] バランススコア（-1.0〜1.0）を計算
- [ ] アニメーションがスムーズ

#### DependencyMapping
- [ ] ノードをドラッグで接続可能
- [ ] クリティカルパスが自動ハイライト
- [ ] 依存関係のループを検出

#### SWOTAnalysis
- [ ] 4象限にカードをドラッグ配置
- [ ] 不足情報リストが自動生成
- [ ] LLMによる不足情報推論（オプション）

**パフォーマンステスト**
```typescript
test('Reactive更新のレイテンシ', () => {
  const { getByLabelText } = render(<TradeoffBalance spec={spec} />);

  const startTime = performance.now();

  // 10個のスライダーを連続更新
  for (let i = 0; i < 10; i++) {
    const slider = getByLabelText(`リスク${i}`);
    fireEvent.change(slider, { target: { value: Math.random() * 100 } });
  }

  const endTime = performance.now();

  // 全更新が100ms以内に完了
  expect(endTime - startTime).toBeLessThan(100);
});
```

**受け入れ基準**
- [ ] 3パターン全てで即座に更新される（100ms以内）
- [ ] 無限ループが発生しない
- [ ] エラーハンドリング実装済み
- [ ] ユーザビリティテストPASS（操作が直感的）

---

## 📅 Day 5-6: 評価実験

### 🎯 タスク3.1: 専門家評価システム構築

**要求**
10ケースの悩みに対してUIフローを自動生成し、評価データを収集する。

**実装ファイル**
```
tests/evaluation/
├── expert_evaluation.ts      # 自動評価スクリプト
├── test_cases.json          # 10ケースの定義
├── evaluation_form.ts       # 評価フォーム
└── results/
    ├── case1_result.json
    └── ...
```

**評価ケース定義**
```json
{
  "cases": [
    {
      "id": "case1_selection_overload",
      "concern": "転職先候補が10社あって決められない。業界も職種もバラバラで比較できない",
      "expectedBottleneck": ["選択肢が多すぎる", "情報が整理されていない"],
      "expectedComponents": ["brainstorm_cards", "card_sorting", "matrix_placement"],
      "hasReactivity": false,
      "priority": "high"
    },
    {
      "id": "case2_emotion_block",
      "concern": "新規事業を提案したいが、失敗したら評価が下がるのが怖い",
      "expectedBottleneck": ["感情的ブロック", "決断への恐れ"],
      "expectedComponents": ["emotion_palette", "timeline_slider", "tradeoff_balance"],
      "hasReactivity": true,
      "reactivityType": "balance_visualization",
      "priority": "high"
    }
    // ... 全10ケース
  ]
}
```

**自動評価スクリプト**
```typescript
// tests/evaluation/expert_evaluation.ts

async function runExpertEvaluation() {
  const testCases = loadTestCases('test_cases.json');
  const results = [];

  for (const testCase of testCases) {
    console.log(`\n評価中: ${testCase.id}`);

    // UIフロー生成
    const startTime = Date.now();
    const uiFlow = await generateUIFlow(testCase.concern);
    const endTime = Date.now();

    // メトリクス収集
    const metrics = {
      caseId: testCase.id,
      generationTime: endTime - startTime,
      tokenUsage: uiFlow.tokenCount,
      syntaxValid: validateDSL(uiFlow.dsl),
      componentsGenerated: uiFlow.components.map(c => c.type),
      hasExpectedReactivity: checkReactivity(uiFlow.dpg, testCase),
      errors: uiFlow.errors || []
    };

    results.push(metrics);

    // 結果を保存
    saveResult(`results/case${testCase.id}_result.json`, {
      testCase,
      uiFlow,
      metrics
    });
  }

  // 集計レポート生成
  generateSummaryReport(results);
}
```

**成功条件**
- [ ] 10ケース全てでUIフロー生成成功
- [ ] 構文エラー率10%以下
- [ ] 平均生成時間2秒以内
- [ ] トークン使用量を全ケースで記録

**テスト実行**
```bash
# 専門家評価実行
npm run evaluate:expert

# 期待される出力
✓ Case 1: 生成成功 (1.8s, 1,950 tokens)
✓ Case 2: 生成成功 (2.1s, 2,100 tokens)
...
✓ Case 10: 生成成功 (1.9s, 1,880 tokens)

Summary:
- 成功率: 100% (10/10)
- 平均生成時間: 1.9s
- 平均トークン数: 1,980
- vs Jelly推定値 (2,800): 29% 削減
```

**受け入れ基準**
- [ ] 成功率90%以上（9/10ケース以上）
- [ ] トークン削減率25%以上
- [ ] 評価データが構造化されている

---

### 🎯 タスク3.2: ユーザー評価実験実施

**要求**
5名の被験者に対してユーザビリティテストを実施し、定量・定性データを収集する。

**実験プロトコル**
```
1. 事前準備（5分）
   - 同意書取得
   - デモグラフィック情報収集
   - 事前アンケート

2. アプリ使用（30分）
   - Captureフェーズ（悩み入力）: 5分
   - Planフェーズ（UI操作）: 20分
   - Breakdownフェーズ（結果確認）: 5分

3. 事後評価（5分）
   - 事後アンケート（5段階評価）

4. インタビュー（15分）
   - 半構造化インタビュー
```

**データ収集システム**
```typescript
// concern-app/src/services/evaluation/UserSessionTracker.ts

export class UserSessionTracker {
  private sessionId: string;
  private startTime: number;
  private interactions: UserInteraction[] = [];
  private widgetResults: WidgetResult[] = [];

  startSession(userId: string) {
    this.sessionId = generateSessionId();
    this.startTime = Date.now();

    // ロギング開始
    this.enableEventTracking();
  }

  trackInteraction(interaction: UserInteraction) {
    this.interactions.push({
      ...interaction,
      timestamp: Date.now() - this.startTime
    });
  }

  saveSession() {
    const sessionData = {
      sessionId: this.sessionId,
      userId: this.userId,
      duration: Date.now() - this.startTime,
      interactions: this.interactions,
      widgetResults: this.widgetResults,
      surveyResponses: this.surveyResponses
    };

    // サーバーに送信
    sendToServer('/api/evaluation/session', sessionData);
  }
}
```

**アンケート項目**
```typescript
const surveyQuestions = [
  {
    id: 'q1',
    text: 'このUIフローは自分の悩みに合っていましたか？',
    type: 'likert',
    scale: 5,
    labels: ['全く合わない', '合わない', 'どちらでもない', '合う', 'とても合う']
  },
  {
    id: 'q2',
    text: '思考が整理されましたか？',
    type: 'likert',
    scale: 5
  },
  {
    id: 'q3',
    text: '前の回答が次の画面に反映されていると感じましたか？',
    type: 'likert',
    scale: 5
  },
  {
    id: 'q4',
    text: '操作は分かりやすかったですか？',
    type: 'likert',
    scale: 5
  },
  {
    id: 'q5',
    text: 'このアプリをまた使いたいと思いますか？',
    type: 'likert',
    scale: 5
  }
];
```

**成功条件**
- [ ] 5名×2セッション = 10セッション完了
- [ ] インタラクションログ収集率100%
- [ ] アンケート回答率100%
- [ ] インタビュー実施率100%
- [ ] 平均満足度3.0/5以上

**受け入れ基準**
- [ ] 全セッションデータが保存されている
- [ ] データ欠損がない
- [ ] 倫理的配慮が守られている（同意書取得済み）

---

## 📅 Day 7: データ分析と改善

### 🎯 タスク4.1: 評価データ分析

**要求**
収集したデータを分析し、論文用のエビデンスを生成する。

**分析項目**
1. トークン削減率の算出
2. Widget-to-Widget Reactivityの効果分析
3. ユーザー満足度の統計分析
4. 専門家評価スコアの集計

**実装ファイル**
```
analysis/
├── token_analysis.py         # トークン分析
├── reactivity_analysis.py    # Reactivity効果分析
├── user_satisfaction.py      # 満足度分析
├── expert_evaluation.py      # 専門家評価集計
└── generate_paper_tables.py  # 論文用テーブル生成
```

**分析スクリプト例**
```python
# analysis/token_analysis.py

import json
import pandas as pd
import matplotlib.pyplot as plt

def calculate_token_reduction():
    # データ読み込み
    results = load_evaluation_results('results/expert_eval/')

    # トークン使用量の統計
    our_tokens = [r['tokenUsage'] for r in results]
    avg_tokens = np.mean(our_tokens)
    std_tokens = np.std(our_tokens)

    # Jelly推定値（論文から）
    jelly_baseline = 2800

    # 削減率計算
    reduction = (jelly_baseline - avg_tokens) / jelly_baseline

    # 結果出力
    print(f"平均トークン使用量: {avg_tokens:.0f} ± {std_tokens:.0f}")
    print(f"Jelly推定値: {jelly_baseline}")
    print(f"削減率: {reduction:.1%}")

    # グラフ生成
    plot_token_comparison(our_tokens, jelly_baseline)

    return {
        'avg_tokens': avg_tokens,
        'std_tokens': std_tokens,
        'reduction_rate': reduction
    }

def plot_token_comparison(our_tokens, baseline):
    plt.figure(figsize=(10, 6))
    plt.boxplot(our_tokens, labels=['Our System'])
    plt.axhline(y=baseline, color='r', linestyle='--', label='Jelly (推定値)')
    plt.ylabel('Token Count')
    plt.title('Token Usage Comparison')
    plt.legend()
    plt.savefig('paper/figures/token_comparison.png', dpi=300)
```

**生成する論文用資料**
```
paper/
├── figures/
│   ├── token_comparison.png
│   ├── reactivity_effectiveness.png
│   └── user_satisfaction.png
├── tables/
│   ├── expert_evaluation_scores.csv
│   ├── user_survey_results.csv
│   └── token_usage_stats.csv
└── summary_report.md
```

**成功条件**
- [ ] トークン削減率30%以上
- [ ] 専門家評価平均3.5/5以上
- [ ] ユーザー満足度平均3.0/5以上
- [ ] 統計的有意性を検証（t検定、p<0.05）

**テスト実行**
```bash
# 分析実行
python analysis/run_all_analysis.py

# 期待される出力
Token Analysis:
  平均: 1,980 tokens (SD: 120)
  削減率: 29.3%
  vs Jelly: p < 0.001 (有意差あり)

Expert Evaluation:
  ボトルネック診断: 4.1/5
  コンポーネント選択: 3.9/5
  フロー構成: 3.7/5
  総合評価: 3.9/5

User Satisfaction:
  UI適合度: 3.4/5
  思考整理効果: 3.6/5
  Reactivity認識: 3.5/5
  総合満足度: 3.5/5
```

**受け入れ基準**
- [ ] 分析レポート生成完了
- [ ] グラフ・図表が論文品質
- [ ] 統計検定実施済み
- [ ] 再現可能なスクリプト

---

## ✅ 全体の受け入れ基準

### 技術的要求
- [ ] DSL v3パーサーが正常動作
- [ ] **12個のプリセットWidget実装済み**（DSLv3 Plan Requirements v3.0から選定）
- [ ] Widget-to-Widget Reactivity 3パターン動作
- [ ] トークン削減率30%以上達成
- [ ] 全単体テストPASS
- [ ] 統合テストPASS
- [ ] パフォーマンステストPASS

### 品質要求
- [ ] TypeScriptコンパイルエラー0
- [ ] ESLintエラー0
- [ ] コードカバレッジ70%以上
- [ ] セキュリティテストPASS
- [ ] アクセシビリティテストPASS

### 評価要求
- [ ] 専門家評価10ケース完了
- [ ] ユーザー評価5名×2セッション完了
- [ ] データ分析完了
- [ ] 論文用エビデンス生成完了

### ドキュメント要求
- [ ] Widget実装ガイド作成
- [ ] 評価実験プロトコル文書化
- [ ] APIドキュメント更新
- [ ] README.md更新

---

## 🚨 リスク管理

### リスク1: Widget実装が遅延
**対策**: Day 3終了時点でPoC動作を最優先。残りWidgetは優先度を付けて段階的実装。

### リスク2: 評価実験の被験者確保困難
**対策**: 研究室メンバーとサークルから事前に5名を確保。予備候補2名も準備。

### リスク3: トークン削減率が目標未達
**対策**: DSL仕様の見直し、不要な要素の削除、プロンプト最適化。

### リスク4: Reactivityのパフォーマンス問題
**対策**: デバウンス設定、メモ化、仮想化の導入。

---

**作成者**: TK
**承認者**: ___________
**承認日**: ___________
