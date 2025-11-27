/**
 * Thought Organization API Routes
 * /v1/thought/* エンドポイント
 */

import { Hono } from 'hono';
import { createGeminiService } from '../services/GeminiService';
import { DataSchemaGenerator } from '../services/DataSchemaGenerator';
import { UISpecGenerator } from '../services/UISpecGenerator';

const thoughtRoutes = new Hono();

/**
 * POST /v1/thought/generate
 * 思考整理用のDataSchemaとUISpecを生成
 */
thoughtRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { stage, concernText, sessionId, previousSchema, factors } = body;

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

    console.log(`🧠 Thought generation request: stage=${stage}, concernText="${concernText.substring(0, 30)}..."`);

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

    // DataSchema生成
    console.log('📋 Generating DataSchema...');
    const schemaGenerator = new DataSchemaGenerator(geminiService);
    
    let dataSchema;
    try {
      dataSchema = await schemaGenerator.generateSchema({
        stage,
        concernText,
        category: factors?.category,
        previousSchema,
        factors
      });
      console.log('✅ DataSchema generated:', dataSchema.generationId);
    } catch (error) {
      console.error('DataSchema generation failed:', error);
      return c.json({
        error: 'Failed to generate DataSchema',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }

    // UISpec生成
    console.log('🎨 Generating UISpec...');
    const uiGenerator = new UISpecGenerator(geminiService);
    
    let uiSpec;
    try {
      uiSpec = await uiGenerator.generateUISpec({
        dataSchema,
        stage,
        factors
      });
      console.log('✅ UISpec generated:', uiSpec.generationId);
    } catch (error) {
      console.error('UISpec generation failed:', error);
      return c.json({
        error: 'Failed to generate UISpec',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }

    // レスポンス
    return c.json({
      success: true,
      generationId: dataSchema.generationId,
      dataSchema,
      uiSpec,
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Thought generation error:', error);
    return c.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /v1/thought/health
 * 思考整理API のヘルスチェック
 */
thoughtRoutes.get('/health', (c) => {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  return c.json({
    status: 'ok',
    service: 'thought-organization',
    geminiApiConfigured: hasApiKey,
    timestamp: new Date().toISOString()
  });
});

export { thoughtRoutes };


