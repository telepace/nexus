import { sendToContentScript } from "@plasmohq/messaging";
// import { getUIManager } from "./lib/ui-manager"; // 🔧 暂时移除UI Manager
import { generateSummary, saveToLibrary } from "./lib/api";
import { apiClient, StreamChunk } from './lib/api-client'

// 🔧 暂时移除UI Manager
// const uiManager = getUIManager();

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
    console.log('[Background] 🔐 Starting auth status check...');
    
    // 从存储中获取认证信息
    const result = await chrome.storage.local.get(['accessToken', 'user'])
    const { accessToken, user } = result

    if (accessToken && user) {
      console.log('[Background] 🔑 Found stored credentials for user:', user.email)
      
      // 验证token是否仍然有效
      try {
        // 🔧 确保API URL正确获取
        const apiUrl = `${process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/me`;
        console.log('[Background] 🌐 Validating token with API:', apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
        });
        
        console.log('[Background] 📡 Token validation response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: apiUrl
        });
        
        if (response.ok) {
          console.log('[Background] ✅ Token validation successful');
          return { isAuthenticated: true, user, token: accessToken }
        } else {
          // 🔧 修复：任何非200状态都视为认证失败，与调试按钮逻辑保持一致
          console.log(`[Background] ❌ Token validation failed with status: ${response.status}`);
          
          // 尝试获取错误详情
          let errorDetail = '';
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorData.message || '';
          } catch {
            errorDetail = await response.text() || '';
          }
          console.log('[Background] 📄 Error detail:', errorDetail);
          
          // 清除无效token
          await chrome.storage.local.remove(['accessToken', 'user']);
          
          if (response.status === 401) {
            console.log('[Background] 🔒 Token expired (401)');
            return { isAuthenticated: false, reason: 'token_expired' }
          } else if (response.status === 403) {
            console.log('[Background] 🚫 Token forbidden (403)');
            return { isAuthenticated: false, reason: 'token_forbidden' }
          } else {
            console.log(`[Background] ⚠️ API error (${response.status})`);
            return { isAuthenticated: false, reason: 'api_error', status: response.status }
          }
        }
      } catch (apiError) {
        console.log('[Background] 🌐 Auth validation API error:', {
          name: apiError.name,
          message: apiError.message
        });
        
        // 🔧 修复：只有在网络完全不可达时才保留token，其他情况清除token
        if (apiError.message?.includes('fetch') || 
            apiError.message?.includes('network') ||
            apiError.message?.includes('Failed to fetch') ||
            apiError.name === 'TypeError') {
          console.log('[Background] 🤔 Network error, keeping token for retry');
          return { isAuthenticated: true, user, token: accessToken, warning: 'network_error' }
        } else {
          // 其他错误（如解析错误等）清除token
          console.log('[Background] ❌ API error, clearing token');
          await chrome.storage.local.remove(['accessToken', 'user']);
          return { isAuthenticated: false, reason: 'api_error', error: apiError.message }
        }
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
    console.error('[Background] 💥 Auth check failed with error:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')[0]
    })
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
  console.log('[Background] 📨 Received message:', request.type);

  // 处理连接检查（心跳）
  if (request.type === 'PING') {
    sendResponse({ success: true, timestamp: Date.now() });
    return;
  }

  // 处理认证相关
  if (request.type === 'CHECK_AUTH') {
    console.log('[Background] 🔐 CHECK_AUTH request received');
    checkAuthStatus().then(result => {
      console.log('[Background] 🔐 CHECK_AUTH response:', { isAuthenticated: result.isAuthenticated });
      sendResponse(result)
    }).catch(error => {
      console.error('[Background] 🔐 CHECK_AUTH error:', error);
      sendResponse({ success: false, error: error.message })
    })
    return true
  }
  
  if (request.type === 'LOGOUT') {
    console.log('[Background] 🚪 LOGOUT request received');
    chrome.storage.local.clear().then(() => {
      console.log('[Background] 🚪 LOGOUT successful');
      sendResponse({ success: true })
    }).catch(error => {
      console.error('[Background] 🚪 LOGOUT error:', error);
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // 处理页面内容更新（来自page-observer）
  if (request.type === 'PAGE_CONTENT_UPDATED') {
    console.log('[Background] 📄 PAGE_CONTENT_UPDATED received');
    handlePageContentUpdated(request.data, sender)
    return false
  }

  // 处理历史状态更新
  if (request.type === 'HISTORY_STATE_UPDATED') {
    console.log('[Background] 🔄 HISTORY_STATE_UPDATED received:', request.data);
    try {
      handleHistoryStateUpdated(request.data, sender);
    } catch (error) {
      console.error('[Background] ❌ Error handling HISTORY_STATE_UPDATED:', error);
    }
    return false
  }

  // 处理保存页面请求
  if (request.type === 'PROCESS_SAVE_PAGE') {
    console.log('[Background] 💾 PROCESS_SAVE_PAGE request received');
    handleSavePageRequest(request.data).then(response => {
      console.log('[Background] 💾 PROCESS_SAVE_PAGE response:', { success: response.success });
      sendResponse(response)
    }).catch(error => {
      console.error('[Background] 💾 PROCESS_SAVE_PAGE error:', error);
      sendResponse({ success: false, error: error.message || 'Unknown error' });
    });
    return true; // 异步响应
  }

  // 处理摘要生成请求
  if (request.type === 'PROCESS_SUMMARIZE_PAGE') {
    console.log('[Background] 📝 PROCESS_SUMMARIZE_PAGE request received');
    handleSummarizePage(request.data).then(response => {
      console.log('[Background] 📝 PROCESS_SUMMARIZE_PAGE response:', { success: response.success });
      sendResponse(response)
    }).catch(error => {
      console.error('[Background] 📝 PROCESS_SUMMARIZE_PAGE error:', error);
      sendResponse({ success: false, error: error.message || 'Unknown error' });
    });
    return true; // 异步响应
  }

  // 处理关键要点提取请求
  if (request.type === 'PROCESS_EXTRACT_KEY_POINTS') {
    console.log('[Background] 🔑 PROCESS_EXTRACT_KEY_POINTS request received');
    handleExtractKeyPoints(request.data).then(response => {
      console.log('[Background] 🔑 PROCESS_EXTRACT_KEY_POINTS response:', { success: response.success });
      sendResponse(response)
    }).catch(error => {
      console.error('[Background] 🔑 PROCESS_EXTRACT_KEY_POINTS error:', error);
      sendResponse({ success: false, error: error.message || 'Unknown error' });
    });
    return true; // 异步响应
  }

  // 处理来自独立窗口的摘要生成请求
  if (request.type === 'GENERATE_SUMMARY') {
    console.log('[Background] 🤖 GENERATE_SUMMARY request received');
    handleGenerateSummary(request.data).then(response => {
      console.log('[Background] 🤖 GENERATE_SUMMARY response:', { success: response.success });
      sendResponse(response)
    }).catch(error => {
      console.error('[Background] 🤖 GENERATE_SUMMARY error:', error);
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // 处理保存页面和摘要
  if (request.type === 'SAVE_PAGE_WITH_SUMMARY') {
    console.log('[Background] 💾📝 SAVE_PAGE_WITH_SUMMARY request received');
    handleSavePageWithSummary(request.data).then(response => {
      console.log('[Background] 💾📝 SAVE_PAGE_WITH_SUMMARY response:', { success: response.success });
      sendResponse(response)
    }).catch(error => {
      console.error('[Background] 💾📝 SAVE_PAGE_WITH_SUMMARY error:', error);
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  // Sidepanel请求页面数据
  if (request.type === 'GET_CURRENT_PAGE_DATA') {
    console.log('[Background] 📊 GET_CURRENT_PAGE_DATA request received');
    handleGetCurrentPageData(sendResponse)
    return true
  }

  // Sidepanel请求执行操作
  if (request.type === 'EXECUTE_ACTION') {
    console.log('[Background] ⚡ EXECUTE_ACTION request received:', request.action);
    handleExecuteAction(request.action, request.data).then(response => {
      console.log('[Background] ⚡ EXECUTE_ACTION response:', { success: response.success });
      sendResponse(response)
    }).catch(error => {
      console.error('[Background] ⚡ EXECUTE_ACTION error:', error);
      sendResponse({ success: false, error: error.message })
    })
    return true
  }

  console.log('[Background] ❓ Unknown message type:', request.type);
  return false
})

// 处理页面内容更新
function handlePageContentUpdated(pageData: any, sender: chrome.runtime.MessageSender) {
  if (sender.tab?.id) {
    // 缓存页面数据
    pageDataCache.set(sender.tab.id, pageData)
    
    // 通知sidepanel页面已更新（如果连接）
    // 🔧 暂时简化sidepanel检查
    try {
      chrome.runtime.sendMessage({
        type: 'PAGE_DATA_AVAILABLE',
        data: pageData
      }).catch(() => {
        // 忽略错误
      })
    } catch (error) {
      // 忽略错误
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
    console.log('[Background] 🚀 Processing save page request:', {
      title: pageData.title,
      url: pageData.url,
      contentLength: pageData.content?.length || 0
    });
    
    // 🔧 添加详细的环境检查
    const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:8000';
    console.log('[Background] 🌐 Using API URL:', API_BASE_URL);
    
    // 检查认证状态
    console.log('[Background] 🔐 Starting auth check...');
    const authResult = await checkAuthStatus()
    console.log('[Background] 🔐 Auth check result:', {
      isAuthenticated: authResult.isAuthenticated,
      hasToken: !!authResult.token,
      reason: authResult.reason,
      warning: authResult.warning
    });
    
    if (!authResult.isAuthenticated || !authResult.token) {
      // 🔧 改进错误信息，根据具体原因提供不同的提示
      let errorMessage = '认证失败';
      let userMessage = '请先登录';
      
      switch (authResult.reason) {
        case 'token_expired':
          errorMessage = '认证已过期';
          userMessage = '登录已过期，请重新登录';
          break;
        case 'token_forbidden':
          errorMessage = '认证被拒绝';
          userMessage = '访问被拒绝，请重新登录';
          break;
        case 'api_error':
          errorMessage = `API错误 (${authResult.status || 'unknown'})`;
          userMessage = '服务器错误，请稍后重试或重新登录';
          break;
        case 'no_auth_found':
          errorMessage = '未找到认证信息';
          userMessage = '请先登录';
          break;
        default:
          errorMessage = '认证检查失败';
          userMessage = '认证状态异常，请重新登录';
      }
      
      console.log(`[Background] ❌ Save failed: ${errorMessage}`);
      return { success: false, error: userMessage }
    }

    // 🔧 添加网络错误警告
    if (authResult.warning === 'network_error') {
      console.log('[Background] ⚠️ Warning: Network issues detected, but proceeding with cached token');
    }

    console.log('[Background] 💾 Starting API save with token:', authResult.token.substring(0, 20) + '...');
    
    // 🔧 直接使用已验证的token进行API调用，避免在API模块中重新获取token的问题
    try {
      const response = await saveToLibraryWithToken(
        authResult.token,
        pageData.title, 
        pageData.url, 
        pageData.content
      );
      
      if (response) {
        console.log('[Background] ✅ Save successful');
        return { success: true, message: '页面已保存到内容库' }
      } else {
        console.log('[Background] ❌ Save failed: API returned false');
        return { success: false, error: '保存失败' }
      }
    } catch (apiError) {
      console.error('[Background] 💥 API save error:', apiError);
      const errorMessage = (apiError as Error).message;
      
      // 如果是401错误，清除token
      if (errorMessage.includes('401') || errorMessage.includes('认证失败')) {
        console.log('[Background] 🔑 Authentication failed during save, clearing storage');
        await chrome.storage.local.remove(['accessToken', 'user']);
        return { success: false, error: '登录已过期，请重新登录' };
      }
      
      // 🔧 改进错误信息处理
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('403')) {
        userFriendlyMessage = '访问被拒绝，请检查权限或重新登录';
      } else if (errorMessage.includes('500')) {
        userFriendlyMessage = '服务器内部错误，请稍后重试';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('网络')) {
        userFriendlyMessage = '网络超时，请检查网络连接后重试';
      } else if (errorMessage.includes('Failed to fetch')) {
        userFriendlyMessage = '网络连接失败，请检查网络后重试';
      }
      
      console.log('[Background] 📝 Returning user-friendly error:', userFriendlyMessage);
      return { success: false, error: userFriendlyMessage };
    }
  } catch (error) {
    console.error('[Background] 💥 Save page error:', error)
    const errorMessage = (error as Error).message;
    console.log('[Background] 📝 Returning generic error:', errorMessage);
    
    return { success: false, error: errorMessage }
  }
}

// 使用指定token保存到内容库的函数
async function saveToLibraryWithToken(token: string, title: string, url: string, content: string): Promise<boolean> {
  // 🔧 确保API URL正确获取
  const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:8000';
  const API_TIMEOUT = 15000;
  
  console.log('[Background] 🔧 saveToLibraryWithToken called with:', {
    apiUrl: API_BASE_URL,
    tokenPrefix: token.substring(0, 20) + '...',
    title: title?.substring(0, 50) + '...',
    url: url?.substring(0, 100) + '...',
    contentLength: content?.length || 0
  });
  
  // 生成内容摘要
  const summary = generateContentSummary(content);
  const cleanTitle = title?.trim() || extractTitleFromUrl(url);
  
  console.log('[Background] 📝 Prepared data for API:', {
    title: cleanTitle,
    url,
    contentLength: content.length,
    summaryLength: summary.length
  });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[Background] ⏰ Request timeout triggered');
    controller.abort();
  }, API_TIMEOUT);
  
  const apiEndpoint = `${API_BASE_URL}/api/v1/content/create`;
  const requestBody = {
    type: 'url',
    source_uri: url,
    title: cleanTitle,
    content_text: content,
    summary: summary,
  };
  
  console.log('[Background] 🌐 Making API request:', {
    endpoint: apiEndpoint,
    method: 'POST',
    bodyKeys: Object.keys(requestBody),
    timeout: API_TIMEOUT
  });
  
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });
    
    clearTimeout(timeoutId);
    
    console.log('[Background] 📡 Save API response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      }
    });
    
    if (!response.ok) {
      let errorText;
      try {
        // 尝试解析JSON错误响应
        const errorData = await response.json();
        errorText = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData);
        console.log('[Background] 📄 Parsed error response:', errorData);
      } catch (parseError) {
        // 如果不是JSON，获取文本内容
        errorText = await response.text() || response.statusText;
        console.log('[Background] 📄 Raw error response:', errorText);
      }
      
      console.error('[Background] ❌ Save API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`API错误 ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[Background] ✅ Save successful, result:', {
      id: result.id,
      title: result.title,
      type: result.type,
      created_at: result.created_at
    });
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('[Background] ⏰ Request timeout after', API_TIMEOUT, 'ms');
      throw new Error('请求超时，请检查网络连接');
    }
    
    console.error('[Background] 💥 Save request failed:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')[0] // 只显示第一行堆栈
    });
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

// 处理摘要页面请求
async function handleSummarizePage(pageData: any) {
  try {
    console.log('[Background] 🚀 Processing summarize page request:', {
      title: pageData.title,
      url: pageData.url,
      contentLength: pageData.content?.length || 0
    });
    
    // 检查认证状态
    const authResult = await checkAuthStatus()
    if (!authResult.isAuthenticated || !authResult.token) {
      return { success: false, error: '请先登录' }
    }

    // 设置API客户端token
    apiClient.setToken(authResult.token);

    // 首先创建内容项
    console.log('[Background] 📝 Creating content item...');
    const contentItem = await apiClient.createContent({
      type: 'url',
      source_uri: pageData.url,
      title: pageData.title?.trim() || extractTitleFromUrl(pageData.url),
      content_text: pageData.content,
      summary: generateContentSummary(pageData.content)
    });

    console.log('[Background] ✅ Content item created:', contentItem.id);

    // 等待内容处理完成
    let processingAttempts = 0;
    const maxAttempts = 10;
    
    while (processingAttempts < maxAttempts) {
      const contentStatus = await apiClient.getContent(contentItem.id);
      
      if (contentStatus.processing_status === 'completed') {
        break;
      } else if (contentStatus.processing_status === 'failed') {
        throw new Error('内容处理失败');
      }
      
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
      processingAttempts++;
    }

    if (processingAttempts >= maxAttempts) {
      throw new Error('内容处理超时');
    }

    // 开始流式摘要生成
    console.log('[Background] 🔄 Starting streaming summary...');
    
    let streamingSummary = '';
    let summaryComplete = false;

    const summaryPromise = apiClient.streamSummary(contentItem.id, {
      onChunk: (chunk: StreamChunk) => {
        console.log('[Background] 📦 Received chunk:', {
          type: chunk.type,
          contentLength: chunk.content.length,
          finished: chunk.finished
        });

        // 向content script发送实时更新
        if (chunk.type === 'summary' && chunk.content && !chunk.finished) {
          // 发送流式内容更新
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'STREAMING_SUMMARY_CHUNK',
                data: {
                  contentId: contentItem.id,
                  chunk: chunk.content,
                  isComplete: false
                }
              }).catch(err => {
                console.log('[Background] Failed to send chunk to content script:', err);
              });
            }
          });
        }
      },
      onComplete: (fullContent: string) => {
        console.log('[Background] ✅ Streaming summary completed');
        streamingSummary = fullContent;
        summaryComplete = true;

        // 发送完成信号
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'STREAMING_SUMMARY_COMPLETE',
              data: {
                contentId: contentItem.id,
                summary: fullContent
              }
            }).catch(err => {
              console.log('[Background] Failed to send completion to content script:', err);
            });
          }
        });
      },
      onError: (error: string) => {
        console.error('[Background] ❌ Streaming summary error:', error);
      }
    });

    // 等待摘要完成
    await summaryPromise;

    return {
      success: true,
      contentId: contentItem.id,
      summary: streamingSummary,
      streaming: true
    };

  } catch (error) {
    console.error('[Background] ❌ Summarize failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// 处理流式关键要点提取请求
async function handleExtractKeyPoints(pageData: any) {
  try {
    console.log('[Background] 🚀 Processing key points extraction:', {
      title: pageData.title,
      url: pageData.url,
      contentLength: pageData.content?.length || 0
    });
    
    // 检查认证状态
    const authResult = await checkAuthStatus()
    if (!authResult.isAuthenticated || !authResult.token) {
      return { success: false, error: '请先登录' }
    }

    // 设置API客户端token
    apiClient.setToken(authResult.token);

    // 如果已有contentId，直接使用；否则创建新的内容项
    let contentId = pageData.contentId;
    
    if (!contentId) {
      const contentItem = await apiClient.createContent({
        type: 'url',
        source_uri: pageData.url,
        title: pageData.title?.trim() || extractTitleFromUrl(pageData.url),
        content_text: pageData.content,
        summary: generateContentSummary(pageData.content)
      });
      contentId = contentItem.id;
    }

    console.log('[Background] 🔄 Starting streaming key points extraction...');
    
    let streamingKeyPoints = '';

    const keyPointsPromise = apiClient.streamKeyPoints(contentId, {
      onChunk: (chunk: StreamChunk) => {
        console.log('[Background] 📦 Received key points chunk:', {
          type: chunk.type,
          contentLength: chunk.content.length,
          finished: chunk.finished
        });

        // 向content script发送实时更新
        if (chunk.type === 'key_points' && chunk.content && !chunk.finished) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'STREAMING_KEY_POINTS_CHUNK',
                data: {
                  contentId: contentId,
                  chunk: chunk.content,
                  isComplete: false
                }
              }).catch(err => {
                console.log('[Background] Failed to send key points chunk:', err);
              });
            }
          });
        }
      },
      onComplete: (fullContent: string) => {
        console.log('[Background] ✅ Streaming key points completed');
        streamingKeyPoints = fullContent;

        // 发送完成信号
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'STREAMING_KEY_POINTS_COMPLETE',
              data: {
                contentId: contentId,
                keyPoints: fullContent
              }
            }).catch(err => {
              console.log('[Background] Failed to send key points completion:', err);
            });
          }
        });
      },
      onError: (error: string) => {
        console.error('[Background] ❌ Streaming key points error:', error);
      }
    });

    await keyPointsPromise;

    return {
      success: true,
      contentId: contentId,
      keyPoints: streamingKeyPoints,
      streaming: true
    };

  } catch (error) {
    console.error('[Background] ❌ Key points extraction failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
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