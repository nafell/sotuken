/**
 * ReactivePort.spec.ts
 *
 * Reactive Port機能のE2Eテスト
 *
 * Phase 4 Task 2.2
 * - Widget間のPort出力
 * - 完了状態の自動更新
 * - エラー状態の反映
 */

import { test, expect } from '@playwright/test';

test.describe('Reactive Port E2E Tests', () => {
  test.describe('TradeoffBalance - Completion State', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dev-demo/widgets/tradeoff_balance');
    });

    test('should show disabled complete button until items added to both sides', async ({
      page,
    }) => {
      const completeBtn = page.getByTestId('tradeoff-complete-btn');

      // Initially disabled (no items)
      await expect(completeBtn).toBeDisabled();

      // Add item to left side
      const leftInput = page.getByTestId('tradeoff-left-input');
      const leftAddBtn = page.getByTestId('tradeoff-left-add-btn');
      await leftInput.fill('Left Item');
      await leftAddBtn.click();

      // Still disabled (no items on right side)
      await expect(completeBtn).toBeDisabled();

      // Add item to right side
      const rightInput = page.getByTestId('tradeoff-right-input');
      const rightAddBtn = page.getByTestId('tradeoff-right-add-btn');
      await rightInput.fill('Right Item');
      await rightAddBtn.click();

      // Now enabled (items on both sides)
      await expect(completeBtn).toBeEnabled();
    });

    test('should update balance score when weights change', async ({ page }) => {
      const score = page.getByTestId('tradeoff-balance-score');

      // Add items to both sides
      const leftInput = page.getByTestId('tradeoff-left-input');
      const leftAddBtn = page.getByTestId('tradeoff-left-add-btn');
      await leftInput.fill('Left Item');
      await leftAddBtn.click();

      const rightInput = page.getByTestId('tradeoff-right-input');
      const rightAddBtn = page.getByTestId('tradeoff-right-add-btn');
      await rightInput.fill('Right Item');
      await rightAddBtn.click();

      // Initial score should show balanced
      await expect(score).toBeVisible();

      // Find and adjust left item weight
      const leftItemLocator = page
        .getByTestId(/^tradeoff-left-item-balance_item_\d+$/)
        .filter({ hasText: 'Left Item' });
      const leftItemTestId = await leftItemLocator.getAttribute('data-testid');
      if (!leftItemTestId) throw new Error('Left item test id not found');
      const leftItemId = leftItemTestId.replace('tradeoff-left-item-', '');

      const leftSlider = page.getByTestId(`tradeoff-weight-${leftItemId}`);
      await leftSlider.fill('100');

      // Score should show left-leaning
      await expect(score).toContainText('←');
    });
  });

  test.describe('SwotAnalysis - Completion State', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dev-demo/widgets/swot_analysis');
    });

    test('should require all quadrants to have items before completion', async ({
      page,
    }) => {
      const completeBtn = page.getByTestId('swot-complete-btn');

      // Initially disabled
      await expect(completeBtn).toBeDisabled();

      // Add to strengths
      const strengthsInput = page.getByTestId('swot-strengths-input');
      const strengthsAddBtn = page.getByTestId('swot-strengths-add-btn');
      await strengthsInput.fill('Strong point');
      await strengthsAddBtn.click();

      // Still disabled (missing 3 quadrants)
      await expect(completeBtn).toBeDisabled();

      // Add to weaknesses
      const weaknessesInput = page.getByTestId('swot-weaknesses-input');
      const weaknessesAddBtn = page.getByTestId('swot-weaknesses-add-btn');
      await weaknessesInput.fill('Weak point');
      await weaknessesAddBtn.click();

      // Still disabled (missing 2 quadrants)
      await expect(completeBtn).toBeDisabled();

      // Add to opportunities
      const opportunitiesInput = page.getByTestId('swot-opportunities-input');
      const opportunitiesAddBtn = page.getByTestId('swot-opportunities-add-btn');
      await opportunitiesInput.fill('Opportunity');
      await opportunitiesAddBtn.click();

      // Still disabled (missing 1 quadrant)
      await expect(completeBtn).toBeDisabled();

      // Add to threats
      const threatsInput = page.getByTestId('swot-threats-input');
      const threatsAddBtn = page.getByTestId('swot-threats-add-btn');
      await threatsInput.fill('Threat');
      await threatsAddBtn.click();

      // Now enabled (all quadrants have items)
      await expect(completeBtn).toBeEnabled();
    });
  });

  test.describe('DependencyMapping - Completion State', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dev-demo/widgets/dependency_mapping');
    });

    test('should require at least one connection before completion', async ({
      page,
    }) => {
      const completeBtn = page.getByTestId('dep-map-complete-btn');

      // Initially disabled (no connections)
      await expect(completeBtn).toBeDisabled();

      // Start connection mode
      const connectBtn = page.getByTestId('dep-map-connect-btn');
      await connectBtn.click();

      // Connect two nodes (click first node, then second)
      const node1 = page.getByTestId('dep-map-node-node_1');
      const node2 = page.getByTestId('dep-map-node-node_2');

      await node1.click();
      await node2.click();

      // Now enabled (has connection)
      await expect(completeBtn).toBeEnabled();
    });
  });
});
