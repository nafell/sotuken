
import { test, expect } from '@playwright/test';

test.describe('TradeoffBalance Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/tradeoff_balance');
    });

    test('should allow adding items to both sides and adjusting weights', async ({ page }) => {
        const container = page.getByTestId('tradeoff-container');
        await expect(container).toBeVisible();

        // Set labels
        const leftLabel = page.getByTestId('tradeoff-left-label');
        await leftLabel.fill('Option A');

        const rightLabel = page.getByTestId('tradeoff-right-label');
        await rightLabel.fill('Option B');

        // Add item to left
        const leftInput = page.getByTestId('tradeoff-left-input');
        const leftAddBtn = page.getByTestId('tradeoff-left-add-btn');

        await leftInput.fill('Left Item');
        await leftAddBtn.click();

        // Verify left item added
        // Find by text first
        const leftItemText = page.getByText('Left Item');
        await expect(leftItemText).toBeVisible();

        // Get parent container
        // We can use xpath or just filter again with more confidence
        const leftItemLocator = page.getByTestId(/^tradeoff-left-item-/).filter({ hasText: 'Left Item' });
        await expect(leftItemLocator).toBeVisible();

        const leftItemTestId = await leftItemLocator.getAttribute('data-testid');
        if (!leftItemTestId) throw new Error('Left item test id not found');
        const leftItemId = leftItemTestId.replace('tradeoff-left-item-', '');

        // Adjust weight
        const leftSlider = page.getByTestId(`tradeoff-weight-${leftItemId}`);
        await leftSlider.fill('80');

        // Add item to right
        const rightInput = page.getByTestId('tradeoff-right-input');
        const rightAddBtn = page.getByTestId('tradeoff-right-add-btn');

        await rightInput.fill('Right Item');
        await rightAddBtn.click();

        // Verify right item added
        const rightItemLocator = page.getByTestId(/^tradeoff-right-item-/).filter({ hasText: 'Right Item' });
        await expect(rightItemLocator).toBeVisible();

        // Verify balance score exists
        const score = page.getByTestId('tradeoff-balance-score');
        await expect(score).toBeVisible();
    });
});
