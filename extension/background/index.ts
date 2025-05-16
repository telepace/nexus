import { Storage } from "@plasmohq/storage"
import { initQueues, initWebHistory, getRenderedHtml } from "~/utils/commons"
import type { WebHistory, UserSettings } from "~/utils/interfaces"

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

// 更新徽章
export const updateBadgeCount = async () => {
  const storage = new Storage({ area: "local" })
  const settings: UserSettings = await storage.get("userSettings")
  
  if (settings?.showBadgeCounter) {
    const pendingItems = await storage.get("pendingClippings") || []
    const count = pendingItems.length
    
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() })
      chrome.action.setBadgeBackgroundColor({ color: "#4285F4" })
    } else {
      chrome.action.setBadgeText({ text: "" })
    }
  } else {
    chrome.action.setBadgeText({ text: "" })
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

// 监听安装或更新事件
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    await initializeSettings()
    initializeContextMenu()
    
    // 打开欢迎页面
    chrome.tabs.create({ url: "https://app.nexus.com/welcome" })
  } else if (reason === "update") {
    initializeContextMenu()
  }
  
  updateBadgeCount()
})

// 定期更新徽章
setInterval(updateBadgeCount, 60000) 