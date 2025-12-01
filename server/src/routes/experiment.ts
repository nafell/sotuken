/**
 * Experiment API Routes
 * /api/experiment/* エンドポイント
 *
 * Phase 6: 実験・評価環境構築
 */

import { Hono } from 'hono';
import { db } from '../database/index';
import { experimentSessions, widgetStates, experimentGenerations } from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import { getExperimentConfigService } from '../services/ExperimentConfigService';

const experimentRoutes = new Hono();

// ========================================
// セッション管理エンドポイント
// ========================================

/**
 * POST /api/experiment/sessions
 * 新規実験セッションを作成
 */
experimentRoutes.post('/sessions', async (c) => {
  try {
    const body = await c.req.json();
    const {
      experimentType,
      caseId,
      evaluatorId,
      widgetCount,
      modelId,
      concernText,
      contextFactors
    } = body;

    // バリデーション
    if (!experimentType || !caseId || !widgetCount || !modelId || !concernText || !contextFactors) {
      return c.json({
        success: false,
        error: 'Missing required fields: experimentType, caseId, widgetCount, modelId, concernText, contextFactors'
      }, 400);
    }

    if (!['technical', 'expert', 'user'].includes(experimentType)) {
      return c.json({
        success: false,
        error: 'Invalid experimentType: must be one of technical, expert, user'
      }, 400);
    }

    console.log(`📝 Creating experiment session: type=${experimentType}, case=${caseId}, model=${modelId}`);

    const [session] = await db
      .insert(experimentSessions)
      .values({
        experimentType,
        caseId,
        evaluatorId,
        widgetCount,
        modelId,
        concernText,
        contextFactors,
        startedAt: new Date()
      })
      .returning();

    return c.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/sessions
 * セッション一覧を取得
 */
experimentRoutes.get('/sessions', async (c) => {
  try {
    const experimentType = c.req.query('experimentType');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = db
      .select()
      .from(experimentSessions)
      .orderBy(desc(experimentSessions.startedAt))
      .limit(limit)
      .offset(offset)
      .$dynamic();

    if (experimentType) {
      query = query.where(eq(experimentSessions.experimentType, experimentType));
    }

    const sessions = await query;


    return c.json({
      success: true,
      sessions,
      pagination: { limit, offset, count: sessions.length }
    });
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/sessions/:sessionId
 * セッション詳細を取得
 */
experimentRoutes.get('/sessions/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    const [session] = await db
      .select()
      .from(experimentSessions)
      .where(eq(experimentSessions.sessionId, sessionId));

    if (!session) {
      return c.json({
        success: false,
        error: 'Session not found'
      }, 404);
    }

    return c.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Failed to get session:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * PATCH /api/experiment/sessions/:sessionId
 * セッションを更新（生成結果・メトリクスの記録）
 */
experimentRoutes.patch('/sessions/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();

    const {
      generatedOodm,
      generatedDpg,
      generatedDsl,
      oodmMetrics,
      dslMetrics,
      totalTokens,
      totalLatencyMs,
      generationSuccess,
      errorMessage,
      completedAt,
      formsResponseId,
      concernText,  // Phase 7: クライアントから送信される追加フィールド
      status        // Phase 7: クライアントから送信される追加フィールド
    } = body;

    // 更新データを構築
    const updateData: any = {};
    if (generatedOodm !== undefined) updateData.generatedOodm = generatedOodm;
    if (generatedDpg !== undefined) updateData.generatedDpg = generatedDpg;
    if (generatedDsl !== undefined) updateData.generatedDsl = generatedDsl;
    if (oodmMetrics !== undefined) updateData.oodmMetrics = oodmMetrics;
    if (dslMetrics !== undefined) updateData.dslMetrics = dslMetrics;
    if (totalTokens !== undefined) updateData.totalTokens = totalTokens;
    if (totalLatencyMs !== undefined) updateData.totalLatencyMs = totalLatencyMs;
    if (generationSuccess !== undefined) updateData.generationSuccess = generationSuccess;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (completedAt !== undefined) updateData.completedAt = new Date(completedAt);
    if (formsResponseId !== undefined) updateData.formsResponseId = formsResponseId;
    if (concernText !== undefined) updateData.concernText = concernText;
    // Note: 'status' field is not in the DB schema, so we use 'completedAt' to mark completion
    if (status === 'completed' && !completedAt) updateData.completedAt = new Date();

    // 更新するデータがない場合は早期リターン（空オブジェクトでのDB更新を防止）
    if (Object.keys(updateData).length === 0) {
      // 更新なしでも成功として現在のセッションを返す
      const [currentSession] = await db
        .select()
        .from(experimentSessions)
        .where(eq(experimentSessions.sessionId, sessionId));

      if (!currentSession) {
        return c.json({
          success: false,
          error: 'Session not found'
        }, 404);
      }

      console.log(`📝 No updates for session ${sessionId} (empty update body)`);
      return c.json({
        success: true,
        session: currentSession
      });
    }

    const [updatedSession] = await db
      .update(experimentSessions)
      .set(updateData)
      .where(eq(experimentSessions.sessionId, sessionId))
      .returning();

    if (!updatedSession) {
      return c.json({
        success: false,
        error: 'Session not found'
      }, 404);
    }

    console.log(`📝 Updated session ${sessionId}: success=${generationSuccess}`);

    return c.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Failed to update session:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ========================================
// Widget状態管理エンドポイント
// ========================================

/**
 * POST /api/experiment/sessions/:sessionId/widget-states
 * Widget状態を保存
 */
experimentRoutes.post('/sessions/:sessionId/widget-states', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();

    const {
      stepIndex,
      widgetType,
      widgetConfig,
      userInputs,
      portValues
    } = body;

    // バリデーション
    if (stepIndex === undefined || !widgetType || !widgetConfig) {
      return c.json({
        success: false,
        error: 'Missing required fields: stepIndex, widgetType, widgetConfig'
      }, 400);
    }

    const [state] = await db
      .insert(widgetStates)
      .values({
        sessionId,
        stepIndex,
        widgetType,
        widgetConfig,
        userInputs,
        portValues
      })
      .returning();

    console.log(`📊 Saved widget state: session=${sessionId}, step=${stepIndex}, widget=${widgetType}`);

    return c.json({
      success: true,
      state
    });
  } catch (error) {
    console.error('Failed to save widget state:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/sessions/:sessionId/widget-states
 * セッションのWidget状態一覧を取得（リプレイ用）
 */
experimentRoutes.get('/sessions/:sessionId/widget-states', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    const states = await db
      .select()
      .from(widgetStates)
      .where(eq(widgetStates.sessionId, sessionId))
      .orderBy(widgetStates.stepIndex);

    return c.json({
      success: true,
      states,
      count: states.length
    });
  } catch (error) {
    console.error('Failed to get widget states:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ========================================
// テストケース・設定エンドポイント
// ========================================

/**
 * GET /api/experiment/cases
 * テストケース一覧を取得
 */
experimentRoutes.get('/cases', async (c) => {
  try {
    const configService = getExperimentConfigService();
    const summaries = configService.getTestCaseSummaries();

    return c.json({
      success: true,
      cases: summaries
    });
  } catch (error) {
    console.error('Failed to get test cases:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/cases/:caseId
 * テストケース詳細を取得
 */
experimentRoutes.get('/cases/:caseId', async (c) => {
  try {
    const caseId = c.req.param('caseId');
    const configService = getExperimentConfigService();
    const testCase = configService.getTestCase(caseId);

    if (!testCase) {
      return c.json({
        success: false,
        error: 'Test case not found'
      }, 404);
    }

    return c.json({
      success: true,
      testCase
    });
  } catch (error) {
    console.error('Failed to get test case:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/settings
 * 実験設定を取得
 */
experimentRoutes.get('/settings', async (c) => {
  try {
    const configService = getExperimentConfigService();
    const settings = configService.loadSettings();

    return c.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/health
 * ヘルスチェック
 */
experimentRoutes.get('/health', async (c) => {
  try {
    const configService = getExperimentConfigService();
    const settings = configService.loadSettings();
    const testCases = configService.loadAllTestCases();

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      config: {
        settingsVersion: settings.version,
        testCaseCount: testCases.length,
        widgetConditions: settings.widgetCountConditions.length,
        modelConditions: settings.modelConditions.length
      }
    });
  } catch (error) {
    return c.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});


// ========================================
// 生成履歴管理エンドポイント (Phase 7)
// ========================================

/**
 * GET /api/experiment/sessions/:sessionId/generations
 * セッションの生成履歴一覧を取得
 */
experimentRoutes.get('/sessions/:sessionId/generations', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    const generations = await db
      .select()
      .from(experimentGenerations)
      .where(eq(experimentGenerations.sessionId, sessionId))
      .orderBy(experimentGenerations.createdAt);

    return c.json({
      success: true,
      generations,
      count: generations.length
    });
  } catch (error) {
    console.error('Failed to get generations:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/experiment/generations/:generationId
 * 生成履歴詳細を取得
 */
experimentRoutes.get('/generations/:generationId', async (c) => {
  try {
    const generationId = c.req.param('generationId');

    const [generation] = await db
      .select()
      .from(experimentGenerations)
      .where(eq(experimentGenerations.id, generationId));

    if (!generation) {
      return c.json({
        success: false,
        error: 'Generation not found'
      }, 404);
    }

    return c.json({
      success: true,
      generation
    });
  } catch (error) {
    console.error('Failed to get generation:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * PATCH /api/experiment/generations/:generationId
 * 生成履歴更新（レンダリング時間など）
 */
experimentRoutes.patch('/generations/:generationId', async (c) => {
  try {
    const generationId = c.req.param('generationId');
    const updates = await c.req.json();

    // バリデーション
    if (updates.renderDuration === undefined) {
      return c.json({
        success: false,
        error: 'renderDuration is required'
      }, 400);
    }

    const [updated] = await db
      .update(experimentGenerations)
      .set({
        renderDuration: updates.renderDuration
      })
      .where(eq(experimentGenerations.id, generationId))
      .returning();

    if (!updated) {
      return c.json({
        success: false,
        error: 'Generation not found'
      }, 404);
    }

    return c.json({
      success: true,
      generation: updated
    });
  } catch (error) {
    console.error('Failed to update generation:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});


export { experimentRoutes };
