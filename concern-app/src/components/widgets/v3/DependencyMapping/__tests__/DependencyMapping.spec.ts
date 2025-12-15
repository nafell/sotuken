
import { test, expect } from '@playwright/test';

test.describe('DependencyMapping Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/dependency_mapping');
    });

    test('should allow adding nodes and connecting them', async ({ page }) => {
        const container = page.getByTestId('dep-map-container');
        await expect(container).toBeVisible();

        // Add a new node
        const addNodeBtn = page.getByTestId('dep-map-add-node-btn');
        await addNodeBtn.click();

        // Verify node added (default nodes + 1)
        // We can check if at least one node exists with the new label format or just count
        // Default has 4 nodes. New one should be node_5 (or based on timestamp)
        // Let's just check if we have more than 4 nodes
        const nodes = page.locator('[data-testid^="dep-map-node-"]');
        await expect(nodes).toHaveCount(5);

        // Connect nodes
        const connectBtn = page.getByTestId('dep-map-connect-btn');
        await connectBtn.click();

        // Click first node
        const node1 = nodes.nth(0);
        await node1.click({ force: true });

        // Click second node
        const node2 = nodes.nth(1);
        await node2.click({ force: true });

        // Verify edge created by checking the info panel
        // "ノード数: 5 / エッジ数: 1"
        await expect(page.getByText(/エッジ数: 1/)).toBeVisible();

        // Toggle connect mode off
        await connectBtn.click();
        await expect(connectBtn).toHaveText('→ 接続');
    });
});
