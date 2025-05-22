import { Storage } from "@plasmohq/storage"
import type { ClippedItem, UserProfile, AIResponse } from "./interfaces"
import { API_CONFIG, AUTH_CONFIG, OFFLINE_CONFIG, LOG_PREFIX } from "./config"

const API_BASE_URL = API_CONFIG.API_URL
const storage = new Storage({ area: AUTH_CONFIG.STORAGE_AREA })

// 获取用户配置信息
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const userProfile = await storage.get(AUTH_CONFIG.STORAGE_KEY)
    return userProfile || null
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取用户配置失败:`, error)
    return null
  }
}

// 检查用户是否已登录
export async function isAuthenticated(): Promise<boolean> {
  const profile = await getUserProfile()
  return !!(profile && profile.token)
}

async function getAuthHeaders(): Promise<Headers> {
  try {
    const userProfile = await storage.get(AUTH_CONFIG.STORAGE_KEY)
    const headers = new Headers({
      "Content-Type": "application/json"
    })
    
    if (userProfile?.token) {
      headers.append("Authorization", `${AUTH_CONFIG.TOKEN_PREFIX} ${userProfile.token}`)
    }
    
    return headers
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取授权头失败:`, error)
    return new Headers({ "Content-Type": "application/json" })
  }
}

async function safeFetch(url: string, options: RequestInit = {}) {
  try {
    if (!navigator.onLine) {
      throw new Error("离线状态")
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      if (response.status === 401) {
        // 处理未授权情况，可能需要刷新令牌或清除过期登录
        await handleUnauthorized()
        throw new Error("Unauthorized")
      }
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }
    
    return response
  } catch (error) {
    console.error(`${LOG_PREFIX} API请求失败 (${url}):`, error)
    throw error
  }
}

// 处理未授权响应
async function handleUnauthorized() {
  try {
    const userProfile = await storage.get(AUTH_CONFIG.STORAGE_KEY)
    
    // 如果有refresh_token，尝试刷新令牌
    if (userProfile?.refresh_token) {
      try {
        const refreshed = await refreshToken(userProfile.refresh_token)
        if (refreshed) return // 刷新成功，不需要清除配置
      } catch (e) {
        console.error(`${LOG_PREFIX} 令牌刷新失败:`, e)
      }
    }
    
    // 刷新失败或无刷新令牌，清除登录状态
    await storage.remove(AUTH_CONFIG.STORAGE_KEY)
  } catch (e) {
    console.error(`${LOG_PREFIX} 处理未授权状态失败:`, e)
    await storage.remove(AUTH_CONFIG.STORAGE_KEY)
  }
}

// 刷新令牌
async function refreshToken(refresh_token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token })
    })
    
    if (!response.ok) {
      throw new Error(`令牌刷新失败: ${response.status}`)
    }
    
    const userData = await response.json()
    await storage.set(AUTH_CONFIG.STORAGE_KEY, userData)
    return true
  } catch (error) {
    console.error(`${LOG_PREFIX} 刷新令牌失败:`, error)
    return false
  }
}

export async function saveClipping(clipping: Omit<ClippedItem, "id">): Promise<ClippedItem> {
  try {
    const headers = await getAuthHeaders()
    
    if (!navigator.onLine && API_CONFIG.OFFLINE_SUPPORT) {
      const tempId = `${OFFLINE_CONFIG.TEMP_ID_PREFIX}${Date.now()}`
      const tempClipping = { ...clipping, id: tempId } as ClippedItem
      await saveOfflineClipping(tempClipping)
      return tempClipping
    }
    
    try {
      const response = await safeFetch(`${API_BASE_URL}/api/clippings`, {
        method: "POST",
        headers,
        body: JSON.stringify(clipping)
      })
      
      return await response.json()
    } catch (error) {
      if (API_CONFIG.OFFLINE_SUPPORT) {
        const tempId = `${OFFLINE_CONFIG.TEMP_ID_PREFIX}${Date.now()}`
        const tempClipping = { ...clipping, id: tempId } as ClippedItem
        await saveOfflineClipping(tempClipping)
        return tempClipping
      }
      throw error
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 保存剪藏失败:`, error)
    
    if (API_CONFIG.OFFLINE_SUPPORT) {
      const tempId = `${OFFLINE_CONFIG.TEMP_ID_PREFIX}${Date.now()}`
      const tempClipping = { ...clipping, id: tempId } as ClippedItem
      await saveOfflineClipping(tempClipping)
      
      chrome.runtime.sendMessage({
        action: "updateBadgeCount"
      }).catch(() => {/* 忽略错误 */})
      
      return tempClipping
    }
    
    throw error
  }
}

async function saveOfflineClipping(clipping: ClippedItem) {
  try {
    const pendingClippings = await storage.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY) || []
    pendingClippings.push(clipping)
    await storage.set(OFFLINE_CONFIG.PENDING_ITEMS_KEY, pendingClippings)
    
    chrome.runtime.sendMessage({
      action: "updateBadgeCount"
    }).catch(() => {/* 忽略错误 */})
    
    return clipping
  } catch (error) {
    console.error(`${LOG_PREFIX} 保存离线剪藏失败:`, error)
    return clipping
  }
}

// 同步离线数据
export async function syncOfflineClippings(pendingItems?: ClippedItem[]): Promise<{success: boolean, syncedIds: string[]}> {
  if (!navigator.onLine) return { success: false, syncedIds: [] };
  
  try {
    const isLoggedIn = await isAuthenticated();
    if (!isLoggedIn) return { success: false, syncedIds: [] };

    // 使用传入的项或从存储获取
    const pendingClippings = pendingItems || await storage.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY) || [];
    if (pendingClippings.length === 0) return { success: true, syncedIds: [] };
    
    const headers = await getAuthHeaders();
    const syncedIds: string[] = [];
    
    const newPendingClippings = [...pendingClippings];
    
    for (let i = 0; i < pendingClippings.length; i++) {
      const clipping = pendingClippings[i];
      
      // 如果有离线标记或者ID以临时前缀开头
      const isOfflineItem = clipping.offline === true || 
                           (clipping.id && clipping.id.startsWith(OFFLINE_CONFIG.TEMP_ID_PREFIX));
      
      if (!isOfflineItem) continue;
      
      try {
        // 移除临时ID和离线标记，然后发送到服务器
        const { id, offline, ...clippingData } = clipping;
        
        const response = await safeFetch(`${API_BASE_URL}/api/clippings`, {
          method: "POST",
          headers,
          body: JSON.stringify(clippingData)
        });
        
        const syncedClipping = await response.json();
        
        // 替换临时数据
        newPendingClippings[i] = syncedClipping;
        syncedIds.push(id);
      } catch (error) {
        console.error(`${LOG_PREFIX} 同步离线项失败 (ID: ${clipping.id}):`, error);
      }
    }
    
    if (syncedIds.length > 0 && !pendingItems) {
      // 只有在未传入pendingItems参数时才更新存储
      // 如果传入了pendingItems，由调用者负责存储管理
      await storage.set(OFFLINE_CONFIG.PENDING_ITEMS_KEY, 
        newPendingClippings.filter(item => !syncedIds.includes(item.id))
      );
      
      chrome.runtime.sendMessage({
        action: "updateBadgeCount"
      }).catch(() => {/* 忽略错误 */});
    }
    
    return { success: true, syncedIds };
  } catch (error) {
    console.error(`${LOG_PREFIX} 同步离线剪藏失败:`, error);
    return { success: false, syncedIds: [] };
  }
}

export async function getRecentClippings(limit: number = 5): Promise<ClippedItem[]> {
  try {
    // 尝试同步离线数据
    if (navigator.onLine && API_CONFIG.OFFLINE_SUPPORT) {
      await syncOfflineClippings()
    }
    
    if (!navigator.onLine) {
      console.warn(`${LOG_PREFIX} 离线状态，返回本地剪藏`)
      const pendingClippings = await storage.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY) || []
      return pendingClippings.slice(0, limit)
    }
    
    const headers = await getAuthHeaders()
    
    try {
      const response = await safeFetch(`${API_BASE_URL}/api/clippings?limit=${limit}`, {
        headers
      })
      
      return await response.json()
    } catch (error) {
      console.warn(`${LOG_PREFIX} API获取失败，返回本地剪藏`)
      const pendingClippings = await storage.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY) || []
      return pendingClippings.slice(0, limit)
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取剪藏失败:`, error)
    try {
      const pendingClippings = await storage.get(OFFLINE_CONFIG.PENDING_ITEMS_KEY) || []
      return pendingClippings.slice(0, limit)
    } catch {
      return []
    }
  }
}

export async function getAIInsight(
  type: "summary" | "explanation" | "translation" | "highlights",
  content: string,
  options?: Record<string, any>
): Promise<AIResponse> {
  try {
    if (!navigator.onLine) {
      return createFallbackResponse(type, content, "您当前处于离线状态。")
    }
    
    const headers = await getAuthHeaders()
    
    try {
      const response = await safeFetch(`${API_BASE_URL}/api/ai/${type}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content, ...options })
      })
      
      return await response.json()
    } catch (error) {
      return createFallbackResponse(type, content)
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取 ${type} 失败:`, error)
    return createFallbackResponse(type, content)
  }
}

function createFallbackResponse(
  type: "summary" | "explanation" | "translation" | "highlights",
  sourceText: string,
  errorMessage?: string
): AIResponse {
  const typeMap = {
    summary: "总结",
    explanation: "解释",
    translation: "翻译",
    highlights: "要点提取"
  }
  
  return {
    type,
    content: `处理${typeMap[type]}失败。${errorMessage || "请稍后重试。"}`,
    sourceText,
    timestamp: Date.now()
  }
}

// 增强登录功能，支持重定向URL
export async function login(email: string, password: string, redirectAfterLogin?: boolean): Promise<UserProfile> {
  try {
    if (!navigator.onLine) {
      throw new Error("离线状态，无法登录")
    }
    
    const response = await safeFetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    })
    
    const userData = await response.json()
    await storage.set(AUTH_CONFIG.STORAGE_KEY, userData)
    
    // 如果设置了登录后重定向，并且前端URL存在
    if (redirectAfterLogin && API_CONFIG.FRONTEND_URL) {
      chrome.tabs.create({ url: `${API_CONFIG.FRONTEND_URL}/dashboard` })
    }
    
    return userData
  } catch (error) {
    console.error(`${LOG_PREFIX} 登录失败:`, error)
    throw error
  }
}

// 第三方登录（OAuth）重定向
export function redirectToOAuthLogin(provider: "google" | "github" | "microsoft"): void {
  const callbackUrl = chrome.runtime.getURL("oauth-callback.html")
  const url = `${API_BASE_URL}/api/auth/${provider}?callback=${encodeURIComponent(callbackUrl)}`
  chrome.tabs.create({ url })
}

// 处理OAuth回调
export async function handleOAuthCallback(code: string, provider: string): Promise<UserProfile> {
  try {
    const response = await safeFetch(`${API_BASE_URL}/api/auth/${provider}/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ code })
    })
    
    const userData = await response.json()
    await storage.set(AUTH_CONFIG.STORAGE_KEY, userData)
    return userData
  } catch (error) {
    console.error(`${LOG_PREFIX} OAuth回调处理失败:`, error)
    throw error
  }
}

export async function logout(): Promise<void> {
  try {
    if (navigator.onLine) {
      const headers = await getAuthHeaders()
      
      try {
        await safeFetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers
        })
      } catch (error) {
        console.warn(`${LOG_PREFIX} API登出请求失败:`, error)
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 登出错误:`, error)
  } finally {
    // 清除用户资料，同时通知其他组件用户已登出
    await storage.remove(AUTH_CONFIG.STORAGE_KEY)
    
    // 发送消息通知所有组件用户状态已更改
    try {
      chrome.runtime.sendMessage({
        action: "updateUserStatus",
        data: { isAuthenticated: false }
      }).catch(() => {/* 忽略错误 */})
    } catch (error) {
      // 忽略错误
    }
  }
}

export async function register(
  name: string, 
  email: string, 
  password: string,
  redirectAfterRegister?: boolean
): Promise<UserProfile> {
  try {
    if (!navigator.onLine) {
      throw new Error("离线状态，无法注册")
    }
    
    const response = await safeFetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    })
    
    const userData = await response.json()
    await storage.set(AUTH_CONFIG.STORAGE_KEY, userData)
    
    // 如果设置了注册后重定向，并且前端URL存在
    if (redirectAfterRegister && API_CONFIG.FRONTEND_URL) {
      chrome.tabs.create({ url: `${API_CONFIG.FRONTEND_URL}/dashboard` })
    }
    
    return userData
  } catch (error) {
    console.error(`${LOG_PREFIX} 注册失败:`, error)
    throw error
  }
} 