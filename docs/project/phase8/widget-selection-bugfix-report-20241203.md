# DSL v4 Widget選定バグ修正報告書

**日時**: 2024年12月3日
**コミット**: `c468b70`, `19975e0`
**ブランチ**: `feat/dslv4`

---

## 背景: API分離（前提となる変更）

本バグ修正に先立ち、DSL v4のUI生成APIを2つのエンドポイントに分離した（コミット `19975e0`）。

### 分離前

```
POST /v1/ui/generate-v4
  → Widget選定 + ORS生成 + UISpec生成 を一括実行
```

### 分離後

```
POST /v1/ui/generate-v4-widgets
  → Widget選定のみ（セッション開始時に1回）
  → 結果はキャッシュされ、後続のステージ実行で再利用

POST /v1/ui/generate-v4-stage
  → ORS生成 + UISpec生成（ステージごとに実行）
  → キャッシュされたWidget選定結果を使用
```

### 分離の目的

1. **レイテンシ削減**: Widget選定は4ステージ共通なので1回のみ実行
2. **メトリクス分離**: Widget選定とステージ実行のトークン数・時間を個別に計測
3. **キャッシュ効率**: 同一セッション内でWidget選定結果を再利用
4. **デバッグ容易性**: 問題発生箇所の特定が容易に

### フロントエンド対応

`ExperimentPlan.tsx` で `apiService.generateStageUI()` を呼び出すように変更。Widget選定は `PlanPreview` フェーズで事前に実行され、キャッシュされる。

---

## 問題概要

Widget選定APIが空の結果を返していた。全てのWidgets配列が空で、purpose/target/rationaleも空文字列だった。

### 症状

```json
{
  "stages": {
    "diverge": { "widgets": [], "purpose": "", "target": "" },
    "organize": { "widgets": [], "purpose": "", "target": "" },
    "converge": { "widgets": [], "purpose": "", "target": "" },
    "summary": { "widgets": [], "purpose": "", "target": "" }
  },
  "version": "4.0",
  "rationale": ""
}
```

---

## 根本原因

**`widget_selection` タスクの設定に `outputSchema` が未定義だった**

`LLMOrchestrator.executeOnce()` は `outputSchema` の有無で呼び出すメソッドを決定する：

```typescript
// server/src/services/v4/LLMOrchestrator.ts:256-258
const generatePromise = config.outputSchema
  ? service.generateJSON(prompt)   // JSONパース付き
  : service.generateText(prompt);  // 生テキスト返却
```

`outputSchema` が未定義だったため `generateText()` が呼び出され、LLMの生テキスト出力がそのまま `WidgetSelectionService.validateAndNormalizeResult()` に渡された。型ガード `isWidgetSelectionResult()` は文字列に対して失敗し、空のフォールバック結果 `createEmptyWidgetSelectionResult()` が返されていた。

### 問題の流れ

```
1. LLMOrchestrator.execute('widget_selection', ...)
2. config.outputSchema が undefined
3. generateText() が呼び出される（generateJSON()ではなく）
4. LLMの生テキスト "```json\n{...}\n```" がそのまま返される
5. WidgetSelectionService.validateAndNormalizeResult(rawText)
6. isWidgetSelectionResult(rawText) → false（文字列なので）
7. createEmptyWidgetSelectionResult() がフォールバックとして返される
```

### 補足問題

1. `WidgetSelectionService` の `debug: true` が設定されていなかった
2. プロンプトの出力形式例に `version: "4.0"` が含まれていなかった
3. DBへのトークン数保存が `inputTokens` のみだった
4. フロントエンドでdivergeステージが2回生成されていた（useEffectのクリーンアップ問題）

---

## 修正内容

| ファイル | 変更内容 |
|---------|---------|
| `server/src/types/v4/llm-task.types.ts` | `widget_selection` に `outputSchema` を追加 |
| `server/src/routes/ui.ts` | `WidgetSelectionService` に `debug: true` を追加、トークン数計算を修正 |
| `server/src/prompts/v4/widget-selection.prompt.ts` | 出力形式例に `version: "4.0"` を追加 |
| `server/src/services/v4/WidgetSelectionService.ts` | デバッグログ追加、`normalizeStageSelection` のロバスト化 |
| `concern-app/.../ExperimentPlan.tsx` | `Set<PlanStage>` で生成済みステージを追跡（2重生成防止） |

---

## 修正詳細

### 1. outputSchema追加（根本修正）

```typescript
// server/src/types/v4/llm-task.types.ts:283-302
widget_selection: {
  taskType: 'widget_selection',
  model: DEFAULT_MODEL_CONFIGS.general,
  promptTemplateId: 'widget-selection',
  // NEW: outputSchema を定義することで generateJSON が使用される
  outputSchema: {
    type: 'object',
    properties: {
      version: { type: 'string' },
      stages: { type: 'object' },
      rationale: { type: 'string' },
      flowDescription: { type: 'string' },
      totalEstimatedDuration: { type: 'number' },
      metadata: { type: 'object' },
    },
    required: ['version', 'stages'],
  },
  maxRetries: 2,
  timeout: 45000,
},
```

### 2. デバッグモード有効化

```typescript
// server/src/routes/ui.ts:51
const widgetSelectionService = createWidgetSelectionService({
  llmOrchestrator,
  debug: true  // NEW
});
```

### 3. プロンプトにversion追加

```typescript
// server/src/prompts/v4/widget-selection.prompt.ts
## 出力形式
以下のJSON形式で出力してください：

\`\`\`json
{
  "version": "4.0",  // NEW: 型ガードで必須
  "stages": { ... },
  ...
}
\`\`\`
```

### 4. 2重生成バグ修正

```typescript
// concern-app/src/components/experiment/phases/ExperimentPlan.tsx

// Before: useEffectクリーンアップでフラグがリセットされ、handleGenerate再生成時に再実行
const autoProceedRef = useRef(false);

useEffect(() => {
  if (!autoProceedRef.current) {
    autoProceedRef.current = true;
    setTimeout(() => handleGenerate(), 300);
  }
  return () => { autoProceedRef.current = false; }; // 問題: クリーンアップでリセット
}, [currentStage, existingResult, handleGenerate]);

// After: Set<PlanStage>でステージ単位の生成を追跡
const generatedStagesRef = useRef<Set<PlanStage>>(new Set());

useEffect(() => {
  if (!generatedStagesRef.current.has(currentStage)) {
    generatedStagesRef.current.add(currentStage);
    setTimeout(() => handleGenerate(), 300);
  }
  // クリーンアップなし（フラグをリセットしない）
}, [currentStage, existingResult, handleGenerate]);
```

### 5. トークン数修正

```typescript
// server/src/routes/ui.ts:759-760

// Before: 入力トークンのみ
widgetSelectionTokens: widgetSelectionResult.result.metrics?.inputTokens,

// After: 入力+出力トークン
widgetSelectionTokens: (widgetSelectionResult.result.metrics?.inputTokens || 0) +
                       (widgetSelectionResult.result.metrics?.outputTokens || 0),
```

### 6. デバッグログ追加

```typescript
// server/src/services/v4/WidgetSelectionService.ts

// LLM呼び出し結果のログ
if (this.debug) {
  console.log(`[WidgetSelectionService] LLM result.success: ${result.success}`);
  console.log(`[WidgetSelectionService] LLM result.data:`, JSON.stringify(result.data, null, 2)?.substring(0, 1000));
}

// 型検証の詳細ログ
if (this.debug) {
  console.log(`[WidgetSelectionService] isWidgetSelectionResult: ${isValid}`);
  if (!isValid && typeof result === 'object' && result !== null) {
    console.log(`[WidgetSelectionService] Validation details:`, {
      hasVersion: 'version' in obj,
      version: obj.version,
      hasStages: 'stages' in obj,
      // ...
    });
  }
}
```

### 7. normalizeStageSelectionのロバスト化

```typescript
// Before: 未知のWidget IDはスキップ
if (typeof widgetId === 'string' && getWidgetDefinitionV4(widgetId)) {
  widgets.push({...});
}

// After: 未知のWidget IDでも警告のみで続行
if (typeof widgetId === 'string') {
  if (!getWidgetDefinitionV4(widgetId)) {
    console.warn(`[WidgetSelectionService] Unknown widget ID: ${widgetId}, including anyway`);
  }
  widgets.push({...});
}
```

---

## 確認結果

- [x] Widget選定結果が正しいWidgetデータを含む
- [x] divergeステージが1回のみ生成される
- [x] サーバーログに `[WidgetSelectionService]` デバッグ情報が出力される
- [x] トークン数が正しく記録される（入力+出力）
- [x] ビルド成功（server/frontend両方）

---

## 教訓と今後の推奨事項

### 1. LLMタスク設定の一貫性

JSON出力を期待するタスクには必ず `outputSchema` を定義する。現在の設計では `outputSchema` の有無でメソッドが切り替わるため、これが抜けると予期しない動作になる。

**対策案**:
- `LLM_TASK_CATEGORIES` で `'structured'` に分類されているタスクは自動的に `generateJSON` を使用する
- または、タスク設定のバリデーションで `structured` カテゴリなのに `outputSchema` がない場合に警告を出す

### 2. デバッグフラグの環境変数化

```typescript
// 推奨実装
const debug = process.env.DEBUG_V4 === 'true' || process.env.NODE_ENV === 'development';
```

### 3. 型ガード失敗時の詳細ログ

型ガードが失敗した場合、どの条件で失敗したかを詳細に出力する。今回の修正で追加したデバッグログが参考になる。

### 4. useEffectの依存配列設計

`handleGenerate` のような関数を依存配列に含める場合、その関数が再生成されるタイミングを慎重に考慮する。今回のケースでは、クリーンアップ関数がフラグをリセットし、依存関数の再生成によってuseEffectが再実行されることで2重生成が発生した。

---

## 関連ファイル

- デバッグ用プロンプトログ: `docs/project/phase8/prompt-widget-selection-202512030038.md`
- 修正前のWidget選定結果: `docs/project/phase8/widget-selection-result-202512030038.md`
- 修正計画: `docs/project/phase8/v4-bugfix-plan.md`
