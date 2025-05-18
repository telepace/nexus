// 环境变量配置管理文件
// 可以通过.env文件定义的环境变量

// API终端配置
export const API_CONFIG = {
  // 后端API URL - 从环境变量获取或使用默认值
  API_URL: process.env.PLASMO_PUBLIC_API_URL || "https://api.nexus-app.com", 
  
  // 前端APP URL - 从环境变量获取或使用默认值
  FRONTEND_URL: process.env.PLASMO_PUBLIC_FRONTEND_URL || "https://app.nexus-app.com",
  
  // 请求超时时间(毫秒)
  TIMEOUT: Number(process.env.PLASMO_PUBLIC_API_TIMEOUT) || 10000,
  
  // 离线模式支持
  OFFLINE_SUPPORT: process.env.PLASMO_PUBLIC_OFFLINE_SUPPORT !== "false"
}

// 认证配置
export const AUTH_CONFIG = {
  // 存储认证信息的键名
  STORAGE_KEY: "userProfile",
  
  // 存储令牌的键名
  TOKEN_KEY: "token",
  
  // 令牌前缀
  TOKEN_PREFIX: "Bearer",
  
  // 存储区域
  STORAGE_AREA: "local"
}

// 离线存储配置
export const OFFLINE_CONFIG = {
  // 待处理项的存储键名
  PENDING_ITEMS_KEY: "pendingClippings",
  
  // 离线项标识符前缀
  TEMP_ID_PREFIX: "temp_"
}

// 其他配置项
export const GENERAL_CONFIG = {
  // 调试模式
  DEBUG_MODE: process.env.PLASMO_PUBLIC_DEBUG_MODE === "true"
}

// 日志前缀
export const LOG_PREFIX = "[Nexus]"

export function getFrontendUrl(path: string = ""): string {
  let base = API_CONFIG.FRONTEND_URL
  if (!base.endsWith("/")) base += "/"
  if (path.startsWith("/")) path = path.slice(1)
  return base + path
} 