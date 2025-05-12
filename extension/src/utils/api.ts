import { Storage } from "./storage"
import { ApiError, LoginRequest, LoginResponse, RegisterRequest, User } from "./types"

// 存储令牌的键名
const TOKEN_STORAGE_KEY = "auth_token"

/**
 * Returns the base URL for API requests, using an environment variable if available.
 * Defaults to "http://localhost:8000/api" if no environment variable is set.
 */
const getBaseUrl = (): string => {
  // 浏览器扩展环境中不能直接使用 process.env
  // 我们可以改用 chrome.storage 或硬编码值
  
  // 默认使用 localhost
  return "http://localhost:8000/api"
}

/**
 * API 工具类，用于与 Nexus 后端通信
 */
export class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl = getBaseUrl()) {
    this.baseUrl = baseUrl
    this.loadToken()
  }

  /**
   * Loads the API key from storage and assigns it to the instance variable.
   */
  private async loadToken() {
    try {
      const token = await Storage.get<string>(TOKEN_STORAGE_KEY)
      this.token = token
    } catch (error) {
      console.error("加载令牌失败:", error)
    }
  }

  /**
   * Sets the API key to be used for authentication.
   */
  public setToken(token: string) {
    this.token = token
    // 同步保存到存储
    Storage.set(TOKEN_STORAGE_KEY, token)
  }

  /**
   * 清除令牌
   */
  public clearToken() {
    this.token = null
    Storage.remove(TOKEN_STORAGE_KEY)
  }

  /**
   * 获取令牌
   */
  public getToken(): string | null {
    return this.token
  }

  /**
   * 检查是否已认证
   */
  public isAuthenticated(): boolean {
    return !!this.token
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

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    return headers
  }

  /**
   * 处理 API 错误
   */
  private async handleResponseError(response: Response): Promise<never> {
    try {
      const errorData = await response.json() as ApiError
      throw new Error(errorData.detail || `API 请求失败: ${response.status}`)
    } catch (e) {
      if (e instanceof Error) {
        throw e
      }
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * 处理 API 错
   */
  private async handleResponseError(response: Response): Promise<never> {
    try {
      const errorData = await response.json() as ApiError
      throw new Error(errorData.detail || `API 请求失败: ${response.status}`)
    } catch (e) {
      if (e instanceof Error) {
        throw e
      }
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }
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
      await this.handleResponseError(response)
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
      await this.handleResponseError(response)
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
      await this.handleResponseError(response)
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
      await this.handleResponseError(response)
    }

    return response.json() as Promise<T>
  }

  /**
   * 用户登录
   */
  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    // 注意: API需要 FormData 格式而非 JSON
    const formData = new URLSearchParams()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)

    const response = await fetch(`${this.baseUrl}/login/access-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData
    })

    if (!response.ok) {
      await this.handleResponseError(response)
    }

    const data = await response.json() as LoginResponse
    
    // 保存令牌到客户端
    this.setToken(data.access_token)
    
    return data
  }

  /**
   * 用户注册
   */
  public async register(userData: RegisterRequest): Promise<User> {
    return this.post<User>('/users/signup', userData)
  }

  /**
   * 获取当前用户信息
   */
  public async getCurrentUser(): Promise<User> {
    return this.get<User>('/users/me')
  }

  /**
   * 用户登出
   */
  public logout(): void {
    this.clearToken()
  }
}

// 导出 API 客户端单例
export const api = new ApiClient() 