export const debugLog = (message: string, data?: any) => {
  if (process.env.PLASMO_PUBLIC_DEBUG_MODE === 'true') {
    console.log(`[Nexus Debug] ${message}`, data);
  }
};

export const styleDebug = () => {
  if (process.env.PLASMO_PUBLIC_DEBUG_MODE === 'true' && typeof document !== 'undefined') {
    // 添加调试样式指示器
    const debugElement = document.createElement('div');
    debugElement.style.position = 'fixed';
    debugElement.style.bottom = '5px';
    debugElement.style.right = '5px';
    debugElement.style.padding = '3px 6px';
    debugElement.style.fontSize = '10px';
    debugElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugElement.style.color = 'white';
    debugElement.style.borderRadius = '3px';
    debugElement.style.zIndex = '9999';
    debugElement.textContent = 'Styles OK';
    
    // 检查关键样式是否正常
    const hasBackground = getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)';
    if (!hasBackground) {
      debugElement.textContent = 'Style Issue';
      debugElement.style.backgroundColor = 'red';
    }
    
    document.body.appendChild(debugElement);
    return hasBackground;
  }
  return true;
};

// 添加CSS加载检查，显示当前是否成功加载了样式
export const checkCssLoaded = () => {
  if (typeof document !== 'undefined') {
    // 检查是否有任何样式表被加载
    const styleSheets = document.styleSheets;
    const debugElement = document.createElement('div');
    debugElement.style.position = 'fixed';
    debugElement.style.bottom = '25px';
    debugElement.style.right = '5px';
    debugElement.style.padding = '3px 6px';
    debugElement.style.fontSize = '10px';
    debugElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugElement.style.color = 'white';
    debugElement.style.borderRadius = '3px';
    debugElement.style.zIndex = '9999';
    
    let tailwindFound = false;
    
    // 遍历所有样式表，查找 tailwind 相关
    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const href = styleSheets[i].href || '';
        if (href.includes('tailwind')) {
          tailwindFound = true;
          break;
        }
      } catch (e) {
        // 可能因为跨域限制无法访问某些样式表
        continue;
      }
    }
    
    debugElement.textContent = tailwindFound ? 'Tailwind CSS: 已加载' : 'Tailwind CSS: 未加载';
    
    if (!tailwindFound) {
      debugElement.style.backgroundColor = 'red';
      // 尝试动态加载 Tailwind CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/styles/tailwind.css';
      document.head.appendChild(link);
      
      // 添加内联的基本样式，以防万一
      const inlineStyle = document.createElement('style');
      inlineStyle.textContent = `
        body { 
          background-color: var(--background, #ffffff);
          color: var(--foreground, #1f2937); 
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: var(--background, #1f2937);
            color: var(--foreground, #f3f4f6);
          }
        }
      `;
      document.head.appendChild(inlineStyle);
    }
    
    document.body.appendChild(debugElement);
    return tailwindFound;
  }
  return false;
};

// Sidepanel 调试工具
export interface SidepanelDebugTools {
  checkSidepanelStatus(): void;
  testFeatures(): void;
  simulateUserActions(): void;
  checkNetworkStatus(): void;
  getSystemInfo(): Record<string, any>;
  cleanup(): void;
}

export const createSidepanelDebugTools = (): SidepanelDebugTools => {
  return {
    // 检查侧边栏状态
    checkSidepanelStatus() {
      debugLog('Checking sidepanel status...');
      
      // 检查 Chrome API 支持
      if (typeof chrome !== 'undefined' && chrome.sidePanel) {
        debugLog('✅ Chrome sidePanel API is available');
      } else {
        debugLog('❌ Chrome sidePanel API is not available');
      }
      
      // 检查权限
      if (chrome.permissions) {
        chrome.permissions.contains({
          permissions: ['sidePanel']
        }, function(result) {
          debugLog('sidePanel permission:', result ? '✅ Granted' : '❌ Not granted');
        });
      }
      
      // 检查 DOM 元素
      const elements = [
        'login-btn',
        'user-dropdown', 
        'summary-btn',
        'search-btn',
        'clear-btn',
        'settings-btn',
        'help-btn',
        'question-input',
        'content-area'
      ];
      
      elements.forEach(id => {
        const element = document.getElementById(id);
        debugLog(`Element #${id}:`, element ? '✅ Found' : '❌ Not found');
      });
    },
    
    // 测试功能
    testFeatures() {
      debugLog('Testing sidepanel features...');
      
      // 测试存储
      if (chrome.storage) {
        chrome.storage.local.set({debug_test: 'test_value'}, function() {
          debugLog('✅ Storage write test passed');
          chrome.storage.local.get(['debug_test'], function(result) {
            debugLog('✅ Storage read test passed:', result);
            chrome.storage.local.remove(['debug_test']);
          });
        });
      } else {
        debugLog('❌ Chrome storage API not available');
      }
    },
    
    // 模拟用户操作
    simulateUserActions() {
      debugLog('Simulating user actions...');
      
      // 模拟点击摘要按钮
      const summaryBtn = document.getElementById('summary-btn');
      if (summaryBtn) {
        debugLog('Simulating summary button click...');
        summaryBtn.click();
      }
      
      // 模拟输入消息
      setTimeout(() => {
        const questionInput = document.getElementById('question-input') as HTMLTextAreaElement;
        if (questionInput) {
          debugLog('Simulating message input...');
          questionInput.value = 'Debug test message';
          
          // 触发 Enter 键事件
          const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13
          });
          questionInput.dispatchEvent(event);
        }
      }, 2000);
    },
    
    // 检查网络连接
    checkNetworkStatus() {
      debugLog('Checking network status...');
      
      // 测试到主站的连接
      fetch('https://nexus-app.com/api/health', {
        method: 'GET',
        mode: 'no-cors'
      }).then(() => {
        debugLog('✅ Network connection to main site OK');
      }).catch(error => {
        debugLog('❌ Network connection failed:', error);
      });
    },
    
    // 清理调试数据
    cleanup() {
      debugLog('Cleaning up debug data...');
      
      if (chrome.storage) {
        chrome.storage.local.clear(function() {
          debugLog('✅ Local storage cleared');
        });
      }
      
      // 重置内容区域
      const contentArea = document.getElementById('content-area');
      if (contentArea) {
        contentArea.innerHTML = '<div class="text-muted-foreground text-center py-4">内容将在这里显示</div>';
        debugLog('✅ Content area reset');
      }
    },
    
    // 获取系统信息
    getSystemInfo() {
      const info = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        chromeVersion: chrome.runtime?.getManifest()?.version,
        manifestVersion: chrome.runtime?.getManifest()?.manifest_version
      };
      
      debugLog('System Info:', info);
      return info;
    }
  };
};

// 全局调试工具实例
export const sidepanelDebug = createSidepanelDebugTools();

// 自动初始化调试工具（仅在调试模式下）
if (process.env.PLASMO_PUBLIC_DEBUG_MODE === 'true' && typeof window !== 'undefined') {
  // 将调试工具挂载到全局对象
  (window as any).nexusDebug = sidepanelDebug;
  
  // 自动运行基本检查
  document.addEventListener('DOMContentLoaded', function() {
    debugLog('🔧 Nexus Debug Tools Loaded');
    debugLog('Available commands:');
    debugLog('- nexusDebug.checkSidepanelStatus()');
    debugLog('- nexusDebug.testFeatures()');
    debugLog('- nexusDebug.simulateUserActions()');
    debugLog('- nexusDebug.checkNetworkStatus()');
    debugLog('- nexusDebug.getSystemInfo()');
    debugLog('- nexusDebug.cleanup()');
    
    // 延迟执行基本检查
    setTimeout(() => {
      sidepanelDebug.checkSidepanelStatus();
    }, 1000);
  });
  
  // 错误监听
  window.addEventListener('error', function(e) {
    debugLog('🐛 Debug: Uncaught error:', e.error);
  });
  
  window.addEventListener('unhandledrejection', function(e) {
    debugLog('🐛 Debug: Unhandled promise rejection:', e.reason);
  });
}
