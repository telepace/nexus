import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { AUTH_CONFIG, LOG_PREFIX } from "../../utils/config"
import { handleOAuthCallback } from "../../utils/auth-handler" 

/**
 * 处理来自网页的设置相关消息
 * - ping: 用于检测扩展是否已安装
 * - openSidebar: 请求打开浏览器侧边栏
 * - connectPlugin: 建立插件与Web端的连接
 * - saveToken: 保存从Web端接收的认证Token
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { action, data } = req.body
  
  try {
    // 处理ping消息，仅返回扩展已安装的确认
    if (action === "ping") {
      // 检查是否有存储的plugin_id，有则返回
      const pluginId = await chrome.storage.local.get("plugin_id")
      
      res.send({
        success: true,
        message: "Nexus extension is installed",
        pluginId: pluginId?.plugin_id || null
      })
      return
    }
    
    // 处理保存Token的请求（来自setup页面）
    if (action === "saveToken") {
      if (!data || !data.token) {
        res.send({
          success: false,
          message: "Missing token in request"
        })
        return
      }
      
      try {
        // 验证plugin_id是否匹配（防止跨站点请求伪造）
        const storedPluginId = (await chrome.storage.local.get("plugin_id")).plugin_id
        if (data.pluginId && storedPluginId && data.pluginId !== storedPluginId) {
          console.warn(`${LOG_PREFIX} Plugin ID不匹配，可能存在安全风险`)
          res.send({
            success: false,
            message: "Invalid plugin ID"
          })
          return
        }
        
        // 调用auth-handler的方法保存token
        const saveResult = await handleOAuthCallback(data.token)
        
        if (saveResult) {
          console.log(`${LOG_PREFIX} 从Setup页面成功保存Token`)
          res.send({
            success: true,
            message: "Token saved successfully"
          })
        } else {
          console.error(`${LOG_PREFIX} 保存Token失败`)
          res.send({
            success: false,
            message: "Failed to save token"
          })
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} 处理Token保存请求时出错:`, error)
        res.send({
          success: false,
          message: "Error processing token",
          error: String(error)
        })
      }
      return
    }
    
    // 处理打开侧边栏的请求
    if (action === "openSidebar") {
      const isSidePanelSupported = typeof chrome !== 'undefined' && 
                                  typeof chrome.sidePanel !== 'undefined'
      
      if (isSidePanelSupported) {
        // 获取当前活动标签页
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        
        if (activeTab?.id) {
          // 尝试打开侧边栏
          await chrome.sidePanel.open({ tabId: activeTab.id })
          
          // 可选：设置侧边栏初始页面或内容
          // 例如：chrome.runtime.sendMessage({ action: "initSidebar", data: { ... } })
          
          res.send({
            success: true,
            message: "Sidebar opened successfully"
          })
          return
        }
      }
      
      // 如果不支持侧边栏或没有活动标签页
      res.send({
        success: false,
        message: "Sidebar could not be opened",
        error: isSidePanelSupported ? "No active tab found" : "SidePanel API not supported"
      })
      return
    }
    
    // 默认响应
    res.send({
      success: false,
      message: "Unknown action"
    })
  } catch (error) {
    console.error("设置消息处理错误:", error)
    res.send({
      success: false,
      message: "Error processing setup message",
      error: String(error)
    })
  }
}

export { handler } 