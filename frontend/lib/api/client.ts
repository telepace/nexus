import { getCookie } from "@/lib/auth";
import { getBrowserTimeZone } from "@/lib/date";

// 请求配置类型
interface RequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// API 客户端类
class APIClient {
  private baseURL: string;
  private timeout: number;
  private retries: number;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string, config: RequestConfig = {}) {
    this.baseURL = baseURL.replace(/\/$/, ""); // 移除末尾斜杠
    this.timeout = config.timeout || 15000; // 15秒超时
    this.retries = config.retries || 3;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.headers,
    };

    console.log("[INFO] 🌐 环境:", process.env.NODE_ENV);
    console.log("[INFO] 🌐 API Base URL:", this.baseURL);
    console.log("[SUCCESS] 🔌 API连接信息:");
    console.log("[API] 🔗 Base URL:", this.baseURL);
    console.log("[API] ⏱️ 超时设置:", this.timeout + "ms");
    console.log("[SUCCESS] ✅ API客户端已配置完成");
  }

  // 获取认证头
  private getAuthHeaders(): Record<string, string> {
    const token = getCookie("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // 获取时区头
  private getTimezoneHeaders(): Record<string, string> {
    const userTimeZone = getBrowserTimeZone();
    return { "X-User-Timezone": userTimeZone };
  }

  // 构建完整URL
  private buildURL(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint;
    return `${this.baseURL}/${cleanEndpoint}`;
  }

  // 通用请求方法
  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = this.buildURL(endpoint);
    const headers = {
      ...this.defaultHeaders,
      ...this.getAuthHeaders(),
      ...this.getTimezoneHeaders(),
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
    };

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // GET 请求
  async get<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    try {
      const url = new URL(this.buildURL(endpoint));
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      return this.request<T>(url.pathname + url.search);
    } catch (error) {
      // 如果URL构造失败，直接使用endpoint
      console.warn("URL构造失败，使用原始endpoint:", endpoint, error);
      const queryString = params 
        ? '?' + new URLSearchParams(
            Object.entries(params)
              .filter(([, value]) => value !== undefined && value !== null)
              .map(([key, value]) => [key, String(value)])
          ).toString()
        : '';
      return this.request<T>(endpoint + queryString);
    }
  }

  // POST 请求
  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT 请求
  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 请求
  async delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }
}

export const client = new APIClient(
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
);
