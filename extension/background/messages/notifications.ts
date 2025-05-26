// 处理通知显示逻辑
export const showNotification = (
  message: string, 
  type: "success" | "error" | "info" = "success"
) => {
  const iconMap = {
    success: "/assets/icon-check.png",
    error: "/assets/icon-error.png",
    info: "/assets/icon-info.png"
  }
  
  // 显示浏览器通知
  chrome.notifications.create({
    type: "basic",
    iconUrl: iconMap[type],
    title: type === "success" ? "操作成功" : type === "error" ? "操作失败" : "Nexus 信息",
    message,
    priority: type === "error" ? 2 : 1
  })
}

// 监听显示通知的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "show_notification") {
    showNotification(
      message.message, 
      message.type || "success"
    )
    return true
  }
})

// 监听更新徽章的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateBadgeCount") {
    // 导入更新徽章函数
    import("../index").then(({ updateBadgeCount }) => {
      updateBadgeCount()
    })
    return true
  }
})

// 添加默认导出
export default {
  showNotification
} 