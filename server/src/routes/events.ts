import { Hono } from 'hono';

const eventRoutes = new Hono();

/**
 * イベントログ記録API
 * POST /v1/events/batch
 * 
 * 目的: ユーザーインタラクションと測定データを記録
 */
eventRoutes.post('/batch', async (c) => {
  try {
    const request = await c.req.json();
    
    // バリデーション
    if (!request.events || !Array.isArray(request.events)) {
      return c.json({
        error: {
          code: "INVALID_REQUEST",
          message: "events array is required"
        }
      }, 400);
    }
    
    if (request.events.length === 0) {
      return c.json({
        error: {
          code: "INVALID_REQUEST", 
          message: "events array cannot be empty"
        }
      }, 400);
    }
    
    // 各イベントのバリデーション
    const errors: string[] = [];
    const validEvents = [];
    
    for (const [index, event] of request.events.entries()) {
      if (!event.eventId) {
        errors.push(`Event ${index}: eventId is required`);
        continue;
      }
      
      if (!event.sessionId) {
        errors.push(`Event ${index}: sessionId is required`);
        continue;
      }
      
      if (!event.anonymousUserId) {
        errors.push(`Event ${index}: anonymousUserId is required`);
        continue;
      }
      
      if (!event.eventType) {
        errors.push(`Event ${index}: eventType is required`);
        continue;
      }
      
      if (!event.timestamp) {
        errors.push(`Event ${index}: timestamp is required`);
        continue;
      }
      
      // 有効なイベントタイプチェック
      const validEventTypes = [
        'ui_shown', 'action_started', 'action_completed', 
        'satisfaction_reported', 'session_ended', 'screen_navigation'
      ];
      
      if (!validEventTypes.includes(event.eventType)) {
        errors.push(`Event ${index}: invalid eventType "${event.eventType}"`);
        continue;
      }
      
      validEvents.push({
        ...event,
        receivedAt: new Date().toISOString(),
        processingStatus: 'pending'
      });
    }
    
    console.log(`📊 Received ${request.events.length} events, ${validEvents.length} valid, ${errors.length} errors`);
    
    if (validEvents.length > 0) {
      // TODO: Phase 1でデータベースに実際に保存
      // await db.measurement_events.createMany({ data: validEvents });
      console.log(`✅ Events logged (Phase 0: memory only):`, 
        validEvents.map(e => `${e.eventType}@${e.sessionId.slice(0,8)}...`)
      );
      
      // Phase 0では統計情報のみ表示
      const eventTypeCounts = validEvents.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`📈 Event type distribution:`, eventTypeCounts);
    }
    
    return c.json({
      recordedEvents: validEvents.length,
      errors: errors,
      processingTimeMs: 5, // Phase 0では高速（メモリ処理のみ）
      nextBatchId: crypto.randomUUID()
    });
    
  } catch (error) {
    console.error('❌ Event logging error:', error);
    
    return c.json({
      error: {
        code: "EVENT_LOGGING_FAILED",
        message: "Event logging temporarily unavailable"
      }
    }, 500);
  }
});

/**
 * イベントログ統計API（開発用）
 * GET /v1/events/stats
 */
eventRoutes.get('/stats', async (c) => {
  // Phase 0では基本的な統計のみ
  return c.json({
    status: 'development_mode',
    storageMode: 'memory_only', // Phase 1でデータベース統合
    supportedEventTypes: [
      'ui_shown', 'action_started', 'action_completed',
      'satisfaction_reported', 'session_ended', 'screen_navigation'
    ],
    batchProcessing: true,
    retentionPeriod: 'TBD_phase1',
    timestamp: new Date().toISOString()
  });
});

export { eventRoutes };
