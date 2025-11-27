
import { test, expect } from '@playwright/test';

test.describe('PrioritySliderGrid Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/priority_slider_grid');
    });

    test('should allow adding items and adjusting priority', async ({ page }) => {
        const container = page.getByTestId('psg-container');
        await expect(container).toBeVisible();

        // Add item
        const input = page.getByTestId('psg-input');
        const addBtn = page.getByTestId('psg-add-btn');

        await input.fill('New Priority Item');
        await addBtn.click();

        // Verify item added
        // Find item by text to get ID
        const itemLocator = page.getByRole('listitem').filter({ hasText: 'New Priority Item' });
        await expect(itemLocator).toBeVisible();

        const itemTestId = await itemLocator.getAttribute('data-testid');
        if (!itemTestId) throw new Error('Item test id not found');
        const itemId = itemTestId.replace('psg-item-', '');

        // Adjust slider
        const slider = page.getByTestId(`psg-slider-${itemId}`);
        await slider.fill('80');

        // Delete item
        // Handle confirmation dialog
        page.once('dialog', dialog => dialog.accept());

        const deleteBtn = page.getByTestId(`psg-delete-${itemId}`);
        await deleteBtn.click();

        // Verify item removed
        await expect(page.getByTestId(itemTestId)).not.toBeVisible();
    });
});
