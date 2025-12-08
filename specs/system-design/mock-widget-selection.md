# Mock Widget Selection 仕様書

## 概要

技術検証（Technical）および専門家評価（Expert）モードにおいて、Widget選定のLLM呼び出しをスキップし、事前定義された`expectedFlow`を使用するモック機能。

## 目的

1. **再現性の確保**: LLMの出力変動を排除し、同一条件での比較実験を可能にする
2. **コスト削減**: テスト・デバッグ時のLLM API呼び出しを削減
3. **高速化**: Widget選定のレイテンシを0msに削減

## アーキテクチャ

### データフロー

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: TechnicalModeConfig / ExpertModeConfig               │
│  └─ チェックボックス: 「モックWidget選定を使用」                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ (1) useMock=true をURLパラメータに付与
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CaseExecution.tsx                                              │
│  └─ URLから useMock パラメータを読み取り                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ (2) セッション作成時に useMockWidgetSelection を渡す
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/experiment/sessions                                  │
│  └─ useMockWidgetSelection: true をDBに保存                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ (3) Widget選定API呼び出し時にフラグを渡す
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /v1/ui/generate-v4-widgets                                │
│  ├─ useMockWidgetSelection=true の場合                          │
│  │   └─ MockWidgetSelectionService を使用                       │
│  └─ useMockWidgetSelection=false の場合                         │
│      └─ WidgetSelectionService (LLM) を使用                     │
└─────────────────────────────────────────────────────────────────┘
```

## 実装詳細

### 1. データベーススキーマ

**テーブル**: `experiment_sessions`

| カラム名 | 型 | 説明 |
|---------|-----|------|
| `use_mock_widget_selection` | boolean | モックモード使用フラグ（デフォルト: false） |

### 2. MockWidgetSelectionService

**ファイル**: `server/src/services/v4/MockWidgetSelectionService.ts`

#### 主要メソッド

```typescript
generateFromTestCase(input: MockWidgetSelectionInput): MockWidgetSelectionOutput
```

#### 変換ロジック

1. `ExperimentConfigService`からテストケースをロード
2. `expectedFlow`を`WidgetSelectionResult`形式に変換
3. 各ステージ（diverge/organize/converge）のwidgetsを`SelectedWidget[]`に変換
4. summaryステージが無い場合は`structured_summary`をデフォルト設定

#### 入出力型

```typescript
interface MockWidgetSelectionInput {
  caseId: string;
  sessionId?: string;
  bottleneckType?: string;
}

interface MockWidgetSelectionOutput {
  success: boolean;
  result: WidgetSelectionResult;
  error?: string;
}
```

### 3. UI表示

#### SessionDetail - Generations タブ

モック使用時、Generationヘッダーに黄色の「Mock」バッジを表示:

```
┌─────────────────────────────────────────────────────┐
│ [Widget Selection]  mock [Mock]   0 + 0 tokens  5ms │
└─────────────────────────────────────────────────────┘
```

#### SessionDetail - Overview タブ

Configuration カードにモックモード表示:

```
Configuration:
  Widget Count: 12
  Model: gemini-2.5-mini
  Widget Selection: Mock Mode  ← モック時のみ表示
```

#### ReplayView - Metrics Bar

```
Model: mock [Mock]  |  Tokens: 0 + 0  |  Duration: 5ms
```

### 4. DB保存形式

モック結果は`experiment_generations`テーブルに以下の形式で保存:

| カラム | 値 |
|--------|-----|
| `stage` | `'widget_selection'` |
| `modelId` | `'mock'` |
| `prompt` | `{ "mock": true, "caseId": "case_01" }` |
| `generatedWidgetSelection` | WidgetSelectionResult JSON |
| `widgetSelectionTokens` | `0` |
| `widgetSelectionDuration` | 実測時間（ms） |
| `totalPromptTokens` | `0` |
| `totalResponseTokens` | `0` |

## 使用方法

### 1. 実験開始時の設定

1. `/research-experiment/new` でTechnicalまたはExpertモードを選択
2. 設定画面で「モックWidget選定を使用」チェックボックスをON
3. テストケースを選択して実験開始

### 2. モック判定

- **UI表示**: `modelId === 'mock'` で判定
- **セッション情報**: `session.useMockWidgetSelection` で判定

## テストケース形式

**ファイル**: `config/test-cases/case_*.json`

```json
{
  "caseId": "case_01",
  "expectedFlow": {
    "diverge": {
      "widgets": ["free_writing", "brain_dump"]
    },
    "organize": {
      "widgets": ["categorization", "prioritization"]
    },
    "converge": {
      "widgets": ["action_planning", "commitment"]
    },
    "summary": {
      "widgets": ["structured_summary"]
    }
  }
}
```

### summaryステージのデフォルト

`expectedFlow`に`summary`が定義されていない場合、自動的に`structured_summary`が設定される。

## 注意事項

1. **User Modeでは使用不可**: ユーザー検証モードではモック機能は無効
2. **デフォルト値**: モックはデフォルトOFF（LLM呼び出しがデフォルト）
3. **メトリクス**: モック時は `tokens: 0`, `modelId: 'mock'` を記録
4. **キャッシュ**: モック結果も通常と同様にセッション内でキャッシュされる

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `server/src/database/schema.ts` | `useMockWidgetSelection`フィールド定義 |
| `server/src/services/v4/MockWidgetSelectionService.ts` | モック変換ロジック |
| `server/src/routes/ui.ts` | モックモード分岐処理 |
| `server/src/routes/experiment.ts` | セッション保存時のフラグ処理 |
| `concern-app/src/pages/research-experiment/modes/TechnicalModeConfig.tsx` | UI設定画面 |
| `concern-app/src/pages/research-experiment/modes/ExpertModeConfig.tsx` | UI設定画面 |
| `concern-app/src/pages/research-experiment/SessionDetail.tsx` | モックバッジ表示 |
| `concern-app/src/pages/research-experiment/ReplayView.tsx` | モックバッジ表示 |
