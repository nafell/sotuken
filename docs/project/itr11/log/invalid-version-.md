   Model ID: gpt-4.1
   Deployment Name: gpt-4.1-20251209TAKEMOTO
   Base URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4.1-20251209TAKEMOTO
   API Version: 2025-03-01-preview
   Use Responses API: false
🌐 AzureOpenAI generateText request:
   Expected URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4.1-20251209TAKEMOTO/chat/completions?api-version=2025-03-01-preview
   Model: gpt-4.1
   Deployment: gpt-4.1-20251209TAKEMOTO
   Using Chat Completions API
📊 AzureOpenAIService metrics (text): {
  promptTokens: 879,
  responseTokens: 557,
  totalTokens: 1436,
  processingTimeMs: 5087,
}
Stage 2 error: 216 |       errors.push(this.createError('INVALID_VERSION', `Invalid version: ${ors.version}, expected 4.0`, 'version'));
217 |     }
218 | 
219 |     // Entity検証
220 |     const entityIds = new Set<string>();
221 |     for (let i = 0; i < ors.entities.length; i++) {
                                  ^
TypeError: undefined is not an object (evaluating 'ors.entities.length')
      at validateORS (/home/nafell/source/sotuken/server/src/services/v4/ValidationService.ts:221:29)
      at executeStage (/home/nafell/source/sotuken/server/src/services/BatchExecutionService.ts:340:37)
      at async executeTrial (/home/nafell/source/sotuken/server/src/services/BatchExecutionService.ts:268:35)
      at async executeBatch (/home/nafell/source/sotuken/server/src/services/BatchExecutionService.ts:198:37)
