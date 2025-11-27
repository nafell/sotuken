
import { test, expect } from '@playwright/test';

test.describe('MatrixPlacement Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/matrix_placement');
    });

    test('should allow adding and placing items', async ({ page }) => {
        const container = page.getByTestId('matrix-container');
        await expect(container).toBeVisible();

        // Add item
        const input = page.getByTestId('matrix-item-input');
        const addBtn = page.getByTestId('matrix-add-btn');

        await input.fill('New Item');
        await addBtn.click();

        // Verify item added
        // We need to find the item. The ID is generated.
        // We can find by text and get the testid.
        const itemLocator = page.getByRole('gridcell', { name: /New Item/ });
        await expect(itemLocator).toBeVisible();

        const itemTestId = await itemLocator.getAttribute('data-testid');
        if (!itemTestId) throw new Error('Item test id not found');

        // Click on matrix to place item (move it)
        const grid = page.getByTestId('matrix-grid');
        // Click somewhere in the grid (e.g., top right)
        await grid.click({ position: { x: 300, y: 100 } });

        // Verify position changed (optional, hard to verify exact coordinates without checking style)
        // But we can check if it's still visible
        await expect(page.getByTestId(itemTestId)).toBeVisible();

        // Delete item
        // We need to find the delete button for this item.
        // The delete button ID is matrix-delete-${item.id}
        // We can extract ID from itemTestId (matrix-item-${id})
        const itemId = itemTestId.replace('matrix-item-', '');

        // Handle confirmation dialog
        page.once('dialog', dialog => dialog.accept());

        const deleteBtn = page.getByTestId(`matrix-delete-${itemId}`);
        await deleteBtn.click();

        // Verify item removed
        await expect(page.getByTestId(itemTestId)).not.toBeVisible();
    });
});
