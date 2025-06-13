import { sendToContentScript } from "@plasmohq/messaging";
import { getUIManager } from "./lib/ui-manager";
import { generateSummary, saveToLibrary } from "./lib/api";

// 获取UI管理器实例
const uiManager = getUIManager();

// 定期检查认证状态（每 5 分钟）
const AUTH_CHECK_INTERVAL = 5 * 60 * 1000;

// 页面数据缓存
const pageDataCache = new Map<number, any>();

// 初始化背景脚本
async function initialize() {
  console.log("Nexus Extension Background Script Initialized - Unified Architecture");
  
  // 启动时同步认证状态
  await checkAuthStatus();
  
  // 为所有已打开的标签页注入content script
  await injectContentScriptToExistingTabs();
  
  // 定期检查认证状态
  setInterval(checkAuthStatus, AUTH_CHECK_INTERVAL);
}

// 为已存在的标签页注入content script
async function injectContentScriptToExistingTabs() {
  try {
    console.log('[Background] Injecting content script to existing tabs...');
    
    // 获取所有标签页
    const tabs = await chrome.tabs.query({});
    
    let injectedCount = 0;
    let skippedCount = 0;
    
    for (const tab of tabs) {
      // 跳过特殊页面和无效标签页
      if (!tab.id || !tab.url || 
          tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('moz-extension://') ||
          tab.url.startsWith('about:') ||
          tab.url.startsWith('file://')) {
        skippedCount++;
        console.log(`[Background] ⏭️ Skipping special page: ${tab.url}`);
        continue;
      }
      
      try {
        // 检查是否已经注入了content script
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
        if (response?.pong) {
          // 已经有content script，跳过
          console.log(`[Background] ✅ Content script already exists: ${tab.url}`);
          continue;
        }
      } catch (error) {
        // 没有content script，需要注入
        console.log(`[Background] 📝 No content script detected for: ${tab.url}`);
      }
      
      try {
        // 动态注入content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['page-observer.1f0e3a13.js']  // 使用构建后的文件名
        });
        
        injectedCount++;
        console.log(`[Background] ✅ Injected content script to: ${tab.url}`);
      } catch (error) {
        // 某些页面可能无法注入，记录但不抛出错误
        if (error.message?.includes('Cannot access a chrome:// URL') ||
            error.message?.includes('Cannot access contents of') ||
            error.message?.includes('The extensions gallery cannot be scripted')) {
          console.log(`[Background] ⚠️ Cannot inject to protected page: ${tab.url}`);
        } else {
          console.warn(`[Background] ⚠️ Failed to inject to ${tab.url}:`, error.message);
        }
        skippedCount++;
      }
    }
    
    console.log(`[Background] Content script injection complete: ${injectedCount} injected, ${skippedCount} skipped`);
  } catch (error) {
    console.error('[Background] Failed to inject content scripts:', error);
  }
}

// 检查认证状态
async function checkAuthStatus() {
  try {
    console.log('[Background] Starting auth status check...');
    
    // 从存储中获取认证信息
    const result = await chrome.storage.local.get(['accessToken', 'user'])
    const { accessToken, user } = result

    if (accessToken && user) {
      console.log('[Background] Found stored credentials for user:', user.email)
      
      // 验证token是否仍然有效
      try {
        const apiUrl = `${process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/me`;
        console.log('[Background] Validating token with API:', apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
        });
        
        console.log('[Background] Token validation response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (response.ok) {
          console.log('[Background] ✅ Token validation successful');
          return { isAuthenticated: true, user, token: accessToken }
        } else if (response.status === 401) {
          // Token无效，清除存储
          console.log('[Background] ❌ Token expired (401), clearing storage');
          await chrome.storage.local.remove(['accessToken', 'user']);
          return { isAuthenticated: false, reason: 'token_expired' }
        } else {
          console.warn(`[Background] ⚠️ Token validation failed with status: ${response.status}`);
          // 其他错误状态，先信任本地token（可能是网络问题）
          console.log('[Background] 🤔 Trusting local token due to non-401 error');
          return { isAuthenticated: true, user, token: accessToken }
        }
      } catch (apiError) {
        console.log('[Background] 🌐 Auth validation API error:', apiError.message);
        // API不可用时，仍然信任本地token
        console.log('[Background] 🤔 Trusting local token due to API unavailability');
        return { isAuthenticated: true, user, token: accessToken }
      }
    }

    console.log('[Background] 📭 No stored credentials found, attempting frontend sync...');
    
    // 尝试从前端网站同步认证状态
    const tabs = await chrome.tabs.query({ 
      url: ["http://localhost:3000/*", "https://*.yourdomain.com/*"] 
    })
    
    if (tabs.length > 0) {
      try {
        console.log('[Background] 🔄 Attempting to sync auth from frontend tab');
        const response = await chrome.tabs.sendMessage(tabs[0].id!, {
          type: 'GET_AUTH_STATUS'
        })
        
        if (response?.isAuthenticated) {
          console.log('[Background] ✅ Synced auth from frontend');
          await chrome.storage.local.set({
            accessToken: response.token,
            user: response.user
          })
          
          return { isAuthenticated: true, user: response.user, token: response.token }
        }
      } catch (error) {
        console.log('[Background] 🚫 No frontend auth sync available:', error.message)
      }
    }

    console.log('[Background] ❌ No valid authentication found anywhere');
    return { isAuthenticated: false, reason: 'no_auth_found' }
  } catch (error) {
    console.error('[Background] 💥 Auth check failed with error:', error)
    return { isAuthenticated: false, reason: 'check_failed', error: error.message }
  }
}

// 处理扩展图标点击
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 打开侧边栏
    await chrome.sidePanel.open({ tabId: tab.id })
  } catch (error) {
    console.error('Failed to open side panel:', error)
  }
})

// 监听来自内容脚本和侧边栏的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理连接检查（心跳）
  if (request.type === 'PING') {
    sendResponse({ success: true, pong: true, timestamp: Date.now() })
    return false // 同步响应
  }

  // 处理认证相关
  if (request.type === 'CHECK_AUTH') {
    checkAuthStatus().then(result => {
      sendResponse(result)
    }).catch(error => {
      sendResponse({ success: false, error: error.message })
    })
    return true
  }
  
  if (request.type === 'LOGOUT') {
    chrome.storage.local.clear().then(() => {
      sendResponse({ success: true })
    }).catch(error => {
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // 处理页面内容更新（来自page-observer）
  if (request.type === 'PAGE_CONTENT_UPDATED') {
    handlePageContentUpdated(request.data, sender)
    return false
  }

  // 处理历史状态更新
  if (request.type === 'HISTORY_STATE_UPDATED') {
    handleHistoryStateUpdated(request.data, sender)
    return false
  }

  // 处理保存页面请求
  if (request.type === 'PROCESS_SAVE_PAGE') {
    handleSavePageRequest(request.data).then(response => {
      sendResponse(response)
    }).catch(error => {
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // 处理摘要生成请求
  if (request.type === 'PROCESS_SUMMARIZE_PAGE') {
    handleSummarizePageRequest(request.data).then(response => {
      sendResponse(response)
    }).catch(error => {
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // 处理来自独立窗口的摘要生成请求
  if (request.type === 'GENERATE_SUMMARY') {
    handleGenerateSummary(request.data).then(response => {
      sendResponse(response)
    }).catch(error => {
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // 处理保存页面和摘要
  if (request.type === 'SAVE_PAGE_WITH_SUMMARY') {
    handleSavePageWithSummary(request.data).then(response => {
      sendResponse(response)
    }).catch(error => {
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // Sidepanel请求页面数据
  if (request.type === 'GET_CURRENT_PAGE_DATA') {
    handleGetCurrentPageData(sendResponse)
    return true
  }

  // Sidepanel请求执行操作
  if (request.type === 'EXECUTE_ACTION') {
    handleExecuteAction(request.action, request.data).then(response => {
      sendResponse(response)
    }).catch(error => {
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  return false
})

// 处理页面内容更新
function handlePageContentUpdated(pageData: any, sender: chrome.runtime.MessageSender) {
  if (sender.tab?.id) {
    // 缓存页面数据
    pageDataCache.set(sender.tab.id, pageData)
    
    // 通知sidepanel页面已更新（如果连接）
    if (uiManager.isSidepanelAvailable()) {
      chrome.runtime.sendMessage({
        type: 'PAGE_DATA_AVAILABLE',
        data: pageData
      }).catch(() => {
        // 忽略错误
      })
    }
  }
}

// 处理历史状态更新
function handleHistoryStateUpdated(data: any, sender: chrome.runtime.MessageSender) {
  console.log('[Background] History state updated:', data);
  
  // 如果有标签ID，清理该标签的缓存数据
  if (sender.tab?.id) {
    pageDataCache.delete(sender.tab.id);
    
    // 可以选择通知content script页面状态已更改
    // chrome.tabs.sendMessage(sender.tab.id, {
    //   type: 'HISTORY_STATE_CHANGED',
    //   url: data.url
    // }).catch(() => {});
  }
}

// 处理保存页面请求
async function handleSavePageRequest(pageData: any) {
  try {
    console.log('[Background] Processing save page request:', pageData.title);
    
    // 显示加载状态
    await uiManager.showLoading('正在保存页面...', 'sidepanel')
    
    // 检查认证状态
    const authResult = await checkAuthStatus()
    console.log('[Background] Auth check result:', authResult);
    
    if (!authResult.isAuthenticated || !authResult.token) {
      await uiManager.showNotification('请先登录', 'error')
      console.log('[Background] Save failed: User not authenticated');
      return { success: false, error: '未登录' }
    }

    console.log('[Background] Starting API save with token:', authResult.token.substring(0, 20) + '...');
    
    // 直接使用已验证的token进行API调用，避免在API模块中重新获取token的问题
    try {
      const response = await saveToLibraryWithToken(
        authResult.token,
        pageData.title, 
        pageData.url, 
        pageData.content
      );
      
      if (response) {
        await uiManager.showNotification('页面已保存到内容库', 'success')
        console.log('[Background] Save successful');
        return { success: true }
      } else {
        await uiManager.showNotification('保存失败，请重试', 'error')
        console.log('[Background] Save failed: API returned false');
        return { success: false, error: '保存失败' }
      }
    } catch (apiError) {
      console.error('[Background] API save error:', apiError);
      const errorMessage = (apiError as Error).message;
      
      // 如果是401错误，清除token
      if (errorMessage.includes('401') || errorMessage.includes('认证失败')) {
        console.log('[Background] Authentication failed, clearing storage');
        await chrome.storage.local.remove(['accessToken', 'user']);
        await uiManager.showNotification('登录已过期，请重新登录', 'error');
        return { success: false, error: '登录已过期，请重新登录' };
      }
      
      await uiManager.showNotification('保存失败：' + errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('[Background] Save page error:', error)
    const errorMessage = (error as Error).message;
    await uiManager.showNotification('保存失败：' + errorMessage, 'error')
    
    return { success: false, error: errorMessage }
  }
}

// 使用指定token保存到内容库的函数
async function saveToLibraryWithToken(token: string, title: string, url: string, content: string): Promise<boolean> {
  const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:8000';
  const API_TIMEOUT = 15000;
  
  // 生成内容摘要
  const summary = generateContentSummary(content);
  const cleanTitle = title?.trim() || extractTitleFromUrl(url);
  
  console.log('[Background] Saving to library with direct token:', {
    title: cleanTitle,
    url,
    contentLength: content.length,
    summaryLength: summary.length
  });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/content/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        type: 'url',
        source_uri: url,
        title: cleanTitle,
        content_text: content,
        summary: summary,
      }),
    });
    
    clearTimeout(timeoutId);
    
    console.log('[Background] Save API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Background] Save API error:', errorText);
      throw new Error(`API错误 ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[Background] Save successful, result:', result);
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[Background] Save request failed:', error);
    throw error;
  }
}

// 生成内容摘要的辅助函数
function generateContentSummary(content: string): string {
  if (!content) return '';
  
  const plainText = content
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/>\s+/g, '')
    .replace(/^[\s-]*$/gm, '')
    .trim();
  
  if (plainText.length <= 200) {
    return plainText;
  }
  
  const truncated = plainText.substring(0, 197);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 150) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// 从URL提取标题的辅助函数
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    const segments = pathname.split('/').filter(s => s);
    const lastSegment = segments[segments.length - 1];
    
    if (lastSegment) {
      return lastSegment
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return urlObj.hostname;
  } catch {
    return 'Untitled Page';
  }
}

// 处理摘要生成请求
async function handleSummarizePageRequest(pageData: any) {
  try {
    if (!pageData.content || pageData.content.length < 100) {
      await uiManager.showNotification('页面内容太少，无法生成摘要', 'warning')
      return { success: false, error: '内容太少' }
    }

    // 显示加载状态
    await uiManager.showLoading('正在生成AI摘要...', 'sidepanel')
    
    // 生成摘要
    const summary = await generateSummary(pageData.content)
    
    // 在最佳UI中显示摘要
    await uiManager.showSummary(summary, pageData.title)
    
    return { success: true, summary }
  } catch (error) {
    console.error('Summarize error:', error)
    await uiManager.showNotification('生成摘要失败：' + (error as Error).message, 'error')
    return { success: false, error: (error as Error).message }
  }
}

// 处理独立窗口的摘要生成请求
async function handleGenerateSummary(data: any) {
  try {
    const summary = await generateSummary(data.content)
    return { success: true, summary }
  } catch (error) {
    console.error('Generate summary error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// 处理保存页面和摘要
async function handleSavePageWithSummary(data: any) {
  try {
    // 将摘要附加到内容中
    const contentWithSummary = `${data.content}\n\n[AI摘要]\n${data.summary}`;
    const success = await saveToLibrary(data.title, data.url, contentWithSummary)
    return { success }
  } catch (error) {
    console.error('Save page with summary error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// 获取当前页面数据
async function handleGetCurrentPageData(sendResponse: (response: any) => void) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const currentTab = tabs[0]
    
    if (!currentTab?.id) {
      sendResponse({ success: false, error: '无法获取当前标签页' })
      return
    }

    // 先检查缓存
    const cachedData = pageDataCache.get(currentTab.id)
    if (cachedData) {
      sendResponse({ success: true, data: cachedData })
      return
    }

    // 向内容脚本请求数据
    chrome.tabs.sendMessage(currentTab.id, { type: 'EXTRACT_CONTENT' }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: '无法连接到页面' })
      } else if (response?.success) {
        // 缓存数据
        pageDataCache.set(currentTab.id!, response.data)
        sendResponse(response)
      } else {
        sendResponse({ success: false, error: '内容提取失败' })
      }
    })
  } catch (error) {
    sendResponse({ success: false, error: (error as Error).message })
  }
}

// 执行操作
async function handleExecuteAction(action: string, data: any) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const currentTab = tabs[0]
    
    if (!currentTab?.id) {
      return { success: false, error: '无法获取当前标签页' }
    }

    switch (action) {
      case 'save':
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(currentTab.id!, { type: 'SAVE_PAGE' }, resolve)
        })
      
      case 'summarize':
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(currentTab.id!, { type: 'SUMMARIZE_PAGE' }, resolve)
        })
      
      case 'extract':
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(currentTab.id!, { type: 'EXTRACT_CONTENT' }, resolve)
        })
      
      default:
        return { success: false, error: '未知操作' }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// 标签页更新时清理缓存
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 清理旧的缓存数据
    pageDataCache.delete(tabId)
    checkAuthStatus()
  }
})

// 标签页关闭时清理缓存
chrome.tabs.onRemoved.addListener((tabId) => {
  pageDataCache.delete(tabId)
})

console.log('Nexus background script initialized with unified architecture')

// 启动
initialize().catch(error => {
  console.error('Background script initialization failed:', error);
}); 