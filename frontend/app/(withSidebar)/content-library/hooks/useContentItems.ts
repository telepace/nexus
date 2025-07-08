"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, getCookie } from "@/lib/client-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { contentCache } from "@/lib/services/content-cache";
import { useContentEvents, ContentEvent } from "@/hooks/useContentEvents";
import { eventBus } from "@/lib/event-bus";
import type { ContentItemPublic } from "../types";

interface PrefetchStats {
  total: number;
  cached: number;
  inProgress: boolean;
}

export const useContentItems = () => {
  const [items, setItems] = useState<ContentItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefetchStats, setPrefetchStats] = useState<PrefetchStats>({
    total: 0,
    cached: 0,
    inProgress: false,
  });

  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // 刷新内容列表的方法
  const refreshItems = useCallback(async () => {
    if (!user) return;

    try {
      const token = user?.token || getCookie("accessToken");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/api/v1/content/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setItems(data);
      contentCache.setContentList(data);
    } catch (e: unknown) {
      console.error("刷新内容列表失败:", e);
      // 静默失败，不显示错误信息
    }
  }, [user]);

  // 本地 bus 监听新内容创建
  useEffect(() => {
    const handler = (item: ContentItemPublic) => {
      setItems((prev) =>
        prev.some((i) => i.id === item.id) ? prev : [item, ...prev],
      );
      contentCache.clearContentList();
      // 移除重复的toast，统一使用SSE通知
      // toast.success(`新内容已添加: ${item.title || "未知内容"}`);
    };
    eventBus.on("contentCreated", handler);
    return () => eventBus.off("contentCreated", handler);
  }, []);

  /** 单个内容预加载 */
  const prefetchContent = useCallback(
    async (item: ContentItemPublic) => {
      if (contentCache.has(`content-detail-${item.id}`)) return;

      try {
        const token = user?.token || getCookie("accessToken");
        if (!token) return;
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        const [detailRes, mdRes] = await Promise.allSettled([
          fetch(`${apiUrl}/api/v1/content/${item.id}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
          fetch(`${apiUrl}/api/v1/content/${item.id}/markdown`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
        ]);

        if (detailRes.status === "fulfilled" && detailRes.value.ok) {
          contentCache.setContentDetail(item.id, await detailRes.value.json());
        }
        if (mdRes.status === "fulfilled" && mdRes.value.ok) {
          const data = await mdRes.value.json();
          contentCache.setMarkdownContent(item.id, data.markdown_content);
        }
      } catch (err) {
        console.debug("Prefetch failed:", err);
      }
    },
    [user],
  );

  /** 批量预加载 */
  const batchPrefetchContent = useCallback(
    async (list: ContentItemPublic[]) => {
      const token = user?.token || getCookie("accessToken");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const toPrefetch = list
        .filter((i) => i.processing_status === "completed")
        .slice(0, 15);
      setPrefetchStats({
        total: toPrefetch.length,
        cached: 0,
        inProgress: true,
      });

      const tasks = toPrefetch.map(async (i) => {
        if (contentCache.has(`content-detail-${i.id}`)) {
          setPrefetchStats((p) => ({ ...p, cached: p.cached + 1 }));
          return;
        }
        try {
          const [detailRes, mdRes] = await Promise.allSettled([
            fetch(`${apiUrl}/api/v1/content/${i.id}`, {
              headers: { Authorization: `Bearer ${token}` },
              credentials: "include",
            }),
            fetch(`${apiUrl}/api/v1/content/${i.id}/markdown`, {
              headers: { Authorization: `Bearer ${token}` },
              credentials: "include",
            }),
          ]);
          if (detailRes.status === "fulfilled" && detailRes.value.ok) {
            contentCache.setContentDetail(i.id, await detailRes.value.json());
          }
          if (mdRes.status === "fulfilled" && mdRes.value.ok) {
            const data = await mdRes.value.json();
            contentCache.setMarkdownContent(i.id, data.markdown_content);
          }
          setPrefetchStats((p) => ({ ...p, cached: p.cached + 1 }));
        } catch {}
      });

      Promise.allSettled(tasks).then(() =>
        setPrefetchStats((p) => ({ ...p, inProgress: false })),
      );
    },
    [user],
  );

  // 获取单个内容项的完整数据 - 带重试机制和错误处理
  const refetchContentItem = useCallback(async (contentId: string, retryCount = 0): Promise<ContentItemPublic | null> => {
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // 指数退避，最大5秒

    try {
      const token = user?.token || getCookie("accessToken");
      if (!token) {
        console.error("No auth token available for refetch");
        return null;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/v1/content/${contentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const updatedItem = await response.json();
        
        // 验证数据完整性 - 确保AI结果已经包含在响应中
        const hasValidAiResult = updatedItem.ai_result && 
          (updatedItem.ai_result.brief_description || 
           updatedItem.ai_result.labels?.length > 0 ||
           updatedItem.ai_result.content_quality_score != null);
        
        // 如果处理状态为completed但AI结果不完整，进行重试
        if (updatedItem.processing_status === "completed" && !hasValidAiResult && retryCount < maxRetries) {
          console.warn(`Content ${contentId} marked as completed but AI results incomplete, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return refetchContentItem(contentId, retryCount + 1);
        }
        
        // 只有在成功获取完整数据后才清除缓存
        contentCache.delete(`content-detail-${contentId}`);
        contentCache.delete(`markdown-${contentId}`);
        contentCache.clearContentList();
        
        return updatedItem;
      } else if (response.status === 404) {
        console.error(`Content ${contentId} not found`);
        return null;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to refetch content item ${contentId} (attempt ${retryCount + 1}):`, error);
      
      // 如果是网络错误且还有重试次数，进行重试
      if (retryCount < maxRetries && 
          (error instanceof TypeError || // 网络错误
           (error instanceof Error && error.message.includes("fetch")))) {
        console.warn(`Retrying refetch for ${contentId} in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return refetchContentItem(contentId, retryCount + 1);
      }
      
      return null;
    }
  }, [user]);

  // SSE 更新 - 修复竞态条件
  const handleContentUpdate = useCallback(async (event: ContentEvent) => {
    if (event.type === "content_status_update" && event.content_id) {
      // 如果处理完成，获取完整的更新数据，包括AI分析结果
      if (event.status === "completed") {
        // 首先显示正在获取最新数据的状态
        setItems((prev) =>
          prev.map((i) =>
            i.id === event.content_id
              ? {
                  ...i,
                  processing_status: "completed",
                  title: event.title || i.title,
                  updated_at: new Date().toISOString(),
                  // 添加一个标记表示正在获取完整数据
                  _fetchingCompleteData: true,
                }
              : i,
          ),
        );

        // 获取完整的数据（包括AI结果）
        const updatedItem = await refetchContentItem(event.content_id);
        
        if (updatedItem) {
          // 成功获取完整数据，更新状态
          setItems((prev) =>
            prev.map((i) =>
              i.id === event.content_id 
                ? {
                    ...updatedItem,
                    _fetchingCompleteData: false,
                  }
                : i,
            ),
          );
          toast.success(`内容处理完成: ${updatedItem.title || "未知内容"}`);
        } else {
          // 获取完整数据失败，移除获取标记但保持completed状态
          setItems((prev) =>
            prev.map((i) =>
              i.id === event.content_id
                ? {
                    ...i,
                    _fetchingCompleteData: false,
                  }
                : i,
            ),
          );
          // 可以选择显示一个更温和的警告
          console.warn(`Failed to fetch complete data for content ${event.content_id}, using partial data`);
        }
        return; // 重要：返回避免执行下面的通用状态更新
      }

      // 对于其他状态变更，只更新基本字段
      setItems((prev) =>
        prev.map((i) =>
          i.id === event.content_id
            ? {
                ...i,
                processing_status: event.status || i.processing_status,
                title: event.title || i.title,
                updated_at: new Date().toISOString(),
              }
            : i,
        ),
      );
      
      if (event.status === "failed")
        toast.error(`内容处理失败: ${event.error_message || "未知错误"}`);
    } else if (event.type === "content_created" && event.content_item) {
      const newItem = event.content_item as ContentItemPublic;
      setItems((prev) =>
        prev.some((i) => i.id === newItem.id) ? prev : [newItem, ...prev],
      );
      contentCache.clearContentList();
      toast.success(`新内容已添加: ${newItem.title || "未知内容"}`);
    }
  }, [refetchContentItem]);

  const handleConnectionEstablished = useCallback(
    () => console.log("SSE connected"),
    [],
  );
  const handleSSEError = useCallback(
    (e: Error) => console.error("SSE error", e),
    [],
  );

  useContentEvents({
    onContentUpdate: handleContentUpdate,
    onConnectionEstablished: handleConnectionEstablished,
    onError: handleSSEError,
    enabled: !!user,
  });

  // 首次加载内容
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function fetchItems() {
      try {
        setLoading(true);
        setError(null);

        const cached = contentCache.getContentList();
        if (cached) {
          setItems(cached);
          setLoading(false);
          setTimeout(() => batchPrefetchContent(cached), 1000);
          return;
        }

        const token = user?.token || getCookie("accessToken");
        if (!token) {
          setError("未找到身份令牌");
          router.push("/login");
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${apiUrl}/api/v1/content/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItems(data);
        contentCache.setContentList(data);
        setTimeout(() => batchPrefetchContent(data), 500);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, [user, authLoading, router, batchPrefetchContent]);

  return {
    authLoading,
    items,
    loading,
    error,
    prefetchContent,
    prefetchStats,
    refreshItems,
  };
};
