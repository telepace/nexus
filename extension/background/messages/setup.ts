import type { PlasmoMessaging } from "@plasmohq/messaging"

/**
 * 处理来自网页的设置相关消息
 * - ping: 用于检测扩展是否已安装
 * - openSidebar: 请求打开浏览器侧边栏
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { action } = req.body
  
  try {
    // 处理ping消息，仅返回扩展已安装的确认
    if (action === "ping") {
      res.send({
        success: true,
        message: "Nexus extension is installed"
      })
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