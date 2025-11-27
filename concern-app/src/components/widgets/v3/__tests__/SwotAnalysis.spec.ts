
import { test, expect } from '@playwright/test';

test.describe('SwotAnalysis Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/swot_analysis');
    });

    test('should allow adding items to quadrants', async ({ page }) => {
        const container = page.getByTestId('swot-container');
        await expect(container).toBeVisible();

        // Add item to Strengths
        const strengthsInput = page.getByTestId('swot-strengths-input');
        const strengthsAddBtn = page.getByTestId('swot-strengths-add-btn');

        await strengthsInput.fill('My Strength');
        await strengthsAddBtn.click();

        // Verify item added
        // Note: The item testid is index based: swot-strengths-item-0
        const item = page.getByTestId('swot-strengths-item-0');
        await expect(item).toBeVisible();
        await expect(item).toContainText('My Strength');

        // Delete item
        // Note: Delete button testid is index based: swot-strengths-delete-0
        const deleteBtn = page.getByTestId('swot-strengths-delete-0');
        await deleteBtn.click();

        // Verify item removed
        await expect(item).not.toBeVisible();
    });
});
