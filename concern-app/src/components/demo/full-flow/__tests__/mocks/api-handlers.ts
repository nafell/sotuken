/**
 * Mock API Handlers for Full-Flow E2E Tests
 *
 * Provides mock responses for the UI generation API to enable
 * stable, fast E2E testing without real server dependency.
 */

import type { Page } from '@playwright/test';

// Simple widget configs for each stage
const mockWidgetConfigs = {
  diverge: {
    widgets: [
      {
        id: 'mock-emotion-1',
        component: 'emotion_palette',
        config: {
          emotions: [
            { id: 'happy', label: '嬉しい', color: '#ffd700' },
            { id: 'anxious', label: '不安', color: '#6495ed' },
          ],
        },
      },
    ],
  },
  organize: {
    widgets: [
      {
        id: 'mock-sorting-1',
        component: 'card_sorting',
        config: {
          categories: [
            { id: 'important', label: '重要' },
            { id: 'urgent', label: '緊急' },
          ],
          items: [
            { id: 'item-1', text: 'タスクA' },
            { id: 'item-2', text: 'タスクB' },
          ],
        },
      },
    ],
  },
  converge: {
    widgets: [
      {
        id: 'mock-matrix-1',
        component: 'matrix_placement',
        config: {
          xAxis: { label: '緊急度', min: 0, max: 1 },
          yAxis: { label: '重要度', min: 0, max: 1 },
          items: [
            { id: 'item-1', label: 'タスクA' },
            { id: 'item-2', label: 'タスクB' },
          ],
        },
      },
    ],
  },
  summary: {
    widgets: [
      {
        id: 'mock-summary-1',
        component: 'structured_summary',
        config: {
          sections: [
            { id: 'findings', title: '発見', items: [] },
            { id: 'actions', title: 'アクション', items: [] },
          ],
        },
      },
    ],
  },
};

/**
 * Generate mock UI response for a given stage
 */
function getMockUIResponse(stage: string) {
  const config = mockWidgetConfigs[stage as keyof typeof mockWidgetConfigs];

  if (!config) {
    return {
      success: false,
      error: { message: `Unknown stage: ${stage}` },
    };
  }

  return {
    success: true,
    mode: 'widget',
    uiSpec: config,
    generation: {
      model: 'mock',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      latencyMs: 100,
    },
  };
}

/**
 * Setup mock routes for Playwright tests
 *
 * Intercepts API calls and returns mock responses for:
 * - POST /api/v3/ui/generate - UI generation endpoint
 */
export async function setupMockRoutes(page: Page) {
  // Mock UI generation endpoint (correct path: /api/ui/generate-v3)
  // Use glob pattern that matches both localhost:3000 and localhost:3030
  await page.route(/.*\/api\/ui\/generate-v3/, async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'POST') {
      try {
        const body = request.postDataJSON();
        const stage = body?.stage || 'diverge';
        const response = getMockUIResponse(stage);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      } catch {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(getMockUIResponse('diverge')),
        });
      }
    } else {
      await route.continue();
    }
  });

  // Mock experiment condition endpoint (required for app initialization)
  await page.route('**/api/experiment/condition', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ condition: 'dynamic_ui' }),
    });
  });

  // Mock event logging endpoint
  await page.route('**/api/events', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock config endpoint
  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock session endpoints
  await page.route('**/api/session/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, sessionId: 'mock-session-id' }),
    });
  });
}

/**
 * Wait for mock API to be ready
 * Useful for ensuring routes are set up before navigation
 */
export async function waitForMockReady(page: Page) {
  await page.waitForTimeout(100);
}
