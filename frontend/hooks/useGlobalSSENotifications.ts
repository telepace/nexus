import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useGlobalNotificationStore } from "@/lib/stores/useGlobalNotificationStore";
import { SSENotificationEvent } from "@/lib/types/notifications";

interface UseGlobalSSENotificationsOptions {
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number; // milliseconds
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

export function useGlobalSSENotifications(options: UseGlobalSSENotificationsOptions = {}) {
  const {
    enabled = true,
    autoReconnect = true,
    reconnectInterval = 3000,
    onConnectionChange,
    onError,
  } = options;

  const { user } = useAuth();
  const { handleSSEEvent, setSSEConnected, isSSEConnected } = useGlobalNotificationStore();
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(async () => {
    // If we are already establishing/maintaining a connection, or conditions are not met, skip
    // 1. isConnectingRef.current  – currently trying to connect
    // 2. isSSEConnected          – already connected, no need to reconnect
    // 3. !enabled / !user?.token – feature disabled or no auth token
    if (isConnectingRef.current || isSSEConnected || !enabled || !user?.token) {
      return;
    }

    // 如果已经有活跃连接，先断开
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
    }

    isConnectingRef.current = true;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      
      console.log('正在建立SSE连接...');
      
      const response = await fetch(`${apiUrl}/api/v1/content/events`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.token}`,
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE连接失败: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("SSE响应体为空");
      }

      // 连接成功
      setSSEConnected(true);
      onConnectionChange?.(true);
      reconnectAttemptsRef.current = 0; // 重置重连次数
      console.log('SSE连接已建立');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (!abortController.signal.aborted) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('SSE流结束');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataContent = line.slice(6); // 移除 "data: " 前缀

              if (dataContent.trim() === "" || dataContent.trim() === "[DONE]") {
                continue;
              }

              try {
                const eventData: SSENotificationEvent = JSON.parse(dataContent);
                
                // 处理事件
                handleSSEEvent(eventData);
                
                // 特殊处理连接确认事件
                if (eventData.type === 'connection-established') {
                  console.log('收到SSE连接确认');
                }
              } catch (parseError) {
                console.error("解析SSE消息失败:", parseError, "原始数据:", dataContent);
                onError?.(parseError as Error);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log('SSE连接被主动断开');
        return;
      }

      console.error("SSE连接错误:", error);
      
      // 更新连接状态
      setSSEConnected(false);
      onConnectionChange?.(false);
      onError?.(error as Error);

      // 尝试重连
      if (autoReconnect && enabled && user?.token && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1), 30000);
        
        console.log(`${delay/1000}秒后尝试重连SSE (第${reconnectAttemptsRef.current}次)`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (enabled && user?.token) {
            connect();
          }
        }, delay);
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error('SSE重连次数已达上限，停止重连');
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [enabled, user?.token, isSSEConnected, handleSSEEvent, onConnectionChange, onError, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    console.log('断开SSE连接');
    
    // 取消重连计时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 断开当前连接
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 重置状态
    isConnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
    setSSEConnected(false);
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  const forceReconnect = useCallback(() => {
    console.log('强制重连SSE');
    reconnectAttemptsRef.current = 0; // 重置重连次数
    disconnect();
    
    // 延迟一下再重连，确保断开完成
    setTimeout(() => {
      if (enabled && user?.token) {
        connect();
      }
    }, 1000);
  }, [enabled, user?.token, disconnect, connect]);

  // 监听认证状态和启用状态变化
  useEffect(() => {
    let isCurrentEffect = true;
    
    if (enabled && user?.token) {
      connect();
    } else {
      // 只有当前effect还有效时才执行disconnect
      if (isCurrentEffect) {
        // 取消重连计时器
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // 断开当前连接
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        // 重置状态
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        // Only update store if it is currently marked as connected
        if (isSSEConnected) {
          setSSEConnected(false);
          onConnectionChange?.(false);
        }
      }
    }

    // 清理函数
    return () => {
      isCurrentEffect = false;
      
      // 取消重连计时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // 断开当前连接
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // 重置状态
      isConnectingRef.current = false;
      reconnectAttemptsRef.current = 0;
    };
  }, [enabled, user?.token, isSSEConnected, connect, onConnectionChange]);

  // 页面可见性变化时重连
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && user?.token) {
        // 页面变为可见时，检查连接状态
        if (!isSSEConnected && !isConnectingRef.current) {
          console.log('页面重新可见，重连SSE');
          setTimeout(connect, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, user?.token, isSSEConnected, connect]);

  return {
    isConnected: isSSEConnected,
    isConnecting: isConnectingRef.current,
    reconnectAttempts: reconnectAttemptsRef.current,
    connect,
    disconnect,
    forceReconnect,
  };
} 