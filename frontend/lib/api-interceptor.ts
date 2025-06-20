/**
 * API 请求拦截器
 * 统一处理认证、错误和token刷新
 */

import { TokenManager } from "./token-manager";

export interface RequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

// 当前正在进行的刷新Promise，防止并发刷新
let refreshPromise: Promise<boolean> | null = null;

/**
 * 带拦截器的 fetch 包装器
 */
export class ApiInterceptor {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒

  /**
   * 执行带拦截器的请求
   */
  static async request<T = unknown>(
    config: RequestConfig,
  ): Promise<ApiResponse<T>> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.MAX_RETRY_ATTEMPTS) {
      try {
        return await this.executeRequest<T>(config);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        attempt++;

        // 如果是认证错误且还有重试机会，尝试刷新token
        if (this.isAuthError(error) && attempt < this.MAX_RETRY_ATTEMPTS) {
          console.log(`[ApiInterceptor] 第${attempt}次认证失败，尝试刷新token`);

          const refreshed = await this.handleTokenRefresh();
          if (!refreshed) {
            // 刷新失败，跳转到登录页
            this.redirectToLogin();
            return { status: 401, error: "Authentication failed" };
          }

          // 延迟后重试
          if (attempt < this.MAX_RETRY_ATTEMPTS - 1) {
            await this.delay(this.RETRY_DELAY);
          }
        } else {
          break; // 非认证错误或已达到最大重试次数
        }
      }
    }

    return {
      status: 500,
      error:
        lastError?.message || "Request failed after maximum retry attempts",
    };
  }

  /**
   * 执行实际的请求
   */
  private static async executeRequest<T>(
    config: RequestConfig,
  ): Promise<ApiResponse<T>> {
    // 请求前拦截器 - 添加认证头
    const enhancedConfig = await this.requestInterceptor(config);

    // 执行请求
    const response = await fetch(enhancedConfig.url, {
      method: enhancedConfig.method || "GET",
      headers: enhancedConfig.headers,
      body: enhancedConfig.body
        ? JSON.stringify(enhancedConfig.body)
        : undefined,
      credentials: enhancedConfig.credentials || "include",
      signal: enhancedConfig.signal,
    });

    // 响应后拦截器 - 处理响应和错误
    return await this.responseInterceptor<T>(response);
  }

  /**
   * 请求拦截器 - 自动添加认证头和其他通用头信息
   */
  private static async requestInterceptor(
    config: RequestConfig,
  ): Promise<RequestConfig> {
    const headers = { ...config.headers };

    // 添加认证头
    const authHeaders = await TokenManager.getAuthHeaders();
    Object.assign(headers, authHeaders);

    // 添加通用头信息
    if (!headers["Content-Type"] && config.body) {
      headers["Content-Type"] = "application/json";
    }

    // 添加时区信息
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    headers["X-User-Timezone"] = userTimeZone;

    // 如果token即将过期，先尝试刷新
    const isExpiringSoon = await TokenManager.isTokenExpiringSoon();
    if (isExpiringSoon) {
      console.log("[ApiInterceptor] Token即将过期，尝试预刷新");
      await this.handleTokenRefresh();

      // 重新获取认证头（可能已更新）
      const newAuthHeaders = await TokenManager.getAuthHeaders();
      Object.assign(headers, newAuthHeaders);
    }

    return {
      ...config,
      headers,
    };
  }

  /**
   * 响应拦截器 - 处理响应和错误
   */
  private static async responseInterceptor<T>(
    response: Response,
  ): Promise<ApiResponse<T>> {
    const status = response.status;

    // 处理成功响应
    if (response.ok) {
      try {
        const data = await response.json();
        return { data: data as T, status };
      } catch {
        // 如果响应不是JSON，返回文本
        const text = await response.text();
        return { data: text as T, status };
      }
    }

    // 处理错误响应
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.detail ||
        errorData.message ||
        `HTTP ${status}: ${response.statusText}`;
    } catch {
      errorMessage = `HTTP ${status}: ${response.statusText}`;
    }

    // 特殊处理401错误
    if (status === 401) {
      console.error("[ApiInterceptor] 认证失败:", errorMessage);
      throw new AuthError(errorMessage);
    }

    return { status, error: errorMessage };
  }

  /**
   * 处理token刷新（防止并发）
   */
  private static async handleTokenRefresh(): Promise<boolean> {
    // 如果已有刷新在进行中，等待其完成
    if (refreshPromise) {
      return await refreshPromise;
    }

    // 开始新的刷新流程
    refreshPromise = TokenManager.refreshAccessToken();

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      refreshPromise = null;
    }
  }

  /**
   * 判断是否为认证错误
   */
  private static isAuthError(error: unknown): boolean {
    return (
      error instanceof AuthError ||
      (error instanceof Error && error.message.includes("401"))
    );
  }

  /**
   * 跳转到登录页
   */
  private static redirectToLogin(): void {
    // 清除token
    TokenManager.clearTokens();

    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = `/login${currentPath !== "/login" ? `?callbackUrl=${encodeURIComponent(currentPath)}` : ""}`;
      window.location.href = loginUrl;
    }
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 认证错误类
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * 便捷的API调用方法
 */
export const apiRequest = {
  get: <T = unknown>(url: string, config?: Partial<RequestConfig>) =>
    ApiInterceptor.request<T>({ url, method: "GET", ...config }),

  post: <T = unknown>(
    url: string,
    body?: unknown,
    config?: Partial<RequestConfig>,
  ) => ApiInterceptor.request<T>({ url, method: "POST", body, ...config }),

  put: <T = unknown>(
    url: string,
    body?: unknown,
    config?: Partial<RequestConfig>,
  ) => ApiInterceptor.request<T>({ url, method: "PUT", body, ...config }),

  patch: <T = unknown>(
    url: string,
    body?: unknown,
    config?: Partial<RequestConfig>,
  ) => ApiInterceptor.request<T>({ url, method: "PATCH", body, ...config }),

  delete: <T = unknown>(url: string, config?: Partial<RequestConfig>) =>
    ApiInterceptor.request<T>({ url, method: "DELETE", ...config }),
};

/**
 * 带完整URL的API调用方法
 */
export const createApiRequest = (baseUrl: string) => {
  const buildUrl = (endpoint: string): string => {
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const cleanEndpoint = endpoint.replace(/^\//, "");
    return `${cleanBaseUrl}/${cleanEndpoint}`;
  };

  return {
    get: <T = unknown>(endpoint: string, config?: Partial<RequestConfig>) =>
      apiRequest.get<T>(buildUrl(endpoint), config),

    post: <T = unknown>(
      endpoint: string,
      body?: unknown,
      config?: Partial<RequestConfig>,
    ) => apiRequest.post<T>(buildUrl(endpoint), body, config),

    put: <T = unknown>(
      endpoint: string,
      body?: unknown,
      config?: Partial<RequestConfig>,
    ) => apiRequest.put<T>(buildUrl(endpoint), body, config),

    patch: <T = unknown>(
      endpoint: string,
      body?: unknown,
      config?: Partial<RequestConfig>,
    ) => apiRequest.patch<T>(buildUrl(endpoint), body, config),

    delete: <T = unknown>(endpoint: string, config?: Partial<RequestConfig>) =>
      apiRequest.delete<T>(buildUrl(endpoint), config),
  };
};

// 默认的API客户端
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export const api = createApiRequest(apiUrl);
