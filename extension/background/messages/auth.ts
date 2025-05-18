import { Storage } from "@plasmohq/storage"
import { API_CONFIG, AUTH_CONFIG, LOG_PREFIX } from "../../utils/config"
import { 
  syncWebSession, 
  checkAuthentication, 
  checkWebLoginStatus, 
  logout,
  initiateWebGoogleLogin
} from "../../utils/auth-handler"
import type { PlasmoMessaging } from "@plasmohq/messaging"

// 处理认证相关的事件
export const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { action, data } = req.body

  try {
    // 根据不同的认证操作分派处理
    switch (action) {
      case "checkAuth":
        // 检查认证状态
        const isAuthenticated = await checkAuthentication()
        res.send({ authenticated: isAuthenticated })
        break

      case "syncWebSession":
        // 同步Web会话
        const syncResult = await syncWebSession()
        res.send({ success: syncResult })
        break

      case "checkWebLogin":
        // 检查Web登录状态
        const webStatus = await checkWebLoginStatus()
        res.send(webStatus)
        break

      case "logout":
        // 登出操作
        await logout()
        res.send({ success: true })
        break

      case "initiateGoogleLogin":
        // 开始Google登录流程
        initiateWebGoogleLogin()
        res.send({ success: true })
        break
        
      case "getAuthStatus":
        // 获取完整的认证状态
        const storage = new Storage({ area: AUTH_CONFIG.STORAGE_AREA })
        const userProfile = await storage.get(AUTH_CONFIG.STORAGE_KEY)
        
        res.send({
          authenticated: !!userProfile?.token,
          profile: userProfile || null,
          // 移除敏感信息
          ...(userProfile ? { token: "存在" } : { token: null })
        })
        break

      default:
        throw new Error(`未知的认证操作: ${action}`)
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 认证操作处理错误:`, error)
    res.send({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    })
  }
} 