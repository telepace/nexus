import { Storage } from "./storage"

/**
 * 获取 API 基础 URL
 * 优先级: 环境变量 > 存储设置 > 默认值
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
   * 从存储中加载 API 密钥
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
   * 设置 API 密钥
   */
  public setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * 设置基础 URL
   */
  public setBaseUrl(url: string) {
    this.baseUrl = url
  }

  /**
   * 构建请求头
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
   * 发送 GET 请求
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
   * 发送 POST 请求
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
   * 发送 PUT 请求
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
   * 发送 DELETE 请求
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