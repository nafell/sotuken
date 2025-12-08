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
  getMockWidgetSelectionService,
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
    // debug: true でV4パイプラインの詳細ログを出力
    const llmOrchestrator = createLLMOrchestratorWithDefaultPrompts({ debug: true });
    const widgetSelectionService = createWidgetSelectionService({ llmOrchestrator, debug: true });
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

    // Phase 8: 生成履歴をDBに保存（V3→V4スキーマ移行に伴いV3 APIはDB保存をスキップ）
    // V3 APIは非推奨。V4 APIを使用してください。
    let generationId: string | undefined;
    console.log('⚠️ V3 API is deprecated. DB save skipped. Use V4 API (/ui/generate-v4) instead.');

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

    // Phase 8: 生成履歴をDBに保存（V4スキーマ）
    let generationId: string | undefined;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.sessionId);

      if (isUuid) {
        const gemini = getGeminiService();

        // V4: 3段階の実際のプロンプトをJSON保存（デバッグ・評価用）
        const promptData = JSON.stringify({
          widgetSelection: {
            prompt: widgetSelectionResult.result.prompt || null,
            inputParams: {
              concernText: body.concernText,
              bottleneckType: body.options?.bottleneckType || 'thought',
            },
          },
          ors: {
            prompt: orsLLMResult.prompt || null,
            inputParams: {
              concernText: body.concernText,
              stage: stage,
              stageSelection: stageSelection,
            },
          },
          uiSpec: {
            prompt: uispecLLMResult.prompt || null,
            inputParams: {
              ors: ors,
              stageSelection: stageSelection,
              stage: stage,
              enableReactivity: body.options?.enableReactivity !== false,
            },
          },
        });

        const [inserted] = await db.insert(experimentGenerations).values({
          sessionId: body.sessionId,
          stage: stage,
          modelId: gemini.getModelName(),
          // V4: 実際のプロンプトと入力パラメータ
          prompt: promptData,
          // V4 3段階生成結果
          generatedWidgetSelection: widgetSelectionResult.result.data,
          generatedOrs: ors,
          generatedUiSpec: uiSpec,
          // V4 各段階メトリクス
          widgetSelectionTokens: widgetSelectionResult.result.metrics?.inputTokens,
          widgetSelectionDuration: widgetSelectionMetrics.latencyMs,
          orsTokens: (orsLLMResult.metrics?.inputTokens || 0) + (orsLLMResult.metrics?.outputTokens || 0),
          orsDuration: orsMetrics.latencyMs,
          uiSpecTokens: (uispecLLMResult.metrics?.inputTokens || 0) + (uispecLLMResult.metrics?.outputTokens || 0),
          uiSpecDuration: uispecMetrics.latencyMs,
          // 合計メトリクス
          totalPromptTokens: (orsLLMResult.metrics?.inputTokens || 0) + (uispecLLMResult.metrics?.inputTokens || 0),
          totalResponseTokens: (orsLLMResult.metrics?.outputTokens || 0) + (uispecLLMResult.metrics?.outputTokens || 0),
          totalGenerateDuration: totalLatency,
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

/**
 * Widget選定専用API (DSL v4 Phase 8)
 * POST /v1/ui/generate-v4-widgets
 *
 * Plan Preview用 - Widget選定のみ実行
 * 4ステージ分のWidget選定結果を返す（ORS/UISpec生成なし）
 */
uiRoutes.post('/generate-v4-widgets', async (c) => {
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

    const useMockWidgetSelection = body.options?.useMockWidgetSelection === true;
    const caseId = body.options?.caseId;

    console.log(`🔍 Widget Selection request for session: ${body.sessionId}`);
    console.log(`📝 Concern: "${body.concernText.slice(0, 50)}..."`);
    console.log(`🧪 Mock mode: ${useMockWidgetSelection}, caseId: ${caseId || 'N/A'}`);

    const startTime = Date.now();
    const bottleneckType = body.options?.bottleneckType || 'thought';

    // モックモード: テストケースのexpectedFlowを使用
    if (useMockWidgetSelection && caseId) {
      console.log(`🎭 [Mock Widget Selection] Using expectedFlow from test case: ${caseId}`);

      const mockService = getMockWidgetSelectionService();
      const mockResult = mockService.generateFromTestCase({
        caseId,
        sessionId: body.sessionId,
        bottleneckType,
      });

      if (!mockResult.success || !mockResult.result) {
        console.error(`❌ Mock widget selection failed: ${mockResult.error}`);
        return c.json(
          {
            success: false,
            error: {
              code: 'MOCK_FAILED',
              message: mockResult.error || 'Mock widget selection failed',
            },
          },
          500
        );
      }

      const latencyMs = Date.now() - startTime;

      // モック結果をキャッシュに保存（後続のステージ生成で使用）
      widgetSelectionCache.set(body.sessionId, {
        result: {
          success: true,
          data: mockResult.result,
          metrics: {
            taskType: 'widget_selection',
            modelId: 'mock',
            latencyMs: 0,
            retryCount: 0,
            success: true,
            timestamp: Date.now(),
          },
        },
        bottleneckType,
      });

      console.log(`✅ Mock Widget Selection completed in ${latencyMs}ms`);

      return c.json({
        success: true,
        widgetSelectionResult: mockResult.result,
        generation: {
          model: 'mock',
          generatedAt: new Date().toISOString(),
          processingTimeMs: latencyMs,
          promptTokens: 0,
          responseTokens: 0,
          cached: false,
          isMock: true,
        },
      });
    }

    // 通常モード: LLMによるWidget選定
    const services = getV4Services();

    // キャッシュをチェック
    let widgetSelectionResult = widgetSelectionCache.get(body.sessionId);

    if (!widgetSelectionResult || widgetSelectionResult.bottleneckType !== bottleneckType) {
      console.log(`🔍 [Widget Selection] Executing for bottleneck: ${bottleneckType}`);

      const selectionLLMResult = await services.widgetSelectionService.selectWidgets({
        concernText: body.concernText,
        bottleneckType,
        sessionId: body.sessionId,
      });

      if (!selectionLLMResult.success || !selectionLLMResult.data) {
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
    } else {
      console.log(`📦 [Widget Selection] Using cached result`);
    }

    const latencyMs = Date.now() - startTime;

    // DB保存（executionType='widget_selection'）
    let generationId: string | undefined;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.sessionId);

      if (isUuid) {
        const gemini = getGeminiService();

        const promptData = JSON.stringify({
          widgetSelection: {
            prompt: widgetSelectionResult.result.prompt || null,
            inputParams: {
              concernText: body.concernText,
              bottleneckType,
            },
          },
        });

        const [inserted] = await db.insert(experimentGenerations).values({
          sessionId: body.sessionId,
          stage: 'widget_selection', // 特殊ステージ名
          modelId: gemini.getModelName(),
          prompt: promptData,
          generatedWidgetSelection: widgetSelectionResult.result.data,
          widgetSelectionTokens: (widgetSelectionResult.result.metrics?.inputTokens || 0) +
                                 (widgetSelectionResult.result.metrics?.outputTokens || 0),
          widgetSelectionDuration: latencyMs,
          totalGenerateDuration: latencyMs,
        }).returning({ id: experimentGenerations.id });

        if (inserted) {
          generationId = inserted.id;
          console.log(`💾 Widget Selection saved to DB: ${generationId}`);
        }
      }
    } catch (dbError) {
      console.error('❌ Failed to save Widget Selection to DB:', dbError);
    }

    console.log(`✅ Widget Selection completed in ${latencyMs}ms`);

    return c.json({
      success: true,
      widgetSelectionResult: widgetSelectionResult.result.data,
      generationId,
      generation: {
        model: 'gemini-2.5-flash-lite',
        generatedAt: new Date().toISOString(),
        processingTimeMs: latencyMs,
        promptTokens: widgetSelectionResult.result.metrics?.inputTokens || 0,
        responseTokens: widgetSelectionResult.result.metrics?.outputTokens || 0,
        cached: widgetSelectionResult.bottleneckType === bottleneckType && latencyMs < 100,
      },
    });
  } catch (error) {
    console.error('❌ Widget Selection error:', error);

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
 * ステージ実行専用API (DSL v4 Phase 8)
 * POST /v1/ui/generate-v4-stage
 *
 * Plan実行用 - ORS + UISpec生成のみ
 * キャッシュ済みWidget選定結果を使用
 */
uiRoutes.post('/generate-v4-stage', async (c) => {
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

    console.log(`🎨 Stage Execution request for session: ${body.sessionId}`);
    console.log(`📝 Concern: "${body.concernText.slice(0, 50)}..."`);
    console.log(`🎯 Stage: ${stage}`);

    const startTime = Date.now();
    const services = getV4Services();
    const bottleneckType = body.options?.bottleneckType || 'thought';

    // Widget選定結果をキャッシュから取得（必須）
    let widgetSelectionResult = widgetSelectionCache.get(body.sessionId);

    if (!widgetSelectionResult) {
      // キャッシュがない場合はWidget選定を実行
      console.log(`⚠️ No cached widget selection, executing now...`);
      const selectionLLMResult = await services.widgetSelectionService.selectWidgets({
        concernText: body.concernText,
        bottleneckType,
        sessionId: body.sessionId,
      });

      if (!selectionLLMResult.success || !selectionLLMResult.data) {
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
      widgetSelectionCache.set(body.sessionId, widgetSelectionResult);
    }

    const stageSelection = widgetSelectionResult.result.data!.stages[stage];

    // ORS生成
    console.log(`📊 [ORS Generation] for stage: ${stage}`);
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

    // UISpec生成
    console.log(`🎨 [UISpec Generation]`);
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

    logMetricsSummary(body.sessionId);

    // DB保存（executionType='stage_execution' - stageフィールドで識別）
    let generationId: string | undefined;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.sessionId);

      if (isUuid) {
        const gemini = getGeminiService();

        const promptData = JSON.stringify({
          ors: {
            prompt: orsLLMResult.prompt || null,
            inputParams: {
              concernText: body.concernText,
              stage,
              stageSelection,
            },
          },
          uiSpec: {
            prompt: uispecLLMResult.prompt || null,
            inputParams: {
              ors,
              stageSelection,
              stage,
              enableReactivity: body.options?.enableReactivity !== false,
            },
          },
        });

        const [inserted] = await db.insert(experimentGenerations).values({
          sessionId: body.sessionId,
          stage, // 実際のステージ名（diverge, organize, converge, summary）
          modelId: gemini.getModelName(),
          prompt: promptData,
          // Widget選定は保存しない（別レコードで管理）
          generatedOrs: ors,
          generatedUiSpec: uiSpec,
          orsTokens: (orsLLMResult.metrics?.inputTokens || 0) + (orsLLMResult.metrics?.outputTokens || 0),
          orsDuration: orsMetrics.latencyMs,
          uiSpecTokens: (uispecLLMResult.metrics?.inputTokens || 0) + (uispecLLMResult.metrics?.outputTokens || 0),
          uiSpecDuration: uispecMetrics.latencyMs,
          totalPromptTokens: (orsLLMResult.metrics?.inputTokens || 0) + (uispecLLMResult.metrics?.inputTokens || 0),
          totalResponseTokens: (orsLLMResult.metrics?.outputTokens || 0) + (uispecLLMResult.metrics?.outputTokens || 0),
          totalGenerateDuration: totalLatency,
        }).returning({ id: experimentGenerations.id });

        if (inserted) {
          generationId = inserted.id;
          console.log(`💾 Stage Execution saved to DB: ${generationId}`);
        }
      }
    } catch (dbError) {
      console.error('❌ Failed to save Stage Execution to DB:', dbError);
    }

    console.log(`✅ Stage ${stage} completed`);
    console.log(`📊 Metrics: ors=${orsMetrics.latencyMs}ms, uispec=${uispecMetrics.latencyMs}ms, total=${totalLatency}ms`);

    return c.json({
      success: true,
      uiSpec,
      ors,
      stageSelection,
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
          orsGeneration: orsMetrics,
          uispecGeneration: uispecMetrics,
        },
      },
    });
  } catch (error) {
    console.error('❌ Stage Execution error:', error);

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
