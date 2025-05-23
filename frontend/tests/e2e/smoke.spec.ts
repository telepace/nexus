import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    // Check for the main heading using data-testid
    await expect(page.getByTestId('main-heading')).toBeVisible();
  });
});
