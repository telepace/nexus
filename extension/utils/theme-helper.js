/**
 * 主题辅助函数 - 在页面加载时自动设置正确的主题
 */

// 在开发环境中处理WebSocket连接
(() => {
  // 修复开发环境的WebSocket CSP问题
  function fixWebSocketCSP() {
    // 如果运行时存在WebSocket构造函数，我们尝试包装它
    if (typeof WebSocket !== 'undefined') {
      const OriginalWebSocket = WebSocket;
      
      // 覆盖原始的WebSocket构造函数
      window.WebSocket = function(url, protocols) {
        try {
          console.log(`[Nexus] 尝试WebSocket连接: ${url}`);
          return new OriginalWebSocket(url, protocols);
        } catch (e) {
          console.error(`[Nexus] WebSocket连接错误: ${e}`);
          
          // 如果是CSP错误并且是localhost连接，提示用户
          if (e.toString().includes('Content Security Policy') && 
              url.toString().includes('localhost')) {
            console.warn('[Nexus] WebSocket连接被CSP阻止，这在开发模式下是正常的');
            
            // 创建一个不会触发CSP错误的空对象作为WebSocket的替代
            const mockWS = {
              addEventListener: () => {},
              removeEventListener: () => {},
              send: () => {},
              close: () => {},
              readyState: 3, // CLOSED
              onopen: null,
              onclose: null,
              onmessage: null,
              onerror: null
            };
            
            // 模拟连接关闭事件
            setTimeout(() => {
              if (mockWS.onclose) {
                mockWS.onclose({code: 1006, reason: 'CSP阻止'});
              }
            }, 100);
            
            return mockWS;
          }
          
          // 重新抛出其他错误
          throw e;
        }
      };
      
      // 保持原型链一致
      window.WebSocket.prototype = OriginalWebSocket.prototype;
    }
  }
  
  // 执行修复
  fixWebSocketCSP();
})();

// 主题设置逻辑
(() => {
  // 页面加载时检查和设置主题
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // 从存储中获取用户主题首选项
      const result = await chrome.storage.local.get('userSettings');
      const settings = result.userSettings || {};
      const theme = settings.theme || 'system';
      
      // 应用主题
      applyTheme(theme);
      
      // 监听系统主题变化
      if (theme === 'system') {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeMediaQuery.addEventListener('change', (e) => {
          document.documentElement.classList.toggle('dark', e.matches);
        });
      }
    } catch (error) {
      console.error('读取主题设置时出错:', error);
    }
  });
  
  // 应用主题
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // 系统模式
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDarkMode);
    }
  }
})(); 