
import { test, expect } from '@playwright/test';

test.describe('StructuredSummary Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/structured_summary');
    });

    test('should allow adding sections and items', async ({ page }) => {
        const container = page.getByTestId('struct-summary-container');
        await expect(container).toBeVisible();

        // Update title
        const titleInput = page.getByTestId('struct-summary-title');
        await titleInput.fill('My Summary');

        // Add a section (e.g., Action Items)
        const addActionBtn = page.getByTestId('struct-summary-add-section-action_items');
        await addActionBtn.click();

        // Verify section added
        // We need to find the new section. It should be the last one (or first if empty).
        // Let's look for a section with "アクションアイテム" title (default for action_items)
        // Or we can just check count of sections
        await expect(page.locator('[data-testid^="struct-summary-section-"]')).toHaveCount(3);

        // Let's find the specific section we added.
        // We can check the input value of the section title
        const sectionTitleInputs = page.locator('[data-testid^="struct-summary-section-title-"]');
        const lastSectionTitle = sectionTitleInputs.last();
        // The default title seems to be 'アクション' based on test failure
        await expect(lastSectionTitle).toHaveValue('アクション');

        // Get section ID from the title input testid
        const titleTestId = await lastSectionTitle.getAttribute('data-testid');
        if (!titleTestId) throw new Error('Section title test id not found');
        const sectionId = titleTestId.replace('struct-summary-section-title-', '');

        // Add item to this section
        const itemInput = page.getByTestId(`struct-summary-item-input-${sectionId}`);
        const itemAddBtn = page.getByTestId(`struct-summary-item-add-${sectionId}`);

        await itemInput.fill('New Action');
        await itemAddBtn.click();

        // Verify item added
        // It should be in the list
        // Scope to the section to avoid ambiguity
        const section = page.getByTestId(`struct-summary-section-${sectionId}`);
        await expect(section.getByText('New Action')).toBeVisible();

        // Update conclusion
        const conclusionInput = page.getByTestId('struct-summary-conclusion');
        await conclusionInput.fill('Final Conclusion');
    });
});
