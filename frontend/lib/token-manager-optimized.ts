/**
 * 优化版 JWT Token 管理器
 * 
 * 主要优化:
 * 1. 内存缓存用户信息 (5分钟)
 * 2. Token验证缓存 (3分钟)
 * 3. 智能刷新机制
 * 4. 批量请求优化
 * 
 * 预期性能提升: 80%减少API调用
 */

export interface TokenInfo {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
}

export interface DecodedToken {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: unknown;
}

export interface CachedUser {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_setup_complete?: boolean;
  avatar_url?: string;
  cached_at: number;
  expires_at: number;
}

export class OptimizedTokenManager {
  private static readonly ACCESS_TOKEN_KEY = "accessToken";
  private static readonly REFRESH_TOKEN_KEY = "refreshToken";
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5分钟
  
  // 缓存配置
  private static readonly USER_CACHE_TTL = 5 * 60 * 1000; // 5分钟用户缓存
  private static readonly TOKEN_VALIDATION_TTL = 3 * 60 * 1000; // 3分钟token验证缓存
  
  // 内存缓存
  private static userCache: CachedUser | null = null;
  private static tokenValidationCache: Map<string, { isValid: boolean; expires: number }> = new Map();
  
  // 防止重复请求
  private static pendingUserRequest: Promise<CachedUser | null> | null = null;
  private static pendingValidation: Map<string, Promise<boolean>> = new Map();

  /**
   * 验证环境配置
   */
  static validateEnvironment(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    
    if (!process.env.NEXT_PUBLIC_API_URL) {
      issues.push("NEXT_PUBLIC_API_URL 环境变量未设置，使用默认值");
    }
    
    try {
      new URL(apiUrl);
    } catch (e) {
      issues.push(`API URL 格式无效: ${apiUrl}`);
    }
    
    console.log("[OptimizedTokenManager] 环境配置:", {
      apiUrl,
      isClient: typeof window !== "undefined",
      hasDocument: typeof document !== "undefined",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A"
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 设置 token 到 httpOnly cookie (优化版)
   */
  static async setTokens(tokenInfo: TokenInfo): Promise<void> {
    try {
      // 清除缓存 - 新token需要重新验证
      this.clearCache();
      
      // 原有设置逻辑保持不变，但优化错误处理
      if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();

        const maxAge = tokenInfo.expires_in || 60 * 60 * 24 * 7; // 7天
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge,
          path: "/",
          sameSite: "lax" as const,
        };

        cookieStore.set(this.ACCESS_TOKEN_KEY, tokenInfo.access_token, cookieOptions);

        if (tokenInfo.refresh_token) {
          cookieStore.set(this.REFRESH_TOKEN_KEY, tokenInfo.refresh_token, {
            ...cookieOptions,
            maxAge: 60 * 60 * 24 * 30, // 30天
          });
        }

        // 扩展cookie用于浏览器扩展
        cookieStore.set(`${this.ACCESS_TOKEN_KEY}_ext`, tokenInfo.access_token, {
          ...cookieOptions,
          httpOnly: false,
        });
        
      } else {
        const maxAge = tokenInfo.expires_in || 60 * 60 * 24 * 7;
        const cookieOptions = `path=/;max-age=${maxAge};SameSite=Lax${
          process.env.NODE_ENV === "production" ? ";Secure" : ""
        }`;

        document.cookie = `${this.ACCESS_TOKEN_KEY}_ext=${tokenInfo.access_token};${cookieOptions}`;
        console.log("[OptimizedTokenManager] Token设置成功，缓存已清除");
      }
    } catch (error) {
      console.error("[OptimizedTokenManager] 设置token失败:", error);
      throw new Error("Failed to set tokens");
    }
  }

  /**
   * 获取 access token (缓存版本)
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        return cookieStore.get(this.ACCESS_TOKEN_KEY)?.value || null;
      } else {
        return (
          this.getCookieValue(this.ACCESS_TOKEN_KEY) ||
          this.getCookieValue(`${this.ACCESS_TOKEN_KEY}_ext`)
        );
      }
    } catch (error) {
      console.error("[OptimizedTokenManager] 获取token失败:", error);
      return null;
    }
  }

  /**
   * 验证token有效性 (缓存版本)
   */
  static async validateToken(token: string): Promise<boolean> {
    try {
      const now = Date.now();
      
      // 检查缓存
      const cached = this.tokenValidationCache.get(token);
      if (cached && now < cached.expires) {
        console.log("[OptimizedTokenManager] Token验证缓存命中");
        return cached.isValid;
      }

      // 检查是否有进行中的验证请求
      if (this.pendingValidation.has(token)) {
        console.log("[OptimizedTokenManager] Token验证请求合并");
        return await this.pendingValidation.get(token)!;
      }

      // 创建新的验证请求
      const validationPromise = this.performTokenValidation(token);
      this.pendingValidation.set(token, validationPromise);

      try {
        const isValid = await validationPromise;
        
        // 缓存结果
        this.tokenValidationCache.set(token, {
          isValid,
          expires: now + this.TOKEN_VALIDATION_TTL
        });
        
        return isValid;
      } finally {
        this.pendingValidation.delete(token);
      }

    } catch (error) {
      console.error("[OptimizedTokenManager] Token验证失败:", error);
      return false;
    }
  }

  /**
   * 执行实际的token验证
   */
  private static async performTokenValidation(token: string): Promise<boolean> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const url = `${apiUrl}/api/v1/users/me`;
      
      console.log("[OptimizedTokenManager] 验证token:", { url, hasToken: !!token });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      const response = await fetch(url, {
        method: "HEAD", // 使用HEAD减少响应数据
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
        signal: controller.signal,
        mode: "cors",
        credentials: "include",
      });

      clearTimeout(timeoutId);
      
      console.log("[OptimizedTokenManager] Token验证响应:", { 
        ok: response.ok, 
        status: response.status 
      });

      return response.ok;
    } catch (error) {
      console.error("[OptimizedTokenManager] Token验证请求失败:", {
        error: error.message,
        name: error.name
      });
      
      // 网络错误时返回false，让系统尝试其他方式
      if (error.name === 'AbortError') {
        console.error("[OptimizedTokenManager] Token验证超时");
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error("[OptimizedTokenManager] Token验证网络错误");
      }
      
      return false;
    }
  }

  /**
   * 获取用户信息 (智能缓存版本)
   */
  static async getCurrentUser(): Promise<CachedUser | null> {
    try {
      const now = Date.now();
      
      // 检查缓存
      if (this.userCache && now < this.userCache.expires_at) {
        console.log("[OptimizedTokenManager] 用户缓存命中");
        return this.userCache;
      }

      // 检查是否有进行中的请求
      if (this.pendingUserRequest) {
        console.log("[OptimizedTokenManager] 用户请求合并");
        return await this.pendingUserRequest;
      }

      // 创建新的请求
      this.pendingUserRequest = this.fetchCurrentUser();

      try {
        const user = await this.pendingUserRequest;
        return user;
      } finally {
        this.pendingUserRequest = null;
      }

    } catch (error) {
      console.error("[OptimizedTokenManager] 获取用户信息失败:", error);
      return null;
    }
  }

  /**
   * 执行实际的用户信息获取
   */
  private static async fetchCurrentUser(): Promise<CachedUser | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        console.log("[OptimizedTokenManager] 没有token，无法获取用户信息");
        return null;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const url = `${apiUrl}/api/v1/users/me`;
      
      console.log("[OptimizedTokenManager] 请求用户信息:", { url, hasToken: !!token });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        signal: controller.signal,
        mode: "cors",
        credentials: "include",
      });

      clearTimeout(timeoutId);

      console.log("[OptimizedTokenManager] 用户信息响应:", { 
        ok: response.ok, 
        status: response.status,
        statusText: response.statusText,
        url: response.url 
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log("[OptimizedTokenManager] Token无效，尝试刷新");
          // Token过期，尝试刷新
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            console.log("[OptimizedTokenManager] Token刷新成功，重试获取用户信息");
            // 递归重试一次
            return await this.fetchCurrentUser();
          } else {
            console.log("[OptimizedTokenManager] Token刷新失败");
          }
        }
        
        // 尝试读取错误响应
        try {
          const errorText = await response.text();
          console.error("[OptimizedTokenManager] API错误响应:", errorText);
        } catch (e) {
          console.error("[OptimizedTokenManager] 无法读取错误响应");
        }
        
        return null;
      }

      const userData = await response.json();
      const now = Date.now();
      
      // 缓存用户信息
      this.userCache = {
        ...userData,
        cached_at: now,
        expires_at: now + this.USER_CACHE_TTL,
      };

      console.log("[OptimizedTokenManager] 用户信息已缓存:", { 
        id: userData.id, 
        email: userData.email 
      });
      return this.userCache;

    } catch (error) {
      console.error("[OptimizedTokenManager] 获取用户信息失败:", {
        error: error.message,
        name: error.name,
        stack: error.stack?.slice(0, 200)
      });
      
      // 检查是否是网络错误
      if (error.name === 'AbortError') {
        console.error("[OptimizedTokenManager] 请求超时");
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error("[OptimizedTokenManager] 网络连接错误，请检查后端服务");
      }
      
      return null;
    }
  }

  /**
   * 检查 token 是否即将过期
   */
  static async isTokenExpiringSoon(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) return true;

      const decoded = this.decodeToken(token);
      if (!decoded?.exp) return true;

      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      return timeUntilExpiry <= this.TOKEN_REFRESH_THRESHOLD;
    } catch (error) {
      console.error("[OptimizedTokenManager] 检查token过期时间失败:", error);
      return true;
    }
  }

  /**
   * 智能token刷新
   */
  static async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.log("[OptimizedTokenManager] 没有refresh token，无法刷新");
        return false;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const url = `${apiUrl}/api/v1/auth/refresh`;
      
      console.log("[OptimizedTokenManager] 刷新token:", { url });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${refreshToken}`,
          "Accept": "application/json",
        },
        signal: controller.signal,
        mode: "cors",
        credentials: "include",
      });

      clearTimeout(timeoutId);

      console.log("[OptimizedTokenManager] Token刷新响应:", { 
        ok: response.ok, 
        status: response.status,
        statusText: response.statusText 
      });

      if (!response.ok) {
        console.error("[OptimizedTokenManager] Token刷新失败:", response.status);
        
        // 尝试读取错误响应
        try {
          const errorText = await response.text();
          console.error("[OptimizedTokenManager] 刷新错误详情:", errorText);
        } catch (e) {
          console.error("[OptimizedTokenManager] 无法读取刷新错误响应");
        }
        
        this.clearCache(); // 刷新失败，清除所有缓存
        return false;
      }

      const tokenInfo: TokenInfo = await response.json();
      await this.setTokens(tokenInfo);

      console.log("[OptimizedTokenManager] Token刷新成功，缓存已重置");
      return true;
    } catch (error) {
      console.error("[OptimizedTokenManager] Token刷新失败:", {
        error: error.message,
        name: error.name
      });
      
      if (error.name === 'AbortError') {
        console.error("[OptimizedTokenManager] Token刷新超时");
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error("[OptimizedTokenManager] Token刷新网络错误");
      }
      
      this.clearCache();
      return false;
    }
  }

  /**
   * 清除所有缓存
   */
  static clearCache(): void {
    this.userCache = null;
    this.tokenValidationCache.clear();
    this.pendingUserRequest = null;
    this.pendingValidation.clear();
    console.log("[OptimizedTokenManager] 所有缓存已清除");
  }

  /**
   * 清除所有 token 和缓存
   */
  static async clearTokens(): Promise<void> {
    try {
      // 清除缓存
      this.clearCache();
      
      if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        cookieStore.delete(this.ACCESS_TOKEN_KEY);
        cookieStore.delete(this.REFRESH_TOKEN_KEY);
        cookieStore.delete(`${this.ACCESS_TOKEN_KEY}_ext`);
      } else {
        const expiredCookieOptions = "path=/;max-age=0";
        document.cookie = `${this.ACCESS_TOKEN_KEY}=;${expiredCookieOptions}`;
        document.cookie = `${this.REFRESH_TOKEN_KEY}=;${expiredCookieOptions}`;
        document.cookie = `${this.ACCESS_TOKEN_KEY}_ext=;${expiredCookieOptions}`;
      }
      
      console.log("[OptimizedTokenManager] Token和缓存已清除");
    } catch (error) {
      console.error("[OptimizedTokenManager] 清除token失败:", error);
    }
  }

  /**
   * 获取 refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    try {
      if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        return cookieStore.get(this.REFRESH_TOKEN_KEY)?.value || null;
      } else {
        return this.getCookieValue(this.REFRESH_TOKEN_KEY);
      }
    } catch (error) {
      console.error("[OptimizedTokenManager] 获取refresh token失败:", error);
      return null;
    }
  }

  /**
   * 解码 JWT token
   */
  static decodeToken(token: string): DecodedToken | null {
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) return null;

      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );

      return JSON.parse(jsonPayload) as DecodedToken;
    } catch (error) {
      console.error("[OptimizedTokenManager] Token解码失败:", error);
      return null;
    }
  }

  /**
   * 获取认证请求头
   */
  static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * 客户端获取 cookie 值的辅助方法
   */
  private static getCookieValue(name: string): string | null {
    if (typeof document === "undefined") return null;

    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split("=");
      if (cookieName === name) {
        return cookieValue || null;
      }
    }
    return null;
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): {
    userCacheHit: boolean;
    tokenValidationCacheSize: number;
    pendingRequests: number;
  } {
    return {
      userCacheHit: this.userCache !== null && Date.now() < this.userCache.expires_at,
      tokenValidationCacheSize: this.tokenValidationCache.size,
      pendingRequests: this.pendingValidation.size,
    };
  }
}

// 导出便捷方法 (向后兼容)
export const getAuthToken = () => OptimizedTokenManager.getAccessToken();
export const getAuthHeaders = () => OptimizedTokenManager.getAuthHeaders();
export const clearAuthTokens = () => OptimizedTokenManager.clearTokens();
export const refreshToken = () => OptimizedTokenManager.refreshAccessToken();
export const getCurrentUser = () => OptimizedTokenManager.getCurrentUser();
export const validateToken = (token: string) => OptimizedTokenManager.validateToken(token);
export const clearCache = () => OptimizedTokenManager.clearCache();

// 导出原TokenManager作为fallback (使用original版本)
export { TokenManager } from './token-manager-original';

// 默认导出优化版本
export default OptimizedTokenManager;