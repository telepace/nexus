import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import type { ClippedItem, UserProfile } from "./interfaces"

const storage = new Storage({ area: "local" })

/**
 * API服务层：处理API调用和请求
 */
export const apiService = {
  /**
   * 保存剪藏数据
   */
  async saveClipping(item: Omit<ClippedItem, "id">): Promise<ClippedItem> {
    try {
      // 发送到后台处理
      const result = await sendToBackground({
        name: "savedata",
        body: { item }
      })
      
      // 更新本地数据
      this.updateLocalClippings(result)
      
      return result
    } catch (error) {
      console.error("保存剪藏失败:", error)
      throw error
    }
  },
  
  /**
   * 获取最近剪藏
   */
  async getRecentClippings(limit: number = 5): Promise<ClippedItem[]> {
    try {
      // 先从本地存储获取
      const clippings = await storage.get("clippings") as ClippedItem[]
      
      if (clippings && Array.isArray(clippings)) {
        // 按时间排序并限制数量
        return clippings
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
      }
      
      // 如果本地没有，从后台获取
      const result = await sendToBackground({
        name: "savedata",
        body: { action: "getAll" }
      })
      
      // 更新本地数据
      if (result && Array.isArray(result)) {
        await storage.set("clippings", result)
        return result.slice(0, limit)
      }
      
      return []
    } catch (error) {
      console.error("获取剪藏失败:", error)
      return []
    }
  },
  
  /**
   * 更新本地存储的剪藏数据
   */
  async updateLocalClippings(newItem: ClippedItem): Promise<void> {
    try {
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
      console.error("更新本地剪藏失败:", error)
    }
  },
  
  /**
   * 用户认证相关
   */
  auth: {
    /**
     * 获取用户认证状态
     */
    async getAuthStatus(): Promise<{authenticated: boolean, profile: UserProfile | null}> {
      try {
        const result = await sendToBackground({
          name: "auth",
          body: { action: "getAuthStatus" }
        })
        
        return result
      } catch (error) {
        console.error("获取认证状态失败:", error)
        return { authenticated: false, profile: null }
      }
    },
    
    /**
     * 登录
     */
    async login(): Promise<boolean> {
      try {
        const result = await sendToBackground({
          name: "auth",
          body: { action: "initiateLogin" }
        })
        
        return result.success
      } catch (error) {
        console.error("登录失败:", error)
        return false
      }
    },
    
    /**
     * 登出
     */
    async logout(): Promise<boolean> {
      try {
        await sendToBackground({
          name: "auth",
          body: { action: "logout" }
        })
        
        // 清除本地用户状态
        await storage.remove("userProfile")
        
        return true
      } catch (error) {
        console.error("登出失败:", error)
        return false
      }
    },
    
    /**
     * 同步Web会话
     */
    async syncWebSession(): Promise<boolean> {
      try {
        const result = await sendToBackground({
          name: "auth",
          body: { action: "syncWebSession" }
        })
        
        return result.success
      } catch (error) {
        console.error("同步Web会话失败:", error)
        return false
      }
    }
  },
  
  /**
   * 与内容脚本通信
   */
  content: {
    /**
     * 安全地发送消息到内容脚本
     */
    async sendMessage(tabId: number, message: any): Promise<any> {
      return new Promise((resolve, reject) => {
        try {
          // 设置超时
          const timeoutId = setTimeout(() => {
            reject(new Error("消息发送超时"))
          }, 5000)
          
          chrome.tabs.sendMessage(tabId, message, (response) => {
            clearTimeout(timeoutId)
            
            if (chrome.runtime.lastError) {
              // 如果出错，可能是内容脚本未加载，尝试注入并重试
              return this.injectContentScript(tabId, message, resolve, reject)
            }
            
            if (!response) {
              return reject(new Error("内容脚本未响应"))
            }
            
            resolve(response)
          })
        } catch (error) {
          reject(error)
        }
      })
    },
    
    /**
     * 注入内容脚本并重试消息发送
     */
    async injectContentScript(tabId: number, message: any, resolve: Function, reject: Function): Promise<void> {
      try {
        // 尝试注入内容脚本
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content-scripts/content.js"]
        })
        
        // 等待脚本初始化
        setTimeout(() => {
          // 重新发送消息
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError || !response) {
              return reject(new Error("内容脚本注入后仍无响应"))
            }
            
            resolve(response)
          })
        }, 500)
      } catch (error) {
        reject(error)
      }
    },
    
    /**
     * 提取页面内容
     */
    async extractContent(tabId: number): Promise<{content: string, title: string, url: string}> {
      try {
        return await this.sendMessage(tabId, { action: "extract" })
      } catch (error) {
        console.error("提取内容失败:", error)
        throw error
      }
    },
    
    /**
     * 摘要当前页面
     */
    async summarize(tabId: number): Promise<{summary: string}> {
      try {
        return await this.sendMessage(tabId, { action: "summarize" })
      } catch (error) {
        console.error("摘要失败:", error)
        throw error
      }
    },
    
    /**
     * 提取页面要点
     */
    async extractPoints(tabId: number): Promise<{points: string[]}> {
      try {
        return await this.sendMessage(tabId, { action: "extractPoints" })
      } catch (error) {
        console.error("提取要点失败:", error)
        throw error
      }
    }
  },
  
  /**
   * 设置相关
   */
  settings: {
    /**
     * 获取用户设置
     */
    async getUserSettings() {
      try {
        const settings = await storage.get("userSettings")
        return settings
      } catch (error) {
        console.error("获取设置失败:", error)
        throw error
      }
    },
    
    /**
     * 保存用户设置
     */
    async saveUserSettings(settings: any) {
      try {
        await storage.set("userSettings", settings)
        
        // 通知后台更新设置
        sendToBackground({
          name: "savedata",
          body: { action: "updateSettings", settings }
        }).catch(error => console.error("通知后台更新设置失败:", error))
        
        return true
      } catch (error) {
        console.error("保存设置失败:", error)
        return false
      }
    }
  }
}

// 用于处理AI模型调用的服务
export const aiService = {
  /**
   * 获取可用模型
   */
  async getAvailableModels() {
    try {
      const result = await sendToBackground({
        name: "ai",
        body: { action: "getAvailableModels" }
      })
      
      return result
    } catch (error) {
      console.error("获取AI模型失败:", error)
      return []
    }
  },
  
  /**
   * 发送消息到AI模型
   */
  async chat(messages: any[], model?: string) {
    try {
      const result = await sendToBackground({
        name: "ai",
        body: { 
          action: "chat", 
          messages,
          model
        }
      })
      
      return result
    } catch (error) {
      console.error("AI聊天失败:", error)
      throw error
    }
  },
  
  /**
   * 生成页面摘要
   */
  async generateSummary(content: string, model?: string) {
    try {
      const result = await sendToBackground({
        name: "ai",
        body: { 
          action: "summarize", 
          content,
          model
        }
      })
      
      return result
    } catch (error) {
      console.error("生成摘要失败:", error)
      throw error
    }
  },
  
  /**
   * 提取页面要点
   */
  async extractKeyPoints(content: string, model?: string) {
    try {
      const result = await sendToBackground({
        name: "ai",
        body: { 
          action: "extractPoints", 
          content,
          model
        }
      })
      
      return result
    } catch (error) {
      console.error("提取要点失败:", error)
      throw error
    }
  }
} 