
import { test, expect } from '@playwright/test';

test.describe('TimelineSlider Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/timeline_slider');
    });

    test('should allow adding and moving events', async ({ page }) => {
        const container = page.getByTestId('timeline-container');
        await expect(container).toBeVisible();

        // Add event
        const input = page.getByTestId('timeline-input');
        const addBtn = page.getByTestId('timeline-add-btn');

        await input.fill('New Event');
        await addBtn.click();

        // Verify event added
        // Find by text
        // Verify event added
        // Find by text
        // Use specific locator to avoid strict mode violation (it appears in list and on track)
        // The list item has the text directly
        const eventLabel = page.getByTestId(/^timeline-item-/).filter({ hasText: 'New Event' });
        await expect(eventLabel).toBeVisible();

        // Find the marker on the track
        // The marker has testid timeline-marker-${id}
        // We need to find the ID.
        // Let's look for the event item in the list first
        const eventItem = page.getByTestId(/^timeline-item-/).filter({ hasText: 'New Event' });
        await expect(eventItem).toBeVisible();

        const eventTestId = await eventItem.getAttribute('data-testid');
        if (!eventTestId) throw new Error('Event test id not found');
        const eventId = eventTestId.replace('timeline-item-', '');

        // Move event using slider in the list
        const slider = page.getByTestId(`timeline-item-slider-${eventId}`);
        await slider.fill('80');

        // Verify marker position updated (optional, hard to verify exact style)
        // But we can check if the position label updated
        // Verify marker position updated
        // For 80% with 'weeks' unit (4 markers: 0, 1, 2, 3), index is round(0.8 * 3) = 2.
        // Label for index 2 is '2週間後'
        await expect(eventItem).toContainText('2週間後');

        // Delete event
        const deleteBtn = page.getByTestId(`timeline-delete-${eventId}`);
        await deleteBtn.click();

        // Verify removed
        await expect(page.getByTestId(eventTestId)).not.toBeVisible();
    });
});
