
import { test, expect } from '@playwright/test';

test.describe('EmotionPalette Widget', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the widget showcase page for EmotionPalette
        await page.goto('/dev-demo/widgets/emotion_palette');
    });

    test('should allow selecting an emotion and adjusting intensity', async ({ page }) => {
        // Verify initial state
        const container = page.getByTestId('emotion-palette-container');
        await expect(container).toBeVisible();

        const completeBtn = page.getByTestId('emotion-palette-complete-btn');
        await expect(completeBtn).toBeDisabled();

        // Select an emotion (assuming 'joy' exists based on typical data, but using first available if specific IDs are dynamic)
        // We'll try to find a button with a predictable ID pattern or just the first one
        const firstEmotionBtn = page.getByTestId(/^emotion-palette-btn-/).first();
        await expect(firstEmotionBtn).toBeVisible();
        await firstEmotionBtn.click();

        // Verify selection visual state (optional, but good)
        await expect(firstEmotionBtn).toHaveAttribute('aria-checked', 'true');

        // Adjust intensity
        const slider = page.getByTestId('emotion-palette-intensity-slider');
        await expect(slider).toBeVisible();
        await slider.fill('80'); // Set to 80%

        // Verify complete button is now enabled
        await expect(completeBtn).toBeEnabled();

        // Complete the interaction
        await completeBtn.click();

        // Verify completion (this depends on what the demo page does on complete)
        // For now, we assume the widget might show a completion state or log to console
        // If the demo page shows an alert or changes state, we'd test that.
        // Since we don't know the exact demo page behavior, we'll stop here or check for a console log if we could.
        // Ideally, the demo page would display the result.
    });
});
