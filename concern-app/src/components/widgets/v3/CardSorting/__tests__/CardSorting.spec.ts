
import { test, expect } from '@playwright/test';

test.describe('CardSorting Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/card_sorting');
    });

    test('should allow dragging cards to categories', async ({ page }) => {
        const container = page.getByTestId('card-sorting-container');
        await expect(container).toBeVisible();

        // Find an unsorted card
        const unsortedSection = page.getByTestId('card-sorting-unsorted');
        const firstCard = unsortedSection.getByTestId(/^card-sorting-card-/).first();
        await expect(firstCard).toBeVisible();

        // Find a category
        const firstCategory = page.getByTestId(/^card-sorting-category-/).first();
        await expect(firstCategory).toBeVisible();

        // Drag and drop
        await firstCard.dragTo(firstCategory);

        // Verify card is now in the category (or at least not in unsorted)
        // Note: dragTo might be flaky depending on implementation. 
        // If it fails, we might need manual mouse events.

        // Check if the card is no longer in unsorted section
        // We need to capture the ID or text to be sure.
        const cardText = await firstCard.textContent();
        if (cardText) {
            await expect(unsortedSection).not.toContainText(cardText);
            await expect(firstCategory).toContainText(cardText);
        }

        // Verify progress update (optional)
        const progress = page.getByTestId('card-sorting-progress');
        await expect(progress).toBeVisible();
    });
});
