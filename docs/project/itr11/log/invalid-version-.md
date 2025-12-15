--> POST /v1/events/batch 200 2ms
📊 AzureOpenAIService metrics: {
  promptTokens: 848,
  responseTokens: 2135,
  totalTokens: 2983,
  processingTimeMs: 25324,
}
🌐 AzureOpenAI generateText request:
   Expected URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-5-mini-20251209TAKEMOTO/chat/completions?api-version=2025-03-01-preview
   Model: gpt-5-mini
   Deployment: gpt-5-mini-20251209TAKEMOTO
   Using Chat Completions API for GPT-5-mini (reasoning_effort: minimal)
📊 AzureOpenAIService metrics: {
  promptTokens: 863,
  responseTokens: 2170,
  totalTokens: 3033,
  processingTimeMs: 31591,
}
🌐 AzureOpenAI generateText request:
   Expected URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-5-mini-20251209TAKEMOTO/chat/completions?api-version=2025-03-01-preview
   Model: gpt-5-mini
   Deployment: gpt-5-mini-20251209TAKEMOTO
   Using Chat Completions API for GPT-5-mini (reasoning_effort: minimal)
📊 AzureOpenAIService metrics (text): {
  promptTokens: 878,
  responseTokens: 1117,
  totalTokens: 1995,
  processingTimeMs: 12866,
}
🌐 AzureOpenAI generateText request:
   Expected URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-5-mini-20251209TAKEMOTO/chat/completions?api-version=2025-03-01-preview
   Model: gpt-5-mini
   Deployment: gpt-5-mini-20251209TAKEMOTO
   Using Chat Completions API for GPT-5-mini (reasoning_effort: minimal)
📊 AzureOpenAIService metrics (text): {
  promptTokens: 908,
  responseTokens: 1091,
  totalTokens: 1999,
  processingTimeMs: 14875,
}
🌐 AzureOpenAI generateText request:
   Expected URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-5-mini-20251209TAKEMOTO/chat/completions?api-version=2025-03-01-preview
   Model: gpt-5-mini
   Deployment: gpt-5-mini-20251209TAKEMOTO
   Using Chat Completions API for GPT-5-mini (reasoning_effort: minimal)
📊 AzureOpenAIService metrics (text): {
  promptTokens: 2147,
  responseTokens: 1914,
  totalTokens: 4061,
  processingTimeMs: 24599,
}
Stage 3 error: 391 |       errors.push(this.createError('INVALID_VERSION', `Invalid version: ${uiSpec.version}, expected 4.0`, 'version'));
392 |     }
393 | 
394 |     // Widget検証
395 |     const widgetIds = new Set<string>();
396 |     for (let i = 0; i < uiSpec.widgets.length; i++) {
                                     ^
TypeError: undefined is not an object (evaluating 'uiSpec.widgets.length')
      at validateUISpec (/home/nafell/source/sotuken/server/src/services/v4/ValidationService.ts:396:32)
      at executeStage (/home/nafell/source/sotuken/server/src/services/BatchExecutionService.ts:448:37)
      at async executeTrial (/home/nafell/source/sotuken/server/src/services/BatchExecutionService.ts:366:35)
      at async processTaskQueue (/home/nafell/source/sotuken/server/src/services/BatchExecutionService.ts:288:35)

Worker 1 finished for batch 760bac62-bf2a-4a1d-80d7-fc418d864454
📊 AzureOpenAIService metrics (text): {
  promptTokens: 2166,
  responseTokens: 3024,
  totalTokens: 5190,
  processingTimeMs: 37652,
}
Stage 3 error: 391 |       errors.push(this.createError('INVALID_VERSION', `Invalid version: ${uiSpec.version}, expected 4.0`, 'version'));
392 |     }
393 | 
394 |     // Widget検証
395 |     const widgetIds = new Set<string>();
396 |     for (let i = 0; i < uiSpec.widgets.length; i++) {
                                     ^
TypeError: undefined is not an object (evaluating 'uiSpec.widgets.length')
      at validateUISpec (/home/nafell/source/sotuken/server/src/services/v4/ValidationService.ts:396:32)
      at executeStage (/home/nafell/source/sotuken/server/src/services/BatchExecutionService.ts:448:37)
      at async executeTrial (/home/nafell/source/sotuken/server/src/services/BatchExecutionService.ts:366:35)
      at async processTaskQueue (/home/nafell/source/sotuken/server/src/services/BatchExecutionService.ts:288:35)

Worker 0 finished for batch 760bac62-bf2a-4a1d-80d7-fc418d864454
Batch 760bac62-bf2a-4a1d-80d7-fc418d864454 completed: 0/2 completed