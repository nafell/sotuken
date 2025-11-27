# Phase 4 Task 2.2: Reactive Widget 実装計画

> 作成日: 2025-01-27
> 設計仕様: `specs/dsl-design/v3/ReactiveWidget-design.md`

---

## 1. 概要

### 1.1 目的

Widget間のリアクティブなデータ連携基盤を構築し、LLMが生成するDependencyGraphの正確性を検証可能にする。

**研究的意義**:
- LLM生成DSLの品質評価基盤
- 動的UI生成における依存関係表現の有効性検証
- ユーザー認知負荷への影響測定の準備

### 1.2 スコープ

**IN Scope**:
- ReactiveBindingEngine（コアロジック）
- Widget定義型システム（WidgetDefinition）
- React Adapter層（Hooks）
- 3つのReactive Widgetパターン改修
- WidgetDefinitionGenerator（LLMプロンプト生成）
- 単体テスト・統合テスト

**OUT of Scope**:
- LLM Transform（非同期API連携）→ 後続フェーズ
- realtimeモード → 必要に応じて追加
- トースト/モーダルエラー通知 → 将来拡張

### 1.3 対象Widgetパターン

| Widget | 入力 | 出力 | Reactivity |
|--------|------|------|------------|
| TradeoffBalance | 重み配列 | balance(-1.0〜1.0), direction | 重み変更→天秤即座傾斜 |
| DependencyMapping | ノード接続 | criticalPath[], hasLoop | 接続変更→パス自動ハイライト |
| SWOTAnalysis | カード配置 | gaps[], placement | 配置変更→不足リスト自動生成 |

---

## 2. 要求仕様

### 2.1 機能要求

#### FR-01: Widget定義システム
- **FR-01.1**: 各Widgetの入出力Portを型定義できる
- **FR-01.2**: Port制約（range, enum, array）を定義できる
- **FR-01.3**: 予約Port（_error, _completed）で状態を通知できる

#### FR-02: ReactiveBindingEngine
- **FR-02.1**: DependencyGraphSpecからEngineを初期化できる
- **FR-02.2**: Port値変更時にDebounce付きで伝播できる
- **FR-02.3**: Transform関数を適用して値を変換できる
- **FR-02.4**: 循環依存を検出・防止できる

#### FR-03: Widget側インターフェース
- **FR-03.1**: useReactivePortsで出力Portにemitできる
- **FR-03.2**: 入力Portから値を読み取れる
- **FR-03.3**: エラー/完了状態を自動通知できる

#### FR-04: フローバリデーション
- **FR-04.1**: 全Widgetの完了状態を集約できる
- **FR-04.2**: canProceedフラグで「次へ」ボタンを制御できる

#### FR-05: LLMプロンプト生成
- **FR-05.1**: Widget定義から簡易版プロンプトを生成できる
- **FR-05.2**: Widget定義から完全版プロンプトを生成できる
- **FR-05.3**: 生成されたDependencyGraphを検証できる

### 2.2 非機能要求

#### NFR-01: パフォーマンス
- **NFR-01.1**: 連続操作時のUI応答は16ms以内（60fps維持）
- **NFR-01.2**: Debounce後の伝播完了は100ms以内
- **NFR-01.3**: Transform実行は50ms以内

#### NFR-02: 信頼性
- **NFR-02.1**: 循環依存で無限ループが発生しない
- **NFR-02.2**: Transform失敗時に適切にエラー通知される
- **NFR-02.3**: 深度制限(10)でループ検出される

#### NFR-03: 保守性
- **NFR-03.1**: コアロジックはReact非依存
- **NFR-03.2**: 既存のonUpdate/onCompleteと後方互換
- **NFR-03.3**: TypeScript型安全性を維持

---

## 3. 受け入れ条件

### 3.1 必須条件

| ID | 条件 | 検証方法 |
|----|------|----------|
| AC-01 | WidgetDefinition型で12Widget定義可能 | 型チェックPASS |
| AC-02 | ReactiveBindingEngineが初期化できる | 単体テストPASS |
| AC-03 | Debounce(300ms)で伝播される | 単体テストPASS |
| AC-04 | 循環依存でエラーが発生する | 単体テストPASS |
| AC-05 | TradeoffBalanceでbalance出力される | 統合テストPASS |
| AC-06 | DependencyMappingでcriticalPath出力される | 統合テストPASS |
| AC-07 | SWOTAnalysisでgaps出力される | 統合テストPASS |
| AC-08 | _completedで「次へ」ボタン制御される | E2EテストPASS |
| AC-09 | WidgetDefinitionGeneratorでプロンプト生成される | 単体テストPASS |
| AC-10 | 生成DependencyGraphの検証でエラー検出される | 単体テストPASS |

### 3.2 品質条件

| ID | 条件 | 基準値 |
|----|------|--------|
| QC-01 | テストカバレッジ | 80%以上 |
| QC-02 | TypeScriptエラー | 0件 |
| QC-03 | ESLintエラー | 0件 |
| QC-04 | 連続操作時FPS | 60fps維持 |

---

## 4. 実装ステップ

### Step 1: 型定義基盤

**目的**: Widget定義の型システムを構築

**作成ファイル**:
```
server/src/types/WidgetDefinition.ts
```

**実装内容**:
- PortDataType, PortDirection, PortConstraint
- ReactivePortDefinition
- WidgetDefinition, WidgetDefinitionRegistry
- RESERVED_PORTS, ErrorPortValue, CompletedPortValue

**テスト**:
```typescript
// server/src/types/__tests__/WidgetDefinition.test.ts
describe('WidgetDefinition Types', () => {
  test('ReactivePortDefinition型が正しく定義される', () => {
    const port: ReactivePortDefinition = {
      id: 'balance',
      direction: 'out',
      dataType: 'number',
      description: 'バランス値',
      constraints: [{ type: 'range', min: -1, max: 1 }]
    };
    expect(port.id).toBe('balance');
  });

  test('WidgetDefinition型が正しく定義される', () => {
    const def: WidgetDefinition = {
      id: 'tradeoff_balance',
      name: 'トレードオフ天秤',
      description: '...',
      stage: 'converge',
      ports: { inputs: [], outputs: [] },
      metadata: { timing: 0.6, versatility: 0.7, bottleneck: [] }
    };
    expect(def.stage).toBe('converge');
  });
});
```

**受け入れ確認**:
- [ ] TypeScriptコンパイルPASS
- [ ] テストPASS

**Git操作**:
```bash
git add server/src/types/WidgetDefinition.ts server/src/types/__tests__/
git commit -m "feat(types): add WidgetDefinition type system for reactive ports"
```

---

### Step 2: Widget定義実装

**目的**: 3つのReactive Widget定義を作成

**作成ファイル**:
```
server/src/definitions/widgets.ts
```

**実装内容**:
- TradeoffBalanceDefinition
- DependencyMappingDefinition
- SwotAnalysisDefinition
- WIDGET_DEFINITIONS レジストリ

**テスト**:
```typescript
// server/src/definitions/__tests__/widgets.test.ts
describe('Widget Definitions', () => {
  test('TradeoffBalanceのPort定義が正しい', () => {
    const def = WIDGET_DEFINITIONS['tradeoff_balance'];
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'balance', dataType: 'number' })
    );
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'direction', dataType: 'string' })
    );
  });

  test('DependencyMappingのPort定義が正しい', () => {
    const def = WIDGET_DEFINITIONS['dependency_mapping'];
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'criticalPath', dataType: 'string[]' })
    );
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'hasLoop', dataType: 'boolean' })
    );
  });

  test('SwotAnalysisのPort定義が正しい', () => {
    const def = WIDGET_DEFINITIONS['swot_analysis'];
    expect(def.ports.outputs).toContainEqual(
      expect.objectContaining({ id: 'gaps', dataType: 'string[]' })
    );
  });

  test('全Widget定義が必須フィールドを持つ', () => {
    Object.values(WIDGET_DEFINITIONS).forEach(def => {
      expect(def.id).toBeDefined();
      expect(def.name).toBeDefined();
      expect(def.stage).toBeDefined();
      expect(def.ports.inputs).toBeDefined();
      expect(def.ports.outputs).toBeDefined();
    });
  });
});
```

**受け入れ確認**:
- [ ] 3Widget定義完了
- [ ] テストPASS

**Git操作**:
```bash
git add server/src/definitions/
git commit -m "feat(definitions): add TradeoffBalance, DependencyMapping, SwotAnalysis definitions"
```

---

### Step 3: ReactiveBindingEngine コア

**目的**: Debounce付き伝播エンジンを実装

**作成ファイル**:
```
concern-app/src/services/ui/ReactiveBindingEngine.ts
```

**実装内容**:
- EngineConfig, PropagationEvent, PropagationCallback
- ReactiveBindingEngine クラス
  - initPort(), updatePort(), getPortValue()
  - schedulePropagate(), executePropagation()
  - setOnPropagate(), setOnValidationError()
  - dispose()

**テスト**:
```typescript
// concern-app/src/services/ui/__tests__/ReactiveBindingEngine.test.ts
describe('ReactiveBindingEngine', () => {
  const mockDpgSpec: DependencyGraphSpec = {
    dependencies: [
      {
        source: 'widgetA.output',
        target: 'widgetB.input',
        mechanism: 'update',
        relationship: { type: 'transform', transform: 'calculate_balance' },
        updateMode: 'debounced'
      }
    ]
  };

  test('初期化できる', () => {
    const engine = new ReactiveBindingEngine(mockDpgSpec);
    expect(engine).toBeDefined();
    engine.dispose();
  });

  test('initPortでDebounceなしで値設定される', () => {
    const engine = new ReactiveBindingEngine(mockDpgSpec);
    engine.initPort('widgetA.output', 0.5);
    expect(engine.getPortValue('widgetA.output')).toBe(0.5);
    engine.dispose();
  });

  test('updatePortでDebounce後に伝播される', async () => {
    const engine = new ReactiveBindingEngine(mockDpgSpec, { defaultDebounceMs: 50 });
    const onPropagate = jest.fn();
    engine.setOnPropagate(onPropagate);

    engine.updatePort('widgetA.output', { left: 0.3, right: 0.7 });

    // Debounce前は呼ばれない
    expect(onPropagate).not.toHaveBeenCalled();

    // Debounce後に呼ばれる
    await new Promise(r => setTimeout(r, 100));
    expect(onPropagate).toHaveBeenCalled();

    engine.dispose();
  });

  test('連続更新時は最終値のみ伝播される', async () => {
    const engine = new ReactiveBindingEngine(mockDpgSpec, { defaultDebounceMs: 50 });
    const onPropagate = jest.fn();
    engine.setOnPropagate(onPropagate);

    engine.updatePort('widgetA.output', { value: 1 });
    engine.updatePort('widgetA.output', { value: 2 });
    engine.updatePort('widgetA.output', { value: 3 });

    await new Promise(r => setTimeout(r, 100));

    // 1回のみ呼ばれる
    expect(onPropagate).toHaveBeenCalledTimes(1);
    engine.dispose();
  });

  test('循環依存でエラーが発生する', () => {
    const cyclicSpec: DependencyGraphSpec = {
      dependencies: [
        { source: 'A.out', target: 'B.in', mechanism: 'update', relationship: { type: 'transform' }, updateMode: 'debounced' },
        { source: 'B.out', target: 'A.in', mechanism: 'update', relationship: { type: 'transform' }, updateMode: 'debounced' }
      ]
    };
    // DependencyGraph側で検出される
    expect(() => new ReactiveBindingEngine(cyclicSpec)).toThrow(/[Cc]ircular/);
  });

  test('深度制限でループが停止する', async () => {
    const engine = new ReactiveBindingEngine(mockDpgSpec, {
      defaultDebounceMs: 10,
      maxPropagationDepth: 3
    });

    // 意図的に深い連鎖を作る場合のテスト
    // （実際の実装では循環は静的検出されるため、このテストは参考程度）

    engine.dispose();
  });
});
```

**受け入れ確認**:
- [ ] Engine初期化成功
- [ ] Debounce動作確認
- [ ] 連続更新最適化確認
- [ ] テストPASS

**Git操作**:
```bash
git add concern-app/src/services/ui/ReactiveBindingEngine.ts
git add concern-app/src/services/ui/__tests__/ReactiveBindingEngine.test.ts
git commit -m "feat(engine): implement ReactiveBindingEngine with debounce"
```

**動作検証**:
```bash
cd concern-app && bun test ReactiveBindingEngine
```

---

### Step 4: FlowValidationState

**目的**: 予約Portによるフローバリデーション機能を追加

**変更ファイル**:
```
concern-app/src/services/ui/ReactiveBindingEngine.ts (追加)
```

**実装内容**:
- FlowValidationState型
- getFlowValidationState()
- setOnValidationStateChange()
- 予約Port更新時の自動通知

**テスト**:
```typescript
// ReactiveBindingEngine.test.ts に追加
describe('FlowValidationState', () => {
  test('全Widget完了時にcanProceed=true', () => {
    const engine = new ReactiveBindingEngine({ dependencies: [] });

    engine.initPort('widget1._completed', { isCompleted: true });
    engine.initPort('widget2._completed', { isCompleted: true });

    const state = engine.getFlowValidationState();
    expect(state.canProceed).toBe(true);
    expect(state.incompleteWidgets).toHaveLength(0);

    engine.dispose();
  });

  test('未完了Widget存在時にcanProceed=false', () => {
    const engine = new ReactiveBindingEngine({ dependencies: [] });

    engine.initPort('widget1._completed', { isCompleted: true });
    engine.initPort('widget2._completed', { isCompleted: false, requiredFields: ['項目A'] });

    const state = engine.getFlowValidationState();
    expect(state.canProceed).toBe(false);
    expect(state.incompleteWidgets).toContain('widget2');

    engine.dispose();
  });

  test('エラーWidget存在時にcanProceed=false', () => {
    const engine = new ReactiveBindingEngine({ dependencies: [] });

    engine.initPort('widget1._error', { hasError: true, messages: ['エラー発生'] });

    const state = engine.getFlowValidationState();
    expect(state.canProceed).toBe(false);
    expect(state.widgetErrors.has('widget1')).toBe(true);

    engine.dispose();
  });

  test('予約Port更新時にコールバックが発火する', () => {
    const engine = new ReactiveBindingEngine({ dependencies: [] });
    const callback = jest.fn();
    engine.setOnValidationStateChange(callback);

    engine.updatePort('widget1._completed', { isCompleted: true });

    // Debounceなしで即座に発火
    expect(callback).toHaveBeenCalled();

    engine.dispose();
  });
});
```

**受け入れ確認**:
- [ ] FlowValidationState取得成功
- [ ] canProceed判定正確
- [ ] コールバック発火確認
- [ ] テストPASS

**Git操作**:
```bash
git add concern-app/src/services/ui/ReactiveBindingEngine.ts
git commit -m "feat(engine): add FlowValidationState for widget completion tracking"
```

---

### Step 5: React Hooks

**目的**: Widget側で使用するカスタムフックを実装

**作成ファイル**:
```
concern-app/src/hooks/useReactivePorts.ts
concern-app/src/hooks/useFlowValidation.ts
```

**実装内容**:

**useReactivePorts**:
- emitPort(), readPort()
- setError(), setCompleted()
- errorState, completedState

**useFlowValidation**:
- engine購読
- validationState更新

**テスト**:
```typescript
// concern-app/src/hooks/__tests__/useReactivePorts.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useReactivePorts } from '../useReactivePorts';

describe('useReactivePorts', () => {
  test('emitPortでonPortChangeが呼ばれる', () => {
    const onPortChange = jest.fn();
    const { result } = renderHook(() => useReactivePorts({
      widgetId: 'test-widget',
      onPortChange
    }));

    act(() => {
      result.current.emitPort('balance', 0.5);
    });

    expect(onPortChange).toHaveBeenCalledWith('test-widget', 'balance', 0.5);
  });

  test('setCompletedで_completedポートに出力される', () => {
    const onPortChange = jest.fn();
    const { result } = renderHook(() => useReactivePorts({
      widgetId: 'test-widget',
      onPortChange
    }));

    act(() => {
      result.current.setCompleted(true);
    });

    expect(onPortChange).toHaveBeenCalledWith(
      'test-widget',
      '_completed',
      expect.objectContaining({ isCompleted: true })
    );
  });

  test('setErrorで_errorポートに出力される', () => {
    const onPortChange = jest.fn();
    const { result } = renderHook(() => useReactivePorts({
      widgetId: 'test-widget',
      onPortChange
    }));

    act(() => {
      result.current.setError(true, ['エラーメッセージ']);
    });

    expect(onPortChange).toHaveBeenCalledWith(
      'test-widget',
      '_error',
      expect.objectContaining({ hasError: true, messages: ['エラーメッセージ'] })
    );
  });

  test('initialPortValuesで初期状態が設定される', () => {
    const { result } = renderHook(() => useReactivePorts({
      widgetId: 'test-widget',
      initialPortValues: {
        _completed: { isCompleted: true }
      }
    }));

    expect(result.current.completedState.isCompleted).toBe(true);
  });
});
```

```typescript
// concern-app/src/hooks/__tests__/useFlowValidation.test.tsx
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import { ReactiveBindingEngine } from '../../services/ui/ReactiveBindingEngine';

describe('useFlowValidation', () => {
  test('engineがnullの場合はデフォルト値', () => {
    const { result } = renderHook(() => useFlowValidation(null));

    expect(result.current.canProceed).toBe(false);
    expect(result.current.incompleteWidgets).toHaveLength(0);
  });

  test('engineの状態が反映される', () => {
    const engine = new ReactiveBindingEngine({ dependencies: [] });
    engine.initPort('w1._completed', { isCompleted: true });

    const { result } = renderHook(() => useFlowValidation(engine));

    expect(result.current.canProceed).toBe(true);

    engine.dispose();
  });
});
```

**受け入れ確認**:
- [ ] useReactivePorts動作確認
- [ ] useFlowValidation動作確認
- [ ] テストPASS

**Git操作**:
```bash
git add concern-app/src/hooks/useReactivePorts.ts
git add concern-app/src/hooks/useFlowValidation.ts
git add concern-app/src/hooks/__tests__/
git commit -m "feat(hooks): add useReactivePorts and useFlowValidation hooks"
```

**動作検証**:
```bash
cd concern-app && bun test useReactivePorts useFlowValidation
```

---

### Step 6: BaseWidgetProps拡張

**目的**: Widget Propsにreactive対応を追加

**変更ファイル**:
```
concern-app/src/types/widget.types.ts
```

**実装内容**:
- PortChangeCallback, PortValueGetter型追加
- BaseWidgetPropsに新フィールド追加
  - onPortChange?
  - getPortValue?
  - initialPortValues?

**テスト**:
```typescript
// 型チェックのみ（TypeScriptコンパイル）
// concern-app/src/types/__tests__/widget.types.test.ts
import type { BaseWidgetProps, PortChangeCallback } from '../widget.types';

describe('Widget Types', () => {
  test('BaseWidgetPropsが後方互換性を維持', () => {
    // 既存のpropsのみでも型エラーにならない
    const legacyProps: BaseWidgetProps = {
      spec: {} as any,
      onUpdate: (id, data) => {},
      onComplete: (id) => {}
    };
    expect(legacyProps).toBeDefined();
  });

  test('BaseWidgetPropsが新しいreactiveプロパティを持てる', () => {
    const reactiveProps: BaseWidgetProps = {
      spec: {} as any,
      onPortChange: (widgetId, portId, value) => {},
      getPortValue: (portKey) => null,
      initialPortValues: { balance: 0 }
    };
    expect(reactiveProps.onPortChange).toBeDefined();
  });
});
```

**受け入れ確認**:
- [ ] 後方互換性維持
- [ ] 新フィールド追加成功
- [ ] TypeScriptコンパイルPASS

**Git操作**:
```bash
git add concern-app/src/types/widget.types.ts
git commit -m "feat(types): extend BaseWidgetProps for reactive support"
```

---

### Step 7: TradeoffBalance改修

**目的**: TradeoffBalanceをReactive対応に改修

**変更ファイル**:
```
concern-app/src/components/widgets/v3/TradeoffBalance/TradeoffBalance.tsx
concern-app/src/components/widgets/v3/TradeoffBalance/TradeoffBalanceController.ts
```

**実装内容**:
- useReactivePorts統合
- balance, direction出力
- _completed自動更新
- エラー表示（インライン）

**テスト**:
```typescript
// concern-app/src/components/widgets/v3/TradeoffBalance/__tests__/TradeoffBalance.reactive.test.tsx
describe('TradeoffBalance Reactive', () => {
  const mockSpec = {
    id: 'tradeoff-1',
    component: 'tradeoff_balance',
    config: { leftLabel: '選択肢A', rightLabel: '選択肢B' }
  } as any;

  test('重み変更時にbalanceポートが出力される', async () => {
    const onPortChange = jest.fn();
    const { getByTestId } = render(
      <TradeoffBalance
        spec={mockSpec}
        onPortChange={onPortChange}
      />
    );

    // 左側にアイテム追加
    const leftInput = getByTestId('tradeoff-left-input');
    fireEvent.change(leftInput, { target: { value: 'リスクA' } });
    fireEvent.click(getByTestId('tradeoff-left-add-btn'));

    // 右側にアイテム追加
    const rightInput = getByTestId('tradeoff-right-input');
    fireEvent.change(rightInput, { target: { value: 'リスクB' } });
    fireEvent.click(getByTestId('tradeoff-right-add-btn'));

    // スライダー操作
    const slider = getByTestId(/tradeoff-weight-/);
    fireEvent.change(slider, { target: { value: 80 } });

    // balanceポートが出力される
    expect(onPortChange).toHaveBeenCalledWith(
      'tradeoff-1',
      'balance',
      expect.any(Number)
    );

    // directionポートが出力される
    expect(onPortChange).toHaveBeenCalledWith(
      'tradeoff-1',
      'direction',
      expect.stringMatching(/left|right|balanced/)
    );
  });

  test('両側にアイテムがあるとき_completed=true', async () => {
    const onPortChange = jest.fn();
    const { getByTestId } = render(
      <TradeoffBalance
        spec={mockSpec}
        onPortChange={onPortChange}
      />
    );

    // 左側にアイテム追加
    fireEvent.change(getByTestId('tradeoff-left-input'), { target: { value: 'A' } });
    fireEvent.click(getByTestId('tradeoff-left-add-btn'));

    // この時点では未完了
    expect(onPortChange).toHaveBeenCalledWith(
      'tradeoff-1',
      '_completed',
      expect.objectContaining({ isCompleted: false })
    );

    // 右側にアイテム追加
    fireEvent.change(getByTestId('tradeoff-right-input'), { target: { value: 'B' } });
    fireEvent.click(getByTestId('tradeoff-right-add-btn'));

    // 完了
    expect(onPortChange).toHaveBeenCalledWith(
      'tradeoff-1',
      '_completed',
      expect.objectContaining({ isCompleted: true })
    );
  });

  test('後方互換: onUpdateも呼ばれる', () => {
    const onUpdate = jest.fn();
    const onPortChange = jest.fn();
    const { getByTestId } = render(
      <TradeoffBalance
        spec={mockSpec}
        onUpdate={onUpdate}
        onPortChange={onPortChange}
      />
    );

    // アイテム追加
    fireEvent.change(getByTestId('tradeoff-left-input'), { target: { value: 'A' } });
    fireEvent.click(getByTestId('tradeoff-left-add-btn'));

    // 両方呼ばれる
    expect(onUpdate).toHaveBeenCalled();
    expect(onPortChange).toHaveBeenCalled();
  });
});
```

**受け入れ確認**:
- [ ] balanceポート出力確認
- [ ] directionポート出力確認
- [ ] _completed自動更新確認
- [ ] 後方互換性確認
- [ ] テストPASS

**Git操作**:
```bash
git add concern-app/src/components/widgets/v3/TradeoffBalance/
git commit -m "feat(TradeoffBalance): add reactive port support"
```

**動作検証**:
```bash
cd concern-app && bun test TradeoffBalance
# ブラウザでも手動確認
bun run dev
```

---

### Step 8: DependencyMapping改修

**目的**: DependencyMappingをReactive対応に改修

**変更ファイル**:
```
concern-app/src/components/widgets/v3/DependencyMapping/DependencyMapping.tsx
concern-app/src/components/widgets/v3/DependencyMapping/DependencyMappingController.ts
```

**実装内容**:
- useReactivePorts統合
- edges, criticalPath, hasLoop出力
- _completed自動更新
- ループ検出時のエラー表示

**テスト**:
```typescript
// concern-app/src/components/widgets/v3/DependencyMapping/__tests__/DependencyMapping.reactive.test.tsx
describe('DependencyMapping Reactive', () => {
  test('エッジ追加時にedgesポートが出力される', () => {
    const onPortChange = jest.fn();
    // ... テスト実装
  });

  test('クリティカルパスが計算されてcriticalPathポートに出力される', () => {
    // ... テスト実装
  });

  test('ループ検出時にhasLoop=trueが出力される', () => {
    // ... テスト実装
  });

  test('ノードが2つ以上接続されたら_completed=true', () => {
    // ... テスト実装
  });
});
```

**受け入れ確認**:
- [ ] edgesポート出力確認
- [ ] criticalPathポート出力確認
- [ ] hasLoopポート出力確認
- [ ] _completed自動更新確認
- [ ] テストPASS

**Git操作**:
```bash
git add concern-app/src/components/widgets/v3/DependencyMapping/
git commit -m "feat(DependencyMapping): add reactive port support"
```

---

### Step 9: SWOTAnalysis改修

**目的**: SWOTAnalysisをReactive対応に改修

**変更ファイル**:
```
concern-app/src/components/widgets/v3/SwotAnalysis/SwotAnalysis.tsx
concern-app/src/components/widgets/v3/SwotAnalysis/SwotAnalysisController.ts
```

**実装内容**:
- useReactivePorts統合
- placement, gaps, gapSuggestions出力
- _completed自動更新
- 不足象限の視覚的ハイライト

**テスト**:
```typescript
// concern-app/src/components/widgets/v3/SwotAnalysis/__tests__/SwotAnalysis.reactive.test.tsx
describe('SwotAnalysis Reactive', () => {
  test('カード配置時にplacementポートが出力される', () => {
    // ... テスト実装
  });

  test('不足象限がgapsポートに出力される', () => {
    // ... テスト実装
  });

  test('4象限全てにカードがあれば_completed=true', () => {
    // ... テスト実装
  });
});
```

**受け入れ確認**:
- [ ] placementポート出力確認
- [ ] gapsポート出力確認
- [ ] _completed自動更新確認
- [ ] テストPASS

**Git操作**:
```bash
git add concern-app/src/components/widgets/v3/SwotAnalysis/
git commit -m "feat(SwotAnalysis): add reactive port support"
```

---

### Step 10: WidgetDefinitionGenerator

**目的**: LLMプロンプト生成とDependencyGraph検証を実装

**作成ファイル**:
```
server/src/services/WidgetDefinitionGenerator.ts
```

**実装内容**:
- generateWidgetPromptSectionSimple() - Widget選定用
- generateWidgetPromptSectionFull() - UI生成用
- generateDependencyPromptSection()
- validateDependencyGraph()

**テスト**:
```typescript
// server/src/services/__tests__/WidgetDefinitionGenerator.test.ts
describe('WidgetDefinitionGenerator', () => {
  const generator = new WidgetDefinitionGenerator(WIDGET_DEFINITIONS);

  test('簡易版プロンプトが生成される', () => {
    const prompt = generator.generateWidgetPromptSectionSimple(['tradeoff_balance']);
    expect(prompt).toContain('tradeoff_balance');
    expect(prompt).toContain('トレードオフ天秤');
    // Port詳細は含まない
    expect(prompt).not.toContain('balance: number');
  });

  test('完全版プロンプトが生成される', () => {
    const prompt = generator.generateWidgetPromptSectionFull(['tradeoff_balance']);
    expect(prompt).toContain('tradeoff_balance');
    expect(prompt).toContain('入力ポート');
    expect(prompt).toContain('出力ポート');
    expect(prompt).toContain('balance');
    expect(prompt).toContain('direction');
  });

  test('DependencyGraph検証で正常なDpGはvalidになる', () => {
    const dpg: DependencyGraphSpec = {
      dependencies: [{
        source: 'w1.balance',
        target: 'w2.displayValue',
        mechanism: 'update',
        relationship: { type: 'transform', transform: 'calculate_balance' },
        updateMode: 'debounced'
      }]
    };

    // w1, w2が定義されていると仮定
    const result = generator.validateDependencyGraph(dpg, ['w1', 'w2']);
    // 注: 実際のPort検証にはWidget定義が必要
  });

  test('存在しないPortへの参照はエラーになる', () => {
    const dpg: DependencyGraphSpec = {
      dependencies: [{
        source: 'tradeoff.nonexistent',
        target: 'other.input',
        mechanism: 'update',
        relationship: { type: 'transform' },
        updateMode: 'debounced'
      }]
    };

    const result = generator.validateDependencyGraph(dpg, ['tradeoff', 'other']);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('型不整合はエラーになる', () => {
    // number → string[] のような型不整合
    const dpg: DependencyGraphSpec = {
      dependencies: [{
        source: 'tradeoff_balance.balance',  // number
        target: 'dependency_mapping.nodes',   // object[] を期待
        mechanism: 'update',
        relationship: { type: 'transform' },
        updateMode: 'debounced'
      }]
    };

    const result = generator.validateDependencyGraph(
      dpg,
      ['tradeoff_balance', 'dependency_mapping']
    );
    expect(result.valid).toBe(false);
  });
});
```

**受け入れ確認**:
- [ ] 簡易版プロンプト生成成功
- [ ] 完全版プロンプト生成成功
- [ ] DpG検証でエラー検出成功
- [ ] 型不整合検出成功
- [ ] テストPASS

**Git操作**:
```bash
git add server/src/services/WidgetDefinitionGenerator.ts
git add server/src/services/__tests__/WidgetDefinitionGenerator.test.ts
git commit -m "feat(generator): add WidgetDefinitionGenerator for LLM prompts"
```

---

### Step 11: 統合テスト

**目的**: 全コンポーネントの連携動作を検証

**作成ファイル**:
```
concern-app/src/__tests__/integration/reactivity.integration.test.tsx
```

**テスト内容**:
```typescript
describe('Reactivity Integration', () => {
  test('Engine→Widget→Engine の往復フロー', async () => {
    // 1. Engine初期化
    // 2. Widget描画（onPortChange接続）
    // 3. Widget操作
    // 4. Engine伝播確認
    // 5. Target Widget更新確認
  });

  test('FlowValidation: 全Widget完了で次へボタン有効', async () => {
    // 1. 複数Widget配置
    // 2. 各Widget操作して完了状態に
    // 3. useFlowValidation.canProceed確認
  });

  test('パフォーマンス: 連続操作でFPS維持', async () => {
    // 1. 高速連続操作（10回/秒）
    // 2. フレームドロップなしを確認
  });
});
```

**受け入れ確認**:
- [ ] 往復フロー動作確認
- [ ] FlowValidation動作確認
- [ ] パフォーマンス基準達成
- [ ] テストPASS

**Git操作**:
```bash
git add concern-app/src/__tests__/integration/
git commit -m "test(integration): add reactivity integration tests"
```

---

### Step 12: E2Eテスト（Playwright）

**目的**: ブラウザ上での実際の動作を検証

**作成ファイル**:
```
tests/playwright/reactivity.spec.ts
```

**テスト内容**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Reactivity E2E', () => {
  test('TradeoffBalance: スライダー操作で天秤が傾く', async ({ page }) => {
    await page.goto('/demo/widgets/tradeoff-balance');

    // アイテム追加
    await page.fill('[data-testid="tradeoff-left-input"]', 'リスクA');
    await page.click('[data-testid="tradeoff-left-add-btn"]');
    await page.fill('[data-testid="tradeoff-right-input"]', 'リスクB');
    await page.click('[data-testid="tradeoff-right-add-btn"]');

    // スライダー操作
    const slider = page.locator('[data-testid^="tradeoff-weight-"]').first();
    await slider.fill('80');

    // 天秤の傾きを確認
    const balanceScore = page.locator('[data-testid="tradeoff-balance-score"]');
    await expect(balanceScore).not.toHaveText('均衡');
  });

  test('複数Widget完了で次へボタンが有効になる', async ({ page }) => {
    await page.goto('/demo/reactive-flow');

    // 初期状態: 次へボタン無効
    const nextButton = page.locator('button:has-text("次へ")');
    await expect(nextButton).toBeDisabled();

    // Widget操作して完了状態に
    // ...

    // 次へボタン有効
    await expect(nextButton).toBeEnabled();
  });
});
```

**受け入れ確認**:
- [ ] TradeoffBalance E2E PASS
- [ ] フロー全体 E2E PASS

**Git操作**:
```bash
git add tests/playwright/reactivity.spec.ts
git commit -m "test(e2e): add Playwright tests for reactivity"
```

**動作検証**:
```bash
bun run test:e2e -- reactivity
```

---

### Step 13: 最終確認・ドキュメント更新

**目的**: 全体の品質確認とドキュメント整備

**確認事項**:
- [ ] 全テストPASS
- [ ] TypeScriptエラー0件
- [ ] ESLintエラー0件
- [ ] カバレッジ80%以上

**更新ファイル**:
```
specs/dsl-design/v3/README.md (ReactiveWidget-design.mdへのリンク追加)
CLAUDE.md (必要に応じて更新)
```

**Git操作**:
```bash
git add -A
git commit -m "docs: update documentation for Task 2.2 completion"
```

---

## 5. 実装スケジュール目安

| Step | 内容 | 見積り |
|------|------|--------|
| 1-2 | 型定義・Widget定義 | 1-2h |
| 3-4 | ReactiveBindingEngine | 2-3h |
| 5-6 | React Hooks・Props拡張 | 1-2h |
| 7-9 | 3Widget改修 | 3-4h |
| 10 | WidgetDefinitionGenerator | 1-2h |
| 11-12 | 統合テスト・E2E | 2-3h |
| 13 | 最終確認・ドキュメント | 1h |

**合計**: 約11-17時間（2-3日）

---

## 6. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Debounce時間が長すぎてUX低下 | 中 | 統合テストで計測、必要に応じて短縮 |
| 既存テストが壊れる | 中 | 後方互換Props維持、段階的移行 |
| Transform実行が重い | 低 | 現状の関数は軽量、問題発生時にWeb Worker化 |
| 循環依存の見落とし | 低 | 静的検出+動的深度制限の2段階対策 |

---

## 7. チェックリスト

### 実装完了チェック

- [ ] Step 1: 型定義基盤
- [ ] Step 2: Widget定義実装
- [ ] Step 3: ReactiveBindingEngine コア
- [ ] Step 4: FlowValidationState
- [ ] Step 5: React Hooks
- [ ] Step 6: BaseWidgetProps拡張
- [ ] Step 7: TradeoffBalance改修
- [ ] Step 8: DependencyMapping改修
- [ ] Step 9: SWOTAnalysis改修
- [ ] Step 10: WidgetDefinitionGenerator
- [ ] Step 11: 統合テスト
- [ ] Step 12: E2Eテスト
- [ ] Step 13: 最終確認

### 品質チェック

- [ ] AC-01〜AC-10 全て達成
- [ ] QC-01〜QC-04 全て達成
- [ ] NFR-01〜NFR-03 全て達成
