import { test, expect, chromium } from '@playwright/test';
import path from 'path';

// 测试扩展程序的弹出界面
test.describe('Extension Popup', () => {
  let browser;
  let page;
  
  test.beforeAll(async () => {
    // 启动浏览器，加载扩展
    browser = await chromium.launchPersistentContext('', {
      headless: false, // 扩展测试需要非无头模式
      args: [
        `--disable-extensions-except=${path.resolve('./build')}`,
        `--load-extension=${path.resolve('./build')}`
      ]
    });
  });
  
  test.beforeEach(async () => {
    // 创建一个新页面
    page = await browser.newPage();
    
    // 导航到扩展程序弹出窗口
    // 注意：需要获取扩展程序的ID，这在测试执行之前是未知的
    // 因此这里需要一种动态方式来获取扩展程序ID
    // 这是一个简化的示例，实际可能需要根据chromium的具体情况调整
    const targets = browser.backgroundPages();
    const extensionTarget = targets[0];
    const extensionUrl = extensionTarget.url();
    const extensionId = extensionUrl.split('/')[2];
    
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
  });
  
  test.afterAll(async () => {
    await browser.close();
  });
  
  test('should display the popup interface correctly', async () => {
    // 检查页面标题和重要元素
    await expect(page).toHaveTitle(/Nexus/);
    
    // 检查登录表单或主界面元素存在
    const loginFormOrMainInterface = await page.$(
      'form, .homepage-container'
    );
    expect(loginFormOrMainInterface).not.toBeNull();
  });
  
  test('should navigate between pages', async () => {
    // 如果有导航元素，测试导航功能
    const hasNavigation = await page.$('nav, .navigation');
    
    if (hasNavigation) {
      // 点击导航项
      await page.click('nav a:first-child');
      
      // 检查URL或页面内容变化
      await page.waitForNavigation();
      
      // 导航回主页
      await page.click('a[href="/"]');
      await page.waitForNavigation();
    }
  });
  
  test('should display login form and handle login', async () => {
    // 检查登录表单
    const loginForm = await page.$('form');
    
    if (loginForm) {
      // 填写表单
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      
      // 模拟服务器响应
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, token: 'fake-token' })
        });
      });
      
      // 提交表单
      await page.click('button[type="submit"]');
      
      // 验证登录成功后的状态
      await page.waitForSelector('.home-page, .dashboard');
    }
  });
  
  test('should handle summarization request', async () => {
    // 假设用户已登录
    // 模拟summarize按钮点击
    const summarizeButton = await page.$('button:has-text("Summarize")');
    
    if (summarizeButton) {
      // 模拟API响应
      await page.route('**/api/summarize', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            summary: 'This is a test summary of the current page.' 
          })
        });
      });
      
      await summarizeButton.click();
      
      // 验证摘要显示
      await page.waitForSelector('.summary-container');
      const summaryText = await page.textContent('.summary-content');
      expect(summaryText).toContain('This is a test summary');
    }
  });
}); 