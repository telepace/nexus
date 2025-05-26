import { Storage } from "@plasmohq/storage"
import { initQueues, initWebHistory, getRenderedHtml } from "~/utils/commons"
import type { WebHistory, UserSettings } from "~/utils/interfaces"
import { syncOfflineClippings } from "../utils/api"
import { LOG_PREFIX, OFFLINE_CONFIG } from "../utils/config"

// 消息处理程序注册
import { handler as authHandler } from "./messages/auth"
import { handler as savedataHandler } from "./messages/savedata"
import { handler as aiHandler } from "./messages/ai"
import { handler as onboardingHandler } from "./messages/onboarding"
import { handler as setupHandler } from "./messages/setup"

// 导出消息名称与处理程序的映射，用于Plasmo消息系统
export const messaging = {
  auth: authHandler,
  savedata: savedataHandler,
  ai: aiHandler,
  onboarding: onboardingHandler,
  setup: setupHandler
}

// 检查是否支持chrome.sidePanel API
const isSidePanelSupported = () => {
  return typeof chrome !== 'undefined' && 
         typeof chrome.sidePanel !== 'undefined';
}

// 初始化设置
const initializeSettings = async () => {
  const storage = new Storage({ area: "local" })
  const settingsData = await storage.get("userSettings")
  
  if (!settingsData || typeof settingsData !== 'object') {
    const defaultSettings: UserSettings = {
      theme: "system",
      defaultClipAction: "save",
      openSidebarOnClip: false,
      autoSummarize: false,
      defaultLanguage: "zh",
      showBadgeCounter: true,
      useBrowserLanguage: false,
      keepSidePanelOpen: true,
      promptShortcuts: []
    }
    await storage.set("userSettings", defaultSettings)
  } else {
    // 确保设置对象结构正确
    const settings = settingsData as any
    if (!settings.promptShortcuts || !Array.isArray(settings.promptShortcuts)) {
      // 修复现有设置中的promptShortcuts属性
      const updatedSettings: UserSettings = {
        ...settings,
        promptShortcuts: []
      }
      await storage.set("userSettings", updatedSettings)
    }
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
chrome.runtime.onInstalled.addListener(async (details) => {
  await initializeSettings();
  initializeContextMenu();
  updateBadgeCount();
  
  // 注意：onboarding 模块中已有安装事件监听器处理引导页面打开逻辑
  // 无需重复添加
});

// 处理键盘快捷键
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command, tab) => {
    if (!tab?.id) return;
    
    switch (command) {
      case "open_side_panel":
        if (isSidePanelSupported()) {
          chrome.sidePanel.open({ tabId: tab.id });
        }
        break;
        
      case "clip_current_page":
        sendMessageToContentScript(tab.id, { action: "clipPage" });
        break;
        
      default:
        console.log(`${LOG_PREFIX} 未处理的命令:`, command);
    }
  });
}

// 处理消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 特权背景脚本消息处理
  if (message.action) {
    try {
      switch (message.action) {
        case "summarize":
          if (sender.tab?.id) {
            sendMessageToContentScript(sender.tab.id, { action: "summarizePage" });
          }
          break;
          
        case "extractPoints":
          if (sender.tab?.id) {
            sendMessageToContentScript(sender.tab.id, { 
              action: "processPage", 
              type: "highlights" 
            });
          }
          break;
          
        case "openAIChat":
          if (sender.tab?.id) {
            sendMessageToContentScript(sender.tab.id, { action: "openAIChat" });
          }
          break;
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 处理消息错误:`, error);
    }
  }
  
  // 确保异步响应
  sendResponse({ success: true });
  return true;
});

// 处理右键菜单点击，使用侧边栏显示结果
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  
  const action = String(info.menuItemId);
  const text = info.selectionText || "";
  
  // 只在特定操作时打开侧边栏
  if (action.startsWith("nexus-")) {
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
          // 失败时回退到传统方式
          handleMenuActionFallback(tab.id, action, text);
        });
    } else {
      // 使用传统方式
      handleMenuActionFallback(tab.id, action, text);
    }
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
            // 确保history属性存在
            if (!tabHistory.history) {
              tabHistory.history = [];
            }
            tabHistory.history.push({
              url: pageData.url,
              title: pageData.title,
              content: pageData.renderedHtml,
              timestamp: pageData.entryTime
            })
            await storage.set("urlQueueList", urlQueueListObj)
          }
        }

        if (timeQueueListObj?.timeQueueList) {
          const tabHistory = timeQueueListObj.timeQueueList.find(
            (data) => data.tabsessionId === tabId
          )
          
          if (tabHistory) {
            tabHistory.history.push({
              url: pageData.url,
              title: pageData.title,
              content: pageData.renderedHtml,
              timestamp: new Date().getTime()
            })
            await storage.set("timeQueueList", timeQueueListObj.timeQueueList)
          }
        }
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 执行脚本错误:`, error)
    }
  }
})

// 尝试同步离线数据
async function scheduleSyncOfflineData() {
  const syncInterval = 5 * 60 * 1000 // 5分钟
  
  // 定期检查并同步
  setInterval(async () => {
    try {
      const storage = await chrome.storage.local.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY)
      const pendingClippings = storage[OFFLINE_CONFIG.PENDING_ITEMS_KEY] || []
      
      if (pendingClippings.length > 0) {
        const result = await syncOfflineClippings(pendingClippings)
        
        if (result.success) {
          await chrome.storage.local.set({
            [OFFLINE_CONFIG.PENDING_ITEMS_KEY]: pendingClippings.filter(
              (item) => !result.syncedIds.includes(item.id)
            )
          })
          
          updateBadgeCount()
        }
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 同步离线数据失败:`, error)
    }
  }, syncInterval)
}

// 向内容脚本发送消息
const sendMessageToContentScript = (tabId: number, message: any) => {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      console.warn(`${LOG_PREFIX} 发送消息错误:`, chrome.runtime.lastError)
      
      // 尝试注入内容脚本
      chrome.scripting
        .executeScript({
          target: { tabId },
          files: ["content-scripts/content.js"]
        })
        .then(() => {
          // 重新尝试发送消息
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, message)
          }, 500)
        })
        .catch((err) => {
          console.error(`${LOG_PREFIX} 注入内容脚本失败:`, err)
        })
    }
  })
}

// 启动时初始化
(async function initialize() {
  await initializeSettings()
  updateBadgeCount()
  scheduleSyncOfflineData()
  
  console.log(`${LOG_PREFIX} 扩展后台已初始化`)
})(); 