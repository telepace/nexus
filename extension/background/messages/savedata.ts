import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { saveClipping } from "~/utils/api"
import type { ClippedItem } from "~/utils/interfaces"
import { LOG_PREFIX, OFFLINE_CONFIG } from "~/utils/config"

import {
  emptyArr,
  webhistoryToLangChainDocument
} from "~utils/commons"

// 声明全局变量以解决类型错误
declare global {
  var syncScheduled: boolean;
}

const clearMemory = async () => {
  try {
    const storage = new Storage({ area: "local" })

    let webHistory: any = await storage.get("webhistory")
    let urlQueue: any = await storage.get("urlQueueList")
    let timeQueue: any = await storage.get("timeQueueList")

    if (!webHistory.webhistory) {
      return
    }

    //Main Cleanup COde
    chrome.tabs.query({}, async (tabs) => {
      //Get Active Tabs Ids
      // console.log("Event Tabs",tabs)
      let actives = tabs.map((tab) => {
        if (tab.id) {
          return tab.id
        }
      })

      actives = actives.filter((item: any) => item)

      //Only retain which is still active
      const newHistory = webHistory.webhistory.map((element: any) => {
        //@ts-ignore
        if (actives.includes(element.tabsessionId)) {
          return element
        }
      })

      const newUrlQueue = urlQueue.urlQueueList.map((element: any) => {
        //@ts-ignore
        if (actives.includes(element.tabsessionId)) {
          return element
        }
      })

      const newTimeQueue = timeQueue.timeQueueList.map((element: any) => {
        //@ts-ignore
        if (actives.includes(element.tabsessionId)) {
          return element
        }
      })

      await storage.set("webhistory", {
        webhistory: newHistory.filter((item: any) => item)
      })
      await storage.set("urlQueueList", {
        urlQueueList: newUrlQueue.filter((item: any) => item)
      })
      await storage.set("timeQueueList", {
        timeQueueList: newTimeQueue.filter((item: any) => item)
      })
    })
  } catch (error) {
    console.log(error)
  }
}

/**
 * 保存剪藏数据
 */
const saveItemData = async (item: Omit<ClippedItem, "id">): Promise<ClippedItem> => {
  try {
    // 尝试在线保存
    const savedItem = await saveClipping(item)
    
    // 更新本地存储的剪藏列表
    await updateLocalClippingsList(savedItem)
    
    // 更新扩展徽章
    updateBadgeCount()
    
    return savedItem
  } catch (error) {
    console.error(`${LOG_PREFIX} 保存剪藏失败:`, error)
    
    // 离线保存到待同步队列
    const offlineItem = {
      ...item,
      id: `offline-${Date.now()}`,
      offline: true
    } as ClippedItem
    
    await addToOfflineQueue(offlineItem)
    
    return offlineItem
  }
}

/**
 * 添加到离线队列
 */
const addToOfflineQueue = async (item: ClippedItem): Promise<void> => {
  try {
    const storage = await chrome.storage.local.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY)
    const pendingClippings = storage[OFFLINE_CONFIG.PENDING_ITEMS_KEY] || []
    
    pendingClippings.push(item)
    
    await chrome.storage.local.set({ 
      [OFFLINE_CONFIG.PENDING_ITEMS_KEY]: pendingClippings 
    })
    
    // 更新徽章计数
    updateBadgeCount()
    
    // 更新本地剪藏列表
    await updateLocalClippingsList(item)
    
    // 触发离线数据同步尝试
    scheduleSyncOfflineData()
  } catch (error) {
    console.error(`${LOG_PREFIX} 添加到离线队列失败:`, error)
  }
}

/**
 * 更新本地剪藏列表
 */
const updateLocalClippingsList = async (newItem: ClippedItem): Promise<void> => {
  try {
    const storage = new Storage({ area: "local" })
    const clippings = await storage.get("clippings") as ClippedItem[]
    
    if (clippings && Array.isArray(clippings)) {
      // 检查是否已存在该剪藏
      const index = clippings.findIndex(item => item.id === newItem.id)
      
      if (index !== -1) {
        // 更新已有项
        clippings[index] = newItem
      } else {
        // 添加新项
        clippings.unshift(newItem)
      }
      
      await storage.set("clippings", clippings)
    } else {
      // 创建新的剪藏列表
      await storage.set("clippings", [newItem])
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 更新本地剪藏列表失败:`, error)
  }
}

/**
 * 获取所有剪藏
 */
const getAllItems = async (): Promise<ClippedItem[]> => {
  try {
    // 首先尝试从本地获取
    const storage = new Storage({ area: "local" })
    const localClippings = await storage.get("clippings") as ClippedItem[]
    
    if (localClippings && Array.isArray(localClippings) && localClippings.length > 0) {
      return localClippings
    }
    
    // 如果本地没有数据，则从API获取
    const allClippings = await getAllClippings()
    
    // 保存到本地
    if (allClippings && Array.isArray(allClippings)) {
      await storage.set("clippings", allClippings)
    }
    
    return allClippings || []
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取所有剪藏失败:`, error)
    
    // 返回空数组而不是抛出错误，防止UI崩溃
    return []
  }
}

/**
 * 更新扩展徽章计数
 */
const updateBadgeCount = async (): Promise<void> => {
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
    console.error(`${LOG_PREFIX} 更新徽章失败:`, error)
  }
}

/**
 * 尝试同步离线数据
 */
const scheduleSyncOfflineData = async (): Promise<void> => {
  // 使用服务工作器周期性尝试同步
  const syncInterval = 60 * 1000 // 60秒
  
  // 设置标志以避免重复调度
  if (self.syncScheduled) {
    return
  }
  
  self.syncScheduled = true
  
  setTimeout(async () => {
    try {
      // 获取待同步项
      const storage = await chrome.storage.local.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY)
      const pendingClippings = storage[OFFLINE_CONFIG.PENDING_ITEMS_KEY] || []
      
      if (pendingClippings.length === 0) {
        self.syncScheduled = false
        return
      }
      
      // 尝试同步
      const result = await syncOfflineClippings(pendingClippings)
      
      if (result.success) {
        // 更新本地存储
        await chrome.storage.local.set({ 
          [OFFLINE_CONFIG.PENDING_ITEMS_KEY]: pendingClippings.filter(item => !result.syncedIds.includes(item.id))
        })
        
        // 刷新徽章计数
        updateBadgeCount()
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 同步离线数据失败:`, error)
    } finally {
      self.syncScheduled = false
      
      // 如果仍有待同步项，重新调度
      const storage = await chrome.storage.local.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY)
      const pendingClippings = storage[OFFLINE_CONFIG.PENDING_ITEMS_KEY] || []
      
      if (pendingClippings.length > 0) {
        scheduleSyncOfflineData()
      }
    }
  }, syncInterval)
}

/**
 * 更新用户设置
 */
const updateUserSettings = async (settings: any): Promise<void> => {
  try {
    const storage = new Storage({ area: "local" })
    await storage.set("userSettings", settings)
    console.log(`${LOG_PREFIX} 用户设置已更新`)
  } catch (error) {
    console.error(`${LOG_PREFIX} 更新用户设置失败:`, error)
  }
}

// 实现获取所有剪藏接口
const getAllClippings = async (): Promise<ClippedItem[]> => {
  try {
    // 简单实现，实际项目中应该从API获取
    console.log(`${LOG_PREFIX} 调用getAllClippings`)
    // 这里应该是实际API调用
    return []
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取所有剪藏失败:`, error)
    return []
  }
}

// 实现离线数据同步
const syncOfflineClippings = async (pendingClippings: ClippedItem[]): Promise<{success: boolean, syncedIds: string[]}> => {
  try {
    console.log(`${LOG_PREFIX} 同步离线剪藏: ${pendingClippings.length}项`)
    // 实际项目中应该实现API调用来同步数据
    // 这里只是一个模拟实现
    const successIds: string[] = [];
    
    // 模拟同步：实际中应该调用服务器API
    for (const clipping of pendingClippings) {
      try {
        // 模拟同步成功：实际中应该发送到服务器
        console.log(`${LOG_PREFIX} 模拟同步剪藏: ${clipping.id}`)
        successIds.push(clipping.id);
      } catch (error) {
        console.error(`${LOG_PREFIX} 同步剪藏失败: ${clipping.id}`, error);
      }
    }
    
    return {
      success: true,
      syncedIds: successIds
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} 同步离线剪藏失败:`, error);
    return {
      success: false,
      syncedIds: []
    };
  }
}

/**
 * 数据保存消息处理程序
 */
export async function handler(req: PlasmoMessaging.Request<any>) {
  const { action } = req.body
  
  try {
    // 处理剪藏保存
    if (!action && req.body.item) {
      return await saveItemData(req.body.item)
    }
    
    // 处理其他数据操作
    switch (action) {
      case "getAll":
        return await getAllItems()
        
      case "updateSettings":
        await updateUserSettings(req.body.settings)
        return { success: true }
        
      case "syncOffline":
        await scheduleSyncOfflineData()
        return { success: true }
        
      default:
        throw new Error(`未知的数据操作: ${action}`)
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 数据操作失败:`, error)
    return {
      error: true,
      message: error.message || "数据操作失败"
    }
  }
}

export default handler 