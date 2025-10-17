import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initializeDatabase, checkDatabaseHealth } from './database/index';
import { configRoutes } from './routes/config';
import { uiRoutes } from './routes/ui';
import { eventRoutes } from './routes/events';
import { thoughtRoutes } from './routes/thought';
import { taskRoutes } from './routes/task';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
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
app.route('/v1/task', taskRoutes);

// Basic route
app.get('/', (c) => {
  return c.json({ 
    message: 'Concern App Server - Phase 1B',
    version: '1.0.0',
    phase: 'Phase 1B - Task Recommendation',
    availableEndpoints: [
      'GET /health',
      'GET /health/database',
      'GET /v1/config',
      'POST /v1/ui/generate',
      'POST /v1/events/batch',
      'POST /v1/thought/generate',
      'GET /v1/thought/health',
      'POST /v1/task/rank',
      'GET /v1/task/health'
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
