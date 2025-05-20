import { test, expect } from '@playwright/test';
import {
  loadExtension,
  createExtensionContext,
  waitForPageLoad,
  monitorWebSocketConnections,
  checkPageErrors,
  mockChromeAPI
} from '../utils/test-helpers';

test.describe('Onboarding Page Tests', () => {
  let extensionId: string;
  
  test.beforeAll(async () => {
    // 等待扩展完全加载
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  test.beforeEach(async ({ context }) => {
    // 创建新的浏览器上下文并加载扩展
    context = await createExtensionContext();
    await loadExtension(context);
    
    // 获取扩展ID
    const backgroundPage = context.backgroundPages()[0];
    extensionId = await backgroundPage.evaluate(() => {
      return chrome.runtime.id;
    });
    console.log('Extension ID:', extensionId);
  });
  
  test.afterEach(async ({ context }) => {
    // 清理浏览器上下文
    await context.close();
  });

  test('should load onboarding page correctly', async ({ context }) => {
    test.setTimeout(120000); // 为这个测试设置2分钟超时
    
    // 创建新页面
    const page = await context.newPage();
    
    // 监控页面错误
    const errors = await checkPageErrors(page);
    
    // 模拟Chrome API
    await mockChromeAPI(page);
    
    try {
      // 访问onboarding页面
      const url = `chrome-extension://${extensionId}/pages/onboarding.html`;
      console.log('Navigating to:', url);
      await page.goto(url);
      await waitForPageLoad(page);
      
      // 验证页面标题
      const title = await page.title();
      console.log('Page title:', title);
      expect(title).toBe('欢迎使用 Nexus AI');
      
      // 验证根元素存在
      const root = await page.$('#root');
      expect(root).toBeTruthy();
      
      // 验证主要内容已加载
      const heading = await page.getByRole('heading', { name: '欢迎使用 Nexus AI!' });
      expect(heading).toBeTruthy();
      
      // 确保没有页面错误
      expect(errors).toHaveLength(0);
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('should handle WebSocket connections in development', async ({ context }) => {
    test.setTimeout(120000); // 为这个测试设置2分钟超时
    
    // 创建新页面
    const page = await context.newPage();
    
    try {
      // 设置WebSocket监控
      const { connections } = await monitorWebSocketConnections(page);
      
      // 监控页面错误
      const errors = await checkPageErrors(page);
      
      // 访问onboarding页面
      const url = `chrome-extension://${extensionId}/pages/onboarding.html`;
      console.log('Navigating to:', url);
      await page.goto(url);
      await waitForPageLoad(page);
      
      // 等待可能的WebSocket连接尝试
      await page.waitForTimeout(2000);
      
      // 验证WebSocket连接
      const wsLogs = await page.evaluate(() => (window as any).wsLogs || []);
      console.log('WebSocket连接日志:', wsLogs);
      console.log('已建立的WebSocket连接:', connections);
      
      // 确保没有错误发生
      expect(errors).toHaveLength(0);
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('should complete onboarding flow', async ({ context }) => {
    test.setTimeout(120000); // 为这个测试设置2分钟超时
    
    // 创建新页面
    const page = await context.newPage();
    
    try {
      // 模拟Chrome API
      await mockChromeAPI(page);
      
      // 监控页面错误
      const errors = await checkPageErrors(page);
      
      // 访问onboarding页面
      const url = `chrome-extension://${extensionId}/pages/onboarding.html`;
      console.log('Navigating to:', url);
      await page.goto(url);
      await waitForPageLoad(page);
      
      // 点击"我已固定图标，开始使用"按钮
      const completeButton = await page.getByRole('button', { 
        name: '我已固定图标，开始使用' 
      });
      await completeButton.click();
      
      // 等待消息处理
      await page.waitForTimeout(1000);
      
      // 验证消息发送到background
      const result = await page.evaluate(() => {
        return new Promise(resolve => {
          chrome.runtime.sendMessage({
            action: 'onboarding',
            type: 'getOnboardingStatus'
          }, response => {
            resolve(response);
          });
        });
      });
      
      expect(result).toEqual({
        completed: true
      });
      
      // 确保没有错误发生
      expect(errors).toHaveLength(0);
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
}); 
}); 