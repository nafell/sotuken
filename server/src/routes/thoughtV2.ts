/**
 * Thought Organization API Routes v2.0
 * /v2/thought/* エンドポイント
 *
 * UISpec v2.0対応の新しいAPI
 */

import { Hono } from 'hono';
import { createGeminiService } from '../services/GeminiService';
import { UISpecGeneratorV2 } from '../services/UISpecGeneratorV2';

const thoughtRoutesV2 = new Hono();

/**
 * POST /v2/thought/generate
 * UISpec v2.0形式で思考整理UIを生成
 *
 * DataSchema生成を廃止し、UISpecのみを直接生成
 */
thoughtRoutesV2.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { stage, concernText, sessionId, factors } = body;

    // バリデーション
    if (!stage || !concernText) {
      return c.json({
        error: 'Missing required fields: stage, concernText'
      }, 400);
    }

    if (!['capture', 'plan', 'breakdown'].includes(stage)) {
      return c.json({
        error: 'Invalid stage: must be one of capture, plan, breakdown'
      }, 400);
    }

    console.log(`🧠 [v2] Thought generation request: stage=${stage}, concernText="${concernText.substring(0, 30)}..."`);

    // Geminiサービスの初期化
    let geminiService;
    try {
      geminiService = createGeminiService();
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      return c.json({
        error: 'API configuration error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }

    // UISpec v2.0生成
    console.log('🎨 [v2] Generating UISpec v2.0...');
    const uiGenerator = new UISpecGeneratorV2(geminiService);

    let uiSpec;
    try {
      uiSpec = await uiGenerator.generateUISpec({
        concernText,
        stage,
        factors
      });
      console.log('✅ [v2] UISpec generated:', uiSpec.metadata?.generationId);
    } catch (error) {
      console.error('[v2] UISpec generation failed:', error);
      return c.json({
        error: 'Failed to generate UISpec v2.0',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }

    // レスポンス
    return c.json({
      success: true,
      version: '2.0',
      generationId: uiSpec.metadata?.generationId,
      uiSpec,
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[v2] Thought generation error:', error);
    return c.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /v2/thought/health
 * v2 APIのヘルスチェック
 */
thoughtRoutesV2.get('/health', (c) => {
  const hasApiKey = !!process.env.GEMINI_API_KEY;

  return c.json({
    status: 'ok',
    version: '2.0',
    service: 'thought-organization-v2',
    geminiApiConfigured: hasApiKey,
    features: {
      simplifiedDSL: true,
      sevenWidgets: true,
      expressionEngine: true,
      runtimeValidation: true
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /v2/thought/validate
 * UISpec v2.0のバリデーション専用エンドポイント
 */
thoughtRoutesV2.post('/validate', async (c) => {
  try {
    const body = await c.req.json();
    const { uiSpec } = body;

    if (!uiSpec) {
      return c.json({
        error: 'Missing required field: uiSpec'
      }, 400);
    }

    // バリデーション（動的インポート）
    const { validateUISpecV2, formatValidationErrors } = await import('../types/UISpecV2Schema');
    const validation = validateUISpecV2(uiSpec);

    if (!validation.success) {
      return c.json({
        valid: false,
        errors: formatValidationErrors(validation.errors!)
      });
    }

    return c.json({
      valid: true,
      uiSpec: validation.data
    });

  } catch (error) {
    console.error('[v2] Validation error:', error);
    return c.json({
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { thoughtRoutesV2 };
