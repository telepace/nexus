import { Storage } from "@plasmohq/storage"
import type { ClippedItem, UserProfile, AIResponse } from "./interfaces"

const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || "https://api.nexus-app.com"
const storage = new Storage({ area: "local" })

async function getAuthHeaders(): Promise<Headers> {
  const userProfile: UserProfile = await storage.get("userProfile")
  const headers = new Headers({
    "Content-Type": "application/json"
  })
  
  if (userProfile?.token) {
    headers.append("Authorization", `Bearer ${userProfile.token}`)
  }
  
  return headers
}

export async function saveClipping(clipping: Omit<ClippedItem, "id">): Promise<ClippedItem> {
  try {
    const headers = await getAuthHeaders()
    
    if (!navigator.onLine) {
      throw new Error("离线状态")
    }
    
    const response = await fetch(`${API_BASE_URL}/api/clippings`, {
      method: "POST",
      headers,
      body: JSON.stringify(clipping)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to save clipping: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error("Error saving clipping:", error)
    const tempId = `temp_${Date.now()}`
    const newClipping = { ...clipping, id: tempId }
    
    let pendingClippings: ClippedItem[] = await storage.get("pendingClippings") || []
    pendingClippings.push(newClipping)
    await storage.set("pendingClippings", pendingClippings)
    
    chrome.runtime.sendMessage({ action: "updateBadgeCount" })
    
    return newClipping
  }
}

export async function getRecentClippings(limit: number = 5): Promise<ClippedItem[]> {
  try {
    if (!navigator.onLine) {
      throw new Error("离线状态")
    }
    
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/clippings?limit=${limit}`, {
      headers
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch clippings: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error("Error fetching clippings:", error)
    const pendingClippings: ClippedItem[] = await storage.get("pendingClippings") || []
    return pendingClippings.slice(0, limit)
  }
}

export async function getAIInsight(
  type: "summary" | "explanation" | "translation" | "highlights",
  content: string,
  options?: Record<string, any>
): Promise<AIResponse> {
  try {
    if (!navigator.onLine) {
      throw new Error("离线状态")
    }
    
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/ai/${type}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content, ...options })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get AI insight: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`Error getting ${type}:`, error)
    return {
      type,
      content: `处理${type === "summary" ? "总结" : 
                type === "explanation" ? "解释" : 
                type === "translation" ? "翻译" : "要点提取"}失败。${
                navigator.onLine ? "请稍后重试。" : "您当前处于离线状态。"
              }`,
      sourceText: content,
      timestamp: Date.now()
    }
  }
}

export async function login(email: string, password: string): Promise<UserProfile> {
  try {
    if (!navigator.onLine) {
      throw new Error("离线状态，无法登录")
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    })
    
    if (!response.ok) {
      throw new Error(`登录失败: ${response.statusText}`)
    }
    
    const userData = await response.json()
    await storage.set("userProfile", userData)
    return userData
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

export async function logout(): Promise<void> {
  try {
    if (navigator.onLine) {
      const headers = await getAuthHeaders()
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers
      })
    }
  } catch (error) {
    console.error("Logout error:", error)
  } finally {
    await storage.remove("userProfile")
  }
}

export async function register(
  name: string, 
  email: string, 
  password: string
): Promise<UserProfile> {
  try {
    if (!navigator.onLine) {
      throw new Error("离线状态，无法注册")
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    })
    
    if (!response.ok) {
      throw new Error(`注册失败: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error("Registration error:", error)
    throw error
  }
} 