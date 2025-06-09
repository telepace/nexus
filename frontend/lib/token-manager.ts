/**
 * JWT Token 管理器
 * 统一处理所有 token 相关操作
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

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = "accessToken";
  private static readonly REFRESH_TOKEN_KEY = "refreshToken";
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5分钟

  /**
   * 设置 token 到 httpOnly cookie
   */
  static async setTokens(tokenInfo: TokenInfo): Promise<void> {
    try {
      // 在服务端使用 next/headers
      if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();

        cookieStore.set(this.ACCESS_TOKEN_KEY, tokenInfo.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: tokenInfo.expires_in || 60 * 60 * 24 * 7, // 7天
          path: "/",
          sameSite: "lax",
        });

        if (tokenInfo.refresh_token) {
          cookieStore.set(this.REFRESH_TOKEN_KEY, tokenInfo.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30, // 30天
            path: "/",
            sameSite: "lax",
          });
        }

        // 为浏览器扩展设置非httpOnly cookie
        cookieStore.set(
          `${this.ACCESS_TOKEN_KEY}_ext`,
          tokenInfo.access_token,
          {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: tokenInfo.expires_in || 60 * 60 * 24 * 7,
            path: "/",
            sameSite: "lax",
          },
        );
      } else {
        // 客户端直接设置 cookie（主要用于测试和扩展场景）
        const maxAge = tokenInfo.expires_in || 60 * 60 * 24 * 7;
        const cookieOptions = `path=/;max-age=${maxAge};SameSite=Lax${
          process.env.NODE_ENV === "production" ? ";Secure" : ""
        }`;

        document.cookie = `${this.ACCESS_TOKEN_KEY}_ext=${tokenInfo.access_token};${cookieOptions}`;

        console.log("[TokenManager] Token设置成功");
      }
    } catch (error) {
      console.error("[TokenManager] 设置token失败:", error);
      throw new Error("Failed to set tokens");
    }
  }

  /**
   * 获取 access token
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      if (typeof window === "undefined") {
        // 服务端
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        return cookieStore.get(this.ACCESS_TOKEN_KEY)?.value || null;
      } else {
        // 客户端 - 优先从 httpOnly cookie 获取，fallback 到扩展 cookie
        return (
          this.getCookieValue(this.ACCESS_TOKEN_KEY) ||
          this.getCookieValue(`${this.ACCESS_TOKEN_KEY}_ext`)
        );
      }
    } catch (error) {
      console.error("[TokenManager] 获取token失败:", error);
      return null;
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
      console.error("[TokenManager] 获取refresh token失败:", error);
      return null;
    }
  }

  /**
   * 清除所有 token
   */
  static async clearTokens(): Promise<void> {
    try {
      if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        cookieStore.delete(this.ACCESS_TOKEN_KEY);
        cookieStore.delete(this.REFRESH_TOKEN_KEY);
        cookieStore.delete(`${this.ACCESS_TOKEN_KEY}_ext`);
      } else {
        // 客户端清除 cookies
        const expiredCookieOptions = "path=/;max-age=0";
        document.cookie = `${this.ACCESS_TOKEN_KEY}=;${expiredCookieOptions}`;
        document.cookie = `${this.REFRESH_TOKEN_KEY}=;${expiredCookieOptions}`;
        document.cookie = `${this.ACCESS_TOKEN_KEY}_ext=;${expiredCookieOptions}`;
      }
      console.log("[TokenManager] Token已清除");
    } catch (error) {
      console.error("[TokenManager] 清除token失败:", error);
    }
  }

  /**
   * 解码 JWT token (不验证签名)
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
      console.error("[TokenManager] Token解码失败:", error);
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

      const expirationTime = decoded.exp * 1000; // 转换为毫秒
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      return timeUntilExpiry <= this.TOKEN_REFRESH_THRESHOLD;
    } catch (error) {
      console.error("[TokenManager] 检查token过期时间失败:", error);
      return true;
    }
  }

  /**
   * 检查 token 是否已过期
   */
  static async isTokenExpired(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) return true;

      const decoded = this.decodeToken(token);
      if (!decoded?.exp) return true;

      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();

      return currentTime >= expirationTime;
    } catch (error) {
      console.error("[TokenManager] 检查token是否过期失败:", error);
      return true;
    }
  }

  /**
   * 刷新 access token
   */
  static async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.log("[TokenManager] 没有refresh token，无法刷新");
        return false;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      // 调用刷新接口
      const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        console.error("[TokenManager] Token刷新失败:", response.status);
        return false;
      }

      const tokenInfo: TokenInfo = await response.json();
      await this.setTokens(tokenInfo);

      console.log("[TokenManager] Token刷新成功");
      return true;
    } catch (error) {
      console.error("[TokenManager] Token刷新失败:", error);
      return false;
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
}

// 导出便捷方法
export const getAuthToken = () => TokenManager.getAccessToken();
export const getAuthHeaders = () => TokenManager.getAuthHeaders();
export const clearAuthTokens = () => TokenManager.clearTokens();
export const isTokenExpired = () => TokenManager.isTokenExpired();
export const refreshToken = () => TokenManager.refreshAccessToken();
