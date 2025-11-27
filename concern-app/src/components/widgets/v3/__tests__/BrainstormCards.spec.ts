
import { test, expect } from '@playwright/test';

test.describe('BrainstormCards Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/brainstorm_cards');
    });

    test('should allow adding, editing, and deleting cards', async ({ page }) => {
        const container = page.getByTestId('brainstorm-cards-container');
        await expect(container).toBeVisible();

        // Add a new card
        const input = page.getByTestId('brainstorm-cards-input');
        const addBtn = page.getByTestId('brainstorm-cards-add-btn');

        await input.fill('New Idea');
        await addBtn.click();

        // Verify card added
        const cardList = page.getByTestId('brainstorm-cards-list');
        await expect(cardList).toContainText('New Idea');

        // Check count
        const count = page.getByTestId('brainstorm-cards-count');
        await expect(count).toContainText('1');

        // Edit the card
        // We need to find the card ID. Since we just added it, we might need to rely on text or order.
        // Assuming the new card is the last one or we can find it by text.
        // However, the test IDs are ID-based. We might need to select by role or class if IDs are random.
        // But we added data-testid={`brainstorm-cards-item-${card.id}`}.
        // We can find the edit button inside the list item that contains the text "New Idea".
        const cardItemLocator = page.getByRole('listitem').filter({ hasText: 'New Idea' });

        // Get the stable ID
        const cardTestId = await cardItemLocator.getAttribute('data-testid');
        if (!cardTestId) throw new Error('Card test id not found');

        const cardItem = page.getByTestId(cardTestId);
        const editBtn = cardItem.getByRole('button', { name: /編集/ }); // Or use a more specific selector if possible

        await editBtn.click();

        // Edit flow might involve a prompt or inline edit. 
        // Looking at the code: onStartEdit(card) is called. 
        // We need to know what happens on edit. 
        // If it populates the input field again:
        const editInput = page.getByTestId('brainstorm-cards-edit-input');
        await expect(editInput).toHaveValue('New Idea');
        await editInput.fill('Updated Idea');
        const saveBtn = cardItem.getByRole('button', { name: /保存/ });
        await saveBtn.click();

        // Delete the card
        page.once('dialog', dialog => dialog.accept());
        const deleteBtn = cardItem.getByRole('button', { name: /削除/ });
        await deleteBtn.click();

        // Verify card removed
        await expect(cardList).not.toContainText('Updated Idea');
        await expect(count).toContainText('0');
    });
});
