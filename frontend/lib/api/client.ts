import { getCookie } from '../client-auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

interface ApiResponse<T = any> {
  data: T
  meta?: any
  error?: string | null
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api/v1${endpoint}`
    
    // Get auth token from cookie
    const token = getCookie('accessToken')
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.text()
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        
        try {
          const parsedError = JSON.parse(errorData)
          errorMessage = parsedError.detail || parsedError.error || errorMessage
        } catch {
          // If parsing fails, use the raw error text
          errorMessage = errorData || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Handle both wrapped and unwrapped responses
      // Some endpoints return data directly, others wrap it in ApiResponse format
      if (data && typeof data === 'object' && 'data' in data) {
        return data.data
      }
      
      return data
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const client = new ApiClient(API_BASE_URL) 