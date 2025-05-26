import { test as base, expect } from "@playwright/test";

// 创建一个不使用身份验证的测试
const test = base.extend({});

// 明确指定不使用身份验证状态
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Smoke Test", () => {
  test("should load homepage", async ({ page }) => {
    await page.goto("/");
    // Check for the main heading using data-testid
    await expect(page.getByTestId("main-heading")).toBeVisible();
  });
});
