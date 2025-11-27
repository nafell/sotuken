import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initializeDatabase, checkDatabaseHealth } from './database/index';
import { configRoutes } from './routes/config';
import { uiRoutes } from './routes/ui';
import { eventRoutes } from './routes/events';
import { thoughtRoutes } from './routes/thought';
import { thoughtRoutesV2 } from './routes/thoughtV2';
import { taskRoutes } from './routes/task';
import admin from './routes/admin';
import { metricsRoutes } from './routes/metrics';

const app = new Hono();

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use('*', cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use('*', logger());

// Health check endpoint
app.get('/health', async (c) => {
  const dbHealth = await checkDatabaseHealth();
  
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'concern-app-server',
    database: dbHealth
  });
});

// Database status endpoint
app.get('/health/database', async (c) => {
  const dbHealth = await checkDatabaseHealth();
  return c.json(dbHealth);
});

// API Routes
app.route('/v1/config', configRoutes);
app.route('/v1/ui', uiRoutes);
app.route('/v1/events', eventRoutes);
app.route('/v1/thought', thoughtRoutes);
app.route('/v2/thought', thoughtRoutesV2);  // Phase 3: UISpec v2.0 API
app.route('/v1/task', taskRoutes);
app.route('/v1/metrics', metricsRoutes);  // Phase 2 Step 6: メトリクスAPI
app.route('/admin', admin);  // Phase 2 Step 5: 管理者用API

// Basic route
app.get('/', (c) => {
  return c.json({
    message: 'Concern App Server - Phase 3',
    version: '2.0.0',
    phase: 'Phase 3 - Dynamic UI v2.0',
    availableEndpoints: [
      'GET /health',
      'GET /health/database',
      'GET /v1/config',
      'POST /v1/ui/generate',
      'POST /v1/events/batch',
      'POST /v1/thought/generate',
      'GET /v1/thought/health',
      'POST /v2/thought/generate',
      'GET /v2/thought/health',
      'POST /v2/thought/validate',
      'POST /v1/task/rank',
      'GET /v1/task/health',
      'GET /v1/metrics/engagement',
      'GET /v1/metrics/health',
      'GET /admin/assignments',
      'GET /admin/assignments/counts',
      'POST /admin/assignments',
      'DELETE /admin/assignments/:userId'
    ]
  });
});

// Database initialization and server startup
console.log('🔧 Initializing database...');
await initializeDatabase();

const port = process.env.PORT || 3000;
console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📊 Database health: http://localhost:${port}/health/database`);

// Export for Bun
export default {
  port,
  fetch: app.fetch,
};
