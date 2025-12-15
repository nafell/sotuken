# LLMプロバイダー切り替え機能 仕様書

## 概要

本システムでは、UI生成に使用するLLM（Large Language Model）を動的に切り替えることができます。現在、Google AI Studio（Gemini）とAzure OpenAIの2つのプロバイダーに対応しています。

## 対応プロバイダーとモデル

### Google AI Studio (Gemini)

| モデルID | 説明 |
|---------|------|
| `gemini-2.5-flash-lite` | 軽量高速モデル（デフォルト） |
| `gemini-2.5-flash` | 標準モデル |
| `gemini-2.5-pro` | 高性能モデル |

### Azure OpenAI

| モデルID | 環境変数 | 説明 |
|---------|----------|------|
| `gpt-4.1` | `AZURE_OPENAI_DEPLOYMENT_GPT4_1_VANILLA` | GPT-4.1 |
| `gpt-4.1-mini` | `AZURE_OPENAI_DEPLOYMENT_GPT4_1_MINI` | GPT-4.1 Mini |
| `gpt-5-chat` | `AZURE_OPENAI_DEPLOYMENT_GPT5_CHAT` | GPT-5 Chat |
| `gpt-5-mini` | `AZURE_OPENAI_DEPLOYMENT_GPT5_MINI` | GPT-5 Mini |
| `model-router` | `AZURE_OPENAI_DEPLOYMENT_MODEL_ROUTER` | Model Router |

## アーキテクチャ

### データフロー

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
├─────────────────────────────────────────────────────────────────┤
│  ExpertModeConfig / TechnicalModeConfig                         │
│    ↓ (provider, modelId をURLパラメータとして渡す)              │
│  CaseExecution                                                  │
│    ↓ (props として渡す)                                         │
│  ExperimentExecutor                                             │
│    ↓ (API呼び出し時にoptionsに含める)                           │
│  ApiService.generateWidgetSelection()                           │
│  ApiService.generatePlanUI()                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP POST (options.provider, options.modelId)
┌─────────────────────────────────────────────────────────────────┐
│                        Backend                                   │
├─────────────────────────────────────────────────────────────────┤
│  ui.ts (routes)                                                 │
│    ↓ (provider, modelIdを抽出)                                  │
│  getV4Services(provider, modelId)                               │
│    ↓ (LLMOrchestratorのタスク設定を更新)                        │
│  LLMOrchestrator                                                │
│    ↓ (providerに応じてサービスを選択)                           │
│  GeminiService / AzureOpenAIService                             │
└─────────────────────────────────────────────────────────────────┘
```

### コンポーネント構成

#### Frontend

| ファイル | 役割 |
|---------|------|
| `ExpertModeConfig.tsx` | 専門家評価モードのプロバイダー/モデル選択UI |
| `TechnicalModeConfig.tsx` | 技術評価モードのプロバイダー/モデル選択UI |
| `CaseExecution.tsx` | URLパラメータからprovider/modelIdを取得し、ExperimentExecutorに渡す |
| `ExperimentExecutor.tsx` | Widget選定・Plan生成APIにprovider/modelIdを渡す |
| `ExperimentPlanUnified.tsx` | Plan生成APIにprovider/modelIdを渡す |
| `ApiService.ts` | APIリクエストにprovider/modelIdを含める |

#### Backend

| ファイル | 役割 |
|---------|------|
| `routes/ui.ts` | リクエストからprovider/modelIdを抽出し、V4サービスに渡す |
| `services/v4/LLMOrchestrator.ts` | タスク設定に基づいて適切なLLMサービスを呼び出す |
| `services/GeminiService.ts` | Google AI Studio APIとの通信 |
| `services/AzureOpenAIService.ts` | Azure OpenAI APIとの通信 |

## 環境変数

### Google AI Studio

```bash
GEMINI_API_KEY=your_gemini_api_key
```

### Azure OpenAI

```bash
# 共通設定
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# デプロイメント名（使用するモデルに対応するものを設定）
AZURE_OPENAI_DEPLOYMENT_GPT4_1_VANILLA=your-gpt41-deployment
AZURE_OPENAI_DEPLOYMENT_GPT4_1_MINI=your-gpt41-mini-deployment
AZURE_OPENAI_DEPLOYMENT_GPT5_CHAT=your-gpt5-chat-deployment
AZURE_OPENAI_DEPLOYMENT_GPT5_MINI=your-gpt5-mini-deployment
AZURE_OPENAI_DEPLOYMENT_MODEL_ROUTER=your-model-router-deployment
```

## API仕様

### Widget選定API

**エンドポイント**: `POST /api/ui/generate-v4-widgets`

**リクエストボディ**:
```json
{
  "sessionId": "uuid",
  "concernText": "ユーザーの悩みテキスト",
  "options": {
    "bottleneckType": "thought",
    "provider": "azure",
    "modelId": "gpt-4.1-mini"
  }
}
```

### Plan生成API

**エンドポイント**: `POST /api/ui/generate-v4-plan`

**リクエストボディ**:
```json
{
  "sessionId": "uuid",
  "concernText": "ユーザーの悩みテキスト",
  "options": {
    "bottleneckType": "thought",
    "enableReactivity": true,
    "provider": "azure",
    "modelId": "gpt-4.1-mini"
  }
}
```

## GUI操作

### 専門家評価モード (Expert Mode)

1. `/research-experiment/new/expert` にアクセス
2. 「Environment Settings」セクションで：
   - **LLM Provider**: `Google AI Studio` または `Azure OpenAI` を選択
   - **Model**: 選択したプロバイダーに対応するモデル一覧から選択
3. 「Start Evaluation Session」をクリック

### 技術評価モード (Technical Mode)

1. `/research-experiment/new/technical` にアクセス
2. 「Environment Settings」セクションで：
   - **LLM Provider**: `Google AI Studio` または `Azure OpenAI` を選択
   - **Model**: 選択したプロバイダーに対応するモデル一覧から選択
3. テストケースを選択して「Start Execution」をクリック

## 設定ファイル

### experiment-settings.json

モデル一覧は `config/experiment-settings.json` の `modelConditions` で定義されています。

```json
{
  "modelConditions": [
    {
      "id": "flash-lite",
      "provider": "gemini",
      "modelId": "gemini-2.5-flash-lite",
      "description": "軽量高速モデル（デフォルト）"
    },
    {
      "id": "azure-gpt41-mini",
      "provider": "azure",
      "modelId": "gpt-4.1-mini",
      "description": "Azure GPT-4.1 Mini"
    }
    // ...
  ]
}
```

## エラーハンドリング

### 環境変数未設定エラー

Azure OpenAIで指定されたモデルのデプロイメント名が環境変数に設定されていない場合、以下のエラーが発生します：

```
Error: AZURE_OPENAI_DEPLOYMENT_GPT4_1_MINI environment variable is not set
```

### 不明なモデルIDエラー

サポートされていないモデルIDが指定された場合：

```
Error: Unknown model ID: invalid-model. Available models: gpt-4.1, gpt-4.1-mini, gpt-5-chat, gpt-5-mini, model-router
```

## 拡張方法

### 新しいAzureモデルを追加する場合

1. `server/src/services/AzureOpenAIService.ts`:
   - `AZURE_AVAILABLE_MODELS` に新しいモデルIDを追加
   - `MODEL_TO_DEPLOYMENT_ENV` に環境変数名のマッピングを追加

2. `server/src/types/v4/llm-task.types.ts`:
   - `AZURE_AVAILABLE_MODELS` に新しいモデルIDを追加

3. `config/experiment-settings.json`:
   - `modelConditions` に新しいモデルのエントリを追加

4. `.env.development.example`:
   - 新しいデプロイメント名の環境変数を追加

### 新しいプロバイダーを追加する場合

1. 新しいサービスクラスを作成（例: `AnthropicService.ts`）
2. `server/src/types/v4/llm-task.types.ts` の `LLMProvider` 型に追加
3. `server/src/services/v4/LLMOrchestrator.ts` でプロバイダーの分岐を追加
4. フロントエンドのプロバイダー選択UIを更新

## 関連ドキュメント

- [Azure OpenAI統合実装レポート](../implementation-reports/azure-openai-integration.md)
- [DSL v4/v5 仕様](../specs/dsl-design/)
