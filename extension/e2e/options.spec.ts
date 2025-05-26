import { test, expect } from '@playwright/test';

test('options page loads correctly', async ({ page }) => {
  // 打开options.html页面
  await page.goto('chrome-extension://[id]/options.html');
  
  // 检查页面标题
  const title = page.locator('h1');
  await expect(title).toHaveText('Nexus 扩展设置');
  
  // 检查关键部分是否呈现
  await expect(page.getByText('账户')).toBeVisible();
  await expect(page.getByText('通用设置')).toBeVisible();
  await expect(page.getByText('剪藏设置')).toBeVisible();
  await expect(page.getByText('快捷键')).toBeVisible();
  
  // 检查按钮是否存在
  await expect(page.getByRole('button', { name: '保存设置' })).toBeVisible();
});