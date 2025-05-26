import { Page, BrowserContext, chromium } from '@playwright/test';
import path from 'path';

export const EXTENSION_PATH = path.join(__dirname, '../../');

/**
 * 加载Chrome扩展
 * @param context Playwright浏览器上下文
 */
export async function loadExtension(context: BrowserContext) {
  const backgroundPages = context.backgroundPages();
  if (backgroundPages.length === 0) {
    // 等待扩展背景页加载
    await context.waitForEvent('backgroundpage');
  }
}

/**
 * 创建带扩展的浏览器上下文
 */
export async function createExtensionContext() {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox'
    ]
  });
  
  return context;
}

/**
 * 等待页面加载完成
 * @param page Playwright页面对象
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

/**
 * 监控WebSocket连接
 * @param page Playwright页面对象
 * @returns 收集到的WebSocket连接信息
 */
export async function monitorWebSocketConnections(page: Page) {
  const devTools = await page.context().newCDPSession(page);
  const wsConnections = [];
  
  await devTools.send('Network.enable');
  devTools.on('Network.webSocketCreated', ({ url }) => {
    wsConnections.push(url);
  });
  
  return {
    connections: wsConnections,
    devTools
  };
}

/**
 * 获取扩展背景页
 * @param context Playwright浏览器上下文
 */
export async function getBackgroundPage(context: BrowserContext) {
  const backgroundPages = context.backgroundPages();
  if (backgroundPages.length > 0) {
    return backgroundPages[0];
  }
  
  // 等待背景页加载
  return await context.waitForEvent('backgroundpage');
}

/**
 * 检查页面错误
 * @param page Playwright页面对象
 */
export async function checkPageErrors(page: Page) {
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  return errors;
}

/**
 * 模拟Chrome扩展API
 * @param page Playwright页面对象
 */
export async function mockChromeAPI(page: Page) {
  await page.addInitScript(() => {
    window.chrome = {
      runtime: {
        sendMessage: (message, callback) => {
          if (callback) {
            callback({ success: true });
          }
          return true;
        },
        onMessage: {
          addListener: () => {}
        }
      },
      management: {
        getAll: (callback) => {
          callback([{
            id: 'test-extension-id',
            name: 'Nexus AI',
            enabled: true
          }]);
        }
      }
    };
  });
} 