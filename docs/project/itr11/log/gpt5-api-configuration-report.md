# GPT-5系モデルAPI設定変更報告書

**作成日**: 2025-12-11
**対象ファイル**: `server/src/services/AzureOpenAIService.ts`
**関連コミット**: a5aab0a

---

## 1. 背景・目的

実験仕様（Layer1 & Layer4自動評価実験）の要件に基づき、GPT-5系モデルのAPI呼び出し方式を最適化する必要があった。

### 課題
1. **GPT-5-mini**: Responses APIを使用していたため、推論トークンが大量に消費され、レイテンシが54-59秒と長かった
2. **再現性**: 推論モデルでは `temperature=0.0` が無効のため、実験の再現性に影響
3. **公平な比較**: GPT-5-miniとGPT-4.1-miniを同条件で比較できなかった

---

## 2. 調査結果

### 2.1 GPT-5-miniの特性（参照: completions-api-question.md）

- GPT-5-miniは**推論モデル扱い**だが、Chat Completions APIでも使用可能
- `reasoning_effort` パラメータで推論レベルを制御可能
  - `"minimal"`: 推論を最小化（最も軽量）
  - `"low"`: 軽い推論
  - `"medium"`: デフォルト
  - `"high"`: 最大推論
- 推論モデルでは `max_tokens` ではなく `max_completion_tokens` を使用

### 2.2 Azure OpenAI Responses APIの制約

- `reasoning` パラメータは**サポートされていない**
- エラー: `Unsupported parameter: 'reasoning.effort' is not supported with this model.`

---

## 3. 実装内容

### 3.1 変更前後の比較

| モデル | 変更前 | 変更後 |
|--------|--------|--------|
| GPT-5-chat | Responses API | Responses API（変更なし） |
| GPT-5-mini | Responses API | **Chat Completions API** + `reasoning_effort="minimal"` |
| GPT-4.1系 | Chat Completions API | Chat Completions API（変更なし） |

### 3.2 APIバージョン

| モデル | APIバージョン |
|--------|---------------|
| GPT-5-chat | `2025-04-01-preview` (Responses API) |
| GPT-5-mini | `2025-03-01-preview` (Chat Completions API) |
| GPT-4.1系 | `2024-12-01-preview` (Chat Completions API) |

### 3.3 主要な変更点

#### モデル判定関数の追加
```typescript
// GPT-5-chatのみResponses APIを使用
function useResponsesApi(modelId: string): boolean {
  return modelId === "gpt-5-chat";
}

// GPT-5-miniはChat Completions API + reasoning_effort
function isGpt5Mini(modelId: string): boolean {
  return modelId === "gpt-5-mini";
}
```

#### GPT-5-mini用のAPI呼び出し
```typescript
result = await this.client.chat.completions.create({
  model: this.deploymentName,
  messages: [{ role: "user", content: fullPrompt }],
  response_format: { type: "json_object" },
  reasoning_effort: "minimal",     // 推論を最小化
  max_completion_tokens: 4096,     // 推論モデル用パラメータ
});
```

#### デバッグログの追加
```typescript
console.log(`🔍 getAzureConfig: modelId="${modelId}" -> envKey="${deploymentEnvKey}" -> deploymentName="${deploymentName}"`);
```

---

## 4. 期待される効果

### 4.1 パフォーマンス改善
- **GPT-5-mini レイテンシ**: 54-59秒 → 推定10-20秒（推論トークン最小化による）
- **APIコスト削減**: 推論トークンの消費を抑制

### 4.2 実験品質向上
- **再現性**: `reasoning_effort="minimal"` で非決定的要素を最小化
- **公平な比較**: GPT-5-miniとGPT-4.1-miniを同じAPI形式で比較可能

---

## 5. 検証結果

- ✅ GPT-5-chat: Responses APIで正常動作
- ✅ GPT-5-mini: Chat Completions APIで正常動作
- ✅ ビルド成功

---

## 6. 注意事項

1. **環境変数**: `AZURE_OPENAI_DEPLOYMENT_GPT5_MINI` が正しく設定されている必要がある
2. **Azure OpenAI制約**: Responses APIでは `reasoning` パラメータは使用不可
3. **型定義**: `reasoning_effort` はOpenAI SDKの型定義に含まれていないため `as any` でキャスト

---

## 7. 関連ドキュメント

- `docs/project/itr11/completions-api-question.md` - Chat Completions API調査結果
- `specs/system-design/experiment_spec_layer_1_layer_4.md` - 実験仕様書
