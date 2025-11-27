# Phase 4 Task 2.2 Reactive Widget 実装完了レポート

> 作成日: 2025-01-27
> コミット: 6527345 (`feat(reactive): implement Phase 4 Task 2.2 Reactive Widget system`)

---

## 1. 概要

### 1.1 実装目的

Widget間のリアクティブなデータ連携基盤を構築し、以下を達成した：

- **LLM生成DSLの検証基盤**: DependencyGraphの正確性をテスト可能に
- **ユーザー体験向上**: Widget間の操作結果が即座に反映される
- **認知負荷軽減**: 手動での情報転記が不要に

### 1.2 成果サマリー

| 項目 | 結果 |
|------|------|
| 追加ファイル数 | 7 |
| 追加行数 | 1,143行 |
| テスト数 | 128件（全PASS） |
| TypeScriptエラー | 0件 |
| サーバービルド | 成功 |

---

## 2. 実装経緯

### 2.1 Step 1-6: 基盤構築

| Step | 内容 | 作成ファイル |
|------|------|-------------|
| 1 | 型定義基盤 | `server/src/types/WidgetDefinition.ts` |
| 2 | Widget定義実装 | `server/src/definitions/widgets.ts` |
| 3 | ReactiveBindingEngine コア | `concern-app/src/services/ui/ReactiveBindingEngine.ts` |
| 4 | FlowValidationState | （Step 3に統合） |
| 5 | React Hooks | `concern-app/src/hooks/useReactivePorts.ts`, `useFlowValidation.ts` |
| 6 | BaseWidgetProps拡張 | `concern-app/src/types/widget.types.ts` |

### 2.2 Step 7-9: Widget改修

3つのWidgetをReactive Port対応に改修：

1. **TradeoffBalance** - `balance`, `direction`, `recommendation` 出力
2. **DependencyMapping** - `nodes`, `edges`, `critical_path`, `has_cycle` 出力
3. **SwotAnalysis** - `strengths`, `weaknesses`, `opportunities`, `threats` 出力

各Widgetで共通のパターンを適用：
- `useReactivePorts` Hook統合
- `emitAllPorts()` 関数によるまとめて出力
- `useEffect` で `setCompleted` を完了条件に連動

### 2.3 Step 10-12: テスト・検証

| Step | 内容 | 作成ファイル |
|------|------|-------------|
| 10 | WidgetDefinitionGenerator | `server/src/generators/WidgetDefinitionGenerator.ts` |
| 11 | 統合テスト | `concern-app/src/services/ui/__tests__/ReactiveIntegration.test.ts` |
| 12 | E2Eテスト | `concern-app/src/components/widgets/v3/__tests__/ReactivePort.spec.ts` |

---

## 3. 発見した問題点と解決策

### 3.1 PropagationCallback の引数形式

**問題**: テストコードで `(source, target, value)` の個別引数を想定していたが、実際は `events[]` 配列を受け取る仕様だった。

**症状**:
```typescript
// 失敗するコード
engine.setOnPropagate((source, target, value) => {
  propagations.push({ source, target, value });
});
```

**解決策**:
```typescript
// 正しいコード
engine.setOnPropagate((events) => {
  propagations.push(...events);
});
// events[0].sourcePortKey, events[0].targetPortKey, events[0].value でアクセス
```

### 3.2 JavaScript式の評価形式

**問題**: Transform関数内のJavaScript式で `source * 2` のような直接演算が動作しなかった。

**原因**: `DependencyExecutor` が `new Function('source', code)` で関数を生成しており、`source` は `{ value: sourceValue }` オブジェクトとして渡される。

**解決策**:
```typescript
// 失敗するコード
relationship: {
  type: 'javascript',
  javascript: 'source * 2',  // undefined が返る
}

// 正しいコード
relationship: {
  type: 'javascript',
  javascript: 'return source.value * 2',  // 正しく計算される
}
```

### 3.3 DependencySpec の必須フィールド不足

**問題**: テスト用のDependencySpec作成時に `mechanism` と `updateMode` が必須だったが、省略していた。

**解決策**: テストヘルパー関数でデフォルト値を追加：
```typescript
function createTestDpgSpec(dependencies: Array<{...}> = []): DependencyGraphSpec {
  return {
    dependencies: dependencies.map((d) => ({
      ...d,
      mechanism: d.mechanism ?? 'update',
      updateMode: d.updateMode ?? 'realtime',
      relationship: d.relationship as any,
    })),
  };
}
```

---

## 4. 重要な留意点

### 4.1 予約Port と 通常Port の違い

| 種類 | Debounce | 伝播 | 用途 |
|------|----------|------|------|
| `_error` | なし | しない | エラー状態の即座な通知 |
| `_completed` | なし | しない | 完了状態の即座な通知 |
| 通常Port | 300ms | する | Widget間のデータ連携 |

**理由**: フローバリデーション（「次へ」ボタンの有効/無効）は即座に反映する必要があるため。

### 4.2 後方互換性の維持

Widget改修時、既存の `onUpdate` / `onComplete` コールバックも並行して呼び出す：

```typescript
// emitAllPorts() の後に onUpdate も呼ぶ
emitAllPorts();
if (onUpdate) {
  const result = controllerRef.current.getResult(spec.id);
  onUpdate(spec.id, result.data);
}
```

**理由**: 既存のWidgetFlowコンポーネントとの互換性を維持するため。

### 4.3 JavaScript式の記法

DependencyGraph内のJavaScript式は以下の形式で記述：

```typescript
// 基本形式
'return source.value'

// 計算式
'return source.value * 2 + 10'

// 条件分岐
'return source.value > 0.5 ? "high" : "low"'
```

**注意**: `source` は `{ value: any }` オブジェクトであり、直接値ではない。

### 4.4 テスト実行環境

| 環境 | テストランナー | コマンド |
|------|---------------|----------|
| concern-app | Vitest | `npm run test` |
| server | Bun | `bun test` |

### 4.5 flush() の用途

テストで同期的に伝播を確認したい場合は `engine.flush()` を使用：

```typescript
engine.updatePort('widgetA.output', 10);
engine.flush(); // Debounce待ちなしで即座に伝播実行

expect(propagations.length).toBe(1);
```

---

## 5. アーキテクチャ詳細

### 5.1 レイヤー構成

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Layer                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Widget A     │    │ Widget B     │    │ Widget C     │      │
│  │ useReactive  │    │ useReactive  │    │ useReactive  │      │
│  │ Ports()      │    │ Ports()      │    │ Ports()      │      │
│  └──────┬───────┘    └──────▲───────┘    └──────▲───────┘      │
│         │ emitPort          │                   │               │
└─────────┼───────────────────┼───────────────────┼───────────────┘
          │                   │                   │
          ▼                   │                   │
┌─────────────────────────────────────────────────────────────────┐
│                 Pure Logic Layer (React非依存)                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ReactiveBindingEngine                                   │    │
│  │ - DependencyGraph (トポロジー管理)                       │    │
│  │ - DependencyExecutor (Transform実行)                    │    │
│  │ - Debounce制御 (300ms)                                  │    │
│  │ - ループ検出 (深度制限: 10)                              │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 主要クラス・関数

| コンポーネント | 責務 |
|---------------|------|
| `ReactiveBindingEngine` | Port値のキャッシュ、Debounce、伝播、FlowValidation |
| `DependencyGraph` | 依存関係のトポロジー管理、循環検出 |
| `DependencyExecutor` | Transform関数の実行、値変換 |
| `useReactivePorts` | Widget内でのPort操作インターフェース |
| `useFlowValidation` | Engine購読、バリデーション状態の取得 |

---

## 6. テスト結果

### 6.1 単体テスト（Vitest）

```
 ✓ src/services/ui/__tests__/ReactiveIntegration.test.ts (15)
 ✓ src/hooks/__tests__/useReactivePorts.test.ts (5)
 ✓ src/hooks/__tests__/useFlowValidation.test.ts (3)
```

### 6.2 統合テスト

```
 ✓ 基本的なWidget間連携
   ✓ Widget AのoutputがWidget Bのinputに伝播する
   ✓ flush()で即座に伝播が実行される
 ✓ FlowValidationState連携
   ✓ Widget完了状態がcanProceedに反映される
   ✓ エラー状態がcanProceedに反映される
   ✓ 複数Widgetの状態が統合される
   ✓ ValidationStateChangeコールバックが呼ばれる
 ✓ 連鎖的な伝播
   ✓ A -> B -> C の連鎖伝播が動作する
   ✓ 深度制限を超える伝播は停止する
```

### 6.3 E2Eテスト（Playwright）

```
 ✓ TradeoffBalance - Completion State
   ✓ should show disabled complete button until items added to both sides
   ✓ should update balance score when weights change
 ✓ SwotAnalysis - Completion State
   ✓ should require all quadrants to have items before completion
 ✓ DependencyMapping - Completion State
   ✓ should require at least one connection before completion
```

---

## 7. 今後の課題

### 7.1 未実装項目（OUT of Scope）

- **LLM Transform**: 非同期API連携による動的変換
- **realtimeモード**: Debounceなしの即時伝播
- **トースト/モーダルエラー通知**: 現在はインライン表示のみ

### 7.2 改善候補

| 項目 | 現状 | 改善案 |
|------|------|--------|
| Debounce時間 | 固定300ms | Widget設定で可変に |
| Transform実行 | メインスレッド | Web Worker化 |
| エラーメッセージ | 英語混在 | 日本語統一 |

---

## 8. 参照ドキュメント

- [実装計画書](./phase4_task2.2_reactivity.md)
- [設計仕様書](../../../dsl-design/v3/ReactiveWidget-design.md)
- [DSL Core Spec v3.0](../../../dsl-design/v3/DSL-Core-Spec-v3.0.md)

---

## 9. 関連ファイル一覧

### 新規作成

| ファイルパス | 説明 |
|-------------|------|
| `server/src/types/WidgetDefinition.ts` | Widget定義型システム |
| `server/src/definitions/widgets.ts` | 3Widget定義 |
| `server/src/generators/WidgetDefinitionGenerator.ts` | LLMプロンプト生成 |
| `concern-app/src/services/ui/ReactiveBindingEngine.ts` | コアエンジン |
| `concern-app/src/hooks/useReactivePorts.ts` | Widget用Hook |
| `concern-app/src/hooks/useFlowValidation.ts` | バリデーションHook |

### 変更

| ファイルパス | 変更内容 |
|-------------|----------|
| `concern-app/src/types/widget.types.ts` | BaseWidgetProps拡張 |
| `concern-app/src/components/widgets/v3/TradeoffBalance/TradeoffBalance.tsx` | Reactive Port対応 |
| `concern-app/src/components/widgets/v3/DependencyMapping/DependencyMapping.tsx` | Reactive Port対応 |
| `concern-app/src/components/widgets/v3/SwotAnalysis/SwotAnalysis.tsx` | Reactive Port対応 |

### テスト

| ファイルパス | 種類 |
|-------------|------|
| `concern-app/src/services/ui/__tests__/ReactiveIntegration.test.ts` | 統合テスト |
| `concern-app/src/components/widgets/v3/__tests__/ReactivePort.spec.ts` | E2Eテスト |
| `server/src/generators/__tests__/WidgetDefinitionGenerator.test.ts` | 単体テスト |
