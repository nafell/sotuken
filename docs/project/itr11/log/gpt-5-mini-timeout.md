<-- POST /v1/ui/generate-v4-widgets
🔍 Widget Selection request for session: e239fc92-e163-4490-b6d1-47e921f4a4a9
📝 Concern: "人生の選択肢を整理中。マインドマップで書き出した考えを2軸で評価したい..."
🧪 Mock mode: false, caseId: case_04
🤖 Provider: azure, Model: gpt-5-mini
🔧 Creating V4 services for provider: azure, model: gpt-5-mini
🔍 [Widget Selection] Executing for bottleneck: unorganized_info
[WidgetSelectionService] Starting widget selection for bottleneck: unorganized_info
🔧 AzureOpenAIService initialization:
   Model ID: gpt-5-mini
   Deployment Name: gpt-5-mini-20251209TAKEMOTO
   Base URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai
   API Version: 2025-03-01-preview
   Use Responses API: true
[LLMOrchestrator] Executing widget_selection with model gpt-5-mini
[LLMOrchestrator] Prompt length: 12309
🌐 AzureOpenAI generateJSON request:
   Expected URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai/responses?api-version=2025-03-01-preview
   Model: gpt-5-mini
   Deployment: gpt-5-mini-20251209TAKEMOTO
   Using Responses API for GPT-5 model
[LLMOrchestrator] Retry 1/2 for widget_selection: Timeout
[LLMOrchestrator] Executing widget_selection with model gpt-5-mini
[LLMOrchestrator] Prompt length: 12309
🌐 AzureOpenAI generateJSON request:
   Expected URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai/responses?api-version=2025-03-01-preview
   Model: gpt-5-mini
   Deployment: gpt-5-mini-20251209TAKEMOTO
   Using Responses API for GPT-5 model
   📊 Responses API raw usage: {
  "input_tokens": 4076,
  "input_tokens_details": {
    "cached_tokens": 3840
  },
  "output_tokens": 3506,
  "output_tokens_details": {
    "reasoning_tokens": 1408
  },
  "total_tokens": 7582
}
📊 AzureOpenAIService metrics: {
  promptTokens: 4076,
  responseTokens: 3506,
  totalTokens: 7582,
  processingTimeMs: 54520,
}
[LLMOrchestrator] Retry 2/2 for widget_selection: Timeout
[LLMOrchestrator] Executing widget_selection with model gpt-5-mini
[LLMOrchestrator] Prompt length: 12309
🌐 AzureOpenAI generateJSON request:
   Expected URL: https://yamaz-mix3u836-eastus2.cognitiveservices.azure.com/openai/responses?api-version=2025-03-01-preview
   Model: gpt-5-mini
   Deployment: gpt-5-mini-20251209TAKEMOTO
   Using Responses API for GPT-5 model
   📊 Responses API raw usage: {
  "input_tokens": 4076,
  "input_tokens_details": {
    "cached_tokens": 0
  },
  "output_tokens": 3765,
  "output_tokens_details": {
    "reasoning_tokens": 1600
  },
  "total_tokens": 7841
}
📊 AzureOpenAIService metrics: {
  promptTokens: 4076,
  responseTokens: 3765,
  totalTokens: 7841,
  processingTimeMs: 59348,
}
[LLMOrchestrator] Retry 3/2 for widget_selection: Timeout
[WidgetSelectionService] LLM result.success: false
[WidgetSelectionService] LLM result.data: undefined
[WidgetSelectionService] LLM result.rawOutput: undefined
[WidgetSelectionService] LLM call failed, error: {
  type: "api_error",
  message: "All retries failed: Timeout",
}
⚠️ Widget selection failed, using fallback