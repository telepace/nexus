"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AvatarFullConfig } from "react-nice-avatar";

// Types for user data
export interface User {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  avatar_url?: string;
  anime_avatar_config?: AvatarFullConfig;
  token?: string;
  is_setup_complete?: boolean;
}

// Type for auth context
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  updateUser: (userData: Partial<User>) => Promise<void>;
  login: (token: string) => void;
  logout: () => void;
  setCustomToken: (token: string) => void;
  fetchUser: () => Promise<void>;
}

// 避免使用 React 的 createContext，直接返回一个对象
// 此简化版本仅用于解决构建问题
export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getCookie("accessToken");

      console.log("[Auth] 尝试获取accessToken:", token ? "存在" : "不存在");

      if (!token) {
        console.log("[Auth] No access token found");
        setIsLoading(false);
        return;
      }

      // 添加调试信息，解析JWT令牌（不验证签名）
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join(""),
        );

        console.log("[Auth] JWT Payload:", JSON.parse(jsonPayload));
      } catch (e) {
        console.error("[Auth] Failed to decode JWT:", e);
      }

      // In a real implementation, you would fetch from your API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      console.log(`[Auth] Fetching user data from ${apiUrl}/api/v1/users/me`);

      const response = await fetch(`${apiUrl}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include", // 包含cookies
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Auth] API Error:", response.status, errorText);
        throw new Error(
          `Failed to fetch user data: ${response.status} ${errorText}`,
        );
      }

      const userData = await response.json();
      console.log("[Auth] User data fetched successfully:", userData);
      setUser({
        ...userData,
        token: token, // 保存token到用户对象中
      });
    } catch (err) {
      console.error("[Auth] Error in fetchUser:", err);
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const token = getCookie("accessToken");
      if (!token) {
        throw new Error("No access token found");
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include", // 包含cookies
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update user data: ${response.status} ${errorText}`,
        );
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (err) {
      console.error("[Auth] Error in updateUser:", err);
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred"),
      );
      throw err;
    }
  };

  const login = (token: string) => {
    try {
      console.log("[Auth] Setting access token in cookie");

      // 确保token有效
      if (!token || token.trim() === "") {
        console.error("[Auth] Invalid token provided");
        return;
      }

      // 设置cookie，支持 localhost 和 127.0.0.1
      const maxAge = 60 * 60 * 24 * 7; // 7天
      const cookieOptions = `path=/;max-age=${maxAge};SameSite=Lax`;
      
      // 为当前域名设置 cookie
      document.cookie = `accessToken=${token};${cookieOptions}`;
      document.cookie = `accessToken_ext=${token};${cookieOptions}`;

      // 验证cookie是否设置成功
      const savedToken = getCookie("accessToken");
      console.log(
        "[Auth] Token saved in cookie:",
        savedToken ? "成功" : "失败",
      );

      // 打印所有的cookie以便调试
      console.log("[Auth] Current cookies:", document.cookie);
      console.log("[Auth] Current domain:", window.location.hostname);

      // 如果已有用户数据，将token添加到用户对象
      if (user) {
        setUser({
          ...user,
          token: token,
        });
      }

      // Fetch user data after login
      fetchUser();
    } catch (error) {
      console.error("[Auth] Error setting token in cookie:", error);
    }
  };

  // 添加设置自定义token的方法，用于测试
  const setCustomToken = (token: string) => {
    try {
      console.log(
        "[Auth] Setting custom token for testing:",
        token.substring(0, 15) + "...",
      );

      if (!token || token.trim() === "") {
        console.error("[Auth] Invalid custom token provided");
        return;
      }

      // 设置cookie，支持 localhost 和 127.0.0.1
      const maxAge = 60 * 60 * 24 * 7; // 7天
      const cookieOptions = `path=/;max-age=${maxAge};SameSite=Lax`;
      
      // 为当前域名设置 cookie
      document.cookie = `accessToken=${token};${cookieOptions}`;
      document.cookie = `accessToken_ext=${token};${cookieOptions}`;

      // 验证设置成功
      const savedToken = getCookie("accessToken");
      console.log("[Auth] Custom token saved:", savedToken ? "成功" : "失败");

      // 尝试获取用户信息
      fetchUser();
    } catch (error) {
      console.error("[Auth] Error setting custom token:", error);
    }
  };

  const logout = () => {
    // Clear the token
    document.cookie = "accessToken=;path=/;max-age=0";
    console.log("[Auth] Access token cleared");
    // Reset user
    setUser(null);
    // Redirect to login page
    router.push("/login");
  };

  useEffect(() => {
    console.log("[Auth] Auth hook mounted, checking for token");
    const token = getCookie("accessToken");
    if (token) {
      console.log("[Auth] Token found, fetching user");
      fetchUser();
    } else {
      console.log("[Auth] No token found");
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isLoading,
    error,
    updateUser,
    login,
    logout,
    setCustomToken,
    fetchUser,
  };
}

// Helper to get cookie value on client side
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    console.log("[Auth] getCookie: document is undefined (server side)");
    return undefined;
  }

  console.log("[Auth] getCookie: 搜索cookie:", name);
  console.log("[Auth] getCookie: 所有cookie:", document.cookie);

  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + "=")) {
      const value = cookie.substring(name.length + 1);
      console.log(
        `[Auth] getCookie: 找到 ${name} = ${value.substring(0, 10)}...`,
      );
      return value;
    }
  }

  console.log(`[Auth] getCookie: ${name} 未找到`);
  return undefined;
}
