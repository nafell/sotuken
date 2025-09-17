import { Hono } from 'hono';
// import { GoogleGenerativeAI } from '@google/generative-ai';
// TODO: Phase 2でLLM統合予定

const uiRoutes = new Hono();

/**
 * UI生成API
 * POST /v1/ui/generate
 * 
 * 目的: ユーザー状況と関心事に基づいてUI DSLを生成
 * Phase 0では固定UI、Phase 1でLLM統合
 */
uiRoutes.post('/generate', async (c) => {
  try {
    const request = await c.req.json();
    
    // バリデーション
    if (!request.sessionId) {
      return c.json({
        error: {
          code: "INVALID_REQUEST",
          message: "sessionId is required"
        }
      }, 400);
    }
    
    if (!request.userExplicitInput?.concernText) {
      return c.json({
        error: {
          code: "INVALID_REQUEST",
          message: "userExplicitInput.concernText is required"
        }
      }, 400);
    }
    
    console.log(`🎨 UI generation request for session: ${request.sessionId}`);
    console.log(`📝 Concern: "${request.userExplicitInput.concernText.slice(0, 50)}..."`);
    
    // Phase 0: 固定UI返却（フォールバック版）
    const generationId = crypto.randomUUID();
    const staticUI = {
      version: "1.1",
      theme: { 
        style: "daily-rotating", 
        noveltyLevel: request.noveltyLevel || "low", 
        seed: Math.floor(Math.random() * 10000)
      },
      layoutHints: {
        motionLevel: 1,
        colorVariance: 2
      },
      layout: {
        type: "vertical",
        sections: [
          {
            type: "headline",
            text: "さあ、第一歩を踏み出そう",
            style: "encouraging"
          },
          {
            type: "cards",
            items: [{
              component: "card",
              title: "2分で始めてみる",
              subtitle: request.userExplicitInput.concernText.length > 50 
                ? request.userExplicitInput.concernText.slice(0, 50) + "..." 
                : request.userExplicitInput.concernText,
              accent: "priority",
              actions: [{ 
                id: "start_action", 
                label: "開始",
                params: {
                  actionId: "quick_start",
                  estimatedMin: 2
                }
              }]
            }]
          },
          {
            type: "widget",
            component: "breathing",
            params: {
              seconds: 60,
              message: "まずは深呼吸から"
            }
          }
        ]
      },
      actions: {
        start_action: {
          kind: "navigate",
          target: "/action-execution",
          paramsSchema: {
            actionId: "string",
            estimatedMin: "number"
          },
          track: true
        }
      }
    };
    
    // TODO: Phase 1でデータベースに生成ログを記録
    // await db.ui_generation_requests.create({...});
    
    const response = {
      sessionId: request.sessionId,
      generationId,
      uiDsl: staticUI,
      generation: {
        model: "static_fallback",
        seed: staticUI.theme.seed,
        generatedAt: new Date().toISOString(),
        processingTimeMs: 10, // 固定UIなので高速
        fallbackUsed: true,
        promptTokens: 0,
        responseTokens: 0
      }
    };
    
    console.log(`✅ Static UI generated, ID: ${generationId}`);
    
    return c.json(response);
    
  } catch (error) {
    console.error('❌ UI generation error:', error);
    
    // フォールバック処理
    const fallbackUI = {
      version: "1.1",
      theme: {
        style: "daily-rotating",
        noveltyLevel: "low",
        seed: 0
      },
      layout: {
        type: "vertical",
        sections: [
          {
            type: "cards",
            items: [
              {
                component: "card",
                title: "2分で始めてみる",
                accent: "calm",
                actions: [
                  {
                    id: "start_simple",
                    label: "開始"
                  }
                ]
              }
            ]
          },
          {
            type: "widget",
            component: "breathing"
          }
        ]
      }
    };
    
    return c.json({
      error: {
        code: "UI_GENERATION_FAILED",
        message: "UI generation temporarily unavailable",
        details: {
          reason: "internal_error",
          retryable: true
        }
      },
      fallback: {
        recommendAction: "use_local_template",
        templateId: "minimal_card_breathing",
        uiDsl: fallbackUI
      }
    }, 500);
  }
});

/**
 * UI生成状況確認API
 * GET /v1/ui/status
 */
uiRoutes.get('/status', async (c) => {
  return c.json({
    status: 'operational',
    mode: 'static_fallback', // Phase 0
    availableFeatures: ['basic_cards', 'breathing_widget', 'static_layouts'],
    llmIntegration: false, // Phase 1で有効化
    timestamp: new Date().toISOString()
  });
});

export { uiRoutes };
