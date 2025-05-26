import { Storage } from "@plasmohq/storage"
import { API_CONFIG, AUTH_CONFIG, LOG_PREFIX } from "./config"
import type { UserProfile } from "./interfaces"

const storage = new Storage({ area: AUTH_CONFIG.STORAGE_AREA })

/**
 * 同步网页会话 - 检查用户是否已在Web端登录
 * 返回true表示成功同步了会话，false表示未找到有效会话
 */
export async function syncWebSession(): Promise<boolean> {
  try {
    // 检查用户是否已经登录
    const userProfile = await storage.get(AUTH_CONFIG.STORAGE_KEY) as UserProfile
    if (userProfile?.token && userProfile?.isAuthenticated) {
      console.log(`${LOG_PREFIX} 扩展已有登录信息，无需同步Web会话`)
      return true
    }

    console.log(`${LOG_PREFIX} 尝试同步Web会话状态`)

    // 从Web应用获取令牌
    const response = await fetch(`${API_CONFIG.API_URL}/api/v1/extension/auth/token`, {
      method: "POST",
      credentials: "include" // 关键：包含cookie以便后端能读取web登录状态
    })

    if (!response.ok) {
      console.log(`${LOG_PREFIX} 未找到有效的Web会话: ${response.status}`)
      return false
    }

    const data = await response.json()
    if (!data.access_token) {
      console.log(`${LOG_PREFIX} Web会话响应缺少令牌`)
      return false
    }

    // 获取用户信息
    try {
      const userInfoResponse = await fetch(`${API_CONFIG.API_URL}/api/v1/extension/auth/me`, {
        method: "GET",
        headers: {
          "Authorization": `${AUTH_CONFIG.TOKEN_PREFIX} ${data.access_token}`
        }
      });
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        
        // 保存完整的用户信息
        const profileData: UserProfile = { 
          token: data.access_token,
          isAuthenticated: true,
          syncedFromWeb: true,
          syncedAt: new Date().toISOString(),
          name: userInfo.name || userInfo.username || "用户",
          email: userInfo.email || "",
          avatar: userInfo.avatar_url || "",
          user_id: userInfo.id || ""
        };
        
        await storage.set(AUTH_CONFIG.STORAGE_KEY, profileData);
      } else {
        // 基本令牌信息
        const basicProfile: UserProfile = { 
          token: data.access_token,
          isAuthenticated: true,
          syncedFromWeb: true,
          syncedAt: new Date().toISOString()
        };
        
        await storage.set(AUTH_CONFIG.STORAGE_KEY, basicProfile);
      }
    } catch (error) {
      // 如果获取用户信息失败，仍保存基本令牌信息
      console.warn(`${LOG_PREFIX} 获取用户信息失败，仅保存令牌:`, error);
      const fallbackProfile: UserProfile = { 
        token: data.access_token,
        isAuthenticated: true,
        syncedFromWeb: true,
        syncedAt: new Date().toISOString()
      };
      
      await storage.set(AUTH_CONFIG.STORAGE_KEY, fallbackProfile);
    }

    console.log(`${LOG_PREFIX} 成功从Web同步会话`)
    return true
  } catch (error) {
    console.error(`${LOG_PREFIX} 同步Web会话失败:`, error)
    return false
  }
}

/**
 * 检查用户是否已登录，同时尝试从Web同步会话
 */
export async function checkAuthentication(): Promise<boolean> {
  try {
    // 首先检查本地存储中是否有令牌
    const userProfile = await storage.get(AUTH_CONFIG.STORAGE_KEY)
    if (userProfile?.token) {
      return true
    }

    // 无本地令牌，尝试从Web同步
    return await syncWebSession()
  } catch (error) {
    console.error(`${LOG_PREFIX} 检查认证状态失败:`, error)
    return false
  }
}

/**
 * 获取认证头部
 */
export async function getAuthHeaders(): Promise<Headers> {
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

/**
 * 登出
 */
export async function logout(): Promise<void> {
  try {
    // 尝试调用后端API登出
    const headers = await getAuthHeaders()
    try {
      await fetch(`${API_CONFIG.API_URL}/api/v1/logout`, {
        method: "POST",
        headers,
        credentials: "include" // 同时清除cookie
      })
    } catch (error) {
      console.warn(`${LOG_PREFIX} API登出请求失败:`, error)
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 登出错误:`, error)
  } finally {
    // 无论API调用成功与否，都清除本地存储
    await storage.remove(AUTH_CONFIG.STORAGE_KEY)
  }
}

/**
 * 检查Web登录状态
 */
export async function checkWebLoginStatus(): Promise<{authenticated: boolean, user?: any}> {
  try {
    const response = await fetch(`${API_CONFIG.API_URL}/api/v1/extension/auth/status`, {
      credentials: "include" // 包含cookie
    })
    
    if (!response.ok) {
      return { authenticated: false }
    }
    
    return await response.json()
  } catch (error) {
    console.error(`${LOG_PREFIX} 检查Web登录状态失败:`, error)
    return { authenticated: false }
  }
}

/**
 * 直接使用Web应用的谷歌登录
 */
export function initiateWebGoogleLogin(): void {
  // 构建回调URL，包括扩展ID
  const callbackUrl = chrome.runtime.getURL("pages/oauth-callback.html")
  
  // 打开新标签页进行登录
  chrome.tabs.create({
    url: `${API_CONFIG.API_URL}/api/v1/login/google?extension_callback=${encodeURIComponent(callbackUrl)}`
  })
}

/**
 * 处理OAuth回调
 * 从URL获取token并保存
 */
export async function handleOAuthCallback(token: string): Promise<boolean> {
  try {
    if (!token) {
      console.error(`${LOG_PREFIX} OAuth回调处理失败：未提供令牌`);
      return false;
    }
    
    // 保存令牌到本地存储
    await storage.set(AUTH_CONFIG.STORAGE_KEY, { 
      token,
      syncedAt: new Date().toISOString()
    });
    
    console.log(`${LOG_PREFIX} OAuth登录成功，已保存令牌`);
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} OAuth处理错误:`, error);
    return false;
  }
} 