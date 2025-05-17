import { Storage } from "@plasmohq/storage"
import { initQueues, initWebHistory, getRenderedHtml } from "~/utils/commons"
import type { WebHistory, UserSettings } from "~/utils/interfaces"
import { syncOfflineClippings } from "../utils/api"
import { LOG_PREFIX, OFFLINE_CONFIG } from "../utils/config"

// 检查是否支持chrome.sidePanel API
const isSidePanelSupported = () => {
  return typeof chrome !== 'undefined' && 
         typeof chrome.sidePanel !== 'undefined';
}

// 初始化设置
const initializeSettings = async () => {
  const storage = new Storage({ area: "local" })
  const settings = await storage.get("userSettings")
  
  if (!settings) {
    const defaultSettings: UserSettings = {
      theme: "system",
      defaultClipAction: "save",
      openSidebarOnClip: false,
      autoSummarize: false,
      defaultLanguage: "en",
      showBadgeCounter: true,
      useBrowserLanguage: false,
      keepSidePanelOpen: true,
      promptShortcuts: [],
      keyboardShortcut: "Alt+N"
    }
    await storage.set("userSettings", defaultSettings)
  }
  
  // 设置侧边栏行为
  if (isSidePanelSupported()) {
    console.log(`${LOG_PREFIX} 设置侧边栏行为`);
    chrome.sidePanel.setPanelBehavior({ 
      openPanelOnActionClick: true 
    }).catch(err => console.error(`${LOG_PREFIX} 设置侧边栏行为失败:`, err));
  }
}

// 初始化右键菜单
const initializeContextMenu = () => {
  chrome.contextMenus.removeAll(() => {
    // 选中文本时的菜单
    chrome.contextMenus.create({
      id: "nexus-explain-selection",
      title: "Nexus: 解释选中内容",
      contexts: ["selection"]
    })
    
    chrome.contextMenus.create({
      id: "nexus-summarize-selection",
      title: "Nexus: 总结选中内容",
      contexts: ["selection"]
    })
    
    chrome.contextMenus.create({
      id: "nexus-translate-selection",
      title: "Nexus: 翻译选中内容",
      contexts: ["selection"]
    })
    
    chrome.contextMenus.create({
      id: "nexus-save-selection",
      title: "Nexus: 保存选中内容到笔记",
      contexts: ["selection"]
    })
    
    // 页面上下文菜单
    chrome.contextMenus.create({
      id: "nexus-clip-page",
      title: "Nexus: 剪藏页面到待看列表",
      contexts: ["page"]
    })
    
    chrome.contextMenus.create({
      id: "nexus-summarize-page",
      title: "Nexus: 总结此页面",
      contexts: ["page"]
    })
    
    chrome.contextMenus.create({
      id: "nexus-open-app",
      title: "打开 Nexus",
      contexts: ["page"]
    })
  })
}

// 安装和更新时的处理
chrome.runtime.onInstalled.addListener(async () => {
  await initializeSettings();
  initializeContextMenu();
  updateBadgeCount();
});

// 监听扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  
  // 优先使用侧边栏API
  if (isSidePanelSupported()) {
    chrome.sidePanel.open({ tabId: tab.id })
      .catch(err => {
        console.error(`${LOG_PREFIX} 打开侧边栏失败:`, err);
        // 失败时回退到传统方式
        sendMessageToContentScript(tab.id, { action: "toggleSidebar", show: true });
      });
  } else {
    // 不支持侧边栏API时使用传统方式
    sendMessageToContentScript(tab.id, { action: "toggleSidebar", show: true });
  }
});

// 发送消息到内容脚本，包含错误处理和注入修复脚本的逻辑
const sendMessageToContentScript = (tabId: number, message: any) => {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      console.warn(`${LOG_PREFIX} 发送消息错误:`, chrome.runtime.lastError);
      
      // 尝试注入修复脚本
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["sidebar-fix.js"]
      }).then(() => {
        console.log(`${LOG_PREFIX} 侧边栏修复脚本已注入`);
        
        // 重新发送消息
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, message);
        }, 200);
      }).catch(err => {
        console.error(`${LOG_PREFIX} 注入修复脚本失败:`, err);
      });
    }
  });
};

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  
  const action = String(info.menuItemId);
  const text = info.selectionText || "";
  
  if (isSidePanelSupported()) {
    // 使用侧边栏API
    chrome.sidePanel.open({ tabId: tab.id })
      .then(() => {
        // 通过运行时消息发送到侧边栏
        chrome.runtime.sendMessage({ 
          action: action,
          data: text
        });
      })
      .catch(err => {
        console.error(`${LOG_PREFIX} 打开侧边栏失败:`, err);
        // 失败时回退到传统方式，根据不同菜单项使用不同的消息格式
        handleMenuActionFallback(tab.id, action, text);
      });
  } else {
    // 使用传统方式
    handleMenuActionFallback(tab.id, action, text);
  }
});

// 处理不同菜单项的传统方式回退
function handleMenuActionFallback(tabId: number, action: string, text: string) {
  switch (action) {
    case "nexus-explain-selection":
      sendMessageToContentScript(tabId, { 
        action: "processSelection", 
        type: "explanation", 
        text 
      });
      break;
      
    case "nexus-summarize-selection":
      sendMessageToContentScript(tabId, { 
        action: "processSelection", 
        type: "summary", 
        text 
      });
      break;
      
    case "nexus-translate-selection":
      sendMessageToContentScript(tabId, { 
        action: "processSelection", 
        type: "translation", 
        text 
      });
      break;
      
    case "nexus-save-selection":
      sendMessageToContentScript(tabId, { 
        action: "saveSelection", 
        text 
      });
      break;
      
    case "nexus-clip-page":
      sendMessageToContentScript(tabId, { action: "clipPage" });
      break;
      
    case "nexus-summarize-page":
      sendMessageToContentScript(tabId, { action: "summarizePage" });
      break;
      
    case "nexus-open-app":
      chrome.tabs.create({ url: "https://app.nexus.com" });
      break;
      
    default:
      console.warn(`${LOG_PREFIX} 未识别的菜单项:`, action);
  }
}

// 更新徽章计数
async function updateBadgeCount() {
  try {
    const storage = await chrome.storage.local.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY)
    const pendingClippings = storage[OFFLINE_CONFIG.PENDING_ITEMS_KEY] || []
    
    if (pendingClippings.length > 0) {
      chrome.action.setBadgeText({ text: pendingClippings.length.toString() })
      chrome.action.setBadgeBackgroundColor({ color: "#4f46e5" })
    } else {
      chrome.action.setBadgeText({ text: "" })
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取待处理项失败:`, error)
  }
}

// 监听标签页创建
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    if (tab.id) {
      await initWebHistory(tab.id)
      await initQueues(tab.id)
    }
  } catch (error) {
    console.error("Error initializing tab:", error)
  }
})

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const storage = new Storage({ area: "local" })
    await initWebHistory(tabId)
    await initQueues(tabId)

    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: getRenderedHtml
      })

      if (result && result[0]?.result) {
        const pageData = result[0].result
        
        let urlQueueListObj: { urlQueueList: WebHistory[] } = await storage.get("urlQueueList")
        let timeQueueListObj: { timeQueueList: WebHistory[] } = await storage.get("timeQueueList")

        if (urlQueueListObj?.urlQueueList) {
          const tabHistory = urlQueueListObj.urlQueueList.find(
            (data) => data.tabsessionId === tabId
          )
          
          if (tabHistory) {
            tabHistory.urlQueue.push(pageData.url)
            await storage.set("urlQueueList", urlQueueListObj)
          }
        }

        if (timeQueueListObj?.timeQueueList) {
          const tabHistory = timeQueueListObj.timeQueueList.find(
            (data) => data.tabsessionId === tabId
          )
          
          if (tabHistory) {
            tabHistory.timeQueue.push(pageData.entryTime)
            await storage.set("timeQueueList", timeQueueListObj)
          }
        }
      }
    } catch (error) {
      console.error("Error processing page data:", error)
    }
  }
})

// 监听标签页关闭
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const storage = new Storage({ area: "local" })
  
  try {
    let urlQueueListObj: { urlQueueList: WebHistory[] } = await storage.get("urlQueueList")
    let timeQueueListObj: { timeQueueList: WebHistory[] } = await storage.get("timeQueueList")
    
    if (urlQueueListObj?.urlQueueList) {
      urlQueueListObj.urlQueueList = urlQueueListObj.urlQueueList.filter(
        (element) => element.tabsessionId !== tabId
      )
      await storage.set("urlQueueList", urlQueueListObj)
    }
    
    if (timeQueueListObj?.timeQueueList) {
      timeQueueListObj.timeQueueList = timeQueueListObj.timeQueueList.filter(
        (element) => element.tabsessionId !== tabId
      )
      await storage.set("timeQueueList", timeQueueListObj)
    }
  } catch (error) {
    console.error("Error cleaning up tab data:", error)
  }
})

// 注册消息监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`${LOG_PREFIX} 收到消息:`, message)
  
  // 处理打开弹出窗口
  if (message.action === "openPopup") {
    chrome.action.openPopup()
      .catch(error => console.error(`${LOG_PREFIX} 打开弹出窗口失败:`, error))
  }
  
  // 处理更新徽章
  if (message.action === "updateBadgeCount") {
    updateBadgeCount()
      .catch(error => console.error(`${LOG_PREFIX} 更新徽章失败:`, error))
  }
  
  // 返回true表示异步处理
  return true
})

// 定期同步离线数据
async function scheduleSyncOfflineData() {
  try {
    const syncCount = await syncOfflineClippings()
    if (syncCount > 0) {
      console.log(`${LOG_PREFIX} 成功同步 ${syncCount} 个离线项`)
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 同步离线数据失败:`, error)
  }
  
  // 每10分钟尝试同步一次
  setTimeout(scheduleSyncOfflineData, 10 * 60 * 1000)
}

// 网络状态变化监听
chrome.runtime.onStartup.addListener(() => {
  scheduleSyncOfflineData()
    .catch(error => console.error(`${LOG_PREFIX} 启动同步离线数据失败:`, error))
  
  updateBadgeCount()
    .catch(error => console.error(`${LOG_PREFIX} 启动更新徽章失败:`, error))
})

// 监听在线状态变化
window.addEventListener("online", () => {
  console.log(`${LOG_PREFIX} 网络已恢复连接，开始同步数据`)
  syncOfflineClippings()
    .catch(error => console.error(`${LOG_PREFIX} 网络恢复同步失败:`, error))
})

// 定期更新徽章
setInterval(updateBadgeCount, 60000) 