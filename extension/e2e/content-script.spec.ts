import { test, expect } from '@playwright/test';

test.describe('Content Script', () => {
  const TEST_URL = 'https://example.com';
  let extensionId: string;
  
  test.beforeEach(async ({ page, context }) => {
    // 使用环境变量或固定ID
    extensionId = process.env.EXTENSION_ID || '[extension-id]';
    
    // 创建一个模拟页面内容
    await page.route(TEST_URL, route => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Test Page</title>
            </head>
            <body>
              <h1>Test Content for Nexus Extension</h1>
              <p>This is a test paragraph that can be selected and saved by the extension.</p>
              <p>Another paragraph with <strong>more details</strong> about the testing process.</p>
            </body>
          </html>
        `
      });
    });
    
    // 访问测试页面
    await page.goto(TEST_URL);
    
    // 确保内容脚本加载完成
    await page.waitForTimeout(1000);
  });
  
  test('should show context menu on text selection', async ({ page }) => {
    // 选择文本
    await page.locator('p').first().click({ clickCount: 3 }); // 三击选择整个段落
    
    // 模拟右键点击
    await page.mouse.click(200, 200, { button: 'right' });
    
    // 验证上下文菜单项
    await expect(page.getByText(/使用 Nexus 保存/i)).toBeVisible();
  });
  
  test('should save selected text when save option clicked', async ({ page, context }) => {
    // 选择文本
    await page.locator('p').first().click({ clickCount: 3 });
    
    // 模拟右键点击
    await page.mouse.click(200, 200, { button: 'right' });
    
    // 点击保存选项
    await page.getByText(/使用 Nexus 保存/i).click();
    
    // 等待保存确认通知
    await expect(page.getByText(/已保存到 Nexus/i)).toBeVisible({ timeout: 5000 });
    
    // 检查是否打开了Popup或侧边栏
    const popupPage = context.pages().find(p => 
      p.url().includes(`chrome-extension://${extensionId}/popup.html`) ||
      p.url().includes(`chrome-extension://${extensionId}/sidebar.html`)
    );
    
    expect(popupPage).toBeTruthy();
    
    if (popupPage) {
      // 验证刚保存的内容显示在页面中
      await expect(popupPage.getByText(/This is a test paragraph/i)).toBeVisible();
    }
  });
  
  test('should show AI options for selected text', async ({ page }) => {
    // 选择文本
    await page.locator('p').first().click({ clickCount: 3 });
    
    // 模拟右键点击
    await page.mouse.click(200, 200, { button: 'right' });
    
    // 点击AI选项
    await page.getByText(/使用 Nexus AI/i).click();
    
    // 验证AI操作子菜单出现
    await expect(page.getByText(/总结/i)).toBeVisible();
    await expect(page.getByText(/翻译/i)).toBeVisible();
    await expect(page.getByText(/解释/i)).toBeVisible();
  });
  
  test('should perform AI summary on selected text', async ({ page }) => {
    // 选择文本
    await page.locator('p').first().click({ clickCount: 3 });
    
    // 模拟右键点击
    await page.mouse.click(200, 200, { button: 'right' });
    
    // 打开AI子菜单
    await page.getByText(/使用 Nexus AI/i).click();
    
    // 点击总结选项
    await page.getByText(/总结/i).click();
    
    // 验证总结弹窗显示
    await expect(page.getByText(/AI 总结/i)).toBeVisible({ timeout: 5000 });
    
    // 验证总结内容出现
    await expect(page.locator('.ai-content')).toBeVisible();
  });
}); 