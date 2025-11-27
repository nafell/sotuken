
import { test, expect } from '@playwright/test';

test.describe('MindMap Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/mind_map');
    });

    test('should allow adding and editing nodes', async ({ page }) => {
        const container = page.getByTestId('mindmap-container');
        await expect(container).toBeVisible();

        // Check center topic
        const centerTopic = page.getByTestId('mindmap-center-topic');
        await expect(centerTopic).toBeVisible();
        await centerTopic.fill('My Project');

        // Add root node if none (default might have none or some depending on config)
        // The test config 'default' has center topic only.
        // So we should see "add root" button or similar if empty, or we can use the main add button

        // Check if there are existing nodes
        const nodes = page.locator('[data-testid^="mindmap-node-text-"]');
        const count = await nodes.count();

        if (count === 0) {
            const addRootBtn = page.getByTestId('mindmap-add-root-btn');
            if (await addRootBtn.isVisible()) {
                await addRootBtn.click();
            } else {
                const addNodeBtn = page.getByTestId('mindmap-add-node-btn');
                await addNodeBtn.click();
            }
        }

        // Verify node added
        await expect(page.locator('[data-testid^="mindmap-node-text-"]')).not.toHaveCount(0);

        // Edit node text
        const firstNodeText = page.locator('[data-testid^="mindmap-node-text-"]').first();
        await firstNodeText.dblclick();

        // Find input (it replaces the text span)
        // The input testid is mindmap-node-input-${id}
        // We can find it by role or generic selector since it's the only one visible
        const input = page.locator('input.MindMap_editInput__\\w+'); // Class name might be hashed, better use testid regex
        // Actually we can use the parent container to find the input
        const nodeContainer = page.locator('[data-testid^="mindmap-node-"]').first();
        const editInput = nodeContainer.locator('input[type="text"]');

        await expect(editInput).toBeVisible();
        await editInput.fill('Updated Idea');
        await editInput.press('Enter');

        // Verify text updated
        await expect(firstNodeText).toHaveText('Updated Idea');
    });
});
