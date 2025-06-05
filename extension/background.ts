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
  
  // 定期检查认证状态
  setInterval(checkAuthStatus, AUTH_CHECK_INTERVAL);
}

// 检查认证状态
async function checkAuthStatus() {
  try {
    // 从存储中获取认证信息
    const result = await chrome.storage.local.get(['accessToken', 'user'])
    const { accessToken, user } = result

    if (accessToken && user) {
      console.log('User authenticated:', user)
      return { isAuthenticated: true, user, token: accessToken }
    }

    // 尝试从前端网站同步认证状态
    const tabs = await chrome.tabs.query({ 
      url: ["http://localhost:3000/*", "https://*.yourdomain.com/*"] 
    })
    
    if (tabs.length > 0) {
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id!, {
          type: 'GET_AUTH_STATUS'
        })
        
        if (response?.isAuthenticated) {
          await chrome.storage.local.set({
            accessToken: response.token,
            user: response.user
          })
          
          return { isAuthenticated: true, user: response.user, token: response.token }
        }
      } catch (error) {
        console.log('No frontend auth sync available')
      }
    }

    return { isAuthenticated: false }
  } catch (error) {
    console.error('Auth check failed:', error)
    return { isAuthenticated: false }
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
  // 处理认证相关
  if (request.type === 'CHECK_AUTH') {
    checkAuthStatus().then(result => {
      sendResponse(result)
    })
    return true
  }
  
  if (request.type === 'LOGOUT') {
    chrome.storage.local.clear().then(() => {
      sendResponse({ success: true })
    })
    return true
  }

  // 处理页面内容更新（来自page-observer）
  if (request.type === 'PAGE_CONTENT_UPDATED') {
    handlePageContentUpdated(request.data, sender)
    return false
  }

  // 处理保存页面请求
  if (request.type === 'PROCESS_SAVE_PAGE') {
    handleSavePageRequest(request.data).then(response => {
      sendResponse(response)
    })
    return true
  }

  // 处理摘要生成请求
  if (request.type === 'PROCESS_SUMMARIZE_PAGE') {
    handleSummarizePageRequest(request.data).then(response => {
      sendResponse(response)
    })
    return true
  }

  // 处理来自独立窗口的摘要生成请求
  if (request.type === 'GENERATE_SUMMARY') {
    handleGenerateSummary(request.data).then(response => {
      sendResponse(response)
    })
    return true
  }

  // 处理保存页面和摘要请求
  if (request.type === 'SAVE_PAGE_WITH_SUMMARY') {
    handleSavePageWithSummary(request.data).then(response => {
      sendResponse(response)
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

// 处理保存页面请求
async function handleSavePageRequest(pageData: any) {
  try {
    // 显示加载状态
    await uiManager.showLoading('正在保存页面...', 'sidepanel')
    
    // 检查认证状态
    const authResult = await checkAuthStatus()
    if (!authResult.isAuthenticated) {
      await uiManager.showNotification('请先登录', 'error')
      return { success: false, error: '未登录' }
    }

    // 调用API保存
    const success = await saveToLibrary(pageData.title, pageData.url, pageData.content)
    
    if (success) {
      await uiManager.showNotification('页面已保存到内容库', 'success')
      return { success: true }
    } else {
      await uiManager.showNotification('保存失败，请重试', 'error')
      return { success: false, error: '保存失败' }
    }
  } catch (error) {
    console.error('Save page error:', error)
    await uiManager.showNotification('保存失败：' + (error as Error).message, 'error')
    return { success: false, error: (error as Error).message }
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
    // 这里可以保存页面和摘要
    const success = await saveToLibrary(data.title, data.url, data.content, data.summary)
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
initialize(); 