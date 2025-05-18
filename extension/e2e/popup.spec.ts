import { test, expect } from '@playwright/test';

// 获取扩展ID的辅助函数
async function getExtensionId(page) {
  await page.goto('chrome://extensions');
  
  // 通过检查开发模式下加载的扩展来获取ID
  const devModeToggle = await page.$('extensions-manager').then(
    em => em.$('#devMode')
  );
  await devModeToggle.click();
  
  const extensionList = await page.$('extensions-manager').then(
    em => em.$('extensions-item-list')
  );
  
  const extensionId = await extensionList.evaluate(list => {
    const item = list.shadowRoot.querySelector('extensions-item');
    return item.dataset.extensionId;
  });
  
  return extensionId;
}

test.describe('Popup Page', () => {
  test.beforeEach(async ({ page, context }) => {
    // 根据需要获取扩展ID并设置
    // const extensionId = await getExtensionId(page);
    // 直接使用环境变量或设置的ID
    const extensionId = process.env.EXTENSION_ID || '[extension-id]';
    
    // 打开扩展的popup页面
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
  });
  
  test('should display popup correctly', async ({ page }) => {
    // 验证标题元素存在
    await expect(page.locator('h1')).toBeVisible();
    
    // 验证关键UI元素
    await expect(page.getByText(/最近保存/i)).toBeVisible();
  });
  
  test('should navigate to login page when not authenticated', async ({ page }) => {
    // 点击登录按钮
    await page.getByRole('button', { name: /登录/i }).click();
    
    // 验证登录表单出现
    await expect(page.getByLabel(/邮箱/i)).toBeVisible();
    await expect(page.getByLabel(/密码/i)).toBeVisible();
  });
  
  test('should open item when clicked', async ({ page, context }) => {
    // 假设有项目可点击
    const itemTitle = await page.getByTestId('clipping-item').first().locator('.title').textContent();
    
    // 点击项目
    await page.getByTestId('clipping-item').first().click();
    
    // 等待新页面打开
    const newPage = await context.waitForEvent('page');
    await newPage.waitForLoadState();
    
    // 验证页面标题包含项目标题
    expect(await newPage.title()).toContain(itemTitle);
  });
  
  test('should toggle theme', async ({ page }) => {
    // 点击主题切换按钮
    await page.getByTestId('theme-toggle').click();
    
    // 验证暗色主题类名添加到body
    const hasClass = await page.evaluate(() => {
      return document.body.classList.contains('dark-theme');
    });
    
    expect(hasClass).toBeTruthy();
  });
}); 