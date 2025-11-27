# ReactiveWidget 設計議論記録

> Phase 4 - Day 3-4 Task 2.2 準備
>
> 作成日: 2025-01-27

## 1. 議論の概要

### 1.1 目的

Phase 4 Day 3-4 タスク2.2（Reactive Widget実装）に取り掛かる前に、Widget間Reactivityの設計を詰める。

### 1.2 成果物

- `ReactiveWidget-design.md` - 設計仕様書
- `ReactiveWidget-Discussion.md` - 本ファイル（議論記録）

---

## 2. 設計目的の確認

### Q: Widget-to-Widget Reactivityの主な目的は？

**選択肢**:
1. ユーザー体験向上
2. 認知負荷軽減
3. 研究評価用
4. 全て重要

**回答**: **研究評価用**

LLMが生成したDependencyGraph定義が「正しく」行われているか検証したい。正しいDSL文法に則っているかと、ユーザから見て理にかなったUIになっているか。

### Q: 3つのReactiveパターンの優先順位は？

**回答**: **TradeoffBalance優先**

最もシンプルでPoC検証に適している。

### Q: LLMによる不足情報推論（SWOTAnalysis）は実装する？

**回答**: **後回し**

まずはローカル処理のみで、LLM連携は次フェーズ。

---

## 3. 評価指標の議論

### Q: Reactivityの「効果」を評価するためのメトリクス収集は？

**回答**: 技術的側面に集中

- LLMが生成したDependencyGraph定義の正確性検証
- 正しいDSL文法に則っているか
- ユーザから見て理にかなったUIになっているか
- レイテンシは今回の研究範囲外（フロントエンドの最適化問題）

### Q: Reactivityのオン/オフ切り替え（A/Bテスト）は必要？

**回答**: **不要**

他の方法で評価する。

---

## 4. データ管理アーキテクチャ

### Q: Widget間のデータフローはどのレベルで管理？

**議論内容**:

DependencyGraphの定義内容をJotaiが解釈できる形でRule-basedに変換することが必要。UI DSLの生成結果をRule-based renderingするのと同様のパターン。

**提案（ユーザー）**:
> Widgetの定義で「Reactivityにより他者から操作できるプロパティ」を公開していて、動的UIシステムはそれを考慮しながらreactivityを定義する形がいいと思った

**合意した設計**:

```
Widget定義層
├── 各Widgetが公開プロパティ（inputs/outputs）を宣言
└── WidgetReactivePort定義

LLM生成層
├── DependencyGraphSpec
└── 公開プロパティのみを参照

Rule-based変換層
└── DSL DependencyGraph → Jotai Atom Bindings
```

### 決定事項

1. **変換ロジックの配置**: DependencyExecutorを拡張、Reactと密結合を避ける
2. **伝播方式**: デフォルトdebounced（300ms）でバグ削減
3. **データフロー**: 片方向でアトミック、共依存は2つの独立したBindingとして定義
4. **無限ループ対策**: DependencyGraphの循環検出 + 実行時深度制限(10)

---

## 5. Widget定義の独立モジュール化

### Q: 公開プロパティのスキーマ設計

**議論内容**:

現状の`ReactiveBinding`は `source: "widgetId.propertyName"` という文字列ベース。より型安全にするため、Widget側で公開プロパティを明示的に宣言する。

### Q: inputs/outputsの分離は必要？

**回答**: **片方向のみで分離**

アトミックな設計にするべき。双方向が必要な場合は2つの独立したBindingとして定義。

### Q: ファイル配置

**合意した構成**:
- 設計要件: `specs/` にmarkdown
- DSL定義: `server/src/types/WidgetDefinition.ts`
- 実定義: `server/src/definitions/widgets.ts`

### Q: configSchemaの形式

**回答**: **JSON Schema形式**

### Q: LLMプロンプト変換

**回答**: **Generatorサービスとして実装**

他要素と同様にWidgetDefinitionGeneratorサービスを作成。

---

## 6. ReactiveBindingEngine設計

### 層分離の合意

```
Layer 1: Pure Logic (React非依存)
├── DependencyGraph.ts      - 依存関係管理、循環検出
├── DependencyExecutor.ts   - 変換実行、バリデーション
└── ReactiveBindingEngine.ts - Binding解釈・伝播ロジック（新規）

Layer 2: React Adapter (薄い接続層)
└── useReactiveFlow.ts - EngineをReact/Jotaiに接続
```

### Q: Port初期値の設定

**回答**: **initPort()を別途用意**

Debounceをスキップする初期化専用メソッドが必要。

### Q: updateMode対応

**回答**: **realtimeは保留**

現状はdebouncedのみ。

---

## 7. エラー通知設計

### Q: バリデーション結果の扱い

**議論内容**:

各Widgetにエラー状態用のポートを用意したい。また、親に伝える手段も必要（ユーザの操作フロー的に「次へ」を押せなくするためのバリデーション）。

### 現状調査結果

現状の「次へ」ボタン制御は：
- 各画面が独自にローカル状態で管理
- NavigationFooterの`isNextEnabled` prop
- 中央集権的なバリデーションシステムがない

### 合意した設計

**予約Port**:
- `_error`: エラー状態（`{hasError: boolean, messages: string[]}`）
- `_completed`: 完了状態（`{isCompleted: boolean, requiredFields?: string[]}`）

**FlowValidationState**:
- `canProceed`: 全Widgetのエラーなし かつ 全Widget完了
- `widgetErrors`: エラーのあるWidget一覧
- `incompleteWidgets`: 未完了Widget一覧

### Q: 予約Port名

**回答**: **アンダースコア接頭辞**（`_error`, `_completed`）

### Q: completedの判定ロジック

**回答**: **Widget内に実装、責務はWidgetに持たせる**

### Q: エラーメッセージの表示場所

**回答**: **一旦インライン表示**

将来的にトースト等の全体通知に拡張できる設計に。

### Q: useReactivePortsの責務範囲

**回答**: **エラー/完了をhookに含める**

親もシステムの一部と考えればReactivityの範疇。

---

## 8. Widget側インターフェース設計

### 現状のWidgetパターン

```typescript
interface BaseWidgetProps {
  spec: WidgetSpecObject;
  onComplete?: (widgetId: string) => void;
  onUpdate?: (widgetId: string, data: any) => void;
}
```

### 新しいBaseWidgetProps

```typescript
interface BaseWidgetProps {
  spec: WidgetSpecObject;

  // 既存（後方互換）
  onComplete?: (widgetId: string) => void;
  onUpdate?: (widgetId: string, data: any) => void;

  // 新規（Reactive対応）
  onPortChange?: PortChangeCallback;
  getPortValue?: PortValueGetter;
  initialPortValues?: Record<string, any>;
}
```

### Q: onUpdateとonPortChangeの関係

**回答**: **両方必要**

- `onUpdate`: 自身の状態変更のため（後方互換）
- `onPortChange`: Reactive Port出力のため（新規）

---

## 9. パフォーマンス・堅牢性評価

### データフロー概念説明

```
[T0] Widget A: スライダー操作
     ├── React state更新 → Widget A 即座に再描画
     └── emitPort() → Engine.updatePort()
              ├── portValues即座にキャッシュ
              └── Debounceタイマー開始 (300ms)

[T3] 300ms経過（操作停止後）
     └── executePropagation()
              ├── Transform実行
              ├── targetPort更新
              └── onPropagate callback → React setState
                       └── Target Widget 再描画
```

### パフォーマンス特性

| 観点 | 評価 |
|------|------|
| Source Widget | 高速（自身の描画は即座） |
| 連続操作 | 最適化済み（中間値スキップ） |
| Target Widget | 良好（300ms遅延で無駄な再描画防止） |

### 堅牢性対策

1. **競合状態**: Debounceで300ms内に収束
2. **無限ループ**: 静的検出（循環検出）+ 動的検出（深度制限10）
3. **不整合状態**: Transform失敗 → validation_error通知
4. **初期化順序**: initPort() + initialPortValues props

### Q: 300ms Debounce

**回答**: **一旦安全策で300ms**

統合テスト時に所要時間を計測して減らしていく。

### Q: Transform同期実行

**回答**: **保留で良い**

今回作るアプリの規模なら問題ない。

---

## 10. WidgetDefinitionGenerator設計

### Q: プロンプトの詳細度

**回答**: **2バージョン用意**

- **簡易版**: Widget選定用
- **完全版**: UI生成用（Port情報含む）

### Q: バリデーションの厳格さ

**回答**: **型不整合はエラー**

DependencyGraph/reactivityについてはエラーが良い。Transform関数の生成を含むので厳格な仕組みにしておきたい。

---

## 11. 決定事項サマリー

| 項目 | 決定内容 |
|------|----------|
| 設計目的 | 研究評価用（DependencyGraph検証） |
| 優先順位 | TradeoffBalance → DependencyMapping → SWOTAnalysis |
| LLM連携 | 後回し |
| データフロー | 片方向、debounced (300ms) |
| 層分離 | Pure Logic + React Adapter |
| 予約Port | `_error`, `_completed` |
| 完了判定 | Widget内で実装 |
| エラー表示 | インライン（拡張可能設計） |
| Props | onUpdate(後方互換) + onPortChange(新規) |
| プロンプト | 簡易版 + 完全版 |
| バリデーション | 型不整合はエラー |

---

## 12. 次のステップ

1. **Day 3-4 Task 2.2**: 本設計に基づきReactive Widget実装
   - TradeoffBalance（重み付けリスト → 天秤バランス表示）
   - DependencyMapping（ノード接続 → クリティカルパス表示）
   - SWOTAnalysis（SWOT配置 → 不足情報リスト生成）

2. **統合テスト**: Debounce時間の調整、パフォーマンス計測

3. **将来拡張**: realtimeモード、非同期Transform、トースト通知
