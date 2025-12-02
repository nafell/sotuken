import { Hono } from 'hono';
import { db } from '../database/index';
import { experimentGenerations } from '../database/schema';
import { createGeminiService } from '../services/GeminiService';
import {
  createUISpecGeneratorV3,
  type UISpecV3GenerationRequest,
  type StageType,
} from '../services/UISpecGeneratorV3';
import { logMetricsSummary } from '../utils/metricsLogger';

// V4 imports
import {
  createLLMOrchestratorWithDefaultPrompts,
  createWidgetSelectionService,
  createORSGeneratorService,
  createUISpecGeneratorV4,
} from '../services/v4';
import type { StageType as StageTypeV4 } from '../types/v4/ors.types';

const uiRoutes = new Hono();

// GeminiService インスタンス（遅延初期化）
let geminiService: ReturnType<typeof createGeminiService> | null = null;

function getGeminiService() {
  if (!geminiService) {
    geminiService = createGeminiService();
  }
  return geminiService;
}

// V4 サービスインスタンス（遅延初期化）
let v4Services: {
  llmOrchestrator: ReturnType<typeof createLLMOrchestratorWithDefaultPrompts>;
  widgetSelectionService: ReturnType<typeof createWidgetSelectionService>;
  orsGeneratorService: ReturnType<typeof createORSGeneratorService>;
  uiSpecGeneratorV4: ReturnType<typeof createUISpecGeneratorV4>;
} | null = null;

// V4のWidget選定結果キャッシュ（セッション単位）
const widgetSelectionCache = new Map<string, {
  result: Awaited<ReturnType<ReturnType<typeof createWidgetSelectionService>['selectWidgets']>>;
  bottleneckType: string;
}>();

function getV4Services() {
  if (!v4Services) {
    const llmOrchestrator = createLLMOrchestratorWithDefaultPrompts({ debug: false });
    const widgetSelectionService = createWidgetSelectionService({ llmOrchestrator });
    const orsGeneratorService = createORSGeneratorService({ llmOrchestrator });
    const uiSpecGeneratorV4 = createUISpecGeneratorV4({ llmOrchestrator });

    v4Services = {
      llmOrchestrator,
      widgetSelectionService,
      orsGeneratorService,
      uiSpecGeneratorV4,
    };
  }
  return v4Services;
}

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

/**
 * UISpec v3生成API (Phase 4 Day 3-4)
 * POST /v1/ui/generate-v3
 *
 * DSL v3用のUISpec生成エンドポイント
 * 12種プリセットWidgetを活用した動的UI生成
 */
uiRoutes.post('/generate-v3', async (c) => {
  try {
    const body = await c.req.json();

    // バリデーション
    if (!body.sessionId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId is required',
          },
        },
        400
      );
    }

    if (!body.concernText) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'concernText is required',
          },
        },
        400
      );
    }

    // ステージのバリデーション
    const validStages: StageType[] = ['diverge', 'organize', 'converge', 'summary'];
    const stage: StageType = body.stage || 'diverge';
    if (!validStages.includes(stage)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: `Invalid stage. Must be one of: ${validStages.join(', ')}`,
          },
        },
        400
      );
    }

    console.log(`🎨 UISpec v3 generation request for session: ${body.sessionId}`);
    console.log(`📝 Concern: "${body.concernText.slice(0, 50)}..."`);
    console.log(`🎯 Stage: ${stage}`);
    if (body.options?.restrictToImplementedWidgets) {
      console.log(`🔒 Widget restriction: implemented only`);
    }

    // UISpecGeneratorV3でUISpec生成
    const gemini = getGeminiService();
    const generator = createUISpecGeneratorV3(gemini);

    const request: UISpecV3GenerationRequest = {
      sessionId: body.sessionId,
      concernText: body.concernText,
      stage,
      factors: body.factors,
      options: body.options,
    };

    const result = await generator.generateUISpec(request);

    // セッションサマリーをログ
    logMetricsSummary(body.sessionId);

    if (!result.success) {
      console.error(`❌ UISpec v3 generation failed: ${result.error}`);
      return c.json(
        {
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: result.error,
            retryCount: result.retryCount,
          },
          metrics: result.metrics,
        },
        500
      );
    }

    // Phase 7: 生成履歴をDBに保存 (1-to-N)
    let generationId: string | undefined;
    try {
      // sessionIdがUUID形式か簡易チェック
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.sessionId);

      if (isUuid) {
        const [inserted] = await db.insert(experimentGenerations).values({
          sessionId: body.sessionId,
          stage: stage,
          modelId: gemini.getModelName(),
          prompt: result.prompt || '',
          generatedOodm: result.uiSpec?.oodm,
          generatedDsl: result.uiSpec,
          promptTokens: result.metrics?.promptTokens,
          responseTokens: result.metrics?.responseTokens,
          generateDuration: result.metrics?.processingTimeMs,
          // renderDuration: null (Client側で更新)
        }).returning({ id: experimentGenerations.id });

        if (inserted) {
          generationId = inserted.id;
          console.log(`💾 Generation saved to DB: ${generationId}`);
        }
      } else {
        console.warn('⚠️ Session ID is not UUID, skipping DB save:', body.sessionId);
      }
    } catch (dbError) {
      console.error('❌ Failed to save generation to DB:', dbError);
      // DB保存失敗してもクライアントには成功を返す（ログだけ残す）
    }

    console.log(`✅ UISpec v3 generated successfully (mode: ${result.mode})`);

    return c.json({
      success: true,
      uiSpec: result.uiSpec,
      textSummary: result.textSummary,
      mode: result.mode,
      generationId, // クライアントに返す
      generation: {
        model: gemini.getModelName(),
        generatedAt: new Date().toISOString(),
        processingTimeMs: result.metrics?.processingTimeMs || 0,
        promptTokens: result.metrics?.promptTokens || 0,
        responseTokens: result.metrics?.responseTokens || 0,
        totalTokens: result.metrics?.totalTokens || 0,
        retryCount: result.retryCount || 0,
      },
    });
  } catch (error) {
    console.error('❌ UISpec v3 generation error:', error);

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

/**
 * UISpec v4生成API (DSL v4 Phase 8)
 * POST /v1/ui/generate-v4
 *
 * 3段階LLM呼び出しによるUISpec生成
 * Stage 1: Widget選定（セッションごとにキャッシュ）
 * Stage 2: ORS生成
 * Stage 3: UISpec生成
 */
uiRoutes.post('/generate-v4', async (c) => {
  try {
    const body = await c.req.json();

    // バリデーション
    if (!body.sessionId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId is required',
          },
        },
        400
      );
    }

    if (!body.concernText) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'concernText is required',
          },
        },
        400
      );
    }

    // ステージのバリデーション
    const validStages: StageTypeV4[] = ['diverge', 'organize', 'converge', 'summary'];
    const stage: StageTypeV4 = body.stage || 'diverge';
    if (!validStages.includes(stage)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: `Invalid stage. Must be one of: ${validStages.join(', ')}`,
          },
        },
        400
      );
    }

    console.log(`🎨 UISpec v4 generation request for session: ${body.sessionId}`);
    console.log(`📝 Concern: "${body.concernText.slice(0, 50)}..."`);
    console.log(`🎯 Stage: ${stage}`);

    const startTime = Date.now();
    const services = getV4Services();
    const bottleneckType = body.options?.bottleneckType || 'thought';

    // Stage 1: Widget選定（キャッシュがあれば再利用）
    let widgetSelectionResult = widgetSelectionCache.get(body.sessionId);
    let widgetSelectionMetrics: { latencyMs: number; cached: boolean } | undefined;

    if (!widgetSelectionResult || widgetSelectionResult.bottleneckType !== bottleneckType) {
      console.log(`🔍 [Stage 1] Widget selection for bottleneck: ${bottleneckType}`);
      const selectionStart = Date.now();

      const selectionLLMResult = await services.widgetSelectionService.selectWidgets({
        concernText: body.concernText,
        bottleneckType,
        sessionId: body.sessionId,
      });

      if (!selectionLLMResult.success || !selectionLLMResult.data) {
        // フォールバック使用
        console.log(`⚠️ Widget selection failed, using fallback`);
        const fallbackResult = services.widgetSelectionService.fallbackSelection({
          concernText: body.concernText,
          bottleneckType,
          sessionId: body.sessionId,
        });
        widgetSelectionResult = {
          result: { success: true, data: fallbackResult, metrics: { taskType: 'widget_selection', modelId: 'fallback', latencyMs: 0, retryCount: 0, success: true, timestamp: Date.now() } },
          bottleneckType,
        };
      } else {
        widgetSelectionResult = { result: selectionLLMResult, bottleneckType };
      }

      // キャッシュに保存
      widgetSelectionCache.set(body.sessionId, widgetSelectionResult);
      widgetSelectionMetrics = { latencyMs: Date.now() - selectionStart, cached: false };
    } else {
      console.log(`📦 [Stage 1] Using cached widget selection`);
      widgetSelectionMetrics = { latencyMs: 0, cached: true };
    }

    const stageSelection = widgetSelectionResult.result.data!.stages[stage];

    // Stage 2: ORS生成
    console.log(`📊 [Stage 2] ORS generation for stage: ${stage}`);
    const orsStart = Date.now();

    const orsLLMResult = await services.orsGeneratorService.generateORS({
      concernText: body.concernText,
      stage,
      stageSelection,
      sessionId: body.sessionId,
    });

    let ors = orsLLMResult.data;
    if (!orsLLMResult.success || !ors) {
      console.log(`⚠️ ORS generation failed, using fallback`);
      ors = services.orsGeneratorService.fallbackORS({
        concernText: body.concernText,
        stage,
        stageSelection,
        sessionId: body.sessionId,
      });
    }

    const orsMetrics = { latencyMs: Date.now() - orsStart };

    // Stage 3: UISpec生成
    console.log(`🎨 [Stage 3] UISpec generation`);
    const uispecStart = Date.now();

    const uispecLLMResult = await services.uiSpecGeneratorV4.generateUISpec({
      ors,
      stageSelection,
      stage,
      sessionId: body.sessionId,
      enableReactivity: body.options?.enableReactivity !== false,
    });

    let uiSpec = uispecLLMResult.data;
    if (!uispecLLMResult.success || !uiSpec) {
      console.log(`⚠️ UISpec generation failed, using fallback`);
      uiSpec = services.uiSpecGeneratorV4.fallbackUISpec({
        ors,
        stageSelection,
        stage,
        sessionId: body.sessionId,
        enableReactivity: body.options?.enableReactivity !== false,
      });
    }

    const uispecMetrics = { latencyMs: Date.now() - uispecStart };
    const totalLatency = Date.now() - startTime;

    // メトリクス集計
    const totalTokens = (orsLLMResult.metrics?.inputTokens || 0) + (orsLLMResult.metrics?.outputTokens || 0) +
      (uispecLLMResult.metrics?.inputTokens || 0) + (uispecLLMResult.metrics?.outputTokens || 0);

    // セッションサマリーをログ
    logMetricsSummary(body.sessionId);

    // Phase 7: 生成履歴をDBに保存 (1-to-N)
    let generationId: string | undefined;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.sessionId);

      if (isUuid) {
        const gemini = getGeminiService();
        const [inserted] = await db.insert(experimentGenerations).values({
          sessionId: body.sessionId,
          stage: stage,
          modelId: gemini.getModelName(),
          prompt: '', // V4はプロンプト複数なので空
          generatedOodm: ors, // ORSを保存
          generatedDsl: uiSpec,
          promptTokens: (orsLLMResult.metrics?.inputTokens || 0) + (uispecLLMResult.metrics?.inputTokens || 0),
          responseTokens: (orsLLMResult.metrics?.outputTokens || 0) + (uispecLLMResult.metrics?.outputTokens || 0),
          generateDuration: totalLatency,
        }).returning({ id: experimentGenerations.id });

        if (inserted) {
          generationId = inserted.id;
          console.log(`💾 V4 Generation saved to DB: ${generationId}`);
        }
      } else {
        console.warn('⚠️ Session ID is not UUID, skipping DB save:', body.sessionId);
      }
    } catch (dbError) {
      console.error('❌ Failed to save V4 generation to DB:', dbError);
    }

    console.log(`✅ UISpec v4 generated successfully`);
    console.log(`📊 Metrics: widgetSelection=${widgetSelectionMetrics.latencyMs}ms (cached=${widgetSelectionMetrics.cached}), ors=${orsMetrics.latencyMs}ms, uispec=${uispecMetrics.latencyMs}ms, total=${totalLatency}ms`);

    return c.json({
      success: true,
      uiSpec,
      ors,
      widgetSelectionResult: widgetSelectionResult.result.data,
      mode: 'widget',
      generationId,
      generation: {
        model: 'gemini-2.5-flash-lite',
        generatedAt: new Date().toISOString(),
        processingTimeMs: totalLatency,
        promptTokens: (orsLLMResult.metrics?.inputTokens || 0) + (uispecLLMResult.metrics?.inputTokens || 0),
        responseTokens: (orsLLMResult.metrics?.outputTokens || 0) + (uispecLLMResult.metrics?.outputTokens || 0),
        totalTokens,
        stages: {
          widgetSelection: widgetSelectionMetrics,
          orsGeneration: orsMetrics,
          uispecGeneration: uispecMetrics,
        },
      },
    });
  } catch (error) {
    console.error('❌ UISpec v4 generation error:', error);

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

export { uiRoutes };
