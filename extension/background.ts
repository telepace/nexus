import { sendToContentScript } from "@plasmohq/messaging";

// 定期检查认证状态（每 5 分钟）
const AUTH_CHECK_INTERVAL = 5 * 60 * 1000;

// 初始化背景脚本
async function initialize() {
  console.log("Nexus Extension Background Script Initialized");
  
  // 启动时同步认证状态
  await checkAuthStatus();
  
  // 定期检查认证状态
  setInterval(checkAuthStatus, AUTH_CHECK_INTERVAL);
}

// 检查认证状态
async function checkAuthStatus() {
  try {
    // 从存储中获取认证信息 - 使用与 auth.ts 一致的键名
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
      // 向前端页面发送消息获取认证状态
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id!, {
          type: 'GET_AUTH_STATUS'
        })
        
        if (response?.isAuthenticated) {
          // 同步认证信息到扩展存储 - 使用与 auth.ts 一致的键名
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
  if (request.type === 'CHECK_AUTH') {
    checkAuthStatus().then(result => {
      sendResponse(result)
    })
    return true // 保持消息通道开放以支持异步响应
  }
  
  if (request.type === 'LOGOUT') {
    chrome.storage.local.clear().then(() => {
      sendResponse({ success: true })
    })
    return true
  }
  
  if (request.type === 'EXTRACT_CONTENT') {
    // 向当前活跃标签页的内容脚本发送提取内容请求
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendToContentScript({
          name: "extract-content",
          body: request.data
        }, tabs[0].id)
      }
    })
  }
  
  if (request.type === 'CONTENT_EXTRACTED') {
    // 将提取的内容转发给侧边栏
    chrome.runtime.sendMessage({
      type: 'CONTENT_AVAILABLE',
      data: request.data
    })
  }
})

// 标签页更新时检查认证状态
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkAuthStatus()
  }
})

console.log('Nexus background script initialized with side panel support')

// 启动
initialize(); 