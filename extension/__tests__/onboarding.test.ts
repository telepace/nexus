import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// 模拟Chrome API
global.chrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    },
    getManifest: jest.fn().mockReturnValue({ version: '1.0.0' }),
    getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`)
  },
  tabs: {
    create: jest.fn().mockImplementation((options) => Promise.resolve({ id: 123, ...options }))
  }
} as any;

// 导入待测试的模块 (会在实现后导入)
import '../background/messages/onboarding';
import { handleInstall } from '../background/messages/onboarding';

describe('Onboarding功能', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
  });

  it('应在安装时自动打开引导页面', () => {
    // 模拟安装事件
    const installedListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    installedListener({ reason: 'install' });
    
    // 验证是否调用了tabs.create并打开onboarding.html
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringContaining('onboarding.html')
    });
  });

  it('当reason不是install时不应打开引导页面', () => {
    // 模拟更新事件
    const installedListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    installedListener({ reason: 'update' });
    
    // 验证没有调用tabs.create
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  it('handleInstall函数应正确处理安装事件', () => {
    // 直接测试处理函数
    handleInstall({ reason: 'install' });
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringContaining('onboarding.html')
    });
  });
}); 