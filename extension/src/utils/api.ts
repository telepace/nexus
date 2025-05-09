import { Storage } from "./storage"

/**
 * Returns the base URL for API requests, using an environment variable if available.
 * Defaults to "http://localhost:8000/api" if no environment variable is set.
 */
const getBaseUrl = (): string => {
  // 如果 Plasmo 提供了环境变量，优先使用环境变量中的 API URL
  if (process.env.API_URL) {
    return process.env.API_URL
  }
  
  // 默认使用 localhost
  return "http://localhost:8000/api"
}

/**
 * API 工具类，用于与 Nexus 后端通信
 */
export class ApiClient {
  private baseUrl: string
  private apiKey: string | null = null

  constructor(baseUrl = getBaseUrl()) {
    this.baseUrl = baseUrl
    this.loadApiKey()
  }

  /**
   * Loads the API key from storage and assigns it to the instance variable.
   */
  private async loadApiKey() {
    try {
      const settings = await Storage.get<{ apiKey: string }>("settings")
      this.apiKey = settings?.apiKey || null
    } catch (error) {
      console.error("加载 API 密钥失败:", error)
    }
  }

  /**
   * Sets the API key to be used for authentication.
   */
  public setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Sets the base URL for the service.
   */
  public setBaseUrl(url: string) {
    this.baseUrl = url
  }

  /**
   * Builds HTTP request headers with optional authorization header if API key is present.
   */
  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    }

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }

    return headers
  }

  /**
   * 发送 GET 请求并返回解析后的 JSON 数据。
   */
  public async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.buildHeaders()
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Sends a POST request to the specified endpoint with JSON data.
   */
  public async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * 发送 PUT 请求到指定端点，并返回解析后的 JSON 响应。
   */
  public async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: this.buildHeaders(),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Sends a DELETE request to the specified endpoint and returns the parsed JSON response.
   */
  public async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.buildHeaders()
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }
}

// 导出 API 客户端单例
export const api = new ApiClient() 