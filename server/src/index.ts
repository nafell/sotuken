import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initializeDatabase, checkDatabaseHealth } from './database/index';
import { configRoutes } from './routes/config';
import { uiRoutes } from './routes/ui';
import { eventRoutes } from './routes/events';
import { thoughtRoutes } from './routes/thought';

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

// Basic route
app.get('/', (c) => {
  return c.json({ 
    message: 'Concern App Server - Phase 0',
    version: '1.0.0',
    phase: 'Day 3 - API Implementation',
    availableEndpoints: [
      'GET /health',
      'GET /health/database',
      'GET /v1/config',
      'POST /v1/ui/generate',
      'POST /v1/events/batch',
      'POST /v1/thought/generate',
      'GET /v1/thought/health'
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
