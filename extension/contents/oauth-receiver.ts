import { Storage } from "@plasmohq/storage"
import type { UserProfile } from "~/utils/interfaces"
import { API_CONFIG } from "~/utils/config"

const ALLOWED_OAUTH_DOMAINS = [
  API_CONFIG.FRONTEND_URL.replace(/\/$/, ""),
  API_CONFIG.API_URL.replace(/\/$/, "")
]

const handleOAuthCallback = async () => {
  try {
    // 检查URL是否包含授权回调参数
    const url = new URL(window.location.href)
    // 只允许在配置的域名下处理
    if (!ALLOWED_OAUTH_DOMAINS.some(domain => url.origin === domain)) {
      return
    }
    const token = url.searchParams.get("token")
    const userId = url.searchParams.get("user_id")
    const expiresIn = url.searchParams.get("expires_in")
    
    if (token && userId) {
      const storage = new Storage({ area: "local" })
      
      // 计算过期时间
      const tokenExpiry = expiresIn 
        ? Date.now() + parseInt(expiresIn) * 1000
        : Date.now() + 30 * 24 * 60 * 60 * 1000 // 默认30天
      
      // 获取或创建用户资料
      let userProfile: UserProfile = await storage.get("userProfile") || {
        id: userId,
        name: "",
        email: "",
        isAuthenticated: true
      }
      
      // 更新用户资料
      userProfile = {
        ...userProfile,
        id: userId,
        token,
        tokenExpiry,
        isAuthenticated: true
      }
      
      // 保存到存储
      await storage.set("userProfile", userProfile)
      
      // 通知后台脚本授权成功
      chrome.runtime.sendMessage({ action: "auth_success", userId, token })
      
      // 关闭窗口或重定向到成功页面
      window.close()
    }
  } catch (error) {
    console.error("OAuth处理错误:", error)
  }
}

// 页面加载后执行处理
export {}

if (document.readyState === "complete") {
  handleOAuthCallback()
} else {
  window.addEventListener("load", handleOAuthCallback)
}

// 指定匹配规则（保留原有，实际处理时用变量判断）
export const config = {
  matches: ["<all_urls>"]
} 