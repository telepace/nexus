import { Storage } from "@plasmohq/storage"
import { initQueues, initWebHistory, getRenderedHtml } from "~/utils/commons"
import type { WebHistory, UserSettings } from "~/utils/interfaces"
import { syncOfflineClippings } from "../utils/api"
import { LOG_PREFIX, OFFLINE_CONFIG } from "../utils/config"

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
      showBadgeCounter: true
    }
    await storage.set("userSettings", defaultSettings)
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

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return
  
  switch (info.menuItemId) {
    case "nexus-explain-selection":
      chrome.tabs.sendMessage(tab.id, { 
        action: "processSelection", 
        type: "explanation", 
        text: info.selectionText 
      })
      break
      
    case "nexus-summarize-selection":
      chrome.tabs.sendMessage(tab.id, { 
        action: "processSelection", 
        type: "summary", 
        text: info.selectionText 
      })
      break
      
    case "nexus-translate-selection":
      chrome.tabs.sendMessage(tab.id, { 
        action: "processSelection", 
        type: "translation", 
        text: info.selectionText 
      })
      break
      
    case "nexus-save-selection":
      chrome.tabs.sendMessage(tab.id, { 
        action: "saveSelection", 
        text: info.selectionText 
      })
      break
      
    case "nexus-clip-page":
      chrome.tabs.sendMessage(tab.id, { action: "clipPage" })
      break
      
    case "nexus-summarize-page":
      chrome.tabs.sendMessage(tab.id, { action: "summarizePage" })
      break
      
    case "nexus-open-app":
      chrome.tabs.create({ url: "https://app.nexus.com" })
      break
  }
})

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

// 处理安装/更新事件
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    console.log(`${LOG_PREFIX} 插件已安装`)
    // 可以在这里执行首次安装的操作
    
    // 打开欢迎页面
    chrome.tabs.create({
      url: chrome.runtime.getURL("pages/welcome/index.html")
    }).catch(error => {
      console.error(`${LOG_PREFIX} 打开欢迎页面失败:`, error)
    })
  } else if (details.reason === "update") {
    console.log(`${LOG_PREFIX} 插件已更新到版本 ${chrome.runtime.getManifest().version}`)
    // 可以在这里执行更新后的操作
  }
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