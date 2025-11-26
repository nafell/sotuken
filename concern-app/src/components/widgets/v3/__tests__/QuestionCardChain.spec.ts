
import { test, expect } from '@playwright/test';

test.describe('QuestionCardChain Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dev-demo/widgets/question_card_chain');
    });

    test('should allow answering questions and navigating', async ({ page }) => {
        const container = page.getByTestId('qcc-container');
        await expect(container).toBeVisible();

        // Check first question
        const questionText = page.getByTestId('qcc-question-text');
        await expect(questionText).toBeVisible();

        // Answer first question
        const textarea = page.getByTestId('qcc-answer-textarea');
        await textarea.fill('Answer 1');

        // Go to next
        const nextBtn = page.getByTestId('qcc-next-btn');
        await nextBtn.click();

        // Check second question (assuming default config has >1 questions)
        // We can check if textarea is empty or if question text changed
        await expect(textarea).toHaveValue('');

        // Answer second question
        await textarea.fill('Answer 2');

        // Check current question text (Q2)
        // We assume Q2 text is different from Q1.
        // Let's get Q1 text first.
        // Actually, we can just check if the text changes after clicking prev.

        const prevBtn = page.getByTestId('qcc-prev-btn');
        await prevBtn.click();

        // Wait for question text to change back to Q1 (or check if it's the first question)
        // We can check the question number indicator
        await expect(page.getByTestId('qcc-question-number')).toContainText('質問 1');
        // Or simpler, check if prev button is disabled
        await expect(prevBtn).toBeDisabled();

        // Should see first answer
        await expect(textarea).toHaveValue('Answer 1');
    });
});
