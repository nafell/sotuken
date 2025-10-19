import { Hono } from 'hono';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExperimentService } from '../services/ExperimentService';

const configRoutes = new Hono();
const experimentService = new ExperimentService();

/**
 * 設定配布API
 * GET /v1/config
 * 
 * 目的: クライアントに実験条件、重み設定、UI生成パラメータを配布
 */
configRoutes.get('/', async (c) => {
  try {
    // config.v1.json を読み込み
    const configPath = path.join(process.cwd(), '../config/config.v1.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const baseConfig = JSON.parse(configContent);
    
    // リクエストヘッダーから匿名ユーザーIDを取得
    const anonymousUserId = c.req.header('X-User-ID') || 'anonymous';
    
    // Phase 2: 実験条件割り当て（ハッシュベース）
    const experimentAssignment = await experimentService.getOrAssignCondition(anonymousUserId);
    
    // 設定レスポンス構築
    const configResponse = {
      configVersion: baseConfig.configVersion,
      weightsVersion: baseConfig.weightsVersion,
      experimentAssignment: {
        condition: experimentAssignment.condition,
        assignedAt: experimentAssignment.assignedAt,
        method: experimentAssignment.method
      },
      weights: baseConfig.weights,
      uiNoveltyPolicy: baseConfig.uiNoveltyPolicy,
      model: baseConfig.model
    };
    
    // レスポンスヘッダー設定
    c.header('Content-Type', 'application/json');
    c.header('Cache-Control', 'public, max-age=300'); // 5分キャッシュ
    
    console.log(`📤 Config served to user: ${anonymousUserId}, condition: ${experimentAssignment.condition}`);
    
    return c.json(configResponse);
    
  } catch (error) {
    console.error('❌ Config API error:', error);
    
    // エラーレスポンス
    return c.json({
      error: {
        code: "CONFIG_UNAVAILABLE",
        message: "Configuration service temporarily unavailable",
        retryAfterMs: 30000
      }
    }, 500);
  }
});

/**
 * 設定バージョン確認API
 * GET /v1/config/version
 */
configRoutes.get('/version', async (c) => {
  try {
    const configPath = path.join(process.cwd(), '../config/config.v1.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const baseConfig = JSON.parse(configContent);
    
    return c.json({
      configVersion: baseConfig.configVersion,
      weightsVersion: baseConfig.weightsVersion,
      dslVersion: baseConfig.dslVersion,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Config version check error:', error);
    return c.json({
      error: {
        code: "VERSION_CHECK_FAILED",
        message: "Unable to check configuration version"
      }
    }, 500);
  }
});

export { configRoutes };
