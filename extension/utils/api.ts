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
    // Store locally when offline or error
    const tempId = `temp_${Date.now()}`
    const newClipping = { ...clipping, id: tempId }
    
    let pendingClippings: ClippedItem[] = await storage.get("pendingClippings") || []
    pendingClippings.push(newClipping)
    await storage.set("pendingClippings", pendingClippings)
    
    return newClipping
  }
}

export async function getRecentClippings(limit: number = 5): Promise<ClippedItem[]> {
  try {
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
    return []
  }
}

export async function getAIInsight(
  type: "summary" | "explanation" | "translation" | "highlights",
  content: string,
  options?: Record<string, any>
): Promise<AIResponse> {
  try {
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
      content: `Error processing ${type}. Please try again later.`,
      sourceText: content,
      timestamp: Date.now()
    }
  }
}

export async function login(email: string, password: string): Promise<UserProfile> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    })
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`)
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
    const headers = await getAuthHeaders()
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers
    })
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
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    })
    
    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error("Registration error:", error)
    throw error
  }
} 