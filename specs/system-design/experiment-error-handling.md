# DSL v4 実験エラーハンドリング仕様書

## 概要

本仕様書は、DSL v4 実験システムにおけるエラーハンドリングの設計と実装について記述する。
実験中に発生する様々なエラーを適切に分類・記録し、研究データとして活用可能にする。

## エラー型定義

### ExperimentErrorType

```typescript
export type ExperimentErrorType =
    | 'unknown_widget'          // 存在しないWidgetが選定された
    | 'ors_parse_error'         // ORS DSLのパースエラー
    | 'uispec_parse_error'      // UISpec DSLのパースエラー
    | 'llm_api_error'           // LLM API呼び出しエラー
    | 'widget_selection_failed' // Widget選定自体が失敗
    | 'validation_error';       // バリデーションエラー
```

### ExperimentError インターフェース

```typescript
export interface ExperimentError {
    type: ExperimentErrorType;
    message: string;
    stage?: PlanStage;          // エラー発生ステージ (diverge/organize/converge/summary)
    timestamp: number;          // エラー発生時刻 (Unix timestamp)
    recoverable: boolean;       // true: 実験継続可能, false: 実験終了が必要
    details?: Record<string, unknown>; // エラー詳細情報
}
```

## エラー種別詳細

### 1. unknown_widget
**発生条件**: LLMがWidget選定時に、UIRendererV4に実装されていないWidgetを選定した場合

**recoverable**: `true` （他のWidgetは正常に動作するため実験継続可能）

**details例**:
```json
{
    "widgetId": "widget_free_writing_001",
    "componentName": "free_writing"
}
```

**対応**:
- 該当Widgetの位置に赤枠のエラーメッセージを表示
- 「このエラーは記録されました。実験は継続できます。」と表示

### 2. ors_parse_error
**発生条件**: LLMが生成したORS DSLがパースできない場合

**recoverable**: `true` （リトライ可能）

**details例**:
```json
{
    "rawOutput": "...",
    "parseError": "Unexpected token at line 5"
}
```

### 3. uispec_parse_error
**発生条件**: LLMが生成したUISpec DSLがパースできない場合

**recoverable**: `true` （リトライ可能）

**details例**:
```json
{
    "rawOutput": "...",
    "parseError": "Invalid widget configuration"
}
```

### 4. llm_api_error
**発生条件**: LLM API呼び出しがタイムアウトまたはエラーを返した場合

**recoverable**: `true` （リトライ後に継続可能な場合が多い）

**details例**:
```json
{
    "statusCode": 503,
    "errorMessage": "Service temporarily unavailable",
    "retryCount": 3
}
```

### 5. widget_selection_failed
**発生条件**: Widget選定プロセス自体が完全に失敗した場合

**recoverable**: `false` （実験継続不可）

**details例**:
```json
{
    "reason": "All retries exhausted",
    "lastError": "Invalid JSON response"
}
```

### 6. validation_error
**発生条件**: 生成されたデータのバリデーションに失敗した場合

**recoverable**: `true` （部分的なデータで継続可能）

**details例**:
```json
{
    "field": "widgets",
    "constraint": "minLength",
    "expected": 1,
    "actual": 0
}
```

## recoverableフラグの判断基準

| エラー種別 | recoverable | 判断根拠 |
|-----------|-------------|---------|
| unknown_widget | true | 他のWidgetは正常動作、UIには代替表示 |
| ors_parse_error | true | リトライで回復可能、フォールバック値使用可能 |
| uispec_parse_error | true | リトライで回復可能、フォールバック値使用可能 |
| llm_api_error | true | リトライで回復可能性あり |
| widget_selection_failed | false | 基盤となるWidget選定がないと実験継続不可 |
| validation_error | true | 部分的なデータで継続可能 |

## エラー収集・記録フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                        UIRendererV4.tsx                         │
│  onUnknownWidget コールバック → ExperimentError 生成            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ExperimentPlan.tsx                         │
│  stageErrors state で収集、onStageResult() で親に伝播          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useExperimentFlow.ts                         │
│  experimentErrors state で全ステージのエラーを集約              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   experimentApi.updateSession()                 │
│  contextFactors.experimentErrors としてDBに保存                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SessionDetail.tsx                           │
│  Overview タブでエラー一覧を表示（色分け: 黄=回復可能, 赤=致命的）│
└─────────────────────────────────────────────────────────────────┘
```

## UIRendererV4 でのエラー表示

### Unknown Widget エラー表示

```tsx
<div style={{
    padding: '16px',
    margin: '8px 0',
    backgroundColor: '#FEF2F2',
    border: '2px solid #EF4444',
    borderRadius: '8px',
}}>
    <div style={{ color: '#DC2626', fontWeight: 'bold' }}>
        ⚠️ Unknown Widget: {componentName}
    </div>
    <div style={{ fontSize: '12px', color: '#6B7280' }}>
        Widget ID: {widgetId}
    </div>
    <div style={{ fontSize: '12px', color: '#059669' }}>
        ※ このエラーは記録されました。実験は継続できます。
    </div>
</div>
```

## SessionDetail でのエラー表示

### エラーセクション仕様

- **表示位置**: Overview タブ内
- **表示条件**: `contextFactors.experimentErrors` が存在し、長さが1以上の場合
- **色分け**:
  - `recoverable: true` → 黄色背景 (`bg-yellow-50`, `border-yellow-200`)
  - `recoverable: false` → 赤色背景 (`bg-red-50`, `border-red-200`)
- **表示項目**:
  - エラー種別
  - エラーメッセージ
  - 発生ステージ（ある場合）
  - 発生時刻
  - 詳細情報（展開可能）

## データベース保存形式

エラーは `ExperimentSessions.contextFactors` カラムにJSON形式で保存される。

```json
{
    "experimentErrors": [
        {
            "type": "unknown_widget",
            "message": "Unknown widget: free_writing",
            "stage": "diverge",
            "timestamp": 1702000000000,
            "recoverable": true,
            "details": {
                "widgetId": "widget_001",
                "componentName": "free_writing"
            }
        }
    ]
}
```

## 関連ファイル一覧

| ファイル | 役割 |
|---------|------|
| `concern-app/src/components/experiment/types.ts` | エラー型定義 |
| `concern-app/src/services/ui-generation/UIRendererV4.tsx` | エラー検出・表示 |
| `concern-app/src/components/experiment/phases/ExperimentPlan.tsx` | ステージごとのエラー収集 |
| `concern-app/src/components/experiment/hooks/useExperimentFlow.ts` | 全ステージエラー集約・保存 |
| `concern-app/src/pages/research-experiment/SessionDetail.tsx` | エラー一覧表示 |
| `server/src/database/schema.ts` | ExperimentSessions テーブル定義 |

## 今後の拡張予定

1. **エラー統計ダッシュボード**: 実験全体でのエラー発生率を可視化
2. **アラート通知**: 致命的エラー発生時の管理者通知
3. **自動リトライ強化**: エラー種別に応じた適応的リトライ戦略
