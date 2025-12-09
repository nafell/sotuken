# Azure OpenAI API Integration Implementation Report

## 概要

Google AI Studio (Gemini) APIに加えて、Azure OpenAI APIをサポートする機能を実装しました。

- **実装日**: 2025-12-08
- **ブランチ**: feat/azure-openai

## 要件

1. Azure OpenAI APIキー認証（Entra IDではない）
2. 対応モデル: GPT-5.1 Global, GPT-5.1-codex Global, GPT-5.1-codex-mini Global
3. GUI切り替え: SettingsScreen + TechnicalModeConfig の両方
4. configでデフォルトプロバイダー指定

## 技術的アプローチ

### LLMプロバイダー抽象化

既存の`LLMServiceInterface`を活用し、`AzureOpenAIService`を新規実装:

```typescript
export interface LLMServiceInterface {
  generateJSON(prompt: string): Promise<{...}>;
  generateText(prompt: string): Promise<{...}>;
  getModelId(): string;
}
```

### Azure OpenAI接続

OpenAI SDKをAzure用に設定して使用:

```typescript
this.client = new OpenAI({
  apiKey,
  baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
  defaultQuery: { 'api-version': apiVersion },
  defaultHeaders: { 'api-key': apiKey },
});
```

## 変更ファイル一覧

### バックエンド

| ファイル | 変更内容 |
|---------|---------|
| `server/package.json` | `openai` パッケージ追加 |
| `server/src/services/AzureOpenAIService.ts` | **新規作成** - Azure OpenAI Service接続クラス |
| `server/src/types/v4/llm-task.types.ts` | `LLMProvider`に`azure`追加、`AZURE_AVAILABLE_MODELS`定義、型ガード更新 |
| `server/src/services/v4/LLMOrchestrator.ts` | `getService()`にAzureプロバイダーケース追加 |
| `server/src/routes/ui.ts` | プロバイダー別V4サービスキャッシュ、APIパラメータ対応 |

### 設定ファイル

| ファイル | 変更内容 |
|---------|---------|
| `config/experiment-settings.json` | Azure GPT-5.1モデル3種追加、`defaults.provider`追加 |
| `.env.development.example` | Azure OpenAI環境変数テンプレート追加 |

### フロントエンド

| ファイル | 変更内容 |
|---------|---------|
| `concern-app/src/services/ExperimentApiService.ts` | `LLMProvider`型追加、`modelConditions`にprovider追加 |
| `concern-app/src/pages/research-experiment/modes/TechnicalModeConfig.tsx` | プロバイダー選択UI追加 |
| `concern-app/src/screens/SettingsScreen.tsx` | デバッグセクションにプロバイダー切り替え追加 |

## 環境変数

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# デプロイメント名（使用するモデルに対応するものを設定）
AZURE_OPENAI_DEPLOYMENT_GPT4_1_VANILLA=your-gpt41-deployment
AZURE_OPENAI_DEPLOYMENT_GPT4_1_MINI=your-gpt41-mini-deployment
AZURE_OPENAI_DEPLOYMENT_GPT5_CHAT=your-gpt5-chat-deployment
AZURE_OPENAI_DEPLOYMENT_GPT5_MINI=your-gpt5-mini-deployment
AZURE_OPENAI_DEPLOYMENT_MODEL_ROUTER=your-model-router-deployment
```

## 対応モデル

| モデルID | 環境変数 | 説明 |
|---------|----------|------|
| `gpt-4.1` | `AZURE_OPENAI_DEPLOYMENT_GPT4_1_VANILLA` | GPT-4.1 |
| `gpt-4.1-mini` | `AZURE_OPENAI_DEPLOYMENT_GPT4_1_MINI` | GPT-4.1 Mini |
| `gpt-5-chat` | `AZURE_OPENAI_DEPLOYMENT_GPT5_CHAT` | GPT-5 Chat |
| `gpt-5-mini` | `AZURE_OPENAI_DEPLOYMENT_GPT5_MINI` | GPT-5 Mini |
| `model-router` | `AZURE_OPENAI_DEPLOYMENT_MODEL_ROUTER` | Model Router |

## GUI操作

### 実験管理画面 (Technical Validation Setup)

1. `/research-experiment` にアクセス
2. 「New Experiment」→「Technical Validation」を選択
3. 「Environment Settings」セクションで：
   - **LLM Provider**: Google AI Studio / Azure OpenAI を選択
   - **Model**: 選択したプロバイダーに対応するモデル一覧から選択

### 設定画面 (開発環境のみ)

1. `/settings` にアクセス
2. 「デバッグ機能」セクションで：
   - **LLM Provider**: プロバイダーを選択

## API仕様

### Widget選定API

```
POST /v1/ui/generate-v4-widgets

{
  "sessionId": "...",
  "concernText": "...",
  "options": {
    "provider": "azure",        // 新規追加
    "modelId": "gpt-51-global", // 新規追加
    "bottleneckType": "..."
  }
}
```

### Plan生成API

```
POST /v1/ui/generate-v4-plan

{
  "sessionId": "...",
  "concernText": "...",
  "options": {
    "provider": "azure",        // 新規追加
    "modelId": "gpt-51-global", // 新規追加
    "enableReactivity": true
  }
}
```

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend                             │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  SettingsScreen  │  │  TechnicalModeConfig         │ │
│  │  (Provider選択)   │  │  (Provider + Model選択)     │ │
│  └────────┬─────────┘  └────────────┬─────────────────┘ │
└───────────┼─────────────────────────┼───────────────────┘
            │                         │
            ▼                         ▼
┌─────────────────────────────────────────────────────────┐
│                     Backend API                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              ui.ts (routes)                       │   │
│  │   - getV4Services(provider, modelId)              │   │
│  └────────────────────────┬─────────────────────────┘   │
│                           │                              │
│  ┌────────────────────────▼─────────────────────────┐   │
│  │              LLMOrchestrator                      │   │
│  │   - getService() でプロバイダー別サービス取得     │   │
│  └────────┬───────────────────────────────┬─────────┘   │
│           │                               │              │
│  ┌────────▼────────┐           ┌──────────▼──────────┐  │
│  │  GeminiService  │           │ AzureOpenAIService  │  │
│  │  (Gemini 2.5)   │           │ (GPT-5.1)           │  │
│  └────────┬────────┘           └──────────┬──────────┘  │
└───────────┼───────────────────────────────┼─────────────┘
            │                               │
            ▼                               ▼
    ┌───────────────┐               ┌───────────────┐
    │ Google AI     │               │ Azure OpenAI  │
    │ Studio API    │               │ Service API   │
    └───────────────┘               └───────────────┘
```

## 後方互換性

- 既存のGemini APIを使用したコードは変更なしで動作
- `provider`パラメータ省略時はデフォルトで`gemini`を使用
- `modelConditions`の`provider`フィールドは省略可能（省略時は`gemini`として扱う）

## テスト方法

1. Azure OpenAI環境変数を設定
2. サーバー起動: `cd server && bun run dev`
3. フロントエンド起動: `cd concern-app && bun run dev`
4. `/research-experiment` で Technical Validation を実行
5. Provider を Azure OpenAI に切り替えてテスト実行

## 既知の制限事項

- Azure OpenAI のレート制限はGeminiと異なる可能性があり、エラー時のリトライ戦略は既存のまま
- 使用するモデルに対応するデプロイメント名の環境変数設定が必須
