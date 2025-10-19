/**
 * Admin API Routes（Phase 2 Step 5）
 * 管理者用API - ユーザー条件管理
 */

import { Hono } from 'hono';
import { ExperimentService } from '../services/ExperimentService';

const admin = new Hono();
const experimentService = new ExperimentService();

/**
 * 全ユーザーの割り当て状況を取得
 * GET /admin/assignments
 */
admin.get('/assignments', async (c) => {
  try {
    const assignments = await experimentService.getAllAssignments();
    return c.json({ assignments });
  } catch (error) {
    console.error('[admin] Error fetching assignments:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * 条件別の人数を取得
 * GET /admin/assignments/counts
 */
admin.get('/assignments/counts', async (c) => {
  try {
    const counts = await experimentService.getAssignmentCounts();
    return c.json(counts);
  } catch (error) {
    console.error('[admin] Error fetching counts:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * 条件を手動割り当て
 * POST /admin/assignments
 * 
 * Request body:
 * {
 *   "userId": "user_123",
 *   "condition": "dynamic_ui" | "static_ui",
 *   "assignedBy": "admin_name",
 *   "note": "テスト被験者1" (optional)
 * }
 */
admin.post('/assignments', async (c) => {
  try {
    const { userId, condition, assignedBy, note } = await c.req.json();
    
    // バリデーション
    if (!userId || !condition || !assignedBy) {
      return c.json({ 
        error: 'Missing required fields',
        required: ['userId', 'condition', 'assignedBy']
      }, 400);
    }
    
    if (condition !== 'dynamic_ui' && condition !== 'static_ui') {
      return c.json({ 
        error: 'Invalid condition',
        allowed: ['dynamic_ui', 'static_ui']
      }, 400);
    }
    
    // 条件割り当て
    const assignment = await experimentService.assignConditionManually(
      userId,
      condition,
      assignedBy,
      note
    );
    
    console.log(`[admin] 条件割り当て成功: ${userId} → ${condition}`);
    
    return c.json({ 
      success: true, 
      assignment 
    });
  } catch (error) {
    console.error('[admin] Error assigning condition:', error);
    return c.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 割り当てを削除
 * DELETE /admin/assignments/:userId
 */
admin.delete('/assignments/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    if (!userId) {
      return c.json({ error: 'Missing userId parameter' }, 400);
    }
    
    await experimentService.removeAssignment(userId);
    
    console.log(`[admin] 割り当て削除成功: ${userId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('[admin] Error removing assignment:', error);
    return c.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * ヘルスチェック（開発用）
 * GET /admin/health
 */
admin.get('/health', (c) => {
  return c.json({ 
    status: 'ok',
    service: 'admin-api',
    timestamp: new Date().toISOString()
  });
});

export default admin;

