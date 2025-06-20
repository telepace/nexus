/**
 * Token 自动刷新服务
 * 在应用启动时初始化，定期检查和刷新token
 */

import { TokenManager } from "./token-manager";

export class TokenRefreshService {
  private static instance: TokenRefreshService | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private readonly CHECK_INTERVAL = 60 * 1000; // 1分钟检查一次
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5分钟前开始刷新

  private constructor() {
    // 私有构造函数，确保单例
  }

  /**
   * 获取服务实例（单例模式）
   */
  static getInstance(): TokenRefreshService {
    if (!this.instance) {
      this.instance = new TokenRefreshService();
    }
    return this.instance;
  }

  /**
   * 启动自动刷新服务
   */
  start(): void {
    if (typeof window === "undefined") {
      // 服务端不启动定时器
      return;
    }

    console.log("[TokenRefreshService] 启动token自动刷新服务");

    // 立即检查一次
    this.checkAndRefreshToken();

    // 设置定期检查
    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, this.CHECK_INTERVAL);

    // 监听页面可见性变化，页面重新激活时检查token
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this),
    );

    // 监听窗口焦点变化
    window.addEventListener("focus", this.handleWindowFocus.bind(this));
  }

  /**
   * 停止自动刷新服务
   */
  stop(): void {
    console.log("[TokenRefreshService] 停止token自动刷新服务");

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (typeof window !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange.bind(this),
      );
      window.removeEventListener("focus", this.handleWindowFocus.bind(this));
    }
  }

  /**
   * 手动触发token检查和刷新
   */
  async forceRefresh(): Promise<boolean> {
    return await this.checkAndRefreshToken();
  }

  /**
   * 检查token状态并在需要时刷新
   */
  private async checkAndRefreshToken(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log("[TokenRefreshService] 已有刷新任务进行中，跳过此次检查");
      return false;
    }

    try {
      this.isRefreshing = true;

      // 检查是否有token
      const token = await TokenManager.getAccessToken();
      if (!token) {
        console.log("[TokenRefreshService] 没有找到token，跳过刷新");
        return false;
      }

      // 检查token是否已过期
      const isExpired = await TokenManager.isTokenExpired();
      if (isExpired) {
        console.log("[TokenRefreshService] Token已过期，尝试刷新");
        return await this.performRefresh();
      }

      // 检查token是否即将过期
      const isExpiringSoon = await TokenManager.isTokenExpiringSoon();
      if (isExpiringSoon) {
        console.log("[TokenRefreshService] Token即将过期，执行预刷新");
        return await this.performRefresh();
      }

      console.log("[TokenRefreshService] Token状态正常，无需刷新");
      return true;
    } catch (error) {
      console.error("[TokenRefreshService] 检查token状态失败:", error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 执行token刷新
   */
  private async performRefresh(): Promise<boolean> {
    try {
      const success = await TokenManager.refreshAccessToken();

      if (success) {
        console.log("[TokenRefreshService] Token刷新成功");
        this.notifyTokenRefreshed();
        return true;
      } else {
        console.warn("[TokenRefreshService] Token刷新失败，可能需要重新登录");
        this.notifyTokenRefreshFailed();
        return false;
      }
    } catch (error) {
      console.error("[TokenRefreshService] Token刷新过程中出错:", error);
      this.notifyTokenRefreshFailed();
      return false;
    }
  }

  /**
   * 处理页面可见性变化
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === "visible") {
      console.log("[TokenRefreshService] 页面重新可见，检查token状态");
      this.checkAndRefreshToken();
    }
  }

  /**
   * 处理窗口焦点变化
   */
  private handleWindowFocus(): void {
    console.log("[TokenRefreshService] 窗口重新获得焦点，检查token状态");
    this.checkAndRefreshToken();
  }

  /**
   * 通知token刷新成功
   */
  private notifyTokenRefreshed(): void {
    if (typeof window !== "undefined") {
      // 发送自定义事件，其他组件可以监听
      const event = new CustomEvent("tokenRefreshed", {
        detail: { timestamp: Date.now() },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * 通知token刷新失败
   */
  private notifyTokenRefreshFailed(): void {
    if (typeof window !== "undefined") {
      // 发送自定义事件，其他组件可以监听
      const event = new CustomEvent("tokenRefreshFailed", {
        detail: { timestamp: Date.now() },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * 获取刷新状态
   */
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }
}

/**
 * Hook：在React组件中使用token刷新服务
 */
export function useTokenRefreshService() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const service = TokenRefreshService.getInstance();

  useEffect(() => {
    // 启动服务
    service.start();

    // 监听刷新事件
    const handleTokenRefreshed = (event: CustomEvent) => {
      setIsRefreshing(false);
      setLastRefreshTime(event.detail.timestamp);
    };

    const handleTokenRefreshFailed = () => {
      setIsRefreshing(false);
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "tokenRefreshed",
        handleTokenRefreshed as EventListener,
      );
      window.addEventListener("tokenRefreshFailed", handleTokenRefreshFailed);
    }

    return () => {
      // 清理事件监听器
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "tokenRefreshed",
          handleTokenRefreshed as EventListener,
        );
        window.removeEventListener(
          "tokenRefreshFailed",
          handleTokenRefreshFailed,
        );
      }
    };
  }, [service]);

  const forceRefresh = async () => {
    setIsRefreshing(true);
    const result = await service.forceRefresh();
    if (!result) {
      setIsRefreshing(false);
    }
    return result;
  };

  return {
    isRefreshing,
    lastRefreshTime,
    forceRefresh,
  };
}

// 添加React依赖
import { useEffect, useState } from "react";

/**
 * 应用启动时的初始化函数
 */
export function initializeTokenRefreshService(): void {
  if (typeof window !== "undefined") {
    const service = TokenRefreshService.getInstance();
    service.start();
  }
}

/**
 * 应用关闭时的清理函数
 */
export function cleanupTokenRefreshService(): void {
  if (typeof window !== "undefined") {
    const service = TokenRefreshService.getInstance();
    service.stop();
  }
}
